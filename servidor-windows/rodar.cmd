@echo off
rem Roda o servidor do Anarchy para sempre: se ele cair, volta sozinho em 5 segundos.
rem Quem chama este arquivo e a tarefa "Discordia Servidor" (criada pelo instalar.ps1).
setlocal
cd /d "%~dp0.."
set SERVIDOR_24H=1
set NO_BROWSER=1
if not exist logs mkdir logs
:loop
rem guarda so o log mais recente (o anterior vira servidor-anterior.log)
for %%F in (logs\servidor.log) do if %%~zF GTR 10485760 move /y logs\servidor.log logs\servidor-anterior.log >nul
echo [%date% %time%] Iniciando o Anarchy >> logs\servidor.log
node server\server.js >> logs\servidor.log 2>&1
echo [%date% %time%] O servidor parou (codigo %errorlevel%). Reiniciando em 5 segundos... >> logs\servidor.log
timeout /t 5 /nobreak >nul
goto loop
