# Discordia: instruções para o Claude

- Responda em português.
- Toda mudança feita aqui deve ir pro GitHub logo depois de pronta, sem perguntar: `git add` dos arquivos alterados, commit com mensagem curta em português e `git push origin main`.
- Nunca commitar `.env`, `desktop/servidor-padrao.json`, tokens ou chaves (já estão no `.gitignore`).
- No PowerShell, o `git` pode não estar no PATH da sessão. Antes, rode:
  `$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')`
- Design: FigCraft via MCP (`figcraft` no `.mcp.json`, conecta no app aberto pela porta 9333). Se não conectar, abra o FigCraft com `scripts/abrir-figcraft.cmd`. Arquivos de design ficam em `design/`. Nunca mexa em arquivos abertos no FigCraft que não sejam do Discordia.
- Supabase: projeto `discordia` (id `npyvvnqvtpenucqoovza`). O schema fica em `supabase/schema.sql`; mantenha-o igual ao banco quando mudar tabelas.
