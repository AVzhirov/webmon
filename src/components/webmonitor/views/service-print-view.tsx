'use client';

import { useReport } from '@/hooks/use-report';
import { SectionCard } from '../ui/section-card';
import { KpiCard } from '../ui/kpi-card';
import { StatusBadge } from '../ui/status-badge';
import type { ServicePrintReport, ServicePrinter } from '@/lib/rk7/types';
import { Printer, Cpu, Cable, Activity, MessageSquare } from 'lucide-react';

export function ServicePrintView() {
  const { data, isLoading } = useReport<ServicePrintReport>('/api/reports/service-print');

  const printers = data?.printers ?? [];
  const withMessages = printers.filter((p) => p.messages.length > 0).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Сервис-печать</h1>
        <p className="text-sm text-muted-foreground">
          Конфигурация принтеров и сервисных сообщений на станциях
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Принтеров"
          value={printers.length.toString()}
          subtitle="Зарегистрировано"
          icon={Printer}
          accent="primary"
          loading={isLoading}
        />
        <KpiCard
          title="Станций"
          value={new Set(printers.map((p) => p.station)).size.toString()}
          subtitle="Обслуживают"
          icon={Cpu}
          accent="accent"
          loading={isLoading}
        />
        <KpiCard
          title="Активных принтеров"
          value={printers.filter((p) => p.assigned !== 'Не перенаправлен').length.toString()}
          subtitle="С назначением"
          icon={Cable}
          accent="chart-3"
          loading={isLoading}
        />
        <KpiCard
          title="Сообщений"
          value={withMessages.toString()}
          subtitle="Принтеров с событиями"
          icon={MessageSquare}
          accent="chart-4"
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {printers.map((p, i) => (
          <PrinterCard key={i} printer={p} />
        ))}
        {printers.length === 0 && !isLoading && (
          <div className="col-span-full text-sm text-muted-foreground text-center py-6">
            Нет принтеров
          </div>
        )}
      </div>
    </div>
  );
}

function PrinterCard({ printer }: { printer: ServicePrinter }) {
  const isActive = printer.assigned !== 'Не перенаправлен';
  return (
    <div className="rounded-xl border bg-card overflow-hidden transition-all hover:shadow-md">
      <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Printer className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">Принтер «{printer.printer}»</div>
            <div className="text-xs text-muted-foreground">
              #{printer.num} · {printer.station} · {printer.port}
            </div>
          </div>
        </div>
        <StatusBadge
          variant={isActive ? 'success' : 'muted'}
          dot={isActive}
        >
          {isActive ? 'Активен' : 'Не настроен'}
        </StatusBadge>
      </div>

      <div className="p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Станция</div>
            <div className="font-medium">{printer.station}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Порт</div>
            <div className="font-medium tabular-nums">{printer.port}</div>
          </div>
          <div className="col-span-2">
            <div className="text-xs text-muted-foreground">Назначение</div>
            <div className="font-medium">{printer.assigned}</div>
          </div>
        </div>

        {printer.messages.length > 0 && (
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
              <Activity className="h-3.5 w-3.5" />
              Сервисные сообщения ({printer.messages.length})
            </div>
            <div className="space-y-1.5">
              {printer.messages.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="font-medium">{m.sender}</span>
                  <span className="text-muted-foreground tabular-nums">{m.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {printer.messages.length === 0 && (
          <div className="text-xs text-muted-foreground/70 text-center py-1">
            Сообщений нет
          </div>
        )}
      </div>
    </div>
  );
}
