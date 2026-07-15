'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-primary/15 text-primary',
  success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  danger: 'bg-destructive/15 text-destructive',
  info: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  muted: 'bg-muted text-muted-foreground',
};

const dotClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-primary',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-destructive',
  info: 'bg-sky-500',
  muted: 'bg-muted-foreground',
};

export const StatusBadge = memo(function StatusBadge({ children, variant = 'default', className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full animate-pulse-glow', dotClasses[variant])}
        />
      )}
      {children}
    </span>
  );
})
