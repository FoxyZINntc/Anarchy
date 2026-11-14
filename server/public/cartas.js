/* Anarchy — Jogos de cartas da call (tela): Cartas Malucas e Truco paulista.
   O servidor (server/cartas.js) embaralha, confere cada jogada e manda para cada pessoa só a própria mão.
   Abre pelo 🎮 da call (menu do jogos.js). Usa as classes de janela do jogos.css (jg-*) e as próprias (ck-*). */
(() => {
'use strict';
let H = null;
const K = { g: null, min: false, skew: 0, pick: null, wasIn: false };
const esc = s => H.esc(s);
const me = () => H.S.me && H.S.me.id;
const sNow = () => Date.now() + K.skew;
async function call(ev, data) { const r = await H.emit(ev, data); if (!r.ok) H.toast(r.erro || 'Algo deu errado.', true); return r; }
const CO = { vermelho: '#e53935', amarelo: '#f9b800', verde: '#2e9e4f', azul: '#1e6fd9' };
const SUIT = { ouros: ['♦', 'red'], espadas: ['♠', 'blk'], copas: ['♥', 'red'], paus: ['♣', 'blk'] };
const RAISE = { 1: 'TRUCO', 3: 'SEIS', 6: 'NOVE', 9: 'DOZE' };

async function start(kind) {
  H.closePops();
  const r = await call('cards:start', { kind });
  if (r.ok) K.min = false;
}

/* ---------- cartas ---------- */
function mCard(c, opts = {}) {
  if (!c) return '<div class="ck-card back"></div>';
  const wild = c.c === 'coringa', label = c.v === 'pular' ? '⛔' : c.v === 'inverter' ? '🔄' : c.v === 'cor' ? '🌈' : esc(c.v);
  const ring = wild && c.pick ? `style="--ring:${CO[c.pick]}"` : '';
  return `<button class="ck-card m ${wild ? 'wild' : 'c-' + c.c} ${opts.ok ? 'ok' : ''} ${opts.dim ? 'dim' : ''} ${wild && c.pick ? 'picked' : ''}" ${ring} ${opts.act ? `data-ck="play" data-id="${c.id}"` : 'tabindex="-1"'} aria-label="${wild ? 'coringa ' + c.v : c.c + ' ' + c.v}"><span class="ck-tl">${label}</span><b>${label}</b><span class="ck-br">${label}</span></button>`;
}
function tCard(c, opts = {}) {
  if (!c) return '<div class="ck-card back t"></div>';
  const [sym, col] = SUIT[c.s];
  return `<button class="ck-card t ${col} ${opts.man ? 'man' : ''} ${opts.ok ? 'ok' : ''}" ${opts.act ? `data-ck="play" data-id="${c.id}"` : 'tabindex="-1"'} aria-label="${c.r} de ${c.s}"><span class="ck-tl">${c.r}<br>${sym}</span><b>${sym}</b><span class="ck-br">${c.r}<br>${sym}</span>${opts.man ? '<i class="ck-man">manilha</i>' : ''}</button>`;
}

/* ---------- janela ---------- */
function box() {
  let el = document.querySelector('.ck-back');
  if (!el) {
    el = document.createElement('div'); el.className = 'jg-back ck-back'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Jogo de cartas');
    document.body.appendChild(el); el.addEventListener('click', onClick);
  }
  return el;
}
const close = () => document.querySelector('.ck-back')?.remove();
const TITLE = g => (g.kind === 'truco' ? '🂡 Truco' : '🃏 Cartas Malucas');
function render() {
  const g = K.g; if (!g || !H.inCall()) return close();
  const el = box();
  if (K.min) { el.className = 'jg-back ck-back min'; el.innerHTML = `<button class="jg-pill" data-ck="max">${TITLE(g)} ${g.phase === 'jogando' ? (g.turn === me() ? '· <b>sua vez!</b>' : `· vez de ${esc(H.nameOf(g.turn))}`) : ''} <span class="jg-t"></span> ▲</button>`; tick(); return; }
  el.className = 'jg-back ck-back';
  const body = g.phase === 'fim' ? endHtml(g) : g.kind === 'truco' ? trucoHtml(g) : malucasHtml(g);
  el.innerHTML = `<div class="jg-box ck-box ${g.kind}">
    <div class="jg-head"><b>${TITLE(g)}</b><span class="jg-rd">${g.phase === 'fim' ? 'Fim de jogo' : g.me ? (g.turn === me() ? '👉 Sua vez!' : `Vez de ${esc(H.nameOf(g.turn))}`) : '👀 Assistindo'}</span><span class="jg-t"></span><span class="jg-hsp"></span>
      ${g.host === me() && g.phase !== 'fim' ? '<button class="jg-ib" data-ck="stop" data-tip="Encerrar o jogo">⏹</button>' : ''}<button class="jg-ib" data-ck="min" data-tip="Minimizar">▁</button>${g.phase === 'fim' ? '<button class="jg-ib" data-ck="close" data-tip="Fechar">✕</button>' : ''}</div>
    <div class="jg-bar"><i></i></div>
    <div class="ck-body">${body}<div class="ck-log">${(g.log || []).map(t => `<div>${esc(t)}</div>`).join('')}</div></div></div>`;
  tick();
}
function seat(g, p, extra = '') {
  return `<div class="ck-seat ${g.turn === p.uid && g.phase === 'jogando' ? 'turn' : ''}">${H.av(p.uid, 34, false)}<b>${esc(H.nameOf(p.uid))}${p.uid === me() ? ' (você)' : ''}</b><span class="ck-backs">${Array.from({ length: Math.min(p.n, 12) }, () => '<i></i>').join('')}<em>${p.n}</em></span>${extra}</div>`;
}
function malucasHtml(g) {
  const mine = g.me || [], myTurn = g.turn === me();
  const can = c => myTurn && (!g.drawn || g.drawn === c.id) && (c.c === 'coringa' || c.c === g.color || c.v === g.top.v);
  const seats = g.players.filter(p => p.uid !== me()).map(p => seat(g, p, `${g.last.includes(p.uid) ? '<span class="ck-tag last">ÚLTIMA!</span>' : ''}${g.catchable.includes(p.uid) && g.me ? `<button class="btn sm danger ck-catch" data-ck="catch" data-uid="${p.uid}">🫵 Pegou! Não avisou</button>` : ''}`)).join('');
  return `<div class="ck-seats">${seats}</div>
    <div class="ck-center">
      <button class="ck-deck" data-ck="draw" ${myTurn && !g.drawn ? '' : 'disabled'} aria-label="Comprar carta"><div class="ck-card back"></div><span>${myTurn && !g.drawn ? 'Comprar' : g.deck + ' no monte'}</span></button>
      <div class="ck-pile">${mCard(g.top)}</div>
      <div class="ck-now"><span class="ck-col" style="background:${CO[g.color] || '#888'}"></span><b>${esc(g.color)}</b><span class="ck-dir" title="Sentido do jogo">${g.dir === 1 ? '↻' : '↺'}</span></div>
    </div>
    ${g.me ? `<div class="ck-actions">${myTurn && g.drawn ? '<button class="btn sm" data-ck="pass">Passar a vez</button>' : ''}${mine.length <= 2 && !g.last.includes(me()) ? '<button class="btn sm primary ck-shout" data-ck="last">📣 Última carta!</button>' : ''}${myTurn ? '<span class="ck-hint">Clique numa carta que combine (cor ou número)</span>' : ''}</div>
    <div class="ck-hand">${mine.map(c => mCard(c, { act: true, ok: can(c), dim: myTurn && !can(c) })).join('')}</div>` : ''}
    ${K.pick ? `<div class="ck-pick"><b>Escolha a cor</b><div>${Object.entries(CO).map(([k, v]) => `<button data-ck="color" data-c="${k}" style="background:${v}" aria-label="${k}">${k}</button>`).join('')}</div><button class="btn sm ghost" data-ck="nopick">Cancelar</button></div>` : ''}`;
}
function trucoHtml(g) {
  const mine = g.me || [], myTurn = g.turn === me(), myTeam = g.teams[0].includes(me()) ? 0 : g.teams[1].includes(me()) ? 1 : -1;
  const teamName = t => `Dupla ${t === 0 ? 'A' : 'B'}${g.teams[t].length === 1 ? ` (${esc(H.nameOf(g.teams[t][0]))})` : ''}`;
  const pips = g.tricks.map(t => `<i class="${t === 'empate' ? 'tie' : t === myTeam ? 'win' : 'lose'}">${t === 'empate' ? '=' : t === 0 ? 'A' : 'B'}</i>`).join('');
  const others = g.players.filter(p => p.uid !== me()).map(p => seat(g, p, `<span class="ck-tag t${g.teams[0].includes(p.uid) ? 0 : 1}">${g.teams[0].includes(p.uid) ? 'A' : 'B'}</span>`)).join('');
  const ask = g.ask, askMe = ask && ask.to === myTeam;
  return `<div class="ck-score"><div class="t0 ${myTeam === 0 ? 'mine' : ''}"><span>${teamName(0)}</span><b>${g.score[0]}</b></div><div class="ck-val"><small>a mão vale</small><b>${g.value}</b><div class="ck-pips">${pips}</div></div><div class="t1 ${myTeam === 1 ? 'mine' : ''}"><span>${teamName(1)}</span><b>${g.score[1]}</b></div></div>
    <div class="ck-seats">${others}</div>
    <div class="ck-center truco"><div class="ck-vira"><small>Vira</small>${tCard(g.vira)}<span>Manilha: <b>${esc(g.manilha)}</b></span></div>
      <div class="ck-table">${g.table.map(t => `<div class="ck-played">${tCard(t.c, { man: t.c.r === g.manilha })}<span>${esc(H.nameOf(t.uid))}</span></div>`).join('') || `<p class="muted">${g.phase === 'entremao' ? 'Embaralhando a próxima mão...' : 'Mesa vazia'}</p>`}</div></div>
    ${ask ? `<div class="ck-ask ${askMe ? 'me' : ''}"><b>🔥 ${esc(H.nameOf(ask.by))} pediu ${{ 3: 'TRUCO', 6: 'SEIS', 9: 'NOVE', 12: 'DOZE' }[ask.v]}! (vale ${ask.v})</b>${askMe ? `<div><button class="btn sm primary" data-ck="t-aceitar">✅ Aceitar</button><button class="btn sm danger" data-ck="t-correr">🏃 Correr</button>${ask.v < 12 ? `<button class="btn sm" data-ck="t-aumentar">🔥 Pedir ${ask.v === 3 ? 'SEIS' : ask.v === 6 ? 'NOVE' : 'DOZE'}</button>` : ''}</div>` : '<span class="muted">Esperando a outra dupla responder...</span>'}</div>` : ''}
    ${g.me ? `<div class="ck-actions">${myTurn && !ask && g.phase === 'jogando' && RAISE[g.value] && Math.max(...g.score) < 11 ? `<button class="btn sm danger ck-shout" data-ck="truco">🔥 ${RAISE[g.value]}!</button>` : ''}${myTurn && !ask ? '<span class="ck-hint">Sua vez: jogue uma carta</span>' : ''}</div>
    <div class="ck-hand">${mine.map(c => tCard(c, { act: myTurn && !ask, ok: myTurn && !ask, man: c.r === g.manilha })).join('')}</div>` : ''}`;
}
function endHtml(g) {
  const w = g.winner || [];
  return `<div class="jg-end">${w.length ? `<div class="jg-big">🏆</div><b>${w.map(u => esc(H.nameOf(u))).join(' e ')} ${w.length > 1 ? 'venceram' : 'venceu'}!</b>` : '<div class="jg-big">🃏</div><b>Jogo encerrado.</b>'}
    ${g.prizes && Object.keys(g.prizes).length ? `<p>${Object.entries(g.prizes).map(([u, n]) => `${esc(H.nameOf(u))} <span class="jg-prize">+${n} AP</span>`).join(' · ')}</p>` : ''}
    ${g.kind === 'truco' && g.score ? `<p class="muted">Placar final: ${g.score[0]} x ${g.score[1]}</p>` : ''}
    <button class="btn primary" data-ck="again">🃏 Jogar de novo</button></div>`;
}
function tick() {
  const g = K.g, el = document.querySelector('.ck-back'); if (!g || !el) return;
  const left = Math.max(0, Math.ceil((g.ends - sNow()) / 1000)), on = g.phase === 'jogando' && g.ends;
  el.querySelectorAll('.jg-t').forEach(t => { t.textContent = on ? `⏱ ${left}s` : ''; t.classList.toggle('low', on && left <= 8 && g.turn === me()); });
  const bar = el.querySelector('.jg-bar i'); if (bar) bar.style.width = on ? `${Math.min(100, left / (g.kind === 'truco' ? 40 : 30) * 100)}%` : '0%';
}
setInterval(() => {
  if (!H) return;
  const inCall = H.inCall();
  if (inCall && !K.wasIn) H.emit('cards:get', {}).then(r => { if (r.ok && r.game) onState(r.game); });
  if (!inCall && K.wasIn) { K.g = null; close(); }
  K.wasIn = inCall; tick();
}, 1000);

function onState(g) {
  const prev = K.g;
  K.skew = (g.serverNow || Date.now()) - Date.now();
  if (prev && prev.phase !== 'fim' && g.phase === 'fim') { H.tone([[523, .1], [659, .1], [784, .1], [1047, .35]], 'triangle', .06); if ((g.winner || []).includes(me()) && H.confetti) H.confetti(); }
  else if (g.phase === 'jogando' && g.turn === me() && (!prev || prev.turn !== me())) H.tone([[660, .06], [990, .12]], 'triangle', .05);
  else if (prev && (g.kind === 'truco' ? g.table.length !== prev.table.length : prev.top && g.top && prev.top.id !== g.top.id)) H.tone([[300 + Math.random() * 120, .03]], 'square', .02);
  if (!prev || prev.phase === 'fim') K.min = false;
  K.g = g; if (g.turn !== me()) K.pick = null;
  render();
}
async function onClick(e) {
  const b = e.target.closest('[data-ck]'); if (!b) return;
  const a = b.dataset.ck, g = K.g; if (!g) return;
  if (a === 'min') { K.min = true; render(); }
  if (a === 'max') { K.min = false; render(); }
  if (a === 'close') { K.g = null; close(); }
  if (a === 'stop') H.confirmBox('Encerrar o jogo', 'O jogo acaba agora, sem prêmios.', 'Encerrar', false).then(y => y && call('cards:stop', {}));
  if (a === 'again') start(g.kind);
  if (a === 'draw') call('cards:draw', {});
  if (a === 'pass') call('cards:pass', {});
  if (a === 'last') call('cards:last', {});
  if (a === 'catch') call('cards:catch', { uid: b.dataset.uid });
  if (a === 'truco') call('cards:truco', {});
  if (a.startsWith('t-')) call('cards:truco', { answer: a.slice(2) });
  if (a === 'nopick') { K.pick = null; render(); }
  if (a === 'color' && K.pick) { const id = K.pick; K.pick = null; render(); call('cards:play', { id, color: b.dataset.c }); }
  if (a === 'play') {
    const c = (g.me || []).find(x => x.id === b.dataset.id); if (!c) return;
    if (g.kind === 'malucas' && c.c === 'coringa') { K.pick = c.id; render(); return; }
    call('cards:play', { id: c.id });
  }
}
function attach(sock) {
  sock.on('cards:state', onState);
  sock.on('cards:info', d => { if (K.min || !document.querySelector('.ck-back')) H.toast('🃏 ' + d.text, false, 4000); });
}
window.anarchyCards = { init(h) { H = h; }, attach, start, running: () => !!(K.g && K.g.phase !== 'fim'), open: () => { K.min = false; render(); } };
})();
