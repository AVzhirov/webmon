import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bootstrapDatabase } from '@/lib/bootstrap'
import { errorResponse } from '@/lib/api-utils'

/** Публичный список серверов (без паролей) — для экрана авторизации. */
export async function GET() {
  try {
    await bootstrapDatabase()
    const servers = await db.server.findMany({
      where: { enabled: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        type: true,
        address: true,
        isDefault: true,
      },
    })

    return NextResponse.json(
      servers.map((s) => ({
        ...s,
        status: s.type === 'demo' ? 'demo' : 'online',
        version: s.type === 'demo' ? 'DEMO' : undefined,
      })),
    )
  } catch (e) {
    return errorResponse('Не удалось получить список серверов', 500, e)
  }
}
