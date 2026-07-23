@echo off
REM ============================================================
REM  RK Web Monitor - Quick Start
REM  Asks: install as service OR run directly
REM ============================================================

title RK Web Monitor - Start Here

cd /d "%~dp0" 2>nul
if errorlevel 1 (echo [ERROR] Cannot cd & pause & exit /b 1)

echo ============================================================
echo   RK Web Monitor v2.0.0 - Quick Start
echo ============================================================
echo   Folder: %~dp0
echo ============================================================
echo.
echo   Choose how to start:
echo.
echo   1. Install as Windows Service (auto-start, needs admin)
echo   2. Run directly in this window (no admin needed)
echo   3. Exit
echo.
choice /c 123 /m "Select option"

if errorlevel 3 exit /b 0
if errorlevel 2 goto :run_direct
if errorlevel 1 goto :install

:install
echo.
echo [INFO] Installing as Windows Service...
echo [INFO] Administrator rights required.
timeout /t 2 /nobreak >nul
powershell -Command "Start-Process -FilePath '%~dp0install.bat' -Verb RunAs -WorkingDirectory '%~dp0'"
exit /b 0

:run_direct
echo.
call "%~dp0run-direct.bat"
exit /b 0
