# Discordia 24/7 no seu servidor de casa (Windows Server)

O resultado: o servidor fica ligado o tempo todo, com um **endereço fixo e grátis** (`https://seu-servidor.algo.ts.net`), sem abrir porta no roteador e sem mostrar o IP da sua casa. O app que seus amigos instalam já vem com esse endereço: eles só abrem, falam com o Porteiro e entram, igual ao Discord.

```
amigo (app)  ──https──▶  Tailscale Funnel  ──túnel──▶  seu Windows Server (Node, porta 3000)  ──▶  Supabase (dados)
```

## 1. Preparar o servidor (uma vez)

1. Instale o **Node.js LTS** (20 ou mais novo): https://nodejs.org
2. Instale o **Git**: https://git-scm.com/download/win
3. Baixe o projeto (PowerShell):
   ```powershell
   cd C:\
   git clone https://github.com/FoxyZINntc/Discordia.git
   cd C:\Discordia
   ```
4. Instale o **Tailscale**: https://tailscale.com/download/windows e entre com sua conta (pode ser a do Google ou do GitHub).
5. No painel do Tailscale (https://login.tailscale.com/admin/dns), ligue **HTTPS Certificates**. O Funnel usa isso.

## 2. Instalar o servidor 24/7

No PowerShell **como Administrador**, dentro de `C:\Discordia`:

```powershell
powershell -ExecutionPolicy Bypass -File .\servidor-windows\instalar.ps1
```

O script:
- instala as dependências do servidor (sem o Electron);
- cria o `.env` e pede o **token do servidor** do Supabase (fica só nessa máquina, nunca vai pro GitHub);
- cria a tarefa **"Discordia Servidor"**, que liga junto com o Windows (mesmo sem ninguém logado) e reinicia o servidor sozinha se ele cair;
- liga o **Tailscale Funnel** e mostra o seu endereço fixo.

Na primeira vez, o Funnel pode mostrar um link pedindo autorização. Abra, aprove e rode o script de novo.

Para ver como está: `.\servidor-windows\status.ps1`. Para reiniciar: `.\servidor-windows\reiniciar.ps1`. Para remover: `.\servidor-windows\desinstalar.ps1`.
Os logs ficam em `logs\servidor.log`.

## 3. Gerar o app dos seus amigos

No seu PC (não precisa ser no servidor):

1. Coloque o endereço que o script mostrou em `desktop/servidor.json`:
   ```json
   { "url": "https://seu-servidor.tailXXXX.ts.net" }
   ```
2. Gere o instalador enxuto (só o app, sem o servidor dentro):
   ```bash
   npm run dist:cliente
   ```
3. Mande o `dist-cliente/Discordia Setup.exe` para os amigos.

Com o endereço embutido, o app abre direto no seu servidor. Não existe mais tela de "digitar IP" nem "hospedar". Se o servidor cair, o app mostra "fora do ar" e reconecta sozinho quando ele voltar.

## 4. Calls em qualquer rede (recomendado)

Chat e mensagens passam pelo túnel sem problema. Já voz, câmera e tela vão direto entre as pessoas (WebRTC) e, em 4G ou internet com CGNAT, precisam de um **TURN** (um repetidor de mídia).

O jeito mais fácil e grátis é o TURN da Cloudflare (1000 GB/mês grátis, **não precisa de domínio**):
1. Crie uma conta grátis em https://dash.cloudflare.com
2. Vá em **Realtime > TURN Server > Create**.
3. Copie o **Turn Token ID** e o **API Token** para o `.env` do servidor:
   ```
   CF_TURN_KEY_ID=...
   CF_TURN_API_TOKEN=...
   ```
4. Reinicie: `.\servidor-windows\reiniciar.ps1` (como Administrador)

O servidor gera credenciais novas sozinho a cada 12 horas.

## Bom saber

- **Limite das calls:** cada pessoa liga com cada pessoa (mesh). Fica bom até umas 6 pessoas por sala. Para salas grandes, o próximo passo seria um servidor de mídia (LiveKit), que também roda no seu servidor.
- **Atualização automática:** o `instalar.ps1` liga a tarefa "Discordia Auto Atualizar", que confere o GitHub a cada 1 minuto e, se tiver versão nova, baixa e reinicia o servidor sozinha. Quem está com o app aberto vê a barra "Atualizar". Para ligar num servidor já instalado: `.\servidor-windows\auto-atualizar.ps1 -Instalar` (como Administrador). O histórico fica em `logs\atualizacao.log`.
- **Atualizar na mão:** `git pull` em `C:\Discordia`, depois `.\servidor-windows\reiniciar.ps1`.
- **Quando comprar um domínio:** dá para trocar o Tailscale pelo Cloudflare Tunnel com `chat.seudominio.com`. Só muda o endereço em `desktop/servidor.json` e gera o app de novo.
