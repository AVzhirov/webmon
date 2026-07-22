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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAppStore, type CurrentUser } from '@/store/webmonitor';
import type { RKServer } from '@/lib/rk7/types';
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
  Info,
  Settings,
  Plus,
  Trash2,
  Pencil,
  Save,
  Crown,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SETUP_PASSWORD = '377901';

interface ServerItem {
  id: string;
  name: string;
  type: string;
  address: string;
  status: 'online' | 'offline' | 'demo';
  version?: string;
  isDefault?: boolean;
  hasPassword?: boolean;
}

export function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [serversLoading, setServersLoading] = useState(true);
  const [setupOpen, setSetupOpen] = useState(false);
  const login = useAppStore((s) => s.login);
  const { toast } = useToast();

  const loadServers = async () => {
    setServersLoading(true);
    try {
      const r = await fetch('/api/servers', { cache: 'no-store' });
      const data = await r.json();
      setServers(data);
      const defaultServer = data.find((s: ServerItem) => s.isDefault) ?? data[0];
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

      {/* Settings button (gear icon, top-right corner) */}
      <button
        onClick={() => setSetupOpen(true)}
        className="absolute top-4 right-4 z-20 inline-flex items-center gap-2 rounded-lg border bg-card/80 px-3 py-2 text-sm backdrop-blur-md hover:bg-card transition-colors"
        title="Server settings"
      >
        <Settings className="h-4 w-4" />
        <span className="hidden sm:inline">Servers</span>
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
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-medium mb-1">
                      <Info className="h-4 w-4" />
                      Нет настроенных серверов
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Нажмите кнопку «Servers» в правом верхнем углу, чтобы добавить сервер R-Keeper 7.
                    </p>
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
          © 2026 · Современная панель мониторинга R-Keeper 7
        </div>
      </motion.div>

      {/* Setup dialog (password-protected, no auth required) */}
      <SetupDialog open={setupOpen} onOpenChange={setSetupOpen} onServersChanged={loadServers} />
    </div>
  );
}

// ============================================================
// Setup dialog — manage servers from login screen
// Protected by password 377901 (no user login required)
// ============================================================

function SetupDialog({
  open,
  onOpenChange,
  onServersChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onServersChanged?: () => void;
}) {
  const [passwordEntered, setPasswordEntered] = useState(false);
  const [pwdInput, setPwdInput] = useState('');
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ServerItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'demo' | 'tcp' | 'http'>('demo');
  const [formAddress, setFormAddress] = useState('public/demo-data/xml');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formCryptKey, setFormCryptKey] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formEnabled, setFormEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadServers = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/setup/servers?pwd=${SETUP_PASSWORD}`, { cache: 'no-store' });
      if (r.ok) {
        const data = await r.json();
        setServers(data);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (passwordEntered && open) {
      loadServers();
    }
  }, [passwordEntered, open]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdInput === SETUP_PASSWORD) {
      setPasswordEntered(true);
      setPwdInput('');
    } else {
      toast({ title: 'Неверный пароль', variant: 'destructive' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formAddress.trim()) {
      toast({ title: 'Заполните имя и адрес', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: formName.trim(),
        type: formType,
        address: formAddress.trim(),
        cryptKey: formCryptKey.trim() || undefined,
        username: formUsername.trim() || undefined,
        enabled: formEnabled,
        isDefault: formIsDefault,
      };
      if (formPassword) payload.password = formPassword;

      const r = await fetch(`/api/setup/servers?pwd=${SETUP_PASSWORD}`, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Error');
      toast({ title: editing ? 'Сервер обновлён' : 'Сервер добавлен' });
      setShowForm(false);
      setEditing(null);
      resetForm();
      loadServers();
      onServersChanged?.();
    } catch (e) {
      toast({
        title: 'Ошибка сохранения',
        description: e instanceof Error ? e.message : 'Не удалось сохранить',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Удалить сервер «${name}»?`)) return;
    const r = await fetch(`/api/setup/servers?pwd=${SETUP_PASSWORD}&id=${id}`, { method: 'DELETE' });
    if (r.ok) {
      toast({ title: `Сервер «${name}» удалён` });
      loadServers();
      onServersChanged?.();
    } else {
      const data = await r.json().catch(() => ({ error: 'Ошибка' }));
      toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
    }
  };

  const handleSetDefault = async (id: string) => {
    await fetch(`/api/setup/servers?pwd=${SETUP_PASSWORD}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isDefault: true }),
    });
    toast({ title: 'Сервер по умолчанию обновлён' });
    loadServers();
    onServersChanged?.();
  };

  const startEdit = (s: ServerItem) => {
    setEditing(s);
    setFormName(s.name);
    setFormType(s.type as 'demo' | 'tcp' | 'http');
    setFormAddress(s.address);
    setFormUsername('');
    setFormPassword('');
    setFormCryptKey('');
    setFormIsDefault(s.isDefault ?? false);
    setFormEnabled(true);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormName('');
    setFormType('demo');
    setFormAddress('public/demo-data/xml');
    setFormUsername('');
    setFormPassword('');
    setFormCryptKey('');
    setFormIsDefault(false);
    setFormEnabled(true);
  };

  const startAdd = () => {
    setEditing(null);
    resetForm();
    setShowForm(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5 text-primary" />
            Управление серверами
          </DialogTitle>
          <DialogDescription className="text-xs">
            Добавление и настройка серверов R-Keeper 7
          </DialogDescription>
        </DialogHeader>

        {!passwordEntered ? (
          <div className="p-8">
            <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-sm mx-auto">
              <div className="text-center">
                <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-base font-semibold">Доступ к настройкам</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Введите пароль для управления серверами
                </p>
              </div>
              <Input
                type="password"
                value={pwdInput}
                onChange={(e) => setPwdInput(e.target.value)}
                placeholder="Пароль настроек"
                className="h-11 text-center text-lg"
                autoFocus
              />
              <Button type="submit" className="w-full h-11">
                <Lock className="h-4 w-4" />
                Войти в настройки
              </Button>
            </form>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto scroll-area-thin p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold">Серверы R-Keeper</h3>
                <p className="text-xs text-muted-foreground">
                  Добавьте серверы для мониторинга. Можно выбрать несколько одновременно.
                </p>
              </div>
              <Button size="sm" onClick={startAdd}>
                <Plus className="h-3.5 w-3.5" />
                Добавить
              </Button>
            </div>

            {showForm && (
              <form onSubmit={handleSave} className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 space-y-3 mb-4">
                <h4 className="text-sm font-semibold">{editing ? 'Редактирование сервера' : 'Новый сервер'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Название *</Label>
                    <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Главный ресторан" className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Тип сервера</Label>
                    <select value={formType} onChange={(e) => setFormType(e.target.value as 'demo' | 'tcp' | 'http')} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                      <option value="demo">Demo XML</option>
                      <option value="tcp">RK7 TCP (IP:port)</option>
                      <option value="http">RK7 HTTP (URL)</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Адрес *</Label>
                  <Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder={formType === 'demo' ? 'public/demo-data/xml' : '192.168.1.10:15551'} className="h-9 font-mono text-xs" />
                </div>
                {formType !== 'demo' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Логин RK7</Label>
                      <Input value={formUsername} onChange={(e) => setFormUsername(e.target.value)} placeholder="manager" className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Пароль RK7</Label>
                      <Input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder={editing?.hasPassword ? '•••• (не менять)' : 'пароль'} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">CryptKey</Label>
                      <Input value={formCryptKey} onChange={(e) => setFormCryptKey(e.target.value)} placeholder="опционально" className="h-9 font-mono text-xs" />
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="checkbox" checked={formEnabled} onChange={(e) => setFormEnabled(e.target.checked)} />
                    Включён
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="checkbox" checked={formIsDefault} onChange={(e) => setFormIsDefault(e.target.checked)} />
                    По умолчанию
                  </label>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <Button type="button" variant="outline" size="sm" onClick={() => { setShowForm(false); setEditing(null); resetForm(); }}>
                    <X className="h-3.5 w-3.5" /> Отмена
                  </Button>
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Сохранить
                  </Button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Загрузка…
              </div>
            ) : servers.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Нет настроенных серверов. Нажмите «Добавить» для создания.
              </div>
            ) : (
              <div className="space-y-2">
                {servers.map((s) => (
                  <div key={s.id} className={cn('flex items-center justify-between rounded-lg border bg-card px-4 py-3', s.isDefault && 'border-primary/40 bg-primary/5')}>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg shrink-0', s.type === 'demo' ? 'bg-accent/15 text-accent-foreground' : 'bg-primary/10 text-primary')}>
                        <Server className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{s.name}</span>
                          {s.isDefault && <span className="text-[10px] uppercase text-primary">по умолчанию</span>}
                          {!s.enabled && <span className="text-[10px] uppercase text-muted-foreground">отключён</span>}
                        </div>
                        <div className="text-xs text-muted-foreground tabular-nums truncate">
                          {s.type === 'demo' ? 'Demo XML' : s.type === 'tcp' ? 'RK7 TCP' : 'RK7 HTTP'} · {s.address}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!s.isDefault && (
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSetDefault(s.id)} title="Сделать по умолчанию">
                          <Crown className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => startEdit(s)} title="Редактировать">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:text-destructive" onClick={() => handleDelete(s.id, s.name)} title="Удалить">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 mb-1">
                <Info className="h-3 w-3 text-primary" />
                <span className="font-medium text-primary">Мульти-серверный режим</span>
              </div>
              После входа в систему вы можете выбрать несколько серверов одновременно
              на дашборде для просмотра сводной информации по сети ресторанов.
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
