/**
 * RK7 XML Interface Client
 *
 * Два способа подключения:
 * 1. HTTPS (рекомендуется, RK7 7.05.03+):
 *    POST https://IP:port/rk7api/v0/xmlinterface.xml
 *    Headers: Content-Type: text/xml; charset=utf-8
 *    Auth: Basic (username:password)
 *    Body: XML request
 *    Response: XML result
 *
 * 2. TCP через rk7xml.dll (старый, не рекомендуется):
 *    callxmltcp — проприетарный протокол
 *
 * Источник: https://docs.rkeeper.ru/rk7/latest/ru/xml-interfejs-r_keeper-7-19605640.html
 */

export interface RK7ServerConfig {
  address: string  // IP:порт (например "192.168.1.10:15551" для TCP или "192.168.1.10:13665" для HTTPS)
  username?: string | null
  password?: string | null
  cryptKey?: string | null
  type?: string  // 'tcp' | 'http' | 'demo'
}

export interface RK7ReportResult {
  success: boolean
  xml?: string
  error?: string
}

const REQUEST_TIMEOUT = 15000

/**
 * Отправляет XML-запрос к RK7 серверу.
 * Автоматически выбирает HTTPS или TCP в зависимости от типа сервера.
 */
export async function rk7Request(
  config: RK7ServerConfig,
  xmlCommand: string,
): Promise<RK7ReportResult> {
  const type = config.type || 'tcp'

  if (type === 'http') {
    return await rk7HttpsRequest(config, xmlCommand)
  } else if (type === 'tcp') {
    return await rk7TcpRequest(config, xmlCommand)
  }

  return { success: false, error: `Unsupported server type: ${type}` }
}

/**
 * HTTPS-запрос к RK7 XML Interface.
 *
 * URL: https://IP:port/rk7api/v0/xmlinterface.xml
 * Method: POST
 * Headers: Content-Type: text/xml; charset=utf-8
 * Auth: Basic Authorization (username:password)
 * Body: XML request (UTF-8)
 * Response: XML result (UTF-8)
 *
 * Документация: https://docs.rkeeper.ru/rk7/latest/ru/xml-interfejs-r_keeper-7-19605640.html
 */
async function rk7HttpsRequest(
  config: RK7ServerConfig,
  xmlCommand: string,
): Promise<RK7ReportResult> {
  try {
    const address = config.address.replace(/^https?:\/\//, '')
    const url = `https://${address}/rk7api/v0/xmlinterface.xml`

    const username = config.username || ''
    const password = config.password || ''
    const auth = Buffer.from(`${username}:${password}`).toString('base64')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Authorization': `Basic ${auth}`,
      },
      body: xmlCommand,
      signal: controller.signal,
      // RK7 использует самоподписанные сертификаты — отключаем проверку
      // В Node.js 22+ можно использовать NODE_TLS_REJECT_UNAUTHORIZED=0
    })

    clearTimeout(timeout)

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return {
        success: false,
        error: `HTTP ${response.status} ${response.statusText}${text ? ': ' + text.substring(0, 200) : ''}`,
      }
    }

    const xml = await response.text()
    return { success: true, xml }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return { success: false, error: `Timeout (${REQUEST_TIMEOUT}ms)` }
    }
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * TCP-запрос к RK7 через rk7xml.dll протокол.
 *
 * Пробуем 3 варианта протокола (т.к. точный формат неизвестен):
 * Вариант 1: Без handshake — сразу size + XML
 * Вариант 2: Raw XML — отправляем XML как текст, читаем ответ как текст
 * Вариант 3: HTTP POST over TCP — отправляем HTTP-запрос
 */
async function rk7TcpRequest(
  config: RK7ServerConfig,
  xmlCommand: string,
): Promise<RK7ReportResult> {
  // Пробуем варианты по очереди
  // Вариант 1: size + XML (без handshake)
  let result = await rk7TcpVariant1(config, xmlCommand)
  if (result.success) return result

  // Вариант 2: raw XML
  result = await rk7TcpVariant2(config, xmlCommand)
  if (result.success) return result

  // Вариант 3: HTTP over TCP
  result = await rk7TcpVariant3(config, xmlCommand)
  if (result.success) return result

  return { success: false, error: 'All TCP protocol variants failed. Try HTTPS type instead.' }
}

/** Вариант 1: size(4 LE) + XML body → recv requestNum(4) + size(4 LE) + XML */
async function rk7TcpVariant1(
  config: RK7ServerConfig,
  xmlCommand: string,
): Promise<RK7ReportResult> {
  const net = await import('net')
  return new Promise((resolve) => {
    const m = config.address.match(/^([\w.-]+):(\d+)$/)
    if (!m) { resolve({ success: false, error: 'Invalid address' }); return }
    const host = m[1], port = parseInt(m[2], 10)
    let socket: net.Socket | null = null
    let buf = Buffer.alloc(0)
    let phase: 'send' | 'reqNum' | 'respLen' | 'respBody' = 'send'
    let expectedLen = 0
    let done = false

    const cleanup = () => { if (socket) { socket.removeAllListeners(); socket.destroy(); socket = null } }
    const timer = setTimeout(() => { if (!done) { done = true; cleanup(); resolve({ success: false, error: `V1 Timeout in ${phase}` }) } }, 8000)

    try {
      socket = new net.Socket()
      socket.setTimeout(8000)

      socket.on('connect', () => {
        // Сразу отправляем: 4 байта длины + XML
        const xmlBuf = Buffer.from(xmlCommand, 'utf-8')
        const sizeBuf = Buffer.alloc(4)
        sizeBuf.writeUInt32LE(xmlBuf.length, 0)
        socket!.write(Buffer.concat([sizeBuf, xmlBuf]))
        phase = 'reqNum'
      })

      socket.on('data', (data: Buffer) => {
        buf = Buffer.concat([buf, data])
        while (true) {
          if (phase === 'reqNum') {
            if (buf.length < 4) break
            buf = buf.subarray(4) // skip request number
            phase = 'respLen'
          } else if (phase === 'respLen') {
            if (buf.length < 4) break
            expectedLen = buf.readUInt32LE(0)
            buf = buf.subarray(4)
            phase = 'respBody'
            if (expectedLen === 0) {
              if (!done) { done = true; clearTimeout(timer); cleanup(); resolve({ success: true, xml: '' }) }
              return
            }
          } else if (phase === 'respBody') {
            if (buf.length < expectedLen) break
            const xml = buf.subarray(0, expectedLen).toString('utf-8')
            if (!done) { done = true; clearTimeout(timer); cleanup(); resolve({ success: true, xml }) }
            return
          }
        }
      })

      socket.on('error', () => { if (!done) { done = true; clearTimeout(timer); cleanup(); resolve({ success: false, error: 'V1 connection error' }) } })
      socket.on('timeout', () => { if (!done) { done = true; clearTimeout(timer); cleanup(); resolve({ success: false, error: 'V1 timeout' }) } })
      socket.connect(port, host)
    } catch (e) {
      if (!done) { done = true; clearTimeout(timer); cleanup(); resolve({ success: false, error: 'V1 exception' }) }
    }
  })
}

/** Вариант 2: raw XML text → recv raw XML text (до закрытия соединения) */
async function rk7TcpVariant2(
  config: RK7ServerConfig,
  xmlCommand: string,
): Promise<RK7ReportResult> {
  const net = await import('net')
  return new Promise((resolve) => {
    const m = config.address.match(/^([\w.-]+):(\d+)$/)
    if (!m) { resolve({ success: false, error: 'Invalid address' }); return }
    const host = m[1], port = parseInt(m[2], 10)
    let socket: net.Socket | null = null
    let buf = Buffer.alloc(0)
    let done = false

    const cleanup = () => { if (socket) { socket.removeAllListeners(); socket.destroy(); socket = null } }
    const timer = setTimeout(() => {
      if (!done) {
        done = true; cleanup()
        if (buf.length > 0) {
          const xml = buf.toString('utf-8')
          resolve({ success: true, xml })
        } else {
          resolve({ success: false, error: 'V2 timeout (no data)' })
        }
      }
    }, 8000)

    try {
      socket = new net.Socket()
      socket.setTimeout(8000)

      socket.on('connect', () => {
        // Отправляем raw XML
        socket!.write(xmlCommand, 'utf-8')
      })

      socket.on('data', (data: Buffer) => {
        buf = Buffer.concat([buf, data])
        // Проверяем — есть ли в ответе закрывающий тег
        const text = buf.toString('utf-8')
        if (text.includes('</RK7QueryResult>') || text.includes('</report>') || text.includes('</error>')) {
          if (!done) {
            done = true; clearTimeout(timer); cleanup()
            resolve({ success: true, xml: text })
          }
        }
      })

      socket.on('close', () => {
        if (!done) {
          done = true; clearTimeout(timer)
          if (buf.length > 0) {
            resolve({ success: true, xml: buf.toString('utf-8') })
          } else {
            resolve({ success: false, error: 'V2 connection closed (no data)' })
          }
        }
      })

      socket.on('error', () => { if (!done) { done = true; clearTimeout(timer); cleanup(); resolve({ success: false, error: 'V2 connection error' }) } })
      socket.on('timeout', () => {
        if (!done) {
          done = true; clearTimeout(timer); cleanup()
          if (buf.length > 0) {
            resolve({ success: true, xml: buf.toString('utf-8') })
          } else {
            resolve({ success: false, error: 'V2 timeout' })
          }
        }
      })
      socket.connect(port, host)
    } catch (e) {
      if (!done) { done = true; clearTimeout(timer); cleanup(); resolve({ success: false, error: 'V2 exception' }) }
    }
  })
}

/** Вариант 3: HTTP POST over TCP (some RK7 servers accept HTTP on XML port) */
async function rk7TcpVariant3(
  config: RK7ServerConfig,
  xmlCommand: string,
): Promise<RK7ReportResult> {
  const m = config.address.match(/^([\w.-]+):(\d+)$/)
  if (!m) return { success: false, error: 'Invalid address' }
  const host = m[1], port = parseInt(m[2], 10)

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)

    // Try HTTP (not HTTPS — plain HTTP on XML port)
    const url = `http://${host}:${port}/rk7api/v0/xmlinterface.xml`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
      body: xmlCommand,
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (response.ok) {
      const xml = await response.text()
      return { success: true, xml }
    }
    return { success: false, error: `V3 HTTP ${response.status}` }
  } catch {
    return { success: false, error: 'V3 HTTP failed' }
  }
}

// ============================================================
// XML-запросы для RK7
// Формат: <RK7Query><RK7CMD CMD="..." /></RK7Query>
// Документация: https://docs.rkeeper.ru/rk7/latest/ru/xml-interfejs-r_keeper-7-19605640.html
// ============================================================

/** Проверка подключения — GetSystemInfo */
export function buildSystemInfoQuery(_config: RK7ServerConfig): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<RK7Query>
  <RK7CMD CMD="GetSystemInfo"/>
</RK7Query>`
}

/** Балансовый отчёт — GetDocByLayout с LayoutCode */
export function buildBalanceReportQuery(_config: RK7ServerConfig): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<RK7Query>
  <RK7CMD CMD="GetDocByLayout" LayoutCode="11969"/>
</RK7Query>`
}

/** Системный балансовый отчёт */
export function buildSystemBalanceQuery(_config: RK7ServerConfig): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<RK7Query>
  <RK7CMD CMD="GetDocByLayout" LayoutCode="12081"/>
</RK7Query>`
}

/** Выручка (Money) */
export function buildMoneyReportQuery(_config: RK7ServerConfig): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<RK7Query>
  <RK7CMD CMD="GetDocByLayout" LayoutCode="11968"/>
</RK7Query>`
}

/** Расход блюд */
export function buildDishesReportQuery(_config: RK7ServerConfig): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<RK7Query>
  <RK7CMD CMD="GetDocByLayout" LayoutCode="11965"/>
</RK7Query>`
}

/** Суммы заказов */
export function buildSumOrdersQuery(_config: RK7ServerConfig): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<RK7Query>
  <RK7CMD CMD="GetDocByLayout" LayoutCode="1000270"/>
</RK7Query>`
}

/** Суммы официантов */
export function buildSumWaitersQuery(_config: RK7ServerConfig): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<RK7Query>
  <RK7CMD CMD="GetDocByLayout" LayoutCode="11966"/>
</RK7Query>`
}

/** Список чеков */
export function buildReceiptsListQuery(_config: RK7ServerConfig): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<RK7Query>
  <RK7CMD CMD="GetDocByLayout" LayoutCode="11967"/>
</RK7Query>`
}

/** Список заказов */
export function buildOrderListQuery(_config: RK7ServerConfig): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<RK7Query>
  <RK7CMD CMD="GetOrderList"/>
</RK7Query>`
}

/** Планы залов */
export function buildHallPlansQuery(_config: RK7ServerConfig): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<RK7Query>
  <RK7CMD CMD="GetRefData" RefName="HallPlans" WithProp="1"/>
</RK7Query>`
}

/** Справочник персонала */
export function buildPersonalQuery(_config: RK7ServerConfig): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<RK7Query>
  <RK7CMD CMD="GetRefData" RefName="PERSONAL" WithProp="1"/>
</RK7Query>`
}

/** Отправка сообщения официанту */
export function buildSendMessageQuery(
  _config: RK7ServerConfig,
  waiterCode: number,
  message: string,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<RK7Query>
  <RK7CMD CMD="WaiterMessage" WaiterCode="${waiterCode}" Message="${escapeXml(message)}"/>
</RK7Query>`
}

/** Детализация чека/заказа */
export function buildReceiptQuery(_config: RK7ServerConfig, orderGuid: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<RK7Query>
  <RK7CMD CMD="GetOrder" GUID="${orderGuid}"/>
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
      return { ok: true, message: 'Connection successful — RK7 server responded' }
    }
    if (result.xml.includes('Error') || result.xml.includes('error')) {
      return { ok: false, error: `Server error: ${result.xml.substring(0, 300)}` }
    }
    return { ok: true, message: 'Connected (unknown response format)' }
  }
  return { ok: false, error: result.error || 'Unknown error' }
}
