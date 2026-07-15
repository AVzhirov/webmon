import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { bootstrapDatabase } from '@/lib/bootstrap'

export async function GET() {
  try {
    await bootstrapDatabase()
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const servers = await db.server.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })

    // Не возвращаем пароли
    const safe = servers.map(({ password, ...rest }) => ({
      ...rest,
      hasPassword: !!password,
      password: undefined,
    }))

    return NextResponse.json(safe)
  } catch (e) {
    return NextResponse.json(
      { error: 'Не удалось получить список серверов', detail: String(e) },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const body = await req.json()
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

    if (isDefault) {
      // Снять флаг default с других
      await db.server.updateMany({ data: { isDefault: false } })
    }

    const server = await db.server.create({
      data: {
        name: name.trim(),
        type: type ?? 'demo',
        address: address.trim(),
        cryptKey: cryptKey?.trim() || null,
        username: username?.trim() || null,
        password: password || null,
        enabled: enabled ?? true,
        isDefault: isDefault ?? false,
      },
    })

    const { password: _pwd, ...safe } = server
    return NextResponse.json(
      { ...safe, hasPassword: !!_pwd },
      { status: 201 },
    )
  } catch (e) {
    return NextResponse.json(
      { error: 'Не удалось создать сервер', detail: String(e) },
      { status: 500 },
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const body = await req.json()
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

    if (!id) {
      return NextResponse.json({ error: 'Не указан ID сервера' }, { status: 400 })
    }

    const existing = await db.server.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Сервер не найден' }, { status: 404 })
    }

    if (isDefault) {
      await db.server.updateMany({ data: { isDefault: false } })
    }

    const updated = await db.server.update({
      where: { id },
      data: {
        name: name?.trim() ?? existing.name,
        type: type ?? existing.type,
        address: address?.trim() ?? existing.address,
        cryptKey: cryptKey !== undefined ? (cryptKey?.trim() || null) : existing.cryptKey,
        username: username !== undefined ? (username?.trim() || null) : existing.username,
        // Пароль обновляем только если пришло новое значение (не null)
        password: password && password.length > 0 ? password : existing.password,
        enabled: enabled ?? existing.enabled,
        isDefault: isDefault ?? existing.isDefault,
      },
    })

    const { password: _pwd2, ...safe } = updated
    return NextResponse.json({ ...safe, hasPassword: !!_pwd2 })
  } catch (e) {
    return NextResponse.json(
      { error: 'Не удалось обновить сервер', detail: String(e) },
      { status: 500 },
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

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
    return NextResponse.json(
      { error: 'Не удалось удалить сервер', detail: String(e) },
      { status: 500 },
    )
  }
}
