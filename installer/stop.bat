@echo off
REM ============================================================
REM  RK Web Monitor — stop server
REM ============================================================

echo Остановка RK Web Monitor...

REM Найти и остановить процесс node, который запускает server.js
for /f "tokens=2" %%i in ('tasklist /v /fi "imagename eq node.exe" /fo csv ^| findstr /i "server.js"') do (
    taskkill /pid %%i /f >nul 2>nul
)

REM Альтернативный способ — убить процесс, слушающий порт 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000.*LISTENING"') do (
    taskkill /pid %%a /f >nul 2>nul
)

echo Сервер остановлен.
timeout /t 2 /nobreak >nul
