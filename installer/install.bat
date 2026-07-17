@echo off
REM ============================================================
REM  RK Web Monitor v2.0.0 - Install as Windows Service
REM  Run as ADMINISTRATOR
REM ============================================================

title RK Web Monitor Installer

setlocal enabledelayedexpansion
cd /d "%~dp0" 2>nul
if errorlevel 1 (
    echo [ERROR] Cannot cd to script directory: %~dp0
    pause
    exit /b 1
)

set "APP_DIR=%~dp0"
set "NSSM=%APP_DIR%bin\nssm.exe"
set "NODE_EXE=%APP_DIR%node\node.exe"
set "SERVER_JS=%APP_DIR%app\server.js"
set "WATCHDOG_JS=%APP_DIR%bin\watchdog.js"
set "DATA_DIR=%APP_DIR%data"
set "LOG_DIR=%APP_DIR%logs"
set "LOG_FILE=%LOG_DIR%\server.log"
set "SERVICE_NAME=RKWebMonitor"
set "PORT=8083"

echo ============================================================
echo   RK Web Monitor v2.0.0 - Installer
echo ============================================================
echo   Folder:    %APP_DIR%
echo   Service:   %SERVICE_NAME%
echo   Port:      %PORT%
echo ============================================================
echo.

REM ===== Check admin rights =====
echo [0/10] Checking administrator rights...
net session >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Administrator rights required!
    echo.
    echo Solution:
    echo   1. Close this window
    echo   2. Right-click install.bat
    echo   3. Select "Run as administrator"
    echo.
    echo OR run START_HERE.bat instead - it will request admin rights automatically.
    echo.
    pause
    exit /b 1
)
echo   OK - administrator rights confirmed
echo.

REM ===== Check required files =====
echo [1/10] Checking required files...
if not exist "%NODE_EXE%" (
    echo   [FAIL] node.exe not found: %NODE_EXE%
    echo   Solution: re-download and extract RKWebMonitor-2.0.0-setup.exe
    pause
    exit /b 1
)
echo   [OK] node.exe
if not exist "%SERVER_JS%" (
    echo   [FAIL] server.js not found: %SERVER_JS%
    echo   Solution: re-download and extract RKWebMonitor-2.0.0-setup.exe
    pause
    exit /b 1
)
echo   [OK] server.js
if not exist "%NSSM%" (
    echo   [FAIL] nssm.exe not found: %NSSM%
    echo   Solution: re-download and extract RKWebMonitor-2.0.0-setup.exe
    pause
    exit /b 1
)
echo   [OK] nssm.exe
if not exist "%WATCHDOG_JS%" (
    echo   [FAIL] watchdog.js not found: %WATCHDOG_JS%
    echo   Solution: re-download and extract RKWebMonitor-2.0.0-setup.exe
    pause
    exit /b 1
)
echo   [OK] watchdog.js
if not exist "%APP_DIR%app\prisma\schema.prisma" (
    echo   [FAIL] prisma schema not found: %APP_DIR%app\prisma\schema.prisma
    pause
    exit /b 1
)
echo   [OK] prisma schema
echo.

REM ===== Create folders =====
echo [2/10] Creating data and logs folders...
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%" 2>nul
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" 2>nul
echo   OK
echo.

REM ===== Create .env file =====
echo [3/10] Creating .env file...
REM IMPORTANT: DATABASE_URL uses forward slashes for Prisma compatibility
set "DB_PATH_FOR_ENV=%APP_DIR%data\rkwebmon.db"
REM Replace backslashes with forward slashes
set "DB_PATH_FOR_ENV=%DB_PATH_FOR_ENV:\=/%"
(
    echo DATABASE_URL="file:%DB_PATH_FOR_ENV%"
    echo PORT=%PORT%
    echo HOSTNAME=0.0.0.0
    echo NODE_ENV=production
) > "%APP_DIR%app\.env"
if errorlevel 1 (
    echo   [FAIL] Cannot create .env file: %APP_DIR%app\.env
    echo   Check write permissions
    pause
    exit /b 1
)
echo   .env created:
type "%APP_DIR%app\.env"
echo.

REM ===== Check Prisma Windows engine (pre-generated in archive) =====
echo [4/10] Checking Prisma Windows engine...
set "PRISMA_FOUND=0"
for /r "%APP_DIR%app\node_modules\.prisma" %%f in (libquery_engine-windows*.dll.node query_engine-windows.dll.node) do (
    if exist "%%f" (
        echo   [OK] Found: %%f
        set "PRISMA_FOUND=1"
    )
)
if "!PRISMA_FOUND!"=="0" (
    echo   [WARN] Prisma Windows engine not found.
    echo   Trying prisma generate...
    cd /d "%APP_DIR%app"
    set "DATABASE_URL=file:%DB_PATH_FOR_ENV%"
    "%NODE_EXE%" "node_modules\prisma\build\index.js" generate 2>nul
    cd /d "%APP_DIR%"
)
echo.

REM ===== Initialize database via init-db.js (no prisma CLI needed) =====
echo [5/10] Initializing SQLite database...
echo   Creating tables and admin user...
cd /d "%APP_DIR%app"
set "DATABASE_URL=file:%DB_PATH_FOR_ENV%"
"%NODE_EXE%" "scripts\init-db.js"
if errorlevel 1 (
    echo.
    echo   [FAIL] Database initialization failed!
    echo   Check log above for details.
    echo.
    echo   You can try manually:
    echo     cd /d "%APP_DIR%app"
    echo     set DATABASE_URL=file:%DB_PATH_FOR_ENV%
    echo     "%NODE_EXE%" scripts\init-db.js
    echo.
    pause
    exit /b 1
)
cd /d "%APP_DIR%"
echo.

REM ===== Verify database created =====
echo [6/10] Verifying database...
if exist "%DATA_DIR%\rkwebmon.db" (
    for %%I in ("%DATA_DIR%\rkwebmon.db") do echo   [OK] Database: %%~zI bytes
) else (
    echo   [FAIL] Database file not created!
    pause
    exit /b 1
)
echo.

REM ===== Firewall =====
echo [7/10] Adding Windows Firewall rule (port %PORT%)...
netsh advfirewall firewall delete rule name="RK Web Monitor" >nul 2>&1
netsh advfirewall firewall add rule name="RK Web Monitor" dir=in action=allow protocol=TCP localport=%PORT%
echo   OK - network access enabled
echo.

REM ===== Remove old service =====
echo [8/10] Removing old service (if exists)...
"%NSSM%" stop %SERVICE_NAME% >nul 2>&1
timeout /t 2 /nobreak >nul
"%NSSM%" remove %SERVICE_NAME% confirm >nul 2>&1
echo   OK
echo.

REM ===== Install new service =====
echo [9/10] Installing service %SERVICE_NAME%...
"%NSSM%" install %SERVICE_NAME% "%NODE_EXE%" "%WATCHDOG_JS%"
if errorlevel 1 (
    echo   [FAIL] NSSM install failed
    pause
    exit /b 1
)
"%NSSM%" set %SERVICE_NAME% AppDirectory "%APP_DIR%"
REM Database URL with forward slashes
set "NSSM_DB_URL=file:%DB_PATH_FOR_ENV%"
"%NSSM%" set %SERVICE_NAME% AppEnvironmentExtra PORT=%PORT% HOSTNAME=0.0.0.0 NODE_ENV=production DATABASE_URL="%NSSM_DB_URL%" WATCHDOG_DIR="%APP_DIR%data"
"%NSSM%" set %SERVICE_NAME% AppStdout "%LOG_FILE%"
"%NSSM%" set %SERVICE_NAME% AppStderr "%LOG_FILE%"
"%NSSM%" set %SERVICE_NAME% AppRotateFiles 1
"%NSSM%" set %SERVICE_NAME% AppRotateBytes 10485760
"%NSSM%" set %SERVICE_NAME% AppExit Default Restart
"%NSSM%" set %SERVICE_NAME% AppRestartDelay 5000
"%NSSM%" set %SERVICE_NAME% Start SERVICE_AUTO_START
"%NSSM%" set %SERVICE_NAME% Description "RK Web Monitor v2.0.0 - R-Keeper 7 web monitoring"
echo   OK
echo.

REM ===== Start service =====
echo [10/10] Starting service...
"%NSSM%" start %SERVICE_NAME%
if errorlevel 1 (
    echo   [WARN] Service did not start immediately. Waiting 5 sec...
    timeout /t 5 /nobreak >nul
    echo   Service status:
    "%NSSM%" status %SERVICE_NAME%
    echo.
    echo   Last 30 lines of server log:
    if exist "%LOG_FILE%" (
        powershell -Command "Get-Content '%LOG_FILE%' -Tail 30" 2>nul
    ) else (
        echo   Log file not created - service failed to start
    )
    echo.
    echo   For full diagnostics run: diagnose.bat
) else (
    echo   OK - service started
)
echo.

REM ===== Check server availability =====
echo Checking server availability...
echo   Waiting 10 seconds...
timeout /t 10 /nobreak >nul

powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:%PORT%/' -TimeoutSec 10 -UseBasicParsing; Write-Host '  [OK] Server responds: HTTP' $r.StatusCode -ForegroundColor Green } catch { Write-Host '  [WARN] Server is still starting.' -ForegroundColor Yellow; Write-Host '  Check log: %LOG_FILE%' -ForegroundColor Yellow; Write-Host '  Or run: diagnose.bat' -ForegroundColor Yellow }"

REM ===== Network addresses =====
echo.
echo ============================================================
echo   INSTALLATION COMPLETED
echo ============================================================
echo.
echo   Web interface:
echo     Local:    http://localhost:%PORT%
echo               http://127.0.0.1:%PORT%
echo.
echo   Network access (from other computers):
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set "IP=%%a"
    set "IP=!IP: =!"
    echo     http://!IP!:%PORT%
)
echo.
echo   Login:      admin
echo   Password:   admin
echo.
echo   WARNING: CHANGE PASSWORD in Settings after first login!
echo.
echo   Service management:
echo     sc start %SERVICE_NAME%       - start
echo     sc stop %SERVICE_NAME%        - stop
echo     sc query %SERVICE_NAME%       - status
echo     services.msc                  - GUI
echo.
echo   Files:
echo     Install folder: %APP_DIR%
echo     Logs:            %LOG_FILE%
echo     Database:        %DATA_DIR%\rkwebmon.db
echo.
echo   Diagnostics: run diagnose.bat
echo ============================================================
echo.
echo Open browser now?
choice /c yn /m "Y - yes, N - no"
if errorlevel 2 goto :end
start "" "http://localhost:%PORT%"

:end
echo.
echo Press any key to close...
pause >nul
endlocal
