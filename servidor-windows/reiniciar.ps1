# Reinicia o servidor do Discordia (use depois de mudar o .env ou de um git pull).
# Rode no PowerShell como Administrador.
$Tarefa = 'Discordia Servidor'
Stop-ScheduledTask -TaskName $Tarefa -ErrorAction SilentlyContinue
# a tarefa para o cmd.exe, mas o node pode continuar vivo: fecha ele tambem
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'server[\\/]server\.js' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Start-Sleep 2
Start-ScheduledTask -TaskName $Tarefa
Write-Host "Servidor do Discordia reiniciado." -ForegroundColor Green
