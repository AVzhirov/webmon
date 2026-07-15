'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface SectionCardProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  loading?: boolean;
}

export function SectionCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
  contentClassName,
  loading,
}: SectionCardProps) {
  return (
    <Card className={cn('gap-3', className)}>
      {(title || action) && (
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {Icon && (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <Icon className="h-4.5 w-4.5" />
                </div>
              )}
              <div className="min-w-0">
                {title && (
                  <CardTitle className="truncate text-base font-semibold">
                    {title}
                  </CardTitle>
                )}
                {description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {description}
                  </p>
                )}
              </div>
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
        </CardHeader>
      )}
      <CardContent className={cn('pt-0', contentClassName)}>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
