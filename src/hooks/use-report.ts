'use client';

import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '@/store/webmonitor';

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) {
    throw new Error(`Request failed: ${r.status}`);
  }
  return r.json() as Promise<T>;
}

/** Хук с автоматическим рефечом при изменении refreshKey.
 *  Автоматически добавляет serverId к запросу.
 */
export function useReport<T>(endpoint: string, enabled = true) {
  const refreshKey = useAppStore((s) => s.refreshKey);
  const server = useAppStore((s) => s.server);
  const multiServerIds = useAppStore((s) => s.multiServerIds);

  // Добавляем serverId к URL
  let url = endpoint;
  if (server?.id) {
    const sep = endpoint.includes('?') ? '&' : '?';
    url = `${endpoint}${sep}serverId=${server.id}`;
  }

  // В мульти-серверном режиме добавляем все IDs
  if (multiServerIds.length > 1) {
    const sep = url.includes('?') ? '&' : '?';
    url = `${url}${sep}multiIds=${multiServerIds.join(',')}`;
  }

  return useQuery<T>({
    queryKey: [url, refreshKey],
    queryFn: () => fetchJson<T>(url),
    enabled,
    staleTime: 30_000,
    retry: 1,
  });
}
