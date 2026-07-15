'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAppStore, type CurrentUser } from '@/store/webmonitor';
import type { RKServer } from '@/lib/rk7/types';
import { SettingsDialog } from './settings-dialog';
import {
  UtensilsCrossed,
  ChefHat,
  Wine,
  LogIn,
  Loader2,
  CheckCircle2,
  Server,
  Lock,
  User as UserIcon,
  Settings,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServerItem {
  id: string;
  name: string;
  type: string;
  address: string;
  status: 'online' | 'offline' | 'demo';
  version?: string;
  isDefault?: boolean;
}

export function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [serversLoading, setServersLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const login = useAppStore((s) => s.login);
  const { toast } = useToast();

  const loadServers = async () => {
    setServersLoading(true);
    try {
      const r = await fetch('/api/servers', { cache: 'no-store' });
      const data = await r.json();
      setServers(data);
      // Авто-выбрать сервер по умолчанию или первый
      const defaultServer = data.find((s: ServerItem) => s.isDefault) ?? data[0]
      if (defaultServer && !selectedServerId) {
        setSelectedServerId(defaultServer.id);
      }
    } catch (e) {
      console.error('Failed to load servers:', e);
    } finally {
      setServersLoading(false);
    }
  };

  useEffect(() => {
    loadServers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast({ title: 'Введите имя пользователя', variant: 'destructive' });
      return;
    }
    if (!password.trim()) {
      toast({ title: 'Введите пароль', variant: 'destructive' });
      return;
    }
    const server = servers.find((s) => s.id === selectedServerId);
    if (!server) {
      toast({ title: 'Выберите сервер', variant: 'destructive' });
      return;
    }

    setIsAuthenticating(true);
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          serverId: server.id,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        throw new Error(data.error || 'Ошибка авторизации');
      }
      const user: CurrentUser = data.user;
      login(user, server as unknown as RKServer);
      toast({
        title: 'Добро пожаловать!',
        description: `Подключение к серверу «${server.name}» установлено`,
      });
    } catch (e) {
      toast({
        title: 'Ошибка входа',
        description: e instanceof Error ? e.message : 'Не удалось войти',
        variant: 'destructive',
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="pointer-events-none absolute inset-0 opacity-[0.04]">
        <UtensilsCrossed className="absolute top-20 left-20 h-32 w-32 rotate-12" />
        <ChefHat className="absolute bottom-20 right-20 h-40 w-40 -rotate-12" />
        <Wine className="absolute top-1/3 right-1/4 h-24 w-24" />
        <UtensilsCrossed className="absolute bottom-1/3 left-1/4 h-28 w-28 rotate-45" />
      </div>

      {/* Кнопка настроек в углу */}
      <button
        onClick={() => setSettingsOpen(true)}
        className="absolute top-4 right-4 z-20 inline-flex items-center gap-2 rounded-lg border bg-card/80 px-3 py-2 text-sm backdrop-blur-md hover:bg-card transition-colors"
        title="Настройки серверов и пользователей"
      >
        <Settings className="h-4 w-4" />
        <span className="hidden sm:inline">Настройки</span>
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md p-6"
      >
        <Card className="overflow-hidden border-border/50 backdrop-blur-xl bg-card/80 shadow-2xl">
          <CardHeader className="space-y-4 pb-6">
            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                <UtensilsCrossed className="h-6 w-6" />
                <div className="absolute inset-0 rounded-2xl bg-primary/40 animate-pulse-glow" />
              </div>
              <div>
                <CardTitle className="text-xl tracking-tight">RK Web Monitor</CardTitle>
                <CardDescription className="text-xs">
                  R-Keeper 7 · Мониторинг продаж
                </CardDescription>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">С возвращением</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Войдите в систему для просмотра продаж в реальном времени
              </p>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs font-medium">
                  Пользователь
                </Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    className="pl-9 h-11"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-medium">
                  Пароль
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 h-11"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Сервер RK7</Label>
                {serversLoading ? (
                  <div className="flex items-center gap-2 h-11 px-3 rounded-md border border-dashed text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Загрузка списка серверов…
                  </div>
                ) : servers.length === 0 ? (
                  <div className="flex items-center gap-2 h-11 px-3 rounded-md border border-dashed text-sm text-muted-foreground">
                    <Info className="h-4 w-4" />
                    Нет настроенных серверов. Откройте «Настройки».
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto scroll-area-thin">
                    {servers.map((server) => (
                      <button
                        key={server.id}
                        type="button"
                        onClick={() => setSelectedServerId(server.id)}
                        className={cn(
                          'group flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-all',
                          selectedServerId === server.id
                            ? 'border-primary bg-primary/5 shadow-sm shadow-primary/20'
                            : 'border-border hover:border-primary/50 hover:bg-muted/40',
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={cn(
                              'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                              selectedServerId === server.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary',
                            )}
                          >
                            <Server className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate flex items-center gap-1.5">
                              {server.name}
                              {server.isDefault && (
                                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-primary/70">
                                  · по умолчанию
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground tabular-nums truncate">
                              {server.type === 'demo' ? 'Демо-режим' : server.address}
                            </div>
                          </div>
                        </div>
                        {selectedServerId === server.id && (
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full h-11 text-sm font-medium shadow-lg shadow-primary/30"
                disabled={isAuthenticating || servers.length === 0}
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Подключение…
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Войти в систему
                  </>
                )}
              </Button>

              <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Info className="h-3 w-3 text-primary" />
                  <span className="font-medium text-primary">Первый вход</span>
                </div>
                Логин по умолчанию: <code className="font-mono">admin</code> · пароль:{' '}
                <code className="font-mono">admin</code>. Смените пароль в настройках.
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          © 2024 · Современная панель мониторинга R-Keeper 7
        </div>
      </motion.div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} onServersChanged={loadServers} />
    </div>
  );
}
