-- Discordia — estrutura do banco no Supabase
-- Rode este arquivo uma vez no SQL Editor do seu projeto Supabase.
-- O servidor do Discordia usa a chave service_role, que passa por cima do RLS.
-- O RLS fica ligado e sem políticas: ninguém consegue ler os dados com a chave pública (anon).

create table if not exists public.usuarios (
  id            text primary key,
  username      text not null unique,
  display_name  text,
  salt          text not null,
  pass_hash     text not null,
  color         text,
  banner        text,
  avatar        text,
  bio           text not null default '',
  status        text not null default 'online',
  custom_status text not null default '',
  created_at    bigint
);

create table if not exists public.sessoes (
  token   text primary key,
  user_id text not null references public.usuarios(id) on delete cascade
);

create table if not exists public.grupos (
  id         text primary key,
  name       text not null,
  icon       text,
  color      text,
  owner_id   text references public.usuarios(id) on delete set null,
  invite     text unique,
  created_at bigint
);

create table if not exists public.canais (
  id       text primary key,
  group_id text not null references public.grupos(id) on delete cascade,
  name     text not null,
  type     text not null check (type in ('text', 'voice')),
  position int not null default 0
);

create table if not exists public.grupo_membros (
  group_id text not null references public.grupos(id) on delete cascade,
  user_id  text not null references public.usuarios(id) on delete cascade,
  primary key (group_id, user_id)
);

create table if not exists public.amizades (
  user_id   text not null references public.usuarios(id) on delete cascade,
  friend_id text not null references public.usuarios(id) on delete cascade,
  primary key (user_id, friend_id)
);

create table if not exists public.pedidos_amizade (
  from_id text not null references public.usuarios(id) on delete cascade,
  to_id   text not null references public.usuarios(id) on delete cascade,
  ts      bigint,
  primary key (from_id, to_id)
);

-- conversas diretas entre duas pessoas
create table if not exists public.conversas (
  id         text primary key,
  members    text[] not null,
  created_at bigint
);

-- mensagens de canais de grupo e de conversas diretas (cid = id do canal ou da conversa)
create table if not exists public.mensagens (
  id        text primary key,
  cid       text not null,
  author_id text,
  content   text not null default '',
  image     text,
  ts        bigint not null,
  edited    bigint,
  reply_to  text,
  reactions jsonb not null default '{}'::jsonb
);
-- dados extras em JSON (perfil: pronomes e tema; grupo: cargos, banimentos, banner...; canal: tópico e modo lento; mensagem: avisos do sistema)
alter table public.usuarios  add column if not exists extra jsonb not null default '{}'::jsonb;
alter table public.grupos    add column if not exists extra jsonb not null default '{}'::jsonb;
alter table public.canais    add column if not exists extra jsonb not null default '{}'::jsonb;
alter table public.mensagens add column if not exists extra jsonb not null default '{}'::jsonb;
create index if not exists mensagens_cid_ts on public.mensagens (cid, ts);
create index if not exists canais_group on public.canais (group_id);
create index if not exists sessoes_user on public.sessoes (user_id);
create index if not exists grupo_membros_user on public.grupo_membros (user_id);
create index if not exists amizades_friend on public.amizades (friend_id);
create index if not exists pedidos_to on public.pedidos_amizade (to_id);
create index if not exists grupos_owner on public.grupos (owner_id);

alter table public.usuarios        enable row level security;
alter table public.sessoes         enable row level security;
alter table public.grupos          enable row level security;
alter table public.canais          enable row level security;
alter table public.grupo_membros   enable row level security;
alter table public.amizades        enable row level security;
alter table public.pedidos_amizade enable row level security;
alter table public.conversas       enable row level security;
alter table public.mensagens       enable row level security;

-- imagens enviadas no chat, fotos de perfil e ícones de grupo
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uploads', 'uploads', true, 8388608, array['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
on conflict (id) do nothing;

-- tokens que autorizam um servidor Discordia a usar a função discordia-db (só o hash SHA-256 fica guardado)
create table if not exists public.servidor_tokens (
  token_hash text primary key,
  nome       text not null,
  criado_em  timestamptz not null default now()
);
alter table public.servidor_tokens enable row level security;
revoke all on public.servidor_tokens from anon, authenticated;
-- para liberar um servidor: insert into public.servidor_tokens (token_hash, nome) values (encode(sha256('SEU_TOKEN'::bytea), 'hex'), 'meu servidor');

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
