// ====== computer-knowledge API Worker ======
// 匿名社区 API：无需登录，昵称 + UID 标识 + Turnstile 人机验证
// 数据库：Cloudflare D1 (binding: DB)

import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

app.use("/*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-UID", "X-Admin-Key"],
}));

// ====== HELPERS ======

// Turnstile 人机验证（服务端二次校验）
async function verifyTurnstile(c, token) {
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret: c.env.TURNSTILE_SECRET, response: token });
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const j = await r.json();
    return !!j.success;
  } catch {
    return false;
  }
}

// ====== ROUTES ======

app.get("/api/health", (c) => c.json({ ok: true, ts: Date.now() }));

// GET /api/posts - 公开读取
app.get("/api/posts", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, tag, body, replies, author, uid, created_at FROM posts ORDER BY created_at DESC"
  ).all();
  return c.json(results.map(r => ({
    ...r,
    replies: typeof r.replies === "string" ? JSON.parse(r.replies || "[]") : (r.replies || []),
  })));
});

// POST /api/posts - 匿名发帖（Turnstile 校验 + 频率限制）
app.post("/api/posts", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Invalid JSON" }, 400);

  const uid = c.req.header("X-UID") || "";
  if (!uid || uid.length > 64) return c.json({ error: "缺少身份标识" }, 400);

  if (!(await verifyTurnstile(c, body.turnstile))) {
    return c.json({ error: "人机验证未通过，请重试" }, 403);
  }

  const text = String(body.body || "").trim().slice(0, 5000);
  if (!text) return c.json({ error: "内容不能为空" }, 400);
  const tag = String(body.tag || "").trim().slice(0, 100) || "未分类";
  const nick = String(body.nickname || "").trim().slice(0, 30) || "匿名";

  // 简单限速：同一 UID 30 秒内只能发一帖
  const recent = await c.env.DB.prepare(
    "SELECT id FROM posts WHERE uid = ? AND created_at > ? LIMIT 1"
  ).bind(uid, new Date(Date.now() - 30000).toISOString()).first();
  if (recent) return c.json({ error: "发得太快啦，休息 30 秒再试" }, 429);

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const res = await c.env.DB.prepare(
    "INSERT INTO posts (id, tag, body, replies, author, uid, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(id, tag, text, "[]", nick, uid, createdAt).run();

  if (!res.success) return c.json({ error: "发布失败" }, 500);
  return c.json({ id, tag, body: text, replies: [], author: nick, created_at: createdAt }, 201);
});

// PATCH /api/posts/:id/replies - 匿名回帖（Turnstile 校验）
app.patch("/api/posts/:id/replies", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Invalid JSON" }, 400);

  if (!(await verifyTurnstile(c, body.turnstile))) {
    return c.json({ error: "人机验证未通过，请重试" }, 403);
  }

  const raw = Array.isArray(body.replies) ? body.replies.slice(-200) : [];
  const clean = raw.map(r => ({
    ts: String((r && r.ts) || "").slice(0, 30),
    nick: String((r && r.nick) || "匿名").slice(0, 30),
    body: String((r && r.body) || "").slice(0, 1000),
  }));

  const res = await c.env.DB.prepare(
    "UPDATE posts SET replies = ? WHERE id = ?"
  ).bind(JSON.stringify(clean), c.req.param("id")).run();

  return c.json({ success: res.success }, res.success ? 200 : 500);
});

// DELETE /api/posts/:id - 管理员可删任何帖；普通用户只能删自己的（X-UID 匹配）
app.delete("/api/posts/:id", async (c) => {
  const id = c.req.param("id");

  const adminKey = c.req.header("X-Admin-Key") || "";
  if (c.env.ADMIN_KEY && adminKey && adminKey === c.env.ADMIN_KEY) {
    await c.env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
    return c.json({ success: true, by: "admin" });
  }

  const uid = c.req.header("X-UID") || "";
  if (!uid) return c.json({ error: "缺少身份标识" }, 401);

  const row = await c.env.DB.prepare(
    "SELECT id FROM posts WHERE id = ? AND uid = ? LIMIT 1"
  ).bind(id, uid).first();
  if (!row) return c.json({ error: "只能删除自己的帖子" }, 403);

  await c.env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});

// GET /api/admin/check - 校验管理员密钥是否正确
app.get("/api/admin/check", (c) => {
  const adminKey = c.req.header("X-Admin-Key") || "";
  return c.json({ admin: !!(c.env.ADMIN_KEY && adminKey && adminKey === c.env.ADMIN_KEY) });
});

export default app;
