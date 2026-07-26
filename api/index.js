import { sign as jwtSign, verify as jwtVerify } from "./_jwt.js";

const SUPABASE_URL = "https://qmxjodfvzuvxvxmkjhju.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFteGpvZGZ2enV2eHZ4bWtqaGp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTA1MTU1MywiZXhwIjoyMTAwNjI3NTUzfQ.PpT4fedUJpi-rEO_Q1hRAnjk63Pijzbfa6tWF7If6B4";
const JWT_SECRET = "ck-jwt-secret-2026-kb";

function rnd6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function supabaseHeaders() {
  return {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": "Bearer " + SUPABASE_SERVICE_KEY,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  };
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

async function verifyToken(req) {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "");
  if (!token) return null;
  try {
    return await jwtVerify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// ====== MailChannels ======
async function sendVerificationEmail(to, code) {
  const html = [
    "<div style=\"font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;\">",
    "<h2 style=\"color:#7c6ff7;margin-bottom:8px;\">电脑知识百科</h2>",
    "<p style=\"color:#333;font-size:15px;\">您的验证码是：</p>",
    "<div style=\"background:#0f1117;border-radius:12px;padding:24px;text-align:center;margin:20px 0;\">",
    "<span style=\"font-size:36px;letter-spacing:6px;color:#ffffff;font-weight:bold;\">" + code + "</span>",
    "</div>",
    "<p style=\"color:#888;font-size:13px;\">30分钟内有效。如非本人操作，请忽略。</p>",
    "<hr style=\"border:0;border-top:1px solid #eee;margin:24px 0;\">",
    "<p style=\"color:#aaa;font-size:12px;\">电脑知识百科 · 社区</p>",
    "</div>"
  ].join("");

  const resp = await fetch("https://api.mailchannels.net/tx/v1/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      personalizations: [{"to": [{"email": to, "name": to.split("@")[0]}]}],
      "from": {"email": "noreply@computer-knowledge.wiki", "name": "电脑知识百科"},
      "subject": "验证码：" + code + " - 电脑知识百科社区",
      "content": [{"type": "text/html", "value": html}],
    }),
  });

  const txt = await resp.text();
  if (resp.status !== 200 && resp.status !== 202) {
    throw new Error("MailChannels " + resp.status + ": " + txt.slice(0, 200));
  }
  return true;
}

export const config = { runtime: "edge" };

export default async function handler(req) {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  // Health
  if (path === "/api/health" && method === "GET") {
    return json({ ok: true, ts: Date.now() });
  }

  // Send verification code
  if (path === "/api/auth/send-code" && method === "POST") {
    try {
      const { email } = await req.json();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return json({ error: "请提供有效的邮箱地址" }, 400);
      }
      const trimmed = email.trim().toLowerCase();
      const code = rnd6();
      const expiresAt = new Date(Date.now() + 30 * 60000).toISOString();

      const storeRes = await fetch(SUPABASE_URL + "/rest/v1/verification_codes", {
        method: "POST",
        headers: supabaseHeaders(),
        body: JSON.stringify({ email: trimmed, code, expires_at: expiresAt }),
      });
      if (!storeRes.ok) {
        return json({ error: "内部错误(" + storeRes.status + ")" }, 500);
      }

      try {
        await sendVerificationEmail(trimmed, code);
      } catch (e) {
        return json({ error: "邮件发送失败：" + e.message }, 500);
      }

      return json({ success: true, message: "验证码已发送，30分钟内有效" });
    } catch {
      return json({ error: "无效请求" }, 400);
    }
  }

  // Verify code
  if (path === "/api/auth/verify-code" && method === "POST") {
    try {
      const { email, code } = await req.json();
      if (!email || !code) return json({ error: "邮箱和验证码不能为空" }, 400);

      const trimmed = email.trim().toLowerCase();
      const params = [
        "select=*",
        "email=eq." + encodeURIComponent(trimmed),
        "code=eq." + encodeURIComponent(code.trim()),
        "used=eq.false",
        "expires_at=gt.now()",
        "order=created_at.desc",
        "limit=1",
      ].join("&");

      const verifyRes = await fetch(SUPABASE_URL + "/rest/v1/verification_codes?" + params, {
        headers: supabaseHeaders(),
      });
      const rows = await verifyRes.json();
      if (!Array.isArray(rows) || rows.length === 0) {
        return json({ error: "验证码错误或已过期" }, 400);
      }

      await fetch(SUPABASE_URL + "/rest/v1/verification_codes?id=eq." + encodeURIComponent(rows[0].id), {
        method: "PATCH",
        headers: supabaseHeaders(),
        body: JSON.stringify({ used: true }),
      });

      const payload = {
        email: rows[0].email,
        sub: rows[0].email,
        exp: Math.floor(Date.now() / 1000) + 86400,
        iat: Math.floor(Date.now() / 1000),
      };
      const token = await jwtSign(payload, JWT_SECRET);

      return json({ token, user: { email: rows[0].email } });
    } catch {
      return json({ error: "无效请求" }, 400);
    }
  }

  // GET posts
  if (path === "/api/posts" && method === "GET") {
    const res = await fetch(SUPABASE_URL + "/rest/v1/posts?select=*&order=created_at.desc", {
      headers: supabaseHeaders(),
    });
    return json(await res.json());
  }

  // POST posts
  if (path === "/api/posts" && method === "POST") {
    const user = await verifyToken(req);
    if (!user) return json({ error: "请先登录" }, 401);
    const body = await req.json();
    const res = await fetch(SUPABASE_URL + "/rest/v1/posts", {
      method: "POST",
      headers: supabaseHeaders(),
      body: JSON.stringify(body),
    });
    return json(await res.json(), 201);
  }

  // PATCH /api/posts/:id/replies
  const patchMatch = path.match(/^\/api\/posts\/([^/]+)\/replies$/);
  if (patchMatch && method === "PATCH") {
    const user = await verifyToken(req);
    if (!user) return json({ error: "请先登录" }, 401);
    const body = await req.json();
    const res = await fetch(SUPABASE_URL + "/rest/v1/posts?id=eq." + encodeURIComponent(patchMatch[1]), {
      method: "PATCH",
      headers: supabaseHeaders(),
      body: JSON.stringify(body),
    });
    return json({ success: res.ok }, res.ok ? 200 : 500);
  }

  // DELETE /api/posts/:id
  const delMatch = path.match(/^\/api\/posts\/([^\/]+)$/);
  if (delMatch && method === "DELETE") {
    const user = await verifyToken(req);
    if (!user) return json({ error: "请先登录" }, 401);
    await fetch(SUPABASE_URL + "/rest/v1/posts?id=eq." + encodeURIComponent(delMatch[1]), {
      method: "DELETE",
      headers: supabaseHeaders(),
    });
    return json({ success: true });
  }

  return json({ error: "Not Found" }, 404);
}
