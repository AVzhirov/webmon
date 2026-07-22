import { NextRequest } from 'next/server'
import { parseDishesReport } from '@/lib/rk7/reports'
import { buildDishesReportQuery } from '@/lib/rk7/tcp-client'
import { handleReport } from '@/lib/rk7/report-handler'
import { findChild, findChildren, getText, num, int, cleanName } from '@/lib/rk7/parser'

export async function GET(req: NextRequest) {
  return handleReport(
    req,
    () => parseDishesReport(),
    (config) => buildDishesReportQuery(config),
    (root) => {
      // Возвращаем сырой XML-ответ — фронтенд сам его парсит
      // Или парсим здесь, если формат известен
      const report = findChild(root, 'report') || findChild(root, 'RK7QueryResult') || root
      
      // Для большинства отчётов RK7 возвращает XML в формате <report><rhead>...</rhead><rbody>...</rbody></report>
      // Парсим через существующий парсер, используя текстовый поиск
      const xmlText = root.text || ''
      
      // Если ответ содержит rbody — парсим как отчёт
      const body = findChild(report, 'rbody')
      if (!body) {
        // Возможно это справочник или список
        return { items: [], total: 0, raw: xmlText.substring(0, 500) }
      }
      
      // Базовый парсинг строк
      const items: any[] = []
      for (const row of findChildren(body, 'rbrow')) {
        const cells = findChildren(row, 'rbcol')
        const item: any = {}
        cells.forEach((cell, i) => {
          item[`col${i}`] = cleanName(getText(cell))
        })
        items.push(item)
      }
      
      return { items, total: items.length }
    }
  )
}
