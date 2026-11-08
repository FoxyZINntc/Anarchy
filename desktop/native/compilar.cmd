@echo off
rem Gera o desktop\native\somtela.exe com o compilador C# que ja vem no Windows (.NET Framework 4).
cd /d "%~dp0"
"%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /nologo /optimize+ /platform:x64 /target:exe /out:somtela.exe somtela.cs
