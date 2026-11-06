# Discordia: instruções para o Claude

- Responda em português.
- Toda mudança feita aqui deve ir pro GitHub logo depois de pronta, sem perguntar: `git add` dos arquivos alterados, commit com mensagem curta em português e `git push origin main`.
- Nunca commitar `.env`, `desktop/servidor-padrao.json`, tokens ou chaves (já estão no `.gitignore`).
- No PowerShell, o `git` pode não estar no PATH da sessão. Antes, rode:
  `$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')`
- Supabase: projeto `discordia` (id `npyvvnqvtpenucqoovza`). O schema fica em `supabase/schema.sql`; mantenha-o igual ao banco quando mudar tabelas.
