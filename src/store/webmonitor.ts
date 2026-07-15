import { create } from 'zustand';
import type { RKServer } from '@/lib/rk7/types';

export type ViewId =
  | 'dashboard'
  | 'balance'
  | 'revenue'
  | 'dishes'
  | 'orders'
  | 'waiters'
  | 'cashiers'
  | 'stations'
  | 'open-sum'
  | 'checks'
  | 'hall-plans'
  | 'cash-info'
  | 'service-print'
  | 'messages'
  | 'personal';

interface AuthState {
  user: string | null;
  server: RKServer | null;
}

interface AppState extends AuthState {
  view: ViewId;
  selectedCheckId: number | null;
  selectedHallId: number | null;
  refreshKey: number; // bump to force refetch
  lastRefreshedAt: Date | null;

  login: (user: string, server: RKServer) => void;
  logout: () => void;
  setView: (view: ViewId) => void;
  setSelectedCheckId: (id: number | null) => void;
  setSelectedHallId: (id: number | null) => void;
  refresh: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  server: null,
  view: 'dashboard',
  selectedCheckId: null,
  selectedHallId: null,
  refreshKey: 0,
  lastRefreshedAt: null,

  login: (user, server) =>
    set({
      user,
      server,
      view: 'dashboard',
      lastRefreshedAt: new Date(),
    }),
  logout: () =>
    set({
      user: null,
      server: null,
      view: 'dashboard',
      selectedCheckId: null,
      selectedHallId: null,
    }),
  setView: (view) =>
    set({ view, selectedCheckId: view === 'checks' ? null : null }),
  setSelectedCheckId: (id) => set({ selectedCheckId: id }),
  setSelectedHallId: (id) => set({ selectedHallId: id }),
  refresh: () =>
    set((s) => ({
      refreshKey: s.refreshKey + 1,
      lastRefreshedAt: new Date(),
    })),
}));
