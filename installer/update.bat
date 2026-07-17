@echo off
REM ============================================================
REM  RK Web Monitor - Update
REM
REM  Two modes:
REM    1. If installed via git clone: git pull + rebuild
REM    2. If installed via .exe: download new ZIP from GitHub
REM
REM  Run as ADMINISTRATOR
REM ============================================================

title RK Web Monitor - Update

setlocal enabledelayedexpansion
cd /d "%~dp0" 2>nul

set "APP_DIR=%~dp0"
set "NODE_EXE=%APP_DIR%node\node.exe"
set "NSSM=%APP_DIR%bin\nssm.exe"
set "SERVICE_NAME=RKWebMonitor"
set "LOG_DIR=%APP_DIR%logs"

echo ============================================================
echo   RK Web Monitor - Update
echo ============================================================
echo   Folder: %APP_DIR%
echo   Date:   %DATE% %TIME%
echo ============================================================
echo.

REM Check admin
net session >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Administrator rights required!
    echo Right-click -^> Run as administrator
    pause
    exit /b 1
)

REM Check if this is a git repo
if exist ".git" (
    echo [INFO] Git repository detected. Updating via git pull...
    echo.
    goto :git_update
) else (
    echo [INFO] Not a git repository. Will download new version from GitHub.
    echo.
    goto :download_update
)

:git_update
echo [1/5] Stopping service...
if exist "%NSSM%" "%NSSM%" stop %SERVICE_NAME% >nul 2>&1
echo   OK
echo.

echo [2/5] Pulling latest code...
git pull origin main
if errorlevel 1 (
    echo.
    echo [WARN] git pull failed. Trying with stash...
    git stash >nul 2>&1
    git pull origin main
    if errorlevel 1 (
        echo [FAIL] Cannot pull from GitHub
        echo Check internet connection
        pause
        exit /b 1
    )
)
echo   OK
echo.

echo [3/5] Installing dependencies and building...
echo   This takes 2-5 minutes...
where bun >nul 2>&1
if not errorlevel 1 (
    bun install 2>&1
    bun run build 2>&1
) else (
    if exist "%NODE_EXE%" (
        if exist "%APP_DIR%node\node_modules\npm\bin\npm-cli.js" (
            "%NODE_EXE%" "%APP_DIR%node\node_modules\npm\bin\npm-cli.js" install 2>&1
            "%NODE_EXE%" "node_modules\next\dist\bin\next" build 2>&1
        ) else (
            echo [ERROR] No bun or npm available
            pause
            exit /b 1
        )
    ) else (
        npx next build 2>&1
    )
)
if not exist ".next\standalone\server.js" (
    echo [FAIL] Build failed
    pause
    exit /b 1
)
echo   OK
echo.

echo [4/5] Copying updated files to app\...
xcopy /E /Y /Q ".next\standalone\*" "app\" >nul 2>&1
xcopy /E /Y /Q ".next\static\*" "app\.next\static\" >nul 2>&1
xcopy /E /Y /Q "public\*" "app\public\" >nul 2>&1
xcopy /E /Y /Q "prisma\*" "app\prisma\" >nul 2>&1
if exist "scripts" xcopy /E /Y /Q "scripts\*" "app\scripts\" >nul 2>&1
echo   OK
echo.

echo [5/5] Starting service...
if exist "%NSSM%" "%NSSM%" start %SERVICE_NAME%
echo   OK
echo.
goto :done

:download_update
echo [1/4] Stopping service...
if exist "%NSSM%" "%NSSM%" stop %SERVICE_NAME% >nul 2>&1
echo   OK
echo.

echo [2/4] Downloading new version from GitHub...
echo   URL: https://github.com/AVzhirov/webmon/releases/download/v2.0.0/RKWebMonitor-2.0.0-portable.zip
echo   This may take a few minutes...
powershell -Command "try { Invoke-WebRequest -Uri 'https://github.com/AVzhirov/webmon/releases/download/v2.0.0/RKWebMonitor-2.0.0-portable.zip' -OutFile '%TEMP%\rkwebmon-update.zip' -UseBasicParsing; Write-Host '  Downloaded' -ForegroundColor Green } catch { Write-Host '  FAILED:' $_.Exception.Message -ForegroundColor Red; exit 1 }"
if errorlevel 1 (
    echo.
    echo [FAIL] Cannot download update.
    echo Download manually from:
    echo   https://github.com/AVzhirov/webmon/releases/latest
    pause
    exit /b 1
)
echo   OK
echo.

echo [3/4] Extracting update (preserving data and logs)...
echo   Backing up data and logs...
if exist "%APP_DIR%data\rkwebmon.db" copy /Y "%APP_DIR%data\rkwebmon.db" "%TEMP%\rkwebmon-db-backup" >nul
echo   Extracting new files...
powershell -Command "Expand-Archive -Path '%TEMP%\rkwebmon-update.zip' -DestinationPath '%TEMP%\rkwebmon-update' -Force"
echo   Copying new app files...
xcopy /E /Y /Q "%TEMP%\rkwebmon-update\app\*" "%APP_DIR%app\" >nul 2>&1
xcopy /E /Y /Q "%TEMP%\rkwebmon-update\node\*" "%APP_DIR%node\" >nul 2>&1
xcopy /E /Y /Q "%TEMP%\rkwebmon-update\bin\*" "%APP_DIR%bin\" >nul 2>&1
copy /Y "%TEMP%\rkwebmon-update\install.bat" "%APP_DIR%install.bat" >nul 2>&1
copy /Y "%TEMP%\rkwebmon-update\diagnose.bat" "%APP_DIR%diagnose.bat" >nul 2>&1
copy /Y "%TEMP%\rkwebmon-update\update.bat" "%APP_DIR%update.bat" >nul 2>&1
copy /Y "%TEMP%\rkwebmon-update\START_HERE.bat" "%APP_DIR%START_HERE.bat" >nul 2>&1
echo   Restoring database...
if exist "%TEMP%\rkwebmon-db-backup" copy /Y "%TEMP%\rkwebmon-db-backup" "%APP_DIR%data\rkwebmon.db" >nul
echo   Cleaning up temp files...
rd /S /Q "%TEMP%\rkwebmon-update" 2>nul
del "%TEMP%\rkwebmon-update.zip" 2>nul
del "%TEMP%\rkwebmon-db-backup" 2>nul
echo   OK
echo.

echo [4/4] Starting service...
if exist "%NSSM%" "%NSSM%" start %SERVICE_NAME%
echo   OK
echo.

:done
echo Checking server...
timeout /t 5 /nobreak >nul
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:8083/' -TimeoutSec 5 -UseBasicParsing; Write-Host '  [OK] Server responds: HTTP' $r.StatusCode -ForegroundColor Green } catch { Write-Host '  [WARN] Server still starting' -ForegroundColor Yellow }"

echo.
echo ============================================================
echo   UPDATE COMPLETED!
echo ============================================================
echo.
echo   Web interface: http://localhost:8083
echo   Database and settings are PRESERVED.
echo.
echo Press any key to close...
pause >nul

endlocal
