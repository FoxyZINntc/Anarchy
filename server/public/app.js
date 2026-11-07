/* Discordia — app */
(() => {
'use strict';

/* =============== utilidades =============== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const isImg = u => typeof u === 'string' && /^(\/uploads\/|https?:\/\/)/.test(u);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const P = {
  hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
  voice: '<path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  mic: '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M19 11a7 7 0 0 1-14 0M12 18v3"/>',
  micOff: '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M19 11a7 7 0 0 1-14 0M12 18v3M3 3l18 18"/>',
  head: '<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><path d="M21 14v4a2 2 0 0 1-2 2h-1v-6h3zM3 14v4a2 2 0 0 0 2 2h1v-6H3z"/>',
  headOff: '<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><path d="M21 14v4a2 2 0 0 1-2 2h-1v-6h3zM3 14v4a2 2 0 0 0 2 2h1v-6H3zM3 3l18 18"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  screen: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4M12 13V8M9.5 10.5 12 8l2.5 2.5"/>',
  cam: '<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
  camOff: '<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/><path d="M2 2l20 20"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  hang: '<path transform="rotate(135 12 12)" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  clip: '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
  reply: '<path d="M9 17l-5-5 5-5"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
  trash: '<path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  max: '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>',
  compass: '<circle cx="12" cy="12" r="10"/><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  stage: '<rect x="3" y="3" width="18" height="14" rx="2"/><path d="M7 21h10"/>',
  send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36L21 8"/><path d="M21 3v5h-5"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  up: '<path d="M18 15l-6-6-6 6"/>',
  ban: '<circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/>'
};
const ic = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;
const EMOJIS = '😀 😂 🥹 😍 😎 🤔 😭 😡 👍 👎 👏 🙏 🔥 💯 ❤️ 💜 🎉 🎮 🏍️ ⚡ 🍕 ☕ 🐱 🐶 👀 💀 ✅ ❌ ⭐ 🌙 🚀 🎵'.split(' ');
const QUICK = ['👍', '😂', '❤️', '🔥', '😮', '😢'];
const GROUP_EMOJIS = '🎮 🏍️ 🎧 🍕 🔥 ⚡ 🌙 🚀 🐉 🎵 📚 💻 🏆 🌿 🦊 👾'.split(' ');
const COLORS = ['#6c7cff', '#ff6b8b', '#3ee0c5', '#f5b83d', '#b07cff', '#4fc3f7', '#7bd88f', '#ff8a4c', '#e0517f', '#f2545b'];
const STATUS = { online: 'Disponível', ausente: 'Ausente', ocupado: 'Não perturbe', invisivel: 'Invisível', offline: 'Offline' };

function toast(msg, err) {
  const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 4200);
}
const fmtTime = ts => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: !prefs.clock24 });
function fmtDay(ts) {
  const d = new Date(ts), t = new Date(); const y = new Date(); y.setDate(t.getDate() - 1);
  if (d.toDateString() === t.toDateString()) return 'Hoje';
  if (d.toDateString() === y.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* =============== preferências e temas =============== */
const THEMES = {
  'meia-noite': { nome: 'Meia-noite', dark: 1, rail: '#0b0d10', side: '#14171c', main: '#191c22', panel: '#20242c', elev: '#262b34', hover: '#2a2f39', line: '#2c313b', text: '#e8eaf0', muted: '#8b93a3', accent: '#6c7cff', accentText: '#ffffff', accent2: '#ff6b8b' },
  claro: { nome: 'Claro', dark: 0, rail: '#e3e5ea', side: '#f0f1f4', main: '#ffffff', panel: '#ffffff', elev: '#eef0f3', hover: '#e6e8ec', line: '#dcdfe5', text: '#1d2026', muted: '#6a7180', accent: '#4f5dff', accentText: '#ffffff', accent2: '#ff4f7a' },
  amoled: { nome: 'AMOLED', dark: 1, rail: '#000000', side: '#050505', main: '#000000', panel: '#0e0e0e', elev: '#141414', hover: '#1a1a1a', line: '#1f1f1f', text: '#f2f2f2', muted: '#8a8a8a', accent: '#7aa2ff', accentText: '#000000', accent2: '#ff6b8b' },
  neon: { nome: 'Neon', dark: 1, rail: '#05060a', side: '#0b0d16', main: '#0d0f18', panel: '#121527', elev: '#161a2e', hover: '#1c2140', line: '#252b4a', text: '#dde6ee', muted: '#6f7c92', accent: '#f5e400', accentText: '#06070c', accent2: '#00eaff', head: '"Chakra Petch", sans-serif', radius: 4 },
  sumi: { nome: 'Tinta japonesa', dark: 0, rail: '#e4dccb', side: '#ece5d6', main: '#f2ece0', panel: '#f7f2e8', elev: '#e8e0cf', hover: '#e2d9c6', line: '#d6ccb7', text: '#1b1916', muted: '#7d7568', accent: '#c23b22', accentText: '#f7f2e8', accent2: '#1b1916', head: '"Shippori Mincho", serif' },
  oceano: { nome: 'Oceano', dark: 1, rail: '#061a22', side: '#0a2530', main: '#0d2e3a', panel: '#11384a', elev: '#144153', hover: '#184a5e', line: '#1d5468', text: '#dff6ff', muted: '#85aab8', accent: '#3ee0c5', accentText: '#04211c', accent2: '#4fc3f7' },
  sakura: { nome: 'Sakura', dark: 0, rail: '#f3dde4', side: '#f8e8ed', main: '#fff6f8', panel: '#ffffff', elev: '#f6e3e9', hover: '#f1d8e0', line: '#ebcdd7', text: '#3a2530', muted: '#8a6b78', accent: '#e0517f', accentText: '#ffffff', accent2: '#b07cff' },
  floresta: { nome: 'Floresta', dark: 1, rail: '#0d1510', side: '#121d16', main: '#16231b', panel: '#1c2c22', elev: '#213428', hover: '#263c2e', line: '#2c4434', text: '#e6f2e8', muted: '#8aa593', accent: '#7bd88f', accentText: '#0d1510', accent2: '#f5b83d' },
  vinho: { nome: 'Vinho', dark: 1, rail: '#140a0e', side: '#1d1015', main: '#22131a', panel: '#2b1820', elev: '#331d26', hover: '#3a222c', line: '#432833', text: '#f4e6ea', muted: '#a88893', accent: '#ff5c7a', accentText: '#ffffff', accent2: '#f5b83d' },
  lavanda: { nome: 'Lavanda', dark: 0, rail: '#e6e1f5', side: '#efebfa', main: '#f8f6ff', panel: '#ffffff', elev: '#ebe6f9', hover: '#e2dcf5', line: '#d8d0f0', text: '#2a2340', muted: '#7a7194', accent: '#7c5cff', accentText: '#ffffff', accent2: '#ff6b8b' }
};
const FONTS = { inter: ['Inter', '"Inter", system-ui, sans-serif'], sistema: ['Sistema', 'system-ui, "Segoe UI", sans-serif'], nunito: ['Nunito', '"Nunito", system-ui, sans-serif'], grotesk: ['Space Grotesk', '"Space Grotesk", system-ui, sans-serif'], chakra: ['Chakra Petch', '"Chakra Petch", system-ui, sans-serif'], mincho: ['Shippori Mincho', '"Shippori Mincho", Georgia, serif'], mono: ['JetBrains Mono', '"JetBrains Mono", Consolas, monospace'], comic: ['Comic Neue', '"Comic Neue", "Comic Sans MS", cursive'] };
const BGS = {
  none: ['Nenhum', null],
  aurora: ['Aurora', t => `radial-gradient(900px 600px at 10% 10%, ${t.accent}55, transparent 60%), radial-gradient(800px 600px at 90% 90%, ${t.accent2}44, transparent 60%), ${t.rail}`],
  crepusculo: ['Crepúsculo', () => 'linear-gradient(160deg, #1d1446 0%, #5b2a6e 45%, #e0517f 80%, #f5b83d 100%)'],
  oceano: ['Mar profundo', () => 'linear-gradient(180deg, #021b2b 0%, #06415a 50%, #0b7a85 100%)'],
  grade: ['Grade', t => `linear-gradient(${t.line}88 1px, transparent 1px) 0 0 / 28px 28px, linear-gradient(90deg, ${t.line}88 1px, transparent 1px) 0 0 / 28px 28px, ${t.rail}`],
  custom: ['Minha imagem', null]
};
const DEFAULT_PREFS = { theme: 'meia-noite', accent: null, font: 'inter', fontSize: 15, density: 'conf', radius: null, layout: 'padrao', avatars: true, clock24: true, bg: 'none', bgImage: null, glass: 82, anim: true, sounds: true, volume: 60, desktop: false, mentionsOnly: false, micId: '', spkId: '', camId: '', ns: true, ec: true, agc: true, ptt: false, pttKey: 'KeyV', quality: '1080p30', showMembers: true, joinSounds: true, vol: {}, svol: {}, umute: {} };
let prefs = { ...DEFAULT_PREFS };
try { const st = JSON.parse(localStorage.getItem('discordia:prefs') || '{}'); prefs = { ...prefs, ...st }; if (window.discordiaDesktop && !('desktop' in st)) prefs.desktop = true; } catch {}
const DESK = window.discordiaDesktop || null;
function savePrefs() { try { localStorage.setItem('discordia:prefs', JSON.stringify(prefs)); } catch (e) { toast('Não deu para salvar as preferências (imagem de fundo grande demais?).', true); } }
function applyPrefs() {
  const t = THEMES[prefs.theme] || THEMES['meia-noite'];
  const r = document.documentElement.style;
  const accent = prefs.accent || t.accent;
  const set = (k, v) => r.setProperty(k, v);
  set('--rail', t.rail); set('--side', t.side); set('--main', t.main); set('--panel', t.panel); set('--elev', t.elev); set('--hover', t.hover); set('--line', t.line);
  set('--text', t.text); set('--muted', t.muted); set('--accent', accent); set('--accent2', t.accent2);
  set('--accent-text', prefs.accent ? (contrast(accent) ? '#000000' : '#ffffff') : t.accentText);
  set('--font', FONTS[prefs.font]?.[1] || FONTS.inter[1]);
  set('--font-head', t.head || 'var(--font)');
  set('--fs', prefs.fontSize + 'px');
  set('--radius', (prefs.radius ?? t.radius ?? 12) + 'px');
  set('--pad', { compacto: '0px', conf: '10px', espacoso: '20px' }[prefs.density] || '10px');
  set('--shadow', t.dark ? '0 18px 50px -18px rgba(0,0,0,.65)' : '0 18px 50px -20px rgba(40,30,60,.28)');
  document.documentElement.style.colorScheme = t.dark ? 'dark' : 'light';
  const bg = $('#bgLayer');
  if (prefs.bg === 'none' || (prefs.bg === 'custom' && !prefs.bgImage)) { bg.style.background = ''; set('--glass', '100%'); }
  else {
    set('--glass', prefs.glass + '%');
    bg.style.background = prefs.bg === 'custom' ? `center / cover no-repeat url("${prefs.bgImage}")` : BGS[prefs.bg][1]({ ...t, accent });
  }
  document.body.classList.toggle('no-anim', !prefs.anim);
  document.body.classList.toggle('hide-avatars', !prefs.avatars);
  document.body.classList.toggle('bubbles', prefs.layout === 'bolhas');
}
function contrast(hex) { const n = parseInt(hex.slice(1), 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (r * 299 + g * 587 + b * 114) / 1000 > 150; }
applyPrefs();

/* =============== estado =============== */
const S = {
  token: localStorage.getItem('discordia:token'), me: null, users: {}, friends: { friends: [], incoming: [], outgoing: [] },
  groups: {}, dms: {}, voice: {}, view: { kind: 'friends', tab: 'online' }, lastCh: {}, msgs: {}, more: {}, loading: {},
  unread: {}, mentions: {}, typing: {}, drafts: {}, reply: null, editing: null, focusTile: null, mySid: null, connected: false
};
let socket = null;
const user = id => S.users[id] || (S.me && S.me.id === id ? S.me : null) || { id, username: '?', displayName: 'Desconhecido', color: '#777', status: 'offline' };
const nameOf = id => user(id).displayName || user(id).username;
function emit(ev, data) {
  return new Promise(res => {
    if (!socket || !socket.connected) return res({ ok: false, erro: 'Sem conexão com o servidor.' });
    const t = setTimeout(() => res({ ok: false, erro: 'O servidor demorou para responder.' }), 10000);
    socket.emit(ev, data, r => { clearTimeout(t); res(r || { ok: false }); });
  });
}
async function act(ev, data, okMsg) {
  const r = await emit(ev, data);
  if (!r.ok) toast(r.erro || 'Algo deu errado.', true); else if (okMsg) toast(okMsg);
  return r;
}
async function api(path, body) {
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-token': S.token || '' }, body: JSON.stringify(body || {}) });
  const j = await r.json().catch(() => ({ erro: 'Resposta inválida do servidor.' }));
  if (!r.ok) throw new Error(j.erro || 'Erro.');
  return j;
}
function readFile(file) { return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); }); }
async function shrink(dataUrl, max, q = .86, square) {
  // GIF fica como está, para continuar animado (foto de perfil, banner, ícone do grupo)
  if (/^data:image\/gif/.test(dataUrl)) return dataUrl;
  const img = new Image(); img.src = dataUrl; await img.decode();
  let w = img.width, h = img.height, sx = 0, sy = 0, sw = w, sh = h;
  if (square) { const m = Math.min(w, h); sx = (w - m) / 2; sy = (h - m) / 2; sw = sh = m; w = h = Math.min(m, max); }
  else if (Math.max(w, h) > max) { const k = max / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); }
  else if (dataUrl.length < 1.5e6) return dataUrl;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  return c.toDataURL(/png/.test(dataUrl) && square ? 'image/png' : 'image/jpeg', q);
}
async function uploadImage(file, opts = {}) {
  if (!file || !/^image\//.test(file.type)) { toast('Escolha um arquivo de imagem.', true); return null; }
  try {
    let data = await readFile(file);
    data = await shrink(data, opts.max || 2000, .86, opts.square);
    const r = await api('/api/upload', { data });
    return r.url;
  } catch (e) { toast(e.message, true); return null; }
}
function pickFile(accept = 'image/*') {
  return new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.onchange = () => res(i.files[0] || null); i.click(); });
}
async function copy(text, label = 'Copiado.') {
  try { await navigator.clipboard.writeText(text); toast(label); } catch { toast('Copie manualmente: ' + text); }
}

/* =============== cargos e permissões =============== */
const PERM_INFO = [
  ['admin', 'Administrador', 'Tem todas as permissões e passa por cima de tudo. Dê só para quem você confia muito.'],
  ['manageServer', 'Gerenciar grupo', 'Mudar nome, ícone, banner, descrição, boas-vindas e código de convite.'],
  ['manageChannels', 'Gerenciar canais', 'Criar, editar, ordenar e apagar canais. Também ignora o modo lento.'],
  ['manageRoles', 'Gerenciar cargos', 'Criar e editar cargos abaixo do seu, e dar ou tirar cargos dos membros.'],
  ['kick', 'Expulsar membros', 'Remover pessoas do grupo. Elas podem voltar com um convite.'],
  ['ban', 'Banir membros', 'Remover pessoas e impedir que elas voltem.'],
  ['manageMessages', 'Gerenciar mensagens', 'Apagar mensagens de outras pessoas. Também ignora o modo lento.']
];
const gRoles = (g, uid) => { const mine = g?.memberRoles?.[uid] || []; return (g?.roles || []).filter(r => mine.includes(r.id)); };
function gCan(g, perm, uid = S.me?.id) {
  if (!g || !uid || !g.members.includes(uid)) return false;
  if (g.ownerId === uid) return true;
  return gRoles(g, uid).some(r => r.perms.includes('admin') || r.perms.includes(perm));
}
function gRank(g, uid) { if (g.ownerId === uid) return -1; const i = gRoles(g, uid).map(r => g.roles.indexOf(r)); return i.length ? Math.min(...i) : (g.roles || []).length; }
const gAbove = (g, target) => gRank(g, S.me.id) < gRank(g, target);
const gEditRole = (g, r) => g.ownerId === S.me.id || (gCan(g, 'manageRoles') && g.roles.indexOf(r) > gRank(g, S.me.id));
const nameColor = (uid, g) => (g && gRoles(g, uid).find(r => r.color)?.color) || user(uid).color || 'var(--text)';
const gManager = g => ['manageServer', 'manageChannels', 'manageRoles', 'kick', 'ban'].some(p => gCan(g, p));
const curGroup = () => (S.view.kind === 'group' ? S.groups[S.view.gid] : null);
const SLOW_OPTS = [[0, 'Desligado'], [5, '5 segundos'], [10, '10 segundos'], [15, '15 segundos'], [30, '30 segundos'], [60, '1 minuto'], [120, '2 minutos'], [300, '5 minutos'], [600, '10 minutos'], [3600, '1 hora']];
const slowLabel = s => (SLOW_OPTS.find(o => o[0] === s) || [0, ''])[1];

/* =============== avatares =============== */
function av(id, size = 32, dot = true, extra = '') {
  const u = user(id);
  const st = u.status || 'offline';
  const img = u.avatar ? `background-image:url('${esc(u.avatar)}');` : '';
  const ini = u.avatar ? '' : esc((u.displayName || u.username || '?').trim()[0]?.toUpperCase() || '?');
  return `<div class="av s${size} ${extra}" style="background-color:${esc(u.color || '#777')};${img}" data-user="${esc(id)}">${ini}${dot ? `<i class="dot ${st}"></i>` : ''}</div>`;
}
function groupIcon(g) {
  if (isImg(g.icon)) return `<div class="inner" style="background-image:url('${esc(g.icon)}')"></div>`;
  const label = g.icon || g.name.split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase();
  return `<div class="inner" style="background:${esc(g.color)};color:#fff;font-size:${g.icon ? 24 : 15}px">${esc(label)}</div>`;
}

/* =============== sons =============== */
let actx = null;
function audioCtx() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch {} } if (actx && actx.state === 'suspended') actx.resume(); return actx; }
function tone(notes, type = 'sine', gain = .14) {
  if (!prefs.sounds) return; const c = audioCtx(); if (!c) return;
  let t = c.currentTime;
  notes.forEach(([f, d]) => {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain * prefs.volume / 100, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + .02); t += d * .8;
  });
}
const SOUNDS = {
  msg: () => tone([[880, .09], [1320, .16]]),
  join: () => prefs.joinSounds && tone([[523, .1], [784, .18]], 'triangle'),
  leave: () => prefs.joinSounds && tone([[784, .1], [523, .18]], 'triangle'),
  mute: () => tone([[440, .07]], 'square', .05),
  unmute: () => tone([[660, .07]], 'square', .05),
  req: () => tone([[660, .1], [880, .1], [1100, .2]], 'triangle')
};
let ringTimer = null;
function ring(start, outgoing) {
  clearInterval(ringTimer); ringTimer = null;
  if (!start) return;
  const pat = () => outgoing ? tone([[440, .4], [480, .4]], 'sine', .08) : tone([[784, .15], [988, .15], [784, .15], [988, .25]], 'triangle', .12);
  pat(); ringTimer = setInterval(pat, outgoing ? 2600 : 1800);
}
function notifyDesktop(title, body, icon) {
  if (!prefs.desktop || !('Notification' in window) || Notification.permission !== 'granted' || (!document.hidden && document.hasFocus())) return;
  try { const n = new Notification(title, { body, icon: icon || undefined, silent: true }); n.onclick = () => { window.focus(); n.close(); }; } catch {}
}

/* =============== login =============== */
/* O login é uma conversa com o Porteiro: ele pergunta, você responde no campo de baixo. */
const PT_HTML = '<i class="pt-ant"></i><i class="pt-bulb"></i><i class="pt-body">' +
  '<i class="pt-eye l"><i class="pt-pupil"></i></i><i class="pt-eye r"><i class="pt-pupil"></i></i>' +
  '<i class="pt-happy l"></i><i class="pt-happy r"></i><i class="pt-cheek l"></i><i class="pt-cheek r"></i>' +
  '<i class="pt-mouth"></i><i class="pt-hand l"></i><i class="pt-hand r"></i></i>' +
  '<i class="pt-arm"></i><i class="pt-sweat"></i><i class="pt-zzz"><b>z</b><b>z</b><b>Z</b></i>';
$$('.porteiro').forEach(p => { p.innerHTML = PT_HTML; });
const PT_LINES = ['Ei! Isso faz cócegas 😆', 'Eu só trabalho aqui.', 'Psiu, senha é segredo.', 'Tô de olho 👀', 'Já tomou água hoje?', 'Boop!', 'Sem crachá, sem festa.', 'Não aperta, sou frágil 🥺'];
const AU = { mode: 'login', step: 'user', data: {}, busy: false, gen: 0, mood: 'look' };
const authWait = ms => new Promise(r => setTimeout(r, ms));
const reduceMotion = () => document.body.classList.contains('no-anim') || matchMedia('(prefers-reduced-motion: reduce)').matches;

function ptMood(m, status) {
  AU.mood = m;
  $$('.porteiro').forEach(p => { p.classList.remove('shy', 'happy', 'sad', 'sus', 'peek'); if (m !== 'look') p.classList.add(m); });
  if (status) $('#ptStatus').textContent = status;
}
function ptAnim(cls, ms = 800, all = false) {
  (all ? $$('.porteiro') : [$('#ptBig')]).forEach(p => {
    p.classList.remove(cls); void p.offsetWidth; p.classList.add(cls);
    clearTimeout(p['_t' + cls]); p['_t' + cls] = setTimeout(() => p.classList.remove(cls), ms);
  });
}
const ptWave = () => ptAnim('wave', 1550);
function ptEnter() { ptAnim('enter', 950); setTimeout(ptWave, 650); }
// parado muito tempo: olha em volta, depois cochila. Qualquer movimento acorda.
let ptIdle1 = null, ptIdle2 = null, ptAsleep = false;
function ptActivity() {
  clearTimeout(ptIdle1); clearTimeout(ptIdle2);
  if (ptAsleep) {
    ptAsleep = false; $$('.porteiro').forEach(p => p.classList.remove('sleep'));
    $('#ptStatus').textContent = AU.mood === 'shy' ? 'de olhos fechados 🙈' : 'online';
    ptAnim('startle', 600); ptSay('Hã?! Tô acordado, tô acordado!');
  }
  if ($('#auth').hidden) return;
  ptIdle1 = setTimeout(() => { if (AU.mood === 'look' && !AU.busy) ptAnim('around', 3300, true); }, 7000);
  ptIdle2 = setTimeout(() => {
    if (AU.mood !== 'look' || AU.busy || $('#auth').hidden) return;
    ptAsleep = true; $$('.porteiro').forEach(p => p.classList.add('sleep')); $('#ptStatus').textContent = 'cochilando 💤';
  }, 25000);
}
function authAdd(html, cls = '') {
  const log = $('#authLog'); const el = document.createElement('div');
  el.className = cls; el.innerHTML = html; log.appendChild(el); log.scrollTop = log.scrollHeight; return el;
}
// o Porteiro "digita" antes de cada mensagem
async function bot(lines, { err = false, chips = null } = {}) {
  const g = AU.gen; AU.busy = true; $('#authBtn').disabled = true;
  for (const line of [].concat(lines)) {
    const prev = $('#ptStatus').textContent; $('#ptStatus').textContent = 'digitando...';
    const t = authAdd('<i></i><i></i><i></i>', 'au-msg au-typing');
    $$('.porteiro').forEach(p => p.classList.add('talk'));
    await authWait(reduceMotion() ? 80 : clamp(320 + line.length * 14, 420, 1100));
    $$('.porteiro').forEach(p => p.classList.remove('talk'));
    t.remove(); if (g !== AU.gen) return;
    $('#ptStatus').textContent = prev === 'digitando...' ? 'online' : prev;
    authAdd(esc(line), 'au-msg' + (err ? ' err' : ''));
    tone([[err ? 330 : 740, .07], [err ? 260 : 990, .09]], 'sine', .05);
  }
  if (chips) {
    const c = authAdd(chips.map((ch, i) => `<button type="button" data-i="${i}">${esc(ch[0])}</button>`).join(''), 'au-chips');
    c.onclick = e => { const b = e.target.closest('button'); if (b && !AU.busy) { c.remove(); chips[b.dataset.i][1](); } };
  }
  AU.busy = false; $('#authBtn').disabled = false; $('#authInput').focus();
}
function ask(step) {
  AU.step = step;
  const inp = $('#authInput'), reg = AU.mode === 'register';
  const cfg = {
    user: ['Nome de usuário', 'seu nome de usuário', 'text', 'username'],
    name: ['Nome de exibição', 'como a galera vai te ver', 'text', 'nickname'],
    pass: ['Senha', reg ? 'mínimo 6 caracteres' : 'sua senha', 'password', reg ? 'new-password' : 'current-password']
  }[step];
  $('#authLabel').textContent = cfg[0]; inp.placeholder = cfg[1]; inp.type = cfg[2]; inp.autocomplete = cfg[3];
  inp.value = step === 'user' ? (AU.data.username || '') : step === 'name' ? (AU.data.displayName || '') : '';
  inp.maxLength = step === 'user' ? 20 : step === 'name' ? 32 : 200;
  const peek = $('#authPeek'); peek.hidden = step !== 'pass'; peek.setAttribute('aria-pressed', 'false');
  if (step === 'pass') ptMood('shy', 'de olhos fechados 🙈'); else ptMood('look', 'online');
  $('#authForm').classList.remove('bad', 'good');
}
async function authStart(mode = AU.mode) {
  AU.gen++; AU.mode = mode; AU.data = {}; AU.busy = false;
  const reg = mode === 'register';
  $('#authSwitch').textContent = reg ? 'Já tenho conta' : 'Criar conta';
  $('#authLog').innerHTML = '<div class="au-day">HOJE</div>';
  ask('user');
  if (reg) await bot(['Gente nova! Adoro 🎉', 'Escolhe um nome de usuário. É com ele que os amigos vão te achar (3 a 20 caracteres: letras minúsculas, números, ponto ou _).']);
  else await bot(['Opa! Eu sou o Porteiro do Discordia 👋', 'Ninguém entra sem se identificar. Qual é o seu nome de usuário?']);
}
function showAuth() {
  $('#app').hidden = true; $('#auth').hidden = false;
  authStart('login'); ptEnter(); ptActivity();
}
function authBad(msg) {
  $('#authForm').classList.remove('bad'); void $('#authForm').offsetWidth; $('#authForm').classList.add('bad');
  ptAnim('shake'); return bot(msg, { err: true });
}
$('#authSwitch').onclick = () => authStart(AU.mode === 'login' ? 'register' : 'login');
$('#authPeek').onclick = () => {
  const inp = $('#authInput'), on = inp.type === 'password';
  inp.type = on ? 'text' : 'password'; $('#authPeek').setAttribute('aria-pressed', String(on));
  $('#authPeek').setAttribute('aria-label', on ? 'Esconder senha' : 'Mostrar senha');
  $$('.porteiro').forEach(p => p.classList.toggle('peek', on));
  $('#ptStatus').textContent = on ? 'espiando um pouquinho...' : 'de olhos fechados 🙈';
  inp.focus();
};
$('#authForm').onsubmit = async e => {
  e.preventDefault(); audioCtx();
  if (AU.busy) return;
  const inp = $('#authInput'), raw = inp.value, reg = AU.mode === 'register';
  const val = AU.step === 'pass' ? raw : raw.trim();
  if (!val && AU.step !== 'name') { ptAnim('boop'); inp.focus(); return; }
  $('#authForm').classList.remove('bad'); $$('#authLog .au-chips').forEach(c => c.remove());
  authAdd(AU.step === 'pass' ? '•'.repeat(Math.min(val.length, 12)) : esc(val || '(pulei)'), 'au-msg me' + (AU.step === 'pass' ? ' secret' : ''));
  inp.value = '';
  if (AU.step === 'user') {
    const u = val.toLowerCase().replace(/^@/, '');
    if (!/^[a-z0-9_.]{3,20}$/.test(u)) { ptMood('sus', 'desconfiado 🤨'); await authBad('Esse nome não passa na porta 😬 Use de 3 a 20 caracteres: letras minúsculas, números, ponto ou _.'); ask('user'); return; }
    AU.data.username = u;
    if (reg) { ask('name'); await bot(`@${u}, gostei! E como você quer aparecer pra galera? Pode ser nome, apelido...`, { chips: [['Pular', () => { AU.data.displayName = ''; authAdd('(pulei)', 'au-msg me'); goPass(); }]] }); return; }
    ask('pass'); await bot(`Hmm, @${u}... Agora a senha. Prometo que não tô olhando 🙈`, { chips: [['Não sou eu', () => authStart('login')]] });
    return;
  }
  if (AU.step === 'name') { AU.data.displayName = val; goPass(); return; }
  // senha
  if (reg && val.length < 6) { await authBad('Curtinha demais! A senha precisa de pelo menos 6 caracteres.'); ask('pass'); return; }
  AU.busy = true; $('#authBtn').disabled = true; $('#ptStatus').textContent = 'conferindo a lista...';
  const g = AU.gen;
  try {
    const r = await api(reg ? '/api/register' : '/api/login', { username: AU.data.username, password: val, displayName: AU.data.displayName || '' });
    if (g !== AU.gen) return;
    AU.busy = false; await authWin(r.token);
  } catch (err) {
    if (g !== AU.gen) return;
    AU.busy = false; ptMood('sad', 'meio triste');
    if (reg && /usu[aá]rio/i.test(err.message)) { await authBad(`Eita! ${err.message} Escolhe outro?`); ask('user'); return; }
    await authBad(`Eita! ${err.message}`);
    ask('pass');
    await bot('Bora de novo? Manda a senha.', { chips: [['Trocar usuário', () => authStart(AU.mode)], ...(reg ? [] : [['Criar conta', () => authStart('register')]])] });
  }
};
async function goPass() {
  ask('pass');
  await bot('Agora inventa uma senha (mínimo 6 caracteres). Juro que fecho os olhos 🙈');
}
async function authWin(token) {
  const name = AU.data.displayName || AU.data.username;
  clearTimeout(ptIdle1); clearTimeout(ptIdle2);
  ptMood('happy', 'comemorando 🎉'); ptAnim('jump'); setTimeout(ptWave, 500); $('#authForm').classList.add('good');
  $('#authInput').blur(); $('#authBtn').disabled = true;
  authAdd(esc(AU.mode === 'register' ? `Prontinho, ${name}! Conta criada. Seja bem-vindo 🎉` : `Achei você, ${name}! Pode entrar, a galera tá te esperando 🎉`), 'au-msg');
  tone([[523, .1], [659, .1], [784, .1], [1047, .25]], 'triangle', .08);
  confetti();
  await authWait(reduceMotion() ? 200 : 1300);
  S.token = token; localStorage.setItem('discordia:token', token); connect();
}
function confetti() {
  if (reduceMotion()) return;
  const box = $('.au-card').getBoundingClientRect(), cx = box.left + box.width / 2, cy = box.top + box.height * .55;
  const cols = ['#6c7cff', '#ff6b8b', '#3ee0c5', '#f5b83d', '#b07cff', '#7bd88f'];
  for (let i = 0; i < 90; i++) {
    const c = document.createElement('i'); c.className = 'au-confetti';
    c.style.background = cols[i % cols.length]; c.style.left = cx + 'px'; c.style.top = cy + 'px';
    document.body.appendChild(c);
    const a = Math.random() * Math.PI * 2, v = 160 + Math.random() * 320;
    const dx = Math.cos(a) * v, dy = Math.sin(a) * v - 220, rot = (Math.random() - .5) * 1440;
    c.animate([
      { transform: 'translate(-50%,-50%) rotate(0deg) scale(1)', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) rotate(${rot / 2}deg) scale(1)`, opacity: 1, offset: .45 },
      { transform: `translate(${dx * 1.3}px, ${dy + 520}px) rotate(${rot}deg) scale(.6)`, opacity: 0 }
    ], { duration: 1400 + Math.random() * 900, easing: 'cubic-bezier(.2,.7,.4,1)' }).onfinish = () => c.remove();
  }
}
// olhos seguem o mouse (ou o texto que você digita)
let ptLook = null;
function ptEyes(x, y) {
  if (AU.mood === 'happy' || $('#auth').hidden) return;
  $$('.pt-eye').forEach(eye => {
    const r = eye.getBoundingClientRect(), dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 160);
    const p = eye.firstElementChild;
    p.style.setProperty('--px', (dx / d * k * .55).toFixed(3) + 'em'); p.style.setProperty('--py', (dy / d * k * .6).toFixed(3) + 'em');
  });
}
let ptMoveT = 0;
addEventListener('pointermove', e => {
  ptLook = [e.clientX, e.clientY]; ptEyes(e.clientX, e.clientY);
  if (!$('#auth').hidden && (ptAsleep || e.timeStamp - ptMoveT > 1000)) { ptMoveT = e.timeStamp; ptActivity(); }
}, { passive: true });
addEventListener('keydown', () => { if (!$('#auth').hidden) ptActivity(); });
$('#authInput').addEventListener('input', () => {
  if (AU.mood === 'look') ptAnim('nod', 260, true);
  const inp = $('#authInput'), r = inp.getBoundingClientRect();
  ptEyes(r.left + 22 + Math.min(inp.value.length * 8.5, r.width - 40), r.top + r.height / 2);
});
(function blink() {
  setTimeout(() => {
    if (!$('#auth').hidden && !reduceMotion()) { $$('.porteiro').forEach(p => p.classList.add('blink')); setTimeout(() => $$('.porteiro').forEach(p => p.classList.remove('blink')), 140); }
    blink();
  }, 2200 + Math.random() * 3200);
})();
let ptSpeechT = null;
function ptSay(txt) {
  const s = $('#ptSpeech'); s.textContent = txt; s.classList.add('on');
  clearTimeout(ptSpeechT); ptSpeechT = setTimeout(() => s.classList.remove('on'), 1800);
}
let ptClicks = 0;
$('#ptBig').onclick = () => {
  ptActivity(); ptAnim('boop'); tone([[880, .05], [660, .08]], 'square', .03);
  if (++ptClicks % 3 === 0) ptWave();
  ptSay(PT_LINES[Math.floor(Math.random() * PT_LINES.length)]);
};
async function logout() {
  try { await api('/api/logout'); } catch {}
  localStorage.removeItem('discordia:token'); S.token = null; if (V.room) leaveVoice();
  if (socket) socket.disconnect(); socket = null; closeSettings(); showAuth();
}

/* =============== conexão =============== */
function connect() {
  if (socket) socket.disconnect();
  socket = io({ auth: { token: S.token }, transports: ['websocket', 'polling'] });
  socket.on('connect', async () => {
    const r = await emit('init');
    if (!r.ok) return;
    S.connected = true; S.mySid = r.socketId; S.me = r.me; S.users = r.users; S.users[r.me.id] = r.me;
    S.friends = r.friends; S.groups = r.groups; S.dms = r.dms; S.voice = r.voice; V.ice = r.iceServers;
    $('#auth').hidden = true; $('#app').hidden = false;
    if (S.view.kind === 'group' && !S.groups[S.view.gid]) S.view = { kind: 'friends', tab: 'online' };
    if (S.view.kind === 'dm' && !S.dms[S.view.id]) S.view = { kind: 'friends', tab: 'online' };
    S.msgs = {}; S.more = {}; mainKey = null; render();
    // servidor reiniciou com uma interface nova? mostra a barra "Atualizar"
    if (r.build) { if (UPD.build && UPD.build !== r.build) { UPD.web = true; showUpd(); } if (!UPD.build) UPD.build = r.build; }
  });
  socket.on('connect_error', e => { if (e.message === 'auth') { localStorage.removeItem('discordia:token'); S.token = null; showAuth(); } });
  socket.on('disconnect', () => { S.connected = false; if (V.room) { cleanupVoice(); toast('A conexão caiu. Você saiu da call.', true); } render(); });
  socket.on('me:update', u => { S.me = u; S.users[u.id] = u; render(); });
  socket.on('user:update', u => { S.users[u.id] = u; render(); });
  socket.on('friends:update', f => { S.friends = f; render(); });
  socket.on('group:update', ({ group, users }) => {
    S.groups[group.id] = group; users.forEach(u => { if (u.id !== S.me.id) S.users[u.id] = u; });
    if (S.view.kind === 'group' && S.view.gid === group.id && !group.channels.some(c => c.id === S.view.cid)) S.view.cid = firstText(group);
    render();
    // as abas de lista das configurações do grupo acompanham as mudanças
    if ($('.gset') && gsGid === group.id && ['membros', 'canais', 'convites', 'banimentos'].includes(gsTab)) drawGroupSettings();
  });
  socket.on('group:removed', ({ gid }) => {
    const g = S.groups[gid]; delete S.groups[gid];
    if ($('.gset') && gsGid === gid) closeSettings();
    if (g && V.room && g.channels.some(c => c.id === V.room)) leaveVoice();
    if (S.view.kind === 'group' && S.view.gid === gid) { S.view = { kind: 'friends', tab: 'online' }; if (g) toast(`Você não está mais em "${g.name}".`); }
    render();
  });
  socket.on('dm:update', dm => { S.dms[dm.id] = { ...(S.dms[dm.id] || {}), ...dm }; render(); });
  socket.on('message:new', onMessage);
  socket.on('message:update', m => { const l = S.msgs[m.cid]; if (!l) return; const i = l.findIndex(x => x.id === m.id); if (i >= 0) l[i] = m; if (viewingCid() === m.cid) renderMessages(); });
  socket.on('message:delete', ({ cid, id }) => { const l = S.msgs[cid]; if (!l) return; S.msgs[cid] = l.filter(x => x.id !== id); if (viewingCid() === cid) renderMessages(); });
  socket.on('typing', ({ cid, uid }) => { (S.typing[cid] = S.typing[cid] || {})[uid] = Date.now(); if (viewingCid() === cid) renderTyping(); });
  socket.on('voice:room', onVoiceRoom);
  socket.on('rtc:signal', onSignal);
  socket.on('call:incoming', onIncomingCall);
  socket.on('call:ended', ({ dmId }) => { if (incoming && incoming.dmId === dmId) closeRing(); });
  socket.on('call:declined', ({ dmId, by }) => {
    if (incoming && incoming.dmId === dmId && by === S.me.id) closeRing();
    if (V.room === dmId && by !== S.me.id && (S.voice[dmId] || []).length <= 1) { ring(false); toast(`${nameOf(by)} recusou a chamada.`); leaveVoice(); }
  });
  socket.on('notify', n => {
    if (n.type === 'friend-request') { SOUNDS.req(); toast(`${nameOf(n.from)} te enviou um pedido de amizade.`); notifyDesktop('Pedido de amizade', `${nameOf(n.from)} quer ser seu amigo no Discordia.`); }
    if (n.type === 'friend-accepted') { SOUNDS.req(); toast(`${nameOf(n.from)} aceitou seu pedido de amizade.`); }
    if (n.type === 'group-added') { SOUNDS.req(); toast(`${nameOf(n.from)} te adicionou em "${S.groups[n.gid]?.name || 'um grupo'}".`); }
  });
}
const firstText = g => (g.channels.find(c => c.type === 'text') || g.channels[0])?.id;
function viewingCid() {
  if (S.view.kind === 'dm') return S.view.id;
  if (S.view.kind === 'group') { const ch = chan(S.view.gid, S.view.cid); return ch && ch.type === 'text' ? ch.id : null; }
  return null;
}
const chan = (gid, cid) => S.groups[gid]?.channels.find(c => c.id === cid);
function groupOfChannel(cid) { return Object.values(S.groups).find(g => g.channels.some(c => c.id === cid)); }
function roomName(roomId) {
  if (S.dms[roomId]) return nameOf(S.dms[roomId].members.find(m => m !== S.me.id));
  const g = groupOfChannel(roomId); const c = g && g.channels.find(x => x.id === roomId);
  return c ? `${c.name} / ${g.name}` : 'Sala';
}

function onMessage(m) {
  const l = S.msgs[m.cid];
  if (l && !l.some(x => x.id === m.id)) l.push(m);
  const mine = m.authorId === S.me.id;
  if (S.typing[m.cid]) delete S.typing[m.cid][m.authorId];
  const viewing = viewingCid() === m.cid && !document.hidden && document.hasFocus();
  if (viewingCid() === m.cid) { renderMessages(); renderTyping(); }
  if (mine || viewing || m.system) return;
  const isDm = !!S.dms[m.cid];
  const mention = new RegExp('@' + S.me.username + '\\b', 'i').test(m.content || '');
  S.unread[m.cid] = (S.unread[m.cid] || 0) + 1;
  if (mention || isDm) S.mentions[m.cid] = (S.mentions[m.cid] || 0) + 1;
  const quiet = S.me.status === 'ocupado' || (!isDm && prefs.mentionsOnly && !mention);
  if (!quiet) {
    SOUNDS.msg();
    const g = groupOfChannel(m.cid);
    notifyDesktop(isDm ? nameOf(m.authorId) : `${nameOf(m.authorId)} em #${g?.channels.find(c => c.id === m.cid)?.name}`, m.content || 'Enviou uma imagem', user(m.authorId).avatar);
  }
  updateTitle(); renderRail(); renderSide();
}
function updateTitle() {
  const n = Object.values(S.mentions).reduce((a, b) => a + b, 0);
  document.title = (n ? `(${n}) ` : '') + 'Discordia';
}
function markRead(cid) { if (!cid) return; if (S.unread[cid] || S.mentions[cid]) { delete S.unread[cid]; delete S.mentions[cid]; updateTitle(); renderRail(); renderSide(); } }
document.addEventListener('visibilitychange', () => { if (!document.hidden) markRead(viewingCid()); });
window.addEventListener('focus', () => markRead(viewingCid()));
setInterval(() => {
  const now = Date.now(); let ch = false;
  Object.values(S.typing).forEach(t => Object.keys(t).forEach(u => { if (now - t[u] > 4500) { delete t[u]; ch = true; } }));
  if (ch) renderTyping();
}, 1500);

/* =============== renderização =============== */
let rq = 0;
function render() { if (rq) return; rq = requestAnimationFrame(() => { rq = 0; if (!S.me) return; renderRail(); renderSide(); renderMain(); renderMembers(); renderUserBar(); renderVoiceBar(); }); }

function renderRail() {
  const dmUnread = Object.keys(S.dms).reduce((a, id) => a + (S.mentions[id] || 0), 0) + S.friends.incoming.length;
  const groups = Object.values(S.groups).sort((a, b) => a.createdAt - b.createdAt);
  $('#rail').innerHTML = `
    <button class="rail-item home ${S.view.kind !== 'group' ? 'active' : ''}" data-act="home" data-tip="Mensagens diretas"><div class="inner">${ic('msg')}</div>${dmUnread ? `<span class="badge">${dmUnread}</span>` : ''}</button>
    <div class="rail-sep"></div>
    ${groups.map(g => {
      const chs = g.channels.map(c => c.id);
      const un = chs.some(c => S.unread[c]); const men = chs.reduce((a, c) => a + (S.mentions[c] || 0), 0);
      const live = chs.some(c => (S.voice[c] || []).length);
      return `<button class="rail-item ${S.view.kind === 'group' && S.view.gid === g.id ? 'active' : ''} ${un ? 'unread' : ''}" data-act="group" data-id="${g.id}" data-tip="${esc(g.name)}${live ? ' · call ativa' : ''}">${groupIcon(g)}${men ? `<span class="badge">${men}</span>` : live ? `<span class="badge" style="background:var(--ok)">${ic('voice').replace('<svg', '<svg style="width:11px;height:11px"')}</span>` : ''}</button>`;
    }).join('')}
    <button class="rail-item add" data-act="newGroup" data-tip="Criar grupo"><div class="inner">+</div></button>
    <button class="rail-item add" data-act="joinGroup" data-tip="Entrar com convite"><div class="inner" style="color:var(--accent)">${ic('compass')}</div></button>`;
}

function renderSide() {
  const body = $('#sideBody');
  if (S.view.kind === 'group') return renderGroupSide(body);
  const dms = Object.values(S.dms).sort((a, b) => (b.last || 0) - (a.last || 0));
  body.innerHTML = `
    <div class="side-head"><span class="title">Conversas</span><button class="icon-btn" data-act="newGroup" data-tip="Criar grupo">${ic('plus')}</button></div>
    <div class="side-sec">
      <button class="nav-row ${S.view.kind === 'friends' ? 'active' : ''}" data-act="friends">${ic('users', 'ch')}<span class="lbl">Amigos</span>${S.friends.incoming.length ? `<span class="badge" style="border:0">${S.friends.incoming.length}</span>` : ''}</button>
    </div>
    <div class="side-sec">
      <div class="side-sec-h"><span>Mensagens diretas</span><button class="icon-btn" data-act="newDm" data-tip="Nova conversa">${ic('plus')}</button></div>
      ${dms.length ? dms.map(d => {
        const o = d.members.find(m => m !== S.me.id); const u = user(o);
        const inCall = (S.voice[d.id] || []).length;
        return `<button class="nav-row ${S.view.kind === 'dm' && S.view.id === d.id ? 'active' : ''} ${S.unread[d.id] ? 'unread' : ''}" data-act="dm" data-id="${d.id}">
          ${av(o, 32)}<span class="lbl">${esc(u.displayName)}<br><span class="muted small" style="font-weight:400">${inCall ? '🔊 Em chamada' : esc(u.customStatus || STATUS[u.status] || '')}</span></span>
          ${S.mentions[d.id] ? `<span class="badge" style="border:0">${S.mentions[d.id]}</span>` : ''}</button>`;
      }).join('') : '<p class="muted small" style="padding:4px 10px">Abra uma conversa pela lista de amigos.</p>'}
    </div>`;
}
function renderGroupSide(body) {
  const g = S.groups[S.view.gid]; if (!g) return;
  const own = gCan(g, 'manageChannels');
  const row = c => {
    const active = S.view.cid === c.id;
    const peers = S.voice[c.id] || [];
    return `<button class="nav-row ${active ? 'active' : ''} ${S.unread[c.id] ? 'unread' : ''}" data-act="channel" data-id="${c.id}">
      ${ic(c.type === 'voice' ? 'voice' : 'hash', 'ch')}<span class="lbl">${esc(c.name)}</span>
      ${S.mentions[c.id] ? `<span class="badge" style="border:0">${S.mentions[c.id]}</span>` : ''}
      ${own ? `<span class="row-act"><span class="icon-btn" data-act="editChannel" data-id="${c.id}" data-tip="Editar canal">${ic('gear')}</span></span>` : ''}
    </button>
    ${peers.length ? `<div class="voice-people">${peers.map(p => `<div class="voice-person" data-act="voiceUser" data-vuid="${p.uid}" ${p.uid !== S.me.id ? 'data-tip="Clique para mudar o volume"' : ''}>${av(p.uid, 24, false, '').replace('class="av', `data-speak="${p.sid}" class="av`)}<span class="lbl" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(nameOf(p.uid))}</span>${volTag(p.uid)}${p.screen ? '<span class="live">AO VIVO</span>' : ''}${p.cam ? ic('cam') : ''}${p.deafened ? ic('headOff') : p.muted ? ic('micOff') : ''}</div>`).join('')}</div>` : ''}`;
  };
  const text = g.channels.filter(c => c.type === 'text'), vc = g.channels.filter(c => c.type === 'voice');
  const ban = g.banner ? (isImg(g.banner) ? `background-image:url('${esc(g.banner)}')` : `background:${esc(g.banner)}`) : '';
  body.innerHTML = `
    ${ban ? `<div class="side-banner clickable" data-act="groupMenu" style="${ban}"><div class="side-banner-t"><span class="title">${esc(g.name)}</span>${ic('down')}</div></div>`
      : `<div class="side-head clickable" data-act="groupMenu"><span class="title">${esc(g.name)}</span>${ic('down')}</div>`}
    <div class="side-sec">
      <button class="nav-row" data-act="invite" style="color:var(--accent)">${ic('users', 'ch')}<span class="lbl">Convidar pessoas</span></button>
    </div>
    <div class="side-sec"><div class="side-sec-h"><span>Canais de texto</span>${own ? `<button class="icon-btn" data-act="newChannel" data-type="text" data-tip="Criar canal">${ic('plus')}</button>` : ''}</div>${text.map(row).join('')}</div>
    <div class="side-sec"><div class="side-sec-h"><span>Canais de voz</span>${own ? `<button class="icon-btn" data-act="newChannel" data-type="voice" data-tip="Criar canal de voz">${ic('plus')}</button>` : ''}</div>${vc.map(row).join('')}</div>`;
}

function renderUserBar() {
  const u = S.me;
  $('#userBar').innerHTML = `
    <button class="me-chip" data-act="meMenu">${av(u.id, 32)}<span style="min-width:0"><span class="nm" style="display:block">${esc(u.displayName)}</span><span class="st" style="display:block">${esc(u.customStatus || STATUS[u.realStatus || u.status])}</span></span></button>
    <button class="icon-btn ${V.muted ? 'on' : ''}" data-act="mute" data-tip="${V.muted ? 'Ativar microfone' : 'Silenciar'}${prefs.ptt ? ' (aperte para falar ativo)' : ''}">${ic(V.muted ? 'micOff' : 'mic')}</button>
    <button class="icon-btn ${V.deaf ? 'on' : ''}" data-act="deafen" data-tip="${V.deaf ? 'Ativar áudio' : 'Desativar áudio'}">${ic(V.deaf ? 'headOff' : 'head')}</button>
    <button class="icon-btn" data-act="settings" data-tip="Configurações">${ic('gear')}</button>`;
}
function viewingRoom() { const v = S.view; return V.room && ((v.kind === 'dm' && v.id === V.room) || (v.kind === 'group' && v.cid === V.room)); }
function renderVoiceBar() {
  const bar = $('#voiceBar');
  if (!V.room) { bar.hidden = true; return; }
  bar.hidden = false;
  const here = viewingRoom();
  bar.innerHTML = `
    <div class="vb-top"><div class="vb-status"><b>${netDot()}${V.calling ? 'Chamando...' : 'Voz conectada'}</b><button class="vb-room" data-act="openStage" ${here ? 'disabled' : 'data-tip="Ir para a sala"'}>${esc(roomName(V.room))}</button></div>
    <button class="icon-btn vb-hang" data-act="leaveVoice" data-tip="Sair da call">${ic('hang')}</button></div>
    <div class="vb-btns">
      <button class="btn sm ${V.cam ? 'on' : ''}" data-act="toggleCam" data-tip="${V.cam ? 'Desligar câmera' : 'Ligar câmera'}">${ic(V.cam ? 'cam' : 'camOff')}</button>
      <button class="btn sm ${V.screen ? 'on' : ''}" data-act="toggleScreen" data-tip="${V.screen ? 'Parar de compartilhar' : 'Compartilhar tela'}">${ic('screen')}</button>
      <button class="btn sm" data-act="voiceSettings" data-tip="Configurar voz e vídeo">${ic('gear')}</button>
    </div>`;
}
/* qualidade da conexão na call: ping e perda de pacotes de áudio, medidos a cada 3 s */
const NET = { rtt: null, loss: 0, prev: { lost: 0, recv: 0 } };
function netDot() {
  if (NET.rtt === null) return `<i class="net-dot" data-tip="Medindo a conexão..."></i>`;
  const bad = NET.rtt > 250 || NET.loss > 8, meh = NET.rtt > 120 || NET.loss > 3;
  const lvl = bad ? 'bad' : meh ? 'meh' : 'ok';
  const txt = bad ? 'Conexão ruim' : meh ? 'Conexão razoável' : 'Conexão boa';
  return `<i class="net-dot ${lvl}" data-tip="${txt} · ping ${Math.round(NET.rtt)} ms · perda ${NET.loss.toFixed(1)}%"></i>`;
}
setInterval(async () => {
  if (!V.room || !V.peers.size) { if (NET.rtt !== null) { NET.rtt = null; renderVoiceBar(); } return; }
  const rtts = []; let lost = 0, recv = 0;
  for (const p of V.peers.values()) {
    try {
      (await p.pc.getStats()).forEach(r => {
        if (r.type === 'candidate-pair' && r.nominated && r.state === 'succeeded' && typeof r.currentRoundTripTime === 'number') rtts.push(r.currentRoundTripTime * 1000);
        if (r.type === 'inbound-rtp' && r.kind === 'audio') { lost += r.packetsLost || 0; recv += r.packetsReceived || 0; }
      });
    } catch {}
  }
  const dl = Math.max(0, lost - NET.prev.lost), dr = Math.max(0, recv - NET.prev.recv);
  NET.prev = { lost, recv };
  NET.loss = dl + dr ? 100 * dl / (dl + dr) : 0;
  NET.rtt = rtts.length ? Math.max(...rtts) : null;
  const dot = $('#voiceBar .net-dot'); if (dot) dot.outerHTML = netDot();
}, 3000);

/* ---------- principal ---------- */
let mainKey = null;
function renderMain() {
  const v = S.view;
  const key = v.kind === 'friends' ? 'friends' : v.kind === 'dm' ? 'dm:' + v.id : 'g:' + v.gid + ':' + v.cid;
  const main = $('#main');
  if (key !== mainKey) {
    if (mainKey && viewingCidForKey(mainKey)) S.drafts[viewingCidForKey(mainKey)] = $('#composer')?.value || '';
    mainKey = key; S.reply = null; S.editing = null;
    if (v.kind === 'friends') main.innerHTML = `<header class="main-head" id="mhead"></header><div class="friends-body" id="fbody"></div>`;
    else if (v.kind === 'dm' || chan(v.gid, v.cid)?.type === 'text') {
      main.innerHTML = `<header class="main-head" id="mhead"></header><div id="stageSlot"></div><div id="msgs" role="log"></div><div class="composer-wrap" id="cwrap"></div>`;
      buildComposer(); const cid = viewingCid(); loadMessages(cid); markRead(cid);
      $('#msgs').addEventListener('scroll', onMsgsScroll);
    } else main.innerHTML = `<header class="main-head" id="mhead"></header><div id="stageSlot" style="flex:1;display:flex;min-height:0"></div>`;
  }
  renderHead();
  if (v.kind === 'friends') renderFriends();
  else { renderStageSlot(); if ($('#msgs')) { renderMessages(); renderTyping(); } }
}
function viewingCidForKey(k) { if (k.startsWith('dm:')) return k.slice(3); const [, gid, cid] = k.split(':'); return chan(gid, cid)?.type === 'text' ? cid : null; }

function renderHead() {
  const h = $('#mhead'); if (!h) return;
  const v = S.view; const tog = `<button class="icon-btn menu-toggle" data-act="drawer" aria-label="Menu">${ic('menu')}</button>`;
  if (v.kind === 'friends') {
    const tabs = [['online', 'Online'], ['todos', 'Todos'], ['pendentes', 'Pendentes' + (S.friends.incoming.length ? ` (${S.friends.incoming.length})` : '')]];
    h.innerHTML = `${tog}<span class="ttl hide-sm">${ic('users')}Amigos</span><nav class="tabs">${tabs.map(([k, l]) => `<button class="tab ${v.tab === k ? 'active' : ''}" data-act="ftab" data-tab="${k}">${l}</button>`).join('')}<button class="tab add ${v.tab === 'add' ? 'active' : ''}" data-act="ftab" data-tab="add">Adicionar amigo</button></nav>`;
  } else if (v.kind === 'dm') {
    const o = S.dms[v.id].members.find(m => m !== S.me.id); const u = user(o);
    const inCall = V.room === v.id;
    h.innerHTML = `${tog}<span class="ttl" style="cursor:pointer" data-act="profile" data-id="${o}">${av(o, 24)}${esc(u.displayName)}</span><span class="sub">${esc(u.customStatus || STATUS[u.status])}</span><span class="spacer"></span>
      ${inCall ? '' : `<button class="icon-btn" data-act="call" data-id="${v.id}" data-tip="Ligar">${ic('phone')}</button><button class="icon-btn" data-act="call" data-video="1" data-id="${v.id}" data-tip="Chamada de vídeo">${ic('cam')}</button>`}
      <button class="icon-btn" data-act="profile" data-id="${o}" data-tip="Perfil">${ic('user')}</button>`;
  } else {
    const g = S.groups[v.gid], c = chan(v.gid, v.cid); if (!g || !c) return;
    h.innerHTML = `${tog}<span class="ttl">${ic(c.type === 'voice' ? 'voice' : 'hash')}${esc(c.name)}</span><span class="sub" ${c.topic ? `title="${esc(c.topic)}"` : ''}>${esc(c.topic || g.name)}</span>${c.slowmode ? `<span class="slow-pill" data-tip="Modo lento: uma mensagem a cada ${esc(slowLabel(c.slowmode))}">🐢 ${esc(slowLabel(c.slowmode))}</span>` : ''}<span class="spacer"></span>
      ${gManager(g) ? `<button class="icon-btn" data-act="groupSettings" data-tip="Configurações do grupo">${ic('gear')}</button>` : ''}
      <button class="icon-btn" data-act="invite" data-tip="Convidar">${ic('link')}</button>
      ${c.type === 'text' ? `<button class="icon-btn ${prefs.showMembers ? 'active' : ''}" data-act="toggleMembers" data-tip="${prefs.showMembers ? 'Esconder membros' : 'Mostrar membros'}">${ic('users')}</button>` : ''}`;
  }
}

function renderFriends() {
  const b = $('#fbody'); const tab = S.view.tab;
  const row = (id, acts, sub) => { const u = user(id); return `<div class="person" data-act="profile" data-id="${id}">${av(id, 40)}<div class="info"><b>${esc(u.displayName)} <span class="muted small" style="font-weight:400">@${esc(u.username)}</span></b><span>${esc(sub ?? (u.customStatus || STATUS[u.status]))}</span></div><div class="acts">${acts}</div></div>`; };
  const fa = id => `<button class="icon-btn" data-act="openDm" data-id="${id}" data-tip="Mensagem">${ic('msg')}</button><button class="icon-btn" data-act="callUser" data-id="${id}" data-tip="Ligar">${ic('phone')}</button><button class="icon-btn" data-act="friendMenu" data-id="${id}" data-tip="Mais">⋮</button>`;
  if (tab === 'add') {
    b.innerHTML = `<div class="add-friend"><h2>Adicionar amigo</h2><p class="muted">Digite o nome de usuário da pessoa. Seu nome de usuário é <b style="color:var(--text)">@${esc(S.me.username)}</b> <button class="link" data-act="copyMe">copiar</button></p>
      <form class="add-row" id="addForm"><input id="addName" placeholder="nome de usuário, ex.: joao.silva" autocomplete="off" maxlength="21"><button class="btn primary" type="submit">Enviar pedido</button></form>
      <p class="form-err" id="addErr" style="margin-top:8px;${S.addMsg?.ok ? 'color:var(--ok)' : ''}">${esc(S.addMsg?.text || '')}</p></div>
      <div class="empty" style="margin-top:30px"><div class="ill">👋</div><p>Quando seu amigo aceitar, ele aparece na lista e vocês já podem conversar e ligar.</p></div>`;
    $('#addForm').onsubmit = async e => {
      e.preventDefault(); const name = $('#addName').value.trim(); if (!name) return;
      const r = await emit('friend:request', { username: name });
      S.addMsg = { ok: r.ok, text: r.ok ? (r.accepted ? 'Vocês agora são amigos!' : `Pedido enviado para @${name.replace(/^@/, '')}.`) : r.erro };
      $('#addErr').style.color = r.ok ? 'var(--ok)' : ''; $('#addErr').textContent = S.addMsg.text;
      if (r.ok) $('#addName').value = '';
    };
    return;
  }
  if (tab === 'pendentes') {
    const inc = S.friends.incoming, out = S.friends.outgoing;
    b.innerHTML = (inc.length + out.length) ? `
      ${inc.length ? `<div class="list-h">Recebidos — ${inc.length}</div>${inc.map(id => row(id, `<button class="icon-btn" data-act="accept" data-id="${id}" data-tip="Aceitar" style="color:var(--ok)">${ic('check')}</button><button class="icon-btn" data-act="decline" data-id="${id}" data-tip="Recusar" style="color:var(--danger)">${ic('x')}</button>`, 'Quer ser seu amigo')).join('')}` : ''}
      ${out.length ? `<div class="list-h" style="margin-top:20px">Enviados — ${out.length}</div>${out.map(id => row(id, `<button class="icon-btn" data-act="cancelReq" data-id="${id}" data-tip="Cancelar">${ic('x')}</button>`, 'Aguardando resposta')).join('')}` : ''}`
      : `<div class="empty"><div class="ill">📭</div><p>Nenhum pedido pendente.</p></div>`;
    return;
  }
  let list = S.friends.friends.slice();
  if (tab === 'online') list = list.filter(id => user(id).status !== 'offline');
  list.sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  b.innerHTML = list.length ? `<div class="list-h">${tab === 'online' ? 'Online' : 'Todos os amigos'} — ${list.length}</div>${list.map(id => row(id, fa(id))).join('')}`
    : `<div class="empty"><div class="ill">${tab === 'online' ? '🌙' : '🫂'}</div><p>${tab === 'online' ? 'Nenhum amigo online agora.' : 'Você ainda não adicionou ninguém.'}</p><button class="btn primary" data-act="ftab" data-tab="add">Adicionar amigo</button></div>`;
}

function renderMembers() {
  const m = $('#members');
  const v = S.view; const g = v.kind === 'group' && S.groups[v.gid];
  if (!g || !prefs.showMembers || chan(v.gid, v.cid)?.type !== 'text') { m.hidden = true; return; }
  m.hidden = false;
  const ord = { online: 0, ocupado: 1, ausente: 2, offline: 3 };
  const list = g.members.slice().sort((a, b) => (ord[user(a).status] ?? 3) - (ord[user(b).status] ?? 3) || nameOf(a).localeCompare(nameOf(b)));
  const r = id => { const u = user(id); return `<div class="mem ${u.status === 'offline' ? 'off' : ''}" data-act="profile" data-id="${id}">${av(id, 32)}<div class="info"><b style="color:${esc(nameColor(id, g))}">${esc(u.displayName)} ${g.ownerId === id ? '<span class="crown" title="Dono do grupo">👑</span>' : ''}</b>${u.customStatus ? `<span>${esc(u.customStatus)}</span>` : ''}</div></div>`; };
  // como no Discord: quem está online aparece no primeiro cargo "separado" que tiver; offline fica no fim
  const placed = new Set(); let html = '';
  for (const role of (g.roles || []).filter(x => x.hoist)) {
    const ids = list.filter(id => !placed.has(id) && user(id).status !== 'offline' && (g.memberRoles?.[id] || []).includes(role.id));
    if (!ids.length) continue;
    ids.forEach(id => placed.add(id));
    html += `<div class="mem-h" style="${role.color ? `color:${esc(role.color)}` : ''}">${esc(role.name)} — ${ids.length}</div>${ids.map(r).join('')}`;
  }
  const on = list.filter(id => !placed.has(id) && user(id).status !== 'offline'), off = list.filter(id => user(id).status === 'offline');
  m.innerHTML = `${html}${on.length ? `<div class="mem-h">Online — ${on.length}</div>${on.map(r).join('')}` : ''}${off.length ? `<div class="mem-h">Offline — ${off.length}</div>${off.map(r).join('')}` : ''}`;
}

/* ---------- mensagens ---------- */
async function loadMessages(cid, older) {
  if (!cid || S.loading[cid]) return;
  if (S.msgs[cid] && !older) return renderMessages(true);
  S.loading[cid] = true;
  const before = older ? S.msgs[cid]?.[0]?.id : null;
  const r = await emit('messages:get', { cid, before });
  S.loading[cid] = false;
  if (!r.ok) return;
  const box = $('#msgs'); const prevH = box ? box.scrollHeight : 0, prevTop = box ? box.scrollTop : 0;
  S.msgs[cid] = older ? [...r.messages, ...(S.msgs[cid] || [])] : r.messages;
  S.more[cid] = r.more;
  if (viewingCid() !== cid) return;
  renderMessages(!older);
  if (older && box) box.scrollTop = box.scrollHeight - prevH + prevTop;
}
function onMsgsScroll(e) { const b = e.target; const cid = viewingCid(); if (b.scrollTop < 60 && S.more[cid] && !S.loading[cid]) loadMessages(cid, true); }

function md(text) {
  let s = esc(text);
  const blocks = [];
  s = s.replace(/```(?:\w+\n)?([\s\S]*?)```/g, (_, c) => { blocks.push(`<pre>${c.replace(/^\n/, '')}</pre>`); return `\u0000${blocks.length - 1}\u0000`; });
  s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>')
    .replace(/~~([^~\n]+)~~/g, '<s>$1</s>')
    .replace(/\|\|([^|\n]+)\|\|/g, '<span class="spoiler" style="background:var(--text);color:var(--text);border-radius:3px;cursor:pointer" onclick="this.style.color=\'var(--main)\'">$1</span>')
    .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
    .replace(/@([a-z0-9_.]{3,20})/gi, (m, n) => Object.values(S.users).some(u => u.username === n.toLowerCase()) ? `<span class="mention">@${n}</span>` : m);
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => blocks[i]);
}
const JOIN_LINES = ['{n} entrou no grupo. Dá um oi!', '{n} chegou chegando. 🎉', 'Bem-vindo, {n}! Pega uma cadeira.', '{n} apareceu do nada.', 'Um {n} selvagem apareceu!', '{n} pousou no grupo. 🛬', 'Todo mundo dá as boas-vindas para {n}!', '{n} acabou de chegar. Alguém faz um café.'];
const onlyEmoji = t => t && t.length <= 12 && /^(\p{Extended_Pictographic}|️|‍|\s)+$/u.test(t);

function renderMessages(forceBottom) {
  const box = $('#msgs'); const cid = viewingCid(); if (!box || !cid) return;
  const list = S.msgs[cid];
  if (!list) { box.innerHTML = '<div class="empty">Carregando...</div>'; return; }
  const atBottom = forceBottom || box.scrollHeight - box.scrollTop - box.clientHeight < 120;
  const prevTop = box.scrollTop;
  let html = '';
  if (!S.more[cid]) {
    if (S.dms[cid]) { const o = S.dms[cid].members.find(m => m !== S.me.id); const u = user(o); html += `<div class="msgs-start">${av(o, 80, false)}<h2>${esc(u.displayName)}</h2><p>Este é o começo da sua conversa com <b>@${esc(u.username)}</b>.</p></div>`; }
    else { const c = chan(S.view.gid, cid); html += `<div class="msgs-start"><div class="big-ic">${ic('hash')}</div><h2>Bem-vindo a #${esc(c?.name)}</h2><p>Este é o começo do canal #${esc(c?.name)}.</p></div>`; }
  }
  let prev = null, lastDay = '';
  const g = S.view.kind === 'group' ? S.groups[S.view.gid] : null;
  const mentionRe = new RegExp('@' + S.me.username + '\\b', 'i');
  for (const m of list) {
    const day = new Date(m.ts).toDateString();
    if (day !== lastDay) { html += `<div class="day-sep">${fmtDay(m.ts)}</div>`; lastDay = day; prev = null; }
    if (m.system === 'join') {
      const n = `<b data-act="profile" data-id="${m.authorId}" style="color:${esc(nameColor(m.authorId, g))}">${esc(nameOf(m.authorId))}</b>`;
      const line = JOIN_LINES[[...m.id].reduce((a, c) => a + c.charCodeAt(0), 0) % JOIN_LINES.length].replace('{n}', n);
      html += `<div class="msg sys" id="m-${m.id}"><span class="sys-ic">${ic('reply').replace('<svg', '<svg style="transform:scaleX(-1) rotate(180deg)"')}</span><span class="sys-t">${line} <time>${fmtDay(m.ts) === 'Hoje' ? 'Hoje às ' : fmtDay(m.ts) + ' '}${fmtTime(m.ts)}</time></span></div>`;
      prev = null; continue;
    }
    const head = !prev || prev.authorId !== m.authorId || m.ts - prev.ts > 7 * 60e3 || m.replyTo;
    const u = user(m.authorId), mine = m.authorId === S.me.id;
    const canDel = mine || (g && gCan(g, 'manageMessages'));
    const ref = m.replyTo && list.find(x => x.id === m.replyTo);
    const reacts = Object.entries(m.reactions || {});
    const editing = S.editing === m.id;
    const big = onlyEmoji(m.content);
    html += `<div class="msg ${head ? 'head' : ''} ${mine ? 'mine' : ''} ${!mine && mentionRe.test(m.content) ? 'mentioned' : ''}" data-mid="${m.id}" id="m-${m.id}">
      ${head ? av(m.authorId, 40, false) : `<div class="gutter">${fmtTime(m.ts)}</div>`}
      <div class="mc" style="min-width:0">
        ${m.replyTo ? `<div class="reply-ref" data-act="jump" data-id="${m.replyTo}">${ic('reply').replace('<svg', '<svg style="width:14px;height:14px;transform:scaleX(-1)"')}${ref ? `<b>${esc(nameOf(ref.authorId))}</b> ${esc((ref.content || '🖼️ imagem').slice(0, 90))}` : '<i>mensagem apagada</i>'}</div>` : ''}
        ${head ? `<div class="who"><b data-act="profile" data-id="${m.authorId}" style="color:${esc(nameColor(m.authorId, g))}">${esc(u.displayName)}</b>${g && g.ownerId === m.authorId ? '<span class="crown">👑</span>' : ''}<time>${fmtDay(m.ts) === 'Hoje' ? '' : fmtDay(m.ts) + ' '}${fmtTime(m.ts)}</time></div>` : ''}
        ${editing ? `<div class="edit-box"><textarea id="editArea" rows="2">${esc(m.content)}</textarea><span class="small muted">Enter salva · Esc cancela</span></div>`
          : m.content ? `<div class="body" style="${big ? 'font-size:2.4em;line-height:1.2' : ''}">${md(m.content)}${m.edited ? ' <span class="ed">(editado)</span>' : ''}</div>` : ''}
        ${m.image ? `<img class="img" src="${esc(m.image)}" alt="Imagem enviada por ${esc(u.displayName)}" data-act="zoom" loading="lazy">` : ''}
        ${reacts.length ? `<div class="reacts">${reacts.map(([e, us]) => `<button class="react ${us.includes(S.me.id) ? 'mine' : ''}" data-act="react" data-id="${m.id}" data-emoji="${esc(e)}" title="${esc(us.map(nameOf).join(', '))}">${esc(e)} ${us.length}</button>`).join('')}</div>` : ''}
      </div>
      <div class="msg-tools">
        ${QUICK.slice(0, 3).map(e => `<button data-act="react" data-id="${m.id}" data-emoji="${e}" title="Reagir com ${e}">${e}</button>`).join('')}
        <button data-act="reactPick" data-id="${m.id}" title="Mais reações">${ic('smile')}</button>
        <button data-act="reply" data-id="${m.id}" title="Responder">${ic('reply')}</button>
        ${mine ? `<button data-act="edit" data-id="${m.id}" title="Editar">${ic('edit')}</button>` : ''}
        ${canDel ? `<button data-act="delMsg" data-id="${m.id}" title="Apagar" style="color:var(--danger)">${ic('trash')}</button>` : ''}
      </div>
    </div>`;
    prev = m;
  }
  box.innerHTML = html;
  if (atBottom) box.scrollTop = box.scrollHeight; else box.scrollTop = prevTop;
  $$('img.img', box).forEach(img => img.addEventListener('load', () => { if (atBottom) box.scrollTop = box.scrollHeight; }, { once: true }));
  const ea = $('#editArea');
  if (ea) { ea.focus(); ea.setSelectionRange(ea.value.length, ea.value.length); ea.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(ea.value); } if (e.key === 'Escape') { S.editing = null; renderMessages(); } }; }
}
async function saveEdit(content) {
  const id = S.editing; S.editing = null;
  const r = await emit('message:edit', { cid: viewingCid(), id, content });
  if (!r.ok) toast(r.erro, true); renderMessages();
  $('#composer')?.focus();
}
function renderTyping() {
  const el = $('#typing'); const cid = viewingCid(); if (!el || !cid) return;
  const who = Object.keys(S.typing[cid] || {}).filter(u => u !== S.me.id).map(nameOf);
  el.innerHTML = !who.length ? '' : who.length === 1 ? `<b>${esc(who[0])}</b> está digitando...` : who.length <= 3 ? `<b>${who.map(esc).join(', ')}</b> estão digitando...` : 'Várias pessoas estão digitando...';
}

/* ---------- compositor ---------- */
function buildComposer() {
  const cid = viewingCid();
  const place = S.dms[cid] ? `Conversar com @${user(S.dms[cid].members.find(m => m !== S.me.id)).username}` : `Conversar em #${chan(S.view.gid, cid)?.name}`;
  $('#cwrap').innerHTML = `<div id="replyBar"></div>
    <div class="composer">
      <button class="icon-btn" data-act="attach" data-tip="Enviar imagem">${ic('clip')}</button>
      <textarea id="composer" rows="1" placeholder="${esc(place)}" maxlength="4000" aria-label="${esc(place)}"></textarea>
      <button class="icon-btn" data-act="emojiPick" data-tip="Emoji">${ic('smile')}</button>
      <button class="icon-btn" data-act="sendBtn" data-tip="Enviar">${ic('send')}</button>
    </div><div class="typing" id="typing"></div>`;
  const ta = $('#composer'); ta.value = S.drafts[cid] || '';
  const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.min(220, ta.scrollHeight) + 'px'; };
  fit();
  let lastTyping = 0;
  ta.addEventListener('input', () => { fit(); if (Date.now() - lastTyping > 2500 && ta.value.trim()) { lastTyping = Date.now(); socket.emit('typing', { cid: viewingCid() }); } });
  ta.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendMessage(); }
    if (e.key === 'Escape' && S.reply) { S.reply = null; renderReplyBar(); }
    if (e.key === 'ArrowUp' && !ta.value) {
      const mine = (S.msgs[viewingCid()] || []).filter(m => m.authorId === S.me.id && m.content).pop();
      if (mine) { e.preventDefault(); S.editing = mine.id; renderMessages(); }
    }
  });
  ta.addEventListener('paste', e => { const f = [...(e.clipboardData?.files || [])].find(f => f.type.startsWith('image/')); if (f) { e.preventDefault(); sendImage(f); } });
  const main = $('#main');
  main.ondragover = e => { if ([...e.dataTransfer.items].some(i => i.kind === 'file')) { e.preventDefault(); if (!$('.drop-hint')) main.insertAdjacentHTML('beforeend', '<div class="drop-hint">Solte a imagem para enviar</div>'); } };
  main.ondragleave = e => { if (e.target === main || !main.contains(e.relatedTarget)) $('.drop-hint')?.remove(); };
  main.ondrop = e => { e.preventDefault(); $('.drop-hint')?.remove(); const f = [...e.dataTransfer.files].find(f => f.type.startsWith('image/')); if (f && viewingCid()) sendImage(f); };
  if (matchMedia('(pointer: fine)').matches) setTimeout(() => ta.focus(), 30);
  renderReplyBar();
}
function renderReplyBar() {
  const rb = $('#replyBar'); if (!rb) return;
  const m = S.reply && (S.msgs[viewingCid()] || []).find(x => x.id === S.reply);
  rb.innerHTML = m ? `<div class="reply-bar"><span>Respondendo a <b style="color:var(--text)">${esc(nameOf(m.authorId))}</b></span><button class="icon-btn" style="width:24px;height:24px" data-act="cancelReply">${ic('x')}</button></div>` : '';
}
async function sendMessage(image) {
  const ta = $('#composer'); const cid = viewingCid(); if (!ta || !cid) return;
  const content = image ? '' : ta.value.trim();
  if (!content && !image) { const c = ta.closest('.composer'); c.classList.remove('nudge'); void c.offsetWidth; c.classList.add('nudge'); ta.focus(); return; }
  if (content === '/limpar') { ta.value = ''; return; }
  const r = await emit('message:send', { cid, content, image, replyTo: S.reply });
  if (!r.ok) return toast(r.erro, true);
  if (!image) { ta.value = ''; ta.style.height = 'auto'; S.drafts[cid] = ''; }
  S.reply = null; renderReplyBar();
}
async function sendImage(file) {
  toast('Enviando imagem...');
  const url = await uploadImage(file); if (url) sendMessage(url);
}

/* =============== modais e menus =============== */
function modal(html, onMount) {
  const root = $('#modalRoot');
  const back = document.createElement('div'); back.className = 'modal-back';
  back.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  root.appendChild(back);
  const close = () => { back.remove(); document.removeEventListener('keydown', esc_); };
  const esc_ = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', esc_);
  back.addEventListener('mousedown', e => { if (e.target === back) close(); });
  $$('[data-close]', back).forEach(b => b.onclick = close);
  onMount && onMount(back, close);
  setTimeout(() => $('input, textarea', back)?.focus(), 40);
  return close;
}
function confirmBox(title, text, okLabel = 'Confirmar', danger = true) {
  return new Promise(res => {
    modal(`<div class="modal-h"><h2>${esc(title)}</h2><p>${esc(text)}</p></div><div class="modal-f"><button class="btn ghost" data-close>Cancelar</button><button class="btn ${danger ? 'danger' : 'primary'}" id="cOk">${esc(okLabel)}</button></div>`,
      (m, close) => { $('#cOk', m).onclick = () => { close(); res(true); }; $$('[data-close]', m).forEach(b => b.addEventListener('click', () => res(false))); });
  });
}
function closePops() { $('#popRoot').innerHTML = ''; }
function pop(html, anchor, cls = 'menu', place = 'below') {
  closePops();
  const p = document.createElement('div'); p.className = 'pop ' + cls; p.innerHTML = html;
  $('#popRoot').appendChild(p);
  const r = anchor.getBoundingClientRect(), pw = p.offsetWidth, ph = p.offsetHeight;
  let x = place === 'right' ? r.right + 8 : r.left, y = place === 'right' ? r.top : place === 'above' ? r.top - ph - 8 : r.bottom + 6;
  x = clamp(x, 8, innerWidth - pw - 8); y = clamp(y, 8, innerHeight - ph - 8);
  p.style.left = x + 'px'; p.style.top = y + 'px';
  return p;
}
document.addEventListener('mousedown', e => { if (!e.target.closest('.pop') && !e.target.closest('[data-act]')) closePops(); });

function emojiPicker(anchor, onPick) {
  const p = pop(`<div class="emoji-grid">${EMOJIS.map(e => `<button data-e="${e}">${e}</button>`).join('')}</div>`, anchor, 'emoji', 'above');
  p.onclick = e => { const b = e.target.closest('[data-e]'); if (b) { onPick(b.dataset.e); closePops(); } };
}

function profileCard(id, g) {
  const u = user(id);
  const banner = u.banner ? (isImg(u.banner) ? `background-image:url('${esc(u.banner)}')` : `background:${esc(u.banner)}`) : `background:${esc(u.color)}`;
  const th = Array.isArray(u.theme) && u.theme.length === 2 ? `background:linear-gradient(170deg, ${esc(u.theme[0])}, ${esc(u.theme[1])})` : '';
  const roles = g && g.members.includes(id) ? gRoles(g, id) : [];
  return `<div class="profile-prev ${th ? 'themed' : ''}" style="${th}"><div class="banner" style="${banner}"></div><div class="pbody">${av(id, 80)}<h3>${esc(u.displayName)}</h3><div class="un">@${esc(u.username)}${u.pronouns ? ` · ${esc(u.pronouns)}` : ''}</div>
    ${u.customStatus ? `<div style="margin-top:6px">${esc(u.customStatus)}</div>` : ''}
    <div class="bio">${u.bio ? md(u.bio) : '<span class="muted">Sem bio.</span>'}${u.createdAt ? `<div class="muted small" style="margin-top:8px">No Discordia desde ${new Date(u.createdAt).toLocaleDateString('pt-BR')}</div>` : ''}</div>
    ${g && g.members.includes(id) ? `<div class="pf-roles"><div class="pf-h">${roles.length ? 'Cargos' : 'Sem cargos'}${g.ownerId === id ? ' · 👑 dono' : ''}</div>${roles.map(r => `<span class="role-chip"><i style="background:${esc(r.color || 'var(--muted)')}"></i>${esc(r.name)}</span>`).join('')}</div>` : ''}
    </div></div>`;
}
function openProfile(id, anchor) {
  const isMe = id === S.me.id, fr = S.friends.friends.includes(id), inc = S.friends.incoming.includes(id), out = S.friends.outgoing.includes(id);
  const acts = isMe ? `<button class="btn primary sm" data-act="settings" data-tab="perfil">Editar perfil</button>`
    : fr ? `<button class="btn primary sm" data-act="openDm" data-id="${id}">${ic('msg')}Mensagem</button><button class="btn sm" data-act="callUser" data-id="${id}">${ic('phone')}Ligar</button>`
    : inc ? `<button class="btn primary sm" data-act="accept" data-id="${id}">Aceitar pedido</button>`
    : out ? `<button class="btn sm" disabled>Pedido enviado</button>`
    : `<button class="btn primary sm" data-act="addUser" data-id="${id}">${ic('plus')}Adicionar amigo</button>`;
  const g = curGroup();
  const inG = g && !isMe && g.members.includes(id) && gAbove(g, id);
  const mod = `${inG && gCan(g, 'manageRoles') ? `<button class="btn sm" data-act="memberRoles" data-id="${id}">${ic('shield')}Cargos</button>` : ''}${inG && gCan(g, 'kick') ? `<button class="btn danger sm" data-act="kick" data-id="${id}">Expulsar</button>` : ''}${inG && gCan(g, 'ban') ? `<button class="btn danger sm" data-act="ban" data-id="${id}">Banir</button>` : ''}`;
  pop(`${profileCard(id, g)}<div class="acts">${acts}${mod}</div>`, anchor, 'profile', anchor.closest('#members') ? 'left' : 'right');
  const p = $('.pop'); if (anchor.closest('#members')) { const r = anchor.getBoundingClientRect(); p.style.left = clamp(r.left - p.offsetWidth - 10, 8, innerWidth - p.offsetWidth - 8) + 'px'; }
}

function groupModal(g) {
  const editing = !!g;
  let icon = g?.icon || '', color = g?.color || COLORS[0];
  const friends = S.friends.friends;
  modal(`<div class="modal-h"><h2>${editing ? 'Configurações do grupo' : 'Criar um grupo'}</h2><p>${editing ? 'Mude o nome, o ícone e a cor.' : 'Um grupo tem canais de texto e salas de voz para você e seus amigos.'}</p></div>
    <div class="modal-b">
      <div class="icon-pick"><div class="icon-preview" id="gPrev"></div><div style="display:grid;gap:8px;flex:1"><div class="colors" id="gColors">${COLORS.map(c => `<button type="button" data-c="${c}" style="background:${c}" aria-label="Cor ${c}"></button>`).join('')}<input type="color" id="gColor" aria-label="Outra cor"></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" id="gImg" type="button">Enviar imagem</button><button class="btn sm ghost" id="gClr" type="button">Usar iniciais</button></div></div></div>
      <div class="emoji-grid" id="gEmo">${GROUP_EMOJIS.map(e => `<button type="button" data-e="${e}">${e}</button>`).join('')}</div>
      <label class="field">Nome do grupo<input id="gName" maxlength="40" value="${esc(g?.name || (S.me.displayName + ' e amigos'))}"></label>
      ${!editing && friends.length ? `<div class="field">Adicionar amigos agora<div class="pick-list">${friends.map(id => `<label class="pick">${av(id, 32)}<span>${esc(nameOf(id))}</span><input type="checkbox" value="${id}"></label>`).join('')}</div></div>` : ''}
      ${editing ? `<div class="field">Código de convite<div class="code-box"><code>${esc(g.invite)}</code><button class="btn sm" id="gCopy" type="button">Copiar</button><button class="btn sm ghost" id="gNew" type="button">Gerar novo</button></div></div>` : ''}
      ${editing ? `<div class="field">Membros (${g.members.length})<div class="pick-list">${g.members.map(id => `<div class="pick">${av(id, 32)}<span style="flex:1">${esc(nameOf(id))}${g.ownerId === id ? ' 👑' : ''}</span>${id !== S.me.id ? `<button class="btn sm danger" data-kick="${id}" type="button">Remover</button>` : ''}</div>`).join('')}</div></div>` : ''}
    </div>
    <div class="modal-f">${editing ? `<button class="btn danger" id="gDel" style="margin-right:auto">Apagar grupo</button>` : ''}<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="gOk">${editing ? 'Salvar' : 'Criar grupo'}</button></div>`,
  (m, close) => {
    const draw = () => {
      const p = $('#gPrev', m);
      if (isImg(icon)) { p.style.background = `center/cover url('${icon}')`; p.textContent = ''; }
      else { p.style.background = color; p.textContent = icon || ($('#gName', m).value || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase(); }
      $$('#gColors button', m).forEach(b => b.classList.toggle('on', b.dataset.c === color));
    };
    $('#gColor', m).value = color;
    $('#gColors', m).onclick = e => { const b = e.target.closest('[data-c]'); if (b) { color = b.dataset.c; if (isImg(icon)) icon = ''; draw(); } };
    $('#gColor', m).oninput = e => { color = e.target.value; if (isImg(icon)) icon = ''; draw(); };
    $('#gEmo', m).onclick = e => { const b = e.target.closest('[data-e]'); if (b) { icon = b.dataset.e; draw(); } };
    $('#gName', m).oninput = draw;
    $('#gClr', m).onclick = () => { icon = ''; draw(); };
    $('#gImg', m).onclick = async () => { const f = await pickFile(); if (!f) return; const url = await uploadImage(f, { max: 256, square: true }); if (url) { icon = url; draw(); } };
    draw();
    if (editing) {
      $('#gCopy', m).onclick = () => copy(g.invite, 'Código copiado.');
      $('#gNew', m).onclick = async () => { const r = await act('group:update', { gid: g.id, newInvite: true }); if (r.ok) $('code', m).textContent = r.group.invite; };
      $$('[data-kick]', m).forEach(b => b.onclick = async () => { if (await confirmBox('Remover membro', `Remover ${nameOf(b.dataset.kick)} do grupo?`, 'Remover')) { await act('group:kick', { gid: g.id, userId: b.dataset.kick }); b.closest('.pick').remove(); } });
      $('#gDel', m).onclick = async () => { if (await confirmBox('Apagar grupo', `"${g.name}" e todas as mensagens serão apagados para todo mundo. Não dá para desfazer.`, 'Apagar grupo')) { close(); await act('group:delete', { gid: g.id }); } };
    }
    $('#gOk', m).onclick = async () => {
      const name = $('#gName', m).value.trim(); if (!name) return toast('Dê um nome ao grupo.', true);
      if (editing) { const r = await act('group:update', { gid: g.id, name, icon, color }, 'Grupo atualizado.'); if (r.ok) close(); }
      else {
        const members = $$('.pick input:checked', m).map(i => i.value);
        const r = await act('group:create', { name, icon, color, members });
        if (r.ok) { close(); S.groups[r.group.id] = r.group; go({ kind: 'group', gid: r.group.id, cid: firstText(r.group) }); toast('Grupo criado! Convide mais gente pelo código.'); }
      }
    };
  });
}
function joinModal() {
  modal(`<div class="modal-h"><h2>Entrar em um grupo</h2><p>Cole o código de convite que seu amigo te mandou.</p></div>
    <div class="modal-b"><label class="field">Código de convite<input id="jCode" placeholder="ex.: 4F9A2C1B" maxlength="40" style="text-transform:uppercase;letter-spacing:.08em"></label><p class="form-err" id="jErr"></p></div>
    <div class="modal-f"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="jOk">Entrar no grupo</button></div>`,
  (m, close) => {
    const go_ = async () => { const r = await emit('group:join', { code: $('#jCode', m).value }); if (!r.ok) return $('#jErr', m).textContent = r.erro; close(); S.groups[r.group.id] = r.group; go({ kind: 'group', gid: r.group.id, cid: firstText(r.group) }); toast(`Você entrou em "${r.group.name}".`); };
    $('#jOk', m).onclick = go_; $('#jCode', m).onkeydown = e => { if (e.key === 'Enter') go_(); };
  });
}
function inviteModal(g) {
  const can = S.friends.friends.filter(id => !g.members.includes(id));
  modal(`<div class="modal-h"><h2>Convidar para ${esc(g.name)}</h2><p>Mande o código para quem tem conta no Discordia, ou adicione seus amigos direto.</p></div>
    <div class="modal-b">
      <div class="field">Código de convite<div class="code-box"><code>${esc(g.invite)}</code><button class="btn primary sm" id="iCopy">Copiar</button></div></div>
      ${can.length ? `<div class="field">Seus amigos<div class="pick-list">${can.map(id => `<label class="pick">${av(id, 32)}<span>${esc(nameOf(id))}</span><input type="checkbox" value="${id}"></label>`).join('')}</div></div>` : '<p class="muted small">Todos os seus amigos já estão neste grupo.</p>'}
    </div>
    <div class="modal-f"><button class="btn ghost" data-close>Fechar</button>${can.length ? '<button class="btn primary" id="iOk">Adicionar selecionados</button>' : ''}</div>`,
  (m, close) => {
    $('#iCopy', m).onclick = () => copy(g.invite, 'Código copiado. Seu amigo usa a bússola na barra da esquerda para entrar.');
    if ($('#iOk', m)) $('#iOk', m).onclick = async () => { const ids = $$('input:checked', m).map(i => i.value); if (!ids.length) return; const r = await act('group:invite', { gid: g.id, userIds: ids }, `${ids.length} amigo(s) adicionado(s).`); if (r.ok) close(); };
  });
}
function channelModal(gid, type, ch) {
  modal(`<div class="modal-h"><h2>${ch ? 'Editar canal' : 'Criar canal'}</h2>${ch ? '' : '<p>Canais de texto para conversar, salas de voz para call e compartilhar tela.</p>'}</div>
    <div class="modal-b">
      ${ch ? '' : `<label class="choice"><input type="radio" name="ct" value="text" ${type !== 'voice' ? 'checked' : ''}>${ic('hash')}<span><b>Texto</b><br><span class="muted small">Mensagens, imagens, emojis</span></span></label>
      <label class="choice"><input type="radio" name="ct" value="voice" ${type === 'voice' ? 'checked' : ''}>${ic('voice')}<span><b>Voz</b><br><span class="muted small">Call, câmera e compartilhamento de tela</span></span></label>`}
      <label class="field">Nome do canal<input id="cName" maxlength="32" value="${esc(ch?.name || '')}" placeholder="${type === 'voice' ? 'Sala de jogo' : 'novo-canal'}"></label>
      <div id="cText" ${(ch ? ch.type : type) === 'voice' ? 'hidden' : ''}>
        <label class="field">Tópico<input id="cTopic" maxlength="200" value="${esc(ch?.topic || '')}" placeholder="Sobre o que se fala aqui (aparece no topo do canal)"></label>
        <label class="field">Modo lento<select id="cSlow">${SLOW_OPTS.map(([v, l]) => `<option value="${v}" ${(ch?.slowmode || 0) === v ? 'selected' : ''}>${l}</option>`).join('')}</select><span class="muted small">Cada pessoa só manda uma mensagem a cada X tempo. Quem gerencia canais ou mensagens não espera.</span></label>
      </div>
    </div>
    <div class="modal-f">${ch ? '<button class="btn danger" id="cDel" style="margin-right:auto">Apagar canal</button>' : ''}<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="cOk">${ch ? 'Salvar' : 'Criar canal'}</button></div>`,
  (m, close) => {
    $$('input[name=ct]', m).forEach(i => i.onchange = () => { $('#cText', m).hidden = $('input[name=ct]:checked', m).value === 'voice'; });
    const ok = async () => {
      const name = $('#cName', m).value.trim(); if (!name) return;
      const extra = { topic: $('#cTopic', m).value, slowmode: +$('#cSlow', m).value };
      if (ch) { const r = await act('channel:update', { gid, cid: ch.id, name, ...extra }); if (r.ok) { close(); if ($('.gset')) drawGroupSettings(); } }
      else { const t = $('input[name=ct]:checked', m).value; const r = await act('channel:create', { gid, name, type: t, ...extra }); if (r.ok) { close(); if ($('.gset')) drawGroupSettings(); else if (t === 'text') go({ kind: 'group', gid, cid: r.channel.id }); } }
    };
    $('#cOk', m).onclick = ok; $('#cName', m).onkeydown = e => { if (e.key === 'Enter') ok(); };
    $('#cTopic', m).onkeydown = e => { if (e.key === 'Enter') ok(); };
    if (ch) $('#cDel', m).onclick = async () => { if (await confirmBox('Apagar canal', `Apagar #${ch.name} e todas as mensagens dele?`, 'Apagar')) { close(); act('channel:delete', { gid, cid: ch.id }); } };
  });
}
function newDmModal() {
  const fr = S.friends.friends;
  modal(`<div class="modal-h"><h2>Nova conversa</h2><p>Escolha um amigo.</p></div>
    <div class="modal-b">${fr.length ? `<div class="pick-list">${fr.map(id => `<button class="pick" style="border:0;background:none;width:100%;text-align:left" data-id="${id}">${av(id, 32)}<span>${esc(nameOf(id))} <span class="muted small">@${esc(user(id).username)}</span></span></button>`).join('')}</div>` : '<p class="muted">Adicione amigos primeiro.</p>'}</div>
    <div class="modal-f"><button class="btn ghost" data-close>Fechar</button></div>`,
  (m, close) => $$('.pick', m).forEach(b => b.onclick = () => { close(); openDm(b.dataset.id); }));
}
function statusModal() {
  modal(`<div class="modal-h"><h2>Status personalizado</h2></div>
    <div class="modal-b"><label class="field">O que você está fazendo?<input id="csTxt" maxlength="60" value="${esc(S.me.customStatus)}" placeholder="🎮 Jogando com a galera"></label></div>
    <div class="modal-f"><button class="btn ghost" id="csClr">Limpar</button><button class="btn primary" id="csOk">Salvar</button></div>`,
  (m, close) => {
    $('#csOk', m).onclick = async () => { await act('profile:update', { customStatus: $('#csTxt', m).value }); close(); };
    $('#csClr', m).onclick = async () => { await act('profile:update', { customStatus: '' }); close(); };
    $('#csTxt', m).onkeydown = e => { if (e.key === 'Enter') $('#csOk', m).click(); };
  });
}

/* =============== atualização (barra no topo) =============== */
const UPD = { build: null, web: false, desk: null, hidden: false };
function showUpd() {
  const bar = $('#updBar'); const on = !!(UPD.web || UPD.desk) && !UPD.hidden;
  bar.hidden = !on; document.body.classList.toggle('has-upd', on);
  if (!on) return;
  bar.innerHTML = `<span class="upd-t">${ic('refresh')}${UPD.desk ? `A versão <b>${esc(UPD.desk)}</b> do Discordia está pronta.` : 'Saiu uma versão nova do Discordia.'}</span>
    <button class="upd-go" data-act="updateNow">${UPD.desk ? 'Atualizar e reiniciar' : 'Atualizar agora'}</button>
    <button class="upd-x" id="updX" aria-label="Agora não" data-tip="Agora não">${ic('x')}</button>`;
  $('#updX').onclick = () => { UPD.hidden = true; showUpd(); };
}
if (DESK && DESK.onUpdate) {
  DESK.onUpdate(s => { if (s && s.ready) { UPD.desk = s.version; UPD.hidden = false; showUpd(); } });
  DESK.updateGet().then(s => { if (s && s.ready) { UPD.desk = s.version; showUpd(); } }).catch(() => {});
}

/* =============== cargos de um membro, banir =============== */
function rolePicker(g, uid, anchor) {
  const roles = (g.roles || []).filter(r => gEditRole(g, r));
  if (!roles.length) { toast(g.roles?.length ? 'Você não pode dar nenhum dos cargos que existem.' : 'Este grupo ainda não tem cargos. Crie em Configurações do grupo > Cargos.', true); return; }
  const p = pop(`<div class="pop-h">Cargos de ${esc(nameOf(uid))}</div>${roles.map(r => `<button data-r="${r.id}"><span style="display:flex;gap:8px;align-items:center"><i class="role-dot" style="background:${esc(r.color || 'var(--muted)')}"></i>${esc(r.name)}</span>${(g.memberRoles?.[uid] || []).includes(r.id) ? ic('check').replace('<svg', '<svg style="width:16px;height:16px"') : ''}</button>`).join('')}`, anchor, 'menu');
  p.onclick = async e => {
    const b = e.target.closest('[data-r]'); if (!b) return;
    const cur = new Set(g.memberRoles?.[uid] || []); cur.has(b.dataset.r) ? cur.delete(b.dataset.r) : cur.add(b.dataset.r);
    const r = await act('member:roles', { gid: g.id, userId: uid, roles: [...cur] });
    closePops(); if (r.ok && $('.gset') && gsTab === 'membros') drawGroupSettings();
  };
}
function banModal(g, uid) {
  modal(`<div class="modal-h"><h2>Banir ${esc(nameOf(uid))}</h2><p>A pessoa sai de "${esc(g.name)}" e não consegue voltar, nem com convite, até alguém revogar o banimento.</p></div>
    <div class="modal-b"><label class="field">Motivo (opcional)<input id="bnWhy" maxlength="200" placeholder="Só a moderação vê isso"></label></div>
    <div class="modal-f"><button class="btn ghost" data-close>Cancelar</button><button class="btn danger" id="bnOk">Banir</button></div>`,
  (m, close) => { $('#bnOk', m).onclick = async () => { const r = await act('group:ban', { gid: g.id, userId: uid, reason: $('#bnWhy', m).value }, `${nameOf(uid)} foi banido.`); if (r.ok) close(); }; });
}

/* =============== configurações do grupo =============== */
let gsGid = null, gsTab = 'geral', gsRole = null, gsSearch = '';
function openGroupSettings(gid, tab) {
  closeSettings(); gsGid = gid; gsTab = tab || 'geral'; gsRole = null; gsSearch = '';
  const el = document.createElement('div'); el.className = 'settings gset'; el.setAttribute('role', 'dialog');
  el.innerHTML = `<nav class="set-nav"><div class="set-nav-in" id="gsNav"></div></nav>
    <div class="set-body"><div class="set-body-in" id="setBody"></div></div>
    <div class="set-close"><button class="icon-btn" id="setX" aria-label="Fechar">${ic('x')}</button><span>ESC</span></div>`;
  document.body.appendChild(el);
  $('#setX').onclick = closeSettings;
  $('#gsNav').onclick = async e => {
    const b = e.target.closest('[data-gs]'); if (!b) return; const g = S.groups[gsGid]; if (!g) return;
    if (b.dataset.gs === 'apagar') { if (await confirmBox('Apagar grupo', `"${g.name}" e todas as mensagens serão apagados para todo mundo. Não dá para desfazer.`, 'Apagar grupo')) { closeSettings(); act('group:delete', { gid: g.id }); } return; }
    if (b.dataset.gs === 'sair') { if (await confirmBox('Sair do grupo', `Sair de "${g.name}"? Você pode voltar com um código de convite.`, 'Sair')) { closeSettings(); act('group:leave', { gid: g.id }); } return; }
    gsTab = b.dataset.gs; drawGroupSettings();
  };
  drawGroupSettings();
}
function drawGroupSettings() {
  const g = S.groups[gsGid]; if (!g) return closeSettings();
  const tabs = [['geral', 'Visão geral', gCan(g, 'manageServer')], ['cargos', 'Cargos', gCan(g, 'manageRoles')], ['membros', 'Membros', true], ['canais', 'Canais', gCan(g, 'manageChannels')], ['convites', 'Convites', true], ['banimentos', 'Banimentos', gCan(g, 'ban')]].filter(t => t[2]);
  if (!tabs.some(t => t[0] === gsTab)) gsTab = tabs[0][0];
  $('#gsNav').innerHTML = `<div class="gs-nav-g">${groupIcon(g).replace('class="inner"', 'class="inner gs-nav-ic"')}<b>${esc(g.name)}</b></div>
    ${tabs.map(([k, l]) => `<button data-gs="${k}" class="${gsTab === k ? 'active' : ''}">${l}</button>`).join('')}
    <h4></h4>${g.ownerId === S.me.id ? '<button data-gs="apagar" class="out">Apagar grupo</button>' : '<button data-gs="sair" class="out">Sair do grupo</button>'}`;
  const b = $('#setBody');
  const T = { geral: gsGeral, cargos: gsCargos, membros: gsMembros, canais: gsCanais, convites: gsConvites, banimentos: gsBans };
  T[gsTab](g, b);
}

function gsGeral(g, b) {
  const d = { icon: g.icon || '', color: g.color || COLORS[0], banner: g.banner || null };
  const texts = g.channels.filter(c => c.type === 'text');
  b.innerHTML = `<h2>Visão geral</h2>
    <div class="gs-hero" id="gsHero"></div>
    <div class="set-card">
      <div class="icon-pick"><div class="icon-preview" id="gPrev"></div><div style="display:grid;gap:8px;flex:1">
        <div class="colors" id="gColors">${COLORS.map(c => `<button type="button" data-c="${c}" style="background:${c}" aria-label="Cor ${c}"></button>`).join('')}<input type="color" id="gColor" aria-label="Outra cor" value="${esc(d.color)}"></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm primary" id="gImg" type="button">Enviar ícone (pode ser GIF)</button><button class="btn sm ghost" id="gClr" type="button">Usar iniciais</button></div></div></div>
      <div class="emoji-grid" id="gEmo">${GROUP_EMOJIS.map(e => `<button type="button" data-e="${e}">${e}</button>`).join('')}</div>
      <label class="field">Nome do grupo<input id="gName" maxlength="40" value="${esc(g.name)}"></label>
      <label class="field">Descrição<textarea id="gDesc" maxlength="300" placeholder="Sobre o que é este grupo? Aparece aqui e no cartão do grupo.">${esc(g.description || '')}</textarea></label>
    </div>
    <div class="set-card"><h3>Banner</h3><p class="muted small" style="margin:0">Aparece no topo da lista de canais, como no Discord. Pode ser imagem ou GIF animado.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn sm primary" id="gBan">Enviar banner</button><input type="color" id="gBanC" value="${d.banner && d.banner.startsWith('#') ? esc(d.banner) : '#6c7cff'}" title="Usar uma cor"><button class="btn sm ghost" id="gBanX">Sem banner</button></div></div>
    <div class="set-card"><h3>Boas-vindas</h3>
      ${setRow('Avisar quando alguém entrar', 'Manda uma mensagem divertida quando uma pessoa entra no grupo.', sw('gSys', g.systemJoin !== false))}
      <label class="field">Canal das boas-vindas<select id="gWel"><option value="">Primeiro canal de texto</option>${texts.map(c => `<option value="${c.id}" ${g.welcomeCid === c.id ? 'selected' : ''}>#${esc(c.name)}</option>`).join('')}</select></label>
    </div>
    <div class="gs-save"><button class="btn primary" id="gSave">Salvar alterações</button></div>`;
  const draw = () => {
    const name = $('#gName').value || g.name;
    const p = $('#gPrev');
    if (isImg(d.icon)) { p.style.background = `center/cover url('${d.icon}')`; p.textContent = ''; }
    else { p.style.background = d.color; p.textContent = d.icon || name.split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase(); }
    $$('#gColors button').forEach(x => x.classList.toggle('on', x.dataset.c === d.color));
    const ban = d.banner ? (isImg(d.banner) ? `background-image:url('${esc(d.banner)}')` : `background:${esc(d.banner)}`) : `background:linear-gradient(135deg, ${esc(d.color)}, color-mix(in srgb, ${esc(d.color)} 40%, #000))`;
    const icon = isImg(d.icon) ? `<div class="gs-hero-ic" style="background:center/cover url('${esc(d.icon)}')"></div>` : `<div class="gs-hero-ic" style="background:${esc(d.color)}">${esc(d.icon || name.split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase())}</div>`;
    $('#gsHero').innerHTML = `<div class="gs-hero-b" style="${ban}"></div><div class="gs-hero-in">${icon}<div><b>${esc(name)}</b><span>${g.members.length} ${g.members.length === 1 ? 'membro' : 'membros'}</span></div></div>${$('#gDesc').value ? `<p>${esc($('#gDesc').value)}</p>` : ''}`;
  };
  $('#gColors').onclick = e => { const x = e.target.closest('[data-c]'); if (x) { d.color = x.dataset.c; if (isImg(d.icon)) d.icon = ''; draw(); } };
  $('#gColor').oninput = e => { d.color = e.target.value; if (isImg(d.icon)) d.icon = ''; draw(); };
  $('#gEmo').onclick = e => { const x = e.target.closest('[data-e]'); if (x) { d.icon = x.dataset.e; draw(); } };
  $('#gName').oninput = draw; $('#gDesc').oninput = draw;
  $('#gClr').onclick = () => { d.icon = ''; draw(); };
  $('#gImg').onclick = async () => { const f = await pickFile(); if (!f) return; const url = await uploadImage(f, { max: 256, square: true }); if (url) { d.icon = url; draw(); } };
  $('#gBan').onclick = async () => { const f = await pickFile(); if (!f) return; toast('Enviando banner...'); const url = await uploadImage(f, { max: 1200 }); if (url) { d.banner = url; draw(); } };
  $('#gBanC').oninput = e => { d.banner = e.target.value; draw(); };
  $('#gBanX').onclick = () => { d.banner = null; draw(); };
  $('#gSave').onclick = () => act('group:update', { gid: g.id, name: $('#gName').value.trim() || g.name, icon: d.icon, color: d.color, description: $('#gDesc').value, banner: d.banner, systemJoin: $('#gSys').checked, welcomeCid: $('#gWel').value || null }, 'Grupo salvo.');
  draw();
}

function gsCargos(g, b) {
  const roles = g.roles || [];
  if (!roles.some(r => r.id === gsRole)) gsRole = roles[0]?.id || null;
  const r = roles.find(x => x.id === gsRole);
  const count = role => g.members.filter(m => (g.memberRoles?.[m] || []).includes(role.id)).length;
  const can = r && gEditRole(g, r);
  b.innerHTML = `<h2>Cargos</h2><p class="muted" style="margin-top:-6px">Cargos dão cor ao nome e permissões. Quem está mais acima na lista manda em quem está abaixo.</p>
    <div class="gs-roles">
      <div class="gs-rlist">
        <button class="btn primary sm" id="rNew">${ic('plus')}Criar cargo</button>
        ${roles.map(x => `<button class="gs-ritem ${x.id === gsRole ? 'on' : ''}" data-r="${x.id}"><i class="role-dot" style="background:${esc(x.color || 'var(--muted)')}"></i><span>${esc(x.name)}</span><small>${count(x)}</small></button>`).join('')}
        <div class="gs-every"><b>@todos</b><span>Todo mundo pode conversar, mandar imagens, entrar em calls e convidar amigos.</span></div>
      </div>
      <div class="set-card gs-red">${!r ? `<div class="empty" style="padding:30px 10px"><div class="ill">🛡️</div><p>Crie o primeiro cargo, tipo "Moderador" ou "Amigos de longa data".</p></div>` : `
        ${can ? '' : '<p class="gs-lock">🔒 Este cargo está no mesmo nível ou acima do seu. Só dá para ver.</p>'}
        <label class="field">Nome do cargo<input id="rName" maxlength="32" value="${esc(r.name)}" ${can ? '' : 'disabled'}></label>
        <div class="field">Cor<div class="colors" id="rColors"><button type="button" data-c="" class="${!r.color ? 'on' : ''} no-color" title="Sem cor">✕</button>${COLORS.map(c => `<button type="button" data-c="${c}" style="background:${c}" class="${r.color === c ? 'on' : ''}"></button>`).join('')}<input type="color" id="rColor" value="${esc(r.color || '#6c7cff')}" ${can ? '' : 'disabled'}></div></div>
        ${setRow('Mostrar separado', 'Quem tem este cargo aparece num grupo próprio na lista de membros.', sw('rHoist', r.hoist).replace('<input', `<input ${can ? '' : 'disabled'}`))}
        <h3 style="margin-top:8px">Permissões</h3>
        ${PERM_INFO.map(([k, l, dsc]) => setRow(l, dsc, sw('rp-' + k, r.perms.includes(k)).replace('<input', `<input data-perm="${k}" ${can && (g.ownerId === S.me.id || gCan(g, k)) ? '' : 'disabled'}`))).join('')}
        ${can ? `<div class="gs-save"><button class="btn sm" id="rUp" data-tip="Subir">${ic('up')}</button><button class="btn sm" id="rDown" data-tip="Descer">${ic('down')}</button><button class="btn danger sm" id="rDel" style="margin-right:auto">Apagar cargo</button><button class="btn primary" id="rSave">Salvar cargo</button></div>` : ''}`}
      </div>
    </div>`;
  $('#rNew').onclick = async () => { const x = await act('role:create', { gid: g.id, name: 'novo cargo', color: COLORS[(roles.length + 2) % COLORS.length] }); if (x.ok) { gsRole = x.role.id; drawGroupSettings(); setTimeout(() => { $('#rName')?.select(); }, 30); } };
  $$('.gs-ritem').forEach(x => x.onclick = () => { gsRole = x.dataset.r; drawGroupSettings(); });
  if (!r || !can) return;
  let color = r.color;
  $('#rColors').onclick = e => { const x = e.target.closest('[data-c]'); if (!x) return; color = x.dataset.c || null; $$('#rColors button').forEach(y => y.classList.toggle('on', y === x)); };
  $('#rColor').oninput = e => { color = e.target.value; $$('#rColors button').forEach(y => y.classList.remove('on')); };
  $('#rSave').onclick = async () => {
    const perms = $$('[data-perm]').filter(i => i.checked).map(i => i.dataset.perm);
    const x = await act('role:update', { gid: g.id, rid: r.id, name: $('#rName').value, color, hoist: $('#rHoist').checked, perms }, 'Cargo salvo.');
    if (x.ok) drawGroupSettings();
  };
  $('#rUp').onclick = async () => { await act('role:move', { gid: g.id, rid: r.id, dir: -1 }); drawGroupSettings(); };
  $('#rDown').onclick = async () => { await act('role:move', { gid: g.id, rid: r.id, dir: 1 }); drawGroupSettings(); };
  $('#rDel').onclick = async () => { if (await confirmBox('Apagar cargo', `Apagar o cargo "${r.name}"? Quem tem ele perde a cor e as permissões dele.`, 'Apagar')) { await act('role:delete', { gid: g.id, rid: r.id }); gsRole = null; drawGroupSettings(); } };
}

function gsMembros(g, b) {
  const q = gsSearch.toLowerCase();
  const list = g.members.filter(id => !q || nameOf(id).toLowerCase().includes(q) || user(id).username.includes(q))
    .sort((a, c) => gRank(g, a) - gRank(g, c) || nameOf(a).localeCompare(nameOf(c)));
  const canRoles = gCan(g, 'manageRoles'), canKick = gCan(g, 'kick'), canBan = gCan(g, 'ban');
  b.innerHTML = `<h2>Membros <span class="muted" style="font-weight:400;font-size:.6em">${g.members.length}</span></h2>
    <input class="input gs-search" id="mSearch" placeholder="Procurar membro" value="${esc(gsSearch)}">
    <div class="gs-mems">${list.map(id => {
      const u = user(id), roles = gRoles(g, id), me = id === S.me.id, over = me || gAbove(g, id);
      return `<div class="gs-mem">${av(id, 40)}<div class="info"><b style="color:${esc(nameColor(id, g))}">${esc(u.displayName)}${g.ownerId === id ? ' <span class="crown" title="Dono">👑</span>' : ''}</b><span>@${esc(u.username)}</span>
        <div class="chips">${roles.map(r => `<span class="role-chip"><i style="background:${esc(r.color || 'var(--muted)')}"></i>${esc(r.name)}${canRoles && over && gEditRole(g, r) ? `<button data-unrole="${r.id}" data-u="${id}" aria-label="Tirar cargo">✕</button>` : ''}</span>`).join('')}
        ${canRoles && over && (g.roles || []).length ? `<button class="role-chip add" data-addrole="${id}">+ cargo</button>` : ''}</div></div>
        <div class="acts">${!me && over && canKick ? `<button class="btn sm" data-gkick="${id}">Expulsar</button>` : ''}${!me && over && canBan ? `<button class="btn sm danger" data-gban="${id}">Banir</button>` : ''}</div></div>`;
    }).join('') || '<p class="muted">Ninguém com esse nome.</p>'}</div>`;
  const s = $('#mSearch'); s.oninput = () => { gsSearch = s.value; const pos = s.selectionStart; drawGroupSettings(); const n = $('#mSearch'); n.focus(); n.setSelectionRange(pos, pos); };
  $$('[data-addrole]').forEach(x => x.onclick = e => { e.stopPropagation(); rolePicker(g, x.dataset.addrole, x); });
  $$('[data-unrole]').forEach(x => x.onclick = async () => { const cur = (g.memberRoles?.[x.dataset.u] || []).filter(id => id !== x.dataset.unrole); await act('member:roles', { gid: g.id, userId: x.dataset.u, roles: cur }); drawGroupSettings(); });
  $$('[data-gkick]').forEach(x => x.onclick = async () => { const id = x.dataset.gkick; if (await confirmBox('Expulsar do grupo', `Expulsar ${nameOf(id)}? A pessoa pode voltar com um convite.`, 'Expulsar')) act('group:kick', { gid: g.id, userId: id }, 'Membro expulso.'); });
  $$('[data-gban]').forEach(x => x.onclick = () => banModal(g, x.dataset.gban));
}

function gsCanais(g, b) {
  const sec = (type, title) => {
    const list = g.channels.filter(c => c.type === type);
    return `<div class="set-card"><div class="gs-ch-h"><h3>${title}</h3><button class="btn sm primary" data-newch="${type}">${ic('plus')}Criar</button></div>
      ${list.map((c, i) => `<div class="gs-ch">${ic(type === 'voice' ? 'voice' : 'hash', 'ch')}<div class="info"><b>${esc(c.name)}</b>${c.topic || c.slowmode ? `<span>${esc(c.topic || '')}${c.slowmode ? ` ${c.topic ? '· ' : ''}🐢 ${esc(slowLabel(c.slowmode))}` : ''}</span>` : ''}${g.welcomeCid === c.id ? '<span>👋 canal das boas-vindas</span>' : ''}</div>
        <button class="icon-btn" data-mv="${c.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir">${ic('up')}</button><button class="icon-btn" data-mv="${c.id}" data-dir="1" ${i === list.length - 1 ? 'disabled' : ''} aria-label="Descer">${ic('down')}</button>
        <button class="btn sm" data-edch="${c.id}">Editar</button></div>`).join('')}</div>`;
  };
  b.innerHTML = `<h2>Canais</h2><p class="muted" style="margin-top:-6px">Organize a ordem, mude nomes, tópicos e o modo lento.</p>${sec('text', 'Canais de texto')}${sec('voice', 'Canais de voz')}`;
  $$('[data-newch]').forEach(x => x.onclick = () => channelModal(g.id, x.dataset.newch));
  $$('[data-edch]').forEach(x => x.onclick = () => channelModal(g.id, null, g.channels.find(c => c.id === x.dataset.edch)));
  $$('[data-mv]').forEach(x => x.onclick = () => act('channel:move', { gid: g.id, cid: x.dataset.mv, dir: +x.dataset.dir }));
}

function gsConvites(g, b) {
  b.innerHTML = `<h2>Convites</h2>
    <div class="set-card"><h3>Código do grupo</h3><p class="muted small" style="margin:0">Quem tem conta no Discordia entra pela bússola na barra da esquerda.</p>
      <div class="code-box gs-code"><code>${esc(g.invite)}</code><button class="btn primary sm" id="ivCopy">Copiar</button>${gCan(g, 'manageServer') ? '<button class="btn sm ghost" id="ivNew">Gerar outro</button>' : ''}</div>
      ${gCan(g, 'manageServer') ? '<p class="muted small" style="margin:0">Gerar outro desativa o código antigo na hora.</p>' : ''}</div>
    <div class="set-card"><h3>Adicionar amigos direto</h3><p class="muted small" style="margin:0">Seus amigos entram sem precisar do código.</p><div><button class="btn" id="ivFriends">${ic('users')}Escolher amigos</button></div></div>`;
  $('#ivCopy').onclick = () => copy(g.invite, 'Código copiado.');
  if ($('#ivNew')) $('#ivNew').onclick = async () => { if (await confirmBox('Gerar outro código', 'O código atual para de funcionar. Quem já está no grupo continua.', 'Gerar', false)) act('group:update', { gid: g.id, newInvite: true }, 'Código novo gerado.'); };
  $('#ivFriends').onclick = () => inviteModal(g);
}

function gsBans(g, b) {
  const bans = (g.bans || []).slice().sort((a, c) => c.ts - a.ts);
  b.innerHTML = `<h2>Banimentos <span class="muted" style="font-weight:400;font-size:.6em">${bans.length}</span></h2>
    ${bans.length ? `<div class="set-card">${bans.map(x => `<div class="gs-mem">${av(x.uid, 40, false)}<div class="info"><b>${esc(nameOf(x.uid))}</b><span>@${esc(user(x.uid).username)} · banido por ${esc(nameOf(x.by))} em ${new Date(x.ts).toLocaleDateString('pt-BR')}</span>${x.reason ? `<span>Motivo: ${esc(x.reason)}</span>` : ''}</div><div class="acts"><button class="btn sm" data-unban="${x.uid}">Revogar</button></div></div>`).join('')}</div>`
      : `<div class="empty"><div class="ill">🕊️</div><p>Ninguém banido. Paz no grupo.</p></div>`}`;
  $$('[data-unban]').forEach(x => x.onclick = async () => { if (await confirmBox('Revogar banimento', `${nameOf(x.dataset.unban)} vai poder voltar com um convite.`, 'Revogar', false)) act('group:unban', { gid: g.id, userId: x.dataset.unban }, 'Banimento revogado.'); });
}

/* =============== configurações =============== */
let setTab = 'perfil';
function closeSettings() { $('.settings')?.remove(); stopMicTest(); }
function openSettings(tab) {
  closeSettings(); if (tab) setTab = tab;
  const el = document.createElement('div'); el.className = 'settings'; el.setAttribute('role', 'dialog');
  el.innerHTML = `<nav class="set-nav"><div class="set-nav-in">
      <h4>Usuário</h4>
      <button data-st="perfil">Meu perfil</button><button data-st="conta">Conta</button>
      <h4>App</h4>
      <button data-st="aparencia">Aparência</button>${DESK ? '<button data-st="app">Aplicativo</button>' : ''}<button data-st="voz">Voz e vídeo</button><button data-st="notif">Notificações</button><button data-st="atalhos">Atalhos</button>
      <h4></h4><button data-st="sair" class="out">Sair da conta</button>
    </div></nav>
    <div class="set-body"><div class="set-body-in" id="setBody"></div></div>
    <div class="set-close"><button class="icon-btn" id="setX" aria-label="Fechar">${ic('x')}</button><span>ESC</span></div>`;
  document.body.appendChild(el);
  $('#setX').onclick = closeSettings;
  el.querySelector('.set-nav').onclick = e => { const b = e.target.closest('[data-st]'); if (!b) return; if (b.dataset.st === 'sair') return confirmBox('Sair da conta', 'Você vai precisar entrar de novo com usuário e senha.', 'Sair').then(ok => ok && logout()); setTab = b.dataset.st; drawSettings(); };
  drawSettings();
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('.settings') && !$('.modal-back') && !capturingKey) closeSettings(); });
const sw = (id, on) => `<label class="switch"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><span></span></label>`;
const setRow = (t, d, ctrl) => `<div class="set-row"><div class="t"><b>${t}</b>${d ? `<span>${d}</span>` : ''}</div>${ctrl}</div>`;
const seg = (id, opts, val) => `<div class="seg" id="${id}">${opts.map(([k, l]) => `<button type="button" data-v="${k}" class="${val === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
function bindSeg(id, fn) { const s = $('#' + id); if (!s) return; s.onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; $$('button', s).forEach(x => x.classList.toggle('on', x === b)); fn(b.dataset.v); }; }
function setPref(k, v) { prefs[k] = v; savePrefs(); applyPrefs(); render(); }
let capturingKey = false;

function drawSettings() {
  $$('.set-nav [data-st]').forEach(b => b.classList.toggle('active', b.dataset.st === setTab));
  const b = $('#setBody'); stopMicTest();
  if (setTab === 'perfil') {
    const u = S.me; let draft = { displayName: u.displayName, bio: u.bio, color: u.color, avatar: u.avatar, banner: u.banner, theme: u.theme || null };
    const TH = [['#2b1055', '#7597de'], ['#ff6b8b', '#f5b83d'], ['#0f2027', '#2c5364'], ['#3ee0c5', '#6c7cff'], ['#1d1d1d', '#b07cff'], ['#ff8a4c', '#e0517f']];
    b.innerHTML = `<h2>Meu perfil</h2><div class="profile-grid"><div class="set-card">
      <label class="field">Nome de exibição<input id="pName" maxlength="32" value="${esc(u.displayName)}"></label>
      <label class="field">Pronomes<input id="pPro" maxlength="40" value="${esc(u.pronouns || '')}" placeholder="ex.: ele/dele, ela/dela"></label>
      <div class="field">Foto de perfil<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm primary" id="pAv">Enviar foto ou GIF</button><button class="btn sm ghost" id="pAvX">Remover foto</button></div><span class="muted small">GIF animado continua animado. Até 8 MB.</span></div>
      <div class="field">Cor do perfil<div class="colors" id="pColors">${COLORS.map(c => `<button type="button" data-c="${c}" style="background:${c}"></button>`).join('')}<input type="color" id="pColor" value="${esc(u.color)}"></div></div>
      <div class="field">Banner<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn sm" id="pBan">Enviar imagem ou GIF</button><input type="color" id="pBanC" value="${u.banner && u.banner.startsWith('#') ? esc(u.banner) : '#6c7cff'}" title="Cor do banner"><button class="btn sm ghost" id="pBanX">Usar cor do perfil</button></div></div>
      <div class="field">Tema do perfil<div class="themes-mini" id="pTh"><button type="button" data-th="" class="none" title="Sem tema">✕</button>${TH.map(t => `<button type="button" data-th="${t.join(',')}" style="background:linear-gradient(170deg, ${t[0]}, ${t[1]})"></button>`).join('')}
        <span class="th-custom"><input type="color" id="pTh1" value="${esc(draft.theme?.[0] || '#2b1055')}" title="Cor de cima"><input type="color" id="pTh2" value="${esc(draft.theme?.[1] || '#7597de')}" title="Cor de baixo"></span></div><span class="muted small">Pinta o fundo do seu cartão de perfil com duas cores.</span></div>
      <label class="field">Sobre mim<textarea id="pBio" maxlength="190" placeholder="Conte um pouco sobre você. Dá para usar **negrito**, *itálico* e links.">${esc(u.bio)}</textarea></label>
      <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn primary" id="pSave">Salvar perfil</button></div>
    </div><div><p class="muted small" style="margin:0 0 8px">PRÉVIA</p><div id="pPrev"></div></div></div>`;
    const prev = () => {
      const old = S.users[u.id]; S.users[u.id] = { ...u, ...draft, displayName: $('#pName').value || u.username, bio: $('#pBio').value, pronouns: $('#pPro').value };
      $('#pPrev').innerHTML = profileCard(u.id); S.users[u.id] = old;
      $$('#pColors button').forEach(x => x.classList.toggle('on', x.dataset.c === draft.color));
      $$('#pTh [data-th]').forEach(x => x.classList.toggle('on', x.dataset.th === (draft.theme ? draft.theme.join(',') : '')));
    };
    prev();
    ['pName', 'pBio', 'pPro'].forEach(id => $('#' + id).oninput = prev);
    $('#pTh').onclick = e => { const x = e.target.closest('[data-th]'); if (!x) return; draft.theme = x.dataset.th ? x.dataset.th.split(',') : null; if (draft.theme) { $('#pTh1').value = draft.theme[0]; $('#pTh2').value = draft.theme[1]; } prev(); };
    ['pTh1', 'pTh2'].forEach(id => $('#' + id).oninput = () => { draft.theme = [$('#pTh1').value, $('#pTh2').value]; prev(); });
    $('#pColors').onclick = e => { const x = e.target.closest('[data-c]'); if (x) { draft.color = x.dataset.c; prev(); } };
    $('#pColor').oninput = e => { draft.color = e.target.value; prev(); };
    $('#pAv').onclick = async () => { const f = await pickFile(); if (!f) return; const url = await uploadImage(f, { max: 384, square: true }); if (url) { draft.avatar = url; prev(); } };
    $('#pAvX').onclick = () => { draft.avatar = null; prev(); };
    $('#pBan').onclick = async () => { const f = await pickFile(); if (!f) return; const url = await uploadImage(f, { max: 1200 }); if (url) { draft.banner = url; prev(); } };
    $('#pBanC').oninput = e => { draft.banner = e.target.value; prev(); };
    $('#pBanX').onclick = () => { draft.banner = null; prev(); };
    $('#pSave').onclick = () => act('profile:update', { ...draft, displayName: $('#pName').value, bio: $('#pBio').value, pronouns: $('#pPro').value }, 'Perfil salvo.');
  }
  else if (setTab === 'conta') {
    b.innerHTML = `<h2>Conta</h2><div class="set-card">${setRow('Nome de usuário', 'É assim que seus amigos te encontram.', `<span class="kbd">@${esc(S.me.username)}</span>`)}</div>
      <div class="set-card"><h3>Trocar senha</h3>
        <label class="field">Senha atual<input type="password" id="pwA" autocomplete="current-password"></label>
        <label class="field">Nova senha<input type="password" id="pwN" autocomplete="new-password"></label>
        <p class="form-err" id="pwE"></p>
        <div style="display:flex;justify-content:flex-end"><button class="btn primary" id="pwOk">Trocar senha</button></div></div>
      <div class="set-card">${setRow('Sair da conta', 'Desconecta este navegador.', '<button class="btn danger" id="lo">Sair</button>')}</div>`;
    $('#pwOk').onclick = async () => { try { await api('/api/password', { atual: $('#pwA').value, nova: $('#pwN').value }); $('#pwE').textContent = ''; $('#pwA').value = $('#pwN').value = ''; toast('Senha trocada.'); } catch (e) { $('#pwE').textContent = e.message; } };
    $('#lo').onclick = () => logout();
  }
  else if (setTab === 'aparencia') {
    const t = THEMES[prefs.theme];
    b.innerHTML = `<h2>Aparência</h2>
      <div class="set-card"><h3>Tema</h3><div class="themes" id="thms">${Object.entries(THEMES).map(([k, th]) => `<button class="theme-card ${prefs.theme === k ? 'on' : ''}" data-t="${k}"><div class="theme-prev" style="background:${th.main}"><i style="background:${th.rail}"></i><i style="background:${th.side}"></i><div class="m"><b style="background:${th.accent};width:60%"></b><b style="background:${th.muted};width:85%;opacity:.5"></b><b style="background:${th.muted};width:45%;opacity:.5"></b></div></div><div class="nm">${th.nome}</div></button>`).join('')}</div></div>
      <div class="set-card"><h3>Cor de destaque</h3><div class="colors" id="accs"><button type="button" data-c="" style="background:${t.accent}" title="Padrão do tema" class="${!prefs.accent ? 'on' : ''}"></button>${COLORS.map(c => `<button type="button" data-c="${c}" style="background:${c}" class="${prefs.accent === c ? 'on' : ''}"></button>`).join('')}<input type="color" id="accC" value="${prefs.accent || t.accent}" title="Escolher qualquer cor"></div></div>
      <div class="set-card"><h3>Texto</h3>
        <div class="field">Fonte<div class="seg" id="fnt">${Object.entries(FONTS).map(([k, [n, f]]) => `<button type="button" data-v="${k}" class="${prefs.font === k ? 'on' : ''}" style="font-family:${f.replace(/"/g, "'")}">${n}</button>`).join('')}</div></div>
        <div class="field">Tamanho da fonte<div class="range-row"><input type="range" id="fsz" min="12" max="20" step="1" value="${prefs.fontSize}"><output id="fszO">${prefs.fontSize}px</output></div></div>
        <div class="field">Cantos arredondados<div class="range-row"><input type="range" id="rad" min="0" max="24" step="1" value="${prefs.radius ?? t.radius ?? 12}"><output id="radO">${prefs.radius ?? t.radius ?? 12}px</output></div></div>
      </div>
      <div class="set-card"><h3>Mensagens</h3>
        ${setRow('Estilo', 'Lista clássica ou balões de conversa.', seg('lay', [['padrao', 'Lista'], ['bolhas', 'Balões']], prefs.layout))}
        ${setRow('Espaçamento', '', seg('den', [['compacto', 'Compacto'], ['conf', 'Confortável'], ['espacoso', 'Espaçoso']], prefs.density))}
        ${setRow('Mostrar fotos', 'Fotos de perfil ao lado das mensagens.', sw('avs', prefs.avatars))}
        ${setRow('Relógio 24 horas', 'Ex.: 21:30 em vez de 9:30 PM.', sw('c24', prefs.clock24))}
      </div>
      <div class="set-card"><h3>Fundo do app</h3>
        <div class="seg" id="bgs">${Object.entries(BGS).map(([k, [n]]) => `<button type="button" data-v="${k}" class="${prefs.bg === k ? 'on' : ''}">${n}</button>`).join('')}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap" id="bgCustom" ${prefs.bg === 'custom' ? '' : 'hidden'}><button class="btn sm primary" id="bgUp">Escolher imagem</button>${prefs.bgImage ? '<button class="btn sm ghost" id="bgX">Remover imagem</button>' : ''}</div>
        <div class="field">Transparência dos painéis<div class="range-row"><input type="range" id="gls" min="40" max="100" step="2" value="${prefs.glass}"><output id="glsO">${prefs.glass}%</output></div></div>
      </div>
      <div class="set-card">${setRow('Animações', 'Transições e efeitos de movimento.', sw('anm', prefs.anim))}${setRow('Lista de membros', 'Mostrar membros ao lado do chat nos grupos.', sw('mbs', prefs.showMembers))}</div>
      <div style="display:flex;justify-content:flex-end"><button class="btn ghost" id="rstA">Voltar tudo ao padrão</button></div>`;
    $('#thms').onclick = e => { const x = e.target.closest('[data-t]'); if (!x) return; prefs.radius = null; setPref('theme', x.dataset.t); drawSettings(); };
    $('#accs').onclick = e => { const x = e.target.closest('[data-c]'); if (!x) return; setPref('accent', x.dataset.c || null); drawSettings(); };
    $('#accC').onchange = e => { setPref('accent', e.target.value); drawSettings(); };
    bindSeg('fnt', v => setPref('font', v)); bindSeg('lay', v => setPref('layout', v)); bindSeg('den', v => setPref('density', v));
    bindSeg('bgs', v => { setPref('bg', v); $('#bgCustom').hidden = v !== 'custom'; if (v === 'custom' && !prefs.bgImage) $('#bgUp').click(); });
    $('#fsz').oninput = e => { $('#fszO').textContent = e.target.value + 'px'; setPref('fontSize', +e.target.value); };
    $('#rad').oninput = e => { $('#radO').textContent = e.target.value + 'px'; setPref('radius', +e.target.value); };
    $('#gls').oninput = e => { $('#glsO').textContent = e.target.value + '%'; setPref('glass', +e.target.value); };
    $('#avs').onchange = e => setPref('avatars', e.target.checked); $('#c24').onchange = e => setPref('clock24', e.target.checked);
    $('#anm').onchange = e => setPref('anim', e.target.checked); $('#mbs').onchange = e => setPref('showMembers', e.target.checked);
    $('#bgUp').onclick = async () => { const f = await pickFile(); if (!f) return; let d = await readFile(f); d = await shrink(d, 1920, .82); prefs.bgImage = d; setPref('bg', 'custom'); drawSettings(); };
    if ($('#bgX')) $('#bgX').onclick = () => { prefs.bgImage = null; setPref('bg', 'none'); drawSettings(); };
    $('#rstA').onclick = () => { ['theme', 'accent', 'font', 'fontSize', 'density', 'radius', 'layout', 'avatars', 'clock24', 'bg', 'bgImage', 'glass', 'anim', 'showMembers'].forEach(k => prefs[k] = DEFAULT_PREFS[k]); savePrefs(); applyPrefs(); render(); drawSettings(); };
  }
  else if (setTab === 'voz') {
    b.innerHTML = `<h2>Voz e vídeo</h2>
      <div class="set-card"><h3>Dispositivos</h3>
        <label class="field">Microfone<select id="dMic"><option value="">Padrão do sistema</option></select></label>
        <label class="field">Saída de áudio<select id="dSpk"><option value="">Padrão do sistema</option></select></label>
        <label class="field">Câmera<select id="dCam"><option value="">Padrão do sistema</option></select></label>
        <div class="field">Teste do microfone<div style="display:flex;gap:10px;align-items:center"><button class="btn sm" id="mTest">Testar</button><div class="meter" style="flex:1"><i id="mMeter"></i></div></div></div>
      </div>
      <div class="set-card"><h3>Processamento de voz</h3>
        ${setRow('Supressão de ruído', 'Corta ventilador, teclado e barulho de fundo.', sw('vNs', prefs.ns))}
        ${setRow('Cancelamento de eco', 'Evita que seus amigos se ouçam pelo seu alto-falante.', sw('vEc', prefs.ec))}
        ${setRow('Ganho automático', 'Ajusta o volume da sua voz sozinho.', sw('vAgc', prefs.agc))}
      </div>
      <div class="set-card"><h3>Modo de entrada</h3>
        ${setRow('Aperte para falar', 'O microfone só abre enquanto você segura a tecla.', sw('vPtt', prefs.ptt))}
        ${setRow('Tecla', 'Clique e aperte a tecla desejada.', `<button class="kbd" id="vKey" style="cursor:pointer">${esc(keyName(prefs.pttKey))}</button>`)}
      </div>
      <div class="set-card"><h3>Compartilhamento de tela</h3>${setRow('Qualidade', 'Mais qualidade usa mais internet.', seg('vQ', [['720p30', '720p'], ['1080p30', '1080p'], ['1080p60', '1080p 60fps']], prefs.quality))}</div>
      <div class="set-card">${setRow('Sons de entrar e sair', 'Tocar um som quando alguém entra ou sai da call.', sw('vJs', prefs.joinSounds))}</div>`;
    fillDevices();
    const restart = () => { if (V.room) restartMic(); };
    $('#dMic').onchange = e => { prefs.micId = e.target.value; savePrefs(); restart(); };
    $('#dSpk').onchange = e => { prefs.spkId = e.target.value; savePrefs(); applySink(); };
    $('#dCam').onchange = e => { prefs.camId = e.target.value; savePrefs(); };
    $('#vNs').onchange = e => { prefs.ns = e.target.checked; savePrefs(); restart(); };
    $('#vEc').onchange = e => { prefs.ec = e.target.checked; savePrefs(); restart(); };
    $('#vAgc').onchange = e => { prefs.agc = e.target.checked; savePrefs(); restart(); };
    $('#vPtt').onchange = e => { prefs.ptt = e.target.checked; savePrefs(); applyMicGate(); renderUserBar(); };
    $('#vJs').onchange = e => { prefs.joinSounds = e.target.checked; savePrefs(); };
    bindSeg('vQ', v => { prefs.quality = v; savePrefs(); });
    $('#vKey').onclick = () => {
      capturingKey = true; $('#vKey').textContent = 'Aperte uma tecla...';
      const h = e => { e.preventDefault(); prefs.pttKey = e.code; savePrefs(); capturingKey = false; $('#vKey').textContent = keyName(e.code); document.removeEventListener('keydown', h, true); };
      document.addEventListener('keydown', h, true);
    };
    $('#mTest').onclick = toggleMicTest;
  }
  else if (setTab === 'notif') {
    b.innerHTML = `<h2>Notificações</h2>
      <div class="set-card">
        ${setRow('Sons', 'Toque ao receber mensagens e pedidos.', sw('nS', prefs.sounds))}
        <div class="field">Volume dos sons<div class="range-row"><input type="range" id="nV" min="0" max="100" value="${prefs.volume}"><output id="nVO">${prefs.volume}%</output></div></div>
        ${setRow('Notificações na área de trabalho', 'Avisa mesmo com o Discordia minimizado.', sw('nD', prefs.desktop))}
        ${setRow('Nos grupos, só menções', 'Só notificar quando escreverem @' + esc(S.me.username) + '. Mensagens diretas sempre avisam.', sw('nM', prefs.mentionsOnly))}
      </div>
      <div class="set-card"><p class="muted small" style="margin:0">Com o status <b>Não perturbe</b>, nenhum som de mensagem toca.</p><div><button class="btn sm" id="nT">Tocar som de teste</button></div></div>`;
    $('#nS').onchange = e => { prefs.sounds = e.target.checked; savePrefs(); };
    $('#nV').oninput = e => { prefs.volume = +e.target.value; $('#nVO').textContent = e.target.value + '%'; savePrefs(); };
    $('#nV').onchange = () => SOUNDS.msg();
    $('#nM').onchange = e => { prefs.mentionsOnly = e.target.checked; savePrefs(); };
    $('#nT').onclick = () => SOUNDS.msg();
    $('#nD').onchange = async e => {
      if (e.target.checked && 'Notification' in window && Notification.permission !== 'granted') {
        const p = await Notification.requestPermission().catch(() => 'denied');
        if (p !== 'granted') { e.target.checked = false; toast('O navegador bloqueou as notificações. Libere nas configurações do site.', true); return; }
      }
      prefs.desktop = e.target.checked; savePrefs();
    };
  }
  else if (setTab === 'app' && DESK) {
    b.innerHTML = '<h2>Aplicativo</h2><p class="muted">Carregando...</p>';
    DESK.info().then(i => {
      if (setTab !== 'app' || !$('#setBody')) return;
      const host = i.mode === 'host';
      b.innerHTML = `<h2>Aplicativo</h2>
        <div class="set-card"><h3>Servidor</h3>
          ${setRow(host ? 'Este computador é o servidor' : 'Conectado a um servidor', host ? 'As contas e mensagens ficam guardadas neste PC.' : esc(i.server), host ? '<button class="btn primary" id="dPanel">Painel do servidor</button>' : '')}
          ${host && i.tunnel.url ? setRow('Link público', esc(i.tunnel.url), '<button class="btn" id="dCopy">Copiar</button>') : ''}
          ${i.fixed ? '' : setRow('Trocar de servidor', 'Volta para a tela inicial do Discordia.', '<button class="btn danger" id="dReset">Trocar</button>')}
        </div>
        ${DESK.updateCheck ? `<div class="set-card"><h3>Atualizações</h3>${setRow('Discordia ' + esc(i.version), i.update && i.update.ready ? `A versão ${esc(i.update.version)} está pronta para instalar.` : 'O app procura versões novas sozinho a cada 30 minutos.', i.update && i.update.ready ? '<button class="btn primary" id="dUpdGo">Atualizar e reiniciar</button>' : '<button class="btn" id="dUpd">Procurar agora</button>')}<p class="muted small" id="dUpdMsg" style="margin:0"></p></div>` : ''}
        <div class="set-card"><h3>Janela</h3>
          ${i.platform !== 'linux' ? setRow('Iniciar com o Windows', 'Abre escondido perto do relógio quando o PC liga.', sw('dAuto', i.settings.autoStart)) : ''}
          ${setRow('Fechar para a bandeja', 'O X esconde a janela e o Discordia continua recebendo mensagens e chamadas.', sw('dTray', i.settings.minimizeToTray))}
          ${setRow('Abrir minimizado', 'O Discordia abre direto perto do relógio, sem mostrar a janela.', sw('dMin', i.settings.startMinimized))}
        </div>
        <div class="set-card"><p class="muted small" style="margin:0">Discordia ${esc(i.version)} · F11 tela cheia · F5 recarregar</p></div>`;
      if ($('#dPanel')) $('#dPanel').onclick = () => DESK.panel();
      if ($('#dCopy')) $('#dCopy').onclick = () => { DESK.copy(i.tunnel.url); toast('Link copiado.'); };
      if ($('#dUpdGo')) $('#dUpdGo').onclick = () => DESK.updateInstall();
      if ($('#dUpd')) $('#dUpd').onclick = async () => {
        $('#dUpd').disabled = true; $('#dUpdMsg').textContent = 'Procurando...';
        const s = await DESK.updateCheck();
        $('#dUpd').disabled = false;
        $('#dUpdMsg').textContent = s.ready ? `Versão ${s.version} baixada. Use o botão no topo para atualizar.` : s.state === 'em-dia' ? 'Você já está na versão mais nova.' : s.state === 'erro' ? 'Não deu para procurar: ' + s.error : s.state === 'baixando' ? 'Baixando a versão nova...' : 'Atualização automática só funciona no app instalado.';
        if (s.ready) { UPD.desk = s.version; showUpd(); }
      };
      if ($('#dReset')) $('#dReset').onclick = async () => { if (await confirmBox('Trocar de servidor', host ? 'O servidor deste PC vai desligar e seus amigos perdem a conexão até você hospedar de novo. Os dados continuam guardados.' : 'Você vai escolher outro servidor na tela inicial.', 'Trocar')) DESK.reset(); };
      if ($('#dAuto')) $('#dAuto').onchange = e => DESK.setSettings({ autoStart: e.target.checked });
      $('#dTray').onchange = e => DESK.setSettings({ minimizeToTray: e.target.checked });
      $('#dMin').onchange = e => DESK.setSettings({ startMinimized: e.target.checked });
    });
  }
  else if (setTab === 'atalhos') {
    const k = [['Enter', 'Enviar mensagem'], ['Shift + Enter', 'Nova linha'], ['↑ com a caixa vazia', 'Editar sua última mensagem'], ['Esc', 'Cancelar resposta, edição ou fechar janela'], ['Ctrl + Shift + M', 'Silenciar ou ativar o microfone'], ['Ctrl + Shift + D', 'Desativar ou ativar o áudio'], [keyName(prefs.pttKey), 'Aperte para falar (se ativado)'], ['Ctrl + V', 'Colar imagem no chat'], ['**texto**', 'Negrito'], ['*texto*', 'Itálico'], ['`código`', 'Código'], ['||texto||', 'Spoiler'], ['@usuario', 'Mencionar alguém']];
    b.innerHTML = `<h2>Atalhos</h2><div class="set-card">${k.map(([a, d]) => setRow(d, '', `<span class="kbd">${esc(a)}</span>`)).join('')}</div>`;
  }
}
function keyName(code) { return (code || '').replace(/^Key/, '').replace(/^Digit/, '').replace('Space', 'Espaço').replace('Backquote', '`').replace('CapsLock', 'Caps Lock'); }
async function fillDevices() {
  try {
    let list = await navigator.mediaDevices.enumerateDevices();
    if (!list.some(d => d.label)) { try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach(t => t.stop()); list = await navigator.mediaDevices.enumerateDevices(); } catch {} }
    const fill = (id, kind, val) => { const sel = $('#' + id); if (!sel) return; list.filter(d => d.kind === kind && d.deviceId !== 'default' && d.deviceId !== 'communications').forEach((d, i) => sel.insertAdjacentHTML('beforeend', `<option value="${esc(d.deviceId)}" ${d.deviceId === val ? 'selected' : ''}>${esc(d.label || (kind + ' ' + (i + 1)))}</option>`)); };
    fill('dMic', 'audioinput', prefs.micId); fill('dSpk', 'audiooutput', prefs.spkId); fill('dCam', 'videoinput', prefs.camId);
    if (!('setSinkId' in HTMLMediaElement.prototype)) { const s = $('#dSpk'); if (s) { s.disabled = true; s.title = 'Este navegador não deixa escolher a saída de áudio.'; } }
  } catch { toast('Não consegui listar os dispositivos. O site precisa estar em https ou localhost.', true); }
}
let micTest = null;
async function toggleMicTest() {
  if (micTest) return stopMicTest();
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints() });
    const c = audioCtx(); const src = c.createMediaStreamSource(s); const an = c.createAnalyser(); an.fftSize = 512; src.connect(an);
    const out = c.createMediaStreamDestination(); src.connect(out);
    const el = new Audio(); el.srcObject = out.stream; el.play().catch(() => {});
    const buf = new Uint8Array(an.fftSize);
    const iv = setInterval(() => { an.getByteTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v - 128)); const meter = $('#mMeter'); if (meter) meter.style.width = clamp(m / 64 * 100, 0, 100) + '%'; }, 60);
    micTest = { s, iv, el }; $('#mTest').textContent = 'Parar teste'; toast('Fale algo: você vai ouvir a própria voz.');
  } catch { toast('Não consegui abrir o microfone. Verifique a permissão do navegador.', true); }
}
function stopMicTest() { if (!micTest) return; clearInterval(micTest.iv); micTest.s.getTracks().forEach(t => t.stop()); micTest.el.srcObject = null; micTest = null; const b = $('#mTest'); if (b) b.textContent = 'Testar'; const m = $('#mMeter'); if (m) m.style.width = '0'; }

/* =============== voz, vídeo e tela (WebRTC) =============== */
const V = { room: null, mic: null, screen: null, cam: null, peers: new Map(), muted: false, deaf: false, ice: [], pttDown: false, calling: false, levels: new Map(), videoCache: new Map() };
const audioConstraints = () => ({ deviceId: prefs.micId ? { exact: prefs.micId } : undefined, noiseSuppression: prefs.ns, echoCancellation: prefs.ec, autoGainControl: prefs.agc, channelCount: { ideal: 1 }, sampleRate: { ideal: 48000 } });

/* ---- qualidade de áudio e vídeo ----
   Por padrão o WebRTC manda a voz a ~32 kbps e o vídeo começa baixinho e demora a subir.
   Aqui a voz vai até 128 kbps com correção de perda de pacote, e o vídeo começa já em boa qualidade. */
function tuneSdp(sdp) {
  const lines = sdp.split('\r\n');
  const pts = name => lines.map(l => new RegExp('^a=rtpmap:(\\d+) ' + name + '/', 'i').exec(l)).filter(Boolean).map(m => m[1]);
  const fmtp = (pt, add) => {
    const i = lines.findIndex(l => l.startsWith('a=fmtp:' + pt + ' '));
    const cur = i >= 0 ? Object.fromEntries(lines[i].slice(('a=fmtp:' + pt + ' ').length).split(';').filter(Boolean).map(kv => { const j = kv.indexOf('='); return j < 0 ? [kv, null] : [kv.slice(0, j), kv.slice(j + 1)]; })) : {};
    Object.assign(cur, add);
    const line = 'a=fmtp:' + pt + ' ' + Object.entries(cur).map(([k, v]) => (v === null ? k : k + '=' + v)).join(';');
    if (i >= 0) lines[i] = line; else { const r = lines.findIndex(l => l.startsWith('a=rtpmap:' + pt + ' ')); if (r >= 0) lines.splice(r + 1, 0, line); }
  };
  pts('opus').forEach(pt => fmtp(pt, { useinbandfec: 1, usedtx: 0, maxaveragebitrate: 128000, maxplaybackrate: 48000, stereo: 1, 'sprop-stereo': 1 }));
  ['VP8', 'VP9', 'H264', 'AV1'].forEach(c => pts(c).forEach(pt => fmtp(pt, { 'x-google-start-bitrate': 1500, 'x-google-max-bitrate': 8000 })));
  return lines.join('\r\n');
}
// limites de cada envio: voz com prioridade, tela nítida (ou fluida em 60 fps), câmera equilibrada
function tuneSenders(pc) {
  const q = { '720p30': [2500, 30], '1080p30': [5000, 30], '1080p60': [8000, 60] }[prefs.quality] || [5000, 30];
  pc.getSenders().forEach(snd => {
    const t = snd.track; if (!t) return;
    const prm = snd.getParameters(); if (!prm.encodings || !prm.encodings.length) return;
    const e = prm.encodings[0];
    if (t.kind === 'audio') { e.maxBitrate = 128000; e.priority = 'high'; e.networkPriority = 'high'; }
    else if (V.screen && V.screen.getTracks().includes(t)) { e.maxBitrate = q[0] * 1000; e.maxFramerate = q[1]; e.priority = 'medium'; prm.degradationPreference = q[1] >= 60 ? 'maintain-framerate' : 'maintain-resolution'; }
    else { e.maxBitrate = 2500000; e.maxFramerate = 30; prm.degradationPreference = 'balanced'; }
    snd.setParameters(prm).catch(() => {});
  });
}
function secureOk() { return window.isSecureContext && navigator.mediaDevices; }
function applyMicGate() {
  const on = !V.muted && !V.deaf && (!prefs.ptt || V.pttDown);
  V.mic && V.mic.getAudioTracks().forEach(t => t.enabled = on);
}
async function joinVoice(roomId, opts = {}) {
  if (!secureOk()) { modal(`<div class="modal-h"><h2>Conexão não segura</h2><p>O navegador só libera microfone e tela em endereços <b>https://</b> ou em <b>localhost</b>. Abra o Discordia pelo link https que aparece na janela do servidor, ou pelo link público.</p></div><div class="modal-f"><button class="btn primary" data-close>Entendi</button></div>`); return false; }
  if (V.room === roomId) { openStage(); return true; }
  if (V.room) leaveVoice();
  audioCtx();
  try { V.mic = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints() }); }
  catch (e) { V.mic = null; toast('Sem acesso ao microfone. Você entra só ouvindo.', true); }
  const r = await emit('voice:join', { roomId, muted: V.muted || !V.mic, deafened: V.deaf });
  if (!r.ok) { V.mic && V.mic.getTracks().forEach(t => t.stop()); V.mic = null; toast(r.erro, true); return false; }
  V.room = roomId; V.ice = r.iceServers || V.ice; V.calling = !!opts.calling;
  if (!V.mic) V.muted = true;
  applyMicGate();
  if (V.mic) watchLevel(S.mySid, V.mic);
  r.peers.forEach(p => getPeer(p.sid));
  SOUNDS.join();
  if (opts.video) toggleCam();
  render(); return true;
}
function cleanupVoice() {
  V.peers.forEach(p => { try { p.pc.close(); } catch {} });
  V.peers.clear();
  [V.mic, V.screen, V.cam].forEach(s => s && s.getTracks().forEach(t => t.stop()));
  V.mic = V.screen = V.cam = null; V.room = null; V.calling = false; S.focusTile = null;
  V.levels.clear(); V.videoCache.clear(); dropAudio(() => true); $('#audioSink').innerHTML = '';
  ring(false); render();
}
function leaveVoice() {
  if (!V.room) return;
  const room = V.room;
  if (V.calling && S.dms[room] && (S.voice[room] || []).length <= 1) socket.emit('call:decline', { dmId: room });
  emit('voice:leave'); SOUNDS.leave(); cleanupVoice();
}
function sendState() { if (V.room) socket.emit('voice:state', { muted: V.muted || !V.mic, deafened: V.deaf, screen: V.screen ? V.screen.id : null, cam: V.cam ? V.cam.id : null }); }
async function restartMic() {
  if (!V.room) return;
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints() });
    const t = s.getAudioTracks()[0];
    V.peers.forEach(p => { const snd = p.pc.getSenders().find(x => x.track && x.track.kind === 'audio' && V.mic && V.mic.getTracks().includes(x.track)); if (snd) snd.replaceTrack(t); else p.pc.addTrack(t, s); });
    V.mic && V.mic.getTracks().forEach(x => x.stop()); V.mic = s; applyMicGate(); watchLevel(S.mySid, s);
    toast('Microfone atualizado.');
  } catch { toast('Não consegui trocar o microfone.', true); }
}

function getPeer(sid) {
  let p = V.peers.get(sid); if (p) return p;
  const pc = new RTCPeerConnection({ iceServers: V.ice });
  p = { sid, pc, polite: S.mySid > sid, makingOffer: false, ignoreOffer: false, streams: new Map() };
  V.peers.set(sid, p);
  [V.mic, V.screen, V.cam].forEach(s => s && s.getTracks().forEach(t => pc.addTrack(t, s)));
  pc.onnegotiationneeded = async () => {
    try {
      p.makingOffer = true;
      const offer = await pc.createOffer();
      if (pc.signalingState !== 'stable') return;
      await pc.setLocalDescription({ type: 'offer', sdp: tuneSdp(offer.sdp) });
      socket.emit('rtc:signal', { to: sid, data: { description: pc.localDescription } });
      tuneSenders(pc);
    }
    catch (e) { console.warn(e); } finally { p.makingOffer = false; }
  };
  pc.onicecandidate = ({ candidate }) => { if (candidate) socket.emit('rtc:signal', { to: sid, data: { candidate } }); };
  pc.oniceconnectionstatechange = () => { if (pc.iceConnectionState === 'failed') pc.restartIce(); if (pc.iceConnectionState === 'connected') tuneSenders(pc); };
  pc.ontrack = ({ track, streams }) => {
    const st = streams[0] || new MediaStream([track]);
    p.streams.set(st.id, st);
    if (track.kind === 'audio') attachAudio(sid, st);
    st.onremovetrack = () => { if (!st.getTracks().length) { p.streams.delete(st.id); dropAudio((a, id) => id === st.id); } renderStageSoon(); };
    track.onunmute = renderStageSoon;
    renderStageSoon();
  };
  return p;
}
async function onSignal({ from, data }) {
  if (!V.room) return;
  const p = getPeer(from), pc = p.pc;
  try {
    if (data.description) {
      const offerCollision = data.description.type === 'offer' && (p.makingOffer || pc.signalingState !== 'stable');
      p.ignoreOffer = !p.polite && offerCollision;
      if (p.ignoreOffer) return;
      await pc.setRemoteDescription(data.description);
      if (data.description.type === 'offer') {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription({ type: 'answer', sdp: tuneSdp(answer.sdp) });
        socket.emit('rtc:signal', { to: from, data: { description: pc.localDescription } });
        tuneSenders(pc);
      }
    } else if (data.candidate) {
      try { await pc.addIceCandidate(data.candidate); } catch (e) { if (!p.ignoreOffer) console.warn(e); }
    }
  } catch (e) { console.warn('sinal', e); }
}
/* ---- volume de cada pessoa (salvo neste aparelho) ----
   O som de cada pessoa passa por um "ganho" próprio (0 a 200%). A voz e a tela compartilhada
   de uma pessoa chegam em fluxos separados, então cada uma tem seu volume. */
const AUD = new Map(); // id do fluxo -> { sid, el, gain }
const peerInfo = sid => (S.voice[V.room] || []).find(p => p.sid === sid);
const volOf = (uid, kind) => { const v = ((kind === 'screen' ? prefs.svol : prefs.vol) || {})[uid]; return typeof v === 'number' ? clamp(v, 0, 200) : 100; };
// Até 100% o som toca direto pelo <audio> (assim o cancelamento de eco do Chrome funciona e seu microfone
// não devolve a voz dos outros). Só acima de 100% ele passa por um amplificador (Web Audio).
function boost(a, on) {
  if (on && !a.gain) {
    const c = audioCtx(); if (!c || !c.createGain) return false;
    try { a.src = c.createMediaStreamSource(a.el.srcObject); a.gain = c.createGain(); a.src.connect(a.gain); a.gain.connect(c.destination); applySink(); }
    catch { a.gain = null; return false; }
  }
  if (!on && a.gain) { try { a.src.disconnect(); a.gain.disconnect(); } catch {} a.gain = a.src = null; }
  return true;
}
function applyVolumes() {
  AUD.forEach((a, id) => {
    const p = peerInfo(a.sid), uid = p && p.uid;
    const kind = p && p.screen === id ? 'screen' : 'voice';
    const off = V.deaf || (uid && kind === 'voice' && prefs.umute && prefs.umute[uid]);
    const v = off ? 0 : (uid ? volOf(uid, kind) : 100) / 100;
    if (v > 1 && boost(a, true)) { a.el.muted = true; a.gain.gain.value = v; }
    else { boost(a, false); a.el.muted = v === 0; a.el.volume = Math.min(1, v); }
  });
}
function attachAudio(sid, stream) {
  if (AUD.has(stream.id)) return;
  const a = document.createElement('audio'); a.autoplay = true; a.dataset.s = stream.id; a.dataset.sid = sid; a.srcObject = stream;
  if (prefs.spkId && a.setSinkId) a.setSinkId(prefs.spkId).catch(() => {});
  $('#audioSink').appendChild(a);
  AUD.set(stream.id, { sid, el: a, gain: null, src: null });
  applyVolumes();
  a.play().catch(() => toast('Clique em qualquer lugar para liberar o áudio da call.'));
  watchLevel(sid, stream);
}
function dropAudio(filter) {
  AUD.forEach((a, id) => { if (filter(a, id)) { try { a.src && a.src.disconnect(); a.gain && a.gain.disconnect(); } catch {} a.el.remove(); AUD.delete(id); } });
}
function applySink() {
  $$('#audioSink audio').forEach(a => a.setSinkId && a.setSinkId(prefs.spkId || '').catch(() => {}));
  if (actx && actx.setSinkId && actx.__sink !== (prefs.spkId || '')) { actx.__sink = prefs.spkId || ''; actx.setSinkId(prefs.spkId || '').catch(() => {}); }
}
document.addEventListener('click', () => { audioCtx(); $$('#audioSink audio').forEach(a => a.paused && a.play().catch(() => {})); });
window.addEventListener('discordia:screen-no-audio', () => toast('Compartilhando sem o som do PC: o Windows não deixou capturar o áudio.'));

function voiceMenu(uid, anchor) {
  if (uid === S.me.id) { openSettings('voz'); return; }
  const row = (id, label, kind) => `<label class="vm-l" for="${id}">${label}<output id="${id}O">${volOf(uid, kind)}%</output></label><input type="range" id="${id}" min="0" max="200" step="5" value="${volOf(uid, kind)}">`;
  const p = pop(`<div class="vm-h">${av(uid, 32, false)}<b>${esc(nameOf(uid))}</b></div>
    ${row('vmV', 'Volume da voz', 'voice')}
    ${row('vmS', 'Volume da tela compartilhada', 'screen')}
    <label class="vm-c"><input type="checkbox" id="vmM" ${prefs.umute && prefs.umute[uid] ? 'checked' : ''}>Silenciar para mim</label>
    <p class="muted small" style="margin:0">Só muda o que você escuta. Fica salvo neste aparelho.</p>
    <div class="vm-f"><button class="btn sm ghost" id="vmR">Voltar ao normal</button><button class="btn sm" data-act="profile" data-id="${uid}">Ver perfil</button></div>`, anchor, 'vmenu', anchor.closest('#side') ? 'right' : 'above');
  const set = (key, v) => { prefs[key] = { ...(prefs[key] || {}) }; if (v === null) delete prefs[key][uid]; else prefs[key][uid] = v; savePrefs(); applyVolumes(); };
  const bind = (id, key) => { const r = $('#' + id, p); r.oninput = () => { $('#' + id + 'O', p).textContent = r.value + '%'; set(key, +r.value === 100 ? null : +r.value); }; r.onchange = () => renderSide(); };
  bind('vmV', 'vol'); bind('vmS', 'svol');
  $('#vmM', p).onchange = e => { set('umute', e.target.checked ? true : null); renderSide(); renderStageSlot(); };
  $('#vmR', p).onclick = () => { ['vol', 'svol', 'umute'].forEach(k => set(k, null)); closePops(); renderSide(); renderStageSlot(); };
}
document.addEventListener('contextmenu', e => {
  const t = e.target.closest('[data-vuid]'); if (!t) return;
  e.preventDefault(); voiceMenu(t.dataset.vuid, t);
});
// marquinha ao lado do nome quando você mudou o volume da pessoa
const volTag = uid => (prefs.umute && prefs.umute[uid]) ? '<span class="vol-tag" title="Silenciado para você">🔇</span>' : (prefs.vol && prefs.vol[uid] !== undefined) ? `<span class="vol-tag" title="Volume para você">${prefs.vol[uid]}%</span>` : '';

function onVoiceRoom({ roomId, peers }) {
  const before = (S.voice[roomId] || []).map(p => p.sid);
  if (peers.length) S.voice[roomId] = peers; else delete S.voice[roomId];
  if (roomId === V.room) {
    const now = peers.map(p => p.sid);
    now.forEach(sid => { if (sid !== S.mySid) getPeer(sid); });
    V.peers.forEach((p, sid) => { if (!now.includes(sid)) { try { p.pc.close(); } catch {} V.peers.delete(sid); dropAudio(a => a.sid === sid); V.levels.delete(sid); } });
    applyVolumes(); // quem começou ou parou de compartilhar a tela muda qual volume vale
    const joined = now.filter(s => !before.includes(s) && s !== S.mySid), left = before.filter(s => !now.includes(s) && s !== S.mySid);
    if (joined.length) { SOUNDS.join(); if (V.calling) { V.calling = false; ring(false); } }
    if (left.length) SOUNDS.leave();
    if (S.focusTile && !peers.some(p => S.focusTile.endsWith(p.sid))) S.focusTile = null;
  }
  render();
}
let stageRq = 0;
function renderStageSoon() { if (stageRq) return; stageRq = requestAnimationFrame(() => { stageRq = 0; renderStageSlot(); }); }

function toggleMute() {
  if (!V.mic && V.room) return toast('Sem microfone nesta call.', true);
  if (V.deaf) { V.deaf = false; V.muted = false; } else V.muted = !V.muted;
  applyVolumes();
  (V.muted ? SOUNDS.mute : SOUNDS.unmute)(); applyMicGate(); sendState(); render();
}
function toggleDeaf() {
  V.deaf = !V.deaf; applyVolumes();
  (V.deaf ? SOUNDS.mute : SOUNDS.unmute)(); applyMicGate(); sendState(); render();
}
async function toggleScreen() {
  if (!V.room) return;
  if (V.screen) return stopStream('screen');
  if (!navigator.mediaDevices.getDisplayMedia) return toast('Este navegador não consegue compartilhar a tela.', true);
  const q = { '720p30': [1280, 720, 30], '1080p30': [1920, 1080, 30], '1080p60': [1920, 1080, 60] }[prefs.quality] || [1920, 1080, 30];
  const ask = audio => navigator.mediaDevices.getDisplayMedia({ video: { width: { ideal: q[0] }, height: { ideal: q[1] }, frameRate: { ideal: q[2] } }, audio });
  const fail = e => { if (e && e.name !== 'NotAllowedError' && e.name !== 'AbortError') toast('Não consegui compartilhar a tela: ' + (e.message || e.name), true); };
  try { V.screen = await ask(true); }
  catch (e) {
    // tela inteira: às vezes o Windows não deixa capturar o som do PC. Aí compartilha só a imagem.
    if (e && (e.name === 'NotReadableError' || /audio/i.test(e.message || ''))) {
      try { V.screen = await ask(false); toast('Compartilhando sem o som do PC: o Windows não deixou capturar o áudio.'); }
      catch (e2) { return fail(e2); }
    } else return fail(e);
  }
  if (!V.room) { V.screen.getTracks().forEach(t => t.stop()); V.screen = null; return; }
  const vt = V.screen.getVideoTracks()[0]; if (vt) { vt.contentHint = prefs.quality === '1080p60' ? 'motion' : 'detail'; vt.onended = () => stopStream('screen'); }
  V.peers.forEach(p => V.screen.getTracks().forEach(t => p.pc.addTrack(t, V.screen)));
  S.focusTile = 'screen:' + S.mySid;
  sendState(); render(); openStage();
}
async function toggleCam() {
  if (!V.room) return;
  if (V.cam) return stopStream('cam');
  try { V.cam = await navigator.mediaDevices.getUserMedia({ video: { deviceId: prefs.camId ? { exact: prefs.camId } : undefined, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } }); }
  catch { return toast('Não consegui abrir a câmera.', true); }
  const ct = V.cam.getVideoTracks()[0];
  if (ct) { ct.contentHint = 'motion'; ct.onended = () => { if (V.cam) { stopStream('cam'); toast('A câmera foi desligada (outro programa pode estar usando ela).', true); } }; }
  V.peers.forEach(p => V.cam.getTracks().forEach(t => p.pc.addTrack(t, V.cam)));
  sendState(); render();
}
function stopStream(kind) {
  const s = V[kind]; if (!s) return;
  const tracks = s.getTracks(); tracks.forEach(t => t.stop());
  V.peers.forEach(p => p.pc.getSenders().forEach(snd => { if (snd.track && tracks.includes(snd.track)) try { p.pc.removeTrack(snd); } catch {} }));
  V[kind] = null; V.videoCache.delete(kind + ':' + S.mySid);
  if (S.focusTile === kind + ':' + S.mySid) S.focusTile = null;
  sendState(); render();
}

/* níveis de voz (quem está falando) */
function watchLevel(sid, stream) {
  try { const c = audioCtx(); const src = c.createMediaStreamSource(stream); const an = c.createAnalyser(); an.fftSize = 256; src.connect(an); V.levels.set(sid, { an, buf: new Uint8Array(an.fftSize) }); } catch {}
}
setInterval(() => {
  if (!V.room) return;
  const room = S.voice[V.room] || [];
  V.levels.forEach((l, sid) => {
    l.an.getByteTimeDomainData(l.buf); let m = 0; for (const v of l.buf) m = Math.max(m, Math.abs(v - 128));
    const st = room.find(p => p.sid === sid);
    const speaking = m > 9 && !(st && (st.muted || st.deafened)) && !(sid === S.mySid && (V.muted || V.deaf || (prefs.ptt && !V.pttDown)));
    $$(`[data-speak="${sid}"]`).forEach(el => el.classList.toggle('speaking', speaking));
  });
}, 110);

/* palco (grade de participantes) */
function openStage() {
  if (!V.room) return;
  if (S.dms[V.room]) go({ kind: 'dm', id: V.room });
  else { const g = groupOfChannel(V.room); if (g) go({ kind: 'group', gid: g.id, cid: V.room }); }
}
function videoEl(key, stream, mirror) {
  let v = V.videoCache.get(key);
  if (!v || v.srcObject !== stream) { v = document.createElement('video'); v.autoplay = true; v.playsInline = true; v.muted = true; v.srcObject = stream; if (mirror) v.style.transform = 'scaleX(-1)'; V.videoCache.set(key, v); }
  v.play().catch(() => {});
  return v;
}
function renderStageSlot() {
  const slot = $('#stageSlot'); if (!slot) return;
  const v = S.view;
  const roomId = v.kind === 'dm' ? v.id : v.kind === 'group' && chan(v.gid, v.cid)?.type === 'voice' ? v.cid : null;
  if (!roomId) { slot.innerHTML = ''; return; }
  const peers = S.voice[roomId] || [];
  const inRoom = V.room === roomId;
  const isDm = v.kind === 'dm';
  if (!inRoom) {
    if (isDm && !peers.length) { slot.innerHTML = ''; return; }
    const c = !isDm && chan(v.gid, v.cid);
    slot.innerHTML = `<div class="stage ${isDm ? 'mini' : ''}" style="${isDm ? '' : 'flex:1'}"><div class="stage-empty"><div>
      ${peers.length ? `<div style="display:flex;justify-content:center;gap:-8px">${peers.slice(0, 6).map(p => av(p.uid, 40, false)).join('')}</div>` : `<div style="font-size:54px">🎧</div>`}
      <h2>${isDm ? 'Chamada em andamento' : esc(c.name)}</h2>
      <p class="muted">${peers.length ? `${peers.map(p => esc(nameOf(p.uid))).join(', ')} ${peers.length > 1 ? 'estão' : 'está'} na sala.` : 'Ninguém aqui ainda. Entre e chame a galera.'}</p>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:16px;flex-wrap:wrap"><button class="btn primary" data-act="joinRoom" data-id="${roomId}">${ic('voice')}Entrar na sala</button><button class="btn" data-act="joinRoom" data-video="1" data-id="${roomId}">${ic('cam')}Entrar com câmera</button></div>
    </div></div></div>`;
    return;
  }
  const tiles = [];
  const all = peers.length ? peers : [{ sid: S.mySid, uid: S.me.id, muted: V.muted, deafened: V.deaf }];
  for (const p of all) {
    const me = p.sid === S.mySid;
    const peer = V.peers.get(p.sid);
    const camStream = me ? V.cam : p.cam && peer?.streams.get(p.cam);
    const scrStream = me ? V.screen : p.screen && peer?.streams.get(p.screen);
    const flags = `${p.deafened ? ic('headOff') : p.muted ? ic('micOff') : ''}`;
    const vb = me ? '' : `<button class="tvol" data-act="voiceUser" data-vuid="${p.uid}" title="Volume de ${esc(nameOf(p.uid))}">${ic(prefs.umute && prefs.umute[p.uid] ? 'micOff' : 'voice')}</button>`;
    tiles.push({ key: 'user:' + p.sid, html: `<div class="tile ${camStream ? 'cam' : ''}" data-act="focus" data-key="user:${p.sid}" data-speak="${p.sid}" ${me ? '' : `data-vuid="${p.uid}"`}>${camStream ? `<div class="vslot" data-v="cam:${p.sid}" style="position:absolute;inset:0"></div>` : av(p.uid, 80, false)}<span class="nm">${flags}${esc(nameOf(p.uid))}${me ? ' (você)' : ''}${volTag(p.uid)}</span>${vb}</div>`, stream: camStream, vkey: 'cam:' + p.sid, mirror: me });
    if (p.screen || (me && V.screen)) tiles.push({ key: 'screen:' + p.sid, html: `<div class="tile" data-act="focus" data-key="screen:${p.sid}" ${me ? '' : `data-vuid="${p.uid}"`}>${scrStream ? `<div class="vslot" data-v="screen:${p.sid}" style="position:absolute;inset:0"></div>` : '<span class="muted">Conectando à tela...</span>'}<span class="live">AO VIVO</span><span class="nm">${ic('screen')}Tela de ${esc(nameOf(p.uid))}${!me && prefs.svol && prefs.svol[p.uid] !== undefined ? `<span class="vol-tag">${prefs.svol[p.uid]}%</span>` : ''}</span>${me ? '' : `<button class="tvol" data-act="voiceUser" data-vuid="${p.uid}" title="Volume da tela">${ic('voice')}</button>`}<button class="fs" data-act="fullscreen" data-key="screen:${p.sid}" title="Tela cheia">${ic('max')}</button></div>`, stream: scrStream, vkey: 'screen:' + p.sid });
  }
  const focus = S.focusTile && tiles.find(t => t.key === S.focusTile);
  const ctrls = `<div class="stage-ctrls"><div class="stage-pill">
    <button class="ctrl ${V.muted ? 'off' : ''}" data-act="mute" data-tip="${V.muted ? 'Ativar microfone' : 'Silenciar microfone'}">${ic(V.muted ? 'micOff' : 'mic')}</button>
    <button class="ctrl ${V.deaf ? 'off' : ''}" data-act="deafen" data-tip="${V.deaf ? 'Voltar a ouvir' : 'Parar de ouvir'}">${ic(V.deaf ? 'headOff' : 'head')}</button>
    <span class="ctrl-sep"></span>
    <button class="ctrl ${V.cam ? 'on' : ''}" data-act="toggleCam" data-tip="${V.cam ? 'Desligar câmera' : 'Ligar câmera'}">${ic(V.cam ? 'cam' : 'camOff')}</button>
    <button class="ctrl ${V.screen ? 'on' : ''}" data-act="toggleScreen" data-tip="${V.screen ? 'Parar de compartilhar' : 'Compartilhar tela'}">${ic('screen')}</button>
    <button class="ctrl" data-act="voiceSettings" data-tip="Configurar voz e vídeo">${ic('gear')}</button>
    <span class="ctrl-sep"></span>
    <button class="ctrl hang" data-act="leaveVoice" data-tip="Sair da call">${ic('hang')}</button></div></div>`;
  const calling = V.calling && peers.length <= 1 ? `<p style="text-align:center;margin:0;padding-top:12px" class="muted">Chamando ${esc(roomName(roomId))}...</p>` : '';
  // grade que ocupa o espaço: 1 → tudo, 2 → lado a lado, 3-4 → 2x2, 5-6 → 3x2, 7-9 → 3x3...
  const n = tiles.length, cols = n <= 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4, rows = Math.ceil(n / cols);
  slot.innerHTML = `<div class="stage ${isDm ? 'mini' : ''}" style="${isDm ? '' : 'flex:1'}">${calling}<div class="stage-grid ${focus ? 'has-focus' : 'fill'}" style="--cols:${cols};--rows:${rows}">
    ${focus ? focus.html.replace('class="tile', 'class="tile focus') + `<div class="thumbs">${tiles.filter(t => t !== focus).map(t => t.html).join('')}</div>` : tiles.map(t => t.html).join('')}
  </div>${ctrls}</div>`;
  tiles.forEach(t => { if (t.stream) $$(`.vslot[data-v="${t.vkey}"]`, slot).forEach(s => s.appendChild(videoEl(t.vkey, t.stream, t.mirror && t.vkey.startsWith('cam')))); });
}

/* chamadas diretas */
let incoming = null, ringTimeout = null;
async function startCall(dmId, video) {
  const joined = await joinVoice(dmId, { calling: true, video });
  if (!joined) return;
  if ((S.voice[dmId] || []).length <= 1) {
    socket.emit('call:ring', { dmId }); ring(true, true);
    clearTimeout(ringTimeout);
    ringTimeout = setTimeout(() => { if (V.room === dmId && V.calling) { toast('Ninguém atendeu.'); leaveVoice(); } }, 35000);
  }
  go({ kind: 'dm', id: dmId });
}
function onIncomingCall({ dmId, from }) {
  if (V.room === dmId) return;
  closeRing(); incoming = { dmId, from };
  const el = document.createElement('div'); el.className = 'ring'; el.id = 'ringBox';
  el.innerHTML = `${av(from, 40, false)}<div style="min-width:0"><b>${esc(nameOf(from))}</b><div class="muted small">está te ligando...</div></div>
    <button class="ctrl" data-act="declineCall" title="Recusar" style="background:var(--danger);color:#fff">${ic('hang')}</button>
    <button class="ctrl yes" data-act="acceptCall" title="Atender">${ic('phone')}</button>`;
  document.body.appendChild(el);
  if (S.me.status !== 'ocupado') ring(true);
  notifyDesktop('Chamada recebida', `${nameOf(from)} está te ligando.`, user(from).avatar);
  clearTimeout(ringTimeout); ringTimeout = setTimeout(closeRing, 35000);
}
function closeRing() { $('#ringBox')?.remove(); incoming = null; if (!V.calling) ring(false); }

/* =============== navegação =============== */
function go(view) {
  S.view = view;
  if (view.kind === 'group') S.lastCh[view.gid] = view.cid;
  $('#app').classList.remove('drawer'); $('#scrim').hidden = true;
  closePops(); render();
  const cid = viewingCid(); if (cid) setTimeout(() => markRead(cid), 50);
}
async function openDm(userId) {
  const r = await act('dm:open', { userId });
  if (r.ok) { S.dms[r.dm.id] = { ...(S.dms[r.dm.id] || { last: Date.now() }), ...r.dm }; go({ kind: 'dm', id: r.dm.id }); }
  return r.ok && r.dm.id;
}

/* =============== ações (cliques) =============== */
const A = {
  home: () => go(S.view.kind === 'friends' || S.view.kind === 'dm' ? S.view : { kind: 'friends', tab: 'online' }),
  friends: () => go({ kind: 'friends', tab: S.friends.incoming.length ? 'pendentes' : 'online' }),
  ftab: el => { S.addMsg = null; S.view = { kind: 'friends', tab: el.dataset.tab }; render(); },
  group: el => { const g = S.groups[el.dataset.id]; const cid = S.lastCh[g.id] && g.channels.some(c => c.id === S.lastCh[g.id]) ? S.lastCh[g.id] : firstText(g); go({ kind: 'group', gid: g.id, cid }); },
  channel: (el, e) => {
    if (e.target.closest('[data-act="editChannel"]')) return;
    const c = chan(S.view.gid, el.dataset.id);
    go({ kind: 'group', gid: S.view.gid, cid: c.id });
    if (c.type === 'voice' && V.room !== c.id) joinVoice(c.id);
  },
  dm: el => go({ kind: 'dm', id: el.dataset.id }),
  newGroup: () => groupModal(), joinGroup: joinModal, newDm: newDmModal,
  invite: () => inviteModal(S.groups[S.view.gid]),
  newChannel: el => channelModal(S.view.gid, el.dataset.type),
  editChannel: (el, e) => { e.stopPropagation(); channelModal(S.view.gid, null, chan(S.view.gid, el.dataset.id)); },
  groupMenu: el => {
    const g = S.groups[S.view.gid]; const own = g.ownerId === S.me.id;
    const p = pop(`<button data-m="inv">Convidar pessoas ${ic('users').replace('<svg', '<svg style="width:16px;height:16px"')}</button><button data-m="code">Copiar código de convite</button>
      <hr><button data-m="set">${gManager(g) ? 'Configurações do grupo' : 'Membros e convites'} ${ic('gear').replace('<svg', '<svg style="width:16px;height:16px"')}</button>
      ${gCan(g, 'manageRoles') ? '<button data-m="roles">Cargos</button>' : ''}${gCan(g, 'manageChannels') ? '<button data-m="ch">Criar canal</button>' : ''}<hr>
      ${own ? '<button data-m="del" class="danger">Apagar grupo</button>' : '<button data-m="leave" class="danger">Sair do grupo</button>'}`, el, 'menu');
    p.onclick = async e => {
      const m = e.target.closest('[data-m]')?.dataset.m; if (!m) return; closePops();
      if (m === 'inv') inviteModal(g); if (m === 'code') copy(g.invite, 'Código copiado.');
      if (m === 'set') openGroupSettings(g.id); if (m === 'roles') openGroupSettings(g.id, 'cargos'); if (m === 'ch') channelModal(g.id, 'text');
      if (m === 'del' && await confirmBox('Apagar grupo', `"${g.name}" e todas as mensagens serão apagados para todo mundo.`, 'Apagar grupo')) act('group:delete', { gid: g.id });
      if (m === 'leave' && await confirmBox('Sair do grupo', `Sair de "${g.name}"? Você pode voltar com um código de convite.`, 'Sair')) act('group:leave', { gid: g.id });
    };
  },
  profile: (el, e) => { e.stopPropagation(); if (e.target.closest('.acts')) return; openProfile(el.dataset.id || el.dataset.user, el); },
  openDm: el => { closePops(); openDm(el.dataset.id); },
  callUser: async el => { closePops(); const id = await openDm(el.dataset.id); if (id) startCall(id); },
  call: el => startCall(el.dataset.id, !!el.dataset.video),
  addUser: async el => { const r = await act('friend:request', { username: user(el.dataset.id).username }, 'Pedido enviado.'); if (r.ok) closePops(); },
  accept: el => { closePops(); act('friend:respond', { from: el.dataset.id, accept: true }, 'Agora vocês são amigos!'); },
  decline: el => act('friend:respond', { from: el.dataset.id, accept: false }),
  cancelReq: el => act('friend:cancel', { to: el.dataset.id }),
  kick: async el => { closePops(); const g = curGroup(); if (g && await confirmBox('Expulsar do grupo', `Expulsar ${nameOf(el.dataset.id)} de "${g.name}"? A pessoa pode voltar com um convite.`, 'Expulsar')) act('group:kick', { gid: g.id, userId: el.dataset.id }, 'Membro expulso.'); },
  ban: el => { closePops(); const g = curGroup(); if (g) banModal(g, el.dataset.id); },
  memberRoles: el => { const g = curGroup(); if (g) rolePicker(g, el.dataset.id, el); },
  groupSettings: () => { const g = curGroup(); if (g) openGroupSettings(g.id); },
  updateNow: () => { if (UPD.desk && DESK?.updateInstall) DESK.updateInstall(); else location.reload(); },
  friendMenu: (el, e) => {
    e.stopPropagation(); const id = el.dataset.id;
    const p = pop(`<button data-m="msg">Mensagem</button><button data-m="call">Ligar</button><button data-m="vid">Chamada de vídeo</button><hr><button data-m="rm" class="danger">Desfazer amizade</button>`, el, 'menu');
    p.onclick = async ev => {
      const m = ev.target.closest('[data-m]')?.dataset.m; if (!m) return; closePops();
      if (m === 'msg') openDm(id);
      if (m === 'call' || m === 'vid') { const d = await openDm(id); if (d) startCall(d, m === 'vid'); }
      if (m === 'rm' && await confirmBox('Desfazer amizade', `Remover ${nameOf(id)} dos seus amigos?`, 'Remover')) act('friend:remove', { id });
    };
  },
  copyMe: () => copy(S.me.username, 'Seu nome de usuário foi copiado.'),
  meMenu: el => {
    const cur = S.me.realStatus || S.me.status;
    const p = pop(`${Object.entries(STATUS).filter(([k]) => k !== 'offline').map(([k, l]) => `<button data-s="${k}"><span style="display:flex;gap:10px;align-items:center"><i class="dot ${k}" style="position:static;border:0"></i>${l}</span>${cur === k ? ic('check').replace('<svg', '<svg style="width:16px;height:16px"') : ''}</button>`).join('')}
      <hr><button data-m="cs">${S.me.customStatus ? 'Editar status personalizado' : 'Definir status personalizado'}</button><button data-m="pf">Editar perfil</button><button data-m="cp">Copiar meu usuário</button>`, el, 'menu', 'above');
    p.onclick = e => {
      const s = e.target.closest('[data-s]'); const m = e.target.closest('[data-m]')?.dataset.m; closePops();
      if (s) act('profile:update', { status: s.dataset.s });
      if (m === 'cs') statusModal(); if (m === 'pf') openSettings('perfil'); if (m === 'cp') copy(S.me.username);
    };
  },
  settings: el => { closePops(); openSettings(el.dataset.tab); },
  voiceSettings: () => openSettings('voz'),
  mute: toggleMute, deafen: toggleDeaf,
  toggleScreen, toggleCam,
  leaveVoice: () => leaveVoice(),
  openStage,
  joinRoom: el => joinVoice(el.dataset.id, { video: !!el.dataset.video }),
  voiceUser: (el, e) => { e.stopPropagation(); voiceMenu(el.dataset.vuid, el); },
  focus: (el, e) => { if (e.target.closest('.fs')) return; S.focusTile = S.focusTile === el.dataset.key ? null : el.dataset.key; renderStageSlot(); },
  fullscreen: (el, e) => { e.stopPropagation(); const v = el.closest('.tile').querySelector('video'); (v?.requestFullscreen ? v.requestFullscreen() : el.closest('.tile').requestFullscreen?.())?.catch?.(() => {}); },
  acceptCall: async () => { const d = incoming?.dmId; closeRing(); ring(false); if (d) { await joinVoice(d); go({ kind: 'dm', id: d }); } },
  declineCall: () => { const d = incoming?.dmId; closeRing(); ring(false); if (d) socket.emit('call:decline', { dmId: d }); },
  toggleMembers: () => { prefs.showMembers = !prefs.showMembers; savePrefs(); render(); },
  drawer: () => { const on = !$('#app').classList.contains('drawer'); $('#app').classList.toggle('drawer', on); $('#scrim').hidden = !on; },
  attach: async () => { const f = await pickFile(); if (f) sendImage(f); },
  emojiPick: el => emojiPicker(el, e => { const ta = $('#composer'); const p = ta.selectionStart; ta.value = ta.value.slice(0, p) + e + ta.value.slice(ta.selectionEnd); ta.focus(); ta.selectionStart = ta.selectionEnd = p + e.length; }),
  sendBtn: () => sendMessage(),
  react: el => emit('message:react', { cid: viewingCid(), id: el.dataset.id, emoji: el.dataset.emoji }),
  reactPick: el => emojiPicker(el, e => emit('message:react', { cid: viewingCid(), id: el.dataset.id, emoji: e })),
  reply: el => { S.reply = el.dataset.id; renderReplyBar(); $('#composer')?.focus(); },
  cancelReply: () => { S.reply = null; renderReplyBar(); },
  edit: el => { S.editing = el.dataset.id; renderMessages(); },
  delMsg: async (el, e) => { if (e.shiftKey || await confirmBox('Apagar mensagem', 'Tem certeza? Dica: segure Shift para apagar sem perguntar.', 'Apagar')) act('message:delete', { cid: viewingCid(), id: el.dataset.id }); },
  jump: el => { const m = $('#m-' + el.dataset.id); if (m) { m.scrollIntoView({ block: 'center', behavior: 'smooth' }); m.style.background = 'color-mix(in srgb, var(--accent) 20%, transparent)'; setTimeout(() => m.style.background = '', 1400); } },
  zoom: el => { const lb = document.createElement('div'); lb.className = 'lightbox'; lb.innerHTML = `<img src="${esc(el.src)}" alt="">`; lb.onclick = () => lb.remove(); document.body.appendChild(lb); }
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el && A[el.dataset.act]) { A[el.dataset.act](el, e); return; }
  const u = e.target.closest('.av[data-user]');
  if (u && !e.target.closest('.pop') && !e.target.closest('.settings') && !e.target.closest('.modal')) openProfile(u.dataset.user, u);
});
$('#scrim').onclick = () => { $('#app').classList.remove('drawer'); $('#scrim').hidden = true; };

/* dicas ao passar o mouse */
let tipEl = null;
document.addEventListener('mouseover', e => {
  const t = e.target.closest('[data-tip]');
  if (!t) { tipEl?.remove(); tipEl = null; return; }
  if (tipEl && tipEl._for === t) return;
  tipEl?.remove(); tipEl = document.createElement('div'); tipEl.className = 'tip'; tipEl.textContent = t.dataset.tip; tipEl._for = t;
  document.body.appendChild(tipEl);
  const r = t.getBoundingClientRect();
  const side = t.closest('#rail');
  let x = side ? r.right + 10 : r.left + r.width / 2 - tipEl.offsetWidth / 2, y = side ? r.top + r.height / 2 - tipEl.offsetHeight / 2 : r.top - tipEl.offsetHeight - 8;
  if (y < 4) y = r.bottom + 8;
  tipEl.style.left = clamp(x, 4, innerWidth - tipEl.offsetWidth - 4) + 'px'; tipEl.style.top = y + 'px';
});

/* teclado */
document.addEventListener('keydown', e => {
  const typing = e.target.matches('input, textarea, select, [contenteditable]');
  if (e.ctrlKey && e.shiftKey && e.code === 'KeyM') { e.preventDefault(); toggleMute(); }
  if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') { e.preventDefault(); toggleDeaf(); }
  if (prefs.ptt && V.room && e.code === prefs.pttKey && !typing && !capturingKey && !V.pttDown) { V.pttDown = true; applyMicGate(); }
});
document.addEventListener('keyup', e => { if (prefs.ptt && e.code === prefs.pttKey && V.pttDown) { V.pttDown = false; applyMicGate(); } });
window.addEventListener('blur', () => { if (V.pttDown) { V.pttDown = false; applyMicGate(); } });
window.addEventListener('beforeunload', () => { if (V.room) socket?.emit('voice:leave'); });

/* =============== início =============== */
if (S.token) connect(); else showAuth();
})();
