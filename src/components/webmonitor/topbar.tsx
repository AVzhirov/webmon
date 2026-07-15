'use client';

import { useAppStore } from '@/store/webmonitor';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import { Sidebar } from './sidebar';
import { StatusBadge } from './ui/status-badge';
import {
  RefreshCw,
  Sun,
  Moon,
  LogOut,
  Menu,
  Server,
  Bell,
  Activity,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export function Topbar() {
  const { user, server, refresh, lastRefreshedAt, logout } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const initials = (user ?? '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-xl lg:px-6">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Меню</SheetTitle>
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Сервер */}
      <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5">
        <Server className="h-3.5 w-3.5 text-primary" />
        <div className="flex flex-col leading-tight">
          <span className="text-xs font-medium">{server?.name ?? '—'}</span>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {server?.address}
          </span>
        </div>
        <StatusBadge variant="success" dot className="ml-1">
          DEMO
        </StatusBadge>
      </div>

      <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
        <Activity className="h-3.5 w-3.5 text-primary" />
        <span>Онлайн</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Время / последнее обновление */}
      <div className="hidden lg:flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 tabular-nums">
          <Clock className="h-3.5 w-3.5" />
          {mounted && now ? now.toLocaleTimeString('ru-RU') : '—'}
        </div>
        {lastRefreshedAt && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground/60">·</span>
            <span>
              Обновлено {lastRefreshedAt.toLocaleTimeString('ru-RU')}
            </span>
          </div>
        )}
      </div>

      {/* Refresh */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => refresh()}
        title="Обновить данные"
        className="h-9 w-9"
      >
        <RefreshCw className="h-4 w-4" />
      </Button>

      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        title="Сменить тему"
        className="h-9 w-9"
      >
        {mounted && theme === 'dark' ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </Button>

      {/* Уведомления */}
      <Button variant="ghost" size="icon" className="h-9 w-9 relative">
        <Bell className="h-4 w-4" />
        <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-accent animate-pulse-glow" />
      </Button>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-lg border bg-card px-2 py-1.5 hover:bg-muted/40 transition-colors">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:flex flex-col leading-tight text-left">
              <span className="text-xs font-medium">{user}</span>
              <span className="text-[10px] text-muted-foreground">Менеджер</span>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{user}</span>
              <span className="text-xs text-muted-foreground font-normal">
                {server?.name}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => logout()}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
