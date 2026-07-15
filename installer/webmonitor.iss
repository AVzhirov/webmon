; ============================================================
; RK Web Monitor — Inno Setup script
; Компиляция: iscc.exe webmonitor.iss
; ============================================================

#define MyAppName "RK Web Monitor"
#define MyAppVersion "2.0.0"
#define MyAppPublisher "AVzhirov"
#define MyAppURL "https://github.com/AVzhirov/webmon"
#define MyAppExeName "RKWebMonitor.exe"

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
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName}
LicenseFile=LICENSE.rtf
; Можно добавить иконку: SetupIconFile=icon.ico

[Languages]
Name: "russian"; MessagesFile: "compiler:Languages\Russian.isl"
Name: "english"; MessagesFile: "compiler:Languages\English.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "startup"; Description: "Запускать при старте Windows"; GroupDescription: "{cm:AdditionalIcons}"
Name: "firewall"; Description: "Добавить правило Windows Firewall (порт 3000)"; GroupDescription: "Дополнительно:"; Flags: checkedonce

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
Source: "RKWebMonitor.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "README-INSTALL.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "USERGUIDE.md"; DestDir: "{app}"; Flags: ignoreversion
; Менеджер служб (NSSM) — для запуска как Windows Service
Source: "nssm\nssm.exe"; DestDir: "{app}\bin"; Flags: ignoreversion; Check: DirExists(ExpandConstant('{src}\nssm'))

[Dirs]
Name: "{app}\data"; Flags: uninsneveruninstall; AfterInstall: InitDataDir
Name: "{localappdata}\RKWebMonitor\logs"; Flags: uninsneveruninstall

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\RKWebMonitor.bat"; IconFilename: "{app}\app\public\icon.ico"; Flags: runminimized
Name: "{group}\Открыть в браузере"; Filename: "http://localhost:3000"
Name: "{group}\Остановить сервер"; Filename: "{app}\stop.bat"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{commondesktop}\{#MyAppName}"; Filename: "{app}\RKWebMonitor.bat"; Tasks: desktopicon; IconFilename: "{app}\app\public\icon.ico"
Name: "{commonstartup}\{#MyAppName}"; Filename: "{app}\RKWebMonitor.bat"; Tasks: startup; IconFilename: "{app}\app\public\icon.ico"; Flags: runminimized

[Run]
; Инициализация БД (Prisma push)
Filename: "{app}\node\node.exe"; Parameters: "{app}\app\node_modules\prisma\build\index.js db push --schema={app}\app\prisma\schema.prisma --skip-generate"; WorkingDir: "{app}\app"; StatusMsg: "Инициализация базы данных..."; Flags: runhidden
; Firewall правило
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall add rule name=""RK Web Monitor"" dir=in action=allow protocol=TCP localport=3000"; Tasks: firewall; Flags: runhidden
; Запуск приложения
Filename: "{app}\RKWebMonitor.bat"; Description: "Запустить RK Web Monitor"; Flags: nowait postinstall skipifsilent runminimized

[UninstallRun]
; Остановить сервис
Filename: "{app}\bin\nssm.exe"; Parameters: "stop RKWebMonitor"; Flags: runhidden; RunOnceId "StopService"
Filename: "{app}\bin\nssm.exe"; Parameters: "remove RKWebMonitor confirm"; Flags: runhidden; RunOnceId "RemoveService"
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

procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
begin
  if CurStep = ssPostInstall then
  begin
    // Создать .env файл с правильными путями
    SaveStringToFile(ExpandConstant('{app}\app\.env'),
      'DATABASE_URL="file:' + ExpandConstant('{app}\data\rkwebmon.db') + '"' + #13#10 +
      'NEXTAUTH_SECRET="change-me-in-production"' + #13#10 +
      'PORT=3000' + #13#10,
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
