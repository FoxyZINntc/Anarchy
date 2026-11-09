@echo off
rem De dois cliques aqui para configurar o envio de email do Anarchy (abre uma janela com campos).
start "" powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0configurar-email.ps1"
