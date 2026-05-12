@echo off
setlocal
echo Stock Signal AI를 실행 중입니다...

:: 만약 서버가 실행 중이지 않다면 실행
tasklist /fi "windowtitle eq StockSignalServer" | find /i "tsx.exe" > nul
if errorlevel 1 (
    start "StockSignalServer" /min cmd /c "npm run dev"
    echo 서버를 시작했습니다. 잠시만 기다려주세요 (약 10초)...
    timeout /t 10 /nobreak > nul
)

:: 크롬을 앱 모드(주소창 없는 단독 창)로 실행
set URL=http://localhost:3000
start chrome --app=%URL%

echo 실행 완료!
exit
