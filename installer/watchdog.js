/**
 * RK Web Monitor — Watchdog
 *
 * Запускается как обёртка вокруг Next.js standalone сервера.
 * Отслеживает файл data/restart.flag и при его появлении:
 *   1. Завершает текущий процесс сервера
 *   2. NSSM автоматически перезапустит службу
 *
 * Запуск: node watchdog.js
 * NSSM конфигурация: AppEnvironmentExtra WATCHDOG_DIR=path/to/data
 *
 * Совместим с Windows (NSSM) и Linux (systemd).
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const PORT = process.env.PORT || '8083'
const HOSTNAME = process.env.HOSTNAME || '0.0.0.0'

// ВАЖНО: используем __dirname (путь к watchdog.js = bin/), а не process.cwd()
// потому что под NSSM (Windows Service) process.cwd() по умолчанию
// возвращает C:\Windows\System32, что НЕ корень установки.
// __dirname всегда указывает на папку, где лежит сам watchdog.js
const BIN_DIR = __dirname
const ROOT_DIR = path.join(BIN_DIR, '..')
const SERVER_SCRIPT = path.join(ROOT_DIR, 'app', 'server.js')
const APP_DIR = path.join(ROOT_DIR, 'app')
const WATCHDOG_DIR = process.env.WATCHDOG_DIR || path.join(ROOT_DIR, 'data')
const RESTART_FLAG = path.join(WATCHDOG_DIR, 'restart.flag')

// ВАЖНО: используем process.execPath (путь к текущему node.exe),
// а не 'node' — это гарантирует, что будет запущен тот же Node.js,
// который запустил watchdog. Особенно важно под NSSM на Windows.
const NODE_EXE = process.execPath

// Проверка существования server.js
if (!fs.existsSync(SERVER_SCRIPT)) {
  console.error(`[watchdog] FATAL: server.js not found at ${SERVER_SCRIPT}`)
  console.error(`[watchdog] BIN_DIR=${BIN_DIR}`)
  console.error(`[watchdog] ROOT_DIR=${ROOT_DIR}`)
  console.error(`[watchdog] CWD=${process.cwd()}`)
  console.error(`[watchdog] __dirname=${__dirname}`)
  console.error(`[watchdog] NODE_EXE=${NODE_EXE}`)
  process.exit(1)
}

// Передаём PORT и HOSTNAME в дочерний процесс.
// ВАЖНО:DATABASE_URL должна быть с прямыми слешами для Prisma.
let dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  // Резерв: вычисляем сами, с прямыми слешами
  const dbPath = path.join(ROOT_DIR, 'data', 'rkwebmon.db')
  dbUrl = 'file:' + dbPath.replace(/\\/g, '/')
}

const env = {
  ...process.env,
  PORT: String(PORT),
  HOSTNAME: String(HOSTNAME),
  NODE_ENV: 'production',
  DATABASE_URL: dbUrl,
}

console.log('==========================================================')
console.log(`[watchdog] RK Web Monitor starting`)
console.log(`[watchdog] Node: ${NODE_EXE}`)
console.log(`[watchdog] Server: ${SERVER_SCRIPT}`)
console.log(`[watchdog] App dir: ${APP_DIR}`)
console.log(`[watchdog] Root: ${ROOT_DIR}`)
console.log(`[watchdog] Listen: ${HOSTNAME}:${PORT}`)
console.log(`[watchdog] Database: ${dbUrl}`)
console.log(`[watchdog] Restart flag: ${RESTART_FLAG}`)
console.log(`[watchdog] Platform: ${process.platform} ${process.arch}`)
console.log('==========================================================')

// Запуск сервера
const child = spawn(NODE_EXE, [SERVER_SCRIPT], {
  env,
  stdio: 'inherit',
  cwd: APP_DIR,  // Next.js standalone должен запускаться из папки app/
  windowsHide: true,
})

child.on('error', (err) => {
  console.error(`[watchdog] Failed to start server:`, err)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  console.log(`[watchdog] Server exited (code=${code}, signal=${signal})`)
  // NSSM перезапустит службу автоматически
  process.exit(code ?? 0)
})

// Watch restart flag — проверяем каждые 2 секунды
let restartInProgress = false

function checkRestartFlag() {
  if (restartInProgress) return
  try {
    if (fs.existsSync(RESTART_FLAG)) {
      console.log('[watchdog] Restart flag detected! Stopping server...')
      restartInProgress = true
      try {
        fs.unlinkSync(RESTART_FLAG)
      } catch (e) {
        // ignore — может быть уже удалён
      }
      // На Windows SIGTERM может не работать корректно — используем taskkill
      if (process.platform === 'win32') {
        try {
          // Убиваем дерево процессов
          require('child_process').execSync(
            `taskkill /pid ${child.pid} /T /F`,
            { stdio: 'ignore' }
          )
        } catch (e) {
          // ignore — процесс мог уже завершиться
        }
      } else {
        child.kill('SIGTERM')
        setTimeout(() => {
          try {
            child.kill('SIGKILL')
          } catch (e) {
            // ignore
          }
        }, 3000)
      }
    }
  } catch (e) {
    // ignore
  }
}

setInterval(checkRestartFlag, 2000)

// Передаём сигналы дочернему процессу (для корректной остановки)
process.on('SIGTERM', () => {
  console.log('[watchdog] SIGTERM received, forwarding to server')
  if (process.platform === 'win32') {
    try {
      require('child_process').execSync(
        `taskkill /pid ${child.pid} /T /F`,
        { stdio: 'ignore' }
      )
    } catch (e) {
      // ignore
    }
  } else {
    child.kill('SIGTERM')
  }
})

process.on('SIGINT', () => {
  console.log('[watchdog] SIGINT received, forwarding to server')
  if (process.platform === 'win32') {
    try {
      require('child_process').execSync(
        `taskkill /pid ${child.pid} /T /F`,
        { stdio: 'ignore' }
      )
    } catch (e) {
      // ignore
    }
  } else {
    child.kill('SIGINT')
  }
})

// Не падать на uncaughtException — логируем и продолжаем
process.on('uncaughtException', (err) => {
  console.error('[watchdog] Uncaught exception:', err)
})

process.on('unhandledRejection', (reason) => {
  console.error('[watchdog] Unhandled rejection:', reason)
})
