// Anarchy — onde os dados ficam guardados.
// Com SUPABASE_URL e SUPABASE_ANARCHY_TOKEN (ou o nome antigo SUPABASE_DISCORDIA_TOKEN) (ou SUPABASE_SERVICE_ROLE_KEY), tudo vai para o Supabase.
// Sem eles, usa um arquivo JSON local (bom para testar).
const fs = require('fs');
const path = require('path');

const EMPTY = () => ({ users: {}, sessions: {}, friends: {}, requests: [], groups: {}, dms: {}, messages: {} });

// campos que vão na coluna "extra" (JSON) de cada tabela
const USER_X = ['pronouns', 'theme', 'accent', 'frame', 'effect', 'favs', 'blocked', 'privacy', 'bot', 'botGid', 'email', 'emailAt', 'emailAsked', 'resetHash', 'resetExp'];
const GROUP_X = ['description', 'banner', 'roles', 'memberRoles', 'bans', 'welcomeCid', 'systemJoin', 'djId'];
const CHAN_X = ['topic', 'slowmode'];
const MSG_X = ['system', 'sticker', 'gif', 'imageName', 'pinned', 'mentions', 'everyone', 'music'];
const pack = (o, keys) => { const x = {}; for (const k of keys) if (o[k] !== undefined && o[k] !== null) x[k] = o[k]; return x; };
const unpack = (x, keys) => { const o = {}; if (x && typeof x === 'object') for (const k of keys) if (x[k] !== undefined) o[k] = x[k]; return o; };

/* ---------- tabelas: como o banco em memória vira linhas ---------- */
const TABLES = [
  { name: 'usuarios', key: ['id'], rows: db => Object.values(db.users).map(u => ({
    id: u.id, username: u.username, display_name: u.displayName, salt: u.salt, pass_hash: u.passHash, color: u.color || null,
    banner: u.banner || null, avatar: u.avatar || null, bio: u.bio || '', status: u.status || 'online', custom_status: u.customStatus || '', created_at: u.createdAt || null, extra: pack(u, USER_X) })) },
  { name: 'sessoes', key: ['token'], rows: db => Object.entries(db.sessions).map(([token, user_id]) => ({ token, user_id })) },
  { name: 'grupos', key: ['id'], rows: db => Object.values(db.groups).map(g => ({ id: g.id, name: g.name, icon: g.icon || null, color: g.color || null, owner_id: g.ownerId, invite: g.invite, created_at: g.createdAt || null, extra: pack(g, GROUP_X) })) },
  { name: 'canais', key: ['id'], rows: db => Object.values(db.groups).flatMap(g => g.channels.map((c, i) => ({ id: c.id, group_id: g.id, name: c.name, type: c.type, position: i, extra: pack(c, CHAN_X) }))) },
  { name: 'grupo_membros', key: ['group_id', 'user_id'], rows: db => Object.values(db.groups).flatMap(g => g.members.map(m => ({ group_id: g.id, user_id: m }))) },
  { name: 'amizades', key: ['user_id', 'friend_id'], rows: db => Object.entries(db.friends).flatMap(([u, list]) => list.map(f => ({ user_id: u, friend_id: f }))) },
  { name: 'pedidos_amizade', key: ['from_id', 'to_id'], rows: db => db.requests.map(r => ({ from_id: r.from, to_id: r.to, ts: r.ts || null })) },
  { name: 'conversas', key: ['id'], rows: db => Object.values(db.dms).map(d => ({ id: d.id, members: d.members, created_at: d.createdAt || null })) },
  { name: 'mensagens', key: ['id'], rows: db => Object.values(db.messages).flat().map(m => ({
    id: m.id, cid: m.cid, author_id: m.authorId, content: m.content || '', image: m.image || null, ts: m.ts, edited: m.edited || null,
    reply_to: m.replyTo || null, reactions: m.reactions || {}, extra: pack(m, MSG_X) })) },
  // Central de Áudio e figurinhas: só os dados ficam na tabela; o arquivo fica no Storage (buckets "sons" e "uploads")
  { name: 'sons', key: ['id'], optional: true, rows: db => Object.values(db.groups).flatMap(g => (g.sounds || []).map(s => ({
    id: s.id, group_id: g.id, name: s.name, emoji: s.emoji || null, category: s.category || 'Geral', url: s.url, duration_ms: s.duration | 0, volume: s.volume ?? 100, created_by: s.createdBy || null, created_at: s.createdAt || null }))) },
  { name: 'figurinhas', key: ['id'], optional: true, rows: db => Object.values(db.groups).flatMap(g => (g.stickers || []).map(s => ({
    id: s.id, group_id: g.id, name: s.name, pack: s.pack || 'Geral', url: s.url, created_by: s.createdBy || null, created_at: s.createdAt || null }))) }
];
const keyOf = (t, row) => t.key.map(k => row[k]).join('\u0001');

/* ---------- linhas do Supabase → banco em memória ---------- */
function build(data) {
  const db = EMPTY();
  for (const u of data.usuarios) db.users[u.id] = { id: u.id, username: u.username, displayName: u.display_name, salt: u.salt, passHash: u.pass_hash, color: u.color, banner: u.banner, avatar: u.avatar, bio: u.bio || '', status: u.status || 'online', customStatus: u.custom_status || '', createdAt: num(u.created_at), ...unpack(u.extra, USER_X) };
  for (const s of data.sessoes) db.sessions[s.token] = s.user_id;
  const chans = {};
  for (const c of data.canais.sort((a, b) => a.position - b.position)) (chans[c.group_id] = chans[c.group_id] || []).push({ id: c.id, name: c.name, type: c.type, ...unpack(c.extra, CHAN_X) });
  const mems = {};
  for (const m of data.grupo_membros) (mems[m.group_id] = mems[m.group_id] || []).push(m.user_id);
  for (const g of data.grupos) db.groups[g.id] = { id: g.id, name: g.name, icon: g.icon, color: g.color, ownerId: g.owner_id, invite: g.invite, createdAt: num(g.created_at), channels: chans[g.id] || [], members: mems[g.id] || [], ...unpack(g.extra, GROUP_X) };
  for (const s of (data.sons || []).sort((a, b) => num(a.created_at) - num(b.created_at))) { const g = db.groups[s.group_id]; if (g) (g.sounds = g.sounds || []).push({ id: s.id, name: s.name, emoji: s.emoji, category: s.category || 'Geral', url: s.url, duration: s.duration_ms | 0, volume: s.volume ?? 100, createdBy: s.created_by, createdAt: num(s.created_at) }); }
  for (const s of (data.figurinhas || []).sort((a, b) => num(a.created_at) - num(b.created_at))) { const g = db.groups[s.group_id]; if (g) (g.stickers = g.stickers || []).push({ id: s.id, name: s.name, pack: s.pack || 'Geral', url: s.url, createdBy: s.created_by, createdAt: num(s.created_at) }); }
  for (const f of data.amizades) (db.friends[f.user_id] = db.friends[f.user_id] || []).push(f.friend_id);
  for (const r of data.pedidos_amizade) db.requests.push({ from: r.from_id, to: r.to_id, ts: num(r.ts) });
  for (const d of data.conversas) db.dms[d.id] = { id: d.id, members: d.members, createdAt: num(d.created_at) };
  for (const m of data.mensagens.sort((a, b) => num(a.ts) - num(b.ts))) (db.messages[m.cid] = db.messages[m.cid] || []).push({ id: m.id, cid: m.cid, authorId: m.author_id, content: m.content || '', image: m.image, ts: num(m.ts), edited: num(m.edited), reactions: m.reactions || {}, replyTo: m.reply_to, ...unpack(m.extra, MSG_X) });
  return db;
}
const num = v => (v === null || v === undefined ? null : Number(v));

/* ---------- GIFs (GIPHY ou Tenor) ----------
   Com o Supabase por token, a busca passa pela função anarchy-db (a chave fica nos segredos do Supabase).
   Nos outros modos (teste local), usa GIPHY_API_KEY ou TENOR_API_KEY do .env do servidor. */
async function directGifs({ q, pos, limit }) {
  const giphy = process.env.GIPHY_API_KEY, tenor = process.env.TENOR_API_KEY;
  if (giphy) {
    const u = new URL('https://api.giphy.com/v1/gifs/' + (q ? 'search' : 'trending'));
    u.search = new URLSearchParams({ api_key: giphy, limit: String(limit), offset: String(pos), rating: 'pg-13', ...(q ? { q, lang: 'pt' } : {}) });
    const j = await (await fetch(u)).json();
    return { configured: true, provider: 'giphy', next: pos + limit, items: (j.data || []).map(x => ({ id: x.id, title: x.title || '', url: x.images?.fixed_height?.url, preview: x.images?.fixed_height_small?.url || x.images?.fixed_height?.url, w: +x.images?.fixed_height?.width || 0, h: +x.images?.fixed_height?.height || 0 })).filter(x => x.url) };
  }
  if (tenor) {
    const u = new URL('https://tenor.googleapis.com/v2/' + (q ? 'search' : 'featured'));
    u.search = new URLSearchParams({ key: tenor, client_key: 'anarchy', limit: String(limit), media_filter: 'gif,tinygif', contentfilter: 'medium', locale: 'pt_BR', ...(q ? { q } : {}), ...(pos ? { pos: String(pos) } : {}) });
    const j = await (await fetch(u)).json();
    return { configured: true, provider: 'tenor', next: +j.next || pos + limit, items: (j.results || []).map(x => ({ id: x.id, title: x.content_description || '', url: x.media_formats?.gif?.url, preview: x.media_formats?.tinygif?.url || x.media_formats?.gif?.url, w: x.media_formats?.gif?.dims?.[0] || 0, h: x.media_formats?.gif?.dims?.[1] || 0 })).filter(x => x.url) };
  }
  return { configured: false, items: [] };
}

/* ---------- arquivo JSON local ---------- */
function jsonStore(dataDir, log) {
  const file = path.join(dataDir, 'banco.json');
  let db = EMPTY();
  try { db = { ...db, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch {}
  let t;
  const saveNow = () => { clearTimeout(t); try { fs.writeFileSync(file + '.tmp', JSON.stringify(db)); fs.renameSync(file + '.tmp', file); } catch (e) { log('Erro ao salvar: ' + e.message); } };
  return {
    kind: 'arquivo', label: 'Arquivo local (' + file + ')', db,
    save: () => { clearTimeout(t); t = setTimeout(saveNow, 300); },
    saveNow, flush: async () => saveNow(),
    uploadsDir: path.join(dataDir, 'uploads'),
    isUpload: u => typeof u === 'string' && /^\/uploads\/[\w-]+\.\w+$/.test(u),
    upload: async (buf, name) => { fs.writeFileSync(path.join(dataDir, 'uploads', name), buf); return '/uploads/' + name; },
    gifs: directGifs, mediaReady: true
  };
}

/* ---------- Supabase ---------- */
// Dois jeitos de falar com o Supabase, com as mesmas operações:
//  - token de servidor: passa pela função "anarchy-db" (a chave secreta fica dentro do Supabase)
//  - chave service_role: fala direto com o banco
function sdkClient(url, key) {
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const chk = ({ error }, t) => { if (error) throw new Error((t ? t + ': ' : '') + error.message); };
  return {
    select: async (t, from, to) => { const r = await sb.from(t).select('*').range(from, to); chk(r, t); return r.data; },
    upsert: async (t, rows, key) => chk(await sb.from(t).upsert(rows, { onConflict: key.join(',') }), t),
    deleteIn: async (t, col, values) => chk(await sb.from(t).delete().in(col, values), t),
    deleteMatch: async (t, match) => chk(await sb.from(t).delete().match(match), t),
    upload: async (name, buf, type) => {
      const bucket = /^audio\//.test(type) ? 'sons' : 'uploads'; // áudios da Central de Áudio ficam no bucket "sons"
      chk(await sb.storage.from(bucket).upload(name, buf, { contentType: type, upsert: false, cacheControl: '2592000' }));
      return sb.storage.from(bucket).getPublicUrl(name).data.publicUrl;
    },
    gifs: directGifs
  };
}
function edgeClient(url, token) {
  // função "anarchy-db"; enquanto ela não existir no Supabase, usa a antiga "discordia-db" (mesmo código)
  const base = url.replace(/\/$/, '') + '/functions/v1/';
  let fn = 'anarchy-db';
  async function call(body) {
    let res;
    for (let i = 0; i < 3; i++) {
      try {
        res = await fetch(base + fn, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-anarchy-token': token, 'x-discordia-token': token }, body: JSON.stringify(body) });
        if (res.status === 404 && fn === 'anarchy-db') { fn = 'discordia-db'; i--; continue; }
        if (res.status < 500) break;
      } catch (e) { if (i === 2) throw new Error('sem conexão com o Supabase (' + e.message + ')'); }
      await new Promise(r => setTimeout(r, 600 * (i + 1)));
    }
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error || ('erro ' + res.status));
    return j;
  }
  return {
    ping: () => call({ op: 'ping' }),
    select: async (t, from, to) => (await call({ op: 'select', table: t, from, to })).data,
    upsert: (t, rows) => call({ op: 'upsert', table: t, rows }),
    deleteIn: (t, col, values) => call({ op: 'deleteIn', table: t, values }),
    deleteMatch: (t, match) => call({ op: 'deleteMatch', table: t, match }),
    upload: async (name, buf, type) => (await call({ op: 'upload', name, type, data: buf.toString('base64') })).url,
    gifs: q => call({ op: 'gifs', ...q }),
    turn: () => call({ op: 'turn' })
  };
}

async function supabaseStore({ url, key, token, dataDir, log }) {
  const client = token ? edgeClient(url, token) : sdkClient(url, key);
  const BUCKET = 'uploads';
  if (client.ping) await client.ping();

  // carrega tudo (em páginas de 1000 linhas)
  const data = {};
  for (const t of TABLES) {
    data[t.name] = [];
    for (let from = 0; ; from += 1000) {
      let rows;
      try { rows = await client.select(t.name, from, from + 999); }
      catch (error) {
        // tabelas novas (sons, figurinhas): se o Supabase ainda não tem, o servidor sobe sem elas em vez de cair
        if (t.optional) { t.off = true; rows = []; log('Supabase: tabela "' + t.name + '" indisponível (' + error.message + '). Central de Áudio e figurinhas desligadas até atualizar o Supabase.'); break; }
        if (/does not exist|Could not find the table/i.test(error.message)) throw new Error(`A tabela "${t.name}" não existe no Supabase. Rode o arquivo supabase/schema.sql no SQL Editor do Supabase.`);
        throw new Error('Supabase: ' + error.message);
      }
      data[t.name].push(...rows);
      if (rows.length < 1000) break;
    }
  }
  let db = build(data);

  // primeira vez: importa o banco.json antigo, se existir
  const legacy = path.join(dataDir, 'banco.json');
  const empty = !data.usuarios.length && !data.grupos.length;
  let imported = false;
  if (empty && fs.existsSync(legacy)) {
    try {
      const old = JSON.parse(fs.readFileSync(legacy, 'utf8'));
      if (old.users && Object.keys(old.users).length) { db = { ...EMPTY(), ...old }; imported = true; log('Importando banco.json antigo para o Supabase...'); }
    } catch {}
  }

  // fotografia do que já está no Supabase, para mandar só o que mudou
  const synced = new Map();
  const ACTIVE = TABLES.filter(t => !t.off);
  for (const t of ACTIVE) synced.set(t.name, new Map((imported ? [] : t.rows(db)).map(r => [keyOf(t, r), JSON.stringify(r)])));

  let running = false, again = false, timer = null, retry = null;
  async function sync() {
    if (running) { again = true; return; }
    running = true; again = false;
    let failed = false;
    const current = new Map();
    try {
      for (const t of ACTIVE) {
        const prev = synced.get(t.name), now = new Map(), changed = [];
        for (const r of t.rows(db)) { const k = keyOf(t, r), j = JSON.stringify(r); now.set(k, j); if (prev.get(k) !== j) changed.push(r); }
        current.set(t.name, now);
        for (let i = 0; i < changed.length; i += 500) await client.upsert(t.name, changed.slice(i, i + 500), t.key);
        for (const r of changed) prev.set(keyOf(t, r), JSON.stringify(r));
      }
      for (const t of [...ACTIVE].reverse()) {
        const prev = synced.get(t.name), now = current.get(t.name);
        const gone = [...prev.keys()].filter(k => !now.has(k));
        if (!gone.length) continue;
        if (t.key.length === 1) {
          for (let i = 0; i < gone.length; i += 200) await client.deleteIn(t.name, t.key[0], gone.slice(i, i + 200));
        } else {
          for (const k of gone) { const parts = k.split('\u0001'); await client.deleteMatch(t.name, Object.fromEntries(t.key.map((c, i) => [c, parts[i]]))); }
        }
        gone.forEach(k => prev.delete(k));
      }
    } catch (e) {
      failed = true; log('Supabase: não consegui salvar (' + e.message + '). Tento de novo em 5 segundos.');
      clearTimeout(retry); retry = setTimeout(sync, 5000);
    }
    running = false;
    if (again && !failed) sync();
  }
  if (imported) await sync();

  const prefix = url.replace(/\/$/, '') + '/storage/v1/object/public/' + BUCKET + '/';
  const sonsPrefix = url.replace(/\/$/, '') + '/storage/v1/object/public/sons/';
  return {
    kind: 'supabase', label: 'Supabase (' + new URL(url).host + ')' + (token ? '' : ' com chave service_role'), db,
    save: () => { clearTimeout(timer); timer = setTimeout(sync, 250); },
    saveNow: () => { clearTimeout(timer); sync(); },
    flush: async () => { clearTimeout(timer); await sync(); while (running) await new Promise(r => setTimeout(r, 50)); },
    uploadsDir: null,
    isUpload: u => typeof u === 'string' && (u.startsWith(prefix) || u.startsWith(sonsPrefix) || /^\/uploads\/[\w-]+\.\w+$/.test(u)),
    gifs: client.gifs,
    turn: client.turn,
    mediaReady: !TABLES.some(t => t.off),
    // as tabelas novas já existem no Supabase? (para o servidor se reiniciar e ligar a Central de Áudio)
    recheck: async () => { try { for (const t of TABLES.filter(x => x.off)) await client.select(t.name, 0, 0); return true; } catch { return false; } },
    // mesma ordem do arquivo local e do server.js: (imagem, nome, tipo)
    upload: (buf, name, type) => client.upload(name, buf, type)
  };
}

async function createStore({ dataDir, supabaseUrl, supabaseKey, supabaseToken, log = () => {} }) {
  fs.mkdirSync(path.join(dataDir, 'uploads'), { recursive: true });
  if (supabaseUrl && supabaseToken) return supabaseStore({ url: supabaseUrl.trim(), token: supabaseToken.trim(), dataDir, log });
  if (supabaseUrl && supabaseKey) return supabaseStore({ url: supabaseUrl.trim(), key: supabaseKey.trim(), dataDir, log });
  return jsonStore(dataDir, log);
}

module.exports = { createStore };
