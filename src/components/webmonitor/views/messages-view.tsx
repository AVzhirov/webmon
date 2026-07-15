'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useReport } from '@/hooks/use-report';
import { SectionCard } from '../ui/section-card';
import { KpiCard } from '../ui/kpi-card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import type { PersonalItem, StaffMessage } from '@/lib/rk7/types';
import {
  Send,
  Search,
  MessageSquare,
  Users,
  CheckCircle2,
  Clock,
  RotateCw,
  UserCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/format';

async function fetchMessages(): Promise<StaffMessage[]> {
  const r = await fetch('/api/messages', { cache: 'no-store' });
  return r.json();
}

async function sendMessage(payload: {
  recipient: string;
  recipientCode?: number;
  text: string;
}): Promise<StaffMessage> {
  const r = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: 'Failed' }));
    throw new Error(err.error || 'Не удалось отправить');
  }
  return r.json();
}

export function MessagesView() {
  const { data: personal, isLoading } = useReport<PersonalItem[]>('/api/reports/personal');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [selectedCode, setSelectedCode] = useState<number | null>(null);
  const [text, setText] = useState('');

  const { data: messages } = useQuery({
    queryKey: ['messages'],
    queryFn: fetchMessages,
  });

  const mutation = useMutation({
    mutationFn: sendMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setText('');
      toast({
        title: 'Сообщение отправлено',
        description: 'Доставлено на станцию получателя',
      });
    },
    onError: (e: Error) => {
      toast({
        title: 'Ошибка отправки',
        description: e.message,
        variant: 'destructive',
      });
    },
  });

  const items = personal ?? [];
  const filtered = search.trim()
    ? items.filter(
        (p) => p.name.toLowerCase().includes(search.toLowerCase()) || String(p.code).includes(search),
      )
    : items;

  const selectedPerson = items.find((p) => p.code === selectedCode);

  const handleSend = () => {
    if (!selectedPerson) {
      toast({ title: 'Выберите получателя', variant: 'destructive' });
      return;
    }
    if (!text.trim()) {
      toast({ title: 'Введите текст сообщения', variant: 'destructive' });
      return;
    }
    mutation.mutate({
      recipient: selectedPerson.name,
      recipientCode: selectedPerson.code,
      text: text.trim(),
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Сообщения персоналу</h1>
        <p className="text-sm text-muted-foreground">
          Отправка сообщений на станции сотрудников
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          title="Сотрудников"
          value={items.length.toString()}
          subtitle="Доступно для отправки"
          icon={Users}
          accent="primary"
          loading={isLoading}
        />
        <KpiCard
          title="Отправлено"
          value={(messages?.length ?? 0).toString()}
          subtitle="За сессию"
          icon={Send}
          accent="accent"
        />
        <KpiCard
          title="Доставлено"
          value={(messages?.filter((m) => m.status === 'sent').length ?? 0).toString()}
          subtitle="Успешно"
          icon={CheckCircle2}
          accent="chart-3"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Выбор получателя */}
        <SectionCard
          title="Получатель"
          description={`${filtered.length} сотрудников`}
          icon={UserCircle}
          className="lg:col-span-2"
          loading={isLoading}
          action={
            <div className="relative w-40">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Поиск…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-full rounded-md border bg-background pl-8 pr-2 text-xs"
              />
            </div>
          }
          contentClassName="p-0"
        >
          <div className="max-h-[480px] overflow-y-auto scroll-area-thin">
            {filtered.map((p, i) => {
              const isSelected = selectedCode === p.code;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedCode(p.code)}
                  className={cn(
                    'flex w-full items-center gap-3 border-b px-3 py-2.5 text-left transition-colors last:border-0',
                    isSelected ? 'bg-primary/10' : 'hover:bg-muted/40',
                  )}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback
                      className={cn(
                        'text-xs font-semibold',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {p.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      Код: {p.code}
                    </div>
                  </div>
                  {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                </button>
              );
            })}
            {filtered.length === 0 && !isLoading && (
              <div className="text-sm text-muted-foreground text-center py-6">
                Ничего не найдено
              </div>
            )}
          </div>
        </SectionCard>

        {/* Форма отправки + история */}
        <div className="lg:col-span-3 space-y-4">
          <SectionCard
            title="Новое сообщение"
            description={selectedPerson ? `Получатель: ${selectedPerson.name}` : 'Выберите получателя'}
            icon={MessageSquare}
          >
            <Textarea
              placeholder="Введите текст сообщения…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              maxLength={500}
              className="resize-none"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground tabular-nums">
                {text.length}/500
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setText('')}
                  disabled={!text || mutation.isPending}
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  Очистить
                </Button>
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={!selectedPerson || !text.trim() || mutation.isPending}
                >
                  {mutation.isPending ? (
                    <>
                      <Clock className="h-3.5 w-3.5 animate-spin" />
                      Отправка…
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Отправить
                    </>
                  )}
                </Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="История отправленных"
            description={`${messages?.length ?? 0} сообщений`}
            icon={Clock}
          >
            <div className="space-y-2 max-h-72 overflow-y-auto scroll-area-thin">
              {(messages ?? []).length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-6">
                  Пока ничего не отправлено
                </div>
              ) : (
                (messages ?? []).map((m) => (
                  <div
                    key={m.id}
                    className="flex items-start gap-3 rounded-lg border bg-card p-3"
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {m.recipient.split(/\s+/).map((w) => w[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-medium truncate">{m.recipient}</span>
                        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                          {formatDateTime(m.sentAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{m.text}</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
