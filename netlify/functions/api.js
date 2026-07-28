const crypto = require("crypto");

const SUPABASE_URL = "https://qmxjodfvzuvxvxmkjhju.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFteGpvZGZ2enV2eHZ4bWtqaGp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTA1MTU1MywiZXhwIjoyMTAwNjI3NTUzfQ.PpT4fedUJpi-rEO_Q1hRAnjk63Pijzbfa6tWF7If6B4";
const JWT_SECRET = "ck-jwt-secret-2026-kb";

function rnd6() { return String(Math.floor(100000 + Math.random() * 900000)); }

function supHeaders() {
  return {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": "Bearer " + SUPABASE_SERVICE_KEY,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  };
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}

function base64url(b) {
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function signJWT(payload, secret) {
  var h = base64url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  var p = base64url(Buffer.from(JSON.stringify(payload)));
  var sig = crypto.createHmac("sha256", secret).update(h + "." + p).digest("base64");
  sig = sig.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return h + "." + p + "." + sig;
}

function verifyJWT(token, secret) {
  var parts = token.split(".");
  if (parts.length !== 3) return null;
  var data = parts[0] + "." + parts[1];
  var sig = crypto.createHmac("sha256", secret).update(data).digest("base64");
  sig = sig.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  if (sig !== parts[2]) return null;
  var payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function getToken(headers) {
  var auth = headers.authorization || headers.Authorization || "";
  var t = auth.replace("Bearer ", "");
  if (!t) return null;
  return verifyJWT(t, JWT_SECRET);
}

async function sendMail(to, code) {
  var html = '<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">'
    + '<h2 style="color:#7c6ff7">电脑知识百科</h2>'
    + '<p style="color:#333;font-size:15px">您的验证码是：</p>'
    + '<div style="background:#0f1117;border-radius:12px;padding:24px;text-align:center;margin:20px 0">'
    + '<span style="font-size:36px;letter-spacing:6px;color:#fff;font-weight:bold">' + code + '</span>'
    + '</div><p style="color:#888;font-size:13px">30分钟内有效</p></div>';

  var resp = await fetch("https://api.mailchannels.net/tx/v1/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to, name: to.split("@")[0] }] }],
      from: { email: "noreply@computer-knowledge.wiki", name: "电脑知识百科" },
      subject: "验证码：" + code + " - 电脑知识百科社区",
      content: [{ type: "text/html", value: html }]
    })
  });
  if (resp.status !== 200 && resp.status !== 202) {
    var txt = await resp.text();
    throw new Error("MailChannels " + resp.status + ": " + txt.slice(0, 200));
  }
}

exports.handler = async function(event) {
  var path = event.path;
  var method = event.httpMethod.toUpperCase();
  var headers = event.headers || {};
  var body = {};
  try { if (event.body) body = JSON.parse(event.body); } catch {}

  if (method === "OPTIONS") {
    return { statusCode: 204, headers: cors(), body: "" };
  }

  var res;

  // Health
  if (method === "GET" && path.endsWith("/api/health")) {
    return { statusCode: 200, headers: { ...cors(), "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, ts: Date.now() }) };
  }

  // Send code
  if (method === "POST" && path.endsWith("/api/auth/send-code")) {
    try {
      var email = (body.email || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: "请提供有效的邮箱地址" }) };
      }
      email = email.toLowerCase();
      var code = rnd6();
      var expiresAt = new Date(Date.now() + 30 * 60000).toISOString();

      var sr = await fetch(SUPABASE_URL + "/rest/v1/verification_codes", {
        method: "POST", headers: supHeaders(),
        body: JSON.stringify({ email, code, expires_at: expiresAt })
      });
      if (!sr.ok) {
        return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: "存储失败" }) };
      }
      await sendMail(email, code);
      return { statusCode: 200, headers: { ...cors(), "Content-Type": "application/json" }, body: JSON.stringify({ success: true, message: "验证码已发送" }) };
    } catch(e) {
      return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: e.message }) };
    }
  }

  // Verify code
  if (method === "POST" && path.endsWith("/api/auth/verify-code")) {
    try {
      var email = (body.email || "").trim().toLowerCase();
      var code = (body.code || "").trim();
      if (!email || !code) {
        return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: "邮箱和验证码不能为空" }) };
      }
      var params = "select=*&email=eq." + encodeURIComponent(email)
        + "&code=eq." + encodeURIComponent(code)
        + "&used=eq.false&expires_at=gt.now()&order=created_at.desc&limit=1";
      var vr = await fetch(SUPABASE_URL + "/rest/v1/verification_codes?" + params, { headers: supHeaders() });
      var rows = await vr.json();
      if (!Array.isArray(rows) || rows.length === 0) {
        return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: "验证码错误或已过期" }) };
      }
      await fetch(SUPABASE_URL + "/rest/v1/verification_codes?id=eq." + encodeURIComponent(rows[0].id), {
        method: "PATCH", headers: supHeaders(), body: JSON.stringify({ used: true })
      });
      var payload = { email: rows[0].email, sub: rows[0].email, exp: Math.floor(Date.now() / 1000) + 86400, iat: Math.floor(Date.now() / 1000) };
      var token = signJWT(payload, JWT_SECRET);
      return { statusCode: 200, headers: { ...cors(), "Content-Type": "application/json" }, body: JSON.stringify({ token, user: { email: rows[0].email } }) };
    } catch(e) {
      return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: e.message }) };
    }
  }

  // GET posts
  if (method === "GET" && path.endsWith("/api/posts")) {
    var res = await fetch(SUPABASE_URL + "/rest/v1/posts?select=*&order=created_at.desc", { headers: supHeaders() });
    var data = await res.json();
    return { statusCode: 200, headers: { ...cors(), "Content-Type": "application/json" }, body: JSON.stringify(data) };
  }

  // POST posts
  if (method === "POST" && path.endsWith("/api/posts")) {
    var user = verifyToken(headers);
    if (!user) return { statusCode: 401, headers: cors(), body: JSON.stringify({ error: "请先登录" }) };
    var res = await fetch(SUPABASE_URL + "/rest/v1/posts", { method: "POST", headers: supHeaders(), body: JSON.stringify(body) });
    return { statusCode: 201, headers: { ...cors(), "Content-Type": "application/json" }, body: JSON.stringify(await res.json()) };
  }

  // PATCH /api/posts/:id/replies
  var patchMatch = path.match(/\/api\/posts\/([^\/]+)\/replies$/);
  if (patchMatch && method === "PATCH") {
    var user = verifyToken(headers);
    if (!user) return { statusCode: 401, headers: cors(), body: JSON.stringify({ error: "请先登录" }) };
    var res = await fetch(SUPABASE_URL + "/rest/v1/posts?id=eq." + encodeURIComponent(patchMatch[1]), { method: "PATCH", headers: supHeaders(), body: JSON.stringify(body) });
    return { statusCode: res.ok ? 200 : 500, headers: { ...cors(), "Content-Type": "application/json" }, body: JSON.stringify({ success: res.ok }) };
  }

  // DELETE /api/posts/:id
  var delMatch = path.match(/\/api\/posts\/([^\/]+)$/);
  if (delMatch && method === "DELETE") {
    var user = verifyToken(headers);
    if (!user) return { statusCode: 401, headers: cors(), body: JSON.stringify({ error: "请先登录" }) };
    await fetch(SUPABASE_URL + "/rest/v1/posts?id=eq." + encodeURIComponent(delMatch[1]), { method: "DELETE", headers: supHeaders() });
    return { statusCode: 200, headers: { ...cors(), "Content-Type": "application/json" }, body: JSON.stringify({ success: true }) };
  }

  return { statusCode: 404, headers: cors(), body: JSON.stringify({ error: "Not Found" }) };
};
