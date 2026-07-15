@echo off
REM ============================================================
REM  RK Web Monitor v2.0.0 — Установка как Windows Service
REM  Запускать от имени АДМИНИСТРАТОРА
REM ============================================================

setlocal enabledelayedexpansion
cd /d "%~dp0"

set APP_DIR=%~dp0
set NSSM=%APP_DIR%bin\nssm.exe
set NODE_EXE=%APP_DIR%node\node.exe
set SERVER_JS=%APP_DIR%app\server.js
set WATCHDOG_JS=%APP_DIR%bin\watchdog.js
set DATA_DIR=%APP_DIR%data
set LOG_DIR=%APP_DIR%logs
set SERVICE_NAME=RKWebMonitor
set PORT=8083

echo ============================================================
echo   RK Web Monitor v2.0.0 — Installer
echo ============================================================
echo   Folder:    %APP_DIR%
echo   Service:   %SERVICE_NAME%
echo   Port:      %PORT%
echo ============================================================
echo.

REM Check admin rights
net session >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Administrator rights required!
    echo Right-click this file -^> Run as administrator
    pause
    exit /b 1
)

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
if not exist "%NSSM%" (
    echo [ERROR] nssm.exe not found: %NSSM%
    pause
    exit /b 1
)

echo [1/9] Creating data and logs folders...
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
echo   OK
echo.

echo [2/9] Downloading Prisma query engine for Windows...
cd /d "%APP_DIR%app"
"%NODE_EXE%" "node_modules\prisma\build\index.js" generate 2>nul
if errorlevel 1 (
    echo   [WARN] prisma generate failed, trying without strict checks...
    "%NODE_EXE%" "node_modules\prisma\build\index.js" generate --no-engine 2>nul
)
cd /d "%APP_DIR%"
echo   OK
echo.

echo [3/9] Initializing SQLite database...
cd /d "%APP_DIR%app"
"%NODE_EXE%" "node_modules\prisma\build\index.js" db push --schema="prisma\schema.prisma" --skip-generate --accept-data-loss 2>nul
cd /d "%APP_DIR%"
echo   OK
echo.

echo [4/9] Adding Windows Firewall rule (port %PORT%)...
netsh advfirewall firewall delete rule name="RK Web Monitor" >nul 2>&1
netsh advfirewall firewall add rule name="RK Web Monitor" dir=in action=allow protocol=TCP localport=%PORT%
echo   OK
echo.

echo [5/9] Removing old service (if exists)...
"%NSSM%" stop %SERVICE_NAME% >nul 2>&1
"%NSSM%" remove %SERVICE_NAME% confirm >nul 2>&1
echo   OK
echo.

echo [6/9] Installing service %SERVICE_NAME%...
"%NSSM%" install %SERVICE_NAME% "%NODE_EXE%" "%WATCHDOG_JS%"
"%NSSM%" set %SERVICE_NAME% AppDirectory "%APP_DIR%"
"%NSSM%" set %SERVICE_NAME% AppEnvironmentExtra PORT=%PORT% HOSTNAME=0.0.0.0 NODE_ENV=production DATABASE_URL="file:%APP_DIR%data\rkwebmon.db" WATCHDOG_DIR="%APP_DIR%data"
"%NSSM%" set %SERVICE_NAME% AppStdout "%LOG_DIR%server.log"
"%NSSM%" set %SERVICE_NAME% AppStderr "%LOG_DIR%server.log"
"%NSSM%" set %SERVICE_NAME% AppRotateFiles 1
"%NSSM%" set %SERVICE_NAME% AppRotateBytes 10485760
"%NSSM%" set %SERVICE_NAME% AppExit Default Restart
"%NSSM%" set %SERVICE_NAME% AppRestartDelay 5000
"%NSSM%" set %SERVICE_NAME% Start SERVICE_AUTO_START
"%NSSM%" set %SERVICE_NAME% Description "RK Web Monitor v2.0.0 - R-Keeper 7 web monitoring"
echo   OK
echo.

echo [7/9] Starting service...
"%NSSM%" start %SERVICE_NAME%
if errorlevel 1 (
    echo   [WARN] Service did not start immediately. Waiting 5 sec...
    timeout /t 5 /nobreak >nul
    "%NSSM%" status %SERVICE_NAME%
) else (
    echo   OK
)
echo.

echo [8/9] Creating Start Menu shortcuts...
set SHORTCUT_DIR=%ProgramData%\Microsoft\Windows\Start Menu\Programs\RK Web Monitor
if not exist "%SHORTCUT_DIR%" mkdir "%SHORTCUT_DIR%"

echo @echo off > "%TEMP%\rkwm-open.bat"
echo start "" "http://localhost:%PORT%" >> "%TEMP%\rkwm-open.bat"
copy /Y "%TEMP%\rkwm-open.bat" "%SHORTCUT_DIR%\Open in browser.bat" >nul

copy /Y "%APP_DIR%start.bat" "%SHORTCUT_DIR%\Start service.bat" >nul
copy /Y "%APP_DIR%stop.bat" "%SHORTCUT_DIR%\Stop service.bat" >nul
copy /Y "%APP_DIR%restart.bat" "%SHORTCUT_DIR%\Restart service.bat" >nul

(
    echo @echo off
    echo cd /d "%APP_DIR%"
    echo "%NSSM%" stop %SERVICE_NAME%
    echo "%NSSM%" remove %SERVICE_NAME% confirm
    echo netsh advfirewall firewall delete rule name="RK Web Monitor"
    echo echo Service removed. You can delete folder %APP_DIR% manually.
    echo pause
) > "%SHORTCUT_DIR%\Uninstall.bat"

echo   OK: %SHORTCUT_DIR%
echo.

echo [9/9] Checking server availability...
echo   Waiting 10 seconds for first start...
timeout /t 10 /nobreak >nul

powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:%PORT%' -TimeoutSec 10 -UseBasicParsing; Write-Host '  Server responds: HTTP' $r.StatusCode -ForegroundColor Green } catch { Write-Host '  [WARN] Server is still starting. Open http://localhost:%PORT% in 15-30 seconds.' -ForegroundColor Yellow }"

echo.
echo ============================================================
echo   INSTALLATION COMPLETED!
echo ============================================================
echo.
echo   Web interface:  http://localhost:%PORT%
echo   Login:          admin
echo   Password:       admin
echo.
echo   WARNING: CHANGE PASSWORD in Settings after first login!
echo.
echo   Management:
echo     sc start %SERVICE_NAME%       - start
echo     sc stop %SERVICE_NAME%        - stop
echo     sc query %SERVICE_NAME%       - status
echo     services.msc                  - GUI
echo.
echo   Install folder: %APP_DIR%
echo   Logs:           %LOG_DIR%\server.log
echo   Database:       %DATA_DIR%\rkwebmon.db
echo.
echo ============================================================
echo.
echo Open browser now?
choice /c yn /m "Y - yes, N - no"
if errorlevel 2 exit /b 0
start "" "http://localhost:%PORT%"

endlocal
