// Discordia — onde os dados ficam guardados.
// Com SUPABASE_URL e SUPABASE_DISCORDIA_TOKEN (ou SUPABASE_SERVICE_ROLE_KEY), tudo vai para o Supabase.
// Sem eles, usa um arquivo JSON local (bom para testar).
const fs = require('fs');
const path = require('path');

const EMPTY = () => ({ users: {}, sessions: {}, friends: {}, requests: [], groups: {}, dms: {}, messages: {} });

// campos que vão na coluna "extra" (JSON) de cada tabela
const USER_X = ['pronouns', 'theme'];
const GROUP_X = ['description', 'banner', 'roles', 'memberRoles', 'bans', 'welcomeCid', 'systemJoin'];
const CHAN_X = ['topic', 'slowmode'];
const MSG_X = ['system'];
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
    reply_to: m.replyTo || null, reactions: m.reactions || {}, extra: pack(m, MSG_X) })) }
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
  for (const f of data.amizades) (db.friends[f.user_id] = db.friends[f.user_id] || []).push(f.friend_id);
  for (const r of data.pedidos_amizade) db.requests.push({ from: r.from_id, to: r.to_id, ts: num(r.ts) });
  for (const d of data.conversas) db.dms[d.id] = { id: d.id, members: d.members, createdAt: num(d.created_at) };
  for (const m of data.mensagens.sort((a, b) => num(a.ts) - num(b.ts))) (db.messages[m.cid] = db.messages[m.cid] || []).push({ id: m.id, cid: m.cid, authorId: m.author_id, content: m.content || '', image: m.image, ts: num(m.ts), edited: num(m.edited), reactions: m.reactions || {}, replyTo: m.reply_to, ...unpack(m.extra, MSG_X) });
  return db;
}
const num = v => (v === null || v === undefined ? null : Number(v));

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
    upload: async (buf, name) => { fs.writeFileSync(path.join(dataDir, 'uploads', name), buf); return '/uploads/' + name; }
  };
}

/* ---------- Supabase ---------- */
// Dois jeitos de falar com o Supabase, com as mesmas operações:
//  - token de servidor: passa pela função "discordia-db" (a chave secreta fica dentro do Supabase)
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
      chk(await sb.storage.from('uploads').upload(name, buf, { contentType: type, upsert: false, cacheControl: '2592000' }));
      return sb.storage.from('uploads').getPublicUrl(name).data.publicUrl;
    }
  };
}
function edgeClient(url, token) {
  const endpoint = url.replace(/\/$/, '') + '/functions/v1/discordia-db';
  async function call(body) {
    let res;
    for (let i = 0; i < 3; i++) {
      try {
        res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-discordia-token': token }, body: JSON.stringify(body) });
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
    upload: async (name, buf, type) => (await call({ op: 'upload', name, type, data: buf.toString('base64') })).url
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
  for (const t of TABLES) synced.set(t.name, new Map((imported ? [] : t.rows(db)).map(r => [keyOf(t, r), JSON.stringify(r)])));

  let running = false, again = false, timer = null, retry = null;
  async function sync() {
    if (running) { again = true; return; }
    running = true; again = false;
    let failed = false;
    const current = new Map();
    try {
      for (const t of TABLES) {
        const prev = synced.get(t.name), now = new Map(), changed = [];
        for (const r of t.rows(db)) { const k = keyOf(t, r), j = JSON.stringify(r); now.set(k, j); if (prev.get(k) !== j) changed.push(r); }
        current.set(t.name, now);
        for (let i = 0; i < changed.length; i += 500) await client.upsert(t.name, changed.slice(i, i + 500), t.key);
        for (const r of changed) prev.set(keyOf(t, r), JSON.stringify(r));
      }
      for (const t of [...TABLES].reverse()) {
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
  return {
    kind: 'supabase', label: 'Supabase (' + new URL(url).host + ')' + (token ? '' : ' com chave service_role'), db,
    save: () => { clearTimeout(timer); timer = setTimeout(sync, 250); },
    saveNow: () => { clearTimeout(timer); sync(); },
    flush: async () => { clearTimeout(timer); await sync(); while (running) await new Promise(r => setTimeout(r, 50)); },
    uploadsDir: null,
    isUpload: u => typeof u === 'string' && (u.startsWith(prefix) || /^\/uploads\/[\w-]+\.\w+$/.test(u)),
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
