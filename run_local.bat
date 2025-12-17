@echo off
setlocal
cd /d %~dp0
if not exist node_modules (
  echo Installing dependencies...
  npm install
)
start cmd /k "node server.js"
start cmd /k "cloudflared tunnel run irgri-tunnel --config C:\Users\SadSock\.cloudflared\config.yml"
start http://localhost:3000
