'use client';

import { useState, useMemo } from 'react';
import { useReport } from '@/hooks/use-report';
import { useAppStore } from '@/store/webmonitor';
import { SectionCard } from '../ui/section-card';
import { KpiCard } from '../ui/kpi-card';
import { ReportTable, type ReportColumn } from '../ui/report-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney, formatQty, formatTime } from '@/lib/format';
import type { CheckListItem, CheckDetail } from '@/lib/rk7/types';
import {
  Receipt,
  Search,
  ChevronLeft,
  Calendar,
  CreditCard,
  User as UserIcon,
  Monitor,
  Hash,
  Banknote,
  Percent,
  Soup,
} from 'lucide-react';

export function ChecksView() {
  const [search, setSearch] = useState('');
  const selectedCheckId = useAppStore((s) => s.selectedCheckId);
  const setSelectedCheckId = useAppStore((s) => s.setSelectedCheckId);

  const { data: checks, isLoading } = useReport<CheckListItem[]>('/api/reports/checks');
  const { data: detail, isLoading: detailLoading } = useReport<CheckDetail>(
    `/api/reports/checks?id=${selectedCheckId}`,
    !!selectedCheckId,
  );

  const items = checks ?? [];
  const totalRevenue = items.reduce((s, c) => s + c.amount, 0);
  const avgCheck = items.length ? totalRevenue / items.length : 0;

  const filtered = useMemo(() => {
    const f = search.trim().toLowerCase();
    if (!f) return items;
    return items.filter(
      (c) =>
        c.waiter.toLowerCase().includes(f) ||
        c.cashier.toLowerCase().includes(f) ||
        c.station.toLowerCase().includes(f) ||
        String(c.num).includes(f) ||
        String(c.orderId).includes(f),
    );
  }, [items, search]);

  // Если выбран чек — показываем детали
  if (selectedCheckId) {
    return (
      <CheckDetailPanel
        checkId={selectedCheckId}
        detail={detail}
        loading={detailLoading}
        onBack={() => setSelectedCheckId(null)}
      />
    );
  }

  const columns: ReportColumn<CheckListItem>[] = [
    {
      key: 'num',
      header: '#',
      align: 'right',
      width: '60px',
      render: (r) => <span className="font-medium tabular-nums">#{r.num}</span>,
    },
    {
      key: 'closedAt',
      header: 'Закрыт',
      width: '80px',
      render: (r) => (
        <span className="tabular-nums text-muted-foreground">
          {formatTime(r.closedAt)}
        </span>
      ),
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
    {
      key: 'waiter',
      header: 'Официант',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <UserIcon className="h-3 w-3 text-muted-foreground" />
          <span>{r.waiter}</span>
        </div>
      ),
    },
    {
      key: 'cashier',
      header: 'Кассир',
      render: (r) => <span className="text-muted-foreground">{r.cashier}</span>,
    },
    {
      key: 'station',
      header: 'Станция',
      render: (r) => (
        <span className="text-xs text-muted-foreground">{r.station}</span>
      ),
    },
    {
      key: 'orderId',
      header: 'Заказ',
      align: 'right',
      width: '80px',
      render: (r) => (
        <span className="text-xs text-muted-foreground tabular-nums">#{r.orderId}</span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Чеки</h1>
        <p className="text-sm text-muted-foreground">
          Список закрытых чеков за смену · нажмите на чек для просмотра деталей
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Всего чеков"
          value={items.length.toString()}
          subtitle="За смену"
          icon={Receipt}
          accent="primary"
          loading={isLoading}
        />
        <KpiCard
          title="Сумма чеков"
          value={formatMoney(totalRevenue)}
          subtitle="Оборот"
          icon={Banknote}
          accent="accent"
          loading={isLoading}
        />
        <KpiCard
          title="Средний чек"
          value={formatMoney(avgCheck)}
          subtitle="На один чек"
          icon={Hash}
          accent="chart-3"
          loading={isLoading}
        />
        <KpiCard
          title="Максимальный чек"
          value={formatMoney(items.reduce((m, c) => Math.max(m, c.amount), 0))}
          subtitle="За смену"
          icon={Receipt}
          accent="chart-4"
          loading={isLoading}
        />
      </div>

      <SectionCard
        title="Список чеков"
        description={`${filtered.length} из ${items.length}`}
        icon={Receipt}
        loading={isLoading}
        action={
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        }
      >
        <div className="max-h-[640px] overflow-y-auto scroll-area-thin">
          <ReportTable
            columns={columns}
            rows={filtered}
            rowKey={(r) => r.num}
            onRowClick={(r) => setSelectedCheckId(r.num)}
            dense
            emptyText="Чеки не найдены"
          />
        </div>
      </SectionCard>
    </div>
  );
}

function CheckDetailPanel({
  checkId,
  detail,
  loading,
  onBack,
}: {
  checkId: number;
  detail?: CheckDetail;
  loading: boolean;
  onBack: () => void;
}) {
  const dishes = detail?.dishes ?? [];
  const discounts = detail?.discounts ?? [];
  const total = detail?.total ?? 0;
  const totalDiscount = discounts.reduce((s, d) => s + Math.abs(d.amount), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          Назад
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Чек #{checkId}</h1>
          <p className="text-sm text-muted-foreground">
            Детализация позиций и скидок
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          {/* Сводка */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Сумма чека"
              value={formatMoney(total)}
              subtitle={`${dishes.length} позиций`}
              icon={Banknote}
              accent="primary"
            />
            <KpiCard
              title="Позиций"
              value={dishes.length.toString()}
              subtitle="Блюд"
              icon={Soup}
              accent="accent"
            />
            <KpiCard
              title="Скидка"
              value={formatMoney(totalDiscount)}
              subtitle={`${discounts.length} применено`}
              icon={Percent}
              accent="chart-3"
            />
            <KpiCard
              title="Средняя цена"
              value={formatMoney(dishes.length ? total / dishes.length : 0)}
              subtitle="На позицию"
              icon={Hash}
              accent="chart-4"
            />
          </div>

          {/* Позиции */}
          <SectionCard
            title="Позиции чека"
            description="Блюда и цены"
            icon={Soup}
          >
            <ReportTable
              columns={[
                {
                  key: 'num',
                  header: '#',
                  align: 'right',
                  width: '40px',
                  render: (r) => <span className="tabular-nums text-muted-foreground">{r.num}</span>,
                },
                {
                  key: 'code',
                  header: 'Код',
                  width: '60px',
                  render: (r) => <span className="text-xs text-muted-foreground tabular-nums">{r.code}</span>,
                },
                {
                  key: 'name',
                  header: 'Блюдо',
                  render: (r) => <span className="font-medium">{r.name}</span>,
                },
                {
                  key: 'qty',
                  header: 'Кол.',
                  align: 'right',
                  width: '70px',
                  render: (r) => <span className="tabular-nums">{formatQty(r.quantity)}</span>,
                },
                {
                  key: 'price',
                  header: 'Цена',
                  align: 'right',
                  width: '100px',
                  render: (r) => <span className="tabular-nums text-muted-foreground">{formatMoney(r.price)}</span>,
                },
                {
                  key: 'amount',
                  header: 'Сумма',
                  align: 'right',
                  width: '130px',
                  render: (r) => <span className="font-semibold tabular-nums">{formatMoney(r.amount)}</span>,
                },
              ]}
              rows={dishes}
              rowKey={(r) => r.num}
              emptyText="Нет позиций"
              dense
            />
            <div className="mt-3 flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
              <span className="font-semibold">Итого</span>
              <span className="font-bold text-base tabular-nums">{formatMoney(total)}</span>
            </div>
          </SectionCard>

          {discounts.length > 0 && (
            <SectionCard title="Скидки" description="Применённые дисконтные карты" icon={CreditCard}>
              <div className="space-y-2">
                {discounts.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border bg-card px-4 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-chart-3" />
                      <span className="text-sm font-medium">{d.name}</span>
                      {d.card && (
                        <span className="text-xs text-muted-foreground">· {d.card}</span>
                      )}
                    </div>
                    <span className="font-semibold tabular-nums text-chart-3">
                      −{formatMoney(Math.abs(d.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}
