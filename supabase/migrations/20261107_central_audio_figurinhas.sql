-- Discordia: Central de Áudio (sons) e figurinhas dos grupos.
-- Só cria coisas novas (nada é apagado ou alterado). Os arquivos ficam no Storage; aqui só os dados.
-- O servidor do Discordia acessa pela função discordia-db (service_role); RLS ligado e sem políticas
-- = ninguém lê nem escreve com a chave pública (anon/authenticated).

create table if not exists public.sons (
  id          text primary key,
  group_id    text not null references public.grupos(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 32),
  emoji       text,
  category    text not null default 'Geral' check (char_length(category) <= 24),
  url         text not null,
  duration_ms int  not null default 0 check (duration_ms between 0 and 7000),
  volume      int  not null default 100 check (volume between 10 and 100),
  created_by  text references public.usuarios(id) on delete set null,
  created_at  bigint
);
create index if not exists sons_group on public.sons (group_id);
create index if not exists sons_created_by on public.sons (created_by);
alter table public.sons enable row level security;
revoke all on public.sons from anon, authenticated;

create table if not exists public.figurinhas (
  id         text primary key,
  group_id   text not null references public.grupos(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 32),
  pack       text not null default 'Geral' check (char_length(pack) <= 24),
  url        text not null,
  created_by text references public.usuarios(id) on delete set null,
  created_at bigint
);
create index if not exists figurinhas_group on public.figurinhas (group_id);
create index if not exists figurinhas_created_by on public.figurinhas (created_by);
alter table public.figurinhas enable row level security;
revoke all on public.figurinhas from anon, authenticated;

-- bucket só para áudios: até 1 MB e só tipos de áudio (o Storage recusa o resto)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sons', 'sons', true, 1048576, array['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4'])
on conflict (id) do nothing;
