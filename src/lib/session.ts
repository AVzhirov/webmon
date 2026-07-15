import { cookies } from 'next/headers'
import { db } from './db'
import { generateToken } from './auth'

export const SESSION_COOKIE = 'rkwm_session'
const SESSION_TTL_DAYS = 7

/** Создать сессию для пользователя и установить cookie. */
export async function createSession(
  userId: string,
  userAgent?: string,
): Promise<string> {
  const token = generateToken(32)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS)

  await db.session.create({
    data: { token, userId, expiresAt, userAgent },
  })

  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })

  // Фоновая очистка истёкших сессий (не блокирует ответ)
  cleanupExpiredSessions().catch(() => {})

  return token
}

/** Получить текущего пользователя по cookie сессии. */
export async function getCurrentUser() {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null

  // Используем token напрямую (он криптостойкий — 64 hex символа)
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session) return null
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }

  // Проверка, что пользователь всё ещё активен
  if (!session.user.active) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }

  return session.user
}

/** Разрушить сессию (logout). */
export async function destroySession(): Promise<void> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) {
    await db.session.deleteMany({ where: { token } }).catch(() => {})
  }
  store.delete(SESSION_COOKIE)
}

/** Требовать авторизацию — бросает ошибку, если не залогинен. */
export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }
  return user
}

/** Требовать роль администратора. */
export async function requireAdmin() {
  const user = await requireUser()
  if (user.role !== 'admin') {
    throw new Error('FORBIDDEN')
  }
  return user
}

/**
 * Очистка истёкших сессий. Вызывается периодически.
 * Удаляет не более 100 записей за раз (для скорости).
 */
let lastCleanupAt = 0
const CLEANUP_COOLDOWN = 5 * 60 * 1000 // 5 минут

export async function cleanupExpiredSessions(): Promise<void> {
  const now = Date.now()
  if (now - lastCleanupAt < CLEANUP_COOLDOWN) return
  lastCleanupAt = now

  try {
    await db.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
      // Prisma не поддерживает limit в deleteMany — удаляем все истёкшие
    })
  } catch {
    // ignore — это фоновая задача
  }
}
