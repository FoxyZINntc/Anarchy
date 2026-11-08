# Discordia: alterações recentes

## Avatar (componente único: `av()` em `server/public/app.js`, estilos em `v2.css`)

Camadas dentro do próprio avatar, com `isolation: isolate`, para que nada vaze para outros avatares:

| Camada | Elemento | O que faz |
|---|---|---|
| 0 | `.av::before` | Anel verde de "falando", do lado de fora da moldura. Aparece e some com transição. |
| 1 | `.av-i` | Foto ou inicial, recortada em círculo, com um furo para a bolinha de status. |
| 2 | `.av-fr` | Moldura, com o mesmo furo. Nunca cobre a bolinha. |
| 3 | `.dot` | Status online/ausente/ocupado/offline, sempre por cima. |

- A moldura não gira mais o elemento. Só o ângulo do degradê anima (`@property --fa`), então a foto, a moldura e a bolinha ficam paradas e alinhadas em qualquer tamanho (24 a 120 px).
- A classe `.calm` deixa a moldura parada em listas que mudam muito, como o mixer e a lista de quem está na call.

## Mixer da call

- Painel fixo, aberto pelo botão de barras na call ou na barra de voz. Dá para recolher e expandir, e ele lembra se estava aberto.
- Tem uma linha por pessoa, criada uma vez e só atualizada; os controles não são recriados durante o arraste. Quem entra aparece, quem sai some.
- Volume de voz e de tela de cada pessoa, "silenciar para mim", saída geral e Central de Áudio mudam só o que você escuta. O volume do seu microfone, que é o que os outros escutam, fica separado.
- Os medidores de voz usam um único intervalo, que para ao fechar o painel ou sair da call.

## Menus de contexto (`menuAt`, `msgMenu`, `openViewer`)

- Um menu só para o app todo. Abre no cursor, não passa da janela, fecha com clique fora ou Esc, e só existe um aberto por vez.
- O botão "⋯" em cada mensagem abre o mesmo menu, para quem não tem botão direito.
- As ações mudam conforme o que foi clicado:
  - **Texto:** responder, editar (se for sua), fixar (se tiver permissão), copiar texto, copiar seleção, abrir/copiar link, copiar ID e apagar (sua, ou com "Gerenciar mensagens").
  - **Imagem:** abrir, tamanho real, baixar o original, copiar imagem e copiar endereço.
  - **GIF:** abrir, tamanho real, baixar o GIF animado, copiar endereço e favoritar.
  - **Figurinha:** ver, salvar, copiar endereço e favoritar.
- O app não tem anexos de arquivo nem de áudio no chat, então não há menu para esses tipos.
- Apagar pede confirmação, e o servidor confere a permissão antes de apagar do banco.

## Imagens originais

- Imagens de até 8 MB vão para o Storage sem recompressão: mesma qualidade, resolução e formato. Acima disso, são reduzidas.
- A mensagem guarda o nome original do arquivo (`imageName`), e "Baixar" salva o arquivo exato do Storage com esse nome.
- GIFs são baixados direto do GIPHY ou Tenor como `.gif` animado.
- Os buckets são públicos, como já eram. Não há URL privada para assinar.

## Mensagens fixadas

- Evento `message:pin`: no grupo, exige "Gerenciar mensagens"; na conversa direta, qualquer um dos dois pode fixar. O limite é de 50 por canal.
- O botão de alfinete no cabeçalho lista as mensagens fixadas.
- Banco: os campos `pinned` e `imageName` ficam na coluna `extra` (jsonb) da tabela `mensagens`, então não houve mudança de tabela.

## TURN (calls entre redes diferentes)

- Sem TURN, quem está em 4G, CGNAT ou atrás de alguns roteadores entra na call mas não ouve nem é ouvido.
- O servidor pede credenciais TURN da Cloudflare à função discordia-db (op `turn`), que usa os segredos `CF_TURN_KEY_ID` e `CF_TURN_API_TOKEN` do Supabase. Renova a cada 30 minutos. Se o .env do servidor tiver TURN próprio, ele tem prioridade.
- O app avisa quando o áudio com alguém não conecta em 15 segundos, e o mixer mostra conectando / sem conexão.


## Segurança (auditoria)

- Login em cookie `HttpOnly; SameSite=Lax` (`Secure` em https): o JavaScript da página não lê o login, então um script malicioso não consegue roubá-lo. Quem tinha o token antigo no navegador é migrado sozinho (`POST /api/session`), sem precisar entrar de novo.
- Cabeçalhos de segurança: CSP (só scripts do próprio servidor; imagens e sons só do servidor, Supabase, GIPHY e Tenor), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS em https. O spoiler deixou de usar `onclick` embutido.
- Limites: login (8 erros por usuário e 30 por IP a cada 15 min), criação de contas (5 por IP por hora), troca de senha, mensagens (12 a cada 10 s), pedidos de amizade, conversas novas e tentativas de convite.
- Senha: mínimo de 8 caracteres para contas novas, não pode conter o nome de usuário, comparação em tempo constante. Trocar a senha desconecta os outros aparelhos.
- Ícone de grupo só aceita imagem enviada ao servidor ou emoji/texto curto. Link externo funcionaria como pixel espião, revelando o IP de quem abre o grupo.
- Convites novos têm 10 caracteres (antes 8).
- Privacidade: "Quem pode começar uma conversa com você" (todos, amigos e grupos em comum, ou só amigos). O padrão é amigos e grupos em comum.
- CORS do Socket.IO removido: só o próprio site conecta.
- App de computador: túnel e configuração do banco só aceitam pedidos do painel local do app.
- Dependências do servidor sem vulnerabilidades conhecidas (`npm audit`). Electron e electron-builder precisam de atualização maior (ver pendências).
- Supabase: RLS ligado em todas as tabelas, sem políticas (só o servidor acessa); Storage sem políticas (ninguém lista nem envia com a chave pública); buckets limitam tipo e tamanho.
- Desempenho: respostas comprimidas (gzip) e app.js/css com versão no endereço, guardados por 1 ano no navegador e baixados de novo só quando mudam.

## Som do compartilhamento de tela sem eco (app 1.3.0)
- Antes o app pedia ao Chromium o `loopback`, que captura o som do PC inteiro, vozes da call incluidas: quem falava se ouvia na tela dos outros.
- Agora o `desktop/native/somtela.exe` (C#, compilado com o csc do .NET Framework que vem no Windows: `npm run nativo`) usa a "process loopback" do Windows 10 2004+ / 11, como o Discord:
  - tela inteira: som de tudo **menos** o processo do Discordia e os filhos dele;
  - janela: so o som do programa daquela janela (janela do proprio Discordia vai sem som).
- `main.js` (`somtela:start/stop`) roda o exe e manda o PCM (16 bits, 48 kHz, estereo) para a janela em pedacos de ~20 ms; o `preload.js` monta a faixa com `MediaStreamTrackGenerator` e coloca no stream da tela. Parar a tela fecha o exe.
- Windows antigo (antes do 2004): compartilha sem som e mostra o aviso.
## DJ: bot de música dos grupos
- **Membro do grupo:** em Configurações do grupo > "DJ (bot de música)", quem gerencia o grupo adiciona, personaliza (nome, foto, cor, status, sobre) e remove o DJ. Ele é um usuário com `bot: true` (sem login: senha aleatória e login de bots recusado; não aceita amizade nem conversa direta).
- **Comandos** (num canal de texto do grupo, estando numa sala de voz do grupo): `/music nome ou link`, `/pular`, `/pausar`, `/continuar`, `/parar`, `/fila`, `/agora`, `/volume 0-100`, `/repetir`, `/tirar N`, `/embaralhar`, `/ajuda`. Também em inglês (`/play`, `/skip`, `/stop`...). O app mostra a lista ao digitar `/`.
- **Como toca:** o servidor guarda a fila de cada sala e manda a todos "o que tocar e desde quando". Cada app puxa o áudio de `/api/music/:id` (o servidor repassa do site de origem) e toca no mesmo ponto. Não passa pelo WebRTC nem pelo microfone de ninguém. Cada pessoa tem o próprio volume do DJ no cartão "Tocando agora".
- **Busca:** `server/music.js` usa o **yt-dlp** (baixado sozinho do GitHub oficial para `server/bin`, atualizado 1x por dia; ou `YTDLP_PATH` no .env). Links diretos de áudio (mp3, ogg...) tocam sem o yt-dlp. Só endereços públicos são aceitos. `DJ_SEM_YTDLP=1` desliga o yt-dlp.
- O DJ para quando todo mundo sai da sala e avisa no chat quando a fila acaba.