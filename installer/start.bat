@echo off
REM ============================================================
REM  RK Web Monitor — launcher
REM  Запускает Next.js standalone сервер и открывает браузер
REM ============================================================

setlocal
cd /d "%~dp0"

set APP_DIR=%~dp0app
set NODE_DIR=%~dp0node
set DATA_DIR=%~dp0data
set LOG_DIR=%~dp0logs

if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

REM Проверить, что приложение установлено
if not exist "%APP_DIR%\server.js" (
    echo [ERROR] Не найден %APP_DIR%\server.js
    echo Переустановите приложение.
    pause
    exit /b 1
)

REM Использовать встроенный Node.js если есть, иначе системный
if exist "%NODE_DIR%\node.exe" (
    set "PATH=%NODE_DIR%;%PATH%"
    set NODE_EXE=%NODE_DIR%\node.exe
) else (
    where node >nul 2>nul
    if errorlevel 1 (
        echo [ERROR] Node.js не найден ни во встроенной папке, ни в PATH
        echo Установите Node.js с https://nodejs.org или переустановите приложение.
        pause
        exit /b 1
    )
    set NODE_EXE=node
)

echo ============================================================
echo   RK Web Monitor v2.0.0
echo   Server: http://localhost:3000
echo   Logs:   %LOG_DIR%\server.log
echo ============================================================
echo.
echo Запуск сервера... (не закрывайте это окно, пока работаете с приложением)
echo Остановить: Ctrl+C или запустите stop.bat
echo.

REM Запустить сервер
start "RK Web Monitor" /MIN "%NODE_EXE%" "%APP_DIR%\server.js" > "%LOG_DIR%\server.log" 2>&1

REM Подождать 5 секунд и открыть браузер
timeout /t 5 /nobreak >nul
start "" "http://localhost:3000"

endlocal
