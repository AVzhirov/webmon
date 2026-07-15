/**
 * Простой in-memory rate limiter.
 * Используется для защиты эндпоинтов от brute-force.
 *
 * Не подходит для distributed-окружения (несколько инстансов),
 * но для standalone Windows-службы этого достаточно.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateLimitEntry>()

// Периодическая очистка истёкших записей (каждые 5 минут)
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of buckets) {
    if (entry.resetAt < now) {
      buckets.delete(key)
    }
  }
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * Проверить, разрешён ли запрос.
 * @param key — уникальный ключ (например, IP + endpoint)
 * @param limit — максимум запросов за период
 * @param windowMs — период в миллисекундах
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  cleanup()
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  existing.count++
  const allowed = existing.count <= limit
  return {
    allowed,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  }
}

/** Получить IP клиента из запроса (с учётом прокси). */
export function getClientIP(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    return xff.split(',')[0].trim()
  }
  const xreal = req.headers.get('x-real-ip')
  if (xreal) return xreal
  return 'unknown'
}
