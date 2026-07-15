@echo off
REM ============================================================
REM  RK Web Monitor — остановка службы
REM  Использует NSSM для управления Windows Service.
REM ============================================================

setlocal
cd /d "%~dp0"

set NSSM=%~dp0bin\nssm.exe
set SERVICE_NAME=RKWebMonitor

echo Остановка RK Web Monitor...

REM Если есть NSSM и служба установлена — используем её
if exist "%NSSM%" (
    "%NSSM%" status %SERVICE_NAME% >nul 2>nul
    if not errorlevel 1 (
        "%NSSM%" stop %SERVICE_NAME%
        echo Служба %SERVICE_NAME% остановлена.
        timeout /t 2 /nobreak >nul
        exit /b 0
    )
)

REM Fallback: найти и остановить процесс node, который запускает server.js
echo Служба не установлена. Поиск процесса node...
for /f "tokens=2" %%i in ('tasklist /v /fi "imagename eq node.exe" /fo csv ^| findstr /i "server.js"') do (
    taskkill /pid %%i /f >nul 2>nul
    echo Процесс %%i остановлен.
)

REM Альтернативный способ — убить процесс, слушающий порт 8083
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8083.*LISTENING"') do (
    taskkill /pid %%a /f >nul 2>nul
    echo Процесс %%a (порт 8083) остановлен.
)

echo Сервер остановлен.
timeout /t 2 /nobreak >nul

endlocal
