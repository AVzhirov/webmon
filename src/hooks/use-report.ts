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

/** Хук с автоматическим рефечом при изменении refreshKey. */
export function useReport<T>(endpoint: string, enabled = true) {
  const refreshKey = useAppStore((s) => s.refreshKey);
  return useQuery<T>({
    queryKey: [endpoint, refreshKey],
    queryFn: () => fetchJson<T>(endpoint),
    enabled,
    staleTime: 30_000,
    retry: 1,
  });
}
