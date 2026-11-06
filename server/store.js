// Discordia — onde os dados ficam guardados.
// Com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY configurados, tudo vai para o Supabase.
// Sem eles, usa um arquivo JSON local (bom para testar).
const fs = require('fs');
const path = require('path');

const EMPTY = () => ({ users: {}, sessions: {}, friends: {}, requests: [], groups: {}, dms: {}, messages: {} });

/* ---------- tabelas: como o banco em memória vira linhas ---------- */
const TABLES = [
  { name: 'usuarios', key: ['id'], rows: db => Object.values(db.users).map(u => ({
    id: u.id, username: u.username, display_name: u.displayName, salt: u.salt, pass_hash: u.passHash, color: u.color || null,
    banner: u.banner || null, avatar: u.avatar || null, bio: u.bio || '', status: u.status || 'online', custom_status: u.customStatus || '', created_at: u.createdAt || null })) },
  { name: 'sessoes', key: ['token'], rows: db => Object.entries(db.sessions).map(([token, user_id]) => ({ token, user_id })) },
  { name: 'grupos', key: ['id'], rows: db => Object.values(db.groups).map(g => ({ id: g.id, name: g.name, icon: g.icon || null, color: g.color || null, owner_id: g.ownerId, invite: g.invite, created_at: g.createdAt || null })) },
  { name: 'canais', key: ['id'], rows: db => Object.values(db.groups).flatMap(g => g.channels.map((c, i) => ({ id: c.id, group_id: g.id, name: c.name, type: c.type, position: i }))) },
  { name: 'grupo_membros', key: ['group_id', 'user_id'], rows: db => Object.values(db.groups).flatMap(g => g.members.map(m => ({ group_id: g.id, user_id: m }))) },
  { name: 'amizades', key: ['user_id', 'friend_id'], rows: db => Object.entries(db.friends).flatMap(([u, list]) => list.map(f => ({ user_id: u, friend_id: f }))) },
  { name: 'pedidos_amizade', key: ['from_id', 'to_id'], rows: db => db.requests.map(r => ({ from_id: r.from, to_id: r.to, ts: r.ts || null })) },
  { name: 'conversas', key: ['id'], rows: db => Object.values(db.dms).map(d => ({ id: d.id, members: d.members, created_at: d.createdAt || null })) },
  { name: 'mensagens', key: ['id'], rows: db => Object.values(db.messages).flat().map(m => ({
    id: m.id, cid: m.cid, author_id: m.authorId, content: m.content || '', image: m.image || null, ts: m.ts, edited: m.edited || null,
    reply_to: m.replyTo || null, reactions: m.reactions || {} })) }
];
const keyOf = (t, row) => t.key.map(k => row[k]).join('\u0001');

/* ---------- linhas do Supabase → banco em memória ---------- */
function build(data) {
  const db = EMPTY();
  for (const u of data.usuarios) db.users[u.id] = { id: u.id, username: u.username, displayName: u.display_name, salt: u.salt, passHash: u.pass_hash, color: u.color, banner: u.banner, avatar: u.avatar, bio: u.bio || '', status: u.status || 'online', customStatus: u.custom_status || '', createdAt: num(u.created_at) };
  for (const s of data.sessoes) db.sessions[s.token] = s.user_id;
  const chans = {};
  for (const c of data.canais.sort((a, b) => a.position - b.position)) (chans[c.group_id] = chans[c.group_id] || []).push({ id: c.id, name: c.name, type: c.type });
  const mems = {};
  for (const m of data.grupo_membros) (mems[m.group_id] = mems[m.group_id] || []).push(m.user_id);
  for (const g of data.grupos) db.groups[g.id] = { id: g.id, name: g.name, icon: g.icon, color: g.color, ownerId: g.owner_id, invite: g.invite, createdAt: num(g.created_at), channels: chans[g.id] || [], members: mems[g.id] || [] };
  for (const f of data.amizades) (db.friends[f.user_id] = db.friends[f.user_id] || []).push(f.friend_id);
  for (const r of data.pedidos_amizade) db.requests.push({ from: r.from_id, to: r.to_id, ts: num(r.ts) });
  for (const d of data.conversas) db.dms[d.id] = { id: d.id, members: d.members, createdAt: num(d.created_at) };
  for (const m of data.mensagens.sort((a, b) => num(a.ts) - num(b.ts))) (db.messages[m.cid] = db.messages[m.cid] || []).push({ id: m.id, cid: m.cid, authorId: m.author_id, content: m.content || '', image: m.image, ts: num(m.ts), edited: num(m.edited), reactions: m.reactions || {}, replyTo: m.reply_to });
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
async function supabaseStore({ url, key, dataDir, log }) {
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const BUCKET = 'uploads';

  // carrega tudo (em páginas de 1000 linhas)
  const data = {};
  for (const t of TABLES) {
    data[t.name] = [];
    for (let from = 0; ; from += 1000) {
      const { data: rows, error } = await sb.from(t.name).select('*').range(from, from + 999);
      if (error) {
        if (/relation .* does not exist|Could not find the table/i.test(error.message)) throw new Error(`A tabela "${t.name}" não existe no Supabase. Rode o arquivo supabase/schema.sql no SQL Editor do Supabase.`);
        throw new Error('Supabase: ' + error.message);
      }
      data[t.name].push(...rows);
      if (rows.length < 1000) break;
    }
  }
  let db = build(data);

  // primeira vez: importa o banco.json antigo, se existir
  const legacy = path.join(dataDir, 'banco.json');
  const empty = !data.usuarios.length;
  let imported = false;
  if (empty && fs.existsSync(legacy)) {
    try { db = { ...EMPTY(), ...JSON.parse(fs.readFileSync(legacy, 'utf8')) }; imported = true; log('Importando banco.json antigo para o Supabase...'); } catch {}
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
      // 1) inserir e atualizar, na ordem das dependências
      for (const t of TABLES) {
        const prev = synced.get(t.name), now = new Map(), changed = [];
        for (const r of t.rows(db)) { const k = keyOf(t, r), j = JSON.stringify(r); now.set(k, j); if (prev.get(k) !== j) changed.push(r); }
        current.set(t.name, now);
        for (let i = 0; i < changed.length; i += 500) {
          const { error } = await sb.from(t.name).upsert(changed.slice(i, i + 500), { onConflict: t.key.join(',') });
          if (error) throw new Error(`${t.name}: ${error.message}`);
        }
        for (const r of changed) prev.set(keyOf(t, r), JSON.stringify(r));
      }
      // 2) apagar o que sumiu, na ordem inversa
      for (const t of [...TABLES].reverse()) {
        const prev = synced.get(t.name), now = current.get(t.name);
        const gone = [...prev.keys()].filter(k => !now.has(k));
        if (!gone.length) continue;
        if (t.key.length === 1) {
          for (let i = 0; i < gone.length; i += 200) {
            const { error } = await sb.from(t.name).delete().in(t.key[0], gone.slice(i, i + 200));
            if (error) throw new Error(`${t.name}: ${error.message}`);
          }
        } else {
          for (const k of gone) {
            const parts = k.split('\u0001'); const match = Object.fromEntries(t.key.map((c, i) => [c, parts[i]]));
            const { error } = await sb.from(t.name).delete().match(match);
            if (error) throw new Error(`${t.name}: ${error.message}`);
          }
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

  return {
    kind: 'supabase', label: 'Supabase (' + new URL(url).host + ')', db,
    save: () => { clearTimeout(timer); timer = setTimeout(sync, 250); },
    saveNow: () => { clearTimeout(timer); sync(); },
    flush: async () => { clearTimeout(timer); await sync(); while (running) await new Promise(r => setTimeout(r, 50)); },
    uploadsDir: null,
    isUpload: u => typeof u === 'string' && u.startsWith(url.replace(/\/$/, '') + '/storage/v1/object/public/' + BUCKET + '/'),
    upload: async (buf, name, type) => {
      const { error } = await sb.storage.from(BUCKET).upload(name, buf, { contentType: type, upsert: false, cacheControl: '2592000' });
      if (error) throw new Error('Não consegui enviar a imagem para o Supabase: ' + error.message);
      return sb.storage.from(BUCKET).getPublicUrl(name).data.publicUrl;
    }
  };
}

async function createStore({ dataDir, supabaseUrl, supabaseKey, log = () => {} }) {
  fs.mkdirSync(path.join(dataDir, 'uploads'), { recursive: true });
  if (supabaseUrl && supabaseKey) return supabaseStore({ url: supabaseUrl.trim(), key: supabaseKey.trim(), dataDir, log });
  return jsonStore(dataDir, log);
}

module.exports = { createStore };
