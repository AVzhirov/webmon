import { NextRequest } from 'next/server'
import { parseMoneyByPerson } from '@/lib/rk7/reports'
import { buildMoneyReportQuery } from '@/lib/rk7/tcp-client'
import { handleReport } from '@/lib/rk7/report-handler'
import { findChild, findChildren, getText, num, int, cleanName } from '@/lib/rk7/parser'

export async function GET(req: NextRequest) {
  return handleReport(
    req,
    () => parseMoneyByPerson('MoneyByWaiters.xml'),
    (config) => buildMoneyReportQuery(config),
    (root) => {
      const report = findChild(root, 'report') || findChild(root, 'RK7QueryResult') || root
      const body = findChild(report, 'rbody')
      if (!body) return { entries: [], grandTotal: 0 }
      
      const items: any[] = []
      for (const row of findChildren(body, 'rbrow')) {
        const cells = findChildren(row, 'rbcol')
        const item: any = {}
        cells.forEach((cell, i) => {
          item[`col${i}`] = cleanName(getText(cell))
        })
        items.push(item)
      }
      
      return { items, total: 0 }
    }
  )
}
