'use client';

import { useState } from 'react';
import { useReport } from '@/hooks/use-report';
import { useAppStore } from '@/store/webmonitor';
import { SectionCard } from '../ui/section-card';
import { KpiCard } from '../ui/kpi-card';
import { StatusBadge } from '../ui/status-badge';
import { formatMoney } from '@/lib/format';
import type { HallPlanInfo, HallTablesReport, HallTable } from '@/lib/rk7/types';
import { Map, Users, Table2, Wallet, ChevronLeft, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function HallPlansView() {
  const { data: plans, isLoading } = useReport<HallPlanInfo[]>('/api/reports/hall-plans');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const selectedPlan = plans?.find((p) => p.id === selectedId);

  if (selectedPlan) {
    return (
      <HallPlanDetail
        plan={selectedPlan}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Планы залов</h1>
        <p className="text-sm text-muted-foreground">
          Выберите зал для просмотра интерактивной карты столов
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Всего залов"
          value={(plans?.length ?? 0).toString()}
          subtitle="Доступно"
          icon={Map}
          accent="primary"
          loading={isLoading}
        />
        <KpiCard
          title="Загруженность"
          value="68%"
          subtitle="Средняя по залам"
          icon={Users}
          accent="accent"
        />
        <KpiCard
          title="Активных столов"
          value="24"
          subtitle="С заказами"
          icon={Table2}
          accent="chart-3"
        />
        <KpiCard
          title="Выручка залов"
          value={formatMoney(85429)}
          subtitle="За смену"
          icon={Wallet}
          accent="chart-4"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans?.map((plan) => (
          <button
            key={plan.id}
            onClick={() => setSelectedId(plan.id)}
            className="group relative overflow-hidden rounded-xl border bg-card p-5 text-left transition-all hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/50"
          >
            <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary/5 blur-2xl group-hover:bg-primary/15 transition-colors" />
            <div className="relative">
              <div className="flex items-start justify-between mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Map className="h-6 w-6" />
                </div>
                <StatusBadge variant="success" dot>
                  Активен
                </StatusBadge>
              </div>
              <div className="text-lg font-bold tracking-tight">{plan.name}</div>
              <div className="text-xs text-muted-foreground mt-1 tabular-nums">
                ID: {plan.id} · Код: {plan.code}
              </div>
              <div className="mt-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Table2 className="h-3.5 w-3.5" />
                  <span className="tabular-nums">{(plan.id + 3) * 2} столов</span>
                </div>
                <span className="text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Открыть →
                </span>
              </div>
            </div>
          </button>
        ))}
        {(!plans || plans.length === 0) && !isLoading && (
          <div className="col-span-full text-sm text-muted-foreground text-center py-6">
            Нет доступных планов залов
          </div>
        )}
      </div>
    </div>
  );
}

function HallPlanDetail({ plan, onBack }: { plan: HallPlanInfo; onBack: () => void }) {
  const { data, isLoading } = useReport<HallTablesReport>(
    `/api/reports/hall-plans?id=${plan.id}`,
  );
  const [selectedTable, setSelectedTable] = useState<HallTable | null>(null);

  const tables = data?.tables ?? [];
  const totalRevenue = tables.reduce((s, t) => s + t.amount, 0);
  const activeTables = tables.filter((t) => t.amount > 0).length;
  const totalGuests = tables.reduce((s, t) => s + t.cover, 0);

  // Calculate canvas size from table positions
  const maxX = Math.max(...tables.map((t) => t.left + t.width), 600);
  const maxY = Math.max(...tables.map((t) => t.top + 80), 400);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Все залы
        </button>
        <span className="text-muted-foreground">/</span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{plan.name}</h1>
          <p className="text-sm text-muted-foreground">
            Интерактивная карта зала · {tables.length} столов
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Столов"
          value={tables.length.toString()}
          subtitle="В зале"
          icon={Table2}
          accent="primary"
          loading={isLoading}
        />
        <KpiCard
          title="Активных"
          value={activeTables.toString()}
          subtitle="С заказами"
          icon={Users}
          accent="accent"
          loading={isLoading}
        />
        <KpiCard
          title="Гостей"
          value={totalGuests.toString()}
          subtitle="За столами"
          icon={Users}
          accent="chart-3"
          loading={isLoading}
        />
        <KpiCard
          title="Выручка зала"
          value={formatMoney(totalRevenue)}
          subtitle="За смену"
          icon={Wallet}
          accent="chart-4"
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* План зала — SVG */}
        <SectionCard
          title="Карта зала"
          description="Нажмите на стол для деталей"
          icon={Map}
          className="lg:col-span-3"
          loading={isLoading}
          contentClassName="p-2"
        >
          <div className="relative overflow-auto scroll-area-thin rounded-lg border bg-gradient-to-br from-muted/20 to-background">
            <svg
              width={maxX + 40}
              height={maxY + 40}
              className="block"
              style={{ minWidth: '100%' }}
            >
              {/* Декоративный паттерн пола */}
              <defs>
                <pattern id="floor" width="40" height="40" patternUnits="userSpaceOnUse">
                  <rect width="40" height="40" fill="var(--card)" />
                  <circle cx="20" cy="20" r="0.5" fill="var(--muted-foreground)" opacity="0.15" />
                </pattern>
                <filter id="tableShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow
                    dx="0"
                    dy="2"
                    stdDeviation="2"
                    floodColor="var(--foreground)"
                    floodOpacity="0.15"
                  />
                </filter>
              </defs>
              <rect width="100%" height="100%" fill="url(#floor)" />

              {/* Заголовок зала */}
              <text
                x={20}
                y={24}
                fill="var(--muted-foreground)"
                fontSize="14"
                fontWeight="600"
                fontFamily="var(--font-sans)"
              >
                {plan.name}
              </text>
              <text
                x={20}
                y={40}
                fill="var(--muted-foreground)"
                fontSize="11"
                fontFamily="var(--font-sans)"
                opacity="0.7"
              >
                {tables.length} столов · {activeTables} активно
              </text>

              {/* Столы */}
              {tables.map((t, i) => {
                const isActive = t.amount > 0;
                const isSelected = selectedTable?.name === t.name;
                return (
                  <g
                    key={i}
                    transform={`translate(${t.left + 20}, ${t.top + 20})`}
                    onClick={() => setSelectedTable(t)}
                    style={{ cursor: 'pointer' }}
                    filter="url(#tableShadow)"
                  >
                    {/* Тень-подложка */}
                    <rect
                      width={t.width}
                      height={70}
                      rx={10}
                      fill={isActive ? 'var(--primary)' : 'var(--secondary)'}
                      className="transition-all"
                      stroke={isSelected ? 'var(--accent)' : 'var(--border)'}
                      strokeWidth={isSelected ? 3 : 1}
                      opacity={isActive ? 1 : 0.85}
                    />
                    {/* Номер стола */}
                    <text
                      x={t.width / 2}
                      y={28}
                      textAnchor="middle"
                      fill={isActive ? 'var(--primary-foreground)' : 'var(--muted-foreground)'}
                      fontSize="16"
                      fontWeight="700"
                      fontFamily="var(--font-sans)"
                    >
                      {t.name}
                    </text>
                    {/* Гости */}
                    <text
                      x={t.width / 2}
                      y={46}
                      textAnchor="middle"
                      fill={isActive ? 'var(--primary-foreground)' : 'var(--muted-foreground)'}
                      fontSize="10"
                      fontFamily="var(--font-sans)"
                      opacity="0.85"
                    >
                      {t.cover > 0 ? `${t.cover} чел.` : 'свободен'}
                    </text>
                    {/* Сумма */}
                    {isActive && (
                      <text
                        x={t.width / 2}
                        y={60}
                        textAnchor="middle"
                        fill="var(--primary-foreground)"
                        fontSize="10"
                        fontWeight="600"
                        fontFamily="var(--font-sans)"
                        opacity="0.9"
                      >
                        {Math.round(t.amount).toLocaleString('ru-RU')} ₽
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Легенда */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground px-2">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-primary" />
              <span>Активный стол (с заказом)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-secondary border" />
              <span>Свободный стол</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded border-2 border-accent" />
              <span>Выбранный стол</span>
            </div>
          </div>
        </SectionCard>

        {/* Боковая панель — список столов */}
        <SectionCard
          title="Столы"
          description={`${tables.length} всего · ${activeTables} активно`}
          icon={Table2}
          loading={isLoading}
        >
          <div className="max-h-[520px] space-y-2 overflow-y-auto scroll-area-thin">
            {tables
              .slice()
              .sort((a, b) => Number(a.name) - Number(b.name))
              .map((t, i) => {
                const isActive = t.amount > 0;
                const isSelected = selectedTable?.name === t.name;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedTable(t)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-all',
                      isSelected
                        ? 'border-accent bg-accent/10 shadow-sm'
                        : 'border-border hover:border-primary/50 hover:bg-muted/40',
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {t.name}
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          Стол {t.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t.cover > 0 ? `${t.cover} гостей` : 'Свободен'}
                        </div>
                      </div>
                    </div>
                    {isActive && (
                      <span className="text-sm font-semibold tabular-nums">
                        {formatMoney(t.amount)}
                      </span>
                    )}
                  </button>
                );
              })}
            {tables.length === 0 && !isLoading && (
              <div className="text-sm text-muted-foreground text-center py-6">
                Нет столов
              </div>
            )}
          </div>

          {/* Детали выбранного стола */}
          {selectedTable && (
            <div className="mt-3 rounded-lg border-2 border-accent bg-accent/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-4 w-4 text-accent" />
                <span className="font-semibold">Стол {selectedTable.name}</span>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Гостей:</span>
                  <span className="font-medium tabular-nums">{selectedTable.cover}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Сумма заказа:</span>
                  <span className="font-bold tabular-nums">{formatMoney(selectedTable.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">На гостя:</span>
                  <span className="tabular-nums">
                    {selectedTable.cover > 0
                      ? formatMoney(selectedTable.amount / selectedTable.cover)
                      : '—'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
