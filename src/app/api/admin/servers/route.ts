import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { bootstrapDatabase } from '@/lib/bootstrap'
import { errorResponse, clampString } from '@/lib/api-utils'

/** Проверка прав: только admin может изменять серверы, любой авторизованный может смотреть. */
async function checkAuth(requireAdmin: boolean) {
  const user = await getCurrentUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Не авторизован' }, { status: 401 }) }
  }
  if (requireAdmin && user.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 }) }
  }
  return { user }
}

export async function GET() {
  try {
    await bootstrapDatabase()
    const auth = await checkAuth(false)
    if ('error' in auth) return auth.error

    const servers = await db.server.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })

    // Не возвращаем пароли
    const safe = servers.map(({ password: _pwd, ...rest }) => ({
      ...rest,
      hasPassword: !!_pwd,
    }))

    return NextResponse.json(safe)
  } catch (e) {
    return errorResponse('Не удалось получить список серверов', 500, e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await checkAuth(true)
    if ('error' in auth) return auth.error

    const body = await req.json().catch(() => ({}))
    const { name, type, address, cryptKey, username, password, enabled, isDefault } = body as {
      name: string
      type: 'demo' | 'tcp' | 'http'
      address: string
      cryptKey?: string
      username?: string
      password?: string
      enabled?: boolean
      isDefault?: boolean
    }

    if (!name?.trim() || !address?.trim()) {
      return NextResponse.json(
        { error: 'Не заполнены обязательные поля (имя, адрес)' },
        { status: 400 },
      )
    }

    // Валидация длины полей
    if (name.length > 100 || address.length > 500) {
      return NextResponse.json(
        { error: 'Превышена максимальная длина поля' },
        { status: 400 },
      )
    }

    // Валидация типа
    if (!['demo', 'tcp', 'http'].includes(type ?? 'demo')) {
      return NextResponse.json({ error: 'Недопустимый тип сервера' }, { status: 400 })
    }

    if (isDefault) {
      await db.server.updateMany({ data: { isDefault: false } })
    }

    const server = await db.server.create({
      data: {
        name: clampString(name.trim(), 100),
        type: type ?? 'demo',
        address: clampString(address.trim(), 500),
        cryptKey: cryptKey?.trim() ? clampString(cryptKey.trim(), 256) : null,
        username: username?.trim() ? clampString(username.trim(), 64) : null,
        password: password ? clampString(password, 256) : null,
        enabled: enabled ?? true,
        isDefault: isDefault ?? false,
      },
    })

    const { password: _pwd, ...safe } = server
    return NextResponse.json({ ...safe, hasPassword: !!_pwd }, { status: 201 })
  } catch (e) {
    return errorResponse('Не удалось создать сервер', 500, e)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await checkAuth(true)
    if ('error' in auth) return auth.error

    const body = await req.json().catch(() => ({}))
    const { id, name, type, address, cryptKey, username, password, enabled, isDefault } = body as {
      id: string
      name?: string
      type?: 'demo' | 'tcp' | 'http'
      address?: string
      cryptKey?: string | null
      username?: string | null
      password?: string | null
      enabled?: boolean
      isDefault?: boolean
    }

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Не указан ID сервера' }, { status: 400 })
    }

    const existing = await db.server.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Сервер не найден' }, { status: 404 })
    }

    if (type && !['demo', 'tcp', 'http'].includes(type)) {
      return NextResponse.json({ error: 'Недопустимый тип сервера' }, { status: 400 })
    }

    if (isDefault) {
      await db.server.updateMany({ data: { isDefault: false } })
    }

    const updated = await db.server.update({
      where: { id },
      data: {
        name: name?.trim() ? clampString(name.trim(), 100) : existing.name,
        type: type ?? existing.type,
        address: address?.trim() ? clampString(address.trim(), 500) : existing.address,
        cryptKey: cryptKey !== undefined ? (cryptKey?.trim() ? clampString(cryptKey.trim(), 256) : null) : existing.cryptKey,
        username: username !== undefined ? (username?.trim() ? clampString(username.trim(), 64) : null) : existing.username,
        // Пароль обновляем только если пришло новое значение (не null, не пустое)
        password: password && password.length > 0 ? clampString(password, 256) : existing.password,
        enabled: enabled ?? existing.enabled,
        isDefault: isDefault ?? existing.isDefault,
      },
    })

    const { password: _pwd, ...safe } = updated
    return NextResponse.json({ ...safe, hasPassword: !!_pwd })
  } catch (e) {
    return errorResponse('Не удалось обновить сервер', 500, e)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await checkAuth(true)
    if ('error' in auth) return auth.error

    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Не указан ID сервера' }, { status: 400 })
    }

    // Запретить удаление последнего сервера
    const count = await db.server.count()
    if (count <= 1) {
      return NextResponse.json(
        { error: 'Нельзя удалить последний сервер — должен остаться хотя бы один' },
        { status: 400 },
      )
    }

    await db.server.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse('Не удалось удалить сервер', 500, e)
  }
}
