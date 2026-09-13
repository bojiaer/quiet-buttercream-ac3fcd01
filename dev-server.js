// ====== 本地开发服务器 ======
// 用法: node dev-server.js  （或双击 start-dev.bat）
// 打开: http://localhost:8080
// /api/* 会转发到 Netlify 线上代理（Netlify 再转发到 Cloudflare Worker），
// 和线上部署行为一致，本地改完前端文件刷新即生效，无需重新上传。
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 8080;
const ROOT = __dirname;
const API_UPSTREAM = "https://zhishixiaozhan.netlify.app"; // 线上 API 代理

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".md": "text/markdown; charset=utf-8",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost:" + PORT);

  // API 请求 -> 转发到线上
  if (url.pathname.startsWith("/api/")) {
    const upstream = API_UPSTREAM + url.pathname + url.search;
    const preqReq = require("https").request(upstream, { method: req.method, headers: { ...req.headers, host: new URL(API_UPSTREAM).host } }, pres => {
      res.writeHead(pres.statusCode, pres.headers);
      pres.pipe(res);
    });
    preqReq.on("error", e => {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "API 上游请求失败: " + e.message }));
    });
    req.pipe(preqReq);
    return;
  }

  // 静态文件
  let file = decodeURIComponent(url.pathname);
  if (file.endsWith("/")) file += "index.html";
  const full = path.join(ROOT, file);

  // 防目录穿越
  if (!full.startsWith(ROOT)) {
    res.writeHead(403); res.end("Forbidden"); return;
  }

  fs.readFile(full, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found: " + file);
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(full).toLowerCase()] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log("本地开发服务器已启动: http://localhost:" + PORT);
  console.log("API 代理 -> " + API_UPSTREAM);
  console.log("按 Ctrl+C 停止");
});
