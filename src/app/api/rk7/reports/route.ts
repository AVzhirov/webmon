import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { errorResponse } from '@/lib/api-utils'
import {
  rk7Request,
  buildBalanceReportQuery,
  buildSystemBalanceQuery,
  buildMoneyReportQuery,
  buildDishesReportQuery,
  buildSumOrdersQuery,
  buildSumWaitersQuery,
  buildReceiptsListQuery,
  buildOrderListQuery,
  buildHallPlansQuery,
  buildPersonalQuery,
} from '@/lib/rk7/tcp-client'
import { parseXml } from '@/lib/rk7/parser'
import { findChild, findChildren, getText, num, int, cleanName } from '@/lib/rk7/parser'

/**
 * GET /api/rk7/reports?type=balance&serverId=xxx
 *
 * Получает реальные данные с RK7 сервера через TCP.
 * type может быть: balance, systemBalance, money, dishes, sumOrders, sumWaiters,
 *                  receiptsList, orders, hallPlans, personal
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reportType = req.nextUrl.searchParams.get('type')
    const serverId = req.nextUrl.searchParams.get('serverId')

    if (!reportType) {
      return NextResponse.json({ error: 'Report type required' }, { status: 400 })
    }

    if (!serverId) {
      return NextResponse.json({ error: 'Server ID required' }, { status: 400 })
    }

    // Получаем конфигурацию сервера из БД
    const server = await db.server.findUnique({ where: { id: serverId } })
    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    if (server.type === 'demo') {
      // Для демо-серверов — возвращаем демо-данные (старый механизм)
      return NextResponse.json({ demo: true, message: 'Demo server — use /api/reports/* endpoints' })
    }

    const config = {
      address: server.address,
      username: server.username,
      password: server.password,
      cryptKey: server.cryptKey,
    }

    // Выбираем XML-запрос в зависимости от типа отчёта
    let xmlQuery: string
    switch (reportType) {
      case 'balance':
        xmlQuery = buildBalanceReportQuery(config)
        break
      case 'systemBalance':
        xmlQuery = buildSystemBalanceQuery(config)
        break
      case 'money':
        xmlQuery = buildMoneyReportQuery(config)
        break
      case 'dishes':
        xmlQuery = buildDishesReportQuery(config)
        break
      case 'sumOrders':
        xmlQuery = buildSumOrdersQuery(config)
        break
      case 'sumWaiters':
        xmlQuery = buildSumWaitersQuery(config)
        break
      case 'receiptsList':
        xmlQuery = buildReceiptsListQuery(config)
        break
      case 'orders':
        xmlQuery = buildOrderListQuery(config)
        break
      case 'hallPlans':
        xmlQuery = buildHallPlansQuery(config)
        break
      case 'personal':
        xmlQuery = buildPersonalQuery(config)
        break
      default:
        return NextResponse.json({ error: `Unknown report type: ${reportType}` }, { status: 400 })
    }

    // Отправляем запрос к RK7 серверу
    const result = await rk7Request(config, xmlQuery)

    if (!result.success) {
      return NextResponse.json({
        error: 'RK7 request failed',
        detail: result.error,
      }, { status: 502 })
    }

    // Возвращаем сырой XML — клиент сам его распарсит
    // Или можно распарсить здесь, используя существующие парсеры
    return NextResponse.json({
      success: true,
      xml: result.xml,
      serverName: server.name,
      reportType,
    })
  } catch (e) {
    return errorResponse('Failed to get RK7 report', 500, e)
  }
}
