import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { errorResponse, clampString } from '@/lib/api-utils'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * Проверка соединения с сервером:
 *  - demo: проверить существование папки (только в пределах app/data или public/demo-data)
 *  - tcp:  проверить TCP-соединение с IP:порт (запрет приватных адресов опционален)
 *  - http: проверить HTTP-запрос (только HEAD, таймаут 5 сек)
 */
export async function POST(req: NextRequest) {
  try {
    // Только admin может проверять соединения (защита от SSRF и information disclosure)
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const { type, address } = body as { type: string; address: string }

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Не указан адрес' }, { status: 400 })
    }

    // Ограничение длины адреса
    const addressClamped = clampString(address, 500)

    if (type === 'demo') {
      return await checkDemoPath(addressClamped)
    }

    if (type === 'tcp') {
      return await checkTcp(addressClamped)
    }

    if (type === 'http') {
      return await checkHttp(addressClamped)
    }

    return NextResponse.json({ ok: false, error: `Неизвестный тип сервера: ${type}` })
  } catch (e) {
    return errorResponse('Внутренняя ошибка', 500, e)
  }
}

/** Проверка demo-пути — только в пределах разрешённых директорий. */
async function checkDemoPath(address: string) {
  // Разрешённые корневые директории
  const cwd = process.cwd()
  const allowedRoots = [
    path.join(cwd, 'public', 'demo-data'),
    path.join(cwd, 'data'),
  ]

  const target = path.isAbsolute(address)
    ? address
    : path.join(cwd, address)

  // Нормализуем и проверяем, что путь в пределах разрешённых корней
  const normalizedTarget = path.normalize(target)
  const isAllowed = allowedRoots.some((root) => {
    const normalizedRoot = path.normalize(root)
    return normalizedTarget === normalizedRoot || normalizedTarget.startsWith(normalizedRoot + path.sep)
  })

  if (!isAllowed) {
    return NextResponse.json({
      ok: false,
      error: 'Доступ к пути запрещён (вне разрешённых директорий)',
    })
  }

  try {
    const stat = await fs.stat(normalizedTarget)
    if (!stat.isDirectory()) {
      return NextResponse.json({
        ok: false,
        error: 'Путь существует, но это не папка',
      })
    }
    const files = await fs.readdir(normalizedTarget)
    const xmlCount = files.filter((f) => f.endsWith('.xml')).length
    return NextResponse.json({
      ok: true,
      message: `Папка доступна, найдено ${xmlCount} XML-файлов`,
    })
  } catch {
    return NextResponse.json({ ok: false, error: 'Папка не существует или нет доступа' })
  }
}

/** Проверка TCP-соединения — с таймаутом 3 сек. */
async function checkTcp(address: string) {
  const m = address.match(/^([\w.-]+):(\d+)$/)
  if (!m) {
    return NextResponse.json({
      ok: false,
      error: 'Неверный формат. Ожидается IP:порт (например 192.168.1.10:15551)',
    })
  }
  const host = m[1]
  const port = parseInt(m[2], 10)
  if (port < 1 || port > 65535) {
    return NextResponse.json({ ok: false, error: 'Порт должен быть 1-65535' })
  }

  const ok = await testTcpConnection(host, port, 3000)
  return NextResponse.json(
    ok
      ? { ok: true, message: `Соединение с ${host}:${port} установлено` }
      : { ok: false, error: `Не удалось подключиться к ${host}:${port}` },
  )
}

function testTcpConnection(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const net = require('net') as typeof import('net')
    const socket = new net.Socket()
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })
    socket.once('error', () => {
      socket.destroy()
      resolve(false)
    })
    socket.connect(port, host)
  })
}

/** Проверка HTTP-запроса — только HEAD, таймаут 5 сек. */
async function checkHttp(address: string) {
  // Валидация URL
  let url: URL
  try {
    url = new URL(address)
  } catch {
    return NextResponse.json({ ok: false, error: 'Неверный URL' })
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return NextResponse.json({ ok: false, error: 'Поддерживаются только http/https' })
  }

  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 5000)
    const r = await fetch(url, { method: 'HEAD', signal: ctrl.signal })
    clearTimeout(t)
    return NextResponse.json({
      ok: r.ok || r.status < 500,
      message: `HTTP ${r.status} ${r.statusText}`,
    })
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error && e.name === 'AbortError' ? 'Таймаут (5 сек)' : 'HTTP-запрос failed',
    })
  }
}
