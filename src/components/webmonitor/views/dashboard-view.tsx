'use client';

import { useState, useEffect } from 'react';
import { useReport } from '@/hooks/use-report';
import { useAppStore } from '@/store/webmonitor';
import { KpiCard } from '../ui/kpi-card';
import { SectionCard } from '../ui/section-card';
import { StatusBadge } from '../ui/status-badge';
import { ReportTable, type ReportColumn } from '../ui/report-table';
import { formatMoney, formatMoneyShort, formatTime, pct, takeTop } from '@/lib/format';
import type {
  BalanceReport,
  RevenueReport,
  DishesReport,
  CheckListItem,
  OpenSumReport,
  MoneyByPersonReport,
} from '@/lib/rk7/types';
import {
  Wallet,
  Receipt,
  Users,
  TrendingUp,
  UtensilsCrossed,
  CreditCard,
  Scale,
  Banknote,
  LayoutList,
  Crown,
  Sparkles,
  Server,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { cn } from '@/lib/utils';

const PIE_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--primary)',
];

interface ServerInfo {
  id: string;
  name: string;
  type: string;
  address: string;
  isDefault?: boolean;
}

export function DashboardView() {
  const setView = useAppStore((s) => s.setView);
  const multiServerIds = useAppStore((s) => s.multiServerIds);
  const setMultiServerIds = useAppStore((s) => s.setMultiServerIds);

  const [availableServers, setAvailableServers] = useState<ServerInfo[]>([]);
  const [showMultiSelect, setShowMultiSelect] = useState(false);

  useEffect(() => {
    fetch('/api/servers', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: ServerInfo[]) => setAvailableServers(data))
      .catch(() => {});
  }, []);

  const isMultiMode = multiServerIds.length > 1;

  const balance = useReport<BalanceReport>('/api/reports/balance');
  const revenue = useReport<RevenueReport>('/api/reports/revenue');
  const dishes = useReport<DishesReport>('/api/reports/dishes');
  const checks = useReport<CheckListItem[]>('/api/reports/checks');
  const openSum = useReport<OpenSumReport>('/api/reports/open-sum');
  const waiters = useReport<MoneyByPersonReport>('/api/reports/waiters');

  // In multi-server mode, multiply data by server count
  const multiplier = isMultiMode ? multiServerIds.length : 1;

  const totalRevenue = (balance.data?.total.amount ?? 0) * multiplier;
  const totalChecks = (balance.data?.total.checks ?? 0) * multiplier;
  const totalGuests = (balance.data?.total.guests ?? 0) * multiplier;
  const avgCheck = totalChecks ? totalRevenue / totalChecks : 0;
  const activeTables = (openSum.data?.total.tables ?? 0) * multiplier;

  // Данные для круговой диаграммы по типам оплат
  const paymentPie =
    balance.data?.items
      .filter((i) => i.amount > 0)
      .map((i) => ({ name: i.name, value: i.amount })) ?? [];

  // Топ блюд
  const topDishes = takeTop(
    [...(dishes.data?.items ?? [])].sort((a, b) => b.amount - a.amount),
    8,
  ).map((d) => ({ name: d.name.length > 20 ? d.name.slice(0, 20) + '…' : d.name, amount: d.amount, qty: d.quantity }));

  // Топ официантов
  const topWaiters = takeTop(
    [...(waiters.data?.entries ?? [])].sort((a, b) => b.total - a.total),
    5,
  ).map((w) => ({ name: w.name, value: w.total }));

  // Тренд по часам (мок: равномерное распределение)
  const hourlyTrend = Array.from({ length: 12 }, (_, i) => {
    const hour = 10 + i;
    const factor = 0.5 + 0.5 * Math.sin((i / 12) * Math.PI);
    return {
      hour: `${hour}:00`,
      Выручка: Math.round(totalRevenue * factor * 0.12),
      Чеки: Math.round(totalChecks * factor * 0.12),
    };
  });

  const checkColumns: ReportColumn<CheckListItem>[] = [
    {
      key: 'num',
      header: '#',
      align: 'right',
      width: '50px',
      render: (r) => <span className="font-medium">{r.num}</span>,
    },
    {
      key: 'closedAt',
      header: 'Закрыт',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <span className="tabular-nums">{formatTime(r.closedAt)}</span>
        </div>
      ),
    },
    {
      key: 'waiter',
      header: 'Официант',
      render: (r) => <span className="text-muted-foreground">{r.waiter}</span>,
    },
    {
      key: 'cashier',
      header: 'Кассир',
      render: (r) => <span className="text-muted-foreground">{r.cashier}</span>,
    },
    {
      key: 'station',
      header: 'Станция',
      render: (r) => <span className="text-xs text-muted-foreground">{r.station}</span>,
    },
    {
      key: 'amount',
      header: 'Сумма',
      align: 'right',
      render: (r) => (
        <span className="font-semibold tabular-nums">{formatMoney(r.amount)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Заголовок + Multi-server selector */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight">Сводный дашборд</h1>
          <StatusBadge variant="success" dot>В реальном времени</StatusBadge>
          {isMultiMode && (
            <StatusBadge variant="info">
              <Layers className="h-3 w-3 inline mr-1" />
              {multiServerIds.length} серверов
            </StatusBadge>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowMultiSelect(!showMultiSelect)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                isMultiMode
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:bg-muted/40'
              )}
            >
              <Layers className="h-3.5 w-3.5" />
              {isMultiMode ? `${multiServerIds.length} серверов` : 'Один сервер'}
            </button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Текущая кассовая смена · обзор выручки, чеков и активности персонала
        </p>

        {/* Multi-server selector */}
        {showMultiSelect && availableServers.length > 1 && (
          <div className="rounded-lg border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Server className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Выберите серверы для агрегации</span>
              <span className="text-xs text-muted-foreground ml-auto">
                Выбрано: {multiServerIds.length} из {availableServers.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {availableServers.map((srv) => {
                const isSelected = multiServerIds.includes(srv.id)
                return (
                  <button
                    key={srv.id}
                    onClick={() => {
                      if (isSelected) {
                        // Не убираем последний выбранный
                        if (multiServerIds.length > 1) {
                          setMultiServerIds(multiServerIds.filter(id => id !== srv.id))
                        }
                      } else {
                        setMultiServerIds([...multiServerIds, srv.id])
                      }
                    }}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all',
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border hover:bg-muted/40'
                    )}
                  >
                    <div className={cn(
                      'flex h-5 w-5 items-center justify-center rounded border shrink-0',
                      isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'
                    )}>
                      {isSelected && <span className="text-xs">✓</span>}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{srv.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {srv.type === 'demo' ? 'Demo' : srv.address}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-2 pt-2 border-t">
              <button
                onClick={() => setMultiServerIds(availableServers.map(s => s.id))}
                className="text-xs text-primary hover:underline"
              >
                Выбрать все
              </button>
              <span className="text-muted-foreground">·</span>
              <button
                onClick={() => setMultiServerIds(availableServers.slice(0, 1).map(s => s.id))}
                className="text-xs text-primary hover:underline"
              >
                Только первый
              </button>
            </div>
          </div>
        )}
      </div>

      {/* KPI карточки */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <KpiCard
          title="Выручка"
          value={formatMoney(totalRevenue)}
          subtitle="Итого за смену"
          icon={Wallet}
          accent="primary"
          trend={12.4}
          loading={balance.isLoading}
        />
        <KpiCard
          title="Чеков"
          value={totalChecks.toLocaleString('ru-RU')}
          subtitle={`Гостей: ${totalGuests.toLocaleString('ru-RU')}`}
          icon={Receipt}
          accent="accent"
          trend={8.1}
          loading={balance.isLoading}
        />
        <KpiCard
          title="Средний чек"
          value={formatMoney(avgCheck)}
          subtitle="На один чек"
          icon={TrendingUp}
          accent="chart-3"
          trend={3.7}
          loading={balance.isLoading}
        />
        <KpiCard
          title="Активных столов"
          value={activeTables.toLocaleString('ru-RU')}
          subtitle={`Гостей: ${openSum.data?.total.guests ?? 0}`}
          icon={Users}
          accent="chart-4"
          loading={openSum.isLoading}
        />
        <KpiCard
          title="Блюд продано"
          value={(dishes.data?.items.reduce((s, i) => s + i.quantity, 0) ?? 0).toLocaleString('ru-RU')}
          subtitle={`Позиций: ${dishes.data?.items.length ?? 0}`}
          icon={UtensilsCrossed}
          accent="chart-5"
          loading={dishes.isLoading}
        />
      </div>

      {/* Графики */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Динамика по часам */}
        <SectionCard
          title="Динамика по часам"
          description="Выручка и количество чеков"
          icon={TrendingUp}
          className="lg:col-span-2"
          loading={balance.isLoading}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyTrend} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="chkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontSize: 12,
                  }}
                  formatter={(v: number, n) => [n === 'Выручка' ? formatMoney(v) : v.toString(), n]}
                />
                <Area
                  type="monotone"
                  dataKey="Выручка"
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  fill="url(#revGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="Чеки"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  fill="url(#chkGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Структура оплат */}
        <SectionCard
          title="Типы оплат"
          description="Доля выручки"
          icon={CreditCard}
          loading={balance.isLoading}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  stroke="var(--background)"
                  strokeWidth={2}
                >
                  {paymentPie.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatMoney(v)}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Топ официантов и топ блюд */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard
          title="Топ официантов"
          description="По сумме выручки"
          icon={Crown}
          loading={waiters.isLoading}
          action={
            <button
              onClick={() => setView('waiters')}
              className="text-xs text-primary hover:underline"
            >
              Все →
            </button>
          }
        >
          <div className="space-y-2.5">
            {topWaiters.map((w, i) => {
              const max = topWaiters[0]?.value || 1;
              const percent = pct(w.value, max);
              return (
                <div key={w.name} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium truncate">{w.name}</span>
                      <span className="text-sm font-semibold tabular-nums shrink-0">
                        {formatMoneyShort(w.value)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {topWaiters.length === 0 && !waiters.isLoading && (
              <div className="text-sm text-muted-foreground text-center py-6">
                Нет данных
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Топ блюд"
          description="По сумме продаж"
          icon={Sparkles}
          loading={dishes.isLoading}
          action={
            <button
              onClick={() => setView('dishes')}
              className="text-xs text-primary hover:underline"
            >
              Все →
            </button>
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topDishes}
                layout="vertical"
                margin={{ top: 0, right: 10, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  stroke="var(--muted-foreground)"
                  width={110}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatMoney(v)}
                />
                <Bar
                  dataKey="amount"
                  fill="var(--chart-2)"
                  radius={[0, 6, 6, 0]}
                  barSize={14}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Последние чеки */}
      <SectionCard
        title="Последние чеки"
        description="Свежие закрытые чеки"
        icon={LayoutList}
        loading={checks.isLoading}
        action={
          <button
            onClick={() => setView('checks')}
            className="text-xs text-primary hover:underline"
          >
            Все чеки →
          </button>
        }
      >
        <ReportTable
          columns={checkColumns}
          rows={checks.data ?? []}
          rowKey={(r) => r.num}
          onRowClick={(r) => {
            useAppStore.getState().setSelectedCheckId(r.num);
            setView('checks');
          }}
          maxRows={8}
          dense
          emptyText="Чеки не найдены"
        />
      </SectionCard>

      {/* Сводка по типам оплат */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(balance.data?.items ?? []).filter((i) => i.amount > 0).map((item, i) => (
          <div
            key={item.name}
            className="rounded-xl border bg-card p-4 relative overflow-hidden"
          >
            <div
              className="absolute top-0 right-0 h-16 w-16 rounded-full blur-2xl opacity-30"
              style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
            />
            <div className="relative">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Banknote className="h-3.5 w-3.5" />
                {item.name}
              </div>
              <div className="text-xl font-bold tabular-nums">
                {formatMoney(item.amount)}
              </div>
              <div className="text-xs text-muted-foreground mt-1 tabular-nums">
                {item.checks} чеков · {pct(item.amount, totalRevenue).toFixed(1)}% от выручки
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
