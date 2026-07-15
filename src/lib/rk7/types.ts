// Типы данных для отчетов R-Keeper 7

export interface ReportColumn {
  text: string;
  className?: string;
}

export interface ReportRow {
  cells: ReportColumn[];
  attrs?: Record<string, string>;
  isBold?: boolean;
  isTotal?: boolean;
  isHeader?: boolean;
  color?: string;
}

export interface ReportSection {
  head: ReportRow[];
  body: ReportRow[];
  foot: ReportRow[];
}

/** Стандартный отчёт RK7 с rhead/rbody/rfoot */
export interface StandardReport {
  head: ReportRow[];
  body: ReportRow[];
  foot: ReportRow[];
}

/** Баланс по типам оплат */
export interface BalanceItem {
  name: string;
  guests: number;
  checks: number;
  amount: number;
  cryTip?: number;
  cover?: number;
  flag?: number;
}

export interface BalanceReport {
  items: BalanceItem[];
  total: BalanceItem;
  taxes: BalanceItem[];
}

/** Выручка (MoneyTotal) — иерархическая: валюта → способ оплаты → сумма */
export interface RevenueLine {
  currency: string;
  methods: { name: string; amount: number }[];
  total: number;
}

export interface RevenueReport {
  lines: RevenueLine[];
  grandTotal: number;
}

/** Расход блюд */
export interface DishItem {
  code: string;
  name: string;
  quantity: number;
  amount: number;
}

export interface DishesReport {
  items: DishItem[];
  total: number;
}

/** Чек */
export interface CheckListItem {
  num: number;
  closedAt: string;
  amount: number;
  station: string;
  cashier: string;
  waiter: string;
  deletedBy?: string;
  reason?: string;
  orderId: number;
}

export interface CheckDish {
  num: number;
  code: string;
  name: string;
  quantity: number;
  price: number;
  amount: number;
}

export interface CheckDiscount {
  name: string;
  amount: number;
  card?: string;
}

export interface CheckDetail {
  dishes: CheckDish[];
  discounts: CheckDiscount[];
  total: number;
}

/** Официант со своими таблицами */
export interface WaiterEntry {
  name: string;
  tables: string[];
}

export interface OrdersReport {
  waiters: WaiterEntry[];
}

/** Денежный отчёт по персонам (официанты/кассиры/станции) */
export interface MoneyByPersonEntry {
  name: string;
  currencies: {
    currency: string;
    methods: { name: string; quantity: number; amount: number }[];
    total: number;
  }[];
  total: number;
}

export interface MoneyByPersonReport {
  entries: MoneyByPersonEntry[];
  grandTotal: number;
}

/** Открытые суммы (по официантам) */
export interface OpenSumItem {
  waiter: string;
  tables: number;
  guests: number;
  amount: number;
}

export interface OpenSumReport {
  items: OpenSumItem[];
  total: OpenSumItem;
}

/** Кассовая информация */
export interface CashInfo {
  items: { name: string; value: string }[];
  period: string;
}

/** Персонал */
export interface PersonalItem {
  code: number;
  name: string;
}

/** План зала */
export interface HallPlanInfo {
  id: number;
  code: number;
  name: string;
}

export interface HallTable {
  name: string;
  left: number;
  top: number;
  width: number;
  cover: number;
  amount: number;
}

export interface HallTablesReport {
  tables: HallTable[];
}

/** Сервис-печать */
export interface ServicePrinter {
  num: number;
  printer: string;
  station: string;
  port: string;
  assigned: string;
  extra?: string;
  messages: { sender: string; time: string }[];
}

export interface ServicePrintReport {
  printers: ServicePrinter[];
}

/** RK-сервер */
export interface RKServer {
  id: string;
  name: string;
  address: string;
  type?: 'demo' | 'tcp' | 'http';
  status: 'online' | 'offline' | 'demo';
  version?: string;
  isDefault?: boolean;
}

/** Сообщение персоналу */
export interface StaffMessage {
  id: string;
  recipient: string;
  recipientCode?: number;
  text: string;
  sentAt: string;
  status: 'sent' | 'queued';
}
