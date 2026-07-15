; ============================================================
; RK Web Monitor — Inno Setup script
; Компиляция: iscc.exe webmonitor.iss
;
; Устанавливает приложение как Windows Service через NSSM.
; Порт по умолчанию: 8083 (совместим с оригинальным WebMonitor 4.11)
; ============================================================

#define MyAppName "RK Web Monitor"
#define MyAppVersion "2.0.0"
#define MyAppPublisher "AVzhirov"
#define MyAppURL "https://github.com/AVzhirov/webmon"
#define MyAppExeName "RKWebMonitor.exe"
#define MyServiceName "RKWebMonitor"
#define MyDefaultPort "8083"

[Setup]
AppId={{8F5C2A1B-3D4E-4F5A-9B6C-7D8E9F0A1B2C}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=..\dist
OutputBaseFilename=RKWebMonitor-{#MyAppVersion}-setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
UninstallDisplayIcon={app}\app\public\favicon.ico
UninstallDisplayName={#MyAppName}
LicenseFile=LICENSE.rtf
; Можно добавить иконку: SetupIconFile=icon.ico

[Languages]
Name: "russian"; MessagesFile: "compiler:Languages\Russian.isl"
Name: "english"; MessagesFile: "compiler:Languages\English.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "firewall"; Description: "Добавить правило Windows Firewall (порт {#MyDefaultPort})"; GroupDescription: "Дополнительно:"; Flags: checkedonce
Name: "autostart"; Description: "Автозапуск службы при старте Windows"; GroupDescription: "Дополнительно:"; Flags: checkedonce

[Files]
; Portable Node.js bundled — нужно скачать заранее в installer\node-portable\
Source: "node-portable\*"; DestDir: "{app}\node"; Flags: recursesubdirs createallsubdirs ignoreversion; Check: DirExists(ExpandConstant('{src}\node-portable'))
; Приложение (Next.js standalone build)
Source: "..\.next\standalone\*"; DestDir: "{app}\app"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "..\.next\static\*"; DestDir: "{app}\app\.next\static"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "..\public\*"; DestDir: "{app}\app\public"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "..\prisma\*"; DestDir: "{app}\app\prisma"; Flags: recursesubdirs createallsubdirs ignoreversion
; Конфигурация и запускатели
Source: "start.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "stop.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "restart.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "RKWebMonitor.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "watchdog.js"; DestDir: "{app}\bin"; Flags: ignoreversion
Source: "README-INSTALL.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "USERGUIDE.md"; DestDir: "{app}"; Flags: ignoreversion
; NSSM — Non-Sucking Service Manager для установки как Windows Service
Source: "nssm\nssm.exe"; DestDir: "{app}\bin"; Flags: ignoreversion; Check: DirExists(ExpandConstant('{src}\nssm'))

[Dirs]
Name: "{app}\data"; Flags: uninsneveruninstall; AfterInstall: InitDataDir
Name: "{app}\logs"; Flags: uninsneveruninstall

[Icons]
Name: "{group}\Открыть в браузере"; Filename: "http://localhost:{#MyDefaultPort}"
Name: "{group}\Запустить службу"; Filename: "{app}\start.bat"
Name: "{group}\Остановить службу"; Filename: "{app}\stop.bat"
Name: "{group}\Перезапустить службу"; Filename: "{app}\restart.bat"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{commondesktop}\{#MyAppName}"; Filename: "http://localhost:{#MyDefaultPort}"; Tasks: desktopicon

[Run]
; Инициализация БД (Prisma push)
Filename: "{app}\node\node.exe"; Parameters: "{app}\app\node_modules\prisma\build\index.js db push --schema={app}\app\prisma\schema.prisma --skip-generate"; WorkingDir: "{app}\app"; StatusMsg: "Инициализация базы данных..."; Flags: runhidden; Check: InitializePrisma
; Firewall правило
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall add rule name=""RK Web Monitor"" dir=in action=allow protocol=TCP localport={#MyDefaultPort}"; Tasks: firewall; Flags: runhidden
; Установка Windows Service через NSSM (запускает watchdog.js, который управляет server.js)
Filename: "{app}\bin\nssm.exe"; Parameters: "install {#MyServiceName} ""{app}\node\node.exe"" ""{app}\bin\watchdog.js"""; StatusMsg: "Установка службы {#MyServiceName}..."; Flags: runhidden; Check: InstallService
; Настройка службы: рабочая директория
Filename: "{app}\bin\nssm.exe"; Parameters: "set {#MyServiceName} AppDirectory ""{app}"""; Flags: runhidden
; Настройка службы: окружение (PORT, DATABASE_URL, WATCHDOG_DIR для watchdog.js)
Filename: "{app}\bin\nssm.exe"; Parameters: "set {#MyServiceName} AppEnvironmentExtra PORT={#MyDefaultPort} HOSTNAME=0.0.0.0 NODE_ENV=production DATABASE_URL=""file:{app}\data\rkwebmon.db"" WATCHDOG_DIR=""{app}\data"""; Flags: runhidden
; Настройка службы: лог-файлы
Filename: "{app}\bin\nssm.exe"; Parameters: "set {#MyServiceName} AppStdout ""{app}\logs\server.log"""; Flags: runhidden
Filename: "{app}\bin\nssm.exe"; Parameters: "set {#MyServiceName} AppStderr ""{app}\logs\server.log"""; Flags: runhidden
Filename: "{app}\bin\nssm.exe"; Parameters: "set {#MyServiceName} AppRotateFiles 1"; Flags: runhidden
Filename: "{app}\bin\nssm.exe"; Parameters: "set {#MyServiceName} AppRotateBytes 10485760"; Flags: runhidden
; Настройка службы: автозапуск или ручной запуск
Filename: "{app}\bin\nssm.exe"; Parameters: "set {#MyServiceName} Start SERVICE_AUTO_START"; Tasks: autostart; Flags: runhidden
Filename: "{app}\bin\nssm.exe"; Parameters: "set {#MyServiceName} Start SERVICE_DEMAND_START"; Tasks: not autostart; Flags: runhidden
; Настройка службы: восстановление при сбое
Filename: "{app}\bin\nssm.exe"; Parameters: "set {#MyServiceName} AppExit Default Restart"; Flags: runhidden
Filename: "{app}\bin\nssm.exe"; Parameters: "set {#MyServiceName} AppRestartDelay 5000"; Flags: runhidden
; Описание службы
Filename: "{app}\bin\nssm.exe"; Parameters: "set {#MyServiceName} Description ""RK Web Monitor v{#MyAppVersion} — веб-панель мониторинга R-Keeper 7"""; Flags: runhidden
; Запуск службы
Filename: "{app}\bin\nssm.exe"; Parameters: "start {#MyServiceName}"; StatusMsg: "Запуск службы..."; Flags: runhidden; Check: StartService
; Открыть в браузере
Filename: "{cmd}"; Parameters: "/c start http://localhost:{#MyDefaultPort}"; Description: "Открыть в браузере"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Остановить службу
Filename: "{app}\bin\nssm.exe"; Parameters: "stop {#MyServiceName}"; Flags: runhidden; RunOnceId "StopService"
; Удалить службу
Filename: "{app}\bin\nssm.exe"; Parameters: "remove {#MyServiceName} confirm"; Flags: runhidden; RunOnceId "RemoveService"
; Удалить firewall правило
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall delete rule name=""RK Web Monitor"""; Flags: runhidden

[UninstallDelete]
Type: filesandordirs; Name: "{app}\app\.next\cache"
Type: filesandordirs; Name: "{app}\logs"

[Code]
procedure InitDataDir;
begin
  // Создать пустую папку для данных (БД будет создана при первом запуске)
end;

function GetEnvVariable(varName: string): string;
var
  value: string;
begin
  Result := '';
  if RegQueryStringValue(HKLM, 'SYSTEM\CurrentControlSet\Control\Session Manager\Environment', varName, value) then
    Result := value
  else if RegQueryStringValue(HKCU, 'Environment', varName, value) then
    Result := value;
end;

function InitializeSetup(): Boolean;
begin
  Result := True;
end;

function InitializePrisma(): Boolean;
begin
  Result := True;
end;

function InstallService(): Boolean;
begin
  Result := True;
end;

function StartService(): Boolean;
begin
  Result := True;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
begin
  if CurStep = ssPostInstall then
  begin
    // Создать .env файл с правильными путями (для fallback запуска без службы)
    SaveStringToFile(ExpandConstant('{app}\app\.env'),
      'DATABASE_URL="file:' + ExpandConstant('{app}\data\rkwebmon.db') + '"' + #13#10 +
      'PORT=' + '{#MyDefaultPort}' + #13#10 +
      'HOSTNAME=0.0.0.0' + #13#10 +
      'NODE_ENV=production' + #13#10,
      False);
  end;
end;

function GetUninstallString(): String;
var
  sUnInstPath: String;
  sUnInstallString: String;
begin
  sUnInstPath := 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#emit SetupSetting("AppId")}_is1';
  sUnInstallString := '';
  if not RegQueryStringValue(HKLM, sUnInstPath, 'UninstallString', sUnInstallString) then
    RegQueryStringValue(HKCU, sUnInstPath, 'UninstallString', sUnInstallString);
  Result := sUnInstallString;
end;

function IsUpgrade(): Boolean;
begin
  Result := (GetUninstallString() <> '');
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := False;
end;
