'use client';

import { MoneyByPersonView } from './money-by-person-view';
import { CreditCard } from 'lucide-react';

export function CashiersView() {
  return (
    <MoneyByPersonView
      endpoint="/api/reports/cashiers"
      title="Кассиры"
      subtitle="Выручка по кассирам с детализацией по валютам и способам оплат"
      personLabel="Кассиры"
      icon={CreditCard}
    />
  );
}
