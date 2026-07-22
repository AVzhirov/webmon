#!/bin/bash
# ============================================================
# RK Web Monitor — Update script for GitBash on Windows
#
# Обновляет программу без скачивания установщика:
#   1. git pull — получает последние изменения с GitHub
#   2. bun install — обновляет зависимости
#   3. next build — пересобирает приложение
#   4. Копирует обновлённые файлы в app/
#   5. Перезапускает службу
#
# Запуск: ./installer/update.sh (или update.bat из папки проекта)
# Требует прав администратора
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC}  $1"; }
ok()      { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
fail()    { echo -e "${RED}[FAIL]${NC}  $1"; exit 1; }

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  RK Web Monitor - Update${NC}"
echo -e "${BLUE}============================================================${NC}"
echo "  Folder: $ROOT_DIR"
echo ""

# Check admin
info "Checking administrator rights..."
if ! net session >/dev/null 2>&1; then
    fail "Administrator rights required! Run GitBash as administrator."
fi
ok "Administrator rights confirmed"
echo ""

# Check git
info "Checking git..."
if ! command -v git >/dev/null 2>&1; then
    fail "Git not found. This script only works if you cloned the repo with 'git clone'. If you installed via .exe, download the new .exe from https://github.com/AVzhirov/webmon/releases/latest"
fi
ok "Git found: $(git --version)"
echo ""

# Stop service
info "Stopping service RKWebMonitor..."
NSSM="$ROOT_DIR/bin/nssm.exe"
if [ -f "$NSSM" ]; then
    "$NSSM" stop RKWebMonitor >/dev/null 2>&1 || true
    ok "Service stopped"
else
    warn "NSSM not found, skipping service stop"
fi
echo ""

# Git pull
info "Pulling latest code from GitHub..."
git pull origin main
if [ $? -ne 0 ]; then
    warn "git pull failed. Possible causes:"
    warn "  - Local changes conflict with remote (try: git stash && git pull)"
    warn "  - No internet connection"
    warn "  - Not a git repository (installed via .exe)"
    echo ""
    fail "Cannot continue. If you installed via .exe, download new version from https://github.com/AVzhirov/webmon/releases/latest"
fi
ok "Code updated"
echo ""

# Install dependencies + build
info "Installing dependencies and building (2-5 minutes)..."
NODE_EXE="$ROOT_DIR/node/node.exe"

if command -v bun >/dev/null 2>&1; then
    info "Using bun..."
    bun install 2>&1 | tail -5
    info "Building Next.js..."
    bun run build 2>&1 | tail -10
elif [ -f "$NODE_EXE" ]; then
    info "Using portable node.exe..."
    NPM_CMD="$NODE_EXE $ROOT_DIR/node/node_modules/npm/bin/npm-cli.js"
    $NPM_CMD install 2>&1 | tail -5
    info "Building Next.js..."
    "$NODE_EXE" "node_modules/next/dist/bin/next" build 2>&1 | tail -10
elif command -v node >/dev/null 2>&1; then
    info "Using system node..."
    npm install 2>&1 | tail -5
    info "Building Next.js..."
    npx next build 2>&1 | tail -10
else
    fail "Neither bun nor node available"
fi

if [ ! -f ".next/standalone/server.js" ]; then
    fail "Build failed - server.js not found"
fi
ok "Build successful (BUILD_ID: $(cat .next/standalone/.next/BUILD_ID))"
echo ""

# Copy updated files to app/
info "Copying updated files to app/..."
cp .next/standalone/server.js app/
cp -r .next/standalone/node_modules app/ 2>/dev/null || true
cp -r .next/standalone/.next app/ 2>/dev/null || true
cp -rf .next/static/* app/.next/static/ 2>/dev/null || true
cp -r .next/standalone/src app/ 2>/dev/null || true
cp .next/standalone/package.json app/ 2>/dev/null || true
cp -r public app/ 2>/dev/null || true
cp -r prisma app/ 2>/dev/null || true
mkdir -p app/scripts
cp scripts/init-db.js app/scripts/ 2>/dev/null || true
cp scripts/postbuild.js app/scripts/ 2>/dev/null || true

# Clean Linux binaries
info "Cleaning Linux binaries..."
rm -rf app/node_modules/@img/sharp-linux-x64 2>/dev/null || true
rm -rf app/node_modules/@img/sharp-libvips-linux-x64 2>/dev/null || true
rm -rf app/node_modules/@img/sharp-libvips-linuxmusl-x64 2>/dev/null || true
rm -rf app/node_modules/@img/sharp-linuxmusl-x64 2>/dev/null || true
find app/node_modules/.prisma -name "libquery_engine-debian*" -delete 2>/dev/null || true
find app/node_modules/.prisma -name "libquery_engine-linux*" -delete 2>/dev/null || true
ok "Files updated"
echo ""

# Restart service
info "Starting service..."
if [ -f "$NSSM" ]; then
    "$NSSM" start RKWebMonitor
    sleep 5
    "$NSSM" status RKWebMonitor 2>&1 || true
    ok "Service started"
else
    warn "NSSM not found. Start service manually: sc start RKWebMonitor"
fi
echo ""

# Check server
info "Checking server..."
sleep 3
if curl -s --max-time 5 http://localhost:8083/ -o /dev/null -w "%{http_code}" | grep -q "200\|302"; then
    ok "Server responds on http://localhost:8083"
else
    warn "Server still starting. Check logs: $ROOT_DIR/logs/server.log"
fi
echo ""

echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  UPDATE COMPLETED!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "  Web interface: http://localhost:8083"
echo "  Login:          admin"
echo "  Password:       admin (or your changed password)"
echo ""
echo "  Database and settings are PRESERVED."
echo ""
echo "  Press any key to close..."
read -n 1
