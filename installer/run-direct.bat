@echo off
REM ============================================================
REM  RK Web Monitor - Run server directly (without service)
REM
REM  Starts Next.js server in this console window.
REM  Close the window or press Ctrl+C to stop.
REM
REM  No administrator rights required.
REM ============================================================

title RK Web Monitor - Direct Server

setlocal
cd /d "%~dp0" 2>nul

set "APP_DIR=%~dp0"
set "NODE_EXE=%APP_DIR%node\node.exe"
set "SERVER_JS=%APP_DIR%app\server.js"
set "WATCHDOG_JS=%APP_DIR%bin\watchdog.js"
set "DATA_DIR=%APP_DIR%data"
set "PORT=8083"

echo ============================================================
echo   RK Web Monitor - Direct Server
echo ============================================================
echo   Folder: %APP_DIR%
echo   Port:   %PORT%
echo ============================================================
echo.

REM Check files
if not exist "%NODE_EXE%" (
    echo [ERROR] node.exe not found: %NODE_EXE%
    pause
    exit /b 1
)
if not exist "%SERVER_JS%" (
    echo [ERROR] server.js not found: %SERVER_JS%
    pause
    exit /b 1
)

REM Create data/logs dirs if not exist
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%" 2>nul
if not exist "%APP_DIR%logs" mkdir "%APP_DIR%logs" 2>nul

REM Check if .env exists, create if not
if not exist "%APP_DIR%app\.env" (
    echo [INFO] Creating .env file...
    set "DB_PATH=%APP_DIR%data\rkwebmon.db"
    set "DB_PATH=!DB_PATH:\=/!"
    (
        echo DATABASE_URL=file:!DB_PATH!
        echo PORT=%PORT%
        echo HOSTNAME=0.0.0.0
        echo NODE_ENV=production
    ) > "%APP_DIR%app\.env"
    echo   .env created
)

REM Check if database exists, init if not
if not exist "%DATA_DIR%\rkwebmon.db" (
    echo [INFO] Database not found. Initializing...
    cd /d "%APP_DIR%app"
    set "DATABASE_URL=file:!DB_PATH!"
    if exist "scripts\init-db.js" (
        "%NODE_EXE%" "scripts\init-db.js"
    ) else (
        echo [WARN] init-db.js not found. Database may not work.
    )
    cd /d "%APP_DIR%"
    echo.
)

REM Check if service is running — stop it to avoid port conflict
echo [INFO] Checking if service is running...
"%APP_DIR%bin\nssm.exe" status RKWebMonitor >nul 2>&1
if not errorlevel 1 (
    echo [INFO] Service RKWebMonitor is running. Stopping it to avoid port conflict...
    "%APP_DIR%bin\nssm.exe" stop RKWebMonitor >nul 2>&1
    timeout /t 2 /nobreak >nul
    echo   Service stopped.
    echo.
)

REM Start server directly
echo ============================================================
echo   Starting server directly (not as service)...
echo   Press Ctrl+C to stop.
echo   Open http://localhost:%PORT% in your browser.
echo ============================================================
echo.

cd /d "%APP_DIR%app"
"%NODE_EXE%" server.js

REM If we get here, server exited
echo.
echo [INFO] Server stopped.
echo.
echo Press any key to close...
pause >nul

endlocal
