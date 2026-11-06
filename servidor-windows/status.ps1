# Mostra se o servidor do Discordia esta rodando, o endereco publico e o fim do log.
$Raiz = Split-Path -Parent $PSScriptRoot
$t = Get-ScheduledTask -TaskName 'Discordia Servidor' -ErrorAction SilentlyContinue
if ($t) { Write-Host "Tarefa: $($t.State)" } else { Write-Host "Tarefa: nao instalada (rode instalar.ps1)" -ForegroundColor Yellow }
$porta = 3000
$envFile = Join-Path $Raiz '.env'
if (Test-Path $envFile) { $m = [regex]::Match((Get-Content $envFile -Raw), '(?m)^PORT=(\d+)'); if ($m.Success) { $porta = [int]$m.Groups[1].Value } }
try { Invoke-RestMethod "http://localhost:$porta/api/config" -TimeoutSec 3 | Out-Null; Write-Host "Servidor: respondendo em http://localhost:$porta" -ForegroundColor Green }
catch { Write-Host "Servidor: NAO respondeu em http://localhost:$porta" -ForegroundColor Red }
$ts = 'C:\Program Files\Tailscale\tailscale.exe'
if (Test-Path $ts) { Write-Host ""; Write-Host "Tailscale Funnel:"; & $ts funnel status }
$log = Join-Path $Raiz 'logs\servidor.log'
if (Test-Path $log) { Write-Host ""; Write-Host "Ultimas linhas do log:"; Get-Content $log -Tail 15 }
