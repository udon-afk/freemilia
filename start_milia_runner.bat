@echo off
cd projects/milia-runner
echo Installing dependencies...
npm install express
echo Starting Milia Runner...
start http://localhost:3001
node server.js
pause
