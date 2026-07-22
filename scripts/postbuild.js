/**
 * Postbuild script — копирует static и public в standalone
 * Кросс-платформенный (работает на Windows, Linux, macOS)
 * Заменяет 'cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/'
 */

const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const standaloneDir = path.join(root, '.next', 'standalone')
const staticSrc = path.join(root, '.next', 'static')
const staticDst = path.join(standaloneDir, '.next', 'static')
const publicSrc = path.join(root, 'public')
const publicDst = path.join(standaloneDir, 'public')

console.log('[postbuild] Starting postbuild copy...')

// Проверка что standalone существует
if (!fs.existsSync(standaloneDir)) {
  console.error('[postbuild] FATAL: .next/standalone/ not found!')
  console.error('[postbuild] Did next build --output standalone succeed?')
  process.exit(1)
}

/**
 * Рекурсивное копирование папки (как cp -r)
 * @param {string} src - исходная папка
 * @param {string} dst - целевая папка
 */
function copyRecursive(src, dst) {
  if (!fs.existsSync(src)) {
    console.warn(`[postbuild] WARN: source not found: ${src}`)
    return
  }
  fs.mkdirSync(dst, { recursive: true })
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const dstPath = path.join(dst, entry.name)
    if (entry.isDirectory()) {
      copyRecursive(srcPath, dstPath)
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, dstPath)
    }
    // symlink — пропускаем
  }
}

// Копируем .next/static → .next/standalone/.next/static
console.log(`[postbuild] Copying .next/static -> .next/standalone/.next/static`)
copyRecursive(staticSrc, staticDst)
console.log(`[postbuild]   OK`)

// Копируем public → .next/standalone/public
console.log(`[postbuild] Copying public -> .next/standalone/public`)
copyRecursive(publicSrc, publicDst)
console.log(`[postbuild]   OK`)

// Проверка BUILD_ID
const buildIdPath = path.join(standaloneDir, '.next', 'BUILD_ID')
if (fs.existsSync(buildIdPath)) {
  const buildId = fs.readFileSync(buildIdPath, 'utf-8').trim()
  console.log(`[postbuild] BUILD_ID: ${buildId}`)
} else {
  console.error('[postbuild] FATAL: BUILD_ID not found in .next/standalone/.next/')
  process.exit(1)
}

// Проверка server.js
const serverJsPath = path.join(standaloneDir, 'server.js')
if (fs.existsSync(serverJsPath)) {
  console.log(`[postbuild] server.js: OK`)
} else {
  console.error('[postbuild] FATAL: server.js not found in .next/standalone/')
  process.exit(1)
}

console.log('[postbuild] Done!')
