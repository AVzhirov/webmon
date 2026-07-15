'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface ReportColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  className?: string;
  width?: string;
  render: (row: T, index: number) => ReactNode;
}

interface ReportTableProps<T> {
  columns: ReportColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string | number;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T, index: number) => string;
  emptyText?: string;
  maxRows?: number;
  dense?: boolean;
}

export function ReportTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  rowClassName,
  emptyText = 'Нет данных',
  maxRows,
  dense,
}: ReportTableProps<T>) {
  const visible = maxRows ? rows.slice(0, maxRows) : rows;

  if (rows.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="overflow-x-auto scroll-area-thin">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    'px-3 py-2.5 font-medium text-muted-foreground uppercase tracking-wide text-xs',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.align !== 'right' && col.align !== 'center' && 'text-left',
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {visible.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-muted/40',
                  rowClassName?.(row, i),
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      dense ? 'px-3 py-1.5' : 'px-3 py-2.5',
                      col.align === 'right' && 'text-right tabular-nums',
                      col.align === 'center' && 'text-center',
                      col.className,
                    )}
                  >
                    {col.render(row, i)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {maxRows && rows.length > maxRows && (
        <div className="border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground text-center">
          Показано {maxRows} из {rows.length}. Используйте поиск для фильтрации.
        </div>
      )}
    </div>
  );
}
