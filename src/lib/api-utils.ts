import { NextResponse } from 'next/server'

/**
 * Безопасный ответ с ошибкой — НЕ раскрывает внутренние детали.
 * Логирует полную ошибку на сервер, клиенту возвращает только общее сообщение.
 */
export function errorResponse(
  message: string,
  status = 500,
  error?: unknown,
): NextResponse {
  // Полная ошибка — только в серверный лог
  if (error && process.env.NODE_ENV !== 'production') {
    console.error(`[api] ${message}:`, error)
  } else if (error) {
    // В production — только message ошибки, без stack
    console.error(`[api] ${message}:`, error instanceof Error ? error.message : String(error))
  }

  // Клиенту — только общее сообщение
  return NextResponse.json({ error: message }, { status })
}

/**
 * Валидация длины строки. Возвращает обрезанную строку или бросает.
 */
export function clampString(s: string | undefined, max: number): string {
  if (!s) return ''
  return s.length > max ? s.slice(0, max) : s
}
