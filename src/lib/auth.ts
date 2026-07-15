import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

/**
 * Хеширование пароля через scrypt (Node.js built-in, не требует внешних пакетов).
 * Возвращает строку вида: scrypt$<salt-hex>$<hash-hex>
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

/** Проверка пароля против хеша (constant-time сравнение). */
export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const salt = Buffer.from(parts[1], 'hex')
  const hash = Buffer.from(parts[2], 'hex')
  const test = scryptSync(password, salt, 64)
  if (test.length !== hash.length) return false
  return timingSafeEqual(test, hash)
}

/** Генерация криптостойкого случайного токена сессии. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex')
}

/** Генерация случайного пароля заданной длины (для восстановления). */
export function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = randomBytes(length)
  return Array.from(bytes).map((b) => chars[b % chars.length]).join('')
}
