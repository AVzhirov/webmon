'use client';

import { useReport } from '@/hooks/use-report';
import { SectionCard } from '../ui/section-card';
import { StatusBadge } from '../ui/status-badge';
import type { CashInfo } from '@/lib/rk7/types';
import { CalendarClock, Clock, CalendarDays, Sun, Moon, Coffee } from 'lucide-react';
import { motion } from 'framer-motion';

export function CashInfoView() {
  const { data, isLoading } = useReport<CashInfo>('/api/reports/cash-info');

  const items = data?.items ?? [];
  const period = data?.period ?? '—';

  // Map items to nice icons
  const iconFor = (name: string) => {
    if (/дата/i.test(name)) return CalendarDays;
    if (/время/i.test(name)) return Clock;
    if (/период|смена/i.test(name)) return CalendarClock;
    return CalendarDays;
  };

  const periodIcon = period.toLowerCase().includes('вечер')
    ? Moon
    : period.toLowerCase().includes('утро') || period.toLowerCase().includes('день')
      ? Sun
      : Coffee;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Кассовая информация</h1>
        <p className="text-sm text-muted-foreground">
          Текущая кассовая дата, время и период смены
        </p>
      </div>

      {/* Большие карточки параметров */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl border bg-card animate-pulse" />
          ))
        ) : (
          items.map((item, i) => {
            const Icon = iconFor(item.name);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="relative overflow-hidden rounded-xl border bg-card p-6"
              >
                <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
                <div className="relative flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <StatusBadge variant="success" dot>
                    Активно
                  </StatusBadge>
                </div>
                <div className="relative mt-4">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">
                    {item.name}
                  </div>
                  <div className="text-2xl font-bold tracking-tight mt-1 tabular-nums">
                    {item.value}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Период дня */}
      <SectionCard
        title="Период дня"
        description="Текущий период кассовой смены"
        icon={CalendarClock}
        loading={isLoading}
      >
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/10 via-accent/5 to-background p-8">
          <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
          <div className="relative flex items-center gap-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-xl shadow-accent/30"
            >
              {(() => {
                const Icon = periodIcon;
                return <Icon className="h-10 w-10" />;
              })()}
            </motion.div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Текущий период
              </div>
              <div className="text-4xl font-bold tracking-tight">{period}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {period.toLowerCase().includes('вечер')
                  ? 'Вечерняя смена активна'
                  : period.toLowerCase().includes('утро')
                    ? 'Утренняя смена активна'
                    : 'Смена активна'}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Все параметры списком */}
      <SectionCard
        title="Все параметры"
        description="Полный список кассовых параметров"
        icon={CalendarDays}
        loading={isLoading}
      >
        <div className="divide-y">
          {items.map((item, i) => {
            const Icon = iconFor(item.name);
            return (
              <div
                key={i}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <span className="font-semibold tabular-nums">{item.value}</span>
              </div>
            );
          })}
          {items.length === 0 && !isLoading && (
            <div className="text-sm text-muted-foreground text-center py-6">
              Нет данных
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
