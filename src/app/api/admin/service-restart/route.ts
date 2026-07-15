import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { errorResponse } from '@/lib/api-utils'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * Запрос на перезапуск Windows-службы RKWebMonitor.
 *
 * На Windows служба monitored via NSSM не имеет API для само-перезапуска
 * изнутри процесса. Поэтому мы пишем флаг-файл `restart.flag` в папку data/,
 * а внешний watchdog (поставляется в комплекте) читает его раз в 2 секунды
 * и перезапускает службу.
 *
 * Альтернатива: пользователь сам запускает stop.bat + start.bat.
 */
export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    // Записать флаг-файл в папку data/ рядом с приложением
    const dataDir = path.join(process.cwd(), 'data')
    try {
      await fs.mkdir(dataDir, { recursive: true })
    } catch {
      /* уже существует */
    }
    const flagPath = path.join(dataDir, 'restart.flag')
    await fs.writeFile(flagPath, new Date().toISOString(), 'utf-8')

    return NextResponse.json({
      ok: true,
      message:
        'Запрос на перезапуск отправлен. Служба перезапустится в течение 2-5 секунд. Если этого не произошло — запустите stop.bat и start.bat вручную.',
    })
  } catch (e) {
    return errorResponse('Не удалось запросить перезапуск', 500, e)
  }
}
