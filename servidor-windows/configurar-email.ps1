# Configura o envio de email do Anarchy (confirmar email da conta e "Esqueci a senha").
# De dois cliques em configurar-email.cmd (ou rode este arquivo no PowerShell).
# Ele pede permissao de administrador sozinho (o .env so pode ser mexido por administradores),
# testa o login no servidor de email ANTES de salvar, grava no .env e reinicia o servidor.
$ErrorActionPreference = 'Stop'
$Raiz = Split-Path -Parent $PSScriptRoot
Set-Location $Raiz

# pede administrador (abre uma janela nova com permissao)
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) {
  Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  exit 0
}

function Titulo($t) { Write-Host ""; Write-Host "==> $t" -ForegroundColor Cyan }
function Ok($t) { Write-Host "    $t" -ForegroundColor Green }
function Aviso($t) { Write-Host "    $t" -ForegroundColor Yellow }
function Erro($t) { Write-Host "    $t" -ForegroundColor Red }
function Fim($cod) { Write-Host ""; Read-Host "Aperte Enter para fechar" | Out-Null; exit $cod }

Write-Host ""
Write-Host "  Anarchy - configurar o envio de email" -ForegroundColor White
Write-Host "  (para confirmar o email das contas e o 'Esqueci a senha')" -ForegroundColor DarkGray

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { Erro "O Node.js nao foi encontrado neste PC."; Fim 1 }
if (-not (Test-Path (Join-Path $Raiz 'node_modules\nodemailer'))) {
  Titulo "Instalando a peca que manda emails (nodemailer)"
  & npm install --omit=dev --no-fund --no-audit 2>&1 | Out-Null
  & git -c "safe.directory=$($Raiz.Replace('\','/'))" checkout -- package-lock.json 2>$null
  if (-not (Test-Path (Join-Path $Raiz 'node_modules\nodemailer'))) { Erro "Nao consegui instalar. Rode 'npm install' em $Raiz e tente de novo."; Fim 1 }
  Ok "Pronto"
}

Titulo "Qual servico de email voce vai usar?"
Write-Host "    1) Gmail (precisa de 'senha de app': myaccount.google.com/apppasswords)"
Write-Host "    2) Brevo (gratis, 300 emails por dia: brevo.com > SMTP e API > SMTP)"
Write-Host "    3) Outro (vou digitar o servidor SMTP)"
$op = (Read-Host "    Digite 1, 2 ou 3").Trim()
switch ($op) {
  '1' { $hostSmtp = 'smtp.gmail.com'; $porta = '465' }
  '2' { $hostSmtp = 'smtp-relay.brevo.com'; $porta = '587' }
  default {
    $hostSmtp = (Read-Host "    Servidor SMTP (ex.: smtp.exemplo.com)").Trim()
    $porta = (Read-Host "    Porta (465 ou 587)").Trim(); if (-not $porta) { $porta = '587' }
  }
}
if (-not $hostSmtp) { Erro "Faltou o servidor SMTP."; Fim 1 }

Titulo "Login do email"
if ($op -eq '2') { Write-Host "    No Brevo, o login SMTP aparece em SMTP e API > SMTP (algo como 12345a@smtp-brevo.com)." -ForegroundColor DarkGray }
$usuario = (Read-Host "    Login (no Gmail, o seu endereco @gmail.com)").Trim()
if (-not $usuario) { Erro "Faltou o login."; Fim 1 }
$seg = Read-Host "    Senha de app / chave SMTP (nao aparece enquanto digita)" -AsSecureString
$senha = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($seg))
if ($op -eq '1') { $senha = $senha -replace '\s', '' } # o Google mostra a senha de app com espacos
if (-not $senha) { Erro "Faltou a senha."; Fim 1 }
$padrao = if ($usuario -match '@' -and $usuario -notmatch 'smtp-brevo') { $usuario } else { '' }
$remet = (Read-Host "    Email que aparece como remetente$(if ($padrao) { " (Enter = $padrao)" })").Trim()
if (-not $remet) { $remet = $padrao }
if (-not $remet) { Erro "Faltou o email do remetente."; Fim 1 }

# testa antes de salvar (a senha vai pelo ambiente, nunca na linha de comando)
Titulo "Testando o login no servidor de email"
$env:SMTP_HOST = $hostSmtp; $env:SMTP_PORT = $porta; $env:SMTP_USER = $usuario; $env:SMTP_PASS = $senha; $env:EMAIL_FROM = "Anarchy <$remet>"
Remove-Item Env:EMAIL_TESTE_PASTA -ErrorAction SilentlyContinue
$teste = (Read-Host "    Para qual email mando um teste? (Enter = $remet)").Trim(); if (-not $teste) { $teste = $remet }
$saida = & node (Join-Path $PSScriptRoot 'testar-email.js') $teste 2>&1 | Out-String
if ($saida -notmatch 'OK_LOGIN') {
  Erro "O servidor de email recusou o login:"
  Erro ("    " + (($saida -split "`n" | Where-Object { $_ -match 'ERRO' }) -join ' ').Replace('ERRO_LOGIN ', ''))
  if ($op -eq '1') { Aviso "No Gmail: use a SENHA DE APP de 16 letras (nao a senha normal) e confira se a verificacao em 2 etapas esta ligada." }
  Aviso "Nada foi salvo. Rode de novo e confira os dados."
  Fim 1
}
Ok "Login aceito."
if ($saida -match 'OK_ENVIO') { Ok "Email de teste enviado para $teste (olhe tambem o spam)." }
else { Aviso ("O login funcionou, mas o envio do teste falhou: " + (($saida -split "`n" | Where-Object { $_ -match 'ERRO_ENVIO' }) -join ' ').Replace('ERRO_ENVIO ', '')); Aviso "Vou salvar mesmo assim. Se os emails nao chegarem, confira o remetente no servico de email." }

# grava no .env (tira as linhas antigas de email e poe as novas)
Titulo "Salvando no .env"
$envFile = Join-Path $Raiz '.env'
$txt = if (Test-Path $envFile) { [IO.File]::ReadAllText($envFile) } else { '' }
$txt = [regex]::Replace($txt, '(?m)^\s*(SMTP_HOST|SMTP_PORT|SMTP_USER|SMTP_PASS|EMAIL_FROM)=.*(\r?\n)?', '')
$txt = $txt.TrimEnd() + "`r`n`r`n# Email (configurado pelo configurar-email.ps1 em $(Get-Date -Format 'dd/MM/yyyy HH:mm'))`r`nSMTP_HOST=$hostSmtp`r`nSMTP_PORT=$porta`r`nSMTP_USER=$usuario`r`nSMTP_PASS=$senha`r`nEMAIL_FROM=Anarchy <$remet>`r`n"
[IO.File]::WriteAllText($envFile, $txt, (New-Object Text.UTF8Encoding $false))
# so administradores e o sistema leem o .env (tem senhas)
& icacls $envFile /inheritance:r /grant:r "*S-1-5-32-544:F" "*S-1-5-18:F" | Out-Null
$senha = $null; $env:SMTP_PASS = $null
Ok "Salvo."

Titulo "Reiniciando o servidor do Anarchy"
& (Join-Path $PSScriptRoot 'reiniciar.ps1')
Write-Host ""
Ok "Pronto! Na proxima vez que a galera entrar, o Anarchy vai pedir o email de recuperacao."
Fim 0
