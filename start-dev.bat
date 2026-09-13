@echo off
cd /d %~dp0
echo 启动本地开发服务器...
start "" http://localhost:8080
node dev-server.js
