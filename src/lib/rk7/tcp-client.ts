/**
 * RK7 XML Interface Client
 *
 * Реализует TCP-протокол RK7 XML Interface:
 * 1. TCP connect to server (IP:port, обычно 15551)
 * 2. Handshake: отправка/приём 4 байт
 * 3. Запрос: 4 байта длины (LE) + XML-тело (UTF-8)
 * 4. Ответ: 4 байта номера запроса + 4 байта длины (LE) + XML-тело
 *
 * Основано на анализе оригинальных DLL:
 * - RK7XML.dll: функция callxmltcp (Delphi/Pascal, нативная)
 * - XMLInterface.dll: .NET классы RK7Query, RK7CMD
 *
 * LayoutCodes из documents.xml:
 * - BalanceReport:     11969
 * - SystemBalance:     12081
 * - SumOrders:        1000270
 * - SumWaiters:         11966
 * - DishConsumption:    11965
 * - Money:              11968
 * - ReceiptsList:       11967
 * - Receipt:            10963
 */

import * as net from 'net'

export interface RK7ServerConfig {
  address: string  // IP:порт, например "192.168.1.10:15551"
  username?: string | null
  password?: string | null
  cryptKey?: string | null
}

export interface RK7ReportResult {
  success: boolean
  xml?: string
  error?: string
}

/** Таймаут для TCP-операций */
const TCP_TIMEOUT = 15000

/**
 * Парсит адрес "IP:port" → { host, port }
 */
function parseAddress(address: string): { host: string; port: number } {
  const m = address.match(/^(.+):(\d+)$/)
  if (!m) return { host: address, port: 15551 }
  return { host: m[1], port: parseInt(m[2], 10) }
}

/**
 * Отправляет XML-запрос к RK7 серверу и получает XML-ответ.
 *
 * Протокол:
 * 1. TCP connect
 * 2. Send handshake (4 bytes: 0x00000000)
 * 3. Recv handshake (4 bytes)
 * 4. Send request: 4 bytes length (LE) + XML body (UTF-8)
 * 5. Recv response: 4 bytes request number + 4 bytes length (LE) + XML body
 */
export async function rk7Request(
  config: RK7ServerConfig,
  xmlCommand: string,
): Promise<RK7ReportResult> {
  return new Promise((resolve) => {
    const { host, port } = parseAddress(config.address)
    const timeoutMs = TCP_TIMEOUT

    let socket: net.Socket | null = null
    let responseBuffer = Buffer.alloc(0)
    let phase: 'handshake' | 'requestNum' | 'responseLen' | 'responseBody' = 'handshake'
    let expectedLength = 0
    let requestNumber = 0
    let timedOut = false

    const cleanup = () => {
      if (socket) {
        socket.removeAllListeners()
        socket.destroy()
        socket = null
      }
    }

    const timeoutHandle = setTimeout(() => {
      timedOut = true
      cleanup()
      resolve({ success: false, error: `Timeout (${timeoutMs}ms)` })
    }, timeoutMs)

    try {
      socket = new net.Socket()
      socket.setTimeout(timeoutMs)

      socket.on('connect', () => {
        // Шаг 1: Отправляем handshake (4 нулевых байта)
        const handshake = Buffer.alloc(4, 0)
        socket!.write(handshake)
      })

      socket.on('data', (data: Buffer) => {
        responseBuffer = Buffer.concat([responseBuffer, data])

        while (responseBuffer.length >= getExpectedBytes(phase)) {
          if (phase === 'handshake') {
            // Читаем 4 байта handshake ответа
            const handshakeResp = responseBuffer.subarray(0, 4)
            responseBuffer = responseBuffer.subarray(4)

            // Проверяем handshake
            const handshakeVal = handshakeResp.readUInt32LE(0)
            // handshake = 0 → OK, любое другое значение → ошибка
            // Но некоторые серверы возвращают ненулевое значение, поэтому просто логируем

            // Шаг 2: Отправляем XML-запрос
            const xmlBuffer = Buffer.from(xmlCommand, 'utf-8')
            const sizeBuffer = Buffer.alloc(4)
            sizeBuffer.writeUInt32LE(xmlBuffer.length, 0)

            socket!.write(Buffer.concat([sizeBuffer, xmlBuffer]))

            phase = 'requestNum'
          } else if (phase === 'requestNum') {
            // Читаем 4 байта — номер запроса
            if (responseBuffer.length < 4) break
            requestNumber = responseBuffer.readUInt32LE(0)
            responseBuffer = responseBuffer.subarray(4)
            phase = 'responseLen'
          } else if (phase === 'responseLen') {
            // Читаем 4 байта — длину XML-ответа
            if (responseBuffer.length < 4) break
            expectedLength = responseBuffer.readUInt32LE(0)
            responseBuffer = responseBuffer.subarray(4)
            phase = 'responseBody'

            if (expectedLength === 0) {
              // Пустой ответ
              clearTimeout(timeoutHandle)
              cleanup()
              resolve({ success: true, xml: '' })
              return
            }
          } else if (phase === 'responseBody') {
            // Читаем XML-ответ
            if (responseBuffer.length < expectedLength) break

            const xmlResponse = responseBuffer.subarray(0, expectedLength).toString('utf-8')
            responseBuffer = responseBuffer.subarray(expectedLength)

            clearTimeout(timeoutHandle)
            cleanup()
            resolve({ success: true, xml: xmlResponse })
            return
          }
        }
      })

      socket.on('error', (err: Error) => {
        clearTimeout(timeoutHandle)
        cleanup()
        if (timedOut) return
        resolve({ success: false, error: err.message })
      })

      socket.on('timeout', () => {
        clearTimeout(timeoutHandle)
        cleanup()
        if (timedOut) return
        resolve({ success: false, error: 'Socket timeout' })
      })

      socket.connect(port, host)
    } catch (e) {
      clearTimeout(timeoutHandle)
      cleanup()
      resolve({ success: false, error: e instanceof Error ? e.message : String(e) })
    }
  })
}

function getExpectedBytes(phase: string): number {
  switch (phase) {
    case 'handshake': return 4
    case 'requestNum': return 4
    case 'responseLen': return 4
    case 'responseBody': return 4 // минимум, реальная длина — expectedLength
    default: return 4
  }
}

// ============================================================
// Готовые XML-запросы для каждого типа отчёта
// ============================================================

/** Запрос системной информации (проверка подключения) */
export function buildSystemInfoQuery(config: RK7ServerConfig): string {
  const user = config.username || ''
  const pass = config.password || ''
  return `<?xml version="1.0" encoding="utf-8"?>
<RK7Query>
  <RK7CMD CMD="GetSystemInfo" UserName="${user}" Password="${pass}"/>
</RK7Query>`
}

/** Запрос балансового отчёта */
export function buildBalanceReportQuery(config: RK7ServerConfig): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<RK7Query>
  <RK7CMD CMD="GetDocByLayout" LayoutCode="11969" UserName="${config.username || ''}" Password="${config.password || ''}"/>
</RK7Query>`
}

/** Запрос системного балансового отчёта */
export function buildSystemBalanceQuery(config: RK7ServerConfig): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<RK7Query>
  <RK7CMD CMD="GetDocByLayout" LayoutCode="12081" UserName="${config.username || ''}" Password="${config.password || ''}"/>
</RK7Query>`
}

/** Запрос выручки (Money) */
export function buildMoneyReportQuery(config: RK7ServerConfig): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<RK7Query>
  <RK7CMD CMD="GetDocByLayout" LayoutCode="11968" UserName="${config.username || ''}" Password="${config.password || ''}"/>
</RK7Query>`
}

/** Запрос расхода блюд */
export function buildDishesReportQuery(config: RK7ServerConfig): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<RK7Query>
  <RK7CMD CMD="GetDocByLayout" LayoutCode="11965" UserName="${config.username || ''}" Password="${config.password || ''}"/>
</RK7Query>`
}

/** Запрос сумм заказов */
export function buildSumOrdersQuery(config: RK7ServerConfig): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<RK7Query>
  <RK7CMD CMD="GetDocByLayout" LayoutCode="1000270" UserName="${config.username || ''}" Password="${config.password || ''}"/>
</RK7Query>`
}

/** Запрос сумм официантов */
export function buildSumWaitersQuery(config: RK7ServerConfig): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<RK7Query>
  <RK7CMD CMD="GetDocByLayout" LayoutCode="11966" UserName="${config.username || ''}" Password="${config.password || ''}"/>
</RK7Query>`
}

/** Запрос списка чеков */
export function buildReceiptsListQuery(config: RK7ServerConfig): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<RK7Query>
  <RK7CMD CMD="GetDocByLayout" LayoutCode="11967" UserName="${config.username || ''}" Password="${config.password || ''}"/>
</RK7Query>`
}

/** Запрос детализации чека */
export function buildReceiptQuery(config: RK7ServerConfig, orderGuid: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<RK7Query>
  <RK7CMD CMD="GetOrder" GUID="${orderGuid}" UserName="${config.username || ''}" Password="${config.password || ''}"/>
</RK7Query>`
}

/** Запрос списка заказов */
export function buildOrderListQuery(config: RK7ServerConfig): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<RK7Query>
  <RK7CMD CMD="GetOrderList" UserName="${config.username || ''}" Password="${config.password || ''}"/>
</RK7Query>`
}

/** Запрос планов залов */
export function buildHallPlansQuery(config: RK7ServerConfig): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<RK7Query>
  <RK7CMD CMD="GetRefData" RefName="HallPlans" WithProp="1" UserName="${config.username || ''}" Password="${config.password || ''}"/>
</RK7Query>`
}

/** Запрос справочника персонала */
export function buildPersonalQuery(config: RK7ServerConfig): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<RK7Query>
  <RK7CMD CMD="GetRefData" RefName="PERSONAL" WithProp="1" UserName="${config.username || ''}" Password="${config.password || ''}"/>
</RK7Query>`
}

/** Отправка сообщения официанту */
export function buildSendMessageQuery(
  config: RK7ServerConfig,
  waiterCode: number,
  message: string,
): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<RK7Query>
  <RK7CMD CMD="WaiterMessage" WaiterCode="${waiterCode}" Message="${escapeXml(message)}" UserName="${config.username || ''}" Password="${config.password || ''}"/>
</RK7Query>`
}

/** Запрос кассовой даты */
export function buildCashDateQuery(config: RK7ServerConfig): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<RK7Query>
  <RK7CMD CMD="GetSystemInfo" UserName="${config.username || ''}" Password="${config.password || ''}"/>
</RK7Query>`
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Проверка подключения к RK7 серверу.
 * Отправляет GetSystemInfo и проверяет ответ.
 */
export async function testRK7Connection(config: RK7ServerConfig): Promise<{
  ok: boolean
  message?: string
  error?: string
}> {
  const result = await rk7Request(config, buildSystemInfoQuery(config))
  if (result.success && result.xml) {
    // Проверяем, что ответ содержит RK7QueryResult
    if (result.xml.includes('RK7QueryResult') || result.xml.includes('SystemInfo')) {
      return { ok: true, message: 'Connection successful' }
    }
    // Если ответ содержит ошибку
    if (result.xml.includes('Error') || result.xml.includes('error')) {
      return { ok: false, error: `Server error: ${result.xml.substring(0, 200)}` }
    }
    return { ok: true, message: 'Connected (unknown response format)' }
  }
  return { ok: false, error: result.error || 'Unknown error' }
}
