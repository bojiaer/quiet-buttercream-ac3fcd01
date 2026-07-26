# computer-knowledge 后端部署指南

## ✅ 代码已全部完成，你需要手动执行以下步骤：

---

## 一、Supabase 建表 + 配置 RLS

1. 打开 Supabase Dashboard: https://supabase.com/dashboard
2. 选择项目: qmxjodfvzuvxvxmkjhju
3. 进入 SQL Editor (左侧菜单)
4. 复制 `workers/migrations/001_verification_codes.sql` 的全部内容
5. 粘贴到 SQL Editor 中，点击 Run
6. 验证: 左侧 Database → Tables → 确认 verification_codes 表已创建
7. 确认 posts 表已开启 RLS (Table → posts → RLS enabled)

## 二、获取 Supabase Service Key

1. Supabase Dashboard → 项目设置 → API
2. 找到 `service_role` key (以 eyJhb... 开头，很长一串)
3. **不要泄露！**这个 key 能绕过 RLS

---

## 三、部署 Worker 到 Cloudflare

在 `E:\AI\computer-knowledge\workers` 目录下执行:

```bash
# 1. 登录 Cloudflare (只首次需要)
npx wrangler login

# 2. 设置密钥 (最需要先做)
npx wrangler secret put SUPABASE_URL
# 输入: https://qmxfortvzuvxvxmkjhju.supabase.co

npx wrangler secret put SUPABASE_SERVICE_KEY
# 输入: [你的 service_role key]

npx wrangler secret put JWT_SECRET
# 输入: 一个随机字符串，例如: computer-knowledge-jwt-2026-!!
# (可以自己任意编写，保证足够长即可)

# 3. 部署
npx wrangler deploy

# 4. 记下 Worker URL (类似: https://computer-knowledge-api.abc123.workers.dev)
```

---

## 四、更新前端 API_BASE

1. 部署完成后，Worker 会生成一个 URL
2. 打开 `E:\AI\computer-knowledge\js\app.js`
3. 修改第5行的 API_BASE 为你的 Worker URL:
   ```
   var API_BASE = "https://computer-knowledge-api.你的子域名.workers.dev";
   ```

---

## 五、部署前端到 Cloudflare Pages / Vercel（选一个）

### 方案 A: Cloudflare Pages (推荐)

1. Cloudflare Dashboard → Workers & Pages → Pages
2. 新建项目 → 选择文件夹 `E:\AI\computer-knowledge`
3. 构建设置：无需构建命令，输出目录留空
4. 部署 → 获得 `.pages.dev` 域名

### 方案 B: Vercel

1. npm install -g vercel
2. cd E:\AI\computer-knowledge
3. vercel --prod
4. 获得 `.vercel.app` 域名

---

## 六、验证

1. 打开前端 URL
2. 点击"社区"→ 应该看到登录按钮
3. 点击登录 → 输入邮箱 → 发送验证码
4. 收到邮件 → 输入验证码 → 登录成功
5. 发帖/回复/删除 → 正常使用

---

## 附录：功能清单

| 功能 | 实现 | 位置 |
|------|------|------|
| 邮箱验证码发送 | MailChannels (通过 CF Workers) | workers/src/index.js |
| 验证码验证+JWT签发 | Hono JWT中间件 | workers/src/index.js |
| 帖子CRUD | 代理到 Supabase | workers/src/index.js |
| RLS安全 | Supabase policies | migrations/001_verification_codes.sql |
| 前端认证UI | 登录Modal + token管理 | js/app.js |
