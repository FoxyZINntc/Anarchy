// Anarchy — servidor de chat, grupos, calls e compartilhamento de tela
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
cfg.supabaseToken = opts.supabaseToken ?? process.env.SUPABASE_ANARCHY_TOKEN ?? process.env.SUPABASE_DISCORDIA_TOKEN ?? cfg.supabaseToken;
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
// TURN pelo Supabase: se o .env deste PC não tem TURN, pede credenciais à função anarchy-db (as chaves da
// Cloudflare ficam nos segredos do Supabase). Renova a cada 30 min; sem TURN, quem está em 4G/CGNAT não ouve a call.
async function refreshSupabaseTurn() {
  if (process.env.CF_TURN_KEY_ID || process.env.TURN_URLS || !store.turn) return;
  try {
    const r = await store.turn();
    if (r && r.configured && r.iceServers.length) { const first = !cfg.iceServers.some(s => [].concat(s.urls).some(u => /^turns?:/.test(u))); cfg.iceServers = [...STUN, ...r.iceServers]; if (first) log('   TURN via Supabase: ativo (calls funcionam em qualquer rede)'); }
    else if (r && !r.configured) log('   TURN: não configurado. Calls entre redes diferentes (4G, CGNAT) podem ficar sem áudio. Veja o SERVIDOR.md.');
  } catch (e) { log('   TURN via Supabase falhou (' + e.message + ').'); }
}
await refreshSupabaseTurn();
// sem TURN ainda: tenta de 5 em 5 min (pega logo quando as chaves forem colocadas); com TURN: renova a cada 30 min
const turnOn = () => cfg.iceServers.some(s => [].concat(s.urls).some(u => /^turns?:/.test(u)));
let turnLast = Date.now();
setInterval(() => { if (!turnOn() || Date.now() - turnLast > 30 * 60e3) { turnLast = Date.now(); refreshSupabaseTurn(); } }, 5 * 60e3).unref();
// subiu sem as tabelas da Central de Áudio? confere de 5 em 5 min e reinicia quando elas existirem
// (só no servidor dedicado: o rodar.cmd liga de novo sozinho)
if (opts.standalone && (!store.mediaReady || store.rpgReady === false) && store.recheck) setInterval(async () => {
  if (!(await store.recheck())) return;
  log('Supabase: tabelas novas disponíveis (Central de Áudio, figurinhas ou RPG de Mesa). Reiniciando para ligar.');
  await store.flush().catch(() => {}); process.exit(0);
}, 5 * 60e3).unref();
const save = store.save, saveNow = store.saveNow;

// "versão" da interface: muda quando app.js, style.css ou index.html mudam. Os apps abertos comparam
// com a que receberam e mostram o botão "Atualizar".
const STARTED = Date.now(); // o app compara: se mudou, o servidor reiniciou
const BUILD = (() => {
  const h = crypto.createHash('sha1');
  // todos os arquivos da interface: mudou qualquer um, os apps abertos mostram "Atualizar"
  for (const f of fs.readdirSync(PUBLIC).filter(f => /\.(html|js|css)$/.test(f)).sort()) { try { h.update(fs.readFileSync(path.join(PUBLIC, f))); } catch {} }
  return h.digest('hex').slice(0, 12);
})();

const newId = () => crypto.randomBytes(9).toString('base64url');
const code = () => crypto.randomBytes(5).toString('hex').toUpperCase();
// ícone de grupo: só imagem enviada para este servidor ou até 8 caracteres (emoji/iniciais). Nada de link de fora
// (um link externo funcionaria como "pixel espião": revelaria o IP de quem abre o grupo)
const cleanIcon = (v, isUp) => { const s = str(v, 400).trim(); return !s ? null : isUp(s) ? s : /^https?:|url\(|[<>"']/i.test(s) ? null : [...s].slice(0, 8).join(''); };
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
  const on = u.bot || (isOnline(u.id) && u.status !== 'invisivel');
  return {
    ...(u.bot ? { bot: true } : {}),
    id: u.id, username: u.username, displayName: u.displayName, avatar: u.avatar || null,
    color: u.color, banner: u.banner, bio: u.bio || '', customStatus: u.customStatus || '',
    pronouns: u.pronouns || '', theme: u.theme || null,
    accent: u.accent || null, frame: u.frame || null, effect: u.effect || null, badges: u.bot ? [] : badgesOf(u),
    status: on ? (u.status || 'online') : 'offline', createdAt: u.createdAt,
    plate: u.plate && PLATES.includes(u.plate) ? u.plate : null,
    avfx: u.avfx && AVFX[u.avfx] ? u.avfx : null,
    // conquistas (ids) e o que está fazendo agora (some depois de 12 horas)
    ach: u.ach ? Object.keys(u.ach) : [],
    activity: u.activity && Date.now() - u.activity.at < 12 * 3600e3 ? { text: u.activity.text, emoji: u.activity.emoji } : null
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
// Placas de nome animadas (inventário). Ninguém escolhe: só os donos do Anarchy dão para as pessoas.
// O visual e o nome de cada uma ficam no app (PLATES em app.js); aqui só a lista do que existe.
const PLATES = ['sakura', 'lua', 'galaxia', 'shoujo', 'chamas', 'raio', 'neon', 'oceano', 'mecha', 'escarlate', 'kitsune', 'ceifador', 'oni', 'aura', 'dragao', 'anarquia'];
// quem pode dar itens: ANARCHY_ADMINS no .env (ids ou nomes de usuário, separados por vírgula). Padrão: a conta do Foxy.
const ADMINS = (process.env.ANARCHY_ADMINS || 'JoREzT59l3Vw').split(',').map(s => s.trim()).filter(Boolean);
const isAdmin = u => !!u && !u.bot && (ADMINS.includes(u.id) || ADMINS.includes(u.username));

/* AnarchyPoints e caixas: 100 pontos a cada 30 minutos em call (com mais alguém na sala, sem estar com o som desligado).
   Cada caixa custa 300 e sorteia um efeito animado de foto de perfil (100 no total). O sorteio é aqui no servidor. */
// PONTOS_MINUTOS no .env muda o tempo (padrão: 30 minutos para cada 100 pontos)
const PT_EVERY = Math.max(1, +process.env.PONTOS_MINUTOS || 30) * 60e3, PT_GAIN = 100, BOX_COST = 300;
const AVFX_STYLES = { anel: 'comum', brilho: 'comum', pontos: 'comum', duplo: 'comum', pulso: 'comum', arco: 'comum', respiro: 'comum',
  cometa: 'raro', faiscas: 'raro', bolhas: 'raro', eletrico: 'raro', radar: 'raro', petalas: 'raro',
  chamas: 'epico', galaxia: 'epico', glitch: 'epico', runas: 'epico', aura: 'lendario', coroa: 'lendario', portal: 'lendario' };
const AVFX_PALS = ['fogo', 'gelo', 'veneno', 'realeza', 'prisma'];
const RAR_UP = { comum: 'raro', raro: 'epico', epico: 'lendario', lendario: 'mitico' };
const AVFX = {}; // 'estilo-cor' -> raridade (a cor Prisma sobe uma raridade)
for (const [s, r] of Object.entries(AVFX_STYLES)) for (const p of AVFX_PALS) AVFX[`${s}-${p}`] = p === 'prisma' ? RAR_UP[r] : r;
const DROP = [['comum', 7000], ['raro', 2000], ['epico', 700], ['lendario', 250], ['mitico', 50]]; // chance em 10.000
const REFUND = { comum: 30, raro: 60, epico: 150, lendario: 400, mitico: 1000 }; // repetida: devolve pontos
function rollAvfx() {
  let n = crypto.randomInt(0, 10000), tier = 'comum';
  for (const [t, w] of DROP) { if (n < w) { tier = t; break; } n -= w; }
  const pool = Object.keys(AVFX).filter(k => AVFX[k] === tier);
  return pool[crypto.randomInt(0, pool.length)];
}

/* ---------- grupos: cargos e permissões ---------- */
const PERMS = ['admin', 'manageServer', 'manageChannels', 'manageRoles', 'kick', 'ban', 'manageMessages', 'mentionEveryone', 'manageMedia', 'rpg'];
// Central de Áudio e figurinhas: limites por grupo
const SOUND_MAX = 30, SOUND_BYTES = 1024 * 1024, SOUND_MS = 7000, STICKER_MAX = 60;
const AUDIO_EXT = { 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/ogg': 'ogg', 'audio/webm': 'webm', 'audio/mp4': 'm4a' };
// confere o tipo pelo começo do arquivo (não confia só no que o navegador disse)
function audioKind(buf) {
  const s = (a, b) => buf.slice(a, b).toString('latin1');
  if (s(0, 3) === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) return 'audio/mpeg';
  if (s(0, 4) === 'RIFF' && s(8, 12) === 'WAVE') return 'audio/wav';
  if (s(0, 4) === 'OggS') return 'audio/ogg';
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'audio/webm';
  if (s(4, 8) === 'ftyp') return 'audio/mp4';
  return null;
}
const clampN = (v, a, b, d) => { const n = Math.round(+v); return Number.isFinite(n) ? Math.max(a, Math.min(b, n)) : d; };
const sbLast = new Map(), sbRoom = new Map(); // anti-spam da Central de Áudio (por pessoa e por sala)
const GIF_RE =/^https:\/\/(media\d*\.giphy\.com|i\.giphy\.com|media\.tenor\.com)\/[\w\-./%?=&]+$/;
const HEX = /^#[0-9a-f]{6}$/i;
function fixGroup(g) {
  if (!Array.isArray(g.roles)) g.roles = [];
  if (!g.memberRoles || typeof g.memberRoles !== 'object') g.memberRoles = {};
  if (!Array.isArray(g.bans)) g.bans = [];
  if (typeof g.description !== 'string') g.description = '';
  if (g.banner === undefined) g.banner = null;
  if (g.systemJoin === undefined) g.systemJoin = true;
  if (g.welcomeCid === undefined) g.welcomeCid = null;
  if (!Array.isArray(g.sounds)) g.sounds = [];
  if (!Array.isArray(g.stickers)) g.stickers = [];
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
// o email da conta só vai para o próprio dono (nunca no publicUser)
function selfUser(u) { return { ...publicUser(u), status: u.status || 'online', realStatus: u.status || 'online', blocked: u.blocked || [], favs: u.favs || null, privacy: u.privacy || {}, email: u.email || null, emailAsked: u.emailAsked || 0, mailOn: mailOn(),
  items: u.items || [], lost: (u.lost || []).slice(-100), admin: isAdmin(u), given: isAdmin(u) ? (u.given || []).slice(-300) : [],
  points: u.points || 0, pointsTotal: u.pointsTotal || 0, callAcc: u.callAcc || 0, ptEvery: PT_EVERY, boxes: u.boxes || 0, boxLog: (u.boxLog || []).slice(-40), ptsLog: (u.ptsLog || []).slice(-40),
  // caixa diária: pronta para pegar hoje? (vira à meia-noite de Brasília) e quantos dias seguidos
  daily: { ready: !u.daily || u.daily.last !== new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10), streak: (u.daily && u.daily.streak) || 0 },
  achAt: u.ach || {}, stats: u.stats || {} }; }
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
// a cada minuto: quem está em call com mais alguém (e não está com o som desligado) acumula tempo; a cada 30 min ganha 100 pontos
setInterval(() => {
  const counted = new Set(); let changed = false;
  for (const peers of voice.values()) {
    const humans = new Set([...peers.values()].map(s => s.uid).filter(id => db.users[id] && !db.users[id].bot));
    if (humans.size < 2) continue;
    for (const s of peers.values()) {
      const u = db.users[s.uid];
      if (!u || u.bot || s.deafened || counted.has(u.id)) continue;
      counted.add(u.id); changed = true;
      u.callAcc = (u.callAcc || 0) + 60e3;
      if (u.callAcc >= PT_EVERY) {
        u.callAcc -= PT_EVERY; u.points = (u.points || 0) + PT_GAIN; u.pointsTotal = (u.pointsTotal || 0) + PT_GAIN;
        toUser(u.id, 'points:gain', { amount: PT_GAIN, points: u.points });
      }
      fun.track(u.id, 'callMin'); // minutos em call (conquistas e retrospectiva)
      toUser(u.id, 'me:update', selfUser(u));
    }
  }
  if (changed) save();
}, 60e3).unref();
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
  // todo mundo saiu: o DJ para
  if (!voice.get(roomId) && music.has(roomId)) stopMusic(roomId, 'vazia');
  // avisa se a call de DM terminou
  const info = channelInfo(roomId);
  if (info && info.kind === 'dm' && !voice.get(roomId)) toUsers(info.members, 'call:ended', { dmId: roomId });
}

/* ---------- DJ: bot de música dos grupos ----------
   O bot é um membro do grupo (usuário com bot: true). Os comandos (/music, /pular...) chegam como mensagens.
   A música não passa pelo WebRTC: o servidor diz a todos da sala o que tocar e desde quando (startedAt), e cada
   app toca o áudio (puxado deste servidor, /api/music/:id) sincronizado, com o próprio volume. */
const { createMusic } = require('./music');
const dj = createMusic({ log });
const music = new Map();  // roomId -> { roomId, gid, cid, botId, cur, queue, startedAt, pausedAt, vol, loop, timer }
const tracks = new Map(); // id da faixa -> faixa (o endereço real do áudio só fica aqui no servidor)
const isBot = id => !!(db.users[id] && db.users[id].bot);
const fmtDur = s => { s = Math.round(s || 0); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = String(s % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`; };
const uname = id => (db.users[id] && db.users[id].displayName) || 'alguém';
const card = t => ({ title: t.title, by: t.by, page: t.page, thumb: t.thumb, dur: t.dur });
const mdSafe = s => String(s).replace(/([*_~`|\\])/g, '\\$1');
function musicView(st) {
  if (!st) return null;
  const t = x => x && { id: x.id, title: x.title, by: x.by, page: x.page, dur: x.dur, thumb: x.thumb, who: x.who };
  // enquanto o áudio da música atual está sendo buscado, os apps não tocam nada
  return { roomId: st.roomId, gid: st.gid, botId: st.botId, cur: st.cur && st.cur.src && !st.cur.loading ? t(st.cur) : null, loading: st.cur && (!st.cur.src || st.cur.loading) ? t(st.cur) : null, queue: st.queue.map(t), startedAt: st.startedAt, pausedAt: st.pausedAt, vol: st.vol, loop: st.loop, serverNow: now() };
}
function pushMusic(roomId) {
  const info = channelInfo(roomId); if (!info) return;
  toUsers(info.members.filter(m => !isBot(m)), 'music:state', { roomId, state: musicView(music.get(roomId)) });
}
function botSay(g, cid, content, extra = {}) {
  if (!g.djId || !g.members.includes(g.djId) || !g.channels.some(c => c.id === cid && c.type === 'text')) return null;
  const msg = { id: newId(), cid, authorId: g.djId, content, image: null, ts: now(), edited: null, reactions: {}, replyTo: null, ...extra };
  const list = db.messages[cid] || (db.messages[cid] = []);
  list.push(msg); if (list.length > 3000) list.splice(0, list.length - 3000);
  save(); toUsers(g.members, 'message:new', msg); return msg;
}
function botEdit(g, msg, content, extra = {}) {
  if (!msg) return botSay(g, extra.cid, content, extra);
  Object.assign(msg, { content }, extra); save(); toUsers(g.members, 'message:update', msg); return msg;
}
function scheduleEnd(st) {
  clearTimeout(st.timer); st.timer = null;
  if (!st.cur || st.pausedAt !== null || !st.cur.dur) return;
  const left = st.startedAt + st.cur.dur * 1000 - now();
  st.timer = setTimeout(() => nextTrack(st.roomId), Math.max(0, left) + 800);
}
// próxima da fila. msg: mensagem "procurando..." para virar o "tocando agora" (em vez de mandar outra)
async function nextTrack(roomId, { skipped = false, msg = null } = {}) {
  const st = music.get(roomId); if (!st) return;
  const prev = st.cur;
  if (st.loop && prev && !skipped) st.queue.unshift(prev);
  else if (prev) setTimeout(() => { if (![...music.values()].some(s => s.cur === prev || s.queue.includes(prev))) tracks.delete(prev.id); }, 60e3).unref();
  st.cur = st.queue.shift() || null;
  if (!st.cur) return stopMusic(roomId, 'fim', msg);
  const seq = st.seq = (st.seq || 0) + 1, t = st.cur;
  // música de playlist (ainda sem áudio) ou endereço velho (o do YouTube vence em algumas horas): busca agora
  if (needSrc(t) || t.loading) {
    clearTimeout(st.timer);
    const p = t.loading || loadSrc(t); pushMusic(roomId); // enquanto busca, ninguém toca nada (a anterior já acabou)
    try { await p; }
    catch (e) {
      if (st.seq !== seq || music.get(roomId) !== st) return;
      const g = db.groups[st.gid]; if (g) botSay(g, st.cid, `⚠️ Pulei **${mdSafe(t.title)}**: ${mdSafe(e.message)}.`);
      tracks.delete(t.id);
      return nextTrack(roomId, { skipped: true, msg });
    }
    if (st.seq !== seq || music.get(roomId) !== st) return; // alguém pulou ou parou enquanto buscava
  }
  st.startedAt = now() + 1500; st.pausedAt = null; // 1,5 s para todo mundo carregar e começar junto
  scheduleEnd(st); pushMusic(roomId);
  const g = db.groups[st.gid];
  if (g && !(st.loop && prev === st.cur)) botEdit(g, msg, `🎵 Tocando agora: **${mdSafe(st.cur.title)}**${st.cur.dur ? ` (${fmtDur(st.cur.dur)})` : ''} · pedido por ${mdSafe(uname(st.cur.who))}${st.cur.via ? ` · achei no ${st.cur.via} (o YouTube está bloqueando o servidor agora)` : ''}`, { music: card(st.cur), cid: st.cid });
  // já deixa a próxima pronta, para a troca de música não ter espera
  const nx = st.queue[0]; if (nx && needSrc(nx)) loadSrc(nx).catch(() => {});
}
// faixa sem áudio ainda (veio de playlist) ou com o endereço vencido
const needSrc = t => !t.src || (t.q && now() - (t.at || 0) > 4 * 3600e3);
function loadSrc(t) {
  // o nome vai junto: se o YouTube estiver bloqueando, o DJ procura pelo nome no SoundCloud
  const name = t.title ? (t.keep && t.by ? `${t.title} ${t.by}` : t.title) : null;
  if (!t.loading) t.loading = dj.resolve(t.q, { name }).then(r => {
    // da playlist do Spotify ficam o nome e a capa de lá (a busca no YouTube só fornece o áudio)
    Object.assign(t, t.keep ? { src: r.src, at: r.at, page: r.page, dur: r.dur || t.dur, via: r.via } : r);
    hlsWarm(r.src);
  }).finally(() => { t.loading = null; });
  return t.loading;
}
function stopMusic(roomId, why, msg = null) {
  const st = music.get(roomId); if (!st) return;
  clearTimeout(st.timer); music.delete(roomId);
  [st.cur, ...st.queue].forEach(t => t && tracks.delete(t.id));
  pushMusic(roomId);
  const g = db.groups[st.gid]; if (!g) return;
  if (why === 'fim') botEdit(g, msg, 'A fila acabou. Até a próxima! 👋', { cid: st.cid });
  else if (why === 'vazia') botSay(g, st.cid, 'Todo mundo saiu da call, então parei a música. 👋');
}
// o DJ de um grupo e a sala de voz do grupo em que a pessoa está
const djOf = g => g && g.djId && g.members.includes(g.djId) && db.users[g.djId] ? g.djId : null;
function roomOfUser(g, uid) {
  for (const sid of online.get(uid) || []) { const r = sockets.get(sid)?.data.voice; if (r && g.channels.some(c => c.id === r)) return r; }
  return null;
}
const CMDS = {
  music: ['music', 'm', 'tocar', 'play', 'p'], album: ['album', 'álbum', 'disco', 'playlist'], pular: ['pular', 'skip', 's', 'proxima'], pausar: ['pausar', 'pause'], continuar: ['continuar', 'resume', 'voltar'],
  parar: ['parar', 'stop', 'sair'], fila: ['fila', 'queue', 'q'], agora: ['agora', 'np', 'tocando'], volume: ['volume', 'vol', 'v'], repetir: ['repetir', 'loop', 'r'],
  tirar: ['tirar', 'remover', 'remove'], embaralhar: ['embaralhar', 'shuffle', 'misturar'], ajuda: ['ajuda', 'help', 'comandos']
};
const CMD_OF = Object.fromEntries(Object.entries(CMDS).flatMap(([k, l]) => l.map(a => [a, k])));
const HELP = [
  '**Comandos do DJ** 🎧 (entre numa sala de voz do grupo antes)',
  '`/music nome ou link` toca ou põe na fila (YouTube, SoundCloud, Spotify, link de mp3...)',
  '`/music link da playlist ou do álbum` põe todas as músicas na fila de uma vez · `/album nome do álbum` procura o álbum inteiro',
  '`/pular` próxima música · `/pausar` · `/continuar` · `/parar` para tudo e limpa a fila',
  '`/fila` mostra a fila · `/agora` o que está tocando · `/tirar 2` tira a 2ª da fila · `/embaralhar`',
  '`/volume 80` volume do DJ para todo mundo (0 a 100) · `/repetir` repete a música atual',
  'Cada um também ajusta o volume do DJ só para si no cartão "Tocando agora" da call.'
].join('\n');
// ações do DJ (vêm dos comandos no chat ou dos botões do cartão). Devolve o texto da resposta.
function djAction(g, uid, room, action, arg) {
  const st = music.get(room);
  const need = () => st && st.cur ? null : 'Não tem nada tocando agora. Use `/music nome da música`.';
  const who = mdSafe(uname(uid));
  if (action === 'pular') { if (need()) return need(); const t = st.cur; setImmediate(() => nextTrack(room, { skipped: true })); return `⏭️ ${who} pulou **${mdSafe(t.title)}**.`; }
  if (action === 'pausar') { if (need()) return need(); if (st.pausedAt !== null) return 'Já está pausado. Use `/continuar`.'; st.pausedAt = Math.max(0, now() - st.startedAt); scheduleEnd(st); pushMusic(room); return `⏸️ ${who} pausou a música.`; }
  if (action === 'continuar') { if (need()) return need(); if (st.pausedAt === null) return 'A música já está tocando.'; st.startedAt = now() - st.pausedAt + 500; st.pausedAt = null; scheduleEnd(st); pushMusic(room); return `▶️ ${who} continuou a música.`; }
  if (action === 'parar') { if (!st) return 'O DJ já está parado.'; stopMusic(room, 'parar'); return `⏹️ ${who} parou a música e limpou a fila.`; }
  if (action === 'volume') {
    if (!st) return 'Não tem nada tocando agora.';
    const v = parseInt(String(arg).replace('%', ''), 10);
    if (!Number.isFinite(v)) return `Volume do DJ: **${st.vol}%**. Para mudar: \`/volume 80\` (0 a 100).`;
    st.vol = Math.max(0, Math.min(100, v)); pushMusic(room); return `🔊 ${who} mudou o volume do DJ para **${st.vol}%**.`;
  }
  if (action === 'repetir') { if (need()) return need(); st.loop = !st.loop; pushMusic(room); return st.loop ? `🔁 Repetindo **${mdSafe(st.cur.title)}** até alguém usar \`/repetir\` de novo.` : '🔁 Repetição desligada.'; }
  if (action === 'tirar') {
    if (!st || !st.queue.length) return 'A fila está vazia.';
    const i = parseInt(arg, 10) - 1; if (!(i >= 0 && i < st.queue.length)) return `Escolha um número da fila de 1 a ${st.queue.length}. Veja com \`/fila\`.`;
    const [t] = st.queue.splice(i, 1); tracks.delete(t.id); pushMusic(room); return `🗑️ ${who} tirou **${mdSafe(t.title)}** da fila.`;
  }
  if (action === 'embaralhar') {
    if (!st || st.queue.length < 2) return 'Precisa de pelo menos 2 músicas na fila.';
    for (let i = st.queue.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [st.queue[i], st.queue[j]] = [st.queue[j], st.queue[i]]; }
    pushMusic(room); return `🔀 ${who} embaralhou a fila.`;
  }
  if (action === 'fila' || action === 'agora') {
    if (!st || !st.cur) return 'Não tem nada tocando. Use `/music nome da música`.';
    const pos = st.pausedAt !== null ? st.pausedAt / 1000 : Math.max(0, (now() - st.startedAt) / 1000);
    const head = `${st.pausedAt !== null ? '⏸️' : '🎵'} **${mdSafe(st.cur.title)}** · ${fmtDur(pos)}${st.cur.dur ? ' / ' + fmtDur(st.cur.dur) : ''} · pedido por ${mdSafe(uname(st.cur.who))}${st.loop ? ' · 🔁' : ''}`;
    if (action === 'agora') return head;
    const rest = st.queue.slice(0, 10).map((t, i) => `\`${i + 1}.\` ${mdSafe(t.title)}${t.dur ? ` (${fmtDur(t.dur)})` : ''} · ${mdSafe(uname(t.who))}`);
    return [head, rest.length ? '**Próximas:**' : 'A fila está vazia depois desta.', ...rest, st.queue.length > 10 ? `...e mais ${st.queue.length - 10}.` : ''].filter(Boolean).join('\n');
  }
  return null;
}
const MAX_QUEUE = 300;
function djState(g, cid, room) {
  let st = music.get(room);
  if (!st) { st = { roomId: room, gid: g.id, cid, botId: g.djId, cur: null, queue: [], startedAt: 0, pausedAt: null, vol: 100, loop: false, timer: null }; music.set(room, st); }
  st.cid = cid; return st;
}
// playlist, álbum (link ou "/album nome") ou Spotify: põe todas na fila de uma vez; o áudio de cada uma vem na hora de tocar
async function djPlayList(g, cid, uid, room, q, album) {
  const msg = botSay(g, cid, album ? `🔎 Procurando o álbum **${mdSafe(q.slice(0, 120))}**...` : '🔎 Lendo a lista de músicas...');
  let r;
  try { r = await dj.resolveList(q, { album }); }
  catch (e) { return botEdit(g, msg, `😕 Não consegui ${album ? `achar o álbum **${mdSafe(q.slice(0, 120))}**` : 'abrir essa lista'}: ${mdSafe(e.message)}.`, { cid }); }
  if (!djOf(g) || !voice.get(room)) return botEdit(g, msg, 'Achei as músicas, mas a sala de voz ficou vazia.', { cid });
  const st = djState(g, cid, room);
  const free = MAX_QUEUE - st.queue.length;
  if (free <= 0) return botEdit(g, msg, `A fila está cheia (${MAX_QUEUE} músicas). Use \`/parar\` ou espere algumas tocarem.`, { cid });
  const add = r.tracks.slice(0, free).map(x => ({ id: newId(), ...x, who: uid, roomId: room }));
  add.forEach(t => tracks.set(t.id, t));
  st.queue.push(...add);
  const total = add.reduce((s, t) => s + (t.dur || 0), 0);
  const cut = r.tracks.length > add.length ? ` (a fila só tinha espaço para ${add.length} de ${r.tracks.length})` : '';
  const first = add[0];
  if (r.single && !st.cur) return nextTrack(room, { msg }); // música só, nada tocando: o "procurando" vira o "tocando agora"
  if (r.single) botEdit(g, msg, `➕ Na fila: **${mdSafe(first.title)}**${first.by ? ` · ${mdSafe(first.by)}` : ''}`, { cid });
  else botEdit(g, msg, `📃 ${mdSafe(uname(uid))} pôs **${add.length} músicas** de **${mdSafe(r.title)}** na fila${total ? ` (${fmtDur(total)})` : ''}${cut}.`, { music: { title: r.title, by: `${add.length} músicas`, page: /^https?:/.test(q) ? q : null, thumb: first.thumb, dur: total }, cid });
  if (!st.cur) return nextTrack(room);
  pushMusic(room);
  const nx = st.queue[0]; if (nx && needSrc(nx)) loadSrc(nx).catch(() => {});
}
async function djPlay(g, cid, uid, room, q) {
  if (dj.isList(q) || dj.isSpotify(q)) return djPlayList(g, cid, uid, room, q, false);
  const msg = botSay(g, cid, `🔎 Procurando **${mdSafe(q.slice(0, 120))}**...`);
  let r;
  try { r = await dj.resolve(q); }
  catch (e) { return botEdit(g, msg, `😕 Não consegui tocar **${mdSafe(q.slice(0, 120))}**: ${mdSafe(e.message)}.`, { cid }); }
  hlsWarm(r.src);
  if (!djOf(g) || !voice.get(room)) return botEdit(g, msg, 'Achei a música, mas a sala de voz ficou vazia.', { cid });
  const t = { id: newId(), ...r, who: uid, q, roomId: room };
  tracks.set(t.id, t);
  const st = djState(g, cid, room);
  if (st.queue.length >= MAX_QUEUE) { tracks.delete(t.id); return botEdit(g, msg, `A fila está cheia (${MAX_QUEUE} músicas). Espere algumas tocarem.`, { cid }); }
  st.queue.push(t);
  if (!st.cur) return nextTrack(room, { msg });
  pushMusic(room);
  botEdit(g, msg, `➕ Na fila (#${st.queue.length}): **${mdSafe(t.title)}**${t.dur ? ` (${fmtDur(t.dur)})` : ''} · pedido por ${mdSafe(uname(uid))}${t.via ? ` · achei no ${t.via} (o YouTube está bloqueando o servidor agora)` : ''}`, { music: card(t), cid });
}
// mensagem que começa com / num grupo com DJ: é comando? (true = tratou, não vira mensagem normal)
function djCommand(g, cid, uid, text) {
  const m = /^\/(\S+)\s*([\s\S]*)$/.exec(text.trim()); if (!m) return false;
  const action = CMD_OF[m[1].toLowerCase()]; if (!action || !djOf(g)) return false;
  const arg = m[2].trim();
  if (action === 'ajuda') { botSay(g, cid, HELP); return true; }
  const room = roomOfUser(g, uid);
  if (!room) { botSay(g, cid, `${mdSafe(uname(uid))}, entre numa sala de voz do grupo primeiro. 🎧`); return true; }
  if (action === 'music' || action === 'album') {
    if (!arg) { botSay(g, cid, action === 'album' ? 'Diga o álbum: `/album nome do álbum e artista`.' : 'Diga a música: `/music nome da música` ou `/music link`.'); return true; }
    if (limited('dj:' + uid, 8, 60e3)) { botSay(g, cid, 'Calma! Muitos pedidos seguidos. Espere um pouquinho.'); return true; }
    // "/music album Nevermind" também vale
    const al = /^(álbum|album)\s+(.+)$/i.exec(arg);
    if (action === 'album' || al) {
      const q = (al ? al[2] : arg).slice(0, 300);
      if (/^https?:\/\//i.test(q)) djPlay(g, cid, uid, room, q);
      else djPlayList(g, cid, uid, room, q, true);
    } else djPlay(g, cid, uid, room, arg.slice(0, 300));
    return true;
  }
  const st = music.get(room); if (st) st.cid = cid;
  const reply = djAction(g, uid, room, action, arg);
  if (reply) botSay(g, cid, reply);
  return true;
}

/* ---------- HTTP ---------- */
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 'loopback'); // o Tailscale Funnel entrega pelo próprio PC: confia no IP que ele informa
// textos (app.js, css, json) vão comprimidos: carrega bem mais rápido. Se o pacote ainda não foi instalado, segue sem.
try { app.use(require('compression')()); } catch { log('   Aviso: pacote "compression" não instalado; rode npm install. Seguindo sem compressão.'); }

// cabeçalhos de segurança: o navegador só roda scripts deste servidor, não deixa outro site embutir o app
// e só carrega imagens/sons de lugares conhecidos (este servidor, Supabase, GIPHY, Tenor)
const CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://*.supabase.co https://*.giphy.com https://media.tenor.com https://i.ytimg.com https://*.sndcdn.com https://*.spotifycdn.com https://i.scdn.co https://*.bcbits.com",
  "media-src 'self' blob: https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co https://*.giphy.com https://media.tenor.com",
  "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'"
].join('; ');
const isHttps = req => req.secure || req.headers['x-forwarded-proto'] === 'https' || /\.ts\.net$/i.test((req.headers.host || '').split(':')[0]);
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=(), usb=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (isHttps(req)) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  next();
});
app.use(express.json({ limit: '12mb' }));

// página inicial com os arquivos marcados pela versão (?v=...): o navegador guarda app.js/css por 1 ano
// e só baixa de novo quando a versão muda. A página em si nunca fica guardada (pega sempre a versão nova).
let indexHtml = null;
const sendIndex = (req, res) => {
  if (!indexHtml) indexHtml = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8').replace(/(href|src)="([\w.-]+\.(?:css|js))"/g, `$1="$2?v=${BUILD}"`);
  res.setHeader('Cache-Control', 'no-cache'); res.type('html').send(indexHtml);
};
app.get(['/', '/index.html'], sendIndex);
app.use(express.static(PUBLIC, { index: false, setHeaders: (res, file) => res.setHeader('Cache-Control', /\.(js|css)$/.test(file) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600') }));
// arquivos enviados têm nome aleatório e nunca mudam
app.use('/uploads', express.static(UPLOADS, { maxAge: '365d', immutable: true, dotfiles: 'deny' }));

/* sessão: cookie HttpOnly (o JavaScript da página não consegue ler, então um script malicioso não rouba o login).
   Também aceita o token no cabeçalho x-token, para apps antigos durante a transição. */
const COOKIE = 'dsess';
function cookieOf(header, name) {
  for (const part of String(header || '').split(';')) { const i = part.indexOf('='); if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim()); }
  return null;
}
const tokenOf = req => req.headers['x-token'] || cookieOf(req.headers.cookie, COOKIE) || null;
function setSession(req, res, token) {
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${isHttps(req) ? '; Secure' : ''}`);
}
const clearSession = (req, res) => res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isHttps(req) ? '; Secure' : ''}`);
function newSession(uid) { const token = crypto.randomBytes(32).toString('hex'); db.sessions[token] = uid; save(); return token; }

function auth(req, res, next) {
  const uid = db.sessions[tokenOf(req)];
  if (!uid || !db.users[uid]) return res.status(401).json({ erro: 'Sessão expirada. Entre de novo.' });
  req.uid = uid; next();
}

// limite de tentativas (contra adivinhar senha, criar contas em massa, flood)
const hits = new Map();
function limited(key, max, ms) {
  const t = now(), l = (hits.get(key) || []).filter(x => t - x < ms);
  if (l.length >= max) { hits.set(key, l); return true; }
  l.push(t); hits.set(key, l); return false;
}
setInterval(() => { const t = now(); for (const [k, l] of hits) if (!l.length || t - l[l.length - 1] > 3600e3) hits.delete(k); }, 600e3).unref();
const ipOf = req => req.ip || req.socket.remoteAddress || '?';
// compara a senha em tempo constante (não dá para descobrir pelo tempo de resposta)
const pwOk = (u, pw) => { const a = Buffer.from(hashPw(pw, u.salt), 'hex'), b = Buffer.from(u.passHash || '', 'hex'); return a.length === b.length && crypto.timingSafeEqual(a, b); };
const DUMMY = { salt: crypto.randomBytes(16).toString('hex'), passHash: crypto.randomBytes(64).toString('hex') };
const USER_RE = /^[a-z0-9_.]{3,20}$/;
const COLORS = ['#6c7cff', '#ff6b8b', '#3ee0c5', '#f5b83d', '#b07cff', '#4fc3f7', '#7bd88f', '#ff8a4c'];
const MIN_PW = 8;

app.post('/api/register', (req, res) => {
  if (limited('reg:' + ipOf(req), 5, 3600e3)) return res.status(429).json({ erro: 'Muitas contas criadas daqui. Tente de novo mais tarde.' });
  const username = str(req.body.username, 40).trim().toLowerCase();
  const password = str(req.body.password, 200);
  if (!USER_RE.test(username)) return res.status(400).json({ erro: 'O usuário precisa ter de 3 a 20 caracteres: letras minúsculas, números, ponto ou _.' });
  if (password.length < MIN_PW) return res.status(400).json({ erro: `A senha precisa ter pelo menos ${MIN_PW} caracteres.` });
  if (password.toLowerCase().includes(username)) return res.status(400).json({ erro: 'A senha não pode conter o nome de usuário.' });
  if (Object.values(db.users).some(u => u.username === username)) return res.status(400).json({ erro: 'Esse nome de usuário já existe.' });
  const salt = crypto.randomBytes(16).toString('hex');
  const id = newId();
  db.users[id] = {
    id, username, displayName: str(req.body.displayName, 32).trim() || username, salt, passHash: hashPw(password, salt),
    color: COLORS[Object.keys(db.users).length % COLORS.length], banner: null, avatar: null, bio: '', status: 'online', customStatus: '', createdAt: now()
  };
  pioneers = null;
  const token = newSession(id); setSession(req, res, token);
  res.json({ token });
});
app.post('/api/login', (req, res) => {
  const username = str(req.body.username, 40).trim().toLowerCase();
  if (limited('login-ip:' + ipOf(req), 30, 15 * 60e3) || limited('login-user:' + username, 8, 15 * 60e3)) return res.status(429).json({ erro: 'Muitas tentativas. Espere 15 minutos e tente de novo.' });
  const u = Object.values(db.users).find(x => x.username === username && !x.bot);
  const ok = pwOk(u || DUMMY, str(req.body.password, 200)); // mesmo sem usuário faz a conta (tempo igual)
  if (!u || !ok) return res.status(400).json({ erro: 'Usuário ou senha incorretos.' });
  hits.delete('login-user:' + username);
  const token = newSession(u.id); setSession(req, res, token);
  res.json({ token });
});
// apps antigos guardavam o token no navegador: troca por cookie e o app apaga a cópia antiga
app.post('/api/session', auth, (req, res) => { setSession(req, res, tokenOf(req)); res.json({ ok: true }); });
app.post('/api/logout', (req, res) => { const t = tokenOf(req); if (t) { delete db.sessions[t]; save(); } clearSession(req, res); res.json({ ok: true }); });
app.post('/api/password', auth, (req, res) => {
  if (limited('pw:' + req.uid, 6, 15 * 60e3)) return res.status(429).json({ erro: 'Muitas tentativas. Espere 15 minutos.' });
  const u = db.users[req.uid];
  if (!pwOk(u, str(req.body.atual, 200))) return res.status(400).json({ erro: 'A senha atual está errada.' });
  const nova = str(req.body.nova, 200);
  if (nova.length < MIN_PW) return res.status(400).json({ erro: `A nova senha precisa ter pelo menos ${MIN_PW} caracteres.` });
  u.salt = crypto.randomBytes(16).toString('hex'); u.passHash = hashPw(nova, u.salt);
  // trocou a senha: os outros aparelhos saem (se alguém tinha seu login, perde o acesso)
  const keep = tokenOf(req);
  for (const [t, id] of Object.entries(db.sessions)) if (id === u.id && t !== keep) delete db.sessions[t];
  (online.get(u.id) || new Set()).forEach(sid => { const s = sockets.get(sid); if (s && s.data.token !== keep) s.disconnect(true); });
  save(); res.json({ ok: true });
});
/* ---------- email da conta e recuperação de senha ----------
   A pessoa liga um email à conta confirmando um código de 6 dígitos que chega nele.
   "Esqueci a senha" manda para esse email um link que vale 30 minutos e uma vez só.
   No banco fica só o "hash" do link (quem vê o banco não consegue usar o link). */
const { createMailer } = require('./mail');
const mailer = createMailer({ log, supabaseUrl: cfg.supabaseUrl, supabaseToken: cfg.supabaseToken });
const EMAIL_RE = /^[^\s@<>()",;:\\]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,24}$/i;
const sha256 = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const emailCodes = new Map(); // uid -> { email, hash, exp, tries } (código para confirmar o email)
function publicBase() {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/+$/, '');
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'desktop', 'servidor.json'), 'utf8')).url.replace(/\/+$/, ''); } catch { return null; }
}
function mailOn() { return mailer.ready && !!publicBase(); }
const maskEmail = e => { const [a, d] = String(e).split('@'); return (a.length <= 2 ? a[0] + '*' : a.slice(0, 2) + '*'.repeat(Math.min(6, a.length - 2))) + '@' + d; };
const RESET_MIN = 30;

app.post('/api/forgot', async (req, res) => {
  if (!mailOn()) return res.status(503).json({ erro: 'Este servidor ainda não manda emails. Peça ajuda para quem cuida do servidor.' });
  const login = str(req.body.login, 200).trim().toLowerCase().replace(/^@/, '');
  if (limited('forgot-ip:' + ipOf(req), 6, 15 * 60e3) || limited('forgot:' + login, 3, 3600e3)) return res.status(429).json({ erro: 'Muitos pedidos. Espere um pouco e tente de novo.' });
  // sempre a mesma resposta: ninguém descobre por aqui se um usuário ou email existe
  res.json({ ok: true });
  const list = Object.values(db.users).filter(u => !u.bot && u.email && (login.includes('@') ? u.email === login : u.username === login));
  if (!list.length) return;
  const byEmail = new Map();
  for (const u of list) {
    const token = crypto.randomBytes(32).toString('base64url');
    u.resetHash = sha256(token); u.resetExp = now() + RESET_MIN * 60e3;
    if (!byEmail.has(u.email)) byEmail.set(u.email, []);
    byEmail.get(u.email).push({ u, url: `${publicBase()}/?reset=${token}` });
  }
  save();
  for (const [to, items] of byEmail) {
    const one = items.length === 1;
    const text = items.map(i => `Conta @${i.u.username}: ${i.url}`).join('\n');
    const html = mailer.html('Criar uma senha nova', [
      one ? `Alguém (tomara que você!) pediu para trocar a senha da conta <b>@${escH(items[0].u.username)}</b> no Anarchy.` : `Pediram para trocar a senha das suas contas no Anarchy. Escolha a conta:`,
      ...(one ? [] : items.map(i => `<a href="${escH(i.url)}">@${escH(i.u.username)}</a>`)),
      `O link vale por ${RESET_MIN} minutos e só funciona uma vez.`
    ], one ? { url: items[0].url, label: 'Criar senha nova' } : null);
    mailer.send(to, 'Anarchy: trocar sua senha', `Para criar uma senha nova no Anarchy, abra o link (vale ${RESET_MIN} minutos):\n\n${text}\n\nSe não foi você, ignore este email.`, html)
      .then(() => log(`   Email: link de nova senha enviado para ${maskEmail(to)}.`))
      .catch(e => log(`   Email: não consegui enviar para ${maskEmail(to)} (${e.message}).`));
  }
  function escH(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
});
const userByReset = token => { const h = sha256(str(token, 200)); return Object.values(db.users).find(u => u.resetHash && u.resetHash === h && u.resetExp > now()) || null; };
app.post('/api/reset/check', (req, res) => {
  if (limited('reset-ip:' + ipOf(req), 20, 15 * 60e3)) return res.status(429).json({ erro: 'Muitas tentativas. Espere 15 minutos.' });
  const u = userByReset(req.body.token);
  if (!u) return res.status(400).json({ erro: 'Esse link venceu ou já foi usado. Peça outro em "Esqueci a senha".' });
  res.json({ ok: true, username: u.username, displayName: u.displayName });
});
app.post('/api/reset', (req, res) => {
  if (limited('reset-ip:' + ipOf(req), 20, 15 * 60e3)) return res.status(429).json({ erro: 'Muitas tentativas. Espere 15 minutos.' });
  const u = userByReset(req.body.token);
  if (!u) return res.status(400).json({ erro: 'Esse link venceu ou já foi usado. Peça outro em "Esqueci a senha".' });
  const nova = str(req.body.password, 200);
  if (nova.length < MIN_PW) return res.status(400).json({ erro: `A senha precisa ter pelo menos ${MIN_PW} caracteres.` });
  if (nova.toLowerCase().includes(u.username)) return res.status(400).json({ erro: 'A senha não pode conter o nome de usuário.' });
  u.salt = crypto.randomBytes(16).toString('hex'); u.passHash = hashPw(nova, u.salt);
  delete u.resetHash; delete u.resetExp;
  // senha nova: todos os aparelhos saem (se alguém tinha a conta, perde o acesso)
  for (const [t, id] of Object.entries(db.sessions)) if (id === u.id) delete db.sessions[t];
  (online.get(u.id) || new Set()).forEach(sid => sockets.get(sid)?.disconnect(true));
  hits.delete('login-user:' + u.username);
  const token = newSession(u.id); setSession(req, res, token);
  log(`   Conta @${u.username}: senha trocada pelo link do email.`);
  res.json({ token, username: u.username, displayName: u.displayName });
});

app.post('/api/upload', auth, (req, res) => {
  const m = /^data:image\/(png|jpe?g|gif|webp);base64,(.+)$/.exec(str(req.body.data, 12 * 1024 * 1024));
  if (!m) return res.status(400).json({ erro: 'Envie uma imagem PNG, JPG, GIF ou WEBP.' });
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 8 * 1024 * 1024) return res.status(400).json({ erro: 'A imagem passa de 8 MB.' });
  // o conteúdo precisa ser mesmo uma imagem (assinatura do arquivo), não só ter o nome certo
  const sig = buf.slice(0, 12).toString('latin1');
  const real = sig.startsWith('\x89PNG') ? 'png' : buf[0] === 0xff && buf[1] === 0xd8 ? 'jpeg' : sig.startsWith('GIF8') ? 'gif' : sig.startsWith('RIFF') && sig.slice(8, 12) === 'WEBP' ? 'webp' : null;
  if (!real) return res.status(400).json({ erro: 'O arquivo não é uma imagem válida.' });
  const name = newId() + '.' + (real === 'jpeg' ? 'jpg' : real);
  store.upload(buf, name, 'image/' + real).then(url => res.json({ url })).catch(e => res.status(500).json({ erro: e.message }));
});
// áudios da Central de Áudio: até 1 MB, MP3/WAV/OGG/WEBM/M4A (conferido pelo conteúdo)
const audioHits = new Map();
app.post('/api/upload-audio', auth, (req, res) => {
  if (!store.mediaReady) return res.status(503).json({ erro: 'A Central de Áudio e as figurinhas ainda estão sendo ativadas neste servidor. Tente mais tarde.' });
  const t = now(), hits = (audioHits.get(req.uid) || []).filter(x => t - x < 60e3);
  if (hits.length >= 10) return res.status(429).json({ erro: 'Muitos envios seguidos. Espere um minuto.' });
  audioHits.set(req.uid, [...hits, t]);
  const m = /^data:audio\/[\w.+-]+;base64,(.+)$/.exec(str(req.body.data, 2 * 1024 * 1024));
  if (!m) return res.status(400).json({ erro: 'Envie um áudio MP3, WAV, OGG, WEBM ou M4A.' });
  const buf = Buffer.from(m[1], 'base64');
  if (buf.length > SOUND_BYTES) return res.status(400).json({ erro: 'O áudio passa de 1 MB.' });
  const type = audioKind(buf);
  if (!type) return res.status(400).json({ erro: 'Formato de áudio não reconhecido. Use MP3, WAV, OGG, WEBM ou M4A.' });
  store.upload(buf, newId() + '.' + AUDIO_EXT[type], type).then(url => res.json({ url })).catch(e => res.status(500).json({ erro: e.message }));
});
// GIFs: a chave do GIPHY/Tenor fica no Supabase (função anarchy-db); aqui só repassa, com cache e limite
const gifCache = new Map(), gifHits = new Map();
app.get('/api/gifs', auth, async (req, res) => {
  const q = str(req.query.q, 60).trim(), pos = Math.max(0, Math.min(500, parseInt(req.query.pos, 10) || 0));
  const key = q.toLowerCase() + '|' + pos, hit = gifCache.get(key);
  if (hit && now() - hit.t < 10 * 60e3) return res.json(hit.data);
  const t = now(), hits = (gifHits.get(req.uid) || []).filter(x => t - x < 60e3);
  if (hits.length >= 40) return res.status(429).json({ erro: 'Muitas buscas seguidas. Espere um pouquinho.' });
  gifHits.set(req.uid, [...hits, t]);
  try {
    const data = await store.gifs({ q, pos, limit: 24 });
    if (data.configured) { gifCache.set(key, { t, data }); if (gifCache.size > 300) gifCache.delete(gifCache.keys().next().value); }
    res.json(data);
  } catch (e) { res.status(502).json({ erro: 'Não consegui buscar GIFs agora (' + e.message + ').' }); }
});
app.get('/api/config', (req, res) => res.json({ iceServers: cfg.iceServers, build: BUILD }));
// áudio do DJ: o servidor busca no site de origem e repassa (aceita "Range", para o app pular para o ponto certo)
/* Áudio em pedaços (HLS: uma lista .m3u8 e vários arquivinhos), como o SoundCloud entrega quase tudo hoje.
   O <audio> do app não toca isso (a música "tocava" sem som): o servidor baixa os pedaços, junta num arquivo só
   e entrega como um arquivo comum, aceitando "Range" (quem entra no meio da música pula para o ponto certo).
   Guarda as últimas 6 músicas na memória. */
const hlsCache = new Map(); // endereço da lista -> Promise<Buffer>
function hlsBuffer(src) {
  if (hlsCache.has(src.url)) return hlsCache.get(src.url);
  const p = (async () => {
    const h = { ...src.headers, 'Accept-Encoding': 'identity' }; delete h['Accept-Language'];
    const get = async (u, text) => {
      const r = await fetch(u, { headers: h, redirect: 'follow', signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error('HLS ' + r.status);
      return text ? [await r.text(), r.url] : Buffer.from(await r.arrayBuffer());
    };
    let [txt, base] = await get(src.url, true);
    if (/#EXT-X-STREAM-INF/.test(txt)) { // lista de qualidades: pega a primeira
      const v = txt.split(/\r?\n/).map(l => l.trim()).find(l => l && !l.startsWith('#'));
      if (!v) throw new Error('HLS sem áudio'); [txt, base] = await get(new URL(v, base).href, true);
    }
    if (/#EXT-X-KEY:METHOD=(?!NONE)/.test(txt)) throw new Error('áudio protegido (HLS criptografado)');
    const lines = txt.split(/\r?\n/).map(l => l.trim());
    const init = lines.map(l => /^#EXT-X-MAP:.*URI="([^"]+)"/.exec(l)).find(Boolean);
    const segs = lines.filter(l => l && !l.startsWith('#')).map(l => new URL(l, base).href);
    if (!segs.length || segs.length > 3000) throw new Error('lista HLS inválida');
    const parts = []; let size = 0;
    if (init) parts.push(await get(new URL(init[1], base).href));
    for (let i = 0; i < segs.length; i += 6) { // 6 pedaços de cada vez
      for (const b of await Promise.all(segs.slice(i, i + 6).map(u => get(u)))) { parts.push(b); size += b.length; }
      if (size > 80e6) throw new Error('áudio grande demais');
    }
    return Buffer.concat(parts);
  })();
  hlsCache.set(src.url, p);
  p.catch(e => { hlsCache.delete(src.url); log(`   DJ: não consegui juntar o áudio em pedaços (${e.message}).`); });
  while (hlsCache.size > 6) hlsCache.delete(hlsCache.keys().next().value);
  return p;
}
// já começa a juntar assim que a música é encontrada (quando o app pedir, está pronto ou quase)
const hlsWarm = src => { if (src && src.hls) hlsBuffer(src).catch(() => {}); };
function sendRange(req, res, buf, type) {
  res.setHeader('Content-Type', type); res.setHeader('Accept-Ranges', 'bytes'); res.setHeader('Cache-Control', 'no-store');
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (!m || (!m[1] && !m[2])) { res.setHeader('Content-Length', buf.length); return res.end(buf); }
  let a = m[1] ? +m[1] : Math.max(0, buf.length - +m[2]), b = m[1] && m[2] ? Math.min(+m[2], buf.length - 1) : buf.length - 1;
  if (a >= buf.length || a > b) { res.setHeader('Content-Range', `bytes */${buf.length}`); return res.status(416).end(); }
  res.status(206); res.setHeader('Content-Range', `bytes ${a}-${b}/${buf.length}`); res.setHeader('Content-Length', b - a + 1);
  res.end(buf.subarray(a, b + 1));
}
app.get('/api/music/:id', auth, async (req, res) => {
  const t = tracks.get(req.params.id);
  if (!t || !t.src || !canAccess(req.uid, t.roomId)) return res.status(404).end();
  if (t.src.hls) {
    try { return sendRange(req, res, await hlsBuffer(t.src), t.src.mime); }
    catch { return res.headersSent ? res.destroy() : res.status(502).end(); }
  }
  const ac = new AbortController(); res.on('close', () => ac.abort());
  try {
    const headers = { ...t.src.headers, 'Accept-Encoding': 'identity' };
    delete headers['Accept-Language'];
    if (req.headers.range) headers.Range = req.headers.range;
    const up = await fetch(t.src.url, { headers, redirect: 'follow', signal: ac.signal });
    if (!up.ok && up.status !== 206) return res.status(502).end();
    res.status(up.status);
    const ct = up.headers.get('content-type') || '';
    res.setHeader('Content-Type', /^audio\//.test(ct) ? ct : t.src.mime);
    ['content-length', 'content-range', 'accept-ranges'].forEach(h => { const v = up.headers.get(h); if (v) res.setHeader(h, v); });
    res.setHeader('Cache-Control', 'no-store');
    const { Readable } = require('stream');
    Readable.fromWeb(up.body).on('error', () => res.destroy()).pipe(res);
  } catch (e) { if (!res.headersSent) res.status(502).end(); else res.destroy(); }
});

/* ---------- RPG de Mesa (atividade opcional dos grupos e conversas; ver rpg.js) ---------- */
const rpg = require('./rpg').createRpg({
  db, save, newId, now, str, log, toUser, toUsers, can, pushGroup, limited, users: db.users,
  isUpload: u => store.isUpload(u)
});
/* ---------- diversão: enquetes, bombas, conquistas, caixa diária, atividade, eventos, roleta, retrospectiva (ver diversao.js) ---------- */
const fun = require('./diversao').createDiversao({
  db, save, newId, now, str, log, toUser, toUsers, canAccess, can, pushGroup, pushUser, selfUser, limited, voice, rollAvfx, AVFX, REFUND
});

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
  rpg.bind(socket, uid, on, ok, fail);
  fun.bind(socket, uid, on, ok, fail);
  on('ach:list', (_, cb) => ok(cb, { list: fun.ACH }));

  on('init', (_, cb) => {
    const users = {};
    relatedUsers(uid).forEach(id => { if (db.users[id]) users[id] = publicUser(db.users[id]); });
    const rooms = {};
    groupsOf(uid).forEach(g => g.channels.filter(c => c.type === 'voice').forEach(c => { if (voice.has(c.id)) rooms[c.id] = voicePeers(c.id); }));
    dmsOf(uid).forEach(d => { if (voice.has(d.id)) rooms[d.id] = voicePeers(d.id); });
    const djRooms = {};
    groupsOf(uid).forEach(g => g.channels.forEach(c => { const st = music.get(c.id); if (st) djRooms[c.id] = musicView(st); }));
    ok(cb, {
      me: selfUser(me()), users, friends: friendState(uid),
      groups: Object.fromEntries(groupsOf(uid).map(g => [g.id, g])),
      dms: Object.fromEntries(dmsOf(uid).map(d => [d.id, { ...d, last: (db.messages[d.id] || []).slice(-1)[0]?.ts || d.createdAt }])),
      voice: rooms, iceServers: cfg.iceServers, socketId: socket.id, build: BUILD, started: STARTED, music: djRooms, serverNow: now()
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
  /* inventário: placas de nome. Só administradores dão e tiram; cada um equipa as suas. */
  on('inv:give', (d, cb) => {
    const m = me();
    if (!isAdmin(m)) return fail(cb, 'Só o dono do Anarchy pode dar itens.');
    const t = db.users[str(d.uid, 40)];
    if (!t || t.bot) return fail(cb, 'Pessoa não encontrada.');
    const item = str(d.item, 30);
    if (!PLATES.includes(item)) return fail(cb, 'Item inválido.');
    t.items = t.items || [];
    if (t.items.some(x => x.item === item)) return fail(cb, `${t.displayName} já tem esse item.`);
    const e = { id: newId(), item, from: uid, at: now(), seen: false, msg: str(d.msg, 140).trim() };
    t.items.push(e);
    m.given = m.given || []; m.given.push({ item, to: t.id, at: e.at, msg: e.msg });
    if (m.given.length > 500) m.given.splice(0, m.given.length - 500);
    save();
    toUser(t.id, 'inv:gift', { entry: e, from: publicUser(m) });
    toUser(t.id, 'me:update', selfUser(t));
    if (t.id !== uid) toUser(uid, 'me:update', selfUser(m));
    log(`   Inventário: @${m.username} deu "${item}" para @${t.username}.`);
    ok(cb, {});
  });
  on('inv:revoke', (d, cb) => {
    const m = me();
    if (!isAdmin(m)) return fail(cb, 'Só o dono do Anarchy pode tirar itens.');
    const t = db.users[str(d.uid, 40)], item = str(d.item, 30);
    if (!t || !(t.items || []).some(x => x.item === item)) return fail(cb, 'Essa pessoa não tem esse item.');
    t.items = t.items.filter(x => x.item !== item);
    t.lost = t.lost || []; t.lost.push({ item, by: uid, at: now() }); if (t.lost.length > 200) t.lost.splice(0, t.lost.length - 200);
    m.given = m.given || []; m.given.push({ item, to: t.id, at: now(), revoked: true });
    if (t.plate === item) t.plate = null;
    save(); pushUser(t.id); if (t.id !== uid) toUser(uid, 'me:update', selfUser(m));
    ok(cb, {});
  });
  on('inv:equip', (d, cb) => {
    const m = me(), item = d.item ? str(d.item, 30) : null;
    if (item && !(m.items || []).some(x => x.item === item)) return fail(cb, 'Você não tem esse item.');
    m.plate = item; save(); pushUser(uid); ok(cb, {});
  });
  on('inv:seen', (_, cb) => { const m = me(); let n = 0; (m.items || []).forEach(x => { if (x.seen === false) { x.seen = true; n++; } }); if (n) save(); ok(cb, {}); });
  /* caixa: 300 pontos, sorteio no servidor. Repetida devolve pontos conforme a raridade. */
  on('box:open', (_, cb) => {
    const u = me();
    if (limited('box:' + uid, 30, 60e3)) return fail(cb, 'Calma! Muitas caixas seguidas.');
    if ((u.points || 0) < BOX_COST) return fail(cb, `Faltam ${BOX_COST - (u.points || 0)} AnarchyPoints para abrir uma caixa.`);
    u.points -= BOX_COST;
    const item = rollAvfx(), tier = AVFX[item];
    u.items = u.items || [];
    const dup = u.items.some(x => x.item === 'av:' + item);
    const refund = dup ? REFUND[tier] : 0;
    if (dup) u.points += refund;
    else u.items.push({ id: newId(), item: 'av:' + item, from: 'caixa', at: now(), seen: true });
    u.boxes = (u.boxes || 0) + 1;
    u.boxLog = [...(u.boxLog || []), { item, at: now(), dup }].slice(-60);
    if (tier === 'lendario' || tier === 'mitico') { u.stats = u.stats || {}; u.stats.luck = (u.stats.luck || 0) + 1; }
    fun.check(u); // conquistas de caixa e de sorte
    save(); toUser(uid, 'me:update', selfUser(u));
    if (tier === 'lendario' || tier === 'mitico') log(`   Caixa: @${u.username} tirou ${item} (${tier})!`);
    ok(cb, { item, tier, dup, refund, points: u.points });
  });
  on('avfx:equip', (d, cb) => {
    const m = me(), item = d.item ? str(d.item, 40) : null;
    if (item && !(m.items || []).some(x => x.item === 'av:' + item)) return fail(cb, 'Você não tem esse efeito.');
    m.avfx = item; save(); pushUser(uid); ok(cb, {});
  });
  // o dono pode dar pontos (eventos, prêmios)
  on('points:give', (d, cb) => {
    const m = me(); if (!isAdmin(m)) return fail(cb, 'Só o dono do Anarchy.');
    const t = db.users[str(d.uid, 40)], n = Math.round(+d.amount || 0);
    if (!t || t.bot) return fail(cb, 'Pessoa não encontrada.');
    if (!n || Math.abs(n) > 1e6) return fail(cb, 'Quantidade inválida.');
    const msg = str(d.msg, 140).trim(), at = now();
    t.points = Math.max(0, (t.points || 0) + n); if (n > 0) t.pointsTotal = (t.pointsTotal || 0) + n;
    t.ptsLog = [...(t.ptsLog || []), { amount: n, from: uid, at, msg }].slice(-60);
    m.given = [...(m.given || []), { points: n, to: t.id, at, msg }].slice(-500);
    save();
    if (n > 0) toUser(t.id, 'points:gift', { amount: n, points: t.points, from: publicUser(m), msg });
    toUser(t.id, 'me:update', selfUser(t)); if (t.id !== uid) toUser(uid, 'me:update', selfUser(m));
    log(`   Pontos: @${m.username} deu ${n} para @${t.username}.`);
    ok(cb, { points: t.points });
  });
  // para o administrador escolher a quem dar: todas as contas (menos bots)
  on('inv:people', (_, cb) => {
    if (!isAdmin(me())) return fail(cb, 'Só o dono do Anarchy.');
    ok(cb, { people: Object.values(db.users).filter(u => !u.bot).map(u => ({ ...publicUser(u), items: (u.items || []).map(x => x.item).filter(i => PLATES.includes(i)), points: u.points || 0 })) });
  });
  // email da conta: manda um código de 6 dígitos e só grava depois que a pessoa confirma
  on('email:start', async (d, cb) => {
    if (!mailOn()) return fail(cb, 'Este servidor ainda não manda emails.');
    const email = str(d.email, 254).trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return fail(cb, 'Esse email não parece certo. Confira e tente de novo.');
    if (limited('email-start:' + uid, 5, 3600e3) || limited('email-to:' + email, 3, 3600e3)) return fail(cb, 'Muitos códigos pedidos. Espere um pouco.');
    const code = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
    emailCodes.set(uid, { email, hash: sha256(uid + ':' + code), exp: now() + 15 * 60e3, tries: 0 });
    try {
      await mailer.send(email, `Anarchy: seu código é ${code}`, `Seu código para confirmar o email no Anarchy: ${code}\n\nEle vale 15 minutos. Se não foi você, ignore este email.`,
        mailer.html('Confirme seu email', [`Use este código no Anarchy para ligar este email à conta <b>@${me().username}</b>:`, `<span style="display:inline-block;font-size:30px;font-weight:bold;letter-spacing:8px;background:#f2f3f5;padding:10px 18px;border-radius:10px">${code}</span>`, 'Ele vale 15 minutos. Com o email confirmado, você consegue criar uma senha nova se esquecer a sua.']));
    } catch (e) { emailCodes.delete(uid); log(`   Email: não consegui enviar o código para ${maskEmail(email)} (${e.message}).`); return fail(cb, 'Não consegui enviar o email agora. Tente de novo daqui a pouco.'); }
    ok(cb, { masked: maskEmail(email) });
  });
  on('email:confirm', (d, cb) => {
    const p = emailCodes.get(uid);
    if (!p || p.exp < now()) { emailCodes.delete(uid); return fail(cb, 'O código venceu. Peça outro.'); }
    if (++p.tries > 5) { emailCodes.delete(uid); return fail(cb, 'Muitas tentativas erradas. Peça outro código.'); }
    if (sha256(uid + ':' + str(d.code, 12).replace(/\D/g, '')) !== p.hash) return fail(cb, 'Código errado. Confira no email e tente de novo.');
    emailCodes.delete(uid);
    const u = me(); u.email = p.email; u.emailAt = now(); save();
    log(`   Conta @${u.username}: email de recuperação confirmado (${maskEmail(p.email)}).`);
    ok(cb, { me: selfUser(u) });
  });
  // "agora não": pergunta de novo em alguns dias
  on('email:later', (_, cb) => { me().emailAsked = now(); save(); ok(cb, {}); });
  on('email:remove', (d, cb) => {
    const u = me();
    if (limited('pw:' + uid, 6, 15 * 60e3)) return fail(cb, 'Muitas tentativas. Espere 15 minutos.');
    if (!pwOk(u, str(d.password, 200))) return fail(cb, 'Senha errada.');
    delete u.email; delete u.emailAt; delete u.resetHash; delete u.resetExp; u.emailAsked = now(); save();
    ok(cb, { me: selfUser(u) });
  });
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
    if (['todos', 'grupos', 'amigos'].includes(d.dms)) p.dms = d.dms;
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
    if (limited('freq:' + uid, 20, 10 * 60e3)) return fail(cb, 'Muitos pedidos de amizade seguidos. Espere alguns minutos.');
    const name = str(d.username, 40).trim().toLowerCase().replace(/^@/, '');
    const target = Object.values(db.users).find(u => u.username === name);
    if (!target || target.bot) return fail(cb, 'Não achei ninguém com esse nome de usuário.');
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
    if (limited('dm:' + uid, 30, 10 * 60e3)) return fail(cb, 'Muitas conversas novas seguidas. Espere alguns minutos.');
    const other = db.users[d.userId];
    if (!other || other.id === uid || other.bot) return fail(cb, 'Usuário inválido.');
    if (blockedBetween(uid, other.id)) return fail(cb, 'Você não pode conversar com essa pessoa.');
    let dm = Object.values(db.dms).find(x => x.members.includes(uid) && x.members.includes(other.id));
    if (!dm) {
      // privacidade de quem recebe: todos / amigos e grupos em comum (padrão) / só amigos
      const pv = (other.privacy && other.privacy.dms) || 'grupos', friend = friendsOf(other.id).includes(uid);
      const shared = groupsOf(uid).some(g => g.members.includes(other.id));
      if (pv === 'amigos' && !friend) return fail(cb, 'Essa pessoa só recebe mensagens diretas de amigos.');
      if (pv === 'grupos' && !friend && !shared) return fail(cb, 'Essa pessoa só recebe mensagens diretas de amigos ou de quem está num grupo com ela.');
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
      id: newId(), name, icon: cleanIcon(d.icon, store.isUpload), color: /^#[0-9a-f]{6}$/i.test(d.color) ? d.color : '#6c7cff',
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
    if ('icon' in d) g.icon = cleanIcon(d.icon, store.isUpload);
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
    if (limited('join:' + uid, 10, 10 * 60e3)) return fail(cb, 'Muitas tentativas de convite. Espere alguns minutos.');
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
    if (g.djId === m) { g.djId = null; g.channels.forEach(c => stopMusic(c.id)); }
    // só sobrou o bot (ou ninguém): o grupo acaba
    if (!g.members.some(x => !isBot(x))) { g.channels.forEach(c => { delete db.messages[c.id]; stopMusic(c.id); }); delete db.groups[g.id]; }
    else { if (g.ownerId === m) g.ownerId = g.members.find(x => !isBot(x)); pushGroup(g); }
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
    g.channels.forEach(c => { delete db.messages[c.id]; stopMusic(c.id); const r = voice.get(c.id); if (r) for (const sid of r.keys()) { const sk = sockets.get(sid); sk && leaveVoice(sk); } });
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
    ok(cb, { messages: list.slice(Math.max(0, end - 60), end).map(fun.pubMsg), more: end > 60 });
  });
  on('message:send', (d, cb) => {
    if (limited('msg:' + uid, 12, 10e3)) return fail(cb, 'Calma! Você está mandando mensagens rápido demais.');
    const info = canAccess(uid, d.cid); if (!info) return fail(cb, 'Sem acesso.');
    if (info.kind === 'dm' && info.members.some(m => m !== uid && blockedBetween(uid, m))) return fail(cb, 'Você não pode mandar mensagens para essa pessoa.');
    // comando do DJ (/music, /pular...): o bot responde e o comando não vira mensagem
    if (info.kind === 'group' && typeof d.content === 'string' && d.content.trim().startsWith('/') && !d.image && djCommand(info.group, d.cid, uid, str(d.content, 400))) return ok(cb, { command: true });
    const content = str(d.content, 4000).trim();
    const image = store.isUpload(d.image) ? d.image : null;
    // figurinha: precisa existir num grupo seu (guarda uma cópia do endereço, para a mensagem não quebrar se apagarem)
    let sticker = null;
    if (d.sticker && typeof d.sticker === 'object') {
      const sg = groupsOf(uid).find(g => g.id === d.sticker.gid), st = sg && sg.stickers.find(s => s.id === d.sticker.id);
      if (!st) return fail(cb, 'Essa figurinha não existe mais.');
      sticker = { id: st.id, gid: sg.id, url: st.url, name: st.name };
    }
    // GIF: só endereços do GIPHY ou do Tenor
    let gif = null;
    if (d.gif && typeof d.gif === 'object') {
      if (!GIF_RE.test(str(d.gif.url, 500))) return fail(cb, 'GIF inválido.');
      gif = { url: d.gif.url, w: Math.min(2000, d.gif.w | 0), h: Math.min(2000, d.gif.h | 0), title: str(d.gif.title, 100) };
    }
    if (!content && !image && !sticker && !gif) return fail(cb, 'Mensagem vazia.');
    // modo lento: quem gerencia canais ou mensagens não espera
    if (info.kind === 'group' && info.channel.slowmode && !can(info.group, uid, 'manageChannels') && !can(info.group, uid, 'manageMessages')) {
      const k = d.cid + ':' + uid, last = slowLast.get(k) || 0, wait = info.channel.slowmode * 1000 - (now() - last);
      if (wait > 0) return fail(cb, `Modo lento: espere ${Math.ceil(wait / 1000)}s para mandar outra mensagem.`);
      slowLast.set(k, now());
    }
    const msg = { id: newId(), cid: d.cid, authorId: uid, content: sticker || gif ? '' : content, image: sticker || gif ? null : image, ts: now(), edited: null, reactions: {}, replyTo: str(d.replyTo, 20) || null };
    if (sticker) msg.sticker = sticker; if (gif) msg.gif = gif;
    // menções: quem foi citado com @usuario (só membros da conversa) e @todos (precisa da permissão)
    if (msg.content) {
      const names = new Set([...msg.content.matchAll(/@([a-z0-9_.]{3,20})/gi)].map(x => x[1].toLowerCase()));
      const ids = info.members.filter(m => m !== uid && db.users[m] && names.has(db.users[m].username));
      if (ids.length) msg.mentions = ids.slice(0, 50);
      if (info.kind === 'group' && /(^|\s)@(todos|everyone)\b/i.test(msg.content) && can(info.group, uid, 'mentionEveryone')) msg.everyone = true;
    }
    // nome original do arquivo enviado (para baixar com o mesmo nome)
    if (msg.image && d.imageName) { const n = str(d.imageName, 120).replace(/[^\w.\- ()À-ÿ]/g, '').trim(); if (n) msg.imageName = n; }
    const list = db.messages[d.cid] || (db.messages[d.cid] = []);
    list.push(msg); if (list.length > 3000) list.splice(0, list.length - 3000);
    fun.track(uid, 'msgs');
    save(); toUsers(info.members, 'message:new', msg);
    if (info.kind === 'dm') toUsers(info.members, 'dm:update', { ...info.dm, last: msg.ts });
    ok(cb, { message: msg });
  });
  const findMsg = (cid, id) => (db.messages[cid] || []).find(m => m.id === id);
  on('message:edit', (d, cb) => {
    const info = canAccess(uid, d.cid); const m = info && findMsg(d.cid, d.id);
    if (!m || m.authorId !== uid) return fail(cb, 'Sem permissão.');
    if (m.bomb || m.poll) return fail(cb, 'Enquetes e mensagens-bomba não podem ser editadas.');
    const c = str(d.content, 4000).trim(); if (!c && !m.image) return fail(cb, 'Mensagem vazia.');
    m.content = c; m.edited = now(); save(); toUsers(info.members, 'message:update', m); ok(cb);
  });
  on('message:delete', (d, cb) => {
    const info = canAccess(uid, d.cid); const m = info && findMsg(d.cid, d.id);
    if (!m || (m.authorId !== uid && !(info.kind === 'group' && can(info.group, uid, 'manageMessages')))) return fail(cb, 'Sem permissão.');
    db.messages[d.cid] = db.messages[d.cid].filter(x => x !== m); save();
    toUsers(info.members, 'message:delete', { cid: d.cid, id: d.id }); ok(cb);
  });
  // fixar: no grupo precisa de "Gerenciar mensagens"; na conversa direta, qualquer um dos dois
  on('message:pin', (d, cb) => {
    const info = canAccess(uid, d.cid); const m = info && findMsg(d.cid, d.id);
    if (!m || m.system) return fail(cb, 'Mensagem não encontrada.');
    if (info.kind === 'group' && !can(info.group, uid, 'manageMessages')) return fail(cb, 'Você não pode fixar mensagens aqui.');
    if (d.pin) {
      if ((db.messages[d.cid] || []).filter(x => x.pinned).length >= 50) return fail(cb, 'Limite de 50 mensagens fixadas por canal.');
      m.pinned = { by: uid, at: now() };
    } else delete m.pinned;
    save(); toUsers(info.members, 'message:update', fun.pubMsg(m)); ok(cb);
  });
  on('messages:pins', (d, cb) => {
    if (!canAccess(uid, d.cid)) return fail(cb, 'Sem acesso.');
    ok(cb, { messages: (db.messages[d.cid] || []).filter(m => m.pinned).sort((a, b) => b.pinned.at - a.pinned.at).map(fun.pubMsg) });
  });
  on('message:react', (d, cb) => {
    const info = canAccess(uid, d.cid); const m = info && findMsg(d.cid, d.id);
    const emoji = str(d.emoji, 16); if (!m || !emoji) return fail(cb, 'Inválido.');
    const arr = m.reactions[emoji] || (m.reactions[emoji] = []);
    const i = arr.indexOf(uid); if (i >= 0) arr.splice(i, 1); else { arr.push(uid); fun.track(uid, 'reacts'); }
    if (!arr.length) delete m.reactions[emoji];
    save(); toUsers(info.members, 'message:update', fun.pubMsg(m)); ok(cb);
  });
  on('typing', d => { const info = canAccess(uid, d.cid); if (info) toUsers(info.members.filter(m => m !== uid), 'typing', { cid: d.cid, uid }); });

  /* voz, vídeo e tela */
  /* Central de Áudio: sons do grupo, tocados para todo mundo que está na mesma call */
  const isAudioUrl = u => store.isUpload(u) && /\.(mp3|wav|ogg|webm|m4a)$/i.test(u);
  const cleanEmoji = e => str(e, 16).trim() || '🔊';
  on('sound:add', (d, cb) => {
    if (!store.mediaReady) return fail(cb, 'A Central de Áudio e as figurinhas ainda estão sendo ativadas neste servidor. Tente mais tarde.');
    const g = withPerm(d.gid, 'manageMedia'); if (!g) return fail(cb, 'Você não pode gerenciar a Central de Áudio deste grupo.');
    if (g.sounds.length >= SOUND_MAX) return fail(cb, `Limite de ${SOUND_MAX} sons por grupo. Apague algum para adicionar outro.`);
    const name = str(d.name, 32).trim(); if (!name) return fail(cb, 'Dê um nome ao som.');
    if (!isAudioUrl(d.url)) return fail(cb, 'Envie o arquivo de áudio primeiro.');
    const duration = Math.round(+d.duration || 0); if (!(duration > 0 && duration <= SOUND_MS)) return fail(cb, `O som precisa ter até ${SOUND_MS / 1000} segundos.`);
    const s = { id: newId(), name, emoji: cleanEmoji(d.emoji), category: str(d.category, 24).trim() || 'Geral', url: d.url, duration, volume: clampN(d.volume, 10, 100, 100), createdBy: uid, createdAt: now() };
    g.sounds.push(s); save(); pushGroup(g); ok(cb, { sound: s });
  });
  on('sound:edit', (d, cb) => {
    const g = withPerm(d.gid, 'manageMedia'); const s = g && g.sounds.find(x => x.id === d.id); if (!s) return fail(cb, 'Som não encontrado.');
    if ('name' in d && str(d.name, 32).trim()) s.name = str(d.name, 32).trim();
    if ('emoji' in d) s.emoji = cleanEmoji(d.emoji);
    if ('category' in d) s.category = str(d.category, 24).trim() || 'Geral';
    if ('volume' in d) s.volume = clampN(d.volume, 10, 100, s.volume);
    save(); pushGroup(g); ok(cb);
  });
  on('sound:delete', (d, cb) => {
    const g = withPerm(d.gid, 'manageMedia'); if (!g || !g.sounds.some(x => x.id === d.id)) return fail(cb, 'Som não encontrado.');
    g.sounds = g.sounds.filter(x => x.id !== d.id); save(); pushGroup(g); ok(cb);
  });
  // anti-spam: 1 som a cada 2,5 s por pessoa e no máximo 3 tocando ao mesmo tempo na sala
  const soundLast = sbLast;
  on('sound:play', (d, cb) => {
    const roomId = socket.data.voice; if (!roomId) return fail(cb, 'Entre numa call para tocar sons.');
    const info = channelInfo(roomId); if (!info) return fail(cb, 'Sala inválida.');
    const pool = info.kind === 'group' ? [info.group] : groupsOf(uid); // na call direta vale som de qualquer grupo seu
    let snd = null; for (const g of pool) { snd = g.sounds.find(x => x.id === d.id); if (snd) break; }
    if (!snd) return fail(cb, 'Som não encontrado.');
    const t = now();
    if (t - (soundLast.get(uid) || 0) < 2500) return fail(cb, 'Calma! Espere um pouquinho para tocar outro som.');
    const playing = (sbRoom.get(roomId) || []).filter(x => x > t);
    if (playing.length >= 3) return fail(cb, 'Já tem sons demais tocando. Espere acabar.');
    soundLast.set(uid, t); sbRoom.set(roomId, [...playing, t + snd.duration]);
    const ev = { roomId, uid, id: snd.id, url: snd.url, name: snd.name, emoji: snd.emoji, volume: snd.volume, duration: snd.duration };
    for (const sid of (voice.get(roomId) || new Map()).keys()) sockets.get(sid)?.emit('sound:played', ev);
    ok(cb);
  });
  on('sound:stop', (_, cb) => {
    const roomId = socket.data.voice; if (!roomId) return fail(cb, 'Fora da call.');
    for (const sid of (voice.get(roomId) || new Map()).keys()) sockets.get(sid)?.emit('sound:stopped', { roomId, uid });
    ok(cb);
  });
  /* figurinhas do grupo */
  on('sticker:add', (d, cb) => {
    if (!store.mediaReady) return fail(cb, 'A Central de Áudio e as figurinhas ainda estão sendo ativadas neste servidor. Tente mais tarde.');
    const g = withPerm(d.gid, 'manageMedia'); if (!g) return fail(cb, 'Você não pode gerenciar as figurinhas deste grupo.');
    if (g.stickers.length >= STICKER_MAX) return fail(cb, `Limite de ${STICKER_MAX} figurinhas por grupo.`);
    if (!store.isUpload(d.url) || !/\.(png|webp|gif)$/i.test(d.url)) return fail(cb, 'Envie uma imagem PNG, WEBP ou GIF.');
    const st = { id: newId(), name: str(d.name, 32).trim() || 'figurinha', pack: str(d.pack, 24).trim() || 'Geral', url: d.url, createdBy: uid, createdAt: now() };
    g.stickers.push(st); save(); pushGroup(g); ok(cb, { sticker: st });
  });
  on('sticker:edit', (d, cb) => {
    const g = withPerm(d.gid, 'manageMedia'); const st = g && g.stickers.find(x => x.id === d.id); if (!st) return fail(cb, 'Figurinha não encontrada.');
    if ('name' in d && str(d.name, 32).trim()) st.name = str(d.name, 32).trim();
    if ('pack' in d) st.pack = str(d.pack, 24).trim() || 'Geral';
    save(); pushGroup(g); ok(cb);
  });
  on('sticker:delete', (d, cb) => {
    const g = withPerm(d.gid, 'manageMedia'); if (!g || !g.stickers.some(x => x.id === d.id)) return fail(cb, 'Figurinha não encontrada.');
    g.stickers = g.stickers.filter(x => x.id !== d.id); save(); pushGroup(g); ok(cb);
  });
  /* favoritos e recentes (figurinhas e GIFs), guardados na conta: aparecem em qualquer aparelho */
  on('favs:update', (d, cb) => {
    const u = me(); const f = { stickers: [], gifs: [], recentStickers: [], recentGifs: [], ...(u.favs || {}) };
    const ids = (a, n) => (Array.isArray(a) ? a : []).filter(x => typeof x === 'string' && x.length <= 20).slice(0, n);
    const gifs = (a, n) => (Array.isArray(a) ? a : []).filter(x => x && GIF_RE.test(str(x.url, 500))).slice(0, n)
      .map(x => ({ url: x.url, preview: GIF_RE.test(str(x.preview, 500)) ? x.preview : x.url, w: Math.min(2000, x.w | 0), h: Math.min(2000, x.h | 0), title: str(x.title, 100) }));
    if ('stickers' in d) f.stickers = ids(d.stickers, 60);
    if ('recentStickers' in d) f.recentStickers = ids(d.recentStickers, 24);
    if ('gifs' in d) f.gifs = gifs(d.gifs, 60);
    if ('recentGifs' in d) f.recentGifs = gifs(d.recentGifs, 24);
    u.favs = f; save(); toUser(uid, 'me:update', selfUser(u)); ok(cb);
  });

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

  // o app mede quanto o servidor demora para responder (aparece no registro da call)
  on('rtt', (_, cb) => ok(cb));

  /* DJ (bot de música do grupo) */
  on('bot:add', (d, cb) => {
    const g = withPerm(d.gid, 'manageServer'); if (!g) return fail(cb, 'Só quem gerencia o grupo pode adicionar o DJ.');
    if (djOf(g)) return fail(cb, 'Este grupo já tem um DJ.');
    const id = newId(), salt = crypto.randomBytes(16).toString('hex');
    let username; do { username = 'dj.' + crypto.randomBytes(4).toString('hex').slice(0, 6); } while (Object.values(db.users).some(u => u.username === username));
    // ninguém entra nesta conta: a senha é aleatória e o login de bots é recusado
    db.users[id] = { id, username, displayName: 'DJ', salt, passHash: crypto.randomBytes(64).toString('hex'), color: '#8b5cf6', banner: null, avatar: null,
      bio: 'Toco música na call. Digite /ajuda para ver os comandos.', status: 'online', customStatus: 'Digite /music', createdAt: now(), bot: true, botGid: g.id };
    g.djId = id; g.members.push(id); systemJoin(g, id); save(); pushGroup(g);
    ok(cb, { id });
  });
  on('bot:update', (d, cb) => {
    const g = withPerm(d.gid, 'manageServer'); const id = djOf(g); if (!id) return fail(cb, 'Sem permissão.');
    const u = db.users[id];
    if ('displayName' in d && str(d.displayName, 32).trim()) u.displayName = str(d.displayName, 32).trim();
    if ('avatar' in d) u.avatar = d.avatar === null || store.isUpload(d.avatar) ? d.avatar : u.avatar;
    if ('color' in d && HEX.test(d.color)) u.color = d.color;
    if ('bio' in d) u.bio = str(d.bio, 190).trim();
    if ('customStatus' in d) u.customStatus = str(d.customStatus, 60).trim();
    save(); pushUser(id); pushGroup(g); ok(cb);
  });
  on('bot:remove', (d, cb) => {
    const g = withPerm(d.gid, 'manageServer'); const id = djOf(g); if (!id) return fail(cb, 'Sem permissão.');
    g.channels.forEach(c => stopMusic(c.id));
    removeMember(g, id); ok(cb);
  });
  // botões do cartão "Tocando agora": precisa estar na sala
  on('music:ctl', (d, cb) => {
    const st = music.get(d.roomId); const g = st && db.groups[st.gid];
    if (!g || roomOfUser(g, uid) !== d.roomId) return fail(cb, 'Entre na sala para controlar o DJ.');
    if (!['pular', 'pausar', 'continuar', 'parar', 'repetir', 'volume', 'tirar', 'embaralhar'].includes(d.action)) return fail(cb, 'Ação inválida.');
    if (limited('djctl:' + uid, 20, 30e3)) return fail(cb, 'Calma! Muitos cliques seguidos.');
    const reply = djAction(g, uid, d.roomId, d.action, d.value);
    if (reply && !['volume'].includes(d.action)) botSay(g, st.cid, reply);
    ok(cb);
  });
  // link direto sem duração conhecida: o app de quem está na sala avisa quanto o áudio dura
  on('music:dur', d => {
    const st = music.get(d.roomId); if (!st || !st.cur || st.cur.id !== d.id || st.cur.dur) return;
    if (!canAccess(uid, d.roomId)) return;
    const s = +d.dur; if (!(s > 0 && s < 6 * 3600)) return;
    st.cur.dur = Math.round(s); scheduleEnd(st); pushMusic(d.roomId);
  });

  socket.on('disconnect', reason => {
    if (socket.data.voice) console.log(`[call] ${me()?.username || uid} saiu da call sem querer: ${reason}`);
    leaveVoice(socket);
    sockets.delete(socket.id);
    const set = online.get(uid); if (set) { set.delete(socket.id); if (!set.size) { online.delete(uid); pushUser(uid); } }
  });
}

function makeIo(server) {
  // pingTimeout maior: uma travada de alguns segundos na internet não derruba mais a conexão (e a call)
  const io = new Server(server, { maxHttpBufferSize: 2e6, serveClient: false, pingInterval: 20000, pingTimeout: 45000 });
  io.use((socket, next) => {
    // login pelo cookie de sessão (HttpOnly) ou pelo token antigo do app; o cookie é SameSite, então outro site não usa
    const token = (socket.handshake.auth && socket.handshake.auth.token) || cookieOf(socket.handshake.headers.cookie, COOKIE);
    const uid = db.sessions[token];
    if (!uid || !db.users[uid]) return next(new Error('auth'));
    socket.data.uid = uid; socket.data.token = token; next();
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
  const pems = selfsigned.generate([{ name: 'commonName', value: 'anarchy.local' }], {
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
  if (e.code === 'EADDRINUSE') log('\n  A porta ' + cfg.portaHttp + ' já está em uso. O Anarchy já está aberto em outra janela?\n');
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
  log('   ANARCHY está no ar!');
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
  if (!process.env.SERVIDOR_24H) log('   Deixe esta janela aberta enquanto usar o Anarchy.');
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
