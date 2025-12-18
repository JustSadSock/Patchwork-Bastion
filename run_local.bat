@echo off
setlocal
set "CFG_PATH=C:\Users\SadSock\.cloudflared\config.yml"
cd /d %~dp0
if not exist node_modules (
  echo Installing dependencies...
  call npm install || (echo npm install failed. Press any key to close. & pause & exit /b 1)
)

start "Patchwork Bastion Server" cmd /k "cd /d %~dp0 && node server.js"
start "Patchwork Bastion Tunnel" cmd /k "cd /d %~dp0 && cloudflared --config ""%CFG_PATH%"" tunnel run irgri-tunnel"
start "Patchwork Bastion" http://localhost:3000

echo Launch commands issued. Press any key to close this window.
pause
