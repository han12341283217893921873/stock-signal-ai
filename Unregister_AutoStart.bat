@echo off
title Stock Signal AI - 자동 실행 해제
chcp 65001 >nul

echo ===================================================
echo 🗑️ Stock Signal AI 자동 실행 해제
echo ===================================================
echo 더 이상 컴퓨터 시작 시 프로그램이 자동으로 실행되지 
echo 않도록 설정을 제거합니다.
echo ===================================================

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_NAME=StockSignalAI.lnk"

if exist "%STARTUP_FOLDER%\%SHORTCUT_NAME%" (
    del "%STARTUP_FOLDER%\%SHORTCUT_NAME%"
    echo [✅] 자동 실행 설정이 성공적으로 제거되었습니다.
) else (
    echo [ℹ️] 등록된 자동 실행 설정이 없습니다.
)

echo.
pause
