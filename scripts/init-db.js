/**
 * init-db.js — прямая инициализация SQLite базы данных
 * Без использования prisma CLI (который требует @prisma/engines)
 *
 * Создаёт файл rkwebmon.db и все таблицы через raw SQL
 * Создаёт admin-пользователя и демо-серверы
 *
 * Запуск: node scripts/init-db.js
 */

const fs = require('fs')
const path = require('path')

// ВАЖНО: используем better-sqlite3 если есть, иначе fallback на Prisma Client
// Но т.к. Prisma Client требует engine, попробуем через @prisma/client

async function main() {
  console.log('[init-db] Starting database initialization...')

  // Определяем путь к БД
  let dbPath = process.env.DATABASE_URL
  if (!dbPath) {
    // По умолчанию: ../data/rkwebmon.db относительно app/
    const dataDir = path.join(__dirname, '..', 'data')
    dbPath = 'file:' + path.join(dataDir, 'rkwebmon.db').replace(/\\/g, '/')
  }
  // Убираем префикс file:
  dbPath = dbPath.replace(/^file:/, '')
  // Конвертируем прямые слеши в нативные
  dbPath = dbPath.replace(/\//g, path.sep)

  console.log(`[init-db] Database path: ${dbPath}`)

  // Создаём папку data если нет
  const dataDir = path.dirname(dbPath)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
    console.log(`[init-db] Created directory: ${dataDir}`)
  }

  // Проверяем — есть ли уже БД
  if (fs.existsSync(dbPath)) {
    const size = fs.statSync(dbPath).size
    if (size > 1000) {
      console.log(`[init-db] Database already exists (${size} bytes), skipping initialization`)
      console.log('[init-db] To reinitialize, delete the file first:')
      console.log(`  del "${dbPath}"`)
      return
    }
  }

  // Импортируем Prisma Client
  let PrismaClient
  try {
    const prismaModule = require('@prisma/client')
    PrismaClient = prismaModule.PrismaClient
  } catch (e) {
    console.error('[init-db] FATAL: Cannot load @prisma/client')
    console.error('[init-db] Error:', e.message)
    console.error('[init-db]')
    console.error('[init-db] Make sure app/node_modules/@prisma/client exists')
    process.exit(1)
  }

  console.log('[init-db] Prisma Client loaded, connecting to database...')

  // Устанавливаем DATABASE_URL для Prisma
  process.env.DATABASE_URL = 'file:' + dbPath.replace(/\\/g, '/')

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'file:' + dbPath.replace(/\\/g, '/')
      }
    }
  })

  try {
    // Подключаемся — это создаст файл БД если его нет
    await prisma.$connect()
    console.log('[init-db] Connected to database')

    // Проверяем — есть ли таблица User
    let tableExists = false
    try {
      await prisma.$queryRaw`SELECT COUNT(*) as count FROM User`
      tableExists = true
    } catch (e) {
      // Таблицы нет — Prisma создаст их автоматически при первом запросе
      console.log('[init-db] Tables do not exist, Prisma will create them')
    }

    if (!tableExists) {
      // Создаём таблицы через raw SQL (Prisma auto-creates on first query)
      // Но лучше явно создать через SQL для надёжности
      console.log('[init-db] Creating tables...')

      // SQLite DDL из Prisma schema
      await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "username" TEXT NOT NULL UNIQUE,
        "passwordHash" TEXT NOT NULL,
        "displayName" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'viewer',
        "active" BOOLEAN NOT NULL DEFAULT 1,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )`

      await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "Session" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "token" TEXT NOT NULL UNIQUE,
        "userId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" DATETIME NOT NULL,
        "userAgent" TEXT,
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
      )`

      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt")`

      await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "Server" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "name" TEXT NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'demo',
        "address" TEXT NOT NULL,
        "cryptKey" TEXT,
        "username" TEXT,
        "password" TEXT,
        "enabled" BOOLEAN NOT NULL DEFAULT 1,
        "isDefault" BOOLEAN NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )`

      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Server_enabled_idx" ON "Server"("enabled")`

      await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "StaffMessage" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "recipient" TEXT NOT NULL,
        "recipientCode" INTEGER,
        "text" TEXT NOT NULL,
        "sentById" TEXT,
        "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "status" TEXT NOT NULL DEFAULT 'sent',
        FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL
      )`

      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "StaffMessage_sentAt_idx" ON "StaffMessage"("sentAt")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "StaffMessage_sentById_idx" ON "StaffMessage"("sentById")`

      await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "Setting" (
        "key" TEXT PRIMARY KEY NOT NULL,
        "value" TEXT NOT NULL,
        "updatedAt" DATETIME NOT NULL
      )`

      console.log('[init-db] Tables created')
    }

    // Создаём admin-пользователя если нет
    const userCount = await prisma.user.count()
    if (userCount === 0) {
      console.log('[init-db] Creating default admin user (admin/admin)...')
      // Хешируем пароль через scrypt (как в src/lib/auth.ts)
      const crypto = require('crypto')
      const salt = crypto.randomBytes(16)
      const hash = crypto.scryptSync('admin', salt, 64)
      const passwordHash = `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`

      await prisma.user.create({
        data: {
          username: 'admin',
          passwordHash: passwordHash,
          displayName: 'Administrator',
          role: 'admin',
        }
      })
      console.log('[init-db] Admin user created')
    } else {
      console.log(`[init-db] Users already exist (${userCount}), skipping`)
    }

    // Создаём демо-серверы если нет
    const serverCount = await prisma.server.count()
    if (serverCount === 0) {
      console.log('[init-db] Creating default demo servers...')
      await prisma.server.createMany({
        data: [
          {
            name: 'Demo (XML)',
            type: 'demo',
            address: 'public/demo-data/xml',
            enabled: true,
            isDefault: true,
          },
          {
            name: 'Test (XML)',
            type: 'demo',
            address: 'public/demo-data/xml',
            enabled: true,
            isDefault: false,
          }
        ]
      })
      console.log('[init-db] Demo servers created')
    } else {
      console.log(`[init-db] Servers already exist (${serverCount}), skipping`)
    }

    // Создаём системные настройки если нет
    const settingsCount = await prisma.setting.count()
    if (settingsCount === 0) {
      console.log('[init-db] Creating default settings (port 8083)...')
      await prisma.setting.createMany({
        data: [
          { key: 'port', value: '8083' },
          { key: 'host', value: '0.0.0.0' },
          { key: 'autoStartService', value: 'true' },
        ]
      })
      console.log('[init-db] Settings created')
    } else {
      console.log(`[init-db] Settings already exist (${settingsCount}), skipping`)
    }

    console.log('')
    console.log('[init-db] ========================================')
    console.log('[init-db] Database initialized successfully!')
    console.log('[init-db] ========================================')
    console.log(`[init-db] File: ${dbPath}`)
    console.log(`[init-db] Size: ${fs.statSync(dbPath).size} bytes`)
    console.log('[init-db]')
    console.log('[init-db] Login:    admin')
    console.log('[init-db] Password: admin')
    console.log('[init-db]')
    console.log('[init-db] WARNING: Change password after first login!')
    console.log('[init-db] ========================================')

  } catch (e) {
    console.error('[init-db] FATAL:', e.message)
    console.error(e.stack)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(e => {
  console.error('[init-db] Unhandled error:', e)
  process.exit(1)
})
