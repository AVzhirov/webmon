import { NextRequest } from 'next/server'
import { parseBalanceReport } from '@/lib/rk7/reports'
import { buildBalanceReportQuery } from '@/lib/rk7/tcp-client'
import { handleReport } from '@/lib/rk7/report-handler'
import { findChild, findChildren, getText, num, int, cleanName } from '@/lib/rk7/parser'

export async function GET(req: NextRequest) {
  return handleReport(
    req,
    () => parseBalanceReport(),
    (config) => buildBalanceReportQuery(config),
    (root) => {
      const report = findChild(root, 'report') || findChild(root, 'RK7QueryResult') || root
      const body = findChild(report, 'rbody')
      if (!body) throw new Error('No rbody in RK7 response')

      const items: any[] = []
      let total: any = { name: 'Total', guests: 0, checks: 0, amount: 0 }
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
          items.push({ name, guests, checks, amount, cryTip: int(row.attrs?.CryTip), cover: int(row.attrs?.Cover), flag: int(row.attrs?.flag) })
        }
      }
      return { items, total, taxes }
    }
  )
}
