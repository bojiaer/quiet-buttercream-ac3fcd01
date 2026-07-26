// Minimal JWT helper using Web Crypto API for Vercel Edge runtime

async function base64url(buf) {
  const b = typeof buf === "string" ? new TextEncoder().encode(buf) : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function jsonBase64(obj) {
  return base64url(JSON.stringify(obj));
}

async function hmacSha256(secret, data) {
  const key = await crypto.subtle.importKey(
    "raw",
    typeof secret === "string" ? new TextEncoder().encode(secret) : secret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  return await crypto.subtle.sign("HMAC", key, typeof data === "string" ? new TextEncoder().encode(data) : data);
}

export async function sign(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const h64 = jsonBase64(header);
  const p64 = jsonBase64(payload);
  const sig = await base64url(await hamcSha256(secret, h64 + "." + p64));
  return h64 + "." + p64 + "." + sig;
}

export async function verify(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token");
  const sig = await base64url(await hmacSha256(secret, parts[0] + "." + parts[1]));
  if (sig !== parts[2]) throw new Error("Invalid signature");
  const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error("Token expired");
  return payload;
}
