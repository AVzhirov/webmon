@echo off
title RK Web Monitor - Network Setup

setlocal enabledelayedexpansion
cd /d "%~dp0" 2>nul

set "PORT=8083"
set "SERVICE_NAME=RKWebMonitor"

echo ============================================================
echo   RK Web Monitor - Network Access Setup
echo ============================================================
echo.

net session >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Administrator rights required!
    echo Right-click -^> Run as administrator
    pause
    exit /b 1
)

echo [1/5] Network addresses of this computer:
echo.
echo   Local:
echo     http://localhost:%PORT%
echo     http://127.0.0.1:%PORT%
echo.
echo   Network (access from other PCs):
set "HAS_NETWORK_IP=0"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set "IP=%%a"
    set "IP=!IP: =!"
    if not "!IP!"=="127.0.0.1" (
        echo     http://!IP!:%PORT%
        set "HAS_NETWORK_IP=1"
    )
)
if "!HAS_NETWORK_IP!"=="0" (
    echo     [WARN] No network interfaces found
)
echo.

echo [2/5] Service status:
sc query %SERVICE_NAME% 2>nul | findstr /i "STATE"
echo.

echo [3/5] Firewall rule:
netsh advfirewall firewall show rule name="RK Web Monitor" 2>nul | findstr /i "Enabled Direction LocalPort"
if errorlevel 1 (
    echo   [WARN] Firewall rule NOT found. Creating...
    netsh advfirewall firewall add rule name="RK Web Monitor" dir=in action=allow protocol=TCP localport=%PORT%
    echo   [OK] Rule created
) else (
    echo   [OK] Firewall rule exists
)
echo.

echo [4/5] Port %PORT% status:
netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul
if errorlevel 1 (
    echo   [WARN] Port %PORT% is NOT listening! Service not running.
    echo   Run: sc start %SERVICE_NAME%
    echo   Or: diagnose.bat
) else (
    echo   [OK] Port %PORT% is listening
    echo   Processes on port:
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
        echo     PID %%a:
        tasklist /fi "PID eq %%a" 2>nul | findstr /v "Image Name"
    )
)
echo.

echo [5/5] Server response test:
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:%PORT%/' -TimeoutSec 5 -UseBasicParsing; Write-Host '  [OK] HTTP' $r.StatusCode -ForegroundColor Green } catch { Write-Host '  [FAIL]' $_.Exception.Message -ForegroundColor Red }"
echo.

echo ============================================================
echo   HOW TO CONNECT FROM ANOTHER COMPUTER
echo ============================================================
echo.
echo   1. On this computer (where RK Web Monitor is installed):
echo      - Service must be running: sc query %SERVICE_NAME%
echo      - Port must be listening (see above)
echo      - Firewall must allow (see above)
echo.
echo   2. On another computer in the network:
echo      - Open browser
echo      - Enter one of the network IPs (see above)
echo        e.g.: http://192.168.1.100:%PORT%
echo.
echo   3. If not accessible:
echo      - Check ping: ping ^<computer-IP^>
echo      - Check antivirus (may block port)
echo      - Both PCs must be in same subnet
echo      - Run diagnose.bat on server
echo.
echo   4. To change port:
echo      - Login as admin
echo      - Settings -^> System -^> Port -^> Save
echo      - Click "Restart Service"
echo      - Update Firewall rule:
echo        netsh advfirewall firewall delete rule name="RK Web Monitor"
echo        netsh advfirewall firewall add rule name="RK Web Monitor" dir=in action=allow protocol=TCP localport=NEW_PORT
echo.
echo ============================================================
echo.
echo Press any key to close...
pause >nul

endlocal
