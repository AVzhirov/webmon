#!/bin/bash
# ============================================================
# RK Web Monitor — Установщик для GitBash на Windows
#
# Запуск:
#   1. Скачайте и установите GitBash: https://git-scm.com/download/win
#   2. Клонируйте репозиторий:
#        git clone https://github.com/AVzhirov/webmon.git
#        cd webmon
#   3. Запустите этот скрипт в GitBash:
#        ./installer/install-gitbash.sh
#
# Скрипт:
#   - Скачивает portable Node.js для Windows
#   - Скачивает NSSM (менеджер служб)
#   - Собирает Next.js standalone
#   - Удаляет Linux-бинарники, скачивает Windows-версии
#   - Устанавливает Windows-службу RKWebMonitor
#   - Создаёт правило Firewall для доступа по сети
#   - Открывает браузер
# ============================================================

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}[INFO]${NC}  $1"; }
ok()      { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
fail()    { echo -e "${RED}[FAIL]${NC}  $1"; exit 1; }

# Проверка платформы
if [[ "$(uname -s)" != MINGW* ]] && [[ "$(uname -s)" != MSYS* ]] && [[ "$(uname -s)" != CYGWIN* ]]; then
    warn "Этот скрипт предназначен для GitBash на Windows."
    warn "Текущая платформа: $(uname -s)"
    warn "Если вы на Linux/macOS — используйте installer/build-portable.sh вместо этого."
    echo ""
    read -p "Продолжить всё равно? (y/N) " -n 1 -r
    echo
    [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
fi

# Константы
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
VERSION="2.0.0"
SERVICE_NAME="RKWebMonitor"
PORT="8083"

cd "$ROOT_DIR"

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  RK Web Monitor v${VERSION} — GitBash Installer${NC}"
echo -e "${BLUE}============================================================${NC}"
echo "  Platform:    $(uname -s)"
echo "  Root:        $ROOT_DIR"
echo "  Service:     $SERVICE_NAME"
echo "  Port:        $PORT (доступ по сети: 0.0.0.0)"
echo ""

# Проверка прав админа (в GitBash через net session)
info "Проверка прав администратора..."
if ! net session >/dev/null 2>&1; then
    fail "Скрипт требует прав администратора! Закройте GitBash, правый клик по GitBash -> 'Run as administrator', и запустите снова."
fi
ok "Права администратора есть"
echo ""

# Создание папок
info "Создание папок..."
mkdir -p "$ROOT_DIR/node" "$ROOT_DIR/bin" "$ROOT_DIR/data" "$ROOT_DIR/logs"
mkdir -p "$ROOT_DIR/.cache"
ok "Папки готовы"
echo ""

# Скачивание portable Node.js для Windows
NODE_VERSION="v22.11.0"
NODE_DIR="$ROOT_DIR/node"

if [ ! -f "$NODE_DIR/node.exe" ]; then
    info "Скачивание portable Node.js ${NODE_VERSION} для Windows x64..."
    curl -fsSL "https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-win-x64.zip" \
        -o "$ROOT_DIR/.cache/node-portable.zip"
    info "Распаковка Node.js..."
    unzip -q -o "$ROOT_DIR/.cache/node-portable.zip" -d "$ROOT_DIR/.cache/node-extracted"
    cp "$ROOT_DIR/.cache/node-extracted/node-${NODE_VERSION}-win-x64/node.exe" "$NODE_DIR/"
    cp "$ROOT_DIR/.cache/node-extracted/node-${NODE_VERSION}-win-x64/"*.dll "$NODE_DIR/" 2>/dev/null || true
    cp -r "$ROOT_DIR/.cache/node-extracted/node-${NODE_VERSION}-win-x64/node_modules" "$NODE_DIR/" 2>/dev/null || true
    rm -rf "$ROOT_DIR/.cache/node-extracted"
    ok "Node.js установлен: $NODE_DIR/node.exe"
else
    ok "Node.js уже установлен"
fi
echo ""

# Скачивание NSSM
NSSM_DIR="$ROOT_DIR/bin"

if [ ! -f "$NSSM_DIR/nssm.exe" ]; then
    info "Скачивание NSSM 2.24..."
    curl -fsSL "https://nssm.cc/release/nssm-2.24.zip" -o "$ROOT_DIR/.cache/nssm.zip"
    unzip -q -o "$ROOT_DIR/.cache/nssm.zip" -d "$ROOT_DIR/.cache/nssm-extracted"
    cp "$ROOT_DIR/.cache/nssm-extracted/nssm-2.24/win64/nssm.exe" "$NSSM_DIR/"
    rm -rf "$ROOT_DIR/.cache/nssm-extracted"
    ok "NSSM установлен: $NSSM_DIR/nssm.exe"
else
    ok "NSSM уже установлен"
fi

# Копируем watchdog.js
cp "$SCRIPT_DIR/watchdog.js" "$NSSM_DIR/"
ok "watchdog.js скопирован"
echo ""

# Установка Bun (через npm) — нужен для сборки Next.js
# ВАЖНО: для next build нужен Node.js в PATH, а не только portable node.exe
# Поэтому проверяем — есть ли system Node.js, если нет — предлагаем установить
info "Проверка Node.js в системе..."
if command -v node >/dev/null 2>&1; then
    SYSTEM_NODE_VER=$(node --version 2>/dev/null)
    ok "System Node.js: $SYSTEM_NODE_VER"
    HAS_SYSTEM_NODE=1
else
    warn "System Node.js НЕ найден в PATH"
    warn "Next.js build требует Node.js в PATH"
    warn "Пытаемся использовать portable Node.js из папки node/..."
    export PATH="$NODE_DIR:$PATH"
    if "$NODE_DIR/node.exe" --version >/dev/null 2>&1; then
        ok "Portable Node.js: $("$NODE_DIR/node.exe" --version)"
        HAS_SYSTEM_NODE=1
    else
        warn "Portable Node.js тоже не работает"
        warn "Установите Node.js с https://nodejs.org и запустите скрипт заново"
        HAS_SYSTEM_NODE=0
    fi
fi
echo ""

# Проверка npm (нужен для install)
info "Проверка npm..."
if command -v npm >/dev/null 2>&1; then
    ok "System npm: $(npm --version 2>/dev/null)"
    HAS_NPM=1
else
    # Используем portable npm
    if [ -f "$NODE_DIR/node_modules/npm/bin/npm-cli.js" ]; then
        ok "Portable npm доступен"
        HAS_NPM=1
    else
        warn "npm недоступен — будет установлен Node.js отдельно"
        HAS_NPM=0
    fi
fi
echo ""

# Установка Bun (опционально, для скорости)
info "Проверка Bun..."
if [ "$HAS_NPM" = "1" ]; then
    if ! command -v bun >/dev/null 2>&1; then
        info "Установка Bun через npm (ускорит установку зависимостей)..."
        npm install -g bun 2>&1 | tail -3 || true
    fi
fi
if command -v bun >/dev/null 2>&1; then
    ok "Bun готов: $(bun --version 2>/dev/null || echo 'unknown')"
    BUN_CMD="bun"
else
    warn "Bun недоступен — используем npm (медленнее, но работает)"
    BUN_CMD="npm"
fi
echo ""

# Установка зависимостей
info "Установка зависимостей проекта..."
cd "$ROOT_DIR"

# ВАЖНО: используем portable npm из папки node/, т.к. системного npm может не быть
NPM_CMD="$NODE_DIR/node.exe $NODE_DIR/node_modules/npm/bin/npm-cli.js"

if [ "$BUN_CMD" = "bun" ]; then
    info "Установка через Bun (быстро)..."
    bun install 2>&1 | tail -15
    if [ ! -d "node_modules" ]; then
        warn "Bun install не удался. Пробуем npm..."
        $NPM_CMD install 2>&1 | tail -15
    fi
else
    info "Установка через npm (медленно, ~2-3 минуты)..."
    $NPM_CMD install 2>&1 | tail -15
fi

if [ ! -d "node_modules" ]; then
    fail "Установка зависимостей не удалась — node_modules не создан"
fi
ok "Зависимости установлены"
echo ""

# Сборка Next.js standalone
info "Сборка Next.js standalone (это займёт 2-3 минуты)..."
echo "  Удаляем старую сборку..."
rm -rf .next
echo "  Запускаем next build..."

# ВАЖНО: Next.js 16 на Windows имеет баги с обоими бандлерами:
# - Turbopack (default): "server relative imports are not implemented yet"
# - Webpack (--webpack): "page.js doesn't have a root layout"
# Поэтому пробуем по очереди: default → --webpack → system npx → npm run build
# Какой-то из них должен сработать в зависимости от версии Node.js

NEXT_BIN="node_modules/next/dist/bin/next"
BUILD_SUCCESS=0

# Попытка 1: default (Turbopack в Next.js 16)
echo "  Попытка 1: $NODE_DIR/node.exe $NEXT_BIN build (default - Turbopack)"
"$NODE_DIR/node.exe" "$NEXT_BIN" build 2>&1 | tail -30
if [ -f ".next/standalone/server.js" ]; then
    BUILD_SUCCESS=1
    ok "Сборка через default (Turbopack) успешна"
fi

# Попытка 2: --webpack (если Turbopack упал)
if [ "$BUILD_SUCCESS" = "0" ]; then
    echo "  Попытка 2: $NODE_DIR/node.exe $NEXT_BIN build --webpack"
    "$NODE_DIR/node.exe" "$NEXT_BIN" build --webpack 2>&1 | tail -30
    if [ -f ".next/standalone/server.js" ]; then
        BUILD_SUCCESS=1
        ok "Сборка через --webpack успешна"
    fi
fi

# Попытка 3: через system npx next (если Node.js установлен в системе)
if [ "$BUILD_SUCCESS" = "0" ] && [ "$HAS_SYSTEM_NODE" = "1" ]; then
    echo "  Попытка 3: npx next build"
    npx next build 2>&1 | tail -30
    if [ -f ".next/standalone/server.js" ]; then
        BUILD_SUCCESS=1
        ok "Сборка через npx next build успешна"
    fi
fi

# Попытка 4: через npm run build (последний шанс)
if [ "$BUILD_SUCCESS" = "0" ]; then
    echo "  Попытка 4: npm run build"
    $NPM_CMD run build 2>&1 | tail -30
    if [ -f ".next/standalone/server.js" ]; then
        BUILD_SUCCESS=1
        ok "Сборка через npm run build успешна"
    fi
fi

if [ "$BUILD_SUCCESS" = "0" ]; then
    echo ""
    echo "  [FAIL] Сборка Next.js не удалась после 4 попыток"
    echo ""
    echo "  Next.js 16 на Windows имеет известные баги с обоими бандлерами:"
    echo "    Turbopack: 'server relative imports are not implemented yet'"
    echo "    Webpack:   'page.js doesn\'t have a root layout'"
    echo ""
    echo "  Возможные решения:"
    echo ""
    echo "  1. Установите Node.js 20+ с https://nodejs.org (не используйте portable)"
    echo "     Перезапустите GitBash от админа и запустите скрипт заново"
    echo ""
    echo "  2. Используйте готовый .exe установщик (не требует сборки):"
    echo "     https://github.com/AVzhirov/webmon/releases/tag/v2.0.0"
    echo ""
    echo "  3. Очистите кэш и попробуйте снова:"
    echo "       rm -rf node_modules .next"
    echo "       ./installer/install-gitbash.sh"
    echo ""
    echo "  4. Если есть системный Node.js, попробуйте вручную:"
    echo "       npx next build"
    echo ""
    fail "Сборка не удалась — server.js не найден"
fi

# Запустим postbuild-скрипт (копирует static и public в standalone)
info "Запуск postbuild (копирование static и public)..."
"$NODE_DIR/node.exe" scripts/postbuild.js 2>&1 | tail -10

# Проверка BUILD_ID (критичный файл)
if [ ! -f ".next/standalone/.next/BUILD_ID" ]; then
    fail "BUILD_ID не найден после postbuild — Next.js standalone неполный"
fi
ok "Standalone сборка готова (BUILD_ID: $(cat .next/standalone/.next/BUILD_ID))"
echo ""

# Подготовка папки app
info "Копирование собранных файлов в app/..."
mkdir -p "$ROOT_DIR/app"
cp .next/standalone/server.js "$ROOT_DIR/app/"
cp -r .next/standalone/node_modules "$ROOT_DIR/app/"
cp .next/standalone/package.json "$ROOT_DIR/app/" 2>/dev/null || true
cp -r .next/standalone/src "$ROOT_DIR/app/" 2>/dev/null || true
# ВАЖНО: копируем ВЕСЬ .next из standalone (с BUILD_ID, server/, required-server-files.json)
# Без этого Next.js выдаст 'Could not find a production build in the ./.next directory'
cp -r .next/standalone/.next "$ROOT_DIR/app/"
# Дополнительно static из основной сборки
cp -rf .next/static/* "$ROOT_DIR/app/.next/static/" 2>/dev/null || true
cp -r public "$ROOT_DIR/app/"
cp -r prisma "$ROOT_DIR/app/"

# Проверка BUILD_ID
if [ ! -f "$ROOT_DIR/app/.next/BUILD_ID" ]; then
    fail "BUILD_ID not found in app/.next/ — Next.js standalone build is incomplete"
fi
ok "Файлы скопированы (BUILD_ID: $(cat $ROOT_DIR/app/.next/BUILD_ID))"
echo ""

# ============================================================
# OPTIMIZATION: Remove everything not needed at runtime
# Goal: reduce app/ size from ~150 MB to ~80 MB
# ============================================================
info "Оптимизация размера сборки..."

# 1. Remove project artifacts accidentally included in standalone
rm -rf "$ROOT_DIR/app/download" 2>/dev/null
rm -rf "$ROOT_DIR/app/skills" 2>/dev/null
rm -rf "$ROOT_DIR/app/upload" 2>/dev/null
rm -rf "$ROOT_DIR/app/examples" 2>/dev/null
rm -rf "$ROOT_DIR/app/mini-services" 2>/dev/null
rm -rf "$ROOT_DIR/app/.zscripts" 2>/dev/null
rm -rf "$ROOT_DIR/app/tool-results" 2>/dev/null
rm -rf "$ROOT_DIR/app/webmonitor_original" 2>/dev/null
rm -rf "$ROOT_DIR/app/.cache" 2>/dev/null
rm -rf "$ROOT_DIR/app/src" 2>/dev/null   # source TS/TSX (compiled to .next/server/)
rm -f "$ROOT_DIR/app/dev.log" 2>/dev/null
rm -f "$ROOT_DIR/app/server.log" 2>/dev/null
rm -f "$ROOT_DIR/app/bun.lock" 2>/dev/null
rm -f "$ROOT_DIR/app/eslint.config.mjs" 2>/dev/null
rm -f "$ROOT_DIR/app/tsconfig.json" 2>/dev/null
rm -f "$ROOT_DIR/app/tailwind.config.ts" 2>/dev/null
rm -f "$ROOT_DIR/app/postcss.config.mjs" 2>/dev/null
rm -f "$ROOT_DIR/app/next.config.ts" 2>/dev/null
rm -f "$ROOT_DIR/app/components.json" 2>/dev/null
rm -f "$ROOT_DIR/app/Caddyfile" 2>/dev/null

# 2. Remove Linux/macOS sharp binaries (keep only Windows)
rm -rf "$ROOT_DIR/app/node_modules/@img/sharp-linux-x64" 2>/dev/null
rm -rf "$ROOT_DIR/app/node_modules/@img/sharp-libvips-linux-x64" 2>/dev/null
rm -rf "$ROOT_DIR/app/node_modules/@img/sharp-libvips-linuxmusl-x64" 2>/dev/null
rm -rf "$ROOT_DIR/app/node_modules/@img/sharp-linuxmusl-x64" 2>/dev/null
rm -rf "$ROOT_DIR/app/node_modules/@img/sharp-libvips-linux-arm64" 2>/dev/null
rm -rf "$ROOT_DIR/app/node_modules/@img/sharp-linux-arm64" 2>/dev/null
rm -rf "$ROOT_DIR/app/node_modules/@img/sharp-darwin-x64" 2>/dev/null
rm -rf "$ROOT_DIR/app/node_modules/@img/sharp-darwin-arm64" 2>/dev/null

# 3. Remove Linux/macOS Prisma engines (keep only Windows)
find "$ROOT_DIR/app/node_modules/.prisma" -name "libquery_engine-debian*" -delete 2>/dev/null || true
find "$ROOT_DIR/app/node_modules/.prisma" -name "libquery_engine-linux*" -delete 2>/dev/null || true
find "$ROOT_DIR/app/node_modules/.prisma" -name "libquery_engine-darwin*" -delete 2>/dev/null || true
find "$ROOT_DIR/app/node_modules/.prisma" -name "libquery_engine-arm*" -delete 2>/dev/null || true

# 4. Remove unused Prisma WASM engines (keep only sqlite, save ~25 MB)
find "$ROOT_DIR/app/node_modules/@prisma/client/runtime" -name "query_engine_bg.postgresql.*" -delete 2>/dev/null || true
find "$ROOT_DIR/app/node_modules/@prisma/client/runtime" -name "query_engine_bg.mysql.*" -delete 2>/dev/null || true
find "$ROOT_DIR/app/node_modules/@prisma/client/runtime" -name "query_engine_bg.sqlserver.*" -delete 2>/dev/null || true
find "$ROOT_DIR/app/node_modules/@prisma/client/runtime" -name "query_engine_bg.cockroachdb.*" -delete 2>/dev/null || true
find "$ROOT_DIR/app/node_modules/@prisma/client/runtime" -name "query_engine_bg.mongodb.*" -delete 2>/dev/null || true

# 5. Remove dev-only packages (TypeScript, ESLint — save ~25 MB)
rm -rf "$ROOT_DIR/app/node_modules/typescript" 2>/dev/null
rm -rf "$ROOT_DIR/app/node_modules/@typescript" 2>/dev/null
rm -rf "$ROOT_DIR/app/node_modules/@typescript-eslint" 2>/dev/null
rm -rf "$ROOT_DIR/app/node_modules/eslint" 2>/dev/null
rm -rf "$ROOT_DIR/app/node_modules/eslint-*" 2>/dev/null
rm -rf "$ROOT_DIR/app/node_modules/@eslint" 2>/dev/null
rm -rf "$ROOT_DIR/app/node_modules/prettier" 2>/dev/null
rm -rf "$ROOT_DIR/app/node_modules/prettier-*" 2>/dev/null

# 6. Remove TypeScript declaration files
find "$ROOT_DIR/app/node_modules" -name "*.d.ts" -delete 2>/dev/null || true
find "$ROOT_DIR/app/node_modules" -name "*.d.mts" -delete 2>/dev/null || true
find "$ROOT_DIR/app/node_modules" -name "*.d.cts" -delete 2>/dev/null || true

# 7. Remove source maps
find "$ROOT_DIR/app/node_modules" -name "*.map" -delete 2>/dev/null || true
find "$ROOT_DIR/app/.next" -name "*.map" -delete 2>/dev/null || true

# 8. Remove docs/tests from node_modules
find "$ROOT_DIR/app/node_modules" -iname "readme*" -delete 2>/dev/null || true
find "$ROOT_DIR/app/node_modules" -iname "license*" -delete 2>/dev/null || true
find "$ROOT_DIR/app/node_modules" -iname "changelog*" -delete 2>/dev/null || true
find "$ROOT_DIR/app/node_modules" -iname "*.md" -delete 2>/dev/null || true
find "$ROOT_DIR/app/node_modules" -iname "*.txt" -delete 2>/dev/null || true
find "$ROOT_DIR/app/node_modules" -type d -name "test" -exec rm -rf {} + 2>/dev/null || true
find "$ROOT_DIR/app/node_modules" -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true
find "$ROOT_DIR/app/node_modules" -type d -name "__tests__" -exec rm -rf {} + 2>/dev/null || true
find "$ROOT_DIR/app/node_modules" -type d -name "spec" -exec rm -rf {} + 2>/dev/null || true
find "$ROOT_DIR/app/node_modules" -type d -name "docs" -exec rm -rf {} + 2>/dev/null || true
find "$ROOT_DIR/app/node_modules" -type d -name "examples" -exec rm -rf {} + 2>/dev/null || true

# 9. Remove Next.js cache
rm -rf "$ROOT_DIR/app/.next/cache" 2>/dev/null

# 10. Установить prisma CLI (если его нет в standalone)
if [ ! -f "$ROOT_DIR/app/node_modules/prisma/build/index.js" ]; then
    info "Установка prisma CLI 6.19.2..."
    mkdir -p /tmp/prisma-cli-extract
    curl -fsSL "https://registry.npmjs.org/prisma/6.19.2" -o /tmp/prisma-meta.json
    TARBALL=$(python3 -c "import json; print(json.load(open('/tmp/prisma-meta.json'))['dist']['tarball'])")
    curl -fsSL "$TARBALL" -o /tmp/prisma.tgz
    tar xzf /tmp/prisma.tgz -C /tmp/prisma-cli-extract
    rm -rf "$ROOT_DIR/app/node_modules/prisma"
    mkdir -p "$ROOT_DIR/app/node_modules/prisma"
    cp -r /tmp/prisma-cli-extract/package/* "$ROOT_DIR/app/node_modules/prisma/"
    rm -rf /tmp/prisma-cli-extract /tmp/prisma.tgz /tmp/prisma-meta.json
    # Удалим лишние engine'ы из prisma CLI (нужен только sqlite)
    P="$ROOT_DIR/app/node_modules/prisma/build"
    find $P -name "query_compiler_bg.cockroachdb.*" -delete 2>/dev/null
    find $P -name "query_compiler_bg.mysql.*" -delete 2>/dev/null
    find $P -name "query_compiler_bg.postgresql.*" -delete 2>/dev/null
    find $P -name "query_compiler_bg.sqlserver.*" -delete 2>/dev/null
    find $P -name "query_compiler_bg.mongodb.*" -delete 2>/dev/null
    find $P -name "query_engine_bg.cockroachdb.*" -delete 2>/dev/null
    find $P -name "query_engine_bg.mysql.*" -delete 2>/dev/null
    find $P -name "query_engine_bg.postgresql.*" -delete 2>/dev/null
    find $P -name "query_engine_bg.sqlserver.*" -delete 2>/dev/null
    find $P -name "query_engine_bg.mongodb.*" -delete 2>/dev/null
    rm -rf $P/public
    rm -rf "$ROOT_DIR/app/node_modules/prisma/prisma-client"
    ok "Prisma CLI установлен"
fi

# Отчёт о размере
echo "  Размер после оптимизации:"
du -sh "$ROOT_DIR" | awk '{print "    Total:  " $1}'
du -sh "$ROOT_DIR/app" | awk '{print "    app/:   " $1}'
echo ""

# Скачивание Windows sharp binary
info "Скачивание Windows sharp binary..."
mkdir -p "$ROOT_DIR/app/node_modules/@img/sharp-win32-x64"
curl -fsSL "https://registry.npmjs.org/@img/sharp-win32-x64/-/sharp-win32-x64-0.35.3.tgz" \
    -o "$ROOT_DIR/.cache/sharp-win32.tgz"
mkdir -p "$ROOT_DIR/.cache/sharp-win32-extracted"
tar xzf "$ROOT_DIR/.cache/sharp-win32.tgz" -C "$ROOT_DIR/.cache/sharp-win32-extracted"
cp -r "$ROOT_DIR/.cache/sharp-win32-extracted/package/"* "$ROOT_DIR/app/node_modules/@img/sharp-win32-x64/"
rm -rf "$ROOT_DIR/.cache/sharp-win32-extracted"
ok "sharp-win32-x64 установлен"
echo ""

# Создание .env файла
info "Создание .env файла..."
# ВАЖНО: DATABASE_URL должна быть в Windows-формате (C:/webmon/...)
# В GitBash $ROOT_DIR содержит /c/webmon (Unix-стиль), Prisma это не понимает
# Конвертируем: /c/webmon -> C:/webmon
ROOT_DIR_WIN=$(cygpath -w "$ROOT_DIR" 2>/dev/null || echo "$ROOT_DIR")
# Заменяем обратные слеши на прямые (Prisma требует /)
ROOT_DIR_WIN=$(echo "$ROOT_DIR_WIN" | sed 's|\\|/|g')
DB_PATH_FOR_ENV="${ROOT_DIR_WIN}/data/rkwebmon.db"

cat > "$ROOT_DIR/app/.env" << EOF
DATABASE_URL="file:$DB_PATH_FOR_ENV"
PORT=$PORT
HOSTNAME=0.0.0.0
NODE_ENV=production
EOF
ok ".env создан"
echo "  --- содержимое .env ---"
cat "$ROOT_DIR/app/.env"
echo "  ---"
echo ""

# Проверка Prisma Windows engine (предварительно сгенерирован в архиве)
info "Проверка Prisma Windows engine..."
PRISMA_ENGINE_FOUND=$(find "$ROOT_DIR/app/node_modules/.prisma" -name "libquery_engine-windows*.dll.node" -o -name "query_engine-windows.dll.node" 2>/dev/null | head -1)
if [ -n "$PRISMA_ENGINE_FOUND" ]; then
    ok "Prisma engine: $PRISMA_ENGINE_FOUND"
else
    warn "Prisma Windows engine НЕ найден. Пробуем prisma generate..."
    cd "$ROOT_DIR/app"
    "$ROOT_DIR/node/node.exe" "node_modules/prisma/build/index.js" generate 2>&1 | tail -10 || true
    cd "$ROOT_DIR"
fi
echo ""

# Копируем init-db.js в app/scripts (если ещё нет)
mkdir -p "$ROOT_DIR/app/scripts"
cp "$ROOT_DIR/scripts/init-db.js" "$ROOT_DIR/app/scripts/" 2>/dev/null || true

# Инициализация БД через init-db.js (без prisma CLI, не требует @prisma/engines)
info "Инициализация SQLite базы данных через init-db.js..."
cd "$ROOT_DIR/app"
export DATABASE_URL="file:$DB_PATH_FOR_ENV"
"$ROOT_DIR/node/node.exe" "scripts/init-db.js" 2>&1 | tail -20
if [ ! -f "$ROOT_DIR/data/rkwebmon.db" ]; then
    fail "Database initialization failed - rkwebmon.db not created"
fi
DB_SIZE=$(stat -c%s "$ROOT_DIR/data/rkwebmon.db" 2>/dev/null || stat -f%z "$ROOT_DIR/data/rkwebmon.db" 2>/dev/null || echo "0")
ok "Database created ($DB_SIZE bytes)"
cd "$ROOT_DIR"
echo ""

# Копирование bat-файлов и docs
info "Копирование bat-файлов..."
cp "$SCRIPT_DIR/start.bat" "$ROOT_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/stop.bat" "$ROOT_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/restart.bat" "$ROOT_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/install.bat" "$ROOT_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/uninstall.bat" "$ROOT_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/diagnose.bat" "$ROOT_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/setup-network.bat" "$ROOT_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/README-INSTALL.txt" "$ROOT_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/USERGUIDE.md" "$ROOT_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/LICENSE.rtf" "$ROOT_DIR/" 2>/dev/null || true
cp "$ROOT_DIR/README.md" "$ROOT_DIR/" 2>/dev/null || true
ok "Bat-файлы скопированы"
echo ""

# Windows Firewall
info "Добавление правила Windows Firewall (порт $PORT, входящие подключения)..."
netsh advfirewall firewall delete rule name="RK Web Monitor" >/dev/null 2>&1 || true
netsh advfirewall firewall add rule name="RK Web Monitor" \
    dir=in action=allow protocol=TCP localport=$PORT
ok "Firewall: входящие на порту $PORT разрешены"
echo ""

# Удаление старой службы
info "Удаление старой службы (если есть)..."
"$NSSM_DIR/nssm.exe" stop "$SERVICE_NAME" >/dev/null 2>&1 || true
"$NSSM_DIR/nssm.exe" remove "$SERVICE_NAME" confirm >/dev/null 2>&1 || true
sleep 1
ok "Старая служба удалена"
echo ""

# Установка службы через NSSM
info "Установка службы $SERVICE_NAME через NSSM..."
# ВАЖНО: NSSM требует Windows-пути (C:\webmon\...), а не GitBash-пути (/c/webmon/...)
# Конвертируем все пути через cygpath -w
NODE_EXE_WIN=$(cygpath -w "$ROOT_DIR/node/node.exe" 2>/dev/null || echo "$ROOT_DIR/node/node.exe")
WATCHDOG_WIN=$(cygpath -w "$ROOT_DIR/bin/watchdog.js" 2>/dev/null || echo "$ROOT_DIR/bin/watchdog.js")
APP_DIR_WIN=$(cygpath -w "$ROOT_DIR" 2>/dev/null || echo "$ROOT_DIR")
LOG_FILE_WIN=$(cygpath -w "$ROOT_DIR/logs/server.log" 2>/dev/null || echo "$ROOT_DIR/logs/server.log")
DATA_DIR_WIN=$(cygpath -w "$ROOT_DIR/data" 2>/dev/null || echo "$ROOT_DIR/data")

"$NSSM_DIR/nssm.exe" install "$SERVICE_NAME" "$NODE_EXE_WIN" "$WATCHDOG_WIN"
"$NSSM_DIR/nssm.exe" set "$SERVICE_NAME" AppDirectory "$APP_DIR_WIN"
# DATABASE_URL с Windows-путих и прямыми слешами для Prisma
"$NSSM_DIR/nssm.exe" set "$SERVICE_NAME" AppEnvironmentExtra \
    PORT=$PORT HOSTNAME=0.0.0.0 \
    NODE_ENV=production \
    DATABASE_URL="file:$DB_PATH_FOR_ENV" \
    WATCHDOG_DIR="$DATA_DIR_WIN"
"$NSSM_DIR/nssm.exe" set "$SERVICE_NAME" AppStdout "$LOG_FILE_WIN"
"$NSSM_DIR/nssm.exe" set "$SERVICE_NAME" AppStderr "$LOG_FILE_WIN"
"$NSSM_DIR/nssm.exe" set "$SERVICE_NAME" AppRotateFiles 1
"$NSSM_DIR/nssm.exe" set "$SERVICE_NAME" AppRotateBytes 10485760
"$NSSM_DIR/nssm.exe" set "$SERVICE_NAME" AppExit Default Restart
"$NSSM_DIR/nssm.exe" set "$SERVICE_NAME" AppRestartDelay 5000
"$NSSM_DIR/nssm.exe" set "$SERVICE_NAME" Start SERVICE_AUTO_START
"$NSSM_DIR/nssm.exe" set "$SERVICE_NAME" Description "RK Web Monitor v${VERSION} - R-Keeper 7 web monitoring"
ok "Служба установлена"
echo ""

# Запуск службы
info "Запуск службы..."
"$NSSM_DIR/nssm.exe" start "$SERVICE_NAME"
sleep 3
"$NSSM_DIR/nssm.exe" status "$SERVICE_NAME" 2>&1 || true
echo ""

# Получение IP-адресов
info "Сетевые адреса для доступа:"
echo ""
echo -e "  ${GREEN}Локальный доступ:${NC}"
echo "    http://localhost:$PORT"
echo "    http://127.0.0.1:$PORT"
echo ""
echo -e "  ${GREEN}Доступ по сети:${NC}"
ipconfig 2>/dev/null | grep -E "IPv4|IP Address" | head -10 || \
    echo "    (запустите 'ipconfig' чтобы узнать IP)"
echo ""
echo "  Другие компьютеры могут подключиться по адресу:"
echo "    http://<IP-этого-компьютера>:$PORT"
echo ""

# Проверка доступности
info "Проверка доступности сервера (10 секунд ожидания)..."
sleep 10
if curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:$PORT/" | grep -q "200\|302\|301"; then
    ok "Сервер отвечает на http://localhost:$PORT"
else
    warn "Сервер ещё запускается. Проверьте лог: $ROOT_DIR/logs/server.log"
    warn "Или запустите diagnose.bat для диагностики"
fi
echo ""

# Создание ярлыков в меню Пуск
info "Создание ярлыков в меню Пуск..."
SHORTCUT_DIR="$PROGRAMDATA/Microsoft/Windows/Start Menu/Programs/RK Web Monitor"
mkdir -p "$SHORTCUT_DIR"
# Создаём bat-ярлык для открытия браузера
cat > "$SHORTCUT_DIR/Open in browser.bat" << 'EOF'
@echo off
start "" "http://localhost:8083"
EOF
cp "$ROOT_DIR/start.bat" "$SHORTCUT_DIR/Start service.bat" 2>/dev/null || true
cp "$ROOT_DIR/stop.bat" "$SHORTCUT_DIR/Stop service.bat" 2>/dev/null || true
cp "$ROOT_DIR/restart.bat" "$SHORTCUT_DIR/Restart service.bat" 2>/dev/null || true
cp "$ROOT_DIR/diagnose.bat" "$SHORTCUT_DIR/Diagnose.bat" 2>/dev/null || true
ok "Ярлыки созданы: $SHORTCUT_DIR"
echo ""

# Финальное сообщение
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  УСТАНОВКА ЗАВЕРШЕНА!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "  Веб-интерфейс:  http://localhost:$PORT"
echo "  По сети:        http://<IP-этого-компьютера>:$PORT"
echo ""
echo "  Логин:          admin"
echo "  Пароль:         admin"
echo ""
echo -e "  ${YELLOW}⚠️  СМЕНИТЕ ПАРОЛЬ в Настройках после первого входа!${NC}"
echo ""
echo "  Управление службой:"
echo "    sc start $SERVICE_NAME       — запуск"
echo "    sc stop $SERVICE_NAME        — остановка"
echo "    sc query $SERVICE_NAME       — статус"
echo "    services.msc                 — GUI"
echo ""
echo "  Файлы:"
echo "    Папка установки:   $ROOT_DIR"
echo "    Логи:              $ROOT_DIR/logs/server.log"
echo "    База данных:       $ROOT_DIR/data/rkwebmon.db"
echo ""
echo "  Если служба не работает — запустите:"
echo "    $ROOT_DIR/diagnose.bat"
echo ""
echo -e "${BLUE}Открыть браузер сейчас?${NC}"
read -p "y/N: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    start "" "http://localhost:$PORT" 2>/dev/null || cmd //c start "" "http://localhost:$PORT"
fi

echo ""
echo "Готово!"
