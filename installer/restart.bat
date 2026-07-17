@echo off
title RK Web Monitor - Restart Service

setlocal
cd /d "%~dp0" 2>nul

set "NSSM=%~dp0bin\nssm.exe"
set "SERVICE_NAME=RKWebMonitor"

echo ============================================================
echo   RK Web Monitor - Restart Service
echo ============================================================
echo.

net session >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Administrator rights required!
    echo Right-click -^> Run as administrator
    pause
    exit /b 1
)

if exist "%NSSM%" (
    echo Stopping service...
    "%NSSM%" stop %SERVICE_NAME%
    timeout /t 2 /nobreak >nul
    echo Starting service...
    "%NSSM%" start %SERVICE_NAME%
    if errorlevel 1 (
        echo [WARN] Failed to restart.
    ) else (
        echo [OK] Service restarted.
    )
) else (
    echo [ERROR] NSSM not found: %NSSM%
)

echo.
echo Press any key to close...
pause >nul

endlocal
