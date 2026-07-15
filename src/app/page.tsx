'use client';

import { useEffect, useState } from 'react';
import { useAppStore, type CurrentUser } from '@/store/webmonitor';
import { LoginScreen } from '@/components/webmonitor/login-screen';
import { AppShell } from '@/components/webmonitor/app-shell';
import { QueryProvider } from '@/components/query-provider';
import { Skeleton } from '@/components/ui/skeleton';
import type { RKServer } from '@/lib/rk7/types';

export default function Home() {
  const user = useAppStore((s) => s.user);
  const login = useAppStore((s) => s.login);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Проверить, есть ли активная сессия
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) {
          // Получим список серверов, чтобы восстановить выбранный
          fetch('/api/servers', { cache: 'no-store' })
            .then((r) => r.json())
            .then((servers: RKServer[]) => {
              const srv = servers.find((s) => s.isDefault) ?? servers[0] ?? null;
              login(data.user as CurrentUser, srv);
            })
            .catch(() => {
              login(data.user as CurrentUser, null);
            });
        }
      })
      .catch(() => {
        /* ignore */
      })
      .finally(() => setChecking(false));
  }, [login]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-3 w-64">
          <Skeleton className="h-12 w-12 rounded-xl mx-auto" />
          <Skeleton className="h-4 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <QueryProvider>
      {user ? <AppShell /> : <LoginScreen />}
    </QueryProvider>
  );
}
