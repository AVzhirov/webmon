import { PrismaClient } from '@prisma/client'

// ВАЖНО: убираем кавычки из DATABASE_URL если они есть
// NSSM или .env файл могут добавить двойные кавычки,
// которые Prisma не может распарсить
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/^["']|["']$/g, '')
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
