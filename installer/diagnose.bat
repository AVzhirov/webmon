@echo off
title RK Web Monitor - Diagnostics

setlocal enabledelayedexpansion
cd /d "%~dp0" 2>nul

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
echo   RK Web Monitor - Diagnostics
echo ============================================================
echo   Folder: %APP_DIR%
echo   Date:   %DATE% %TIME%
echo ============================================================
echo.

REM ===== 1. Admin rights =====
echo [1/10] Checking administrator rights...
net session >nul 2>&1
if errorlevel 1 (
    echo   [FAIL] Not running as administrator!
    echo   Right-click diagnose.bat -^> Run as administrator
) else (
    echo   [OK] Administrator rights
)
echo.

REM ===== 2. Files =====
echo [2/10] Checking files...
if exist "%NODE_EXE%" (
    echo   [OK] node.exe
) else (
    echo   [FAIL] node.exe NOT found: %NODE_EXE%
)
if exist "%SERVER_JS%" (
    echo   [OK] server.js
) else (
    echo   [FAIL] server.js NOT found: %SERVER_JS%
)
if exist "%WATCHDOG_JS%" (
    echo   [OK] watchdog.js
) else (
    echo   [FAIL] watchdog.js NOT found: %WATCHDOG_JS%
)
if exist "%NSSM%" (
    echo   [OK] nssm.exe
) else (
    echo   [FAIL] nssm.exe NOT found: %NSSM%
)
if exist "%APP_DIR%app\prisma\schema.prisma" (
    echo   [OK] prisma schema
) else (
    echo   [FAIL] prisma schema NOT found
)
if exist "%APP_DIR%app\.env" (
    echo   [OK] .env file
    echo   --- .env contents ---
    type "%APP_DIR%app\.env"
    echo   ---
) else (
    echo   [FAIL] .env file NOT found
)
echo.

REM ===== 3. Port =====
echo [3/10] Checking port %PORT%...
netstat -an | findstr ":%PORT% " | findstr "LISTENING" >nul
if errorlevel 1 (
    echo   [INFO] Port %PORT% is free
) else (
    echo   [WARN] Port %PORT% is BUSY:
    netstat -ano | findstr ":%PORT% " | findstr "LISTENING"
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
        echo   Process PID %%a:
        tasklist /fi "PID eq %%a" 2>nul
    )
)
echo.

REM ===== 4. Service =====
echo [4/10] Checking service %SERVICE_NAME%...
sc query %SERVICE_NAME% 2>nul | findstr /i "STATE"
if errorlevel 1 (
    echo   [FAIL] Service NOT installed
    echo   Run install.bat to install
) else (
    echo   [OK] Service installed
)
echo.

REM ===== 5. NSSM config =====
echo [5/10] NSSM configuration...
if exist "%NSSM%" (
    echo   Application:
    "%NSSM%" get %SERVICE_NAME% Application 2>nul
    echo   AppDirectory:
    "%NSSM%" get %SERVICE_NAME% AppDirectory 2>nul
    echo   AppEnvironmentExtra:
    "%NSSM%" get %SERVICE_NAME% AppEnvironmentExtra 2>nul
)
echo.

REM ===== 6. Logs =====
echo [6/10] Last 50 lines of server log...
if exist "%LOG_FILE%" (
    echo   Log: %LOG_FILE%
    for %%I in ("%LOG_FILE%") do echo   Size: %%~zI bytes
    echo   --- last 50 lines ---
    powershell -Command "Get-Content '%LOG_FILE%' -Tail 50" 2>nul
    echo   ---
) else (
    echo   [FAIL] Log file NOT found: %LOG_FILE%
    echo   Service never started successfully
)
echo.

REM ===== 7. Firewall =====
echo [7/10] Checking Firewall rule...
netsh advfirewall firewall show rule name="RK Web Monitor" 2>nul | findstr /i "enabled direction localport"
if errorlevel 1 (
    echo   [WARN] Firewall rule NOT found
    echo   Run install.bat or add manually:
    echo     netsh advfirewall firewall add rule name="RK Web Monitor" dir=in action=allow protocol=TCP localport=%PORT%
)
echo.

REM ===== 8. Database =====
echo [8/10] Checking database...
if exist "%DATA_DIR%\rkwebmon.db" (
    echo   [OK] Database: %DATA_DIR%\rkwebmon.db
    for %%I in ("%DATA_DIR%\rkwebmon.db") do echo   Size: %%~zI bytes
) else (
    echo   [FAIL] Database NOT found
    echo   Run install.bat to initialize
)
echo.

REM ===== 9. Prisma engine =====
echo [9/10] Checking Prisma Windows engine...
set "PRISMA_FOUND=0"
for /r "%APP_DIR%app\node_modules\.prisma" %%f in (libquery_engine-windows*.dll.node query_engine-windows.dll.node) do (
    if exist "%%f" (
        echo   [OK] Found: %%f
        set "PRISMA_FOUND=1"
    )
)
if "!PRISMA_FOUND!"=="0" (
    echo   [FAIL] Prisma Windows engine NOT found
    echo   Run from app folder:
    echo     "%NODE_EXE%" node_modules\prisma\build\index.js generate
)
echo.

REM ===== 10. Test run =====
echo [10/10] Manual server test (5 seconds)...
echo   Running node server.js for 5 seconds...
cd /d "%APP_DIR%app"
set "PORT=8083"
set "HOSTNAME=0.0.0.0"
set "DATABASE_URL=file:%APP_DIR%data\rkwebmon.db"
set "DATABASE_URL=%DATABASE_URL:\=/%"
set "NODE_ENV=production"

start /b "" "%NODE_EXE%" server.js > "%LOG_DIR%\test-run.log" 2>&1
timeout /t 5 /nobreak >nul

if exist "%LOG_DIR%\test-run.log" (
    echo   --- test run log ---
    type "%LOG_DIR%\test-run.log"
    echo   ---
)

powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:8083/' -TimeoutSec 3 -UseBasicParsing; Write-Host '[OK] Server responds: HTTP' $r.StatusCode } catch { Write-Host '[FAIL] Server not responding:' $_.Exception.Message }"

REM Kill test process
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8083 " ^| findstr "LISTENING"') do (
    taskkill /pid %%a /T /F >nul 2>nul
)
cd /d "%APP_DIR%"
echo.

echo ============================================================
echo   DIAGNOSTICS COMPLETE
echo ============================================================
echo.
echo Log: %LOG_DIR%\test-run.log
echo.
echo If you see [FAIL] errors - run install.bat again.
echo If problem persists - send this output to developer.
echo.
echo Press any key to close...
pause >nul

endlocal
