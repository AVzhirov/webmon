import { db } from './db'
import { hashPassword } from './auth'

/**
 * Инициализация БД при первом запуске:
 *  - создаёт admin/admin (если нет ни одного пользователя)
 *  - создаёт 2 демо-сервера (если таблица серверов пуста)
 *
 * Безопасно вызывать многократно — все операции идемпотентны.
 */
export async function bootstrapDatabase() {
  try {
    // Создать пользователя admin по умолчанию
    const usersCount = await db.user.count()
    if (usersCount === 0) {
      await db.user.create({
        data: {
          username: 'admin',
          passwordHash: hashPassword('admin'),
          displayName: 'Администратор',
          role: 'admin',
        },
      })
      console.log('[bootstrap] Created default admin user (admin/admin)')
    }

    // Создать демо-серверы
    const serversCount = await db.server.count()
    if (serversCount === 0) {
      await db.server.createMany({
        data: [
          {
            name: 'Обучение (демо)',
            type: 'demo',
            address: 'public/demo-data/xml',
            enabled: true,
            isDefault: true,
          },
          {
            name: 'Test (демо)',
            type: 'demo',
            address: 'public/demo-data/xml',
            enabled: true,
            isDefault: false,
          },
        ],
      })
      console.log('[bootstrap] Created default demo servers')
    }
  } catch (e) {
    console.error('[bootstrap] Failed:', e)
  }
}
