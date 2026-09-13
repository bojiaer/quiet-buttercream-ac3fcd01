// ====== computer-knowledge API Worker ======
// Framework: Hono on Cloudflare Workers
// Database: Cloudflare D1 (binding: DB)
// Email: Resend (secret: RESEND_API_KEY)

import { Hono } from "hono";
import { cors } from "hono/cors";
import { sign, verify } from "hono/jwt";

const app = new Hono();

app.use("/*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// ====== HELPERS ======
function rnd6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const ADMIN_EMAILS = ["yaojinguan@qq.com"];

async function requireAuth(c) {
  const authHeader = c.req.header("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return null;
  try {
    return await verify(token, c.env.JWT_SECRET, "HS256");
  } catch {
    return null;
  }
}

// ====== EMAIL ======
async function sendVerificationEmail(env, to, code) {
  const html = '<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">'
    + '<h2 style="color:#7c6ff7;margin-bottom:8px">电脑知识百科</h2>'
    + '<p style="color:#333;font-size:15px">您的验证码是：</p>'
    + '<div style="background:#0f1117;border-radius:12px;padding:24px;text-align:center;margin:20px 0">'
    + '<span style="font-size:36px;letter-spacing:6px;color:#fff;font-weight:bold">' + code + '</span>'
    + '</div>'
    + '<p style="color:#888;font-size:13px">30分钟内有效。如非本人操作，请忽略。</p>'
    + '<hr style="border:0;border-top:1px solid #eee;margin:24px 0">'
    + '<p style="color:#aaa;font-size:12px">电脑知识百科 · 社区</p>'
    + '</div>';

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + env.RESEND_API_KEY,
    },
    body: JSON.stringify({
      from: "电脑知识百科 <onboarding@resend.dev>",
      to: [to],
      subject: "验证码：" + code + " - 电脑知识百科社区",
      html: html
    }),
  });

  if (resp.status !== 200) {
    const txt = await resp.text();
    throw new Error("Resend send failed: " + txt.slice(0, 300));
  }
}

// ====== ROUTES ======

// Health check
app.get("/api/health", (c) => c.json({ ok: true, ts: Date.now() }));

// ========== AUTH ==========

// POST /api/auth/send-code - Send 6-digit verification code via email
app.post("/api/auth/send-code", async (c) => {
  let body;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const { email } = body;

  const isValidEmail = (value) => typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  if (!isValidEmail(email)) {
    return c.json({ error: "请提供有效的邮箱地址" }, 400);
  }

  const trimmedEmail = email.trim().toLowerCase();
  const code = rnd6();
  const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();

  const storeRes = await c.env.DB.prepare(
    "INSERT INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?)"
  ).bind(trimmedEmail, code, expiresAt).run();

  if (!storeRes.success) {
    return c.json({ error: "内部错误，请稍后再试" }, 500);
  }

  try {
    await sendVerificationEmail(c.env, trimmedEmail, code);
  } catch (e) {
    return c.json({ error: "邮件发送失败：" + e.message }, 500);
  }

  return c.json({ success: true, message: "验证码已发送，30分钟内有效" });
});

// POST /api/auth/verify-code - Verify code and return JWT
app.post("/api/auth/verify-code", async (c) => {
  let body;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const { email, code } = body;

  if (!email || !code) {
    return c.json({ error: "邮箱和验证码不能为空" }, 400);
  }

  const row = await c.env.DB.prepare(
    "SELECT * FROM verification_codes WHERE email = ? AND code = ? AND used = 0 AND expires_at > ? ORDER BY created_at DESC LIMIT 1"
  ).bind(email.trim().toLowerCase(), code.trim(), new Date().toISOString()).first();

  if (!row) {
    return c.json({ error: "验证码错误或已过期" }, 400);
  }

  await c.env.DB.prepare("UPDATE verification_codes SET used = 1 WHERE id = ?").bind(row.id).run();

  const now = Math.floor(Date.now() / 1000);
  const token = await sign(
    { email: row.email, sub: row.email, exp: now + 86400, iat: now },
    c.env.JWT_SECRET,
    "HS256"
  );

  return c.json({ token, user: { email: row.email } });
});

// ---- POSTS ----

// GET /api/posts - Public read
app.get("/api/posts", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM posts ORDER BY created_at DESC"
  ).all();
  return c.json(results.map(r => ({
    ...r,
    replies: typeof r.replies === "string" ? JSON.parse(r.replies || "[]") : (r.replies || []),
  })));
});

// POST /api/posts - Authenticated create
app.post("/api/posts", async (c) => {
  const user = await requireAuth(c);
  if (!user) return c.json({ error: "请先登录" }, 401);

  const body = await c.req.json();
  const bodyText = String(body.body || "").slice(0, 5000);
  const tag = String(body.tag || "").slice(0, 100);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const res = await c.env.DB.prepare(
    "INSERT INTO posts (id, tag, body, replies, author_email, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(id, tag, bodyText, JSON.stringify(body.replies || []), user.email, createdAt).run();

  if (!res.success) return c.json({ error: "发布失败" }, 500);
  return c.json({ id, tag, body: bodyText, replies: body.replies || [], author_email: user.email, created_at: createdAt }, 201);
});

// PATCH /api/posts/:id/replies - Authenticated update
app.patch("/api/posts/:id/replies", async (c) => {
  const user = await requireAuth(c);
  if (!user) return c.json({ error: "请先登录" }, 401);

  const { id } = c.req.param();
  const body = await c.req.json();
  const res = await c.env.DB.prepare(
    "UPDATE posts SET replies = ? WHERE id = ?"
  ).bind(JSON.stringify(body.replies || []), id).run();

  return c.json({ success: res.success }, res.success ? 200 : 500);
});

// DELETE /api/posts/:id - Admin can delete any; users only their own
app.delete("/api/posts/:id", async (c) => {
  const user = await requireAuth(c);
  if (!user) return c.json({ error: "请先登录" }, 401);

  const { id } = c.req.param();
  const isAdmin = ADMIN_EMAILS.includes(user.email);

  if (!isAdmin) {
    const row = await c.env.DB.prepare(
      "SELECT id FROM posts WHERE id = ? AND author_email = ? LIMIT 1"
    ).bind(id, user.email).first();
    if (!row) {
      return c.json({ error: "只能删除自己的帖子" }, 403);
    }
  }

  await c.env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});

export default app;
