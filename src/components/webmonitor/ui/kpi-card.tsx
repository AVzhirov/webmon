'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  accent?: 'primary' | 'accent' | 'chart-3' | 'chart-4' | 'chart-5';
  trend?: number; // positive = up
  loading?: boolean;
}

const accentMap: Record<NonNullable<KpiCardProps['accent']>, string> = {
  primary: 'text-primary bg-primary/10',
  accent: 'text-accent-foreground bg-accent/20',
  'chart-3': 'text-chart-3 bg-chart-3/15',
  'chart-4': 'text-chart-4 bg-chart-4/15',
  'chart-5': 'text-chart-5 bg-chart-5/15',
};

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = 'primary',
  trend,
  loading,
}: KpiCardProps) {
  return (
    <Card className="relative overflow-hidden gap-3 transition-all hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5">
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {title}
            </CardTitle>
          </div>
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl',
              accentMap[accent],
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        {loading ? (
          <Skeleton className="h-9 w-32" />
        ) : (
          <div className="text-2xl font-bold tracking-tight tabular-nums">
            {value}
          </div>
        )}
        <div className="mt-1 flex items-center gap-2">
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
          {typeof trend === 'number' && !loading && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-xs font-medium',
                trend >= 0 ? 'text-primary' : 'text-destructive',
              )}
            >
              {trend >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
        </div>
      </CardContent>
      {/* Декоративная полоска снизу */}
      <div
        className={cn(
          'absolute bottom-0 left-0 h-0.5 w-full opacity-60',
          accent === 'primary' && 'bg-primary',
          accent === 'accent' && 'bg-accent',
          accent === 'chart-3' && 'bg-chart-3',
          accent === 'chart-4' && 'bg-chart-4',
          accent === 'chart-5' && 'bg-chart-5',
        )}
      />
    </Card>
  );
}
