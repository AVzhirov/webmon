'use client';

import { useAppStore } from '@/store/webmonitor';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { DashboardView } from './views/dashboard-view';
import { BalanceView } from './views/balance-view';
import { RevenueView } from './views/revenue-view';
import { DishesView } from './views/dishes-view';
import { OrdersView } from './views/orders-view';
import { WaitersView } from './views/waiters-view';
import { CashiersView } from './views/cashiers-view';
import { StationsView } from './views/stations-view';
import { OpenSumView } from './views/open-sum-view';
import { ChecksView } from './views/checks-view';
import { HallPlansView } from './views/hall-plans-view';
import { CashInfoView } from './views/cash-info-view';
import { ServicePrintView } from './views/service-print-view';
import { MessagesView } from './views/messages-view';
import { PersonalView } from './views/personal-view';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function AppShell() {
  const view = useAppStore((s) => s.view);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Десктопный сайдбар */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-sidebar-border">
        <Sidebar />
      </aside>

      {/* Главный контейнер */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto scroll-area-thin">
          <div className="mx-auto max-w-[1600px] p-4 lg:p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className={cn('animate-fade-in-up')}
              >
                {renderView(view)}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

function renderView(view: string) {
  switch (view) {
    case 'dashboard':
      return <DashboardView />;
    case 'balance':
      return <BalanceView />;
    case 'revenue':
      return <RevenueView />;
    case 'dishes':
      return <DishesView />;
    case 'orders':
      return <OrdersView />;
    case 'waiters':
      return <WaitersView />;
    case 'cashiers':
      return <CashiersView />;
    case 'stations':
      return <StationsView />;
    case 'open-sum':
      return <OpenSumView />;
    case 'checks':
      return <ChecksView />;
    case 'hall-plans':
      return <HallPlansView />;
    case 'cash-info':
      return <CashInfoView />;
    case 'service-print':
      return <ServicePrintView />;
    case 'messages':
      return <MessagesView />;
    case 'personal':
      return <PersonalView />;
    default:
      return <DashboardView />;
  }
}
