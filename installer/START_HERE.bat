@echo off
REM ============================================================
REM  RK Web Monitor v2.0.0 — Запуск установки
REM  Двойной клик по этому файлу = начало установки
REM ============================================================

setlocal
cd /d "%~dp0"

echo ============================================================
echo   RK Web Monitor v2.0.0
echo   Установка как Windows Service
echo ============================================================
echo.

REM Проверка прав администратора
net session >nul 2>&1
if errorlevel 1 (
    echo [ВНИМАНИЕ] Для установки требуются права администратора!
    echo.
    echo Сейчас будет запрошено повышение прав...
    echo.
    powershell -Command "Start-Process '%~dp0install.bat' -Verb RunAs"
    exit /b 0
)

REM Если уже админ — запускаем install.bat напрямую
call "%~dp0install.bat"

endlocal
