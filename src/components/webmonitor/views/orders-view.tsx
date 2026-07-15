'use client';

import { useReport } from '@/hooks/use-report';
import { SectionCard } from '../ui/section-card';
import { KpiCard } from '../ui/kpi-card';
import { formatMoney } from '@/lib/format';
import type { OrdersReport } from '@/lib/rk7/types';
import { ClipboardList, Users, Table2 } from 'lucide-react';

export function OrdersView() {
  const { data, isLoading } = useReport<OrdersReport>('/api/reports/orders');

  const waiters = data?.waiters ?? [];
  const totalTables = waiters.reduce((s, w) => s + w.tables.length, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Заказы</h1>
        <p className="text-sm text-muted-foreground">
          Распределение столов по официантам
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          title="Официантов"
          value={waiters.length.toString()}
          subtitle="С заказами"
          icon={Users}
          accent="primary"
          loading={isLoading}
        />
        <KpiCard
          title="Столов"
          value={totalTables.toString()}
          subtitle="В работе"
          icon={Table2}
          accent="accent"
          loading={isLoading}
        />
        <KpiCard
          title="Средне столов"
          value={(waiters.length ? totalTables / waiters.length : 0).toFixed(1).replace('.', ',')}
          subtitle="На официанта"
          icon={ClipboardList}
          accent="chart-3"
          loading={isLoading}
        />
      </div>

      <SectionCard
        title="Столы по официантам"
        description="Каждый карточный список столов в работе"
        icon={ClipboardList}
        loading={isLoading}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {waiters.map((w, i) => (
            <div
              key={i}
              className="rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold shrink-0">
                    {w.name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{w.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {w.tables.length} столов
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {w.tables.length === 0 ? (
                  <span className="text-xs text-muted-foreground/70">Нет активных столов</span>
                ) : (
                  w.tables.map((t, j) => (
                    <span
                      key={j}
                      className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-md bg-muted px-1.5 text-xs font-medium tabular-nums"
                    >
                      {t}
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
          {waiters.length === 0 && !isLoading && (
            <div className="col-span-full text-sm text-muted-foreground text-center py-6">
              Нет данных
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
