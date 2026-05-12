@echo off
REM Stock Signal AI 서버 - 백그라운드 실행용 스크립트
chcp 65001 >nul

cd /d "%~dp0"

:: 이미 실행 중인지 확인 (포트 3000 사용 여부)
netstat -ano | findstr :3000 | findstr LISTENING >nul
if %ERRORLEVEL% EQU 0 (
    echo [ℹ️] 서버가 이미 실행 중입니다.
    exit /b 0
)

:: 필수 파일 확인
if not exist "node_modules" exit /b 1
if not exist ".env.local" exit /b 1

:: 로그 폴더 생성
if not exist "logs" mkdir logs

:: 백그라운드로 서버 시작 (창 숨김 실행)
:: start /B 는 현재 창의 백그라운드로 실행하지만, 창이 닫히면 같이 종료될 수 있음.
:: 하지만 npm/node는 보통 독립적으로 남음.
start /B npm run dev >> "logs\server.log" 2>&1

echo [✅] Stock Signal AI 서버가 백그라운드에서 시작되었습니다.
echo 접속 주소: http://localhost:3000
