@echo off
title RK Web Monitor - Uninstall

setlocal
cd /d "%~dp0" 2>nul

set "NSSM=%~dp0bin\nssm.exe"
set "SERVICE_NAME=RKWebMonitor"

echo ============================================================
echo   RK Web Monitor - Uninstall
echo ============================================================
echo.

net session >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Administrator rights required!
    echo Right-click -^> Run as administrator
    pause
    exit /b 1
)

echo This will:
echo   1. Stop service %SERVICE_NAME%
echo   2. Remove service %SERVICE_NAME%
echo   3. Remove Firewall rule
echo   4. Remove Start Menu shortcuts
echo.
echo Database and logs will be PRESERVED.
echo.
set /p CONFIRM=Continue? (y/N):
if /i not "%CONFIRM%"=="y" (
    echo Cancelled.
    pause
    exit /b 0
)

echo.
echo [1/4] Stopping service...
if exist "%NSSM%" (
    "%NSSM%" stop %SERVICE_NAME% >nul 2>&1
    echo [2/4] Removing service...
    "%NSSM%" remove %SERVICE_NAME% confirm >nul 2>&1
) else (
    echo [WARN] NSSM not found, trying sc...
    sc stop %SERVICE_NAME% >nul 2>&1
    sc delete %SERVICE_NAME% >nul 2>&1
)

echo [3/4] Removing Firewall rule...
netsh advfirewall firewall delete rule name="RK Web Monitor" >nul 2>&1

echo [4/4] Removing Start Menu shortcuts...
rd /s /q "%ProgramData%\Microsoft\Windows\Start Menu\Programs\RK Web Monitor" 2>nul

echo.
echo ============================================================
echo   Uninstall completed!
echo ============================================================
echo.
echo Database preserved: %~dp0data\rkwebmon.db
echo Logs preserved:    %~dp0logs\
echo.
echo To fully remove - delete folder: %~dp0
echo.
echo Press any key to close...
pause >nul

endlocal
