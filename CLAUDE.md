# Discordia: instruções para o Claude

- Responda em português.
- Toda mudança feita aqui deve ir pro GitHub logo depois de pronta, sem perguntar: `git add` dos arquivos alterados, commit com mensagem curta em português e `git push origin main`.
- Nunca commitar `.env`, `desktop/servidor-padrao.json`, tokens ou chaves (já estão no `.gitignore`).
- No PowerShell, o `git` pode não estar no PATH da sessão. Antes, rode:
  `$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')`
- Design: FigCraft via MCP (`figcraft` no `.mcp.json`, conecta no app aberto pela porta 9333). Se não conectar, abra o FigCraft com `scripts/abrir-figcraft.cmd`. Arquivos de design ficam em `design/`. Nunca mexa em arquivos abertos no FigCraft que não sejam do Discordia.
- Servidor de casa (Windows Server, `C:\Discordia`, endereço https://win-gupi6nbu6rd.tail4f2adc.ts.net): se atualiza sozinho pela tarefa "Discordia Auto Atualizar" (`servidor-windows/auto-atualizar.ps1`), que faz `git pull` a cada 5 minutos e reinicia quando muda algo em `server/`, `servidor-windows/` ou `package*.json`. Ou seja: o push pro GitHub já é a atualização do servidor. Esta sessão não tem acesso direto ao servidor.
- App de computador: quando mudar algo em `desktop/` (ou que precise de app novo), suba a versão no `package.json`, gere com `npm run dist:cliente` e, depois de confirmar com o usuário no chat, publique no GitHub Releases (tag `vX.Y.Z`, arquivo `Discordia-Setup.exe`). Os apps instalados baixam a versão nova sozinhos. Mudanças só em `server/public/` não precisam de app novo (chegam pelo servidor e aparece a barra "Atualizar").
- Supabase: projeto `discordia` (id `npyvvnqvtpenucqoovza`). O schema fica em `supabase/schema.sql`; mantenha-o igual ao banco quando mudar tabelas.
