'use client';

import { useState, useMemo } from 'react';
import { useReport } from '@/hooks/use-report';
import { SectionCard } from '../ui/section-card';
import { KpiCard } from '../ui/kpi-card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { PersonalItem } from '@/lib/rk7/types';
import { UserCircle, Users, Search, IdCard } from 'lucide-react';

export function PersonalView() {
  const { data, isLoading } = useReport<PersonalItem[]>('/api/reports/personal');
  const [search, setSearch] = useState('');

  const items = data ?? [];
  const filtered = useMemo(() => {
    const f = search.trim().toLowerCase();
    if (!f) return items;
    return items.filter(
      (p) => p.name.toLowerCase().includes(f) || String(p.code).includes(f),
    );
  }, [items, search]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Персонал</h1>
        <p className="text-sm text-muted-foreground">
          Справочник сотрудников заведения
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          title="Всего сотрудников"
          value={items.length.toString()}
          subtitle="В справочнике"
          icon={Users}
          accent="primary"
          loading={isLoading}
        />
        <KpiCard
          title="Активных"
          value={items.length.toString()}
          subtitle="С доступом"
          icon={UserCircle}
          accent="accent"
          loading={isLoading}
        />
        <KpiCard
          title="Средний код"
          value={items.length ? Math.round(items.reduce((s, p) => s + p.code, 0) / items.length).toString() : '—'}
          subtitle="Идентификатор"
          icon={IdCard}
          accent="chart-3"
          loading={isLoading}
        />
      </div>

      <SectionCard
        title="Список персонала"
        description={`${filtered.length} из ${items.length}`}
        icon={Users}
        loading={isLoading}
        action={
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени или коду…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[640px] overflow-y-auto scroll-area-thin pr-1">
          {filtered.map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-all hover:shadow-sm hover:border-primary/40"
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {p.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  Код: {p.code}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && !isLoading && (
            <div className="col-span-full text-sm text-muted-foreground text-center py-6">
              Ничего не найдено
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
