import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/auth'
import { createSession, destroySession } from '@/lib/session'
import { bootstrapDatabase } from '@/lib/bootstrap'
import { rateLimit, getClientIP } from '@/lib/rate-limit'
import { errorResponse, clampString } from '@/lib/api-utils'

// 10 попыток входа с одного IP за 10 минут
const LOGIN_LIMIT = 10
const LOGIN_WINDOW = 10 * 60 * 1000

export async function POST(req: NextRequest) {
  try {
    // Rate limit — защита от brute force
    const ip = getClientIP(req)
    const rl = rateLimit(`login:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW)
    if (!rl.allowed) {
      const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000)
      return NextResponse.json(
        { error: `Слишком много попыток входа. Повторите через ${retryAfter} сек.` },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        },
      )
    }

    // Убедиться, что БД инициализирована (на случай первого запуска)
    await bootstrapDatabase()

    const body = await req.json().catch(() => ({}))
    const { username, password, serverId } = body as {
      username?: string
      password?: string
      serverId?: string
    }

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Не указан логин или пароль' },
        { status: 400 },
      )
    }

    // Валидация длины — защита от аномально больших значений
    const usernameClamped = clampString(username, 64)
    const passwordClamped = clampString(password, 1024)

    const user = await db.user.findUnique({ where: { username: usernameClamped } })
    // Одинаковое сообщение для "нет пользователя" и "неверный пароль"
    // — чтобы не раскрывать существование учётки
    if (!user || !user.active) {
      return NextResponse.json(
        { error: 'Неверный логин или пароль' },
        { status: 401 },
      )
    }

    if (!verifyPassword(passwordClamped, user.passwordHash)) {
      return NextResponse.json(
        { error: 'Неверный логин или пароль' },
        { status: 401 },
      )
    }

    // Проверка выбранного сервера
    if (serverId) {
      const server = await db.server.findUnique({ where: { id: serverId } })
      if (!server || !server.enabled) {
        return NextResponse.json(
          { error: 'Выбранный сервер недоступен' },
          { status: 400 },
        )
      }
    }

    // Защита от session fixation: удалить старые сессии этого пользователя
    // (опционально — оставляем, чтобы не разрывать другие устройства,
    // но удаляем текущую сессию если была)
    await destroySession()

    // Усечь userAgent (защита от аномально больших значений)
    const userAgent = clampString(req.headers.get('user-agent') ?? '', 256)
    await createSession(user.id, userAgent || undefined)

    const { passwordHash, ...safeUser } = user
    return NextResponse.json({
      user: safeUser,
      serverId: serverId ?? null,
    })
  } catch (e) {
    return errorResponse('Внутренняя ошибка сервера', 500, e)
  }
}
