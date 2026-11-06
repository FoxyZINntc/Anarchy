# Instala o servidor do Discordia no Windows Server para rodar 24/7.
# Rode no PowerShell COMO ADMINISTRADOR, dentro da pasta do projeto:
#   powershell -ExecutionPolicy Bypass -File .\servidor-windows\instalar.ps1
#   Para trocar o token salvo: ... instalar.ps1 -TrocarToken
param([switch]$TrocarToken)
$ErrorActionPreference = 'Stop'
$Tarefa = 'Discordia Servidor'
$Raiz = Split-Path -Parent $PSScriptRoot
Set-Location $Raiz

function Passo($t) { Write-Host ""; Write-Host "==> $t" -ForegroundColor Cyan }
function Ok($t) { Write-Host "    $t" -ForegroundColor Green }
function Aviso($t) { Write-Host "    $t" -ForegroundColor Yellow }

# 0. administrador
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) { Write-Host "Abra o PowerShell como Administrador e rode de novo." -ForegroundColor Red; exit 1 }

# 1. Node.js
Passo "Conferindo o Node.js"
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Host "    O Node.js nao esta instalado. Baixe a versao LTS em https://nodejs.org e rode este script de novo." -ForegroundColor Red
  exit 1
}
$versao = (& node -v).TrimStart('v'); $maior = [int]($versao.Split('.')[0])
if ($maior -lt 20) { Write-Host "    Node $versao e antigo demais. Instale o Node 20 ou mais novo (LTS) em https://nodejs.org" -ForegroundColor Red; exit 1 }
Ok "Node $versao"

# 2. dependencias (sem o Electron: o servidor nao precisa dele)
Passo "Instalando as dependencias do servidor"
& npm install --omit=dev --no-fund --no-audit
if ($LASTEXITCODE -ne 0) { Write-Host "    npm install falhou." -ForegroundColor Red; exit 1 }
Ok "Pronto"

# 3. .env com o token do Supabase
Passo "Configuracao (.env)"
$envFile = Join-Path $Raiz '.env'
if (-not (Test-Path $envFile)) { Copy-Item (Join-Path $Raiz '.env.example') $envFile; Aviso ".env criado a partir do .env.example" }
$envTxt = Get-Content $envFile -Raw
if ($TrocarToken) { $envTxt = [regex]::Replace($envTxt, '(?m)^SUPABASE_SERVICE_ROLE_KEY=.*\r?\n?', '') }
if ($TrocarToken -or $envTxt -match 'SUPABASE_DISCORDIA_TOKEN=cole-aqui' -or $envTxt -notmatch 'SUPABASE_DISCORDIA_TOKEN=\S{20,}') {
  $tok = Read-Host "    Cole o token do servidor (SUPABASE_DISCORDIA_TOKEN) ou aperte Enter para usar banco local"
  if ($tok.Trim()) {
    $envTxt = [regex]::Replace($envTxt, '(?m)^SUPABASE_DISCORDIA_TOKEN=.*$', 'SUPABASE_DISCORDIA_TOKEN=' + $tok.Trim())
    if ($envTxt -notmatch '(?m)^SUPABASE_DISCORDIA_TOKEN=') { $envTxt += "`r`nSUPABASE_DISCORDIA_TOKEN=$($tok.Trim())" }
    Set-Content $envFile $envTxt -Encoding ascii -NoNewline
    Ok "Token salvo no .env"
  } else { Aviso "Sem token: os dados ficam so em server\dados neste servidor." }
} else { Ok "Token do Supabase ja configurado" }
# so administradores e o sistema podem ler o .env (tem o token)
& icacls $envFile /inheritance:r /grant:r "*S-1-5-32-544:F" "*S-1-5-18:F" | Out-Null

# 4. tarefa que liga junto com o Windows e reinicia sozinha
Passo "Criando a tarefa '$Tarefa' (liga com o Windows, mesmo sem ninguem logado)"
$acao = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument "/c `"$Raiz\servidor-windows\rodar.cmd`"" -WorkingDirectory $Raiz
$gatilho = New-ScheduledTaskTrigger -AtStartup
$quem = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$ajustes = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'server[\\/]server\.js' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Register-ScheduledTask -TaskName $Tarefa -Action $acao -Trigger $gatilho -Principal $quem -Settings $ajustes -Force | Out-Null
Start-ScheduledTask -TaskName $Tarefa
Ok "Tarefa criada e iniciada"

# 5. confere se respondeu
Passo "Esperando o servidor responder"
$porta = 3000
$m = [regex]::Match((Get-Content $envFile -Raw), '(?m)^PORT=(\d+)'); if ($m.Success) { $porta = [int]$m.Groups[1].Value }
$no = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep 1
  try { $r = Invoke-RestMethod "http://localhost:$porta/api/config" -TimeoutSec 2; if ($r.iceServers) { $no = $true; break } } catch {}
}
if ($no) { Ok "Servidor no ar em http://localhost:$porta" } else { Aviso "Ainda nao respondeu. Veja o log em $Raiz\logs\servidor.log"; }

# 6. endereco publico fixo pelo Tailscale Funnel
Passo "Endereco publico (Tailscale Funnel)"
$ts = Get-Command tailscale -ErrorAction SilentlyContinue
if (-not $ts -and (Test-Path 'C:\Program Files\Tailscale\tailscale.exe')) { $ts = Get-Item 'C:\Program Files\Tailscale\tailscale.exe' }
if (-not $ts) {
  Aviso "Tailscale nao encontrado. Instale em https://tailscale.com/download/windows, entre na sua conta"
  Aviso "e rode este script de novo para ligar o endereco publico."
} else {
  $tsExe = if ($ts.Source) { $ts.Source } else { $ts.FullName }
  & $tsExe funnel --bg $porta
  if ($LASTEXITCODE -ne 0) {
    Aviso "O Funnel pediu uma autorizacao. Abra o link acima, aprove e rode este script de novo."
  } else {
    $dns = ((& $tsExe status --json) | ConvertFrom-Json).Self.DNSName.TrimEnd('.')
    $url = "https://$dns"
    $envTxt = Get-Content $envFile -Raw
    if ($envTxt -match '(?m)^PUBLIC_URL=') { $envTxt = [regex]::Replace($envTxt, '(?m)^PUBLIC_URL=.*$', "PUBLIC_URL=$url") } else { $envTxt = $envTxt.TrimEnd() + "`r`nPUBLIC_URL=$url`r`n" }
    Set-Content $envFile $envTxt -Encoding ascii -NoNewline
    Restart-ScheduledTask -TaskName $Tarefa -ErrorAction SilentlyContinue
    Write-Host ""
    Write-Host "    ENDERECO DO SEU DISCORDIA:  $url" -ForegroundColor Green
    Write-Host "    Coloque esse endereco em desktop\servidor.json antes de gerar o app (veja o SERVIDOR.md)." -ForegroundColor Green
  }
}
Write-Host ""
Write-Host "Tudo certo. Para ver como o servidor esta: .\servidor-windows\status.ps1" -ForegroundColor Cyan
