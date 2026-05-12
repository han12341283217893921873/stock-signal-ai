@echo off
title Stock Signal AI - 자동 실행 등록
chcp 65001 >nul

echo ===================================================
echo 🚀 Stock Signal AI 자동 실행 등록
echo ===================================================
echo 이 스크립트는 컴퓨터를 켤 때 프로그램이 자동으로 
echo 시작되도록 시작 프로그램 폴더에 등록합니다.
echo ===================================================

set "SCRIPT_PATH=%~dp0start-server.bat"
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_NAME=StockSignalAI.lnk"

echo [1/2] 시작 프로그램 폴더 확인 중...
if not exist "%STARTUP_FOLDER%" (
    echo [❌ 오류] 시작 프로그램 폴더를 찾을 수 없습니다.
    pause
    exit /b 1
)

echo [2/2] 바로가기 생성 중...
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%STARTUP_FOLDER%\%SHORTCUT_NAME%'); $Shortcut.TargetPath = '%SCRIPT_PATH%'; $Shortcut.WorkingDirectory = '%~dp0'; $Shortcut.WindowStyle = 7; $Shortcut.Save()"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===================================================
    echo ✅ 등록이 완료되었습니다!
    echo 이제 컴퓨터를 켜거나 재부팅할 때 서버가 자동 실행됩니다.
    echo ===================================================
) else (
    echo.
    echo [❌ 오류] 등록 중 문제가 발생했습니다. 관리자 권한으로 실행해보세요.
)

pause
