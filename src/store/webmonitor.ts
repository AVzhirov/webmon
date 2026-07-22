import { create } from 'zustand'
import type { RKServer } from '@/lib/rk7/types'

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
  | 'personal'
  | 'settings'

export type UserRole = 'admin' | 'manager' | 'viewer'

export interface CurrentUser {
  id: string
  username: string
  displayName: string
  role: UserRole
}

interface AppState {
  user: CurrentUser | null
  server: RKServer | null
  multiServerIds: string[]
  view: ViewId
  selectedCheckId: number | null
  selectedHallId: number | null
  refreshKey: number
  lastRefreshedAt: Date | null
  settingsOpen: boolean

  login: (user: CurrentUser, server: RKServer | null) => void
  logout: () => void
  setView: (view: ViewId) => void
  setSelectedCheckId: (id: number | null) => void
  setSelectedHallId: (id: number | null) => void
  refresh: () => void
  openSettings: () => void
  closeSettings: () => void
  setMultiServerIds: (ids: string[]) => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  server: null,
  multiServerIds: [],
  view: 'dashboard',
  selectedCheckId: null,
  selectedHallId: null,
  refreshKey: 0,
  lastRefreshedAt: null,
  settingsOpen: false,

  login: (user, server) =>
    set({
      user,
      server,
      multiServerIds: server ? [server.id] : [],
      view: 'dashboard',
      lastRefreshedAt: new Date(),
    }),
  logout: () =>
    set({
      user: null,
      server: null,
      multiServerIds: [],
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
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  setMultiServerIds: (ids) => set({ multiServerIds: ids }),
}))
