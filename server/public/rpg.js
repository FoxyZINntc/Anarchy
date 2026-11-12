/* Anarchy — RPG de Mesa
   Atividade opcional de qualquer grupo ou conversa. Abre por cima do app (não muda o layout principal) e fala com o
   servidor pelos eventos "rpg:*" do Socket.IO. Tudo que é sensível (dados, permissões, o que cada um vê, colisão,
   portas, cenas privadas) é decidido no servidor (server/rpg.js); aqui só desenha e envia pedidos.
   Usa window.RpgCore (rpg-core.js: materiais, camadas, luz e visão, igual ao servidor) e window.RpgDraw (rpg-draw.js).
   O app.js entrega o que este arquivo usa em init(). */
(() => {
'use strict';
let H = null; // utilidades do app.js (init)
const C = window.RpgCore, D = window.RpgDraw;
const CELL = 32; // tamanho da casa no mapa (px, antes do zoom)
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
const MARK_EMOJIS = ['🗝️', '💀', '⚠️', '❓', '❗', '📜', '💰', '💎', '🧪', '⚗️', '🗡️', '🛡️', '🏹', '🔮', '📦', '🧰', '🕯️', '🔥', '💧', '❄️', '⚡', '🌿', '🍄', '🦴', '👣', '🩸', '🕸️', '🐀', '🐍', '🦇', '👁️', '🚪', '🪜', '🏳️', '⛺', '🪦', '⭐', '🎯', '📍', '🔒'];
const DIRS = [[270, '⬆️'], [315, '↗️'], [0, '➡️'], [45, '↘️'], [90, '⬇️'], [135, '↙️'], [180, '⬅️'], [225, '↖️']];

const R = { scope: null, lobbyEl: null, el: null, st: null, z: 1, tool: 'mover', brush: { L: 'chao', id: 'pedra', size: 1, erase: false }, mark: { e: '🗝️', size: 1, name: '', vis: 'todos' },
  lamp: { r: 5, color: '#ffd98a', shape: 'circulo', intensity: 80 }, doorDef: { look: 'madeira', state: 'fechada' }, tab: 'grupo', sel: null, fx: [], fxOn: false, drag: null, preview: '', paintKey: '' };

/* ---------- visual da mesa (cada pessoa escolhe; fica salvo neste aparelho) ---------- */
const LOOKS = {
  limpo: { n: 'Limpo', ic: '🧼', d: 'Sem filtro nenhum: cores naturais, tela nítida.', grain: 0, vig: 0, grade: 0, flicker: false },
  suave: { n: 'Suave', ic: '🌤️', d: 'Um toque de clima, sem atrapalhar. Recomendado.', grain: .025, vig: .22, grade: .3, flicker: true },
  cinema: { n: 'Cinema', ic: '🎬', d: 'Granulação de filme, bordas escuras e cor dramática.', grain: .085, vig: .55, grade: 1, flicker: true }
};
function loadLook() {
  let x = null; try { x = JSON.parse(localStorage.getItem('rpg:visual') || 'null'); } catch {}
  const base = LOOKS[(x && x.preset) || 'suave'] || LOOKS.suave;
  return { preset: (x && x.preset) || 'suave', grain: base.grain, vig: base.vig, grade: base.grade, flicker: base.flicker, ...(x && x.preset === 'personalizado' ? x : {}) };
}
R.look = loadLook();
function saveLook() { try { localStorage.setItem('rpg:visual', JSON.stringify(R.look)); } catch {} }
// aplica o filtro: granulação e bordas pela folha de estilo; a cor de cinema é pintada no mapa (repinta)
function applyLook(repaint) {
  if (!R.el) return;
  R.el.style.setProperty('--rg-grain-op', R.look.grain);
  R.el.style.setProperty('--rg-vig', R.look.vig);
  R.el.classList.toggle('no-flicker', !R.look.flicker);
  if (repaint) { R.paintKey = ''; drawMap(); }
}
const seen = k => { try { return localStorage.getItem('rpg:visto:' + k) === '1'; } catch { return false; } };
const markSeen = k => { try { localStorage.setItem('rpg:visto:' + k, '1'); } catch {} };
const me = () => H.S.me && H.S.me.id;
const role = () => (R.st ? R.st.camp.role : null);
const isMaster = () => role() === 'mestre';
const isPlayer = () => role() === 'mestre' || role() === 'jogador';
const curMap = () => (R.st && R.st.map) || null;
const charOf = id => R.st.chars.find(c => c.id === id);
const entOf = id => R.st.ents.find(e => e.id === id);
const myChar = () => R.st && R.st.chars.find(c => c.ownerId === me());
const mats = () => (R.st && R.st.camp.mats) || [];
const MAT = id => C.mat(id, mats());
const attrName = a => (R.st.camp.attrNames && R.st.camp.attrNames[a]) || a;
const bonus = (ch, a) => C.attrBonus(R.st.camp, ch, a);
const sgn = n => (n >= 0 ? '+' : '') + n;
const esc = s => H.esc(s);
const toast = (m, e) => H.toast(m, e);
async function call(ev, data, okMsg) { const r = await H.emit(ev, data); if (!r.ok) toast(r.erro || 'Algo deu errado.', true); else if (okMsg) toast(okMsg); return r; }
const pct = (a, b) => Math.max(0, Math.min(100, b > 0 ? (a / b) * 100 : 0));
const mod = v => sgn(Math.floor(((+v || 10) - 10) / 2));
const scopeName = s => (s.kind === 'g' ? (H.S.groups[s.id] && H.S.groups[s.id].name) || 'Grupo' : 'Conversa com ' + H.nameOf((H.S.dms[s.id] && H.S.dms[s.id].members.find(m => m !== me())) || ''));
const avatarUrl = uid => { const u = H.user(uid); return u && u.avatar ? u.avatar : null; };
const initial = n => esc((String(n || '?').trim()[0] || '?').toUpperCase());
const sceneName = sid => { const s = (R.st.camp.scenes || []).find(x => x.id === sid); return s ? s.name : 'Cena principal'; };
const doorAt = (m, i) => (m.doors || []).find(d => d.i === i);

/* imagem com transparência (PNG/WEBP) para miniaturas, mapas e texturas */
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
async function openRoom(cid, view) {
  const r = await H.emit('rpg:open', { cid, view: view || '' });
  if (!r.ok) return toast(r.erro || 'Não consegui abrir a mesa.', true);
  closeRoom(true);
  R.st = r; R.sel = null; R.tool = 'mover'; R.z = 1; R.preview = ''; R.paintKey = '';
  const el = document.createElement('div'); el.className = 'rpg-room'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Mesa de RPG');
  // camadas: imagem/terreno, portas, grade, personagens, iluminação, marcadores e efeitos, névoa, alças do Mestre
  el.innerHTML = `<header class="rpg-top"></header>
    <div class="rpg-scenes" hidden></div>
    <div class="rpg-body">
      <section class="rpg-stage">
        <div class="rpg-view"><div class="rpg-board"><img class="rpg-bg" alt="" hidden draggable="false"><canvas class="rpg-tiles"></canvas><canvas class="rpg-doors"></canvas><canvas class="rpg-gridc"></canvas><div class="rpg-toks"></div><canvas class="rpg-light" hidden></canvas><div class="rpg-marks"></div><canvas class="rpg-fog"></canvas><div class="rpg-handles"></div><svg class="rpg-ruler"></svg></div></div>
        <nav class="rpg-toolbar" aria-label="Ferramentas do mapa"></nav>
        <div class="rpg-brush" hidden></div>
        <div class="rpg-combat" hidden></div>
        <div class="rpg-party" hidden></div>
        <div class="rpg-hint" hidden></div>
        <div class="rpg-selbox" hidden></div>
        <div class="rpg-dicefx" aria-live="polite"></div>
        <div class="rpg-nomap" hidden></div>
      </section>
      <aside class="rpg-side"><nav class="rpg-tabs"></nav><div class="rpg-pane"></div></aside>
    </div>`;
  el.style.setProperty('--rg-grain', `url(${grain()})`);
  document.body.appendChild(el); R.el = el;
  applyLook(false);
  closeLobby();
  bindBoard();
  renderAll();
  fitZoom();
  welcome();
}
/* ---------- boas-vindas: na primeira vez em cada papel, um cartão curto com o básico ---------- */
function welcome() {
  const r = role(), key = 'boasvindas-' + (r === 'mestre' ? 'mestre' : r === 'jogador' ? 'jogador' : 'visita');
  if (seen(key) || !R.el) return;
  const steps = r === 'mestre'
    ? [['🗺️', 'Prepare o mapa', 'Na aba <b>👑 Mestre</b> gere ou importe um mapa. As salas já vêm com móveis e luzes.'], ['✉️', 'Chame o grupo', 'Em <b>🧙 Grupo</b> → Convidar. Cada um cria a própria ficha.'], ['🖱️', 'Botão direito em tudo', 'Na miniatura, no mapa, nas portas e nas luzes: é ali que ficam as opções.'], ['🎭', 'Eventos privados', 'Botão direito num jogador → <b>Criar evento</b> para uma cena só dele.']]
    : r === 'jogador'
      ? [['📜', 'Sua ficha', 'Clique em <b>Minha ficha</b> lá em cima para criar ou ver seu personagem.'], ['✋', 'Andar', 'Arraste sua miniatura, ou use <b>👣</b> para traçar o caminho e ela anda sozinha.'], ['🚪', 'Portas', 'Chegue perto e clique na porta para abrir ou fechar.'], ['🎲', 'Dados', 'Na aba <b>🎲 Dados</b>: clique num dado ou nos testes do seu personagem.']]
      : [['👀', 'Você está assistindo', 'Dá para ver o mapa e o histórico em tempo real.'], ['🙋', 'Quer jogar?', 'Se a campanha estiver aberta, use <b>Entrar como jogador</b> lá em cima.']];
  const el = document.createElement('div'); el.className = 'rpg-welcome'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Como funciona a mesa');
  el.innerHTML = `<div class="rpg-wc-h"><b>${r === 'mestre' ? '👑 Bem-vindo, Mestre!' : r === 'jogador' ? '🎭 Bem-vindo à mesa!' : '🎲 Mesa de RPG'}</b><span>O básico em ${steps.length} passos</span></div>
    <ol>${steps.map(([ic, t, d]) => `<li><i>${ic}</i><div><b>${t}</b><span>${d}</span></div></li>`).join('')}</ol>
    <div class="rpg-wc-f"><button class="btn ghost sm" data-w="guia">📖 Ver o guia completo</button><button class="btn primary sm" data-w="ok">Entendi!</button></div>`;
  $r('.rpg-stage').appendChild(el);
  el.onclick = e => { const b = e.target.closest('[data-w]'); if (!b) return; markSeen(key); el.remove(); if (b.dataset.w === 'guia') helpModal(); };
}
/* ---------- guia (botão ? no topo): linguagem simples, por papel ---------- */
function helpModal() {
  const master = isMaster();
  const K = k => `<kbd>${k}</kbd>`;
  const sec = (t, items) => `<section class="rpg-help-s"><h3>${t}</h3><ul>${items.map(([ic, txt]) => `<li><i>${ic}</i><span>${txt}</span></li>`).join('')}</ul></section>`;
  H.modal(`<div class="modal-h"><h2>📖 Como usar a mesa</h2><p>Tudo o que dá para fazer, em linguagem simples. Passe o mouse nos botões para ver o nome deles.</p></div>
    <div class="modal-b rpg-help">
      ${sec('🧭 Andar pelo mapa', [['✋', `Arraste o fundo do mapa para olhar em volta. ${K('Ctrl')} + rodinha do mouse (ou ＋ e －) muda o zoom.`], ['🧍', 'Arraste a sua miniatura para andar. Paredes e portas fechadas não deixam passar.'], ['👣', `Caminho ${K('C')}: clique no personagem e depois nos pontos do caminho. Clique de novo no último ponto (ou ${K('Enter')}) e ele anda casa por casa.`], ['🧭', `Virar o personagem: ${K('Q')} e ${K('E')} (a lanterna aponta para onde ele olha).`], ['🚪', 'Portas: chegue perto e clique nelas para abrir ou fechar. Trancadas pedem chave ou um teste.']])}
      ${sec('📏 Medir e mostrar', [['📏', `Régua ${K('R')}: clique ponto a ponto (dá para fazer curvas). 1 casa = 1,5 m.`], ['📍', `Ping ${K('P')} ou ${K('Alt')} + clique: mostra um ponto para todo mundo.`], ['🖱️', 'Botão direito em qualquer coisa (miniatura, mapa, porta) abre as opções dela.']])}
      ${sec('🎲 Dados e ficha', [['🎲', 'Aba Dados: clique num dado para rolar, ou escreva uma fórmula como 1d20+3. Secreta = só você e o Mestre veem.'], ['📜', '"Minha ficha" mostra atributos, vida, mana, status e inventário. Chaves no inventário abrem portas trancadas.'], ['📜', 'O Histórico guarda tudo que aconteceu: rolagens, narração e combate.']])}
      ${master ? sec('👑 Ferramentas do Mestre', [['🖌️', `Pincel ${K('B')}: escolha a camada (chão, terreno, paredes, objetos) e pinte. Pôr um objeto não troca o chão.`], ['🚪', `Portas ${K('D')}, lâmpadas ${K('L')} e marcadores ${K('M')}: clique no mapa para colocar; botão direito para editar.`], ['🌫️', 'Luz e névoa (aba Mestre): ligue a névoa e escolha o ambiente. Cada jogador vê só o que o personagem enxerga.'], ['🎭', 'Eventos: botão direito num jogador → Criar evento. Os outros não veem nada do evento.'], ['📊', 'Fichas (aba Mestre): status personalizados, atributos e descanso.']]) : ''}
      ${sec('🎬 Visual', [['🎬', 'O botão 🎬 lá em cima muda o filtro da tela (limpo, suave ou cinema). Vale só para você.']])}
    </div>
    <div class="modal-f"><button class="btn ghost" data-w="reset">Mostrar as boas-vindas de novo</button><span class="spacer" style="flex:1"></span><button class="btn primary" data-close>Fechar</button></div>`, (md, close) => {
    md.querySelector('[data-w="reset"]').onclick = () => { try { for (const k of ['mestre', 'jogador', 'visita']) localStorage.removeItem('rpg:visto:boasvindas-' + k); } catch {} close(); welcome(); };
  });
}
/* ---------- painel Visual (filtro da tela) ---------- */
function lookModal() {
  const before = { ...R.look };
  H.modal(`<div class="modal-h"><h2>🎬 Visual da mesa</h2><p>Escolha quanto filtro aparece na tela. Vale só para você e fica salvo neste aparelho.</p></div>
    <div class="modal-b rpg-form">
      <div class="rpg-looks">${Object.entries(LOOKS).map(([k, x]) => `<button type="button" class="rpg-look ${R.look.preset === k ? 'on' : ''}" data-p="${k}"><i>${x.ic}</i><b>${x.n}</b><span>${x.d}</span></button>`).join('')}</div>
      <details class="rpg-look-fino" ${R.look.preset === 'personalizado' ? 'open' : ''}><summary>Ajuste fino</summary>
        <label class="field">Granulação de filme <b data-o="grain"></b><input type="range" data-k="grain" min="0" max="0.12" step="0.005"></label>
        <label class="field">Bordas escuras <b data-o="vig"></b><input type="range" data-k="vig" min="0" max="0.7" step="0.02"></label>
        <label class="field">Cor de cinema <b data-o="grade"></b><input type="range" data-k="grade" min="0" max="1" step="0.05"></label>
        <label class="rpg-check"><input type="checkbox" data-k="flicker"> Luz das tochas tremulando</label>
      </details>
      <p class="muted small">Dica: se a tela parecer escura ou "suja", escolha <b>Limpo</b>.</p>
    </div>
    <div class="modal-f"><button class="btn ghost" data-close id="lkCancel">Cancelar</button><button class="btn primary" id="lkOk">Salvar</button></div>`, (md, close) => {
    let done = false;
    const sync = () => {
      md.querySelectorAll('.rpg-look').forEach(b => b.classList.toggle('on', b.dataset.p === R.look.preset));
      md.querySelectorAll('[data-k]').forEach(i => { if (i.type === 'checkbox') i.checked = R.look.flicker; else i.value = R.look[i.dataset.k]; });
      md.querySelectorAll('[data-o]').forEach(o => { const k = o.dataset.o, v = R.look[k]; o.textContent = Math.round(v / (k === 'grain' ? .12 : k === 'vig' ? .7 : 1) * 100) + '%'; });
    };
    let gradeT = null;
    const live = repaint => { applyLook(false); if (repaint) { clearTimeout(gradeT); gradeT = setTimeout(() => applyLook(true), 150); } };
    sync();
    md.querySelector('.rpg-looks').onclick = e => { const b = e.target.closest('[data-p]'); if (!b) return; const x = LOOKS[b.dataset.p]; const g0 = R.look.grade; R.look = { preset: b.dataset.p, grain: x.grain, vig: x.vig, grade: x.grade, flicker: x.flicker }; sync(); live(g0 !== x.grade); };
    md.querySelector('.rpg-look-fino').oninput = e => { const i = e.target; if (!i.dataset.k) return; const g0 = R.look.grade; R.look = { ...R.look, preset: 'personalizado', [i.dataset.k]: i.type === 'checkbox' ? i.checked : +i.value }; sync(); live(g0 !== R.look.grade); };
    md.querySelector('#lkOk').onclick = () => { done = true; saveLook(); close(); toast('Visual salvo.'); };
    md.querySelector('#lkCancel').addEventListener('click', () => { if (done) return; const g0 = R.look.grade; R.look = before; applyLook(g0 !== before.grade); });
  });
}
// granulação de filme (gerada uma vez, ruído cinza)
let grainUrl = '';
function grain() {
  if (grainUrl) return grainUrl;
  const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d'), im = g.createImageData(160, 160);
  for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0);
  return (grainUrl = c.toDataURL('image/png'));
}
function closeRoom(silent) {
  if (!R.el) return;
  if (!silent) H.emit('rpg:close', {});
  R.el.remove(); R.el = null; R.st = null; R.sel = null; R.fx = []; R.drag = null; R.paintKey = '';
}
const $r = s => R.el && R.el.querySelector(s);

function renderAll() { if (!R.el) return; renderTop(); renderScenes(); drawMap(); renderTokens(); renderCombat(); renderTools(); renderTabs(); renderPane(); renderSel(); }

function renderTop() {
  const c = R.st.camp, m = curMap();
  const stLbl = { ativa: 'Ativa', pausada: 'Pausada', encerrada: 'Encerrada' }[c.state];
  const roleLbl = { mestre: '👑 Mestre', jogador: '🎭 Jogador', convidado: '✉️ Convidado', espectador: '👀 Assistindo' }[c.role];
  $r('.rpg-top').innerHTML = `<button class="btn ghost sm rpg-back" data-a="back">${H.ic('reply')}<span>Voltar ao Anarchy</span></button>
    <div class="rpg-top-t">${c.cover ? `<img src="${esc(c.cover)}" alt="">` : '<span class="rpg-top-ic">🐉</span>'}<div><b>${esc(c.name)}</b><span><i class="rpg-st st-${c.state}">${stLbl}</i> ${roleLbl}${m ? ` · 🗺️ ${esc(m.name)}` : ''}${c.view ? ` · 🎭 ${esc(sceneName(c.view))}` : ''}</span></div></div>
    <span class="spacer"></span>
    ${c.role === 'convidado' ? '<button class="btn primary sm" data-a="join">Aceitar convite</button>' : ''}
    ${c.role === 'espectador' && c.open && c.state !== 'encerrada' && c.players.length < c.maxPlayers ? '<button class="btn sm" data-a="join">Entrar como jogador</button>' : ''}
    ${isPlayer() ? '<button class="btn sm" data-a="mysheet">📜 <span>Minha ficha</span></button>' : ''}
    <button class="icon-btn rpg-top-ic2" data-a="look" data-tip="Visual: filtro da tela (só para você)" aria-label="Visual da mesa">🎬</button>
    <button class="icon-btn rpg-top-ic2" data-a="help" data-tip="Como usar a mesa" aria-label="Como usar a mesa">?</button>
    ${isMaster() ? `<button class="icon-btn" data-a="settings" data-tip="Configurações da campanha" aria-label="Configurações da campanha">${H.ic('gear')}</button>` : ''}
    <button class="icon-btn rpg-side-tog" data-a="side" aria-label="Painel">${H.ic('menu')}</button>`;
  $r('.rpg-top').onclick = async e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'back') closeRoom();
    if (a === 'side') R.el.classList.toggle('side-open');
    if (a === 'settings') settingsModal();
    if (a === 'look') lookModal();
    if (a === 'help') helpModal();
    if (a === 'mysheet') { const ch = myChar(); ch ? sheetModal(ch) : sheetModal(null); }
    if (a === 'join') { const q = await call('rpg:join', { cid: R.st.camp.id }, 'Você entrou na campanha! Agora crie seu personagem.'); if (q.ok && !myChar()) setTimeout(() => sheetModal(null), 300); }
  };
}
/* ---------- barra de cenas: o Mestre alterna entre a principal e os eventos; quem está num evento vê o nome dele ---------- */
function renderScenes() {
  const box = $r('.rpg-scenes'); if (!box) return;
  const c = R.st.camp, sc = (c.scenes || []).filter(s => s.state === 'ativa');
  if (!isMaster() && !sc.length) { box.hidden = true; return; }
  box.hidden = false;
  if (!isMaster() && c.myScene) {
    const s = sc.find(x => x.id === c.myScene);
    box.innerHTML = `<span class="rpg-sc-me">🎭 Você está no evento <b>${esc(s ? s.name : '')}</b>${s && s.desc ? ` <span class="muted">— ${esc(s.desc)}</span>` : ''}</span>`;
    return;
  }
  const chip = (sid, label, n, extra = '') => `<button class="rpg-sc ${c.view === sid ? 'on' : ''}" data-sc="${sid}">${label}${n !== null ? ` <i>${n}</i>` : ''}${extra}</button>`;
  box.innerHTML = chip('', '🏰 Principal', null) + sc.map(s => chip(s.id, `${s.vis === 'compartilhada' ? '👁️' : '🎭'} ${esc(s.name)}`, isMaster() ? s.uids.length : null)).join('')
    + (isMaster() ? '<button class="rpg-sc add" data-sc="+">+ Evento</button>' : '<span class="muted small">Eventos compartilhados: clique para assistir</span>');
  box.onclick = e => { const b = e.target.closest('[data-sc]'); if (!b) return; if (b.dataset.sc === '+') return eventModal([]); switchScene(b.dataset.sc); };
}
async function switchScene(sid) {
  const r = await call('rpg:scene:view', { cid: R.st.camp.id, sid });
  if (!r.ok) return;
  R.st = r; R.sel = null; R.preview = ''; R.paintKey = ''; renderAll(); fitZoom();
}

const capture = (el, e) => { try { el.setPointerCapture(e.pointerId); } catch {} };

/* ---------- mapa: terreno pintado em camadas, portas, luz, névoa e grade ---------- */
const mapKey = m => [m.id, m.w, m.h, m.bg || '', m.pal.join(','), ...C.LAYERS.map(L => m.layers[L]), JSON.stringify(mats().map(x => [x.id, x.c, x.st, x.img, x.emoji])), isMaster(), R.look.grade].join('|');
function drawMap() {
  const m = curMap(), board = $r('.rpg-board'), tiles = $r('.rpg-tiles'), bg = $r('.rpg-bg'), nomap = $r('.rpg-nomap');
  if (!m) {
    board.hidden = true; nomap.hidden = false;
    nomap.innerHTML = `<div class="rpg-empty">🗺️<b>Nenhum mapa ainda</b><span>${isMaster() ? 'Gere ou importe um mapa na aba Mestre.' : 'Espere o Mestre preparar o mapa.'}</span></div>`;
    return;
  }
  board.hidden = false; nomap.hidden = true;
  board.style.width = m.w * CELL + 'px'; board.style.height = m.h * CELL + 'px';
  if (m.bg) { bg.hidden = false; if (bg.getAttribute('src') !== m.bg) bg.src = m.bg; } else { bg.hidden = true; bg.removeAttribute('src'); }
  const key = mapKey(m);
  if (key !== R.paintKey) { R.paintKey = key; if (m.bg && !isMaster()) { tiles.width = tiles.height = 1; } else D.paintMap(m, tiles, { cell: CELL, mats: mats(), master: isMaster(), grade: R.look.grade }); }
  drawDoors(); drawGrid(); drawMarks(); drawLight(); drawFog(); drawHandles(); setZoom(R.z);
}
let repaintT = null;
function repaintSoon() { if (repaintT) return; repaintT = setTimeout(() => { repaintT = null; const m = curMap(); if (m && R.el) { R.paintKey = mapKey(m); D.paintMap(m, $r('.rpg-tiles'), { cell: CELL, mats: mats(), master: isMaster(), grade: R.look.grade }); drawLight(); } }, 120); }
function drawDoors() { const m = curMap(), cv = $r('.rpg-doors'); if (m && cv) D.drawDoors(m, cv, { cell: CELL, master: isMaster() }); }
function drawGrid() {
  const m = curMap(), c = $r('.rpg-gridc'); if (!m || !c) return;
  const style = R.st.camp.rules.gridStyle || 'nenhuma', res = 2;
  c.width = m.w * CELL * res; c.height = m.h * CELL * res;
  const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height);
  if (style === 'nenhuma') return;
  const S = CELL * res;
  if (style === 'pontos') { g.fillStyle = m.bg ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.35)'; for (let y = 1; y < m.h; y++) for (let x = 1; x < m.w; x++) { g.beginPath(); g.arc(x * S, y * S, res * 1.3, 0, 7); g.fill(); } }
  else { g.strokeStyle = m.bg ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.28)'; g.lineWidth = res; g.beginPath(); for (let x = 0; x <= m.w; x++) { g.moveTo(x * S, 0); g.lineTo(x * S, m.h * S); } for (let y = 0; y <= m.h; y++) { g.moveTo(0, y * S); g.lineTo(m.w * S, y * S); } g.stroke(); }
}
// luz calculada aqui com o mesmo código do servidor (paredes e portas fechadas bloqueiam)
function lightNow() {
  const m = curMap(); if (!m) return null;
  const F = C.flags(m, mats()), chars = R.st.chars.filter(c => c.pos && c.pos[m.id]);
  return { F, chars, ...C.lighting(m, mats(), F, chars) };
}
function drawLight() {
  const m = curMap(), cv = $r('.rpg-light'); if (!m || !cv) return;
  const L = lightNow(); R.lit = L;
  cv.hidden = !D.drawLight(m, cv, L.srcs, { master: isMaster() });
}
// névoa: jogadores recebem do servidor o que veem agora (vis) e o que já exploraram (seenMask).
// O Mestre vê por cima (meio transparente) o que o grupo vê, ou "como" um personagem escolhido.
function fogMasks(m) {
  const n = m.w * m.h, mode = m.fogMode || 'manual';
  if (!isMaster()) return { vis: C.bitsDec(m.vis, n), seen: C.bitsDec(m.seenMask, n), mode };
  const L = R.lit || lightNow(), manual = C.bitsDec(m.seen, n), vis = new Uint8Array(n);
  const who = R.preview ? L.chars.filter(c => c.id === R.preview) : L.chars;
  if (mode !== 'manual') for (const ch of who) C.bitsOr(vis, C.vision(m, L.F, L.lit, ch));
  C.bitsOr(vis, manual);
  let seen = vis;
  if (mode === 'descoberto') { seen = vis.slice(); for (const ch of who) C.bitsOr(seen, C.bitsDec((m.seenBy || {})[ch.id], n)); }
  return { vis, seen, mode };
}
function drawFog() {
  const m = curMap(), c = $r('.rpg-fog'); if (!m || !c) return;
  c.width = m.w; c.height = m.h;
  const g = c.getContext('2d'); g.clearRect(0, 0, m.w, m.h);
  c.classList.toggle('master', isMaster() && !R.preview);
  c.classList.toggle('preview', isMaster() && !!R.preview);
  if (!m.fog) return;
  const { vis, seen, mode } = fogMasks(m), img = g.createImageData(m.w, m.h);
  for (let i = 0; i < m.w * m.h; i++) { const k = i * 4; img.data[k] = 6; img.data[k + 1] = 5; img.data[k + 2] = 9; img.data[k + 3] = vis[i] ? 0 : seen[i] && mode === 'descoberto' ? 165 : 255; }
  g.putImageData(img, 0, 0);
}
// armadilhas, marcadores (emojis com nome) e pings: camada de efeitos, por cima da luz
function drawMarks() {
  const m = curMap(), layer = $r('.rpg-marks'); if (!m || !layer) return;
  layer.querySelectorAll('.rpg-trap, .rpg-mk').forEach(x => x.remove());
  const master = isMaster();
  layer.insertAdjacentHTML('afterbegin', (m.traps || []).map(t => `<i class="rpg-trap ${t.on ? 'on' : ''}" style="left:${(t.i % m.w) * CELL}px;top:${((t.i / m.w) | 0) * CELL}px" title="${t.on ? 'Armadilha revelada' : 'Armadilha escondida (só você vê)'}">${t.on ? '⚠️' : '🪤'}</i>`).join('')
    + (m.marks || []).map(x => `<div class="rpg-mk ${master ? 'mv' : ''} ${master && x.vis !== 'todos' ? 'priv' : ''}" data-mk="${x.id}" style="left:${x.x * CELL}px;top:${x.y * CELL}px;--sz:${x.size}" ${x.name ? `data-name="${esc(x.name)}"` : ''} aria-label="${esc(x.name || x.emoji)}"><span>${esc(x.emoji)}</span></div>`).join(''));
}
// alças do Mestre: lâmpadas (arrasta para mover, botão direito para editar)
function drawHandles() {
  const m = curMap(), layer = $r('.rpg-handles'); if (!layer) return;
  layer.innerHTML = m && isMaster() ? (m.lights || []).map(L => `<div class="rpg-lamp ${L.on ? '' : 'off'}" data-lamp="${L.id}" style="left:${L.x * CELL}px;top:${L.y * CELL}px;--lc:${esc(L.color)}" title="${esc(L.name || 'Lâmpada')} · ${L.r} casas${L.on ? '' : ' (apagada)'}">💡</div>`).join('') : '';
}
function showPing(p) {
  const layer = $r('.rpg-marks'); if (!layer) return;
  const el = document.createElement('div'); el.className = 'rpg-ping'; el.style.left = p.x * CELL + 'px'; el.style.top = p.y * CELL + 'px'; el.style.setProperty('--pc', p.color || '#ffd36b');
  el.innerHTML = `<i></i><i></i><b>${esc(H.nameOf(p.uid))}</b>`;
  layer.appendChild(el); setTimeout(() => el.remove(), 2600);
  H.tone([[880, .05], [1175, .08]], 'sine', .04);
}

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
  const c = R.st.camp, s = (c.scenes || []).find(x => x.id === c.myScene);
  return k === 'c' && t.ownerId === me() && !c.rules.lock && c.state === 'ativa' && !(s && s.perm && s.perm.move === false);
}
const hpColor = p => (p > 60 ? '#5fd07d' : p > 30 ? '#f2c14e' : '#e2484e');
const tokImg = o => (o.k === 'c' ? (o.t.img || avatarUrl(o.t.ownerId)) : o.t.img);
function tokHtml(o) {
  const t = o.t, img = tokImg(o);
  const face = img ? `<img src="${esc(img)}" alt="" draggable="false">` : `<span>${o.k === 'e' && t.emoji ? esc(t.emoji) : initial(t.name)}</span>`;
  const showHp = t.hpMax && (o.k === 'c' || isMaster() || t.hp !== undefined);
  const p = showHp ? pct(t.hp, t.hpMax) : 100;
  const cb = R.st.camp.combat, turn = cb.on && cb.order[cb.turn], isTurn = turn && turn.k === o.k && turn.id === o.id;
  const lt = o.k === 'c' && t.lantern;
  const cls = ['rpg-tok', 'k-' + o.k, o.k === 'e' ? 'kind-' + t.kind : '', o.k === 'e' && t.img ? 'cut' : '', R.sel && R.sel.k === o.k && R.sel.id === o.id ? 'sel' : '', isTurn ? 'turn' : '', o.k === 'e' && t.hidden ? 'hid' : '', showHp && t.hp <= 0 ? 'down' : '', canMove(o.k, t) ? 'mov' : '', o.k === 'c' && t.ownerId === me() ? 'mine' : '', lt && lt.on ? 'lit' : ''].filter(Boolean).join(' ');
  const conds = (t.conds || []).slice(0, 4).map(x => COND_IC[x] || '•').join('');
  return `<div class="${cls}" data-k="${o.k}" data-id="${o.id}" style="--s:${o.size};--tc:${esc(t.color || '#6c7cff')};--hp:${p};--hpc:${hpColor(p)};--dir:${o.k === 'c' ? (t.dir || 0) : 0}deg;left:${o.x * CELL}px;top:${o.y * CELL}px">
    <div class="rpg-tok-base"></div>${o.k === 'c' ? `<div class="rpg-tok-dir" ${lt ? `style="--lc:${esc(lt.color)}"` : ''}></div>` : ''}${showHp ? '<div class="rpg-tok-ring"></div>' : ''}<div class="rpg-tok-face">${face}</div>${conds ? `<div class="rpg-tok-cond">${conds}</div>` : ''}<div class="rpg-tok-name">${esc(t.name)}</div></div>`;
}
function renderTokens() {
  const layer = $r('.rpg-toks'); if (!layer) return;
  const list = tokens().sort((a, b) => (a.k === 'c') - (b.k === 'c') || b.size - a.size);
  layer.innerHTML = list.map(tokHtml).join('');
  renderParty();
}

/* ---------- retratos do grupo ---------- */
function renderParty() {
  const box = $r('.rpg-party'); if (!box) return;
  const list = R.st.chars.slice().sort((a, b) => (b.ownerId === me()) - (a.ownerId === me()) || a.away - b.away || a.name.localeCompare(b.name));
  const cb = R.st.camp.combat, turn = cb.on && cb.order[cb.turn];
  box.innerHTML = list.map(ch => {
    const p = pct(ch.hp, ch.hpMax), img = ch.img || avatarUrl(ch.ownerId);
    return `<button class="rpg-pp ${ch.ownerId === me() ? 'mine' : ''} ${ch.hp <= 0 ? 'down' : ''} ${ch.away ? 'away' : ''} ${turn && turn.k === 'c' && turn.id === ch.id ? 'turn' : ''} ${R.sel && R.sel.id === ch.id ? 'sel' : ''}" data-pp="${ch.id}" style="--tc:${esc(ch.color)};--hp:${p};--hpc:${hpColor(p)}" title="${esc(ch.name)} · ❤️ ${ch.hp}/${ch.hpMax}${ch.mpMax ? ` · 🔷 ${ch.mp}/${ch.mpMax}` : ''}${ch.away ? ' · em outra cena' : ''}">
      <span class="rpg-pp-ring"></span><span class="rpg-pp-face">${img ? `<img src="${esc(img)}" alt="">` : initial(ch.name)}</span>
      ${ch.mpMax ? `<span class="rpg-pp-mp"><i style="width:${pct(ch.mp, ch.mpMax)}%"></i></span>` : ''}${(ch.conds || []).length ? `<span class="rpg-pp-cond">${ch.conds.slice(0, 3).map(x => COND_IC[x] || '•').join('')}</span>` : ''}${ch.away ? '<span class="rpg-pp-away">🎭</span>' : ''}
      <b>${esc(ch.name.split(/[ ,]/)[0])}</b></button>`;
  }).join('');
  box.hidden = !list.length;
}

/* ---------- arrastar, medir, pintar, ping, portas e navegar ---------- */
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
  const m = curMap(); if (m) { v.style.setProperty('--bw', m.w * CELL * R.z + 'px'); v.style.setProperty('--bh', m.h * CELL * R.z + 'px'); }
  v.scrollLeft = px * R.z - cx; v.scrollTop = py * R.z - cy;
  const zl = $r('[data-t="zoom"]'); if (zl) zl.textContent = Math.round(R.z * 100) + '%';
}
function fitZoom() {
  const m = curMap(), v = $r('.rpg-view'); if (!m || !v) return;
  setZoom(Math.min(1.4, Math.max(0.3, Math.min((v.clientWidth - 24) / (m.w * CELL), (v.clientHeight - 24) / (m.h * CELL)))));
}
// distância em casas (diagonal conta 1, como no D&D 5e) e em metros (1 casa = 1,5 m)
const casas = n => `${n} casa${n === 1 ? '' : 's'} · ${(n * 1.5).toLocaleString('pt-BR')} m`;
const cheb = (a, b) => Math.max(Math.abs(Math.round(b.x) - Math.round(a.x)), Math.abs(Math.round(b.y) - Math.round(a.y)));
const tag = (x, y, label, cls = '') => `<g transform="translate(${x},${y})" class="${cls}"><rect x="-${label.length * 3.4 + 8}" y="-11" width="${label.length * 6.8 + 16}" height="22" rx="11" class="rl-tag"/><text text-anchor="middle" dy="4">${label}</text></g>`;
// régua de medir: vários pontos (curvas em L, N...). Cada trecho mostra a própria distância e o fim mostra o total.
function drawMeasure(pts, hover) {
  const svg = $r('.rpg-ruler'); if (!svg) return;
  const all = hover ? [...pts, hover] : pts;
  if (!all.length) { svg.innerHTML = ''; return; }
  const c = p => [(p.x + .5) * CELL, (p.y + .5) * CELL], line = all.map(p => c(p).join(',')).join(' ');
  let total = 0, segs = '';
  for (let i = 1; i < all.length; i++) { const n = cheb(all[i - 1], all[i]); total += n; if (all.length > 2 && n) { const [x1, y1] = c(all[i - 1]), [x2, y2] = c(all[i]); segs += tag((x1 + x2) / 2, (y1 + y2) / 2, String(n), 'rl-seg'); } }
  const [ex, ey] = c(all[all.length - 1]);
  svg.innerHTML = `<polyline points="${line}" class="rl-bg"/><polyline points="${line}" class="rl"/>${pts.map(p => `<circle cx="${c(p)[0]}" cy="${c(p)[1]}" r="5" class="rl-dot"/>`).join('')}<circle cx="${ex}" cy="${ey}" r="${CELL * .48}" class="rl-end"/>${segs}${all.length > 1 ? tag(ex, ey - CELL * .9, (all.length > 2 ? 'Total: ' : '') + casas(total)) : ''}`;
}
function ruler(a, b) { if (!a) drawMeasure([]); else drawMeasure([a], b); }
// régua de caminho (👣): mostra casa por casa por onde o personagem vai passar
function drawTrail(t, preview) {
  const svg = $r('.rpg-ruler'); if (!svg) return;
  if (!t) { svg.innerHTML = ''; return; }
  const c = p => [(p[0] + .5) * CELL, (p[1] + .5) * CELL];
  const done = [t.from, ...t.cells], line = done.map(p => c(p).join(',')).join(' ');
  const pv = preview && preview.length ? [done[done.length - 1], ...preview].map(p => c(p).join(',')).join(' ') : '';
  const end = c(done[done.length - 1]);
  svg.innerHTML = `${pv ? `<polyline points="${pv}" class="tr-pv"/>` : ''}<polyline points="${line}" class="tr-bg"/><polyline points="${line}" class="tr"/>
    ${t.cells.map(p => `<circle cx="${c(p)[0]}" cy="${c(p)[1]}" r="3.5" class="tr-step"/>`).join('')}${t.pts.map(p => `<circle cx="${c(p)[0]}" cy="${c(p)[1]}" r="8" class="tr-pt"/>`).join('')}
    ${t.cells.length || pv ? tag(end[0], end[1] - CELL * .9, `👣 ${casas(t.cells.length)}${preview && preview.length ? ` (+${preview.length})` : ''}`, 'tr-tag') : ''}`;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
// a miniatura anda casa por casa pelo caminho
const walking = new Set();
async function animWalk(k, id, steps) {
  walking.add(id);
  const m = curMap(), t = k === 'c' ? charOf(id) : entOf(id);
  for (const [x, y] of steps) {
    if (!R.el || curMap() !== m) break;
    const el = $r(`.rpg-tok[data-k="${k}"][data-id="${id}"]`);
    if (el) { el.classList.add('walking'); el.style.left = x * CELL + 'px'; el.style.top = y * CELL + 'px'; }
    if (t) { if (k === 'c') { t.pos = t.pos || {}; t.pos[m.id] = [x, y]; } else { t.x = x; t.y = y; } }
    if (k === 'c') drawLight();
    await sleep(150);
  }
  const el = $r(`.rpg-tok[data-k="${k}"][data-id="${id}"]`); if (el) el.classList.remove('walking');
  walking.delete(id);
}
// começa um caminho: pelo personagem clicado, pelo selecionado ou pelo seu
function trailStart(tok) {
  const m = curMap(); if (!m) return null;
  let k = null, id = null;
  if (tok) { k = tok.dataset.k; id = tok.dataset.id; }
  else if (R.sel) { k = R.sel.k; id = R.sel.id; }
  else if (myChar()) { k = 'c'; id = myChar().id; }
  const t = k && (k === 'c' ? charOf(id) : entOf(id));
  const p = t && (k === 'c' ? t.pos && t.pos[m.id] : [t.x, t.y]);
  if (!t || !p) { toast('Clique primeiro no personagem que vai andar.', true); return null; }
  if (!canMove(k, t)) { toast('Você não pode mover isso.', true); return null; }
  select(k, id);
  return { k, id, from: [Math.round(p[0]), Math.round(p[1])], pts: [], cells: [], segs: [] };
}
const trailFree = () => isMaster() || !R.st.camp.rules.walls;
function trailTo(t, cell) {
  const m = curMap(), last = t.cells.length ? t.cells[t.cells.length - 1] : t.from;
  return C.path(C.flags(m, mats()), m.w, m.h, last, cell, trailFree());
}
async function trailWalk() {
  const t = R.trail; if (!t) return;
  R.trail = null; drawTrail(null);
  if (!t.cells.length) return;
  const r = await H.emit('rpg:move', { cid: R.st.camp.id, k: t.k, id: t.id, path: t.cells });
  if (!r.ok) return toast(r.erro || 'Não deu para andar.', true);
  await animWalk(t.k, t.id, r.path);
  applyMove({ k: t.k, id: t.id, x: r.x, y: r.y, dir: r.dir, mapId: curMap() && curMap().id });
}
// clique numa porta: abre/fecha (jogadores precisam estar do lado; o servidor confere)
async function toggleDoor(d) {
  const m = curMap(), cid = R.st.camp.id;
  const r = await H.emit('rpg:door', { cid, mapId: m.id, id: d.id, action: d.state === 'aberta' ? 'fechar' : 'abrir' });
  if (!r.ok) toast(r.erro || 'Não deu.', true);
}
function bindBoard() {
  const view = $r('.rpg-view');
  let pan = null, paint = null, hd = null;
  view.addEventListener('wheel', e => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); const r = view.getBoundingClientRect(); setZoom(R.z * (e.deltaY < 0 ? 1.12 : 1 / 1.12), { x: e.clientX - r.left, y: e.clientY - r.top }); }, { passive: false });
  view.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.button !== 1) return;
    closeCtx();
    const tok = e.target.closest('.rpg-tok'), m = curMap(); if (!m) return;
    if (e.button === 0 && (e.altKey || R.tool === 'ping')) { const p = boardPos(e); if (isPlayer()) call('rpg:ping', { cid: R.st.camp.id, x: p.x - .5, y: p.y - .5 }); else showPing({ uid: me(), x: p.x - .5, y: p.y - .5 }); return; }
    // régua de medir: cada clique põe um ponto (curvas); clicar de novo no último ponto termina
    if (R.tool === 'regua' && e.button === 0) {
      const p = boardPos(e), cell = { x: Math.max(0, Math.min(m.w - 1, Math.floor(p.x))), y: Math.max(0, Math.min(m.h - 1, Math.floor(p.y))) };
      if (!R.meas) R.meas = { pts: [cell] };
      else { const last = R.meas.pts[R.meas.pts.length - 1]; if (last.x === cell.x && last.y === cell.y) { const done = R.meas; R.meas = null; drawMeasure(done.pts); setTimeout(() => { if (!R.meas && R.tool === 'regua') drawMeasure([]); }, 2500); return; } R.meas.pts.push(cell); }
      drawMeasure(R.meas.pts); return;
    }
    // régua de caminho: clique no personagem, depois nos pontos; clicar de novo no último ponto (ou Enter) faz ele andar
    if (R.tool === 'caminho' && e.button === 0) {
      const p = boardPos(e), cell = [Math.max(0, Math.min(m.w - 1, Math.floor(p.x))), Math.max(0, Math.min(m.h - 1, Math.floor(p.y)))];
      if (!R.trail) { R.trail = trailStart(tok); if (!R.trail || tok) { drawTrail(R.trail); return; } }
      const t = R.trail, end = t.cells.length ? t.cells[t.cells.length - 1] : t.from;
      if (end[0] === cell[0] && end[1] === cell[1]) { trailWalk(); return; }
      const seg = trailTo(t, cell);
      if (!seg) { toast('Não tem passagem até aí (parede, obstáculo ou porta fechada).', true); return; }
      if (t.cells.length + seg.length > 300) { toast('Caminho longo demais. Ande em partes.', true); return; }
      t.cells.push(...seg); t.pts.push(cell); t.segs.push(seg.length);
      drawTrail(t); return;
    }
    // Mestre arrasta lâmpadas e marcadores
    const lamp = e.target.closest('.rpg-lamp'), mk = e.target.closest('.rpg-mk.mv');
    if (isMaster() && R.tool === 'mover' && e.button === 0 && (lamp || mk)) {
      const el = lamp || mk, p = boardPos(e), ox = parseFloat(el.style.left) / CELL, oy = parseFloat(el.style.top) / CELL;
      hd = { el, kind: lamp ? 'luz' : 'marca', id: lamp ? lamp.dataset.lamp : mk.dataset.mk, ox, oy, dx: p.x - ox, dy: p.y - oy, moved: false, x: ox, y: oy };
      capture(view, e); return;
    }
    if (tok && R.tool === 'mover' && e.button === 0) {
      const k = tok.dataset.k, id = tok.dataset.id, t = k === 'c' ? charOf(id) : entOf(id); if (!t) return;
      const p = boardPos(e), ox = parseFloat(tok.style.left) / CELL, oy = parseFloat(tok.style.top) / CELL;
      R.drag = { k, id, el: tok, ox, oy, dx: p.x - ox, dy: p.y - oy, moved: false, can: canMove(k, t), last: 0, x: ox, y: oy };
      capture(tok, e);
      return;
    }
    if (isMaster() && e.button === 0 && ['porta', 'luz', 'marcador'].includes(R.tool)) { placeAt(boardPos(e)); return; }
    if (isMaster() && ['pincel', 'revelar', 'esconder', 'armadilha'].includes(R.tool) && e.button === 0) {
      paint = { cells: new Map(), traps: [], reveal: new Set(), hide: new Set() };
      paintAt(e, paint); capture(view, e); return;
    }
    pan = { x: e.clientX, y: e.clientY, sl: view.scrollLeft, st: view.scrollTop, e }; capture(view, e); view.classList.add('panning');
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
      ruler({ x: d.ox, y: d.oy }, R.st.camp.rules.grid ? { x: Math.round(nx), y: Math.round(ny) } : { x: nx, y: ny });
      const t0 = performance.now(); if (t0 - d.last > 60) { d.last = t0; H.socket && H.socket.emit('rpg:drag', { cid: R.st.camp.id, k: d.k, id: d.id, x: nx, y: ny }); }
      return;
    }
    if (hd) { const p = boardPos(e), m = curMap(); const nx = Math.max(0, Math.min(m.w - 1, p.x - hd.dx)), ny = Math.max(0, Math.min(m.h - 1, p.y - hd.dy)); if (!hd.moved && Math.hypot(nx - hd.ox, ny - hd.oy) < .2) return; hd.moved = true; hd.x = nx; hd.y = ny; hd.el.style.left = (hd.kind === 'luz' ? Math.round(nx) : nx) * CELL + 'px'; hd.el.style.top = (hd.kind === 'luz' ? Math.round(ny) : ny) * CELL + 'px'; return; }
    if (R.meas && R.tool === 'regua') { const p = boardPos(e); drawMeasure(R.meas.pts, { x: Math.floor(p.x), y: Math.floor(p.y) }); return; }
    if (R.trail && R.tool === 'caminho' && !pan) {
      const p = boardPos(e), m = curMap(), cell = [Math.floor(p.x), Math.floor(p.y)];
      if (cell[0] < 0 || cell[1] < 0 || cell[0] >= m.w || cell[1] >= m.h) return;
      const k = cell.join(','); if (R.trail.hk === k) return; R.trail.hk = k;
      drawTrail(R.trail, trailTo(R.trail, cell)); return;
    }
    if (paint) { paintAt(e, paint); return; }
    if (pan) { view.scrollLeft = pan.sl - (e.clientX - pan.x); view.scrollTop = pan.st - (e.clientY - pan.y); }
  });
  const end = async e => {
    const d = R.drag; R.drag = null;
    if (d) {
      d.el.classList.remove('dragging'); ruler(null);
      if (!d.moved) { select(d.k, d.id); return; }
      const r = await H.emit('rpg:move', { cid: R.st.camp.id, k: d.k, id: d.id, x: d.x, y: d.y });
      if (!r.ok) { toast(r.erro || 'Não deu para mover.', true); d.el.style.left = d.ox * CELL + 'px'; d.el.style.top = d.oy * CELL + 'px'; }
      else applyMove({ k: d.k, id: d.id, x: r.x, y: r.y, dir: r.dir, mapId: curMap() && curMap().id });
      return;
    }
    if (hd) {
      const h = hd, m = curMap(); hd = null;
      if (!h.moved) { if (h.kind === 'luz') lightModal((m.lights || []).find(x => x.id === h.id)); else markModal((m.marks || []).find(x => x.id === h.id)); return; }
      if (h.kind === 'luz') call('rpg:light:save', { cid: R.st.camp.id, mapId: m.id, light: { id: h.id, x: Math.round(h.x), y: Math.round(h.y) } });
      else call('rpg:mark:save', { cid: R.st.camp.id, mapId: m.id, mark: { id: h.id, x: Math.round(h.x * 4) / 4, y: Math.round(h.y * 4) / 4 } });
      return;
    }
    if (paint) { const p = paint; paint = null; flushPaint(p); return; }
    if (pan) {
      const moved = Math.abs(e.clientX - pan.x) + Math.abs(e.clientY - pan.y) > 4, start = pan.e; pan = null; view.classList.remove('panning');
      if (moved || e.target.closest('.rpg-tok')) return;
      // clique simples: numa porta abre/fecha; fora, tira a seleção
      const m = curMap(), p = boardPos(start), x = Math.floor(p.x), y = Math.floor(p.y);
      const d0 = m && x >= 0 && y >= 0 && x < m.w && y < m.h && doorAt(m, y * m.w + x);
      if (d0 && R.tool === 'mover' && isPlayer()) return toggleDoor(d0);
      select(null);
    }
  };
  view.addEventListener('pointerup', end);
  view.addEventListener('pointercancel', end);
  window.addEventListener('resize', onResize);
  // botão direito: menu da miniatura, porta, luz, marcador ou do mapa
  R.el.addEventListener('contextmenu', e => {
    if (e.target.closest('input, textarea, select')) { e.stopPropagation(); return; }
    e.stopPropagation(); e.preventDefault();
    // com a régua ou o caminho: botão direito desfaz o último ponto
    if (R.tool === 'regua' && R.meas) { R.meas.pts.pop(); if (!R.meas.pts.length) R.meas = null; drawMeasure(R.meas ? R.meas.pts : []); return; }
    if (R.tool === 'caminho' && R.trail) { const t = R.trail; if (t.segs.length) { t.cells.splice(t.cells.length - t.segs.pop()); t.pts.pop(); t.hk = ''; drawTrail(t); } else { R.trail = null; drawTrail(null); } return; }
    const tok = e.target.closest('.rpg-tok'), pp = e.target.closest('[data-pp]'), party = e.target.closest('.rpg-party-it[data-id]');
    const lamp = e.target.closest('.rpg-lamp'), mk = e.target.closest('.rpg-mk');
    if (tok) return tokenMenu(tok.dataset.k, tok.dataset.id, e.clientX, e.clientY);
    if (pp || party) return tokenMenu('c', (pp || party).dataset.pp || party.dataset.id, e.clientX, e.clientY);
    if (lamp && isMaster()) return lampMenu(lamp.dataset.lamp, e.clientX, e.clientY);
    if (mk && isMaster()) return markMenu(mk.dataset.mk, e.clientX, e.clientY);
    if (e.target.closest('.rpg-view') && curMap()) { const p = boardPos(e); return mapMenu(Math.floor(p.x), Math.floor(p.y), e.clientX, e.clientY); }
  });
  $r('.rpg-party').addEventListener('click', e => { const b = e.target.closest('[data-pp]'); if (!b) return; const ch = charOf(b.dataset.pp), m = curMap(); if (!ch) return; if (m && ch.pos && ch.pos[m.id]) { select('c', ch.id); centerOn(ch.pos[m.id][0], ch.pos[m.id][1]); } else sheetModal(ch); });
  $r('.rpg-party').addEventListener('dblclick', e => { const b = e.target.closest('[data-pp]'); if (b && charOf(b.dataset.pp)) sheetModal(charOf(b.dataset.pp)); });
  $r('.rpg-toks').addEventListener('dblclick', e => { const t = e.target.closest('.rpg-tok'); if (!t) return; if (t.dataset.k === 'c') sheetModal(charOf(t.dataset.id)); else if (isMaster()) entModal(entOf(t.dataset.id)); });
}
function onResize() { if (!R.el) { window.removeEventListener('resize', onResize); return; } setZoom(R.z); }
// ferramentas de clique do Mestre: porta, lâmpada e marcador
function placeAt(p) {
  const m = curMap(), x = Math.floor(p.x), y = Math.floor(p.y), cid = R.st.camp.id;
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return;
  const i = y * m.w + x;
  if (R.tool === 'porta') { const d = doorAt(m, i); if (d) return doorModal(d); return call('rpg:door:save', { cid, mapId: m.id, door: { i, look: R.doorDef.look, state: R.doorDef.state } }); }
  if (R.tool === 'luz') return call('rpg:light:save', { cid, mapId: m.id, light: { x, y, ...R.lamp, on: true } });
  if (R.tool === 'marcador') return call('rpg:mark:save', { cid, mapId: m.id, mark: { x: Math.round((p.x - .5) * 4) / 4, y: Math.round((p.y - .5) * 4) / 4, emoji: R.mark.e, size: R.mark.size, name: R.mark.name, vis: R.mark.vis } });
}
// pincel: pinta só na camada escolhida (o chão nunca é trocado por objeto, parede ou porta)
function paintAt(e, p) {
  const m = curMap(), pos = boardPos(e), x0 = Math.floor(pos.x), y0 = Math.floor(pos.y);
  if (x0 < 0 || y0 < 0 || x0 >= m.w || y0 >= m.h) return;
  if (R.tool === 'pincel') {
    const b = R.brush, sz = b.size || 1, off = Math.floor((sz - 1) / 2), cells = [];
    for (let a = 0; a < sz; a++) for (let c = 0; c < sz; c++) {
      const x = x0 - off + a, y = y0 - off + c; if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue;
      const i = y * m.w + x, id = b.erase ? null : b.id, k = i + ':' + b.L;
      if (b.erase && b.L === 'chao') continue;
      if (p.cells.get(k) === id) continue;
      p.cells.set(k, id); cells.push([i, b.L, id]);
    }
    if (cells.length) { C.setCells(m, cells); repaintSoon(); }
  } else if (R.tool === 'revelar' || R.tool === 'esconder') {
    const show = R.tool === 'revelar', n = m.w * m.h, s = C.bitsDec(m.seen, n);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const xx = x0 + a, yy = y0 + b; if (xx < 0 || yy < 0 || xx >= m.w || yy >= m.h) continue;
      const k = yy * m.w + xx; (show ? p.reveal : p.hide).add(k); s[k] = show ? 1 : 0;
    }
    m.seen = C.bitsEnc(s); drawFog();
  } else if (R.tool === 'armadilha' && !p.traps.length) {
    const i = y0 * m.w + x0, t = (m.traps || []).find(x => x.i === i);
    p.traps.push(!t ? [i, false, false] : !t.on ? [i, true, false] : [i, false, true]);
  }
}
async function flushPaint(p) {
  const m = curMap(); if (!m) return;
  const d = { cid: R.st.camp.id, mapId: m.id };
  if (p.cells.size) d.cells = [...p.cells.entries()].map(([k, id]) => { const [i, L] = k.split(':'); return [+i, L, id]; });
  if (p.reveal.size) d.reveal = [...p.reveal];
  if (p.hide.size) d.hide = [...p.hide];
  if (p.traps.length) d.traps = p.traps;
  if (Object.keys(d).length > 2) { const r = await H.emit('rpg:map:edit', d); if (!r.ok) toast(r.erro, true); }
}
function applyMove(mv) {
  const m = curMap(); if (!m || (mv.mapId && mv.mapId !== m.id)) return;
  if (mv.k === 'c') { const ch = charOf(mv.id); if (ch) { ch.pos = ch.pos || {}; ch.pos[m.id] = [mv.x, mv.y]; if (mv.dir !== undefined) ch.dir = mv.dir; } }
  else { const e = entOf(mv.id); if (e) { e.x = mv.x; e.y = mv.y; } }
  const el = $r(`.rpg-tok[data-k="${mv.k}"][data-id="${mv.id}"]`);
  if (el && !(R.drag && R.drag.id === mv.id)) { el.style.left = mv.x * CELL + 'px'; el.style.top = mv.y * CELL + 'px'; if (mv.dir !== undefined) el.style.setProperty('--dir', mv.dir + 'deg'); }
  if (mv.k === 'c') { drawLight(); if (isMaster() && m.fog) drawFog(); }
}

/* ---------- barra de ferramentas ---------- */
const TOOLS = [
  ['mover', '✋', 'Mover e selecionar (V). Clique numa porta para abrir/fechar', false], ['regua', '📏', 'Régua de medir: clique ponto a ponto, faz curvas (R)', false], ['caminho', '👣', 'Caminho: trace por onde o personagem anda, casa por casa (C)', false],['ping', '📍', 'Ping: mostre um ponto para todos (P ou Alt+clique)', false],
  ['pincel', '🖌️', 'Pincel de materiais, por camada (B)', true], ['porta', '🚪', 'Portas: clique numa casa para criar ou editar (D)', true], ['luz', '💡', 'Lâmpada: clique para iluminar (L)', true],
  ['marcador', '🏷️', 'Marcadores: emojis com nome (M)', true], ['revelar', '🔦', 'Revelar névoa à mão', true], ['esconder', '🌫️', 'Cobrir com névoa à mão', true], ['armadilha', '🪤', 'Armadilha: cria → revela → apaga', true]
];
const TOOL_HINT = { regua: 'Clique para pôr pontos (dá para fazer curvas). Clique de novo no último ponto para terminar · botão direito desfaz um ponto.', caminho: 'Clique no personagem e depois nos pontos do caminho (ele desvia de paredes). Clique de novo no último ponto ou Enter: ele anda casa por casa · botão direito desfaz · Esc cancela.', ping: 'Clique no mapa para mostrar um ponto para todo mundo.', pincel: 'Escolha a camada e o material. Cada camada é independente: pôr um objeto não troca o chão.', porta: 'Clique numa casa para criar uma porta (ela ocupa a abertura da parede). Clique numa porta para editar.', luz: 'Clique no mapa para pôr uma lâmpada. Arraste as 💡 com ✋ para mover; botão direito para editar.', marcador: 'Escolha o emoji, o nome e quem vê. Clique no mapa para colocar.', revelar: 'Pinte para revelar o que os jogadores veem.', esconder: 'Pinte para esconder de novo com névoa.', armadilha: 'Clique numa casa: cria (escondida) → revela → apaga.' };
function matPreview(cv, mt) {
  const g = cv.getContext('2d'), s = cv.width; g.clearRect(0, 0, s, s);
  if (mt.L === 'objeto') { g.fillStyle = '#3a342d'; g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 1, 0, 7); g.fill(); if (mt.img) g.drawImage(D.texCanvas(mt), 3, 3, s - 6, s - 6); else (D.OBJ[mt.st] || D.OBJ.emoji)(g, s / 2, s / 2, s * .95, mt.c, 3, mt); return; }
  g.fillStyle = g.createPattern(D.texCanvas(mt), 'repeat'); g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 1, 0, 7); g.fill();
}
function renderTools() {
  const t = $r('.rpg-toolbar'); if (!t) return;
  const m = curMap(), master = isMaster() && m;
  const KEYS = { mover: 'V', regua: 'R', caminho: 'C', ping: 'P', pincel: 'B', porta: 'D', luz: 'L', marcador: 'M' };
  const btn = ([k, i, l]) => `<button data-t="tool" data-v="${k}" class="${R.tool === k ? 'on' : ''}" data-tip="${l}" aria-label="${l}" ${KEYS[k] ? `data-key="${KEYS[k]}"` : ''}>${i}</button>`;
  // ferramentas de todos em cima; as do Mestre num grupo separado, com etiqueta
  t.innerHTML = `${TOOLS.filter(x => !x[3]).map(btn).join('')}${master ? `<hr><span class="rpg-tb-lbl">Mestre</span>${TOOLS.filter(x => x[3]).map(btn).join('')}` : ''}
    <hr><button data-t="in" aria-label="Aumentar zoom" data-tip="Aumentar (+)">＋</button><button data-t="zoom" class="z" data-tip="Ajustar à tela">${Math.round(R.z * 100)}%</button><button data-t="out" aria-label="Diminuir zoom" data-tip="Diminuir (−)">－</button>`;
  const fly = $r('.rpg-brush');
  fly.hidden = !(master && ['pincel', 'marcador', 'luz', 'porta'].includes(R.tool));
  fly.className = 'rpg-brush ' + (fly.hidden ? '' : 'tool-' + R.tool);
  if (!fly.hidden && R.tool === 'pincel') {
    const b = R.brush, all = [...Object.values(C.MATS), ...mats().map(x => C.mat(x.id, mats()))].filter(x => x.L === b.L);
    const cats = {}; for (const x of all) (cats[x.cat] = cats[x.cat] || []).push(x);
    fly.innerHTML = `<div class="rpg-br-tabs">${C.LAYERS.map(L => `<button data-t="layer" data-v="${L}" class="${b.L === L ? 'on' : ''}">${{ chao: '🟫 Chão', terreno: '💧 Terreno', parede: '🧱 Paredes', objeto: '🪑 Objetos' }[L]}</button>`).join('')}</div>
      <div class="rpg-br-opts"><span class="muted small">Tamanho</span>${[1, 2, 3].map(n => `<button data-t="size" data-v="${n}" class="${b.size === n ? 'on' : ''}">${n}×${n}</button>`).join('')}
        ${b.L !== 'chao' ? `<button data-t="erase" class="${b.erase ? 'on' : ''}" data-tip="Apaga só esta camada">🧽 Borracha</button>` : ''}<button data-t="newmat" data-tip="Criar material personalizado">＋ Material</button></div>
      <div class="rpg-br-list">${Object.entries(cats).sort((a, c) => Object.keys(C.CATS).indexOf(a[0]) - Object.keys(C.CATS).indexOf(c[0])).map(([cat, list]) => `<h5>${esc(C.CATS[cat] || cat)}</h5><div class="rpg-br-grid">${list.map(x => `<button data-t="brush" data-v="${esc(x.id)}" class="${!b.erase && b.id === x.id ? 'on' : ''}" title="${esc(x.n)}${x.w ? '' : ' · bloqueia passagem'}${x.s ? ' · bloqueia visão' : ''}${x.l ? ' · bloqueia luz' : ''}"><canvas width="26" height="26" data-mat="${esc(x.id)}"></canvas><span>${esc(x.n)}</span></button>`).join('')}</div>`).join('')}</div>`;
    fly.querySelectorAll('canvas[data-mat]').forEach(cv => matPreview(cv, MAT(cv.dataset.mat)));
  } else if (!fly.hidden && R.tool === 'marcador') {
    const k = R.mark;
    fly.innerHTML = `<div class="rpg-br-emo">${MARK_EMOJIS.map(x => `<button data-t="emo" data-v="${x}" class="${k.e === x ? 'on' : ''}">${x}</button>`).join('')}</div>
      <label class="rpg-br-f">Outro emoji<input data-f="e" maxlength="8" value="${esc(k.e)}"></label>
      <label class="rpg-br-f">Nome (aparece ao passar o mouse)<input data-f="name" maxlength="40" value="${esc(k.name)}" placeholder="Chave misteriosa"></label>
      <label class="rpg-br-f">Tamanho <b>${k.size}×</b><input data-f="size" type="range" min="0.5" max="3" step="0.25" value="${k.size}"></label>
      <label class="rpg-br-f">Quem vê<select data-f="vis"><option value="todos" ${k.vis === 'todos' ? 'selected' : ''}>Todos</option><option value="mestre" ${k.vis === 'mestre' ? 'selected' : ''}>Só eu (Mestre)</option></select></label>
      <p class="muted small">Clique no mapa para colocar. Para escolher jogadores específicos, clique no marcador depois.</p>`;
  } else if (!fly.hidden && R.tool === 'luz') {
    const k = R.lamp;
    fly.innerHTML = `<label class="rpg-br-f">Alcance <b>${k.r} casas</b><input data-f="r" type="range" min="1" max="20" value="${k.r}"></label>
      <label class="rpg-br-f">Intensidade <b>${k.intensity}%</b><input data-f="intensity" type="range" min="10" max="100" value="${k.intensity}"></label>
      <label class="rpg-br-f">Cor<input data-f="color" type="color" value="${esc(k.color)}"></label>
      <label class="rpg-br-f">Formato<select data-f="shape">${[['circulo', 'Círculo'], ['quadrado', 'Quadrado'], ['cone', 'Cone']].map(([v, l]) => `<option value="${v}" ${k.shape === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <p class="muted small">Clique no mapa para pôr a lâmpada. A luz não atravessa paredes nem portas fechadas.</p>`;
  } else if (!fly.hidden && R.tool === 'porta') {
    const k = R.doorDef;
    fly.innerHTML = `<label class="rpg-br-f">Aparência das novas portas<select data-f="look">${Object.entries(C.DOOR_LOOKS).map(([v, x]) => `<option value="${v}" ${k.look === v ? 'selected' : ''}>${esc(x.n)}</option>`).join('')}</select></label>
      <label class="rpg-br-f">Começa<select data-f="state">${[['fechada', 'Fechada'], ['aberta', 'Aberta'], ['trancada', 'Trancada']].map(([v, l]) => `<option value="${v}" ${k.state === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <p class="muted small">Clique numa casa (de preferência numa abertura da parede). Clique numa porta para editar chave, teste e mensagem.</p>`;
  }
  // barra de dica: ícone da ferramenta + o que fazer. Com ✋, quem está começando vê uma dica que dá para fechar.
  const hint = $r('.rpg-hint');
  if (hint) {
    const T = TOOLS.find(x => x[0] === R.tool), first = R.tool === 'mover' && !seen('dica-mover');
    const txt = TOOL_HINT[R.tool] || (first ? (isPlayer() ? 'Arraste sua miniatura para andar · clique numa porta para abrir · botão direito em qualquer coisa mostra as opções' : 'Arraste o mapa para olhar em volta · botão direito em qualquer coisa mostra as opções') : '');
    hint.innerHTML = txt ? `<i>${T ? T[1] : '✋'}</i><span>${esc(txt)}</span>${first ? '<button data-h="x" aria-label="Esconder esta dica" title="Entendi, esconder">×</button>' : ''}` : '';
    hint.hidden = !txt;
    hint.onclick = e => { if (e.target.closest('[data-h="x"]')) { markSeen('dica-mover'); renderTools(); } };
  }
  $r('.rpg-view').dataset.tool = R.tool;
  const onClick = e => {
    const b = e.target.closest('[data-t]'); if (!b) return;
    const a = b.dataset.t;
    if (a === 'in') setZoom(R.z * 1.2); if (a === 'out') setZoom(R.z / 1.2); if (a === 'zoom') fitZoom();
    if (a === 'tool') setTool(b.dataset.v);
    if (a === 'layer') { R.brush.L = b.dataset.v; R.brush.erase = false; const first = [...Object.values(C.MATS)].find(x => x.L === R.brush.L); if (!MAT(R.brush.id) || MAT(R.brush.id).L !== R.brush.L) R.brush.id = first.id; renderTools(); }
    if (a === 'size') { R.brush.size = +b.dataset.v; renderTools(); }
    if (a === 'erase') { R.brush.erase = !R.brush.erase; renderTools(); }
    if (a === 'brush') { R.brush.id = b.dataset.v; R.brush.erase = false; renderTools(); }
    if (a === 'newmat') matModal(null, R.brush.L);
    if (a === 'emo') { R.mark.e = b.dataset.v; renderTools(); }
  };
  t.onclick = onClick; fly.onclick = onClick;
  fly.oninput = e => {
    const f = e.target.dataset.f; if (!f) return;
    const obj = R.tool === 'marcador' ? R.mark : R.tool === 'luz' ? R.lamp : R.doorDef, v = e.target.value;
    obj[f === 'e' ? 'e' : f] = ['size', 'r', 'intensity'].includes(f) ? +v : v;
    const lbl = e.target.closest('label').querySelector('b'); if (lbl) lbl.textContent = f === 'size' ? v + '×' : f === 'r' ? v + ' casas' : v + '%';
  };
}
function setTool(v) {
  R.meas = null; R.trail = null; drawMeasure([]);
  R.tool = v; if (v !== 'mover' && v !== 'caminho') select(null);
  if ((v === 'revelar' || v === 'esconder') && curMap() && !curMap().fog) toast('A névoa está desligada. Ligue em Mestre → Luz e névoa para os jogadores verem a diferença.');
  renderTools();
}

/* ---------- menu do botão direito ---------- */
let ctxEl = null;
function closeCtx() { if (ctxEl) { ctxEl.remove(); ctxEl = null; } }
function ctxMenu(x, y, title, items) {
  closeCtx();
  const el = document.createElement('div'); el.className = 'rpg-ctx'; el.setAttribute('role', 'menu');
  el.innerHTML = (title ? `<div class="rpg-ctx-h">${title}</div>` : '') + items.map((it, i) => it.sep ? '<hr>' : it.html ? `<div class="rpg-ctx-c" data-i="${i}">${it.html}</div>` : `<button role="menuitem" data-i="${i}" class="${it.danger ? 'danger' : ''}" ${it.disabled ? 'disabled' : ''}><span>${it.ic || ''}</span>${esc(it.label)}${it.hint ? `<small>${esc(it.hint)}</small>` : ''}</button>`).join('');
  document.body.appendChild(el); ctxEl = el;
  const r = el.getBoundingClientRect();
  el.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px';
  el.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + 'px';
  items.forEach((it, i) => { if (it.bind) it.bind(el.querySelector(`.rpg-ctx-c[data-i="${i}"]`), closeCtx); });
  el.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (!b || !el.contains(b) || b.closest('.rpg-ctx-c')) return; const it = items[+b.dataset.i]; if (!it.keep) closeCtx(); it.act && it.act(); });
  el.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); });
  setTimeout(() => {
    const off = ev => { if (!ctxEl || ctxEl.contains(ev.target)) return; closeCtx(); document.removeEventListener('mousedown', off, true); };
    document.addEventListener('mousedown', off, true);
  });
}
function hpBlock(k, t) {
  return {
    html: `<div class="rpg-ctx-hp"><input type="number" min="1" max="9999" value="5" aria-label="Quantidade"><button data-h="dmg" class="dmg">💥 Dano</button><button data-h="heal" class="heal">💚 Cura</button>${k === 'c' && t.mpMax ? '<button data-h="mp" class="mp">🔷 −Mana</button>' : ''}</div>`,
    bind: (el, close) => {
      const inp = el.querySelector('input'); setTimeout(() => { inp.focus(); inp.select(); }, 30);
      const go = h => { const n = Math.abs(+inp.value || 0); if (!n) return; call('rpg:hp', { cid: R.st.camp.id, k, id: t.id, ...(h === 'mp' ? { dmg: n, field: 'mp' } : { dmg: h === 'dmg' ? n : -n }) }); close(); };
      el.addEventListener('click', e => { const b = e.target.closest('[data-h]'); if (b) go(b.dataset.h); });
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(e.shiftKey ? 'heal' : 'dmg'); if (e.key === 'Escape') close(); });
    }
  };
}
function condBlock(k, t) {
  return {
    html: `<div class="rpg-ctx-cond">${CONDS.map(c => `<button data-c="${esc(c)}" class="${(t.conds || []).includes(c) ? 'on' : ''}" title="${esc(c)}">${COND_IC[c]}</button>`).join('')}</div>`,
    bind: el => el.addEventListener('click', e => {
      const b = e.target.closest('[data-c]'); if (!b) return;
      const v = b.dataset.c, has = (t.conds || []).includes(v), conds = has ? t.conds.filter(x => x !== v) : [...(t.conds || []), v];
      b.classList.toggle('on', !has); t.conds = conds; call('rpg:cond', { cid: R.st.camp.id, k, id: t.id, conds });
    })
  };
}
// virar o personagem (a lanterna aponta para onde ele olha)
function faceBlock(t) {
  return {
    html: `<div class="rpg-ctx-dir"><span>Olhar para</span>${DIRS.map(([d, ic]) => `<button data-d="${d}" class="${(t.dir || 0) === d ? 'on' : ''}" title="${d}°">${ic}</button>`).join('')}</div>`,
    bind: (el, close) => el.addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (b) { call('rpg:face', { cid: R.st.camp.id, id: t.id, dir: +b.dataset.d }); close(); } })
  };
}
function tokenMenu(k, id, x, y) {
  const t = k === 'c' ? charOf(id) : entOf(id); if (!t) return;
  const master = isMaster(), own = k === 'c' && t.ownerId === me(), cid = R.st.camp.id, m = curMap();
  const canEdit = master || (own && R.st.camp.rules.editOwn);
  const pos = k === 'c' ? (m && t.pos && t.pos[m.id]) : (m && t.mapId === m.id ? [t.x, t.y] : null);
  const items = [];
  if (k === 'c') {
    items.push({ ic: '📜', label: canEdit ? 'Editar ficha' : 'Ver ficha', act: () => sheetModal(t) });
    if (canEdit) items.push({ sep: true }, hpBlock(k, t));
    if (master) items.push({ sep: true }, condBlock(k, t));
    if (pos && (master || (own && canMove('c', t)))) items.push({ sep: true }, faceBlock(t));
    if (own && t.lantern && t.lantern.toggle && !t.lantern.req) items.push({ ic: t.lantern.on ? '🌑' : '🔦', label: t.lantern.on ? 'Desligar a luz' : 'Ligar a luz', act: () => call('rpg:lantern', { cid, id, on: !t.lantern.on }) });
    items.push({ sep: true });
    if (pos) items.push({ ic: '🎯', label: 'Centralizar no mapa', act: () => { select('c', id); centerOn(pos[0], pos[1]); } });
    if (master) {
      items.push({ ic: '🎭', label: 'Criar evento', hint: 'cena privada', act: () => eventModal(R.st.camp.players.includes(t.ownerId) ? [t.ownerId] : [], [t.id]) });
      items.push({ ic: '🚚', label: 'Levar para outra cena…', act: () => sceneMoveModal(t) });
      items.push({ ic: '🔦', label: t.lantern ? 'Lanterna…' : 'Dar lanterna…', act: () => lanternModal(t) });
      if (m && m.fog) items.push({ ic: '👁️', label: R.preview === t.id ? 'Parar de ver como ele' : 'Ver o mapa como este personagem', act: () => { R.preview = R.preview === t.id ? '' : t.id; drawFog(); toast(R.preview ? `Mostrando a névoa como ${t.name} vê.` : 'Visão do Mestre.'); } });
      items.push({ ic: '🧭', label: 'Passar para outro jogador', act: () => ownerModal(t) });
    }
    if (master || own) items.push({ ic: '🗑️', label: 'Apagar personagem', danger: true, act: async () => { if (await H.confirmBox('Apagar personagem', `Apagar ${t.name}? Não dá para desfazer.`, 'Apagar')) call('rpg:char:del', { cid, id }); } });
  } else {
    if (master) {
      items.push({ ic: '✏️', label: 'Editar', act: () => entModal(t) }, { sep: true }, hpBlock(k, t), { sep: true }, condBlock(k, t), { sep: true },
        { ic: t.hidden ? '👁️' : '🙈', label: t.hidden ? 'Mostrar para os jogadores' : 'Esconder dos jogadores', act: () => call('rpg:ent:save', { cid, ent: { id, hidden: !t.hidden } }) },
        { ic: '⧉', label: 'Duplicar', act: () => { const { id: _, ...copy } = t; call('rpg:ent:save', { cid, ent: { ...copy, mapId: m.id, x: Math.min(m.w - 1, t.x + t.size), y: t.y } }); } },
        { ic: '➕', label: 'Aumentar', hint: `${t.size}×${t.size}`, disabled: t.size >= 6, act: () => call('rpg:ent:save', { cid, ent: { id, size: t.size + 1 } }) },
        { ic: '➖', label: 'Diminuir', disabled: t.size <= 1, act: () => call('rpg:ent:save', { cid, ent: { id, size: t.size - 1 } }) },
        { sep: true }, { ic: '🗑️', label: 'Apagar', danger: true, act: () => call('rpg:ent:del', { cid, id }).then(r => r.ok && R.sel && R.sel.id === id && select(null)) });
    } else items.push({ ic: '🎯', label: 'Centralizar', act: () => centerOn(t.x, t.y) });
  }
  if (isPlayer() && pos) items.push({ sep: true }, { ic: '📍', label: 'Ping aqui', act: () => call('rpg:ping', { cid, x: pos[0], y: pos[1] }) });
  const sub = k === 'c' ? (R.st.camp.classes.find(c => c.id === t.classId)?.name || 'Personagem') + ' · ' + esc(H.nameOf(t.ownerId)) : (ENT_KIND[t.kind] || '');
  ctxMenu(x, y, `<b>${esc(t.name)}</b><span>${sub}${t.hpMax !== undefined && (k === 'c' || master || t.hp !== undefined) ? ` · ❤️ ${t.hp}/${t.hpMax}` : ''}</span>`, items);
}
function doorItems(d) {
  const m = curMap(), cid = R.st.camp.id, master = isMaster();
  const act = a => call('rpg:door', { cid, mapId: m.id, id: d.id, action: a });
  const st = { aberta: 'aberta', fechada: 'fechada', trancada: 'trancada' }[d.state];
  if (!master) return isPlayer() ? [d.state === 'aberta' ? { ic: '🚪', label: 'Fechar a porta', act: () => act('fechar') } : { ic: '🚪', label: 'Abrir a porta', act: () => act('abrir') }] : [];
  return [
    { html: `<div class="rpg-ctx-sub">🚪 Porta ${d.name ? '"' + esc(d.name) + '"' : ''} · <b>${st}</b></div>` },
    ...(d.state !== 'aberta' ? [{ ic: '🔓', label: 'Abrir', act: () => act('abrir') }] : [{ ic: '🚪', label: 'Fechar', act: () => act('fechar') }]),
    ...(d.state !== 'trancada' ? [{ ic: '🔒', label: 'Trancar', act: () => act('trancar') }] : [{ ic: '🗝️', label: 'Destrancar', act: () => act('destrancar') }]),
    { ic: '✏️', label: 'Editar porta…', act: () => doorModal(d) },
    { ic: '🗑️', label: 'Tirar a porta', danger: true, act: () => call('rpg:door:del', { cid, mapId: m.id, id: d.id }) }
  ];
}
function mapMenu(cx, cy, x, y) {
  const m = curMap(), cid = R.st.camp.id, master = isMaster(); if (!m) return;
  cx = Math.max(0, Math.min(m.w - 1, cx)); cy = Math.max(0, Math.min(m.h - 1, cy));
  const i = cy * m.w + cx, d = doorAt(m, i), items = [];
  if (d) items.push(...doorItems(d), { sep: true });
  if (isPlayer()) items.push({ ic: '📍', label: 'Ping aqui', act: () => call('rpg:ping', { cid, x: cx, y: cy }) });
  items.push({ ic: '📏', label: 'Medir daqui', act: () => { setTool('regua'); R.meas = { pts: [{ x: cx, y: cy }] }; drawMeasure(R.meas.pts); } });
  if (master) {
    items.push({ sep: true },
      { ic: '👾', label: 'Criar criatura aqui', act: () => entModal(null, { x: cx, y: cy }) },
      ...PRESETS.slice(0, 5).map(([name, kind, emoji, hp, def, atk, level]) => ({ ic: emoji, label: name, hint: ENT_KIND[kind], act: () => call('rpg:ent:save', { cid, ent: { name, kind, emoji, hpMax: hp, hp, def, atk, level, x: cx, y: cy, mapId: m.id } }) })),
      { sep: true },
      ...(d ? [] : [{ ic: '🚪', label: 'Pôr porta aqui', act: () => call('rpg:door:save', { cid, mapId: m.id, door: { i, look: R.doorDef.look, state: R.doorDef.state } }) }]),
      { ic: '💡', label: 'Pôr lâmpada aqui', act: () => call('rpg:light:save', { cid, mapId: m.id, light: { x: cx, y: cy, ...R.lamp, on: true } }) },
      { ic: '🏷️', label: 'Pôr marcador aqui…', act: () => markModal(null, { x: cx, y: cy }) },
      { ic: '🧙', label: 'Trazer o grupo para cá', act: () => gatherParty(cx, cy) });
    if (m.fog) items.push({ ic: '🔦', label: 'Revelar em volta', act: () => { const reveal = []; for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) { const xx = cx + a, yy = cy + b; if (xx >= 0 && yy >= 0 && xx < m.w && yy < m.h && a * a + b * b <= 10) reveal.push(yy * m.w + xx); } call('rpg:map:edit', { cid, mapId: m.id, reveal }); } });
  }
  const parts = !m.bg || master ? C.LAYERS.map(L => C.cellId(m, L, i)).filter(Boolean).map(id => (MAT(id) || {}).n).filter(Boolean) : [];
  ctxMenu(x, y, `<b>${esc(m.name)}</b><span>casa ${cx + 1}, ${cy + 1}${parts.length ? ' · ' + esc(parts.join(' + ')) : ''}</span>`, items);
}
function lampMenu(id, x, y) {
  const m = curMap(), L = (m.lights || []).find(q => q.id === id); if (!L) return;
  const cid = R.st.camp.id;
  ctxMenu(x, y, `<b>💡 ${esc(L.name || 'Lâmpada')}</b><span>${L.r} casas · ${L.on ? 'acesa' : 'apagada'}</span>`, [
    { ic: L.on ? '🌑' : '💡', label: L.on ? 'Apagar' : 'Acender', act: () => call('rpg:light:save', { cid, mapId: m.id, light: { id, on: !L.on } }) },
    { ic: '✏️', label: 'Editar…', act: () => lightModal(L) },
    { ic: '🗑️', label: 'Tirar', danger: true, act: () => call('rpg:light:del', { cid, mapId: m.id, id }) }]);
}
function markMenu(id, x, y) {
  const m = curMap(), k = (m.marks || []).find(q => q.id === id); if (!k) return;
  ctxMenu(x, y, `<b>${esc(k.emoji)} ${esc(k.name || 'Marcador')}</b><span>${{ todos: 'todos veem', mestre: 'só o Mestre vê', alguns: 'alguns jogadores veem' }[k.vis]}</span>`, [
    { ic: '✏️', label: 'Editar…', act: () => markModal(k) },
    { ic: '🗑️', label: 'Apagar', danger: true, act: () => call('rpg:mark:del', { cid: R.st.camp.id, mapId: m.id, id }) }]);
}
async function gatherParty(cx, cy) {
  const m = curMap(), ring = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1], [2, 0], [-2, 0], [0, 2], [0, -2], [2, 1], [-2, 1], [2, -1], [-2, -1]];
  let k = 0;
  for (const ch of R.st.chars.filter(c => c.pos && c.pos[m.id])) { const [a, b] = ring[k++ % ring.length]; await H.emit('rpg:move', { cid: R.st.camp.id, k: 'c', id: ch.id, x: Math.max(0, Math.min(m.w - 1, cx + a)), y: Math.max(0, Math.min(m.h - 1, cy + b)) }); }
  toast('O grupo foi trazido para cá.');
}
function ownerModal(ch) {
  const c = R.st.camp, list = [c.masterId, ...c.players];
  H.modal(`<div class="modal-h"><h2>Passar ${esc(ch.name)} para…</h2><p>Quem controla o personagem pode movê-lo e editar a ficha (se a regra deixar).</p></div>
    <div class="modal-b rpg-form"><div class="rpg-pick">${list.map(u => `<button class="rpg-person btn ghost ${u === ch.ownerId ? 'on' : ''}" data-u="${u}">${H.av(u, 24, false)} ${esc(H.nameOf(u))}${u === ch.ownerId ? ' (agora)' : ''}</button>`).join('')}</div></div>
    <div class="modal-f"><button class="btn ghost" data-close>Cancelar</button></div>`, (m, close) => {
    m.querySelector('.rpg-pick').onclick = async e => { const b = e.target.closest('[data-u]'); if (!b || b.dataset.u === ch.ownerId) return; const r = await call('rpg:char:save', { cid: c.id, char: { ...ch, ownerId: b.dataset.u } }, `${ch.name} agora é de ${H.nameOf(b.dataset.u)}.`); if (r.ok) close(); };
  });
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

/* ---------- status personalizados (ficha, painel rápido) ---------- */
const statDefs = () => (R.st.camp.statCats || []).flatMap(k => k.stats.map(s => ({ ...s, cat: k })));
const statOf = (ch, s) => { const x = ch.stats && ch.stats[s.id]; return { v: x ? x.v : s.start, max: x && Number.isFinite(x.max) ? x.max : s.max }; };
function statWidget(s, val, edit, master) {
  const p = pct(val.v - s.min, val.max - s.min);
  const ctl = !edit ? `<b class="rpg-stv">${val.v}<small>/${val.max}</small></b>`
    : `<input type="number" data-sv="${s.id}" value="${val.v}" min="${s.min}" max="${val.max}" aria-label="${esc(s.name)}">${master ? `<input type="number" class="rpg-stmax" data-sm="${s.id}" value="${val.max}" min="${s.min}" title="Máximo deste personagem" aria-label="Máximo de ${esc(s.name)}">` : `<small>/${val.max}</small>`}`;
  const vis = s.show === 'pontos' && val.max - s.min <= 12
    ? `<span class="rpg-pips">${Array.from({ length: val.max - s.min }, (_, k) => `<i class="${k < val.v - s.min ? 'on' : ''}" ${edit ? `data-pip="${s.id}" data-n="${s.min + k + 1}"` : ''}></i>`).join('')}</span>`
    : s.show === 'numero' ? '' : `<span class="rpg-stbar"><i style="width:${p}%"></i></span>`;
  return `<div class="rpg-st" style="--sc:${esc(s.color)}" title="${esc(s.desc || s.name)}${s.regen.on !== 'nunca' && s.regen.n ? ` · recupera ${sgn(s.regen.n)} por ${s.regen.on}` : ''}${(s.mods || []).length ? ' · ' + s.mods.map(md => `${md.attr} ${sgn(md.v)} se ${md.op} ${md.at}`).join(', ') : ''}"><span class="rpg-st-n">${esc(s.icon || '')} ${esc(s.name)}</span>${vis}<span class="rpg-st-c">${ctl}</span></div>`;
}

/* ---------- seleção (painel rápido da miniatura) ---------- */
function select(k, id) {
  R.sel = k ? { k, id } : null;
  if (!R.el) return;
  R.el.querySelectorAll('.rpg-tok.sel, .rpg-pp.sel').forEach(x => x.classList.remove('sel'));
  if (R.sel) { const el = $r(`.rpg-tok[data-k="${k}"][data-id="${id}"]`); if (el) el.classList.add('sel'); const pp = $r(`.rpg-pp[data-pp="${id}"]`); if (pp) pp.classList.add('sel'); }
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
  const stats = master && s.k === 'e' ? `<div class="rpg-sel-stats"><span>🛡️ ${t.def}</span><span>⚔️ ${sgn(t.atk)}</span><span>⚡ ${sgn(t.init)}</span></div>` : s.k === 'c' ? `<div class="rpg-sel-stats"><span>🛡️ ${t.def}</span>${R.st.camp.attrs.map(a => `<span title="${esc(attrName(a))}">${esc(a)} ${t.attrs[a] ?? 10} (${sgn(bonus(t, a))})</span>`).join('')}</div>` : '';
  const sts = s.k === 'c' && statDefs().length ? `<div class="rpg-sel-sts">${statDefs().map(st => { const v = statOf(t, st); return `<span style="--sc:${esc(st.color)}" title="${esc(st.cat.name)} · ${esc(st.name)}">${esc(st.icon || '•')} ${v.v}/${v.max}</span>`; }).join('')}</div>` : '';
  const lt = s.k === 'c' && t.lantern;
  box.hidden = false;
  box.innerHTML = `<button class="rpg-sel-x" data-s="x" aria-label="Fechar">${H.ic('x')}</button>
    <div class="rpg-sel-h"><div class="rpg-sel-av" style="--tc:${esc(t.color || '#6c7cff')}">${tokImg({ k: s.k, t }) ? `<img src="${esc(tokImg({ k: s.k, t }))}" alt="">` : `<span>${s.k === 'e' && t.emoji ? esc(t.emoji) : initial(t.name)}</span>`}</div><div><b>${esc(t.name)}</b><span class="muted small">${sub}</span></div></div>
    ${hpTxt}${mpTxt}${stats}${sts}
    ${lt ? `<div class="rpg-sel-lt">🔦 ${esc((C.LANTERN_KINDS[lt.kind] || {}).n || 'Luz')} · ${lt.range} casas · ${lt.on ? 'ligada' : 'desligada'}${(own || master) && (master || (lt.toggle && !lt.req)) ? ` <button class="btn sm ghost" data-s="lt">${lt.on ? 'Desligar' : 'Ligar'}</button>` : ''}</div>` : ''}
    ${(t.conds || []).length ? `<div class="rpg-conds">${t.conds.map(c => `<span>${COND_IC[c] || '•'} ${esc(c)}</span>`).join('')}</div>` : ''}
    ${canHp && t.hpMax !== undefined ? `<div class="rpg-hpctl"><input type="number" min="1" max="9999" value="5" aria-label="Quantidade" data-s="amt"><button class="btn sm danger" data-s="dmg">💥 Dano</button><button class="btn sm" data-s="heal">💚 Cura</button>${s.k === 'c' && t.mpMax ? '<button class="btn sm ghost" data-s="mp">−🔷 Mana</button>' : ''}</div>` : ''}
    ${master ? `<div class="rpg-condpick">${CONDS.map(c => `<button data-s="cond" data-v="${esc(c)}" class="${(t.conds || []).includes(c) ? 'on' : ''}" data-tip="${esc(c)}" aria-label="${esc(c)}">${COND_IC[c]}</button>`).join('')}</div>` : ''}
    <div class="rpg-sel-acts">
      ${s.k === 'c' ? `<button class="btn sm" data-s="sheet">📜 Ficha</button>` : ''}${s.k === 'c' && (master || (own && canMove('c', t))) ? '<button class="btn sm ghost" data-s="rotl" data-tip="Virar à esquerda (Q)">↺</button><button class="btn sm ghost" data-s="rotr" data-tip="Virar à direita (E)">↻</button>' : ''}
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
    if (a === 'lt') call('rpg:lantern', master ? { cid, id: t.id, lantern: { on: !t.lantern.on } } : { cid, id: t.id, on: !t.lantern.on });
    if (a === 'rotl' || a === 'rotr') rotate(t, a === 'rotl' ? -45 : 45);
    if (a === 'edit') entModal(t);
    if (a === 'hide') call('rpg:ent:save', { cid, ent: { id: t.id, hidden: !t.hidden } });
    if (a === 'dup') { const { id, ...copy } = t; call('rpg:ent:save', { cid, ent: { ...copy, mapId: curMap().id, x: Math.min(curMap().w - 1, t.x + 1), y: t.y, name: t.name } }); }
    if (a === 'del' && await H.confirmBox('Apagar', `Tirar ${t.name} do mapa?`, 'Apagar')) { const r = await call('rpg:ent:del', { cid, id: t.id }); if (r.ok) select(null); }
  };
}
const rotate = (t, by) => call('rpg:face', { cid: R.st.camp.id, id: t.id, dir: ((t.dir || 0) + by + 360) % 360 });

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
  p.onclick = null; p.onchange = null; p.onsubmit = null; p.oninput = null;
  ({ grupo: paneGrupo, dados: paneDados, hist: paneHist, mestre: paneMestre })[R.tab](p);
}
function paneGrupo(p) {
  const c = R.st.camp, mine = myChar();
  const chars = R.st.chars.slice().sort((a, b) => (b.ownerId === me()) - (a.ownerId === me()) || a.name.localeCompare(b.name));
  const row = ch => { const cls = c.classes.find(k => k.id === ch.classId); const img = ch.img || avatarUrl(ch.ownerId);
    return `<button class="rpg-party-it ${ch.hp <= 0 ? 'down' : ''} ${ch.away ? 'away' : ''}" data-g="char" data-id="${ch.id}"><div class="rpg-sel-av" style="--tc:${esc(ch.color)}">${img ? `<img src="${esc(img)}" alt="">` : `<span>${initial(ch.name)}</span>`}</div>
      <div class="rpg-party-in"><b>${esc(ch.name)}</b><span class="muted small">${cls ? esc(cls.icon + ' ' + cls.name) : 'Sem classe'} · nv ${ch.level} · ${esc(H.nameOf(ch.ownerId))}${ch.away ? ' · 🎭 em outra cena' : ''}</span>
      <div class="rpg-bar hp sm"><i style="width:${pct(ch.hp, ch.hpMax)}%"></i><span>${ch.hp}/${ch.hpMax}</span></div>${ch.mpMax ? `<div class="rpg-bar mp sm"><i style="width:${pct(ch.mp, ch.mpMax)}%"></i><span>${ch.mp}/${ch.mpMax}</span></div>` : ''}
      ${(ch.conds || []).length ? `<div class="rpg-conds sm">${ch.conds.map(x => `<span>${COND_IC[x] || '•'} ${esc(x)}</span>`).join('')}</div>` : ''}</div></button>`; };
  const people = (ids, lbl) => ids.length ? `<div class="rpg-people"><h4>${lbl}</h4>${ids.map(u => `<div class="rpg-person">${H.av(u, 24, true)}<span>${esc(H.nameOf(u))}</span>${isMaster() && u !== c.masterId ? `<button class="icon-btn" data-g="event" data-id="${u}" data-tip="Criar evento para esta pessoa" aria-label="Criar evento">🎭</button><button class="icon-btn" data-g="kick" data-id="${u}" data-tip="Tirar da campanha" aria-label="Tirar da campanha">${H.ic('x')}</button>` : ''}</div>`).join('')}</div>` : '';
  p.innerHTML = `${isPlayer() && !mine && role() === 'jogador' ? `<div class="rpg-cta">🎭<div><b>Crie seu personagem</b><span class="muted small">Escolha nome, classe e atributos.</span></div><button class="btn primary sm" data-g="new">Criar</button></div>` : ''}
    ${role() === 'convidado' ? `<div class="rpg-cta">✉️<div><b>Você foi convidado</b><span class="muted small">Aceite para criar seu personagem e jogar.</span></div><button class="btn primary sm" data-g="join">Aceitar</button></div>` : ''}
    <h4 class="rpg-h">Personagens <span class="muted">${chars.length}</span>${isMaster() ? '<button class="btn sm ghost" data-g="newfor">+ Para jogador</button>' : ''}</h4>
    ${chars.length ? `<div class="rpg-party-list">${chars.map(row).join('')}</div>` : '<p class="muted small">Ninguém criou personagem ainda.</p>'}
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
    if (a === 'event') eventModal(c.players.includes(b.dataset.id) ? [b.dataset.id] : []);
    if (a === 'kick' && await H.confirmBox('Tirar da campanha', `Tirar ${H.nameOf(b.dataset.id)} da campanha? O personagem continua na mesa.`, 'Tirar')) call('rpg:kick', { cid, uid: b.dataset.id });
    if (a === 'leave' && await H.confirmBox('Sair da campanha', 'Você deixa de ser jogador. Seu personagem continua na mesa com o Mestre.', 'Sair')) call('rpg:leave', { cid });
  };
}
function centerOn(x, y) { const v = $r('.rpg-view'); if (!v) return; v.scrollTo({ left: (x + .5) * CELL * R.z - v.clientWidth / 2, top: (y + .5) * CELL * R.z - v.clientHeight / 2, behavior: 'smooth' }); }

function paneDados(p) {
  const can = isPlayer(), ch = myChar();
  const rolls = R.st.events.filter(e => e.type === 'roll').slice(-25).reverse();
  p.innerHTML = can ? `<div class="rpg-dice">${DICE.map(d => `<button data-d="${d}" class="rpg-die d${d}" data-tip="Clique: rolar 1d${d} · Shift+clique: somar na fórmula"><span>d${d}</span></button>`).join('')}</div>
    <form class="rpg-rollf" id="rpgRollF"><input id="rpgExpr" placeholder="Fórmula: 2d20+5, 4d6kh3, d100" maxlength="60" autocomplete="off" aria-label="Fórmula de dados">
      <input id="rpgLabel" placeholder="Para quê? (ataque, furtividade...)" maxlength="60" autocomplete="off" aria-label="Motivo da rolagem">
      <label class="rpg-check"><input type="checkbox" id="rpgPriv"> Secreta (só eu e o Mestre vemos)</label>
      <button class="btn primary">🎲 Rolar</button></form>
    <p class="muted small rpg-tip">kh3 = fica com os 3 maiores (vantagem: 2d20kh1). kl1 = fica com o menor (desvantagem).</p>
    ${ch ? `<h4 class="rpg-h">Testes do seu personagem</h4><div class="rpg-quick">${R.st.camp.attrs.map(a => `<button data-q="${esc(a)}" title="1d20 ${sgn(bonus(ch, a))}${bonus(ch, a) !== Math.floor(((ch.attrs[a] ?? 10) - 10) / 2) ? ' (com status)' : ''}">${esc(attrName(a))} ${sgn(bonus(ch, a))}</button>`).join('')}</div>` : ''}`
    : `<div class="rpg-empty sm">🎲<b>Só quem joga rola dados</b><span>${role() === 'convidado' ? 'Aceite o convite para jogar.' : 'Você está assistindo esta campanha.'}</span></div>`;
  p.innerHTML += `<h4 class="rpg-h">Últimas rolagens</h4><div class="rpg-feed">${rolls.length ? rolls.map(evHtml).join('') : '<p class="muted small">Nenhuma rolagem ainda.</p>'}</div>`;
  if (!can) return;
  const expr = p.querySelector('#rpgExpr');
  const roll = async (ex, label) => { const r = await call('rpg:roll', { cid: R.st.camp.id, expr: ex, label: label ?? p.querySelector('#rpgLabel').value, priv: p.querySelector('#rpgPriv').checked }); return r.ok; };
  p.onclick = e => {
    const d = e.target.closest('[data-d]');
    if (d) { if (e.shiftKey) { expr.value = addDie(expr.value, +d.dataset.d); expr.focus(); } else roll('1d' + d.dataset.d); return; }
    const q = e.target.closest('[data-q]');
    if (q) { const b = bonus(myChar(), q.dataset.q); roll('1d20' + (b ? sgn(b) : ''), 'Teste de ' + attrName(q.dataset.q)); }
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
  const sc = e.sc ? ` <span class="rpg-pv sc">🎭 ${esc(sceneName(e.sc))}</span>` : '';
  if (e.type === 'roll') {
    const r = e.roll;
    const parts = r.parts.map(p => p.rolls ? `<span class="rpg-dset">${esc(p.t)}: ${p.rolls.map((v, i) => `<i class="${p.kept.includes(i) ? '' : 'drop'} ${v === p.sides ? 'max' : v === 1 ? 'min' : ''}">${v}</i>`).join('')}</span>` : `<span class="rpg-dset">${p.mod > 0 ? '+' : ''}${p.mod}</span>`).join('');
    return `<div class="rpg-ev roll ${e.priv ? 'priv' : ''} ${r.crit ? 'crit' : ''} ${r.fail ? 'fail' : ''}">${H.av(e.uid, 24, false)}<div><div class="rpg-ev-h"><b>${esc(H.nameOf(e.uid))}</b>${e.text ? ` · ${esc(e.text)}` : ''}${e.priv ? ' <span class="rpg-pv">secreta</span>' : ''}${sc}<time>${t}</time></div>
      <div class="rpg-ev-roll"><code>${esc(r.expr)}</code> = <b class="rpg-total">${r.total}</b>${r.crit ? ' <span class="rpg-crit">CRÍTICO!</span>' : r.fail ? ' <span class="rpg-fail">falha crítica</span>' : ''}</div><div class="rpg-dsets">${parts}</div></div></div>`;
  }
  const ic = { sys: '📌', narr: '📖', act: '🗡️', dmg: '💥', heal: '💚', combat: '⚔️', turn: '⏳', log: '•' }[e.type] || '•';
  const who = e.uid && (e.type === 'narr' || e.type === 'act');
  return `<div class="rpg-ev ${esc(e.type)} ${e.priv ? 'priv' : ''}">${who ? H.av(e.uid, 24, false) : `<span class="rpg-ev-ic">${ic}</span>`}<div>${who ? `<div class="rpg-ev-h"><b>${esc(H.nameOf(e.uid))}</b>${e.type === 'narr' ? ' · Mestre' : ''}${e.priv ? ' <span class="rpg-pv">anotação</span>' : ''}${sc}<time>${t}</time></div>` : ''}<p>${esc(e.text)}${!who ? sc : ''}</p>${!who ? `<time>${t}</time>` : ''}</div></div>`;
}

/* ---------- aba do Mestre (sub-abas: nada de tudo numa tela só) ---------- */
let mTab = 'mapa';
function paneMestre(p) {
  const c = R.st.camp, m = curMap();
  const sub = [['mapa', '🗺️ Mapa'], ['visao', '💡 Luz e névoa'], ['cenas', '🎭 Cenas'], ['criaturas', '👾 Criaturas'], ['combate', '⚔️ Combate'], ['fichas', '📊 Fichas'], ['sessoes', '💾 Sessões']];
  let html = `<nav class="rpg-sub">${sub.map(([k, l]) => `<button data-m="sub" data-v="${k}" class="${mTab === k ? 'on' : ''}">${l}</button>`).join('')}</nav>`;
  if (mTab === 'mapa') {
    html += `<h4 class="rpg-h">Mapas da campanha</h4><div class="rpg-maps">${R.st.maps.map(x => `<div class="rpg-map-it ${m && x.id === m.id ? 'on' : ''}"><span>${x.bg ? '🖼️' : '🗺️'} <b>${esc(x.name)}</b> <span class="muted small">${x.w}×${x.h}${x.scene === 'cena' ? ' · 🎭 numa cena' : x.scene === 'principal' ? ' · principal' : ''}</span></span>
        ${m && x.id === m.id ? '<i class="muted small">vendo agora</i>' : x.scene === 'cena' ? '' : `<button class="btn sm" data-m="go" data-id="${x.id}">Levar o grupo</button>`}<button class="icon-btn" data-m="ren" data-id="${x.id}" aria-label="Renomear">${H.ic('edit')}</button><button class="icon-btn" data-m="mdel" data-id="${x.id}" aria-label="Apagar mapa">${H.ic('trash')}</button></div>`).join('') || '<p class="muted small">Nenhum mapa.</p>'}</div>
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
      <p class="muted small">No mapa importado, pinte paredes e portas com 🖌️ e 🚪: elas ficam invisíveis para os jogadores, mas bloqueiam passagem, visão e luz.</p>
      <h4 class="rpg-h">Materiais personalizados <button class="btn sm ghost" data-m="mats">Gerenciar</button></h4>
      <p class="muted small">${mats().length ? mats().map(x => esc(x.n)).join(', ') : 'Nenhum ainda. Crie com textura, imagem e propriedades próprias.'}</p>
      ${m ? `<label class="field">Anotações do mapa (só você vê)<textarea id="mNotes" rows="3" maxlength="2000">${esc(m.notes || '')}</textarea></label>` : ''}`;
  } else if (mTab === 'visao') {
    if (!m) html += '<p class="muted small">Crie um mapa primeiro.</p>';
    else {
      const lit = (m.lights || []);
      html += `<h4 class="rpg-h">Névoa de guerra</h4>
        <label class="rpg-check"><input type="checkbox" id="mFog" ${m.fog ? 'checked' : ''}> Ligada</label>
        <label class="field">Modo<select id="mFogMode">${Object.entries(C.FOG_MODES).map(([k, l]) => `<option value="${k}" ${m.fogMode === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
        <p class="muted small">Nos modos automáticos, cada jogador vê só o que o próprio personagem enxerga: paredes e portas fechadas bloqueiam, e no escuro só aparece o que estiver iluminado. A exploração é guardada por personagem.</p>
        <div class="rpg-row"><button class="btn sm" data-m="fogshow">Revelar tudo à mão</button><button class="btn sm" data-m="foghide">Tirar o revelado à mão</button><button class="btn sm ghost" data-m="fogreset">Zerar exploração</button></div>
        <label class="field">Ver o mapa como<select id="mPrev"><option value="">O grupo todo (Mestre)</option>${R.st.chars.filter(ch => ch.pos && ch.pos[m.id]).map(ch => `<option value="${ch.id}" ${R.preview === ch.id ? 'selected' : ''}>${esc(ch.name)}</option>`).join('')}</select></label>
        <h4 class="rpg-h">Luz do ambiente</h4>
        <div class="rpg-row"><label class="field">Ambiente<select id="mAmb">${Object.entries(C.AMBIENTS).map(([k, l]) => `<option value="${k}" ${m.amb === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label><label class="field">Alcance da visão<input id="mSight" type="number" min="1" max="30" value="${m.sight || 12}"></label></div>
        <h4 class="rpg-h">Lâmpadas <span class="muted">${lit.length}</span> <button class="btn sm ghost" data-m="tool-luz">💡 Pôr lâmpada</button></h4>
        <div class="rpg-maps">${lit.map(L => `<div class="rpg-map-it"><span><span style="color:${esc(L.color)}">●</span> <b>${esc(L.name || 'Lâmpada')}</b> <span class="muted small">${L.r} casas · ${{ circulo: 'círculo', cone: 'cone', quadrado: 'quadrado' }[L.shape]}${L.on ? '' : ' · apagada'}</span></span><button class="icon-btn" data-m="lon" data-id="${L.id}" aria-label="Acender/apagar">${L.on ? '💡' : '🌑'}</button><button class="icon-btn" data-m="led" data-id="${L.id}" aria-label="Editar">${H.ic('edit')}</button><button class="icon-btn" data-m="ldel" data-id="${L.id}" aria-label="Tirar">${H.ic('trash')}</button></div>`).join('') || '<p class="muted small">Nenhuma lâmpada.</p>'}</div>
        <h4 class="rpg-h">Lanternas dos personagens</h4>
        <div class="rpg-maps">${R.st.chars.map(ch => `<div class="rpg-map-it"><span>${ch.lantern ? (ch.lantern.on ? '🔦' : '🌑') : '·'} <b>${esc(ch.name)}</b> <span class="muted small">${ch.lantern ? `${esc((C.LANTERN_KINDS[ch.lantern.kind] || {}).n || '')} · ${ch.lantern.range} casas · ${ch.lantern.angle}°` : 'sem luz'}</span></span><button class="btn sm ghost" data-m="lant" data-id="${ch.id}">${ch.lantern ? 'Ajustar' : 'Dar lanterna'}</button></div>`).join('') || '<p class="muted small">Nenhum personagem.</p>'}</div>
        <h4 class="rpg-h">Portas <span class="muted">${(m.doors || []).length}</span> <button class="btn sm ghost" data-m="tool-porta">🚪 Pôr porta</button></h4>
        <p class="muted small">Clique com o botão direito numa porta para abrir, fechar, trancar ou editar (chave, teste de atributo e mensagem).</p>`;
    }
  } else if (mTab === 'cenas') {
    const sc = (c.scenes || []).filter(s => s.state === 'ativa'), old = (c.scenes || []).filter(s => s.state !== 'ativa');
    html += `<div class="rpg-row"><button class="btn primary sm" data-m="newev">🎭 Criar evento</button><button class="btn sm ${c.view === '' ? 'on' : ''}" data-m="view" data-id="">🏰 Ver a cena principal</button></div>
      <p class="muted small">Cada evento tem mapa, participantes, combate e histórico próprios. Quem não participa não recebe nada dele. Os jogadores que ficam de fora continuam na cena principal.</p>
      ${sc.map(s => `<div class="rpg-scene ${c.view === s.id ? 'on' : ''}"><div class="rpg-scene-h"><b>${s.vis === 'compartilhada' ? '👁️' : '🎭'} ${esc(s.name)}</b><span class="muted small">${s.vis === 'compartilhada' ? 'compartilhada' : 'privada'}${s.perm.move === false ? ' · sem mover' : ''}${s.perm.roll === false ? ' · sem rolar' : ''}${s.perm.say === false ? ' · sem escrever' : ''}</span></div>
        ${s.desc ? `<p class="small">${esc(s.desc)}</p>` : ''}
        <div class="rpg-scene-p">${s.uids.map(u => `<span class="rpg-chip">${H.av(u, 18, false)} ${esc(H.nameOf(u))}<button data-m="srem" data-id="${s.id}" data-u="${u}" aria-label="Devolver à cena principal" title="Devolver à cena principal">×</button></span>`).join('') || '<span class="muted small">Só personagens/NPCs</span>'}</div>
        <div class="rpg-row"><button class="btn sm" data-m="view" data-id="${s.id}">${c.view === s.id ? 'Vendo agora' : 'Ver esta cena'}</button><button class="btn sm ghost" data-m="sadd" data-id="${s.id}">+ Participante</button><button class="btn sm ghost" data-m="sedit" data-id="${s.id}">Permissões</button><button class="btn sm danger" data-m="send" data-id="${s.id}">Encerrar</button></div></div>`).join('') || '<p class="muted small">Nenhum evento acontecendo.</p>'}
      ${old.length ? `<h4 class="rpg-h">Encerrados recentemente</h4>${old.map(s => `<p class="muted small">🎭 ${esc(s.name)} · ${s.uids.map(u => esc(H.nameOf(u))).join(', ')}</p>`).join('')}` : ''}`;
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
    html += `${c.view ? `<p class="muted small">Combate do evento 🎭 ${esc(sceneName(c.view))}.</p>` : ''}` + (cb.on ? `<p>⚔️ Combate em andamento · rodada <b>${cb.round}</b></p>
      <ol class="rpg-init">${cb.order.map((f, i) => { const t = fighter(f); return `<li class="${i === cb.turn ? 'on' : ''}"><b>${f.init}</b> ${esc(t ? t.name : '???')}<span class="spacer"></span><button class="icon-btn" data-m="up" data-i="${i}" aria-label="Subir">${H.ic('up')}</button><button class="icon-btn" data-m="down" data-i="${i}" aria-label="Descer">${H.ic('down')}</button></li>`; }).join('')}</ol>
      <div class="rpg-row"><button class="btn sm" data-m="cprev">‹ Anterior</button><button class="btn primary sm" data-m="cnext">Próximo ›</button><button class="btn sm danger" data-m="cend">Encerrar combate</button></div>`
      : `<p class="muted small">Escolha quem luta. A iniciativa é rolada sozinha (d20 + Destreza com os modificadores de status, ou o bônus de iniciativa da criatura). Os status com recuperação "turno" e "rodada" se recuperam sozinhos.</p>
      <div class="rpg-pick">${cand.map(x => `<label class="rpg-check"><input type="checkbox" data-k="${x.k}" data-id="${x.id}" ${x.on ? 'checked' : ''}> ${esc(x.name)}</label>`).join('') || '<p class="muted small">Coloque personagens ou criaturas no mapa primeiro.</p>'}</div>
      ${cand.length ? '<button class="btn primary sm" data-m="cstart">⚔️ Começar combate</button>' : ''}`);
  } else if (mTab === 'fichas') {
    html += `<h4 class="rpg-h">Atributos</h4><p class="small">${c.attrs.map(a => `<b>${esc(a)}</b> ${esc(attrName(a))}`).join(' · ')}</p>
      <div class="rpg-row"><button class="btn sm" data-m="settings">Editar atributos e classes</button></div>
      <h4 class="rpg-h">Status personalizados</h4>
      ${(c.statCats || []).map(k => `<p class="small"><b style="color:${esc(k.color)}">${esc(k.icon)} ${esc(k.name)}</b>: ${k.stats.map(s => esc(s.name)).join(', ') || '<span class="muted">vazia</span>'}</p>`).join('') || '<p class="muted small">Nenhuma categoria.</p>'}
      <div class="rpg-row"><button class="btn primary sm" data-m="stats">📊 Editar categorias e status</button></div>
      <h4 class="rpg-h">Descanso</h4><p class="muted small">Aplica a recuperação "descanso" dos status em quem está nesta cena.</p>
      <div class="rpg-row"><button class="btn sm" data-m="rest">🏕️ Descanso curto</button><button class="btn sm" data-m="restfull">🛏️ Descanso longo (vida e mana cheias)</button></div>`;
  } else if (mTab === 'sessoes') {
    html += `<p class="muted small">Salve o estado do jogo (mapas, portas, luzes, criaturas, vida, status, posições, cenas e combate) para voltar depois.</p>
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
    const rg = gen.querySelector('[data-m="regen"]'); if (rg) rg.onclick = async () => { if (await H.confirmBox('Refazer mapa', 'O mapa atual será trocado por um novo com estas opções. Portas, luzes e marcadores dele são apagados; as criaturas ficam.', 'Refazer', false)) call('rpg:map:gen', { ...data(), replace: m.id }); };
  }
  const edit = d => call('rpg:map:edit', { cid, mapId: m.id, ...d });
  const q = s => p.querySelector(s);
  if (q('#mFog')) q('#mFog').onchange = () => edit({ fog: q('#mFog').checked });
  if (q('#mFogMode')) q('#mFogMode').onchange = () => edit({ fogMode: q('#mFogMode').value });
  if (q('#mAmb')) q('#mAmb').onchange = () => edit({ amb: q('#mAmb').value });
  if (q('#mSight')) q('#mSight').onchange = () => edit({ sight: +q('#mSight').value });
  if (q('#mPrev')) q('#mPrev').onchange = () => { R.preview = q('#mPrev').value; drawFog(); };
  if (q('#mNotes')) q('#mNotes').onchange = () => edit({ notes: q('#mNotes').value });
  const sf = q('#rpgSnapF'); if (sf) sf.onsubmit = async e => { e.preventDefault(); const r = await call('rpg:snap:save', { cid, name: sf.querySelector('#snapName').value }, 'Sessão salva.'); if (r.ok) sf.reset(); };
  p.onclick = async e => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    const a = b.dataset.m, id = b.dataset.id;
    if (a === 'sub') { mTab = b.dataset.v; renderPane(); }
    if (a === 'go') call('rpg:map:set', { cid, mapId: id });
    if (a === 'ren') { const x = R.st.maps.find(qq => qq.id === id); const n = await askText('Nome do mapa', x ? x.name : '', 40); if (n) call('rpg:map:edit', { cid, mapId: id, name: n }); }
    if (a === 'mdel' && await H.confirmBox('Apagar mapa', 'O mapa e as criaturas dele serão apagados.', 'Apagar')) call('rpg:map:del', { cid, mapId: id });
    if (a === 'import') importMap(+q('#iW').value || 30);
    if (a === 'mats') matsModal();
    if (a === 'fogshow') edit({ fogAll: 'show' });
    if (a === 'foghide') edit({ fogAll: 'hide' });
    if (a === 'fogreset' && await H.confirmBox('Zerar exploração', 'Todos os personagens esquecem o que já exploraram neste mapa.', 'Zerar')) edit({ resetExplore: true });
    if (a === 'tool-luz') setTool('luz');
    if (a === 'tool-porta') setTool('porta');
    if (a === 'lon') { const L = m.lights.find(x => x.id === id); call('rpg:light:save', { cid, mapId: m.id, light: { id, on: !L.on } }); }
    if (a === 'led') lightModal(m.lights.find(x => x.id === id));
    if (a === 'ldel') call('rpg:light:del', { cid, mapId: m.id, id });
    if (a === 'lant') lanternModal(charOf(id));
    if (a === 'newev') eventModal([]);
    if (a === 'view') switchScene(id || '');
    if (a === 'srem') call('rpg:scene:update', { cid, sid: id, remove: [b.dataset.u] });
    if (a === 'sadd') sceneAddModal(id);
    if (a === 'sedit') scenePermModal(id);
    if (a === 'send') sceneEndModal(id);
    if (a === 'newent') entModal(null);
    if (a === 'preset') { const [name, kind, emoji, hp, def, atk, level] = PRESETS[+b.dataset.i]; const pos = viewCenter(); call('rpg:ent:save', { cid, ent: { name, kind, emoji, hpMax: hp, hp, def, atk, level, x: pos.x, y: pos.y, mapId: m && m.id } }); }
    if (a === 'selent') { const en = entOf(id); if (en) { select('e', id); centerOn(en.x, en.y); } }
    if (a === 'hide') { const en = entOf(id); if (en) call('rpg:ent:save', { cid, ent: { id, hidden: !en.hidden } }); }
    if (a === 'cstart') { const ids = [...p.querySelectorAll('.rpg-pick input:checked')].map(x => ({ k: x.dataset.k, id: x.dataset.id })); call('rpg:combat', { cid, action: 'start', ids }); }
    if (a === 'cnext') call('rpg:combat', { cid, action: 'next' });
    if (a === 'cprev') call('rpg:combat', { cid, action: 'prev' });
    if (a === 'cend' && await H.confirmBox('Encerrar combate', 'A ordem de iniciativa será apagada.', 'Encerrar')) call('rpg:combat', { cid, action: 'end' });
    if (a === 'up' || a === 'down') { const i = +b.dataset.i, j = a === 'up' ? i - 1 : i + 1, o = c.combat.order.slice(); if (j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; call('rpg:combat', { cid, action: 'set', order: o }); }
    if (a === 'settings') settingsModal();
    if (a === 'stats') statsModal();
    if (a === 'rest') call('rpg:rest', { cid }, 'Descanso aplicado.');
    if (a === 'restfull') call('rpg:rest', { cid, full: true }, 'Descanso longo aplicado.');
    if (a === 'sload' && await H.confirmBox('Voltar para a sessão', 'Mapas, criaturas, vida, status, posições e cenas voltam a como estavam quando você salvou. O histórico continua.', 'Voltar', false)) call('rpg:snap:load', { cid, id });
    if (a === 'sdel' && await H.confirmBox('Apagar sessão salva', 'Não dá para desfazer.', 'Apagar')) call('rpg:snap:del', { cid, id });
  };
}
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

/* ---------- cenas e eventos privados ---------- */
function eventModal(preUids, preChars = []) {
  const c = R.st.camp, m = curMap();
  const busy = new Set([c.mapId, ...(c.scenes || []).filter(s => s.state === 'ativa').map(s => s.mapId)]);
  const freeMaps = R.st.maps.filter(x => !busy.has(x.id));
  const npcs = R.st.ents.filter(e => e.kind !== 'objeto');
  H.modal(`<div class="modal-h"><h2>🎭 Criar evento</h2><p>Uma cena separada, com mapa próprio. Quem não participa continua na cena principal e não recebe nada deste evento.</p></div>
    <div class="modal-b rpg-form">
      <label class="field">Nome do evento<input id="evName" maxlength="50" placeholder="O sonho na cripta"></label>
      <label class="field">Descrição<textarea id="evDesc" rows="2" maxlength="600" placeholder="O que está acontecendo (os participantes veem)"></textarea></label>
      <div class="field">Jogadores participantes<div class="rpg-pick">${c.players.map(u => `<label class="rpg-check"><input type="checkbox" data-u="${u}" ${preUids.includes(u) ? 'checked' : ''}> ${H.av(u, 20, false)} ${esc(H.nameOf(u))}</label>`).join('') || '<span class="muted small">Nenhum jogador ainda.</span>'}</div></div>
      <div class="field">Personagens envolvidos <span class="muted small">(os dos participantes entram sozinhos)</span><div class="rpg-pick">${R.st.chars.map(ch => `<label class="rpg-check"><input type="checkbox" data-ch="${ch.id}" ${preChars.includes(ch.id) ? 'checked' : ''}> ${esc(ch.name)} <span class="muted small">${esc(H.nameOf(ch.ownerId))}</span></label>`).join('')}</div></div>
      <div class="rpg-row"><label class="field">Cena<select id="evVis"><option value="privada">Privada (só participantes)</option><option value="compartilhada">Compartilhada (os outros podem assistir)</option></select></label>
        <label class="field">Mapa<select id="evMap"><option value="copia">Cópia do mapa atual${m ? ' (' + esc(m.name) + ')' : ''}</option>${Object.entries(MAP_KINDS).map(([k, l]) => `<option value="novo:${k}">Novo: ${l}</option>`).join('')}${freeMaps.map(x => `<option value="ex:${x.id}">Mapa: ${esc(x.name)}</option>`).join('')}</select></label></div>
      <label class="field">Localização inicial<select id="evStart"><option value="partida">Ponto de partida do mapa</option><option value="mesmo">Mesmo lugar de agora (só na cópia)</option></select></label>
      ${npcs.length ? `<div class="field">NPCs e criaturas presentes <span class="muted small">(entram cópias no mapa do evento)</span><div class="rpg-pick">${npcs.map(e => `<label class="rpg-check"><input type="checkbox" data-npc="${e.id}"> ${esc(e.emoji || '👾')} ${esc(e.name)}</label>`).join('')}</div></div>` : ''}
      <div class="field">Os participantes podem<div class="rpg-row"><label class="rpg-check"><input type="checkbox" id="evMove" checked> mover</label><label class="rpg-check"><input type="checkbox" id="evRoll" checked> rolar dados</label><label class="rpg-check"><input type="checkbox" id="evSay" checked> escrever</label></div></div>
    </div>
    <div class="modal-f"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="evGo">Começar evento</button></div>`, (md, close) => {
    const q = s => md.querySelector(s);
    q('#evGo').onclick = async () => {
      const mv = q('#evMap').value, map = mv === 'copia' ? { mode: 'copia' } : mv.startsWith('novo:') ? { mode: 'novo', kind: mv.slice(5) } : { mode: 'existente', mapId: mv.slice(3) };
      const r = await call('rpg:scene:create', { cid: c.id, name: q('#evName').value, desc: q('#evDesc').value, vis: q('#evVis').value, map, start: q('#evStart').value,
        uids: [...md.querySelectorAll('[data-u]:checked')].map(i => i.dataset.u), chars: [...md.querySelectorAll('[data-ch]:checked')].map(i => i.dataset.ch), npcs: [...md.querySelectorAll('[data-npc]:checked')].map(i => i.dataset.npc),
        perm: { move: q('#evMove').checked, roll: q('#evRoll').checked, say: q('#evSay').checked } }, 'Evento começou. Você está vendo a cena dele.');
      if (r.ok) close();
    };
  });
}
function sceneAddModal(sid) {
  const c = R.st.camp, s = c.scenes.find(x => x.id === sid); if (!s) return;
  const avail = c.players.filter(u => !s.uids.includes(u));
  H.modal(`<div class="modal-h"><h2>+ Participante em "${esc(s.name)}"</h2><p>Quem entrar sai da cena em que está (e leva o personagem).</p></div>
    <div class="modal-b"><div class="rpg-pick">${avail.map(u => `<label class="rpg-check"><input type="checkbox" value="${u}"> ${H.av(u, 20, false)} ${esc(H.nameOf(u))}</label>`).join('') || '<p class="muted">Todos os jogadores já estão nesta cena.</p>'}</div></div>
    <div class="modal-f"><button class="btn ghost" data-close>Cancelar</button>${avail.length ? '<button class="btn primary" id="saGo">Adicionar</button>' : ''}</div>`, (md, close) => {
    const go = md.querySelector('#saGo'); if (go) go.onclick = async () => { const r = await call('rpg:scene:update', { cid: c.id, sid, add: [...md.querySelectorAll('input:checked')].map(i => i.value) }); if (r.ok) close(); };
  });
}
function scenePermModal(sid) {
  const c = R.st.camp, s = c.scenes.find(x => x.id === sid); if (!s) return;
  H.modal(`<div class="modal-h"><h2>🎭 ${esc(s.name)}</h2></div>
    <div class="modal-b rpg-form"><label class="field">Nome<input id="spName" maxlength="50" value="${esc(s.name)}"></label><label class="field">Descrição<textarea id="spDesc" rows="2" maxlength="600">${esc(s.desc || '')}</textarea></label>
      <label class="field">Cena<select id="spVis"><option value="privada" ${s.vis === 'privada' ? 'selected' : ''}>Privada</option><option value="compartilhada" ${s.vis === 'compartilhada' ? 'selected' : ''}>Compartilhada</option></select></label>
      <div class="rpg-row"><label class="rpg-check"><input type="checkbox" id="spMove" ${s.perm.move !== false ? 'checked' : ''}> mover</label><label class="rpg-check"><input type="checkbox" id="spRoll" ${s.perm.roll !== false ? 'checked' : ''}> rolar dados</label><label class="rpg-check"><input type="checkbox" id="spSay" ${s.perm.say !== false ? 'checked' : ''}> escrever</label></div></div>
    <div class="modal-f"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="spGo">Salvar</button></div>`, (md, close) => {
    const q = x => md.querySelector(x);
    q('#spGo').onclick = async () => { const r = await call('rpg:scene:update', { cid: c.id, sid, name: q('#spName').value, desc: q('#spDesc').value, vis: q('#spVis').value, perm: { move: q('#spMove').checked, roll: q('#spRoll').checked, say: q('#spSay').checked } }); if (r.ok) close(); };
  });
}
function sceneEndModal(sid) {
  const c = R.st.camp, s = c.scenes.find(x => x.id === sid); if (!s) return;
  H.modal(`<div class="modal-h"><h2>Encerrar "${esc(s.name)}"</h2><p>Os participantes voltam para a cena principal, no lugar onde estavam.</p></div>
    <div class="modal-b"><label class="rpg-check"><input type="checkbox" id="seDrop"> Apagar o mapa do evento (e as criaturas dele)</label></div>
    <div class="modal-f"><button class="btn ghost" data-close>Cancelar</button><button class="btn danger" id="seGo">Encerrar evento</button></div>`, (md, close) => {
    md.querySelector('#seGo').onclick = async () => { const r = await call('rpg:scene:end', { cid: c.id, sid, dropMap: md.querySelector('#seDrop').checked }, 'Evento encerrado.'); if (r.ok) close(); };
  });
}
function sceneMoveModal(ch) {
  const c = R.st.camp, sc = (c.scenes || []).filter(s => s.state === 'ativa');
  H.modal(`<div class="modal-h"><h2>🚚 Levar ${esc(ch.name)} para…</h2><p>O dono do personagem vai junto (se for jogador).</p></div>
    <div class="modal-b"><div class="rpg-pick"><button class="btn ghost rpg-person" data-to="">🏰 Cena principal</button>${sc.map(s => `<button class="btn ghost rpg-person" data-to="${s.id}">🎭 ${esc(s.name)}</button>`).join('')}</div></div>
    <div class="modal-f"><button class="btn ghost" data-close>Cancelar</button></div>`, (md, close) => {
    md.querySelector('.rpg-pick').onclick = async e => { const b = e.target.closest('[data-to]'); if (!b) return; const r = await call('rpg:scene:move', { cid: c.id, charId: ch.id, to: b.dataset.to }, `${ch.name} foi levado.`); if (r.ok) close(); };
  });
}

/* ---------- portas, lâmpadas, marcadores e lanternas ---------- */
function doorModal(d) {
  const m = curMap(), c = R.st.camp;
  H.modal(`<div class="modal-h"><h2>🚪 Porta</h2><p>Fechada e trancada bloqueiam passagem, visão e luz (menos grade e vidro). Trancada só abre com a chave, com o teste ou pelo Mestre.</p></div>
    <div class="modal-b rpg-form">
      <div class="rpg-row"><label class="field">Nome<input id="drName" maxlength="30" value="${esc(d.name || '')}" placeholder="Porta da cela"></label>
      <label class="field">Estado<select id="drState">${[['aberta', 'Aberta'], ['fechada', 'Fechada'], ['trancada', 'Trancada']].map(([v, l]) => `<option value="${v}" ${d.state === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
      <label class="field">Aparência e material<select id="drLook">${Object.entries(C.DOOR_LOOKS).map(([v, x]) => `<option value="${v}" ${d.look === v ? 'selected' : ''}>${esc(x.n)}</option>`).join('')}</select></label>
      <div class="rpg-row"><label class="rpg-check"><input type="checkbox" id="drOpen" ${d.open !== false ? 'checked' : ''}> Jogadores podem abrir</label><label class="rpg-check"><input type="checkbox" id="drClose" ${d.close !== false ? 'checked' : ''}> Jogadores podem fechar</label></div>
      <label class="field">Chave necessária <span class="muted small">(nome do item no inventário; abre a trancada)</span><input id="drKey" maxlength="40" value="${esc(d.key || '')}" placeholder="Chave de ferro"></label>
      <div class="rpg-row"><label class="field">Teste de atributo<select id="drAttr"><option value="">Nenhum</option>${c.attrs.map(a => `<option value="${esc(a)}" ${d.test && d.test.attr === a ? 'selected' : ''}>${esc(attrName(a))}</option>`).join('')}</select></label><label class="field">Dificuldade (CD)<input id="drDc" type="number" min="1" max="40" value="${d.test ? d.test.dc : 12}"></label></div>
      <label class="field">Mensagem ao tentar abrir sem conseguir<input id="drMsg" maxlength="160" value="${esc(d.msg || '')}" placeholder="A fechadura está enferrujada."></label>
    </div>
    <div class="modal-f"><button class="btn ghost danger-t" id="drDel">Tirar porta</button><span class="spacer" style="flex:1"></span><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="drSave">Salvar</button></div>`, (md, close) => {
    const q = s => md.querySelector(s);
    q('#drSave').onclick = async () => { const attr = q('#drAttr').value; const r = await call('rpg:door:save', { cid: c.id, mapId: m.id, door: { id: d.id, name: q('#drName').value, state: q('#drState').value, look: q('#drLook').value, open: q('#drOpen').checked, close: q('#drClose').checked, key: q('#drKey').value, test: attr ? { attr, dc: +q('#drDc').value } : null, msg: q('#drMsg').value } }); if (r.ok) close(); };
    q('#drDel').onclick = async () => { const r = await call('rpg:door:del', { cid: c.id, mapId: m.id, id: d.id }); if (r.ok) close(); };
  });
}
function lightModal(L) {
  if (!L) return;
  const m = curMap(), c = R.st.camp;
  const walls = [...Object.values(C.MATS), ...mats()].filter(x => (x.L === 'parede' || x.L === 'terreno') && C.mat(x.id, mats()).l);
  H.modal(`<div class="modal-h"><h2>💡 ${esc(L.name || 'Lâmpada')}</h2><p>A luz é calculada na hora: paredes e portas fechadas bloqueiam, a névoa só sai de onde a luz chega.</p></div>
    <div class="modal-b rpg-form">
      <div class="rpg-row"><label class="field">Nome<input id="lgName" maxlength="30" value="${esc(L.name || '')}"></label><label class="rpg-check"><input type="checkbox" id="lgOn" ${L.on ? 'checked' : ''}> Acesa</label></div>
      <div class="rpg-row"><label class="field">Alcance (casas)<input id="lgR" type="number" min="0" max="30" step="0.5" value="${L.r}"></label><label class="field">Intensidade (%)<input id="lgI" type="number" min="5" max="100" value="${L.intensity}"></label><label class="field">Cor<input id="lgC" type="color" value="${esc(L.color)}"></label></div>
      <div class="rpg-row"><label class="field">Formato<select id="lgS">${[['circulo', 'Círculo'], ['quadrado', 'Quadrado'], ['cone', 'Cone']].map(([v, l]) => `<option value="${v}" ${L.shape === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label><label class="field">Direção do cone (°)<input id="lgD" type="number" min="0" max="359" value="${L.dir}"></label><label class="field">Abertura (°)<input id="lgA" type="number" min="10" max="360" value="${L.angle}"></label></div>
      <div class="field">Atravessa estes materiais <span class="muted small">(o resto bloqueia)</span><div class="rpg-pick">${walls.map(x => `<label class="rpg-check"><input type="checkbox" data-thru="${esc(x.id)}" ${(L.thru || []).includes(x.id) ? 'checked' : ''}> ${esc(x.n)}</label>`).join('')}${Object.entries(C.DOOR_LOOKS).filter(([, x]) => x.l).map(([k, x]) => `<label class="rpg-check"><input type="checkbox" data-thru="porta:${k}" ${(L.thru || []).includes('porta:' + k) ? 'checked' : ''}> Porta de ${esc(x.n.toLowerCase())}</label>`).join('')}</div></div>
    </div>
    <div class="modal-f"><button class="btn ghost danger-t" id="lgDel">Tirar</button><span class="spacer" style="flex:1"></span><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="lgSave">Salvar</button></div>`, (md, close) => {
    const q = s => md.querySelector(s);
    q('#lgSave').onclick = async () => { const r = await call('rpg:light:save', { cid: c.id, mapId: m.id, light: { id: L.id, name: q('#lgName').value, on: q('#lgOn').checked, r: +q('#lgR').value, intensity: +q('#lgI').value, color: q('#lgC').value, shape: q('#lgS').value, dir: +q('#lgD').value, angle: +q('#lgA').value, thru: [...md.querySelectorAll('[data-thru]:checked')].map(i => i.dataset.thru) } }); if (r.ok) close(); };
    q('#lgDel').onclick = async () => { const r = await call('rpg:light:del', { cid: c.id, mapId: m.id, id: L.id }); if (r.ok) close(); };
  });
}
function markModal(k, at) {
  const m = curMap(), c = R.st.camp, d = k || { emoji: R.mark.e, size: R.mark.size, name: R.mark.name, vis: R.mark.vis, uids: [], x: at.x, y: at.y };
  H.modal(`<div class="modal-h"><h2>🏷️ Marcador</h2><p>O nome aparece quando alguém passa o mouse em cima.</p></div>
    <div class="modal-b rpg-form">
      <div class="rpg-br-emo">${MARK_EMOJIS.map(x => `<button type="button" data-e="${x}" class="${d.emoji === x ? 'on' : ''}">${x}</button>`).join('')}</div>
      <div class="rpg-row"><label class="field">Emoji<input id="mkE" maxlength="8" value="${esc(d.emoji)}"></label><label class="field">Nome<input id="mkN" maxlength="40" value="${esc(d.name || '')}" placeholder="Chave misteriosa"></label><label class="field">Tamanho<input id="mkS" type="number" min="0.4" max="4" step="0.25" value="${d.size}"></label></div>
      <label class="field">Quem vê<select id="mkV"><option value="todos" ${d.vis === 'todos' ? 'selected' : ''}>Todos</option><option value="mestre" ${d.vis === 'mestre' ? 'selected' : ''}>Só o Mestre</option><option value="alguns" ${d.vis === 'alguns' ? 'selected' : ''}>Só alguns jogadores</option></select></label>
      <div class="rpg-pick" id="mkU" ${d.vis === 'alguns' ? '' : 'hidden'}>${c.players.map(u => `<label class="rpg-check"><input type="checkbox" value="${u}" ${(d.uids || []).includes(u) ? 'checked' : ''}> ${esc(H.nameOf(u))}</label>`).join('')}</div>
    </div>
    <div class="modal-f">${k ? '<button class="btn ghost danger-t" id="mkDel">Apagar</button><span class="spacer" style="flex:1"></span>' : ''}<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="mkSave">${k ? 'Salvar' : 'Colocar'}</button></div>`, (md, close) => {
    const q = s => md.querySelector(s);
    md.querySelector('.rpg-br-emo').onclick = e => { const b = e.target.closest('[data-e]'); if (!b) return; q('#mkE').value = b.dataset.e; md.querySelectorAll('[data-e]').forEach(x => x.classList.toggle('on', x === b)); };
    q('#mkV').onchange = () => { q('#mkU').hidden = q('#mkV').value !== 'alguns'; };
    q('#mkSave').onclick = async () => { const r = await call('rpg:mark:save', { cid: c.id, mapId: m.id, mark: { id: k ? k.id : undefined, x: d.x, y: d.y, emoji: q('#mkE').value, name: q('#mkN').value, size: +q('#mkS').value, vis: q('#mkV').value, uids: [...md.querySelectorAll('#mkU input:checked')].map(i => i.value) } }); if (r.ok) close(); };
    const del = q('#mkDel'); if (del) del.onclick = async () => { const r = await call('rpg:mark:del', { cid: c.id, mapId: m.id, id: k.id }); if (r.ok) close(); };
  });
}
function lanternModal(ch) {
  if (!ch) return;
  const c = R.st.camp, lt = ch.lantern || { kind: 'lanterna', ...C.LANTERN_KINDS.lanterna, on: true, toggle: true, req: false };
  H.modal(`<div class="modal-h"><h2>🔦 Luz de ${esc(ch.name)}</h2><p>A luz sai do personagem e aponta para onde ele olha (ele vira ao andar, ou com Q/E). Com névoa, o jogador só enxerga o que estiver iluminado.</p></div>
    <div class="modal-b rpg-form">
      <div class="rpg-row"><label class="field">Tipo<select id="ltK">${Object.entries(C.LANTERN_KINDS).map(([k, x]) => `<option value="${k}" ${lt.kind === k ? 'selected' : ''}>${esc(x.n)}</option>`).join('')}</select></label><label class="rpg-check"><input type="checkbox" id="ltOn" ${lt.on ? 'checked' : ''}> Ligada</label></div>
      <div class="rpg-row"><label class="field">Alcance (casas)<input id="ltR" type="number" min="1" max="30" value="${lt.range}"></label><label class="field">Ângulo do cone (°, 360 = em volta)<input id="ltA" type="number" min="10" max="360" value="${lt.angle}"></label></div>
      <div class="rpg-row"><label class="field">Intensidade (%)<input id="ltI" type="number" min="5" max="100" value="${lt.intensity}"></label><label class="field">Cor<input id="ltC" type="color" value="${esc(lt.color)}"></label></div>
      <label class="rpg-check"><input type="checkbox" id="ltT" ${lt.toggle ? 'checked' : ''}> O jogador pode ligar e desligar</label>
      <label class="rpg-check"><input type="checkbox" id="ltQ" ${lt.req ? 'checked' : ''}> Obrigatória (sempre ligada)</label>
    </div>
    <div class="modal-f">${ch.lantern ? '<button class="btn ghost danger-t" id="ltDel">Tirar a luz</button><span class="spacer" style="flex:1"></span>' : ''}<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="ltSave">${ch.lantern ? 'Salvar' : 'Dar a luz'}</button></div>`, (md, close) => {
    const q = s => md.querySelector(s);
    q('#ltK').onchange = () => { const k = C.LANTERN_KINDS[q('#ltK').value]; q('#ltR').value = k.range; q('#ltA').value = k.angle; q('#ltI').value = k.intensity; q('#ltC').value = k.color; };
    q('#ltSave').onclick = async () => { const r = await call('rpg:lantern', { cid: c.id, id: ch.id, lantern: { kind: q('#ltK').value, on: q('#ltOn').checked || q('#ltQ').checked, range: +q('#ltR').value, angle: +q('#ltA').value, intensity: +q('#ltI').value, color: q('#ltC').value, toggle: q('#ltT').checked, req: q('#ltQ').checked } }); if (r.ok) close(); };
    const del = q('#ltDel'); if (del) del.onclick = async () => { const r = await call('rpg:lantern', { cid: c.id, id: ch.id, lantern: null }); if (r.ok) close(); };
  });
}

/* ---------- materiais personalizados ---------- */
function matsModal() {
  const c = R.st.camp;
  H.modal(`<div class="modal-h"><h2>🧱 Materiais personalizados</h2><p>Aparecem no pincel, na categoria escolhida. Bloquear passagem, visão e luz vale de verdade na mesa.</p></div>
    <div class="modal-b"><div class="rpg-maps">${mats().map(x => `<div class="rpg-map-it"><span><canvas width="22" height="22" data-mat="${esc(x.id)}" class="rpg-matpv"></canvas> <b>${esc(x.n)}</b> <span class="muted small">${esc(C.LAYER_NAMES[x.L])} · ${esc(C.CATS[x.cat] || '')}</span></span><button class="icon-btn" data-ed="${x.id}" aria-label="Editar">${H.ic('edit')}</button><button class="icon-btn" data-del="${x.id}" aria-label="Apagar">${H.ic('trash')}</button></div>`).join('') || '<p class="muted small">Nenhum material personalizado.</p>'}</div></div>
    <div class="modal-f"><button class="btn ghost" data-close>Fechar</button><button class="btn primary" id="mtNew">+ Novo material</button></div>`, (md, close) => {
    md.querySelectorAll('canvas[data-mat]').forEach(cv => matPreview(cv, MAT(cv.dataset.mat)));
    md.querySelector('#mtNew').onclick = () => { close(); matModal(null, 'chao'); };
    md.onclick = async e => {
      const ed = e.target.closest('[data-ed]'), del = e.target.closest('[data-del]');
      if (ed) { close(); matModal(mats().find(x => x.id === ed.dataset.ed)); }
      if (del && await H.confirmBox('Apagar material', 'Ele sai de todos os mapas (no chão vira pedra).', 'Apagar')) { const r = await call('rpg:mat:del', { cid: c.id, id: del.dataset.del }); if (r.ok) close(); }
    };
  });
}
function matModal(x, layer) {
  const c = R.st.camp, d = x ? { ...x } : { n: '', L: layer || 'chao', cat: 'custom', color: '#7a7a7a', st: C.STYLES[layer || 'chao'][0], img: null, emoji: '', w: layer !== 'parede' && layer !== 'objeto' ? 1 : 0, s: layer === 'parede' ? 1 : 0, l: layer === 'parede' ? 1 : 0, glow: null };
  H.modal(`<div class="modal-h"><h2>${x ? '✏️ ' + esc(x.n) : '🧱 Novo material'}</h2></div>
    <div class="modal-b rpg-form">
      <div class="rpg-row"><label class="field">Nome<input id="mtN" maxlength="30" value="${esc(d.n)}" placeholder="Pedra lunar"></label><label class="field">Camada<select id="mtL" ${x ? 'disabled' : ''}>${C.LAYERS.map(L => `<option value="${L}" ${d.L === L ? 'selected' : ''}>${esc(C.LAYER_NAMES[L])}</option>`).join('')}</select></label></div>
      <div class="rpg-row"><label class="field">Categoria<select id="mtC">${Object.entries(C.CATS).map(([k, l]) => `<option value="${k}" ${d.cat === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label><label class="field">Cor<input id="mtCol" type="color" value="${esc(d.color)}"></label><label class="field">Desenho<select id="mtS"></select></label></div>
      <div class="rpg-row"><label class="field" id="mtEmoF">Emoji (objetos)<input id="mtE" maxlength="8" value="${esc(d.emoji || '')}"></label><div class="field">Textura/imagem<div class="rpg-row"><button type="button" class="btn sm" id="mtImg">${d.img ? '🖼️ Trocar imagem' : '📁 Enviar imagem'}</button>${d.img ? '<button type="button" class="btn sm ghost" id="mtImgX">Tirar</button>' : ''}</div></div><canvas width="48" height="48" id="mtPv" class="rpg-matpv big"></canvas></div>
      <div class="rpg-row"><label class="rpg-check"><input type="checkbox" id="mtW" ${d.w ? 'checked' : ''}> Dá para andar em cima</label><label class="rpg-check"><input type="checkbox" id="mtSi" ${d.s ? 'checked' : ''}> Bloqueia a visão</label><label class="rpg-check"><input type="checkbox" id="mtLi" ${d.l ? 'checked' : ''}> Bloqueia a luz</label><label class="rpg-check"><input type="checkbox" id="mtG" ${d.glow ? 'checked' : ''}> Brilha</label></div>
    </div>
    <div class="modal-f"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="mtSave">Salvar</button></div>`, (md, close) => {
    const q = s => md.querySelector(s);
    const styles = () => { const L = q('#mtL').value; q('#mtS').innerHTML = C.STYLES[L].map(s => `<option value="${s}" ${d.st === s ? 'selected' : ''}>${s}</option>`).join(''); q('#mtEmoF').hidden = L !== 'objeto'; };
    const pv = () => { const col = q('#mtCol').value; matPreview(q('#mtPv'), { id: 'pv-' + Date.now(), L: q('#mtL').value, c: [col, col, col], st: q('#mtS').value, img: d.img, emoji: q('#mtE').value }); };
    styles(); pv();
    q('#mtL').onchange = () => { styles(); pv(); }; q('#mtS').onchange = pv; q('#mtCol').oninput = pv; q('#mtE').oninput = pv;
    q('#mtImg').onclick = async () => { const f = await H.pickFile('image/png,image/webp,image/jpeg'); const up = await upImg(f, 256); if (up) { d.img = up.url; pv(); toast('Imagem pronta. Salve para usar.'); } };
    const ix = q('#mtImgX'); if (ix) ix.onclick = () => { d.img = null; ix.remove(); pv(); };
    q('#mtSave').onclick = async () => {
      const r = await call('rpg:mat:save', { cid: c.id, mat: { id: x ? x.id : undefined, n: q('#mtN').value, L: q('#mtL').value, cat: q('#mtC').value, color: q('#mtCol').value, st: q('#mtS').value, img: d.img, emoji: q('#mtE').value, w: q('#mtW').checked, s: q('#mtSi').checked, l: q('#mtLi').checked, glow: q('#mtG').checked } }, 'Material salvo.');
      if (r.ok) { close(); if (R.tool === 'pincel') { R.brush.L = q('#mtL').value; R.brush.id = r.id; } }
    };
  });
}

/* ---------- status: categorias e subcategorias ---------- */
function statsModal() {
  const c = R.st.camp, cats = JSON.parse(JSON.stringify(c.statCats || []));
  const SHOW = { barra: 'Barra', numero: 'Número', pontos: 'Bolinhas' }, ON = { nunca: 'não recupera', turno: 'por turno', rodada: 'por rodada', descanso: 'no descanso' };
  const modsTxt = s => (s.mods || []).map(md => `${md.attr}${sgn(md.v)}${md.op}${md.at}`).join(', ');
  H.modal(`<div class="modal-h"><h2>📊 Status personalizados</h2><p>Crie categorias (Físicos, Mentais...) e os status de cada uma. Use ↑ ↓ para reorganizar. Modificador: <code>DES-2>=5</code> = Destreza −2 quando o status estiver em 5 ou mais.</p></div>
    <div class="modal-b rpg-form rpg-statsed" id="stEd"></div>
    <div class="modal-f"><button class="btn ghost" id="stSug">Usar sugestões</button><span class="spacer" style="flex:1"></span><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="stSave">Salvar</button></div>`, (md, close) => {
    const box = md.querySelector('#stEd');
    const draw = () => {
      box.innerHTML = cats.map((k, ci) => `<fieldset class="rpg-stcat" style="--sc:${esc(k.color)}"><div class="rpg-row"><input class="rpg-cls-ic" data-ci="${ci}" data-f="icon" maxlength="8" value="${esc(k.icon || '')}" aria-label="Ícone"><input data-ci="${ci}" data-f="name" maxlength="30" value="${esc(k.name)}" aria-label="Nome da categoria"><input type="color" data-ci="${ci}" data-f="color" value="${esc(k.color)}" aria-label="Cor"><button type="button" class="icon-btn" data-up="${ci}" aria-label="Subir">↑</button><button type="button" class="icon-btn" data-down="${ci}" aria-label="Descer">↓</button><button type="button" class="icon-btn" data-delc="${ci}" aria-label="Apagar categoria">${H.ic('trash')}</button></div>
        ${k.stats.map((s, si) => `<div class="rpg-strow"><div class="rpg-row"><input class="rpg-cls-ic" data-ci="${ci}" data-si="${si}" data-f="icon" maxlength="8" value="${esc(s.icon || '')}" aria-label="Ícone"><input data-ci="${ci}" data-si="${si}" data-f="name" maxlength="30" value="${esc(s.name)}" placeholder="Nome" aria-label="Nome"><label>mín<input type="number" data-ci="${ci}" data-si="${si}" data-f="min" value="${s.min}"></label><label>máx<input type="number" data-ci="${ci}" data-si="${si}" data-f="max" value="${s.max}"></label><label>começa<input type="number" data-ci="${ci}" data-si="${si}" data-f="start" value="${s.start}"></label>
          <button type="button" class="icon-btn" data-sup="${ci}:${si}" aria-label="Subir">↑</button><button type="button" class="icon-btn" data-sdown="${ci}:${si}" aria-label="Descer">↓</button><button type="button" class="icon-btn" data-dels="${ci}:${si}" aria-label="Apagar">${H.ic('x')}</button></div>
          <div class="rpg-row"><select data-ci="${ci}" data-si="${si}" data-f="show" aria-label="Apresentação">${Object.entries(SHOW).map(([v, l]) => `<option value="${v}" ${s.show === v ? 'selected' : ''}>${l}</option>`).join('')}</select><input type="color" data-ci="${ci}" data-si="${si}" data-f="color" value="${esc(s.color || k.color)}" aria-label="Cor">
          <label>recupera<input type="number" data-ci="${ci}" data-si="${si}" data-f="rn" value="${s.regen ? s.regen.n : 0}"></label><select data-ci="${ci}" data-si="${si}" data-f="ron" aria-label="Quando recupera">${Object.entries(ON).map(([v, l]) => `<option value="${v}" ${(s.regen ? s.regen.on : 'nunca') === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <input data-ci="${ci}" data-si="${si}" data-f="mods" value="${esc(modsTxt(s))}" placeholder="Modificadores: DES-2>=5" aria-label="Modificadores"></div>
          <input data-ci="${ci}" data-si="${si}" data-f="desc" maxlength="200" value="${esc(s.desc || '')}" placeholder="Descrição (aparece ao passar o mouse)" aria-label="Descrição"></div>`).join('')}
        <button type="button" class="btn sm ghost" data-adds="${ci}">+ Status em ${esc(k.name)}</button></fieldset>`).join('') + '<button type="button" class="btn sm" id="stAddC">+ Categoria</button>';
      box.querySelector('#stAddC').onclick = () => { cats.push({ name: 'Nova categoria', icon: '⭐', color: '#6c7cff', stats: [] }); draw(); };
    };
    draw();
    box.oninput = e => {
      const t = e.target, ci = t.dataset.ci; if (ci === undefined) return;
      const k = cats[+ci], f = t.dataset.f, obj = t.dataset.si !== undefined ? k.stats[+t.dataset.si] : k;
      if (f === 'mods') { obj.mods = []; for (const mm of t.value.toUpperCase().matchAll(/([A-ZÇÃÁÉÍÓÚ]{2,6})\s*([+-]\s*\d+)\s*(>=|<=)\s*(-?\d+)/g)) obj.mods.push({ attr: mm[1], v: +mm[2].replace(/\s/g, ''), op: mm[3], at: +mm[4] }); }
      else if (f === 'rn' || f === 'ron') { obj.regen = obj.regen || { n: 0, on: 'nunca' }; if (f === 'rn') obj.regen.n = +t.value; else obj.regen.on = t.value; }
      else obj[f] = ['min', 'max', 'start'].includes(f) ? +t.value : t.value;
    };
    box.onclick = e => {
      const b = e.target.closest('button'); if (!b) return; const ds = b.dataset, sw = (arr, i, j) => { if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; };
      if (ds.up !== undefined) sw(cats, +ds.up, +ds.up - 1); else if (ds.down !== undefined) sw(cats, +ds.down, +ds.down + 1); else if (ds.delc !== undefined) cats.splice(+ds.delc, 1);
      else if (ds.adds !== undefined) cats[+ds.adds].stats.push({ name: 'Novo status', icon: '', min: 0, max: 10, start: 0, show: 'barra', regen: { n: 0, on: 'nunca' }, mods: [], desc: '' });
      else if (ds.sup || ds.sdown || ds.dels) { const [ci, si] = (ds.sup || ds.sdown || ds.dels).split(':').map(Number), arr = cats[ci].stats; if (ds.sup) sw(arr, si, si - 1); else if (ds.sdown) sw(arr, si, si + 1); else arr.splice(si, 1); }
      else return;
      draw();
    };
    md.querySelector('#stSug').onclick = async () => { if (await H.confirmBox('Usar sugestões', 'Troca as categorias por Físicos, Mentais e Sobrenaturais (com exemplos).', 'Trocar', false)) { const r = await call('rpg:stats', { cid: c.id, suggest: true }, 'Sugestões aplicadas.'); if (r.ok) close(); } };
    md.querySelector('#stSave').onclick = async () => { const r = await call('rpg:stats', { cid: c.id, cats }, 'Status salvos.'); if (r.ok) close(); };
  });
}

/* ---------- janelas: ficha, criatura, configurações, convites ---------- */
function sheetModal(ch, ownerId) {
  const c = R.st.camp, master = isMaster(), own = ch ? ch.ownerId === me() : true;
  const edit = master || (own && (!ch || c.rules.editOwn));
  const d = ch ? JSON.parse(JSON.stringify(ch)) : { name: '', classId: c.classes[0] ? c.classes[0].id : null, level: 1, hp: 10, hpMax: 10, mp: 0, mpMax: 0, def: 10, attrs: Object.fromEntries(c.attrs.map(a => [a, 10])), stats: {}, skills: '', inv: [], conds: [], notes: '', img: null, color: '#6c7cff' };
  if (!ch) { const cl = c.classes.find(k => k.id === d.classId); if (cl) applyClass(d, cl, c); }
  const dis = edit ? '' : 'disabled';
  const classOpts = `<option value="">Sem classe</option>` + c.classes.map(k => `<option value="${k.id}" ${d.classId === k.id ? 'selected' : ''}>${esc(k.icon + ' ' + k.name)}</option>`).join('');
  const smods = C.statMods(c.statCats, d);
  H.modal(`<div class="modal-h"><h2>📜 ${ch ? esc(ch.name) : 'Novo personagem'}</h2><p>${ch ? `De ${esc(H.nameOf(ch.ownerId))}` : ownerId && ownerId !== me() ? `Para ${esc(H.nameOf(ownerId))}` : 'Seu personagem nesta campanha.'}${edit ? '' : ' · só o Mestre pode mudar.'}</p></div>
    <div class="modal-b rpg-form rpg-sheet">
      <div class="rpg-sheet-top"><button type="button" class="rpg-portrait" id="shImg" ${dis} style="--tc:${esc(d.color)}" aria-label="Retrato">${d.img || avatarUrl(ch ? ch.ownerId : (ownerId || me())) ? `<img src="${esc(d.img || avatarUrl(ch ? ch.ownerId : (ownerId || me())))}" alt="">` : '<span>🙂</span>'}</button>
        <div style="flex:1;min-width:0;display:grid;gap:8px"><label class="field">Nome<input id="shName" maxlength="40" value="${esc(d.name)}" ${dis} placeholder="Nome do personagem"></label>
        <div class="rpg-row"><label class="field">Classe<select id="shClass" ${dis}>${classOpts}</select></label><label class="field">Nível<input id="shLvl" type="number" min="1" max="99" value="${d.level}" ${dis}></label><label class="field">Cor<input id="shColor" type="color" value="${esc(d.color)}" ${dis}></label></div></div></div>
      <p class="muted small" id="shClassDesc"></p>
      <div class="rpg-row rpg-vitals"><label class="field">❤️ Vida<input id="shHp" type="number" value="${d.hp}" ${dis}></label><label class="field">Máx.<input id="shHpMax" type="number" min="1" value="${d.hpMax}" ${dis}></label><label class="field">🔷 Mana<input id="shMp" type="number" min="0" value="${d.mp}" ${dis}></label><label class="field">Máx.<input id="shMpMax" type="number" min="0" value="${d.mpMax}" ${dis}></label><label class="field">🛡️ Defesa<input id="shDef" type="number" min="0" max="99" value="${d.def}" ${dis}></label></div>
      <div class="rpg-attrs">${c.attrs.map(a => `<label class="rpg-attr" title="${esc(attrName(a))}"><span>${esc(attrName(a))}</span><input type="number" min="1" max="30" data-attr="${esc(a)}" value="${d.attrs[a] ?? 10}" ${dis}><i>${mod(d.attrs[a])}${smods[a] ? `<b class="${smods[a] < 0 ? 'neg' : 'pos'}">${sgn(smods[a])}</b>` : ''}</i></label>`).join('')}</div>
      ${(c.statCats || []).length ? `<div class="rpg-stats">${c.statCats.map(k => `<fieldset class="rpg-stcat view" style="--sc:${esc(k.color)}"><legend>${esc(k.icon || '')} ${esc(k.name)}</legend>${k.stats.map(s => statWidget(s, statOf(d, s), edit, master)).join('') || '<span class="muted small">vazia</span>'}</fieldset>`).join('')}</div>` : ''}
      ${master ? `<div class="rpg-row rpg-vitals"><label class="field">👁️ Visão (casas)<input id="shSight" type="number" min="1" max="30" value="${d.sight ?? ''}" placeholder="do mapa"></label><label class="field">🌑 Visão no escuro<input id="shDark" type="number" min="0" max="30" value="${d.dark ?? 1}"></label>${ch ? `<button type="button" class="btn sm" id="shLant">🔦 ${ch.lantern ? 'Lanterna…' : 'Dar lanterna'}</button>` : ''}</div>` : ''}
      <label class="field">Habilidades e magias <span class="muted small">(uma por linha)</span><textarea id="shSkills" rows="3" maxlength="1500" ${dis}>${esc(d.skills)}</textarea></label>
      <div class="field">Inventário <span class="muted small">(chaves abrem portas trancadas pelo nome)</span><div class="rpg-inv" id="shInv"></div>${edit ? '<button type="button" class="btn sm ghost" id="shInvAdd">+ Item</button>' : ''}</div>
      ${master ? `<div class="field">Condições<div class="rpg-condpick big" id="shConds">${CONDS.map(x => `<button type="button" data-v="${esc(x)}" class="${d.conds.includes(x) ? 'on' : ''}">${COND_IC[x]} ${esc(x)}</button>`).join('')}</div></div>` : (d.conds.length ? `<div class="rpg-conds">${d.conds.map(x => `<span>${COND_IC[x] || '•'} ${esc(x)}</span>`).join('')}</div>` : '')}
      ${d.notes !== undefined ? `<label class="field">Anotações<textarea id="shNotes" rows="2" maxlength="2000" ${dis}>${esc(d.notes || '')}</textarea></label>` : ''}
    </div>
    <div class="modal-f">${ch && (master || own) ? '<button class="btn ghost danger-t" id="shDel">Apagar personagem</button><span class="spacer" style="flex:1"></span>' : ''}<button class="btn ghost" data-close>${edit ? 'Cancelar' : 'Fechar'}</button>${edit ? `<button class="btn primary" id="shSave">${ch ? 'Salvar' : 'Criar personagem'}</button>` : ''}</div>`, (m, close) => {
    const q = s => m.querySelector(s);
    const drawInv = () => {
      q('#shInv').innerHTML = d.inv.length ? d.inv.map((it, i) => `<div class="rpg-inv-it"><input value="${esc(it.name)}" data-i="${i}" data-f="name" maxlength="40" ${dis} aria-label="Item"><input type="number" min="0" value="${it.qty}" data-i="${i}" data-f="qty" ${dis} aria-label="Quantidade"><input value="${esc(it.note || '')}" data-i="${i}" data-f="note" maxlength="120" placeholder="nota" ${dis} aria-label="Nota">${edit ? `<button type="button" class="icon-btn" data-del="${i}" aria-label="Tirar item">${H.ic('x')}</button>` : ''}</div>`).join('') : '<p class="muted small" style="margin:0">Mochila vazia.</p>';
    };
    drawInv();
    const descCls = () => { const cl = c.classes.find(k => k.id === q('#shClass').value); q('#shClassDesc').textContent = cl ? `${cl.desc} Vida base ${cl.hp}, mana ${cl.mp}${Object.keys(cl.mods).length ? ', bônus ' + Object.entries(cl.mods).map(([a, v]) => `${attrName(a)} ${sgn(v)}`).join(' ') : ''}.` : ''; };
    descCls();
    q('#shInv').oninput = e => { const t = e.target; if (t.dataset.i === undefined) return; const it = d.inv[+t.dataset.i]; if (!it) return; it[t.dataset.f] = t.dataset.f === 'qty' ? +t.value : t.value; };
    q('#shInv').onclick = e => { const b = e.target.closest('[data-del]'); if (b) { d.inv.splice(+b.dataset.del, 1); drawInv(); } };
    const add = q('#shInvAdd'); if (add) add.onclick = () => { d.inv.push({ name: 'Item', qty: 1, note: '' }); drawInv(); };
    m.querySelectorAll('[data-attr]').forEach(i => { i.oninput = () => { i.nextElementSibling.firstChild.textContent = mod(i.value); }; });
    // bolinhas clicáveis dos status
    m.querySelectorAll('[data-pip]').forEach(p => { p.onclick = () => { const inp = m.querySelector(`[data-sv="${p.dataset.pip}"]`); if (!inp) return; inp.value = +inp.value === +p.dataset.n ? +p.dataset.n - 1 : p.dataset.n; inp.dispatchEvent(new Event('input')); }; });
    m.querySelectorAll('[data-sv]').forEach(inp => { inp.oninput = () => { const box = inp.closest('.rpg-st'); box.querySelectorAll('.rpg-pips i').forEach((x, k) => x.classList.toggle('on', +x.dataset.n <= +inp.value)); }; });
    let autoSkills = !ch ? d.skills : null;
    q('#shClass').onchange = () => {
      descCls();
      if (!ch) {
        const cl = c.classes.find(k => k.id === q('#shClass').value); const tmp = { attrs: Object.fromEntries(c.attrs.map(a => [a, 10])) };
        const sk = q('#shSkills'), untouched = !sk.value.trim() || sk.value === autoSkills;
        if (cl) { applyClass(tmp, cl, c); q('#shHp').value = q('#shHpMax').value = tmp.hpMax; q('#shMp').value = q('#shMpMax').value = tmp.mpMax; }
        if (untouched) { sk.value = cl ? cl.skills : ''; autoSkills = sk.value; }
        m.querySelectorAll('[data-attr]').forEach(i => { i.value = tmp.attrs[i.dataset.attr] ?? 10; i.nextElementSibling.firstChild.textContent = mod(i.value); });
      }
    };
    const condBox = q('#shConds'); if (condBox) condBox.onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; const v = b.dataset.v; d.conds = d.conds.includes(v) ? d.conds.filter(x => x !== v) : [...d.conds, v]; b.classList.toggle('on'); };
    if (edit) q('#shImg').onclick = async () => { const f = await H.pickFile(); const up = await upImg(f, 512); if (up) { d.img = up.url; q('#shImg').innerHTML = `<img src="${esc(up.url)}" alt="">`; } };
    const lb = q('#shLant'); if (lb) lb.onclick = () => lanternModal(ch);
    const save = q('#shSave');
    if (save) save.onclick = async () => {
      const stats = {};
      m.querySelectorAll('[data-sv]').forEach(i => { stats[i.dataset.sv] = { v: +i.value }; });
      m.querySelectorAll('[data-sm]').forEach(i => { const s = statDefs().find(x => x.id === i.dataset.sm); stats[i.dataset.sm] = { ...(stats[i.dataset.sm] || {}), max: s && +i.value === s.max ? null : +i.value }; });
      const x = { ...d, id: ch ? ch.id : undefined, ownerId: ch ? ch.ownerId : (ownerId || undefined), custom: true,
        name: q('#shName').value, classId: q('#shClass').value || null, level: +q('#shLvl').value, color: q('#shColor').value,
        hp: +q('#shHp').value, hpMax: +q('#shHpMax').value, mp: +q('#shMp').value, mpMax: +q('#shMpMax').value, def: +q('#shDef').value,
        attrs: Object.fromEntries([...m.querySelectorAll('[data-attr]')].map(i => [i.dataset.attr, +i.value])), stats, skills: q('#shSkills').value, notes: q('#shNotes') ? q('#shNotes').value : d.notes };
      if (master) { x.sight = q('#shSight').value === '' ? null : +q('#shSight').value; x.dark = +q('#shDark').value; } else { delete x.sight; delete x.dark; }
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
function entModal(e, at) {
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
      const pos = at || viewCenter();
      const x = { id: e ? e.id : undefined, kind: q('#enKind').value, name: q('#enName').value, emoji: q('#enEmoji').value, img: d.img, color: q('#enColor').value, hp: +q('#enHp').value, hpMax: +q('#enHpMax').value, def: +q('#enDef').value, atk: +q('#enAtk').value, level: +q('#enLvl').value, init: +q('#enInit').value, size: +q('#enSize').value, hidden: q('#enHid').checked, notes: q('#enNotes').value, conds: d.conds || [] };
      if (!e) { x.x = pos.x; x.y = pos.y; x.mapId = curMap() && curMap().id; }
      if (!x.name.trim()) return toast('Dê um nome.', true);
      const r = await call('rpg:ent:save', { cid: R.st.camp.id, ent: x }, e ? 'Salvo.' : `${x.name} entrou no mapa.`);
      if (r.ok) close();
    };
  });
}
function settingsModal() {
  const c = R.st.camp; let cover = c.cover;
  const classes = JSON.parse(JSON.stringify(c.classes));
  const attrs = c.attrs.map(k => ({ k, n: attrName(k) }));
  const rules = { ...c.rules };
  const RL = [['grid', 'Andar pela grade (encaixa nas casas)'], ['lock', 'Travar movimentação dos jogadores'], ['walls', 'Paredes, obstáculos e portas fechadas bloqueiam os jogadores'], ['doors', 'Jogadores abrem e fecham portas (as permitidas)'], ['editOwn', 'Jogadores editam a própria ficha, vida e status'], ['monsterHp', 'Jogadores veem a vida dos monstros'], ['spect', 'Membros que não jogam podem assistir']];
  H.modal(`<div class="modal-h"><h2>⚙️ Campanha</h2><p>Só você (o Mestre) muda isto. Ser Mestre vale só nesta campanha.</p></div>
    <div class="modal-b rpg-form rpg-set">
      <label class="field">Nome<input id="csName" maxlength="60" value="${esc(c.name)}"></label>
      <label class="field">Descrição<textarea id="csDesc" rows="2" maxlength="1000">${esc(c.desc)}</textarea></label>
      <div class="field">Capa<div class="rpg-cover-pick ${cover ? 'on' : ''}" id="csCover" ${cover ? `style="background-image:url('${esc(cover)}')"` : ''}><span>🖼️ Trocar imagem</span></div></div>
      <div class="rpg-row"><label class="field">Estado<select id="csState">${[['ativa', 'Ativa'], ['pausada', 'Pausada (ninguém move)'], ['encerrada', 'Encerrada']].map(([k, l]) => `<option value="${k}" ${c.state === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="field">Máx. jogadores<input id="csMax" type="number" min="1" max="20" value="${c.maxPlayers}"></label></div>
      <label class="rpg-check"><input type="checkbox" id="csOpen" ${c.open ? 'checked' : ''}> Qualquer membro pode entrar sem convite</label>
      <h4 class="rpg-h">Regras</h4><div class="rpg-rules">${RL.map(([k, l]) => `<label class="rpg-check"><input type="checkbox" data-rule="${k}" ${rules[k] !== false && (rules[k] || k === 'doors') ? 'checked' : ''}> ${l}</label>`).join('')}</div>
      <label class="field">Grade no mapa<select id="csGrid">${[['nenhuma', 'Nenhuma (mapa pintado)'], ['pontos', 'Pontos discretos'], ['quadrados', 'Quadrados']].map(([k, l]) => `<option value="${k}" ${(rules.gridStyle || 'nenhuma') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <h4 class="rpg-h">Atributos <button type="button" class="btn sm ghost" id="csAttrAdd">+ Atributo</button></h4><div class="rpg-attrsed" id="csAttrs"></div>
      <p class="muted small">Sigla curta (usada nas classes, testes e portas) e o nome que aparece na ficha. Status personalizados ficam em Mestre → 📊 Fichas.</p>
      <h4 class="rpg-h">Classes <button type="button" class="btn sm ghost" id="csClsAdd">+ Classe</button></h4><div class="rpg-classes" id="csCls"></div>
      <h4 class="rpg-h">Passar o papel de Mestre</h4>
      <div class="rpg-row"><select class="input" id="csMaster" style="flex:1;width:auto"><option value="">Escolha alguém do ${c.scope === 'g' ? 'grupo' : 'conversa'}</option>${scopeMembers().filter(u => u !== c.masterId).map(u => `<option value="${u}">${esc(H.nameOf(u))}</option>`).join('')}</select><button type="button" class="btn sm" id="csMasterGo">Passar</button></div>
    </div>
    <div class="modal-f"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="csSave">Salvar</button></div>`, (m, close) => {
    const q = s => m.querySelector(s);
    const drawAttrs = () => { q('#csAttrs').innerHTML = attrs.map((a, i) => `<div class="rpg-row"><input value="${esc(a.k)}" data-ai="${i}" data-f="k" maxlength="6" class="rpg-attr-k" aria-label="Sigla"><input value="${esc(a.n)}" data-ai="${i}" data-f="n" maxlength="20" aria-label="Nome"><button type="button" class="icon-btn" data-adel="${i}" aria-label="Tirar atributo">${H.ic('x')}</button></div>`).join(''); };
    drawAttrs();
    q('#csAttrs').oninput = e => { const t = e.target; if (t.dataset.ai === undefined) return; attrs[+t.dataset.ai][t.dataset.f] = t.dataset.f === 'k' ? t.value.toUpperCase() : t.value; };
    q('#csAttrs').onclick = e => { const b = e.target.closest('[data-adel]'); if (b) { attrs.splice(+b.dataset.adel, 1); drawAttrs(); } };
    q('#csAttrAdd').onclick = () => { if (attrs.length >= 10) return toast('No máximo 10 atributos.', true); attrs.push({ k: 'NOV', n: 'Novo' }); drawAttrs(); };
    const drawCls = () => {
      q('#csCls').innerHTML = classes.map((k, i) => `<div class="rpg-cls"><div class="rpg-row"><input value="${esc(k.icon)}" data-i="${i}" data-f="icon" maxlength="8" class="rpg-cls-ic" aria-label="Ícone"><input value="${esc(k.name)}" data-i="${i}" data-f="name" maxlength="32" aria-label="Nome da classe"><label>❤️<input type="number" min="1" max="999" value="${k.hp}" data-i="${i}" data-f="hp" aria-label="Vida base"></label><label>🔷<input type="number" min="0" max="999" value="${k.mp}" data-i="${i}" data-f="mp" aria-label="Mana base"></label><button type="button" class="icon-btn" data-del="${i}" aria-label="Apagar classe">${H.ic('trash')}</button></div>
        <input value="${esc(k.desc)}" data-i="${i}" data-f="desc" maxlength="300" placeholder="Descrição" aria-label="Descrição">
        <div class="rpg-row"><input value="${esc(Object.entries(k.mods).map(([a, v]) => `${a}${sgn(v)}`).join(' '))}" data-i="${i}" data-f="mods" placeholder="Bônus: FOR+2 CON+1" aria-label="Bônus de atributos"><input value="${esc(k.skills.replace(/\n/g, '; '))}" data-i="${i}" data-f="skills" maxlength="800" placeholder="Habilidades (separe com ;)" aria-label="Habilidades"></div></div>`).join('') || '<p class="muted small">Sem classes: os jogadores criam livremente.</p>';
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
      rules.gridStyle = q('#csGrid').value;
      const r = await call('rpg:update', { cid: c.id, name: q('#csName').value, desc: q('#csDesc').value, cover, state: q('#csState').value, maxPlayers: +q('#csMax').value, open: q('#csOpen').checked, rules, attrs: attrs.filter(a => a.k.trim()), classes }, 'Campanha salva.');
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

/* ---------- rolagem na tela ---------- */
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
  sock.on('connect', () => { if (R.el && R.st) { const cid = R.st.camp.id; H.emit('rpg:open', { cid, view: R.st.camp.view || '' }).then(r => { if (!R.el || !R.st || R.st.camp.id !== cid) return; if (r.ok) { R.st = r; R.paintKey = ''; renderAll(); } else { closeRoom(true); toast(r.erro || 'A mesa foi fechada.', true); } }); } });
  const live = fn => d => { if (R.el && R.st) fn(d); };
  sock.on('rpg:state', live(d => {
    const mapChanged = (R.st.map && R.st.map.id) !== (d.map && d.map.id);
    R.st = d; if (mapChanged) { R.paintKey = ''; R.preview = ''; } renderAll(); if (mapChanged) fitZoom();
  }));
  sock.on('rpg:map', live(m => { if (!R.st.map || m.id !== R.st.map.id) return; const sizeChanged = m.w !== R.st.map.w || m.h !== R.st.map.h; R.st.map = m; drawMap(); renderTokens(); renderTools(); renderTop(); if (sizeChanged) fitZoom(); if (R.tab === 'mestre') renderPane(); }));
  // jogadores com névoa: o que dá para ver agora (o servidor nem manda o resto)
  sock.on('rpg:view', live(v => {
    const m = curMap(); if (!m || v.mapId !== m.id) return;
    Object.assign(m, { vis: v.vis, seenMask: v.seenMask, marks: v.marks, traps: v.traps, doors: v.doors });
    R.st.ents = v.ents; R.st.chars = v.chars;
    renderTokens(); drawDoors(); drawMarks(); drawLight(); drawFog(); renderSel(); renderCombat();
  }));
  sock.on('rpg:ent', live(e => {
    const i = R.st.ents.findIndex(x => x.id === e.id);
    if (i >= 0) R.st.ents[i] = e; else R.st.ents.push(e);
    renderTokens(); if (R.sel && R.sel.id === e.id) renderSel(); renderCombat(); if (R.tab === 'mestre') renderPane();
  }));
  sock.on('rpg:ent:del', live(d => { R.st.ents = R.st.ents.filter(x => x.id !== d.id); if (R.sel && R.sel.id === d.id) select(null); renderTokens(); renderCombat(); if (R.tab === 'mestre') renderPane(); }));
  sock.on('rpg:chars', live(list => { R.st.chars = list; renderTokens(); renderCombat(); renderSel(); drawLight(); if (isMaster() && curMap() && curMap().fog) drawFog(); if (R.tab === 'grupo' || R.tab === 'dados' || R.tab === 'mestre') renderPane(); renderTop(); }));
  sock.on('rpg:move', live(mv => { if (!walking.has(mv.id)) applyMove(mv); }));
  // alguém andou por um caminho traçado: a miniatura percorre casa por casa
  sock.on('rpg:walk', live(async d => {
    const m = curMap(); if (!m || d.mapId !== m.id || !d.path.length) return;
    await animWalk(d.k, d.id, d.path);
    const last = d.path[d.path.length - 1];
    applyMove({ k: d.k, id: d.id, x: last[0], y: last[1], dir: d.dir, mapId: d.mapId });
  }));
  sock.on('rpg:face', live(d => { const ch = charOf(d.id); if (!ch) return; ch.dir = d.dir; const el = $r(`.rpg-tok[data-k="c"][data-id="${d.id}"]`); if (el) el.style.setProperty('--dir', d.dir + 'deg'); drawLight(); if (isMaster() && curMap() && curMap().fog) drawFog(); }));
  sock.on('rpg:ping', live(showPing));
  sock.on('rpg:drag', live(d => { if (R.drag && R.drag.id === d.id) return; const el = $r(`.rpg-tok[data-k="${d.k}"][data-id="${d.id}"]`); if (el) { el.classList.add('remote'); el.style.left = d.x * CELL + 'px'; el.style.top = d.y * CELL + 'px'; clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('remote'), 400); } }));
  sock.on('rpg:event', live(e => {
    R.st.events.push(e); if (R.st.events.length > 300) R.st.events.splice(0, R.st.events.length - 300);
    if (R.tab === 'hist' || (R.tab === 'dados' && e.type === 'roll')) renderPane();
    showRoll(e);
  }));
  sock.on('rpg:combat', live(cb => { R.st.camp.combat = cb; renderCombat(); renderTokens(); if (R.tab === 'mestre') renderPane(); }));
  sock.on('rpg:scene', d => { if (R.st && R.st.camp.id === d.cid) toast(d.sid ? `🎭 O Mestre te levou para o evento "${d.name}".` : 'Você voltou para a cena principal.'); });
  sock.on('rpg:closed', d => { if (R.st && R.st.camp.id === d.cid) { closeRoom(true); toast(d.why || 'A mesa foi fechada.', true); } });
  sock.on('rpg:list', d => { if (R.lobbyEl && R.scope && R.scope.kind === d.scope && R.scope.id === d.id) drawLobby(); });
  sock.on('rpg:invited', d => invitedCard(d));
}
function invitedCard(d) {
  H.tone([[523, .1], [659, .1], [784, .18]], 'triangle', .06);
  const el = document.createElement('div'); el.className = 'rpg-inv-card';
  el.innerHTML = `<div class="rpg-inv-ic">🎲</div><div><b>${esc(d.from)} te convidou para jogar RPG</b><span>"${esc(d.name)}" em ${esc(scopeName({ kind: d.scope, id: d.scopeId }))}</span><div class="rpg-row"><button class="btn primary sm" data-v="ok">Ver campanha</button><button class="btn ghost sm" data-v="x">Depois</button></div></div>`;
  document.body.appendChild(el);
  el.onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; el.remove(); if (b.dataset.v === 'ok') lobby({ kind: d.scope, id: d.scopeId }); };
  setTimeout(() => el.remove(), 30000);
}
D.setOnImg(() => { if (R.el) { R.paintKey = ''; drawMap(); } });

document.addEventListener('keydown', e => {
  if (!R.el || e.target.closest('input, textarea, select') || document.querySelector('.modal-back')) return;
  if (e.key === 'Escape') { if (ctxEl) closeCtx(); else if (R.meas || R.trail) { R.meas = null; R.trail = null; drawMeasure([]); } else if (R.sel) select(null); else if (R.tool !== 'mover') setTool('mover'); }
  if (e.key === 'Enter' && R.trail) { trailWalk(); return; }
  const k = e.key.toLowerCase(), sh = { v: 'mover', r: 'regua', c: 'caminho', p: 'ping', b: 'pincel', d: 'porta', l: 'luz', m: 'marcador' }[k];
  if (sh && !e.ctrlKey && !e.metaKey && !e.altKey && (['mover', 'regua', 'caminho', 'ping'].includes(sh) || (isMaster() && curMap()))) setTool(sh);
  // Q/E: vira o personagem selecionado (a lanterna acompanha)
  if ((k === 'q' || k === 'e') && R.sel && R.sel.k === 'c') { const t = charOf(R.sel.id); if (t && (isMaster() || (t.ownerId === me() && canMove('c', t)))) rotate(t, k === 'q' ? -45 : 45); }
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
  back() {
    if (R.el) { if (R.el.classList.contains('side-open')) { R.el.classList.remove('side-open'); return true; } if (R.sel) { select(null); return true; } closeRoom(); return true; }
    if (R.lobbyEl) { closeLobby(); return true; }
    return false;
  },
  _state: () => R, // testes
  _paint: (m, cv) => D.paintMap(m, cv, { cell: CELL, mats: mats() }), _tex: id => D.texCanvas(C.mat(id))
};
})();
