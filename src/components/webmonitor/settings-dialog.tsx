'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { StatusBadge } from './ui/status-badge';
import {
  Server as ServerIcon,
  Users,
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  XCircle,
  Loader2,
  Lock,
  Shield,
  Save,
  Wifi,
  Key,
  User as UserIcon,
  Crown,
  Settings,
  Cpu,
  Network,
  RotateCw,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServerItem {
  id: string;
  name: string;
  type: 'demo' | 'tcp' | 'http';
  address: string;
  cryptKey?: string | null;
  username?: string | null;
  hasPassword?: boolean;
  enabled: boolean;
  isDefault: boolean;
}

interface UserItem {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'manager' | 'viewer';
  active: boolean;
  createdAt: string;
}

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onServersChanged?: () => void;
}

export function SettingsDialog({ open, onOpenChange, onServersChanged }: SettingsDialogProps) {
  const [tab, setTab] = useState<'servers' | 'users' | 'system'>('servers');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5 text-primary" />
            Настройки системы
          </DialogTitle>
          <DialogDescription className="text-xs">
            Управление серверами R-Keeper, пользователями и системными параметрами
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-4 grid grid-cols-3 w-auto max-w-md">
            <TabsTrigger value="servers" className="gap-1.5">
              <ServerIcon className="h-3.5 w-3.5" />
              Серверы
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Пользователи
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-1.5">
              <Cpu className="h-3.5 w-3.5" />
              Система
            </TabsTrigger>
          </TabsList>

          <TabsContent value="servers" className="flex-1 overflow-y-auto scroll-area-thin m-0 p-6 pt-4 mt-4">
            <ServersTab onChanged={onServersChanged} />
          </TabsContent>

          <TabsContent value="users" className="flex-1 overflow-y-auto scroll-area-thin m-0 p-6 pt-4 mt-4">
            <UsersTab />
          </TabsContent>

          <TabsContent value="system" className="flex-1 overflow-y-auto scroll-area-thin m-0 p-6 pt-4 mt-4">
            <SystemTab />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Servers tab
// ============================================================

function ServersTab({ onChanged }: { onChanged?: () => void }) {
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ServerItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/servers', { cache: 'no-store' });
      if (r.status === 401) {
        toast({
          title: 'Требуется авторизация',
          description: 'Войдите как admin для управления серверами',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      const data = await r.json();
      setServers(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Получаем cookie сессии — если есть, загружаем
      // Если сессии нет, разрешаем просмотр (для первичной настройки)
      load();
    }
  }, [load]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Удалить сервер «${name}»? Действие необратимо.`)) return;
    const r = await fetch(`/api/admin/servers?id=${id}`, { method: 'DELETE' });
    if (r.ok) {
      toast({ title: `Сервер «${name}» удалён` });
      load();
      onChanged?.();
    } else {
      const data = await r.json().catch(() => ({ error: 'Ошибка удаления' }));
      toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
    }
  };

  const handleSetDefault = async (id: string) => {
    const r = await fetch('/api/admin/servers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isDefault: true }),
    });
    if (r.ok) {
      toast({ title: 'Сервер по умолчанию обновлён' });
      load();
      onChanged?.();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Серверы R-Keeper</h3>
          <p className="text-xs text-muted-foreground">
            Список серверов для подключения. Можно добавлять, редактировать и удалять.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Добавить
        </Button>
      </div>

      {showForm && (
        <ServerForm
          initial={editing}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            load();
            onChanged?.();
          }}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Загрузка…
        </div>
      ) : servers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Нет настроенных серверов. Нажмите «Добавить» для создания первого.
        </div>
      ) : (
        <div className="space-y-2">
          {servers.map((s) => (
            <div
              key={s.id}
              className={cn(
                'flex items-center justify-between rounded-lg border bg-card px-4 py-3',
                s.isDefault && 'border-primary/40 bg-primary/5',
              )}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg shrink-0',
                    s.type === 'demo' ? 'bg-accent/15 text-accent-foreground' : 'bg-primary/10 text-primary',
                  )}
                >
                  <ServerIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{s.name}</span>
                    {s.isDefault && <StatusBadge variant="success">По умолчанию</StatusBadge>}
                    {!s.enabled && <StatusBadge variant="muted">Отключён</StatusBadge>}
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums truncate">
                    <TypeLabel type={s.type} /> · {s.address}
                  </div>
                  {(s.username || s.cryptKey) && (
                    <div className="text-[10px] text-muted-foreground/70 mt-0.5 flex items-center gap-2">
                      {s.username && <span>👤 {s.username}</span>}
                      {s.cryptKey && <span>🔑 cryptKey установлен</span>}
                      {s.hasPassword && <span>🔒 пароль установлен</span>}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <TestButton server={s} />
                {!s.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => handleSetDefault(s.id)}
                    title="Сделать сервером по умолчанию"
                  >
                    <Crown className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => {
                    setEditing(s);
                    setShowForm(true);
                  }}
                  title="Редактировать"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(s.id, s.name)}
                  title="Удалить"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TypeLabel({ type }: { type: string }) {
  if (type === 'demo') return '📊 Демо-XML';
  if (type === 'tcp') return '🌐 RK7 TCP';
  if (type === 'http') return '🔗 RK7 HTTP';
  return type;
}

function TestButton({ server }: { server: ServerItem }) {
  const [state, setState] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [message, setMessage] = useState<string>('');

  const handleTest = async () => {
    setState('testing');
    try {
      const r = await fetch('/api/admin/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: server.type, address: server.address }),
      });
      const data = await r.json();
      if (data.ok) {
        setState('ok');
        setMessage(data.message || 'OK');
      } else {
        setState('fail');
        setMessage(data.error || 'Ошибка');
      }
    } catch (e) {
      setState('fail');
      setMessage(String(e));
    }
  };

  return (
    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={handleTest} title="Проверить соединение">
      {state === 'idle' && <Wifi className="h-3.5 w-3.5" />}
      {state === 'testing' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {state === 'ok' && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
      {state === 'fail' && <XCircle className="h-3.5 w-3.5 text-destructive" />}
    </Button>
  );
}

function ServerForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: ServerItem | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<'demo' | 'tcp' | 'http'>(initial?.type ?? 'demo');
  const [address, setAddress] = useState(initial?.address ?? 'public/demo-data/xml');
  const [cryptKey, setCryptKey] = useState(initial?.cryptKey ?? '');
  const [username, setUsername] = useState(initial?.username ?? '');
  const [password, setPassword] = useState('');
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) {
      toast({ title: 'Заполните имя и адрес', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        type,
        address: address.trim(),
        cryptKey: cryptKey.trim() || undefined,
        username: username.trim() || undefined,
        enabled,
        isDefault,
      };
      if (password) payload.password = password;

      const r = await fetch('/api/admin/servers', {
        method: initial ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initial ? { id: initial.id, ...payload } : payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Ошибка');
      toast({ title: initial ? 'Сервер обновлён' : 'Сервер добавлен' });
      onSaved();
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

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">
          {initial ? 'Редактирование сервера' : 'Новый сервер'}
        </h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Название *</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например: Главный ресторан"
            className="h-9"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Тип сервера</Label>
          <select
            value={type}
            onChange={(e) => {
              const t = e.target.value as typeof type;
              setType(t);
              if (t === 'demo' && !address) setAddress('public/demo-data/xml');
              if (t === 'tcp' && !address) setAddress('192.168.1.10:15551');
              if (t === 'http' && !address) setAddress('http://192.168.1.10/rk7/api');
            }}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="demo">📊 Демо-XML (папка с файлами)</option>
            <option value="tcp">🌐 RK7 TCP (IP:порт)</option>
            <option value="http">🔗 RK7 HTTP (URL)</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">
          {type === 'demo' && 'Путь к папке с XML-отчётами'}
          {type === 'tcp' && 'IP-адрес и порт (например: 192.168.1.10:15551)'}
          {type === 'http' && 'URL эндпоинта RK7 (например: http://server/rk7)'}
          {' '}*
        </Label>
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={type === 'demo' ? 'public/demo-data/xml' : type === 'tcp' ? '192.168.1.10:15551' : 'http://...'}
          className="h-9 font-mono text-xs"
          required
        />
      </div>

      {type !== 'demo' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <UserIcon className="h-3 w-3" /> Логин RK7
            </Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="manager"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Lock className="h-3 w-3" /> Пароль RK7
            </Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={initial?.hasPassword ? '•••• (оставьте пустым — не менять)' : 'пароль'}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Key className="h-3 w-3" /> CryptKey
            </Label>
            <Input
              value={cryptKey}
              onChange={(e) => setCryptKey(e.target.value)}
              placeholder="опционально"
              className="h-9 font-mono text-xs"
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 pt-1">
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded"
          />
          Включён
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="rounded"
          />
          По умолчанию
        </label>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Сохранить
        </Button>
      </div>
    </form>
  );
}

// ============================================================
// Users tab
// ============================================================

function UsersTab() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/users', { cache: 'no-store' });
      if (r.status === 401 || r.status === 403) {
        toast({
          title: 'Недостаточно прав',
          description: 'Нужен вход как администратор',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      const data = await r.json();
      setUsers(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`Удалить пользователя «${username}»?`)) return;
    const r = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
    if (r.ok) {
      toast({ title: `Пользователь «${username}» удалён` });
      load();
    } else {
      const data = await r.json().catch(() => ({ error: 'Ошибка' }));
      toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
    }
  };

  const handleToggleActive = async (u: UserItem) => {
    const r = await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id, active: !u.active }),
    });
    if (r.ok) load();
    else {
      const data = await r.json().catch(() => ({ error: 'Ошибка' }));
      toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Пользователи системы</h3>
          <p className="text-xs text-muted-foreground">
            Создание и управление учётными записями. Роли: admin (всё), manager (отчёты), viewer (только чтение).
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Создать
        </Button>
      </div>

      {showForm && (
        <UserForm
          initial={editing}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            load();
          }}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Загрузка…
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Нет пользователей. Создайте первого администратора.
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg shrink-0 text-xs font-semibold',
                    u.role === 'admin'
                      ? 'bg-primary text-primary-foreground'
                      : u.role === 'manager'
                        ? 'bg-accent/20 text-accent-foreground'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {u.displayName.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{u.displayName}</span>
                    <span className="text-xs text-muted-foreground">@{u.username}</span>
                    <RoleBadge role={u.role} />
                    {!u.active && <StatusBadge variant="muted">Заблокирован</StatusBadge>}
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                    Создан: {new Date(u.createdAt).toLocaleString('ru-RU')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => handleToggleActive(u)}
                  title={u.active ? 'Заблокировать' : 'Разблокировать'}
                >
                  {u.active ? <Lock className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => {
                    setEditing(u);
                    setShowForm(true);
                  }}
                  title="Редактировать"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(u.id, u.username)}
                  title="Удалить"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'admin') return <StatusBadge variant="danger"><Shield className="h-3 w-3 inline mr-1" />Админ</StatusBadge>;
  if (role === 'manager') return <StatusBadge variant="info">Менеджер</StatusBadge>;
  return <StatusBadge variant="muted">Просмотр</StatusBadge>;
}

function UserForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: UserItem | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [username, setUsername] = useState(initial?.username ?? '');
  const [displayName, setDisplayName] = useState(initial?.displayName ?? '');
  const [role, setRole] = useState<'admin' | 'manager' | 'viewer'>(initial?.role ?? 'viewer');
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [active, setActive] = useState(initial?.active ?? true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast({ title: 'Введите логин', variant: 'destructive' });
      return;
    }
    if (!initial && !password) {
      toast({ title: 'Введите пароль', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        username: username.trim(),
        displayName: displayName.trim() || username.trim(),
        role,
        active,
      };
      if (password) payload.newPassword = password;
      if (currentPassword) payload.currentPassword = currentPassword;

      const r = await fetch('/api/admin/users', {
        method: initial ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initial ? { id: initial.id, ...payload } : payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Ошибка');
      toast({ title: initial ? 'Пользователь обновлён' : 'Пользователь создан' });
      onSaved();
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

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 space-y-3"
    >
      <h4 className="text-sm font-semibold">
        {initial ? `Редактирование: ${initial.displayName}` : 'Новый пользователь'}
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Логин *</Label>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="manager1"
            className="h-9"
            disabled={!!initial}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Отображаемое имя</Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Иван Иванов"
            className="h-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Роль</Label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="admin">Администратор (полный доступ + настройки)</option>
            <option value="manager">Менеджер (отчёты + сообщения)</option>
            <option value="viewer">Просмотр (только чтение отчётов)</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Статус</Label>
          <label className="flex items-center gap-2 h-9 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded"
            />
            Активен (может входить в систему)
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">
            {initial ? 'Новый пароль (оставьте пустым — не менять)' : 'Пароль *'}
          </Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="минимум 4 символа"
            className="h-9"
            required={!initial}
          />
        </div>
        {initial && (
          <div className="space-y-1.5">
            <Label className="text-xs">Текущий пароль (только для смены своего пароля)</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="для подтверждения"
              className="h-9"
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Сохранить
        </Button>
      </div>
    </form>
  );
}

// ============================================================
// System tab (port, host, service management)
// ============================================================

interface SystemSettingsData {
  port: number
  host: string
  autoStartService: boolean
}

function SystemTab() {
  const [settings, setSettings] = useState<SystemSettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [port, setPort] = useState('8083')
  const [host, setHost] = useState('0.0.0.0')
  const { toast } = useToast()

  useEffect(() => {
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setSettings(data)
          setPort(String(data.port ?? 8083))
          setHost(data.host ?? '0.0.0.0')
        }
      })
      .catch(() => {
        /* ignore */
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    const portNum = parseInt(port, 10)
    if (!Number.isInteger(portNum) || portNum < 1024 || portNum > 65535) {
      toast({
        title: 'Неверный порт',
        description: 'Порт должен быть целым числом от 1024 до 65535',
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    try {
      const r = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: portNum, host }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Ошибка')
      toast({
        title: 'Настройки сохранены',
        description: data.warning || 'Применится после перезапуска',
      })
    } catch (e) {
      toast({
        title: 'Ошибка',
        description: e instanceof Error ? e.message : 'Не удалось сохранить',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleRestart = async () => {
    if (!confirm('Перезапустить службу? Сервер будет недоступен 2-5 секунд.')) return
    setRestarting(true)
    try {
      const r = await fetch('/api/admin/service-restart', { method: 'POST' })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Ошибка')
      toast({
        title: 'Запрос отправлен',
        description: data.message,
      })
    } catch (e) {
      toast({
        title: 'Ошибка',
        description: e instanceof Error ? e.message : 'Не удалось перезапустить',
        variant: 'destructive',
      })
    } finally {
      setRestarting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Загрузка…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Системные параметры</h3>
        <p className="text-xs text-muted-foreground">
          Настройка сетевого порта и хоста для веб-сервера. По умолчанию — порт 8083
          (совместим с оригинальным WebMonitor 4.11).
        </p>
      </div>

      {/* Текущий статус */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary shrink-0">
            <Network className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold">Текущая конфигурация</span>
              <StatusBadge variant="success" dot>
                Активна
              </StatusBadge>
            </div>
            <div className="text-sm text-muted-foreground">
              Сервер слушает порт <code className="font-mono font-semibold text-primary">{settings?.port ?? 8083}</code> на адресе{' '}
              <code className="font-mono font-semibold text-primary">{settings?.host ?? '0.0.0.0'}</code>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Доступ: <code className="font-mono">http://localhost:{settings?.port ?? 8083}</code> ·{' '}
              <code className="font-mono">http://&lt;IP-компьютера&gt;:{settings?.port ?? 8083}</code>
            </div>
          </div>
        </div>
      </div>

      {/* Форма настроек */}
      <div className="rounded-lg border p-4 space-y-3">
        <h4 className="text-sm font-semibold">Изменить параметры сети</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Порт (1024–65535)</Label>
            <Input
              type="number"
              min={1024}
              max={65535}
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="8083"
              className="h-9 font-mono"
            />
            <p className="text-[10px] text-muted-foreground">
              По умолчанию: 8083 (как в оригинальном WebMonitor)
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Хост (привязка интерфейса)</Label>
            <select
              value={host}
              onChange={(e) => setHost(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm font-mono"
            >
              <option value="0.0.0.0">0.0.0.0 (все интерфейсы — рекомендуется)</option>
              <option value="127.0.0.1">127.0.0.1 (только localhost)</option>
              <option value="::">:: (IPv6 все интерфейсы)</option>
            </select>
            <p className="text-[10px] text-muted-foreground">
              0.0.0.0 — доступ с других компьютеров сети
            </p>
          </div>
        </div>

        {/* Предупреждение о перезапуске */}
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-medium text-amber-700 dark:text-amber-300">
              Изменения порта применятся только после перезапуска службы.
            </span>{' '}
            После сохранения нажмите «Перезапустить службу» ниже, либо выполните stop.bat + start.bat вручную.
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button size="sm" disabled={saving} onClick={handleSave}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Сохранить настройки
          </Button>
        </div>
      </div>

      {/* Управление службой */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Управление службой Windows
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Перезапуск службы RKWebMonitor для применения изменений порта
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-md border bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground">Статус службы</div>
            <div className="font-semibold text-sm flex items-center gap-1.5 mt-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-glow" />
              Работает
            </div>
          </div>
          <div className="rounded-md border bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground">Тип запуска</div>
            <div className="font-semibold text-sm mt-1">Авто</div>
          </div>
          <div className="rounded-md border bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground">Имя службы</div>
            <div className="font-mono text-sm mt-1">RKWebMonitor</div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t">
          <Button size="sm" variant="outline" disabled={restarting} onClick={handleRestart}>
            {restarting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
            Перезапустить службу
          </Button>
          <span className="text-xs text-muted-foreground">
            Альтернатива: Пуск → «Остановить сервер» → «RK Web Monitor»
          </span>
        </div>
      </div>

      {/* Информация о системе */}
      <div className="rounded-lg border p-4">
        <h4 className="text-sm font-semibold mb-3">Информация о системе</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Версия приложения:</span>
            <span className="font-mono">2.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Платформа:</span>
            <span>Next.js 16 (Standalone) + Node.js</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">База данных:</span>
            <span>SQLite (Prisma ORM)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Папка данных:</span>
            <code className="font-mono text-xs">data/rkwebmon.db</code>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Логи:</span>
            <code className="font-mono text-xs">logs/server.log</code>
          </div>
        </div>
      </div>
    </div>
  )
}
