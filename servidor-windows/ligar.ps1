# Liga o servidor do Discordia na mao (o atalho "Ligar Discordia" na area de trabalho chama este arquivo).
# Use quando o servidor nao voltou sozinho, por exemplo depois de faltar energia.
$Raiz = '__RAIZ__'
$Pasta = Join-Path $Raiz 'servidor-windows'
Set-Location $Raiz

# precisa de administrador para mexer na tarefa: pede e abre de novo
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) {
  Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  exit 0
}

$Tarefa = 'Discordia Servidor'
$porta = 3000
$envFile = Join-Path $Raiz '.env'
if (Test-Path $envFile) { $m = [regex]::Match((Get-Content $envFile -Raw), '(?m)^PORT=(\d+)'); if ($m.Success) { $porta = [int]$m.Groups[1].Value } }
function Responde { try { Invoke-RestMethod "http://localhost:$porta/api/config" -TimeoutSec 3 | Out-Null; $true } catch { $false } }

Write-Host "Ligando o Discordia..." -ForegroundColor Cyan

# 1. Tailscale (e ele que deixa o endereco publico no ar)
$svc = Get-Service Tailscale -ErrorAction SilentlyContinue
if ($svc -and $svc.Status -ne 'Running') { Start-Service Tailscale; Write-Host "Tailscale ligado." -ForegroundColor Green }

# 2. servidor
if (Responde) {
  Write-Host "O servidor ja estava no ar." -ForegroundColor Green
} else {
  $t = Get-ScheduledTask -TaskName $Tarefa -ErrorAction SilentlyContinue
  if (-not $t) { Write-Host "A tarefa '$Tarefa' nao existe. Rode o instalar.ps1 como administrador." -ForegroundColor Red; Read-Host "Enter para fechar"; exit 1 }
  & (Join-Path $Pasta 'reiniciar.ps1') | Out-Null
  Write-Host "Esperando o servidor responder" -NoNewline
  $ok = $false
  for ($i = 0; $i -lt 40; $i++) { Start-Sleep 1; Write-Host "." -NoNewline; if (Responde) { $ok = $true; break } }
  Write-Host ""
  if ($ok) { Write-Host "Servidor no ar." -ForegroundColor Green }
  else { Write-Host "O servidor nao respondeu. Veja o log abaixo." -ForegroundColor Red }
}

# 3. endereco publico
$ts = 'C:\Program Files\Tailscale\tailscale.exe'
if (Test-Path $ts) {
  & $ts funnel --bg $porta | Out-Null
  Write-Host ""; & $ts funnel status
}

Write-Host ""
& (Join-Path $Pasta 'status.ps1')
Write-Host ""
Read-Host "Pronto. Enter para fechar"
