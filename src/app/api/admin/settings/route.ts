import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { getSettings, setSettings, writeEnvFile } from '@/lib/settings'
import { errorResponse } from '@/lib/api-utils'
import path from 'path'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }
    const settings = await getSettings()
    return NextResponse.json(settings)
  } catch (e) {
    return errorResponse('Не удалось получить настройки', 500, e)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const body = await req.json()
    const { port, host } = body as { port?: number; host?: string }

    // Валидация порта
    if (port !== undefined) {
      const p = Number(port)
      if (!Number.isInteger(p) || p < 1 || p > 65535) {
        return NextResponse.json(
          { error: 'Порт должен быть целым числом от 1 до 65535' },
          { status: 400 },
        )
      }
      // Запретить привилегированные порты (<1024) на Windows без прав админа
      if (p < 1024) {
        return NextResponse.json(
          { error: 'Порты ниже 1024 требуют прав администратора. Используйте порт ≥ 1024.' },
          { status: 400 },
        )
      }
    }

    // Валидация host
    if (host !== undefined && typeof host !== 'string') {
      return NextResponse.json({ error: 'host должен быть строкой' }, { status: 400 })
    }

    const updates: { port?: number; host?: string } = {}
    if (port !== undefined) updates.port = Number(port)
    if (host !== undefined) updates.host = String(host)

    await setSettings(updates)

    // Записать .env файл (для standalone Next.js)
    try {
      const envPath = path.join(process.cwd(), '.env')
      await writeEnvFile(envPath)
    } catch (e) {
      console.warn('[settings] Не удалось записать .env:', e)
    }

    const updated = await getSettings()
    return NextResponse.json({
      ...updated,
      warning:
        'Изменения порта применятся только после перезапуска службы/сервера. Используйте "Перезапустить службу" или stop.bat + start.bat.',
    })
  } catch (e) {
    return errorResponse('Не удалось обновить настройки', 500, e)
  }
}
