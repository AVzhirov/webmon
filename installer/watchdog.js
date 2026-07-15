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
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const PORT = process.env.PORT || 8083
const HOSTNAME = process.env.HOSTNAME || '0.0.0.0'
const SERVER_SCRIPT = path.join(__dirname, '..', 'app', 'server.js')
const WATCHDOG_DIR = process.env.WATCHDOG_DIR || path.join(__dirname, '..', 'data')
const RESTART_FLAG = path.join(WATCHDOG_DIR, 'restart.flag')

// Передаём PORT и HOSTNAME в дочерний процесс
const env = {
  ...process.env,
  PORT: String(PORT),
  HOSTNAME,
}

console.log(`[watchdog] Starting RK Web Monitor on ${HOSTNAME}:${PORT}`)
console.log(`[watchdog] Server script: ${SERVER_SCRIPT}`)
console.log(`[watchdog] Restart flag: ${RESTART_FLAG}`)

// Запуск сервера
const child = spawn('node', [SERVER_SCRIPT], {
  env,
  stdio: 'inherit',
  cwd: path.dirname(SERVER_SCRIPT),
})

child.on('exit', (code, signal) => {
  console.log(`[watchdog] Server exited (code=${code}, signal=${signal})`)
  process.exit(code ?? 0)
})

// Watch restart flag
let restartInProgress = false

function checkRestartFlag() {
  if (restartInProgress) return
  try {
    if (fs.existsSync(RESTART_FLAG)) {
      console.log('[watchdog] Restart flag detected! Stopping server...')
      restartInProgress = true
      fs.unlinkSync(RESTART_FLAG)
      // NSSM перезапустит службу после exit
      child.kill('SIGTERM')
      setTimeout(() => {
        console.log('[watchdog] Force kill after timeout')
        child.kill('SIGKILL')
      }, 3000)
    }
  } catch (e) {
    // ignore
  }
}

setInterval(checkRestartFlag, 2000)

// Передаём сигналы дочернему процессу
process.on('SIGTERM', () => {
  console.log('[watchdog] SIGTERM received, forwarding to server')
  child.kill('SIGTERM')
})
process.on('SIGINT', () => {
  console.log('[watchdog] SIGINT received, forwarding to server')
  child.kill('SIGINT')
})
