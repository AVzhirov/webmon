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
 * Протокол (из анализа RK7XML.dll и документации):
 * 1. TCP connect
 * 2. Отправка XML-запроса через CallRK7XMLRPC2:
 *    - AddressName: IP:порт
 *    - ConnectName: произвольная строка (идентификатор соединения)
 *    - Request: XML-тело
 *    - RequestSize: длина XML
 *    - RequestNum: 0 (сервер генерирует сам)
 *
 * Формат данных по TCP (из strings RK7XML.dll):
 * 1. send handshake
 * 2. recv handshake
 * 3. send request size (4 bytes LE)
 * 4. send request body (XML UTF-8)
 * 5. recv Result Request Number (4 bytes)
 * 6. recv Result XML length (4 bytes LE)
 * 7. recv Result XML body
 */
async function rk7TcpRequest(
  config: RK7ServerConfig,
  xmlCommand: string,
): Promise<RK7ReportResult> {
  const net = await import('net')

  return new Promise((resolve) => {
    const m = config.address.match(/^([\w.-]+):(\d+)$/)
    if (!m) {
      resolve({ success: false, error: 'Invalid address format. Expected IP:port' })
      return
    }

    const host = m[1]
    const port = parseInt(m[2], 10)
    const timeoutMs = REQUEST_TIMEOUT

    let socket: net.Socket | null = null
    let responseBuffer = Buffer.alloc(0)
    let phase: 'connect' | 'handshakeSend' | 'handshakeRecv' | 'reqSize' | 'reqBody' | 'respReqNum' | 'respLen' | 'respBody' = 'connect'
    let expectedLength = 0
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
      resolve({ success: false, error: `Timeout (${timeoutMs}ms) in phase ${phase}` })
    }, timeoutMs)

    try {
      socket = new net.Socket()
      socket.setTimeout(timeoutMs)

      // ConnectName — произвольная строка, идентификатор соединения
      const connectName = `WM${Date.now()}`
      const connectNameBuf = Buffer.from(connectName, 'utf-8')

      socket.on('connect', () => {
        // Шаг 1: Отправляем handshake
        // Формат handshake: 4 байта — версия протокола (0x00000002 для v2)
        // Или просто 4 нулевых байта для базового handshake
        const handshake = Buffer.alloc(4, 0)
        socket!.write(handshake)
        phase = 'handshakeRecv'
      })

      socket.on('data', (data: Buffer) => {
        responseBuffer = Buffer.concat([responseBuffer, data])

        while (true) {
          if (phase === 'handshakeRecv') {
            if (responseBuffer.length < 4) break
            // Читаем handshake ответ (4 байта) — игнорируем
            responseBuffer = responseBuffer.subarray(4)

            // Шаг 2: Отправляем XML-запрос
            // Формат: 4 байта длины (LE) + XML-тело (UTF-8)
            const xmlBuffer = Buffer.from(xmlCommand, 'utf-8')
            const sizeBuffer = Buffer.alloc(4)
            sizeBuffer.writeUInt32LE(xmlBuffer.length, 0)

            socket!.write(Buffer.concat([sizeBuffer, xmlBuffer]))
            phase = 'respReqNum'
          } else if (phase === 'respReqNum') {
            // Читаем 4 байта — номер запроса (RequestNum)
            if (responseBuffer.length < 4) break
            responseBuffer = responseBuffer.subarray(4)
            phase = 'respLen'
          } else if (phase === 'respLen') {
            // Читаем 4 байта — длину XML-ответа
            if (responseBuffer.length < 4) break
            expectedLength = responseBuffer.readUInt32LE(0)
            responseBuffer = responseBuffer.subarray(4)
            phase = 'respBody'

            if (expectedLength === 0) {
              clearTimeout(timeoutHandle)
              cleanup()
              resolve({ success: true, xml: '' })
              return
            }
          } else if (phase === 'respBody') {
            // Читаем XML-ответ
            if (responseBuffer.length < expectedLength) break

            const xmlResponse = responseBuffer.subarray(0, expectedLength).toString('utf-8')
            responseBuffer = responseBuffer.subarray(expectedLength)

            clearTimeout(timeoutHandle)
            cleanup()
            resolve({ success: true, xml: xmlResponse })
            return
          } else {
            break
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
        resolve({ success: false, error: `Socket timeout in phase ${phase}` })
      })

      socket.connect(port, host)
    } catch (e) {
      clearTimeout(timeoutHandle)
      cleanup()
      resolve({ success: false, error: e instanceof Error ? e.message : String(e) })
    }
  })
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
