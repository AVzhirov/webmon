'use client';

import { MoneyByPersonView } from './money-by-person-view';
import { Monitor } from 'lucide-react';

export function StationsView() {
  return (
    <MoneyByPersonView
      endpoint="/api/reports/stations"
      title="Станции"
      subtitle="Выручка по кассовым станциям с детализацией"
      personLabel="Станции"
      icon={Monitor}
    />
  );
}
