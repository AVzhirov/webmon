@echo off
title RK Web Monitor - Start Service

setlocal
cd /d "%~dp0" 2>nul

set "NSSM=%~dp0bin\nssm.exe"
set "SERVICE_NAME=RKWebMonitor"

echo ============================================================
echo   RK Web Monitor - Start Service
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
    "%NSSM%" status %SERVICE_NAME% >nul 2>nul
    if not errorlevel 1 (
        echo Starting service %SERVICE_NAME%...
        "%NSSM%" start %SERVICE_NAME%
        if errorlevel 1 (
            echo [WARN] Failed to start service.
            echo Try: sc start %SERVICE_NAME%
        ) else (
            echo [OK] Service started.
            echo.
            echo Opening browser...
            timeout /t 3 /nobreak >nul
            start "" "http://localhost:8083"
        )
    ) else (
        echo [ERROR] Service %SERVICE_NAME% not installed.
        echo Run install.bat first.
    )
) else (
    echo [ERROR] NSSM not found: %NSSM%
)

echo.
echo Press any key to close...
pause >nul

endlocal
