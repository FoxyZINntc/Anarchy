@echo off
rem Abre o FigCraft com a porta de controle que o MCP do Claude usa (9333).
rem Os designs ficam na pasta design\ do projeto.
start "" "E:\Crafts\FigCraft\figcraft.exe" --control 9333 --automation-write-root "%~dp0..\design"
