import { NextResponse } from 'next/server'

/**
 * Демо-данные XML — статичны, можно кэшировать на клиенте на 5 минут.
 * Ускоряет повторные загрузки отчётов.
 */
export async function withDemoDelay<T extends NextResponse>(resp: T, ms = 80): Promise<T> {
  await new Promise((r) => setTimeout(r, ms))
  // Cache-Control: приватный (только для браузера), 5 минут
  resp.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=600')
  return resp
}
