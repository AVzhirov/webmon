# Установка через GitBash на Windows

Этот способ позволяет установить RK Web Monitor из исходников на Windows через GitBash — без использования .exe установщика.

## Когда использовать

- Хотите иметь исходники для редактирования
- .exe установщик не работает или вызывает подозрения у антивируса
- Нужно обновляться через `git pull` без пересборки установщика
- Хотите разработать/отладить что-то

## Требования

1. **Windows 10/11 x64** или **Windows Server 2019+**
2. **GitBash** — скачать: https://git-scm.com/download/win
3. **Права администратора** (для установки службы и Firewall)
4. **~500 МБ** свободного места

## Установка

### Шаг 1. Скачайте и установите GitBash

Перейдите на https://git-scm.com/download/win и скачайте Git for Windows. Установите со стандартными настройками.

### Шаг 2. Откройте GitBash от имени администратора

- Найдите в меню Пуск "Git Bash"
- Правый клик → **"Запуск от имени администратора"**
- Согласитесь с UAC

⚠️ **ВАЖНО:** Без прав администратора установка службы завершится с ошибкой.

### Шаг 3. Клонируйте репозиторий

В окне GitBash выполните:

```bash
# Перейдите в папку, куда хотите установить (например, C:/)
cd /c/

# Клонируйте репозиторий
git clone https://github.com/AVzhirov/webmon.git

# Перейдите в папку проекта
cd webmon
```

### Шаг 4. Запустите установочный скрипт

```bash
# Сделайте скрипт исполняемым (если ещё нет)
chmod +x installer/install-gitbash.sh

# Запустите установку
./installer/install-gitbash.sh
```

### Что произойдёт:

1. ✅ Проверка прав администратора
2. ✅ Создание папок `node/`, `bin/`, `data/`, `logs/`, `.cache/`
3. ✅ Скачивание portable Node.js v22.11.0 для Windows x64 (~30 МБ)
4. ✅ Скачивание NSSM 2.24 (менеджер служб)
5. ✅ Установка Bun (через npm)
6. ✅ `bun install` — установка зависимостей
7. ✅ `bun run build` — сборка Next.js standalone
8. ✅ Копирование собранных файлов в `app/`
9. ✅ Удаление Linux-бинарников, скачивание Windows-версий (sharp-win32-x64)
10. ✅ Создание `.env` с правильными путями (прямые слеши для Prisma)
11. ✅ `prisma generate` — скачивание Prisma Windows engine
12. ✅ `prisma db push` — инициализация SQLite БД
13. ✅ Копирование bat-файлов и документации
14. ✅ Создание правила Windows Firewall для порта 8083
15. ✅ Удаление старой службы (если есть)
16. ✅ Установка службы `RKWebMonitor` через NSSM
17. ✅ Запуск службы
18. ✅ Вывод сетевых адресов для доступа
19. ✅ Создание ярлыков в меню Пуск
20. ✅ Проверка доступности сервера
21. ✅ Открытие браузера (опционально)

### Шаг 5. Войдите в систему

- **URL:** http://localhost:8083
- **Логин:** `admin`
- **Пароль:** `admin`
- ⚠️ **СМЕНИТЕ ПАРОЛЬ** в Настройках после первого входа!

## Доступ по сети

Приложение слушает на `0.0.0.0:8083` — это означает, что оно доступно со всех сетевых интерфейсов.

### Узнать IP-адрес компьютера

**Через GitBash:**
```bash
ipconfig | grep IPv4
```

**Через cmd:**
```cmd
ipconfig
```

### Подключиться с другого компьютера

Откройте на другом ПК в браузере:
```
http://<IP-адрес-этого-компьютера>:8083
```

Например, если IP `192.168.1.100`, то URL: `http://192.168.1.100:8083`

### Если не открывается с другого компьютера

1. **Проверьте Firewall** — запустите `setup-network.bat` из папки установки
2. **Проверьте пинг** — `ping <IP-адрес>` с другого ПК
3. **Антивирус** — некоторые антивирусы блокируют входящие подключения. Добавьте исключение для `node.exe` и порта 8083
4. **Сетевое обнаружение** — на Windows должно быть включено "Сетевое обнаружение" (Network Discovery)
5. **Подсеть** — оба ПК должны быть в одной подсети (например, 192.168.1.x)
6. **Маршрутизатор** — если ПК в разных подсетях, настройте маршрутизацию

### Скрипт настройки сети

Запустите из папки установки:
```cmd
setup-network.bat
```

Покажет:
- Все сетевые IP-адреса компьютера
- Статус службы
- Статус правила Firewall
- Занят ли порт 8083
- Доступен ли сервер снаружи

## Управление службой

### Через меню Пуск

После установки в меню Пуск появятся ярлыки:
- **RK Web Monitor → Open in browser** — открыть http://localhost:8083
- **RK Web Monitor → Start service** — запуск службы
- **RK Web Monitor → Stop service** — остановка
- **RK Web Monitor → Restart service** — перезапуск
- **RK Web Monitor → Diagnose** — диагностика проблем

### Через командную строку (cmd от администратора)

```cmd
sc start RKWebMonitor       :: запуск
sc stop RKWebMonitor        :: остановка
sc query RKWebMonitor       :: статус
sc config RKWebMonitor start= auto    :: автозапуск
sc config RKWebMonitor start= demand  :: ручной запуск
```

### Через services.msc

1. Win+R → `services.msc` → Enter
2. Найти "RK Web Monitor"
3. Правый клик → Запуск / Остановить / Перезапустить / Свойства

## Обновление

Чтобы обновить проект до последней версии:

```bash
cd /c/webmon

# Остановить службу
./bin/nssm.exe stop RKWebMonitor

# Получить последние изменения
git pull

# Запустить установочный скрипт заново (обновит код и зависимости)
./installer/install-gitbash.sh
```

⚠️ **База данных сохранится** — обновление не затронет `data/rkwebmon.db`.

## Диагностика проблем

Если служба не запускается или не работает — запустите из папки установки:

```cmd
diagnose.bat
```

Скрипт проверит:
1. ✅ Права администратора
2. ✅ Наличие файлов (node.exe, server.js, watchdog.js, nssm.exe, prisma schema)
3. ✅ Содержимое .env
4. ✅ Занятость порта 8083
5. ✅ Установлена ли служба
6. ✅ Конфигурация NSSM
7. ✅ Последние 50 строк лога
8. ✅ Правило Firewall
9. ✅ Наличие БД
10. ✅ Наличие Prisma Windows engine
11. ✅ Тест ручного запуска сервера (5 секунд)

### Частые проблемы

**1. Служба сразу останавливается после запуска**

Проверьте лог: `logs/server.log` (последние 50 строк через `diagnose.bat`).

Возможные причины:
- Нет Prisma Windows engine → запустите `prisma generate` вручную:
  ```cmd
  cd app
  "..\node\node.exe" node_modules\prisma\build\index.js generate
  ```
- БД не создана → запустите `prisma db push`:
  ```cmd
  cd app
  "..\node\node.exe" node_modules\prisma\build\index.js db push --schema="prisma\schema.prisma" --skip-generate --accept-data-loss
  ```
- Неверный путь в DATABASE_URL → должен быть с прямыми слешами (`file:C:/.../rkwebmon.db`)

**2. Порт 8083 занят**

Узнайте, кто занял:
```cmd
netstat -ano | findstr ":8083"
```

Или смените порт в `.env`:
```
PORT=8084
```
И обновите правило Firewall.

**3. Брандмауэр блокирует**

```cmd
netsh advfirewall firewall add rule name="RK Web Monitor" dir=in action=allow protocol=TCP localport=8083
```

**4. Антивирус блокирует**

Добавьте исключение для:
- `node.exe` (в папке `node/`)
- `nssm.exe` (в папке `bin/`)
- Порта 8083

## Удаление

### Через GitBash

```bash
cd /c/webmon

# Остановить и удалить службу
./bin/nssm.exe stop RKWebMonitor
./bin/nssm.exe remove RKWebMonitor confirm

# Удалить правило Firewall
netsh advfirewall firewall delete rule name="RK Web Monitor"

# Удалить ярлыки
rm -rf "$PROGRAMDATA/Microsoft/Windows/Start Menu/Programs/RK Web Monitor"

# Удалить папку (БД сохранится в data/, можно скопировать)
cd /c/
rm -rf webmon
```

### Через bat-файл

```cmd
uninstall.bat
```

## Структура после установки

```
webmon/
├── START_HERE.bat         ← быстрый запуск установки
├── install.bat            ← Windows-установщик службы
├── install-gitbash.sh     ← этот скрипт (для GitBash)
├── uninstall.bat          ← удаление
├── diagnose.bat           ← диагностика
├── setup-network.bat      ← настройка сети
├── start.bat / stop.bat / restart.bat
├── README.md / USERGUIDE.md / README-INSTALL.txt
├── .env                   ← конфигурация (генерируется)
├── app/                   ← собранное Next.js приложение
│   ├── server.js
│   ├── .env
│   ├── node_modules/      ← только Windows-бинарники
│   ├── public/demo-data/  ← 47 XML + 6 карт залов
│   └── prisma/schema.prisma
├── node/                  ← portable Node.js v22.11.0
│   └── node.exe (80 МБ)
├── bin/
│   ├── nssm.exe           ← менеджер служб
│   └── watchdog.js        ← обёртка для restart
├── data/                  ← SQLite БД (rkwebmon.db)
├── logs/                  ← логи сервера
└── installer/             ← исходные скрипты установки
```

## Поддержка

- **GitHub Issues:** https://github.com/AVzhirov/webmon/issues
- **Диагностика:** запустите `diagnose.bat` и приложите вывод к issue
