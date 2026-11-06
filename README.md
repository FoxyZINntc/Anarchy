# Discordia

Chat com amigos, grupos com canais de texto e voz, calls, câmera e compartilhamento de tela. Funciona como programa de Windows (sem navegador) e também pelo navegador.

## Como funciona

- **Servidor** (`server/`): Node.js com Express e Socket.IO. Cuida das contas, amigos, grupos, mensagens e da conexão das calls (WebRTC).
- **Banco de dados**: Supabase (Postgres + Storage para imagens). Sem Supabase configurado, usa um arquivo local `dados/banco.json`.
- **App de computador** (`desktop/`): Electron. Pode **hospedar** o servidor no próprio PC (escondido perto do relógio) ou **entrar** no servidor de um amigo. Gera um link público pela Cloudflare para amigos de fora da rede.
- **Interface** (`server/public/`): HTML, CSS e JavaScript puro, servida pelo servidor.

## Funcionalidades

- Contas com usuário e senha, perfil com foto, banner, bio e status
- Amigos: pedidos, aceitar, recusar, remover
- Mensagens diretas e canais de grupo: imagens, reações, respostas, edição, @menções, formatação, "digitando..."
- Grupos com ícone, cor, código de convite e canais de texto e de voz
- Calls em salas de voz e ligação direta com toque
- Câmera e compartilhamento de tela (com som no Windows)
- 10 temas, cor de destaque, 8 fontes, tamanho do texto, balões ou lista, fundo personalizado, aperte-para-falar, supressão de ruído e mais

## Supabase

O servidor fala com o Supabase pela função `supabase/functions/discordia-db`, usando um **token de servidor**. A chave secreta do Supabase nunca sai do Supabase.

1. Rode `supabase/schema.sql` no SQL Editor e publique a função `discordia-db` (sem verificação de JWT). Já está feito no projeto `discordia`.
2. Gere um token, guarde o hash dele em `servidor_tokens` (veja o fim do `schema.sql`).
3. Configure `SUPABASE_URL` e `SUPABASE_DISCORDIA_TOKEN` no `.env`, ou no app em `desktop/servidor-padrao.json` (fora do git).

Também funciona com a chave service_role direto (`SUPABASE_SERVICE_ROLE_KEY`). Nenhum token ou chave vai para o GitHub.
As tabelas têm RLS ligado e sem políticas, então a chave pública (anon) não lê nada.

## Servidor 24/7

Para deixar o Discordia ligado o tempo todo num servidor de casa (Windows Server), com endereço fixo e app sem tela de IP, siga o [SERVIDOR.md](SERVIDOR.md).

## Rodar

```bash
npm install
npm start          # só o servidor, em http://localhost:3000
npm run app        # app de computador
npm run dist:win   # instalador do Windows (rodando no Windows)
npm run dist:cliente  # instalador enxuto, só o app, com o endereço de desktop/servidor.json
```

No Linux, `scripts/build-win-on-linux.sh` gera o instalador do Windows sem Wine.

## Estrutura

```
server/
  server.js        servidor (Express + Socket.IO + sinalização WebRTC)
  store.js         banco: Supabase ou arquivo local
  public/          interface (index.html, style.css, app.js)
desktop/
  main.js          janela, bandeja, servidor embutido, link público, seletor de tela
  preload.js       ponte segura entre a interface e o app
  ui/inicio.html   tela inicial, painel do servidor, seletor de tela
  build/           ícone e script do instalador
supabase/
  schema.sql       tabelas e bucket de imagens
```

## Limites

- Calls ligam cada pessoa com cada pessoa (mesh). Bom até umas 6 pessoas por sala.
- Em algumas redes (internet de celular) a call precisa de um servidor TURN. Configure em `dados/config.json` > `iceServers`.
- O link público gratuito da Cloudflare muda a cada vez que é gerado.
