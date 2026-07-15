import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * Проверка соединения с сервером:
 *  - demo: проверить существование папки
 *  - tcp:  проверить TCP-соединение с IP:порт
 *  - http: проверить HTTP-запрос
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const body = await req.json()
    const { type, address } = body as { type: string; address: string }

    if (!address) {
      return NextResponse.json({ error: 'Не указан адрес' }, { status: 400 })
    }

    if (type === 'demo') {
      const dir = path.isAbsolute(address)
        ? address
        : path.join(process.cwd(), address)
      try {
        const stat = await fs.stat(dir)
        if (!stat.isDirectory()) {
          return NextResponse.json({
            ok: false,
            error: 'Путь существует, но это не папка',
          })
        }
        const files = await fs.readdir(dir)
        const xmlCount = files.filter((f) => f.endsWith('.xml')).length
        return NextResponse.json({
          ok: true,
          message: `Папка доступна, найдено ${xmlCount} XML-файлов`,
        })
      } catch {
        return NextResponse.json({ ok: false, error: 'Папка не существует или нет доступа' })
      }
    }

    if (type === 'tcp') {
      // Разобрать IP:порт
      const m = address.match(/^(.+):(\d+)$/)
      if (!m) {
        return NextResponse.json({ ok: false, error: 'Неверный формат. Ожидается IP:порт (например 192.168.1.10:15551)' })
      }
      const host = m[1]
      const port = parseInt(m[2], 10)
      const ok = await checkTcp(host, port, 3000)
      return NextResponse.json(
        ok
          ? { ok: true, message: `Соединение с ${host}:${port} установлено` }
          : { ok: false, error: `Не удалось подключиться к ${host}:${port}` },
      )
    }

    if (type === 'http') {
      try {
        const ctrl = new AbortController()
        const t = setTimeout(() => ctrl.abort(), 5000)
        const r = await fetch(address, { method: 'HEAD', signal: ctrl.signal })
        clearTimeout(t)
        return NextResponse.json({
          ok: r.ok || r.status < 500,
          message: `HTTP ${r.status} ${r.statusText}`,
        })
      } catch (e) {
        return NextResponse.json({ ok: false, error: `HTTP-запрос failed: ${String(e)}` })
      }
    }

    return NextResponse.json({ ok: false, error: `Неизвестный тип сервера: ${type}` })
  } catch (e) {
    return NextResponse.json(
      { error: 'Внутренняя ошибка', detail: String(e) },
      { status: 500 },
    )
  }
}

function checkTcp(host: string, port: number, timeoutMs: number): Promise<boolean> {
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
