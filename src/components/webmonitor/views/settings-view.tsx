'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/webmonitor';
import { SettingsDialog } from '../settings-dialog';
import { SectionCard } from '../ui/section-card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '../ui/status-badge';
import {
  Settings as SettingsIcon,
  Server as ServerIcon,
  Users,
  Shield,
  Lock,
  Wifi,
  BookOpen,
  ExternalLink,
} from 'lucide-react';

export function SettingsView() {
  const user = useAppStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [serversCount, setServersCount] = useState<number | null>(null);
  const [usersCount, setUsersCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/servers', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setServersCount(Array.isArray(d) ? d.length : 0))
      .catch(() => setServersCount(0));
    if (user?.role === 'admin') {
      fetch('/api/admin/users', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => setUsersCount(Array.isArray(d) ? d.length : 0))
        .catch(() => setUsersCount(0));
    }
  }, [user]);

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Настройки</h1>
        <p className="text-sm text-muted-foreground">
          Управление серверами R-Keeper, пользователями и правами доступа
        </p>
      </div>

      {!isAdmin && (
        <SectionCard
          title="Недостаточно прав"
          icon={Lock}
        >
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-300">
                  Управление настройками доступно только администраторам
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ваша роль: <strong>{user?.role === 'manager' ? 'Менеджер' : 'Просмотр'}</strong>.
                  Обратитесь к администратору для изменения настроек серверов или пользователей.
                </p>
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Карточки быстрого доступа */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Серверы */}
        <SectionCard
          title="Серверы R-Keeper"
          description="Подключение к RK7"
          icon={ServerIcon}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Всего серверов:</span>
              <span className="font-semibold tabular-nums">
                {serversCount === null ? '—' : serversCount}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <StatusBadge variant="success" dot>
                Активны
              </StatusBadge>
              <span className="text-muted-foreground">
                Типы: демо-XML, RK7 TCP, RK7 HTTP
              </span>
            </div>
            <Button
              size="sm"
              className="w-full"
              disabled={!isAdmin}
              onClick={() => setOpen(true)}
            >
              <ServerIcon className="h-3.5 w-3.5" />
              Управление серверами
            </Button>
          </div>
        </SectionCard>

        {/* Пользователи */}
        <SectionCard
          title="Пользователи"
          description="Учётные записи и роли"
          icon={Users}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Всего пользователей:</span>
              <span className="font-semibold tabular-nums">
                {usersCount === null ? (isAdmin ? '—' : 'недоступно') : usersCount}
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <Shield className="h-3 w-3 text-primary" />
                <span><strong>Администратор</strong> — полный доступ + настройки</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span><strong>Менеджер</strong> — отчёты + сообщения</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-3 w-3 text-muted-foreground" />
                <span><strong>Просмотр</strong> — только чтение</span>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              disabled={!isAdmin}
              onClick={() => setOpen(true)}
            >
              <Users className="h-3.5 w-3.5" />
              Управление пользователями
            </Button>
          </div>
        </SectionCard>
      </div>

      {/* Инструкции */}
      <SectionCard
        title="Как настроить подключение к RK7"
        icon={BookOpen}
      >
        <div className="space-y-3 text-sm">
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-start gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0">1</span>
              <div>
                <div className="font-medium">Тип подключения: Демо-XML</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Укажите путь к папке с XML-отчётами. Используется для тестов и обучения.
                  В комплекте — 47 готовых отчётов RK7.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-start gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0">2</span>
              <div>
                <div className="font-medium">Тип подключения: RK7 TCP</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Прямое TCP-соединение с сервером R-Keeper 7 по адресу IP:порт
                  (например, <code className="font-mono">192.168.1.10:15551</code>).
                  Укажите логин/пароль RK7 и при необходимости cryptKey.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-start gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0">3</span>
              <div>
                <div className="font-medium">Тип подключения: RK7 HTTP</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  REST-подключение к XML-шлюзу RK7. Укажите полный URL эндпоинта.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-3">
            <div className="flex items-start gap-2.5">
              <Wifi className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-primary">Проверка соединения</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  После добавления сервера нажмите иконку <Wifi className="inline h-3 w-3" /> —
                  система проверит доступность и сообщит результат.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <SettingsDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
