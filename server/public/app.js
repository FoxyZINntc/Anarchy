/* Anarchy — app */
(() => {
'use strict';
// apps de computador antigos (de quando o projeto se chamava Discordia) mostram a ponte com o nome antigo
if (!window.anarchyDesktop && window.discordiaDesktop) window.anarchyDesktop = window.discordiaDesktop;

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
  ban: '<circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/>',
  sticker: '<path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9.5L21 14.5V5a2 2 0 0 0-2-2z"/><path d="M14 21v-5a2 2 0 0 1 2-2h5M8.5 10h.01M14.5 10h.01M8.5 14.5s1.2 1.5 3.5 1.5"/>',
  board: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M15.5 15.5v4l3.5-2z"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  pin: '<path d="M12 17v5M9 10.76V6h6v4.76a2 2 0 0 0 1.11 1.79l1.78.9A2 2 0 0 1 19 15.24V17H5v-1.76a2 2 0 0 1 1.11-1.79l1.78-.9A2 2 0 0 0 9 10.76zM8 3h8"/>',
  star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01" stroke-width="3"/>'
};
const ic = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;
const QUICK = ['👍', '😂', '❤️', '🔥', '😮', '😢'];
const GROUP_EMOJIS = '🎮 🏍️ 🎧 🍕 🔥 ⚡ 🌙 🚀 🐉 🎵 📚 💻 🏆 🌿 🦊 👾'.split(' ');
const COLORS = ['#6c7cff', '#ff6b8b', '#3ee0c5', '#f5b83d', '#b07cff', '#4fc3f7', '#7bd88f', '#ff8a4c', '#e0517f', '#f2545b'];
const STATUS = { online: 'Disponível', ausente: 'Ausente', ocupado: 'Não perturbe', invisivel: 'Invisível', offline: 'Offline' };

function toast(msg, err, ms = 4200) {
  const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), ms);
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
  lavanda: { nome: 'Lavanda', dark: 0, rail: '#e6e1f5', side: '#efebfa', main: '#f8f6ff', panel: '#ffffff', elev: '#ebe6f9', hover: '#e2dcf5', line: '#d8d0f0', text: '#2a2340', muted: '#7a7194', accent: '#7c5cff', accentText: '#ffffff', accent2: '#ff6b8b' },
  // temas animados: cores + uma cena animada no fundo (fx.js) + detalhes na interface (classe fx-<cena> no body)
  'neon-city': { nome: 'Neon City', fx: 'neon', desc: 'Cidade cyberpunk, chuva neon e glitch', prev: 'linear-gradient(180deg,#05030c,#140a2a 60%,#ff2a6d55), #05030c', dark: 1, rail: '#07060d', side: '#0b0a16', main: '#0d0c1b', panel: '#141229', elev: '#1a1735', hover: '#221e44', line: '#2e2950', text: '#e8f6ff', muted: '#8a8fb0', accent: '#fcee0a', accentText: '#0b0a12', accent2: '#00f0ff', head: '"Chakra Petch", sans-serif', radius: 3 },
  'synthwave': { nome: 'Pôr do sol retrô', fx: 'synth', desc: 'Synthwave: sol listrado e grade andando', prev: 'linear-gradient(180deg,#0c0322,#3b0a5c 50%,#ff3e8a 62%,#1b0433 63%)', dark: 1, rail: '#110523', side: '#170931', main: '#1b0a38', panel: '#240f48', elev: '#2c1356', hover: '#361966', line: '#47227d', text: '#fde9ff', muted: '#b48ccf', accent: '#ff3ea5', accentText: '#ffffff', accent2: '#ffb347', head: '"Space Grotesk", sans-serif' },
  'terminal': { nome: 'Terminal', fx: 'terminal', desc: 'Chuva de código verde', prev: 'repeating-linear-gradient(90deg,#020604 0 9px,#0b3d1a 9px 10px), #020604', dark: 1, rail: '#000000', side: '#020804', main: '#030a05', panel: '#06120a', elev: '#0a1a0f', hover: '#0e2414', line: '#12331b', text: '#b8ffc8', muted: '#4f8a5e', accent: '#2bff6a', accentText: '#001a08', accent2: '#9dff00', head: '"JetBrains Mono", monospace', radius: 2 },
  'sakura-vento': { nome: 'Sakura ao vento', fx: 'sakura', desc: 'Pétalas caindo, clima de anime', prev: 'radial-gradient(circle at 30% 40%,#ff9dbd 0 4px,transparent 5px), radial-gradient(circle at 70% 70%,#ffb7cf 0 3px,transparent 4px), linear-gradient(180deg,#ffe9f1,#e8d6ff)', dark: 0, rail: '#f6dfe7', side: '#fbeaf0', main: '#fff5f8', panel: '#ffffff', elev: '#f7e4eb', hover: '#f2d9e2', line: '#ecd0da', text: '#3d2633', muted: '#8d6c7b', accent: '#ff5d8f', accentText: '#ffffff', accent2: '#9b7bff', head: '"Nunito", sans-serif' },
  'galaxia': { nome: 'Galáxia', fx: 'galaxia', desc: 'Nebulosa e estrelas cadentes', prev: 'radial-gradient(circle at 25% 30%,#5b3cff66,transparent 50%), radial-gradient(circle at 80% 70%,#ff3ea566,transparent 50%), #03030a', dark: 1, rail: '#04040c', side: '#080a18', main: '#0a0c1e', panel: '#10132b', elev: '#151936', hover: '#1b2042', line: '#252a52', text: '#eef0ff', muted: '#8d93c0', accent: '#8f7bff', accentText: '#ffffff', accent2: '#4fd1ff' },
  'brasas': { nome: 'Brasas', fx: 'brasas', desc: 'Fagulhas subindo da fogueira', prev: 'radial-gradient(ellipse at 50% 110%,#ff6a1a99,transparent 60%), linear-gradient(180deg,#0b0505,#4a1406)', dark: 1, rail: '#0d0605', side: '#150a08', main: '#1a0c09', panel: '#22110d', elev: '#2a1610', hover: '#331b13', line: '#3d2218', text: '#ffeee6', muted: '#b58a7a', accent: '#ff6a1a', accentText: '#1a0700', accent2: '#ffc23d' }
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
const DEFAULT_PREFS = { theme: 'meia-noite', accent: null, font: 'inter', fontSize: 15, density: 'conf', radius: null, layout: 'padrao', avatars: true, clock24: true, bg: 'none', bgImage: null, glass: 82, anim: true, sounds: true, volume: 60, desktop: false, mentionsOnly: false, micId: '', spkId: '', camId: '', ns: true, ec: true, agc: true, ptt: false, pttKey: 'KeyV', quality: '1080p30', showMembers: true, joinSounds: true, vol: {}, svol: {}, umute: {},
  profileFx: true, lite: false, hidePreview: false, micGain: 100, vadMode: 'auto', vadLevel: 12, outVol: 100, sbVol: 70, sbOn: true };
let prefs = { ...DEFAULT_PREFS };
try { const st = JSON.parse(localStorage.getItem('discordia:prefs') || '{}'); prefs = { ...prefs, ...st }; if ((window.anarchyDesktop || window.AnarchyAndroid) && !('desktop' in st)) prefs.desktop = true; } catch {}
const DESK = window.anarchyDesktop || null;
// app de celular (APK): ponte com o Android para notificações, call em segundo plano e botão voltar
const DROID = window.AnarchyAndroid || null;
const droid = (fn, ...a) => { try { return DROID && DROID[fn] ? DROID[fn](...a) : undefined; } catch { return undefined; } };
if (DROID) document.documentElement.classList.add('android');
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
  // tema animado: a cena aparece atrás dos painéis (que ficam um pouco transparentes)
  document.body.className = document.body.className.replace(/\bfx-\S+/g, '').trim();
  if (t.fx && window.AnarchyFx) {
    document.body.classList.add('fx-on', 'fx-' + t.fx);
    // painéis mais transparentes para a cena aparecer (a barra "Transparência dos painéis" continua valendo)
    bg.style.background = t.rail; set('--glass', clamp(prefs.glass - 22, 38, 86) + '%');
    window.AnarchyFx.start(t.fx, { anim: prefs.anim, lite: prefs.lite });
  } else if (window.AnarchyFx) window.AnarchyFx.stop();
  if (t.fx) { /* já cuidou do fundo */ }
  else if (prefs.bg === 'none' || (prefs.bg === 'custom' && !prefs.bgImage)) { bg.style.background = ''; set('--glass', '100%'); }
  else {
    set('--glass', prefs.glass + '%');
    bg.style.background = prefs.bg === 'custom' ? `center / cover no-repeat url("${prefs.bgImage}")` : BGS[prefs.bg][1]({ ...t, accent });
  }
  // com fundo (imagem, degradê ou tema animado) o app deixa o fundo aparecer atrás dos painéis
  document.body.classList.toggle('has-bg', !!t.fx || !(prefs.bg === 'none' || (prefs.bg === 'custom' && !prefs.bgImage)));
  document.body.classList.toggle('no-anim', !prefs.anim);
  document.body.classList.toggle('hide-avatars', !prefs.avatars);
  document.body.classList.toggle('bubbles', prefs.layout === 'bolhas');
  document.body.classList.toggle('no-pfx', !prefs.profileFx);
  document.body.classList.toggle('lite', !!prefs.lite);
}
function contrast(hex) { const n = parseInt(hex.slice(1), 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (r * 299 + g * 587 + b * 114) / 1000 > 150; }
applyPrefs();

/* =============== estado =============== */
const S = {
  token: null, me: null, // o login fica num cookie HttpOnly; o token só fica na memória nesta aba, como reserva users: {}, friends: { friends: [], incoming: [], outgoing: [] },
  groups: {}, dms: {}, voice: {}, view: { kind: 'friends', tab: 'online' }, lastCh: {}, msgs: {}, more: {}, loading: {},
  unread: {}, mentions: {}, typing: {}, drafts: {}, reply: null, editing: null, focusTile: null, mySid: null, connected: false, unhide: {}, music: {}, clockOff: 0
};
let socket = null, srvStarted = null;
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
  ['manageMessages', 'Gerenciar mensagens', 'Apagar mensagens de outras pessoas. Também ignora o modo lento.'],
  ['manageMedia', 'Gerenciar Central de Áudio e figurinhas', 'Adicionar e apagar os sons da Central de Áudio e as figurinhas do grupo.'],
  ['mentionEveryone', 'Mencionar @todos', 'Escrever @todos para avisar todo mundo do grupo de uma vez.'],
  ['rpg', 'Criar campanhas de RPG', 'Criar campanhas no RPG de Mesa quando o grupo deixa só cargos com esta permissão (Configurações do grupo → RPG de Mesa).']
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
const nameColor = (uid, g) => readable((g && gRoles(g, uid).find(r => r.color)?.color) || user(uid).color) || 'var(--text)';
// cor de nome sempre legível: muito escura no tema escuro (ou muito clara no claro) é clareada/escurecida
function readable(c) {
  if (!/^#[0-9a-f]{6}$/i.test(c || '')) return null;
  const n = parseInt(c.slice(1), 16), ch = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
  const lum = .2126 * ch(n >> 16) + .7152 * ch((n >> 8) & 255) + .0722 * ch(n & 255);
  const dark = (THEMES[prefs.theme] || THEMES['meia-noite']).dark;
  if (dark && lum < .12) return `color-mix(in srgb, ${c} 35%, #ffffff)`;
  if (!dark && lum > .7) return `color-mix(in srgb, ${c} 45%, #000000)`;
  return c;
}
const gManager = g => ['manageServer', 'manageChannels', 'manageRoles', 'kick', 'ban'].some(p => gCan(g, p));
const curGroup = () => (S.view.kind === 'group' ? S.groups[S.view.gid] : null);
const SLOW_OPTS = [[0, 'Desligado'], [5, '5 segundos'], [10, '10 segundos'], [15, '15 segundos'], [30, '30 segundos'], [60, '1 minuto'], [120, '2 minutos'], [300, '5 minutos'], [600, '10 minutos'], [3600, '1 hora']];
const slowLabel = s => (SLOW_OPTS.find(o => o[0] === s) || [0, ''])[1];

/* =============== avatares =============== */
/* Avatar: a foto fica numa camada própria (.av-i), recortada para a bolinha de status (sem borda colorida
   que dependia da cor do painel). A moldura é outra camada por cima, do tamanho do avatar (--s), e as cores
   vêm só de variáveis no próprio elemento: o perfil de uma pessoa nunca pinta o de outra. */
const HEXC = /^#[0-9a-f]{6}$/i;
const safeC = (c, d = '#777777') => (HEXC.test(c || '') ? c : d);
function av(id, size = 32, dot = true, extra = '', uo = null) {
  const u = uo || user(id);
  const st = u.status || 'offline';
  const img = u.avatar ? `background-image:url('${esc(u.avatar)}')` : '';
  const ini = u.avatar ? '' : esc((u.displayName || u.username || '?').trim()[0]?.toUpperCase() || '?');
  const frame = u.frame && FRAMES[u.frame] ? u.frame : null;
  // efeito animado de foto (das caixas): camada atrás e em volta da foto
  const fx = u.avfx && /^[a-z]+-[a-z]+$/.test(u.avfx) ? u.avfx.split('-') : null;
  return `<div class="av s${size}${dot ? ' has-dot' : ''}${frame ? ` fr fr-${frame}` : ''} ${extra}" style="--s:${size}px;--uc:${safeC(u.color)};--fc:${safeC(u.accent, safeC(u.color))}" data-user="${esc(id)}">${fx ? `<i class="av-fx avx-${fx[0]} pal-${fx[1]}" aria-hidden="true"></i>` : ''}<span class="av-i" style="${img}">${ini}</span>${frame ? '<i class="av-fr" aria-hidden="true"></i>' : ''}${dot ? `<i class="dot ${st}" title="${esc(STATUS[st] || '')}"></i>` : ''}</div>`;
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
  req: () => tone([[660, .1], [880, .1], [1100, .2]], 'triangle'),
  mention: () => tone([[988, .08], [1319, .08], [1760, .18]], 'sine', .16)
};
let ringTimer = null;
function ring(start, outgoing) {
  clearInterval(ringTimer); ringTimer = null;
  if (!start) return;
  const pat = () => outgoing ? tone([[440, .4], [480, .4]], 'sine', .08) : tone([[784, .15], [988, .15], [784, .15], [988, .25]], 'triangle', .12);
  pat(); ringTimer = setInterval(pat, outgoing ? 2600 : 1800);
}
function notifyDesktop(title, body, icon) {
  if (DROID) { if (prefs.desktop) droid('notify', String(title || 'Anarchy'), String(body || '')); return; } // o Android só mostra se o app não estiver na tela
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
    pass: ['Senha', reg ? 'mínimo 8 caracteres' : 'sua senha', 'password', reg ? 'new-password' : 'current-password'],
    login: ['Usuário ou email', 'seu usuário ou o email da conta', 'text', 'username'],
    newpass: ['Nova senha', 'mínimo 8 caracteres', 'password', 'new-password']
  }[step];
  $('#authLabel').textContent = cfg[0]; inp.placeholder = cfg[1]; inp.type = cfg[2]; inp.autocomplete = cfg[3];
  inp.value = step === 'user' ? (AU.data.username || '') : step === 'name' ? (AU.data.displayName || '') : step === 'login' ? (AU.data.username || '') : '';
  inp.maxLength = step === 'user' ? 20 : step === 'name' ? 32 : 200;
  const secret = step === 'pass' || step === 'newpass';
  const peek = $('#authPeek'); peek.hidden = !secret; peek.setAttribute('aria-pressed', 'false');
  if (secret) ptMood('shy', 'de olhos fechados 🙈'); else ptMood('look', 'online');
  $('#authForm').classList.remove('bad', 'good');
}
async function authStart(mode = AU.mode, keep = {}) {
  AU.gen++; AU.mode = mode; AU.data = { ...keep }; AU.busy = false;
  const reg = mode === 'register';
  $('#authSwitch').textContent = mode === 'login' ? 'Criar conta' : 'Já tenho conta';
  $('#authLog').innerHTML = '<div class="au-day">HOJE</div>';
  if (mode === 'forgot') {
    ask('login');
    await bot(['Esqueceu a senha? Acontece nas melhores famílias 😅', 'Me diz seu nome de usuário ou o email da conta que eu mando um link pra você criar uma senha nova.'], { chips: [['Lembrei! Voltar', () => authStart('login')]] });
    return;
  }
  ask('user');
  if (reg) await bot(['Gente nova! Adoro 🎉', 'Escolhe um nome de usuário. É com ele que os amigos vão te achar (3 a 20 caracteres: letras minúsculas, números, ponto ou _).']);
  else await bot(['Opa! Eu sou o Porteiro do Anarchy 👋', 'Ninguém entra sem se identificar. Qual é o seu nome de usuário?'], { chips: [['Esqueci a senha', () => authStart('forgot')]] });
}
// link do email "criar senha nova" (?reset=...): o Porteiro pede a senha nova
async function authReset(token) {
  AU.gen++; AU.mode = 'reset'; AU.data = { token }; AU.busy = false;
  $('#authSwitch').textContent = 'Já tenho conta';
  $('#authLog').innerHTML = '<div class="au-day">HOJE</div>';
  ask('newpass');
  try {
    const r = await api('/api/reset/check', { token });
    AU.data.username = r.username; AU.data.displayName = r.displayName;
    await bot([`Oi, @${r.username}! Chegou pelo link do email, né? 📬`, 'Inventa uma senha nova (mínimo 8 caracteres). Fecho os olhos de novo 🙈']);
  } catch (e) {
    ptMood('sad', 'meio triste');
    await bot(e.message, { err: true, chips: [['Pedir outro link', () => authStart('forgot')], ['Entrar', () => authStart('login')]] });
  }
}
function showAuth() {
  $('#app').hidden = true; $('#auth').hidden = false;
  const reset = new URLSearchParams(location.search).get('reset');
  if (reset) { history.replaceState(null, '', location.pathname); authReset(reset); }
  else authStart('login');
  ptEnter(); ptActivity();
}
function authBad(msg) {
  $('#authForm').classList.remove('bad'); void $('#authForm').offsetWidth; $('#authForm').classList.add('bad');
  ptAnim('shake'); return bot(msg, { err: true });
}
$('#authSwitch').onclick = () => authStart(AU.mode === 'login' ? 'register' : 'login');
// "esqueci a senha": manda o link por email
async function authForgot(val) {
  AU.busy = true; $('#authBtn').disabled = true; $('#ptStatus').textContent = 'escrevendo o email...';
  const g = AU.gen;
  try {
    await api('/api/forgot', { login: val });
    if (g !== AU.gen) return;
    AU.busy = false; ptMood('happy', 'online'); ptAnim('jump');
    await bot(['Pronto! Se essa conta tiver um email confirmado, o link já está a caminho 📬', 'Olhe a caixa de entrada (e o spam). O link vale 30 minutos.'], { chips: [['Voltar para entrar', () => authStart('login', { username: val.includes('@') ? '' : val.replace(/^@/, '') })], ['Mandar de novo', () => authStart('forgot')]] });
    ptMood('look', 'online');
  } catch (e) {
    if (g !== AU.gen) return;
    AU.busy = false; ptMood('sad', 'meio triste');
    await authBad(`Eita! ${e.message}`);
    ask('login');
  }
}
// senha nova pelo link do email
async function authNewPass(val) {
  if (val.length < 8) { await authBad('Curtinha demais! A senha precisa de pelo menos 8 caracteres.'); ask('newpass'); return; }
  AU.busy = true; $('#authBtn').disabled = true; $('#ptStatus').textContent = 'trocando a fechadura...';
  const g = AU.gen;
  try {
    const r = await api('/api/reset', { token: AU.data.token, password: val });
    if (g !== AU.gen) return;
    AU.busy = false; AU.data.displayName = r.displayName; AU.data.username = r.username;
    await authWin(r.token);
  } catch (e) {
    if (g !== AU.gen) return;
    AU.busy = false; ptMood('sad', 'meio triste');
    await authBad(`Eita! ${e.message}`);
    if (/venceu|usado/i.test(e.message)) await bot('Quer outro link?', { chips: [['Pedir outro link', () => authStart('forgot')], ['Entrar', () => authStart('login')]] });
    else ask('newpass');
  }
}
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
  const secret = AU.step === 'pass' || AU.step === 'newpass';
  const val = secret ? raw : raw.trim();
  if (!val && AU.step !== 'name') { ptAnim('boop'); inp.focus(); return; }
  $('#authForm').classList.remove('bad'); $$('#authLog .au-chips').forEach(c => c.remove());
  authAdd(secret ? '•'.repeat(Math.min(val.length, 12)) : esc(val || '(pulei)'), 'au-msg me' + (secret ? ' secret' : ''));
  inp.value = '';
  if (AU.step === 'login') return authForgot(val.toLowerCase());
  if (AU.step === 'newpass') return authNewPass(val);
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
  if (reg && val.length < 8) { await authBad('Curtinha demais! A senha precisa de pelo menos 8 caracteres.'); ask('pass'); return; }
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
    await bot('Bora de novo? Manda a senha.', { chips: [['Trocar usuário', () => authStart(AU.mode)], ...(reg ? [] : [['Esqueci a senha', () => authStart('forgot', { username: AU.data.username })], ['Criar conta', () => authStart('register')]])] });
  }
};
async function goPass() {
  ask('pass');
  await bot('Agora inventa uma senha (mínimo 8 caracteres). Juro que fecho os olhos 🙈');
}
async function authWin(token) {
  const name = AU.data.displayName || AU.data.username;
  clearTimeout(ptIdle1); clearTimeout(ptIdle2);
  ptMood('happy', 'comemorando 🎉'); ptAnim('jump'); setTimeout(ptWave, 500); $('#authForm').classList.add('good');
  $('#authInput').blur(); $('#authBtn').disabled = true;
  authAdd(esc(AU.mode === 'register' ? `Prontinho, ${name}! Conta criada. Seja bem-vindo 🎉` : AU.mode === 'reset' ? `Senha nova guardada, ${name}! Os outros aparelhos saíram da conta por segurança. Pode entrar 🎉` : `Achei você, ${name}! Pode entrar, a galera tá te esperando 🎉`), 'au-msg');
  tone([[523, .1], [659, .1], [784, .1], [1047, .25]], 'triangle', .08);
  confetti();
  await authWait(reduceMotion() ? 200 : 1300);
  S.token = token; connect(); // o servidor já gravou o cookie de sessão
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
  try { localStorage.removeItem('discordia:token'); } catch {} S.token = null; if (V.room) leaveVoice('você saiu da conta');
  if (socket) socket.disconnect(); socket = null; closeSettings(); showAuth();
}

/* =============== email de recuperação =============== */
// quem ainda não tem email ganha o pedido ao entrar; "agora não" pergunta de novo em 3 dias
const EMAIL_ASK_EVERY = 3 * 864e5;
function maybeAskEmail(tries = 0) {
  const me = S.me; if (!me || !me.mailOn || me.email) return;
  if (me.emailAsked && Date.now() - me.emailAsked < EMAIL_ASK_EVERY) return;
  if ($('#modalRoot .modal-back')) { if (tries < 30) setTimeout(() => maybeAskEmail(tries + 1), 3000); return; } // espera as Novidades fecharem
  emailModal(true);
}
function emailModal(first) {
  modal(`<div class="modal-h"><div class="em-ic">📬</div><h2>${first ? 'Proteja sua conta' : 'Email de recuperação'}</h2><p>Ligue um email à sua conta para conseguir criar uma senha nova se um dia esquecer a sua. Ninguém mais vê esse email.</p></div>
    <div class="modal-b em-b"><div id="emS1"><label class="field">Seu email<input type="email" id="emE" autocomplete="email" placeholder="voce@exemplo.com" maxlength="254" value="${esc(S.me.email || '')}"></label></div>
      <div id="emS2" hidden><p class="muted small" id="emTo"></p><label class="field">Código de 6 dígitos<input id="emC" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" class="em-code"></label>
      <button class="btn ghost sm" id="emBack" type="button">Trocar o email ou mandar outro código</button></div>
      <p class="form-err" id="emErr"></p></div>
    <div class="modal-f"><button class="btn ghost" id="emLater">${first ? 'Agora não' : 'Cancelar'}</button><button class="btn primary" id="emGo">Enviar código</button></div>`, (m, close) => {
    let step = 1;
    const err = t => { $('#emErr', m).textContent = t || ''; };
    const go = $('#emGo', m);
    $('#emLater', m).onclick = () => { if (first) { emit('email:later'); S.me.emailAsked = Date.now(); } close(); };
    $('#emBack', m).onclick = () => { step = 1; $('#emS1', m).hidden = false; $('#emS2', m).hidden = true; go.textContent = 'Enviar código'; err(); $('#emE', m).focus(); };
    const submit = async () => {
      if (go.disabled) return;
      err(); go.disabled = true;
      try {
        if (step === 1) {
          const r = await emit('email:start', { email: $('#emE', m).value });
          if (!r.ok) return err(r.erro);
          step = 2; $('#emS1', m).hidden = true; $('#emS2', m).hidden = false; go.textContent = 'Confirmar';
          $('#emTo', m).innerHTML = `Mandamos um código para <b>${esc(r.masked)}</b>. Pode levar um minutinho (olhe também o spam).`;
          $('#emC', m).value = ''; $('#emC', m).focus();
        } else {
          const r = await emit('email:confirm', { code: $('#emC', m).value });
          if (!r.ok) return err(r.erro);
          S.me = { ...S.me, ...r.me }; S.users[S.me.id] = S.me; close();
          toast('Email confirmado! Se esquecer a senha, dá para criar outra por ele.');
          if ($('#setBody') && setTab === 'conta') drawSettings();
        }
      } finally { go.disabled = false; }
    };
    go.onclick = submit;
    m.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('#emE, #emC')) { e.preventDefault(); submit(); } });
    $('#emC', m).oninput = e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); if (e.target.value.length === 6) submit(); };
  });
}

/* =============== conexão =============== */
function connect() {
  if (socket) socket.disconnect();
  socket = io({ auth: S.token ? { token: S.token } : {}, transports: ['websocket', 'polling'] });
  if (window.anarchyRpg) window.anarchyRpg.attach(socket); // eventos do RPG de Mesa (rpg.js)
  if (window.anarchyFun) window.anarchyFun.attach(socket); // enquetes, bombas, conquistas, roleta... (diversao.js)
  socket.on('connect', async () => {
    const r = await emit('init');
    if (!r.ok) return;
    S.connected = true; S.mySid = r.socketId; S.me = r.me; S.users = r.users; S.users[r.me.id] = r.me;
    S.friends = r.friends; S.groups = r.groups; S.dms = r.dms; S.voice = r.voice; V.ice = r.iceServers;
    S.music = r.music || {}; if (r.serverNow) S.clockOff = r.serverNow - Date.now();
    $('#auth').hidden = true; $('#app').hidden = false;
    if (S.view.kind === 'group' && !S.groups[S.view.gid]) S.view = { kind: 'friends', tab: 'online' };
    if (S.view.kind === 'dm' && !S.dms[S.view.id]) S.view = { kind: 'friends', tab: 'online' };
    S.msgs = {}; S.more = {}; mainKey = null; render();
    // servidor reiniciou com uma interface nova? mostra a barra "Atualizar"
    if (r.build) { if (UPD.build && UPD.build !== r.build) { UPD.web = true; showUpd(); } if (!UPD.build) UPD.build = r.build; }
    if (r.started && srvStarted && r.started !== srvStarted) clog('O servidor reiniciou enquanto você estava desconectado (atualização do servidor ou queda dele).', V.rejoin ? 'aviso' : '');
    if (r.started) srvStarted = r.started;
    clog(`Conectado ao servidor (${socket.io.engine?.transport?.name || '?'}).`);
    // novidades desde a última vez (só uma vez por abertura do app)
    if (!connect.news) { connect.news = true; setTimeout(() => showNews(false), 1200); setTimeout(maybeAskEmail, 2500); }
    // presentes que chegaram enquanto estava fora
    setTimeout(() => (S.me.items || []).filter(x => x.seen === false).forEach(x => giftQueue(x, S.users[x.from])), 1500);
    // caiu no meio da call: volta sozinho para a mesma sala
    const rj = V.rejoin; V.rejoin = null;
    if (rj && !V.room) {
      const still = S.dms[rj.room] || Object.values(S.groups).some(g => g.channels.some(c => c.id === rj.room && c.type === 'voice'));
      if (Date.now() - rj.at > 180000) clog('Não voltei para a call: a conexão ficou fora por mais de 3 minutos.', 'aviso');
      else if (!still) clog('Não voltei para a call: a sala não existe mais ou você perdeu o acesso.', 'aviso');
      else {
        clog(`Voltando sozinho para a call (${clogRoom(rj.room)}), ${Math.round((Date.now() - rj.at) / 1000)} s depois da queda.`);
        const okj = await joinVoice(rj.room, { calling: rj.calling });
        if (okj) toast('Conexão de volta: você voltou para a call.'); else clog('Não consegui voltar para a call sozinho.', 'erro');
      }
    }
  });
  socket.on('connect_error', e => {
    if (e.message === 'auth') { clog('O servidor recusou o login (sessão expirou). Entre de novo.', V.rejoin ? 'erro' : ''); V.rejoin = null; socket.disconnect(); S.token = null; showAuth(); return; }
    if (V.rejoin || V.room) clog(`Tentando reconectar ao servidor: ${e.message || 'sem resposta'}.`, 'aviso');
  });
  socket.on('disconnect', reason => {
    S.connected = false;
    if (V.room) {
      const why = DROP_WHY[reason] || reason;
      clog(`Caiu da call (${clogRoom(V.room)}): ${why}.${navigator.onLine ? '' : ' O Windows também diz que a internet caiu.'}`, 'erro');
      if (reason !== 'io client disconnect' && reason !== 'io server disconnect') { V.rejoin = { room: V.room, at: Date.now(), calling: V.calling }; }
      cleanupVoice();
      toast(V.rejoin ? 'A conexão caiu. Volto para a call assim que reconectar...' : 'A conexão caiu. Você saiu da call.', true, 6000);
    } else clog(`Desconectado do servidor: ${DROP_WHY[reason] || reason}.`);
    render();
  });
  socket.on('me:update', u => {
    if (!S.users) return; // ainda carregando
    S.me = u; S.users[u.id] = u; render();
    // só redesenha as telas que mostram isso (e não a cada minuto de call se nada mudou na tela)
    if ($('#setBody') && setTab === 'inventario' && !$('.case-back') && invSig(u) !== drawInventory.sig) drawSettings();
  });
  // presente de pontos do dono: abre como presente (igual às placas)
  socket.on('points:gift', ({ amount, points, from, msg }) => {
    if (from && !S.users[from.id]) S.users[from.id] = from;
    GIFT.q.push({ pts: { amount, points, msg }, from }); if (!GIFT.open) giftNext();
  });
  // ganhou AnarchyPoints (tempo de call, ou presente do dono)
  socket.on('points:gain', ({ amount, points, from }) => {
    toast(`+${amount} AnarchyPoints ${from ? `de ${from}` : `por ${ptMin()} minutos em call`} · saldo ${points.toLocaleString('pt-BR')}${points >= BOX_COST ? ' · dá para abrir uma caixa!' : ''}`);
    tone([[880, .06], [1320, .12]], 'triangle', .05);
  });
  // ganhou uma placa: notificação diferente (som de presente) e o baú na tela
  socket.on('inv:gift', ({ entry, from }) => {
    if (from && !S.users[from.id]) S.users[from.id] = from;
    const p = PLATES[entry.item]; if (!p) return;
    notifyDesktop('🎁 Você ganhou um presente!', `${from?.displayName || nameOf(entry.from)} te deu: ${p[0]} (${RAR[p[1]][0]})`);
    giftQueue(entry, from);
  });
  socket.on('user:update', u => { S.users[u.id] = u; render(); });
  socket.on('friends:update', f => { S.friends = f; render(); });
  socket.on('group:update', ({ group, users }) => {
    S.groups[group.id] = group; users.forEach(u => { if (u.id !== S.me.id) S.users[u.id] = u; });
    if (S.view.kind === 'group' && S.view.gid === group.id && !group.channels.some(c => c.id === S.view.cid)) S.view.cid = firstText(group);
    render();
    // as abas de lista das configurações do grupo acompanham as mudanças
    if ($('.gset') && gsGid === group.id && ['membros', 'canais', 'convites', 'banimentos', 'sons', 'figurinhas'].includes(gsTab)) drawGroupSettings();
  });
  socket.on('group:removed', ({ gid }) => {
    const g = S.groups[gid]; delete S.groups[gid];
    if ($('.gset') && gsGid === gid) closeSettings();
    if (g && V.room && g.channels.some(c => c.id === V.room)) leaveVoice('você não está mais no grupo');
    if (S.view.kind === 'group' && S.view.gid === gid) { S.view = { kind: 'friends', tab: 'online' }; if (g) toast(`Você não está mais em "${g.name}".`); }
    render();
  });
  socket.on('dm:update', dm => { S.dms[dm.id] = { ...(S.dms[dm.id] || {}), ...dm }; render(); });
  socket.on('message:new', onMessage);
  socket.on('message:update', m => { const l = S.msgs[m.cid]; if (!l) return; const i = l.findIndex(x => x.id === m.id); if (i >= 0) l[i] = m; if (viewingCid() === m.cid) renderMessages(); });
  socket.on('message:delete', ({ cid, id }) => { const l = S.msgs[cid]; if (!l) return; S.msgs[cid] = l.filter(x => x.id !== id); if (viewingCid() === cid) renderMessages(); });
  socket.on('typing', ({ cid, uid }) => { (S.typing[cid] = S.typing[cid] || {})[uid] = Date.now(); if (viewingCid() === cid) renderTyping(); });
  socket.on('voice:room', onVoiceRoom);
  socket.on('music:state', ({ roomId, state }) => {
    if (state) { S.music[roomId] = state; S.clockOff = state.serverNow - Date.now(); } else delete S.music[roomId];
    musicSync(); render();
  });
  socket.on('rtc:signal', onSignal);
  socket.on('sound:played', onSoundPlayed);
  socket.on('sound:stopped', ({ roomId, uid }) => { if (roomId === V.room) stopSoundsOf(uid); });
  socket.on('call:incoming', onIncomingCall);
  socket.on('call:ended', ({ dmId }) => { if (incoming && incoming.dmId === dmId) closeRing(); });
  socket.on('call:declined', ({ dmId, by }) => {
    if (incoming && incoming.dmId === dmId && by === S.me.id) closeRing();
    if (V.room === dmId && by !== S.me.id && (S.voice[dmId] || []).length <= 1) { ring(false); toast(`${nameOf(by)} recusou a chamada.`); leaveVoice('a pessoa recusou a chamada'); }
  });
  socket.on('notify', n => {
    if (n.type === 'friend-request') { SOUNDS.req(); toast(`${nameOf(n.from)} te enviou um pedido de amizade.`); notifyDesktop('Pedido de amizade', `${nameOf(n.from)} quer ser seu amigo no Anarchy.`); }
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
  if ((S.me.blocked || []).includes(m.authorId)) return; // de quem você bloqueou: nada de aviso
  const mention = mentionsMe(m);
  S.unread[m.cid] = (S.unread[m.cid] || 0) + 1;
  if (mention || isDm) S.mentions[m.cid] = (S.mentions[m.cid] || 0) + 1;
  const quiet = S.me.status === 'ocupado' || (!isDm && prefs.mentionsOnly && !mention);
  if (!quiet) {
    (mention ? SOUNDS.mention : SOUNDS.msg)();
    const g = groupOfChannel(m.cid);
    // te mencionaram e o app está aberto em outro lugar: aviso clicável que leva até a mensagem
    if (mention && !document.hidden && document.hasFocus()) {
      const el = document.createElement('div'); el.className = 'toast mention-toast'; el.setAttribute('role', 'button');
      el.innerHTML = `${av(m.authorId, 32, false)}<div><b>${esc(nameOf(m.authorId))}</b> te mencionou${g ? ` em <b>#${esc(g.channels.find(c => c.id === m.cid)?.name || '')}</b>` : ''}<span>${esc((m.content || '').slice(0, 90))}</span></div>`;
      el.onclick = () => { el.remove(); if (g) go({ kind: 'group', gid: g.id, cid: m.cid }); else go({ kind: 'dm', id: m.cid }); setTimeout(() => A.jump({ dataset: { id: m.id } }), 400); };
      $('#toasts').appendChild(el); setTimeout(() => el.remove(), 9000);
    }
    notifyDesktop(mention && !isDm ? `${nameOf(m.authorId)} te mencionou em #${g?.channels.find(c => c.id === m.cid)?.name}` : isDm ? nameOf(m.authorId) : `${nameOf(m.authorId)} em #${g?.channels.find(c => c.id === m.cid)?.name}`, prefs.hidePreview ? 'Nova mensagem' : m.sticker ? 'Enviou uma figurinha' : m.gif ? 'Enviou um GIF' : m.content || 'Enviou uma imagem', user(m.authorId).avatar);
  }
  updateTitle(); renderRail(); renderSide();
}
function updateTitle() {
  const n = Object.values(S.mentions).reduce((a, b) => a + b, 0);
  document.title = (n ? `(${n}) ` : '') + 'Anarchy';
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
    <button class="rail-item add" data-act="joinGroup" data-tip="Entrar com convite"><div class="inner" style="color:var(--accent)">${ic('compass')}</div></button>
    ${railPts()}`;
}
// saldo de AnarchyPoints: no canto de baixo da coluna de grupos (clique abre as Caixas)
function railPts() {
  const p = S.me?.points || 0;
  const n = p >= 1e6 ? (p / 1e6).toFixed(p >= 1e7 ? 0 : 1).replace('.', ',') + 'M' : p >= 1e4 ? Math.floor(p / 1000) + 'k' : p.toLocaleString('pt-BR');
  return `<button class="rail-pts" data-act="openBoxes" data-tip="${p.toLocaleString('pt-BR')} AnarchyPoints · 100 a cada ${ptMin()} min em call. Clique para abrir caixas"><i class="pts-ic"></i><span>${n}</span></button>`;
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
        return `<button class="nav-row ${S.view.kind === 'dm' && S.view.id === d.id ? 'active' : ''} ${S.unread[d.id] ? 'unread' : ''}${npCls(o)}" data-act="dm" data-id="${d.id}">
          ${av(o, 32)}<span class="lbl"><span class="np-name">${esc(u.displayName)}</span><br><span class="muted small" style="font-weight:400">${inCall ? '🔊 Em chamada' : esc(u.customStatus || STATUS[u.status] || '')}</span></span>
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
    ${peers.length ? `<div class="voice-people">${peers.map(p => `<div class="voice-person" data-act="voiceUser" data-vuid="${p.uid}" ${p.uid !== S.me.id ? 'data-tip="Clique para mudar o volume"' : ''}>${av(p.uid, 24, false, 'calm').replace('class="av', `data-speak="${p.sid}" class="av`)}<span class="lbl" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(nameOf(p.uid))}</span>${volTag(p.uid)}${p.screen ? '<span class="live">AO VIVO</span>' : ''}${p.cam ? ic('cam') : ''}${p.deafened ? ic('headOff') : p.muted ? ic('micOff') : ''}</div>`).join('')}${djRow(c.id)}</div>` : ''}`;
  };
  // o DJ aparece na sala como mais um participante enquanto toca
  const djRow = cid => { const st = S.music[cid]; if (!st || !st.cur) return ''; return `<div class="voice-person dj-person" data-act="profile" data-id="${st.botId}" title="${esc(st.cur.title)}">${av(st.botId, 24, false, 'calm')}<span class="lbl" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(nameOf(st.botId))}</span><span class="bot-tag">BOT</span><span class="dj-eq ${st.pausedAt !== null ? 'paused' : ''}"><i></i><i></i><i></i></span></div>`; };
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
    <button class="me-chip" data-act="meMenu">${av(u.id, 32)}<span style="min-width:0"><span class="nm" style="display:block">${esc(u.displayName)}</span><span class="st" style="display:block">${esc(u.customStatus || STATUS[u.realStatus || u.status])}</span></span></button>    <button class="icon-btn ${V.muted ? 'on' : ''}" data-act="mute" data-tip="${V.muted ? 'Ativar microfone' : 'Silenciar'}${prefs.ptt ? ' (aperte para falar ativo)' : ''}">${ic(V.muted ? 'micOff' : 'mic')}</button>
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
    ${S.music[V.room]?.cur ? `<button class="vb-dj" data-act="openStage" title="${esc(S.music[V.room].cur.title)}"><span class="dj-eq ${S.music[V.room].pausedAt !== null ? 'paused' : ''}"><i></i><i></i><i></i></span><span>${esc(S.music[V.room].cur.title)}</span></button>` : ''}
    <div class="vb-btns">
      <button class="btn sm ${V.cam ? 'on' : ''}" data-act="toggleCam" data-tip="${V.cam ? 'Desligar câmera' : 'Ligar câmera'}">${ic(V.cam ? 'cam' : 'camOff')}</button>
      <button class="btn sm ${V.screen ? 'on' : ''}" data-act="toggleScreen" data-tip="${V.screen ? 'Parar de compartilhar' : 'Compartilhar tela'}">${ic('screen')}</button>
      <button class="btn sm" data-act="soundboard" data-tip="Central de Áudio">${ic('board')}</button>
      <button class="btn sm" data-act="mixer" data-tip="Mixer">${ic('sliders')}</button>
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
      <button class="icon-btn" data-act="rpg" data-tip="RPG de Mesa">${ic('dice')}</button>
      <button class="icon-btn" data-act="pins" data-tip="Mensagens fixadas">${ic('pin')}</button>
      <button class="icon-btn" data-act="profile" data-id="${o}" data-tip="Perfil">${ic('user')}</button>`;
  } else {
    const g = S.groups[v.gid], c = chan(v.gid, v.cid); if (!g || !c) return;
    h.innerHTML = `${tog}<span class="ttl">${ic(c.type === 'voice' ? 'voice' : 'hash')}${esc(c.name)}</span><span class="sub" ${c.topic ? `title="${esc(c.topic)}"` : ''}>${esc(c.topic || g.name)}</span>${c.slowmode ? `<span class="slow-pill" data-tip="Modo lento: uma mensagem a cada ${esc(slowLabel(c.slowmode))}">🐢 ${esc(slowLabel(c.slowmode))}</span>` : ''}<span class="spacer"></span>
      ${window.anarchyFun ? window.anarchyFun.eventPill(g) : ''}
      <button class="icon-btn fun-hbtn" data-fun="groupFun" data-gid="${g.id}" data-tip="Eventos, retrospectiva e roleta">🎉</button>
      ${!g.rpg || g.rpg.on !== false ? `<button class="icon-btn" data-act="rpg" data-tip="RPG de Mesa">${ic('dice')}</button>` : ''}
      ${gManager(g) ? `<button class="icon-btn" data-act="groupSettings" data-tip="Configurações do grupo">${ic('gear')}</button>` : ''}
      <button class="icon-btn" data-act="invite" data-tip="Convidar">${ic('link')}</button>
      ${c.type === 'text' ? `<button class="icon-btn" data-act="pins" data-tip="Mensagens fixadas">${ic('pin')}</button>` : ''}
      ${c.type === 'text' ? `<button class="icon-btn ${showMembersNow() ? 'active' : ''}" data-act="toggleMembers" data-tip="${showMembersNow() ? 'Esconder membros' : 'Mostrar membros'}">${ic('users')}</button>` : ''}`;
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

// no celular a lista de membros cobre o chat: começa fechada e só abre pelo botão (sem mexer na preferência do PC)
const narrowScreen = () => matchMedia('(max-width: 860px)').matches;
const showMembersNow = () => narrowScreen() ? !!S.mobMembers : prefs.showMembers;
function renderMembers() {
  const m = $('#members');
  const v = S.view; const g = v.kind === 'group' && S.groups[v.gid];
  if (!g || !showMembersNow() ||chan(v.gid, v.cid)?.type !== 'text') { m.hidden = true; return; }
  m.hidden = false;
  const ord = { online: 0, ocupado: 1, ausente: 2, offline: 3 };
  const list = g.members.slice().sort((a, b) => (ord[user(a).status] ?? 3) - (ord[user(b).status] ?? 3) || nameOf(a).localeCompare(nameOf(b)));
  // quem está numa sala de voz deste grupo
  const inCall = new Set(g.channels.flatMap(c => (S.voice[c.id] || []).map(p => p.uid)));
  const r = id => {
    const u = user(id), call = inCall.has(id);
    const sub = call ? `<span class="mem-s call">${ic('voice')}Em call</span>` : u.activity ? `<span class="mem-s act">${esc(u.activity.emoji)} ${esc(u.activity.text)}</span>` : u.customStatus ? `<span class="mem-s">${esc(u.customStatus)}</span>` : '';
    return `<div class="mem ${u.status === 'offline' ? 'off' : ''}${npCls(id)}" data-act="profile" data-id="${id}">${av(id, 32, true, 'calm')}<div class="info"><div class="mem-n"><b style="color:${esc(nameColor(id, g))}">${esc(u.displayName)}</b>${window.anarchyFun ? window.anarchyFun.nickTag(g, id) : ''}${u.bot ? '<span class="bot-tag">BOT</span>' : ''}${g.ownerId === id ? '<span class="crown" title="Dono do grupo">👑</span>' : ''}</div>${sub}</div></div>`;
  };
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
    .replace(/\|\|([^|\n]+)\|\|/g, '<span class="spoiler" title="Spoiler: clique para ver">$1</span>')
    .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
    .replace(/@([a-z0-9_.]{3,20})/gi, (m, n) => { const l = n.toLowerCase(); return l === 'todos' || l === 'everyone' ? `<span class="mention all">@${n}</span>` : Object.values(S.users).some(u => u.username === l) ? `<span class="mention ${l === S.me.username ? 'me' : ''}">@${n}</span>` : m; });
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => blocks[i]);
}
const JOIN_LINES = ['{n} entrou no grupo. Dá um oi!', '{n} chegou chegando. 🎉', 'Bem-vindo, {n}! Pega uma cadeira.', '{n} apareceu do nada.', 'Um {n} selvagem apareceu!', '{n} pousou no grupo. 🛬', 'Todo mundo dá as boas-vindas para {n}!', '{n} acabou de chegar. Alguém faz um café.'];
const onlyEmoji = t => t && t.length <= 12 && /^(\p{Extended_Pictographic}|️|‍|\s)+$/u.test(t);

function renderMessages(forceBottom) {
  const box = $('#msgs'); const cid = viewingCid(); if (!box || !cid) return;
  const list = S.msgs[cid];
  if (!list) { box.innerHTML = `<div class="skel" aria-label="Carregando mensagens">${[60, 85, 40, 70].map(w => `<div class="skel-row"><i></i><div><b style="width:${w * .4}%"></b><b style="width:${w}%"></b></div></div>`).join('')}</div>`; return; }
  const atBottom = forceBottom || box.scrollHeight - box.scrollTop - box.clientHeight < 120;
  const prevTop = box.scrollTop;
  let html = '';
  if (!S.more[cid]) {
    if (S.dms[cid]) { const o = S.dms[cid].members.find(m => m !== S.me.id); const u = user(o); html += `<div class="msgs-start">${av(o, 80, false)}<h2>${esc(u.displayName)}</h2><p>Este é o começo da sua conversa com <b>@${esc(u.username)}</b>.</p></div>`; }
    else { const c = chan(S.view.gid, cid); html += `<div class="msgs-start"><div class="big-ic">${ic('hash')}</div><h2>Bem-vindo a #${esc(c?.name)}</h2><p>Este é o começo do canal #${esc(c?.name)}.</p></div>`; }
  }
  let prev = null, lastDay = '';
  const g = S.view.kind === 'group' ? S.groups[S.view.gid] : null;
  for (const m of list) {
    const day = new Date(m.ts).toDateString();
    if (day !== lastDay) { html += `<div class="day-sep">${fmtDay(m.ts)}</div>`; lastDay = day; prev = null; }
    if (m.system === 'join') {
      const n = `<b data-act="profile" data-id="${m.authorId}" style="color:${esc(nameColor(m.authorId, g))}">${esc(nameOf(m.authorId))}</b>`;
      const line = JOIN_LINES[[...m.id].reduce((a, c) => a + c.charCodeAt(0), 0) % JOIN_LINES.length].replace('{n}', n);
      html += `<div class="msg sys" id="m-${m.id}"><span class="sys-ic">${ic('reply').replace('<svg', '<svg style="transform:scaleX(-1) rotate(180deg)"')}</span><span class="sys-t">${line} <time>${fmtDay(m.ts) === 'Hoje' ? 'Hoje às ' : fmtDay(m.ts) + ' '}${fmtTime(m.ts)}</time></span></div>`;
      prev = null; continue;
    }
    if ((m.system === 'event' || m.system === 'porteiro' || m.system === 'fofoca') && window.anarchyFun) { html += window.anarchyFun.sysEvent(m); prev = null; continue; } // evento começou / comentário do Porteiro
    if ((S.me.blocked || []).includes(m.authorId) && !S.unhide[m.id]) {
      html += `<div class="msg sys blocked" id="m-${m.id}"><span class="sys-ic">${ic('ban')}</span><span class="sys-t muted">Mensagem de alguém que você bloqueou. <button class="link" data-act="unhide" data-id="${m.id}">Mostrar</button></span></div>`;
      prev = null; continue;
    }
    const head = !prev || prev.authorId !== m.authorId || m.ts - prev.ts > 7 * 60e3 || m.replyTo;
    const u = user(m.authorId), mine = m.authorId === S.me.id;
    const canDel = mine || (g && gCan(g, 'manageMessages'));
    const ref = m.replyTo && list.find(x => x.id === m.replyTo);
    const reacts = Object.entries(m.reactions || {});
    const editing = S.editing === m.id;
    const big = onlyEmoji(m.content);
    html += `<div class="msg ${m.pinned ? 'pinned' : ''} ${head ? 'head' : ''} ${mine ? 'mine' : ''} ${mentionsMe(m) ? 'mentioned' : ''}" data-mid="${m.id}" id="m-${m.id}">
      ${head ? av(m.authorId, 40, false) : `<div class="gutter">${fmtTime(m.ts)}</div>`}
      <div class="mc" style="min-width:0">
        ${m.replyTo ? `<div class="reply-ref" data-act="jump" data-id="${m.replyTo}">${ic('reply').replace('<svg', '<svg style="width:14px;height:14px;transform:scaleX(-1)"')}${ref ? `<b>${esc(nameOf(ref.authorId))}</b> ${esc((ref.content || (ref.sticker ? '🗂️ figurinha' : ref.gif ? '🎞️ GIF' : '🖼️ imagem')).slice(0, 90))}` : '<i>mensagem apagada</i>'}</div>` : ''}
        ${head ? `<div class="who"><b data-act="profile" data-id="${m.authorId}" style="color:${esc(nameColor(m.authorId, g))}">${esc(u.displayName)}</b>${g && window.anarchyFun ? window.anarchyFun.nickTag(g, m.authorId) : ''}${u.bot ? '<span class="bot-tag">BOT</span>' : ''}${g && g.ownerId === m.authorId ? '<span class="crown">👑</span>' : ''}<time>${fmtDay(m.ts) === 'Hoje' ? '' : fmtDay(m.ts) + ' '}${fmtTime(m.ts)}</time></div>` : ''}
        ${editing ? `<div class="edit-box"><textarea id="editArea" rows="2">${esc(m.content)}</textarea><span class="small muted">Enter salva · Esc cancela</span></div>`
          : m.content ? `<div class="body" style="${big ? 'font-size:2.4em;line-height:1.2' : ''}">${md(m.content)}${m.edited ? ' <span class="ed">(editado)</span>' : ''}</div>` : ''}
        ${m.music ? `<div class="dj-embed">${m.music.thumb ? `<img src="${esc(m.music.thumb)}" alt="" loading="lazy">` : '<div class="dj-noart">🎵</div>'}<div><b>${m.music.page ? `<a href="${esc(m.music.page)}" target="_blank" rel="noopener">${esc(m.music.title)}</a>` : esc(m.music.title)}</b><span>${esc(m.music.by || '')}${m.music.dur ? `${m.music.by ? ' · ' : ''}${fmtDur(m.music.dur)}` : ''}</span></div></div>` : ''}
        ${m.image ? `<img class="img" src="${esc(m.image)}" alt="Imagem enviada por ${esc(u.displayName)}" data-act="zoom" loading="lazy">` : ''}
        ${m.sticker ? `<img class="sticker" src="${esc(m.sticker.url)}" alt="Figurinha: ${esc(m.sticker.name)}" title="${esc(m.sticker.name)}" data-act="stickerInfo" data-id="${esc(m.sticker.id)}" loading="lazy">` : ''}
        ${m.gif ? `<img class="gifmsg" src="${esc(m.gif.url)}" alt="${esc(m.gif.title || 'GIF')}" loading="lazy" ${m.gif.w && m.gif.h ? `style="aspect-ratio:${m.gif.w}/${m.gif.h}"` : ''} data-act="zoom">` : ''}
        ${(m.poll || m.bomb || m.bet || m.nick) && window.anarchyFun ? window.anarchyFun.msgExtra(m) : ''}
        ${reacts.length ? `<div class="reacts">${reacts.map(([e, us]) => `<button class="react ${us.includes(S.me.id) ? 'mine' : ''}" data-act="react" data-id="${m.id}" data-emoji="${esc(e)}" title="${esc(us.map(nameOf).join(', '))}">${esc(e)} ${us.length}</button>`).join('')}</div>` : ''}
      </div>
      <div class="msg-tools">
        ${QUICK.slice(0, 3).map(e => `<button data-act="react" data-id="${m.id}" data-emoji="${e}" title="Reagir com ${e}">${e}</button>`).join('')}
        <button data-act="reactPick" data-id="${m.id}" title="Mais reações">${ic('smile')}</button>
        <button data-act="reply" data-id="${m.id}" title="Responder">${ic('reply')}</button>
        <button data-act="msgMore" data-id="${m.id}" title="Mais opções" aria-label="Mais opções da mensagem">${ic('more')}</button>
        ${mine && !m.poll && !m.bomb && !m.bet && !m.nick ? `<button data-act="edit" data-id="${m.id}" title="Editar">${ic('edit')}</button>` : ''}
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
      <button class="icon-btn fun-cbtn" data-fun="compose" data-tip="Enquete ou mensagem-bomba" aria-label="Enquete ou mensagem-bomba">🎉</button>
      <button class="icon-btn pk-btn" data-act="gifPick" data-tip="GIFs">GIF</button>
      <button class="icon-btn" data-act="stickerPick" data-tip="Figurinhas">${ic('sticker')}</button>
      <button class="icon-btn" data-act="emojiPick" data-tip="Emoji">${ic('smile')}</button>
      <button class="icon-btn" data-act="sendBtn" data-tip="Enviar">${ic('send')}</button>
    </div><div class="typing" id="typing"></div>`;
  const ta = $('#composer'); ta.value = S.drafts[cid] || '';
  const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.min(220, ta.scrollHeight) + 'px'; };
  fit();
  cmdAC(ta); // comandos do DJ (/music...)
  mentionAC(ta); // antes do Enter de enviar: com a lista de @ aberta, Enter escolhe a pessoa
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
async function sendMessage(image, imageName) {
  const ta = $('#composer'); const cid = viewingCid(); if (!ta || !cid) return;
  const content = image ? '' : ta.value.trim();
  if (!content && !image) { const c = ta.closest('.composer'); c.classList.remove('nudge'); void c.offsetWidth; c.classList.add('nudge'); ta.focus(); return; }
  if (content === '/limpar') { ta.value = ''; return; }
  const r = await emit('message:send', { cid, content, image, imageName: image ? imageName : undefined, replyTo: S.reply });
  if (!r.ok) return toast(r.erro, true);
  if (!image) { ta.value = ''; ta.style.height = 'auto'; S.drafts[cid] = ''; }
  S.reply = null; renderReplyBar();
}
// a imagem vai do jeito que está (mesma qualidade, resolução e formato); só é reduzida se passar de 8 MB
async function sendImage(file) {
  if (!file || !/^image\//.test(file.type)) return toast('Escolha um arquivo de imagem.', true);
  toast('Enviando imagem...');
  let url = null;
  if (/^image\/(png|jpeg|gif|webp)$/.test(file.type) && file.size <= 8 * 1024 * 1024) { try { url = (await api('/api/upload', { data: await readFile(file) })).url; } catch (e) { return toast(e.message, true); } }
  else url = await uploadImage(file);
  if (url) sendMessage(url, file.name);
}

/* =============== modais e menus =============== */
/* =============== Novidades ===============
   Cada mudança que as pessoas notam ganha um item aqui (o mais novo em cima). Quem abre o app depois de uma
   atualização vê um popup só com o que ainda não viu. Também abre em Configurações > Novidades. */
const NEWS = [
  { id: '2026-11-13-caixas-fundos', date: '13/11/2026', title: 'Caixas mais emocionantes e fundos animados', emoji: '🌌', items: [
    'A Caixa Anarchy agora abre de <b>9 jeitos</b>: roleta, caça-níquel, baú, cartas, cápsula, portal, meteoro, roda da sorte e ovo surpresa.',
    'Escolha a sua animação no Inventário ou deixe em <b>Surpresa</b>. Tem também o botão de pular.',
    'Prêmio raro tem festa: raios, clarão, chuva de moedas e o letreiro <b>MÍTICO!</b>',
    'Novidade na caixa: <b>38 fundos animados</b> para o topo do seu cartão de perfil (galáxia, sakura, synthwave, inferno, supernova...).',
    'Veja e use os seus na aba <b>🌌 Fundos animados</b> do Inventário.'
  ] },
  { id: '2026-11-13-diversao', date: '13/11/2026', title: 'Muita diversão nova!', emoji: '🎉', items: [
    'Botão <b>🎉</b> no chat: <b>enquetes</b>, <b>apostas de AnarchyPoints</b>, <b>mensagem-bomba</b> (some depois de lida) e <b>fofoca anônima</b> (se o grupo ligar).',
    'Botão <b>🎮</b> na call: <b>Desenha e adivinha</b>, <b>Quiz</b> de perguntas ou de música, <b>Cartas Malucas</b>, <b>Truco</b> e <b>roleta</b>. Quem ganha leva AnarchyPoints!',
    '<b>Conquistas</b>, <b>caixa diária</b> grátis e <b>loja da semana</b> no Inventário.',
    'DJ: vote nas músicas da fila, ligue o <b>rádio</b> com <code>/radio funk</code> e cante no <b>🎤 karaokê</b> com a letra na tela.',
    'Eventos do grupo com aviso, apelidos votados pela galera, som de entrada na call, retrospectiva do mês e o Porteiro comentando.',
    'Mostre <b>o que está fazendo</b> no perfil, e use <b>Entrar junto</b> para cair na call de um amigo.',
    'RPG: <b>dados 3D</b>, <b>trilha sonora</b> por cena e <b>diário</b> da campanha escrito sozinho.'
  ] },
  { id: '2026-11-12-rpg-visual-hud', date: '12/11/2026', title: 'RPG de Mesa: visual do seu jeito', emoji: '🎬', items: [
    'Novo botão <b>🎬</b> no topo da mesa: escolha o filtro da tela entre <b>Limpo</b>, <b>Suave</b> ou <b>Cinema</b>, ou ajuste cada efeito. Vale só para você.',
    'O filtro padrão ficou mais leve.',
    'Botão <b>?</b> com um guia simples de tudo que dá para fazer, e boas-vindas para quem abre a mesa pela primeira vez.',
    'As ferramentas mostram a tecla de atalho, e a barra de baixo explica o que fazer com cada uma.'
  ] },
  { id: '2026-11-12-rpg-avancado', date: '12/11/2026', title: 'RPG de Mesa: exploração de verdade', emoji: '🔦', items: [
    '<b>Eventos privados</b>: o Mestre clica com o botão direito num jogador → Criar evento. Cada evento tem mapa, combate e histórico próprios, e quem não participa não vê nada dele.',
    '<b>Luz e névoa por jogador</b>: lâmpadas no mapa, lanternas que apontam para onde o personagem olha (Q/E para virar) e névoa que mostra só o que cada um enxerga.',
    '<b>Portas e paredes que funcionam</b>: ninguém atravessa parede nem porta fechada. Portas abrem com um clique; as trancadas pedem chave ou um teste.',
    'Mapa em camadas com dezenas de materiais (madeiras, mármore, gelo, lava, cristal, vidro, grades...) e materiais próprios. Pôr um objeto não troca o chão.',
    'Marcadores de emoji com nome ao passar o mouse, e status personalizados na ficha (Fadiga, Sanidade, Mana...).',
    'Atributos novos: Percepção; Sabedoria e Inteligência viraram <b>Intelecto</b>. As fichas antigas foram convertidas sozinhas.'
  ] },
  { id: '2026-11-12-rpg-visual', date: '12/11/2026', title: 'RPG de Mesa de cara nova', emoji: '🗺️', items: [
    'Mapas pintados: terreno com contornos naturais, paredes com sombra, água funda, árvores e rochas com volume. Sem quadradinhos (a grade virou opcional).',
    '<b>Botão direito</b> nas miniaturas e nos retratos: o Mestre edita a ficha dos jogadores, dá dano, cura e condições, esconde, duplica e muda o tamanho de criaturas.',
    'Botão direito no mapa: ping para todos verem, criar criatura no lugar e trazer o grupo para perto.',
    'Novas ferramentas: régua de distância (casas e metros), ping (Alt+clique) e atalhos V, R, P e B.',
    'Retratos do grupo com anel de vida no canto da mesa, e visual de fantasia em toda a mesa.'
  ] },
  { id: '2026-11-12-rpg', date: '12/11/2026', title: 'RPG de Mesa', emoji: '🎲', items: [
    'Novo botão <b>🎲</b> no topo dos canais e das conversas: crie campanhas de RPG e jogue com o pessoal.',
    'Mapas gerados na hora (masmorra, castelo, floresta, cidade e mais) ou importados de uma imagem, com névoa e armadilhas.',
    'Miniaturas com a sua foto, dados compartilhados (d4 a d100, 2d20+5...), fichas com classes e inventário, combate por turnos.',
    'Quem cria a campanha é o Mestre e controla tudo dela, sem ganhar nenhum poder no grupo. É opcional: quem não joga não vê diferença.'
  ] },
  { id: '2026-11-12-bolinha', date: '12/11/2026', title: 'Bolinha verde sem piscar', emoji: '🟢', items: [
    'A bolinha verde de quem está falando não fica mais piscando a cada sílaba.',
    'A sua acende e apaga junto com o seu microfone: acesa é porque os outros estão te ouvindo.'
  ] },
  { id: '2026-11-12-chiado', date: '12/11/2026', title: 'Chiado não abre mais o microfone', emoji: '🤫', items: [
    'A detecção de voz agora reconhece chiado pelo "formato" do som e não abre o microfone por causa dele, mesmo quando o chiado aparece de repente, sobe ou fica oscilando.',
    'Depois que você para de falar, o microfone fecha em até 2 segundos, mesmo com barulho de fundo.'
  ] },
  { id: '2026-11-12-voz', date: '12/11/2026', title: 'Voz sem cortes', emoji: '🎙️', items: [
    'A detecção de voz automática cortava pedaços da fala (começo e fim das palavras, e no meio de frases longas). Agora ela corta bem menos.',
    'Barulho de fundo e teclado continuam sem abrir o microfone.'
  ] },
  { id: '2026-11-11-pontos-30', date: '11/11/2026', title: 'AnarchyPoints: novo ritmo', emoji: '⏱️', items: [
    'Agora são <b>100 AnarchyPoints a cada 30 minutos</b> em call com mais alguém.',
    'O tempo que você já tinha acumulado continua valendo.'
  ] },
  { id: '2026-11-11-inventario', date: '11/11/2026', title: 'Inventário novo', emoji: '🎒', items: [
    'Caixas, efeitos de foto, placas de nome e histórico agora ficam juntos no <b>Inventário</b>, separados em abas.',
    'No topo você vê como os outros te enxergam (foto e placa) e a sua carteira de pontos, com o botão de abrir caixa.',
    'O dono do Anarchy agora pode dar AnarchyPoints de presente. Eles chegam num pacote que você abre na tela.',
    'Os temas animados em Aparência voltaram a aparecer certinho.'
  ] },
  { id: '2026-11-11-caixas', date: '11/11/2026', title: 'AnarchyPoints e Caixas', emoji: '🎁', items: [
    'Ficou em call com a galera? Ganha <b>100 AnarchyPoints a cada 30 minutos</b> (precisa ter mais alguém na call e estar ouvindo).',
    'Com 300 pontos você abre uma <b>Caixa Anarchy</b>: a roleta gira e sorteia um efeito animado para a sua foto de perfil.',
    'São <b>100 efeitos</b>, de Comum a Mítico (só 0,5% de chance!). Repetiu? Volta ponto para você.',
    'Seu saldo aparece embaixo, do lado do seu nome. Caixas e coleção em <b>Configurações › Caixas</b>.'
  ] },
  { id: '2026-11-10-placas', date: '10/11/2026', title: 'Placas de nome animadas e Inventário', emoji: '🎒', items: [
    'Agora existem <b>16 placas de nome animadas</b> que aparecem na lista de membros: Sakura, Chamas do Inferno, Olhar Escarlate, Fogo de Raposa, Aura Dourada e muito mais.',
    'Não dá para comprar nem escolher: elas só chegam <b>de presente</b>. Quando você ganha uma, aparece um baú na tela para abrir.',
    'Tem raridade: Comum, Raro, Épico e Lendário.',
    'Veja suas placas, equipe e confira o histórico em <b>Configurações › Inventário</b>.'
  ] },
  { id: '2026-11-10-dj-soundcloud', date: '10/11/2026', title: 'DJ mais teimoso', emoji: '🎧', items: [
    'Quando o YouTube bloqueia o servidor ("prove que não é robô"), o DJ procura a mesma música no SoundCloud e toca de lá.',
    'Se não achar em lugar nenhum, ele avisa em português o que aconteceu.'
  ] },
  { id: '2026-11-09-email', date: '09/11/2026', title: 'Recuperar a senha por email', emoji: '📬', items: [
    'Agora dá para ligar um email à sua conta (o app pede ao entrar, ou em Configurações › Minha conta).',
    'Esqueceu a senha? Na tela de entrar, toque em <b>Esqueci a senha</b>: chega um link no email para criar uma senha nova.',
    'O link vale 30 minutos e só funciona uma vez. Ao trocar a senha, os outros aparelhos saem da conta.',
    'Seu email fica só com você: ninguém mais vê.'
  ] },
  { id: '2026-11-09-dj-playlist', date: '09/11/2026', title: 'DJ: playlists, álbuns e volume fino', emoji: '🎧', items: [
    'Mande o link de uma <b>playlist</b> ou <b>álbum</b> (YouTube, YouTube Music, SoundCloud, Spotify) no <b>/music</b> e todas as músicas entram na fila de uma vez.',
    'Novo <b>/album nome do álbum</b>: o DJ procura o álbum e põe ele inteiro na fila.',
    'A próxima música já fica carregada enquanto a atual toca, sem espera na troca.',
    'O volume do DJ agora vai de 1 em 1% e segue o ouvido: os volumes baixinhos finalmente dá para usar.',
    'Dá para mudar o volume com a rodinha do mouse em cima da barra.'
  ] },
  { id: '2026-11-08-android', date: '08/11/2026', title: 'Anarchy no celular (Android)', emoji: '📱', items: [
    'Agora tem app para Android: no celular, abra <a href="https://github.com/FoxyZINntc/Discordia/releases/latest/download/Anarchy.apk" target="_blank" rel="noopener">este link para baixar o Anarchy.apk</a> e instale.',
    'Chat, calls de voz e vídeo, DJ, figurinhas e temas, tudo igual ao do PC.',
    'A call continua com a tela apagada (fica uma notificação "Na call").',
    'Avisa de mensagens e chamadas quando o app está em segundo plano.',
    'No celular dá para assistir telas compartilhadas, mas ainda não para compartilhar a sua.'
  ] },
  { id: '2026-11-08-emojis', date: '08/11/2026', title: 'Painel de emojis novo', emoji: '😄', items: [
    'O painel de emojis não corta mais a última coluna.',
    'Agora são mais de 400 emojis, separados por categoria.',
    'Dá pra procurar em português: "rir", "fogo", "gato", "pizza"...',
    'Os que você mais usa aparecem primeiro em "Usados recentemente".',
    'Segure Shift ao clicar para escolher vários de uma vez.'
  ] },
  { id: '2026-11-08-temas', date: '08/11/2026', title: 'Temas animados', emoji: '🌆', items: [
    'Em <b>Configurações › Aparência › Temas animados</b>: uma cena animada no fundo do app e detalhes no visual.',
    '<b>Neon City</b> (cyberpunk com chuva neon e glitch), <b>Pôr do sol retrô</b>, <b>Terminal</b>, <b>Sakura ao vento</b>, <b>Galáxia</b> e <b>Brasas</b>.',
    'PC pesando? Ligue o <b>Modo leve</b>. Com <b>Animações</b> desligado, a cena fica parada.'
  ] },
  { id: '2026-11-08-anarchy', date: '08/11/2026', title: 'O Discordia agora se chama Anarchy', emoji: '<img src="logo.svg" alt="" class="news-logo">', items: [
    'Novo nome, mesmo app: suas conversas, grupos, amigos e configurações continuam todos aqui.',
    'Logo nova: o <b>A de anarquia</b> vermelho no fundo branco.',
    'O app de computador se atualiza sozinho para o <b>Anarchy</b> (versão 1.4.0), com o atalho e o ícone com o nome novo.'
  ] },
  { id: '2026-11-08-dj', date: '08/11/2026', title: 'DJ: bot de música nos grupos', emoji: '🎧', items: [
    'Adicione o DJ em <b>Configurações do grupo › DJ (bot de música)</b> e personalize nome, foto e cor.',
    'Entre numa sala de voz e digite <code>/music</code> com o nome ou o link da música. Digite <code>/</code> para ver todos os comandos.',
    'Cartão <b>Tocando agora</b> na call, com fila, pausar, pular e repetir.',
    'Clique com o botão direito no DJ para mudar o volume dele <b>só para você</b>.'
  ] },
  { id: '2026-11-08-voz', date: '08/11/2026', title: 'Calls mais limpas e estáveis', emoji: '🎙️', items: [
    '<b>Detecção de voz:</b> o microfone só abre quando você fala. Chiado e barulho de fundo não vão mais para a call.',
    'Se a sua conexão cair, você <b>volta sozinho para a call</b> quando ela voltar.',
    '<b>Registro da call</b> em Configurações › Voz e vídeo: mostra quando e por que você caiu.'
  ] },
  { id: '2026-11-08-tela', date: '08/11/2026', title: 'Som da tela sem eco', emoji: '🖥️', items: [
    'Ao compartilhar a tela, vai o som do PC <b>menos o do Anarchy</b>: ninguém se ouve de volta (app 1.3.0).',
    'Compartilhando uma janela, vai só o som daquele programa.'
  ] },
  { id: '2026-11-07-mencoes', date: '07/11/2026', title: 'Menções e editor de áudio', emoji: '💬', items: [
    'Digite <code>@</code> para mencionar alguém. Quem foi mencionado recebe aviso e a mensagem fica destacada.',
    'Na Central de Áudio, solte um áudio longo e <b>corte o trecho</b> que quiser antes de adicionar.'
  ] }
];
const NEWS_KEY = 'discordia:news';
function showNews(all) {
  let seen = null; try { seen = localStorage.getItem(NEWS_KEY); } catch {}
  const idx = NEWS.findIndex(n => n.id === seen);
  const list = all ? NEWS : (idx < 0 ? NEWS.slice(0, 3) : NEWS.slice(0, idx));
  try { localStorage.setItem(NEWS_KEY, NEWS[0].id); } catch {}
  if (!list.length) return;
  modal(`<div class="modal-h news-h"><div class="news-spark">✨</div><h2>Novidades no Anarchy</h2><p>${all ? 'Tudo o que mudou recentemente.' : 'Veja o que mudou desde a última vez que você entrou.'}</p></div>
    <div class="modal-b news-b">${list.map(n => `<section class="news-it"><div class="news-ic">${n.emoji}</div><div><h3>${esc(n.title)}<span>${esc(n.date)}</span></h3><ul>${n.items.map(i => `<li>${i}</li>`).join('')}</ul></div></section>`).join('')}</div>
    <div class="modal-f"><button class="btn primary" data-close>Legal!</button></div>`, m => { m.classList.add('news-modal'); const top = () => { const b = $('.news-b', m); if (b) b.scrollTop = 0; }; top(); setTimeout(top, 80); setTimeout(top, 300); });
}

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
  p._anchor = anchor; p._place = place; reposPop(p);
  return p;
}
// recalcula a posição (para painéis que desenham o conteúdo depois de abrir)
function reposPop(p) {
  const r = p._anchor.getBoundingClientRect(), pw = p.offsetWidth, ph = p.offsetHeight, place = p._place;
  let x = place === 'right' ? r.right + 8 : r.left, y = place === 'right' ? r.top : place === 'above' ? r.top - ph - 8 : r.bottom + 6;
  x = clamp(x, 8, innerWidth - pw - 8); y = clamp(y, 8, innerHeight - ph - 8);
  p.style.left = x + 'px'; p.style.top = y + 'px';
}
document.addEventListener('mousedown', e => { if (!e.target.closest('.pop') && !e.target.closest('[data-act]')) closePops(); });

/* painel de emojis: categorias, busca em português e usados recentemente */
const EP_DATA = [
  ['car', '😀', 'Carinhas', `😀:sorriso/feliz 😃:feliz/alegre 😄:rindo/feliz 😁:sorrisao/dentes 😆:rindo/haha 😅:nervoso/suor 🤣:kkk/rolando/rir 😂:kkk/rir/chorando 🙂:sorriso 🙃:ironia/invertido 😉:piscada 😊:fofo/timido 😇:anjo/inocente 🥰:apaixonado/amor 😍:amor/apaixonado 🤩:uau/estrelas 😘:beijo 😗:beijo 😚:beijo 😋:delicia/gostoso 😛:lingua 😜:zoeira/lingua 🤪:doido/maluco 😝:lingua 🤑:dinheiro/rico 🤗:abraco 🤭:ops/risadinha 🤫:silencio/segredo 🤔:pensando/hmm 🤐:calado/boca 🤨:desconfiado 😐:neutro/serio 😑:serio 😶:mudo 😏:malicioso/sarcastico 😒:entediado/aff 🙄:aff/revirando 😬:eita/constrangido 😮‍💨:suspiro/alivio 🤥:mentira/mentiroso 😌:calmo/aliviado 😔:triste/pensativo 😪:sono 🤤:babando 😴:dormindo/sono 😷:mascara/doente 🤒:doente/febre 🤕:machucado 🤢:enjoo/nojo 🤮:vomito/nojo 🤧:espirro/gripe 🥵:calor/quente 🥶:frio/gelado 🥴:tonto/bebado 😵‍💫:tonto/confuso 🤯:explodindo/mente 🤠:cowboy 🥳:festa/aniversario 🥸:disfarce 😎:oculos/estilo/brabo 🤓:nerd 🧐:analisando/monoculo 😕:confuso 🫤:meh/confuso 😟:preocupado 🙁:triste 😮:surpreso/uau 😲:chocado 😳:vergonha/corado 🥺:pidao/fofo/porfavor 🥹:emocionado 😨:medo 😰:ansioso/suor 😥:triste/alivio 😢:triste/chorando 😭:chorando/choro 😱:grito/medo 😖:confuso 😞:decepcionado 😓:cansado/suor 😩:cansado/exausto 🥱:bocejo/sono 😤:bufando/raiva 😡:raiva/bravo 😠:bravo/raiva 🤬:xingando/palavrao 😈:diabo/malvado 👿:diabo 💀:caveira/morri 💩:coco 🤡:palhaco 👻:fantasma 👽:alien/et 🤖:robo/bot 😺:gato 😹:gato/kkk 😻:gato/amor 🙈:macaco/vergonha 🙉:macaco 🙊:macaco/segredo`],
  ['pes', '👍', 'Gestos e pessoas', `👍:joinha/like/sim 👎:deslike/nao 👌:ok/perfeito 🤌:italiano 🤏:pouquinho ✌️:paz/vitoria 🤞:sorte/dedos 🤟:amo 🤘:rock 🤙:beleza/liga 👈:esquerda 👉:direita 👆:cima 👇:baixo ☝️:um/cima 👋:tchau/oi/ola ✋:pare/mao 🖖:vulcano 👏:palmas/aplausos 🙌:celebrar/aleluia 🤲:maos 🤝:acordo/aperto 🙏:obrigado/porfavor/reza 💪:forte/musculo 🦾:forte/robotico 🫡:continencia/sentido 🫶:maos/coracao/amor 👀:olhando/olhos 👁️:olho 👄:boca 🧠:cerebro/inteligente 🫠:derretendo 🗣️:falando/grito 👥:pessoas/grupo 🧑‍💻:programador/pc 🧑‍🎤:cantor/rock 🕺:danca 💃:danca 🏃:correndo 🧘:meditando/calma 🤷:seila/naosei 🤦:facepalm/vergonha 🙋:eu/mao 🙅:nao 🙆:ok 🧑‍🍳:cozinheiro 🥷:ninja 🧙:mago 🧛:vampiro 🧟:zumbi 🦸:heroi 🦹:vilao 👑:coroa/rei 💅:chique/unha`],
  ['sim', '❤️', 'Corações e símbolos', `❤️:coracao/amor/vermelho 🧡:coracao/laranja 💛:coracao/amarelo 💚:coracao/verde 💙:coracao/azul 💜:coracao/roxo 🖤:coracao/preto 🤍:coracao/branco 🤎:coracao/marrom 💔:partido/triste ❤️‍🔥:paixao/fogo 💕:coracoes 💞:coracoes 💖:brilho/amor 💘:cupido/flecha 💯:cem/100/perfeito Ⓐ:anarquia/anarchy 💢:raiva 💥:explosao/boom 💫:tonto/estrela 💦:gotas/suor 💨:vento/rapido 💬:mensagem/fala 💭:pensamento 💤:sono/zzz ✅:certo/sim/check ❌:errado/nao/x ⚠️:aviso/cuidado ⛔:proibido 🚫:proibido ❓:pergunta/duvida ❗:importante/exclamacao ‼️:exclamacao ⁉️:oque ➕:mais ➖:menos ♾️:infinito ⭐:estrela 🌟:estrela/brilho ✨:brilho/magia ⚡:raio/energia 🔥:fogo/brabo/top 🆗:ok 🆕:novo 🆒:legal 🔞:mais18 ♻️:reciclar ☮️:paz 🏳️‍🌈:orgulho/arcoiris 🏴‍☠️:pirata 🇧🇷:brasil 🔴:vermelho 🟢:verde 🔵:azul 🟡:amarelo ⚫:preto ⚪:branco`],
  ['nat', '🐱', 'Animais e natureza', `🐶:cachorro/dog 🐱:gato/cat 🐭:rato 🐹:hamster 🐰:coelho 🦊:raposa 🐻:urso 🐼:panda 🐨:coala 🐯:tigre 🦁:leao 🐮:vaca 🐷:porco 🐸:sapo 🐵:macaco 🐔:galinha 🐧:pinguim 🐦:passaro 🦆:pato 🦅:aguia 🦉:coruja 🦇:morcego 🐺:lobo 🐴:cavalo 🦄:unicornio 🐝:abelha 🦋:borboleta 🐌:lesma 🐞:joaninha 🐢:tartaruga 🐍:cobra 🦎:lagarto 🐙:polvo 🦀:caranguejo 🐠:peixe 🐬:golfinho 🐳:baleia 🦈:tubarao 🐊:jacare 🦖:dinossauro/trex 🐉:dragao 🌵:cacto 🎄:natal/arvore 🌲:pinheiro 🌴:palmeira/praia 🌱:planta/broto 🌿:folha/erva 🍀:trevo/sorte 🍁:outono/folha 🍄:cogumelo 🌷:flor/tulipa 🌹:rosa/flor 🌻:girassol/flor 🌸:sakura/flor/cerejeira 🌞:sol 🌙:lua/noite 🌎:mundo/terra 🌈:arcoiris ☀️:sol ⛅:nublado 🌧️:chuva ⛈️:tempestade/raio ❄️:neve/frio 🌊:onda/mar 🌋:vulcao`],
  ['com', '🍕', 'Comidas e bebidas', `🍎:maca 🍊:laranja 🍋:limao 🍌:banana 🍉:melancia 🍇:uva 🍓:morango 🍒:cereja 🍑:pessego 🥭:manga 🍍:abacaxi 🥥:coco 🥑:abacate 🍅:tomate 🌽:milho 🌶️:pimenta 🥕:cenoura 🥔:batata 🍞:pao 🧀:queijo 🥚:ovo 🍳:ovo/frito 🥓:bacon 🍔:hamburguer/lanche 🍟:batata/fritas 🍕:pizza 🌭:hotdog/cachorroquente 🌮:taco 🌯:burrito 🥪:sanduiche 🍝:macarrao 🍜:lamen/miojo 🍣:sushi 🍙:oniguiri 🍗:frango 🥩:carne/churrasco 🥗:salada 🍿:pipoca 🍩:rosquinha/donut 🍪:biscoito/cookie 🎂:bolo/aniversario 🍰:bolo 🧁:cupcake 🍫:chocolate 🍬:bala/doce 🍭:pirulito 🍦:sorvete ☕:cafe 🍵:cha 🧋:bubbletea/cha 🥤:refri 🧃:suco 🍺:cerveja/breja 🍻:brinde/cerveja 🍷:vinho 🥂:brinde/champanhe 🍸:drink 🥃:whisky/dose 🧊:gelo`],
  ['atv', '🎮', 'Jogos e atividades', `🎮:jogo/game/controle 🕹️:joystick/arcade 👾:game/retro/alien 🎲:dado 🧩:puzzle/quebracabeca ♟️:xadrez 🎯:alvo/mira 🎳:boliche 🃏:carta/coringa ⚽:futebol/bola 🏀:basquete 🏈:americano 🎾:tenis 🏐:volei 🏓:pingpong 🥊:boxe/luta 🥋:luta/judo 🏆:trofeu/campeao 🥇:ouro/primeiro 🥈:prata/segundo 🥉:bronze/terceiro 🏅:medalha 🎉:festa/parabens 🎊:festa/confete 🎈:balao 🎁:presente 🎨:arte/pintura 🎬:filme/cinema 🎤:microfone/karaoke 🎧:fone/musica 🎵:musica/nota 🎶:musica 🎸:guitarra/rock 🥁:bateria 🎹:piano/teclado 🎺:trompete 🎻:violino 🏍️:moto 🚗:carro 🏎️:corrida/carro 🛹:skate 🏄:surf 🚴:bike/bicicleta 🏋️:academia/treino 🎣:pesca ⛺:camping/barraca`],
  ['obj', '💡', 'Objetos e lugares', `💻:pc/computador/notebook 🖥️:monitor/pc ⌨️:teclado 🖱️:mouse 📱:celular 🔋:bateria 🔌:tomada 💡:ideia/lampada 📷:camera/foto 🎥:video/camera 📺:tv 📻:radio ⏰:alarme/despertador ⌛:tempo/ampulheta 📅:calendario/data 📌:fixar/pin 📎:clipe/anexo ✏️:lapis/editar 📝:nota/anotar 📚:livros/estudar 📖:livro 🔒:trancado/cadeado 🔓:aberto 🔑:chave 🔨:martelo 🛠️:ferramentas ⚙️:engrenagem/config 🧲:ima 💣:bomba 🔪:faca 🗡️:espada 🛡️:escudo 🏹:arco 💊:remedio 💉:vacina/injecao 🧪:ciencia/teste 🔭:telescopio 💰:dinheiro/grana 💸:dinheiro/gastando 💳:cartao 💎:diamante/joia 🏠:casa 🏢:predio/trabalho 🏫:escola 🏥:hospital 🏰:castelo ✈️:aviao/viagem 🚀:foguete/rapido 🛸:ovni/disco 🚓:policia 🚑:ambulancia 🚌:onibus 🗺️:mapa 🧭:bussola 🏖️:praia/ferias 🗿:moai/serio 🎃:abobora/halloween 🎅:natal/noel`]
];
const EP = EP_DATA.map(([id, icon, name, s]) => ({ id, icon, name, items: s.trim().split(/\s+/).map(t => { const [e, k = ''] = t.split(':'); return { e, k: k.replace(/\//g, ' ') }; }) }));
const EP_ALL = new Map(); EP.forEach(c => c.items.forEach(i => EP_ALL.has(i.e) || EP_ALL.set(i.e, i)));
const EP_REC = 'discordia:emoji-rec';
const epRecent = () => { try { const r = JSON.parse(localStorage.getItem(EP_REC)); return Array.isArray(r) ? r : []; } catch { return []; } };
const epUse = e => { try { localStorage.setItem(EP_REC, JSON.stringify([e, ...epRecent().filter(x => x !== e)].slice(0, 18))); } catch {} };
const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function emojiPicker(anchor, onPick) {
  const rec = epRecent();
  const cats = [...(rec.length ? [{ id: 'rec', icon: '🕘', name: 'Usados recentemente', items: rec.map(e => EP_ALL.get(e) || { e, k: '' }) }] : []), ...EP];
  const btn = i => `<button type="button" data-e="${esc(i.e)}" data-k="${esc(i.k)}">${esc(i.e)}</button>`;
  const p = pop(`<div class="pk-h"><input class="input pk-q ep-q" placeholder="Procurar emoji (rir, fogo, gato...)" autocomplete="off" spellcheck="false" aria-label="Procurar emoji"></div>
    <div class="ep-tabs">${cats.map((c, i) => `<button type="button" data-tab="${c.id}" class="${i ? '' : 'on'}" title="${esc(c.name)}">${c.icon}</button>`).join('')}</div>
    <div class="ep-body">${cats.map(c => `<section data-cat="${c.id}"><h4>${esc(c.name)}</h4><div class="ep-grid">${c.items.map(btn).join('')}</div></section>`).join('')}
      <section class="ep-res" hidden><h4>Resultados</h4><div class="ep-grid"></div><p class="muted small ep-none" hidden>Nenhum emoji com esse nome.</p></section></div>
    <div class="ep-foot"><span class="ep-big">${cats[0].items[0].e}</span><span class="ep-name">${matchMedia('(pointer: coarse)').matches ? 'Toque para escolher' : 'Shift + clique escolhe vários de uma vez'}</span></div>`, anchor, 'picker emoji', 'above');
  const q = $('.ep-q', p), body = $('.ep-body', p), res = $('.ep-res', p), resGrid = $('.ep-grid', res), tabs = $$('.ep-tabs button', p), secs = $$('section[data-cat]', p);
  const big = $('.ep-big', p), name = $('.ep-name', p), hint = name.textContent;
  const pick = (e, keep) => { epUse(e); onPick(e); if (!keep) closePops(); };
  p.addEventListener('click', ev => {
    const b = ev.target.closest('[data-e]'); if (b) return pick(b.dataset.e, ev.shiftKey);
    const t = ev.target.closest('[data-tab]'); if (!t) return;
    q.value = ''; search();
    const s = secs.find(x => x.dataset.cat === t.dataset.tab); body.scrollTop = s ? s.offsetTop : 0;
  });
  p.addEventListener('mouseover', ev => { const b = ev.target.closest('[data-e]'); if (!b) return; big.textContent = b.dataset.e; const k = b.dataset.k.split(' ')[0]; name.textContent = k ? ':' + k + ':' : ''; });
  p.addEventListener('mouseleave', () => { name.textContent = hint; });
  body.addEventListener('scroll', () => {
    if (!res.hidden) return;
    let cur = secs[0]; for (const s of secs) if (s.offsetTop - 8 <= body.scrollTop) cur = s;
    tabs.forEach(t => t.classList.toggle('on', t.dataset.tab === cur.dataset.cat));
  }, { passive: true });
  function search() {
    const v = fold(q.value.trim());
    res.hidden = !v; secs.forEach(s => s.hidden = !!v);
    if (!v) { body.dispatchEvent(new Event('scroll')); return; }
    tabs.forEach(t => t.classList.remove('on'));
    const words = v.split(/\s+/);
    const hits = [...EP_ALL.values()].filter(i => { const ks = (i.k + ' ' + fold(EP.find(c => c.items.includes(i))?.name || '')).split(' '); return words.every(w => ks.some(k => k.startsWith(w))); })
      .sort((a, b) => (b.k.split(' ')[0].startsWith(v) ? 1 : 0) - (a.k.split(' ')[0].startsWith(v) ? 1 : 0));
    resGrid.innerHTML = hits.map(btn).join('');
    $('.ep-none', res).hidden = hits.length > 0;
    body.scrollTop = 0;
  }
  q.addEventListener('input', search);
  q.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') { ev.stopPropagation(); closePops(); }
    else if (ev.key === 'Enter') { ev.preventDefault(); const f = $('[data-e]', res.hidden ? body : resGrid); if (f) pick(f.dataset.e, ev.shiftKey); }
  });
  if (!matchMedia('(pointer: coarse)').matches) setTimeout(() => q.focus(), 30);
}

/* =============== perfis =============== */
/* =============== inventário: placas de nome animadas ===============
   Só o dono do Anarchy dá (e tira). Quem ganha recebe o "baú" na tela e equipa no Inventário. Visual em plates.css. */
const RAR = { comum: ['Comum', 0], raro: ['Raro', 1], epico: ['Épico', 2], lendario: ['Lendário', 3] };
const PLATES = {
  sakura: ['Sakura ao Vento', 'comum', '🌸', 'Pétalas de cerejeira caindo devagar, como no primeiro dia de aula.'],
  lua: ['Lua Prateada', 'comum', '🌙', 'Uma lua crescente brilhando do lado do seu nome.'],
  galaxia: ['Céu Estrelado', 'comum', '✨', 'Estrelas piscando num céu roxo e azul.'],
  shoujo: ['Brilho Shoujo', 'comum', '💖', 'Tons pastel e brilhinhos subindo, direto de um anime de romance.'],
  chamas: ['Chamas do Inferno', 'raro', '🔥', 'Fogo subindo pela placa e um nome em brasa.'],
  raio: ['Raio Azul', 'raro', '⚡', 'Relâmpagos que cortam a placa de vez em quando.'],
  neon: ['Neon de Tóquio', 'raro', '🌃', 'Letreiro neon com falhas, de uma cidade cyberpunk.'],
  oceano: ['Ondas do Oceano', 'raro', '🌊', 'Ondas correndo embaixo do nome, como uma técnica de água.'],
  mecha: ['Piloto Mecha', 'raro', '🤖', 'Faixas de alerta e radar de cabine de robô gigante.'],
  escarlate: ['Olhar Escarlate', 'epico', '👁️', 'Um olho vermelho com três vírgulas girando sem parar.'],
  kitsune: ['Fogo de Raposa', 'epico', '🦊', 'Chamas azuis de raposa espiritual flutuando.'],
  ceifador: ['Ceifador', 'epico', '💀', 'Um corte de foice atravessa a placa sob a lua vermelha.'],
  oni: ['Máscara Oni', 'epico', '👹', 'Fumaça roxa de demônio subindo pelo nome.'],
  aura: ['Aura Dourada', 'lendario', '💛', 'Energia dourada de quem passou do limite. Poder máximo.'],
  dragao: ['Dragão Celestial', 'lendario', '🐉', 'Escamas de jade com o brilho de um dragão lendário.'],
  anarquia: ['Caos da Anarquia', 'lendario', '🏴', 'A placa da casa: listras do caos e o A da anarquia girando.'],
  // estas saem na Caixa Anarchy (BOX_PLATES no servidor)
  pizza: ['Hora da Pizza', 'comum', '🍕', 'Pizza quentinha e queijo derretendo.', 1],
  gato: ['Gatinho Fofo', 'comum', '🐱', 'Patinhas de gato passeando pela placa.', 1],
  cafe: ['Café Quentinho', 'comum', '☕', 'Fumacinha subindo de uma xícara de café.', 1],
  arcoiris: ['Arco-íris', 'comum', '🌈', 'Cores do arco-íris correndo sem parar.', 1],
  outono: ['Outono', 'comum', '🍂', 'Folhas secas caindo devagar.', 1],
  arcade: ['Fliperama', 'raro', '👾', 'Invasores de pixel e a tela de um fliperama antigo.', 1],
  gelo: ['Cristal de Gelo', 'raro', '❄️', 'Neve caindo e o nome congelado.', 1],
  colmeia: ['Colmeia', 'raro', '🐝', 'Favo de mel brilhando e uma abelha voando.', 1],
  foguete: ['Decolagem', 'raro', '🚀', 'Um foguete atravessando as estrelas.', 1],
  batida: ['Batida', 'raro', '🎧', 'Barras de som dançando no ritmo.', 1],
  vampiro: ['Noite Vampira', 'epico', '🦇', 'Morcegos voando sob a lua de sangue.', 1],
  fantasma: ['Assombração', 'epico', '👻', 'Névoa fantasma e um nome que some e volta.', 1],
  samurai: ['Lâmina Samurai', 'epico', '⚔️', 'O corte da espada atravessa a placa.', 1],
  alien: ['Abdução', 'epico', '🛸', 'Um disco voador puxando o seu nome para cima.', 1],
  fenix: ['Fênix Renascida', 'lendario', '🔥', 'Asas de fogo e brasas que sobem para o céu.', 1],
  rei: ['Coroa do Rei', 'lendario', '👑', 'Ouro, joias e o brilho de quem manda.', 1]
};
const PLATE_IDS = Object.keys(PLATES).sort((a, b) => RAR[PLATES[b][1]][1] - RAR[PLATES[a][1]][1]);
// classe da placa de alguém (lista de membros, conversas)
const npCls = id => { const p = user(id)?.plate; return p && PLATES[p] ? ` np np-${p}` : ''; };
const plateRow = (uid, pid, name) => `<div class="inv-prev np np-${pid}">${av(uid, 32)}<span class="np-name">${esc(name ?? nameOf(uid))}</span></div>`;
const fmtWhen = t => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

// presente chegando: baú no meio da tela, um de cada vez
const GIFT = { q: [], open: false, shown: new Set() };
function giftQueue(entry, from) {
  if (!entry || GIFT.shown.has(entry.id) || !PLATES[entry.item]) return;
  GIFT.shown.add(entry.id); GIFT.q.push({ entry, from }); if (!GIFT.open) giftNext();
}
function giftNext() {
  const g = GIFT.q.shift();
  if (!g) { GIFT.open = false; emit('inv:seen'); return; }
  GIFT.open = true;
  if (g.pts) return giftPoints(g);
  const [name, rar, emo, desc] = PLATES[g.entry.item];
  const fromName = g.from?.displayName || nameOf(g.entry.from);
  const el = document.createElement('div'); el.className = 'gift-back'; el.setAttribute('role', 'dialog');
  el.innerHTML = `<div class="gift r-${rar}"><div class="gift-from">🎁 <b>${esc(fromName)}</b> te mandou um presente!</div>
    <button class="gift-box" type="button" aria-label="Abrir presente"><span class="gift-rays"></span>🎁</button>
    <div class="gift-hint">Clique no presente para abrir</div></div>`;
  document.body.appendChild(el);
  tone([[523, .12], [659, .12], [784, .2]], 'triangle', .07);
  const close = () => { el.remove(); giftNext(); };
  el.querySelector('.gift-box').onclick = () => {
    const box = el.querySelector('.gift');
    box.innerHTML = `<div class="gift-reveal"><div class="gift-rar">${RAR[rar][0]}</div><div class="gift-title">${emo} ${esc(name)}</div>
      <div class="gift-card">${plateRow(S.me.id, g.entry.item)}<p class="inv-desc" style="margin:10px 0 0">${esc(desc)}</p></div>
      ${g.entry.msg ? `<div class="gift-msg">“${esc(g.entry.msg)}” — ${esc(fromName)}</div>` : `<div class="gift-msg">Presente de ${esc(fromName)}</div>`}
      <div class="gift-acts"><button class="btn primary" data-g="eq">Equipar agora</button><button class="btn ghost" data-g="keep" style="color:#fff">Guardar no inventário</button></div></div>`;
    // fanfarra: quanto mais raro, mais longa
    const fan = [[[523, .1], [784, .25]], [[523, .1], [659, .1], [988, .3]], [[523, .08], [659, .08], [784, .08], [1047, .35]], [[392, .1], [523, .1], [659, .1], [784, .1], [1047, .12], [1319, .45]]][RAR[rar][1]];
    tone(fan, 'triangle', .09);
    giftSparks(box.querySelector('.gift-card'), getComputedStyle(box).getPropertyValue('--rc').trim() || '#ffb300', 30 + RAR[rar][1] * 25);
    box.onclick = async e => {
      const b = e.target.closest('[data-g]'); if (!b) return;
      if (b.dataset.g === 'eq') { const r = await emit('inv:equip', { item: g.entry.item }); if (!r.ok) toast(r.erro, true); else toast(`${name} equipada! Todo mundo vê na lista de membros.`); }
      close();
    };
  };
  el.addEventListener('keydown', e => { if (e.key === 'Escape' && el.querySelector('.gift-reveal')) close(); });
}
// presente de AnarchyPoints: mesmo baú, mas sai uma moeda
function giftPoints(g) {
  const { amount, points, msg } = g.pts, fromName = g.from?.displayName || 'O dono do Anarchy';
  const el = document.createElement('div'); el.className = 'gift-back'; el.setAttribute('role', 'dialog');
  el.innerHTML = `<div class="gift r-lendario"><div class="gift-from">🎁 <b>${esc(fromName)}</b> te mandou AnarchyPoints!</div>
    <button class="gift-box" type="button" aria-label="Abrir presente"><span class="gift-rays"></span>🎁</button>
    <div class="gift-hint">Clique no presente para abrir</div></div>`;
  document.body.appendChild(el);
  tone([[523, .12], [659, .12], [784, .2]], 'triangle', .07);
  const close = () => { el.remove(); giftNext(); };
  el.querySelector('.gift-box').onclick = () => {
    const box = el.querySelector('.gift');
    box.innerHTML = `<div class="gift-reveal"><div class="gift-rar">AnarchyPoints</div><div class="gift-coin"><i class="pts-ic"></i></div>
      <div class="gift-title">+${amount.toLocaleString('pt-BR')} pontos</div>
      ${msg ? `<div class="gift-msg">“${esc(msg)}” — ${esc(fromName)}</div>` : `<div class="gift-msg">Presente de ${esc(fromName)}</div>`}
      <div style="opacity:.8">Seu saldo agora: <b style="color:#ffd36b">${points.toLocaleString('pt-BR')}</b></div>
      <div class="gift-acts">${points >= BOX_COST ? '<button class="btn primary" data-g="box">🎁 Abrir caixas</button>' : ''}<button class="btn ghost" data-g="ok" style="color:#fff">Valeu!</button></div></div>`;
    tone([[523, .08], [659, .08], [784, .08], [1047, .35]], 'triangle', .09);
    giftSparks(box.querySelector('.gift-coin'), '#ffc83c', 50);
    box.onclick = e => {
      const b = e.target.closest('[data-g]'); if (!b) return;
      if (b.dataset.g === 'box') { INV.tab = 'efeitos'; openSettings('inventario'); }
      close();
    };
  };
  el.addEventListener('keydown', e => { if (e.key === 'Escape' && el.querySelector('.gift-reveal')) close(); });
}
function giftSparks(anchor, color, n) {
  if (reduceMotion() || !anchor) return;
  const r = anchor.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i'); s.className = 'gift-spark';
    s.style.background = i % 3 ? color : '#fff'; s.style.left = cx + 'px'; s.style.top = cy + 'px'; s.style.boxShadow = `0 0 8px ${color}`;
    document.body.appendChild(s);
    const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 260;
    s.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(a) * v}px, ${Math.sin(a) * v}px) scale(.2)`, opacity: 0 }],
      { duration: 900 + Math.random() * 700, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => s.remove();
  }
}

/* =============== AnarchyPoints, caixas e fotos animadas ===============
   100 efeitos = 20 estilos x 5 cores (a cor Prisma sobe uma raridade). O sorteio é no servidor; aqui só a roleta. */
const AV_STYLES = {
  anel: ['Anel Tracejado', 'comum'], brilho: ['Brilho', 'comum'], pontos: ['Três Luas', 'comum'], duplo: ['Anéis Gêmeos', 'comum'], pulso: ['Pulsar', 'comum'], arco: ['Lâmina Giratória', 'comum'], respiro: ['Respiração', 'comum'],
  cometa: ['Cometa', 'raro'], faiscas: ['Faíscas', 'raro'], bolhas: ['Bolhas', 'raro'], eletrico: ['Choque', 'raro'], radar: ['Radar', 'raro'], petalas: ['Pétalas', 'raro'],
  chamas: ['Coroa de Chamas', 'epico'], galaxia: ['Galáxia', 'epico'], glitch: ['Glitch', 'epico'], runas: ['Runas', 'epico'],
  aura: ['Aura Suprema', 'lendario'], coroa: ['Estrelas Reais', 'lendario'], portal: ['Portal', 'lendario'],
  gotas: ['Gotas', 'comum'], moldura: ['Moldura Giratória', 'comum'], pontilhado: ['Pontilhado', 'comum'],
  notas: ['Notas Musicais', 'raro'], coracoes: ['Corações', 'raro'], orbita: ['Órbita', 'raro'],
  tornado: ['Tornado', 'epico'], hexa: ['Escudo Hexagonal', 'epico'], eclipse: ['Eclipse', 'lendario'], tempestade: ['Tempestade', 'lendario']
};
const AV_PALS = { fogo: 'Inferno', gelo: 'Gélido', veneno: 'Tóxico', realeza: 'Real', prisma: 'Prisma' };
const AVR = { comum: ['Comum', 0, '70%'], raro: ['Raro', 1, '20%'], epico: ['Épico', 2, '7%'], lendario: ['Lendário', 3, '2,5%'], mitico: ['Mítico', 4, '0,5%'] };
const AV_UP = { comum: 'raro', raro: 'epico', epico: 'lendario', lendario: 'mitico' };
const AVFX = {};
for (const [s, [sn, r]] of Object.entries(AV_STYLES)) for (const [p, pn] of Object.entries(AV_PALS)) AVFX[`${s}-${p}`] = { name: `${sn} ${pn}`, tier: p === 'prisma' ? AV_UP[r] : r };
const AVFX_IDS = Object.keys(AVFX).sort((a, b) => AVR[AVFX[b].tier][1] - AVR[AVFX[a].tier][1] || AVFX[a].name.localeCompare(AVFX[b].name));
const BOX_COST = 300;
const ptMin = () => Math.round((S.me?.ptEvery || 1800000) / 60000); // minutos de call para cada 100 pontos
// foto da pessoa com um efeito (para a roleta, o inventário e as cartas)
const avWith = (fxId, size = 64) => av(S.me.id, size, false, '', { ...S.me, avfx: fxId });
const ownedFx = () => new Set((S.me.items || []).filter(x => String(x.item).startsWith('av:')).map(x => x.item.slice(3)));

// roleta no estilo das caixas de jogo: as cartas correm e param na que o servidor sorteou
// daily = caixa diária grátis (mesma animação; o servidor sorteia sem cobrar e soma o bônus da sequência)
async function openCase(daily) {
  const r = await emit(daily ? 'daily:claim' : 'box:open');
  if (!r.ok) return toast(r.erro, true);
  // animações variadas e fundos animados ficam em caixas.js; o código abaixo é a roleta antiga (reserva)
  if (window.anarchyBox) return window.anarchyBox.open(r, daily);
  const N = 60, WIN = 52, W = 130; // 124 de carta + 6 de espaço
  const pick = () => { const roll = Math.random() * 100; const t = roll < 70 ? 'comum' : roll < 90 ? 'raro' : roll < 97 ? 'epico' : roll < 99.5 ? 'lendario' : 'mitico'; const pool = AVFX_IDS.filter(k => AVFX[k].tier === t); return pool[Math.floor(Math.random() * pool.length)]; };
  const items = Array.from({ length: N }, (_, i) => i === WIN ? r.item : pick());
  const el = document.createElement('div'); el.className = 'case-back'; el.setAttribute('role', 'dialog');
  el.innerHTML = `<div class="case"><h2>${daily ? `🎁 Caixa diária grátis · 🔥 ${r.streak} ${r.streak === 1 ? 'dia' : 'dias seguidos'}` : 'Abrindo a Caixa Anarchy...'}</h2>
    <div class="reel-win"><div class="reel">${items.map((id, i) => `<div class="reel-it r-c-${AVFX[id].tier}" data-i="${i}">${avWith(id, 56)}<span>${esc(AVFX[id].name)}</span></div>`).join('')}</div><i class="reel-mark"></i></div>
    <div class="case-out"></div></div>`;
  document.body.appendChild(el);
  const reel = $('.reel', el), box = $('.reel-win', el);
  const center = box.clientWidth / 2, jitter = (Math.random() - .5) * (W - 30);
  const target = WIN * W + 62 - center + jitter;
  const dur = reduceMotion() ? 600 : 6200;
  // som de "tic" a cada carta que passa pela linha
  let last = -1, t0 = performance.now();
  const ease = x => 1 - Math.pow(1 - x, 4);
  await new Promise(done => {
    const step = now => {
      const k = Math.min(1, (now - t0) / dur), x = target * ease(k);
      reel.style.transform = `translateX(${-x}px)`;
      const idx = Math.floor((x + center) / W);
      if (idx !== last) { last = idx; if (k < .995) tone([[1100 + Math.random() * 120, .025]], 'square', .025); }
      if (k < 1) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
  });
  const f = AVFX[r.item], won = $(`.reel-it[data-i="${WIN}"]`, el); won.classList.add('win');
  const fan = [[[523, .1], [784, .2]], [[523, .1], [659, .1], [988, .25]], [[523, .08], [659, .08], [784, .08], [1047, .3]], [[392, .1], [523, .1], [659, .1], [784, .1], [1047, .35]], [[392, .08], [523, .08], [659, .08], [784, .08], [1047, .1], [1319, .1], [1568, .45]]][AVR[f.tier][1]];
  tone(fan, 'triangle', .09);
  const out = $('.case-out', el);
  out.className = `case-out case-res r-c-${f.tier}`;
  out.innerHTML = `<div class="gift-rar">${AVR[f.tier][0]}</div>${avWith(r.item, 96)}<div class="gift-title">${esc(f.name)}</div>
    ${r.dup ? `<div class="muted">Você já tinha esse. Ganhou <b style="color:#ffd36b">+${r.refund} pontos</b> de volta.</div>` : '<div class="muted">Novo efeito para a sua foto de perfil!</div>'}
    ${daily ? `<div class="muted">Bônus da sequência: <b style="color:#ffd36b">+${r.bonus} pontos</b>. Volte amanhã para a sequência continuar!</div>` : ''}
    <div class="gift-acts">${r.dup ? '' : '<button class="btn primary" data-c="eq">Usar agora</button>'}<button class="btn" data-c="again" ${r.points < BOX_COST ? 'disabled' : ''}>Abrir uma Caixa · ${BOX_COST}</button><button class="btn ghost" data-c="x" style="color:#fff">Fechar</button></div>
    <div class="muted small">Saldo: ${r.points.toLocaleString('pt-BR')} pontos</div>`;
  if (AVR[f.tier][1] >= 2) giftSparks(won, getComputedStyle(out).getPropertyValue('--rc').trim(), 30 + AVR[f.tier][1] * 20);
  out.onclick = async e => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    if (b.dataset.c === 'eq') { const q = await emit('avfx:equip', { item: r.item }); if (!q.ok) return toast(q.erro, true); toast(`${f.name} na sua foto!`); }
    el.remove();
    if (b.dataset.c === 'again') openCase();
  };
}

// tela Inventário (Configurações): tudo num lugar só. Em cima, o seu visual e a carteira (com a caixa);
// embaixo, abas: efeitos de foto, placas de nome, histórico e (só o dono) dar presentes.
const INV = { tab: null, sel: null, item: null, people: null, q: '', rar: 'todos', amt: 500, msg: '' };
const PT_PRESETS = [100, 300, 500, 1000, 5000];
// "assinatura" do que a tela mostra: só redesenha quando algo disso muda (não a cada minuto de call)
const invSig = u => [u.points, (u.items || []).length, u.plate, u.avfx, u.bgfx, (u.boxLog || []).length, (u.given || []).length, (u.ptsLog || []).length, (u.lost || []).length, (u.items || []).filter(x => x.seen === false).length, u.daily && u.daily.ready, Object.keys(u.achAt || {}).length].join('|');
const ptsAmt = () => Math.max(1, Math.min(1e6, Math.round(+INV.amt || 0)));
const ptsPick = () => `<div class="pts-pick">${PT_PRESETS.map(n => `<button type="button" data-amt="${n}" class="${INV.amt === n ? 'on' : ''}"><i class="pts-ic"></i>${n.toLocaleString('pt-BR')}</button>`).join('')}
  <input class="input" type="number" min="1" max="1000000" data-amt-in placeholder="Outro valor" value="${PT_PRESETS.includes(INV.amt) ? '' : esc(String(INV.amt))}"></div>`;
// liga os botões de quantidade; onChange atualiza o texto do botão de dar
function bindPtsPick(root, onChange) {
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-amt]'); if (!b) return;
    INV.amt = +b.dataset.amt; $$('[data-amt]', root).forEach(x => x.classList.toggle('on', x === b));
    const i = $('[data-amt-in]', root); if (i) i.value = ''; onChange();
  });
  const i = $('[data-amt-in]', root);
  if (i) i.oninput = () => { if (!i.value) return; INV.amt = +i.value; $$('[data-amt]', root).forEach(x => x.classList.remove('on')); onChange(); };
}
// menu da pessoa → "Dar AnarchyPoints"
function givePointsModal(uid) {
  const u = user(uid); if (!PT_PRESETS.includes(INV.amt)) INV.amt = 500;
  modal(`<div class="modal-h"><h2><i class="pts-ic"></i> Dar AnarchyPoints</h2><p>Para <b>${esc(u.displayName)}</b>. Chega na hora como presente, com aviso na tela.</p></div>
    <div class="modal-b gp-b"><div class="gp-who">${av(uid, 40)}<div><b>${esc(u.displayName)}</b><span class="muted small">@${esc(u.username)}</span></div></div>
      ${ptsPick()}<label class="field">Mensagem (opcional)<input class="input" id="gpMsg" maxlength="140" placeholder="ex.: Prêmio do campeonato!"></label></div>
    <div class="modal-f"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="gpGo"></button></div>`, (m, close) => {
    const go = $('#gpGo', m), lab = () => { go.innerHTML = `🎁 Dar ${ptsAmt().toLocaleString('pt-BR')} pontos`; };
    lab(); bindPtsPick(m, lab);
    go.onclick = async () => {
      go.disabled = true;
      const r = await emit('points:give', { uid, amount: ptsAmt(), msg: $('#gpMsg', m).value });
      go.disabled = false;
      if (!r.ok) return toast(r.erro, true);
      toast(`🎁 ${ptsAmt().toLocaleString('pt-BR')} AnarchyPoints para ${u.displayName}. Saldo de ${u.displayName}: ${r.points.toLocaleString('pt-BR')}.`);
      close();
    };
  });
}

function drawInventory(b) {
  const me = S.me, pts = me.points || 0, own = ownedFx();
  const plates = (me.items || []).filter(x => PLATES[x.item]), owned = new Map(plates.map(x => [x.item, x]));
  const eqP = me.plate && PLATES[me.plate] ? me.plate : null, eqF = me.avfx && AVFX[me.avfx] ? me.avfx : null;
  const fresh = plates.some(x => x.seen === false);
  if (!INV.tab) INV.tab = fresh ? 'placas' : 'efeitos';
  if (INV.tab === 'dar' && !me.admin) INV.tab = 'efeitos';
  drawInventory.sig = invSig(me);
  const every = me.ptEvery || 1800000, prog = Math.min(100, Math.round((me.callAcc || 0) / every * 100)), left = Math.max(1, Math.ceil((every - (me.callAcc || 0)) / 60000));
  const BX = window.anarchyBox, ownBg = new Set((me.items || []).filter(x => String(x.item).startsWith('bg:')).map(x => x.item.slice(3))), eqB = BX && me.bgfx && BX.BG[me.bgfx] ? me.bgfx : null;
  const tabs = [['efeitos', '✨ Efeitos de foto', `${own.size}/${AVFX_IDS.length}`], ...(BX ? [['fundos', '🌌 Fundos animados', `${ownBg.size}/${BX.BG_IDS.length}`]] : []), ['placas', '🏷️ Placas de nome', `${owned.size}/${PLATE_IDS.length}`], ['conquistas', '🏆 Conquistas', `${Object.keys(me.achAt || {}).length}`], ['loja', '🛒 Loja da semana', ''], ['historico', '📜 Histórico', ''], ...(me.admin ? [['dar', '🎁 Dar presentes', '']] : [])];
  b.innerHTML = `<h2>Inventário</h2>
    <div class="iv-hero">
      <div class="iv-look"><span class="iv-k">Seu visual</span>
        <div class="iv-look-av ${eqB ? 'bgx-host' : ''}" style="${eqB ? 'border-radius:14px;padding:10px 30px' : ''}">${eqB ? BX.bgLayer(eqB) : ''}<span style="position:relative">${av(me.id, 84)}</span></div>
        ${eqP ? plateRow(me.id, eqP, me.displayName) : `<div class="inv-prev">${av(me.id, 32)}<span class="np-name">${esc(me.displayName)}</span></div>`}
        <div class="iv-eq"><span>✨ ${eqF ? `<b>${esc(AVFX[eqF].name)}</b> <button class="link" data-off="fx">tirar</button>` : '<span class="muted">Sem efeito na foto</span>'}</span>
          <span>🏷️ ${eqP ? `<b>${esc(PLATES[eqP][0])}</b> <button class="link" data-off="plate">tirar</button>` : '<span class="muted">Sem placa no nome</span>'}</span>
          ${BX ? `<span>🌌 ${eqB ? `<b>${esc(BX.BG[eqB][0])}</b> <button class="link" data-off="bg">tirar</button>` : '<span class="muted">Sem fundo animado</span>'}</span>` : ''}</div>
      </div>
      <div class="iv-wallet"><div class="crate" aria-hidden="true"></div><div class="iv-wal-in">
        <span class="iv-k">Carteira</span>
        <div class="box-bal"><i class="pts-ic"></i>${pts.toLocaleString('pt-BR')} <span class="muted small" style="font-weight:600">AnarchyPoints</span></div>
        <div class="box-prog" title="Próximos 100 pontos"><i style="width:${prog}%"></i></div>
        <span class="muted small">Em call com mais alguém: <b>+100</b> a cada ${ptMin()} min · faltam ~${left} min</span>
        ${me.daily && me.daily.ready ? `<button class="btn iv-open iv-daily" id="dailyGo">🎁 Pegar a caixa diária grátis${me.daily.streak ? ` · 🔥 ${me.daily.streak}` : ''}</button>` : `<span class="muted small iv-daily-ok">✅ Caixa diária pega hoje${me.daily && me.daily.streak ? ` · 🔥 ${me.daily.streak} ${me.daily.streak === 1 ? 'dia' : 'dias seguidos'}` : ''}. Volte amanhã!</span>`}
        <button class="btn primary iv-open" id="boxGo" ${pts < BOX_COST ? 'disabled' : ''}>🎁 Abrir Caixa Anarchy · <i class="pts-ic"></i> ${BOX_COST}</button>
        ${pts < BOX_COST ? `<span class="muted small">Faltam ${BOX_COST - pts} pontos para a próxima caixa.</span>` : ''}
        <div class="box-odds">${Object.entries(AVR).map(([k, v]) => `<span class="r-c-${k}">${v[0]} ${v[2]}</span>`).join('')}</div>
        ${BX ? `<span class="muted small">Sai um efeito de foto ou um fundo animado de perfil.</span>${BX.pickHtml()}` : ''}
      </div></div>
    </div>
    <div class="iv-tabs" role="tablist">${tabs.map(([k, l, n]) => `<button type="button" role="tab" data-tab="${k}" class="${INV.tab === k ? 'on' : ''}">${l}${n ? `<small>${n}</small>` : ''}${k === 'placas' && fresh ? '<i class="iv-dot"></i>' : ''}</button>`).join('')}</div>
    <div class="iv-pane" id="ivPane">${invPane(me, own, owned, eqP)}</div>`;
  $('#boxGo').onclick = () => openCase();
  const dg = $('#dailyGo'); if (dg) dg.onclick = () => openCase(true);
  b.onclick = async e => {
    const t = e.target.closest('[data-tab]'); if (t) { INV.tab = t.dataset.tab; return drawInventory(b); }
    const r = e.target.closest('[data-rar]'); if (r) { INV.rar = r.dataset.rar; return drawInventory(b); }
    const off = e.target.closest('[data-off]');
    if (off) { const q = await emit(off.dataset.off === 'fx' ? 'avfx:equip' : off.dataset.off === 'bg' ? 'bg:equip' : 'inv:equip', { item: null }); if (!q.ok) toast(q.erro, true); return; }
    const bgc = e.target.closest('[data-bg]');
    if (bgc && !bgc.disabled) { const q = await emit('bg:equip', { item: me.bgfx === bgc.dataset.bg ? null : bgc.dataset.bg }); if (!q.ok) toast(q.erro, true); return; }
    const fx = e.target.closest('[data-fx]');
    if (fx && !fx.disabled) { const q = await emit('avfx:equip', { item: me.avfx === fx.dataset.fx ? null : fx.dataset.fx }); if (!q.ok) toast(q.erro, true); return; }
    const c = e.target.closest('[data-inv]');
    if (c && !c.disabled) { const q = await emit('inv:equip', { item: eqP === c.dataset.inv ? null : c.dataset.inv }); if (!q.ok) toast(q.erro, true); }
  };
  if (INV.tab === 'placas' && fresh) emit('inv:seen');
  if (INV.tab === 'dar') drawGive();
  if (INV.tab === 'loja' && window.anarchyFun) window.anarchyFun.fillShop($('#ivPane .fun-shop'));
}
function invPane(me, own, owned, eqP) {
  if (INV.tab === 'conquistas') return window.anarchyFun ? window.anarchyFun.achPane() : '';
  if (INV.tab === 'loja') return '<div class="fun-shop"><p class="muted small">Abrindo a loja...</p></div>';
  if (INV.tab === 'fundos' && window.anarchyBox) {
    const BX = window.anarchyBox, ownBg = new Set((me.items || []).filter(x => String(x.item).startsWith('bg:')).map(x => x.item.slice(3)));
    const filt = [['todos', 'Todos'], ['meus', 'Meus'], ...Object.entries(AVR).map(([k, v]) => [k, v[0]])];
    const ids = BX.BG_IDS.filter(id => INV.rar === 'todos' || (INV.rar === 'meus' ? ownBg.has(id) : BX.BG[id][1] === INV.rar)).sort((a, b) => AVR[BX.BG[b][1]][1] - AVR[BX.BG[a][1]][1]);
    return `<div class="iv-filter">${filt.map(([k, l]) => `<button type="button" data-rar="${k}" class="${INV.rar === k ? 'on' : ''} ${AVR[k] ? 'r-c-' + k : ''}">${l}</button>`).join('')}</div>
      <p class="muted small iv-note">Fundos que se mexem no topo do seu cartão de perfil (todo mundo vê). Saem na Caixa Anarchy junto com os efeitos de foto. Clique em um que é seu para usar.</p>
      ${ids.length ? `<div class="bgx-grid">${ids.map(id => { const [n, t] = BX.BG[id], has = ownBg.has(id), on = me.bgfx === id; return `<button class="bgx-card r-c-${t} ${has ? '' : 'locked'} ${on ? 'on' : ''}" data-bg="${id}" ${has ? '' : 'disabled'} title="${has ? (on ? 'Clique para tirar' : 'Clique para usar') : 'Ainda não saiu para você'}">${on ? '<span class="inv-tag">USANDO</span>' : ''}<div class="bgx-prev">${BX.bgLayer(id)}${has ? '' : '<span class="bgx-tag">🔒</span>'}</div><b>${esc(n)}</b><small>${AVR[t][0]}</small></button>`; }).join('')}</div>`
        : `<div class="iv-empty">🌌<b>Nenhum fundo aqui ainda</b><span>Abra uma Caixa Anarchy para ganhar o primeiro.</span></div>`}`;
  }
  if (INV.tab === 'efeitos') {
    const filt = [['todos', 'Todos'], ['meus', 'Meus'], ...Object.entries(AVR).map(([k, v]) => [k, v[0]])];
    const ids = AVFX_IDS.filter(id => INV.rar === 'todos' || (INV.rar === 'meus' ? own.has(id) : AVFX[id].tier === INV.rar));
    return `<div class="iv-filter">${filt.map(([k, l]) => `<button type="button" data-rar="${k}" class="${INV.rar === k ? 'on' : ''} ${AVR[k] ? 'r-c-' + k : ''}">${l}</button>`).join('')}</div>
      <p class="muted small iv-note">Efeitos animados em volta da sua foto, saem na Caixa Anarchy. Clique em um que é seu para usar. Repetiu? Volta em pontos (30 a 1000, conforme a raridade).</p>
      ${ids.length ? `<div class="avx-grid">${ids.map(id => { const f = AVFX[id], has = own.has(id), on = me.avfx === id; return `<button class="avx-card r-c-${f.tier} ${has ? '' : 'locked'} ${on ? 'on' : ''}" data-fx="${id}" ${has ? '' : 'disabled'} title="${has ? (on ? 'Clique para tirar' : 'Clique para usar') : 'Ainda não saiu para você'}">${on ? '<span class="inv-tag">USANDO</span>' : ''}${avWith(id, 48)}<b>${esc(f.name)}</b><small>${AVR[f.tier][0]}</small></button>`; }).join('')}</div>`
        : `<div class="iv-empty">🎁<b>Nenhum efeito aqui ainda</b><span>Abra uma Caixa Anarchy para ganhar o primeiro.</span></div>`}`;
  }
  if (INV.tab === 'placas') {
    const card = id => {
      const [n, r, e, d] = PLATES[id], has = owned.get(id), on = eqP === id;
      return `<button class="inv-card r-${r} ${has ? '' : 'locked'} ${on ? 'on' : ''}" data-inv="${id}" ${has ? '' : 'disabled'} title="${has ? (on ? 'Clique para tirar' : 'Clique para equipar') : 'Bloqueado'}">
        ${on ? '<span class="inv-tag">EQUIPADO</span>' : has && has.seen === false ? '<span class="inv-tag new">NOVO</span>' : ''}
        <span class="inv-rar">${RAR[r][0]}</span>
        ${plateRow(me.id, id, me.displayName)}
        <span class="inv-name">${e} ${has ? esc(n) : '???'}</span>
        <span class="inv-desc">${has ? `${esc(d)}<br>${has.from === 'caixa' ? '🎁 Saiu na caixa' : has.from === 'diaria' ? '🎁 Saiu na caixa diária' : `De ${esc(nameOf(has.from))}`} · ${fmtWhen(has.at)}` : PLATES[id][4] ? 'Ainda não é sua. Sai na Caixa Anarchy!' : 'Ainda não é sua. Só dá para ganhar de presente.'}</span></button>`;
    };
    return `<p class="muted small iv-note">Placas animadas aparecem para todo mundo na lista de membros. As novas saem na Caixa Anarchy; as clássicas, só de presente do dono do Anarchy.</p>
      <div class="inv-grid">${PLATE_IDS.map(card).join('')}</div>`;
  }
  if (INV.tab === 'historico') {
    const pn = id => esc(PLATES[id]?.[0] || id);
    const log = [
      ...(me.items || []).filter(x => PLATES[x.item] && x.from !== 'caixa' && x.from !== 'diaria').map(x => ({ at: x.at, ic: '🏷️', t: `Você ganhou a placa <b>${pn(x.item)}</b> de ${esc(nameOf(x.from))}${x.msg ? ` — “${esc(x.msg)}”` : ''}` })),
      ...(me.lost || []).map(x => ({ at: x.at, ic: '💨', t: `A placa <b>${pn(x.item)}</b> foi tirada da sua conta` })),
      ...(me.boxLog || []).map(x => ({ at: x.at, ic: String(x.item).startsWith('bg:') ? '🌌' : '🎲', rc: window.anarchyBox ? window.anarchyBox.pTier(x.item) : AVFX[x.item]?.tier, t: `Caixa: <b style="color:var(--rc)">${esc(window.anarchyBox ? window.anarchyBox.pName(x.item) : AVFX[x.item]?.name || x.item)}</b>${x.dup ? ' <span class="muted">(repetido, virou pontos)</span>' : ''}` })),
      ...(me.ptsLog || []).map(x => ({ at: x.at, ic: '🪙', t: x.amount > 0 ? `Você ganhou <b style="color:#ffd36b">+${x.amount.toLocaleString('pt-BR')} pontos</b> de ${esc(nameOf(x.from))}${x.msg ? ` — “${esc(x.msg)}”` : ''}` : `${esc(nameOf(x.from))} tirou <b>${(-x.amount).toLocaleString('pt-BR')} pontos</b> seus` })),
      ...(me.given || []).map(x => ({ at: x.at, ic: x.points ? '📤' : x.revoked ? '🗑️' : '📤',
        t: x.points ? (x.points > 0 ? `Você deu <b style="color:#ffd36b">${x.points.toLocaleString('pt-BR')} pontos</b> para ${esc(nameOf(x.to))}` : `Você tirou <b>${(-x.points).toLocaleString('pt-BR')} pontos</b> de ${esc(nameOf(x.to))}`)
          : x.revoked ? `Você tirou <b>${pn(x.item)}</b> de ${esc(nameOf(x.to))}` : `Você deu <b>${pn(x.item)}</b> para ${esc(nameOf(x.to))}` }))
    ].sort((a, b) => b.at - a.at).slice(0, 80);
    return log.length ? `<div class="inv-log">${log.map(x => `<div class="inv-log-it ${x.rc ? 'r-c-' + x.rc : ''}"><span class="ic">${x.ic}</span><span>${x.t}</span><time>${fmtWhen(x.at)}</time></div>`).join('')}</div>`
      : `<div class="iv-empty">📜<b>Nada por aqui ainda</b><span>Caixas abertas, presentes recebidos e dados aparecem aqui.</span></div>`;
  }
  return `<div class="iv-give"><p class="muted small">Carregando contas...</p></div>`;
}
// aba "Dar presentes" (só o dono): escolhe a pessoa à esquerda, à direita dá pontos ou placa
async function drawGive() {
  const box = $('#ivPane .iv-give'); if (!box) return;
  if (!INV.people) { const r = await emit('inv:people'); if (!r.ok) { box.innerHTML = `<p class="form-err">${esc(r.erro)}</p>`; return; } INV.people = r.people; }
  if (!$('#ivPane .iv-give')) return;
  INV.people.forEach(p => { if (!S.users[p.id]) S.users[p.id] = p; }); // foto e cor de quem não está nos seus grupos
  const q = INV.q.trim().toLowerCase();
  const list = INV.people.filter(p => !q || p.displayName.toLowerCase().includes(q) || p.username.includes(q)).sort((a, b) => a.displayName.localeCompare(b.displayName)).slice(0, 80);
  const sel = INV.people.find(p => p.id === INV.sel);
  box.innerHTML = `<div class="iv-people-col"><input class="input" id="invQ" placeholder="Procurar pessoa" value="${esc(INV.q)}" autocomplete="off">
      <div class="inv-people">${list.map(p => `<button type="button" class="inv-person ${p.id === INV.sel ? 'sel' : ''}" data-p="${p.id}">${av(p.id, 28)}<span><b>${esc(p.displayName)}</b><span class="muted small">@${esc(p.username)}</span></span><small><i class="pts-ic"></i>${(p.points || 0).toLocaleString('pt-BR')}</small></button>`).join('') || '<p class="muted small">Ninguém com esse nome.</p>'}</div></div>
    <div class="iv-give-main">${sel ? `
      <div class="gp-who">${av(sel.id, 44)}<div><b>${esc(sel.displayName)}</b><span class="muted small">@${esc(sel.username)} · <i class="pts-ic"></i> ${(sel.points || 0).toLocaleString('pt-BR')} pontos · ${sel.items.length} placa${sel.items.length === 1 ? '' : 's'}</span></div></div>
      <label class="field">Mensagem (opcional, vai junto com o presente)<input class="input" id="invMsg" maxlength="140" placeholder="ex.: Parabéns pelo aniversário!" value="${esc(INV.msg)}"></label>
      <section class="iv-sec"><h4><i class="pts-ic"></i> AnarchyPoints</h4>${ptsPick()}
        <div class="iv-sec-f"><button class="btn primary" id="ptsGo">🎁 Dar ${ptsAmt().toLocaleString('pt-BR')} pontos</button></div></section>
      <section class="iv-sec"><h4>🏷️ Placa de nome</h4>
        <div class="inv-grid">${PLATE_IDS.map(id => { const has = sel.items.includes(id), [n, r, e] = PLATES[id]; return `<button type="button" class="inv-card r-${r} ${INV.item === id ? 'on' : ''}" data-gi="${id}">${has ? '<span class="inv-tag">JÁ TEM</span>' : ''}<span class="inv-rar">${RAR[r][0]}</span>${plateRow(sel.id, id, sel.displayName)}<span class="inv-name">${e} ${esc(n)}</span>${has ? `<span class="link" data-rv="${id}" style="font-size:.8em;color:var(--danger)">Tirar dessa pessoa</span>` : ''}</button>`; }).join('')}</div>
        <div class="iv-sec-f"><button class="btn primary" id="invGo" ${INV.item && !sel.items.includes(INV.item) ? '' : 'disabled'}>🎁 Dar ${INV.item ? esc(PLATES[INV.item][0]) : 'placa'}</button></div></section>`
      : `<div class="iv-empty">👈<b>Escolha uma pessoa</b><span>Depois é só escolher os pontos ou a placa que você quer dar.</span></div>`}</div>`;
  const qi = $('#invQ'); qi.oninput = () => { INV.q = qi.value; const pos = qi.selectionStart; drawGive().then(() => { const n = $('#invQ'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }); };
  const mi = $('#invMsg'); if (mi) mi.oninput = () => { INV.msg = mi.value; };
  const ps = $('.iv-sec', box); if (ps) bindPtsPick(ps, () => { $('#ptsGo').innerHTML = `🎁 Dar ${ptsAmt().toLocaleString('pt-BR')} pontos`; });
  box.onclick = async e => {
    e.stopPropagation();
    const p = e.target.closest('[data-p]'); if (p) { INV.sel = p.dataset.p; INV.item = null; return drawGive(); }
    const rv = e.target.closest('[data-rv]');
    if (rv) { if (!await confirmBox('Tirar placa', `Tirar ${PLATES[rv.dataset.rv][0]} de ${sel.displayName}?`, 'Tirar')) return; const r = await emit('inv:revoke', { uid: sel.id, item: rv.dataset.rv }); if (!r.ok) return toast(r.erro, true); sel.items = sel.items.filter(x => x !== rv.dataset.rv); toast('Placa tirada.'); return drawGive(); }
    const gi = e.target.closest('[data-gi]'); if (gi) { INV.item = gi.dataset.gi; return drawGive(); }
    if (e.target.closest('#ptsGo')) {
      const n = ptsAmt(), r = await emit('points:give', { uid: sel.id, amount: n, msg: INV.msg });
      if (!r.ok) return toast(r.erro, true);
      sel.points = r.points; INV.msg = ''; toast(`🎁 ${n.toLocaleString('pt-BR')} AnarchyPoints para ${sel.displayName}!`); return drawGive();
    }
    if (e.target.closest('#invGo')) {
      const r = await emit('inv:give', { uid: sel.id, item: INV.item, msg: INV.msg });
      if (!r.ok) return toast(r.erro, true);
      sel.items.push(INV.item); toast(`🎁 ${PLATES[INV.item][0]} entregue para ${sel.displayName}!`); INV.item = null; INV.msg = ''; drawGive();
    }
  };
}

const FRAMES = { neon: 'Neon', arco: 'Arco-íris', ouro: 'Ouro', fogo: 'Fogo', gelo: 'Gelo', folhas: 'Folhagem', pixel: 'Pixel', orbita: 'Órbita' };
const EFFECTS = { estrelas: 'Estrelas', neve: 'Neve', brilho: 'Brilho', bolhas: 'Bolhas', aurora: 'Aurora' };
const BADGES = {
  pioneiro: ['🚀', 'Pioneiro', 'Uma das 25 primeiras contas deste servidor.'],
  fundador: ['🏰', 'Fundador', 'Criou um grupo.'],
  veterano: ['🎖️', 'Veterano', 'Está no Anarchy há mais de um ano.'],
  sociavel: ['🫂', 'Sociável', 'Tem 10 amigos ou mais.'],
  estiloso: ['🎨', 'Estiloso', 'Montou o perfil com foto, banner e bio.']
};
// cores do cartão de uma pessoa, todas como variáveis no próprio cartão (nada global)
function cardVars(u) {
  const th = Array.isArray(u.theme) && u.theme.length === 2 && u.theme.every(c => HEXC.test(c)) ? u.theme : null;
  const ac = safeC(u.accent, safeC(u.color, '#6c7cff'));
  // fundo claro → texto escuro e corpo do cartão claro; fundo escuro → o contrário (sempre legível)
  const light = th && contrast(th[0]) && contrast(th[1]);
  return { th, ac, style: `--pc:${ac};${th ? `--t1:${th[0]};--t2:${th[1]};--ptext:${light ? '#15171c' : '#f4f5f8'};--card-bg:color-mix(in srgb, ${th[0]} ${light ? '28%, #ffffff' : '42%, #0b0d12'})` : ''}` };
}
function bannerStyle(u) {
  return u.banner ? (isImg(u.banner) ? `background-image:url('${esc(u.banner)}')` : `background:${safeC(u.banner)}`) : `background:linear-gradient(135deg, ${safeC(u.color)}, color-mix(in srgb, ${safeC(u.color)} 55%, #000))`;
}
const badgeRow = u => (u.badges || []).filter(b => BADGES[b]).map(b => `<span class="pf-badge" data-tip="${esc(BADGES[b][1] + ': ' + BADGES[b][2])}">${BADGES[b][0]}</span>`).join('');
// fundo animado do banner (prêmio da caixa; visual em caixas.css)
const bgFx = u => (u.bgfx && window.anarchyBox ? window.anarchyBox.bgLayer(u.bgfx) : '');
const fxLayer = u => (u.effect && EFFECTS[u.effect] ? `<div class="pf-fx fx-${esc(u.effect)}" aria-hidden="true"></div>` : '');
const profileCard = (id, g) => profileCardOf(user(id), g);
function profileCardOf(u, g) {
  const id = u.id; const cv = cardVars(u);
  const roles = g && g.members.includes(id) ? gRoles(g, id) : [];
  const badges = badgeRow(u);
  return `<div class="profile-prev ${cv.th ? 'themed' : ''}" style="${cv.style}">${fxLayer(u)}<div class="banner ${u.bgfx ? 'bgx-host' : ''}" style="${bannerStyle(u)}">${bgFx(u)}</div><div class="pbody">
    <div class="pf-top">${av(id, 80, true, '', u)}${badges ? `<div class="pf-badges">${badges}</div>` : ''}</div>
    <h3>${esc(u.displayName)}${u.bot ? '<span class="bot-tag">BOT</span>' : ''}</h3><div class="un">@${esc(u.username)}${u.pronouns ? ` · ${esc(u.pronouns)}` : ''}</div>
    ${u.activity ? `<div class="pf-status pf-act">${esc(u.activity.emoji)} ${esc(u.activity.text)}</div>` : ''}${window.anarchyFun ? window.anarchyFun.joinWith(id) : ''}${u.customStatus ? `<div class="pf-status">${esc(u.customStatus)}</div>` : ''}
    ${window.anarchyFun ? window.anarchyFun.achRow(u) : ''}
    <div class="bio">${u.bio ? md(u.bio) : '<span class="muted">Sem bio.</span>'}${u.createdAt ? `<div class="muted small" style="margin-top:8px">No Anarchy desde ${new Date(u.createdAt).toLocaleDateString('pt-BR')}</div>` : ''}</div>
    ${g && g.members.includes(id) ? `<div class="pf-roles"><div class="pf-h">${roles.length ? 'Cargos' : 'Sem cargos'}${g.ownerId === id ? ' · 👑 dono' : ''}</div>${roles.map(r => `<span class="role-chip"><i style="background:${esc(r.color || 'var(--muted)')}"></i>${esc(r.name)}</span>`).join('')}</div>` : ''}
    </div></div>`;
}
// botões de ação de um perfil (mensagem, ligar, amizade, moderação)
function profileActs(id, full) {
  const isMe = id === S.me.id, fr = S.friends.friends.includes(id), inc = S.friends.incoming.includes(id), out = S.friends.outgoing.includes(id);
  if (isMe) return `<button class="btn primary sm" data-act="settings" data-tab="perfil">${ic('edit')}Editar perfil</button>${full ? '' : `<button class="btn sm" data-act="fullProfile" data-id="${id}">Ver perfil completo</button>`}`;
  // o DJ não conversa nem é amigo de ninguém: o botão leva aos comandos e às configurações dele
  if (user(id).bot) { const bg = Object.values(S.groups).find(x => x.djId === id); return bg ? `<button class="btn primary sm" data-act="djProfile" data-gid="${bg.id}">🎧 Comandos do DJ</button>` : ''; }
  const main = fr ? `<button class="btn primary sm" data-act="openDm" data-id="${id}">${ic('msg')}Mensagem</button><button class="btn sm" data-act="callUser" data-id="${id}">${ic('phone')}Ligar</button>`
    : inc ? `<button class="btn primary sm" data-act="accept" data-id="${id}">Aceitar pedido</button><button class="btn sm" data-act="openDm" data-id="${id}">${ic('msg')}Mensagem</button>`
    : out ? `<button class="btn sm" disabled>Pedido enviado</button><button class="btn sm" data-act="openDm" data-id="${id}">${ic('msg')}Mensagem</button>`
    : `<button class="btn primary sm" data-act="addUser" data-id="${id}">${ic('plus')}Adicionar amigo</button><button class="btn sm" data-act="openDm" data-id="${id}">${ic('msg')}Mensagem</button>`;
  return main + (full ? '' : `<button class="btn sm ghost" data-act="fullProfile" data-id="${id}">Perfil completo</button>`);
}
/* perfil completo: janela grande, diferente da tela de edição */
async function openFullProfile(id, tab = 'sobre', uo = null) {
  closePops(); $('.pf-full-back')?.remove();
  const u = uo || user(id); const cv = cardVars(u); const g = curGroup(); const isMe = id === S.me.id;
  const roles = g && g.members.includes(id) ? gRoles(g, id) : [];
  let mutual = { groups: Object.values(S.groups).filter(x => x.members.includes(id)).map(x => x.id), friends: [] };
  const back = document.createElement('div'); back.className = 'modal-back pf-full-back';
  const draw = () => {
    const tabs = [['sobre', 'Sobre'], ...(isMe ? [] : [['grupos', `Grupos em comum · ${mutual.groups.length}`], ['amigos', `Amigos em comum · ${mutual.friends.length}`]])];
    const body = tab === 'grupos' ? (mutual.groups.length ? mutual.groups.map(gid => { const x = S.groups[gid]; return x ? `<button class="pf-li" data-act="group" data-id="${x.id}"><span class="pf-gi">${groupIcon(x)}</span><b>${esc(x.name)}</b><span class="muted small">${x.members.length} membros</span></button>` : ''; }).join('') : '<p class="muted">Nenhum grupo em comum.</p>')
      : tab === 'amigos' ? (mutual.friends.length ? mutual.friends.map(f => `<button class="pf-li" data-act="fullProfile" data-id="${f}">${av(f, 32)}<b>${esc(nameOf(f))}</b><span class="muted small">@${esc(user(f).username)}</span></button>`).join('') : '<p class="muted">Nenhum amigo em comum.</p>')
      : `<div class="pf-sec"><h4>Sobre mim</h4><div class="pf-bio">${u.bio ? md(u.bio) : '<span class="muted">Sem bio.</span>'}</div></div>
         <div class="pf-sec"><h4>Membro desde</h4><div>${u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</div></div>
         ${(u.badges || []).length ? `<div class="pf-sec"><h4>Insígnias</h4><div class="pf-blist">${u.badges.filter(b => BADGES[b]).map(b => `<div class="pf-bitem"><span>${BADGES[b][0]}</span><div><b>${BADGES[b][1]}</b><span class="muted small">${BADGES[b][2]}</span></div></div>`).join('')}</div></div>` : ''}
         ${g && g.members.includes(id) ? `<div class="pf-sec"><h4>Cargos em ${esc(g.name)}${g.ownerId === id ? ' · 👑 dono' : ''}</h4><div>${roles.length ? roles.map(r => `<span class="role-chip"><i style="background:${esc(r.color || 'var(--muted)')}"></i>${esc(r.name)}</span>`).join('') : '<span class="muted">Sem cargos.</span>'}</div></div>` : ''}`;
    back.innerHTML = `<div class="pf-full ${cv.th ? 'themed' : ''}" style="${cv.style}" role="dialog" aria-modal="true" aria-label="Perfil de ${esc(u.displayName)}">
      ${fxLayer(u)}<div class="pf-banner ${u.bgfx ? 'bgx-host' : ''}" style="${bannerStyle(u)}">${bgFx(u)}<button class="icon-btn pf-x" data-close aria-label="Fechar">${ic('x')}</button></div>
      <div class="pf-main">
        <div class="pf-head">${av(id, 120, true, '', u)}<div class="pf-acts">${uo ? '<span class="pf-tag">Prévia: ainda não salvo</span>' : profileActs(id, true)}</div></div>
        <div class="pf-names"><h2>${esc(u.displayName)}${u.bot ? '<span class="bot-tag">BOT</span>' : ''}</h2><div class="un">@${esc(u.username)}${u.pronouns ? ` · ${esc(u.pronouns)}` : ''}<span class="pf-st"><i class="st-dot ${esc(u.status || 'offline')}"></i>${esc(STATUS[u.status] || 'Offline')}</span></div>
          ${badgeRow(u) ? `<div class="pf-badges big">${badgeRow(u)}</div>` : ''}
          ${u.customStatus ? `<div class="pf-status">${esc(u.customStatus)}</div>` : ''}</div>
        <nav class="pf-tabs">${tabs.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-pft="${k}">${l}</button>`).join('')}</nav>
        <div class="pf-body">${body}</div>
      </div></div>`;
  };
  draw(); $('#modalRoot').appendChild(back);
  const close = () => { back.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  back.addEventListener('mousedown', e => { if (e.target === back) close(); });
  back.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) return close();
    const t = e.target.closest('[data-pft]'); if (t) { tab = t.dataset.pft; draw(); return; }
    if (e.target.closest('[data-act]') && !e.target.closest('[data-act="fullProfile"]')) close();
  });
  if (!isMe) { const r = await emit('user:mutual', { id }); if (r.ok && back.isConnected) { mutual = r; draw(); } }
}
function openProfile(id, anchor) {
  const isMe = id === S.me.id;
  const acts = profileActs(id, false);
  const g = curGroup();
  const inG = g && !isMe && g.members.includes(id) && gAbove(g, id);
  const mod = `${inG && gCan(g, 'manageRoles') ? `<button class="btn sm" data-act="memberRoles" data-id="${id}">${ic('shield')}Cargos</button>` : ''}${inG && gCan(g, 'kick') ? `<button class="btn danger sm" data-act="kick" data-id="${id}">Expulsar</button>` : ''}${inG && gCan(g, 'ban') ? `<button class="btn danger sm" data-act="ban" data-id="${id}">Banir</button>` : ''}`;
  pop(`${profileCard(id, g)}<div class="acts">${acts}${mod}</div>`, anchor, 'profile', anchor.closest('#members') ? 'left' : 'right');
  const p = $('.pop'); if (anchor.closest('#members')) { const r = anchor.getBoundingClientRect(); p.style.left = clamp(r.left - p.offsetWidth - 10, 8, innerWidth - p.offsetWidth - 8) + 'px'; }
}

/* menu do botão direito em qualquer pessoa (lista de membros, mensagens, amigos, call...) */
function popAt(html, x, y, cls = 'menu') {
  return pop(html, { getBoundingClientRect: () => ({ left: x, right: x, top: y, bottom: y, width: 0, height: 0 }), closest: () => null }, cls, 'below');
}
function userMenu(uid, x, y, anchor) {
  const u = user(uid), me = uid === S.me.id, g = curGroup();
  const fr = S.friends.friends.includes(uid), out = S.friends.outgoing.includes(uid), inc = S.friends.incoming.includes(uid);
  const inVoice = !me && V.room && (S.voice[V.room] || []).some(p => p.uid === uid);
  const canMention = !!$('#composer');
  const mod = g && !me && g.members.includes(uid) && gAbove(g, uid);
  const blocked = (S.me.blocked || []).includes(uid);
  const I = n => ic(n).replace('<svg', '<svg style="width:16px;height:16px"');
  const p = popAt(`<div class="um-h">${av(uid, 32)}<div><b>${esc(u.displayName)}</b><span>@${esc(u.username)}</span></div></div>
    <button data-m="pf">Ver perfil ${I('user')}</button>
    ${me ? `<button data-m="edit">Editar perfil ${I('edit')}</button>` : u.bot ? `<button data-m="djset">Comandos e configurações do DJ</button>` : `<button data-m="dm">Enviar mensagem ${I('msg')}</button><button data-m="call">Iniciar chamada ${I('phone')}</button><button data-m="vid">Chamada de vídeo ${I('cam')}</button>`}
    ${canMention ? `<button data-m="men">Mencionar</button>` : ''}
    ${g && !u.bot && g.members.includes(uid) ? `<button data-fun="nickNew" data-gid="${g.id}" data-uid="${uid}">Sugerir apelido <span style="margin-left:auto">🏷️</span></button>` : ''}
    ${S.me.admin && !u.bot ? `<hr><button data-m="gpts">Dar AnarchyPoints <i class="pts-ic" style="margin-left:auto"></i></button><button data-m="gift">Dar placa de nome <span style="margin-left:auto">🏷️</span></button>` : ''}
    ${u.bot ? `<hr><div class="um-vol"><label>Volume do DJ para você <output>${prefs.djVol ?? 70}%</output></label><input type="range" min="0" max="100" step="1" value="${prefs.djVol ?? 70}" data-m="djvol"></div>
      <button data-m="djmute">${prefs.djOn === false ? 'Voltar a ouvir o DJ' : 'Silenciar o DJ para mim'} ${I(prefs.djOn === false ? 'voice' : 'micOff')}</button>` : ''}
    ${inVoice ? `<hr><div class="um-vol"><label>Volume para você <output>${volOf(uid, 'voice')}%</output></label><input type="range" min="0" max="200" step="5" value="${volOf(uid, 'voice')}" data-m="vol"></div>
      <button data-m="mute">${prefs.umute && prefs.umute[uid] ? 'Voltar a ouvir' : 'Silenciar para mim'} ${I(prefs.umute && prefs.umute[uid] ? 'voice' : 'micOff')}</button>` : ''}
    ${me || u.bot ? '' : `<hr>${fr ? '<button data-m="unf" class="danger">Desfazer amizade</button>' : inc ? '<button data-m="acc">Aceitar pedido de amizade</button>' : out ? '<button disabled>Pedido de amizade enviado</button>' : '<button data-m="add">Adicionar amigo</button>'}
      <button data-m="blk" class="${blocked ? '' : 'danger'}">${blocked ? 'Desbloquear' : 'Bloquear'}</button>`}
    ${mod && (gCan(g, 'manageRoles') || gCan(g, 'kick') || gCan(g, 'ban')) ? `<hr>${gCan(g, 'manageRoles') ? `<button data-m="roles">Cargos ${I('shield')}</button>` : ''}${gCan(g, 'kick') ? `<button data-m="kick" class="danger">Expulsar de ${esc(g.name)}</button>` : ''}${gCan(g, 'ban') ? `<button data-m="ban" class="danger">Banir de ${esc(g.name)}</button>` : ''}` : ''}
    <hr><button data-m="cpu">Copiar nome de usuário</button><button data-m="cpi">Copiar ID do usuário</button>`, x, y, 'menu umenu');
  const vol = $('[data-m="vol"]', p);
  if (vol) vol.oninput = () => { vol.previousElementSibling.querySelector('output').textContent = vol.value + '%'; prefs.vol = { ...(prefs.vol || {}) }; if (+vol.value === 100) delete prefs.vol[uid]; else prefs.vol[uid] = +vol.value; savePrefs(); applyVolumes(); };
  if (vol) vol.onchange = () => { renderSide(); renderStageSlot(); };
  // DJ: volume só para você (o mesmo do cartão "Tocando agora")
  const djv = $('[data-m="djvol"]', p);
  if (djv) djv.oninput = () => setDjVol(djv.value);
  p.onclick = async e => {
    const m = e.target.closest('button[data-m]')?.dataset.m; if (!m) return; closePops();
    if (m === 'gift') { INV.sel = uid; INV.item = null; INV.people = null; INV.tab = 'dar'; openSettings('inventario'); return; }
    if (m === 'gpts') return givePointsModal(uid);
    if (m === 'pf') openFullProfile(uid);
    if (m === 'edit') openSettings('perfil');
    if (m === 'djmute') { prefs.djOn = prefs.djOn === false; savePrefs(); musicVol(); toast(prefs.djOn ? 'Você voltou a ouvir o DJ.' : 'DJ silenciado só para você.'); }
    if (m === 'djset') { const bg = Object.values(S.groups).find(x => x.djId === uid); if (bg) openGroupSettings(bg.id, 'dj'); }
    if (m === 'dm') openDm(uid);
    if (m === 'call' || m === 'vid') { const d = await openDm(uid); if (d) startCall(d, m === 'vid'); }
    if (m === 'men') { const ta = $('#composer'); const t = '@' + u.username + ' '; const at = ta.selectionStart; ta.value = ta.value.slice(0, at) + t + ta.value.slice(ta.selectionEnd); ta.focus(); ta.selectionStart = ta.selectionEnd = at + t.length; }
    if (m === 'mute') { prefs.umute = { ...(prefs.umute || {}) }; if (prefs.umute[uid]) delete prefs.umute[uid]; else prefs.umute[uid] = true; savePrefs(); applyVolumes(); renderSide(); renderStageSlot(); }
    if (m === 'add') act('friend:request', { username: u.username }, 'Pedido enviado.');
    if (m === 'acc') act('friend:respond', { from: uid, accept: true }, 'Agora vocês são amigos!');
    if (m === 'unf' && await confirmBox('Desfazer amizade', `Remover ${u.displayName} dos seus amigos?`, 'Remover')) act('friend:remove', { id: uid });
    if (m === 'blk') toggleBlock(uid);
    if (m === 'roles' && g) rolePicker(g, uid, anchor || document.body);
    if (m === 'kick' && g && await confirmBox('Expulsar do grupo', `Expulsar ${u.displayName} de "${g.name}"? A pessoa pode voltar com um convite.`, 'Expulsar')) act('group:kick', { gid: g.id, userId: uid }, 'Membro expulso.');
    if (m === 'ban' && g) banModal(g, uid);
    if (m === 'cpu') copy('@' + u.username, 'Nome de usuário copiado.');
    if (m === 'cpi') copy(uid, 'ID copiado.');
  };
}
async function toggleBlock(uid) {
  const blocked = (S.me.blocked || []).includes(uid);
  if (!blocked && !await confirmBox('Bloquear', `${nameOf(uid)} não vai poder te mandar mensagens diretas, pedidos de amizade nem te ligar. As mensagens dessa pessoa nos grupos ficam escondidas para você.`, 'Bloquear')) return;
  act('user:block', { id: uid, block: !blocked }, blocked ? 'Desbloqueado.' : 'Bloqueado.');
}
document.addEventListener('contextmenu', e => {
  if (e.target.closest('input, textarea, .settings, .modal')) return;
  // tela compartilhada de alguém: menu da tela (volume, silenciar, parar de assistir)
  const scr = e.target.closest('.tile[data-scr]');
  if (scr) { e.preventDefault(); screenMenu(scr.dataset.scr, scr.querySelector('.nm') || scr); return; }
  const t = e.target.closest('[data-vuid], .av[data-user], .mem[data-id], .person[data-id], [data-act="profile"][data-id], .voice-person[data-vuid]');
  if (!t) {
    // mensagem (texto, imagem, GIF, figurinha): menu da mensagem; seleção de texto e campos de edição continuam normais
    const mm = e.target.closest('.msg[data-mid]');
    if (mm && !e.target.closest('.edit-box')) { const m = findMsgLocal(mm.dataset.mid); if (m) { e.preventDefault(); msgMenu(m, e.clientX, e.clientY, e.target); } }
    return;
  }
  const uid = t.dataset.vuid || t.dataset.user || t.dataset.id; if (!uid || !S.users[uid] && uid !== S.me?.id) return;
  e.preventDefault(); userMenu(uid, e.clientX, e.clientY, t);
});

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
  modal(`<div class="modal-h"><h2>Convidar para ${esc(g.name)}</h2><p>Mande o código para quem tem conta no Anarchy, ou adicione seus amigos direto.</p></div>
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
  bar.innerHTML = `<span class="upd-t">${ic('refresh')}${UPD.desk ? `A versão <b>${esc(UPD.desk)}</b> do Anarchy está pronta.` : 'Saiu uma versão nova do Anarchy.'}</span>
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
  const tabs = [['geral', 'Visão geral', gCan(g, 'manageServer')], ['cargos', 'Cargos', gCan(g, 'manageRoles')], ['membros', 'Membros', true], ['canais', 'Canais', gCan(g, 'manageChannels')], ['convites', 'Convites', true], ['sons', 'Central de Áudio', true], ['figurinhas', 'Figurinhas', true], ['dj', 'DJ (bot de música)', true], ['rpg', 'RPG de Mesa', true], ['banimentos', 'Banimentos', gCan(g, 'ban')]].filter(t => t[2]);
  if (!tabs.some(t => t[0] === gsTab)) gsTab = tabs[0][0];
  $('#gsNav').innerHTML = `<div class="gs-nav-g">${groupIcon(g).replace('class="inner"', 'class="inner gs-nav-ic"')}<b>${esc(g.name)}</b></div>
    ${tabs.map(([k, l]) => `<button data-gs="${k}" class="${gsTab === k ? 'active' : ''}">${l}</button>`).join('')}
    <h4></h4>${g.ownerId === S.me.id ? '<button data-gs="apagar" class="out">Apagar grupo</button>' : '<button data-gs="sair" class="out">Sair do grupo</button>'}`;
  const b = $('#setBody');
  const T = { geral: gsGeral, cargos: gsCargos, membros: gsMembros, canais: gsCanais, convites: gsConvites, banimentos: gsBans, sons: gsSons, figurinhas: gsFigurinhas, dj: gsDj, rpg: gsRpg };
  b.onclick = null;
  T[gsTab](g, b);
}

// RPG de Mesa: atividade opcional (ligada por padrão; quem gerencia o grupo desliga ou limita quem cria campanhas)
function gsRpg(g, b) {
  const cfg = g.rpg || { on: true, who: 'all' }, canEdit = gCan(g, 'manageServer');
  b.innerHTML = `<h2>RPG de Mesa</h2><p class="muted set-sub">Campanhas de RPG com mapa, miniaturas, dados e fichas, em tempo real. É opcional: quem não joga não vê diferença nenhuma no grupo.</p>
    <div class="set-card">
      ${setRow('RPG de Mesa ligado', 'Mostra o botão 🎲 no topo dos canais. Desligado, as campanhas ficam guardadas, mas ninguém abre.', `<label class="switch"><input type="checkbox" id="rpgOn" ${cfg.on !== false ? 'checked' : ''} ${canEdit ? '' : 'disabled'}><span></span></label>`)}
      ${setRow('Quem pode criar campanhas', 'Ser Mestre vale só dentro da campanha: não dá nenhum poder no grupo.', `<select class="input" id="rpgWho" style="width:auto" ${canEdit ? '' : 'disabled'}><option value="all" ${cfg.who !== 'perm' ? 'selected' : ''}>Todos os membros</option><option value="perm" ${cfg.who === 'perm' ? 'selected' : ''}>Só cargos com "Criar campanhas de RPG"</option></select>`)}
      ${canEdit ? '' : '<p class="muted small" style="margin:0">Só quem gerencia o grupo muda estas opções.</p>'}
    </div>
    ${cfg.on !== false ? '<button class="btn primary" id="rpgOpen">🎲 Abrir RPG de Mesa</button>' : ''}`;
  const save = () => act('rpg:groupcfg', { gid: g.id, on: $('#rpgOn').checked, who: $('#rpgWho').value }, 'RPG de Mesa atualizado.').then(r => r.ok && setTimeout(drawGroupSettings, 150));
  if (canEdit) { $('#rpgOn').onchange = save; $('#rpgWho').onchange = save; }
  const o = $('#rpgOpen'); if (o) o.onclick = () => { closeSettings(); window.anarchyRpg && window.anarchyRpg.lobby({ kind: 'g', id: g.id }); };
}
// DJ: o bot de música do grupo
function gsDj(g, b) {
  const id = groupDj(g), canEdit = gCan(g, 'manageServer');
  const help = `<div class="set-card"><h3>Como usar</h3><p class="muted small" style="margin:0">Entre numa sala de voz do grupo e, em qualquer canal de texto, digite:</p>
    <div class="dj-help">${DJ_CMDS.map(c => `<div><code>/${c[0]}${c[1] ? ' ' + esc(c[1]) : ''}</code><span>${esc(c[2])}</span></div>`).join('')}</div>
    <p class="muted small" style="margin:0">Aceita nome da música (busca no YouTube) ou link do YouTube, SoundCloud e de arquivos de áudio. Cada pessoa ajusta o volume do DJ só para si no cartão "Tocando agora" da call.</p></div>`;
  if (!id) {
    b.innerHTML = `<h2>DJ (bot de música)</h2><p class="muted set-sub">Um membro do grupo que toca música na call. Ninguém precisa instalar nada.</p>
      <div class="set-card dj-intro"><div class="dj-intro-art">🎧</div><div><b>Este grupo ainda não tem DJ.</b><p class="muted small" style="margin:4px 0 0">${canEdit ? 'Adicione e personalize o nome, a foto e a cor.' : 'Peça para quem gerencia o grupo adicionar.'}</p></div>${canEdit ? '<button class="btn primary" id="djAdd">Adicionar DJ</button>' : ''}</div>${help}`;
    if ($('#djAdd')) $('#djAdd').onclick = async () => { const r = await act('bot:add', { gid: g.id }, 'DJ adicionado ao grupo! Digite /music numa conversa do grupo.'); if (r.ok) setTimeout(drawGroupSettings, 200); };
    return;
  }
  const u = user(id); const d = { avatar: u.avatar || null, color: u.color || '#8b5cf6' };
  b.innerHTML = `<h2>DJ (bot de música)</h2><p class="muted set-sub">O DJ é um membro do grupo. Só quem gerencia o grupo muda o perfil dele.</p>
    <div class="set-card"><div class="dj-prof"><div id="djAv">${av(id, 72, false)}</div><div style="flex:1;min-width:0;display:grid;gap:10px">
      <label class="field">Nome<input id="djName" maxlength="32" value="${esc(u.displayName)}" ${canEdit ? '' : 'disabled'}></label>
      <label class="field">Status<input id="djStatus" maxlength="60" value="${esc(u.customStatus || '')}" placeholder="Digite /music" ${canEdit ? '' : 'disabled'}></label></div></div>
      <label class="field">Sobre<textarea id="djBio" rows="2" maxlength="190" ${canEdit ? '' : 'disabled'}>${esc(u.bio || '')}</textarea></label>
      ${canEdit ? `<div class="field">Cor<div class="colors" id="djColors">${COLORS.map(c => `<button type="button" data-c="${c}" style="background:${c}" aria-label="Cor ${c}"></button>`).join('')}<input type="color" id="djColor" value="${esc(d.color)}" aria-label="Outra cor"></div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" id="djImg">Trocar foto</button>${u.avatar ? '<button class="btn sm ghost" id="djImgX">Tirar foto</button>' : ''}<span class="spacer" style="flex:1"></span><button class="btn sm danger" id="djDel">Remover DJ</button><button class="btn sm primary" id="djSave">Salvar</button></div>` : ''}
    </div>${help}`;
  if (!canEdit) return;
  const save = async extra => { const r = await act('bot:update', { gid: g.id, displayName: $('#djName').value, customStatus: $('#djStatus').value, bio: $('#djBio').value, color: d.color, ...extra }, 'DJ atualizado.'); if (r.ok) setTimeout(drawGroupSettings, 200); };
  $('#djColors').onclick = e => { const c = e.target.closest('[data-c]'); if (c) { d.color = c.dataset.c; $('#djColor').value = d.color; } };
  $('#djColor').oninput = e => { d.color = e.target.value; };
  $('#djSave').onclick = () => save({});
  $('#djImg').onclick = async () => { const f = await pickFile(); if (!f) return; try { let data = await readFile(f); if (!/gif/.test(f.type)) data = await shrink(data, 256, .9); const { url } = await api('/api/upload', { data }); save({ avatar: url }); } catch (e) { toast(e.message || 'Não consegui enviar a foto.', true); } };
  if ($('#djImgX')) $('#djImgX').onclick = () => save({ avatar: null });
  $('#djDel').onclick = async () => { if (await confirmBox('Remover DJ', `Tirar ${u.displayName} do grupo? A música para e a fila é apagada.`, 'Remover')) { const r = await act('bot:remove', { gid: g.id }, 'DJ removido.'); if (r.ok) setTimeout(drawGroupSettings, 200); } };
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
    <div class="set-card"><h3>Código do grupo</h3><p class="muted small" style="margin:0">Quem tem conta no Anarchy entra pela bússola na barra da esquerda.</p>
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
function closeSettings() { $('.settings')?.remove(); stopMicTest(); stopOutTest(); }
function openSettings(tab) {
  closeSettings(); if (tab) setTab = tab;
  const el = document.createElement('div'); el.className = 'settings'; el.setAttribute('role', 'dialog');
  const I = n => ic(n).replace('<svg', '<svg class="sn-ic"');
  el.innerHTML = `<nav class="set-nav"><div class="set-nav-in">
      <div class="set-me">${av(S.me.id, 40)}<div><b>${esc(S.me.displayName)}</b><button class="link" data-st="perfil">Editar perfil</button></div></div>
      <h4>Configurações de usuário</h4>
      <button data-st="conta">${I('user')}Minha conta</button><button data-st="perfil">${I('edit')}Perfil</button><button data-st="inventario">🎒 Inventário${(S.me.items || []).some(x => x.seen === false) ? ' <span class="badge" style="border:0;margin-left:auto">!</span>' : ''}</button><button data-st="privacidade">${I('shield')}Privacidade e segurança</button>
      <h4>Configurações do app</h4>
      <button data-st="aparencia">${I('smile')}Aparência</button><button data-st="voz">${I('mic')}Voz e vídeo</button><button data-st="notif">${I('bell')}Notificações</button><button data-st="atalhos">${I('menu')}Atalhos</button><button data-st="app">${I('gear')}Aplicativo</button>
      <button data-st="novidades">✨ Novidades</button>
      <hr><button data-st="sair" class="out">${I('out')}Sair da conta</button>
    </div></nav>
    <div class="set-body"><div class="set-body-in" id="setBody"></div></div>
    <div class="set-close"><button class="icon-btn" id="setX" aria-label="Fechar">${ic('x')}</button><span>ESC</span></div>`;
  document.body.appendChild(el);
  $('#setX').onclick = closeSettings;
  el.querySelector('.set-body').addEventListener('click', e => { const x = e.target.closest('[data-st-go]'); if (x) { setTab = x.dataset.stGo; drawSettings(); } });
  el.querySelector('.set-nav').onclick = e => { const b = e.target.closest('[data-st]'); if (!b) return; if (b.dataset.st === 'novidades') return showNews(true); if (b.dataset.st === 'sair') return confirmBox('Sair da conta', 'Você vai precisar entrar de novo com usuário e senha.', 'Sair').then(ok => ok && logout()); setTab = b.dataset.st; drawSettings(); };
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
  const b = $('#setBody'); stopMicTest(); stopOutTest(); b.onclick = null;
  if (setTab !== drawSettings.last) b.closest('.set-body').scrollTop = 0;
  drawSettings.last = setTab;
  if (setTab === 'caixas') setTab = 'inventario';
  if (setTab === 'inventario') return drawInventory(b);
  if (setTab === 'perfil') {
    // rascunho: nada vai para o servidor até clicar em Salvar. A prévia usa só o rascunho (não mexe nos outros).
    const u = S.me;
    const orig = { displayName: u.displayName, pronouns: u.pronouns || '', customStatus: u.customStatus || '', bio: u.bio || '', color: u.color, accent: u.accent || null, avatar: u.avatar || null, banner: u.banner || null, theme: u.theme || null, frame: u.frame || null, effect: u.effect || null };
    const draft = { ...orig };
    const TH = [['#2b1055', '#7597de'], ['#ff6b8b', '#f5b83d'], ['#0f2027', '#2c5364'], ['#3ee0c5', '#6c7cff'], ['#1d1d1d', '#b07cff'], ['#ff8a4c', '#e0517f'], ['#0b3d2e', '#7bd88f'], ['#f6d365', '#fda085']];
    const preview = () => ({ ...u, ...draft, displayName: draft.displayName || u.username });
    const frameBtn = (k, l) => `<button type="button" class="pick-tile ${draft.frame === k ? 'on' : ''}" data-fr="${k}">${av(u.id, 40, false, '', { ...preview(), frame: k })}<span>${l}</span></button>`;
    const fxBtn = (k, l) => `<button type="button" class="pick-tile fx ${draft.effect === k ? 'on' : ''}" data-fx="${k}"><span class="fx-sw">${k ? `<span class="pf-fx fx-${k}"></span>` : '✕'}</span><span>${l}</span></button>`;
    b.innerHTML = `<h2>Perfil</h2><p class="muted set-sub">Como as outras pessoas te veem. Nada muda para elas até você salvar.</p>
      <div class="profile-grid"><div class="pe-col">
      <div class="set-card"><h3>Identidade</h3>
        <label class="field">Nome de exibição<input id="pName" maxlength="32" value="${esc(draft.displayName)}"></label>
        <div class="pe-2"><label class="field">Pronomes<input id="pPro" maxlength="40" value="${esc(draft.pronouns)}" placeholder="ex.: ele/dele"></label>
        <label class="field">Status personalizado<input id="pCs" maxlength="60" value="${esc(draft.customStatus)}" placeholder="ex.: jogando até tarde 🎮"></label></div>
        <label class="field">Sobre mim<textarea id="pBio" maxlength="190" placeholder="Conte um pouco sobre você. Dá para usar **negrito**, *itálico* e links.">${esc(draft.bio)}</textarea><span class="pe-count" id="pBioN"></span></label>
      </div>
      <div class="set-card"><h3>Avatar e banner</h3>
        <div class="pe-row"><div><b>Foto de perfil</b><span class="muted small">PNG, JPG, WEBP ou GIF animado, até 8 MB.</span></div><div class="pe-btns"><button class="btn sm primary" id="pAv">Trocar foto</button><button class="btn sm ghost" id="pAvX">Remover</button></div></div>
        <div class="pe-row"><div><b>Banner</b><span class="muted small">Imagem/GIF, ou uma cor sólida.</span></div><div class="pe-btns"><button class="btn sm" id="pBan">Enviar imagem</button><input type="color" id="pBanC" value="${draft.banner && HEXC.test(draft.banner) ? esc(draft.banner) : '#6c7cff'}" title="Cor do banner" aria-label="Cor do banner"><button class="btn sm ghost" id="pBanX">Padrão</button></div></div>
      </div>
      <div class="set-card"><h3>Cores</h3>
        <div class="field">Cor do avatar (quando não tem foto)<div class="colors" id="pColors">${COLORS.map(c => `<button type="button" data-c="${c}" style="background:${c}" aria-label="Cor ${c}"></button>`).join('')}<input type="color" id="pColor" value="${esc(safeC(draft.color))}" aria-label="Outra cor"></div></div>
        <div class="field">Cor de destaque do perfil<div class="colors" id="pAcc"><button type="button" data-c="" class="none" title="Igual à cor do avatar">✕</button>${COLORS.map(c => `<button type="button" data-c="${c}" style="background:${c}" aria-label="Destaque ${c}"></button>`).join('')}<input type="color" id="pAccC" value="${esc(safeC(draft.accent, '#6c7cff'))}" aria-label="Outra cor de destaque"></div><span class="muted small">Usada nas bordas do cartão, na moldura e nos botões do seu perfil.</span></div>
        <div class="field">Fundo do perfil<div class="themes-mini" id="pTh"><button type="button" data-th="" class="none" title="Sem fundo">✕</button>${TH.map(t => `<button type="button" data-th="${t.join(',')}" style="background:linear-gradient(170deg, ${t[0]}, ${t[1]})" aria-label="Fundo ${t.join(' e ')}"></button>`).join('')}
          <span class="th-custom"><input type="color" id="pTh1" value="${esc(draft.theme?.[0] || '#2b1055')}" title="Cor de cima"><input type="color" id="pTh2" value="${esc(draft.theme?.[1] || '#7597de')}" title="Cor de baixo"></span></div><span class="muted small">Duas cores em degradê só no seu cartão. Não muda o tema de ninguém.</span></div>
      </div>
      <div class="set-card"><h3>Moldura do avatar</h3><div class="pick-grid" id="pFr">${frameBtn('', 'Nenhuma')}${Object.entries(FRAMES).map(([k, l]) => frameBtn(k, l)).join('')}</div></div>
      <div class="set-card"><h3>Efeito do perfil</h3><div class="pick-grid" id="pFx">${fxBtn('', 'Nenhum')}${Object.entries(EFFECTS).map(([k, l]) => fxBtn(k, l)).join('')}</div><span class="muted small">Animação leve no seu cartão. Quem desligou as animações vê parado.</span></div>
      <div class="set-card"><h3>Insígnias</h3><div class="pf-blist">${Object.entries(BADGES).map(([k, [e, n, d]]) => `<div class="pf-bitem ${(u.badges || []).includes(k) ? '' : 'locked'}"><span>${e}</span><div><b>${n}${(u.badges || []).includes(k) ? '' : ' · ainda não'}</b><span class="muted small">${d}</span></div></div>`).join('')}</div><span class="muted small">Insígnias são ganhas automaticamente, ninguém escolhe as próprias.</span></div>
      </div>
      <div class="pe-prev"><p class="pe-lbl">PRÉVIA</p><div id="pPrev"></div><button class="btn sm" id="pFull" style="margin-top:10px;width:100%">Ver como perfil completo</button></div></div>
      <div class="unsaved" id="pBar" hidden><span>Cuidado: você tem alterações que não foram salvas.</span><button class="btn sm ghost" id="pReset">Redefinir</button><button class="btn sm primary" id="pSave">Salvar alterações</button></div>`;
    const dirty = () => JSON.stringify(draft) !== JSON.stringify(orig);
    const prev = () => {
      $('#pPrev').innerHTML = profileCardOf(preview());
      $$('#pColors [data-c]').forEach(x => x.classList.toggle('on', x.dataset.c === draft.color));
      $$('#pAcc [data-c]').forEach(x => x.classList.toggle('on', x.dataset.c === (draft.accent || '')));
      $$('#pTh [data-th]').forEach(x => x.classList.toggle('on', x.dataset.th === (draft.theme ? draft.theme.join(',') : '')));
      $$('#pFr [data-fr]').forEach(x => x.classList.toggle('on', x.dataset.fr === (draft.frame || '')));
      $$('#pFx [data-fx]').forEach(x => x.classList.toggle('on', x.dataset.fx === (draft.effect || '')));
      $('#pBioN').textContent = `${draft.bio.length}/190`;
      $('#pBar').hidden = !dirty();
    };
    prev();
    [['pName', 'displayName'], ['pBio', 'bio'], ['pPro', 'pronouns'], ['pCs', 'customStatus']].forEach(([id, k]) => $('#' + id).oninput = e => { draft[k] = e.target.value; prev(); });
    $('#pTh').onclick = e => { const x = e.target.closest('[data-th]'); if (!x) return; draft.theme = x.dataset.th ? x.dataset.th.split(',') : null; if (draft.theme) { $('#pTh1').value = draft.theme[0]; $('#pTh2').value = draft.theme[1]; } prev(); };
    ['pTh1', 'pTh2'].forEach(id => $('#' + id).oninput = () => { draft.theme = [$('#pTh1').value, $('#pTh2').value]; prev(); });
    $('#pColors').onclick = e => { const x = e.target.closest('[data-c]'); if (x) { draft.color = x.dataset.c; prev(); } };
    $('#pColor').oninput = e => { draft.color = e.target.value; prev(); };
    $('#pAcc').onclick = e => { const x = e.target.closest('[data-c]'); if (x) { draft.accent = x.dataset.c || null; prev(); } };
    $('#pAccC').oninput = e => { draft.accent = e.target.value; prev(); };
    $('#pFr').onclick = e => { const x = e.target.closest('[data-fr]'); if (x) { draft.frame = x.dataset.fr || null; prev(); } };
    $('#pFx').onclick = e => { const x = e.target.closest('[data-fx]'); if (x) { draft.effect = x.dataset.fx || null; prev(); } };
    $('#pAv').onclick = async () => { const f = await pickFile(); if (!f) return; const url = await uploadImage(f, { max: 384, square: true }); if (url) { draft.avatar = url; prev(); } };
    $('#pAvX').onclick = () => { draft.avatar = null; prev(); };
    $('#pBan').onclick = async () => { const f = await pickFile(); if (!f) return; const url = await uploadImage(f, { max: 1200 }); if (url) { draft.banner = url; prev(); } };
    $('#pBanC').oninput = e => { draft.banner = e.target.value; prev(); };
    $('#pBanX').onclick = () => { draft.banner = null; prev(); };
    $('#pFull').onclick = () => openFullProfile(u.id, 'sobre', preview());
    $('#pReset').onclick = () => { Object.assign(draft, orig); drawSettings(); };
    $('#pSave').onclick = async () => {
      $('#pSave').disabled = true;
      const r = await act('profile:update', { ...draft, displayName: draft.displayName.trim() || u.username }, 'Perfil salvo.');
      if (r.ok) { Object.assign(orig, draft); prev(); } else $('#pSave').disabled = false;
    };
  }
  else if (setTab === 'conta') {
    b.innerHTML = `<h2>Minha conta</h2>
      <div class="acct-card">${av(S.me.id, 80)}<div><b>${esc(S.me.displayName)}</b><span class="muted">@${esc(S.me.username)}</span></div><button class="btn sm primary" data-act="fullProfile" data-id="${S.me.id}">Ver meu perfil</button></div>
      <div class="set-card"><h3>Informações</h3>
        ${setRow('Nome de usuário', 'É assim que seus amigos te encontram. Não dá para trocar.', `<span class="kbd">@${esc(S.me.username)}</span>`)}
        ${setRow('Nome de exibição', 'O nome que aparece nas conversas.', `<button class="btn sm" data-st-go="perfil">Editar no perfil</button>`)}
        ${setRow('ID da conta', 'Útil para relatar problemas.', `<button class="btn sm ghost" id="acId">Copiar ID</button>`)}
        ${setRow('Conta criada em', '', `<span class="muted">${S.me.createdAt ? new Date(S.me.createdAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span>`)}
      </div>
      <div class="set-card"><h3>Senha</h3>
        <div class="pe-2"><label class="field">Senha atual<input type="password" id="pwA" autocomplete="current-password"></label>
        <label class="field">Nova senha<input type="password" id="pwN" autocomplete="new-password" placeholder="pelo menos 8 caracteres"></label></div>
        <p class="form-err" id="pwE"></p>
        <div style="display:flex;justify-content:flex-end"><button class="btn primary" id="pwOk">Trocar senha</button></div></div>
      <div class="set-card"><h3>Email de recuperação</h3>
        ${S.me.email ? setRow(esc(S.me.email), 'Esqueceu a senha? Na tela de entrar, toque em "Esqueci a senha" e o link chega neste email.', '<div style="display:flex;gap:8px"><button class="btn sm" id="emCh">Trocar</button><button class="btn sm ghost" id="emRm">Tirar</button></div>')
          : S.me.mailOn ? setRow('Nenhum email ligado', 'Sem email, não tem como recuperar a conta se você esquecer a senha.', '<button class="btn sm primary" id="emAdd">Adicionar email</button>')
          : '<p class="muted small" style="margin:0">Este servidor ainda não manda emails, então recuperar a senha por email está desligado por enquanto.</p>'}</div>
      <div class="set-card"><h3>Dispositivos conectados</h3><div id="sesBox" class="muted">Carregando...</div></div>
      <div class="set-card">${setRow('Sair da conta', 'Desconecta este aparelho.', '<button class="btn danger" id="lo">Sair</button>')}</div>`;
    $('#acId').onclick = () => copy(S.me.id, 'ID copiado.');
    $('#pwOk').onclick = async () => { try { await api('/api/password', { atual: $('#pwA').value, nova: $('#pwN').value }); $('#pwE').textContent = ''; $('#pwA').value = $('#pwN').value = ''; toast('Senha trocada.'); } catch (e) { $('#pwE').textContent = e.message; } };
    $('#lo').onclick = () => logout();
    [$('#emAdd'), $('#emCh')].forEach(x => x && (x.onclick = () => emailModal(false)));
    if ($('#emRm')) $('#emRm').onclick = () => modal(`<div class="modal-h"><h2>Tirar o email?</h2><p>Sem email, você não consegue recuperar a conta se esquecer a senha. Para confirmar, digite sua senha.</p></div>
      <div class="modal-b"><label class="field">Senha<input type="password" id="emPw" autocomplete="current-password"></label><p class="form-err" id="emRmE"></p></div>
      <div class="modal-f"><button class="btn ghost" data-close>Cancelar</button><button class="btn danger" id="emRmOk">Tirar email</button></div>`, (m, close) => {
      $('#emRmOk', m).onclick = async () => {
        const r = await emit('email:remove', { password: $('#emPw', m).value });
        if (!r.ok) { $('#emRmE', m).textContent = r.erro; return; }
        S.me = { ...S.me, ...r.me }; S.users[S.me.id] = S.me; close(); toast('Email tirado da conta.'); drawSettings();
      };
    });
    const ses = async () => {
      const r = await emit('sessions:info'); const box = $('#sesBox'); if (!box) return;
      if (!r.ok) { box.textContent = r.erro || 'Não consegui carregar.'; return; }
      box.innerHTML = `${setRow(`${r.sessions} ${r.sessions === 1 ? 'aparelho com login' : 'aparelhos com login'}`, `${r.online} ${r.online === 1 ? 'janela aberta agora' : 'janelas abertas agora'} (contando esta).`, r.sessions > 1 ? '<button class="btn sm danger" id="sesOut">Sair dos outros</button>' : '<span class="muted small">Só este aparelho</span>')}`;
      if ($('#sesOut')) $('#sesOut').onclick = async () => { if (await confirmBox('Sair dos outros aparelhos', 'Todos os outros computadores e celulares com sua conta vão precisar entrar de novo. Este continua conectado.', 'Sair dos outros')) { const x = await act('sessions:revokeOthers', {}, 'Os outros aparelhos foram desconectados.'); if (x.ok) ses(); } };
    };
    ses();
  }
  else if (setTab === 'privacidade') {
    const pv = S.me.privacy || {}; const bl = (S.me.blocked || []).filter(id => S.users[id] || id);
    b.innerHTML = `<h2>Privacidade e segurança</h2>
      <div class="set-card"><h3>Pedidos de amizade</h3>
        ${setRow('Quem pode te mandar pedido', 'O servidor recusa pedidos de quem não se encaixa.', seg('pvR', [['todos', 'Todo mundo'], ['grupos', 'Só de grupos em comum'], ['ninguem', 'Ninguém']], pv.requests || 'todos'))}
      </div>
      <div class="set-card"><h3>Mensagens diretas</h3>
        ${setRow('Quem pode começar uma conversa com você', 'Conversas que já existem continuam abertas. Para cortar alguém, bloqueie.', seg('pvD', [['todos', 'Todo mundo'], ['grupos', 'Amigos e grupos em comum'], ['amigos', 'Só amigos']], pv.dms || 'grupos'))}
      </div>
      <div class="set-card"><h3>Bloqueados · ${bl.length}</h3>
        <p class="muted small" style="margin:0">Quem você bloqueia não pode te mandar mensagem direta, pedido de amizade nem ligar. As mensagens dessa pessoa nos grupos ficam escondidas para você.</p>
        ${bl.length ? `<div class="blk-list">${bl.map(id => `<div class="blk">${av(id, 32, false)}<span><b>${esc(nameOf(id))}</b><span class="muted small">@${esc(user(id).username)}</span></span><button class="btn sm" data-unblock="${id}">Desbloquear</button></div>`).join('')}</div>` : '<p class="muted" style="margin:0">Você não bloqueou ninguém. Para bloquear, clique com o botão direito numa pessoa.</p>'}
      </div>
      <div class="set-card"><h3>Mensagens</h3>
        ${setRow('Só ser notificado por menções nos grupos', 'Mensagens diretas sempre avisam.', sw('pvM', prefs.mentionsOnly))}
        ${setRow('Esconder prévia nas notificações', 'A notificação do Windows mostra só quem mandou, sem o texto.', sw('pvP', prefs.hidePreview))}
      </div>`;
    bindSeg('pvR', v => act('privacy:update', { requests: v }, 'Preferência salva.'));
    bindSeg('pvD', v => act('privacy:update', { dms: v }, 'Preferência salva.'));
    $('#pvM').onchange = e => { prefs.mentionsOnly = e.target.checked; savePrefs(); };
    $('#pvP').onchange = e => { prefs.hidePreview = e.target.checked; savePrefs(); };
    b.onclick = async e => { const x = e.target.closest('[data-unblock]'); if (!x) return; const r = await act('user:block', { id: x.dataset.unblock, block: false }, 'Desbloqueado.'); if (r.ok) setTimeout(drawSettings, 150); };
  }
  else if (setTab === 'aparencia') {
    const t = THEMES[prefs.theme];
    b.innerHTML = `<h2>Aparência</h2>
      <div class="set-card"><h3>Temas animados</h3><p class="muted small" style="margin:0">Uma cena animada no fundo do app e detalhes no visual. Se o PC ficar pesado, ligue o <b>Modo leve</b> lá embaixo; com <b>Animações</b> desligado a cena fica parada.</p>
        <div class="themes fx-themes" id="fxThms">${Object.entries(THEMES).filter(([, th]) => th.fx).map(([k, th]) => `<button class="theme-card fx-card ${prefs.theme === k ? 'on' : ''}" data-t="${k}"><div class="fx-prev fxp-${th.fx}" style="background:${th.prev}"><span class="fx-tag">▶ animado</span></div><div class="nm">${th.nome}<span>${esc(th.desc)}</span></div></button>`).join('')}</div></div>
      <div class="set-card"><h3>Tema</h3><div class="themes" id="thms">${Object.entries(THEMES).filter(([, th]) => !th.fx).map(([k, th]) => `<button class="theme-card ${prefs.theme === k ? 'on' : ''}" data-t="${k}"><div class="theme-prev" style="background:${th.main}"><i style="background:${th.rail}"></i><i style="background:${th.side}"></i><div class="m"><b style="background:${th.accent};width:60%"></b><b style="background:${th.muted};width:85%;opacity:.5"></b><b style="background:${th.muted};width:45%;opacity:.5"></b></div></div><div class="nm">${th.nome}</div></button>`).join('')}</div></div>
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
      <div class="set-card"><h3>Movimento e desempenho</h3>${setRow('Animações', 'Transições e efeitos de movimento.', sw('anm', prefs.anim))}${setRow('Efeitos nos perfis', 'Mostrar estrelas, neve e outros efeitos animados nos cartões de perfil.', sw('pfx', prefs.profileFx))}${setRow('Modo leve', 'Tira desfoques e sombras pesadas. Bom para PCs mais fracos.', sw('lite', prefs.lite))}${setRow('Lista de membros', 'Mostrar membros ao lado do chat nos grupos.', sw('mbs', prefs.showMembers))}</div>
      <div style="display:flex;justify-content:flex-end"><button class="btn ghost" id="rstA">Voltar tudo ao padrão</button></div>`;
    $('#thms').onclick = $('#fxThms').onclick = e => { const x = e.target.closest('[data-t]'); if (!x) return; prefs.radius = null; setPref('theme', x.dataset.t); drawSettings(); };
    $('#accs').onclick = e => { const x = e.target.closest('[data-c]'); if (!x) return; setPref('accent', x.dataset.c || null); drawSettings(); };
    $('#accC').onchange = e => { setPref('accent', e.target.value); drawSettings(); };
    bindSeg('fnt', v => setPref('font', v)); bindSeg('lay', v => setPref('layout', v)); bindSeg('den', v => setPref('density', v));
    bindSeg('bgs', v => { setPref('bg', v); $('#bgCustom').hidden = v !== 'custom'; if (v === 'custom' && !prefs.bgImage) $('#bgUp').click(); });
    $('#fsz').oninput = e => { $('#fszO').textContent = e.target.value + 'px'; setPref('fontSize', +e.target.value); };
    $('#rad').oninput = e => { $('#radO').textContent = e.target.value + 'px'; setPref('radius', +e.target.value); };
    $('#gls').oninput = e => { $('#glsO').textContent = e.target.value + '%'; setPref('glass', +e.target.value); };
    $('#avs').onchange = e => setPref('avatars', e.target.checked); $('#c24').onchange = e => setPref('clock24', e.target.checked);
    $('#anm').onchange = e => setPref('anim', e.target.checked); $('#mbs').onchange = e => setPref('showMembers', e.target.checked);
    $('#pfx').onchange = e => setPref('profileFx', e.target.checked); $('#lite').onchange = e => setPref('lite', e.target.checked);
    $('#bgUp').onclick = async () => { const f = await pickFile(); if (!f) return; let d = await readFile(f); d = await shrink(d, 1920, .82); prefs.bgImage = d; setPref('bg', 'custom'); drawSettings(); };
    if ($('#bgX')) $('#bgX').onclick = () => { prefs.bgImage = null; setPref('bg', 'none'); drawSettings(); };
    $('#rstA').onclick = () => { ['theme', 'accent', 'font', 'fontSize', 'density', 'radius', 'layout', 'avatars', 'clock24', 'bg', 'bgImage', 'glass', 'anim', 'showMembers', 'profileFx', 'lite'].forEach(k => prefs[k] = DEFAULT_PREFS[k]); savePrefs(); applyPrefs(); render(); drawSettings(); };
  }
  else if (setTab === 'voz') {
    const live = V.room ? 'Vale na hora para a call atual.' : 'Vale a partir da próxima call.';
    b.innerHTML = `<h2>Voz e vídeo</h2><p class="muted set-sub">Tudo aqui fica salvo neste aparelho.</p>
      <div class="set-card"><h3>Entrada (seu microfone)</h3>
        <label class="field">Dispositivo de entrada<select id="dMic"><option value="">Padrão do sistema</option></select></label>
        <div class="field">Volume do microfone <span class="hint">· o que os outros escutam de você</span><div class="range-row"><input type="range" id="vGain" min="0" max="200" step="5" value="${prefs.micGain}"><output id="vGainO">${prefs.micGain}%</output></div></div>
        <div class="field">Teste do microfone<div class="mic-test"><button class="btn sm" id="mTest">Testar</button><div class="meter big" id="mBox"><i id="mMeter"></i><b id="mTh" style="left:${prefs.vadLevel}%" ${prefs.vadMode === 'manual' ? '' : 'hidden'}></b></div></div><span class="mic-gate" id="mGate"></span><span class="muted small">Você vai se ouvir com o volume e os efeitos escolhidos. Use fone para não dar microfonia.</span></div>
      </div>
      <div class="set-card"><h3>Modo de entrada</h3>
        ${setRow('Como o microfone abre', '', seg('vMode', [['voz', 'Ativação por voz'], ['ptt', 'Aperte para falar']], prefs.ptt ? 'ptt' : 'voz'))}
        <div id="vVoz" ${prefs.ptt ? 'hidden' : ''}>
          ${setRow('Detecção de voz automática', 'O microfone só abre quando você fala e fecha no silêncio: chiado, ventilador e barulho de fundo não vão para a call. O app aprende sozinho o ruído do seu microfone.', sw('vAuto', prefs.vadMode !== 'manual'))}
          <div class="field" id="vLvl" ${prefs.vadMode === 'manual' ? '' : 'hidden'}>Sensibilidade manual <span class="hint">· o microfone só abre acima da marca</span><div class="range-row"><input type="range" id="vTh" min="1" max="60" step="1" value="${prefs.vadLevel}"><output id="vThO">${prefs.vadLevel}%</output></div></div>
        </div>
        <div id="vPtt" ${prefs.ptt ? '' : 'hidden'}>${setRow('Tecla de aperte para falar', 'Clique e aperte a tecla desejada. Funciona com a janela do Anarchy em foco.', `<button class="kbd" id="vKey" style="cursor:pointer">${esc(keyName(prefs.pttKey))}</button>`)}</div>
      </div>
      <div class="set-card"><h3>Processamento de voz</h3>
        ${setRow('Supressão de ruído', 'Corta ventilador, teclado e barulho de fundo. Se sua voz ficar abafada ou cortando, tente desligar.', sw('vNs', prefs.ns))}
        ${setRow('Cancelamento de eco', 'Evita que seus amigos se ouçam pelo seu alto-falante. <b>Deixe ligado se não usar fone de ouvido.</b>', sw('vEc', prefs.ec))}
        ${setRow('Ganho automático', 'Ajusta o volume da sua voz sozinho. Se sua voz ficar subindo e descendo, desligue.', sw('vAgc', prefs.agc))}
        <div class="set-row"><span class="muted small">${live}</span><button class="btn sm ghost" id="vFxReset">Voltar ao padrão</button></div>
      </div>
      <div class="set-card"><h3>Saída (o que você escuta)</h3>
        <label class="field">Dispositivo de saída<select id="dSpk"><option value="">Padrão do sistema</option></select></label>
        <div class="field">Volume geral da call <span class="hint">· só para você</span><div class="range-row"><input type="range" id="vOut" min="0" max="200" step="5" value="${prefs.outVol}"><output id="vOutO">${prefs.outVol}%</output></div></div>
        <div class="field">Volume da Central de Áudio <span class="hint">· sons tocados na call</span><div class="range-row"><input type="range" id="vSb" min="0" max="100" step="5" value="${prefs.sbVol}"><output id="vSbO">${prefs.sbVol}%</output></div></div>
        ${setRow('Ouvir a Central de Áudio', 'Desligue para não ouvir os sons que as pessoas tocam na call.', sw('vSbOn', prefs.sbOn))}
        <div class="set-row"><div class="t"><b>Teste de saída</b><span>Toca um som no dispositivo escolhido.</span></div><button class="btn sm" id="oTest">Tocar som de teste</button></div>
        <p class="muted small" style="margin:0">O volume de cada pessoa fica no mixer da call (botão de barras) ou clicando com o botão direito nela. Isso muda só o que você escuta.</p>
      </div>
      <div class="set-card"><h3>Vídeo</h3>
        <label class="field">Câmera<select id="dCam"><option value="">Padrão do sistema</option></select></label>
        ${setRow('Qualidade da tela compartilhada', 'Mais qualidade usa mais internet.', seg('vQ', [['720p30', '720p'], ['1080p30', '1080p'], ['1080p60', '1080p 60fps']], prefs.quality))}
      </div>
      <div class="set-card"><h3>Sons</h3>${setRow('Sons de entrar e sair', 'Tocar um som quando alguém entra ou sai da call.', sw('vJs', prefs.joinSounds))}</div>
      <div class="set-card"><h3>Registro da call</h3>
        <p class="muted small" style="margin:0">Anota o que acontece nas calls: quando você entra e sai, quando cai, o motivo da queda e como o áudio com cada pessoa está conectado. Fica só neste aparelho.</p>
        <div class="clog-last" id="clogLast"></div>
        <div class="clog" id="clogBox"></div>
        <div class="set-row"><span class="muted small">Mais recente em cima.</span><div style="display:flex;gap:6px"><button class="btn sm" id="clogCopy">Copiar</button><button class="btn sm" id="clogSave">Salvar arquivo</button><button class="btn sm ghost" id="clogClear">Limpar</button></div></div>
      </div>`;
    drawCallLog();
    $('#clogCopy').onclick = async () => { try { await navigator.clipboard.writeText(clogText()); toast('Registro copiado.'); } catch { toast('Não consegui copiar.', true); } };
    $('#clogSave').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([clogText()], { type: 'text/plain;charset=utf-8' })); a.download = `anarchy-registro-call-${new Date().toISOString().slice(0, 10)}.txt`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); };
    $('#clogClear').onclick = () => { CLOG = []; clogSave(); drawCallLog(); };
    fillDevices();
    const restart = () => { if (V.room) restartMic(); };
    $('#dMic').onchange = e => { prefs.micId = e.target.value; savePrefs(); restart(); if (micTest) { stopMicTest(); toggleMicTest(); } };
    $('#dSpk').onchange = e => { prefs.spkId = e.target.value; savePrefs(); applySink(); };
    $('#dCam').onchange = e => { prefs.camId = e.target.value; savePrefs(); };
    $('#vGain').oninput = e => { prefs.micGain = +e.target.value; $('#vGainO').textContent = prefs.micGain + '%'; savePrefs(); setMicGain(); };
    bindSeg('vMode', v => { prefs.ptt = v === 'ptt'; savePrefs(); $('#vVoz').hidden = prefs.ptt; $('#vPtt').hidden = !prefs.ptt; applyMicGate(); renderUserBar(); micChainCheck(); });
    $('#vAuto').onchange = e => { prefs.vadMode = e.target.checked ? 'auto' : 'manual'; savePrefs(); $('#vLvl').hidden = !!e.target.checked; $('#mTh').hidden = !!e.target.checked; applyMicGate(); micChainCheck(); };
    $('#vTh').oninput = e => { prefs.vadLevel = +e.target.value; $('#vThO').textContent = prefs.vadLevel + '%'; $('#mTh').style.left = prefs.vadLevel + '%'; savePrefs(); };
    $('#vNs').onchange = e => { prefs.ns = e.target.checked; savePrefs(); restart(); };
    $('#vEc').onchange = e => { prefs.ec = e.target.checked; savePrefs(); restart(); if (!e.target.checked) toast('Sem cancelamento de eco, use fone de ouvido ou seus amigos vão ouvir eco.', true); };
    $('#vAgc').onchange = e => { prefs.agc = e.target.checked; savePrefs(); restart(); };
    $('#vFxReset').onclick = () => { prefs.ns = prefs.ec = prefs.agc = true; savePrefs(); ['vNs', 'vEc', 'vAgc'].forEach(id => $('#' + id).checked = true); restart(); toast('Efeitos de voz no padrão.'); };
    $('#vOut').oninput = e => { prefs.outVol = +e.target.value; $('#vOutO').textContent = prefs.outVol + '%'; savePrefs(); applyVolumes(); };
    $('#vSb').oninput = e => { prefs.sbVol = +e.target.value; $('#vSbO').textContent = prefs.sbVol + '%'; savePrefs(); };
    $('#vSbOn').onchange = e => { prefs.sbOn = e.target.checked; savePrefs(); };
    $('#oTest').onclick = toggleOutTest;
    $('#vJs').onchange = e => { prefs.joinSounds = e.target.checked; savePrefs(); };
    bindSeg('vQ', v => { prefs.quality = v; savePrefs(); V.peers.forEach(p => tuneSenders(p.pc)); });
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
        ${setRow('Notificações na área de trabalho', 'Avisa mesmo com o Anarchy minimizado.', sw('nD', prefs.desktop))}
        ${setRow('Nos grupos, só menções', 'Só notificar quando escreverem @' + esc(S.me.username) + '. Mensagens diretas sempre avisam.', sw('nM', prefs.mentionsOnly))}
      </div>
      <div class="set-card"><p class="muted small" style="margin:0">Com o status <b>Não perturbe</b>, nenhum som de mensagem toca.</p><div><button class="btn sm" id="nT">Tocar som de teste</button></div></div>`;
    $('#nS').onchange = e => { prefs.sounds = e.target.checked; savePrefs(); };
    $('#nV').oninput = e => { prefs.volume = +e.target.value; $('#nVO').textContent = e.target.value + '%'; savePrefs(); };
    $('#nV').onchange = () => SOUNDS.msg();
    $('#nM').onchange = e => { prefs.mentionsOnly = e.target.checked; savePrefs(); };
    $('#nT').onclick = () => SOUNDS.msg();
    $('#nD').onchange = async e => {
      if (e.target.checked && DROID) droid('askNotify');
      else if (e.target.checked && 'Notification' in window && Notification.permission !== 'granted') {
        const p = await Notification.requestPermission().catch(() => 'denied');
        if (p !== 'granted') { e.target.checked = false; toast('O navegador bloqueou as notificações. Libere nas configurações do site.', true); return; }
      }
      prefs.desktop = e.target.checked; savePrefs();
    };
  }
  else if (setTab === 'app' && !DESK) {
    b.innerHTML = `<h2>Aplicativo</h2>
      <div class="set-card"><h3>Versão</h3>${setRow(DROID ? 'Anarchy para Android ' + esc(droid('version') || '') : 'Anarchy no navegador', 'Interface ' + esc(UPD.build || '?') + '. Quando o servidor recebe uma versão nova, aparece a barra Atualizar no topo.', '<button class="btn" id="wRl">Recarregar</button>')}</div>
      <div class="set-card"><h3>Idioma</h3>${setRow('Português (Brasil)', 'É o único idioma disponível por enquanto.', '')}</div>
      <div class="set-card"><h3>App de computador</h3><p class="muted small" style="margin:0">O app para Windows abre sozinho com o PC, fica perto do relógio e se atualiza sozinho. Baixe em github.com/FoxyZINntc/Discordia/releases.</p></div>
      ${DROID ? '' : `<div class="set-card"><h3>App de celular (Android)</h3><p class="muted small" style="margin:0">Chat e calls no celular, com a call continuando de tela apagada. No celular, baixe o <a href="https://github.com/FoxyZINntc/Discordia/releases/latest/download/Anarchy.apk" target="_blank" rel="noopener">Anarchy.apk</a> e instale (permita fontes desconhecidas).</p></div>`}`;
    $('#wRl').onclick = () => location.reload();
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
          ${i.fixed ? '' : setRow('Trocar de servidor', 'Volta para a tela inicial do Anarchy.', '<button class="btn danger" id="dReset">Trocar</button>')}
        </div>
        ${DESK.updateCheck ? `<div class="set-card"><h3>Atualizações</h3>${setRow('Anarchy ' + esc(i.version), i.update && i.update.ready ? `A versão ${esc(i.update.version)} está pronta para instalar.` : 'O app procura versões novas sozinho a cada 30 minutos.', i.update && i.update.ready ? '<button class="btn primary" id="dUpdGo">Atualizar e reiniciar</button>' : '<button class="btn" id="dUpd">Procurar agora</button>')}<p class="muted small" id="dUpdMsg" style="margin:0"></p></div>` : ''}
        <div class="set-card"><h3>Janela</h3>
          ${i.platform !== 'linux' ? setRow('Iniciar com o Windows', 'Abre escondido perto do relógio quando o PC liga.', sw('dAuto', i.settings.autoStart)) : ''}
          ${setRow('Fechar para a bandeja', 'O X esconde a janela e o Anarchy continua recebendo mensagens e chamadas.', sw('dTray', i.settings.minimizeToTray))}
          ${setRow('Abrir minimizado', 'O Anarchy abre direto perto do relógio, sem mostrar a janela.', sw('dMin', i.settings.startMinimized))}
        </div>
        <div class="set-card"><p class="muted small" style="margin:0">Anarchy ${esc(i.version)} · F11 tela cheia · F5 recarregar</p></div>`;
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
// nível de 0 a 100 de um analisador (mesma escala do medidor e da sensibilidade manual)
function levelOf(an, buf) { an.getByteTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v - 128)); return clamp(m / 64 * 100, 0, 100); }
async function toggleMicTest() {
  if (micTest) return stopMicTest();
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints() });
    const c = audioCtx(); const src = c.createMediaStreamSource(s); const an = c.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = 0.2; src.connect(an);
    const vad = makeVad();
    const g = c.createGain(); g.gain.value = prefs.micGain / 100; const out = c.createMediaStreamDestination(); src.connect(g); g.connect(out);
    const el = new Audio(); el.srcObject = out.stream; if (prefs.spkId && el.setSinkId) el.setSinkId(prefs.spkId).catch(() => {}); el.play().catch(() => {});
    const buf = new Uint8Array(an.fftSize);
    const iv = setInterval(() => {
      g.gain.value = prefs.micGain / 100;
      const lv = clamp(levelOf(an, buf) * prefs.micGain / 100, 0, 100);
      const open = vad.step(an);
      const meter = $('#mMeter'); if (!meter) return;
      meter.style.width = lv + '%';
      // cinza = o microfone ficaria fechado na call (os outros não ouvem nada)
      const closed = !prefs.ptt && (prefs.vadMode === 'manual' ? lv < prefs.vadLevel : prefs.vadMode !== 'off' && !open);
      meter.classList.toggle('below', closed);
      const st = $('#mGate'); if (st) { st.textContent = prefs.ptt ? '' : closed ? 'Microfone fechado (os outros não ouvem)' : 'Microfone aberto (os outros ouvem)'; st.classList.toggle('on', !closed); }
    }, 20);
    micTest = { s, iv, el, src, g }; $('#mTest').textContent = 'Parar teste'; toast('Fale algo: você vai ouvir a própria voz.');
  } catch { toast('Não consegui abrir o microfone. Verifique a permissão do navegador.', true); }
}
function stopMicTest() { if (!micTest) return; clearInterval(micTest.iv); try { micTest.src.disconnect(); micTest.g.disconnect(); } catch {} micTest.s.getTracks().forEach(t => t.stop()); micTest.el.srcObject = null; micTest = null; const b = $('#mTest'); if (b) b.textContent = 'Testar'; const m = $('#mMeter'); if (m) m.style.width = '0'; }
// teste de saída: uma melodia curta no dispositivo escolhido, no volume geral escolhido
let outTest = null;
function toggleOutTest() {
  if (outTest) return stopOutTest();
  const c = audioCtx(); if (!c) return;
  const d = c.createMediaStreamDestination(); let t = c.currentTime + .05;
  [[523, .18], [659, .18], [784, .18], [1047, .4]].forEach(([f, len]) => {
    const o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.22, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + len);
    o.connect(g).connect(d); o.start(t); o.stop(t + len + .05); t += len * .9;
  });
  const el = new Audio(); el.srcObject = d.stream; el.volume = Math.min(1, prefs.outVol / 100);
  if (prefs.spkId && el.setSinkId) el.setSinkId(prefs.spkId).catch(() => {});
  el.play().catch(() => {});
  outTest = { el, tm: setTimeout(stopOutTest, 1500) }; const b = $('#oTest'); if (b) b.textContent = 'Tocando...';
}
function stopOutTest() { if (!outTest) return; clearTimeout(outTest.tm); outTest.el.srcObject = null; outTest = null; const b = $('#oTest'); if (b) b.textContent = 'Tocar som de teste'; }

/* ---- detecção de voz (como no Discord) ----
   Mede o som do microfone a cada 20 ms. Aprende sozinho o nível do chiado/ruído de fundo do seu microfone e só
   abre quando aparece algo bem acima dele E com cara de voz (energia concentrada na faixa da fala, 250-3500 Hz;
   chiado espalha a energia por todas as frequências). Segura aberto 400 ms depois da última sílaba para não picotar. */
function makeVad() {
  return { noise: null, open: false, hits: 0, last: -1e9, fbuf: null, tbuf: null, mins: [], sum: 0, cnt: 0, curAt: 0, db: -100, sm: null,
    step(an, now = performance.now()) {
      if (!this.tbuf || this.tbuf.length !== an.fftSize) { this.tbuf = new Float32Array(an.fftSize); this.fbuf = new Float32Array(an.frequencyBinCount); }
      an.getFloatTimeDomainData(this.tbuf);
      let s = 0; for (const v of this.tbuf) s += v * v;
      const db = 10 * Math.log10(s / this.tbuf.length + 1e-12);
      an.getFloatFrequencyData(this.fbuf);
      const hz = an.context.sampleRate / an.fftSize; let voice = 0, all = 0, lg = 0, nb = 0;
      for (let i = 1; i < this.fbuf.length; i++) { const e = Math.pow(10, this.fbuf[i] / 10), f = i * hz; all += e; if (f >= 250 && f <= 3500) { voice += e; lg += Math.log(e + 1e-20); nb++; } }
      const ratio = all > 0 ? voice / all : 0;
      // "lisura" do espectro na faixa da fala: voz tem picos (harmônicas), fica abaixo de ~0,25; chiado é liso, acima de ~0,45
      const flat = nb && voice > 0 ? Math.exp(lg / nb) / (voice / nb) : 1;
      // nível suavizado (barulho de fundo oscila; a voz sobe e fica)
      this.db = db; this.sm = this.sm === null ? db : this.sm * 0.6 + db * 0.4;
      // ruído de fundo = a menor média de 100 ms dos últimos 10 s. Com só 3 s, quem fala sem pausa
      // fazia o "ruído" subir até a própria voz e o microfone fechava no meio da frase.
      this.sum += db; this.cnt++;
      if (now - this.curAt >= 100) {
        const a = this.sum / this.cnt; this.mins.push(a); if (this.mins.length > 100) this.mins.shift(); this.sum = 0; this.cnt = 0; this.curAt = now;
        // chiado que aparece ou sobe (ganho automático): som estável por 1 s (variação < 5 dB) é ruído, não voz
        // (a fala sempre varia muito de uma sílaba para outra). Vira o novo ruído na hora e só desce quando o som desce.
        const last = this.mins.slice(-10);
        if (this.nfl !== undefined && a < this.nfl) this.nfl = a;
        if (last.length === 10 && Math.max(...last) - Math.min(...last) < 5) this.nfl = Math.max(this.nfl ?? -200, Math.min(...last));
      }
      this.noise = this.mins.length ? Math.max(Math.min(...this.mins), this.nfl ?? -200) : db;
      // abrir: bem acima do ruído com algo de voz, ou só um pouco acima mas com muita cara de voz (fala baixa)
      const lv = this.sm;
      // só abre com espectro de voz (com picos): chiado, mesmo oscilando, é liso e não abre
      const speech = lv > -70 && flat < 0.35 && ((lv > this.noise + 9 && ratio > 0.35) || (lv > this.noise + 5 && ratio > 0.5));
      this.hits = speech ? this.hits + 1 : 0;
      // 2 leituras seguidas com cara de voz: não abre por estalo de teclado
      if (this.hits >= 2) { this.last = now; this.lastHit = now; }
      // já aberto: segura enquanto houver som acima do ruído, mesmo sem "cara de voz" (fim de palavra, "s", "f", "ch"),
      // mas no máximo 1,2 s sem voz nova (assim o barulho de fundo não deixa o microfone aberto)
      else if (this.open && now - (this.lastHit || 0) < 1200 && lv > -70 && lv > this.noise + 6) this.last = now;
      this.open = now - this.last < 600;
      return this.open;
    }
  };
}

/* ---- caminho do microfone ----
   Por padrão a faixa do microfone vai direto para a call (como sempre foi). Só quando você muda o volume do
   microfone ela passa por um ganho (Web Audio). O cancelamento de eco e a supressão de ruído acontecem antes,
   na captura, então continuam funcionando. A detecção de voz escuta uma cópia da faixa: assim, com o microfone
   fechado para a call, ela continua ouvindo para abrir de novo quando você falar. */
const MICP = { raw: null, chain: null, open: true, last: 0, vad: makeVad(), probe: null };const needChain = () => prefs.micGain !== 100;
async function getMic() { return buildMic(await navigator.mediaDevices.getUserMedia({ audio: audioConstraints() })); }
function buildMic(raw) {
  if (MICP.raw && MICP.raw !== raw) MICP.raw.getTracks().forEach(t => t.stop());
  dropMicChain(); MICP.raw = raw; MICP.open = true; MICP.vad = makeVad();
  const c = audioCtx();
  try {
    const t = raw.getAudioTracks()[0];
    MICP.probe = t ? t.clone() : null; if (MICP.probe) MICP.probe.enabled = true;
    const src = c.createMediaStreamSource(MICP.probe ? new MediaStream([MICP.probe]) : raw); const an = c.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = 0.2; src.connect(an);
    MICP.chain = { src, an, buf: new Uint8Array(1024) };
    if (needChain()) {
      const g = c.createGain(); g.gain.value = prefs.micGain / 100; const d = c.createMediaStreamDestination();
      const gs = c.createMediaStreamSource(raw); gs.connect(g); g.connect(d); Object.assign(MICP.chain, { g, d, gs });
      return d.stream;
    }
  } catch (e) { console.warn('microfone sem processamento', e); }
  return raw;
}
function dropMicChain() {
  const ch = MICP.chain; MICP.chain = null; if (!ch) return;
  try { ch.src.disconnect(); ch.gs && ch.gs.disconnect(); ch.g && ch.g.disconnect(); } catch {}
  if (ch.d) ch.d.stream.getTracks().forEach(t => t.stop());
  if (MICP.probe) { MICP.probe.stop(); MICP.probe = null; }
}
function stopMic() { [V.mic, MICP.raw].forEach(s => s && s.getTracks().forEach(t => t.stop())); dropMicChain(); MICP.raw = null; V.mic = null; }
// volume do microfone mudou: ajusta na hora se já tem o ganho; senão monta o caminho uma vez
function setMicGain() {
  if (MICP.chain && MICP.chain.g) MICP.chain.g.gain.value = prefs.micGain / 100;
  micChainCheck();
}
function micChainCheck() {
  if (!V.room || !V.mic) return;
  if (!!(MICP.chain && MICP.chain.d) !== needChain()) { clearTimeout(micChainCheck.t); micChainCheck.t = setTimeout(restartMic, 350); }
}
// abre e fecha o microfone: automático (detecção de voz) ou manual (só acima da marca), segurando 400 ms
setInterval(() => {
  const ch = MICP.chain;
  if (!V.room || prefs.ptt || prefs.vadMode === 'off' || !ch) { if (!MICP.open) { MICP.open = true; applyMicGate(); } return; }
  let open;
  if (prefs.vadMode === 'manual') {
    const lv = levelOf(ch.an, ch.buf) * prefs.micGain / 100, now = Date.now();
    if (lv >= prefs.vadLevel) MICP.last = now;
    open = now - MICP.last < 400;
  } else open = MICP.vad.step(ch.an);
  if (open !== MICP.open) { MICP.open = open; applyMicGate(); }
}, 20);

/* =============== voz, vídeo e tela (WebRTC) =============== */
// watch: telas que EU estou assistindo (sid de quem compartilha). ownPreview: mostrar a prévia da minha própria tela
const V = { room: null, mic: null, screen: null, cam: null, peers: new Map(), muted: false, deaf: false, ice: [], pttDown: false, calling: false, levels: new Map(), videoCache: new Map(), rejoin: null, watch: new Set(), ownPreview: false };
const SB = { playing: new Map(), cache: new Map(), last: 0 }; // Central de Áudio (sons tocando, áudios já baixados)

/* =============== registro da call: o que aconteceu e por que caiu ===============
   Fica salvo neste aparelho (últimas 500 linhas). Aparece em Configurações > Voz e vídeo. */
const CLOG_KEY = 'discordia:calllog';
let CLOG = []; try { CLOG = JSON.parse(localStorage.getItem(CLOG_KEY) || '[]'); if (!Array.isArray(CLOG)) CLOG = []; } catch { CLOG = []; }
let clogT = null;
const clogSave = () => { try { localStorage.setItem(CLOG_KEY, JSON.stringify(CLOG)); } catch {} };
function clog(msg, lvl = '') { // lvl: 'erro' (caiu), 'aviso' (problema), '' (normal)
  CLOG.push({ t: Date.now(), m: String(msg), l: lvl });
  if (CLOG.length > 600) CLOG = CLOG.slice(-500);
  clearTimeout(clogT); clogT = setTimeout(clogSave, 400);
  if (document.getElementById('clogBox')) drawCallLog();
}
window.addEventListener('pagehide', clogSave);
const DROP_WHY = {
  'ping timeout': 'o servidor parou de responder por mais de 45 s (a internet travou, o PC ficou suspenso ou o servidor caiu)',
  'transport close': 'a conexão fechou (a internet caiu, trocou de rede/Wi-Fi ou o servidor reiniciou)',
  'transport error': 'erro na conexão com o servidor (internet instável)',
  'io server disconnect': 'o servidor encerrou sua conexão (login em outro lugar ou sessão encerrada)',
  'io client disconnect': 'o próprio app fechou a conexão'
};
const clogTime = t => { const d = new Date(t); const p = n => String(n).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; };
const clogText = () => CLOG.map(x => `[${clogTime(x.t)}]${x.l ? ' ' + x.l.toUpperCase() + ':' : ''} ${x.m}`).join('\n');
function drawCallLog() {
  const box = document.getElementById('clogBox'); if (!box) return;
  const last = [...CLOG].reverse().find(x => x.l === 'erro');
  const sum = document.getElementById('clogLast');
  if (sum) sum.innerHTML = last ? `<b>Última queda:</b> ${esc(clogTime(last.t))}: ${esc(last.m)}` : 'Nenhuma queda registrada.';
  box.innerHTML = CLOG.slice(-200).reverse().map(x => `<div class="clog-l ${x.l}"><time>${clogTime(x.t)}</time><span>${esc(x.m)}</span></div>`).join('') || '<div class="muted small">Nada registrado ainda. Entre numa call para começar.</div>';
}
const clogRoom = id => { if (!id) return '?'; const dm = S.dms[id]; if (dm) return 'chamada com ' + dm.members.filter(m => m !== S.me.id).map(nameOf).join(', '); for (const g of Object.values(S.groups)) { const c = g.channels.find(c => c.id === id); if (c) return `${g.name} › ${c.name}`; } return 'sala'; };
// internet do aparelho, PC suspenso/travado e tempo de resposta do servidor (só durante a call)
window.addEventListener('offline', () => clog('O Windows avisou que a internet deste PC caiu.', V.room ? 'aviso' : ''));
window.addEventListener('online', () => clog('A internet deste PC voltou.'));
let clogTick = Date.now(), rttBusy = false;
setInterval(async () => {
  const now = Date.now(), gap = now - clogTick; clogTick = now;
  if (gap > 20000 && (V.room || V.rejoin)) clog(`O app ficou ${Math.round(gap / 1000)} s parado (PC suspenso, travado ou muito ocupado).`, 'aviso');
  if (!V.room || rttBusy || !socket || !socket.connected) return;
  rttBusy = true; const t0 = performance.now();
  const r = await emit('rtt');
  const ms = Math.round(performance.now() - t0); rttBusy = false;
  if (!r.ok) clog(`O servidor não respondeu em 10 s (${r.erro || 'sem resposta'}).`, 'aviso');
  else if (ms > 1500) clog(`O servidor demorou ${ms} ms para responder (internet lenta ou instável).`, 'aviso');
}, 5000);
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
  // voz em mono (o padrão seguro: estéreo dobra o tráfego e pode atrapalhar o processamento de voz) com correção de perda
  pts('opus').forEach(pt => fmtp(pt, { useinbandfec: 1, usedtx: 0, maxaveragebitrate: 96000, maxplaybackrate: 48000, stereo: 0, 'sprop-stereo': 0 }));
  ['VP8', 'VP9', 'H264', 'AV1'].forEach(c => pts(c).forEach(pt => fmtp(pt, { 'x-google-start-bitrate': 1200, 'x-google-max-bitrate': (SCR_Q[prefs.quality] || SCR_Q['1080p30'])[0] })));
  return lines.join('\r\n');
}
/* ---- compartilhamento de tela leve ----
   A call é ponto a ponto: quem compartilha codifica a tela uma vez PARA CADA pessoa e manda tudo pelo próprio upload.
   Por isso: (1) só recebe a tela quem clicou em "Assistir" (para os outros o envio fica pausado: zero CPU e zero
   internet); (2) a soma do envio de tela tem um teto (SCR_BUDGET) dividido entre quem assiste, e a voz tem prioridade
   na rede, para o ping não subir; (3) a tela vai em H.264 quando der (a placa de vídeo codifica, não o processador). */
const SCR_Q = { '720p30': [1800, 30], '1080p30': [3200, 30], '1080p60': [5500, 60] }; // kbps, fps
const SCR_BUDGET = 6000; // kbps somando todo mundo que assiste
const screenWatchers = () => { let n = 0; V.peers.forEach(p => { if (p.wantScreen) n++; }); return n; };
function tuneSenders(pc) {
  const p = [...V.peers.values()].find(x => x.pc === pc);
  const q = SCR_Q[prefs.quality] || SCR_Q['1080p30'];
  const per = Math.max(700, Math.min(q[0], Math.round(SCR_BUDGET / Math.max(1, screenWatchers()))));
  pc.getSenders().forEach(snd => {
    const t = snd.track; if (!t) return;
    const prm = snd.getParameters(); if (!prm.encodings || !prm.encodings.length) return;
    const e = prm.encodings[0];
    if (V.screen && V.screen.getTracks().includes(t)) {
      e.active = !!(p && p.wantScreen); // ninguém assistindo daqui: pausa o envio para essa pessoa
      e.priority = 'low'; e.networkPriority = 'low';
      if (t.kind === 'video') { e.maxBitrate = per * 1000; e.maxFramerate = q[1]; e.scaleResolutionDownBy = per < q[0] * .55 ? 1.5 : 1; prm.degradationPreference = q[1] >= 60 ? 'maintain-framerate' : 'maintain-resolution'; }
      else e.maxBitrate = 96000;
    }
    else if (t.kind === 'audio') { e.maxBitrate = 96000; e.priority = 'high'; e.networkPriority = 'high'; }
    else { e.maxBitrate = 1500000; e.maxFramerate = 30; prm.degradationPreference = 'balanced'; }
    snd.setParameters(prm).catch(() => {});
  });
}
const retuneAll = () => V.peers.forEach(p => tuneSenders(p.pc));
// tela em H.264 (codificado pela placa de vídeo na maioria dos PCs); se não tiver, fica no padrão
function preferScreenCodec(pc) {
  if (!V.screen || !window.RTCRtpSender || !RTCRtpSender.getCapabilities) return;
  const caps = RTCRtpSender.getCapabilities('video'); if (!caps || !caps.codecs) return;
  const h = caps.codecs.filter(c => /h264/i.test(c.mimeType)); if (!h.length) return;
  const order = [...h, ...caps.codecs.filter(c => !/h264/i.test(c.mimeType))];
  pc.getTransceivers().forEach(tr => { if (tr.sender && tr.sender.track && V.screen.getVideoTracks().includes(tr.sender.track) && tr.setCodecPreferences) { try { tr.setCodecPreferences(order); } catch {} } });
}
// eu passo a assistir (ou paro de assistir) a tela de alguém: avisa quem compartilha
function setWatch(sid, on) {
  const p = V.peers.get(sid);
  if (on) V.watch.add(sid); else { V.watch.delete(sid); V.videoCache.delete('screen:' + sid); if (S.focusTile === 'screen:' + sid) S.focusTile = null; }
  if (p) sendSig(p, { watch: !!on });
  if (on) S.focusTile = 'screen:' + sid;
  renderStageSlot();
}
function secureOk() { return window.isSecureContext && navigator.mediaDevices; }
function applyMicGate() {
  const vadOk = prefs.ptt || prefs.vadMode === 'off' || MICP.open;
  const on = !V.muted && !V.deaf && (!prefs.ptt || V.pttDown) && vadOk;
  V.mic && V.mic.getAudioTracks().forEach(t => t.enabled = on);
}
async function joinVoice(roomId, opts = {}) {
  if (!secureOk()) { modal(`<div class="modal-h"><h2>Conexão não segura</h2><p>O navegador só libera microfone e tela em endereços <b>https://</b> ou em <b>localhost</b>. Abra o Anarchy pelo link https que aparece na janela do servidor, ou pelo link público.</p></div><div class="modal-f"><button class="btn primary" data-close>Entendi</button></div>`); return false; }
  if (V.room === roomId) { openStage(); return true; }
  if (V.room) leaveVoice('trocou de sala');
  V.jt =Date.now() * 1000 + Math.floor(Math.random() * 1000); // sessão nova desta entrada na call
  audioCtx();
  try { V.mic = await getMic(); }
  catch (e) { stopMic(); toast('Sem acesso ao microfone. Você entra só ouvindo.', true); }
  if (!V.mic) V.muted = true;
  applyMicGate(); // antes de conectar: quem entra silenciado não vaza nenhum pedaço de áudio
  // já marca a sala antes da resposta: os sinais de conexão que chegam nesse meio-tempo não se perdem
  V.room = roomId;
  const r = await emit('voice:join', { roomId, muted: V.muted || !V.mic, deafened: V.deaf });
  if (!r.ok) { V.room = null; stopMic(); toast(r.erro, true); clog(`Não consegui entrar na call: ${r.erro}`, 'aviso'); return false; }
  V.rejoin = null;
  V.ice = r.iceServers || V.ice; V.calling = !!opts.calling;
  clog(`Entrou na call (${clogRoom(roomId)}). ${r.peers.length ? r.peers.length + ' pessoa(s) já estavam lá.' : 'Ninguém mais na sala.'} ${V.mic ? 'Microfone ok.' : 'Sem microfone.'} ${hasTurn() ? 'Servidor TURN disponível.' : 'Sem servidor TURN.'}`);
  if (V.mic) V.mic.getAudioTracks().forEach(t => t.addEventListener('ended', () => { if (V.mic && V.mic.getTracks().includes(t)) clog('O microfone parou de mandar som (foi desconectado ou outro programa pegou ele).', 'aviso'); }));
  if (V.mic) watchLevel(S.mySid, V.mic);
  r.peers.forEach(p => getPeer(p.sid));
  SOUNDS.join();
  if (opts.video) toggleCam();
  if (prefs.mixerOpen) mixerOpen();
  musicSync(); // o DJ já estava tocando nesta sala: entra ouvindo do ponto certo
  droid('call', true, clogRoom(roomId)); // no celular: mantém a call viva com a tela desligada
  render(); return true;
}
function cleanupVoice() {
  V.peers.forEach(p => { try { p.pc.close(); } catch {} });
  V.peers.clear();
  [V.screen, V.cam].forEach(s => s && s.getTracks().forEach(t => t.stop())); stopMic();
  V.screen = V.cam = null; V.room = null; V.watch.clear(); V.ownPreview = false; SB.playing.forEach(x => { try { x.src.stop(); } catch {} }); SB.playing.clear(); V.calling = false; S.focusTile = null;
  [...V.levels.keys()].forEach(dropLevel); V.videoCache.clear(); dropAudio(() => true); $('#audioSink').innerHTML = '';
  ring(false); musicSync(); mixerSync(); render();
  droid('call', false, '');
}
function leaveVoice(why = 'você saiu') {
  V.rejoin = null;
  if (!V.room) return;
  const room = V.room;
  clog(`Saiu da call (${clogRoom(room)}): ${typeof why === 'string' ? why : 'você saiu'}.`);
  if (V.calling && S.dms[room] && (S.voice[room] || []).length <= 1) socket.emit('call:decline', { dmId: room });
  emit('voice:leave'); SOUNDS.leave(); cleanupVoice();
}
function sendState() { if (V.room) socket.emit('voice:state', { muted: V.muted || !V.mic, deafened: V.deaf, screen: V.screen ? V.screen.id : null, cam: V.cam ? V.cam.id : null }); }
async function restartMic() {
  if (!V.room) return;
  try {
    const old = V.mic;
    const s = await getMic();
    const t = s.getAudioTracks()[0];
    // troca a faixa sem renegociar (quem está na call não percebe)
    V.peers.forEach(p => { const snd = p.pc.getSenders().find(x => x.track && x.track.kind === 'audio' && old && old.getTracks().includes(x.track)); if (snd) snd.replaceTrack(t); else p.pc.addTrack(t, s); });
    old && old !== s && old.getTracks().forEach(x => x.stop()); V.mic = s; applyMicGate(); watchLevel(S.mySid, s);
    toast('Microfone atualizado.');
  } catch { toast('Não consegui trocar o microfone.', true); }
}

/* Cada entrada na call ganha uma "sessão" (V.jt). Os sinais levam a sessão de quem mandou (jt) e a que ele
   acha que é a nossa (rjt). Assim, quando alguém sai e entra de novo, sinais atrasados da call anterior
   são descartados em vez de bagunçar a conexão nova (era isso que deixava as vozes picotadas/robóticas). */
function sendSig(p, data) { socket.emit('rtc:signal', { to: p.sid, data: { ...data, jt: V.jt, rjt: p.rjt || undefined } }); }
const hasTurn = () => (V.ice || []).some(s => [].concat(s.urls || []).some(u => /^turns?:/i.test(u)));
function connWarn(p) {
  if (p.warned || !V.room) return;
  const info = peerInfo(p.sid);
  // ninguém dos dois tem microfone/tela/câmera: não há o que conectar, não é erro
  if (!V.mic && !V.screen && !V.cam && info && info.muted && !info.screen && !info.cam) return;
  p.warned = true;
  const who = nameOf(info?.uid);
  toast(hasTurn()
    ? `Não consegui ligar o áudio com ${who}. Tentando de novo... Se continuar, peça para a pessoa sair e entrar na call.`
    : `Não consegui ligar o áudio com ${who}: a internet de um de vocês bloqueia a conexão direta (comum em 4G e alguns provedores) e o servidor ainda não tem TURN.`, true, 12000);
  mixerSync();
}
function resetPeer(sid) {
  const p = V.peers.get(sid); if (!p) return;
  clearTimeout(p.connT);
  try { p.pc.close(); } catch {}
  V.peers.delete(sid); dropAudio(a => a.sid === sid); dropLevel(sid);
}
function getPeer(sid) {
  let p = V.peers.get(sid); if (p) return p;
  const pc = new RTCPeerConnection({ iceServers: V.ice });
  p = { sid, pc, polite: S.mySid > sid, makingOffer: false, ignoreOffer: false, streams: new Map(), rjt: null, joinedAt: (peerInfo(sid) || {}).joinedAt || null };
  V.peers.set(sid, p);
  [V.mic, V.screen, V.cam].forEach(s => s && s.getTracks().forEach(t => pc.addTrack(t, s)));
  preferScreenCodec(pc);
  pc.onnegotiationneeded = async () => {
    try {
      p.makingOffer = true;
      const offer = await pc.createOffer();
      if (pc.signalingState !== 'stable') return;
      await pc.setLocalDescription({ type: 'offer', sdp: tuneSdp(offer.sdp) });
      sendSig(p, { description: pc.localDescription });
      tuneSenders(pc);
    }
    catch (e) { console.warn(e); } finally { p.makingOffer = false; }
  };
  pc.onicecandidate = ({ candidate }) => { if (candidate) sendSig(p, { candidate }); };
  pc.oniceconnectionstatechange = () => {
    if (pc.iceConnectionState === 'failed') { clog(`Áudio com ${nameOf(peerInfo(sid)?.uid)} falhou. Tentando reconectar (reinício do ICE)...`, 'aviso'); pc.restartIce(); }
    if (pc.iceConnectionState === 'connected') tuneSenders(pc);
  };
  // estado da conexão de áudio com essa pessoa (aparece no mixer); se não conectar, avisa o motivo
  pc.onconnectionstatechange = () => {
    const prev = p.state;
    p.state = pc.connectionState; mixerSync();
    const who = nameOf(peerInfo(sid)?.uid);
    if (pc.connectionState === 'connected') {
      p.warned = false; clearTimeout(p.connT);
      if (V.watch.has(sid)) sendSig(p, { watch: true }); // reconectou: continua assistindo a tela dessa pessoa
      // por onde o áudio passa: direto (rede local/internet) ou pelo servidor TURN
      pc.getStats().then(st => {
        let pair = null; st.forEach(x => { if (x.type === 'transport' && x.selectedCandidatePairId) pair = st.get(x.selectedCandidatePairId); });
        if (!pair) st.forEach(x => { if (x.type === 'candidate-pair' && x.nominated && x.state === 'succeeded') pair = x; });
        const loc = pair && st.get(pair.localCandidateId), rem = pair && st.get(pair.remoteCandidateId);
        const via = [loc, rem].some(c => c && c.candidateType === 'relay') ? 'pelo servidor TURN' : [loc, rem].some(c => c && c.candidateType === 'srflx' || c && c.candidateType === 'prflx') ? 'direto pela internet' : 'direto pela rede local';
        const rtt = pair && pair.currentRoundTripTime ? `, ${Math.round(pair.currentRoundTripTime * 1000)} ms` : '';
        clog(`Áudio com ${who} ${prev === 'disconnected' || prev === 'failed' ? 'voltou' : 'conectado'} (${via}${rtt}).`);
      }).catch(() => clog(`Áudio com ${who} conectado.`));
    }
    if (pc.connectionState === 'disconnected') clog(`Áudio com ${who} travou (a internet de um de vocês oscilou). Esperando voltar...`, 'aviso');
    if (pc.connectionState === 'failed') { clog(`Áudio com ${who} caiu e não voltou sozinho.`, 'erro'); connWarn(p); }
  };
  p.state = pc.connectionState;
  p.connT = setTimeout(() => { if (V.peers.get(sid) === p && pc.connectionState !== 'connected') connWarn(p); }, 15000);
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
  // mandado para uma entrada nossa que já acabou: ignora
  if (data.rjt && data.rjt !== V.jt) return;
  let p = V.peers.get(from);
  if (p && data.jt && p.rjt) {
    if (data.jt < p.rjt) return;                       // sinal velho da sessão anterior dessa pessoa
    if (data.jt > p.rjt) { resetPeer(from); p = null; } // a pessoa saiu e entrou de novo: começa do zero
  }
  p = p || getPeer(from);
  if (data.jt && !p.rjt) p.rjt = data.jt;
  // a pessoa começou/parou de assistir a minha tela: liga ou pausa o envio só para ela e redivide a banda
  if ('watch' in data) { p.wantScreen = !!data.watch; retuneAll(); clog(`${nameOf(peerInfo(from)?.uid)} ${p.wantScreen ? 'começou a assistir' : 'parou de assistir'} a sua tela.`); return; }
  const pc = p.pc;
  try {
    if (data.description) {
      const offerCollision = data.description.type === 'offer' && (p.makingOffer || pc.signalingState !== 'stable');
      p.ignoreOffer = !p.polite && offerCollision;
      if (p.ignoreOffer) return;
      await pc.setRemoteDescription(data.description);
      if (data.description.type === 'offer') {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription({ type: 'answer', sdp: tuneSdp(answer.sdp) });
        sendSig(p, { description: pc.localDescription });
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
    const v = off ? 0 : (uid ? volOf(uid, kind) : 100) / 100 * clamp(prefs.outVol ?? 100, 0, 200) / 100;
    if (v > 1 && boost(a, true)) { a.el.muted = true; a.gain.gain.value = v; }
    else { boost(a, false); a.el.muted = v === 0; a.el.volume = Math.min(1, v); }
  });
  musicVol();
  mixerSync();
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
/* =============== DJ: música do bot na call ===============
   O servidor manda o que tocar e desde quando (startedAt, no relógio dele). Cada app toca o áudio
   (/api/music/:id) no mesmo ponto, então todo mundo ouve junto. O volume do DJ é o da sala x o seu. */
const MU = { el: null, id: null, wait: null };
const srvNow = () => Date.now() + (S.clockOff || 0);
const djState = () => V.room && S.music[V.room];
function djPos(st) { return st.pausedAt !== null ? st.pausedAt / 1000 : (srvNow() - st.startedAt) / 1000; }
function musicSync() {
  const st = djState(), cur = st && st.cur;
  clearTimeout(MU.wait);
  if (!cur) { if (MU.el) { MU.el.pause(); MU.el.removeAttribute('src'); MU.el.load(); } MU.id = null; return; }
  if (!MU.el) {
    MU.el = new Audio(); MU.el.preload = 'auto';
    // link direto sem duração: avisa o servidor quanto dura (para ele passar para a próxima na hora certa)
    MU.el.addEventListener('loadedmetadata', () => { const s = djState(); if (s && s.cur && s.cur.id === MU.id && !s.cur.dur && isFinite(MU.el.duration)) socket.emit('music:dur', { roomId: V.room, id: MU.id, dur: MU.el.duration }); });
    MU.el.addEventListener('error', () => { if (MU.id) clog('O áudio do DJ falhou ao carregar.', 'aviso'); });
  }
  if (prefs.spkId && MU.el.setSinkId && MU.el.__sink !== prefs.spkId) { MU.el.__sink = prefs.spkId; MU.el.setSinkId(prefs.spkId).catch(() => {}); }
  if (MU.id !== cur.id) { MU.id = cur.id; MU.el.src = '/api/music/' + encodeURIComponent(cur.id); }
  musicVol();
  const pos = djPos(st);
  if (st.pausedAt !== null) { MU.el.pause(); if (Math.abs((MU.el.currentTime || 0) - pos) > 0.5) try { MU.el.currentTime = pos; } catch {} return; }
  if (pos < 0) { MU.el.pause(); try { MU.el.currentTime = 0; } catch {} MU.wait = setTimeout(musicSync, -pos * 1000); return; }
  if (cur.dur && pos > cur.dur + 1) { MU.el.pause(); return; }
  if (Math.abs((MU.el.currentTime || 0) - pos) > 0.8) try { MU.el.currentTime = pos; } catch {}
  if (MU.el.paused) MU.el.play().catch(() => toast('Clique em qualquer lugar para ouvir o DJ.'));
}
// o ouvido percebe volume em curva: com a barra em linha reta, 5% ainda soava alto e depois só vinha o 0.
// Elevando ao quadrado, cada pedacinho da barra muda o volume de um jeito que dá para sentir (50% = 1/4 da força).
const djGain = v => Math.pow(clamp(+v || 0, 0, 100) / 100, 2);
function musicVol() {
  const st = djState(); if (!MU.el || !st) return;
  const v = V.deaf || prefs.djOn === false ? 0 : djGain(st.vol) * djGain(prefs.djVol ?? 70) * clamp(prefs.outVol ?? 100, 0, 200) / 100;
  MU.el.volume = clamp(v, 0, 1); MU.el.muted = v === 0;
}
// fica conferindo se está no ponto certo (o áudio pode atrasar ao carregar); atualiza a barra de tempo
setInterval(() => {
  const st = djState();
  if (st && st.cur && MU.el && MU.id === st.cur.id && st.pausedAt === null && !MU.el.paused) {
    const pos = djPos(st); if (pos > 0 && Math.abs(MU.el.currentTime - pos) > 1.2) try { MU.el.currentTime = pos; } catch {}
  }
  $$('.dj-card').forEach(c => { const s = S.music[c.dataset.room]; if (!s || !s.cur) return; const p = clamp(djPos(s), 0, s.cur.dur || 1e9); const bar = $('.dj-prog i', c), tm = $('.dj-time', c); if (bar && s.cur.dur) bar.style.width = (100 * p / s.cur.dur) + '%'; if (tm) tm.textContent = fmtDur(p) + (s.cur.dur ? ' / ' + fmtDur(s.cur.dur) : ''); });
}, 500);
function fmtDur(s) { s = Math.max(0, Math.round(s || 0)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = String(s % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`; }
// cartão "Tocando agora" (no palco da call)
function djCard(roomId) {
  const st = S.music[roomId]; if (!st || !(st.cur || st.loading)) return '';
  const c = st.cur || st.loading, loading = !st.cur, paused = st.pausedAt !== null, inRoom = V.room === roomId;
  const thumb = c.thumb ? `<img src="${esc(c.thumb)}" alt="" loading="lazy">` : `<div class="dj-noart">🎵</div>`;
  const b = (a, icon, tip, on) => `<button class="dj-b ${on ? 'on' : ''}" data-act="djCtl" data-a="${a}" data-room="${roomId}" title="${tip}" ${inRoom ? '' : 'disabled'}>${icon}</button>`;
  return `<div class="dj-card" data-room="${roomId}">
    <div class="dj-art">${thumb}</div>
    <div class="dj-main">
      <div class="dj-top">${av(st.botId, 20, false)}<span class="dj-bot">${esc(nameOf(st.botId))}</span><span class="bot-tag">BOT</span><span class="dj-state">${loading ? 'Carregando...' : paused ? 'Pausado' : 'Tocando agora'}</span></div>
      <div class="dj-title" title="${esc(c.title)}">${c.page ? `<a href="${esc(c.page)}" target="_blank" rel="noopener">${esc(c.title)}</a>` : esc(c.title)}</div>
      <div class="dj-sub">${esc(c.by || '')}${c.by ? ' · ' : ''}${c.who === st.botId && st.radio ? `📻 rádio ${esc(st.radio)}` : `pedido por ${esc(nameOf(c.who))}`}${st.radio && c.who !== st.botId ? ` · 📻 ${esc(st.radio)} depois da fila` : ''}${st.queue.length ? ` · ${st.queue.length} na fila` : ''}${st.loop ? ' · 🔁 repetindo' : ''}</div>
      <div class="dj-prog"><i></i></div>
      <div class="dj-row">
        ${b(paused ? 'continuar' : 'pausar', paused ? '▶' : '⏸', paused ? 'Continuar' : 'Pausar')}${b('pular', '⏭', 'Pular')}${b('parar', '⏹', 'Parar e limpar a fila')}${b('repetir', '🔁', 'Repetir esta música', st.loop)}<button class="dj-b" data-fun="karaoke" data-room="${roomId}" title="Karaokê: letra sincronizada" ${loading ? 'disabled' : ''}>🎤</button>
        <span class="dj-time">${loading ? '' : '0:00'}</span>
        <label class="dj-vol" title="Volume do DJ só para você (dá para usar a rodinha do mouse)">${ic('voice')}<input type="range" min="0" max="100" step="1" value="${prefs.djVol ?? 70}" data-djvol="1" aria-label="Volume do DJ para você"><output>${prefs.djVol ?? 70}%</output></label>
      </div>
      ${st.queue.length ? `<details class="dj-q"><summary>Próximas (${st.queue.length})</summary>${st.queue.slice(0, 15).map((t, i) => `<div class="dj-qi"><span>${i + 1}.</span><b title="${esc(t.title)}">${esc(t.title)}</b><span class="muted">${t.dur ? fmtDur(t.dur) : ''}</span>${inRoom && window.anarchyFun ? window.anarchyFun.djVotes(roomId, t) : ''}${inRoom ? `<button class="icon-btn" data-act="djCtl" data-a="tirar" data-v="${i + 1}" data-room="${roomId}" title="Tirar da fila">${ic('x')}</button>` : ''}</div>`).join('')}</details>` : ''}
    </div></div>`;
}
// volume do DJ só para você: todas as barras (cartão da call e menu do botão direito) andam juntas
function setDjVol(v) {
  v = clamp(Math.round(+v || 0), 0, 100); prefs.djVol = v;
  if (prefs.djOn === false && v > 0) prefs.djOn = true;
  savePrefs(); musicVol();
  $$('[data-djvol], [data-m="djvol"]').forEach(x => { if (+x.value !== v) x.value = v; const o = x.parentElement.querySelector('output'); if (o) o.textContent = v + '%'; });
}
document.addEventListener('input', e => { if (e.target.dataset && e.target.dataset.djvol) setDjVol(e.target.value); });
// rodinha do mouse em cima da barra: 1% por vez (com Shift, 5%)
document.addEventListener('wheel', e => {
  const r = e.target.closest && e.target.closest('[data-djvol], [data-m="djvol"], .dj-vol');
  if (!r) return; e.preventDefault();
  setDjVol((prefs.djVol ?? 70) + (e.deltaY < 0 ? 1 : -1) * (e.shiftKey ? 5 : 1));
}, { passive: false });
// comandos com / no campo de mensagem (só nos grupos com DJ)
const DJ_CMDS = [['music', 'nome ou link', 'Toca uma música, playlist ou álbum (YouTube, Spotify...)'], ['album', 'nome do álbum', 'Procura o álbum e põe ele inteiro na fila'],['pular', '', 'Pula para a próxima'], ['pausar', '', 'Pausa a música'], ['continuar', '', 'Continua de onde parou'], ['parar', '', 'Para tudo e limpa a fila'], ['fila', '', 'Mostra a fila'], ['agora', '', 'O que está tocando'], ['volume', '0 a 100', 'Volume do DJ para todo mundo'], ['repetir', '', 'Repete a música atual'], ['tirar', 'número', 'Tira uma música da fila'], ['embaralhar', '', 'Embaralha a fila'], ['ajuda', '', 'Lista os comandos']];
const groupDj = g => g && g.djId && g.members.includes(g.djId) && user(g.djId).bot ? g.djId : null;
function cmdAC(ta) {
  let box = null, items = [], sel = 0;
  const close = () => { box?.remove(); box = null; items = []; };
  // comando sem nada para completar (/pular, /fila...) já vai direto; os outros esperam você digitar
  const pick = i => { const it = items[i]; if (!it) return; close(); if (!it[1]) { ta.value = '/' + it[0]; sendMessage(); return; } ta.value = '/' + it[0] + ' '; ta.selectionStart = ta.selectionEnd = ta.value.length; ta.dispatchEvent(new Event('input')); ta.focus(); };
  const draw = () => {
    if (!items.length) return close();
    if (!box) { box = document.createElement('div'); box.className = 'mention-pop cmd-pop'; box.setAttribute('role', 'listbox'); ta.closest('.composer-wrap').prepend(box); box.addEventListener('mousedown', e => { e.preventDefault(); const b = e.target.closest('[data-i]'); if (b) pick(+b.dataset.i); }); }
    const g = curGroup();
    box.innerHTML = `<div class="mp-h">${av(groupDj(g), 18, false)} Comandos do ${esc(nameOf(groupDj(g)))}</div>${items.map((c, i) => `<button type="button" role="option" data-i="${i}" class="${i === sel ? 'on' : ''}"><b>/${c[0]}</b>${c[1] ? `<span class="cmd-arg">${esc(c[1])}</span>` : ''}<span>${esc(c[2])}</span></button>`).join('')}`;
  };
  const update = () => {
    const g = S.view.kind === 'group' && curGroup();
    const m = /^\/(\w*)$/.exec(ta.value);
    if (!g || !groupDj(g) || !m) return close();
    items = DJ_CMDS.filter(c => c[0].startsWith(m[1].toLowerCase())); sel = Math.min(sel, Math.max(0, items.length - 1)); draw();
  };
  ta.addEventListener('input', update);
  ta.addEventListener('blur', () => setTimeout(close, 120));
  ta.addEventListener('keydown', e => {
    if (!box) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopImmediatePropagation(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; draw(); }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); e.stopImmediatePropagation(); pick(sel); }
    else if (e.key === 'Escape') { e.stopImmediatePropagation(); close(); }
  });
}

function applySink() {
  if (MU.el && MU.el.setSinkId) { MU.el.__sink = prefs.spkId || ''; MU.el.setSinkId(prefs.spkId || '').catch(() => {}); }
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
// botão direito na tela de alguém: volume do som da tela, silenciar, tela cheia e parar/começar a assistir
function screenMenu(sid, anchor) {
  const info = peerInfo(sid); if (!info) return;
  const uid = info.uid, watching = V.watch.has(sid), cur = volOf(uid, 'screen');
  const p = pop(`<div class="vm-h">${ic('screen')}<b>Tela de ${esc(nameOf(uid))}</b></div>
    <label class="vm-l" for="smV">Volume da tela<output id="smVO">${cur}%</output></label><input type="range" id="smV" min="0" max="200" step="5" value="${cur}">
    <label class="vm-c"><input type="checkbox" id="smM" ${cur === 0 ? 'checked' : ''}>Silenciar o som da tela</label>
    <p class="muted small" style="margin:0">Muda só o que você escuta. A voz da pessoa continua normal.</p>
    <div class="vm-f">${watching ? '<button class="btn sm" id="smFs">Tela cheia</button><button class="btn sm danger" id="smStop">⏹ Parar de assistir</button>' : '<button class="btn sm primary" id="smWatch">▶ Assistir</button>'}</div>`, anchor, 'vmenu', 'above');
  let last = cur || 100;
  const set = v => { prefs.svol = { ...(prefs.svol || {}) }; if (v === 100) delete prefs.svol[uid]; else prefs.svol[uid] = v; savePrefs(); applyVolumes(); $('#smV', p).value = v; $('#smVO', p).textContent = v + '%'; $('#smM', p).checked = v === 0; };
  $('#smV', p).oninput = e => { const v = +e.target.value; if (v) last = v; set(v); };
  $('#smV', p).onchange = () => renderStageSlot();
  $('#smM', p).onchange = e => { set(e.target.checked ? 0 : last); renderStageSlot(); };
  const fs = $('#smFs', p); if (fs) fs.onclick = () => { closePops(); const v = $(`.tile[data-key="screen:${sid}"] video`); (v && v.requestFullscreen ? v.requestFullscreen() : Promise.reject()).catch(() => {}); };
  const st = $('#smStop', p); if (st) st.onclick = () => { closePops(); setWatch(sid, false); };
  const w = $('#smWatch', p); if (w) w.onclick = () => { closePops(); setWatch(sid, true); };
}
// marquinha ao lado do nome quando você mudou o volume da pessoa
const volTag = uid => (prefs.umute && prefs.umute[uid]) ? '<span class="vol-tag" title="Silenciado para você">🔇</span>' : (prefs.vol && prefs.vol[uid] !== undefined) ? `<span class="vol-tag" title="Volume para você">${prefs.vol[uid]}%</span>` : '';

function onVoiceRoom({ roomId, peers }) {
  const beforeInfo = S.voice[roomId] || [];
  const before = beforeInfo.map(p => p.sid);
  if (roomId === V.room) {
    peers.filter(p => !before.includes(p.sid) && p.sid !== S.mySid).forEach(p => clog(`${nameOf(p.uid)} entrou na call.`));
    beforeInfo.filter(p => !peers.some(x => x.sid === p.sid) && p.sid !== S.mySid).forEach(p => clog(`${nameOf(p.uid)} saiu da call.`));
  }
  if (peers.length) S.voice[roomId] = peers; else delete S.voice[roomId];
  if (roomId === V.room) {
    const now = peers.map(p => p.sid);
    // quem saiu, ou saiu e voltou rápido (a hora de entrada mudou): fecha a conexão velha
    V.peers.forEach((p, sid) => {
      const info = peers.find(x => x.sid === sid);
      if (!info || (p.joinedAt && info.joinedAt && info.joinedAt !== p.joinedAt)) resetPeer(sid);
    });
    now.forEach(sid => { if (sid !== S.mySid) getPeer(sid); });
    applyVolumes(); // quem começou ou parou de compartilhar a tela muda qual volume vale
    const joined = now.filter(s => !before.includes(s) && s !== S.mySid), left = before.filter(s => !now.includes(s) && s !== S.mySid);
    if (joined.length) { SOUNDS.join(); if (V.calling) { V.calling = false; ring(false); } }
    if (left.length) SOUNDS.leave();
    if (S.focusTile && !peers.some(p => S.focusTile.endsWith(p.sid))) S.focusTile = null;
    mixerSync();
  }
  render();
}
let stageRq = 0;
function renderStageSoon() { if (stageRq) return; stageRq = requestAnimationFrame(() => { stageRq = 0; renderStageSlot(); }); }

function toggleMute() {
  if (!V.mic && V.room) return toast('Sem microfone nesta call.', true);
  if (V.deaf) { V.deaf = false; V.muted = false; } else V.muted = !V.muted;
  applyVolumes();
  (V.muted ? SOUNDS.mute : SOUNDS.unmute)(); applyMicGate(); sendState(); mixerSync(); render();
}
function toggleDeaf() {
  V.deaf = !V.deaf; applyVolumes();
  (V.deaf ? SOUNDS.mute : SOUNDS.unmute)(); applyMicGate(); sendState(); mixerSync(); render();
}
async function toggleScreen() {
  if (!V.room) return;
  if (V.screen) return stopStream('screen');
  if (!navigator.mediaDevices.getDisplayMedia) return toast(DROID ? 'No celular ainda não dá para compartilhar a tela. Você consegue assistir a tela dos outros normalmente.' : 'Este navegador não consegue compartilhar a tela.', true);
  const q = { '720p30': [1280, 720, 30], '1080p30': [1920, 1080, 30], '1080p60': [1920, 1080, 60] }[prefs.quality] || [1920, 1080, 30];
  // No navegador, o "som do sistema" pega o PC inteiro, vozes da call incluídas (quem fala se ouve de volta).
  // restrictOwnAudio tira da captura o som da própria página. No app de PC o som vem do somtela.exe, que já exclui o Anarchy.
  const sup = (navigator.mediaDevices.getSupportedConstraints && navigator.mediaDevices.getSupportedConstraints()) || {};
  // teto na captura: nunca pega acima da qualidade escolhida (tela 2K/4K seria redimensionada a cada quadro)
  const ask = audio => navigator.mediaDevices.getDisplayMedia({ video: { width: { ideal: q[0], max: q[0] }, height: { ideal: q[1], max: q[1] }, frameRate: { ideal: q[2], max: q[2] } },
    audio: audio && sup.restrictOwnAudio ? { restrictOwnAudio: true } : audio });
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
  // ninguém recebe ainda: cada um clica em "Assistir" (o envio só liga para quem assiste)
  V.peers.forEach(p => { p.wantScreen = false; V.screen.getTracks().forEach(t => p.pc.addTrack(t, V.screen)); preferScreenCodec(p.pc); });
  V.ownPreview = false;
  sendState(); render(); openStage();
  toast('Você está compartilhando a tela. Quem quiser ver clica em "Assistir".');
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
  if (kind === 'screen') V.peers.forEach(p => { p.wantScreen = false; });
  if (S.focusTile === kind + ':' + S.mySid) S.focusTile = null;
  sendState(); render();
}

/* níveis de voz (quem está falando) */
function dropLevel(sid) { const l = V.levels.get(sid); if (l) { try { l.src.disconnect(); } catch {} V.levels.delete(sid); } }
function watchLevel(sid, stream) {
  dropLevel(sid); // sem isso, cada entrada na call deixava um medidor velho ligado
  try { const c = audioCtx(); const src = c.createMediaStreamSource(stream); const an = c.createAnalyser(); an.fftSize = 256; src.connect(an); V.levels.set(sid, { an, src, buf: new Uint8Array(an.fftSize) }); } catch {}
}
setInterval(() => {
  if (!V.room) return;
  const room = S.voice[V.room] || [];
  const now = Date.now();
  V.levels.forEach((l, sid) => {
    l.an.getByteTimeDomainData(l.buf); let m = 0; for (const v of l.buf) m = Math.max(m, Math.abs(v - 128));
    const st = room.find(p => p.sid === sid);
    if (m > 9) l.at = now;
    const voz = now - (l.at || 0) < 600; // voz com 600 ms de folga (o mesmo tempo que o microfone segura aberto)
    let speaking;
    if (sid === S.mySid) {
      // a sua bolinha segue o microfone: acende quando ele abre para a call e apaga quando fecha
      const sending = !V.muted && !V.deaf && (!prefs.ptt || V.pttDown);
      speaking = sending && (prefs.ptt || prefs.vadMode === 'off' ? voz : MICP.open);
    } else speaking = voz && !(st && (st.muted || st.deafened)); // a dos outros: sem piscar entre sílabas
    $$(`[data-speak="${sid}"]`).forEach(el => { if (el.classList.contains('speaking') !== speaking) el.classList.toggle('speaking', speaking); });
  });
}, 60);

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
      ${djCard(roomId)}
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
    // a tela só é mostrada (e recebida) se você estiver assistindo; a sua só com a prévia ligada
    if (!me && !p.screen && V.watch.has(p.sid)) V.watch.delete(p.sid);
    const watching = me ? V.ownPreview : V.watch.has(p.sid);
    const scrStream = !watching ? null : me ? V.screen : p.screen && peer?.streams.get(p.screen);
    const flags = `${p.deafened ? ic('headOff') : p.muted ? ic('micOff') : ''}`;
    const vb = me ? '' : `<button class="tvol" data-act="voiceUser" data-vuid="${p.uid}" title="Volume de ${esc(nameOf(p.uid))}">${ic(prefs.umute && prefs.umute[p.uid] ? 'micOff' : 'voice')}</button>`;
    tiles.push({ key: 'user:' + p.sid, html: `<div class="tile ${camStream ? 'cam' : ''}" data-act="focus" data-key="user:${p.sid}" data-speak="${p.sid}" ${me ? '' : `data-vuid="${p.uid}"`}>${camStream ? `<div class="vslot" data-v="cam:${p.sid}" style="position:absolute;inset:0"></div>` : av(p.uid, 80, false)}<span class="nm">${flags}${esc(nameOf(p.uid))}${me ? ' (você)' : ''}${volTag(p.uid)}</span>${vb}</div>`, stream: camStream, vkey: 'cam:' + p.sid, mirror: me });
    if (p.screen || (me && V.screen)) {
      const sv = prefs.svol && prefs.svol[p.uid];
      // sem assistir: um cartão com "Assistir" (nada é baixado nem decodificado até clicar)
      const body = scrStream ? `<div class="vslot" data-v="screen:${p.sid}" style="position:absolute;inset:0"></div>`
        : me ? `<div class="scr-idle">${ic('screen')}<b>Você está compartilhando a tela</b><span>${screenWatchers() ? `${screenWatchers()} ${screenWatchers() === 1 ? 'pessoa assistindo' : 'pessoas assistindo'}` : 'Ninguém assistindo ainda'}</span><button class="btn sm" data-act="ownPreview">Ver prévia</button></div>`
        : watching ? '<span class="muted">Conectando à tela...</span>'
        : `<div class="scr-idle">${av(p.uid, 48, false)}<b>${esc(nameOf(p.uid))} está compartilhando a tela</b><button class="btn primary" data-act="watchScreen" data-sid="${p.sid}">▶ Assistir</button></div>`;
      tiles.push({ key: 'screen:' + p.sid, html: `<div class="tile scr ${watching ? '' : 'idle'}" data-act="focus" data-key="screen:${p.sid}" ${me ? '' : `data-scr="${p.sid}" data-suid="${p.uid}"`}>${body}<span class="live">AO VIVO</span><span class="nm">${ic('screen')}Tela de ${esc(nameOf(p.uid))}${!me && sv !== undefined ? `<span class="vol-tag">${sv === 0 ? '🔇' : sv + '%'}</span>` : ''}</span>${!me && watching ? `<button class="tstop" data-act="unwatchScreen" data-sid="${p.sid}" title="Parar de assistir">⏹ Parar de assistir</button><button class="tvol" data-act="screenMenu" data-sid="${p.sid}" title="Volume da tela (ou botão direito na tela)">${ic('voice')}</button>` : ''}${me && V.ownPreview ? `<button class="tstop" data-act="ownPreview" title="Esconder a prévia (economiza o PC)">Esconder prévia</button>` : ''}${scrStream ? `<button class="fs" data-act="fullscreen" data-key="screen:${p.sid}" title="Tela cheia">${ic('max')}</button>` : ''}</div>`, stream: scrStream, vkey: 'screen:' + p.sid });
    }
  }
  const focus = S.focusTile && tiles.find(t => t.key === S.focusTile);
  const ctrls = `<div class="stage-ctrls"><div class="stage-pill">
    <button class="ctrl ${V.muted ? 'off' : ''}" data-act="mute" data-tip="${V.muted ? 'Ativar microfone' : 'Silenciar microfone'}">${ic(V.muted ? 'micOff' : 'mic')}</button>
    <button class="ctrl ${V.deaf ? 'off' : ''}" data-act="deafen" data-tip="${V.deaf ? 'Voltar a ouvir' : 'Parar de ouvir'}">${ic(V.deaf ? 'headOff' : 'head')}</button>
    <span class="ctrl-sep"></span>
    <button class="ctrl ${V.cam ? 'on' : ''}" data-act="toggleCam" data-tip="${V.cam ? 'Desligar câmera' : 'Ligar câmera'}">${ic(V.cam ? 'cam' : 'camOff')}</button>
    <button class="ctrl ${V.screen ? 'on' : ''}" data-act="toggleScreen" data-tip="${V.screen ? 'Parar de compartilhar' : 'Compartilhar tela'}">${ic('screen')}</button>
    <button class="ctrl" data-act="soundboard" data-tip="Central de Áudio">${ic('board')}</button>
    <button class="ctrl fun-ctrl" data-act="games" data-tip="Jogos da call e roleta">🎮</button>
    <button class="ctrl" data-act="mixer" data-tip="Mixer: volume de cada pessoa">${ic('sliders')}</button>
    <button class="ctrl" data-act="voiceSettings" data-tip="Configurar voz e vídeo">${ic('gear')}</button>
    <span class="ctrl-sep"></span>
    <button class="ctrl hang" data-act="leaveVoice" data-tip="Sair da call">${ic('hang')}</button></div></div>`;
  const sbw = SB.who && SB.who.until > Date.now() ? `<div class="sb-who">${esc(SB.who.emoji || '🔊')} <b>${esc(nameOf(SB.who.uid))}</b> tocou <b>${esc(SB.who.name)}</b></div>` : '';
  const calling = V.calling && peers.length <= 1 ? `<p style="text-align:center;margin:0;padding-top:12px" class="muted">Chamando ${esc(roomName(roomId))}...</p>` : '';
  // grade que ocupa o espaço: 1 → tudo, 2 → lado a lado, 3-4 → 2x2, 5-6 → 3x2, 7-9 → 3x3...
  const n = tiles.length, cols = n <= 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4, rows = Math.ceil(n / cols);
  slot.innerHTML = `<div class="stage ${isDm ? 'mini' : ''}" style="${isDm ? '' : 'flex:1'}">${calling}${sbw}${djCard(roomId)}<div class="stage-grid ${focus ? 'has-focus' : 'fill'}" style="--cols:${cols};--rows:${rows}">
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
    ringTimeout = setTimeout(() => { if (V.room === dmId && V.calling) { toast('Ninguém atendeu.'); leaveVoice('ninguém atendeu a chamada'); } }, 35000);
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

/* =============== Central de Áudio (soundboard) ===============
   Quem clica num som avisa o servidor; o servidor confere permissão e anti-spam e manda o aviso só para quem
   está na mesma call. Cada pessoa toca o arquivo no próprio app, no volume de Central de Áudio que escolheu.
   (É assim que o Soundboard do Discord funciona: o som não passa pelo microfone, então não é cortado pela
   supressão de ruído, não perde qualidade e cada um controla o volume.) */
const SOUND_MAX = 30, SOUND_MS = 7000, STICKER_MAX = 60;
const soundsFor = roomId => {
  const g = groupOfChannel(roomId);
  if (g) return (g.sounds || []).map(s => ({ ...s, gid: g.id, gname: g.name }));
  // call direta: sons de todos os seus grupos
  return Object.values(S.groups).flatMap(x => (x.sounds || []).map(s => ({ ...s, gid: x.id, gname: x.name })));
};
async function soundBuffer(url) {
  if (SB.cache.has(url)) return SB.cache.get(url);
  const p = (async () => { const c = audioCtx(); const ab = await (await fetch(url)).arrayBuffer(); return await c.decodeAudioData(ab); })();
  SB.cache.set(url, p); p.catch(() => SB.cache.delete(url));
  if (SB.cache.size > 60) SB.cache.delete(SB.cache.keys().next().value);
  return p;
}
// toca um som localmente (prévia ou som recebido da call)
async function playSoundLocal(url, vol = 1, uid = null) {
  const c = audioCtx(); if (!c) return null;
  try {
    const buf = await soundBuffer(url);
    if (SB.playing.size >= 4) { const [k, x] = SB.playing.entries().next().value; try { x.src.stop(); } catch {} SB.playing.delete(k); }
    const src = c.createBufferSource(), g = c.createGain(); src.buffer = buf; g.gain.value = clamp(vol, 0, 1);
    src.connect(g).connect(c.destination); applySink();
    const key = Math.random().toString(36).slice(2); SB.playing.set(key, { src, uid });
    src.onended = () => { SB.playing.delete(key); renderStageSoon(); };
    src.start(); return key;
  } catch (e) { toast('Não consegui tocar esse som.', true); return null; }
}
function stopSoundsOf(uid) { SB.playing.forEach((x, k) => { if (!uid || x.uid === uid) { try { x.src.stop(); } catch {} SB.playing.delete(k); } }); }
function onSoundPlayed(ev) {
  if (ev.roomId !== V.room) return;
  SB.who = { uid: ev.uid, name: ev.name, emoji: ev.emoji, until: Date.now() + Math.max(1200, ev.duration) };
  renderStageSoon(); setTimeout(renderStageSoon, Math.max(1200, ev.duration) + 50);
  $$(`[data-speak]`).forEach(el => { const p = (S.voice[V.room] || []).find(x => x.sid === el.dataset.speak); if (p && p.uid === ev.uid) { el.classList.remove('sb-ping'); void el.offsetWidth; el.classList.add('sb-ping'); } });
  if (V.deaf || !prefs.sbOn || (prefs.umute && prefs.umute[ev.uid])) return;
  playSoundLocal(ev.url, (prefs.sbVol / 100) * (ev.volume / 100) * clamp(prefs.outVol ?? 100, 0, 200) / 100, ev.uid);
}
async function playSoundInCall(id) {
  if (!V.room) return toast('Entre numa call para tocar sons para todo mundo.', true);
  const r = await emit('sound:play', { id });
  if (!r.ok) toast(r.erro, true);
}
function soundboardPanel(anchor) {
  const list = V.room ? soundsFor(V.room) : (curGroup()?.sounds || []).map(s => ({ ...s, gid: curGroup().id }));
  const cats = [...new Set(list.map(s => s.category || 'Geral'))];
  let cat = SB.cat && cats.includes(SB.cat) ? SB.cat : 'Todos';
  const g = V.room ? groupOfChannel(V.room) : curGroup();
  const canManage = g && gCan(g, 'manageMedia');
  const p = pop(`<div class="sb-h"><b>Central de Áudio</b><span class="muted small">${V.room ? 'Clique para tocar para todos na call' : 'Clique para ouvir só você (prévia)'}</span></div>
    <div class="sb-cats" id="sbCats"></div><div class="sb-grid" id="sbGrid"></div>
    <div class="sb-f"><label class="sb-vol" title="Volume da Central de Áudio (só para você)">${ic('voice')}<input type="range" id="sbVol" min="0" max="100" step="5" value="${prefs.sbVol}"></label>
      ${V.room ? `<button class="btn sm ghost" id="sbStop">Parar meus sons</button>` : ''}${canManage ? `<button class="btn sm" id="sbMng">Gerenciar</button>` : ''}</div>`, anchor, 'sboard', 'above');
  const draw = () => {
    $('#sbCats', p).innerHTML = ['Todos', ...cats].map(c => `<button class="${c === cat ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
    const items = list.filter(s => cat === 'Todos' || (s.category || 'Geral') === cat);
    $('#sbGrid', p).innerHTML = items.length ? items.map(s => `<button class="sb-btn" data-snd="${s.id}" title="${esc(s.name)}${s.gname ? ' · ' + esc(s.gname) : ''}"><span class="sb-e">${esc(s.emoji || '🔊')}</span><span class="sb-n">${esc(s.name)}</span><span class="sb-pv" data-pv="${s.id}" title="Ouvir só para mim">${ic('voice')}</span></button>`).join('')
      : `<div class="sb-empty"><div style="font-size:34px">🎛️</div><p>${list.length ? 'Nada nesta categoria.' : 'Nenhum som ainda.'}</p>${canManage ? '<button class="btn sm primary" id="sbAdd">Adicionar som</button>' : '<span class="muted small">Peça para quem gerencia o grupo adicionar.</span>'}</div>`;
    const add = $('#sbAdd', p); if (add) add.onclick = () => { closePops(); openGroupSettings(g.id, 'sons'); };
    reposPop(p);
  };
  draw();
  p.onclick = e => {
    const c = e.target.closest('[data-cat]'); if (c) { cat = SB.cat = c.dataset.cat; draw(); return; }
    const pv = e.target.closest('[data-pv]'); if (pv) { e.stopPropagation(); const s = list.find(x => x.id === pv.dataset.pv); if (s) playSoundLocal(s.url, prefs.sbVol / 100 * s.volume / 100); return; }
    const b = e.target.closest('[data-snd]'); if (!b) return;
    const s = list.find(x => x.id === b.dataset.snd); if (!s) return;
    if (V.room) { b.classList.add('fired'); setTimeout(() => b.classList.remove('fired'), 400); playSoundInCall(s.id); }
    else playSoundLocal(s.url, prefs.sbVol / 100 * s.volume / 100);
  };
  $('#sbVol', p).oninput = e => { prefs.sbVol = +e.target.value; savePrefs(); };
  if ($('#sbStop', p)) $('#sbStop', p).onclick = () => emit('sound:stop');
  if ($('#sbMng', p)) $('#sbMng', p).onclick = () => { closePops(); openGroupSettings(g.id, 'sons'); };
}

/* ---- mixer da call ----
   Painel fixo (não some ao clicar fora) que acompanha a call: quem entra ganha uma linha, quem sai some.
   Cada linha é criada uma vez e só atualizada (nome, mudo, tela) — os controles não são recriados enquanto
   você arrasta. Volumes de pessoas, da saída e da Central de Áudio mudam só o que VOCÊ escuta (são aplicados
   no <audio>/ganho de cada fluxo recebido, em applyVolumes). O volume do seu microfone muda o que os outros
   escutam e fica separado. */
const MX = { el: null, iv: 0 };
const mxPct = v => `${Math.round(v)}%`;
function mixerToggle() {
  if (!V.room) return toast('Entre numa call para usar o mixer.', true);
  if (MX.el) { mixerClose(); return; }
  prefs.mixerOpen = true; savePrefs(); mixerOpen();
}
function mixerOpen() {
  if (MX.el || !V.room) return;
  const el = document.createElement('section'); el.className = 'mixer' + (prefs.mixerMin ? ' min' : ''); el.setAttribute('aria-label', 'Mixer de áudio');
  el.innerHTML = `<header class="mx-hd"><b>${ic('sliders')}Mixer</b><span class="mx-n"></span>
      <button class="icon-btn" data-mx="min" aria-label="Recolher ou expandir">${ic('down')}</button><button class="icon-btn" data-mx="close" aria-label="Fechar mixer">${ic('x')}</button></header>
    <div class="mx-body">
      <div class="mx-grp"><div class="mx-t">Só para você</div>
        <div class="mx-ctl"><span>Saída da call</span><input type="range" min="0" max="200" step="5" data-k="out" aria-label="Volume geral da call"><output></output></div>
        <div class="mx-ctl"><span>Central de Áudio</span><input type="range" min="0" max="100" step="5" data-k="sb" aria-label="Volume da Central de Áudio"><output></output></div></div>
      <div class="mx-grp"><div class="mx-t">Seu microfone · o que os outros escutam</div>
        <div class="mx-me"><button class="icon-btn" data-mx="mute" aria-label="Silenciar meu microfone"></button><div class="mx-bar"><i data-lvl="me"></i></div></div>
        <div class="mx-ctl"><span>Volume</span><input type="range" min="0" max="200" step="5" data-k="mic" aria-label="Volume do meu microfone"><output></output></div></div>
      <div class="mx-grp"><div class="mx-t">Pessoas <span class="mx-cnt"></span></div><div class="mx-list"></div><p class="mx-empty muted small">Ninguém além de você por enquanto.</p></div>
      <div class="mx-foot"><button class="btn sm ghost" data-mx="reset">Voltar tudo a 100%</button><button class="btn sm ghost" data-act="voiceSettings">Mais opções</button></div>
    </div>`;
  document.body.appendChild(el); MX.el = el;
  // um ouvinte de cada tipo, no painel inteiro (as linhas novas não ganham ouvintes próprios)
  el.addEventListener('input', e => {
    const t = e.target; if (t.type !== 'range') return;
    const v = +t.value; const out = t.nextElementSibling; if (out) out.textContent = mxPct(v);
    const k = t.dataset.k, uid = t.closest('[data-uid]')?.dataset.uid;
    if (k === 'out') { prefs.outVol = v; applyVolumes(); }
    else if (k === 'sb') prefs.sbVol = v;
    else if (k === 'mic') { prefs.micGain = v; setMicGain(); }
    else if ((k === 'vol' || k === 'svol') && uid) { prefs[k] = { ...(prefs[k] || {}) }; if (v === 100) delete prefs[k][uid]; else prefs[k][uid] = v; applyVolumes(); }
    savePrefs();
  });
  el.addEventListener('change', () => renderSide());
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-mx]'); if (!b) return;
    const a = b.dataset.mx, uid = b.closest('[data-uid]')?.dataset.uid;
    if (a === 'close') mixerClose();
    if (a === 'min') { prefs.mixerMin = !prefs.mixerMin; savePrefs(); el.classList.toggle('min', prefs.mixerMin); }
    if (a === 'mute') toggleMute();
    if (a === 'umute' && uid) { prefs.umute = { ...(prefs.umute || {}) }; if (prefs.umute[uid]) delete prefs.umute[uid]; else prefs.umute[uid] = true; savePrefs(); applyVolumes(); renderSide(); renderStageSoon(); }
    if (a === 'reset') { prefs.vol = {}; prefs.svol = {}; prefs.umute = {}; prefs.outVol = 100; prefs.sbVol = 70; savePrefs(); applyVolumes(); renderSide(); renderStageSoon(); $$('input[type=range]', el).forEach(r => r.dataset.set = ''); }
    mixerSync();
  });
  mixerSync();
  // medidores de nível: um só intervalo, só enquanto o painel está aberto e expandido
  MX.iv = setInterval(() => {
    if (!MX.el || prefs.mixerMin) return;
    const room = S.voice[V.room] || [];
    $$('[data-lvl]', MX.el).forEach(bar => {
      const sid = bar.dataset.lvl === 'me' ? S.mySid : bar.dataset.lvl, l = V.levels.get(sid), p = room.find(x => x.sid === sid);
      const quiet = !l || (sid === S.mySid ? !(V.mic && V.mic.getAudioTracks().some(t => t.enabled)) : (p && (p.muted || p.deafened)));
      bar.style.width = quiet ? '0%' : levelOf(l.an, l.buf) + '%';
    });
  }, 90);
}
function mixerClose() {
  clearInterval(MX.iv); MX.iv = 0; MX.el?.remove(); MX.el = null;
  if (V.room) { prefs.mixerOpen = false; savePrefs(); }
}
// deixa o painel igual ao estado atual da call, mexendo só no que mudou
function mixerSync() {
  const el = MX.el; if (!el) return;
  if (!V.room) { clearInterval(MX.iv); MX.iv = 0; el.remove(); MX.el = null; return; }
  const setR = (r, v) => { if (document.activeElement === r) return; if (r.value !== String(v)) r.value = v; const o = r.nextElementSibling; if (o) o.textContent = mxPct(v); };
  setR($('[data-k="out"]', el), prefs.outVol); setR($('[data-k="sb"]', el), prefs.sbVol); setR($('[data-k="mic"]', el), prefs.micGain);
  const mb = $('[data-mx="mute"]', el); const off = V.muted || V.deaf || !V.mic;
  mb.innerHTML = ic(off ? 'micOff' : 'mic'); mb.classList.toggle('on', off); mb.dataset.tip = off ? 'Ativar microfone' : 'Silenciar microfone';
  const peers = (S.voice[V.room] || []).filter(p => p.sid !== S.mySid);
  $('.mx-n', el).textContent = `${peers.length + 1} na call`; $('.mx-cnt', el).textContent = `· ${peers.length}`;
  $('.mx-empty', el).hidden = peers.length > 0;
  const list = $('.mx-list', el);
  // quem saiu
  $$('[data-uid]', list).forEach(row => { if (!peers.some(p => p.sid === row.dataset.sid)) row.remove(); });
  for (const p of peers) {
    let row = $(`[data-sid="${CSS.escape(p.sid)}"]`, list);
    if (!row) {
      row = document.createElement('div'); row.className = 'mx-row'; row.dataset.uid = p.uid; row.dataset.sid = p.sid;
      row.innerHTML = `<div class="mx-who">${av(p.uid, 32, false, 'calm').replace('class="av', `data-speak="${p.sid}" class="av`)}<div class="mx-id"><b></b><span class="mx-st"></span><div class="mx-bar"><i data-lvl="${p.sid}"></i></div></div><button class="icon-btn" data-mx="umute"></button></div>
        <div class="mx-ctl"><span>Voz</span><input type="range" min="0" max="200" step="5" data-k="vol" aria-label="Volume da voz de ${esc(nameOf(p.uid))}"><output></output></div>
        <div class="mx-ctl mx-scr"><span>Tela</span><input type="range" min="0" max="200" step="5" data-k="svol" aria-label="Volume da tela de ${esc(nameOf(p.uid))}"><output></output></div>`;
      list.appendChild(row);
    }
    const um = !!(prefs.umute && prefs.umute[p.uid]);
    $('.mx-id b', row).textContent = nameOf(p.uid);
    const vp = V.peers.get(p.sid), conn = vp?.state;
    $('.mx-st', row).innerHTML = conn === 'failed' || (vp?.warned && conn !== 'connected') ? '<i class="mx-live bad"></i>sem conexão de áudio' : conn && conn !== 'connected' ? '<i class="mx-live wait"></i>conectando...' : p.deafened ? `${ic('headOff')}sem áudio` : p.muted ? `${ic('micOff')}microfone mudo` : um ? `${ic('micOff')}silenciado para você` : '<i class="mx-live"></i>conectado';
    const ub = $('[data-mx="umute"]', row); ub.innerHTML = ic(um ? 'micOff' : 'voice'); ub.classList.toggle('on', um); ub.dataset.tip = um ? 'Voltar a ouvir' : 'Silenciar para mim';
    row.classList.toggle('muted', um);
    setR($('[data-k="vol"]', row), volOf(p.uid, 'voice'));
    const scr = $('.mx-scr', row); scr.hidden = !p.screen; if (p.screen) setR($('[data-k="svol"]', row), volOf(p.uid, 'screen'));
  }
}


/* =============== figurinhas e GIFs =============== */
const favs = () => ({ stickers: [], gifs: [], recentStickers: [], recentGifs: [], ...(S.me.favs || {}) });
const allStickers = () => Object.values(S.groups).flatMap(g => (g.stickers || []).map(s => ({ ...s, gid: g.id, gname: g.name })));
function saveFavs(patch) { const f = { ...favs(), ...patch }; S.me.favs = f; emit('favs:update', patch); return f; }
async function sendSticker(st) {
  const cid = viewingCid(); if (!cid) return;
  closePops();
  const r = await emit('message:send', { cid, sticker: { gid: st.gid, id: st.id }, replyTo: S.reply });
  if (!r.ok) return toast(r.erro, true);
  S.reply = null; renderReplyBar();
  saveFavs({ recentStickers: [st.id, ...favs().recentStickers.filter(x => x !== st.id)].slice(0, 24) });
}
async function sendGif(gf) {
  const cid = viewingCid(); if (!cid) return;
  closePops();
  const r = await emit('message:send', { cid, gif: { url: gf.url, w: gf.w, h: gf.h, title: gf.title }, replyTo: S.reply });
  if (!r.ok) return toast(r.erro, true);
  S.reply = null; renderReplyBar();
  saveFavs({ recentGifs: [gf, ...favs().recentGifs.filter(x => x.url !== gf.url)].slice(0, 24) });
}
function stickerPicker(anchor) {
  let tab = SB.stTab || 'todas';
  const p = pop(`<div class="pk-h"><b>Figurinhas</b><input class="input pk-q" id="stQ" placeholder="Procurar figurinha" autocomplete="off"></div><div class="pk-tabs" id="stTabs"></div><div class="pk-grid st" id="stGrid"></div>`, anchor, 'picker', 'above');
  const draw = () => {
    const all = allStickers(), f = favs(), q = $('#stQ', p).value.trim().toLowerCase();
    const packs = [...new Set(all.map(s => s.gname + ' · ' + (s.pack || 'Geral')))];
    $('#stTabs', p).innerHTML = [['todas', 'Todas'], ['fav', '★ Favoritas'], ['rec', 'Recentes'], ...packs.map(k => [k, k])].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${esc(k)}">${esc(l)}</button>`).join('');
    let list = tab === 'fav' ? f.stickers.map(id => all.find(s => s.id === id)).filter(Boolean)
      : tab === 'rec' ? f.recentStickers.map(id => all.find(s => s.id === id)).filter(Boolean)
      : tab === 'todas' ? all : all.filter(s => s.gname + ' · ' + (s.pack || 'Geral') === tab);
    if (q) list = list.filter(s => (s.name + ' ' + s.pack).toLowerCase().includes(q));
    const g = curGroup();
    $('#stGrid', p).innerHTML = list.length ? list.map(s => `<button class="pk-it" data-st="${s.id}" title="${esc(s.name)} · ${esc(s.gname)}"><img src="${esc(s.url)}" alt="${esc(s.name)}" loading="lazy"><span class="pk-star ${f.stickers.includes(s.id) ? 'on' : ''}" data-fav="${s.id}" title="Favoritar">★</span></button>`).join('')
      : `<div class="sb-empty"><div style="font-size:34px">🗂️</div><p>${tab === 'fav' ? 'Clique na estrela de uma figurinha para favoritar.' : tab === 'rec' ? 'As figurinhas que você mandar aparecem aqui.' : 'Nenhuma figurinha ainda.'}</p>${g && gCan(g, 'manageMedia') && tab === 'todas' ? '<button class="btn sm primary" id="stAdd">Adicionar figurinhas</button>' : ''}</div>`;
    const add = $('#stAdd', p); if (add) add.onclick = () => { closePops(); openGroupSettings(g.id, 'figurinhas'); };
  };
  draw();
  $('#stQ', p).oninput = draw;
  p.onclick = e => {
    const t = e.target.closest('[data-tab]'); if (t) { tab = SB.stTab = t.dataset.tab; draw(); return; }
    const fv = e.target.closest('[data-fav]'); if (fv) { e.stopPropagation(); const id = fv.dataset.fav, f = favs(); saveFavs({ stickers: f.stickers.includes(id) ? f.stickers.filter(x => x !== id) : [id, ...f.stickers].slice(0, 60) }); draw(); return; }
    const it = e.target.closest('[data-st]'); if (it) { const s = allStickers().find(x => x.id === it.dataset.st); if (s) sendSticker(s); }
  };
  setTimeout(() => $('#stQ', p)?.focus(), 30);
}
function gifPicker(anchor) {
  let tab = 'trend', items = [], next = 0, loading = false, configured = true, q = '', gen = 0;
  const p = pop(`<div class="pk-h"><b>GIFs</b><input class="input pk-q" id="gfQ" placeholder="Procurar GIFs" autocomplete="off"></div><div class="pk-tabs" id="gfTabs"></div><div class="pk-grid gf" id="gfGrid"></div><div class="pk-attr" id="gfAttr"></div>`, anchor, 'picker', 'above');
  const card = x => `<button class="pk-it gif" data-gu="${esc(x.url)}" title="${esc(x.title || '')}"><img src="${esc(x.preview || x.url)}" alt="${esc(x.title || 'GIF')}" loading="lazy"><span class="pk-star ${favs().gifs.some(f => f.url === x.url) ? 'on' : ''}" data-gfav="${esc(x.url)}" title="Favoritar">★</span></button>`;
  const draw = () => {
    $('#gfTabs', p).innerHTML = [['trend', 'Em alta'], ['fav', '★ Favoritos'], ['rec', 'Recentes']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('') + (q ? `<button class="on">“${esc(q)}”</button>` : '');
    const f = favs();
    const list = tab === 'fav' ? f.gifs : tab === 'rec' ? f.recentGifs : items;
    const grid = $('#gfGrid', p);
    if (tab === 'trend' && !configured) grid.innerHTML = `<div class="sb-empty"><div style="font-size:34px">🔑</div><p>A busca de GIFs ainda não foi ligada neste servidor.</p><span class="muted small">Quem cuida do servidor precisa colocar a chave do GIPHY (ou do Tenor) nos segredos da função <b>anarchy-db</b> no Supabase. Favoritos e recentes continuam funcionando.</span></div>`;
    else grid.innerHTML = list.length ? list.map(card).join('') : `<div class="sb-empty"><p>${loading ? 'Carregando...' : tab === 'fav' ? 'Clique na estrela de um GIF para favoritar.' : tab === 'rec' ? 'Os GIFs que você mandar aparecem aqui.' : 'Nada encontrado.'}</p></div>`;
    $('#gfAttr', p).textContent = tab === 'trend' && configured ? (SB.gifProvider === 'tenor' ? 'Via Tenor' : 'Powered by GIPHY') : '';
  };
  const load = async more => {
    if (loading) return; loading = true; const my = ++gen; if (!more) { items = []; next = 0; } draw();
    try {
      const r = await fetch(`/api/gifs?q=${encodeURIComponent(q)}&pos=${next}`, { headers: { 'x-token': S.token || '' } });
      const j = await r.json(); if (my !== gen) return;
      if (!r.ok) { toast(j.erro || 'Não consegui buscar GIFs.', true); return; }
      configured = j.configured !== false; SB.gifProvider = j.provider;
      items = more ? [...items, ...(j.items || [])] : (j.items || []); next = j.next || next + 24;
    } catch { toast('Sem conexão para buscar GIFs.', true); }
    finally { if (my === gen) { loading = false; draw(); } }
  };
  let tq; $('#gfQ', p).oninput = e => { clearTimeout(tq); tq = setTimeout(() => { q = e.target.value.trim(); tab = 'trend'; load(false); }, 350); };
  $('#gfGrid', p).addEventListener('scroll', e => { const g = e.target; if (tab === 'trend' && configured && g.scrollTop + g.clientHeight > g.scrollHeight - 120) load(true); });
  p.onclick = e => {
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; draw(); return; }
    const all = () => [...items, ...favs().gifs, ...favs().recentGifs];
    const fv = e.target.closest('[data-gfav]'); if (fv) { e.stopPropagation(); const u = fv.dataset.gfav, f = favs(); const x = all().find(i => i.url === u); saveFavs({ gifs: f.gifs.some(i => i.url === u) ? f.gifs.filter(i => i.url !== u) : [x, ...f.gifs].filter(Boolean).slice(0, 60) }); draw(); return; }
    const it = e.target.closest('[data-gu]'); if (it) { const x = all().find(i => i.url === it.dataset.gu); if (x) sendGif(x); }
  };
  load(false);
  setTimeout(() => $('#gfQ', p)?.focus(), 30);
}

/* ---- configurações do grupo: Central de Áudio e figurinhas ---- */
const SOUND_IN_MAX = 25 * 1024 * 1024; // arquivo de entrada (o trecho cortado é que precisa caber em 1 MB)
function gsSons(g, b) {
  const can = gCan(g, 'manageMedia'); const list = g.sounds || [];
  b.innerHTML = `<h2>Central de Áudio</h2><p class="muted set-sub">Sons que qualquer pessoa na call pode tocar para todo mundo. ${list.length}/${SOUND_MAX} sons.</p>
    ${can ? `<div class="set-card"><h3>Adicionar som</h3>
      <div class="sn-drop" id="snDrop" tabindex="0" role="button" aria-label="Escolher arquivo de áudio">${ic('voice')}<b>Solte um áudio aqui</b><span>ou clique para escolher · MP3, WAV, OGG, M4A, WEBM · até 25 MB</span><span class="muted small">Se for maior que ${SOUND_MS / 1000} segundos, você escolhe o trecho logo abaixo.</span></div>
      <div class="sn-editor" id="snEd" hidden>
        <div class="sn-file"><b id="snFname"></b><span class="muted small" id="snFdur"></span><button class="btn sm ghost" id="snSwap">Trocar arquivo</button></div>
        <canvas class="sn-over" id="snOver" height="34" aria-label="Arquivo inteiro: clique para ir até um ponto"></canvas>
        <div class="sn-wave" id="snWaveBox"><canvas id="snWave" height="110"></canvas>
          <div class="sn-sel" id="snSel"><i class="sn-h l" data-h="l" aria-label="Início do trecho"></i><i class="sn-h r" data-h="r" aria-label="Fim do trecho"></i><span class="sn-len" id="snLen"></span></div>
          <i class="sn-ph" id="snPh" hidden></i></div>
        <div class="sn-ctl">
          <button class="btn sm primary" id="snPlay">${ic('voice')}Ouvir trecho</button>
          <label class="sn-t">Início <input type="number" id="snA" min="0" step="0.1"> s</label>
          <label class="sn-t">Fim <input type="number" id="snB" min="0" step="0.1"> s</label>
          <label class="sn-fade"><input type="checkbox" id="snFade" checked> Suavizar início e fim</label>
        </div>
        <p class="muted small" style="margin:0">Arraste as bordas para cortar, ou arraste o trecho inteiro. Máximo de ${SOUND_MS / 1000} segundos.</p>
      </div>
      <div class="pe-2"><label class="field">Nome<input id="snName" maxlength="32" placeholder="ex.: buzina"></label><label class="field">Categoria<input id="snCat" maxlength="24" list="snCats" placeholder="Geral"><datalist id="snCats">${[...new Set(['Geral', 'Memes', 'Reações', 'Música', ...list.map(s => s.category)])].map(c => `<option value="${esc(c)}">`).join('')}</datalist></label></div>
      <div class="field">Ícone<div class="emoji-grid sn-emo" id="snEmo">${'🔊 📯 🥁 🎺 🎸 👏 😂 😱 💀 🔥 🚨 🐐 🦆 🐸 💥 🎉'.split(' ').map((e, i) => `<button type="button" data-e="${e}" class="${i ? '' : 'on'}">${e}</button>`).join('')}</div></div>
      <div class="field">Volume do som<div class="range-row"><input type="range" id="snVol" min="10" max="100" step="5" value="100"><output id="snVolO">100%</output></div></div>
      <div style="display:flex;justify-content:flex-end"><button class="btn primary" id="snAdd" disabled>Adicionar à Central</button></div></div>` : `<div class="set-card"><p class="muted" style="margin:0">Você pode tocar os sons numa call. Para adicionar ou apagar, precisa da permissão <b>Gerenciar Central de Áudio e figurinhas</b>.</p></div>`}
    <div class="set-card"><h3>Sons do grupo</h3>${list.length ? `<div class="sn-list">${list.map(s => `<div class="sn-it"><span class="sb-e">${esc(s.emoji || '🔊')}</span><div><b>${esc(s.name)}</b><span class="muted small">${esc(s.category || 'Geral')} · ${(s.duration / 1000).toFixed(1)} s · ${s.volume}% · por ${esc(nameOf(s.createdBy))}</span></div>
      <button class="icon-btn" data-snp="${s.id}" data-tip="Ouvir">${ic('voice')}</button>${can ? `<button class="icon-btn" data-snd-del="${s.id}" data-tip="Apagar" style="color:var(--danger)">${ic('trash')}</button>` : ''}</div>`).join('')}</div>` : '<p class="muted" style="margin:0">Nenhum som ainda.</p>'}</div>`;
  b.onclick = async e => {
    const pv = e.target.closest('[data-snp]'); if (pv) { const s = list.find(x => x.id === pv.dataset.snp); if (s) playSoundLocal(s.url, prefs.sbVol / 100 * s.volume / 100); return; }
    const del = e.target.closest('[data-snd-del]'); if (del) { const s = list.find(x => x.id === del.dataset.sndDel); if (s && await confirmBox('Apagar som', `Apagar "${s.name}" da Central de Áudio?`, 'Apagar')) act('sound:delete', { gid: g.id, id: s.id }, 'Som apagado.'); }
  };
  if (!can) return;
  const ed = soundEditor();
  const draft = { emoji: '🔊' };
  $('#snEmo').onclick = e => { const x = e.target.closest('[data-e]'); if (!x) return; draft.emoji = x.dataset.e; $$('#snEmo button').forEach(y => y.classList.toggle('on', y === x)); };
  $('#snVol').oninput = e => { $('#snVolO').textContent = e.target.value + '%'; ed.setVolume(+e.target.value / 100); };
  const ready = () => { $('#snAdd').disabled = !(ed.loaded() && $('#snName').value.trim()); };
  $('#snName').oninput = ready;
  ed.onLoad = name => { if (!$('#snName').value.trim()) $('#snName').value = name.replace(/\.[^.]+$/, '').slice(0, 32); ready(); };
  $('#snAdd').onclick = async () => {
    $('#snAdd').disabled = true; $('#snAdd').textContent = 'Preparando...';
    try {
      const out = await ed.export(); // trecho escolhido (ou o arquivo original, se não precisou cortar)
      $('#snAdd').textContent = 'Enviando...';
      const up = await api('/api/upload-audio', { data: out.data });
      const r = await act('sound:add', { gid: g.id, name: $('#snName').value, category: $('#snCat').value, emoji: draft.emoji, url: up.url, duration: out.ms, volume: +$('#snVol').value }, 'Som adicionado.');
      if (r.ok) { ed.stop(); return; } // o grupo atualiza e a tela redesenha sozinha
    } catch (e) { toast(e.message, true); }
    $('#snAdd').disabled = false; $('#snAdd').textContent = 'Adicionar à Central';
  };
}

/* Editor de corte: carrega o áudio, desenha a onda, deixa escolher um trecho de até 7 s, ouvir e exportar em WAV.
   Em cima, a onda do arquivo inteiro (para músicas longas); embaixo, a parte em volta do trecho, maior. */
function soundEditor() {
  const S_ = { buf: null, file: null, name: '', a: 0, b: 0, view: [0, 0], vol: 1, src: null, raf: 0, overImg: null };
  const MIN = .2, MAXL = SOUND_MS / 1000;
  const drop = $('#snDrop'), edEl = $('#snEd'), wave = $('#snWave'), over = $('#snOver'), sel = $('#snSel'), ph = $('#snPh'), box = $('#snWaveBox');
  const api_ = { onLoad: null, loaded: () => !!S_.buf, setVolume: v => { S_.vol = v; }, stop, export: exportClip };
  const fmt = s => (Math.round(s * 10) / 10).toFixed(1);
  const choose = async () => { const f = await pickFile('audio/*,.mp3,.wav,.ogg,.webm,.m4a,.aac,.flac,.opus'); if (f) load(f); };
  drop.onclick = choose; drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } };
  $('#snSwap').onclick = choose;
  // soltar arquivo: tanto na caixa quanto no editor
  [drop, edEl].forEach(z => {
    z.addEventListener('dragover', e => { if ([...e.dataTransfer.items].some(i => i.kind === 'file')) { e.preventDefault(); z.classList.add('over'); } });
    z.addEventListener('dragleave', () => z.classList.remove('over'));
    z.addEventListener('drop', e => { e.preventDefault(); z.classList.remove('over'); const f = [...e.dataTransfer.files][0]; if (f) load(f); });
  });
  async function load(f) {
    if (!/^audio\//.test(f.type) && !/\.(mp3|wav|ogg|webm|m4a|aac|flac|opus)$/i.test(f.name)) return toast('Esse arquivo não é de áudio.', true);
    if (f.size > SOUND_IN_MAX) return toast('O arquivo passa de 25 MB.', true);
    stop(); drop.classList.add('busy');
    try {
      const buf = await audioCtx().decodeAudioData(await f.arrayBuffer());
      Object.assign(S_, { buf, file: f, name: f.name, a: 0, b: Math.min(buf.duration, MAXL), overImg: null });
      if (buf.duration > MAXL) toast(`O áudio tem ${fmt(buf.duration)} s: escolha o trecho de até ${MAXL} s.`);
      drop.hidden = true; edEl.hidden = false;
      $('#snFname').textContent = f.name; $('#snFdur').textContent = `${fmt(buf.duration)} s`;
      fitView(); draw(); api_.onLoad && api_.onLoad(f.name);
    } catch { toast('Não consegui ler esse áudio. Tente MP3, WAV ou OGG.', true); }
    finally { drop.classList.remove('busy'); }
  }
  // janela da onda de baixo: mostra o trecho com folga (no mínimo 10 s, ou o arquivo todo se for curto)
  function fitView() {
    const d = S_.buf.duration, len = Math.min(d, Math.max(10, (S_.b - S_.a) * 2.5)), mid = (S_.a + S_.b) / 2;
    let v0 = clamp(mid - len / 2, 0, d - len); S_.view = [v0, v0 + len];
  }
  function peaks(cv, t0, t1) {
    const w = cv.width = cv.clientWidth * devicePixelRatio || 600, h = cv.height = (cv.clientHeight || 110) * devicePixelRatio;
    const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, w, h);
    const b = S_.buf, sr = b.sampleRate, chs = [...Array(b.numberOfChannels)].map((_, i) => b.getChannelData(i));
    const s0 = Math.floor(t0 * sr), s1 = Math.min(b.length, Math.ceil(t1 * sr)), per = Math.max(1, (s1 - s0) / w);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#6c7cff';
    for (let x = 0; x < w; x++) {
      let mx = 0; const a = s0 + Math.floor(x * per), z = Math.min(s1, a + Math.ceil(per)), step = Math.max(1, Math.floor((z - a) / 400));
      for (let i = a; i < z; i += step) for (const c of chs) { const v = Math.abs(c[i]); if (v > mx) mx = v; }
      const bh = Math.max(1, mx * h * .92); ctx.fillRect(x, (h - bh) / 2, 1, bh);
    }
  }
  function draw() {
    if (!S_.buf) return;
    const d = S_.buf.duration;
    if (!S_.overImg) { peaks(over, 0, d); S_.overImg = over.getContext('2d').getImageData(0, 0, over.width, over.height); }
    else over.getContext('2d').putImageData(S_.overImg, 0, 0);
    // na onda de cima: retângulo da janela e o trecho escolhido
    const oc = over.getContext('2d'), ow = over.width, oh = over.height;
    oc.fillStyle = 'rgba(255,255,255,.10)'; oc.fillRect(S_.view[0] / d * ow, 0, (S_.view[1] - S_.view[0]) / d * ow, oh);
    oc.fillStyle = 'rgba(62,207,145,.45)'; oc.fillRect(S_.a / d * ow, 0, Math.max(2, (S_.b - S_.a) / d * ow), oh);
    peaks(wave, S_.view[0], S_.view[1]);
    const vl = S_.view[1] - S_.view[0], pct = t => (t - S_.view[0]) / vl * 100;
    sel.style.left = pct(S_.a) + '%'; sel.style.width = (pct(S_.b) - pct(S_.a)) + '%';
    $('#snLen').textContent = fmt(S_.b - S_.a) + ' s';
    if (document.activeElement !== $('#snA')) $('#snA').value = fmt(S_.a);
    if (document.activeElement !== $('#snB')) $('#snB').value = fmt(S_.b);
  }
  // arrastar: bordas mudam início/fim; o meio move o trecho todo; clicar fora leva o trecho até ali
  const tAt = (e, el, t0, t1) => { const r = el.getBoundingClientRect(); return t0 + clamp((e.clientX - r.left) / r.width, 0, 1) * (t1 - t0); };
  box.addEventListener('pointerdown', e => {
    if (!S_.buf) return; e.preventDefault(); box.setPointerCapture(e.pointerId);
    const h = e.target.dataset.h, onSel = e.target.closest('#snSel') && !h, d = S_.buf.duration;
    const t0 = tAt(e, box, ...S_.view), a0 = S_.a, b0 = S_.b;
    if (!h && !onSel) { const len = b0 - a0; S_.a = clamp(t0 - len / 2, 0, d - len); S_.b = S_.a + len; draw(); }
    const move = ev => {
      const t = tAt(ev, box, ...S_.view);
      if (h === 'l') S_.a = clamp(t, Math.max(0, S_.b - MAXL), S_.b - MIN);
      else if (h === 'r') S_.b = clamp(t, S_.a + MIN, Math.min(d, S_.a + MAXL));
      else { const len = S_.b - S_.a, dt = t - t0; S_.a = clamp((onSel ? a0 : S_.a) + (onSel ? dt : 0), 0, d - len); if (!onSel) S_.a = clamp(t - len / 2, 0, d - len); S_.b = S_.a + len; }
      draw();
    };
    const up = () => { box.removeEventListener('pointermove', move); box.removeEventListener('pointerup', up); box.removeEventListener('pointercancel', up); if (S_.a < S_.view[0] || S_.b > S_.view[1]) { fitView(); draw(); } };
    box.addEventListener('pointermove', move); box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
  });
  // onda de cima: clicar/arrastar leva o trecho para aquele ponto do arquivo
  over.addEventListener('pointerdown', e => {
    if (!S_.buf) return; over.setPointerCapture(e.pointerId);
    const go_ = ev => { const d = S_.buf.duration, len = S_.b - S_.a, t = tAt(ev, over, 0, d); S_.a = clamp(t - len / 2, 0, d - len); S_.b = S_.a + len; fitView(); draw(); };
    go_(e); const up = () => { over.removeEventListener('pointermove', go_); over.removeEventListener('pointerup', up); };
    over.addEventListener('pointermove', go_); over.addEventListener('pointerup', up);
  });
  // digitar o início/fim: se passar do outro lado, o trecho anda junto mantendo o tamanho (e nunca passa de 7 s)
  $('#snA').onchange = e => {
    const d = S_.buf.duration, len = S_.b - S_.a; S_.a = clamp(+e.target.value || 0, 0, d - MIN);
    if (S_.b < S_.a + MIN || S_.b - S_.a > MAXL) S_.b = Math.min(d, S_.a + Math.min(len, MAXL));
    if (S_.b - S_.a < MIN) S_.a = S_.b - MIN; fitView(); draw();
  };
  $('#snB').onchange = e => {
    const d = S_.buf.duration, len = S_.b - S_.a; S_.b = clamp(+e.target.value || 0, MIN, d);
    if (S_.b < S_.a + MIN) S_.a = Math.max(0, S_.b - len);
    if (S_.b - S_.a > MAXL) S_.a = S_.b - MAXL; fitView(); draw();
  };
  $('#snPlay').onclick = () => (S_.src ? stop() : play());
  const onResize = () => { if (!edEl.isConnected) { stop(); return removeEventListener('resize', onResize); } if (S_.buf) { S_.overImg = null; draw(); } };
  addEventListener('resize', onResize);
  const fadeS = () => ($('#snFade').checked ? Math.min(.25, (S_.b - S_.a) / 4) : .006); // sempre um fade mínimo: evita "estalo"
  function play() {
    const c = audioCtx(), len = S_.b - S_.a, f = fadeS(), src = c.createBufferSource(), gn = c.createGain(), t = c.currentTime + .03, v = S_.vol * prefs.sbVol / 100;
    src.buffer = S_.buf; src.connect(gn).connect(c.destination);
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(v, t + f); gn.gain.setValueAtTime(v, t + len - f); gn.gain.linearRampToValueAtTime(0, t + len);
    src.start(t, S_.a, len); S_.src = src; $('#snPlay').innerHTML = `${ic('x')}Parar`;
    ph.hidden = false;
    const tick = () => { const p = c.currentTime - t; if (!S_.src || p > len) return stop(); ph.style.left = ((S_.a + Math.max(0, p) - S_.view[0]) / (S_.view[1] - S_.view[0]) * 100) + '%'; S_.raf = requestAnimationFrame(tick); };
    tick(); src.onended = () => stop();
  }
  function stop() {
    if (S_.src) { try { S_.src.stop(); } catch {} S_.src = null; }
    cancelAnimationFrame(S_.raf); if (ph) ph.hidden = true; const pb = $('#snPlay'); if (pb) pb.innerHTML = `${ic('voice')}Ouvir trecho`;
  }
  // exporta: sem corte (arquivo inteiro, até 7 s e 1 MB) manda o original; senão gera WAV mono 44,1 kHz do trecho
  async function exportClip() {
    const b = S_.buf, len = S_.b - S_.a;
    const whole = S_.a < .05 && S_.b > b.duration - .05 && b.duration <= MAXL && S_.file.size <= 1024 * 1024 && !$('#snFade').checked;
    if (whole) return { data: (await readFile(S_.file)).replace(/^data:[^;]*;/, 'data:audio/x;'), ms: Math.round(b.duration * 1000) };
    const sr = 44100, n = Math.ceil(len * sr), oc = new OfflineAudioContext(1, n, sr), src = oc.createBufferSource(), gn = oc.createGain(), f = fadeS();
    src.buffer = b; src.connect(gn).connect(oc.destination);
    gn.gain.setValueAtTime(0, 0); gn.gain.linearRampToValueAtTime(1, f); gn.gain.setValueAtTime(1, len - f); gn.gain.linearRampToValueAtTime(0, len);
    src.start(0, S_.a, len);
    const out = await oc.startRendering(), pcm = out.getChannelData(0);
    const wav = new DataView(new ArrayBuffer(44 + pcm.length * 2)), w = (o, s) => [...s].forEach((ch, i) => wav.setUint8(o + i, ch.charCodeAt(0)));
    w(0, 'RIFF'); wav.setUint32(4, 36 + pcm.length * 2, true); w(8, 'WAVE'); w(12, 'fmt '); wav.setUint32(16, 16, true); wav.setUint16(20, 1, true); wav.setUint16(22, 1, true);
    wav.setUint32(24, sr, true); wav.setUint32(28, sr * 2, true); wav.setUint16(32, 2, true); wav.setUint16(34, 16, true); w(36, 'data'); wav.setUint32(40, pcm.length * 2, true);
    for (let i = 0; i < pcm.length; i++) wav.setInt16(44 + i * 2, clamp(pcm[i], -1, 1) * 32767, true);
    const blob = new Blob([wav.buffer], { type: 'audio/wav' });
    const data = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); });
    return { data, ms: Math.round(len * 1000) };
  }
  return api_;
}
function gsFigurinhas(g, b) {
  const can = gCan(g, 'manageMedia'); const list = g.stickers || [];
  const packs = [...new Set(list.map(s => s.pack || 'Geral'))];
  b.innerHTML = `<h2>Figurinhas</h2><p class="muted set-sub">Todo mundo do grupo pode usar estas figurinhas em qualquer conversa. ${list.length}/${STICKER_MAX}.</p>
    ${can ? `<div class="set-card"><h3>Adicionar figurinha</h3>
      <div class="pe-row"><div><b>Imagem</b><span class="muted small">PNG ou WEBP com fundo transparente, ou GIF animado. Fica com até 320 px.</span></div><div class="pe-btns"><div class="st-prev" id="fgPrev">?</div><button class="btn sm" id="fgFile">Escolher imagem</button></div></div>
      <div class="pe-2"><label class="field">Nome<input id="fgName" maxlength="32" placeholder="ex.: gato chorando"></label><label class="field">Pacote<input id="fgPack" maxlength="24" list="fgPacks" placeholder="Geral"><datalist id="fgPacks">${['Geral', ...packs].map(c => `<option value="${esc(c)}">`).join('')}</datalist></label></div>
      <div style="display:flex;justify-content:flex-end"><button class="btn primary" id="fgAdd" disabled>Adicionar figurinha</button></div></div>` : `<div class="set-card"><p class="muted" style="margin:0">Para adicionar ou apagar figurinhas, precisa da permissão <b>Gerenciar Central de Áudio e figurinhas</b>.</p></div>`}
    ${packs.length ? packs.map(pk => `<div class="set-card"><h3>${esc(pk)}</h3><div class="fg-grid">${list.filter(s => (s.pack || 'Geral') === pk).map(s => `<div class="fg-it"><img src="${esc(s.url)}" alt="${esc(s.name)}" loading="lazy"><span>${esc(s.name)}</span>${can ? `<button class="icon-btn" data-fg-del="${s.id}" data-tip="Apagar">${ic('trash')}</button>` : ''}</div>`).join('')}</div></div>`).join('') : '<div class="set-card"><p class="muted" style="margin:0">Nenhuma figurinha ainda.</p></div>'}`;
  b.onclick = async e => { const del = e.target.closest('[data-fg-del]'); if (del) { const s = list.find(x => x.id === del.dataset.fgDel); if (s && await confirmBox('Apagar figurinha', `Apagar "${s.name}"? Mensagens antigas com ela continuam aparecendo.`, 'Apagar')) act('sticker:delete', { gid: g.id, id: s.id }, 'Figurinha apagada.'); } };
  if (!can) return;
  let data = null;
  const ready = () => { $('#fgAdd').disabled = !data; };
  $('#fgFile').onclick = async () => {
    const f = await pickFile('image/png,image/webp,image/gif'); if (!f) return;
    if (!/^image\/(png|webp|gif)$/.test(f.type)) return toast('Use PNG, WEBP ou GIF.', true);
    if (f.size > 4 * 1024 * 1024) return toast('A imagem passa de 4 MB.', true);
    data = await readFile(f);
    if (!/^data:image\/gif/.test(data)) data = await shrinkAlpha(data, 320);
    $('#fgPrev').innerHTML = `<img src="${data}" alt="">`;
    if (!$('#fgName').value.trim()) $('#fgName').value = f.name.replace(/\.[^.]+$/, '').slice(0, 32);
    ready();
  };
  $('#fgAdd').onclick = async () => {
    $('#fgAdd').disabled = true; $('#fgAdd').textContent = 'Enviando...';
    try { const up = await api('/api/upload', { data }); const r = await act('sticker:add', { gid: g.id, name: $('#fgName').value, pack: $('#fgPack').value, url: up.url }, 'Figurinha adicionada.'); if (r.ok) return; }
    catch (e) { toast(e.message, true); }
    $('#fgAdd').disabled = false; $('#fgAdd').textContent = 'Adicionar figurinha';
  };
}
// reduz mantendo a transparência (WEBP; se o navegador não fizer WEBP, PNG)
async function shrinkAlpha(dataUrl, max) {
  const img = new Image(); img.src = dataUrl; await img.decode();
  const k = Math.min(1, max / Math.max(img.width, img.height)); const w = Math.round(img.width * k), h = Math.round(img.height * k);
  const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
  const webp = c.toDataURL('image/webp', .9); return /^data:image\/webp/.test(webp) ? webp : c.toDataURL('image/png');
}

/* =============== menus de contexto e visualizador ===============
   menuAt: um menu só para o app inteiro. Abre no cursor, nunca passa da janela, fecha ao clicar fora,
   com Esc ou ao escolher; só existe um aberto por vez (usa o mesmo #popRoot dos outros menus).
   Itens: { label, icon, run, danger, hint } | 'sep' | { html } */
function menuAt(x, y, items, header = '') {
  const I = n => (n ? ic(n).replace('<svg', '<svg class="cm-ic"') : '<span class="cm-ic"></span>');
  const list = items.filter(Boolean).filter((it, i, a) => it !== 'sep' || (i > 0 && a[i - 1] !== 'sep' && i < a.length - 1));
  const p = popAt(`${header}${list.map((it, i) => it === 'sep' ? '<hr>' : it.html ? it.html : `<button type="button" data-i="${i}" class="${it.danger ? 'danger' : ''}" role="menuitem">${I(it.icon)}<span class="cm-l">${esc(it.label)}</span>${it.hint ? `<span class="cm-h">${esc(it.hint)}</span>` : ''}</button>`).join('')}`, x, y, 'menu cmenu');
  p.setAttribute('role', 'menu');
  p.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (!b) return; const it = list[+b.dataset.i]; closePops(); it.run && it.run(); });
  // teclado: setas andam, Enter escolhe
  p.addEventListener('keydown', e => {
    const bs = $$('button[data-i]', p), i = bs.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); bs[(i + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length]?.focus(); }
  });
  return p;
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#popRoot').children.length) { closePops(); e.stopPropagation(); } }, true);

/* baixar o arquivo original (o mesmo que está no Storage / no GIPHY/Tenor), sem recomprimir nada */
const extOf = type => ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' }[type] || '');
function fileNameFor(url, name, type) {
  let n = (name || decodeURIComponent((url.split('?')[0].split('/').pop() || 'arquivo'))).replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'arquivo';
  const ext = extOf(type);
  if (ext && !new RegExp('\\.' + ext + '$', 'i').test(n) && !(ext === 'jpg' && /\.jpe?g$/i.test(n))) n = n.replace(/\.(png|jpe?g|gif|webp)$/i, '') + '.' + ext;
  return n;
}
async function downloadOriginal(url, name) {
  try {
    const r = await fetch(url, { mode: 'cors', cache: 'force-cache' }); if (!r.ok) throw new Error('HTTP ' + r.status);
    const blob = await r.blob();
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fileNameFor(url, name, blob.type);
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 30e3);
  } catch {
    // o servidor do arquivo não deixou baixar daqui: abre o original no navegador para salvar de lá
    window.open(url, '_blank', 'noopener'); toast('Abri o arquivo original no navegador para você salvar.');
  }
}
async function copyImage(url) {
  try {
    const blob = await (await fetch(url, { mode: 'cors' })).blob();
    let png = blob;
    if (blob.type !== 'image/png') { // a área de transferência só aceita PNG
      const bmp = await createImageBitmap(blob); const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
      c.getContext('2d').drawImage(bmp, 0, 0); png = await new Promise(r => c.toBlob(r, 'image/png'));
    }
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]); toast('Imagem copiada.');
  } catch { toast('Este navegador não deixou copiar a imagem. Use "Copiar endereço".', true); }
}

/* visualizador: abre a imagem/GIF/figurinha por cima de tudo, com tamanho real, baixar e copiar endereço */
function openViewer(media) {
  $('.viewer')?.remove();
  const v = document.createElement('div'); v.className = 'viewer'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-label', 'Visualizar ' + (media.label || 'imagem'));
  v.innerHTML = `<div class="vw-bar"><span class="vw-n">${esc(media.name || media.label || '')}</span>
      <button class="icon-btn" data-vw="real" data-tip="Tamanho real">${ic('max')}</button>
      <button class="icon-btn" data-vw="dl" data-tip="${media.kind === 'gif' ? 'Baixar GIF' : 'Baixar original'}">${ic('download')}</button>
      <button class="icon-btn" data-vw="cp" data-tip="Copiar endereço">${ic('link')}</button>
      <button class="icon-btn" data-vw="open" data-tip="Abrir no navegador">${ic('external')}</button>
      <button class="icon-btn" data-vw="x" data-tip="Fechar (Esc)">${ic('x')}</button></div>
    <div class="vw-stage"><img src="${esc(media.url)}" alt="${esc(media.name || '')}" draggable="false"></div>`;
  document.body.appendChild(v);
  const close = () => { v.remove(); document.removeEventListener('keydown', key, true); };
  const key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  document.addEventListener('keydown', key, true);
  if (media.real) v.classList.add('real');
  v.addEventListener('click', e => {
    const b = e.target.closest('[data-vw]');
    if (!b) { if (e.target.classList.contains('vw-stage')) close(); else if (e.target.tagName === 'IMG') v.classList.toggle('real'); return; }
    const a = b.dataset.vw;
    if (a === 'x') close(); if (a === 'real') v.classList.toggle('real');
    if (a === 'dl') downloadOriginal(media.url, media.name);
    if (a === 'cp') copy(absUrl(media.url), 'Endereço copiado.');
    if (a === 'open') window.open(absUrl(media.url), '_blank', 'noopener');
  });
}
const absUrl = u => new URL(u, location.href).href;

/* o que foi clicado dentro de uma mensagem */
function mediaOf(m, target) {
  const t = target.closest('img.img, img.gifmsg, img.sticker');
  if (!t) return null;
  if (t.classList.contains('sticker') && m.sticker) return { kind: 'sticker', url: m.sticker.url, name: m.sticker.name, label: 'figurinha' };
  if (t.classList.contains('gifmsg') && m.gif) return { kind: 'gif', url: m.gif.url, name: (m.gif.title || 'gif').replace(/\s+GIF$/i, '').slice(0, 60) + '.gif', label: 'GIF' };
  if (m.image) return { kind: /\.gif(\?|$)/i.test(m.image) ? 'gif' : 'image', url: m.image, name: m.imageName || '', label: 'imagem' };
  return null;
}
const findMsgLocal = id => { const cid = viewingCid(); return cid && (S.msgs[cid] || []).find(x => x.id === id); };
function canDelMsg(m) { const g = curGroup(); return m.authorId === S.me.id || !!(g && gCan(g, 'manageMessages')); }
function canPinMsg() { const g = curGroup(); return S.view.kind === 'dm' || !!(g && gCan(g, 'manageMessages')); }
async function deleteMsg(m, skipAsk) {
  const mine = m.authorId === S.me.id;
  if (!skipAsk && !await confirmBox('Apagar mensagem', mine ? 'Apagar esta mensagem para todo mundo? Não dá para desfazer.' : `Apagar a mensagem de ${nameOf(m.authorId)} para todo mundo? Não dá para desfazer.`, 'Apagar')) return;
  act('message:delete', { cid: viewingCid(), id: m.id }, 'Mensagem apagada.');
}
function pinMsg(m) { act('message:pin', { cid: viewingCid(), id: m.id, pin: !m.pinned }, m.pinned ? 'Mensagem desafixada.' : 'Mensagem fixada.'); }
function msgMenu(m, x, y, target) {
  const media = target ? mediaOf(m, target) : null;
  const link = target && target.closest('.body a[href]');
  const sel = String(window.getSelection() || '').trim();
  const selIn = sel && target && window.getSelection().anchorNode && $('#m-' + m.id)?.contains(window.getSelection().anchorNode);
  const mine = m.authorId === S.me.id;
  const react = `<div class="cm-react">${QUICK.map(e => `<button type="button" data-re="${e}" title="Reagir com ${e}">${e}</button>`).join('')}<button type="button" data-re="+" title="Mais reações">${ic('smile')}</button></div>`;
  const items = [
    { html: react },
    selIn && { label: 'Copiar seleção', icon: 'copy', run: () => copy(sel, 'Seleção copiada.') },
    { label: 'Responder', icon: 'reply', run: () => { S.reply = m.id; renderReplyBar(); $('#composer')?.focus(); } },
    mine && m.content && !m.sticker && !m.gif && { label: 'Editar mensagem', icon: 'edit', run: () => { S.editing = m.id; renderMessages(); } },
    canPinMsg() && { label: m.pinned ? 'Desafixar mensagem' : 'Fixar mensagem', icon: 'pin', run: () => pinMsg(m) },
    m.content && { label: 'Copiar texto', icon: 'copy', run: () => copy(m.content, 'Texto copiado.') },
    ...(media ? ['sep',
      { label: media.kind === 'sticker' ? 'Ver figurinha' : media.kind === 'gif' ? 'Abrir GIF' : 'Abrir imagem', icon: 'image', run: () => openViewer(media) },
      media.kind !== 'sticker' && { label: 'Ver em tamanho real', icon: 'max', run: () => openViewer({ ...media, real: true }) },
      { label: media.kind === 'gif' ? 'Baixar GIF' : media.kind === 'sticker' ? 'Salvar figurinha' : 'Baixar imagem original', icon: 'download', run: () => downloadOriginal(media.url, media.name) },
      media.kind === 'image' && window.ClipboardItem && { label: 'Copiar imagem', icon: 'copy', run: () => copyImage(media.url) },
      { label: 'Copiar endereço', icon: 'link', run: () => copy(absUrl(media.url), 'Endereço copiado.') },
      media.kind === 'sticker' && { label: favs().stickers.includes(m.sticker.id) ? 'Tirar dos favoritos' : 'Favoritar figurinha', icon: 'star', run: () => { const f = favs(), id = m.sticker.id; saveFavs({ stickers: f.stickers.includes(id) ? f.stickers.filter(x => x !== id) : [id, ...f.stickers].slice(0, 60) }); toast('Favoritos atualizados.'); } },
      media.kind === 'gif' && m.gif && { label: favs().gifs.some(x => x.url === m.gif.url) ? 'Tirar GIF dos favoritos' : 'Favoritar GIF', icon: 'star', run: () => { const f = favs(), g = m.gif; saveFavs({ gifs: f.gifs.some(x => x.url === g.url) ? f.gifs.filter(x => x.url !== g.url) : [{ url: g.url, preview: g.url, w: g.w, h: g.h, title: g.title }, ...f.gifs].slice(0, 60) }); toast('Favoritos atualizados.'); } }] : []),
    ...(link ? ['sep', { label: 'Abrir link', icon: 'external', run: () => window.open(link.href, '_blank', 'noopener') }, { label: 'Copiar link', icon: 'link', run: () => copy(link.href, 'Link copiado.') }] : []),
    'sep',
    { label: 'Copiar ID da mensagem', icon: 'hash', run: () => copy(m.id, 'ID copiado.') },
    canDelMsg(m) && { label: 'Apagar mensagem', icon: 'trash', danger: true, run: () => deleteMsg(m) }
  ];
  const p = menuAt(x, y, items);
  $('.cm-react', p).addEventListener('click', e => {
    const b = e.target.closest('[data-re]'); if (!b) return; e.stopPropagation();
    if (b.dataset.re === '+') { const r = p.getBoundingClientRect(); closePops(); emojiPicker({ getBoundingClientRect: () => r, closest: () => null }, em => emit('message:react', { cid: viewingCid(), id: m.id, emoji: em })); }
    else { closePops(); emit('message:react', { cid: viewingCid(), id: m.id, emoji: b.dataset.re }); }
  });
}
/* mensagens fixadas do canal/conversa */
async function pinsPanel(anchor) {
  const cid = viewingCid(); if (!cid) return;
  const p = pop(`<div class="pins-h"><b>${ic('pin')}Mensagens fixadas</b></div><div class="pins-l"><p class="muted small" style="margin:8px">Carregando...</p></div>`, anchor, 'pins', 'below');
  const r = await emit('messages:pins', { cid }); if (!p.isConnected) return;
  const l = $('.pins-l', p);
  l.innerHTML = !r.ok ? `<p class="muted small" style="margin:8px">${esc(r.erro || 'Não consegui carregar.')}</p>` : r.messages.length ? r.messages.map(m => `<div class="pin-it" data-pin="${m.id}">${av(m.authorId, 32, false)}<div><b>${esc(nameOf(m.authorId))}</b> <span class="muted small">${fmtDay(m.ts)} ${fmtTime(m.ts)}</span><div class="pin-t">${m.content ? esc(m.content.slice(0, 200)) : m.sticker ? '🗂️ figurinha' : m.gif ? '🎞️ GIF' : '🖼️ imagem'}</div></div>${canPinMsg() ? `<button class="icon-btn" data-unpin="${m.id}" data-tip="Desafixar">${ic('x')}</button>` : ''}</div>`).join('')
    : `<div class="sb-empty"><div style="font-size:30px">📌</div><p>Nenhuma mensagem fixada aqui ainda.</p><span class="muted small">Clique com o botão direito numa mensagem e escolha Fixar.</span></div>`;
  reposPop(p);
  p.onclick = e => {
    const u = e.target.closest('[data-unpin]'); if (u) { e.stopPropagation(); act('message:pin', { cid, id: u.dataset.unpin, pin: false }, 'Mensagem desafixada.'); u.closest('.pin-it').remove(); return; }
    const it = e.target.closest('[data-pin]'); if (!it) return;
    const el = $('#m-' + it.dataset.pin); closePops();
    if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1500); }
    else toast('Essa mensagem é antiga: role o chat para cima para carregar.');
  };
}

/* =============== menções (@usuario e @todos) ===============
   O servidor diz quem foi mencionado (m.mentions, m.everyone). Mensagens antigas, sem essa lista, usam o texto. */
function mentionsMe(m) {
  if (!m || m.authorId === S.me.id) return false;
  if (Array.isArray(m.mentions) || m.everyone) return !!(m.everyone || m.mentions.includes(S.me.id));
  return new RegExp('@' + S.me.username.replace(/\./g, '\\.') + '\\b', 'i').test(m.content || '');
}
// lista de sugestões ao digitar @ no campo de mensagem
function mentionAC(ta) {
  let box = null, items = [], sel = 0, start = -1;
  const close = () => { box?.remove(); box = null; items = []; };
  const people = () => {
    const cid = viewingCid(); const dm = S.dms[cid]; const g = curGroup();
    return (dm ? dm.members : g ? g.members : []).filter(id => id !== S.me.id && S.users[id]);
  };
  const pick = i => {
    const it = items[i]; if (!it) return;
    const v = ta.value, end = ta.selectionStart, txt = '@' + it.insert + ' ';
    ta.value = v.slice(0, start) + txt + v.slice(end); ta.selectionStart = ta.selectionEnd = start + txt.length;
    close(); ta.dispatchEvent(new Event('input')); ta.focus();
  };
  const draw = () => {
    if (!items.length) return close();
    if (!box) { box = document.createElement('div'); box.className = 'mention-pop'; box.setAttribute('role', 'listbox'); ta.closest('.composer-wrap').prepend(box);
      box.addEventListener('mousedown', e => { e.preventDefault(); const b = e.target.closest('[data-i]'); if (b) pick(+b.dataset.i); }); }
    box.innerHTML = `<div class="mp-h">Mencionar</div>${items.map((it, i) => `<button type="button" role="option" data-i="${i}" class="${i === sel ? 'on' : ''}">${it.id ? av(it.id, 24, true) : '<span class="mp-all">@</span>'}<b>${esc(it.label)}</b><span>${esc(it.sub)}</span></button>`).join('')}`;
  };
  const update = () => {
    const before = ta.value.slice(0, ta.selectionStart);
    const m = /(^|\s)@([\p{L}\p{N}_.]{0,20})$/u.exec(before);
    if (!m) return close();
    start = before.length - m[2].length - 1;
    const q = m[2].toLowerCase(), g = curGroup();
    const list = people().map(id => { const u = user(id); return { id, insert: u.username, label: u.displayName || u.username, sub: '@' + u.username, score: u.username.startsWith(q) || (u.displayName || '').toLowerCase().startsWith(q) ? 0 : (u.username.includes(q) || (u.displayName || '').toLowerCase().includes(q)) ? 1 : 9 }; })
      .filter(x => x.score < 9).sort((a, b) => a.score - b.score || a.label.localeCompare(b.label)).slice(0, 8);
    if (g && gCan(g, 'mentionEveryone') && 'todos'.startsWith(q)) list.push({ id: null, insert: 'todos', label: '@todos', sub: 'avisa todo mundo do grupo' });
    items = list; sel = Math.min(sel, Math.max(0, items.length - 1)); draw();
  };
  ta.addEventListener('input', update);
  ta.addEventListener('click', update);
  ta.addEventListener('blur', () => setTimeout(close, 120));
  // registrado antes do Enter de enviar: com a lista aberta, Enter/Tab escolhe em vez de mandar
  ta.addEventListener('keydown', e => {
    if (!box) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopImmediatePropagation(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; draw(); }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); e.stopImmediatePropagation(); pick(sel); }
    else if (e.key === 'Escape') { e.stopImmediatePropagation(); close(); }
  });
}

/* =============== navegação =============== */
// botão voltar do Android: fecha o que estiver aberto por cima; devolve false quando não há nada (o app vai para o fundo)
window.anarchyBack = () => {
  if ($('#popRoot').children.length) { closePops(); return true; }
  const m = $$('#modalRoot .modal-back').pop();
  if (m) { m.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); if (m.isConnected) m.remove(); return true; }
  if (window.anarchyRpg && window.anarchyRpg.back()) return true; // RPG de Mesa aberto: fecha a gaveta, a mesa ou a área de campanhas
  if ($('#app').classList.contains('drawer')) { $('#app').classList.remove('drawer'); $('#scrim').hidden = true; return true; }
  if (S.mobMembers && !$('#members').hidden) { S.mobMembers = false; render(); return true; }
  if (window.matchMedia('(max-width: 860px)').matches && !$('#app').classList.contains('drawer') && !$('#app').hidden) { $('#app').classList.add('drawer'); $('#scrim').hidden = false; return true; }
  return false;
};
function go(view) {
  S.view = view;
  if (view.kind === 'group') S.lastCh[view.gid] = view.cid;
  $('#app').classList.remove('drawer'); $('#scrim').hidden = true; S.mobMembers = false;
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
  fullProfile: (el, e) => { e.stopPropagation(); openFullProfile(el.dataset.id); },
  unhide: el => { S.unhide[el.dataset.id] = true; renderMessages(); },
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
    const p = pop(`${Object.entries(STATUS).filter(([k]) => k !== 'offline').map(([k, l]) => `<button data-s="${k}"><span style="display:flex;gap:10px;align-items:center"><i class="st-dot ${k}"></i>${l}</span>${cur === k ? ic('check').replace('<svg', '<svg style="width:16px;height:16px"') : ''}</button>`).join('')}
      <hr><button data-m="act">🎮 ${S.me.activity ? 'Mudar atividade' : 'O que estou fazendo'}</button><button data-m="cs">${S.me.customStatus ? 'Editar status personalizado' : 'Definir status personalizado'}</button><button data-m="vp">Ver meu perfil ${ic('user').replace('<svg', '<svg style="width:16px;height:16px"')}</button><button data-m="pf">Editar perfil ${ic('edit').replace('<svg', '<svg style="width:16px;height:16px"')}</button><button data-m="cp">Copiar meu usuário</button>`, el, 'menu', 'above');
    p.onclick = e => {
      const s = e.target.closest('[data-s]'); const m = e.target.closest('[data-m]')?.dataset.m; closePops();
      if (s) act('profile:update', { status: s.dataset.s });
      if (m === 'act' && window.anarchyFun) window.anarchyFun.activityModal();
      if (m === 'cs') statusModal(); if (m === 'pf') openSettings('perfil'); if (m === 'vp') openFullProfile(S.me.id); if (m === 'cp') copy(S.me.username);
    };
  },
  settings: el => { closePops(); openSettings(el.dataset.tab); },
  voiceSettings: () => { closePops(); openSettings('voz'); },
  soundboard: el => soundboardPanel(el),
  mixer: () => mixerToggle(),
  stickerPick: el => stickerPicker(el),
  gifPick: el => gifPicker(el),
  stickerInfo: el => {
    const s = allStickers().find(x => x.id === el.dataset.id);
    if (!s) return toast('Essa figurinha é de um grupo em que você não está.', true);
    const fav = favs().stickers.includes(s.id);
    const p = pop(`<div class="um-h"><img src="${esc(s.url)}" alt="" style="width:40px;height:40px;object-fit:contain"><div><b>${esc(s.name)}</b><span>${esc(s.gname)} · ${esc(s.pack || 'Geral')}</span></div></div>${viewingCid() ? '<button data-m="send">Enviar esta figurinha</button>' : ''}<button data-m="fav">${fav ? 'Tirar dos favoritos' : '★ Favoritar'}</button>`, el, 'menu');
    p.onclick = e => { const m = e.target.closest('[data-m]')?.dataset.m; if (!m) return; closePops(); if (m === 'send') sendSticker(s); if (m === 'fav') { const f = favs(); saveFavs({ stickers: fav ? f.stickers.filter(x => x !== s.id) : [s.id, ...f.stickers].slice(0, 60) }); toast(fav ? 'Tirada dos favoritos.' : 'Favoritada.'); } };
  },
  mute: toggleMute, deafen: toggleDeaf,
  toggleScreen, toggleCam,
  leaveVoice: () => leaveVoice(),
  openStage,
  joinRoom: el => joinVoice(el.dataset.id, { video: !!el.dataset.video }),
  djCtl: async el => { const r = await emit('music:ctl', { roomId: el.dataset.room, action: el.dataset.a, value: el.dataset.v }); if (!r.ok) toast(r.erro, true); },
  djProfile: el => openGroupSettings(el.dataset.gid, 'dj'),
  openBoxes: () => { INV.tab = 'efeitos'; openSettings('inventario'); },
  // RPG de Mesa do grupo ou da conversa aberta (rpg.js)
  rpg: () => { const v = S.view; if (!window.anarchyRpg) return; if (v.kind === 'group') window.anarchyRpg.lobby({ kind: 'g', id: v.gid }); else if (v.kind === 'dm') window.anarchyRpg.lobby({ kind: 'dm', id: v.id }); },
  voiceUser: (el, e) => { e.stopPropagation(); voiceMenu(el.dataset.vuid, el); },
  watchScreen: (el, e) => { e.stopPropagation(); setWatch(el.dataset.sid, true); },
  unwatchScreen: (el, e) => { e.stopPropagation(); setWatch(el.dataset.sid, false); toast('Você parou de assistir. A tela não é mais baixada.'); },
  ownPreview: (el, e) => { e.stopPropagation(); V.ownPreview = !V.ownPreview; if (!V.ownPreview) V.videoCache.delete('screen:' + S.mySid); renderStageSlot(); },
  screenMenu: (el, e) => { e.stopPropagation(); screenMenu(el.dataset.sid, el); },
  focus: (el, e) => { if (e.target.closest('.fs')) return; S.focusTile = S.focusTile === el.dataset.key ? null : el.dataset.key; renderStageSlot(); },
  fullscreen: (el, e) => { e.stopPropagation(); const v = el.closest('.tile').querySelector('video'); (v?.requestFullscreen ? v.requestFullscreen() : el.closest('.tile').requestFullscreen?.())?.catch?.(() => {}); },
  acceptCall: async () => { const d = incoming?.dmId; closeRing(); ring(false); if (d) { await joinVoice(d); go({ kind: 'dm', id: d }); } },
  declineCall: () => { const d = incoming?.dmId; closeRing(); ring(false); if (d) socket.emit('call:decline', { dmId: d }); },
  toggleMembers: () => { if (narrowScreen()) S.mobMembers = !S.mobMembers; else { prefs.showMembers = !prefs.showMembers; savePrefs(); } render(); },
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
  zoom: el => { const mm = el.closest('.msg[data-mid]'), m = mm && findMsgLocal(mm.dataset.mid); openViewer((m && mediaOf(m, el)) || { kind: 'image', url: el.src }); },
  msgMore: (el, e) => { e.stopPropagation(); const m = findMsgLocal(el.dataset.id); if (!m) return; const r = el.getBoundingClientRect(); msgMenu(m, r.left, r.bottom + 4, null); },
  pins: el => pinsPanel(el)
};
document.addEventListener('click', e => {
  const sp = e.target.closest('.spoiler'); if (sp) sp.classList.add('open');
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

/* =============== RPG de Mesa (rpg.js): o que ele usa do app =============== */
if (window.anarchyRpg) window.anarchyRpg.init({ S, esc, ic, av, user, nameOf, emit, toast, modal, confirmBox, pickFile, readFile, api, tone, gCan, openGroupSettings, get socket() { return socket; } });
if (window.anarchyBox) window.anarchyBox.init({ S, esc, avWith, tone, reduceMotion, emit, toast, giftSparks, AVFX, AVFX_IDS, AVR, BOX_COST, PLATES, plateRow, openCase: () => openCase() });
if (window.anarchyFun) window.anarchyFun.init({ S, esc, av, nameOf, emit, toast, modal, confirmBox, pop, closePops, tone, confetti, md, gCan, reduceMotion, viewingCid: () => viewingCid(), renderMessages: () => renderMessages(), inCall: () => !!V.room,
  avfx: id => AVFX[id], avWith, rarName: t => (AVR[t] || [t])[0], plate: id => PLATES[id], plateRow, renderStage: () => renderStageSlot(),
  djPos: roomId => (S.music[roomId] ? djPos(S.music[roomId]) : 0), joinVoice: roomId => joinVoice(roomId), room: () => V.room, go: v => go(v) });

/* =============== início =============== */
// quem entrou numa versão antiga tem o token guardado no navegador: troca por cookie (sem precisar entrar de novo)
(async () => {
  // abriu o link "criar senha nova" do email: vai direto para o Porteiro (mesmo se já estava logado aqui)
  if (new URLSearchParams(location.search).get('reset')) { showAuth(); return; }
  let old = null; try { old = localStorage.getItem('discordia:token'); } catch {}
  if (old) {
    try {
      const r = await fetch('/api/session', { method: 'POST', headers: { 'x-token': old } });
      if (r.ok || r.status === 401) localStorage.removeItem('discordia:token'); else S.token = old;
    } catch { S.token = old; }
  }
  connect();
})();
})();
