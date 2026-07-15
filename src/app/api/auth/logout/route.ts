import { NextResponse } from 'next/server'
import { destroySession } from '@/lib/session'
import { errorResponse } from '@/lib/api-utils'

export async function POST() {
  try {
    await destroySession()
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse('Не удалось выйти', 500, e)
  }
}
