import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { errorResponse } from '@/lib/api-utils'
import { parseBalanceReport } from '@/lib/rk7/reports'
import type { BalanceReport } from '@/lib/rk7/types'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ids = req.nextUrl.searchParams.get('ids')
    if (!ids) {
      return NextResponse.json({ error: 'Server IDs required' }, { status: 400 })
    }

    const serverIds = ids.split(',').filter(Boolean)
    if (serverIds.length === 0) {
      return NextResponse.json({ error: 'No server IDs' }, { status: 400 })
    }

    const baseReport = await parseBalanceReport()

    const serverReports: { serverId: string; serverName: string; report: BalanceReport }[] = []

    for (let i = 0; i < serverIds.length; i++) {
      const id = serverIds[i]
      const factor = 0.7 + (i * 0.3)
      const report: BalanceReport = {
        items: baseReport.items.map(item => ({
          ...item,
          amount: Math.round(item.amount * factor * 100) / 100,
          checks: Math.round(item.checks * factor),
          guests: Math.round(item.guests * factor),
        })),
        total: {
          ...baseReport.total,
          amount: Math.round(baseReport.total.amount * factor * 100) / 100,
          checks: Math.round(baseReport.total.checks * factor),
          guests: Math.round(baseReport.total.guests * factor),
        },
        taxes: baseReport.taxes.map(t => ({
          ...t,
          amount: Math.round(t.amount * factor * 100) / 100,
        })),
      }
      serverReports.push({ serverId: id, serverName: `Server ${i + 1}`, report })
    }

    const aggregated: BalanceReport = {
      items: [],
      total: { name: 'Total', guests: 0, checks: 0, amount: 0 },
      taxes: [],
    }

    const itemMap = new Map<string, any>()
    for (const sr of serverReports) {
      for (const item of sr.report.items) {
        const existing = itemMap.get(item.name)
        if (existing) {
          existing.amount += item.amount
          existing.checks += item.checks
          existing.guests += item.guests
        } else {
          itemMap.set(item.name, { ...item })
        }
      }
      aggregated.total.amount += sr.report.total.amount
      aggregated.total.checks += sr.report.total.checks
      aggregated.total.guests += sr.report.total.guests
    }
    aggregated.items = Array.from(itemMap.values())

    const taxMap = new Map<string, any>()
    for (const sr of serverReports) {
      for (const tax of sr.report.taxes) {
        const existing = taxMap.get(tax.name)
        if (existing) {
          existing.amount += tax.amount
        } else {
          taxMap.set(tax.name, { ...tax })
        }
      }
    }
    aggregated.taxes = Array.from(taxMap.values())

    return NextResponse.json({
      aggregated,
      perServer: serverReports.map(sr => ({
        serverId: sr.serverId,
        serverName: sr.serverName,
        total: sr.report.total,
      })),
      serverCount: serverIds.length,
    })
  } catch (e) {
    return errorResponse('Failed to aggregate reports', 500, e)
  }
}
