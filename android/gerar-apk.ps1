# Gera o Anarchy.apk (app de celular) em dist\Anarchy.apk.
# Precisa das ferramentas em %LOCALAPPDATA%\Anarchy-build (Java 17, Android SDK e Gradle)
# e da chave de assinatura apontada em android\keystore.properties (fora do git).
#   .\android\gerar-apk.ps1                 -> APK final, conectado ao servidor de casa
#   .\android\gerar-apk.ps1 -Teste          -> APK de teste apontando para http://localhost:3555 (emulador com adb reverse tcp:3555 tcp:3555)
param([switch]$Teste)
$ErrorActionPreference = 'Stop'
$b = Join-Path $env:LOCALAPPDATA 'Anarchy-build'
$env:JAVA_HOME = Join-Path $b 'jdk17'
$env:ANDROID_HOME = Join-Path $b 'sdk'
$env:Path = (Join-Path $env:JAVA_HOME 'bin') + ';' + $env:Path
$aqui = $PSScriptRoot
Set-Content -Encoding ascii (Join-Path $aqui 'local.properties') ('sdk.dir=' + ($env:ANDROID_HOME -replace '\\', '\\'))
Push-Location $aqui
try {
  if ($Teste) { & .\gradlew.bat --no-daemon -q assembleDebug "-PserverUrl=http://localhost:3555"; $apk = 'app\build\outputs\apk\debug\app-debug.apk'; $saida = 'Anarchy-teste.apk' }
  else {
    if (-not (Test-Path keystore.properties)) { throw 'Falta android\keystore.properties (chave de assinatura).' }
    & .\gradlew.bat --no-daemon -q assembleRelease; $apk = 'app\build\outputs\apk\release\app-release.apk'; $saida = 'Anarchy.apk'
  }
  if ($LASTEXITCODE -ne 0) { throw 'O Gradle falhou.' }
  $dist = Join-Path (Split-Path $aqui) 'dist'
  New-Item -ItemType Directory -Force $dist | Out-Null
  Copy-Item $apk (Join-Path $dist $saida) -Force
  Write-Host "Pronto: dist\$saida"
} finally { Pop-Location }
