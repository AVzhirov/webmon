'use client';

import { useAppStore, type ViewId } from '@/store/webmonitor';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Scale,
  Wallet,
  UtensilsCrossed,
  ClipboardList,
  Users,
  CreditCard,
  Monitor,
  Receipt,
  Map,
  CalendarClock,
  Printer,
  Send,
  UserCircle,
  UtensilsCrossed as Logo,
  ChevronRight,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  id: ViewId;
  label: string;
  icon: LucideIcon;
  description: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Обзор',
    items: [
      {
        id: 'dashboard',
        label: 'Дашборд',
        icon: LayoutDashboard,
        description: 'Сводка дня',
      },
    ],
  },
  {
    title: 'Финансы',
    items: [
      {
        id: 'balance',
        label: 'Баланс',
        icon: Scale,
        description: 'По типам оплат',
      },
      {
        id: 'revenue',
        label: 'Выручка',
        icon: Wallet,
        description: 'Итоговые суммы',
      },
      {
        id: 'open-sum',
        label: 'Открытые суммы',
        icon: ClipboardList,
        description: 'Активные заказы',
      },
    ],
  },
  {
    title: 'Операции',
    items: [
      {
        id: 'checks',
        label: 'Чеки',
        icon: Receipt,
        description: 'Список и детали',
      },
      {
        id: 'orders',
        label: 'Заказы',
        icon: ClipboardList,
        description: 'По официантам',
      },
      {
        id: 'dishes',
        label: 'Расход блюд',
        icon: UtensilsCrossed,
        description: 'Продажи блюд',
      },
    ],
  },
  {
    title: 'Персонал и станции',
    items: [
      {
        id: 'waiters',
        label: 'Официанты',
        icon: Users,
        description: 'Выручка по официантам',
      },
      {
        id: 'cashiers',
        label: 'Кассиры',
        icon: CreditCard,
        description: 'Выручка по кассирам',
      },
      {
        id: 'stations',
        label: 'Станции',
        icon: Monitor,
        description: 'По станциям',
      },
      {
        id: 'personal',
        label: 'Персонал',
        icon: UserCircle,
        description: 'Справочник',
      },
    ],
  },
  {
    title: 'Залы и система',
    items: [
      {
        id: 'hall-plans',
        label: 'Планы залов',
        icon: Map,
        description: 'Карта столов',
      },
      {
        id: 'cash-info',
        label: 'Кассовая дата',
        icon: CalendarClock,
        description: 'Дата и период',
      },
      {
        id: 'service-print',
        label: 'Сервис-печать',
        icon: Printer,
        description: 'Принтеры',
      },
      {
        id: 'messages',
        label: 'Сообщения',
        icon: Send,
        description: 'Отправка персоналу',
      },
      {
        id: 'settings',
        label: 'Настройки',
        icon: Settings,
        description: 'Серверы и пользователи',
      },
    ],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Лого */}
      <div className="flex h-16 items-center gap-2.5 px-5 border-b border-sidebar-border shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
          <Logo className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-tight tracking-tight">
            RK Web Monitor
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            R-Keeper 7
          </div>
        </div>
      </div>

      {/* Навигация */}
      <nav className="flex-1 overflow-y-auto scroll-area-thin px-3 py-4 space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = view === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setView(item.id);
                    onNavigate?.();
                  }}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-all',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm shadow-sidebar-primary/20'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4.5 w-4.5 shrink-0 transition-colors',
                      isActive
                        ? 'text-sidebar-primary-foreground'
                        : 'text-muted-foreground group-hover:text-sidebar-accent-foreground',
                    )}
                  />
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium truncate">{item.label}</div>
                    <div
                      className={cn(
                        'text-[10px] truncate',
                        isActive ? 'text-sidebar-primary-foreground/70' : 'text-muted-foreground/60',
                      )}
                    >
                      {item.description}
                    </div>
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Низ — версия */}
      <div className="border-t border-sidebar-border px-4 py-3 shrink-0">
        <div className="text-[10px] text-muted-foreground/70 text-center">
          v2.0 · Modern UI · 2024
        </div>
      </div>
    </div>
  );
}
