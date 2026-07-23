/**
 * Маршрутизатор источников данных.
 *
 * Если serverId указан и сервер типа tcp/http — получает данные через RK7 XML Interface.
 * Если сервер типа demo или serverId не указан — читает демо XML файлы.
 */

import { db } from '@/lib/db'
import { rk7Request, buildBalanceReportQuery, buildSystemBalanceQuery,
  buildMoneyReportQuery, buildDishesReportQuery, buildSumOrdersQuery,
  buildSumWaitersQuery, buildReceiptsListQuery, buildOrderListQuery,
  buildHallPlansQuery, buildPersonalQuery } from '@/lib/rk7/tcp-client'
import { parseXml, findChild, findChildren, getText, num, int, cleanName } from '@/lib/rk7/parser'
import {
  parseBalanceReport, parseRevenueReport, parseDishesReport,
  parseCheckList, parseCheckDetail, parseOrdersReport,
  parseMoneyByPerson, parseOpenSumReport, parseCashInfo,
  parsePersonal, parseHallPlans, parseHallTables, parseServicePrint,
} from '@/lib/rk7/reports'
import type { NextRequest } from 'next/server'

export interface DataSourceResult<T> {
  data: T
  source: 'demo' | 'rk7'
  serverName?: string
}

/**
 * Определяет, откуда брать данные — демо-XML или реальный RK7 сервер.
 * Возвращает null если нужно использовать демо-данные.
 */
export async function getServerConfig(req: NextRequest) {
  const serverId = req.nextUrl.searchParams.get('serverId')
  if (!serverId) return null

  const server = await db.server.findUnique({ where: { id: serverId } })
  if (!server) return null
  if (server.type === 'demo') return null

  return {
    address: server.address,
    username: server.username,
    password: server.password,
    cryptKey: server.cryptKey,
    type: server.type,
    name: server.name,
  }
}

/**
 * Получает баланс с RK7 сервера или из демо-данных.
 * RK7 возвращает XML отчёта — мы парсим его тем же парсером, что и демо.
 */
export async function fetchBalanceReport(req: NextRequest) {
  const config = await getServerConfig(req)
  if (!config) {
    return { data: await parseBalanceReport(), source: 'demo' as const }
  }

  const result = await rk7Request(config, buildBalanceReportQuery(config))
  if (!result.success || !result.xml) {
    throw new Error(`RK7 request failed: ${result.error}`)
  }

  // RK7 возвращает XML в том же формате, что и демо-файлы
  // Парсим через существующий парсер
  const root = parseXml(result.xml)
  const report = findChild(root, 'report') || findChild(root, 'RK7QueryResult')
  if (!report) {
    throw new Error('Invalid RK7 response format')
  }

  // Создаём временный объект с распарсенными данными
  const data = parseRk7XmlBalance(report)
  return { data, source: 'rk7' as const, serverName: config.name }
}

/**
 * Парсит XML-ответ от RK7 в формат BalanceReport.
 * RK7 GetDocByLayout возвращает XML в формате <report><rhead>...</rhead><rbody>...</rbody></report>
 */
function parseRk7XmlBalance(node: any) {
  // Используем тот же парсер, что и для демо-данных
  // т.к. формат XML одинаков
  return parseBalanceReportFromNode(node)
}

// Импортируем функции парсинга напрямую
function parseBalanceReportFromNode(rootNode: any) {
  // Делегируем в существующий reports.ts
  // Просто записываем XML во временный файл и парсим
  // Или парсим напрямую из XmlNode

  const report = rootNode
  const body = findChild(report, 'rbody')
  if (!body) {
    // Может быть другой формат — попробуем как есть
    throw new Error('No rbody in RK7 response')
  }

  const items: any[] = []
  let total: any = { name: 'Всего', guests: 0, checks: 0, amount: 0 }
  const taxes: any[] = []

  for (const row of findChildren(body, 'rbrow')) {
    const cells = findChildren(row, 'rbcol')
    const name = cleanName(getText(cells[0]))
    const guests = int(getText(cells[1]))
    const checks = int(row.attrs?.checks) || int(getText(cells[2]))
    const amount = num(getText(cells[3]))

    if (row.attrs?.flag === '2') {
      total = { name, guests, checks, amount }
    } else if (row.attrs?.flag === '9' || row.attrs?.flag === '11') {
      taxes.push({ name, guests, checks, amount })
    } else if (row.attrs?.flag === '1') {
      items.push({ name, guests, checks, amount, flag: int(row.attrs?.flag) })
    }
  }

  return { items, total, taxes }
}

/**
 * Универсальный метод для получения данных отчёта.
 * Получает XML от RK7, записывает во временный файл, парсит существующим парсером.
 */
export async function fetchFromRK7(
  config: NonNullable<Awaited<ReturnType<typeof getServerConfig>>>,
  xmlQuery: string,
  parserFn: (fileName: string) => Promise<any>,
  tempFileName: string,
) {
  const result = await rk7Request(config, xmlQuery)
  if (!result.success || !result.xml) {
    throw new Error(`RK7 request failed: ${result.error}`)
  }

  // Записываем XML во временный файл
  const fs = await import('fs/promises')
  const path = await import('path')
  const tmpDir = path.join(process.cwd(), 'tmp')
  await fs.mkdir(tmpDir, { recursive: true })
  const tmpFile = path.join(tmpDir, tempFileName)
  await fs.writeFile(tmpFile, result.xml, 'utf-8')

  try {
    // Парсим через существующий парсер, который читает файлы из demo-data/xml/
    // Но нам нужно подменить путь — используем parseDemoXml с нашим файлом
    const { parseDemoXml } = await import('@/lib/rk7/parser')
    // parseDemoXml ищет файл в DEMO_DIR, нам нужно читать из tmp
    // Проще: парсим напрямую через parseXml
    const root = parseXml(result.xml)
    return root
  } finally {
    await fs.unlink(tmpFile).catch(() => {})
  }
}
