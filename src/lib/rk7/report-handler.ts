import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rk7Request, RK7ServerConfig } from '@/lib/rk7/tcp-client'
import { parseXml, findChild, findChildren, getText, num, int, cleanName, parseDemoXml } from '@/lib/rk7/parser'
import { errorResponse } from '@/lib/api-utils'

/**
 * Получает конфигурацию сервера из БД по serverId из query params.
 * Возвращает null если сервер демо-тип или не указан.
 */
export async function getRK7Config(req: NextRequest): Promise<RK7ServerConfig | null> {
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
  }
}

/**
 * Запрашивает данные с RK7 и парсит XML-ответ.
 * Использует универсальный парсер parseXml.
 *
 * @param config — конфигурация RK7 сервера
 * @param xmlQuery — XML-запрос
 * @returns XmlNode — корневой элемент распарсенного XML
 */
export async function fetchRK7Xml(
  config: RK7ServerConfig,
  xmlQuery: string,
) {
  const result = await rk7Request(config, xmlQuery)
  if (!result.success || !result.xml) {
    throw new Error(`RK7 request failed: ${result.error}`)
  }

  const root = parseXml(result.xml)

  // RK7 может вернуть ошибку
  const errorNode = findChild(root, 'Error') || findChild(root, 'error')
  if (errorNode) {
    const errorText = getText(errorNode)
    if (errorText) throw new Error(`RK7 error: ${errorText}`)
  }

  return root
}

/**
 * Универсальный обработчик для отчётов.
 * Если serverId указан и сервер TCP/HTTP — запрашивает с RK7.
 * Если нет — читает демо-данные.
 *
 * @param req — NextRequest
 * @param demoFn — функция чтения демо-данных
 * @param rk7QueryFn — функция построения XML-запроса
 * @param parseFn — функция парсинга XmlNode в данные
 */
export async function handleReport<T>(
  req: NextRequest,
  demoFn: () => Promise<T>,
  rk7QueryFn: (config: RK7ServerConfig) => string,
  parseFn: (root: ReturnType<typeof parseXml>) => T,
): Promise<NextResponse> {
  try {
    const config = await getRK7Config(req)

    if (!config) {
      // Демо-режим
      const data = await demoFn()
      return NextResponse.json(data)
    }

    // Реальный RK7 сервер
    const xmlQuery = rk7QueryFn(config)
    const root = await fetchRK7Xml(config, xmlQuery)
    const data = parseFn(root)
    return NextResponse.json(data)
  } catch (e) {
    return errorResponse('Failed to load report', 500, e)
  }
}
