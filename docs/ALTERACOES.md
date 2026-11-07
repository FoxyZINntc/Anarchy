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

