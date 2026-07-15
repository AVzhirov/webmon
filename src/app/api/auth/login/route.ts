import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/auth'
import { createSession } from '@/lib/session'
import { bootstrapDatabase } from '@/lib/bootstrap'

export async function POST(req: NextRequest) {
  try {
    // Убедиться, что БД инициализирована (на случай первого запуска)
    await bootstrapDatabase()

    const body = await req.json()
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

    const user = await db.user.findUnique({ where: { username } })
    if (!user || !user.active) {
      return NextResponse.json(
        { error: 'Неверный логин или пароль' },
        { status: 401 },
      )
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: 'Неверный логин или пароль' },
        { status: 401 },
      )
    }

    // Запомнить выбранный сервер в сессии (опционально)
    if (serverId) {
      const server = await db.server.findUnique({ where: { id: serverId } })
      if (!server || !server.enabled) {
        return NextResponse.json(
          { error: 'Выбранный сервер недоступен' },
          { status: 400 },
        )
      }
    }

    const userAgent = req.headers.get('user-agent') ?? undefined
    await createSession(user.id, userAgent)

    // Обновить lastLogin (через updatedAt автоматически)
    const { passwordHash, ...safeUser } = user
    return NextResponse.json({
      user: safeUser,
      serverId: serverId ?? null,
    })
  } catch (e) {
    console.error('[auth/login] Error:', e)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера', detail: String(e) },
      { status: 500 },
    )
  }
}
