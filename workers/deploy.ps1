# ====== computer-knowledge Workers API 一键部署脚本 ======
# 用法: 在 workers/ 目录下运行  powershell -ExecutionPolicy Bypass -File deploy.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# 1. 登录 Cloudflare（首次会弹浏览器）
npx wrangler whoami 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { npx wrangler login }

# 2. 创建 D1 数据库（幂等）
$dbJson = npx wrangler d1 list --json 2>$null | ConvertFrom-Json
$db = $dbJson | Where-Object { $_.name -eq "computer-knowledge-api-db" }
if (-not $db) {
  npx wrangler d1 create computer-knowledge-api-db
  $dbJson = npx wrangler d1 list --json 2>$null | ConvertFrom-Json
  $db = $dbJson | Where-Object { $_.name -eq "computer-knowledge-api-db" }
}
$dbId = $db.uuid
Write-Host "D1 database id: $dbId"

# 3. 把 database_id 写进 wrangler.toml
$toml = Get-Content wrangler.toml -Raw
$toml = $toml -replace "database_id = \".*\"", "database_id = `"$dbId`""
Set-Content wrangler.toml $toml -Encoding UTF8

# 4. 应用建表 migration
npx wrangler d1 migrations apply computer-knowledge-api-db --remote

# 5. 设置密钥（已设置过的会提示已存在，可直接回车跳过或重新输入）
npx wrangler secret put JWT_SECRET
npx wrangler secret put RESEND_API_KEY

# 6. 部署
npx wrangler deploy

# 7. 验证
$health = Invoke-RestMethod "https://computer-knowledge-api.$($env:CF_SUBDOMAIN ?? '').workers.dev/api/health" -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "部署完成。下一步："
Write-Host "  1. 打开 https://dash.cloudflare.com -> Workers -> computer-knowledge-api，复制 workers.dev 地址"
Write-Host "  2. 把 js/app.js 第 6 行的 YOUR_CF_SUBDOMAIN 替换为你的子域名"
Write-Host "  3. 推送前端到仓库"
