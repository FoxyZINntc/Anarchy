// Discordia — servidor de chat, grupos, calls e compartilhamento de tela
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const os = require('os');
const { exec } = require('child_process');
const express = require('express');
const { Server } = require('socket.io');
const { createStore } = require('./store');

// lê um arquivo .env simples (CHAVE=valor), sem dependências
function loadEnv(dirs) {
  for (const d of dirs) {
    try {
      fs.readFileSync(path.join(d, '.env'), 'utf8').split(/\r?\n/).forEach(l => {
        const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(l);
        if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
      });
    } catch {}
  }
}

async function start(opts = {}) {
/* ---------- pastas e configuração ---------- */
const BASE = process.pkg ? path.dirname(process.execPath) : __dirname;
const PUBLIC = opts.publicDir || path.join(__dirname, 'public');
const DATA = opts.dataDir || path.join(BASE, 'dados');
const UPLOADS = path.join(DATA, 'uploads');
fs.mkdirSync(UPLOADS, { recursive: true });
const CFG_FILE = path.join(DATA, 'config.json');

const DEFAULT_CFG = {
  portaHttp: 3000,
  portaHttps: 3443,
  abrirNavegador: true,
  supabaseUrl: '',
  supabaseKey: '',
  supabaseToken: '',
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};
let cfg = DEFAULT_CFG;
try { cfg = { ...DEFAULT_CFG, ...JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')) }; }
catch { fs.writeFileSync(CFG_FILE, JSON.stringify(DEFAULT_CFG, null, 2)); }
if (process.env.PORT) cfg.portaHttp = +process.env.PORT;
if (process.env.PORT_HTTPS) cfg.portaHttps = +process.env.PORT_HTTPS;
if (process.env.NO_BROWSER || !opts.standalone) cfg.abrirNavegador = false;
if (opts.port) cfg.portaHttp = opts.port;
if (opts.httpsPort) cfg.portaHttps = opts.httpsPort;
const log = opts.standalone ? console.log : (opts.log || (() => {}));
loadEnv([BASE, path.join(__dirname, '..'), process.cwd()]);
cfg.supabaseUrl = opts.supabaseUrl ?? process.env.SUPABASE_URL ?? cfg.supabaseUrl;
cfg.supabaseKey = opts.supabaseKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? cfg.supabaseKey;
cfg.supabaseToken = opts.supabaseToken ?? process.env.SUPABASE_DISCORDIA_TOKEN ?? cfg.supabaseToken;
if (process.env.SERVIDOR_24H) cfg.abrirNavegador = false;

/* ---------- TURN: repetidor de áudio/vídeo para calls em redes difíceis (4G, CGNAT) ---------- */
// Cloudflare TURN (grátis até 1000 GB/mês): CF_TURN_KEY_ID + CF_TURN_API_TOKEN no .env.
// Ou qualquer outro TURN fixo: TURN_URLS (separadas por vírgula) + TURN_USER + TURN_PASS.
const STUN = cfg.iceServers;
if (process.env.TURN_URLS) cfg.iceServers = [...STUN, { urls: process.env.TURN_URLS.split(',').map(s => s.trim()).filter(Boolean), username: process.env.TURN_USER || '', credential: process.env.TURN_PASS || '' }];
let turnTimer = null;
async function refreshCloudflareTurn() {
  const id = process.env.CF_TURN_KEY_ID, tok = process.env.CF_TURN_API_TOKEN;
  if (!id || !tok) return;
  try {
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(id)}/credentials/generate-ice-servers`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ ttl: 86400 })
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    const list = [].concat(j.iceServers || []).filter(s => s && s.urls);
    if (!list.length) throw new Error('resposta sem iceServers');
    cfg.iceServers = [...STUN, ...list];
    log('   TURN da Cloudflare: ativo (calls funcionam em qualquer rede)');
  } catch (e) { log('   TURN da Cloudflare falhou (' + e.message + '). Tento de novo em 1 hora.'); setTimeout(refreshCloudflareTurn, 3600e3).unref(); }
}
if (process.env.CF_TURN_KEY_ID) { await refreshCloudflareTurn(); turnTimer = setInterval(refreshCloudflareTurn, 12 * 3600e3); turnTimer.unref(); }

/* ---------- banco de dados (Supabase ou arquivo local) ---------- */
const store = await createStore({ dataDir: DATA, supabaseUrl: cfg.supabaseUrl, supabaseKey: cfg.supabaseKey, supabaseToken: cfg.supabaseToken, log });
const db = store.db;
const save = store.save, saveNow = store.saveNow;

// "versão" da interface: muda quando app.js, style.css ou index.html mudam. Os apps abertos comparam
// com a que receberam e mostram o botão "Atualizar".
const BUILD = (() => {
  const h = crypto.createHash('sha1');
  // todos os arquivos da interface: mudou qualquer um, os apps abertos mostram "Atualizar"
  for (const f of fs.readdirSync(PUBLIC).filter(f => /\.(html|js|css)$/.test(f)).sort()) { try { h.update(fs.readFileSync(path.join(PUBLIC, f))); } catch {} }
  return h.digest('hex').slice(0, 12);
})();

const newId = () => crypto.randomBytes(9).toString('base64url');
const code = () => crypto.randomBytes(4).toString('hex').toUpperCase();
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString('hex');
const now = () => Date.now();
const str = (v, max) => (typeof v === 'string' ? v : '').slice(0, max);

/* ---------- presença ---------- */
const slowLast = new Map(); // "canal:usuário" -> hora da última mensagem (modo lento)
const online = new Map(); // userId -> Set(socketId)
const sockets = new Map(); // socketId -> socket
function isOnline(uid) { return online.has(uid) && online.get(uid).size > 0; }
function publicUser(u) {
  if (!u) return null;
  const on = isOnline(u.id) && u.status !== 'invisivel';
  return {
    id: u.id, username: u.username, displayName: u.displayName, avatar: u.avatar || null,
    color: u.color, banner: u.banner, bio: u.bio || '', customStatus: u.customStatus || '',
    pronouns: u.pronouns || '', theme: u.theme || null,
    accent: u.accent || null, frame: u.frame || null, effect: u.effect || null, badges: badgesOf(u),
    status: on ? (u.status || 'online') : 'offline', createdAt: u.createdAt
  };
}
/* insígnias: calculadas a partir de dados reais da conta (ninguém escolhe a própria) */
let pioneers = null; // as 25 primeiras contas do servidor
function badgesOf(u) {
  if (!pioneers) pioneers = new Set(Object.values(db.users).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).slice(0, 25).map(x => x.id));
  const b = [];
  if (pioneers.has(u.id)) b.push('pioneiro');
  if (Object.values(db.groups).some(g => g.ownerId === u.id)) b.push('fundador');
  if (u.createdAt && now() - u.createdAt > 365 * 864e5) b.push('veterano');
  if ((db.friends[u.id] || []).length >= 10) b.push('sociavel');
  if (u.avatar && u.banner && u.bio) b.push('estiloso');
  return b;
}
// visuais de perfil que existem no app (o servidor só aceita estes)
const FRAMES = ['neon', 'arco', 'ouro', 'fogo', 'gelo', 'folhas', 'pixel', 'orbita'];
const EFFECTS = ['estrelas', 'neve', 'brilho', 'bolhas', 'aurora'];

/* ---------- grupos: cargos e permissões ---------- */
const PERMS = ['admin', 'manageServer', 'manageChannels', 'manageRoles', 'kick', 'ban', 'manageMessages', 'mentionEveryone'];
const HEX = /^#[0-9a-f]{6}$/i;
function fixGroup(g) {
  if (!Array.isArray(g.roles)) g.roles = [];
  if (!g.memberRoles || typeof g.memberRoles !== 'object') g.memberRoles = {};
  if (!Array.isArray(g.bans)) g.bans = [];
  if (typeof g.description !== 'string') g.description = '';
  if (g.banner === undefined) g.banner = null;
  if (g.systemJoin === undefined) g.systemJoin = true;
  if (g.welcomeCid === undefined) g.welcomeCid = null;
  return g;
}
Object.values(db.groups).forEach(fixGroup);
const rolesOf = (g, uid) => (g.memberRoles[uid] || []).map(id => g.roles.find(r => r.id === id)).filter(Boolean);
function can(g, uid, perm) {
  if (!g || !g.members.includes(uid)) return false;
  if (g.ownerId === uid) return true;
  return rolesOf(g, uid).some(r => r.perms.includes('admin') || r.perms.includes(perm));
}
// posição do cargo mais alto (0 = topo). Dono fica acima de tudo (-1); sem cargo fica abaixo de tudo.
function rank(g, uid) {
  if (g.ownerId === uid) return -1;
  const idx = rolesOf(g, uid).map(r => g.roles.indexOf(r));
  return idx.length ? Math.min(...idx) : g.roles.length;
}
const above = (g, uid, target) => rank(g, uid) < rank(g, target);
function selfUser(u) { return { ...publicUser(u), status: u.status || 'online', realStatus: u.status || 'online', blocked: u.blocked || [], favs: u.favs || null, privacy: u.privacy || {} }; }
// bloqueio vale nos dois sentidos: quem bloqueou e quem foi bloqueado não se alcançam
const blockedBetween = (a, b) => !!((db.users[a] && (db.users[a].blocked || []).includes(b)) || (db.users[b] && (db.users[b].blocked || []).includes(a)));

/* ---------- relações ---------- */
const friendsOf = uid => db.friends[uid] || (db.friends[uid] = []);
function friendState(uid) {
  return {
    friends: friendsOf(uid).slice(),
    incoming: db.requests.filter(r => r.to === uid).map(r => r.from),
    outgoing: db.requests.filter(r => r.from === uid).map(r => r.to)
  };
}
function groupsOf(uid) { return Object.values(db.groups).filter(g => g.members.includes(uid)); }
function dmsOf(uid) { return Object.values(db.dms).filter(d => d.members.includes(uid)); }
function relatedUsers(uid) {
  const set = new Set([uid, ...friendsOf(uid)]);
  db.requests.forEach(r => { if (r.from === uid) set.add(r.to); if (r.to === uid) set.add(r.from); });
  groupsOf(uid).forEach(g => g.members.forEach(m => set.add(m)));
  dmsOf(uid).forEach(d => d.members.forEach(m => set.add(m)));
  return set;
}
function channelInfo(cid) {
  if (db.dms[cid]) return { kind: 'dm', dm: db.dms[cid], members: db.dms[cid].members };
  for (const g of Object.values(db.groups)) {
    const ch = g.channels.find(c => c.id === cid);
    if (ch) return { kind: 'group', group: g, channel: ch, members: g.members };
  }
  return null;
}
function canAccess(uid, cid) { const i = channelInfo(cid); return i && i.members.includes(uid) ? i : null; }

/* ---------- envio ---------- */
let ios = [];
function toUser(uid, ev, data) { ios.forEach(io => io.to('u:' + uid).emit(ev, data)); }
function toUsers(uids, ev, data) { [...new Set(uids)].forEach(u => toUser(u, ev, data)); }
function pushUser(uid) {
  const u = db.users[uid]; if (!u) return;
  toUsers([...relatedUsers(uid)].filter(x => x !== uid), 'user:update', publicUser(u));
  toUser(uid, 'me:update', selfUser(u));
}
function pushFriends(uid) { toUser(uid, 'friends:update', friendState(uid)); }
function pushGroup(g) {
  const users = [...new Set([...g.members, ...g.bans.map(b => b.uid)])].map(m => publicUser(db.users[m])).filter(Boolean);
  g.members.forEach(m => toUser(m, 'group:update', { group: g, users }));
}

/* ---------- voz ---------- */
const voice = new Map(); // roomId -> Map(socketId -> state)
function voicePeers(roomId) {
  const r = voice.get(roomId); if (!r) return [];
  return [...r.entries()].map(([sid, s]) => ({ sid, ...s }));
}
function pushVoice(roomId) {
  const info = channelInfo(roomId); if (!info) return;
  toUsers(info.members, 'voice:room', { roomId, peers: voicePeers(roomId) });
}
function leaveVoice(socket) {
  const roomId = socket.data.voice; if (!roomId) return;
  const r = voice.get(roomId);
  if (r) { r.delete(socket.id); if (!r.size) voice.delete(roomId); }
  socket.data.voice = null;
  pushVoice(roomId);
  // avisa se a call de DM terminou
  const info = channelInfo(roomId);
  if (info && info.kind === 'dm' && !voice.get(roomId)) toUsers(info.members, 'call:ended', { dmId: roomId });
}

/* ---------- HTTP ---------- */
const app = express();
app.use(express.json({ limit: '12mb' }));
app.use(express.static(PUBLIC));
app.use('/uploads', express.static(UPLOADS, { maxAge: '30d' }));

function auth(req, res, next) {
  const uid = db.sessions[req.headers['x-token']];
  if (!uid || !db.users[uid]) return res.status(401).json({ erro: 'Sessão expirada. Entre de novo.' });
  req.uid = uid; next();
}
const USER_RE = /^[a-z0-9_.]{3,20}$/;
const COLORS = ['#6c7cff', '#ff6b8b', '#3ee0c5', '#f5b83d', '#b07cff', '#4fc3f7', '#7bd88f', '#ff8a4c'];

app.post('/api/register', (req, res) => {
  const username = str(req.body.username, 40).trim().toLowerCase();
  const password = str(req.body.password, 200);
  if (!USER_RE.test(username)) return res.status(400).json({ erro: 'O usuário precisa ter de 3 a 20 caracteres: letras minúsculas, números, ponto ou _.' });
  if (password.length < 6) return res.status(400).json({ erro: 'A senha precisa ter pelo menos 6 caracteres.' });
  if (Object.values(db.users).some(u => u.username === username)) return res.status(400).json({ erro: 'Esse nome de usuário já existe.' });
  const salt = crypto.randomBytes(16).toString('hex');
  const id = newId();
  db.users[id] = {
    id, username, displayName: str(req.body.displayName, 32).trim() || username, salt, passHash: hashPw(password, salt),
    color: COLORS[Object.keys(db.users).length % COLORS.length], banner: null, avatar: null, bio: '', status: 'online', customStatus: '', createdAt: now()
  };
  pioneers = null;
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions[token] = id; save();
  res.json({ token });
});
app.post('/api/login', (req, res) => {
  const username = str(req.body.username, 40).trim().toLowerCase();
  const u = Object.values(db.users).find(x => x.username === username);
  if (!u || hashPw(str(req.body.password, 200), u.salt) !== u.passHash) return res.status(400).json({ erro: 'Usuário ou senha incorretos.' });
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions[token] = u.id; save();
  res.json({ token });
});
app.post('/api/logout', auth, (req, res) => { delete db.sessions[req.headers['x-token']]; save(); res.json({ ok: true }); });
app.post('/api/password', auth, (req, res) => {
  const u = db.users[req.uid];
  if (hashPw(str(req.body.atual, 200), u.salt) !== u.passHash) return res.status(400).json({ erro: 'A senha atual está errada.' });
  const nova = str(req.body.nova, 200);
  if (nova.length < 6) return res.status(400).json({ erro: 'A nova senha precisa ter pelo menos 6 caracteres.' });
  u.salt = crypto.randomBytes(16).toString('hex'); u.passHash = hashPw(nova, u.salt); save();
  res.json({ ok: true });
});
app.post('/api/upload', auth, (req, res) => {
  const m = /^data:image\/(png|jpe?g|gif|webp);base64,(.+)$/.exec(str(req.body.data, 12 * 1024 * 1024));
  if (!m) return res.status(400).json({ erro: 'Envie uma imagem PNG, JPG, GIF ou WEBP.' });
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 8 * 1024 * 1024) return res.status(400).json({ erro: 'A imagem passa de 8 MB.' });
  const name = newId() + '.' + (m[1] === 'jpeg' ? 'jpg' : m[1]);
  store.upload(buf, name, 'image/' + (m[1] === 'jpg' ? 'jpeg' : m[1])).then(url => res.json({ url })).catch(e => res.status(500).json({ erro: e.message }));
});
app.get('/api/config', (req, res) => res.json({ iceServers: cfg.iceServers, build: BUILD }));

/* ---------- Socket.IO ---------- */
function onConnection(socket) {
  const uid = socket.data.uid;
  const me = () => db.users[uid];
  sockets.set(socket.id, socket);
  socket.join('u:' + uid);
  const first = !isOnline(uid);
  if (!online.has(uid)) online.set(uid, new Set());
  online.get(uid).add(socket.id);
  if (first) pushUser(uid);

  const ok = (cb, data) => typeof cb === 'function' && cb({ ok: true, ...data });
  const fail = (cb, erro) => typeof cb === 'function' && cb({ ok: false, erro });
  const on = (ev, fn) => socket.on(ev, (data, cb) => { try { fn(data || {}, cb); } catch (e) { console.error(ev, e); fail(cb, 'Erro interno.'); } });

  on('init', (_, cb) => {
    const users = {};
    relatedUsers(uid).forEach(id => { if (db.users[id]) users[id] = publicUser(db.users[id]); });
    const rooms = {};
    groupsOf(uid).forEach(g => g.channels.filter(c => c.type === 'voice').forEach(c => { if (voice.has(c.id)) rooms[c.id] = voicePeers(c.id); }));
    dmsOf(uid).forEach(d => { if (voice.has(d.id)) rooms[d.id] = voicePeers(d.id); });
    ok(cb, {
      me: selfUser(me()), users, friends: friendState(uid),
      groups: Object.fromEntries(groupsOf(uid).map(g => [g.id, g])),
      dms: Object.fromEntries(dmsOf(uid).map(d => [d.id, { ...d, last: (db.messages[d.id] || []).slice(-1)[0]?.ts || d.createdAt }])),
      voice: rooms, iceServers: cfg.iceServers, socketId: socket.id, build: BUILD
    });
    // banidos também aparecem com nome na lista de banimentos
    groupsOf(uid).forEach(g => g.bans.forEach(b => { if (db.users[b.uid] && !users[b.uid]) socket.emit('user:update', publicUser(db.users[b.uid])); }));
  });

  /* perfil */
  on('profile:update', (d, cb) => {
    const u = me();
    if ('displayName' in d) u.displayName = str(d.displayName, 32).trim() || u.username;
    if ('bio' in d) u.bio = str(d.bio, 190);
    if ('customStatus' in d) u.customStatus = str(d.customStatus, 60);
    if ('color' in d && /^#[0-9a-f]{6}$/i.test(d.color)) u.color = d.color;
    if ('banner' in d) u.banner = d.banner === null || /^#[0-9a-f]{6}$/i.test(d.banner) || store.isUpload(d.banner) ? d.banner : u.banner;
    if ('avatar' in d) u.avatar = d.avatar === null || store.isUpload(d.avatar) ? d.avatar : u.avatar;
    if ('status' in d && ['online', 'ausente', 'ocupado', 'invisivel'].includes(d.status)) u.status = d.status;
    if ('pronouns' in d) u.pronouns = str(d.pronouns, 40).trim();
    if ('theme' in d) u.theme = Array.isArray(d.theme) && d.theme.length === 2 && d.theme.every(c => HEX.test(c)) ? d.theme : null;
    if ('accent' in d) u.accent = HEX.test(d.accent || '') ? d.accent : null;
    if ('frame' in d) u.frame = FRAMES.includes(d.frame) ? d.frame : null;
    if ('effect' in d) u.effect = EFFECTS.includes(d.effect) ? d.effect : null;
    save(); pushUser(uid); ok(cb);
  });
  on('user:block', (d, cb) => {
    const other = db.users[d.id]; if (!other || other.id === uid) return fail(cb, 'Usuário inválido.');
    const u = me(); u.blocked = (u.blocked || []).filter(x => x !== other.id && db.users[x]);
    if (d.block) {
      if (u.blocked.length >= 500) return fail(cb, 'Você chegou ao limite de bloqueios.');
      u.blocked.push(other.id);
      // bloquear desfaz a amizade e apaga pedidos pendentes entre os dois
      db.friends[uid] = friendsOf(uid).filter(x => x !== other.id); db.friends[other.id] = friendsOf(other.id).filter(x => x !== uid);
      db.requests = db.requests.filter(r => !((r.from === uid && r.to === other.id) || (r.from === other.id && r.to === uid)));
      pushFriends(other.id);
    }
    save(); pushFriends(uid); toUser(uid, 'me:update', selfUser(u)); ok(cb);
  });
  // aparelhos com login (cada login é um token) e janelas abertas agora
  on('sessions:info', (_, cb) => ok(cb, { sessions: Object.values(db.sessions).filter(x => x === uid).length, online: (online.get(uid) || new Set()).size }));
  on('sessions:revokeOthers', (_, cb) => {
    for (const [t, u] of Object.entries(db.sessions)) if (u === uid && t !== socket.data.token) delete db.sessions[t];
    save();
    (online.get(uid) || new Set()).forEach(sid => { const s = sockets.get(sid); if (s && s.data.token !== socket.data.token) { s.emit('session:revoked'); s.disconnect(true); } });
    ok(cb);
  });
  on('privacy:update', (d, cb) => {
    const u = me(); const p = { ...(u.privacy || {}) };
    if (['todos', 'grupos', 'ninguem'].includes(d.requests)) p.requests = d.requests;
    u.privacy = p; save(); toUser(uid, 'me:update', selfUser(u)); ok(cb);
  });
  // o que você tem em comum com alguém: grupos e amigos (só a interseção com os seus)
  on('user:mutual', (d, cb) => {
    const other = db.users[d.id]; if (!other || other.id === uid) return fail(cb, 'Usuário inválido.');
    const mine = new Set(friendsOf(uid));
    ok(cb, { groups: groupsOf(uid).filter(g => g.members.includes(other.id)).map(g => g.id), friends: friendsOf(other.id).filter(f => mine.has(f)) });
  });

  /* amigos */
  on('friend:request', (d, cb) => {
    const name = str(d.username, 40).trim().toLowerCase().replace(/^@/, '');
    const target = Object.values(db.users).find(u => u.username === name);
    if (!target) return fail(cb, 'Não achei ninguém com esse nome de usuário.');
    if (target.id === uid) return fail(cb, 'Você não pode adicionar a si mesmo.');
    if (blockedBetween(uid, target.id)) return fail(cb, 'Não dá para enviar pedido para essa pessoa.');
    if (target.privacy && target.privacy.requests === 'ninguem') return fail(cb, 'Essa pessoa não está aceitando pedidos de amizade.');
    if (target.privacy && target.privacy.requests === 'grupos' && !groupsOf(uid).some(g => g.members.includes(target.id))) return fail(cb, 'Essa pessoa só aceita pedidos de quem está num grupo com ela.');
    if (friendsOf(uid).includes(target.id)) return fail(cb, 'Vocês já são amigos.');
    if (db.requests.some(r => r.from === uid && r.to === target.id)) return fail(cb, 'Pedido já enviado. Aguarde a resposta.');
    const reverse = db.requests.find(r => r.from === target.id && r.to === uid);
    if (reverse) {
      db.requests = db.requests.filter(r => r !== reverse);
      friendsOf(uid).push(target.id); friendsOf(target.id).push(uid);
    } else db.requests.push({ from: uid, to: target.id, ts: now() });
    save();
    toUser(uid, 'user:update', publicUser(target)); toUser(target.id, 'user:update', publicUser(me()));
    pushFriends(uid); pushFriends(target.id);
    if (!reverse) toUser(target.id, 'notify', { type: 'friend-request', from: uid });
    ok(cb, { accepted: !!reverse });
  });
  on('friend:respond', (d, cb) => {
    const r = db.requests.find(x => x.from === d.from && x.to === uid);
    if (!r) return fail(cb, 'Pedido não encontrado.');
    db.requests = db.requests.filter(x => x !== r);
    if (d.accept) { friendsOf(uid).push(d.from); friendsOf(d.from).push(uid); toUser(d.from, 'notify', { type: 'friend-accepted', from: uid }); }
    save(); pushFriends(uid); pushFriends(d.from); ok(cb);
  });
  on('friend:cancel', (d, cb) => {
    db.requests = db.requests.filter(x => !(x.from === uid && x.to === d.to));
    save(); pushFriends(uid); pushFriends(d.to); ok(cb);
  });
  on('friend:remove', (d, cb) => {
    db.friends[uid] = friendsOf(uid).filter(x => x !== d.id);
    db.friends[d.id] = friendsOf(d.id).filter(x => x !== uid);
    save(); pushFriends(uid); pushFriends(d.id); ok(cb);
  });

  /* conversas diretas */
  on('dm:open', (d, cb) => {
    const other = db.users[d.userId];
    if (!other || other.id === uid) return fail(cb, 'Usuário inválido.');
    if (blockedBetween(uid, other.id)) return fail(cb, 'Você não pode conversar com essa pessoa.');
    let dm = Object.values(db.dms).find(x => x.members.includes(uid) && x.members.includes(other.id));
    if (!dm) {
      dm = { id: newId(), members: [uid, other.id], createdAt: now() };
      db.dms[dm.id] = dm; save();
      toUsers(dm.members, 'dm:update', { ...dm, last: dm.createdAt });
      toUser(uid, 'user:update', publicUser(other)); toUser(other.id, 'user:update', publicUser(me()));
    }
    ok(cb, { dm });
  });

  /* grupos */
  const myGroup = (gid, owner) => { const g = db.groups[gid]; if (!g || !g.members.includes(uid)) return null; if (owner && g.ownerId !== uid) return null; return g; };
  const withPerm = (gid, perm) => { const g = db.groups[gid]; return g && can(g, uid, perm) ? g : null; };
  // "fulano entrou" no canal de boas-vindas
  const systemJoin = (g, who) => {
    if (!g.systemJoin) return;
    const ch = g.channels.find(c => c.id === g.welcomeCid && c.type === 'text') || g.channels.find(c => c.type === 'text');
    if (!ch) return;
    const msg = { id: newId(), cid: ch.id, authorId: who, content: '', image: null, ts: now(), edited: null, reactions: {}, replyTo: null, system: 'join' };
    const list = db.messages[ch.id] || (db.messages[ch.id] = []);
    list.push(msg); toUsers(g.members, 'message:new', msg);
  };
  on('group:create', (d, cb) => {
    const name = str(d.name, 40).trim();
    if (!name) return fail(cb, 'Dê um nome ao grupo.');
    const members = [uid, ...(Array.isArray(d.members) ? d.members : []).filter(m => friendsOf(uid).includes(m))];
    const g = {
      id: newId(), name, icon: str(d.icon, 400) || null, color: /^#[0-9a-f]{6}$/i.test(d.color) ? d.color : '#6c7cff',
      ownerId: uid, members: [...new Set(members)], invite: code(), createdAt: now(),
      channels: [
        { id: newId(), name: 'geral', type: 'text' },
        { id: newId(), name: 'memes', type: 'text' },
        { id: newId(), name: 'Sala de voz', type: 'voice' },
        { id: newId(), name: 'Jogando', type: 'voice' }
      ]
    };
    fixGroup(g);
    db.groups[g.id] = g; save(); pushGroup(g);
    g.members.filter(m => m !== uid).forEach(m => toUser(m, 'notify', { type: 'group-added', from: uid, gid: g.id }));
    ok(cb, { group: g });
  });
  on('group:update', (d, cb) => {
    const g = withPerm(d.gid, 'manageServer'); if (!g) return fail(cb, 'Você não tem permissão para mudar o grupo.');
    if ('name' in d && str(d.name, 40).trim()) g.name = str(d.name, 40).trim();
    if ('icon' in d) g.icon = str(d.icon, 400) || null;
    if ('color' in d && HEX.test(d.color)) g.color = d.color;
    if ('description' in d) g.description = str(d.description, 300).trim();
    if ('banner' in d) g.banner = d.banner === null || HEX.test(d.banner) || store.isUpload(d.banner) ? d.banner : g.banner;
    if ('systemJoin' in d) g.systemJoin = !!d.systemJoin;
    if ('welcomeCid' in d) g.welcomeCid = g.channels.some(c => c.id === d.welcomeCid && c.type === 'text') ? d.welcomeCid : null;
    if (d.newInvite) g.invite = code();
    save(); pushGroup(g); ok(cb, { group: g });
  });
  on('group:invite', (d, cb) => {
    const g = myGroup(d.gid); if (!g) return fail(cb, 'Grupo não encontrado.');
    const banned = new Set(g.bans.map(b => b.uid));
    const add = (Array.isArray(d.userIds) ? d.userIds : []).filter(m => friendsOf(uid).includes(m) && !g.members.includes(m) && !banned.has(m));
    g.members.push(...add); add.forEach(m => systemJoin(g, m)); save(); pushGroup(g);
    add.forEach(m => toUser(m, 'notify', { type: 'group-added', from: uid, gid: g.id }));
    ok(cb, { added: add.length });
  });
  on('group:join', (d, cb) => {
    const c = str(d.code, 20).trim().toUpperCase().replace(/^.*\//, '');
    const g = Object.values(db.groups).find(x => x.invite === c);
    if (!g) return fail(cb, 'Convite inválido ou expirado.');
    if (g.bans.some(b => b.uid === uid)) return fail(cb, 'Você foi banido deste grupo.');
    if (!g.members.includes(uid)) { g.members.push(uid); systemJoin(g, uid); save(); pushGroup(g); }
    ok(cb, { group: g });
  });

  /* cargos */
  const cleanPerms = p => (Array.isArray(p) ? p : []).filter(x => PERMS.includes(x));
  // só mexe em cargos abaixo do seu cargo mais alto (o dono mexe em todos)
  const canTouchRole = (g, r) => g.ownerId === uid || (can(g, uid, 'manageRoles') && g.roles.indexOf(r) > rank(g, uid));
  on('role:create', (d, cb) => {
    const g = withPerm(d.gid, 'manageRoles'); if (!g) return fail(cb, 'Você não pode gerenciar cargos.');
    if (g.roles.length >= 30) return fail(cb, 'Limite de 30 cargos.');
    const r = { id: newId(), name: str(d.name, 32).trim() || 'novo cargo', color: HEX.test(d.color) ? d.color : null, perms: [], hoist: false };
    g.roles.push(r); save(); pushGroup(g); ok(cb, { role: r });
  });
  on('role:update', (d, cb) => {
    const g = withPerm(d.gid, 'manageRoles'); const r = g && g.roles.find(x => x.id === d.rid);
    if (!r || !canTouchRole(g, r)) return fail(cb, 'Você não pode mudar esse cargo.');
    if ('name' in d && str(d.name, 32).trim()) r.name = str(d.name, 32).trim();
    if ('color' in d) r.color = HEX.test(d.color) ? d.color : null;
    if ('hoist' in d) r.hoist = !!d.hoist;
    if ('perms' in d) {
      let p = cleanPerms(d.perms);
      // ninguém dá uma permissão que não tem (exceto o dono)
      if (g.ownerId !== uid) p = p.filter(x => can(g, uid, x) && (x !== 'admin' || rolesOf(g, uid).some(rr => rr.perms.includes('admin'))));
      r.perms = p;
    }
    save(); pushGroup(g); ok(cb, { role: r });
  });
  on('role:delete', (d, cb) => {
    const g = withPerm(d.gid, 'manageRoles'); const r = g && g.roles.find(x => x.id === d.rid);
    if (!r || !canTouchRole(g, r)) return fail(cb, 'Você não pode apagar esse cargo.');
    g.roles = g.roles.filter(x => x !== r);
    for (const m of Object.keys(g.memberRoles)) { g.memberRoles[m] = g.memberRoles[m].filter(x => x !== r.id); if (!g.memberRoles[m].length) delete g.memberRoles[m]; }
    save(); pushGroup(g); ok(cb);
  });
  on('role:move', (d, cb) => {
    const g = withPerm(d.gid, 'manageRoles'); const r = g && g.roles.find(x => x.id === d.rid);
    if (!r || !canTouchRole(g, r)) return fail(cb, 'Você não pode mover esse cargo.');
    const i = g.roles.indexOf(r), j = i + (d.dir < 0 ? -1 : 1);
    if (j < 0 || j >= g.roles.length) return ok(cb);
    if (g.ownerId !== uid && j <= rank(g, uid)) return fail(cb, 'Não dá para colocar acima do seu cargo.');
    g.roles.splice(i, 1); g.roles.splice(j, 0, r); save(); pushGroup(g); ok(cb);
  });
  on('member:roles', (d, cb) => {
    const g = withPerm(d.gid, 'manageRoles'); if (!g || !g.members.includes(d.userId)) return fail(cb, 'Você não pode mudar os cargos dessa pessoa.');
    if (d.userId !== uid && !above(g, uid, d.userId)) return fail(cb, 'Essa pessoa tem um cargo igual ou acima do seu.');
    const want = new Set((Array.isArray(d.roles) ? d.roles : []).filter(id => g.roles.some(r => r.id === id)));
    const cur = new Set(g.memberRoles[d.userId] || []);
    // só pode pôr ou tirar cargos abaixo do seu
    for (const r of g.roles) if (want.has(r.id) !== cur.has(r.id) && !canTouchRole(g, r)) return fail(cb, `Você não pode dar ou tirar o cargo "${r.name}".`);
    if (want.size) g.memberRoles[d.userId] = g.roles.filter(r => want.has(r.id)).map(r => r.id); else delete g.memberRoles[d.userId];
    save(); pushGroup(g); ok(cb);
  });

  const removeMember = (g, m) => {
    g.members = g.members.filter(x => x !== m);
    delete g.memberRoles[m];
    toUser(m, 'group:removed', { gid: g.id });
    for (const s of online.get(m) || []) { const sk = sockets.get(s); if (sk && g.channels.some(c => c.id === sk.data.voice)) leaveVoice(sk); }
    if (!g.members.length) { g.channels.forEach(c => delete db.messages[c.id]); delete db.groups[g.id]; }
    else { if (g.ownerId === m) g.ownerId = g.members[0]; pushGroup(g); }
    save();
  };
  on('group:leave', (d, cb) => { const g = myGroup(d.gid); if (!g) return fail(cb, 'Grupo não encontrado.'); removeMember(g, uid); ok(cb); });
  on('group:kick', (d, cb) => {
    const g = withPerm(d.gid, 'kick');
    if (!g || d.userId === uid || !g.members.includes(d.userId) || !above(g, uid, d.userId)) return fail(cb, 'Você não pode remover essa pessoa.');
    removeMember(g, d.userId); ok(cb);
  });
  on('group:ban', (d, cb) => {
    const g = withPerm(d.gid, 'ban');
    if (!g || d.userId === uid || !db.users[d.userId] || (g.members.includes(d.userId) && !above(g, uid, d.userId))) return fail(cb, 'Você não pode banir essa pessoa.');
    if (!g.bans.some(b => b.uid === d.userId)) g.bans.push({ uid: d.userId, by: uid, ts: now(), reason: str(d.reason, 200).trim() });
    if (g.members.includes(d.userId)) removeMember(g, d.userId); else { save(); pushGroup(g); }
    ok(cb);
  });
  on('group:unban', (d, cb) => {
    const g = withPerm(d.gid, 'ban'); if (!g) return fail(cb, 'Sem permissão.');
    g.bans = g.bans.filter(b => b.uid !== d.userId); save(); pushGroup(g); ok(cb);
  });
  on('group:delete', (d, cb) => {
    const g = myGroup(d.gid, true); if (!g) return fail(cb, 'Só o dono pode apagar o grupo.');
    g.members.forEach(m => toUser(m, 'group:removed', { gid: g.id }));
    g.channels.forEach(c => { delete db.messages[c.id]; const r = voice.get(c.id); if (r) for (const sid of r.keys()) { const sk = sockets.get(sid); sk && leaveVoice(sk); } });
    delete db.groups[g.id]; save(); ok(cb);
  });
  const SLOW = [0, 5, 10, 15, 30, 60, 120, 300, 600, 3600];
  const chanExtras = (ch, d) => {
    if ('topic' in d && ch.type === 'text') ch.topic = str(d.topic, 200).trim() || undefined;
    if ('slowmode' in d && ch.type === 'text') ch.slowmode = SLOW.includes(+d.slowmode) && +d.slowmode ? +d.slowmode : undefined;
  };
  on('channel:create', (d, cb) => {
    const g = withPerm(d.gid, 'manageChannels'); if (!g) return fail(cb, 'Você não pode criar canais.');
    const type = d.type === 'voice' ? 'voice' : 'text';
    let name = str(d.name, 32).trim(); if (type === 'text') name = name.toLowerCase().replace(/\s+/g, '-');
    if (!name) return fail(cb, 'Dê um nome ao canal.');
    const ch = { id: newId(), name, type }; chanExtras(ch, d); g.channels.push(ch); save(); pushGroup(g); ok(cb, { channel: ch });
  });
  on('channel:update', (d, cb) => {
    const g = withPerm(d.gid, 'manageChannels'); if (!g) return fail(cb, 'Sem permissão.');
    const ch = g.channels.find(c => c.id === d.cid); if (!ch) return fail(cb, 'Canal não encontrado.');
    let name = str(d.name, 32).trim(); if (ch.type === 'text') name = name.toLowerCase().replace(/\s+/g, '-');
    if (name) ch.name = name; chanExtras(ch, d); save(); pushGroup(g); ok(cb);
  });
  on('channel:move', (d, cb) => {
    const g = withPerm(d.gid, 'manageChannels'); if (!g) return fail(cb, 'Sem permissão.');
    const ch = g.channels.find(c => c.id === d.cid); if (!ch) return fail(cb, 'Canal não encontrado.');
    // move entre os canais do mesmo tipo
    const same = g.channels.filter(c => c.type === ch.type); const i = same.indexOf(ch), j = i + (d.dir < 0 ? -1 : 1);
    if (j < 0 || j >= same.length) return ok(cb);
    const a = g.channels.indexOf(ch), b = g.channels.indexOf(same[j]);
    [g.channels[a], g.channels[b]] = [g.channels[b], g.channels[a]];
    save(); pushGroup(g); ok(cb);
  });
  on('channel:delete', (d, cb) => {
    const g = withPerm(d.gid, 'manageChannels'); if (!g) return fail(cb, 'Sem permissão.');
    if (g.channels.length <= 1) return fail(cb, 'O grupo precisa de pelo menos um canal.');
    g.channels = g.channels.filter(c => c.id !== d.cid); delete db.messages[d.cid];
    if (g.welcomeCid === d.cid) g.welcomeCid = null;
    save(); pushGroup(g); ok(cb);
  });

  /* mensagens */
  on('messages:get', (d, cb) => {
    if (!canAccess(uid, d.cid)) return fail(cb, 'Sem acesso.');
    const list = db.messages[d.cid] || [];
    let end = list.length;
    if (d.before) { const i = list.findIndex(m => m.id === d.before); if (i >= 0) end = i; }
    ok(cb, { messages: list.slice(Math.max(0, end - 60), end), more: end > 60 });
  });
  on('message:send', (d, cb) => {
    const info = canAccess(uid, d.cid); if (!info) return fail(cb, 'Sem acesso.');
    if (info.kind === 'dm' && info.members.some(m => m !== uid && blockedBetween(uid, m))) return fail(cb, 'Você não pode mandar mensagens para essa pessoa.');
    const content = str(d.content, 4000).trim();
    const image = store.isUpload(d.image) ? d.image : null;
    if (!content && !image) return fail(cb, 'Mensagem vazia.');
    // modo lento: quem gerencia canais ou mensagens não espera
    if (info.kind === 'group' && info.channel.slowmode && !can(info.group, uid, 'manageChannels') && !can(info.group, uid, 'manageMessages')) {
      const k = d.cid + ':' + uid, last = slowLast.get(k) || 0, wait = info.channel.slowmode * 1000 - (now() - last);
      if (wait > 0) return fail(cb, `Modo lento: espere ${Math.ceil(wait / 1000)}s para mandar outra mensagem.`);
      slowLast.set(k, now());
    }
    const msg = { id: newId(), cid: d.cid, authorId: uid, content, image, ts: now(), edited: null, reactions: {}, replyTo: str(d.replyTo, 20) || null };
    const list = db.messages[d.cid] || (db.messages[d.cid] = []);
    list.push(msg); if (list.length > 3000) list.splice(0, list.length - 3000);
    save(); toUsers(info.members, 'message:new', msg);
    if (info.kind === 'dm') toUsers(info.members, 'dm:update', { ...info.dm, last: msg.ts });
    ok(cb, { message: msg });
  });
  const findMsg = (cid, id) => (db.messages[cid] || []).find(m => m.id === id);
  on('message:edit', (d, cb) => {
    const info = canAccess(uid, d.cid); const m = info && findMsg(d.cid, d.id);
    if (!m || m.authorId !== uid) return fail(cb, 'Sem permissão.');
    const c = str(d.content, 4000).trim(); if (!c && !m.image) return fail(cb, 'Mensagem vazia.');
    m.content = c; m.edited = now(); save(); toUsers(info.members, 'message:update', m); ok(cb);
  });
  on('message:delete', (d, cb) => {
    const info = canAccess(uid, d.cid); const m = info && findMsg(d.cid, d.id);
    if (!m || (m.authorId !== uid && !(info.kind === 'group' && can(info.group, uid, 'manageMessages')))) return fail(cb, 'Sem permissão.');
    db.messages[d.cid] = db.messages[d.cid].filter(x => x !== m); save();
    toUsers(info.members, 'message:delete', { cid: d.cid, id: d.id }); ok(cb);
  });
  on('message:react', (d, cb) => {
    const info = canAccess(uid, d.cid); const m = info && findMsg(d.cid, d.id);
    const emoji = str(d.emoji, 16); if (!m || !emoji) return fail(cb, 'Inválido.');
    const arr = m.reactions[emoji] || (m.reactions[emoji] = []);
    const i = arr.indexOf(uid); if (i >= 0) arr.splice(i, 1); else arr.push(uid);
    if (!arr.length) delete m.reactions[emoji];
    save(); toUsers(info.members, 'message:update', m); ok(cb);
  });
  on('typing', d => { const info = canAccess(uid, d.cid); if (info) toUsers(info.members.filter(m => m !== uid), 'typing', { cid: d.cid, uid }); });

  /* voz, vídeo e tela */
  on('voice:join', (d, cb) => {
    const info = canAccess(uid, d.roomId);
    if (!info || (info.kind === 'group' && info.channel.type !== 'voice')) return fail(cb, 'Sem acesso a essa sala.');
    leaveVoice(socket);
    if (!voice.has(d.roomId)) voice.set(d.roomId, new Map());
    const others = voicePeers(d.roomId);
    voice.get(d.roomId).set(socket.id, { uid, muted: !!d.muted, deafened: !!d.deafened, screen: null, cam: null, joinedAt: now() });
    socket.data.voice = d.roomId;
    pushVoice(d.roomId);
    ok(cb, { peers: others, iceServers: cfg.iceServers });
  });
  on('voice:leave', (_, cb) => { leaveVoice(socket); ok(cb); });
  on('voice:state', d => {
    const r = voice.get(socket.data.voice); const s = r && r.get(socket.id); if (!s) return;
    ['muted', 'deafened'].forEach(k => { if (k in d) s[k] = !!d[k]; });
    ['screen', 'cam'].forEach(k => { if (k in d) s[k] = d[k] ? str(d[k], 80) : null; });
    pushVoice(socket.data.voice);
  });
  on('rtc:signal', d => {
    const target = sockets.get(d.to);
    if (!target || !socket.data.voice || target.data.voice !== socket.data.voice) return;
    target.emit('rtc:signal', { from: socket.id, data: d.data });
  });
  on('call:ring', (d, cb) => {
    const dm = db.dms[d.dmId]; if (!dm || !dm.members.includes(uid)) return fail(cb, 'Conversa inválida.');
    if (dm.members.some(m => m !== uid && blockedBetween(uid, m))) return fail(cb, 'Você não pode ligar para essa pessoa.');
    dm.members.filter(m => m !== uid).forEach(m => toUser(m, 'call:incoming', { dmId: dm.id, from: uid }));
    ok(cb);
  });
  on('call:decline', d => {
    const dm = db.dms[d.dmId]; if (!dm || !dm.members.includes(uid)) return;
    toUsers(dm.members, 'call:declined', { dmId: dm.id, by: uid });
  });

  socket.on('disconnect', () => {
    leaveVoice(socket);
    sockets.delete(socket.id);
    const set = online.get(uid); if (set) { set.delete(socket.id); if (!set.size) { online.delete(uid); pushUser(uid); } }
  });
}

function makeIo(server) {
  const io = new Server(server, { maxHttpBufferSize: 2e6, serveClient: false, cors: { origin: true } });
  io.use((socket, next) => {
    const uid = db.sessions[socket.handshake.auth && socket.handshake.auth.token];
    if (!uid || !db.users[uid]) return next(new Error('auth'));
    socket.data.uid = uid; socket.data.token = socket.handshake.auth.token; next();
  });
  io.on('connection', onConnection);
  return io;
}

/* ---------- inicialização ---------- */
function lanIps() {
  const out = [];
  Object.values(os.networkInterfaces()).forEach(list => (list || []).forEach(n => { if (n.family === 'IPv4' && !n.internal) out.push(n.address); }));
  return out;
}
function certificate() {
  const f = path.join(DATA, 'certificado.json');
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch {}
  const selfsigned = require('selfsigned');
  const pems = selfsigned.generate([{ name: 'commonName', value: 'discordia.local' }], {
    days: 3650, keySize: 2048, algorithm: 'sha256',
    extensions: [{ name: 'subjectAltName', altNames: [{ type: 2, value: 'localhost' }, ...lanIps().map(ip => ({ type: 7, ip }))] }]
  });
  const c = { key: pems.private, cert: pems.cert };
  fs.writeFileSync(f, JSON.stringify(c)); return c;
}

return new Promise((resolve, reject) => {
const httpServer = http.createServer(app);
let httpsServer = null;
ios.push(makeIo(httpServer));
httpServer.once('error', e => {
  if (e.code === 'EADDRINUSE') log('\n  A porta ' + cfg.portaHttp + ' já está em uso. O Discordia já está aberto em outra janela?\n');
  else log(e);
  reject(e);
});
httpServer.listen(cfg.portaHttp, () => {
  let httpsOk = false;
  try {
    httpsServer = https.createServer(certificate(), app);
    ios.push(makeIo(httpsServer));
    httpsServer.on('error', () => {});
    httpsServer.listen(cfg.portaHttps);
    httpsOk = true;
  } catch (e) { log('(HTTPS desativado: ' + e.message + ')'); }
  const ips = lanIps();
  log('');
  log('  ================================================');
  log('   DISCORDIA está no ar!');
  log('  ================================================');
  log('   Neste computador:   http://localhost:' + cfg.portaHttp);
  log('   Banco de dados:     ' + store.label);
  if (httpsOk) ips.forEach(ip => log('   Amigos na sua rede: https://' + ip + ':' + cfg.portaHttps));
  log('');
  if (process.env.PUBLIC_URL) log('   Endereço público:   ' + process.env.PUBLIC_URL);
  else {
    log('   Para amigos pela internet, veja o SERVIDOR.md');
    log('   (Tailscale Funnel: endereço fixo e grátis).');
  }
  if (!process.env.SERVIDOR_24H) log('   Deixe esta janela aberta enquanto usar o Discordia.');
  log('  ================================================');
  log('');
  if (cfg.abrirNavegador) {
    const url = 'http://localhost:' + cfg.portaHttp;
    const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
    exec(cmd, () => {});
  }
  resolve({
    storage: store.label, storageKind: store.kind, port: cfg.portaHttp, httpsPort: httpsOk ? cfg.portaHttps : null, ips, dataDir: DATA,
    stats: () => ({ users: Object.keys(db.users).length, online: online.size, groups: Object.keys(db.groups).length }),
    save: () => store.flush(),
    stop: () => new Promise(async r => { await store.flush().catch(() => {}); ios.forEach(io => io.close()); ios = []; try { httpsServer && httpsServer.close(); } catch {} httpServer.close(() => r()); setTimeout(r, 1500); })
  });
});
});
}

module.exports = { start };

if (require.main === module) {
  start({ standalone: true }).then(srv => {
    const bye = async () => { await srv.save(); process.exit(0); };
    process.on('SIGINT', bye); process.on('SIGTERM', bye);
  }).catch(e => { console.error('Falha ao iniciar:', e && e.message ? e.message : e); process.exit(1); });
}
