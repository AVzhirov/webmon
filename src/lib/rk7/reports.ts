import {
  parseDemoXml,
  findChild,
  findChildren,
  getText,
  num,
  int,
  cleanName,
  type XmlNode,
} from './parser';
import type {
  BalanceReport,
  BalanceItem,
  RevenueReport,
  RevenueLine,
  DishesReport,
  DishItem,
  CheckListItem,
  CheckDetail,
  CheckDish,
  CheckDiscount,
  OrdersReport,
  MoneyByPersonReport,
  MoneyByPersonEntry,
  OpenSumReport,
  OpenSumItem,
  CashInfo,
  PersonalItem,
  HallPlanInfo,
  HallTablesReport,
  HallTable,
  ServicePrintReport,
  ServicePrinter,
} from './types';

// === Баланс (BalanceReport.xml / BalanceSumReport.xml) ===
export async function parseBalanceReport(
  fileName = 'BalanceReport.xml',
): Promise<BalanceReport> {
  const root = await parseDemoXml(fileName);
  const report = findChild(root, 'report')!;
  const body = findChild(report, 'rbody')!;
  const items: BalanceItem[] = [];
  const taxes: BalanceItem[] = [];
  let total: BalanceItem = { name: 'Всего', guests: 0, checks: 0, amount: 0 };

  for (const row of findChildren(body, 'rbrow')) {
    const flag = int(row.attrs.flag);
    const cells = findChildren(row, 'rbcol');
    const name = cleanName(getText(cells[0]));
    const guests = int(getText(cells[1]));
    const checks = int(row.attrs.checks) || int(getText(cells[2]));
    const amount = num(getText(cells[3]));

    if (flag === 2) {
      total = { name, guests, checks, amount };
    } else if (flag === 9 || flag === 11) {
      taxes.push({ name, guests, checks, amount, cryTip: int(row.attrs.CryTip), flag });
    } else if (flag === 1) {
      items.push({
        name,
        guests,
        checks,
        amount,
        cryTip: int(row.attrs.CryTip),
        cover: int(row.attrs.Cover),
        flag,
      });
    }
  }

  return { items, total, taxes };
}

// === Выручка (MoneyTotal.xml) ===
export async function parseRevenueReport(
  fileName = 'MoneyTotal.xml',
): Promise<RevenueReport> {
  const root = await parseDemoXml(fileName);
  const report = findChild(root, 'report')!;
  const body = findChild(report, 'rbody')!;
  const lines: RevenueLine[] = [];
  let current: RevenueLine | null = null;
  let grandTotal = 0;

  for (const row of findChildren(body, 'rbrow')) {
    const cells = findChildren(row, 'rbcol');
    const firstCell = getText(cells[0]);
    const cls = cells[0]?.attrs.class || '';
    const isCurrencyHeader = cls.includes('xl25t');

    if (isCurrencyHeader) {
      // Start new currency block
      if (current) lines.push(current);
      const currency = cleanName(firstCell);
      const amount = num(getText(cells[2]));
      current = {
        currency,
        methods: [{ name: currency, amount }],
        total: 0,
      };
    } else if (firstCell === 'Всего' && cells.length >= 3) {
      // End of currency block
      if (current) {
        current.total = num(getText(cells[2]));
        lines.push(current);
        current = null;
      } else {
        // Grand total at the end
        grandTotal = num(getText(cells[2]));
      }
    } else if (current && cells.length >= 3) {
      const name = cleanName(firstCell);
      const amount = num(getText(cells[2]));
      if (name && amount > 0) {
        current.methods.push({ name, amount });
      }
    }
  }
  if (current) lines.push(current);

  // Compute grand total
  grandTotal = grandTotal || lines.reduce((sum, l) => sum + l.total, 0);

  return { lines, grandTotal };
}

// === Расход блюд (DishesReport.xml) ===
export async function parseDishesReport(
  fileName = 'DishesReport.xml',
): Promise<DishesReport> {
  const root = await parseDemoXml(fileName);
  const report = findChild(root, 'report')!;
  const body = findChild(report, 'rbody')!;
  const items: DishItem[] = [];
  let total = 0;

  for (const row of findChildren(body, 'rbrow')) {
    const cells = findChildren(row, 'rbcol');
    if (cells.length < 4) continue;
    const code = cleanName(getText(cells[0]));
    const name = cleanName(getText(cells[1]));
    if (name === 'Всего') {
      total = num(getText(cells[3]));
      continue;
    }
    const quantity = num(getText(cells[2]));
    const amount = num(getText(cells[3]));
    if (name && name !== '?') {
      items.push({ code, name, quantity, amount });
    }
  }

  return { items, total };
}

// === Список чеков (CheckList.xml) ===
export async function parseCheckList(
  fileName = 'CheckList.xml',
): Promise<CheckListItem[]> {
  const root = await parseDemoXml(fileName);
  const report = findChild(root, 'report')!;
  const body = findChild(report, 'rbody')!;
  const items: CheckListItem[] = [];

  for (const row of findChildren(body, 'rbrow')) {
    const cells = findChildren(row, 'rbcol');
    if (cells.length < 9) continue;
    items.push({
      num: int(getText(cells[0])),
      closedAt: cleanName(getText(cells[1])),
      amount: num(getText(cells[2])),
      station: cleanName(getText(cells[3])),
      cashier: cleanName(getText(cells[4])),
      waiter: cleanName(getText(cells[5])),
      deletedBy: cleanName(getText(cells[6])) || undefined,
      reason: cleanName(getText(cells[7])) || undefined,
      orderId: int(getText(cells[8])),
    });
  }

  return items;
}

// === Детализация чека (Check_N.xml) ===
export async function parseCheckDetail(
  id: number,
): Promise<CheckDetail | null> {
  const fileName = `Check_${id}.xml`;
  let root: XmlNode;
  try {
    root = await parseDemoXml(fileName);
  } catch {
    return null;
  }
  const report = findChild(root, 'report')!;
  const dishesNode = findChild(report, 'dishes');
  const discsNode = findChild(report, 'discs');

  const dishes: CheckDish[] = [];
  if (dishesNode) {
    const body = findChild(dishesNode, 'rbody');
    if (body) {
      for (const row of findChildren(body, 'rbrow')) {
        const cells = findChildren(row, 'rbcol');
        if (cells.length < 6) continue;
        const name = cleanName(getText(cells[2]));
        if (name === 'Всего') continue;
        dishes.push({
          num: int(getText(cells[0])),
          code: cleanName(getText(cells[1])),
          name,
          quantity: num(getText(cells[3])),
          price: num(getText(cells[4])),
          amount: num(getText(cells[5])),
        });
      }
    }
  }

  const discounts: CheckDiscount[] = [];
  if (discsNode) {
    const body = findChild(discsNode, 'rbody');
    if (body) {
      for (const row of findChildren(body, 'rbrow')) {
        const cells = findChildren(row, 'rbcol');
        if (cells.length < 3) continue;
        discounts.push({
          name: cleanName(getText(cells[0])),
          amount: num(getText(cells[1])),
          card: cleanName(getText(cells[2])) || undefined,
        });
      }
    }
  }

  const total = dishes.reduce((sum, d) => sum + d.amount, 0);
  return { dishes, discounts, total };
}

// === Заказы (Orders.xml) — официанты и их столы ===
export async function parseOrdersReport(
  fileName = 'Orders.xml',
): Promise<OrdersReport> {
  const root = await parseDemoXml(fileName);
  const report = findChild(root, 'report')!;
  const body = findChild(report, 'rbody')!;
  const waiters: { name: string; tables: string[] }[] = [];

  for (const row of findChildren(body, 'rbrow')) {
    const cells = findChildren(row, 'rbcol');
    if (cells.length < 2) continue;
    const name = cleanName(getText(cells[0]));
    if (!name) continue;
    const tblsNode = findChild(cells[1], 'tbls');
    const tables: string[] = [];
    if (tblsNode) {
      for (const tbl of findChildren(tblsNode, 'tbl')) {
        const nm = cleanName(tbl.attrs.nm || '');
        if (nm) tables.push(nm);
      }
    }
    waiters.push({ name, tables });
  }

  return { waiters };
}

// === Денежный отчёт по персонам (MoneyByWaiters/Cache/Stations) ===
export async function parseMoneyByPerson(
  fileName: string,
): Promise<MoneyByPersonReport> {
  const root = await parseDemoXml(fileName);
  const report = findChild(root, 'report')!;
  const body = findChild(report, 'rbody')!;
  const entries: MoneyByPersonEntry[] = [];
  let current: MoneyByPersonEntry | null = null;
  let currentCurrency: MoneyByPersonEntry['currencies'][number] | null = null;
  let grandTotal = 0;

  for (const row of findChildren(body, 'rbrow')) {
    const cells = findChildren(row, 'rbcol');
    if (cells.length < 3) continue;
    const firstCell = getText(cells[0]);
    const cls = cells[0]?.attrs.class || '';
    const color = cells[0]?.attrs.color;
    const isPersonHeader = cls.includes('xl25b') && color === 'blue';
    const isCurrencyHeader = cls.includes('xl25t');
    const name = cleanName(firstCell);

    if (isPersonHeader && name !== 'Всего') {
      if (current) entries.push(current);
      current = { name, currencies: [], total: 0 };
      currentCurrency = null;
    } else if (isCurrencyHeader && current) {
      // Currency subheader — "Рубли", "VISA", "Остатки" etc.
      const currency = name;
      const amount = num(getText(cells[2]));
      currentCurrency = {
        currency,
        methods: [{ name: currency, quantity: num(getText(cells[1])), amount }],
        total: 0,
      };
      current.currencies.push(currentCurrency);
    } else if (name === 'Всего' && current) {
      if (currentCurrency) {
        currentCurrency.total = num(getText(cells[2]));
        currentCurrency = null;
      } else {
        current.total = num(getText(cells[2]));
        entries.push(current);
        current = null;
      }
    } else if (name === 'Всего' && !current) {
      grandTotal = num(getText(cells[2]));
    } else if (current && currentCurrency) {
      // Method line within currency
      const amount = num(getText(cells[2]));
      const quantity = num(getText(cells[1]));
      if (name && (amount > 0 || quantity > 0)) {
        currentCurrency.methods.push({ name, quantity, amount });
      }
    }
  }
  if (current) entries.push(current);

  grandTotal = grandTotal || entries.reduce((sum, e) => sum + e.total, 0);

  return { entries, grandTotal };
}

// === Открытые суммы (OpenSumReport.xml) ===
export async function parseOpenSumReport(
  fileName = 'OpenSumReport.xml',
): Promise<OpenSumReport> {
  const root = await parseDemoXml(fileName);
  const report = findChild(root, 'report')!;
  const body = findChild(report, 'rbody')!;
  const items: OpenSumItem[] = [];
  let total: OpenSumItem = { waiter: 'Всего', tables: 0, guests: 0, amount: 0 };

  for (const row of findChildren(body, 'rbrow')) {
    const cells = findChildren(row, 'rbcol');
    if (cells.length < 4) continue;
    const waiter = cleanName(getText(cells[0]));
    const tables = int(getText(cells[1]));
    const guests = int(getText(cells[2]));
    const amount = num(getText(cells[3]));
    if (waiter === 'Всего') {
      total = { waiter, tables, guests, amount };
    } else if (waiter) {
      items.push({ waiter, tables, guests, amount });
    }
  }

  return { items, total };
}

// === Кассовая дата / CashDate.xml + PeriodOfDay.xml ===
export async function parseCashInfo(): Promise<CashInfo> {
  const root = await parseDemoXml('CashDate.xml');
  const report = findChild(root, 'report')!;
  const items = findChildren(report, 'CashDate').map((n) => {
    const parName = findChild(n, 'ParName');
    const parVal = findChild(n, 'ParVal');
    return { name: getText(parName), value: getText(parVal) };
  });

  let period = '—';
  try {
    const periodRoot = await parseDemoXml('PeriodOfDay.xml');
    const periodReport = findChild(periodRoot, 'report')!;
    period = getText(periodReport) || '—';
  } catch {
    /* ignore */
  }

  return { items, period };
}

// === Персонал (Personal.xml) ===
export async function parsePersonal(): Promise<PersonalItem[]> {
  const root = await parseDemoXml('Personal.xml');
  const report = findChild(root, 'report')!;
  const stuff = findChild(report, 'stuff')!;
  const body = findChild(stuff, 'rbody')!;
  const items: PersonalItem[] = [];
  for (const row of findChildren(body, 'rbrow')) {
    const cell = findChild(row, 'rbcol');
    if (!cell) continue;
    items.push({
      code: int(cell.attrs.Sifr),
      name: cleanName(getText(cell)),
    });
  }
  return items;
}

// === Планы залов (HallPlans.xml) ===
export async function parseHallPlans(): Promise<HallPlanInfo[]> {
  const root = await parseDemoXml('HallPlans.xml');
  const report = findChild(root, 'report')!;
  return findChildren(report, 'plan').map((p) => ({
    id: int(p.attrs.hrf),
    code: int(p.attrs.shifr),
    name: cleanName(getText(p)),
  }));
}

// === Столы в зале (TablesOfHall_N_X.xml) ===
export async function parseHallTables(
  hallId: number,
): Promise<HallTablesReport | null> {
  // Find file by hall id
  const fs = await import('fs/promises');
  const pathMod = await import('path');
  const dir = pathMod.join(process.cwd(), 'public', 'demo-data', 'xml');
  const files = await fs.readdir(dir);
  const file = files.find(
    (f) => f.startsWith(`TablesOfHall_${hallId}_`) && f.endsWith('.xml'),
  );
  if (!file) return { tables: [] };

  const root = await parseDemoXml(file);
  const report = findChild(root, 'report')!;
  const tables: HallTable[] = findChildren(report, 'tbl').map((t) => ({
    name: t.attrs.Name || '',
    left: int(t.attrs.Left),
    top: int(t.attrs.Top),
    width: int(t.attrs.stl?.match(/WIDTH:\s*(\d+)px/i)?.[1] || '50'),
    cover: int(t.attrs.Cover),
    amount: num(t.attrs.Summa),
  }));

  // Fallback parse width from stl attr
  for (let i = 0; i < tables.length; i++) {
    const t = findChildren(report, 'tbl')[i];
    const stl = t?.attrs.stl || '';
    const wMatch = stl.match(/WIDTH:\s*(\d+)px/i);
    if (wMatch) tables[i].width = int(wMatch[1]);
  }

  return { tables };
}

// === Сервис-печать (ServicePrintReport.xml) ===
export async function parseServicePrint(): Promise<ServicePrintReport> {
  const root = await parseDemoXml('ServicePrintReport.xml');
  const report = findChild(root, 'report')!;
  const body = findChild(report, 'rbody')!;
  const printers: ServicePrinter[] = [];

  const rows = findChildren(body, 'rbrow');
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const cells = findChildren(row, 'rbcol');
    if (cells.length >= 5 && /^\d+$/.test(getText(cells[0]).trim())) {
      const messages: { sender: string; time: string }[] = [];
      // Look ahead for sreport in next row
      if (i + 1 < rows.length) {
        const sreport = findChild(rows[i + 1], 'sreport');
        if (sreport) {
          const srbody = findChild(sreport, 'srbody');
          if (srbody) {
            for (const srrow of findChildren(srbody, 'srbrow')) {
              const srcells = findChildren(srrow, 'srbcol');
              if (srcells.length >= 2) {
                const sender = cleanName(getText(srcells[0]));
                const time = cleanName(getText(srcells[1]));
                if (sender !== 'no data') {
                  messages.push({ sender, time });
                }
              }
            }
          }
        }
      }
      printers.push({
        num: int(getText(cells[0])),
        printer: cleanName(getText(cells[1])),
        station: cleanName(getText(cells[2])),
        port: cleanName(getText(cells[3])),
        assigned: cleanName(getText(cells[4])),
        extra: cells[5] ? cleanName(getText(cells[5])) : undefined,
        messages,
      });
    }
  }

  return { printers };
}
