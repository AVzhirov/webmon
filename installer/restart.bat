@echo off
REM ============================================================
REM  RK Web Monitor — перезапуск службы
REM  Используется для применения изменений порта и других настроек.
REM ============================================================

setlocal
cd /d "%~dp0"

set NSSM=%~dp0bin\nssm.exe
set SERVICE_NAME=RKWebMonitor

echo Перезапуск RK Web Monitor...

if exist "%NSSM%" (
    "%NSSM%" status %SERVICE_NAME% >nul 2>nul
    if not errorlevel 1 (
        echo Остановка службы...
        "%NSSM%" stop %SERVICE_NAME%
        timeout /t 2 /nobreak >nul
        echo Запуск службы...
        "%NSSM%" start %SERVICE_NAME%
        echo Служба перезапущена.
        timeout /t 2 /nobreak >nul
        exit /b 0
    )
)

echo Служба не установлена. Используйте stop.bat + start.bat.
call "%~dp0stop.bat"
call "%~dp0start.bat"

endlocal
