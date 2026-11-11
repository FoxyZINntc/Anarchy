/* Anarchy — RPG de Mesa
   Atividade opcional de qualquer grupo ou conversa. Abre por cima do app (não muda o layout principal) e fala com o
   servidor pelos eventos "rpg:*" do Socket.IO. Tudo que é sensível (dados, permissões, o que cada um vê) é decidido
   no servidor (server/rpg.js); aqui só desenha e envia pedidos. O app.js entrega o que este arquivo usa em init(). */
(() => {
'use strict';
let H = null; // utilidades do app.js (init)
const CELL = 32; // tamanho da casa no mapa (px, antes do zoom)
const TILE_NAMES = { '.': 'Chão', ',': 'Grama', '#': 'Parede', H: 'Parede de madeira', '~': 'Água', '^': 'Rocha', T: 'Árvore', '=': 'Trilha', D: 'Porta', S: 'Areia', P: 'Pilar', A: 'Altar', B: 'Barricada', _: 'Buraco', b: 'Ponte', f: 'Plantação' };
const CONDS = ['Envenenado', 'Atordoado', 'Caído', 'Invisível', 'Amedrontado', 'Queimando', 'Abençoado', 'Paralisado', 'Sangrando', 'Dormindo', 'Congelado', 'Furioso'];
const COND_IC = { Envenenado: '🤢', Atordoado: '💫', Caído: '🛌', Invisível: '👻', Amedrontado: '😱', Queimando: '🔥', Abençoado: '✨', Paralisado: '🧊', Sangrando: '🩸', Dormindo: '💤', Congelado: '❄️', Furioso: '😡' };
const DICE = [4, 6, 8, 10, 12, 20, 100];
const ENT_KIND = { monstro: 'Monstro', chefe: 'Chefe', npc: 'NPC', objeto: 'Objeto' };
const PRESETS = [
  ['Goblin', 'monstro', '👺', 7, 12, 4, 1], ['Lobo', 'monstro', '🐺', 11, 13, 4, 1], ['Esqueleto', 'monstro', '💀', 13, 13, 4, 1], ['Orc', 'monstro', '👹', 15, 13, 5, 2],
  ['Aranha gigante', 'monstro', '🕷️', 26, 14, 5, 3], ['Dragão', 'chefe', '🐉', 180, 18, 11, 12], ['Lich', 'chefe', '☠️', 135, 17, 9, 15],
  ['Mercador', 'npc', '🧔', 9, 10, 0, 1], ['Guarda', 'npc', '💂', 16, 16, 4, 2], ['Baú', 'objeto', '🧰', 10, 12, 0, 0], ['Barril', 'objeto', '🛢️', 6, 10, 0, 0]
];
const MAP_KINDS = { masmorra: 'Masmorra', caverna: 'Caverna', castelo: 'Castelo', templo: 'Templo', floresta: 'Floresta', montanha: 'Montanha', cidade: 'Cidade', vila: 'Vila', arena: 'Arena', campo: 'Campo de batalha' };

const R = { scope: null, lobbyEl: null, el: null, st: null, z: 1, tool: 'mover', brush: '.', tab: 'grupo', sel: null, fx: [], fxOn: false, drag: null };
const me = () => H.S.me && H.S.me.id;
const role = () => (R.st ? R.st.camp.role : null);
const isMaster = () => role() === 'mestre';
const isPlayer = () => role() === 'mestre' || role() === 'jogador';
const curMap = () => (R.st && R.st.map) || null;
const charOf = id => R.st.chars.find(c => c.id === id);
const entOf = id => R.st.ents.find(e => e.id === id);
const myChar = () => R.st && R.st.chars.find(c => c.ownerId === me());
const esc = s => H.esc(s);
const toast = (m, e) => H.toast(m, e);
async function call(ev, data, okMsg) { const r = await H.emit(ev, data); if (!r.ok) toast(r.erro || 'Algo deu errado.', true); else if (okMsg) toast(okMsg); return r; }
const pct = (a, b) => Math.max(0, Math.min(100, b > 0 ? (a / b) * 100 : 0));
const mod = v => { const m = Math.floor(((+v || 10) - 10) / 2); return (m >= 0 ? '+' : '') + m; };
const scopeName = s => (s.kind === 'g' ? (H.S.groups[s.id] && H.S.groups[s.id].name) || 'Grupo' : 'Conversa com ' + H.nameOf((H.S.dms[s.id] && H.S.dms[s.id].members.find(m => m !== me())) || ''));
const avatarUrl = uid => { const u = H.user(uid); return u && u.avatar ? u.avatar : null; };
const initial = n => esc((String(n || '?').trim()[0] || '?').toUpperCase());

/* imagem com transparência (PNG/WEBP) para miniaturas e mapas: o envio comum do app vira JPG e perde o fundo transparente */
async function upImg(file, max) {
  if (!file) return null;
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) { toast('Use uma imagem PNG, JPG, WEBP ou GIF.', true); return null; }
  if (file.size > 25e6) { toast('Imagem grande demais (máximo 25 MB).', true); return null; }
  try {
    let data = await H.readFile(file);
    const im = new Image(); im.src = data; await im.decode();
    let w = im.naturalWidth, h = im.naturalHeight;
    if (!/gif/.test(file.type) && (Math.max(w, h) > max || data.length > 5e6)) {
      const k = Math.min(1, max / Math.max(w, h)); w = Math.max(1, Math.round(w * k)); h = Math.max(1, Math.round(h * k));
      const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h);
      data = c.toDataURL('image/webp', 0.9);
      if (!/^data:image\/webp/.test(data)) data = c.toDataURL('image/png');
    }
    if (data.length > 11e6) { toast('Imagem pesada demais mesmo depois de reduzir. Tente uma menor.', true); return null; }
    const r = await H.api('/api/upload', { data });
    return { url: r.url, w, h };
  } catch (e) { toast(e.message || 'Não consegui enviar a imagem.', true); return null; }
}

/* =============== área de campanhas (lobby) =============== */
async function lobby(scope) {
  closeLobby();
  R.scope = scope;
  const el = document.createElement('div'); el.className = 'rpg-lobby'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'RPG de Mesa');
  el.innerHTML = `<div class="rpg-lb-box"><header class="rpg-lb-head"><div class="rpg-lb-logo">🎲</div><div><h2>RPG de Mesa</h2><span class="muted">${esc(scopeName(scope))}</span></div><span class="spacer"></span><button class="icon-btn" data-r="x" aria-label="Fechar">${H.ic('x')}</button></header><div class="rpg-lb-body"><p class="muted">Carregando...</p></div></div>`;
  document.body.appendChild(el); R.lobbyEl = el;
  el.addEventListener('mousedown', e => { if (e.target === el) closeLobby(); });
  el.querySelector('[data-r="x"]').onclick = closeLobby;
  await drawLobby();
}
function closeLobby() { if (R.lobbyEl) R.lobbyEl.remove(); R.lobbyEl = null; }
async function drawLobby() {
  const el = R.lobbyEl; if (!el) return;
  const s = R.scope, body = el.querySelector('.rpg-lb-body');
  const r = await H.emit('rpg:list', { scope: s.kind, id: s.id });
  if (!R.lobbyEl || R.scope !== s) return;
  if (!r.ok) { body.innerHTML = `<p class="form-err">${esc(r.erro)}</p>`; return; }
  const g = s.kind === 'g' ? H.S.groups[s.id] : null, manager = g && H.gCan(g, 'manageServer');
  if (!r.on) {
    body.innerHTML = `<div class="rpg-empty">🎲<b>O RPG de Mesa está desligado neste grupo</b><span>${manager ? 'Você pode ligar em Configurações do grupo → RPG de Mesa.' : 'Quem gerencia o grupo pode ligar nas configurações.'}</span>${manager ? '<button class="btn primary" data-r="cfg">Abrir configurações</button>' : ''}</div>`;
    const b = body.querySelector('[data-r="cfg"]'); if (b) b.onclick = () => { closeLobby(); H.openGroupSettings(s.id, 'rpg'); };
    return;
  }
  const card = c => {
    const canDel = c.role === 'mestre' || c.createdBy === me() || manager;
    const stLbl = { ativa: 'Ativa', pausada: 'Pausada', encerrada: 'Encerrada' }[c.state];
    const full = c.players.length >= c.maxPlayers;
    let acts = `<button class="btn primary sm" data-r="open" data-id="${c.id}">Abrir mesa</button>`;
    if (c.role === 'convidado') acts = `<button class="btn primary sm" data-r="join" data-id="${c.id}">Aceitar convite</button><button class="btn ghost sm" data-r="decline" data-id="${c.id}">Recusar</button>` + acts;
    else if (c.role === 'espectador' && c.open && c.state !== 'encerrada' && !full) acts = `<button class="btn sm" data-r="join" data-id="${c.id}">Entrar como jogador</button>` + acts;
    return `<article class="rpg-card st-${c.state}">
      <div class="rpg-card-cover" ${c.cover ? `style="background-image:url('${esc(c.cover)}')"` : ''}>${c.cover ? '' : '<span>🐉</span>'}<i class="rpg-badge">${stLbl}</i>${c.role !== 'espectador' ? `<i class="rpg-badge role">${{ mestre: 'Você é o Mestre', jogador: 'Você joga', convidado: 'Convite para você' }[c.role]}</i>` : ''}</div>
      <div class="rpg-card-in"><h3>${esc(c.name)}</h3>${c.desc ? `<p>${esc(c.desc)}</p>` : ''}
        <div class="rpg-card-meta"><span>${H.av(c.masterId, 20, false)} Mestre: <b>${esc(H.nameOf(c.masterId))}</b></span><span>👥 ${c.players.length}/${c.maxPlayers}</span><span>🗺️ ${c.maps}</span></div>
        <div class="rpg-card-acts">${acts}${canDel ? `<button class="icon-btn" data-r="del" data-id="${c.id}" data-tip="Apagar campanha" aria-label="Apagar campanha">${H.ic('trash')}</button>` : ''}</div></div></article>`;
  };
  body.innerHTML = `<div class="rpg-lb-intro"><div><b>Jogue RPG com o pessoal ${s.kind === 'g' ? 'do grupo' : 'da conversa'}</b><span class="muted">Mapa compartilhado, miniaturas, dados, fichas e painel do Mestre, tudo em tempo real. É opcional: quem não joga não vê diferença nenhuma.</span></div>
      ${r.canCreate ? '<button class="btn primary" data-r="new">+ Nova campanha</button>' : '<span class="muted small">Só cargos com permissão criam campanhas aqui.</span>'}</div>
    ${r.camps.length ? `<div class="rpg-cards">${r.camps.map(card).join('')}</div>` : `<div class="rpg-empty">🐉<b>Nenhuma campanha ainda</b><span>${r.canCreate ? 'Crie a primeira, chame os amigos e role os dados.' : 'Quando alguém criar uma campanha, ela aparece aqui.'}</span></div>`}`;
  body.onclick = async e => {
    const b = e.target.closest('[data-r]'); if (!b) return;
    const id = b.dataset.id, a = b.dataset.r;
    if (a === 'new') return createModal();
    if (a === 'open') return openRoom(id);
    if (a === 'join') { const q = await call('rpg:join', { cid: id }, 'Você entrou na campanha! Crie seu personagem na mesa.'); if (q.ok) { drawLobby(); openRoom(id); } return; }
    if (a === 'decline') { const q = await call('rpg:decline', { cid: id }); if (q.ok) drawLobby(); return; }
    if (a === 'del') { const c = r.camps.find(x => x.id === id); if (await H.confirmBox('Apagar campanha', `"${c.name}" será apagada com mapas, fichas e histórico. Não dá para desfazer.`, 'Apagar')) { const q = await call('rpg:delete', { cid: id }, 'Campanha apagada.'); if (q.ok) drawLobby(); } }
  };
}
function createModal() {
  let cover = null;
  H.modal(`<div class="modal-h"><h2>🎲 Nova campanha</h2><p>Você será o Mestre. Depois convide quem vai jogar.</p></div>
    <div class="modal-b rpg-form">
      <label class="field">Nome<input id="rcName" maxlength="60" placeholder="A Maldição do Castelo Sombrio"></label>
      <label class="field">Descrição<textarea id="rcDesc" rows="3" maxlength="1000" placeholder="Do que se trata a aventura?"></textarea></label>
      <div class="field">Capa<div class="rpg-cover-pick" id="rcCover"><span>🖼️ Escolher imagem</span></div></div>
      <div class="rpg-row"><label class="field">Máximo de jogadores<input id="rcMax" type="number" min="1" max="20" value="5"></label>
      <label class="rpg-check"><input type="checkbox" id="rcOpen"> Qualquer membro pode entrar sem convite</label></div>
    </div>
    <div class="modal-f"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="rcGo">Criar campanha</button></div>`, (m, close) => {
    const pick = m.querySelector('#rcCover');
    pick.onclick = async () => { const f = await H.pickFile(); const up = await upImg(f, 1600); if (up) { cover = up.url; pick.style.backgroundImage = `url('${up.url}')`; pick.classList.add('on'); } };
    m.querySelector('#rcGo').onclick = async () => {
      const r = await call('rpg:create', { scope: R.scope.kind, id: R.scope.id, name: m.querySelector('#rcName').value, desc: m.querySelector('#rcDesc').value, cover, maxPlayers: +m.querySelector('#rcMax').value, open: m.querySelector('#rcOpen').checked });
      if (r.ok) { close(); drawLobby(); openRoom(r.camp.id); }
    };
  });
}

/* =============== mesa (sala da campanha) =============== */
async function openRoom(cid) {
  const r = await H.emit('rpg:open', { cid });
  if (!r.ok) return toast(r.erro || 'Não consegui abrir a mesa.', true);
  closeRoom(true);
  R.st = r; R.sel = null; R.tool = 'mover'; R.z = 1;
  const el = document.createElement('div'); el.className = 'rpg-room'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Mesa de RPG');
  el.innerHTML = `<header class="rpg-top"></header>
    <div class="rpg-body">
      <section class="rpg-stage">
        <div class="rpg-combat" hidden></div>
        <div class="rpg-view"><div class="rpg-board"><img class="rpg-bg" alt="" hidden><canvas class="rpg-tiles"></canvas><canvas class="rpg-fog"></canvas><div class="rpg-toks"></div></div></div>
        <div class="rpg-tools"></div>
        <div class="rpg-selbox" hidden></div>
        <div class="rpg-dicefx" aria-live="polite"></div>
        <div class="rpg-nomap" hidden></div>
      </section>
      <aside class="rpg-side"><nav class="rpg-tabs"></nav><div class="rpg-pane"></div></aside>
    </div>`;
  document.body.appendChild(el); R.el = el;
  closeLobby();
  bindBoard();
  renderAll();
  fitZoom();
}
function closeRoom(silent) {
  if (!R.el) return;
  if (!silent) H.emit('rpg:close', {});
  R.el.remove(); R.el = null; R.st = null; R.sel = null; R.fx = []; R.drag = null;
}
const $r = s => R.el && R.el.querySelector(s);

function renderAll() { if (!R.el) return; renderTop(); drawMap(); renderTokens(); renderCombat(); renderTools(); renderTabs(); renderPane(); renderSel(); }

function renderTop() {
  const c = R.st.camp, m = curMap();
  const stLbl = { ativa: 'Ativa', pausada: 'Pausada', encerrada: 'Encerrada' }[c.state];
  const roleLbl = { mestre: '👑 Mestre', jogador: '🎭 Jogador', convidado: '✉️ Convidado', espectador: '👀 Assistindo' }[c.role];
  $r('.rpg-top').innerHTML = `<button class="btn ghost sm rpg-back" data-a="back">${H.ic('reply')}<span>Voltar ao Anarchy</span></button>
    <div class="rpg-top-t">${c.cover ? `<img src="${esc(c.cover)}" alt="">` : '<span class="rpg-top-ic">🐉</span>'}<div><b>${esc(c.name)}</b><span><i class="rpg-st st-${c.state}">${stLbl}</i> ${roleLbl}${m ? ` · 🗺️ ${esc(m.name)}` : ''}</span></div></div>
    <span class="spacer"></span>
    ${c.role === 'convidado' ? '<button class="btn primary sm" data-a="join">Aceitar convite</button>' : ''}
    ${c.role === 'espectador' && c.open && c.state !== 'encerrada' && c.players.length < c.maxPlayers ? '<button class="btn sm" data-a="join">Entrar como jogador</button>' : ''}
    ${isPlayer() ? '<button class="btn sm" data-a="mysheet">📜 <span>Minha ficha</span></button>' : ''}
    ${isMaster() ? `<button class="icon-btn" data-a="settings" data-tip="Configurações da campanha" aria-label="Configurações da campanha">${H.ic('gear')}</button>` : ''}
    <button class="icon-btn rpg-side-tog" data-a="side" aria-label="Painel">${H.ic('menu')}</button>`;
  $r('.rpg-top').onclick = async e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'back') closeRoom();
    if (a === 'side') R.el.classList.toggle('side-open');
    if (a === 'settings') settingsModal();
    if (a === 'mysheet') { const ch = myChar(); ch ? sheetModal(ch) : sheetModal(null); }
    if (a === 'join') { const q = await call('rpg:join', { cid: R.st.camp.id }, 'Você entrou na campanha! Agora crie seu personagem.'); if (q.ok && !myChar()) setTimeout(() => sheetModal(null), 300); }
  };
}

/* ---------- mapa (desenho das casas) ---------- */
function rnd(i, k = 0) { let x = (i * 374761393 + k * 668265263) | 0; x = (x ^ (x >>> 13)) * 1274126177 | 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; }
function drawTile(g, ch, x, y, s, i) {
  const X = x * s, Y = y * s;
  const fill = (c) => { g.fillStyle = c; g.fillRect(X, Y, s, s); };
  const ground = () => { fill(rnd(i) < 0.5 ? '#3a3e46' : '#373b43'); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.strokeRect(X + .5, Y + .5, s - 1, s - 1); };
  const grass = () => { fill(rnd(i) < 0.5 ? '#3c6a33' : '#3f6f36'); g.fillStyle = 'rgba(20,50,15,.45)'; for (let k = 0; k < 4; k++) g.fillRect(X + rnd(i, k) * (s - 3), Y + rnd(i, k + 9) * (s - 3), 2, 3); };
  switch (ch) {
    case '.': ground(); break;
    case ',': grass(); break;
    case 'f': fill('#6f7d33'); g.fillStyle = '#8fa040'; for (let k = 2; k < s; k += 6) g.fillRect(X + 1, Y + k, s - 2, 2); break;
    case '#': fill('#1b1d22'); g.fillStyle = '#25282f'; g.fillRect(X, Y, s, s * .35); g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(X, Y, s, 2); break;
    case 'H': fill('#5b3d25'); g.strokeStyle = '#3e2816'; g.lineWidth = 1; for (let k = 6; k < s; k += 8) { g.beginPath(); g.moveTo(X, Y + k + .5); g.lineTo(X + s, Y + k + .5); g.stroke(); } break;
    case '~': fill('#24527c'); g.strokeStyle = 'rgba(160,210,255,.35)'; g.lineWidth = 1.5; g.beginPath(); const wy = Y + s * (.35 + rnd(i) * .3); g.moveTo(X + 4, wy); g.quadraticCurveTo(X + s / 2, wy - 4, X + s - 4, wy); g.stroke(); break;
    case 'b': fill('#24527c'); g.fillStyle = '#8a6239'; g.fillRect(X + 2, Y, s - 4, s); g.strokeStyle = '#5e4024'; for (let k = 4; k < s; k += 7) { g.beginPath(); g.moveTo(X + 2, Y + k + .5); g.lineTo(X + s - 2, Y + k + .5); g.stroke(); } break;
    case '^': fill('#575046'); g.fillStyle = '#6e665a'; g.beginPath(); g.moveTo(X + s * .15, Y + s * .85); g.lineTo(X + s * .5, Y + s * .15); g.lineTo(X + s * .85, Y + s * .85); g.fill(); g.fillStyle = '#d8d2c6'; g.beginPath(); g.moveTo(X + s * .4, Y + s * .35); g.lineTo(X + s * .5, Y + s * .15); g.lineTo(X + s * .6, Y + s * .35); g.fill(); break;
    case 'T': grass(); g.fillStyle = '#5b3b1f'; g.fillRect(X + s * .44, Y + s * .55, s * .12, s * .35); g.fillStyle = rnd(i, 3) < .5 ? '#1f4a1c' : '#245422'; g.beginPath(); g.arc(X + s / 2, Y + s * .45, s * .38, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.arc(X + s * .4, Y + s * .35, s * .14, 0, 7); g.fill(); break;
    case '=': fill(rnd(i) < .5 ? '#86704c' : '#8c7650'); g.fillStyle = 'rgba(60,40,20,.25)'; g.fillRect(X + rnd(i, 1) * s * .8, Y + rnd(i, 2) * s * .8, 3, 2); break;
    case 'S': fill(rnd(i) < .5 ? '#c4ad74' : '#c9b37b'); g.fillStyle = 'rgba(120,90,40,.25)'; g.fillRect(X + rnd(i, 4) * s * .8, Y + rnd(i, 5) * s * .8, 2, 2); break;
    case 'D': ground(); g.fillStyle = '#7b4a22'; g.fillRect(X + 3, Y + 3, s - 6, s - 6); g.strokeStyle = '#3d220c'; g.lineWidth = 2; g.strokeRect(X + 3, Y + 3, s - 6, s - 6); g.fillStyle = '#e0b04a'; g.beginPath(); g.arc(X + s * .7, Y + s * .5, 2, 0, 7); g.fill(); break;
    case 'P': ground(); g.fillStyle = '#8b8f99'; g.beginPath(); g.arc(X + s / 2, Y + s / 2, s * .32, 0, 7); g.fill(); g.fillStyle = '#b6bac3'; g.beginPath(); g.arc(X + s * .45, Y + s * .45, s * .16, 0, 7); g.fill(); break;
    case 'A': ground(); g.fillStyle = '#c99b2a'; g.fillRect(X + 4, Y + s * .3, s - 8, s * .45); g.fillStyle = '#f3d27a'; g.fillRect(X + 4, Y + s * .3, s - 8, 3); break;
    case 'B': (rnd(i) < .5 ? grass : ground)(); g.strokeStyle = '#6b4520'; g.lineWidth = 4; g.beginPath(); g.moveTo(X + 4, Y + 4); g.lineTo(X + s - 4, Y + s - 4); g.moveTo(X + s - 4, Y + 4); g.lineTo(X + 4, Y + s - 4); g.stroke(); break;
    case '_': fill('#0b0b0d'); { const gr = g.createRadialGradient(X + s / 2, Y + s / 2, 2, X + s / 2, Y + s / 2, s * .7); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(60,60,70,.6)'); g.fillStyle = gr; g.fillRect(X, Y, s, s); } break;
    default: ground();
  }
}
function drawMap() {
  const m = curMap(), board = $r('.rpg-board'), tiles = $r('.rpg-tiles'), bg = $r('.rpg-bg'), nomap = $r('.rpg-nomap');
  if (!m) {
    board.hidden = true; nomap.hidden = false;
    nomap.innerHTML = `<div class="rpg-empty">🗺️<b>Nenhum mapa ainda</b><span>${isMaster() ? 'Gere ou importe um mapa na aba Mestre.' : 'Espere o Mestre preparar o mapa.'}</span></div>`;
    return;
  }
  board.hidden = false; nomap.hidden = true;
  const W = m.w * CELL, Hh = m.h * CELL;
  board.style.width = W + 'px'; board.style.height = Hh + 'px';
  for (const c of [tiles, $r('.rpg-fog')]) { c.width = W; c.height = Hh; }
  const g = tiles.getContext('2d');
  g.clearRect(0, 0, W, Hh);
  if (m.bg) {
    bg.hidden = false; if (bg.getAttribute('src') !== m.bg) bg.src = m.bg;
  } else {
    bg.hidden = true; bg.removeAttribute('src');
    for (let i = 0; i < m.tiles.length; i++) drawTile(g, m.tiles[i], i % m.w, (i / m.w) | 0, CELL, i);
  }
  // grade
  if (R.st.camp.rules.grid || m.bg) {
    g.strokeStyle = m.bg ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.22)'; g.lineWidth = 1; g.beginPath();
    for (let x = 0; x <= m.w; x++) { g.moveTo(x * CELL + .5, 0); g.lineTo(x * CELL + .5, Hh); }
    for (let y = 0; y <= m.h; y++) { g.moveTo(0, y * CELL + .5); g.lineTo(W, y * CELL + .5); }
    g.stroke();
  }
  setZoom(R.z); // a área de rolagem acompanha o tamanho do mapa
  // armadilhas (o Mestre vê todas; os jogadores só as reveladas)
  for (const t of m.traps || []) {
    const X = (t.i % m.w) * CELL, Y = ((t.i / m.w) | 0) * CELL;
    g.fillStyle = t.on ? 'rgba(255,90,60,.55)' : 'rgba(255,60,60,.28)'; g.fillRect(X + 3, Y + 3, CELL - 6, CELL - 6);
    g.font = `${CELL * .55}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(t.on ? '⚠️' : '🪤', X + CELL / 2, Y + CELL / 2 + 1);
  }
  drawFog();
}
function drawFog() {
  const m = curMap(), c = $r('.rpg-fog'); if (!m || !c) return;
  const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height);
  if (!m.fog) return;
  const master = isMaster();
  for (let i = 0; i < m.seen.length; i++) {
    if (m.seen[i] === '1') continue;
    const X = (i % m.w) * CELL, Y = ((i / m.w) | 0) * CELL;
    g.fillStyle = master ? 'rgba(10,10,20,.55)' : '#07080b'; g.fillRect(X, Y, CELL, CELL);
    if (master) { g.strokeStyle = 'rgba(120,120,160,.25)'; g.beginPath(); g.moveTo(X, Y + CELL); g.lineTo(X + CELL, Y); g.stroke(); }
  }
}
const fogged = (m, x, y) => m && m.fog && !isMaster() && m.seen[Math.floor(y + .5) * m.w + Math.floor(x + .5)] !== '1';

/* ---------- miniaturas ---------- */
function tokens() {
  const m = curMap(); if (!m) return [];
  const out = [];
  for (const ch of R.st.chars) { const p = ch.pos && ch.pos[m.id]; if (p) out.push({ k: 'c', id: ch.id, x: p[0], y: p[1], size: 1, t: ch }); }
  for (const e of R.st.ents) if (e.mapId === m.id) out.push({ k: 'e', id: e.id, x: e.x, y: e.y, size: e.size || 1, t: e });
  return out;
}
function canMove(k, t) {
  if (isMaster()) return true;
  const c = R.st.camp;
  return k === 'c' && t.ownerId === me() && !c.rules.lock && c.state === 'ativa';
}
function tokHtml(o) {
  const t = o.t, m = curMap();
  const img = o.k === 'c' ? (t.img || avatarUrl(t.ownerId)) : t.img;
  const face = img ? `<img src="${esc(img)}" alt="" draggable="false">` : `<span>${o.k === 'e' && t.emoji ? esc(t.emoji) : initial(t.name)}</span>`;
  const showHp = o.k === 'c' || isMaster() || t.hp !== undefined;
  const hp = showHp && t.hpMax ? `<div class="rpg-tok-hp"><i style="width:${pct(t.hp, t.hpMax)}%"></i></div>` : '';
  const turn = R.st.camp.combat.on && R.st.camp.combat.order[R.st.camp.combat.turn];
  const isTurn = turn && turn.k === o.k && turn.id === o.id;
  const cls = ['rpg-tok', 'k-' + o.k, o.k === 'e' ? 'kind-' + t.kind : '', o.k === 'e' && t.img ? 'cut' : '', R.sel && R.sel.k === o.k && R.sel.id === o.id ? 'sel' : '', isTurn ? 'turn' : '', o.k === 'e' && t.hidden ? 'hid' : '', (o.k === 'c' && t.hp <= 0) || (o.k === 'e' && t.hpMax && t.hp <= 0) ? 'down' : '', canMove(o.k, t) ? 'mov' : '', o.k === 'c' && t.ownerId === me() ? 'mine' : ''].filter(Boolean).join(' ');
  const conds = (t.conds || []).slice(0, 4).map(x => COND_IC[x] || '•').join('');
  return `<div class="${cls}" data-k="${o.k}" data-id="${o.id}" style="--s:${o.size};--tc:${esc(t.color || '#6c7cff')};left:${o.x * CELL}px;top:${o.y * CELL}px" ${fogged(m, o.x, o.y) && !(o.k === 'c' && t.ownerId === me()) ? 'hidden' : ''}>
    <div class="rpg-tok-face">${face}</div>${conds ? `<div class="rpg-tok-cond">${conds}</div>` : ''}${hp}<div class="rpg-tok-name">${esc(t.name)}</div></div>`;
}
function renderTokens() {
  const layer = $r('.rpg-toks'); if (!layer) return;
  const list = tokens().sort((a, b) => (a.k === 'c') - (b.k === 'c') || b.size - a.size);
  layer.innerHTML = list.map(tokHtml).join('');
}

/* ---------- arrastar, pintar e navegar no mapa ---------- */
function boardPos(e) {
  const b = $r('.rpg-board').getBoundingClientRect();
  return { x: (e.clientX - b.left) / R.z / CELL, y: (e.clientY - b.top) / R.z / CELL };
}
function setZoom(z, keep) {
  const v = $r('.rpg-view'), b = $r('.rpg-board'); if (!v || !b) return;
  const old = R.z; R.z = Math.max(0.3, Math.min(2.5, z));
  const cx = keep ? keep.x : v.clientWidth / 2, cy = keep ? keep.y : v.clientHeight / 2;
  const px = (v.scrollLeft + cx) / old, py = (v.scrollTop + cy) / old;
  b.style.transform = `scale(${R.z})`;
  const m = curMap(); if (m) { b.parentElement.style.setProperty('--bw', m.w * CELL * R.z + 'px'); b.parentElement.style.setProperty('--bh', m.h * CELL * R.z + 'px'); }
  v.scrollLeft = px * R.z - cx; v.scrollTop = py * R.z - cy;
  const zl = $r('[data-t="zoom"]'); if (zl) zl.textContent = Math.round(R.z * 100) + '%';
}
function fitZoom() {
  const m = curMap(), v = $r('.rpg-view'); if (!m || !v) return;
  setZoom(Math.min(1.4, Math.max(0.3, Math.min((v.clientWidth - 24) / (m.w * CELL), (v.clientHeight - 24) / (m.h * CELL)))));
}
// segura o ponteiro no elemento enquanto arrasta (alguns toques/canetas não deixam: segue sem)
const capture = (el, e) => { try { el.setPointerCapture(e.pointerId); } catch {} };
function bindBoard() {
  const view = $r('.rpg-view');
  let pan = null, paint = null;
  view.addEventListener('wheel', e => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); const r = view.getBoundingClientRect(); setZoom(R.z * (e.deltaY < 0 ? 1.12 : 1 / 1.12), { x: e.clientX - r.left, y: e.clientY - r.top }); }, { passive: false });
  view.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.button !== 1) return;
    const tok = e.target.closest('.rpg-tok'), m = curMap(); if (!m) return;
    if (tok && R.tool === 'mover' && e.button === 0) {
      const k = tok.dataset.k, id = tok.dataset.id, t = k === 'c' ? charOf(id) : entOf(id); if (!t) return;
      const p = boardPos(e), ox = parseFloat(tok.style.left) / CELL, oy = parseFloat(tok.style.top) / CELL;
      R.drag = { k, id, el: tok, ox, oy, dx: p.x - ox, dy: p.y - oy, moved: false, can: canMove(k, t), last: 0, x: ox, y: oy };
      capture(tok, e);
      return;
    }
    if (isMaster() && ['pincel', 'revelar', 'esconder', 'armadilha'].includes(R.tool) && e.button === 0) {
      paint = { cells: new Map(), traps: [], reveal: new Set(), hide: new Set() };
      paintAt(e, paint); capture(view, e); return;
    }
    pan = { x: e.clientX, y: e.clientY, sl: view.scrollLeft, st: view.scrollTop }; capture(view, e); view.classList.add('panning');
  });
  view.addEventListener('pointermove', e => {
    const d = R.drag;
    if (d) {
      const p = boardPos(e), m = curMap(); if (!m) return;
      const nx = Math.max(0, Math.min(m.w - 1, p.x - d.dx)), ny = Math.max(0, Math.min(m.h - 1, p.y - d.dy));
      if (!d.moved && Math.hypot(nx - d.ox, ny - d.oy) < 0.15) return;
      if (!d.can) return;
      d.moved = true; d.x = nx; d.y = ny;
      d.el.classList.add('dragging'); d.el.style.left = nx * CELL + 'px'; d.el.style.top = ny * CELL + 'px';
      const t0 = performance.now(); if (t0 - d.last > 60) { d.last = t0; H.socket && H.socket.emit('rpg:drag', { cid: R.st.camp.id, k: d.k, id: d.id, x: nx, y: ny }); }
      return;
    }
    if (paint) { paintAt(e, paint); return; }
    if (pan) { view.scrollLeft = pan.sl - (e.clientX - pan.x); view.scrollTop = pan.st - (e.clientY - pan.y); }
  });
  const end = async e => {
    const d = R.drag; R.drag = null;
    if (d) {
      d.el.classList.remove('dragging');
      if (!d.moved) { select(d.k, d.id); return; }
      const r = await H.emit('rpg:move', { cid: R.st.camp.id, k: d.k, id: d.id, x: d.x, y: d.y });
      if (!r.ok) { toast(r.erro || 'Não deu para mover.', true); d.el.style.left = d.ox * CELL + 'px'; d.el.style.top = d.oy * CELL + 'px'; }
      else applyMove({ k: d.k, id: d.id, x: r.x, y: r.y, mapId: curMap() && curMap().id });
      return;
    }
    if (paint) { const p = paint; paint = null; flushPaint(p); return; }
    if (pan) { const moved = Math.abs(e.clientX - pan.x) + Math.abs(e.clientY - pan.y) > 4; pan = null; view.classList.remove('panning'); if (!moved && !e.target.closest('.rpg-tok')) select(null); }
  };
  view.addEventListener('pointerup', end);
  view.addEventListener('pointercancel', end);
  window.addEventListener('resize', onResize);
}
function onResize() { if (!R.el) { window.removeEventListener('resize', onResize); return; } setZoom(R.z); }
function paintAt(e, p) {
  const m = curMap(), pos = boardPos(e), x = Math.floor(pos.x), y = Math.floor(pos.y);
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return;
  const i = y * m.w + x;
  if (R.tool === 'pincel') {
    if (m.bg || p.cells.get(i) === R.brush) return;
    p.cells.set(i, R.brush); m.tiles = m.tiles.slice(0, i) + R.brush + m.tiles.slice(i + 1);
    const g = $r('.rpg-tiles').getContext('2d'); drawTile(g, R.brush, x, y, CELL, i);
  } else if (R.tool === 'revelar' || R.tool === 'esconder') {
    const show = R.tool === 'revelar', ch = show ? '1' : '0';
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const xx = x + a, yy = y + b; if (xx < 0 || yy < 0 || xx >= m.w || yy >= m.h) continue;
      const k = yy * m.w + xx; (show ? p.reveal : p.hide).add(k); m.seen = m.seen.slice(0, k) + ch + m.seen.slice(k + 1);
    }
    drawFog();
  } else if (R.tool === 'armadilha' && !p.traps.length) {
    const t = (m.traps || []).find(x => x.i === i);
    p.traps.push(!t ? [i, false, false] : !t.on ? [i, true, false] : [i, false, true]);
  }
}
async function flushPaint(p) {
  const m = curMap(); if (!m) return;
  const d = { cid: R.st.camp.id, mapId: m.id };
  if (p.cells.size) d.cells = [...p.cells.entries()];
  if (p.reveal.size) d.reveal = [...p.reveal];
  if (p.hide.size) d.hide = [...p.hide];
  if (p.traps.length) d.traps = p.traps;
  if (Object.keys(d).length > 2) { const r = await H.emit('rpg:map:edit', d); if (!r.ok) toast(r.erro, true); }
}
function applyMove(mv) {
  const m = curMap(); if (!m || (mv.mapId && mv.mapId !== m.id)) return;
  if (mv.k === 'c') { const ch = charOf(mv.id); if (ch) { ch.pos = ch.pos || {}; ch.pos[m.id] = [mv.x, mv.y]; } }
  else { const e = entOf(mv.id); if (e) { e.x = mv.x; e.y = mv.y; } }
  const el = $r(`.rpg-tok[data-k="${mv.k}"][data-id="${mv.id}"]`);
  if (el && !(R.drag && R.drag.id === mv.id)) {
    el.style.left = mv.x * CELL + 'px'; el.style.top = mv.y * CELL + 'px';
    const t = mv.k === 'c' ? charOf(mv.id) : entOf(mv.id);
    el.hidden = !!(fogged(m, mv.x, mv.y) && !(mv.k === 'c' && t && t.ownerId === me()));
  }
}

/* ---------- ferramentas sobre o mapa ---------- */
function renderTools() {
  const t = $r('.rpg-tools'); if (!t) return;
  const m = curMap();
  const master = isMaster() && m;
  t.innerHTML = `<div class="rpg-tool-g"><button data-t="out" aria-label="Diminuir zoom">−</button><button data-t="zoom" data-tip="Ajustar à tela">${Math.round(R.z * 100)}%</button><button data-t="in" aria-label="Aumentar zoom">+</button></div>
    ${master ? `<div class="rpg-tool-g">
      ${[['mover', '✋', 'Mover e selecionar'], ['pincel', '🖌️', 'Pincel (mudar casas)'], ['revelar', '🔦', 'Revelar névoa'], ['esconder', '🌫️', 'Esconder com névoa'], ['armadilha', '🪤', 'Armadilha (clique: criar, revelar, apagar)']].filter(x => !(x[0] === 'pincel' && m.bg)).map(([k, i, l]) => `<button data-t="tool" data-v="${k}" class="${R.tool === k ? 'on' : ''}" data-tip="${l}" aria-label="${l}">${i}</button>`).join('')}
    </div>${R.tool === 'pincel' ? `<div class="rpg-tool-g rpg-brush">${Object.entries(TILE_NAMES).map(([c, n]) => `<button data-t="brush" data-v="${esc(c)}" class="${R.brush === c ? 'on' : ''}" data-tip="${n}" aria-label="${n}"><canvas width="20" height="20" data-tile="${esc(c)}"></canvas></button>`).join('')}</div>` : ''}` : ''}`;
  t.querySelectorAll('canvas[data-tile]').forEach(cv => { const g = cv.getContext('2d'); g.scale(20 / CELL, 20 / CELL); drawTile(g, cv.dataset.tile, 0, 0, CELL, 7); });
  t.onclick = e => {
    const b = e.target.closest('[data-t]'); if (!b) return;
    const a = b.dataset.t;
    if (a === 'in') setZoom(R.z * 1.2); if (a === 'out') setZoom(R.z / 1.2); if (a === 'zoom') fitZoom();
    if (a === 'tool') { R.tool = b.dataset.v; if (R.tool !== 'mover') select(null); if (R.tool !== 'mover' && !curMap().fog && (R.tool === 'revelar' || R.tool === 'esconder')) toast('A névoa está desligada. Ligue em Mestre → Mapa para os jogadores verem a diferença.'); renderTools(); $r('.rpg-view').dataset.tool = R.tool; }
    if (a === 'brush') { R.brush = b.dataset.v; renderTools(); }
  };
}

/* ---------- combate ---------- */
function fighter(f) { return f.k === 'c' ? charOf(f.id) : entOf(f.id); }
function renderCombat() {
  const box = $r('.rpg-combat'); if (!box) return;
  const cb = R.st.camp.combat;
  if (!cb.on || !cb.order.length) { box.hidden = true; return; }
  box.hidden = false;
  box.innerHTML = `<span class="rpg-cb-r">⚔️ Rodada ${cb.round}</span><div class="rpg-cb-list">${cb.order.map((f, i) => {
    const t = fighter(f); const name = t ? t.name : '???';
    const img = t ? (f.k === 'c' ? (t.img || avatarUrl(t.ownerId)) : t.img) : null;
    return `<div class="rpg-cb-it ${i === cb.turn ? 'on' : ''} k-${f.k}" title="${esc(name)} · iniciativa ${f.init}">${img ? `<img src="${esc(img)}" alt="">` : `<span>${t && f.k === 'e' && t.emoji ? esc(t.emoji) : initial(name)}</span>`}<b>${f.init}</b></div>`;
  }).join('')}</div>${isMaster() ? '<button class="btn sm" data-c="prev" aria-label="Turno anterior">‹</button><button class="btn primary sm" data-c="next">Próximo turno ›</button>' : ''}`;
  box.onclick = e => { const b = e.target.closest('[data-c]'); if (b) call('rpg:combat', { cid: R.st.camp.id, action: b.dataset.c }); };
}

/* ---------- seleção (painel rápido da miniatura) ---------- */
function select(k, id) {
  R.sel = k ? { k, id } : null;
  $r('.rpg-toks') && R.el.querySelectorAll('.rpg-tok.sel').forEach(x => x.classList.remove('sel'));
  if (R.sel) { const el = $r(`.rpg-tok[data-k="${k}"][data-id="${id}"]`); if (el) el.classList.add('sel'); }
  renderSel();
}
function renderSel() {
  const box = $r('.rpg-selbox'); if (!box) return;
  const s = R.sel, t = s && (s.k === 'c' ? charOf(s.id) : entOf(s.id));
  if (!t) { box.hidden = true; R.sel = null; return; }
  const master = isMaster(), own = s.k === 'c' && t.ownerId === me(), canHp = master || (own && R.st.camp.rules.editOwn);
  const cls = s.k === 'c' ? R.st.camp.classes.find(c => c.id === t.classId) : null;
  const sub = s.k === 'c' ? `${cls ? esc(cls.icon + ' ' + cls.name) : 'Sem classe'} · nível ${t.level} · ${esc(H.nameOf(t.ownerId))}` : `${ENT_KIND[t.kind] || ''}${t.level ? ' · nível ' + t.level : ''}${t.hidden ? ' · escondido dos jogadores' : ''}`;
  const hpTxt = t.hpMax !== undefined && (s.k === 'c' || master || t.hp !== undefined) ? `<div class="rpg-bar hp"><i style="width:${pct(t.hp, t.hpMax)}%"></i><span>❤️ ${t.hp}/${t.hpMax}</span></div>` : '';
  const mpTxt = s.k === 'c' && t.mpMax ? `<div class="rpg-bar mp"><i style="width:${pct(t.mp, t.mpMax)}%"></i><span>🔷 ${t.mp}/${t.mpMax}</span></div>` : '';
  const stats = master && s.k === 'e' ? `<div class="rpg-sel-stats"><span>🛡️ ${t.def}</span><span>⚔️ ${t.atk >= 0 ? '+' : ''}${t.atk}</span><span>⚡ ${t.init >= 0 ? '+' : ''}${t.init}</span></div>` : s.k === 'c' ? `<div class="rpg-sel-stats"><span>🛡️ ${t.def}</span>${R.st.camp.attrs.slice(0, 6).map(a => `<span>${esc(a)} ${t.attrs[a] ?? 10} (${mod(t.attrs[a])})</span>`).join('')}</div>` : '';
  box.hidden = false;
  box.innerHTML = `<button class="rpg-sel-x" data-s="x" aria-label="Fechar">${H.ic('x')}</button>
    <div class="rpg-sel-h"><div class="rpg-sel-av" style="--tc:${esc(t.color || '#6c7cff')}">${(s.k === 'c' ? (t.img || avatarUrl(t.ownerId)) : t.img) ? `<img src="${esc(s.k === 'c' ? (t.img || avatarUrl(t.ownerId)) : t.img)}" alt="">` : `<span>${s.k === 'e' && t.emoji ? esc(t.emoji) : initial(t.name)}</span>`}</div><div><b>${esc(t.name)}</b><span class="muted small">${sub}</span></div></div>
    ${hpTxt}${mpTxt}${stats}
    ${(t.conds || []).length ? `<div class="rpg-conds">${t.conds.map(c => `<span>${COND_IC[c] || '•'} ${esc(c)}</span>`).join('')}</div>` : ''}
    ${canHp && t.hpMax !== undefined ? `<div class="rpg-hpctl"><input type="number" min="1" max="9999" value="5" aria-label="Quantidade" data-s="amt"><button class="btn sm danger" data-s="dmg">💥 Dano</button><button class="btn sm" data-s="heal">💚 Cura</button>${s.k === 'c' && t.mpMax ? '<button class="btn sm ghost" data-s="mp">−🔷 Mana</button>' : ''}</div>` : ''}
    ${master ? `<div class="rpg-condpick">${CONDS.map(c => `<button data-s="cond" data-v="${esc(c)}" class="${(t.conds || []).includes(c) ? 'on' : ''}" data-tip="${esc(c)}" aria-label="${esc(c)}">${COND_IC[c]}</button>`).join('')}</div>` : ''}
    <div class="rpg-sel-acts">
      ${s.k === 'c' ? `<button class="btn sm" data-s="sheet">📜 Ficha</button>` : ''}
      ${master && s.k === 'e' ? `<button class="btn sm" data-s="edit">✏️ Editar</button><button class="btn sm ghost" data-s="hide">${t.hidden ? '👁️ Mostrar' : '🙈 Esconder'}</button><button class="btn sm ghost" data-s="dup">⧉ Copiar</button><button class="icon-btn" data-s="del" aria-label="Apagar">${H.ic('trash')}</button>` : ''}
      ${s.k === 'e' && master && t.notes ? `<p class="rpg-notes">📝 ${esc(t.notes)}</p>` : ''}
    </div>`;
  box.onclick = async e => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    const a = b.dataset.s, cid = R.st.camp.id, amt = Math.abs(+(box.querySelector('[data-s="amt"]') || {}).value || 0);
    if (a === 'x') select(null);
    if (a === 'dmg' || a === 'heal') { if (!amt) return; call('rpg:hp', { cid, k: s.k, id: s.id, dmg: a === 'dmg' ? amt : -amt }); }
    if (a === 'mp') { if (!amt) return; call('rpg:hp', { cid, k: s.k, id: s.id, dmg: amt, field: 'mp' }); }
    if (a === 'cond') { const v = b.dataset.v, conds = (t.conds || []).includes(v) ? t.conds.filter(x => x !== v) : [...(t.conds || []), v]; call('rpg:cond', { cid, k: s.k, id: s.id, conds }); }
    if (a === 'sheet') sheetModal(t);
    if (a === 'edit') entModal(t);
    if (a === 'hide') call('rpg:ent:save', { cid, ent: { id: t.id, hidden: !t.hidden } });
    if (a === 'dup') { const { id, ...copy } = t; call('rpg:ent:save', { cid, ent: { ...copy, x: Math.min(curMap().w - 1, t.x + 1), y: t.y, name: t.name } }); }
    if (a === 'del' && await H.confirmBox('Apagar', `Tirar ${t.name} do mapa?`, 'Apagar')) { const r = await call('rpg:ent:del', { cid, id: t.id }); if (r.ok) select(null); }
  };
}

/* ---------- painel lateral ---------- */
function renderTabs() {
  const tabs = [['grupo', '🧙 Grupo'], ['dados', '🎲 Dados'], ['hist', '📜 Histórico'], ...(isMaster() ? [['mestre', '👑 Mestre']] : [])];
  if (!tabs.some(t => t[0] === R.tab)) R.tab = 'grupo';
  const nav = $r('.rpg-tabs');
  nav.innerHTML = tabs.map(([k, l]) => `<button data-tab="${k}" class="${R.tab === k ? 'on' : ''}">${l}</button>`).join('');
  nav.onclick = e => { const b = e.target.closest('[data-tab]'); if (!b) return; R.tab = b.dataset.tab; renderTabs(); renderPane(); };
}
function renderPane() {
  const p = $r('.rpg-pane'); if (!p) return;
  p.onclick = null; p.onchange = null; p.onsubmit = null;
  ({ grupo: paneGrupo, dados: paneDados, hist: paneHist, mestre: paneMestre })[R.tab](p);
}
function paneGrupo(p) {
  const c = R.st.camp, mine = myChar();
  const chars = R.st.chars.slice().sort((a, b) => (b.ownerId === me()) - (a.ownerId === me()) || a.name.localeCompare(b.name)); // o seu primeiro
  const row = ch => { const cls = c.classes.find(k => k.id === ch.classId); const img = ch.img || avatarUrl(ch.ownerId);
    return `<button class="rpg-party-it ${ch.hp <= 0 ? 'down' : ''}" data-g="char" data-id="${ch.id}"><div class="rpg-sel-av" style="--tc:${esc(ch.color)}">${img ? `<img src="${esc(img)}" alt="">` : `<span>${initial(ch.name)}</span>`}</div>
      <div class="rpg-party-in"><b>${esc(ch.name)}</b><span class="muted small">${cls ? esc(cls.icon + ' ' + cls.name) : 'Sem classe'} · nv ${ch.level} · ${esc(H.nameOf(ch.ownerId))}</span>
      <div class="rpg-bar hp sm"><i style="width:${pct(ch.hp, ch.hpMax)}%"></i><span>${ch.hp}/${ch.hpMax}</span></div>${ch.mpMax ? `<div class="rpg-bar mp sm"><i style="width:${pct(ch.mp, ch.mpMax)}%"></i><span>${ch.mp}/${ch.mpMax}</span></div>` : ''}
      ${(ch.conds || []).length ? `<div class="rpg-conds sm">${ch.conds.map(x => `<span>${COND_IC[x] || '•'} ${esc(x)}</span>`).join('')}</div>` : ''}</div></button>`; };
  const people = (ids, lbl) => ids.length ? `<div class="rpg-people"><h4>${lbl}</h4>${ids.map(u => `<div class="rpg-person">${H.av(u, 24, true)}<span>${esc(H.nameOf(u))}</span>${isMaster() && u !== c.masterId ? `<button class="icon-btn" data-g="kick" data-id="${u}" data-tip="Tirar da campanha" aria-label="Tirar da campanha">${H.ic('x')}</button>` : ''}</div>`).join('')}</div>` : '';
  p.innerHTML = `${isPlayer() && !mine && role() === 'jogador' ? `<div class="rpg-cta">🎭<div><b>Crie seu personagem</b><span class="muted small">Escolha nome, classe e atributos.</span></div><button class="btn primary sm" data-g="new">Criar</button></div>` : ''}
    ${role() === 'convidado' ? `<div class="rpg-cta">✉️<div><b>Você foi convidado</b><span class="muted small">Aceite para criar seu personagem e jogar.</span></div><button class="btn primary sm" data-g="join">Aceitar</button></div>` : ''}
    <h4 class="rpg-h">Personagens <span class="muted">${chars.length}</span>${isMaster() ? '<button class="btn sm ghost" data-g="newfor">+ Para jogador</button>' : ''}</h4>
    ${chars.length ? `<div class="rpg-party">${chars.map(row).join('')}</div>` : '<p class="muted small">Ninguém criou personagem ainda.</p>'}
    <h4 class="rpg-h">Participantes ${isMaster() ? '<button class="btn sm ghost" data-g="invite">+ Convidar</button>' : ''}</h4>
    ${people([c.masterId], '👑 Mestre')}${people(c.players, '🎭 Jogadores (' + c.players.length + '/' + c.maxPlayers + ')')}${people(c.invited, '✉️ Convidados')}
    ${role() === 'jogador' ? '<button class="btn sm ghost danger-t" data-g="leave">Sair da campanha</button>' : ''}`;
  p.onclick = async e => {
    const b = e.target.closest('[data-g]'); if (!b) return;
    const a = b.dataset.g, cid = c.id;
    if (a === 'char') { const ch = charOf(b.dataset.id); const m = curMap(); if (ch && m && ch.pos && ch.pos[m.id]) { select('c', ch.id); centerOn(ch.pos[m.id][0], ch.pos[m.id][1]); } else if (ch) sheetModal(ch); }
    if (a === 'new') sheetModal(null);
    if (a === 'newfor') pickPlayerFor();
    if (a === 'join') { const q = await call('rpg:join', { cid }, 'Você entrou na campanha!'); if (q.ok) setTimeout(() => sheetModal(null), 300); }
    if (a === 'invite') inviteModal();
    if (a === 'kick' && await H.confirmBox('Tirar da campanha', `Tirar ${H.nameOf(b.dataset.id)} da campanha? O personagem continua na mesa.`, 'Tirar')) call('rpg:kick', { cid, uid: b.dataset.id });
    if (a === 'leave' && await H.confirmBox('Sair da campanha', 'Você deixa de ser jogador. Seu personagem continua na mesa com o Mestre.', 'Sair')) call('rpg:leave', { cid });
  };
}
function centerOn(x, y) { const v = $r('.rpg-view'); if (!v) return; v.scrollTo({ left: (x + .5) * CELL * R.z - v.clientWidth / 2, top: (y + .5) * CELL * R.z - v.clientHeight / 2, behavior: 'smooth' }); }

function paneDados(p) {
  const can = isPlayer();
  const rolls = R.st.events.filter(e => e.type === 'roll').slice(-25).reverse();
  p.innerHTML = can ? `<div class="rpg-dice">${DICE.map(d => `<button data-d="${d}" class="rpg-die d${d}" data-tip="Clique: rolar 1d${d} · Shift+clique: somar na fórmula"><span>d${d}</span></button>`).join('')}</div>
    <form class="rpg-rollf" id="rpgRollF"><input id="rpgExpr" placeholder="Fórmula: 2d20+5, 4d6kh3, d100" maxlength="60" autocomplete="off" aria-label="Fórmula de dados">
      <input id="rpgLabel" placeholder="Para quê? (ataque, furtividade...)" maxlength="60" autocomplete="off" aria-label="Motivo da rolagem">
      <label class="rpg-check"><input type="checkbox" id="rpgPriv"> Secreta (só eu e o Mestre vemos)</label>
      <button class="btn primary">🎲 Rolar</button></form>
    <p class="muted small rpg-tip">kh3 = fica com os 3 maiores (vantagem: 2d20kh1). kl1 = fica com o menor (desvantagem).</p>
    ${myChar() ? `<h4 class="rpg-h">Testes do seu personagem</h4><div class="rpg-quick">${R.st.camp.attrs.map(a => `<button data-q="${esc(a)}">${esc(a)} ${mod(myChar().attrs[a])}</button>`).join('')}</div>` : ''}`
    : `<div class="rpg-empty sm">🎲<b>Só quem joga rola dados</b><span>${role() === 'convidado' ? 'Aceite o convite para jogar.' : 'Você está assistindo esta campanha.'}</span></div>`;
  p.innerHTML += `<h4 class="rpg-h">Últimas rolagens</h4><div class="rpg-feed">${rolls.length ? rolls.map(evHtml).join('') : '<p class="muted small">Nenhuma rolagem ainda.</p>'}</div>`;
  if (!can) return;
  const expr = p.querySelector('#rpgExpr');
  const roll = async (ex, label) => { const r = await call('rpg:roll', { cid: R.st.camp.id, expr: ex, label: label ?? p.querySelector('#rpgLabel').value, priv: p.querySelector('#rpgPriv').checked }); return r.ok; };
  p.onclick = e => {
    const d = e.target.closest('[data-d]');
    if (d) { if (e.shiftKey) { expr.value = addDie(expr.value, +d.dataset.d); expr.focus(); } else roll('1d' + d.dataset.d); return; }
    const q = e.target.closest('[data-q]');
    if (q) { const m = mod(myChar().attrs[q.dataset.q]); roll('1d20' + (m === '+0' ? '' : m), 'Teste de ' + q.dataset.q); }
  };
  p.querySelector('#rpgRollF').onsubmit = async e => { e.preventDefault(); if (!expr.value.trim()) return expr.focus(); if (await roll(expr.value)) { expr.value = ''; p.querySelector('#rpgLabel').value = ''; } };
}
function addDie(expr, d) {
  const re = new RegExp('(^|[+-])(\\d*)d' + d + '(?![\\d%])');
  const m = re.exec(expr);
  if (m) return expr.replace(re, (all, s, n) => s + ((+n || 1) + 1) + 'd' + d);
  return (expr ? expr + '+' : '') + '1d' + d;
}
function paneHist(p) {
  const ev = R.st.events.slice(-150).reverse();
  p.innerHTML = `${isPlayer() ? `<form class="rpg-sayf" id="rpgSayF"><textarea id="rpgSay" rows="2" maxlength="400" placeholder="${isMaster() ? 'Narre o que acontece...' : 'Descreva o que seu personagem faz...'}" aria-label="Escrever no histórico"></textarea>
      <div class="rpg-sayf-b">${isMaster() ? '<label class="rpg-check"><input type="checkbox" id="rpgSayPriv"> Só eu vejo (anotação)</label>' : '<span></span>'}<button class="btn primary sm">Enviar</button></div></form>` : ''}
    <div class="rpg-feed">${ev.length ? ev.map(evHtml).join('') : '<p class="muted small">A história começa aqui.</p>'}</div>`;
  const f = p.querySelector('#rpgSayF');
  if (f) {
    const ta = f.querySelector('textarea');
    ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); f.requestSubmit(); } };
    f.onsubmit = async e => { e.preventDefault(); if (!ta.value.trim()) return; const r = await call('rpg:say', { cid: R.st.camp.id, text: ta.value, priv: !!(f.querySelector('#rpgSayPriv') || {}).checked }); if (r.ok) ta.value = ''; };
  }
}
function evHtml(e) {
  const t = new Date(e.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (e.type === 'roll') {
    const r = e.roll;
    const parts = r.parts.map(p => p.rolls ? `<span class="rpg-dset">${esc(p.t)}: ${p.rolls.map((v, i) => `<i class="${p.kept.includes(i) ? '' : 'drop'} ${v === p.sides ? 'max' : v === 1 ? 'min' : ''}">${v}</i>`).join('')}</span>` : `<span class="rpg-dset">${p.mod > 0 ? '+' : ''}${p.mod}</span>`).join('');
    return `<div class="rpg-ev roll ${e.priv ? 'priv' : ''} ${r.crit ? 'crit' : ''} ${r.fail ? 'fail' : ''}">${H.av(e.uid, 24, false)}<div><div class="rpg-ev-h"><b>${esc(H.nameOf(e.uid))}</b>${e.text ? ` · ${esc(e.text)}` : ''}${e.priv ? ' <span class="rpg-pv">secreta</span>' : ''}<time>${t}</time></div>
      <div class="rpg-ev-roll"><code>${esc(r.expr)}</code> = <b class="rpg-total">${r.total}</b>${r.crit ? ' <span class="rpg-crit">CRÍTICO!</span>' : r.fail ? ' <span class="rpg-fail">falha crítica</span>' : ''}</div><div class="rpg-dsets">${parts}</div></div></div>`;
  }
  const ic = { sys: '📌', narr: '📖', act: '🗡️', dmg: '💥', heal: '💚', combat: '⚔️', turn: '⏳', log: '•' }[e.type] || '•';
  return `<div class="rpg-ev ${esc(e.type)} ${e.priv ? 'priv' : ''}">${e.uid && (e.type === 'narr' || e.type === 'act') ? H.av(e.uid, 24, false) : `<span class="rpg-ev-ic">${ic}</span>`}<div>${e.uid && (e.type === 'narr' || e.type === 'act') ? `<div class="rpg-ev-h"><b>${esc(H.nameOf(e.uid))}</b>${e.type === 'narr' ? ' · Mestre' : ''}${e.priv ? ' <span class="rpg-pv">anotação</span>' : ''}<time>${t}</time></div>` : ''}<p>${esc(e.text)}</p>${!(e.uid && (e.type === 'narr' || e.type === 'act')) ? `<time>${t}</time>` : ''}</div></div>`;
}

/* ---------- aba do Mestre ---------- */
let mTab = 'mapa';
function paneMestre(p) {
  const c = R.st.camp, m = curMap();
  const sub = [['mapa', '🗺️ Mapa'], ['criaturas', '👾 Criaturas'], ['combate', '⚔️ Combate'], ['sessoes', '💾 Sessões']];
  let html = `<nav class="rpg-sub">${sub.map(([k, l]) => `<button data-m="sub" data-v="${k}" class="${mTab === k ? 'on' : ''}">${l}</button>`).join('')}</nav>`;
  if (mTab === 'mapa') {
    html += `<h4 class="rpg-h">Mapas da campanha</h4><div class="rpg-maps">${R.st.maps.map(x => `<div class="rpg-map-it ${m && x.id === m.id ? 'on' : ''}"><span>${x.bg ? '🖼️' : '🗺️'} <b>${esc(x.name)}</b> <span class="muted small">${x.w}×${x.h}</span></span>
        ${m && x.id === m.id ? '<i class="muted small">no mapa agora</i>' : `<button class="btn sm" data-m="go" data-id="${x.id}">Ir para</button>`}<button class="icon-btn" data-m="ren" data-id="${x.id}" aria-label="Renomear">${H.ic('edit')}</button><button class="icon-btn" data-m="mdel" data-id="${x.id}" aria-label="Apagar mapa">${H.ic('trash')}</button></div>`).join('') || '<p class="muted small">Nenhum mapa.</p>'}</div>
      <h4 class="rpg-h">Gerar mapa</h4>
      <form class="rpg-gen" id="rpgGen">
        <label class="field">Tipo<select id="gKind">${Object.entries(MAP_KINDS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
        <div class="rpg-row"><label class="field">Largura<input id="gW" type="number" min="12" max="60" value="30"></label><label class="field">Altura<input id="gH" type="number" min="10" max="60" value="22"></label></div>
        <div class="rpg-row"><label class="field">Salas<input id="gRooms" type="number" min="1" max="20" value="8"></label><label class="field">Armadilhas<input id="gTraps" type="number" min="0" max="30" value="3"></label></div>
        <label class="field">Obstáculos <span class="muted small" id="gObstO">30%</span><input id="gObst" type="range" min="0" max="100" value="30"></label>
        <div class="rpg-row"><label class="rpg-check"><input type="checkbox" id="gDoors" checked> Portas</label><label class="rpg-check"><input type="checkbox" id="gWide"> Corredores largos</label></div>
        <label class="field">Semente <span class="muted small">(opcional: o mesmo número gera o mesmo mapa)</span><input id="gSeed" inputmode="numeric" maxlength="10" placeholder="aleatória"></label>
        <label class="field">Nome<input id="gName" maxlength="40" placeholder="Nome do mapa"></label>
        <div class="rpg-row">${m && !m.bg ? '<button type="button" class="btn sm" data-m="regen">♻️ Refazer o atual</button>' : ''}<button class="btn primary sm">✨ Gerar novo mapa</button></div>
      </form>
      <h4 class="rpg-h">Importar mapa (PNG, JPG ou WEBP)</h4>
      <div class="rpg-row"><label class="field">Largura em casas<input id="iW" type="number" min="4" max="80" value="30"></label><button class="btn sm" data-m="import">📁 Escolher imagem</button></div>
      ${m ? `<h4 class="rpg-h">Névoa de guerra</h4>
      <div class="rpg-row"><label class="rpg-check"><input type="checkbox" id="mFog" ${m.fog ? 'checked' : ''}> Ligada (os jogadores só veem o que você revelar)</label></div>
      <div class="rpg-row"><button class="btn sm" data-m="fogshow">Revelar tudo</button><button class="btn sm" data-m="foghide">Esconder tudo</button></div>
      <p class="muted small">Use 🔦 e 🌫️ nas ferramentas do mapa para revelar ou esconder com o pincel. 🪤 cria armadilhas (só você vê até revelar).</p>
      <label class="field">Anotações do mapa (só você vê)<textarea id="mNotes" rows="3" maxlength="2000">${esc(m.notes || '')}</textarea></label>` : ''}`;
  } else if (mTab === 'criaturas') {
    const ents = R.st.ents.filter(e => m && e.mapId === m.id);
    html += `<div class="rpg-row"><button class="btn primary sm" data-m="newent">+ Nova criatura, chefe, NPC ou objeto</button></div>
      <h4 class="rpg-h">Rápidos</h4><div class="rpg-presets">${PRESETS.map((x, i) => `<button data-m="preset" data-i="${i}" data-tip="${esc(ENT_KIND[x[1]])} · vida ${x[3]}">${x[2]} ${esc(x[0])}</button>`).join('')}</div>
      <h4 class="rpg-h">Neste mapa <span class="muted">${ents.length}</span></h4>
      <div class="rpg-ents">${ents.map(e => `<div class="rpg-ent-it ${e.hidden ? 'hid' : ''}"><button class="rpg-ent-main" data-m="selent" data-id="${e.id}"><span class="rpg-ent-ic">${e.img ? `<img src="${esc(e.img)}" alt="">` : esc(e.emoji || '👾')}</span><span><b>${esc(e.name)}</b><span class="muted small">${ENT_KIND[e.kind]} · ❤️ ${e.hp}/${e.hpMax}${e.hidden ? ' · escondido' : ''}</span></span></button>
        <button class="icon-btn" data-m="hide" data-id="${e.id}" aria-label="${e.hidden ? 'Mostrar' : 'Esconder'}" data-tip="${e.hidden ? 'Mostrar para os jogadores' : 'Esconder dos jogadores'}">${e.hidden ? '🙈' : '👁️'}</button></div>`).join('') || '<p class="muted small">Nenhuma criatura neste mapa.</p>'}</div>`;
  } else if (mTab === 'combate') {
    const cb = c.combat;
    const cand = [...R.st.chars.filter(ch => m && ch.pos && ch.pos[m.id]).map(ch => ({ k: 'c', id: ch.id, name: ch.name, on: true })), ...R.st.ents.filter(e => m && e.mapId === m.id && e.kind !== 'objeto').map(e => ({ k: 'e', id: e.id, name: e.name + (e.hidden ? ' (escondido)' : ''), on: !e.hidden }))];
    html += cb.on ? `<p>⚔️ Combate em andamento · rodada <b>${cb.round}</b></p>
      <ol class="rpg-init">${cb.order.map((f, i) => { const t = fighter(f); return `<li class="${i === cb.turn ? 'on' : ''}"><b>${f.init}</b> ${esc(t ? t.name : '???')}<span class="spacer"></span><button class="icon-btn" data-m="up" data-i="${i}" aria-label="Subir">${H.ic('up')}</button><button class="icon-btn" data-m="down" data-i="${i}" aria-label="Descer">${H.ic('down')}</button></li>`; }).join('')}</ol>
      <div class="rpg-row"><button class="btn sm" data-m="cprev">‹ Anterior</button><button class="btn primary sm" data-m="cnext">Próximo ›</button><button class="btn sm danger" data-m="cend">Encerrar combate</button></div>`
      : `<p class="muted small">Escolha quem luta. A iniciativa é rolada sozinha (d20 + DES dos personagens, ou o bônus de iniciativa da criatura).</p>
      <div class="rpg-pick">${cand.map(x => `<label class="rpg-check"><input type="checkbox" data-k="${x.k}" data-id="${x.id}" ${x.on ? 'checked' : ''}> ${esc(x.name)}</label>`).join('') || '<p class="muted small">Coloque personagens ou criaturas no mapa primeiro.</p>'}</div>
      ${cand.length ? '<button class="btn primary sm" data-m="cstart">⚔️ Começar combate</button>' : ''}`;
  } else if (mTab === 'sessoes') {
    html += `<p class="muted small">Salve o estado do jogo (mapas, criaturas, vida, posições e combate) para voltar depois.</p>
      <form class="rpg-row" id="rpgSnapF"><input id="snapName" maxlength="60" placeholder="Nome (ex.: Antes do chefe)" aria-label="Nome da sessão"><button class="btn primary sm">💾 Salvar</button></form>
      <div class="rpg-snaps">${R.st.snaps.map(s => `<div class="rpg-map-it"><span><b>${esc(s.name)}</b> <span class="muted small">${new Date(s.at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></span><button class="btn sm" data-m="sload" data-id="${s.id}">Voltar para esta</button><button class="icon-btn" data-m="sdel" data-id="${s.id}" aria-label="Apagar">${H.ic('trash')}</button></div>`).join('') || '<p class="muted small">Nenhuma sessão salva.</p>'}</div>`;
  }
  p.innerHTML = html;
  const cid = c.id;
  const gen = p.querySelector('#rpgGen');
  if (gen) {
    const o = gen.querySelector('#gObst'); o.oninput = () => { gen.querySelector('#gObstO').textContent = o.value + '%'; };
    const data = () => ({ cid, kind: gen.querySelector('#gKind').value, w: +gen.querySelector('#gW').value, h: +gen.querySelector('#gH').value, rooms: +gen.querySelector('#gRooms').value, traps: +gen.querySelector('#gTraps').value, obst: +o.value, doors: gen.querySelector('#gDoors').checked, wide: gen.querySelector('#gWide').checked ? 2 : 1, seed: gen.querySelector('#gSeed').value.trim() === '' ? null : +gen.querySelector('#gSeed').value, name: gen.querySelector('#gName').value });
    gen.onsubmit = async e => { e.preventDefault(); const r = await call('rpg:map:gen', data()); if (r.ok) toast('Mapa gerado!'); };
    const rg = gen.querySelector('[data-m="regen"]'); if (rg) rg.onclick = async () => { if (await H.confirmBox('Refazer mapa', 'O mapa atual será trocado por um novo com estas opções. As criaturas ficam onde estão.', 'Refazer', false)) call('rpg:map:gen', { ...data(), replace: m.id }); };
  }
  const fog = p.querySelector('#mFog'); if (fog) fog.onchange = () => call('rpg:map:edit', { cid, mapId: m.id, fog: fog.checked });
  const notes = p.querySelector('#mNotes'); if (notes) notes.onchange = () => call('rpg:map:edit', { cid, mapId: m.id, notes: notes.value });
  const sf = p.querySelector('#rpgSnapF'); if (sf) sf.onsubmit = async e => { e.preventDefault(); const r = await call('rpg:snap:save', { cid, name: sf.querySelector('#snapName').value }, 'Sessão salva.'); if (r.ok) sf.reset(); };
  p.onclick = async e => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    const a = b.dataset.m, id = b.dataset.id;
    if (a === 'sub') { mTab = b.dataset.v; renderPane(); }
    if (a === 'go') call('rpg:map:set', { cid, mapId: id });
    if (a === 'ren') { const x = R.st.maps.find(q => q.id === id); const n = await askText('Nome do mapa', x ? x.name : '', 40); if (n) { const r = await call('rpg:map:edit', { cid, mapId: id, name: n }); if (r.ok && x) { x.name = n.trim().slice(0, 40) || x.name; if (R.st.map && R.st.map.id === id) R.st.map.name = x.name; renderPane(); renderTop(); } } }
    if (a === 'mdel' && await H.confirmBox('Apagar mapa', 'O mapa e as criaturas dele serão apagados.', 'Apagar')) call('rpg:map:del', { cid, mapId: id });
    if (a === 'import') importMap(+p.querySelector('#iW').value || 30);
    if (a === 'fogshow') call('rpg:map:edit', { cid, mapId: m.id, fogAll: 'show' });
    if (a === 'foghide') call('rpg:map:edit', { cid, mapId: m.id, fogAll: 'hide' });
    if (a === 'newent') entModal(null);
    if (a === 'preset') { const [name, kind, emoji, hp, def, atk, level] = PRESETS[+b.dataset.i]; const pos = viewCenter(); call('rpg:ent:save', { cid, ent: { name, kind, emoji, hpMax: hp, hp, def, atk, level, x: pos.x, y: pos.y } }); }
    if (a === 'selent') { const en = entOf(id); if (en) { select('e', id); centerOn(en.x, en.y); } }
    if (a === 'hide') { const en = entOf(id); if (en) call('rpg:ent:save', { cid, ent: { id, hidden: !en.hidden } }); }
    if (a === 'cstart') { const ids = [...p.querySelectorAll('.rpg-pick input:checked')].map(x => ({ k: x.dataset.k, id: x.dataset.id })); call('rpg:combat', { cid, action: 'start', ids }); }
    if (a === 'cnext') call('rpg:combat', { cid, action: 'next' });
    if (a === 'cprev') call('rpg:combat', { cid, action: 'prev' });
    if (a === 'cend' && await H.confirmBox('Encerrar combate', 'A ordem de iniciativa será apagada.', 'Encerrar')) call('rpg:combat', { cid, action: 'end' });
    if (a === 'up' || a === 'down') { const i = +b.dataset.i, j = a === 'up' ? i - 1 : i + 1, o = c.combat.order.slice(); if (j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; call('rpg:combat', { cid, action: 'set', order: o }); }
    if (a === 'sload' && await H.confirmBox('Voltar para a sessão', 'Mapas, criaturas, vida e posições voltam a como estavam quando você salvou. O histórico continua.', 'Voltar', false)) call('rpg:snap:load', { cid, id });
    if (a === 'sdel' && await H.confirmBox('Apagar sessão salva', 'Não dá para desfazer.', 'Apagar')) call('rpg:snap:del', { cid, id });
  };
}
// janela de texto (o app de computador não tem o prompt() do navegador)
function askText(title, value, max) {
  return new Promise(res => {
    let done = false;
    H.modal(`<div class="modal-h"><h2>${esc(title)}</h2></div><div class="modal-b"><input class="input" id="rpgAsk" maxlength="${max}" value="${esc(value)}" aria-label="${esc(title)}"></div>
      <div class="modal-f"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="rpgAskOk">Salvar</button></div>`, (m, close) => {
      const i = m.querySelector('#rpgAsk'), ok = () => { done = true; const v = i.value.trim(); close(); res(v || null); };
      m.querySelector('#rpgAskOk').onclick = ok;
      i.onkeydown = e => { if (e.key === 'Enter') ok(); };
      m.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => { if (!done) res(null); }));
      new MutationObserver((_, o) => { if (!m.isConnected) { o.disconnect(); if (!done) res(null); } }).observe(document.body, { childList: true, subtree: true });
    });
  });
}
function viewCenter() {
  const v = $r('.rpg-view'), m = curMap(); if (!v || !m) return { x: 0, y: 0 };
  return { x: Math.max(0, Math.min(m.w - 1, Math.floor((v.scrollLeft + v.clientWidth / 2) / R.z / CELL))), y: Math.max(0, Math.min(m.h - 1, Math.floor((v.scrollTop + v.clientHeight / 2) / R.z / CELL))) };
}
async function importMap(cells) {
  const f = await H.pickFile('image/png,image/jpeg,image/webp');
  if (!f) return;
  toast('Enviando o mapa...');
  const up = await upImg(f, 4096); if (!up) return;
  const w = Math.max(4, Math.min(80, Math.round(cells))), h = Math.max(4, Math.min(80, Math.round(w * up.h / up.w)));
  const r = await call('rpg:map:img', { cid: R.st.camp.id, url: up.url, w, h, name: f.name.replace(/\.[^.]+$/, '').slice(0, 40) });
  if (r.ok) toast(`Mapa importado (${w}×${h} casas).`);
}

/* ---------- janelas: ficha, criatura, configurações, convites ---------- */
function sheetModal(ch, ownerId) {
  const c = R.st.camp, master = isMaster(), own = ch ? ch.ownerId === me() : true;
  const edit = master || (own && (!ch || c.rules.editOwn));
  const d = ch ? JSON.parse(JSON.stringify(ch)) : { name: '', classId: c.classes[0] ? c.classes[0].id : null, level: 1, hp: 10, hpMax: 10, mp: 0, mpMax: 0, def: 10, attrs: Object.fromEntries(c.attrs.map(a => [a, 10])), skills: '', inv: [], conds: [], notes: '', img: null, color: '#6c7cff' };
  if (!ch) { const cl = c.classes.find(k => k.id === d.classId); if (cl) applyClass(d, cl, c); }
  const dis = edit ? '' : 'disabled';
  const classOpts = `<option value="">Sem classe</option>` + c.classes.map(k => `<option value="${k.id}" ${d.classId === k.id ? 'selected' : ''}>${esc(k.icon + ' ' + k.name)}</option>`).join('');
  H.modal(`<div class="modal-h"><h2>📜 ${ch ? esc(ch.name) : 'Novo personagem'}</h2><p>${ch ? `De ${esc(H.nameOf(ch.ownerId))}` : ownerId && ownerId !== me() ? `Para ${esc(H.nameOf(ownerId))}` : 'Seu personagem nesta campanha.'}${edit ? '' : ' · só o Mestre pode mudar.'}</p></div>
    <div class="modal-b rpg-form rpg-sheet">
      <div class="rpg-sheet-top"><button type="button" class="rpg-portrait" id="shImg" ${dis} style="--tc:${esc(d.color)}" aria-label="Retrato">${d.img || avatarUrl(ch ? ch.ownerId : (ownerId || me())) ? `<img src="${esc(d.img || avatarUrl(ch ? ch.ownerId : (ownerId || me())))}" alt="">` : '<span>🙂</span>'}</button>
        <div style="flex:1;min-width:0;display:grid;gap:8px"><label class="field">Nome<input id="shName" maxlength="40" value="${esc(d.name)}" ${dis} placeholder="Nome do personagem"></label>
        <div class="rpg-row"><label class="field">Classe<select id="shClass" ${dis}>${classOpts}</select></label><label class="field">Nível<input id="shLvl" type="number" min="1" max="99" value="${d.level}" ${dis}></label><label class="field">Cor<input id="shColor" type="color" value="${esc(d.color)}" ${dis}></label></div></div></div>
      <p class="muted small" id="shClassDesc"></p>
      <div class="rpg-row rpg-vitals"><label class="field">❤️ Vida<input id="shHp" type="number" value="${d.hp}" ${dis}></label><label class="field">Máx.<input id="shHpMax" type="number" min="1" value="${d.hpMax}" ${dis}></label><label class="field">🔷 Mana<input id="shMp" type="number" min="0" value="${d.mp}" ${dis}></label><label class="field">Máx.<input id="shMpMax" type="number" min="0" value="${d.mpMax}" ${dis}></label><label class="field">🛡️ Defesa<input id="shDef" type="number" min="0" max="99" value="${d.def}" ${dis}></label></div>
      <div class="rpg-attrs">${c.attrs.map(a => `<label class="rpg-attr"><span>${esc(a)}</span><input type="number" min="1" max="30" data-attr="${esc(a)}" value="${d.attrs[a] ?? 10}" ${dis}><i>${mod(d.attrs[a])}</i></label>`).join('')}</div>
      <label class="field">Habilidades e magias <span class="muted small">(uma por linha)</span><textarea id="shSkills" rows="3" maxlength="1500" ${dis}>${esc(d.skills)}</textarea></label>
      <div class="field">Inventário<div class="rpg-inv" id="shInv"></div>${edit ? '<button type="button" class="btn sm ghost" id="shInvAdd">+ Item</button>' : ''}</div>
      ${master ? `<div class="field">Condições<div class="rpg-condpick big" id="shConds">${CONDS.map(x => `<button type="button" data-v="${esc(x)}" class="${d.conds.includes(x) ? 'on' : ''}">${COND_IC[x]} ${esc(x)}</button>`).join('')}</div></div>` : (d.conds.length ? `<div class="rpg-conds">${d.conds.map(x => `<span>${COND_IC[x] || '•'} ${esc(x)}</span>`).join('')}</div>` : '')}
      <label class="field">Anotações<textarea id="shNotes" rows="2" maxlength="2000" ${dis}>${esc(d.notes)}</textarea></label>
    </div>
    <div class="modal-f">${ch && (master || own) ? '<button class="btn ghost danger-t" id="shDel">Apagar personagem</button><span class="spacer" style="flex:1"></span>' : ''}<button class="btn ghost" data-close>${edit ? 'Cancelar' : 'Fechar'}</button>${edit ? `<button class="btn primary" id="shSave">${ch ? 'Salvar' : 'Criar personagem'}</button>` : ''}</div>`, (m, close) => {
    const q = s => m.querySelector(s);
    const drawInv = () => {
      q('#shInv').innerHTML = d.inv.length ? d.inv.map((it, i) => `<div class="rpg-inv-it"><input value="${esc(it.name)}" data-i="${i}" data-f="name" maxlength="40" ${dis} aria-label="Item"><input type="number" min="0" value="${it.qty}" data-i="${i}" data-f="qty" ${dis} aria-label="Quantidade"><input value="${esc(it.note || '')}" data-i="${i}" data-f="note" maxlength="120" placeholder="nota" ${dis} aria-label="Nota">${edit ? `<button type="button" class="icon-btn" data-del="${i}" aria-label="Tirar item">${H.ic('x')}</button>` : ''}</div>`).join('') : '<p class="muted small" style="margin:0">Mochila vazia.</p>';
    };
    drawInv();
    const descCls = () => { const cl = c.classes.find(k => k.id === q('#shClass').value); q('#shClassDesc').textContent = cl ? `${cl.desc} Vida base ${cl.hp}, mana ${cl.mp}${Object.keys(cl.mods).length ? ', bônus ' + Object.entries(cl.mods).map(([a, v]) => `${a} ${v >= 0 ? '+' : ''}${v}`).join(' ') : ''}.` : ''; };
    descCls();
    q('#shInv').oninput = e => { const t = e.target; if (t.dataset.i === undefined) return; const it = d.inv[+t.dataset.i]; if (!it) return; it[t.dataset.f] = t.dataset.f === 'qty' ? +t.value : t.value; };
    q('#shInv').onclick = e => { const b = e.target.closest('[data-del]'); if (b) { d.inv.splice(+b.dataset.del, 1); drawInv(); } };
    const add = q('#shInvAdd'); if (add) add.onclick = () => { d.inv.push({ name: 'Item', qty: 1, note: '' }); drawInv(); };
    m.querySelectorAll('[data-attr]').forEach(i => { i.oninput = () => { i.nextElementSibling.textContent = mod(i.value); }; });
    // habilidades que a classe preencheu sozinha: trocando de classe, elas são trocadas (se a pessoa não mexeu)
    let autoSkills = !ch ? d.skills : null;
    q('#shClass').onchange = () => {
      descCls();
      // personagem novo: a classe preenche vida, mana, bônus e habilidades (dá para mudar depois)
      if (!ch) {
        const cl = c.classes.find(k => k.id === q('#shClass').value); const tmp = { attrs: Object.fromEntries(c.attrs.map(a => [a, 10])) };
        const sk = q('#shSkills'), untouched = !sk.value.trim() || sk.value === autoSkills;
        if (cl) { applyClass(tmp, cl, c); q('#shHp').value = q('#shHpMax').value = tmp.hpMax; q('#shMp').value = q('#shMpMax').value = tmp.mpMax; }
        if (untouched) { sk.value = cl ? cl.skills : ''; autoSkills = sk.value; }
        m.querySelectorAll('[data-attr]').forEach(i => { i.value = tmp.attrs[i.dataset.attr] ?? 10; i.nextElementSibling.textContent = mod(i.value); });
      }
    };
    const condBox = q('#shConds'); if (condBox) condBox.onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; const v = b.dataset.v; d.conds = d.conds.includes(v) ? d.conds.filter(x => x !== v) : [...d.conds, v]; b.classList.toggle('on'); };
    if (edit) q('#shImg').onclick = async () => { const f = await H.pickFile(); const up = await upImg(f, 512); if (up) { d.img = up.url; q('#shImg').innerHTML = `<img src="${esc(up.url)}" alt="">`; } };
    const save = q('#shSave');
    if (save) save.onclick = async () => {
      const x = { ...d, id: ch ? ch.id : undefined, ownerId: ch ? ch.ownerId : (ownerId || undefined), custom: true,
        name: q('#shName').value, classId: q('#shClass').value || null, level: +q('#shLvl').value, color: q('#shColor').value,
        hp: +q('#shHp').value, hpMax: +q('#shHpMax').value, mp: +q('#shMp').value, mpMax: +q('#shMpMax').value, def: +q('#shDef').value,
        attrs: Object.fromEntries([...m.querySelectorAll('[data-attr]')].map(i => [i.dataset.attr, +i.value])), skills: q('#shSkills').value, notes: q('#shNotes').value };
      if (!x.name.trim()) return toast('Dê um nome para o personagem.', true);
      const r = await call('rpg:char:save', { cid: c.id, char: x }, ch ? 'Ficha salva.' : 'Personagem criado!');
      if (r.ok) close();
    };
    const del = q('#shDel');
    if (del) del.onclick = async () => { if (await H.confirmBox('Apagar personagem', `Apagar ${ch.name}? Não dá para desfazer.`, 'Apagar')) { const r = await call('rpg:char:del', { cid: c.id, id: ch.id }); if (r.ok) { close(); if (R.sel && R.sel.id === ch.id) select(null); } } };
  });
}
function applyClass(d, cl, c) {
  d.hpMax = d.hp = cl.hp; d.mpMax = d.mp = cl.mp;
  for (const a of c.attrs) d.attrs[a] = Math.max(1, Math.min(30, 10 + (cl.mods[a] || 0)));
  if (!d.skills) d.skills = cl.skills;
}
function pickPlayerFor() {
  const c = R.st.camp, list = [c.masterId, ...c.players];
  H.modal(`<div class="modal-h"><h2>Personagem para quem?</h2><p>O jogador vai poder mover e editar (se você deixar).</p></div>
    <div class="modal-b"><div class="rpg-pick">${list.map(u => `<button class="rpg-person btn ghost" data-u="${u}">${H.av(u, 24, false)} ${esc(H.nameOf(u))}${u === me() ? ' (você)' : ''}</button>`).join('')}</div></div>
    <div class="modal-f"><button class="btn ghost" data-close>Cancelar</button></div>`, (m, close) => {
    m.querySelector('.rpg-pick').onclick = e => { const b = e.target.closest('[data-u]'); if (!b) return; close(); sheetModal(null, b.dataset.u); };
  });
}
function entModal(e) {
  const d = e ? { ...e } : { kind: 'monstro', name: '', emoji: '👾', img: null, size: 1, hpMax: 10, hp: 10, def: 10, atk: 2, level: 1, init: 0, hidden: false, notes: '', color: '#d9822b' };
  H.modal(`<div class="modal-h"><h2>${e ? '✏️ ' + esc(e.name) : '👾 Nova criatura'}</h2><p>Monstros, chefes, NPCs e objetos. Use um PNG com fundo transparente para ficar bonito no mapa.</p></div>
    <div class="modal-b rpg-form">
      <div class="rpg-sheet-top"><button type="button" class="rpg-portrait sq" id="enImg" style="--tc:${esc(d.color)}" aria-label="Imagem">${d.img ? `<img src="${esc(d.img)}" alt="">` : `<span>${esc(d.emoji || '👾')}</span>`}</button>
        <div style="flex:1;min-width:0;display:grid;gap:8px"><label class="field">Nome<input id="enName" maxlength="40" value="${esc(d.name)}" placeholder="Dragão Ancião"></label>
        <div class="rpg-row"><label class="field">Tipo<select id="enKind">${Object.entries(ENT_KIND).map(([k, l]) => `<option value="${k}" ${d.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label><label class="field">Emoji<input id="enEmoji" maxlength="8" value="${esc(d.emoji || '')}"></label><label class="field">Cor<input id="enColor" type="color" value="${esc(d.color)}"></label></div></div></div>
      <div class="rpg-row">${d.img ? '<button type="button" class="btn sm ghost" id="enImgX">Tirar imagem (usar emoji)</button>' : ''}<span class="muted small">Clique na imagem para enviar PNG, WEBP ou JPG.</span></div>
      <div class="rpg-row rpg-vitals"><label class="field">❤️ Vida<input id="enHp" type="number" value="${d.hp}"></label><label class="field">Máx.<input id="enHpMax" type="number" min="0" value="${d.hpMax}"></label><label class="field">🛡️ Defesa<input id="enDef" type="number" min="0" max="99" value="${d.def}"></label><label class="field">⚔️ Ataque<input id="enAtk" type="number" min="-20" max="50" value="${d.atk}"></label></div>
      <div class="rpg-row rpg-vitals"><label class="field">Nível<input id="enLvl" type="number" min="0" max="99" value="${d.level}"></label><label class="field">⚡ Iniciativa<input id="enInit" type="number" min="-10" max="20" value="${d.init}"></label><label class="field">Tamanho (casas)<select id="enSize">${[1, 2, 3, 4, 5, 6].map(n => `<option value="${n}" ${d.size === n ? 'selected' : ''}>${n}×${n}</option>`).join('')}</select></label></div>
      <label class="rpg-check"><input type="checkbox" id="enHid" ${d.hidden ? 'checked' : ''}> Escondido dos jogadores (só você vê)</label>
      <label class="field">Anotações (só você vê)<textarea id="enNotes" rows="2" maxlength="1000">${esc(d.notes || '')}</textarea></label>
    </div>
    <div class="modal-f"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="enSave">${e ? 'Salvar' : 'Colocar no mapa'}</button></div>`, (m, close) => {
    const q = s => m.querySelector(s);
    q('#enImg').onclick = async () => { const f = await H.pickFile('image/png,image/webp,image/jpeg,image/gif'); const up = await upImg(f, 768); if (up) { d.img = up.url; q('#enImg').innerHTML = `<img src="${esc(up.url)}" alt="">`; } };
    const ix = q('#enImgX'); if (ix) ix.onclick = () => { d.img = null; q('#enImg').innerHTML = `<span>${esc(q('#enEmoji').value || '👾')}</span>`; ix.remove(); };
    q('#enKind').onchange = () => { if (!e) q('#enColor').value = { chefe: '#ff3b3b', npc: '#3fb97a', objeto: '#9aa4b6', monstro: '#d9822b' }[q('#enKind').value]; };
    q('#enSave').onclick = async () => {
      const pos = viewCenter();
      const x = { id: e ? e.id : undefined, kind: q('#enKind').value, name: q('#enName').value, emoji: q('#enEmoji').value, img: d.img, color: q('#enColor').value, hp: +q('#enHp').value, hpMax: +q('#enHpMax').value, def: +q('#enDef').value, atk: +q('#enAtk').value, level: +q('#enLvl').value, init: +q('#enInit').value, size: +q('#enSize').value, hidden: q('#enHid').checked, notes: q('#enNotes').value, conds: d.conds || [] };
      if (!e) { x.x = pos.x; x.y = pos.y; }
      if (!x.name.trim()) return toast('Dê um nome.', true);
      const r = await call('rpg:ent:save', { cid: R.st.camp.id, ent: x }, e ? 'Salvo.' : `${x.name} entrou no mapa.`);
      if (r.ok) close();
    };
  });
}
function settingsModal() {
  const c = R.st.camp; let cover = c.cover;
  const classes = JSON.parse(JSON.stringify(c.classes));
  const rules = { ...c.rules };
  const RL = [['grid', 'Andar pela grade (encaixa nas casas)'], ['lock', 'Travar movimentação dos jogadores'], ['walls', 'Paredes e obstáculos bloqueiam os jogadores'], ['editOwn', 'Jogadores editam a própria ficha e vida'], ['monsterHp', 'Jogadores veem a vida dos monstros'], ['spect', 'Membros que não jogam podem assistir']];
  H.modal(`<div class="modal-h"><h2>⚙️ Campanha</h2><p>Só você (o Mestre) muda isto. Ser Mestre vale só nesta campanha.</p></div>
    <div class="modal-b rpg-form rpg-set">
      <label class="field">Nome<input id="csName" maxlength="60" value="${esc(c.name)}"></label>
      <label class="field">Descrição<textarea id="csDesc" rows="2" maxlength="1000">${esc(c.desc)}</textarea></label>
      <div class="field">Capa<div class="rpg-cover-pick ${cover ? 'on' : ''}" id="csCover" ${cover ? `style="background-image:url('${esc(cover)}')"` : ''}><span>🖼️ Trocar imagem</span></div></div>
      <div class="rpg-row"><label class="field">Estado<select id="csState">${[['ativa', 'Ativa'], ['pausada', 'Pausada (ninguém move)'], ['encerrada', 'Encerrada']].map(([k, l]) => `<option value="${k}" ${c.state === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="field">Máx. jogadores<input id="csMax" type="number" min="1" max="20" value="${c.maxPlayers}"></label></div>
      <label class="rpg-check"><input type="checkbox" id="csOpen" ${c.open ? 'checked' : ''}> Qualquer membro pode entrar sem convite</label>
      <h4 class="rpg-h">Regras</h4><div class="rpg-rules">${RL.map(([k, l]) => `<label class="rpg-check"><input type="checkbox" data-rule="${k}" ${rules[k] ? 'checked' : ''}> ${l}</label>`).join('')}</div>
      <label class="field">Atributos <span class="muted small">(separados por vírgula, até 8)</span><input id="csAttrs" maxlength="80" value="${esc(c.attrs.join(', '))}"></label>
      <h4 class="rpg-h">Classes <button type="button" class="btn sm ghost" id="csClsAdd">+ Classe</button></h4><div class="rpg-classes" id="csCls"></div>
      <h4 class="rpg-h">Passar o papel de Mestre</h4>
      <div class="rpg-row"><select class="input" id="csMaster" style="flex:1;width:auto"><option value="">Escolha alguém do ${c.scope === 'g' ? 'grupo' : 'conversa'}</option>${scopeMembers().filter(u => u !== c.masterId).map(u => `<option value="${u}">${esc(H.nameOf(u))}</option>`).join('')}</select><button type="button" class="btn sm" id="csMasterGo">Passar</button></div>
    </div>
    <div class="modal-f"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="csSave">Salvar</button></div>`, (m, close) => {
    const q = s => m.querySelector(s);
    const drawCls = () => {
      q('#csCls').innerHTML = classes.map((k, i) => `<div class="rpg-cls"><div class="rpg-row"><input value="${esc(k.icon)}" data-i="${i}" data-f="icon" maxlength="8" class="rpg-cls-ic" aria-label="Ícone"><input value="${esc(k.name)}" data-i="${i}" data-f="name" maxlength="32" aria-label="Nome da classe"><label>❤️<input type="number" min="1" max="999" value="${k.hp}" data-i="${i}" data-f="hp" aria-label="Vida base"></label><label>🔷<input type="number" min="0" max="999" value="${k.mp}" data-i="${i}" data-f="mp" aria-label="Mana base"></label><button type="button" class="icon-btn" data-del="${i}" aria-label="Apagar classe">${H.ic('trash')}</button></div>
        <input value="${esc(k.desc)}" data-i="${i}" data-f="desc" maxlength="300" placeholder="Descrição" aria-label="Descrição">
        <div class="rpg-row"><input value="${esc(Object.entries(k.mods).map(([a, v]) => `${a}${v >= 0 ? '+' : ''}${v}`).join(' '))}" data-i="${i}" data-f="mods" placeholder="Bônus: FOR+2 CON+1" aria-label="Bônus de atributos"><input value="${esc(k.skills.replace(/\n/g, '; '))}" data-i="${i}" data-f="skills" maxlength="800" placeholder="Habilidades (separe com ;)" aria-label="Habilidades"></div></div>`).join('') || '<p class="muted small">Sem classes: os jogadores criam livremente.</p>';
    };
    drawCls();
    q('#csCls').oninput = e => {
      const t = e.target, k = classes[+t.dataset.i]; if (!k) return;
      const f = t.dataset.f;
      if (f === 'mods') { k.mods = {}; for (const mm of t.value.toUpperCase().matchAll(/([A-ZÇ]{2,6})\s*([+-]\s*\d+)/g)) k.mods[mm[1]] = +mm[2].replace(/\s/g, ''); }
      else if (f === 'skills') k.skills = t.value.split(';').map(s => s.trim()).filter(Boolean).join('\n');
      else if (f === 'hp' || f === 'mp') k[f] = +t.value; else k[f] = t.value;
    };
    q('#csCls').onclick = e => { const b = e.target.closest('[data-del]'); if (b) { classes.splice(+b.dataset.del, 1); drawCls(); } };
    q('#csClsAdd').onclick = () => { classes.push({ name: 'Nova classe', icon: '🛡️', desc: '', hp: 8, mp: 0, mods: {}, skills: '' }); drawCls(); };
    q('#csCover').onclick = async () => { const f = await H.pickFile(); const up = await upImg(f, 1600); if (up) { cover = up.url; q('#csCover').style.backgroundImage = `url('${up.url}')`; q('#csCover').classList.add('on'); } };
    q('#csMasterGo').onclick = async () => {
      const u = q('#csMaster').value; if (!u) return;
      if (await H.confirmBox('Passar o papel de Mestre', `${H.nameOf(u)} vai controlar a campanha. Você vira jogador.`, 'Passar', false)) { const r = await call('rpg:master', { cid: c.id, uid: u }, 'Agora você é jogador nesta campanha.'); if (r.ok) close(); }
    };
    q('#csSave').onclick = async () => {
      m.querySelectorAll('[data-rule]').forEach(i => { rules[i.dataset.rule] = i.checked; });
      const r = await call('rpg:update', { cid: c.id, name: q('#csName').value, desc: q('#csDesc').value, cover, state: q('#csState').value, maxPlayers: +q('#csMax').value, open: q('#csOpen').checked, rules, attrs: q('#csAttrs').value.split(',').map(s => s.trim()).filter(Boolean), classes }, 'Campanha salva.');
      if (r.ok) close();
    };
  });
}
function scopeMembers() {
  const c = R.st.camp;
  const list = c.scope === 'g' ? (H.S.groups[c.scopeId] ? H.S.groups[c.scopeId].members : []) : (H.S.dms[c.scopeId] ? H.S.dms[c.scopeId].members : []);
  return list.filter(u => !H.user(u).bot);
}
function inviteModal() {
  const c = R.st.camp;
  const avail = scopeMembers().filter(u => u !== c.masterId && !c.players.includes(u) && !c.invited.includes(u));
  H.modal(`<div class="modal-h"><h2>✉️ Convidar para a campanha</h2><p>Quem você chamar recebe um aviso e pode aceitar.</p></div>
    <div class="modal-b">${avail.length ? `<input class="input" id="ivQ" placeholder="Procurar pelo nome" autocomplete="off" aria-label="Procurar"><div class="rpg-pick rpg-invite">${avail.map(u => `<label class="rpg-check" data-n="${esc(H.nameOf(u).toLowerCase())}"><input type="checkbox" value="${u}"> ${H.av(u, 24, false)} ${esc(H.nameOf(u))}</label>`).join('')}</div>` : '<p class="muted">Todo mundo já está na campanha ou foi convidado.</p>'}</div>
    <div class="modal-f"><button class="btn ghost" data-close>Cancelar</button>${avail.length ? '<button class="btn primary" id="ivGo">Convidar</button>' : ''}</div>`, (m, close) => {
    const s = m.querySelector('#ivQ'); if (s) s.oninput = () => { const v = s.value.toLowerCase(); m.querySelectorAll('[data-n]').forEach(l => { l.hidden = !l.dataset.n.includes(v); }); };
    const go = m.querySelector('#ivGo');
    if (go) go.onclick = async () => { const uids = [...m.querySelectorAll('.rpg-invite input:checked')].map(i => i.value); if (!uids.length) return toast('Escolha alguém.', true); const r = await call('rpg:invite', { cid: c.id, uids }, 'Convite enviado.'); if (r.ok) close(); };
  });
}

/* ---------- rolagem na tela (todo mundo vê junto) ---------- */
function showRoll(e) {
  if (!R.el || e.type !== 'roll') return;
  R.fx.push(e); if (!R.fxOn) nextFx();
}
function nextFx() {
  const box = $r('.rpg-dicefx'); const e = R.fx.shift();
  if (!box || !e) { R.fxOn = false; return; }
  R.fxOn = true;
  const r = e.roll, faces = r.parts.filter(p => p.rolls).flatMap(p => p.rolls.map((v, i) => ({ v, s: p.sides, k: p.kept.includes(i) }))).slice(0, 12);
  const el = document.createElement('div'); el.className = `rpg-fx ${r.crit ? 'crit' : ''} ${r.fail ? 'fail' : ''} ${e.priv ? 'priv' : ''}`;
  el.innerHTML = `<div class="rpg-fx-h">${H.av(e.uid, 28, false)}<b>${esc(H.nameOf(e.uid))}</b><span>${e.text ? esc(e.text) + ' · ' : ''}<code>${esc(r.expr)}</code>${e.priv ? ' · secreta' : ''}</span></div>
    <div class="rpg-fx-dice">${faces.map(f => `<i class="d${f.s} ${f.k ? '' : 'drop'}"><span>${f.v}</span></i>`).join('')}</div>
    <div class="rpg-fx-t">${r.total}</div>${r.crit ? '<div class="rpg-fx-c">CRÍTICO!</div>' : r.fail ? '<div class="rpg-fx-c">Falha crítica</div>' : ''}`;
  box.appendChild(el);
  H.tone(r.crit ? [[523, .08], [784, .08], [1047, .25]] : r.fail ? [[330, .12], [220, .3]] : [[700, .03], [900, .03], [600, .05]], 'triangle', .05);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); nextFx(); }, 300); }, R.fx.length ? 1400 : 2600);
}

/* =============== tempo real =============== */
function attach(sock) {
  sock.on('connect', () => { if (R.el && R.st) { const cid = R.st.camp.id; H.emit('rpg:open', { cid }).then(r => { if (!R.el || !R.st || R.st.camp.id !== cid) return; if (r.ok) { R.st = r; renderAll(); } else { closeRoom(true); toast(r.erro || 'A mesa foi fechada.', true); } }); } });
  const live = fn => d => { if (R.el && R.st) fn(d); };
  sock.on('rpg:state', live(d => {
    const mapChanged = (R.st.map && R.st.map.id) !== (d.map && d.map.id);
    R.st = d; renderAll(); if (mapChanged) fitZoom();
  }));
  sock.on('rpg:map', live(m => { if (!R.st.map || m.id !== R.st.map.id) return; const sizeChanged = m.w !== R.st.map.w || m.h !== R.st.map.h; R.st.map = m; drawMap(); renderTokens(); renderTools(); if (sizeChanged) fitZoom(); if (R.tab === 'mestre') renderPane(); }));
  sock.on('rpg:ent', live(e => {
    const i = R.st.ents.findIndex(x => x.id === e.id);
    if (i >= 0) R.st.ents[i] = e; else R.st.ents.push(e);
    renderTokens(); if (R.sel && R.sel.id === e.id) renderSel(); renderCombat(); if (R.tab === 'mestre') renderPane();
  }));
  sock.on('rpg:ent:del', live(d => { R.st.ents = R.st.ents.filter(x => x.id !== d.id); if (R.sel && R.sel.id === d.id) select(null); renderTokens(); renderCombat(); if (R.tab === 'mestre') renderPane(); }));
  sock.on('rpg:chars', live(list => { R.st.chars = list; renderTokens(); renderCombat(); renderSel(); if (R.tab === 'grupo' || R.tab === 'dados' || R.tab === 'mestre') renderPane(); renderTop(); }));
  sock.on('rpg:move', live(applyMove));
  sock.on('rpg:drag', live(d => { if (R.drag && R.drag.id === d.id) return; const el = $r(`.rpg-tok[data-k="${d.k}"][data-id="${d.id}"]`); if (el) { el.classList.add('remote'); el.style.left = d.x * CELL + 'px'; el.style.top = d.y * CELL + 'px'; clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('remote'), 400); } }));
  sock.on('rpg:event', live(e => {
    R.st.events.push(e); if (R.st.events.length > 300) R.st.events.splice(0, R.st.events.length - 300);
    if (R.tab === 'hist' || (R.tab === 'dados' && e.type === 'roll')) renderPane();
    showRoll(e);
  }));
  sock.on('rpg:combat', live(cb => { R.st.camp.combat = cb; renderCombat(); renderTokens(); if (R.tab === 'mestre') renderPane(); }));
  sock.on('rpg:closed', d => { if (R.st && R.st.camp.id === d.cid) { closeRoom(true); toast(d.why || 'A mesa foi fechada.', true); } });
  sock.on('rpg:list', d => { if (R.lobbyEl && R.scope && R.scope.kind === d.scope && R.scope.id === d.id) drawLobby(); });
  sock.on('rpg:invited', d => invitedCard(d));
}
// aviso de convite (fica no canto até a pessoa decidir)
function invitedCard(d) {
  H.tone([[523, .1], [659, .1], [784, .18]], 'triangle', .06);
  const el = document.createElement('div'); el.className = 'rpg-inv-card';
  el.innerHTML = `<div class="rpg-inv-ic">🎲</div><div><b>${esc(d.from)} te convidou para jogar RPG</b><span>"${esc(d.name)}" em ${esc(scopeName({ kind: d.scope, id: d.scopeId }))}</span><div class="rpg-row"><button class="btn primary sm" data-v="ok">Ver campanha</button><button class="btn ghost sm" data-v="x">Depois</button></div></div>`;
  document.body.appendChild(el);
  el.onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; el.remove(); if (b.dataset.v === 'ok') lobby({ kind: d.scope, id: d.scopeId }); };
  setTimeout(() => el.remove(), 30000);
}

document.addEventListener('keydown', e => {
  if (!R.el || e.target.closest('input, textarea, select') || document.querySelector('.modal-back')) return;
  if (e.key === 'Escape') { if (R.sel) select(null); else if (R.tool !== 'mover') { R.tool = 'mover'; renderTools(); } }
  if (e.key === 'Delete' && R.sel && R.sel.k === 'e' && isMaster()) { const t = entOf(R.sel.id); if (t) H.confirmBox('Apagar', `Tirar ${t.name} do mapa?`, 'Apagar').then(ok => ok && call('rpg:ent:del', { cid: R.st.camp.id, id: t.id }).then(r => r.ok && select(null))); }
  if (e.key === '+' || e.key === '=') setZoom(R.z * 1.2);
  if (e.key === '-') setZoom(R.z / 1.2);
});

window.anarchyRpg = {
  init(h) { H = h; },
  attach,
  lobby,
  open: openRoom,
  isOpen: () => !!R.el,
  // botão voltar do celular: fecha o que estiver por cima (painel, seleção, mesa, área de campanhas)
  back() {
    if (R.el) { if (R.el.classList.contains('side-open')) { R.el.classList.remove('side-open'); return true; } if (R.sel) { select(null); return true; } closeRoom(); return true; }
    if (R.lobbyEl) { closeLobby(); return true; }
    return false;
  },
  _state: () => R // testes
};
})();
