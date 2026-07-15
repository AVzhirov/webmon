'use client';

import { useAppStore } from '@/store/webmonitor';
import { LoginScreen } from '@/components/webmonitor/login-screen';
import { AppShell } from '@/components/webmonitor/app-shell';
import { QueryProvider } from '@/components/query-provider';

export default function Home() {
  const user = useAppStore((s) => s.user);
  const server = useAppStore((s) => s.server);

  return (
    <QueryProvider>
      {user && server ? <AppShell /> : <LoginScreen />}
    </QueryProvider>
  );
}
