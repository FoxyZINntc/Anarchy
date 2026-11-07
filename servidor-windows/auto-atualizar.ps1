# Atualiza o servidor do Discordia sozinho a partir do GitHub.
# A tarefa "Discordia Auto Atualizar" roda este arquivo a cada 1 minuto: se tiver commit novo,
# baixa (git pull), instala dependencias se mudaram e reinicia o servidor.
#
# Para ligar (uma vez, no PowerShell como Administrador, dentro de C:\Discordia):
#   powershell -ExecutionPolicy Bypass -File .\servidor-windows\auto-atualizar.ps1 -Instalar
# Para desligar:
#   powershell -ExecutionPolicy Bypass -File .\servidor-windows\auto-atualizar.ps1 -Desligar
param([switch]$Instalar, [switch]$Desligar)
$Tarefa = 'Discordia Auto Atualizar'
$Raiz = Split-Path -Parent $PSScriptRoot
Set-Location $Raiz

if ($Desligar) {
  Unregister-ScheduledTask -TaskName $Tarefa -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Atualizacao automatica desligada." -ForegroundColor Yellow
  exit 0
}

if ($Instalar) {
  $admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if (-not $admin) { Write-Host "Abra o PowerShell como Administrador e rode de novo." -ForegroundColor Red; exit 1 }
  $acao = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$PSCommandPath`"" -WorkingDirectory $Raiz
  $gatilho = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1)
  $quem = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
  $ajustes = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 15) -MultipleInstances IgnoreNew
  Register-ScheduledTask -TaskName $Tarefa -Action $acao -Trigger $gatilho -Principal $quem -Settings $ajustes -Force | Out-Null
  Write-Host "Atualizacao automatica ligada: o servidor confere o GitHub a cada 1 minuto." -ForegroundColor Green
  Write-Host "O que ela faz fica anotado em $Raiz\logs\atualizacao.log" -ForegroundColor Green
  exit 0
}

# ---- conferir e atualizar ----
New-Item -ItemType Directory -Force (Join-Path $Raiz 'logs') | Out-Null
$logFile = Join-Path $Raiz 'logs\atualizacao.log'
function Log($t) { Add-Content -Path $logFile -Value ("[{0}] {1}" -f (Get-Date -Format 'dd/MM/yyyy HH:mm:ss'), $t) -Encoding UTF8 }

# servidores instalados com a versao antiga conferiam a cada 5 minutos: ajusta a propria tarefa para 1 minuto
try {
  $t = Get-ScheduledTask -TaskName $Tarefa -ErrorAction Stop
  $rep = $t.Triggers[0].Repetition.Interval
  if ($rep -and $rep -ne 'PT1M') {
    $novo = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1)
    Set-ScheduledTask -TaskName $Tarefa -Trigger $novo | Out-Null
    Log "Tarefa ajustada: agora confere o GitHub a cada 1 minuto (antes: $rep)."
  }
  # tambem roda quando o Windows liga (depois de faltar energia, por exemplo)
  if (-not ($t.Triggers | Where-Object { $_.CimClass.CimClassName -eq 'MSFT_TaskBootTrigger' })) {
    $rep1 = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1)
    $boot = New-ScheduledTaskTrigger -AtStartup; $boot.Delay = 'PT1M'
    Set-ScheduledTask -TaskName $Tarefa -Trigger $rep1, $boot | Out-Null
    Log "Tarefa ajustada: agora tambem roda quando o Windows liga."
  }
} catch {}

# ---- vigia: se o servidor nao esta rodando (ex.: voltou a energia e ele nao ligou), liga ----
try {
  $srv = Get-ScheduledTask -TaskName 'Discordia Servidor' -ErrorAction Stop
  if ($srv.State -ne 'Running') {
    Start-ScheduledTask -TaskName 'Discordia Servidor'
    Log "O servidor estava desligado (tarefa: $($srv.State)). Liguei de novo."
  }
} catch {}
$tsSvc = Get-Service Tailscale -ErrorAction SilentlyContinue
if ($tsSvc -and $tsSvc.Status -ne 'Running') { try { Start-Service Tailscale; Log "O Tailscale estava parado. Liguei de novo." } catch {} }

# atalho "Ligar Discordia" na area de trabalho de todos os usuarios deste PC
$lnk = Join-Path $env:PUBLIC 'Desktop\Ligar Discordia.lnk'
if (-not (Test-Path $lnk)) {
  try {
    $s = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk)
    $s.TargetPath = 'powershell.exe'
    $s.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $PSScriptRoot 'ligar.ps1')`""
    $s.WorkingDirectory = $Raiz
    $ico = Join-Path $Raiz 'desktop\build\icon.ico'
    $s.IconLocation = if (Test-Path $ico) { "$ico,0" } else { 'shell32.dll,137' }
    $s.Description = 'Liga o servidor do Discordia'
    $s.Save()
    Log "Criei o atalho 'Ligar Discordia' na area de trabalho."
  } catch {}
}

# a tarefa roda como SYSTEM, que nao e dono da pasta: libera so esta pasta para o git
$safe = $Raiz.Replace('\', '/')
function G { & git -c "safe.directory=$safe" @args }

G fetch origin main --quiet 2>$null
if ($LASTEXITCODE -ne 0) { Log "Nao consegui falar com o GitHub (git fetch falhou). Tento de novo em 1 minuto."; exit 0 }
$local = (G rev-parse HEAD).Trim()
$remoto = (G rev-parse origin/main).Trim()
if ($local -eq $remoto) { exit 0 }

$mudou = @(G diff --name-only $local $remoto)
Log ("Versao nova no GitHub: {0} -> {1} ({2} arquivos)" -f $local.Substring(0, 7), $remoto.Substring(0, 7), $mudou.Count)
# o npm install deste PC pode reescrever o package-lock.json: essa copia local nao vale nada e travava a atualizacao
G checkout -- package-lock.json 2>$null
G merge --ff-only origin/main --quiet 2>$null
if ($LASTEXITCODE -ne 0) { Log "Nao deu para atualizar: tem mudancas feitas a mao nesta pasta. Rode 'git status' em $Raiz para ver."; exit 1 }

if ($mudou -match '^package(-lock)?\.json$') {
  Log "Dependencias mudaram: rodando npm install"
  & npm install --omit=dev --no-fund --no-audit 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { Log "npm install falhou (codigo $LASTEXITCODE)" }
  G checkout -- package-lock.json 2>$null  # deixa a pasta igual ao GitHub para a proxima atualizacao
}

# so reinicia se mudou algo que o servidor usa (servidor, telas, scripts do servidor ou dependencias)
if ($mudou -match '^(server/|servidor-windows/|package(-lock)?\.json)') {
  & (Join-Path $PSScriptRoot 'reiniciar.ps1') | Out-Null
  Log "Servidor reiniciado com a versao nova."
} else {
  Log "Nada do servidor mudou (so o app ou documentacao). Sem reiniciar."
}
