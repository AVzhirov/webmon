import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { errorResponse, clampString } from '@/lib/api-utils'

/**
 * GET /api/messages — список сообщений (для авторизованных)
 * POST /api/messages — отправить сообщение (manager + admin)
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const messages = await db.staffMessage.findMany({
      orderBy: { sentAt: 'desc' },
      take: 200, // ограничение — последние 200
      include: { sentBy: { select: { displayName: true } } },
    })

    return NextResponse.json(messages)
  } catch (e) {
    return errorResponse('Не удалось получить сообщения', 500, e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }
    // Только manager и admin могут отправлять сообщения
    if (user.role === 'viewer') {
      return NextResponse.json({ error: 'Недостаточно прав для отправки' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const { recipient, recipientCode, text } = body as {
      recipient?: string
      recipientCode?: number
      text?: string
    }

    if (!recipient?.trim() || !text?.trim()) {
      return NextResponse.json(
        { error: 'Не заполнены получатель или текст сообщения' },
        { status: 400 },
      )
    }

    // Валидация длины
    if (recipient.length > 100 || text.length > 1000) {
      return NextResponse.json(
        { error: 'Превышена максимальная длина (получатель: 100, текст: 1000)' },
        { status: 400 },
      )
    }

    const newMsg = await db.staffMessage.create({
      data: {
        recipient: clampString(recipient.trim(), 100),
        recipientCode: typeof recipientCode === 'number' ? recipientCode : null,
        text: clampString(text.trim(), 1000),
        sentById: user.id,
        status: 'sent',
      },
      include: { sentBy: { select: { displayName: true } } },
    })

    return NextResponse.json(newMsg, { status: 201 })
  } catch (e) {
    return errorResponse('Не удалось отправить сообщение', 500, e)
  }
}
