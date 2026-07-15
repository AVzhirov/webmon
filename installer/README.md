# Установщик RK Web Monitor для Windows

В этой папке находятся скрипты для сборки Windows-установщика RK Web Monitor.

## Что нужно для сборки установщика

### На машине разработчика (где собирается .exe):

1. **Windows 10/11 x64** (или Windows Server 2019+)
2. **Node.js 20+** — https://nodejs.org
3. **Bun** — https://bun.sh (быстрая альтернатива npm)
4. **Inno Setup 6** — https://jrsoftware.org/isdl.php
   - Установите в `C:\Program Files (x86)\Inno Setup 6\`
   - Добавьте в PATH или скрипт сам найдёт

### На машине пользователя (где будет работать приложение):

- **Windows 10/11 x64** или **Windows Server 2019+**
- Права администратора (для установки в `Program Files` и правила Firewall)
- Браузер (Chrome, Edge, Firefox — любой современный)
- **Node.js НЕ требуется** — установщик включает portable Node.js

## Как собрать установщик

### Способ 1 — двойной клик (простой)

1. Откройте папку `installer\` в Проводнике Windows
2. Двойной клик по `build-installer.bat`
3. Дождитесь завершения сборки
4. Готовый установщик будет в `dist\RKWebMonitor-2.0.0-setup.exe`

### Способ 2 — PowerShell (с логами)

```powershell
cd installer
.\build-installer.ps1
```

### Что произойдёт во время сборки:

1. **`bun install`** — установка зависимостей
2. **`bun run build`** — сборка Next.js в standalone-режиме
3. **Скачивание portable Node.js** v22.11.0 для Windows x64 (~30 MB)
4. **Скачивание NSSM** (Non-Sucking Service Manager) ~1 MB
5. **Компиляция .iss через Inno Setup** → один `.exe` установщик

Размер готового установщика: ~80–120 MB (включает portable Node.js + собранное приложение + демо-данные).

## Что устанавливает установщик

| Путь | Содержимое |
|------|-----------|
| `C:\Program Files\RK Web Monitor\` | Корневая папка |
| `C:\Program Files\RK Web Monitor\app\` | Standalone Next.js приложение |
| `C:\Program Files\RK Web Monitor\app\public\` | Демо-данные (47 XML + 6 карт зала) |
| `C:\Program Files\RK Web Monitor\app\prisma\` | Схема базы данных |
| `C:\Program Files\RK Web Monitor\node\` | Portable Node.js v22.11.0 |
| `C:\Program Files\RK Web Monitor\data\` | База данных SQLite (rkwebmon.db) |
| `C:\Program Files\RK Web Monitor\logs\` | Логи сервера |
| `C:\Program Files\RK Web Monitor\bin\nssm.exe` | Менеджер служб (опционально) |
| `C:\Program Files\RK Web Monitor\start.bat` | Запуск сервера |
| `C:\Program Files\RK Web Monitor\stop.bat` | Остановка сервера |
| `C:\Program Files\RK Web Monitor\RKWebMonitor.bat` | Главный запускатель |

### Ярлыки:

- **Пуск → RK Web Monitor** — запуск приложения
- **Пуск → Открыть в браузере** — открыть http://localhost:3000
- **Пуск → Остановить сервер** — корректная остановка
- **Пуск → Удалить программу** — деинсталляция
- **Рабочий стол** (опционально) — иконка запуска
- **Автозагрузка** (опционально) — автозапуск при входе в Windows

### Дополнительно:

- **Правило Windows Firewall** для порта 3000 (опционально)
- **База данных** SQLite создаётся автоматически при первом запуске
- **Демо-серверы и admin-пользователь** создаются автоматически

## Первые шаги после установки

1. Запустите **RK Web Monitor** из меню Пуск (или ярлык на рабочем столе)
2. Откроется консольное окно — **не закрывайте его** пока работаете
3. Через 5 секунд автоматически откроется браузер на http://localhost:3000
4. Введите логин **`admin`** и пароль **`admin`**
5. **Сразу смените пароль** через Настройки → Пользователи → Редактировать
6. В Настройках добавьте свой сервер R-Keeper 7

## Удаление

- Пуск → RK Web Monitor → Удалить программу
- **База данных сохраняется** в `C:\Program Files\RK Web Monitor\data\` (можно сделать бэкап перед удалением)

## Если что-то не работает

1. Проверьте логи: `C:\Program Files\RK Web Monitor\logs\server.log`
2. Убедитесь, что порт 3000 свободен: `netstat -an | findstr :3000`
3. Проверьте, что в Firewall разрешён порт 3000
4. Запустите `stop.bat`, затем `start.bat` заново

## Альтернатива: portable ZIP (без установщика)

Если не хотите использовать установщик, можно сделать portable-сборку:

```powershell
# В PowerShell на машине разработчика
cd installer
.\build-portable.ps1  # (не реализовано — допишите при необходимости)
```

Или вручную:
1. Соберите приложение: `bun run build`
2. Скопируйте `.next\standalone\*` → `RKWebMonitor\app\`
3. Скопируйте `.next\static\` → `RKWebMonitor\app\.next\static\`
4. Скопируйте `public\` → `RKWebMonitor\app\public\`
5. Скачайте Node.js portable и положите `node.exe` рядом
6. Создайте `start.bat` по образцу из этой папки
7. Запустите `start.bat`

## Лицензия

MIT — используйте свободно.

## Поддержка

- GitHub: https://github.com/AVzhirov/webmon
- Issues: https://github.com/AVzhirov/webmon/issues
