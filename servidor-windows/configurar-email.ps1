# Configura o envio de email do Anarchy (confirmar email da conta e "Esqueci a senha").
# Dê dois cliques em configurar-email.cmd. Abre uma janela com campos (dá para colar com Ctrl+V).
# Pede permissão de administrador sozinho (o .env só pode ser mexido por administradores),
# testa o login no servidor de email ANTES de salvar, grava no .env e reinicia o servidor.
# Modo de teste (não salva nem reinicia): configurar-email.ps1 -SoTestar
param([switch]$SoTestar, [string]$Print)
$Raiz = Split-Path -Parent $PSScriptRoot
Set-Location $Raiz

# pede administrador (abre de novo com permissão)
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin -and -not $SoTestar) {
  Start-Process powershell.exe -Verb RunAs -WindowStyle Hidden -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  exit 0
}

Add-Type -AssemblyName System.Windows.Forms, System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$SERVICOS = @(
  @{ nome = 'Gmail'; host = 'smtp.gmail.com'; porta = '465'; dica = "Login: seu endereço @gmail.com.`nSenha: a SENHA DE APP de 16 letras (myaccount.google.com/apppasswords), não a senha normal. Precisa da verificação em 2 etapas ligada." },
  @{ nome = 'Brevo (grátis, 300 por dia)'; host = 'smtp-relay.brevo.com'; porta = '587'; dica = "No brevo.com: SMTP e API > SMTP.`nLogin: o 'login SMTP' (algo como 12345a@smtp-brevo.com). Senha: a chave SMTP. O remetente precisa estar confirmado em Remetentes." },
  @{ nome = 'Outro serviço'; host = ''; porta = '587'; dica = 'Preencha o servidor SMTP e a porta (465 ou 587) do seu serviço de email.' }
)

$f = New-Object System.Windows.Forms.Form
$f.Text = 'Anarchy - configurar email'
$f.StartPosition = 'CenterScreen'; $f.FormBorderStyle = 'FixedDialog'; $f.MaximizeBox = $false
$f.Font = New-Object System.Drawing.Font('Segoe UI', 10)
$f.BackColor = [System.Drawing.Color]::White

$y = 16
function Rot($texto, $alto = 22, $negrito = $false) {
  $l = New-Object System.Windows.Forms.Label
  $l.Text = $texto; $l.Location = New-Object System.Drawing.Point(20, $script:y); $l.Size = New-Object System.Drawing.Size(480, $alto)
  if ($negrito) { $l.Font = New-Object System.Drawing.Font('Segoe UI', 13, [System.Drawing.FontStyle]::Bold) }
  $f.Controls.Add($l); $script:y += $alto; return $l
}
function Campo($largura = 480, $x = 20) {
  $t = New-Object System.Windows.Forms.TextBox
  $t.Location = New-Object System.Drawing.Point($x, $script:y); $t.Size = New-Object System.Drawing.Size($largura, 26)
  $f.Controls.Add($t); return $t
}

Rot 'Envio de email do Anarchy' 30 $true | Out-Null
Rot 'Para confirmar o email das contas e o "Esqueci a senha".' 30 | Out-Null

Rot 'Serviço de email' | Out-Null
$cb = New-Object System.Windows.Forms.ComboBox
$cb.DropDownStyle = 'DropDownList'; $cb.Location = New-Object System.Drawing.Point(20, $y); $cb.Size = New-Object System.Drawing.Size(480, 26)
$SERVICOS | ForEach-Object { [void]$cb.Items.Add($_.nome) }
$f.Controls.Add($cb); $y += 36

Rot 'Servidor SMTP                                                                        Porta' | Out-Null
$tHost = Campo 380; $tPorta = Campo 90 410; $y += 36

Rot 'Login' | Out-Null
$tUser = Campo; $y += 36

Rot 'Senha de app / chave SMTP' | Out-Null
$tPass = Campo 380; $tPass.UseSystemPasswordChar = $true
$ver = New-Object System.Windows.Forms.CheckBox
$ver.Text = 'Mostrar'; $ver.Location = New-Object System.Drawing.Point(410, ($y + 2)); $ver.Size = New-Object System.Drawing.Size(90, 24)
$ver.Add_CheckedChanged({ $tPass.UseSystemPasswordChar = -not $ver.Checked }); $f.Controls.Add($ver); $y += 36

Rot 'Email que aparece como remetente' | Out-Null
$tFrom = Campo; $y += 36

Rot 'Mandar um email de teste para' | Out-Null
$tTo = Campo; $y += 38

$dica = Rot '' 52
$dica.ForeColor = [System.Drawing.Color]::DimGray; $dica.Font = New-Object System.Drawing.Font('Segoe UI', 9)
$y += 4
$status = Rot '' 50
$status.Font = New-Object System.Drawing.Font('Segoe UI', 9.5, [System.Drawing.FontStyle]::Bold)

$y += 6
$bOk = New-Object System.Windows.Forms.Button
$bOk.Text = $(if ($SoTestar) { 'Testar' } else { 'Testar e salvar' }); $bOk.Location = New-Object System.Drawing.Point(250, $y); $bOk.Size = New-Object System.Drawing.Size(150, 34)
$bOk.BackColor = [System.Drawing.Color]::FromArgb(215, 20, 31); $bOk.ForeColor = [System.Drawing.Color]::White; $bOk.FlatStyle = 'Flat'
$bFechar = New-Object System.Windows.Forms.Button
$bFechar.Text = 'Fechar'; $bFechar.Location = New-Object System.Drawing.Point(410, $y); $bFechar.Size = New-Object System.Drawing.Size(90, 34)
$bFechar.Add_Click({ $f.Close() })
$f.Controls.AddRange(@($bOk, $bFechar)); $f.AcceptButton = $bOk; $f.CancelButton = $bFechar
# a janela do tamanho exato do conteúdo (sem a escala automática, que cortava os botões em telas com zoom)
$f.AutoScaleMode = 'None'
$f.ClientSize = New-Object System.Drawing.Size(520, ($y + 50))

$cb.Add_SelectedIndexChanged({
  $s = $SERVICOS[$cb.SelectedIndex]
  $outro = $s.host -eq ''
  if (-not $outro) { $tHost.Text = $s.host; $tPorta.Text = $s.porta } elseif ($SERVICOS.host -contains $tHost.Text) { $tHost.Text = ''; $tPorta.Text = $s.porta }
  $tHost.ReadOnly = -not $outro; $tPorta.ReadOnly = -not $outro
  $dica.Text = $s.dica
})
$cb.SelectedIndex = 0
# o que vier colado: tira espaços e quebras de linha das pontas (e no Gmail, os espaços da senha de app)
$tUser.Add_Leave({ $tUser.Text = $tUser.Text.Trim(); if (-not $tFrom.Text -and $tUser.Text -match '@' -and $tUser.Text -notmatch 'smtp-brevo') { $tFrom.Text = $tUser.Text } })
$tFrom.Add_Leave({ $tFrom.Text = $tFrom.Text.Trim(); if (-not $tTo.Text) { $tTo.Text = $tFrom.Text } })

function Msg($t, $cor) { $status.ForeColor = $cor; $status.Text = $t; [System.Windows.Forms.Application]::DoEvents() }
$vermelho = [System.Drawing.Color]::FromArgb(200, 20, 30); $verde = [System.Drawing.Color]::FromArgb(20, 130, 60); $azul = [System.Drawing.Color]::FromArgb(40, 80, 200)

$bOk.Add_Click({
  $hostSmtp = $tHost.Text.Trim(); $porta = $tPorta.Text.Trim(); $usuario = $tUser.Text.Trim(); $senha = $tPass.Text.Trim(); $remet = $tFrom.Text.Trim(); $teste = $tTo.Text.Trim()
  if ($cb.SelectedIndex -eq 0) { $senha = $senha -replace '\s', '' }
  if ($remet -match '<(.+)>') { $remet = $Matches[1].Trim() }
  if (-not $teste) { $teste = $remet }
  if (-not $hostSmtp -or $porta -notmatch '^\d+$') { return Msg 'Preencha o servidor SMTP e a porta.' $vermelho }
  if (-not $usuario) { return Msg 'Preencha o login.' $vermelho }
  if (-not $senha) { return Msg 'Preencha a senha de app / chave SMTP.' $vermelho }
  if ($remet -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$') { return Msg 'O email do remetente não parece certo.' $vermelho }
  if ($teste -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$') { return Msg 'O email de teste não parece certo.' $vermelho }

  $bOk.Enabled = $false; $f.UseWaitCursor = $true
  try {
    if (-not (Test-Path (Join-Path $Raiz 'node_modules\nodemailer'))) {
      Msg 'Instalando a peça que manda emails (pode levar 1 minuto)...' $azul
      & npm install --omit=dev --no-fund --no-audit 2>&1 | Out-Null
      & git -c "safe.directory=$($Raiz.Replace('\','/'))" checkout -- package-lock.json 2>$null
    }
    Msg 'Testando o login e mandando o email de teste...' $azul
    # a senha vai pelo ambiente, nunca na linha de comando
    $env:SMTP_HOST = $hostSmtp; $env:SMTP_PORT = $porta; $env:SMTP_USER = $usuario; $env:SMTP_PASS = $senha; $env:EMAIL_FROM = "Anarchy <$remet>"
    Remove-Item Env:EMAIL_TESTE_PASTA -ErrorAction SilentlyContinue
    $saida = & node (Join-Path $PSScriptRoot 'testar-email.js') $teste 2>&1 | Out-String
    $env:SMTP_PASS = $null
    if ($saida -notmatch 'OK_LOGIN') {
      $motivo = (($saida -split "`n" | Where-Object { $_ -match 'ERRO' }) -join ' ').Replace('ERRO_LOGIN ', '').Trim()
      if (-not $motivo) { $motivo = $saida.Trim() }
      $extra = if ($cb.SelectedIndex -eq 0) { ' Use a senha de app de 16 letras, não a senha normal.' } else { '' }
      return Msg "O serviço de email recusou: $motivo.$extra Nada foi salvo." $vermelho
    }
    $envioOk = $saida -match 'OK_ENVIO'
    $avisoEnvio = if ($envioOk) { "Email de teste enviado para $teste (olhe também o spam)." } else { 'O login funcionou, mas o email de teste falhou: ' + (($saida -split "`n" | Where-Object { $_ -match 'ERRO_ENVIO' }) -join ' ').Replace('ERRO_ENVIO ', '').Trim() }
    if ($SoTestar) { return Msg "Login aceito! $avisoEnvio (modo teste: nada foi salvo)" $verde }

    Msg 'Salvando e reiniciando o servidor do Anarchy...' $azul
    $envFile = Join-Path $Raiz '.env'
    $txt = if (Test-Path $envFile) { [IO.File]::ReadAllText($envFile) } else { '' }
    $txt = [regex]::Replace($txt, '(?m)^\s*(SMTP_HOST|SMTP_PORT|SMTP_USER|SMTP_PASS|EMAIL_FROM)=.*(\r?\n)?', '')
    $txt = [regex]::Replace($txt, '(?m)^# Email \(configurado pelo configurar-email.*(\r?\n)?', '')
    $txt = $txt.TrimEnd() + "`r`n`r`n# Email (configurado pelo configurar-email em $(Get-Date -Format 'dd/MM/yyyy HH:mm'))`r`nSMTP_HOST=$hostSmtp`r`nSMTP_PORT=$porta`r`nSMTP_USER=$usuario`r`nSMTP_PASS=$senha`r`nEMAIL_FROM=Anarchy <$remet>`r`n"
    [IO.File]::WriteAllText($envFile, $txt, (New-Object Text.UTF8Encoding $false))
    # só administradores e o sistema leem o .env (tem senhas)
    & icacls $envFile /inheritance:r /grant:r "*S-1-5-32-544:F" "*S-1-5-18:F" | Out-Null
    & (Join-Path $PSScriptRoot 'reiniciar.ps1') | Out-Null
    Msg "Pronto! Salvo e servidor reiniciado. $avisoEnvio" $verde
    [System.Windows.Forms.MessageBox]::Show("Tudo certo!`n`n$avisoEnvio`n`nNa próxima vez que a galera entrar, o Anarchy vai pedir o email de recuperação.", 'Anarchy', 'OK', 'Information') | Out-Null
  } catch {
    Msg ('Deu um erro: ' + $_.Exception.Message) $vermelho
  } finally { $bOk.Enabled = $true; $f.UseWaitCursor = $false }
})

$f.Add_Shown({ $f.Activate(); $tUser.Focus() })
# -Print arquivo.png: só desenha a janela numa imagem e fecha (para conferir o layout)
if ($Print) { $f.Add_Shown({ $b = New-Object System.Drawing.Bitmap($f.Width, $f.Height); $f.DrawToBitmap($b, (New-Object System.Drawing.Rectangle(0, 0, $f.Width, $f.Height))); $b.Save($Print); $b.Dispose(); $f.Close() }) }
[void]$f.ShowDialog()
