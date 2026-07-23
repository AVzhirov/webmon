#!/bin/bash
# ============================================================
# Build Windows installer for RK Web Monitor
# Works on Linux (no sudo required, no Wine required)
#
# Output:
#   download/RKWebMonitor-2.0.0-setup.exe       (SFX, ~36 MB)
#   download/RKWebMonitor-2.0.0-portable.zip    (~74 MB)
# ============================================================

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="${TMPDIR:-/tmp}/rkwebmon-build"
DOWNLOAD_DIR="${TMPDIR:-/tmp}/rkwebmon-dl"
VERSION="2.0.0"

cd "$ROOT"

echo "============================================================"
echo "  RK Web Monitor v${VERSION} — Build Windows installer"
echo "============================================================"
echo ""

# --- Step 1: Build Next.js standalone ---
echo "[1/8] Building Next.js standalone..."
bun run build
if [ ! -f ".next/standalone/server.js" ]; then
    echo "ERROR: Standalone build failed"
    exit 1
fi
echo "  OK"
echo ""

# --- Step 2: Download dependencies ---
mkdir -p "$DOWNLOAD_DIR"

echo "[2/8] Downloading portable Node.js v22.11.0 for Windows x64..."
if [ ! -f "$DOWNLOAD_DIR/node-portable.zip" ]; then
    curl -fsSL "https://nodejs.org/dist/v22.11.0/node-v22.11.0-win-x64.zip" -o "$DOWNLOAD_DIR/node-portable.zip"
fi
echo "  OK (cached)"
echo ""

echo "[3/8] Downloading NSSM 2.24..."
if [ ! -f "$DOWNLOAD_DIR/nssm.zip" ]; then
    curl -fsSL "https://nssm.cc/release/nssm-2.24.zip" -o "$DOWNLOAD_DIR/nssm.zip"
fi
echo "  OK (cached)"
echo ""

echo "[4/8] Downloading p7zip for Linux..."
if [ ! -f "$DOWNLOAD_DIR/p7zip.tar.xz" ]; then
    curl -fsSL "https://www.7-zip.org/a/7z2403-linux-x64.tar.xz" -o "$DOWNLOAD_DIR/p7zip.tar.xz" 2>/dev/null || true
    if [ ! -s "$DOWNLOAD_DIR/p7zip.tar.xz" ]; then
        curl -fsSL "https://www.7-zip.org/a/7z2301-linux-x64.tar.xz" -o "$DOWNLOAD_DIR/p7zip.tar.xz"
    fi
fi
mkdir -p "$DOWNLOAD_DIR/p7zip"
tar xf "$DOWNLOAD_DIR/p7zip.tar.xz" -C "$DOWNLOAD_DIR/p7zip" 2>/dev/null || true
P7Z="$DOWNLOAD_DIR/p7zip/7zz"
echo "  OK (cached)"
echo ""

echo "[5/8] Downloading 7-Zip SFX module..."
if [ ! -f "$DOWNLOAD_DIR/7z-win-x64.exe" ]; then
    curl -fsSL "https://www.7-zip.org/a/7z2301-x64.exe" -o "$DOWNLOAD_DIR/7z-win-x64.exe"
fi
mkdir -p "$DOWNLOAD_DIR/7z-win"
"$P7Z" x "$DOWNLOAD_DIR/7z-win-x64.exe" -o"$DOWNLOAD_DIR/7z-win" -y > /dev/null
SFX_MODULE="$DOWNLOAD_DIR/7z-win/7z.sfx"
echo "  OK (cached)"
echo ""

# --- Step 3: Prepare build directory ---
echo "[6/8] Preparing build directory..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"/{app,node,bin,data,logs}

# Copy standalone Next.js
cp .next/standalone/server.js "$BUILD_DIR/app/"
cp -r .next/standalone/node_modules "$BUILD_DIR/app/"
cp -r .next/standalone/src "$BUILD_DIR/app/" 2>/dev/null || true
cp .next/standalone/package.json "$BUILD_DIR/app/"
mkdir -p "$BUILD_DIR/app/.next"
cp -r .next/static "$BUILD_DIR/app/.next/"
cp -r public "$BUILD_DIR/app/"
cp -r prisma "$BUILD_DIR/app/"

# Copy portable Node.js
unzip -q -o "$DOWNLOAD_DIR/node-portable.zip" -d "$DOWNLOAD_DIR/node-extracted"
cp "$DOWNLOAD_DIR/node-extracted/node-v22.11.0-win-x64/node.exe" "$BUILD_DIR/node/"
cp "$DOWNLOAD_DIR/node-extracted/node-v22.11.0-win-x64/"*.dll "$BUILD_DIR/node/" 2>/dev/null || true
cp -r "$DOWNLOAD_DIR/node-extracted/node-v22.11.0-win-x64/node_modules" "$BUILD_DIR/node/" 2>/dev/null || true

# Copy NSSM
unzip -q -o "$DOWNLOAD_DIR/nssm.zip" -d "$DOWNLOAD_DIR/nssm-extracted"
cp "$DOWNLOAD_DIR/nssm-extracted/nssm-2.24/win64/nssm.exe" "$BUILD_DIR/bin/"
cp installer/watchdog.js "$BUILD_DIR/bin/"

# Create .env
cat > "$BUILD_DIR/app/.env" << 'EOF'
DATABASE_URL="file:../data/rkwebmon.db"
PORT=8083
HOSTNAME=0.0.0.0
NODE_ENV=production
EOF

# Copy bat files and docs
cp installer/install.bat "$BUILD_DIR/"
cp installer/uninstall.bat "$BUILD_DIR/"
cp installer/update.bat "$BUILD_DIR/"
cp installer/diagnose.bat "$BUILD_DIR/"
cp installer/run-direct.bat "$BUILD_DIR/"
cp installer/START_HERE.bat "$BUILD_DIR/"
cp installer/README-INSTALL.txt "$BUILD_DIR/"
cp installer/USERGUIDE.md "$BUILD_DIR/"
cp installer/LICENSE.rtf "$BUILD_DIR/"
cp README.md "$BUILD_DIR/"

# Remove Linux binaries from node_modules
echo "  Removing Linux-specific binaries..."
rm -rf "$BUILD_DIR/app/node_modules/@img/sharp-linux-x64"
rm -rf "$BUILD_DIR/app/node_modules/@img/sharp-libvips-linux-x64"
rm -rf "$BUILD_DIR/app/node_modules/@img/sharp-libvips-linuxmusl-x64"
rm -rf "$BUILD_DIR/app/node_modules/@img/sharp-linuxmusl-x64"
find "$BUILD_DIR/app/node_modules/.prisma" -name "libquery_engine-debian*" -delete 2>/dev/null || true
find "$BUILD_DIR/app/node_modules/.prisma" -name "libquery_engine-linux*" -delete 2>/dev/null || true

# Download Windows sharp binary
echo "  Adding Windows sharp binary..."
mkdir -p "$BUILD_DIR/app/node_modules/@img/sharp-win32-x64/lib"
curl -fsSL "https://registry.npmjs.org/@img/sharp-win32-x64/-/sharp-win32-x64-0.35.3.tgz" -o "$DOWNLOAD_DIR/sharp-win32.tgz"
mkdir -p "$DOWNLOAD_DIR/sharp-win32-extracted"
tar xzf "$DOWNLOAD_DIR/sharp-win32.tgz" -C "$DOWNLOAD_DIR/sharp-win32-extracted"
cp -r "$DOWNLOAD_DIR/sharp-win32-extracted/package/"* "$BUILD_DIR/app/node_modules/@img/sharp-win32-x64/"

echo "  Build directory ready: $BUILD_DIR"
du -sh "$BUILD_DIR"
echo ""

# --- Step 4: Create archives ---
echo "[7/8] Creating archives..."
mkdir -p "$ROOT/download"

# 7z archive
"$P7Z" a -t7z -mx=9 -mmt=2 "$DOWNLOAD_DIR/rkwebmon.7z" "$BUILD_DIR/." > /dev/null
echo "  7z archive: $(du -h "$DOWNLOAD_DIR/rkwebmon.7z" | cut -f1)"

# SFX .exe = 7z.sfx + archive
cat "$SFX_MODULE" "$DOWNLOAD_DIR/rkwebmon.7z" > "$ROOT/download/RKWebMonitor-${VERSION}-setup.exe"
echo "  SFX .exe:   $(du -h "$ROOT/download/RKWebMonitor-${VERSION}-setup.exe" | cut -f1)"

# Portable ZIP
cd "$BUILD_DIR"
zip -r -q "$ROOT/download/RKWebMonitor-${VERSION}-portable.zip" .
cd "$ROOT"
echo "  ZIP:        $(du -h "$ROOT/download/RKWebMonitor-${VERSION}-portable.zip" | cut -f1)"
echo ""

# --- Step 5: Done ---
echo "[8/8] Done!"
echo ""
echo "============================================================"
echo "  Output files:"
echo "============================================================"
ls -lh "$ROOT/download/RKWebMonitor-${VERSION}-"* 2>/dev/null
echo ""
echo "  Setup EXE:    RKWebMonitor-${VERSION}-setup.exe"
echo "                SFX-архив, при запуске показывает диалог распаковки."
echo "                После распаковки запустите START_HERE.bat от админа."
echo ""
echo "  Portable ZIP: RKWebMonitor-${VERSION}-portable.zip"
echo "                Распакуйте в любую папку и запустите START_HERE.bat."
echo ""
echo "============================================================"
