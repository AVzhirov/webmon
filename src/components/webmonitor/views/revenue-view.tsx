'use client';

import { useReport } from '@/hooks/use-report';
import { SectionCard } from '../ui/section-card';
import { KpiCard } from '../ui/kpi-card';
import { formatMoney, formatMoneyShort } from '@/lib/format';
import type { RevenueReport, RevenueLine } from '@/lib/rk7/types';
import { Wallet, Coins, TrendingUp, Banknote } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export function RevenueView() {
  const { data, isLoading } = useReport<RevenueReport>('/api/reports/revenue');

  const lines = data?.lines ?? [];
  const grandTotal = data?.grandTotal ?? 0;

  // Агрегируем по способам оплат
  const methodTotals = new Map<string, number>();
  for (const line of lines) {
    for (const m of line.methods) {
      methodTotals.set(m.name, (methodTotals.get(m.name) ?? 0) + m.amount);
    }
  }
  const chartData = Array.from(methodTotals.entries())
    .filter(([_, v]) => v > 0)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Выручка</h1>
        <p className="text-sm text-muted-foreground">
          Детализация выручки по валютам и способам оплат
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Итоговая выручка"
          value={formatMoney(grandTotal)}
          subtitle="Все валюты"
          icon={Wallet}
          accent="primary"
          loading={isLoading}
        />
        <KpiCard
          title="Валют"
          value={lines.length.toString()}
          subtitle="Использовано"
          icon={Coins}
          accent="accent"
          loading={isLoading}
        />
        <KpiCard
          title="Способов оплат"
          value={chartData.length.toString()}
          subtitle="Активно"
          icon={Banknote}
          accent="chart-3"
          loading={isLoading}
        />
        <KpiCard
          title="Средний оборот"
          value={formatMoneyShort(grandTotal / Math.max(lines.length, 1))}
          subtitle="На валюту"
          icon={TrendingUp}
          accent="chart-4"
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <SectionCard
          title="Сравнение способов оплат"
          icon={Wallet}
          className="lg:col-span-3"
          loading={isLoading}
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatMoney(v)}
                />
                <Bar dataKey="value" fill="var(--chart-1)" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="По валютам"
          icon={Coins}
          className="lg:col-span-2"
          loading={isLoading}
        >
          <div className="space-y-3">
            {lines.map((line, i) => (
              <RevenueLineCard key={i} line={line} />
            ))}
            {lines.length === 0 && !isLoading && (
              <div className="text-sm text-muted-foreground text-center py-6">
                Нет данных
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function RevenueLineCard({ line }: { line: RevenueLine }) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center justify-between bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">{line.currency}</span>
        </div>
        <span className="font-bold tabular-nums">{formatMoney(line.total)}</span>
      </div>
      <div className="p-3 space-y-1">
        {line.methods
          .filter((m) => m.amount > 0)
          .map((m, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{m.name}</span>
              <span className="tabular-nums">{formatMoney(m.amount)}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
