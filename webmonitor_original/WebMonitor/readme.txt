RK7
1. В файле site\WebMonitor\Web.config параметр Platform выставить в RK7. Демо режим должен быть отключен: DemoMode в False.
2. В файле site\WebMonitor\App_Data\servers.xml задать список RK-серверов, с которыми будем работать.
3. Запустить web-сервер (start.bat).
4. Запустить в броузере приложение: <IP узла, на котором запущен web-сервер>:<порт>. По-умолчанию порт 8083. Например: localhost:8083
