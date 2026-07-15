/** Форматирование денежных сумм в стиле RK7 (₽). */
export function formatMoney(value: number, withSymbol = true): string {
  const v = Math.abs(value).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = value < 0 ? '−' : '';
  return withSymbol ? `${sign}${v} ₽` : `${sign}${v}`;
}

/** Краткий формат (123 456 ₽). */
export function formatMoneyShort(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace('.', ',')} млн ₽`;
  }
  if (Math.abs(value) >= 100_000) {
    return `${Math.round(value / 1000)}K ₽`;
  }
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }) + ' ₽';
}

/** Формат количества (1 шт / 1.5 кг). */
export function formatQty(value: number): string {
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(2).replace('.', ',');
}

/** Время чека (HH:MM) из строки "HH:MM". */
export function formatTime(time: string): string {
  return time.slice(0, 5);
}

/** Дата из ISO в ru-формат. */
export function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

/** Срез массива топ-N. */
export function takeTop<T>(arr: T[], n: number): T[] {
  return arr.slice(0, n);
}

/** Процент от суммы. */
export function pct(part: number, total: number): number {
  if (!total) return 0;
  return (part / total) * 100;
}
