@echo off
REM ============================================================
REM  Build Windows installer for RK Web Monitor
REM  Запускать на Windows машине с установленным Inno Setup
REM ============================================================

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-installer.ps1"
pause
