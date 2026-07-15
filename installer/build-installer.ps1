# ============================================================
# Build Windows installer for RK Web Monitor
#
# Этот скрипт нужно запускать на Windows machine с установленным:
#   - Node.js (https://nodejs.org)
#   - Bun (https://bun.sh) или npm
#   - Inno Setup (https://jrsoftware.org/isdl.php)
#
# Что делает скрипт:
#   1. Собирает Next.js standalone
#   2. Скачивает portable Node.js для Windows x64
#   3. Скачивает NSSM (для опциональной установки как Windows service)
#   4. Компилирует .iss через iscc.exe → dist\RKWebMonitor-2.0.0-setup.exe
# ============================================================

$ErrorActionPreference = "Stop"
$root = Resolve-Path "$PSScriptRoot\.."
$installer = "$root\installer"
$dist = "$root\dist"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  RK Web Monitor — Installer Builder" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# --- Step 1: Build Next.js standalone ---
Write-Host "[1/5] Building Next.js standalone..." -ForegroundColor Yellow
Push-Location $root
& bun install
if ($LASTEXITCODE -ne 0) { throw "bun install failed" }

& bun run build
if ($LASTEXITCODE -ne 0) { throw "next build failed" }
Pop-Location

if (-not (Test-Path "$root\.next\standalone\server.js")) {
    throw "Standalone build not found at .next\standalone\server.js"
}
Write-Host "  OK: standalone build created" -ForegroundColor Green

# --- Step 2: Download portable Node.js ---
$nodeDir = "$installer\node-portable"
if (-not (Test-Path $nodeDir)) {
    Write-Host "[2/5] Downloading portable Node.js..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $nodeDir | Out-Null

    $nodeVersion = "v22.11.0"
    $nodeUrl = "https://nodejs.org/dist/$nodeVersion/node-$nodeVersion-win-x64.zip"
    $zipFile = "$env:TEMP\node-portable.zip"

    Invoke-WebRequest -Uri $nodeUrl -OutFile $zipFile -UseBasicParsing
    Expand-Archive -Path $zipFile -DestinationPath "$env:TEMP\node-extract" -Force

    # Копируем только нужные файлы (node.exe + минимальный набор)
    Copy-Item "$env:TEMP\node-extract\node-$nodeVersion-win-x64\node.exe" $nodeDir
    # Можно добавить ещё модули при необходимости

    Remove-Item $zipFile -Force
    Remove-Item "$env:TEMP\node-extract" -Recurse -Force
    Write-Host "  OK: Node.js portable downloaded" -ForegroundColor Green
} else {
    Write-Host "[2/5] Portable Node.js already exists, skip" -ForegroundColor Green
}

# --- Step 3: Download NSSM ---
$nssmDir = "$installer\nssm"
if (-not (Test-Path "$nssmDir\nssm.exe")) {
    Write-Host "[3/5] Downloading NSSM (service manager)..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $nssmDir | Out-Null

    $nssmUrl = "https://nssm.cc/release/nssm-2.24.zip"
    $zipFile = "$env:TEMP\nssm.zip"

    Invoke-WebRequest -Uri $nssmUrl -OutFile $zipFile -UseBasicParsing
    Expand-Archive -Path $zipFile -DestinationPath "$env:TEMP\nssm-extract" -Force

    Copy-Item "$env:TEMP\nssm-extract\nssm-2.24\win64\nssm.exe" $nssmDir

    Remove-Item $zipFile -Force
    Remove-Item "$env:TEMP\nssm-extract" -Recurse -Force
    Write-Host "  OK: NSSM downloaded" -ForegroundColor Green
} else {
    Write-Host "[3/5] NSSM already exists, skip" -ForegroundColor Green
}

# --- Step 4: Compile Inno Setup installer ---
Write-Host "[4/5] Compiling installer with Inno Setup..." -ForegroundColor Yellow

$iscc = Get-Command iscc -ErrorAction SilentlyContinue
if (-not $iscc) {
    $isccPath = "${env:ProgramFiles(x86)}\Inno Setup 6\iscc.exe"
    if (-not (Test-Path $isccPath)) {
        throw "Inno Setup not found. Install from https://jrsoftware.org/isdl.php"
    }
    $iscc = $isccPath
} else {
    $iscc = $iscc.Source
}

if (-not (Test-Path $dist)) {
    New-Item -ItemType Directory -Force -Path $dist | Out-Null
}

& $iscc "$installer\webmonitor.iss"
if ($LASTEXITCODE -ne 0) { throw "Inno Setup compilation failed" }
Write-Host "  OK: installer compiled" -ForegroundColor Green

# --- Step 5: Done ---
Write-Host "[5/5] Done!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Installer:" -ForegroundColor Cyan
Get-ChildItem "$dist\*.exe" | ForEach-Object {
    Write-Host "  $($_.FullName)" -ForegroundColor White
    Write-Host "  Size: $([math]::Round($_.Length / 1MB, 2)) MB" -ForegroundColor Gray
}
Write-Host ""
Write-Host "Distribution instructions:" -ForegroundColor Cyan
Write-Host "  1. Copy the .exe to target Windows machine"
Write-Host "  2. Run as Administrator"
Write-Host "  3. Follow the installation wizard"
Write-Host "  4. App starts automatically at http://localhost:3000"
Write-Host "  5. Default login: admin / admin (change in Settings!)"
