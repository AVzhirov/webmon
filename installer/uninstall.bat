@echo off
REM ============================================================
REM  RK Web Monitor — Удаление службы
REM  Запускать от имени АДМИНИСТРАТОРА
REM ============================================================

setlocal
cd /d "%~dp0"

set NSSM=%~dp0bin\nssm.exe
set SERVICE_NAME=RKWebMonitor

echo Удаление RK Web Monitor...

net session >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Требуются права администратора!
    pause
    exit /b 1
)

echo [1/4] Остановка службы...
"%NSSM%" stop %SERVICE_NAME% >nul 2>&1

echo [2/4] Удаление службы...
"%NSSM%" remove %SERVICE_NAME% confirm >nul 2>&1

echo [3/4] Удаление правила Firewall...
netsh advfirewall firewall delete rule name="RK Web Monitor" >nul 2>&1

echo [4/4] Удаление ярлыков...
rd /s /q "%ProgramData%\Microsoft\Windows\Start Menu\Programs\RK Web Monitor" 2>nul

echo.
echo ============================================================
echo   Удаление завершено!
echo ============================================================
echo.
echo   База данных сохранена: %~dp0data\rkwebmon.db
echo   Логи сохранены:        %~dp0logs\
echo.
echo   Для полного удаления удалите папку: %~dp0
echo.
pause

endlocal
