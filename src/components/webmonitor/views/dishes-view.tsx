'use client';

import { useState, useMemo } from 'react';
import { useReport } from '@/hooks/use-report';
import { SectionCard } from '../ui/section-card';
import { KpiCard } from '../ui/kpi-card';
import { ReportTable, type ReportColumn } from '../ui/report-table';
import { Input } from '@/components/ui/input';
import { formatMoney, formatQty } from '@/lib/format';
import type { DishesReport, DishItem } from '@/lib/rk7/types';
import { UtensilsCrossed, Search, TrendingUp, Hash, ChefHat, Soup } from 'lucide-react';
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

export function DishesView() {
  const { data, isLoading } = useReport<DishesReport>('/api/reports/dishes');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'amount' | 'quantity' | 'name'>('amount');

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  const filtered = useMemo(() => {
    const f = search.trim().toLowerCase();
    const list = f
      ? items.filter((i) => i.name.toLowerCase().includes(f) || i.code.includes(f))
      : items;
    return [...list].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'quantity') return b.quantity - a.quantity;
      return b.amount - a.amount;
    });
  }, [items, search, sortBy]);

  const top10 = [...items].sort((a, b) => b.amount - a.amount).slice(0, 10).map((d) => ({
    name: d.name.length > 22 ? d.name.slice(0, 22) + '…' : d.name,
    amount: d.amount,
    qty: d.quantity,
  }));

  const columns: ReportColumn<DishItem>[] = [
    {
      key: 'code',
      header: 'Код',
      width: '70px',
      render: (r) => (
        <span className="text-xs text-muted-foreground tabular-nums">{r.code}</span>
      ),
    },
    {
      key: 'name',
      header: 'Название',
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: 'quantity',
      header: 'Кол.',
      align: 'right',
      width: '90px',
      render: (r) => <span className="tabular-nums">{formatQty(r.quantity)}</span>,
    },
    {
      key: 'amount',
      header: 'Сумма',
      align: 'right',
      width: '130px',
      render: (r) => (
        <span className="font-semibold tabular-nums">{formatMoney(r.amount)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Расход блюд</h1>
        <p className="text-sm text-muted-foreground">
          Отчёт о проданных блюдах за смену
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Сумма продаж"
          value={formatMoney(total)}
          subtitle="Все блюда"
          icon={TrendingUp}
          accent="primary"
          loading={isLoading}
        />
        <KpiCard
          title="Позиций"
          value={items.length.toString()}
          subtitle="В меню"
          icon={Hash}
          accent="accent"
          loading={isLoading}
        />
        <KpiCard
          title="Блюд продано"
          value={formatQty(totalQty)}
          subtitle="Штук"
          icon={UtensilsCrossed}
          accent="chart-3"
          loading={isLoading}
        />
        <KpiCard
          title="Средний чек на блюдо"
          value={formatMoney(totalQty ? total / totalQty : 0)}
          subtitle="На единицу"
          icon={ChefHat}
          accent="chart-4"
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <SectionCard
          title="Топ-10 блюд"
          description="По выручке"
          icon={Soup}
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
                  tick={{ fontSize: 10 }}
                  stroke="var(--muted-foreground)"
                  width={130}
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
                <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={16}>
                  {top10.map((_, i) => (
                    <Cell key={i} fill={TOP_COLORS[i % TOP_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="Все блюда"
          description={`${filtered.length} позиций`}
          icon={UtensilsCrossed}
          className="lg:col-span-3"
          loading={isLoading}
          action={
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="h-8 rounded-md border bg-background px-2 text-xs"
              >
                <option value="amount">По сумме</option>
                <option value="quantity">По количеству</option>
                <option value="name">По названию</option>
              </select>
            </div>
          }
        >
          <div className="mb-3 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию или коду…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="max-h-[480px] overflow-y-auto scroll-area-thin">
            <ReportTable
              columns={columns}
              rows={filtered}
              rowKey={(r) => r.code + r.name}
              dense
              emptyText="Ничего не найдено"
            />
          </div>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 px-4 py-2.5">
            <span className="font-semibold">Итого</span>
            <div className="flex items-center gap-6 text-sm tabular-nums">
              <span className="text-muted-foreground">{formatQty(filtered.reduce((s, i) => s + i.quantity, 0))} шт</span>
              <span className="font-bold text-base">{formatMoney(filtered.reduce((s, i) => s + i.amount, 0))}</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
