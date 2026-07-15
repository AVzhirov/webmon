# RK Web Monitor

Современная панель мониторинга продаж **R-Keeper 7**, переписанная со старого ASP.NET WebForms + dojo mobile на актуальный стек.

> Репозиторий создан как замена устаревшему `WebMonitor_4_11` (ASP.NET + dojo mobile, порт 8083). Демо-режим работает на реальных XML-отчётах RK7, поставлявшихся с оригинальным архивом.

## ✨ Возможности

| Раздел | Описание |
|--------|----------|
| **Дашборд** | Сводка смены: KPI (выручка, чеки, средний чек, активные столы, блюда), графики по часам, структура оплат, топ-10 официантов и блюд, последние чеки |
| **Баланс** | Системный балансовый отчёт по типам оплат с долями |
| **Выручка** | Детализация по валютам и способам оплат |
| **Открытые суммы** | Активные заказы по официантам |
| **Чеки** | Список с поиском + drill-down до позиций и скидок |
| **Заказы** | Распределение столов по официантам |
| **Расход блюд** | Топ-10 + полная таблица с сортировкой и поиском |
| **Официанты / Кассиры / Станции** | Выручка с детализацией по валютам и способам оплат |
| **Персонал** | Справочник сотрудников с поиском |
| **Планы залов** | Интерактивная SVG-карта столов с цветовой индикацией (занят/свободен/выбран) |
| **Кассовая дата** | Текущая кассовая дата, время и период смены |
| **Сервис-печать** | Конфигурация принтеров и сервисных сообщений |
| **Сообщения** | Отправка сообщений персоналу с историей |

## 🎨 Дизайн

- Тёплая ресторанная тема: изумрудный primary + янтарный accent
- **Тёмная** и **светлая** темы с переключателем
- Mobile-first адаптивная вёрстка (sidebar превращается в slide-out Sheet)
- Плавные анимации (Framer Motion), skeleton-загрузки, toast-уведомления
- shadcn/ui + Lucide icons

## 🛠 Технологии

- **Next.js 16** (App Router) + **TypeScript 5**
- **Tailwind CSS 4** + **shadcn/ui** (48 компонентов)
- **TanStack Query** — серверное состояние
- **Zustand** — клиентское состояние
- **Recharts** — графики
- **Framer Motion** — анимации
- **next-themes** — темы

## 🚀 Запуск

```bash
# Установка зависимостей
bun install   # или npm install / pnpm install

# Dev-сервер
bun run dev   # http://localhost:3000

# Production-сборка
bun run build
bun run start
```

### Демо-режим

В демо-режиме подходит любой логин и пароль. Все данные берутся из реальных XML-отчётов RK7, расположенных в `public/demo-data/xml/` (47 файлов: BalanceReport, MoneyTotal, DishesReport, CheckList, Check_1..22, Orders, MoneyByWaiters, MoneyByCache, MoneyByStations, HallPlans, TablesOfHall_*, Personal, CashDate, PeriodOfDay, ServicePrintReport и др.).

### Подключение к реальному RK7-серверу

Текущая версия работает только с локальными XML-файлами. Для подключения к живому серверу R-Keeper 7 нужно дописать TCP-адаптер в `src/lib/rk7/`, аналогичный оригинальному `XMLInterface.dll` из `WebMonitor.dll`:

1. Прочитать `App_Data/servers.xml` со списком серверов (адрес + cryptKey)
2. Установить TCP-сокетное соединение с сервером RK7
3. Отправлять запросы отчётов и парсить возвращаемый XML теми же парсерами из `src/lib/rk7/reports.ts`

## 📁 Структура

```
src/
├── app/
│   ├── api/reports/      # 13 API endpoints под каждый тип отчёта
│   ├── api/servers/      # список RK-серверов
│   ├── api/messages/     # отправка и история сообщений персоналу
│   ├── layout.tsx        # корневой layout с ThemeProvider
│   ├── page.tsx          # роутинг: логин или AppShell
│   └── globals.css       # тёплая ресторанная тема + utilities
├── components/
│   ├── webmonitor/
│   │   ├── views/        # 15 view-компонентов (по одному на раздел)
│   │   ├── ui/           # KpiCard, SectionCard, ReportTable, StatusBadge
│   │   ├── app-shell.tsx # каркас с sidebar + topbar + анимации
│   │   ├── sidebar.tsx
│   │   ├── topbar.tsx
│   │   └── login-screen.tsx
│   ├── ui/               # shadcn/ui компоненты (48 шт)
│   ├── theme-provider.tsx
│   └── query-provider.tsx
├── hooks/
│   └── use-report.ts     # обёртка над useQuery с refreshKey
├── lib/
│   ├── rk7/
│   │   ├── types.ts      # TypeScript-типы для всех отчётов
│   │   ├── parser.ts     # собственный XML-парсер без зависимостей
│   │   └── reports.ts    # парсеры под каждый тип отчёта
│   ├── format.ts         # форматирование денег/количеств/дат в ru-RU
│   └── utils.ts
└── store/
    └── webmonitor.ts     # Zustand стор: auth, view, refresh

public/demo-data/
├── xml/                  # 47 XML-отчётов RK7 (демо-данные)
└── hallplans/            # 6 изображений планов залов
```

## 📄 Лицензия

MIT — используйте свободно. Тестовые XML-данные и концепция UI перенесены из оригинального `WebMonitor` (UCS / R-Keeper).

## 🤝 Автор

Переписано с устаревшего ASP.NET WebForms приложения на современный стек Next.js 16.
