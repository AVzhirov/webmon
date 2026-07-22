import { NextResponse } from 'next/server'

/**
 * Для демо-данных добавляет небольшую задержку и cache-control.
 * Для реальных данных (RK7) не используется — они идут напрямую.
 */
export async function withDemoDelay<T extends NextResponse>(resp: T, ms = 80): Promise<T> {
  await new Promise((r) => setTimeout(r, ms))
  resp.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
  return resp
}
