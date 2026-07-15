import { db } from './db'

export interface SystemSettings {
  port: number
  host: string
  autoStartService: boolean
}

export const DEFAULT_SETTINGS: SystemSettings = {
  port: 8083,
  host: '0.0.0.0',
  autoStartService: true,
}

/** Получить все системные настройки (с дефолтами). */
export async function getSettings(): Promise<SystemSettings> {
  const rows = await db.setting.findMany()
  const map = new Map(rows.map((r) => [r.key, r.value]))
  return {
    port: parseInt(map.get('port') ?? '', 10) || DEFAULT_SETTINGS.port,
    host: map.get('host') || DEFAULT_SETTINGS.host,
    autoStartService: map.get('autoStartService') !== 'false',
  }
}

/** Получить конкретную настройку. */
export async function getSetting(key: keyof SystemSettings): Promise<string> {
  const row = await db.setting.findUnique({ where: { key } })
  return row?.value ?? ''
}

/** Сохранить настройку. */
export async function setSetting(key: string, value: string): Promise<void> {
  await db.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  })
}

/** Сохранить несколько настроек сразу. */
export async function setSettings(settings: Partial<SystemSettings>): Promise<void> {
  const entries = Object.entries(settings).filter(([, v]) => v !== undefined)
  await db.$transaction(
    entries.map(([key, value]) =>
      db.setting.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      }),
    ),
  )
}

/**
 * Записать .env файл с текущими настройками (для standalone Next.js).
 * Next.js standalone читает PORT из process.env.PORT при запуске.
 */
export async function writeEnvFile(envPath: string): Promise<void> {
  const fs = await import('fs/promises')
  const settings = await getSettings()
  const dbPath = process.env.DATABASE_URL || 'file:./data/rkwebmon.db'

  const content = [
    `DATABASE_URL="${dbPath}"`,
    `PORT=${settings.port}`,
    `HOSTNAME=${settings.host}`,
    `NODE_ENV=production`,
    `# Сгенерировано автоматически через Settings UI`,
    `# Изменения применятся после перезапуска службы/сервера`,
  ].join('\n')

  await fs.writeFile(envPath, content, 'utf-8')
}
