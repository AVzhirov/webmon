import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { hashPassword, verifyPassword } from '@/lib/auth'
import { errorResponse, clampString } from '@/lib/api-utils'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const users = await db.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(users)
  } catch (e) {
    return errorResponse('Не удалось получить список пользователей', 500, e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const body = await req.json()
    const { username, password, displayName, role, active } = body as {
      username: string
      password: string
      displayName?: string
      role: 'admin' | 'manager' | 'viewer'
      active?: boolean
    }

    if (!username?.trim() || !password) {
      return NextResponse.json(
        { error: 'Не заполнены логин и пароль' },
        { status: 400 },
      )
    }
    // Валидация длины
    if (username.length > 64 || password.length > 256) {
      return NextResponse.json(
        { error: 'Превышена максимальная длина (логин: 64, пароль: 256)' },
        { status: 400 },
      )
    }
    if (password.length < 4) {
      return NextResponse.json(
        { error: 'Пароль должен быть не короче 4 символов' },
        { status: 400 },
      )
    }
    if (!['admin', 'manager', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: `Недопустимая роль: ${role}` },
        { status: 400 },
      )
    }

    const existing = await db.user.findUnique({ where: { username: username.trim() } })
    if (existing) {
      return NextResponse.json(
        { error: `Пользователь "${username}" уже существует` },
        { status: 409 },
      )
    }

    const user = await db.user.create({
      data: {
        username: clampString(username.trim(), 64),
        passwordHash: hashPassword(password),
        displayName: clampString(displayName?.trim() || username.trim(), 100),
        role,
        active: active ?? true,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (e) {
    return errorResponse('Не удалось создать пользователя', 500, e)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const body = await req.json()
    const { id, displayName, role, active, newPassword, currentPassword } = body as {
      id: string
      displayName?: string
      role?: 'admin' | 'manager' | 'viewer'
      active?: boolean
      newPassword?: string
      currentPassword?: string // нужен только если админ меняет свой пароль
    }

    if (!id) {
      return NextResponse.json({ error: 'Не указан ID пользователя' }, { status: 400 })
    }

    const target = await db.user.findUnique({ where: { id } })
    if (!target) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    // Если админ меняет свой пароль — требуем текущий пароль
    if (newPassword && id === currentUser.id) {
      if (!currentPassword || !verifyPassword(currentPassword, target.passwordHash)) {
        return NextResponse.json(
          { error: 'Неверный текущий пароль' },
          { status: 400 },
        )
      }
    }

    if (role && !['admin', 'manager', 'viewer'].includes(role)) {
      return NextResponse.json({ error: `Недопустимая роль: ${role}` }, { status: 400 })
    }

    // Запретить само-блокировку и понижение своей роли (чтобы не остаться без админа)
    if (id === currentUser.id) {
      if (active === false) {
        return NextResponse.json(
          { error: 'Нельзя заблокировать самого себя' },
          { status: 400 },
        )
      }
      if (role && role !== 'admin') {
        return NextResponse.json(
          { error: 'Нельзя понизить свою роль — нужен хотя бы один админ' },
          { status: 400 },
        )
      }
    }

    // Запретить удаление последнего админа
    if (target.role === 'admin' && (role !== 'admin' || active === false)) {
      const adminCount = await db.user.count({ where: { role: 'admin', active: true } })
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Нельзя заблокировать или понизить последнего администратора' },
          { status: 400 },
        )
      }
    }

    const updated = await db.user.update({
      where: { id },
      data: {
        displayName: displayName?.trim() || target.displayName,
        role: role ?? target.role,
        active: active ?? target.active,
        passwordHash: newPassword && newPassword.length >= 4 ? hashPassword(newPassword) : undefined,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(updated)
  } catch (e) {
    return errorResponse('Не удалось обновить пользователя', 500, e)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Не указан ID пользователя' }, { status: 400 })
    }

    if (id === currentUser.id) {
      return NextResponse.json(
        { error: 'Нельзя удалить самого себя' },
        { status: 400 },
      )
    }

    const target = await db.user.findUnique({ where: { id } })
    if (!target) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    if (target.role === 'admin') {
      const adminCount = await db.user.count({ where: { role: 'admin', active: true } })
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Нельзя удалить последнего администратора' },
          { status: 400 },
        )
      }
    }

    await db.user.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse('Не удалось удалить пользователя', 500, e)
  }
}
