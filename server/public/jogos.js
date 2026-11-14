/* Anarchy — Jogos da call (tela): Desenha e adivinha e Quiz (perguntas ou música).
   Quem decide tudo é o servidor (server/jogos.js): a palavra só chega para quem desenha, as respostas
   só aparecem na hora de revelar e os pontos são contados lá. Aqui só desenha a janelinha do jogo.
   Recebe os ajudantes do app pelo anarchyFun (diversao.js chama anarchyGames.init/attach). */
(() => {
'use strict';
let H = null;
const J = { g: null, word: '', strokes: [], round: 0, min: false, skew: 0, audio: null, clipKey: '', chat: [], answered: null, wasIn: false, color: '#111111', size: 6, tool: 'pen', drawing: null };
const esc = s => H.esc(s);
const me = () => H.S.me && H.S.me.id;
const sNow = () => Date.now() + J.skew;
async function call(ev, data) { const r = await H.emit(ev, data); if (!r.ok) H.toast(r.erro || 'Algo deu errado.', true); return r; }
const COLORS = ['#111111', '#ffffff', '#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#6d4c41', '#ec407a', '#26c6da', '#9e9e9e'];
const SIZES = [3, 6, 12, 24];
// quem começou encerra; se essa pessoa saiu da call, qualquer um pode
const canStop = g => g.phase !== 'fim' && (g.host === me() || !(H.S.voice[g.room] || []).some(p => p.uid === g.host));
// Esc minimiza a janela do jogo (sem atrapalhar quem está digitando ou com uma janela de confirmação aberta)
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || document.querySelector('.modal-back')) return;
  const jg = document.querySelector('.jg-back:not(.min) [data-jg="min"], .jg-back:not(.min) [data-ck="min"]');
  if (jg) { e.preventDefault(); jg.click(); }
});
const KIND = g => g.kind === 'desenho' ? '🎨 Desenha e adivinha' : g.mode === 'musica' ? '🎵 Quiz de música' : '🧠 Quiz';

/* ---------- menu do botão 🎮 ---------- */
function menu(anchor) {
  if (!H.inCall()) return H.toast('Entre numa call para jogar.', true);
  if (J.g && J.g.phase !== 'fim') { J.min = false; render(); return; }
  if (window.anarchyCards && window.anarchyCards.running()) { window.anarchyCards.open(); return; }
  H.pop(`<button data-game="desenho"><span>🎨 Desenha e adivinha</span></button>
    <button data-game="quiz"><span>🧠 Quiz de perguntas</span></button>
    <button data-game="musica"><span>🎵 Quiz de música (adivinhe a música)</span></button>
    <button data-game="malucas"><span>🃏 Cartas Malucas (2 a 10 pessoas)</span></button>
    <button data-game="truco"><span>🂡 Truco paulista (2 ou 4 pessoas)</span></button>
    <hr><button data-fun="roulette"><span>🎡 Roleta da call</span></button>`, anchor, 'menu', 'above');
}
async function start(kind) {
  H.closePops();
  if ((kind === 'malucas' || kind === 'truco') && window.anarchyCards) return window.anarchyCards.start(kind);
  const r = await call('game:start', kind === 'desenho' ? { kind } : { kind: 'quiz', mode: kind === 'musica' ? 'musica' : 'perguntas', rounds: 8 });
  if (r.ok) { J.min = false; J.chat = []; }
}

/* ---------- janela ---------- */
function box() {
  let el = document.querySelector('.jg-back');
  if (!el) {
    el = document.createElement('div'); el.className = 'jg-back'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Jogo da call');
    document.body.appendChild(el);
    el.addEventListener('click', onClick);
    el.addEventListener('submit', onSubmit);
  }
  return el;
}
function close() { document.querySelector('.jg-back')?.remove(); stopClip(); }
function scoresHtml(g) {
  const medal = ['🥇', '🥈', '🥉'];
  return g.scores.map(([u, s], i) => `<div class="jg-sc ${g.guessed.includes(u) ? 'hit' : ''} ${g.drawer === u ? 'drw' : ''}">${H.av(u, 22, false)}<b>${esc(H.nameOf(u))}</b>${g.drawer === u && g.phase === 'jogando' ? '<i title="Desenhando">✏️</i>' : g.guessed.includes(u) ? '<i title="Acertou">✅</i>' : (g.answered || []).includes(u) && g.phase === 'jogando' ? '<i title="Já respondeu">💭</i>' : ''}<em>${s}</em>${g.phase === 'fim' && i < 3 && s > 0 ? `<span>${medal[i]}</span>` : ''}</div>`).join('');
}
function chatHtml() { return J.chat.slice(-40).map(c => `<div class="jg-ln ${c.k}">${c.k === 'info' ? esc(c.text) : c.k === 'hit' ? `✅ <b>${esc(c.name)}</b> acertou! (+${c.pts})` : `<b>${esc(c.name)}:</b> ${esc(c.text)}`}</div>`).join(''); }
function render() {
  const g = J.g;
  if (!g || !H.inCall()) return close();
  const el = box();
  if (J.min) {
    el.className = 'jg-back min';
    el.innerHTML = `<button class="jg-pill" data-jg="max">${KIND(g)} · rodada ${Math.min(g.round, g.total)}/${g.total} <span class="jg-t"></span> ▲</button>`;
    tick(); return;
  }
  el.className = 'jg-back';
  const drawing = g.kind === 'desenho' && g.drawer === me() && g.phase === 'jogando';
  let main = '';
  if (g.phase === 'fim') main = endHtml(g);
  else if (g.kind === 'desenho') main = drawHtml(g, drawing);
  else main = quizHtml(g);
  const canGuess = g.phase === 'jogando' && !g.guessed.includes(me()) && (g.kind === 'desenho' ? !drawing : g.clip);
  const chatOn = g.kind === 'desenho' || g.clip || g.phase === 'fim';
  el.innerHTML = `<div class="jg-box ${g.kind}">
    <div class="jg-head"><b>${KIND(g)}</b><span class="jg-rd">${g.phase === 'fim' ? 'Fim de jogo' : `Rodada ${Math.min(g.round, g.total)} de ${g.total}`}</span><span class="jg-t"></span>
      <span class="jg-hsp"></span>${canStop(g) ? '<button class="jg-ib" data-jg="stop" data-tip="Encerrar o jogo">⏹</button>' : ''}<button class="jg-ib" data-jg="min" data-tip="Minimizar">▁</button>${g.phase === 'fim' ? '<button class="jg-ib" data-jg="close" data-tip="Fechar">✕</button>' : ''}</div>
    <div class="jg-bar"><i></i></div>
    <div class="jg-body"><div class="jg-main">${main}</div>
      <aside class="jg-side"><div class="jg-scores">${scoresHtml(g)}</div>
        ${chatOn ? `<div class="jg-chat">${chatHtml()}</div>` : ''}
        ${canGuess ? `<form class="jg-guess"><input class="input" maxlength="60" autocomplete="off" placeholder="${g.kind === 'desenho' ? 'Seu palpite...' : 'Nome da música...'}" aria-label="Palpite"><button class="btn primary sm">Chutar</button></form>` : g.phase === 'jogando' && g.guessed.includes(me()) ? '<p class="jg-ok">✅ Você acertou! Espere a próxima rodada.</p>' : ''}
      </aside></div></div>`;
  const ch = el.querySelector('.jg-chat'); if (ch) ch.scrollTop = ch.scrollHeight;
  if (g.kind === 'desenho' && g.phase !== 'fim') setupCanvas(el.querySelector('canvas'), drawing);
  const inp = el.querySelector('.jg-guess input'); if (inp && !drawing) setTimeout(() => inp.focus(), 30);
  tick();
}
function drawHtml(g, drawing) {
  const word = drawing ? J.word : g.mask;
  const letters = [...(word || '')].map(c => c === ' ' ? '<i class="sp"></i>' : `<span>${c === '_' ? '' : esc(c)}</span>`).join('');
  return `<div class="jg-word ${drawing ? 'mine' : ''}">${drawing ? '<small>Desenhe:</small>' : g.phase === 'revelando' ? '<small>Era:</small>' : `<small>${esc(H.nameOf(g.drawer))} está desenhando</small>`}<div class="jg-letters">${letters}</div></div>
    <div class="jg-cv"><canvas width="800" height="560" aria-label="Quadro de desenho"></canvas></div>
    ${drawing ? `<div class="jg-tools">${COLORS.map(c => `<button class="jg-col ${J.tool === 'pen' && J.color === c ? 'on' : ''}" data-jg="col" data-c="${c}" style="--c:${c}" aria-label="Cor ${c}"></button>`).join('')}
      <span class="jg-sep"></span>${SIZES.map(s => `<button class="jg-size ${J.size === s ? 'on' : ''}" data-jg="size" data-s="${s}" aria-label="Espessura ${s}"><i style="width:${Math.min(20, s)}px;height:${Math.min(20, s)}px"></i></button>`).join('')}
      <span class="jg-sep"></span><button class="jg-tool ${J.tool === 'eraser' ? 'on' : ''}" data-jg="eraser" data-tip="Borracha">🧽</button><button class="jg-tool" data-jg="clear" data-tip="Limpar tudo">🗑️</button></div>` : ''}`;
}
function quizHtml(g) {
  if (g.phase === 'carregando') return '<div class="jg-load"><span class="jg-spin"></span>Preparando a próxima rodada...</div>';
  const rv = g.reveal;
  if (g.clip) return `<div class="jg-music ${g.phase === 'jogando' ? 'on' : ''}"><div class="jg-disc">🎵</div><b>${g.phase === 'jogando' ? 'Que música é essa?' : 'Era:'}</b>${rv ? `<p class="jg-ans">${esc(rv.text)}</p>` : '<p class="muted">Escreva o nome da música do lado. Quanto mais rápido, mais pontos!</p>'}
    <label class="jg-vol">🔊 <input type="range" min="0" max="1" step="0.05" value="${volume()}" data-jg="vol" aria-label="Volume da música"></label></div>`;
  const mine = J.answered && J.answered.r === g.round ? J.answered.i : null;
  return `<div class="jg-q"><p>${esc(g.q || '')}</p><div class="jg-opts">${(g.opts || []).map((o, i) => {
    const cls = rv ? (i === rv.right ? 'right' : i === mine ? 'wrong' : 'dim') : i === mine ? 'mine' : '';
    return `<button class="jg-opt ${cls}" data-jg="ans" data-i="${i}" ${rv || mine !== null ? 'disabled' : ''}><span>${'ABCD'[i]}</span>${esc(o)}</button>`;
  }).join('')}</div>${rv ? `<p class="jg-ans">${mine === rv.right ? '🎉 Acertou!' : mine === null ? '⏰ Você não respondeu.' : '❌ Não foi dessa vez.'}</p>` : mine !== null ? '<p class="muted">Resposta enviada. Esperando o resto da call...</p>' : ''}</div>`;
}
function endHtml(g) {
  const top = g.scores.filter(([, s]) => s > 0).slice(0, 3);
  if (!top.length) return '<div class="jg-end"><div class="jg-big">🤷</div><b>Ninguém pontuou dessa vez.</b><p class="muted">Bora outra?</p><button class="btn primary" data-jg="again">🎮 Jogar de novo</button></div>';
  const order = [1, 0, 2].filter(i => top[i]);
  return `<div class="jg-end"><div class="jg-pod">${order.map(i => `<div class="jg-p p${i}">${H.av(top[i][0], i ? 44 : 60, false)}<b>${esc(H.nameOf(top[i][0]))}</b><em>${top[i][1]} pts</em>${g.prizes[top[i][0]] ? `<span class="jg-prize">+${g.prizes[top[i][0]]} AP</span>` : ''}<div class="jg-step">${['🥇', '🥈', '🥉'][i]}</div></div>`).join('')}</div>
    <p class="muted small">Os 3 primeiros ganham AnarchyPoints (até 600 por dia).</p><button class="btn primary" data-jg="again">🎮 Jogar de novo</button></div>`;
}

/* ---------- tempo ---------- */
function tick() {
  const g = J.g, el = document.querySelector('.jg-back'); if (!g || !el) return;
  const left = Math.max(0, Math.ceil((g.ends - sNow()) / 1000)), on = g.phase === 'jogando' && g.ends;
  el.querySelectorAll('.jg-t').forEach(t => { t.textContent = on ? `⏱ ${left}s` : ''; t.classList.toggle('low', on && left <= 10); });
  const bar = el.querySelector('.jg-bar i'); if (bar) bar.style.width = on ? `${Math.min(100, (left / (g.dur || 80)) * 100)}%` : '0%';
}
setInterval(() => {
  if (!H) return;
  const inCall = H.inCall();
  if (inCall && !J.wasIn) H.emit('game:get', {}).then(r => { if (r.ok && r.game) onState(r.game); });
  if (!inCall && J.wasIn) { J.g = null; close(); }
  J.wasIn = inCall; tick();
}, 1000);

/* ---------- quadro de desenho ---------- */
function paint(ctx, s, W, Hh) {
  if (!s.pts.length) return;
  ctx.strokeStyle = s.c; ctx.fillStyle = s.c; ctx.lineWidth = s.w * W / 800; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (s.pts.length === 1) { ctx.beginPath(); ctx.arc(s.pts[0][0] * W, s.pts[0][1] * Hh, ctx.lineWidth / 2, 0, 7); ctx.fill(); return; }
  ctx.beginPath(); ctx.moveTo(s.pts[0][0] * W, s.pts[0][1] * Hh);
  for (const p of s.pts.slice(1)) ctx.lineTo(p[0] * W, p[1] * Hh);
  ctx.stroke();
}
function redraw() {
  const cv = document.querySelector('.jg-cv canvas'); if (!cv) return;
  const ctx = cv.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height);
  for (const s of J.strokes) paint(ctx, s, cv.width, cv.height);
}
function setupCanvas(cv, drawing) {
  if (!cv) return; redraw();
  if (!drawing) return;
  cv.classList.add('can');
  let pending = [], last = null, sid = '';
  const pos = e => { const r = cv.getBoundingClientRect(); return [Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))].map(v => Math.round(v * 1000) / 1000); };
  const style = () => ({ c: J.tool === 'eraser' ? '#ffffff' : J.color, w: J.tool === 'eraser' ? Math.max(18, J.size * 2) : J.size });
  const flush = () => { if (pending.length) { const s = { pts: pending, ...style(), id: sid }; H.emit('game:draw', s); pending = last ? [last] : []; } };
  let ft = null;
  cv.onpointerdown = e => {
    e.preventDefault(); cv.setPointerCapture(e.pointerId);
    sid = Math.random().toString(36).slice(2, 10); const p = pos(e); last = p; pending = [p];
    J.drawing = { pts: [p], ...style() }; J.strokes.push(J.drawing); redraw();
    ft = setInterval(flush, 60);
  };
  cv.onpointermove = e => {
    if (!J.drawing) return;
    const p = pos(e); if (last && Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) < 0.003) return;
    const ctx = cv.getContext('2d'); paint(ctx, { pts: [last, p], ...style() }, cv.width, cv.height);
    J.drawing.pts.push(p); pending.push(p); last = p;
    if (pending.length >= 150) flush();
  };
  const up = () => { if (!J.drawing) return; clearInterval(ft); if (pending.length > 1 || J.drawing.pts.length === 1) flush(); pending = []; J.drawing = null; last = null; };
  cv.onpointerup = up; cv.onpointercancel = up; cv.onpointerleave = e => { if (e.buttons === 0) up(); };
}

/* ---------- música do quiz ---------- */
function volume() { try { return +(localStorage.getItem('anarchy.jgVol') || 0.6); } catch { return 0.6; } }
function stopClip() { if (J.audio) { try { J.audio.pause(); } catch {} J.audio.src = ''; J.audio = null; } J.clipKey = ''; }
function playClip(g) {
  const key = g.clip.url;
  if (J.clipKey === key) return;
  stopClip(); J.clipKey = key;
  const a = new Audio(g.clip.url); a.volume = volume(); J.audio = a;
  const elapsed = Math.max(0, (sNow() - (g.ends - (g.clip.dur + 5) * 1000)) / 1000);
  a.addEventListener('loadedmetadata', () => { try { a.currentTime = g.clip.at + Math.min(elapsed, g.clip.dur); } catch {} a.play().catch(() => H.toast('Clique na janela do jogo para liberar o som.', true)); }, { once: true });
  const stopAt = g.clip.at + g.clip.dur;
  a.addEventListener('timeupdate', () => { if (a.currentTime >= stopAt) a.pause(); });
}

/* ---------- eventos ---------- */
function onState(g) {
  const prev = J.g;
  J.skew = (g.serverNow || Date.now()) - Date.now();
  g.dur = g.kind === 'desenho' ? 80 : g.clip ? 20 : 15;
  if (!prev || prev.room !== g.room || prev.round !== g.round || prev.kind !== g.kind || (prev.phase === 'fim' && g.phase !== 'fim')) {
    J.strokes = (g.strokes || []).slice();
    if (!prev || prev.phase === 'fim' || prev.room !== g.room) { J.chat = []; J.min = false; }
  } else if (g.strokes && g.strokes.length > J.strokes.length + (J.drawing ? 1 : 0) + 3) J.strokes = g.strokes.slice();
  if (g.kind === 'desenho' && g.drawer !== me()) J.word = '';
  // sons: rodada nova e fim
  if (prev && g.phase === 'jogando' && (prev.round !== g.round || prev.phase !== 'jogando')) H.tone([[660, .06], [880, .1]], 'triangle', .04);
  if (g.phase === 'fim' && prev && prev.phase !== 'fim') { H.tone([[523, .1], [659, .1], [784, .1], [1047, .35]], 'triangle', .06); if (g.scores[0] && g.scores[0][0] === me() && g.scores[0][1] > 0 && H.confetti) H.confetti(); }
  if (g.clip && g.phase === 'jogando') playClip(g); else if (g.phase !== 'revelando') stopClip();
  if (g.phase === 'revelando' && g.clip) setTimeout(() => { if (J.g && J.g.phase !== 'jogando') stopClip(); }, 4000);
  J.g = g;
  // durante o desenho, só redesenha o quadro inteiro se não for quem está desenhando no meio de um traço
  const el = document.querySelector('.jg-back');
  if (el && !J.min && prev && prev.round === g.round && prev.phase === g.phase && g.kind === 'desenho' && g.phase === 'jogando') {
    el.querySelector('.jg-scores').innerHTML = scoresHtml(g);
    const w = el.querySelector('.jg-word .jg-letters');
    if (w && g.drawer !== me()) w.innerHTML = [...g.mask].map(c => c === ' ' ? '<i class="sp"></i>' : `<span>${c === '_' ? '' : esc(c)}</span>`).join('');
    if (g.guessed.includes(me()) && el.querySelector('.jg-guess')) render();
    return;
  }
  render();
}
function onClick(e) {
  const b = e.target.closest('[data-jg]'); if (!b) return;
  const a = b.dataset.jg;
  if (a === 'min') { J.min = true; render(); }
  if (a === 'max') { J.min = false; render(); }
  if (a === 'close') { J.g = null; close(); }
  if (a === 'stop') H.confirmBox('Encerrar o jogo', 'O placar fica como está e os prêmios são entregues agora.', 'Encerrar', false).then(y => y && call('game:stop', {}));
  if (a === 'again') { const g = J.g; start(g.kind === 'desenho' ? 'desenho' : g.mode === 'musica' ? 'musica' : 'quiz'); }
  if (a === 'ans') { const i = +b.dataset.i; J.answered = { r: J.g.round, i }; call('game:answer', { i }).then(r => { if (!r.ok) J.answered = null; render(); }); render(); }
  if (a === 'col') { J.color = b.dataset.c; J.tool = 'pen'; render(); }
  if (a === 'size') { J.size = +b.dataset.s; render(); }
  if (a === 'eraser') { J.tool = J.tool === 'eraser' ? 'pen' : 'eraser'; render(); }
  if (a === 'clear') { J.strokes = []; redraw(); H.emit('game:draw', { clear: true }); }
}
document.addEventListener('input', e => { if (e.target.matches && e.target.matches('[data-jg="vol"]')) { const v = +e.target.value; try { localStorage.setItem('anarchy.jgVol', v); } catch {} if (J.audio) J.audio.volume = v; } });
async function onSubmit(e) {
  e.preventDefault();
  const inp = e.target.querySelector('input'); const text = inp.value.trim(); if (!text) return;
  inp.value = '';
  const r = await H.emit('game:guess', { text });
  if (!r.ok) return H.toast(r.erro || 'Não deu.', true);
  if (r.hit) { H.tone([[784, .08], [1047, .2]], 'triangle', .06); }
  else if (r.close) { J.chat.push({ k: 'close', name: 'Quase!', text: `"${text}" está bem perto!` }); const ch = document.querySelector('.jg-chat'); if (ch) { ch.innerHTML = chatHtml(); ch.scrollTop = ch.scrollHeight; } }
}
function pushChat(c) {
  J.chat.push(c); if (J.chat.length > 80) J.chat.splice(0, 20);
  const ch = document.querySelector('.jg-chat'); if (ch) { ch.innerHTML = chatHtml(); ch.scrollTop = ch.scrollHeight; }
}
function attach(sock) {
  sock.on('game:state', onState);
  sock.on('game:word', d => { J.word = d.word; if (J.g && J.g.kind === 'desenho') render(); });
  sock.on('game:stroke', s => {
    if (s.clear) { J.strokes = []; return redraw(); }
    J.strokes.push(s);
    const cv = document.querySelector('.jg-cv canvas'); if (cv) paint(cv.getContext('2d'), s, cv.width, cv.height);
  });
  sock.on('game:chat', c => pushChat({ k: 'msg', ...c }));
  sock.on('game:hit', h => { pushChat({ k: 'hit', ...h }); if (h.uid !== me()) H.tone([[988, .06]], 'sine', .03); });
  sock.on('game:info', d => { pushChat({ k: 'info', text: d.text }); if (J.min || !document.querySelector('.jg-back')) H.toast('🎮 ' + d.text, false, 5000); });
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-game]'); if (b && H) { e.stopPropagation(); start(b.dataset.game); return; }
  const m = e.target.closest('[data-act="games"]'); if (m && H) { e.stopPropagation(); menu(m); }
}, true);

window.anarchyGames = { init(h) { H = h; }, attach, open: menu };
})();
