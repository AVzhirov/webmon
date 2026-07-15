'use client';

import { useReport } from '@/hooks/use-report';
import { SectionCard } from '../ui/section-card';
import { KpiCard } from '../ui/kpi-card';
import { ReportTable, type ReportColumn } from '../ui/report-table';
import { formatMoney, formatMoneyShort, pct } from '@/lib/format';
import type { MoneyByPersonReport, MoneyByPersonEntry } from '@/lib/rk7/types';
import {
  Users,
  Wallet,
  TrendingUp,
  Crown,
} from 'lucide-react';
import { useState } from 'react';
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

const TOP_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

interface Props {
  endpoint: string;
  title: string;
  subtitle: string;
  personLabel: string;
  icon: typeof Users;
}

export function MoneyByPersonView({ endpoint, title, subtitle, personLabel, icon: Icon }: Props) {
  const { data, isLoading } = useReport<MoneyByPersonReport>(endpoint);
  const [expanded, setExpanded] = useState<string | null>(null);

  const entries = data?.entries ?? [];
  const grandTotal = data?.grandTotal ?? 0;

  const sorted = [...entries].sort((a, b) => b.total - a.total);
  const top10 = sorted.slice(0, 10).map((e) => ({
    name: e.name.length > 18 ? e.name.slice(0, 18) + '…' : e.name,
    value: e.total,
  }));

  const columns: ReportColumn<MoneyByPersonEntry>[] = [
    {
      key: 'name',
      header: personLabel,
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold text-xs shrink-0">
            {r.name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2)}
          </div>
          <span className="font-medium">{r.name}</span>
        </div>
      ),
    },
    {
      key: 'currencies',
      header: 'Валют',
      align: 'center',
      width: '90px',
      render: (r) => <span className="tabular-nums">{r.currencies.length}</span>,
    },
    {
      key: 'methods',
      header: 'Способов оплат',
      align: 'center',
      width: '120px',
      render: (r) => (
        <span className="tabular-nums">
          {r.currencies.reduce((s, c) => s + c.methods.length, 0)}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Сумма',
      align: 'right',
      width: '140px',
      render: (r) => (
        <span className="font-semibold tabular-nums">{formatMoney(r.total)}</span>
      ),
    },
    {
      key: 'pct',
      header: 'Доля',
      align: 'right',
      width: '120px',
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${pct(r.total, grandTotal)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums w-12">
            {pct(r.total, grandTotal).toFixed(1)}%
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Общая выручка"
          value={formatMoney(grandTotal)}
          subtitle="Суммарно"
          icon={Wallet}
          accent="primary"
          loading={isLoading}
        />
        <KpiCard
          title={personLabel}
          value={entries.length.toString()}
          subtitle="Активны"
          icon={Icon}
          accent="accent"
          loading={isLoading}
        />
        <KpiCard
          title="Лучший результат"
          value={sorted[0] ? formatMoneyShort(sorted[0].total) : '—'}
          subtitle={sorted[0]?.name ?? 'Нет данных'}
          icon={Crown}
          accent="chart-3"
          loading={isLoading}
        />
        <KpiCard
          title="Средняя выручка"
          value={formatMoneyShort(entries.length ? grandTotal / entries.length : 0)}
          subtitle={`На ${personLabel.toLowerCase().slice(0, -1)}а`}
          icon={TrendingUp}
          accent="chart-4"
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <SectionCard
          title="Топ-10"
          description="По сумме выручки"
          icon={Crown}
          className="lg:col-span-2"
          loading={isLoading}
        >
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} layout="vertical" margin={{ left: 0, right: 16 }}>
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
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
                  {top10.map((_, i) => (
                    <Cell key={i} fill={TOP_COLORS[i % TOP_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="Все"
          description={`${entries.length} записей`}
          icon={Icon}
          className="lg:col-span-3"
          loading={isLoading}
        >
          <div className="max-h-[520px] overflow-y-auto scroll-area-thin">
            <ReportTable
              columns={columns}
              rows={sorted}
              rowKey={(r) => r.name}
              onRowClick={(r) =>
                setExpanded((cur) => (cur === r.name ? null : r.name))
              }
              rowClassName={(r) =>
                expanded === r.name ? 'bg-muted/40' : ''
              }
              emptyText="Нет данных"
            />
          </div>
          {expanded && (
            <div className="mt-3 rounded-lg border bg-muted/20 p-4">
              <ExpandedDetail
                entry={sorted.find((e) => e.name === expanded)}
              />
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function ExpandedDetail({ entry }: { entry?: MoneyByPersonEntry }) {
  if (!entry) return null;
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">
        {entry.name} · {formatMoney(entry.total)}
      </div>
      {entry.currencies.map((c, i) => (
        <div key={i} className="rounded-md border bg-card p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-sm">{c.currency}</span>
            <span className="font-semibold tabular-nums">{formatMoney(c.total)}</span>
          </div>
          <div className="space-y-1">
            {c.methods.map((m, j) => (
              <div key={j} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{m.name}</span>
                <span className="tabular-nums">{formatMoney(m.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
