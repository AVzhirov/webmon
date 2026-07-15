'use client';

import { useReport } from '@/hooks/use-report';
import { SectionCard } from '../ui/section-card';
import { KpiCard } from '../ui/kpi-card';
import { ReportTable, type ReportColumn } from '../ui/report-table';
import { formatMoney, pct } from '@/lib/format';
import type { BalanceReport, BalanceItem } from '@/lib/rk7/types';
import { Scale, Receipt, Users, Banknote, Percent } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';

const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

export function BalanceView() {
  const { data, isLoading } = useReport<BalanceReport>('/api/reports/balance');

  const items = data?.items ?? [];
  const total = data?.total;
  const taxes = data?.taxes ?? [];
  const grandTotal = total?.amount ?? 0;

  const chartData = items
    .filter((i) => i.amount > 0)
    .map((i) => ({ name: i.name, value: i.amount, checks: i.checks }));

  const columns: ReportColumn<BalanceItem>[] = [
    {
      key: 'name',
      header: 'Тип оплаты',
      render: (r) => (
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: COLORS[items.indexOf(r) % COLORS.length] }}
          />
          <span className="font-medium">{r.name}</span>
        </div>
      ),
    },
    {
      key: 'guests',
      header: 'Гостей',
      align: 'right',
      render: (r) => <span className="tabular-nums">{r.guests}</span>,
    },
    {
      key: 'checks',
      header: 'Чеков',
      align: 'right',
      render: (r) => <span className="tabular-nums">{r.checks}</span>,
    },
    {
      key: 'amount',
      header: 'Сумма',
      align: 'right',
      render: (r) => <span className="font-semibold tabular-nums">{formatMoney(r.amount)}</span>,
    },
    {
      key: 'pct',
      header: 'Доля',
      align: 'right',
      width: '90px',
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${pct(r.amount, grandTotal)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums w-12">
            {pct(r.amount, grandTotal).toFixed(1)}%
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Баланс</h1>
        <p className="text-sm text-muted-foreground">
          Системный балансовый отчёт по типам оплат за смену
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Всего выручка"
          value={formatMoney(grandTotal)}
          subtitle={`${total?.checks ?? 0} чеков`}
          icon={Banknote}
          accent="primary"
          loading={isLoading}
        />
        <KpiCard
          title="Чеков"
          value={(total?.checks ?? 0).toLocaleString('ru-RU')}
          subtitle={`${total?.guests ?? 0} гостей`}
          icon={Receipt}
          accent="accent"
          loading={isLoading}
        />
        <KpiCard
          title="Гостей"
          value={(total?.guests ?? 0).toLocaleString('ru-RU')}
          subtitle="За смену"
          icon={Users}
          accent="chart-3"
          loading={isLoading}
        />
        <KpiCard
          title="Типов оплат"
          value={items.filter((i) => i.amount > 0).length.toString()}
          subtitle="Использовано"
          icon={Percent}
          accent="chart-4"
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <SectionCard
          title="Распределение по типам оплат"
          icon={Scale}
          className="lg:col-span-2"
          loading={isLoading}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                  width={120}
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
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="Детализация"
          icon={Receipt}
          className="lg:col-span-3"
          loading={isLoading}
        >
          <ReportTable
            columns={columns}
            rows={items}
            rowKey={(r) => r.name}
            emptyText="Нет данных"
          />
          {total && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
              <div className="flex items-center gap-2 font-semibold">
                <Banknote className="h-4 w-4 text-primary" />
                {total.name}
              </div>
              <div className="flex items-center gap-6 text-sm tabular-nums">
                <span>{total.guests} гостей</span>
                <span>{total.checks} чеков</span>
                <span className="font-bold text-base">{formatMoney(total.amount)}</span>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {taxes.length > 0 && (
        <SectionCard title="Налоги и сборы" icon={Percent} loading={isLoading}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {taxes.map((t) => (
              <div
                key={t.name}
                className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t.name}</span>
                </div>
                <span className="font-semibold tabular-nums">{formatMoney(t.amount)}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
