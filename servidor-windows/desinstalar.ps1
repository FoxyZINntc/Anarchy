# Para e remove o servidor 24/7 (os dados e o .env continuam na pasta).
# Rode no PowerShell como Administrador.
Stop-ScheduledTask -TaskName 'Discordia Servidor' -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName 'Discordia Servidor' -Confirm:$false -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName 'Discordia Auto Atualizar' -Confirm:$false -ErrorAction SilentlyContinue
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'server[\\/]server\.js' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
$ts = 'C:\Program Files\Tailscale\tailscale.exe'
if (Test-Path $ts) { & $ts funnel reset }
Write-Host "Servidor do Anarchy removido. Os dados continuam em server\dados (ou no Supabase)." -ForegroundColor Green
