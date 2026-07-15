'use client';

import { useReport } from '@/hooks/use-report';
import { SectionCard } from '../ui/section-card';
import { KpiCard } from '../ui/kpi-card';
import { ReportTable, type ReportColumn } from '../ui/report-table';
import { formatMoney, formatQty } from '@/lib/format';
import type { OpenSumReport, OpenSumItem } from '@/lib/rk7/types';
import { ClipboardList, Users, Table2, Wallet } from 'lucide-react';

export function OpenSumView() {
  const { data, isLoading } = useReport<OpenSumReport>('/api/reports/open-sum');

  const items = data?.items ?? [];
  const total = data?.total;

  const columns: ReportColumn<OpenSumItem>[] = [
    {
      key: 'waiter',
      header: 'Официант',
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold text-xs shrink-0">
            {r.waiter.split(/\s+/).map((p) => p[0]).join('').slice(0, 2)}
          </div>
          <span className="font-medium">{r.waiter}</span>
        </div>
      ),
    },
    {
      key: 'tables',
      header: 'Столов',
      align: 'right',
      width: '100px',
      render: (r) => <span className="tabular-nums">{r.tables}</span>,
    },
    {
      key: 'guests',
      header: 'Гостей',
      align: 'right',
      width: '100px',
      render: (r) => <span className="tabular-nums">{r.guests}</span>,
    },
    {
      key: 'amount',
      header: 'Сумма',
      align: 'right',
      width: '160px',
      render: (r) => (
        <span className="font-semibold tabular-nums">{formatMoney(r.amount)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Открытые суммы</h1>
        <p className="text-sm text-muted-foreground">
          Активные заказы по официантам (незакрытые)
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Сумма открытых заказов"
          value={formatMoney(total?.amount ?? 0)}
          subtitle="В работе"
          icon={Wallet}
          accent="primary"
          loading={isLoading}
        />
        <KpiCard
          title="Столов"
          value={(total?.tables ?? 0).toString()}
          subtitle="Активно"
          icon={Table2}
          accent="accent"
          loading={isLoading}
        />
        <KpiCard
          title="Гостей"
          value={(total?.guests ?? 0).toString()}
          subtitle="Обслуживается"
          icon={Users}
          accent="chart-3"
          loading={isLoading}
        />
        <KpiCard
          title="Официантов"
          value={items.length.toString()}
          subtitle="С открытыми заказами"
          icon={ClipboardList}
          accent="chart-4"
          loading={isLoading}
        />
      </div>

      <SectionCard
        title="По официантам"
        description={`${items.length} активных официантов`}
        icon={ClipboardList}
        loading={isLoading}
      >
        <ReportTable
          columns={columns}
          rows={items}
          rowKey={(r) => r.waiter}
          emptyText="Нет открытых заказов"
        />
        {total && (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
            <div className="flex items-center gap-2 font-semibold">
              <Wallet className="h-4 w-4 text-primary" />
              {total.waiter}
            </div>
            <div className="flex items-center gap-6 text-sm tabular-nums">
              <span>{total.tables} столов</span>
              <span>{total.guests} гостей</span>
              <span className="font-bold text-base">{formatMoney(total.amount)}</span>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
