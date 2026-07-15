@echo off
REM ============================================================
REM  RK Web Monitor — запуск службы
REM  Использует NSSM для управления Windows Service.
REM  Если служба не установлена — запускает node напрямую.
REM ============================================================

setlocal
cd /d "%~dp0"

set APP_DIR=%~dp0app
set NODE_DIR=%~dp0node
set DATA_DIR=%~dp0data
set LOG_DIR=%~dp0logs
set NSSM=%~dp0bin\nssm.exe
set SERVICE_NAME=RKWebMonitor

if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo ============================================================
echo   RK Web Monitor v2.0.0
echo   Service: %SERVICE_NAME%
echo   Port: 8083 (по умолчанию)
echo   Logs:   %LOG_DIR%\server.log
echo ============================================================
echo.

REM Проверить, установлена ли служба
if exist "%NSSM%" (
    "%NSSM%" status %SERVICE_NAME% >nul 2>nul
    if not errorlevel 1 (
        echo Служба установлена. Запуск...
        "%NSSM%" start %SERVICE_NAME%
        if errorlevel 1 (
            echo [WARNING] Не удалось запустить службу. Код ошибки: %errorlevel%
            echo Попробуйте запустить от имени администратора.
            pause
            exit /b 1
        )
        echo.
        echo Служба запущена. Открываю браузер...
        timeout /t 3 /nobreak >nul
        start "" "http://localhost:8083"
        exit /b 0
    )
)

REM Служба не установлена — запускаем node напрямую
echo Служба не установлена. Прямой запуск node...

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

echo Запуск сервера... (не закрывайте это окно, пока работаете с приложением)
echo Остановить: Ctrl+C или запустите stop.bat
echo.

REM Запустить сервер
start "RK Web Monitor" /MIN "%NODE_EXE%" "%APP_DIR%\server.js" > "%LOG_DIR%\server.log" 2>&1

REM Подождать 5 секунд и открыть браузер
timeout /t 5 /nobreak >nul
start "" "http://localhost:8083"

endlocal
