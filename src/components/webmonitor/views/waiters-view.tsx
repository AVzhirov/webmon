'use client';

import { MoneyByPersonView } from './money-by-person-view';
import { Users } from 'lucide-react';

export function WaitersView() {
  return (
    <MoneyByPersonView
      endpoint="/api/reports/waiters"
      title="Официанты"
      subtitle="Выручка по официантам с детализацией по валютам и способам оплат"
      personLabel="Официанты"
      icon={Users}
    />
  );
}
