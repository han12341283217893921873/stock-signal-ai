@echo off
title Stock Signal AI Launcher
chcp 65001 >nul

echo [1/4] Checking environment...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed.
    pause
    exit /b 1
)

echo [2/4] Checking libraries...
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
)

echo [3/4] Starting server...
start "Stock Signal Server" cmd /c "npm run dev"

echo [4/4] Waiting for server to start...
echo (Please wait about 10 seconds)
timeout /t 10 /nobreak >nul

echo Opening browser...
start http://localhost:3000

echo Done! You can close this window.
timeout /t 5
exit
