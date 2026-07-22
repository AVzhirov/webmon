import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bootstrapDatabase } from '@/lib/bootstrap'
import { errorResponse, clampString } from '@/lib/api-utils'

const SETUP_PASSWORD = '377901'

function checkPassword(req: NextRequest): boolean {
  const auth = req.headers.get('x-setup-password')
  if (auth === SETUP_PASSWORD) return true
  const url = new URL(req.url)
  const q = url.searchParams.get('pwd')
  return q === SETUP_PASSWORD
}

export async function GET(req: NextRequest) {
  try {
    if (!checkPassword(req)) {
      return NextResponse.json({ error: 'Invalid setup password' }, { status: 403 })
    }
    await bootstrapDatabase()
    const servers = await db.server.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })
    const safe = servers.map(({ password, ...rest }) => ({
      ...rest,
      hasPassword: !!password,
    }))
    return NextResponse.json(safe)
  } catch (e) {
    return errorResponse('Failed to get servers', 500, e)
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!checkPassword(req)) {
      return NextResponse.json({ error: 'Invalid setup password' }, { status: 403 })
    }
    await bootstrapDatabase()

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
      return NextResponse.json({ error: 'Name and address are required' }, { status: 400 })
    }
    if (!['demo', 'tcp', 'http'].includes(type ?? 'demo')) {
      return NextResponse.json({ error: 'Invalid server type' }, { status: 400 })
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
    return errorResponse('Failed to create server', 500, e)
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!checkPassword(req)) {
      return NextResponse.json({ error: 'Invalid setup password' }, { status: 403 })
    }

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
      return NextResponse.json({ error: 'Server ID required' }, { status: 400 })
    }

    const existing = await db.server.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
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
        password: password && password.length > 0 ? clampString(password, 256) : existing.password,
        enabled: enabled ?? existing.enabled,
        isDefault: isDefault ?? existing.isDefault,
      },
    })

    const { password: _pwd, ...safe } = updated
    return NextResponse.json({ ...safe, hasPassword: !!_pwd })
  } catch (e) {
    return errorResponse('Failed to update server', 500, e)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!checkPassword(req)) {
      return NextResponse.json({ error: 'Invalid setup password' }, { status: 403 })
    }

    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Server ID required' }, { status: 400 })
    }

    const count = await db.server.count()
    if (count <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last server' },
        { status: 400 },
      )
    }

    await db.server.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse('Failed to delete server', 500, e)
  }
}
