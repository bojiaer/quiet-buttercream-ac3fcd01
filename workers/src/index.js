// ====== computer-knowledge API Worker ======
// Framework: Hono on Cloudflare Workers
// Email: MailChannels (free via CF Workers)
// Database: Supabase (via REST API + service role key)

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

function supabaseHeaders(key) {
  return {
    "apikey": key,
    "Authorization": "Bearer " + key,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  };
}

function getEnv(c) {
  return {
    supabaseUrl: c.env.SUPABASE_URL || "https://qmxjodfvzuvxvxmkjhju.supabase.co",
    supabaseServiceKey: c.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFteGpvZGZ2enV2eHZ4bWtqaGp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTA1MTU1MywiZXhwIjoyMTAwNjI3NTUzfQ.PpT4fedUJpi-rEO_Q1hRAnjk63Pijzbfa6tWF7If6B4",
    jwtSecret: c.env.JWT_SECRET || "ck-jwt-secret-2026-kb",
  };
}

// ====== MAILCHANNELS (free email send via Cloudflare Workers) ======
async function sendVerificationEmail(to, code) {
  const html = [
    '<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">',
    '<h2 style="color:#7c6ff7;margin-bottom:8px;">\u7535\u8111\u77e5\u8bc6\u767e\u79d1</h2>',
    '<p style="color:#333;font-size:15px;">\u60a8\u7684\u9a8c\u8bc1\u7801\u662f\uff1a</p>',
    '<div style="background:#0f1117;border-radius:12px;padding:24px;text-align:center;margin:20px 0;">',
    '<span style="font-size:36px;letter-spacing:6px;color:#ffffff;font-weight:bold;">' + code + '</span>',
    '</div>',
    '<p style="color:#888;font-size:13px;">30\u5206\u949f\u5185\u6709\u6548\u3002\u5982\u975e\u672c\u4eba\u64cd\u4f5c\uff0c\u8bf7\u5ffd\u7565\u3002</p>',
    '<hr style="border:0;border-top:1px solid #eee;margin:24px 0;">',
    '<p style="color:#aaa;font-size:12px;">\u7535\u8111\u77e5\u8bc6\u767e\u79d1 \u00b7 \u793e\u533a</p>',
    '</div>'
  ].join("\n");

  const resp = await fetch("https://api.mailchannels.net/tx/v1/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to, name: to.split("@")[0] }] }],
      from: {
        email: "noreply@computer-knowledge.workers.dev",
        name: "\u7535\u8111\u77e5\u8bc6\u767e\u79d1",
      },
      subject: "\u9a8c\u8bc1\u7801\uff1a" + code + " - \u7535\u8111\u77e5\u8bc6\u767e\u79d1\u793e\u533a",
      content: [{ type: "text/html", value: html }],
    }),
  });

  // MailChannels returns 202 on success
  if (resp.status !== 200 && resp.status !== 202) {
    const txt = await resp.text();
    throw new Error("MailChannels " + resp.status + ": " + txt.slice(0, 300));
  }
}

// ====== AUTH MIDDLEWARE ======
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

// ====== ROUTES ======

// Health check
app.get("/api/health", (c) => c.json({ ok: true, ts: Date.now() }));

// ========== AUTH ==========

// POST /api/auth/send-code - Send 6-digit verification code via email
app.post("/api/auth/send-code", async (c) => {
  const { supabaseUrl, supabaseServiceKey } = getEnv(c);

  let body;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const { email } = body;

  const isValidEmail = (value) => typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  if (!isValidEmail(email)) {
    return c.json({ error: "\u8bf7\u63d0\u4f9b\u6709\u6548\u7684\u90ae\u7bb1\u5730\u5740" }, 400);
  }

  const trimmedEmail = email.trim().toLowerCase();
  const code = rnd6();
  const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();

  // Store in verification_codes table
  const storeRes = await fetch(supabaseUrl + "/rest/v1/verification_codes", {
    method: "POST",
    headers: supabaseHeaders(supabaseServiceKey),
    body: JSON.stringify({ email: trimmedEmail, code, expires_at: expiresAt }),
  });

  if (!storeRes.ok) {
    return c.json({ error: "\u5185\u90e8\u9519\u8bef\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5 (" + storeRes.status + ")" }, 500);
  }

  // Send email
  try {
    await sendVerificationEmail(trimmedEmail, code);
  } catch (e) {
    return c.json({ error: "\u90ae\u4ef6\u53d1\u9001\u5931\u8d25\uff1a" + e.message }, 500);
  }

  return c.json({ success: true, message: "\u9a8c\u8bc1\u7801\u5df2\u53d1\u9001\uff0c30\u5206\u949f\u5185\u6709\u6548" });
});

// POST /api/auth/verify-code - Verify code and return JWT
app.post("/api/auth/verify-code", async (c) => {
  const { supabaseUrl, supabaseServiceKey, jwtSecret } = getEnv(c);

  let body;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const { email, code } = body;

  if (!email || !code) {
    return c.json({ error: "\u90ae\u7bb1\u548c\u9a8c\u8bc1\u7801\u4e0d\u80fd\u4e3a\u7a7a" }, 400);
  }

  // Query matching, unused, unexpired code
  const qs = [
    "select=*",
    "email=eq." + encodeURIComponent(email.trim().toLowerCase()),
    "code=eq." + encodeURIComponent(code.trim()),
    "used=eq.false",
    "expires_at=gt.now()",
    "order=created_at.desc",
    "limit=1"
  ].join("&");

  const verifyRes = await fetch(supabaseUrl + "/rest/v1/verification_codes?" + qs, {
    headers: supabaseHeaders(supabaseServiceKey),
  });

  const rows = await verifyRes.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return c.json({ error: "\u9a8c\u8bc1\u7801\u9519\u8bef\u6216\u5df2\u8fc7\u671f" }, 400);
  }

  // Mark code as used
  await fetch(supabaseUrl + "/rest/v1/verification_codes?id=eq." + encodeURIComponent(rows[0].id), {
    method: "PATCH",
    headers: supabaseHeaders(supabaseServiceKey),
    body: JSON.stringify({ used: true }),
  });

  // Sign JWT (24h expiry), with HS256 via hono/jwt
  const payload = {
    email: rows[0].email,
    sub: rows[0].email,
    exp: Math.floor(Date.now() / 1000) + 86400,
    iat: Math.floor(Date.now() / 1000),
  };
  const token = await sign(payload, jwtSecret, "HS256");

  return c.json({ token, user: { email: rows[0].email } });
});

// ---- POSTS ----

// GET /api/posts - Public read
app.get("/api/posts", async (c) => {
  const { supabaseUrl, supabaseServiceKey } = getEnv(c);
  const res = await fetch(supabaseUrl + "/rest/v1/posts?select=*&order=created_at.desc", {
    headers: supabaseHeaders(supabaseServiceKey),
  });
  return c.json(await res.json());
});

// POST /api/posts - Authenticated create
app.post("/api/posts", async (c) => {
  const user = await requireAuth(c);
  if (!user) return c.json({ error: "\u8bf7\u5148\u767b\u5f55" }, 401);

  const { supabaseUrl, supabaseServiceKey } = getEnv(c);
  const body = await c.req.json();
  const res = await fetch(supabaseUrl + "/rest/v1/posts", {
    method: "POST",
    headers: supabaseHeaders(supabaseServiceKey),
    body: JSON.stringify(body),
  });
  return c.json(await res.json(), 201);
});

// PATCH /api/posts/:id/replies - Authenticated update
app.patch("/api/posts/:id/replies", async (c) => {
  const user = await requireAuth(c);
  if (!user) return c.json({ error: "\u5bf7\u5148\u767b\u5f55" }, 401);

  const { supabaseUrl, supabaseServiceKey } = getEnv(c);
  const { id } = c.req.param();
  const body = await c.req.json();
  const res = await fetch(supabaseUrl + "/rest/v1/posts?id=eq." + encodeURIComponent(id), {
    method: "PATCH",
    headers: supabaseHeaders(supabaseServiceKey),
    body: JSON.stringify(body),
  });
  return c.json({ success: res.ok }, res.ok ? 200 : 500);
});

// DELETE /api/posts/:id - Authenticated delete
app.delete("/api/posts/:id", async (c) => {
  const user = await requireAuth(c);
  if (!user) return c.json({ error: "\u5bf7\u5148\u767b\u5f55" }, 401);

  const { supabaseUrl, supabaseServiceKey } = getEnv(c);
  const { id } = c.req.param();
  await fetch(supabaseUrl + "/rest/v1/posts?id=eq." + encodeURIComponent(id), {
    method: "DELETE",
    headers: supabaseHeaders(supabaseServiceKey),
  });
  return c.json({ success: true });
});

export default app;

