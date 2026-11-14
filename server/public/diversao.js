/* Anarchy — Diversão (tela): enquetes, mensagem-bomba, conquistas, caixa diária, atividade, eventos do grupo,
   roleta da call e retrospectiva do mês. Quem decide tudo é o servidor (server/diversao.js); aqui só desenha.
   O app.js entrega o que este arquivo usa em anarchyFun.init(). Os cliques usam data-fun="..." (um ouvinte só). */
(() => {
'use strict';
let H = null;
const F = { defs: [], live: new Map(), exploded: new Set() }; // live: bombas abertas agora (id -> { text, until })
const esc = s => H.esc(s);
const me = () => H.S.me && H.S.me.id;
async function call(ev, data, okMsg) { const r = await H.emit(ev, data); if (!r.ok) H.toast(r.erro || 'Algo deu errado.', true); else if (okMsg) H.toast(okMsg); return r; }
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
const until = ts => { const s = Math.max(0, Math.round((ts - Date.now()) / 1000)); if (s < 60) return 'agora'; const m = Math.round(s / 60); if (m < 60) return `em ${m} min`; const h = Math.round(m / 60); if (h < 24) return `em ${h} h`; const d = Math.round(h / 24); return `em ${plural(d, 'dia', 'dias')}`; };
const whenTxt = ts => new Date(ts).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

/* =============== enquetes =============== */
function pollHtml(m) {
  const p = m.poll, total = p.opts.reduce((a, o) => a + o.v.length, 0), people = new Set(p.opts.flatMap(o => o.v)).size;
  const closed = p.closed || (p.ends && p.ends <= Date.now());
  const max = Math.max(...p.opts.map(o => o.v.length));
  const g = H.S.view.kind === 'group' ? H.S.groups[H.S.view.gid] : null;
  const canClose = !closed && (m.authorId === me() || (g && H.gCan(g, 'manageMessages')));
  return `<div class="fun-poll ${closed ? 'closed' : ''}"><div class="fp-q">📊 ${esc(p.q)}</div>
    ${p.opts.map((o, i) => { const pc = total ? Math.round(o.v.length / total * 100) : 0, mine = o.v.includes(me()); return `<button class="fp-opt ${mine ? 'mine' : ''} ${closed && o.v.length === max && max > 0 ? 'win' : ''}" data-fun="vote" data-cid="${m.cid}" data-id="${m.id}" data-i="${i}" ${closed ? 'disabled' : ''} title="${esc(o.v.map(H.nameOf).join(', ') || 'Ninguém ainda')}"><i style="width:${pc}%"></i><span>${mine ? '✓ ' : ''}${esc(o.t)}</span><b>${o.v.length} · ${pc}%</b></button>`; }).join('')}
    <div class="fp-f"><span>${plural(people, 'pessoa votou', 'pessoas votaram')} · ${p.multi ? 'várias escolhas' : 'uma escolha'} · ${closed ? 'encerrada' : p.ends ? 'termina ' + until(p.ends) : 'sem prazo'}</span>${canClose ? `<button class="link" data-fun="pclose" data-cid="${m.cid}" data-id="${m.id}">Encerrar</button>` : ''}</div></div>`;
}
function pollModal(cid) {
  H.modal(`<div class="modal-h"><h2>📊 Nova enquete</h2><p>Todo mundo do chat vota com um clique. O resultado aparece na hora.</p></div>
    <div class="modal-b fun-form">
      <label class="field">Pergunta<input class="input" id="fpQ" maxlength="200" placeholder="Pizza ou hambúrguer hoje?"></label>
      <div class="field">Opções<div id="fpOpts"></div><button type="button" class="btn sm ghost" id="fpAdd">+ Opção</button></div>
      <div class="fun-row"><label class="fun-check"><input type="checkbox" id="fpMulti"> Pode escolher mais de uma</label>
        <label class="field">Fecha em<select class="input" id="fpMins"><option value="0">Sem prazo</option><option value="5">5 minutos</option><option value="30">30 minutos</option><option value="60">1 hora</option><option value="1440">1 dia</option><option value="10080">1 semana</option></select></label></div>
    </div>
    <div class="modal-f"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="fpGo">Criar enquete</button></div>`, (md, close) => {
    const box = md.querySelector('#fpOpts'), opts = ['', ''];
    const draw = () => { box.innerHTML = opts.map((o, i) => `<div class="fun-optrow"><input class="input" data-i="${i}" maxlength="80" value="${esc(o)}" placeholder="Opção ${i + 1}">${opts.length > 2 ? `<button type="button" class="icon-btn" data-del="${i}" aria-label="Tirar opção">✕</button>` : ''}</div>`).join(''); md.querySelector('#fpAdd').hidden = opts.length >= 10; };
    draw();
    box.oninput = e => { const i = e.target.dataset.i; if (i !== undefined) opts[+i] = e.target.value; };
    box.onclick = e => { const d = e.target.closest('[data-del]'); if (d) { opts.splice(+d.dataset.del, 1); draw(); } };
    md.querySelector('#fpAdd').onclick = () => { opts.push(''); draw(); box.querySelector(`[data-i="${opts.length - 1}"]`).focus(); };
    md.querySelector('#fpGo').onclick = async () => {
      const r = await call('poll:create', { cid, q: md.querySelector('#fpQ').value, opts, multi: md.querySelector('#fpMulti').checked, mins: +md.querySelector('#fpMins').value });
      if (r.ok) close();
    };
    setTimeout(() => md.querySelector('#fpQ').focus(), 50);
  });
}

/* =============== mensagem-bomba =============== */
function bombHtml(m) {
  const b = m.bomb, opened = b.opened || [], live = F.live.get(m.id);
  if (m.authorId === me()) return `<div class="fun-bomb own">💣 <b>Mensagem-bomba</b><span>some ${b.secs}s depois de aberta · ${opened.length ? `aberta por ${esc(opened.map(H.nameOf).join(', '))}` : 'ninguém abriu ainda'}</span></div>`;
  if (live) { const left = Math.max(0, Math.ceil((live.until - Date.now()) / 1000)); return `<div class="fun-bomb live" data-bomb="${m.id}"><span class="fb-t">${H.md(live.text)}</span><i class="fb-c" style="--p:${left / live.secs}">${left}</i></div>`; }
  if (F.exploded.has(m.id) || opened.includes(me())) return '<div class="fun-bomb boom">💥 <span>Esta mensagem explodiu.</span></div>';
  return `<button class="fun-bomb closed" data-fun="bomb" data-cid="${m.cid}" data-id="${m.id}">💣 <b>Mensagem-bomba</b><span>Clique para abrir · explode em ${b.secs}s</span></button>`;
}
function bombModal(cid) {
  H.modal(`<div class="modal-h"><h2>💣 Mensagem-bomba</h2><p>Quem abrir lê por alguns segundos e ela explode. Quando todo mundo abrir (ou depois de 24 h), some do chat.</p></div>
    <div class="modal-b fun-form"><label class="field">Mensagem<textarea class="input" id="fbT" rows="3" maxlength="1000" placeholder="Um segredo, uma fofoca, uma resposta de prova..."></textarea></label>
      <label class="field">Explode depois de <b id="fbSv">10 s</b><input type="range" id="fbS" min="3" max="60" value="10"></label></div>
    <div class="modal-f"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="fbGo">💣 Mandar</button></div>`, (md, close) => {
    const s = md.querySelector('#fbS'); s.oninput = () => { md.querySelector('#fbSv').textContent = s.value + ' s'; };
    md.querySelector('#fbGo').onclick = async () => { const r = await call('bomb:send', { cid, text: md.querySelector('#fbT').value, secs: +s.value }); if (r.ok) close(); };
    setTimeout(() => md.querySelector('#fbT').focus(), 50);
  });
}
async function openBomb(cid, id) {
  const r = await call('bomb:open', { cid, id }); if (!r.ok) return;
  F.live.set(id, { text: r.text, secs: r.secs, until: Date.now() + r.secs * 1000 });
  H.tone([[880, .05], [660, .05]], 'square', .04);
  H.renderMessages();
}
// contagem das bombas abertas; quando acaba, explode (animação e some)
setInterval(() => {
  if (!F.live.size) return;
  for (const [id, b] of F.live) {
    const el = document.querySelector(`[data-bomb="${id}"]`), left = Math.max(0, Math.ceil((b.until - Date.now()) / 1000));
    if (el) { const c = el.querySelector('.fb-c'); if (c) { c.textContent = left; c.style.setProperty('--p', left / b.secs); } }
    if (Date.now() >= b.until) {
      F.live.delete(id); F.exploded.add(id);
      if (el) { el.classList.add('exploding'); H.tone([[110, .08], [70, .25]], 'sawtooth', .07); setTimeout(() => H.renderMessages(), 650); } else H.renderMessages();
    }
  }
}, 250);

/* =============== apostas =============== */
function betHtml(m) {
  const b = m.bet, pot = b.opts.reduce((a, o) => a + Object.values(o.s).reduce((x, y) => x + y, 0), 0);
  const mine = b.opts.findIndex(o => o.s[me()]), myAmt = mine >= 0 ? b.opts[mine].s[me()] : 0;
  const g = H.S.view.kind === 'group' ? H.S.groups[H.S.view.gid] : null;
  const judge = m.authorId === me() || (g && H.gCan(g, 'manageMessages'));
  const st = { aberta: '🟢 Apostas abertas', fechada: '🔒 Apostas fechadas: esperando o resultado', paga: '🏆 Resultado saiu', cancelada: '↩️ Cancelada: pontos devolvidos' }[b.st];
  return `<div class="fun-bet st-${b.st}"><div class="fb-h"><b>🎲 ${esc(b.q)}</b><span>${st}</span></div>
    ${b.opts.map((o, i) => { const n = Object.values(o.s).reduce((x, y) => x + y, 0), who = Object.keys(o.s), odds = n ? (pot / n) : 0; return `<div class="fb-opt ${b.win === i ? 'win' : ''} ${mine === i ? 'mine' : ''}"><div><b>${b.win === i ? '🏆 ' : ''}${esc(o.t)}</b><span>${n.toLocaleString('pt-BR')} pontos${who.length ? ` · ${esc(who.map(H.nameOf).join(', '))}` : ''}${odds && b.st === 'aberta' ? ` · paga ${odds.toFixed(1)}×` : ''}</span></div>
      ${b.st === 'aberta' && (mine < 0 || mine === i) ? `<button class="btn sm" data-fun="betIn" data-cid="${m.cid}" data-id="${m.id}" data-i="${i}">${mine === i ? '+ Apostar mais' : 'Apostar'}</button>` : ''}${judge && b.st === 'fechada' ? `<button class="btn sm primary" data-fun="betWin" data-cid="${m.cid}" data-id="${m.id}" data-i="${i}">Venceu</button>` : ''}</div>`; }).join('')}
    <div class="fp-f"><span>🪙 Pote: <b>${pot.toLocaleString('pt-BR')}</b> pontos${myAmt ? ` · você apostou ${myAmt.toLocaleString('pt-BR')}` : ''}${b.st === 'paga' && b.paid && b.paid[me()] ? ` · você ganhou <b class="fb-won">+${b.paid[me()].toLocaleString('pt-BR')}</b>` : ''}</span>
      ${judge && b.st === 'aberta' ? `<button class="link" data-fun="betLock" data-cid="${m.cid}" data-id="${m.id}">Fechar apostas</button>` : ''}${judge && (b.st === 'aberta' || b.st === 'fechada') ? `<button class="link" data-fun="betCancel" data-cid="${m.cid}" data-id="${m.id}">Cancelar</button>` : ''}</div></div>`;
}
function betModal(cid) {
  H.modal(`<div class="modal-h"><h2>🎲 Nova aposta</h2><p>Cada um aposta AnarchyPoints numa opção. Você decide quem ganhou e o pote é dividido entre quem acertou.</p></div>
    <div class="modal-b fun-form"><label class="field">Sobre o quê?<input class="input" id="fbQ" maxlength="160" placeholder="Quem ganha a próxima partida?"></label>
      <div class="field">Opções<div id="fbOpts"></div><button type="button" class="btn sm ghost" id="fbAdd">+ Opção</button></div></div>
    <div class="modal-f"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="fbGo">Abrir apostas</button></div>`, (md, close) => {
    const box = md.querySelector('#fbOpts'), opts = ['', ''];
    const draw = () => { box.innerHTML = opts.map((o, i) => `<div class="fun-optrow"><input class="input" data-i="${i}" maxlength="60" value="${esc(o)}" placeholder="Opção ${i + 1}">${opts.length > 2 ? `<button type="button" class="icon-btn" data-del="${i}" aria-label="Tirar opção">✕</button>` : ''}</div>`).join(''); md.querySelector('#fbAdd').hidden = opts.length >= 6; };
    draw();
    box.oninput = e => { const i = e.target.dataset.i; if (i !== undefined) opts[+i] = e.target.value; };
    box.onclick = e => { const d = e.target.closest('[data-del]'); if (d) { opts.splice(+d.dataset.del, 1); draw(); } };
    md.querySelector('#fbAdd').onclick = () => { opts.push(''); draw(); };
    md.querySelector('#fbGo').onclick = async () => { const r = await call('bet:create', { cid, q: md.querySelector('#fbQ').value, opts }); if (r.ok) close(); };
    setTimeout(() => md.querySelector('#fbQ').focus(), 50);
  });
}
function betJoinModal(cid, id, i) {
  const pts = H.S.me.points || 0; let amt = Math.min(100, pts);
  H.modal(`<div class="modal-h"><h2>🎲 Quanto você aposta?</h2><p>Você tem <b>${pts.toLocaleString('pt-BR')}</b> AnarchyPoints. Se perder, perde o que apostou.</p></div>
    <div class="modal-b fun-form"><div class="fun-chips">${[50, 100, 250, 500, 1000].filter(v => v <= pts).map(v => `<button type="button" class="fun-chip ${v === amt ? 'on' : ''}" data-v="${v}">${v}</button>`).join('')}</div>
      <label class="field">Outro valor<input class="input" type="number" id="bjA" min="10" max="5000" value="${amt}"></label></div>
    <div class="modal-f"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="bjGo">Apostar</button></div>`, (md, close) => {
    const inp = md.querySelector('#bjA');
    md.querySelector('.fun-chips').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; inp.value = b.dataset.v; md.querySelectorAll('.fun-chip').forEach(x => x.classList.toggle('on', x === b)); };
    md.querySelector('#bjGo').onclick = async () => { const r = await call('bet:join', { cid, id, opt: i, amount: +inp.value }); if (r.ok) { H.tone([[660, .05], [880, .08]], 'triangle', .05); close(); } };
  });
}

/* =============== apelidos votados =============== */
// apelido vigente de alguém no grupo (vale 7 dias)
function nickTag(g, uid) { const n = g && g.nicks && g.nicks[uid]; return n && n.until > Date.now() ? `<span class="fun-nick" data-tip="Apelido votado pelo grupo">“${esc(n.nick)}”</span>` : ''; }
function nickHtml(m) {
  const n = m.nick, voted = n.votes.includes(me()), left = Math.max(0, n.need - n.votes.length), expired = Date.now() - n.at > 2 * 864e5;
  return `<div class="fun-nickvote ${n.done ? 'done' : ''}"><div><b>🏷️ ${esc(H.nameOf(m.authorId))} sugeriu: ${esc(H.nameOf(n.target))} vira <i>“${esc(n.nick)}”</i></b>
    <span>${n.done ? '✅ Aprovado pelo grupo! Vale por 7 dias.' : expired ? '⌛ A votação expirou.' : `${n.votes.length} de ${n.need} votos · faltam ${left}`}</span></div>
    ${!n.done && !expired ? `<button class="btn sm ${voted ? '' : 'primary'}" data-fun="nickVote" data-cid="${m.cid}" data-id="${m.id}">${voted ? 'Tirar meu voto' : '👍 Apoio!'}</button>` : ''}</div>`;
}
function nickModal(gid, uid) {
  H.modal(`<div class="modal-h"><h2>🏷️ Apelido para ${esc(H.nameOf(uid))}</h2><p>Vai para votação no chat do grupo. Se o pessoal apoiar, o apelido aparece ao lado do nome por 7 dias.</p></div>
    <div class="modal-b"><input class="input" id="nkT" maxlength="30" placeholder="O Rei do Lag"></div>
    <div class="modal-f"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="nkGo">Pôr em votação</button></div>`, (md, close) => {
    md.querySelector('#nkGo').onclick = async () => { const r = await call('nick:propose', { gid, uid, nick: md.querySelector('#nkT').value }, 'Votação aberta no chat!'); if (r.ok) close(); };
    setTimeout(() => md.querySelector('#nkT').focus(), 50);
  });
}

/* =============== som de entrada e Porteiro =============== */
function joinSoundModal(gid) {
  const g = H.S.groups[gid]; if (!g) return;
  const cur = (H.S.me.joinSounds || {})[gid] || null, sounds = g.sounds || [];
  H.modal(`<div class="modal-h"><h2>🔊 Seu som de entrada</h2><p>Toca para todo mundo quando você entra numa call de <b>${esc(g.name)}</b>. Os sons vêm da Central de Áudio do grupo.</p></div>
    <div class="modal-b">${sounds.length ? `<div class="fun-sounds">${sounds.map(s => `<div class="fun-snd ${s.id === cur ? 'on' : ''}"><button type="button" class="icon-btn" data-play="${esc(s.url)}" aria-label="Ouvir">▶</button><span>${esc(s.emoji)} ${esc(s.name)}</span><button type="button" class="btn sm ${s.id === cur ? '' : 'primary'}" data-pick="${s.id}">${s.id === cur ? 'Escolhido' : 'Escolher'}</button></div>`).join('')}</div>` : '<div class="fun-empty">🔇<b>Este grupo ainda não tem sons</b><span>Quem gerencia o grupo adiciona na Central de Áudio (na call).</span></div>'}</div>
    <div class="modal-f">${cur ? '<button class="btn ghost" data-pick="">Sem som de entrada</button><span style="flex:1"></span>' : ''}<button class="btn ghost" data-close>Fechar</button></div>`, (md, close) => {
    md.addEventListener('click', async e => {
      const pl = e.target.closest('[data-play]'); if (pl) { const a = new Audio(pl.dataset.play); a.volume = .6; a.play().catch(() => {}); return; }
      const pk = e.target.closest('[data-pick]'); if (pk) { const r = await call('joinsound:set', { gid, id: pk.dataset.pick || null }, pk.dataset.pick ? 'Som de entrada escolhido!' : 'Sem som de entrada.'); if (r.ok) close(); }
    });
  });
}

/* =============== loja da semana =============== */
async function fillShop(box) {
  if (!box) return;
  const r = await H.emit('shop:get', {}); if (!box.isConnected) return;
  if (!r.ok) { box.innerHTML = `<p class="form-err">${esc(r.erro)}</p>`; return; }
  const left = Math.max(0, r.ends - Date.now()), d = Math.floor(left / 864e5), h = Math.floor(left % 864e5 / 3600e3);
  const pts = H.S.me.points || 0;
  box.innerHTML = `<p class="muted small iv-note">Itens que só ficam à venda nesta semana. Troca em <b>${d ? d + ' dias e ' : ''}${h} horas</b>. Comprou, é seu para sempre.</p>
    <div class="fun-shopgrid">${r.items.map(it => {
      const name = it.kind === 'av' ? (H.avfx(it.id) || {}).name : (H.plate(it.id) || [it.id])[0];
      const prev = it.kind === 'av' ? H.avWith(it.id, 64) : H.plateRow(me(), it.id, H.S.me.displayName);
      const tier = it.kind === 'av' ? it.tier : 'placa';
      return `<div class="fun-item r-c-${tier}"><span class="fun-itier">${it.kind === 'av' ? H.rarName(it.tier) : '🏷️ Placa exclusiva'}</span><div class="fun-iprev">${prev}</div><b>${esc(name || it.id)}</b>
        ${it.owned ? '<button class="btn sm" disabled>✓ Já é seu</button>' : `<button class="btn sm primary" data-buy="${esc(it.id)}" ${pts < it.price ? 'disabled' : ''}><i class="pts-ic"></i> ${it.price.toLocaleString('pt-BR')}</button>`}</div>`;
    }).join('')}</div>`;
  box.onclick = async e => {
    const b = e.target.closest('[data-buy]'); if (!b) return;
    if (!await H.confirmBox('Comprar', 'Comprar este item com AnarchyPoints?', 'Comprar', false)) return;
    const q = await call('shop:buy', { id: b.dataset.buy }, '🛒 Comprado! Já está no seu inventário.');
    if (q.ok) { H.tone([[523, .08], [784, .2]], 'triangle', .06); fillShop(box); }
  };
}

/* =============== fila do DJ: 👍/👎 =============== */
function djVotes(roomId, t) {
  const v = t.votes || {}, up = Object.values(v).filter(x => x > 0).length, down = Object.values(v).filter(x => x < 0).length, mine = v[me()] || 0;
  return `<span class="fun-djv"><button class="${mine > 0 ? 'on' : ''}" data-fun="djVote" data-room="${roomId}" data-id="${t.id}" data-v="1" title="Quero ouvir (sobe na fila)">👍${up || ''}</button><button class="${mine < 0 ? 'on' : ''}" data-fun="djVote" data-room="${roomId}" data-id="${t.id}" data-v="-1" title="Não quero (com votos suficientes, sai da fila)">👎${down || ''}</button></span>`;
}

/* =============== menu "+" do compositor =============== */
function composeMenu(anchor) {
  const cid = H.viewingCid(); if (!cid) return;
  const p = H.pop(`<button data-fun="newPoll" data-cid="${cid}"><span>📊 Enquete</span></button><button data-fun="newBet" data-cid="${cid}"><span>🎲 Aposta de pontos</span></button><button data-fun="newBomb" data-cid="${cid}"><span>💣 Mensagem-bomba</span></button>`, anchor, 'menu', 'above');
  void p;
}

/* =============== conquistas =============== */
function loadDefs() { H.emit('ach:list', {}).then(r => { if (r.ok) { F.defs = r.list; } }); }
const def = id => F.defs.find(d => d.id === id);
function achRow(u) {
  const ids = (u.ach || []).filter(def); if (!ids.length) return '';
  return `<div class="fun-achrow">${ids.map(id => { const d = def(id); return `<span class="fun-medal" data-tip="${esc(d.name + ': ' + d.desc)}">${d.emoji}</span>`; }).join('')}</div>`;
}
// várias conquistas de uma vez: uma de cada vez na tela (fila)
const achQ = []; let achBusy = false;
function achToast(d) { achQ.push(d); if (!achBusy) nextAch(); }
function nextAch() { const d = achQ.shift(); if (!d) { achBusy = false; return; } achBusy = true; showAch(d); setTimeout(nextAch, 6200); }
function showAch(d) {
  const a = def(d.id); if (!a) return;
  const el = document.createElement('div'); el.className = 'fun-achpop'; el.setAttribute('role', 'status');
  el.innerHTML = `<i>${a.emoji}</i><div><span>🏆 Conquista desbloqueada!</span><b>${esc(a.name)}</b><small>${esc(a.desc)} · <b class="pts">+${d.reward} pontos</b></small></div>`;
  document.body.appendChild(el);
  H.tone([[523, .08], [659, .08], [784, .08], [1047, .3]], 'triangle', .07);
  if (H.confetti) H.confetti();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 500); }, 5500);
}
// aba "Conquistas" do Inventário: todas, com a barra de quanto falta
function achPane() {
  const u = H.S.me, st = u.stats || {}, at = u.achAt || {};
  const val = k => (k === 'pointsTotal' ? u.pointsTotal || 0 : k === 'boxes' ? u.boxes || 0 : st[k] || 0);
  const KEY = Object.fromEntries((F.defs || []).map(d => [d.id, d]));
  if (!F.defs.length) return '<p class="muted small">Carregando conquistas...</p>';
  const done = F.defs.filter(d => at[d.id]).length;
  const statKey = { primeira: 'msgs', falante: 'msgs', tagarela: 'msgs', call1: 'callMin', call10: 'callMin', call100: 'callMin', caixa1: 'boxes', caixa50: 'boxes', sortudo: 'luck', enquete: 'polls', eleitor: 'votes', bomba: 'bombs', fiel: 'streakMax', lenda: 'streakMax', destino: 'spins', organizador: 'events', reator: 'reacts', rico: 'pointsTotal' };
  void KEY;
  return `<p class="muted small iv-note">${done} de ${F.defs.length} conquistas. Cada uma dá AnarchyPoints na hora e aparece no seu perfil.</p>
    <div class="fun-achs">${F.defs.slice().sort((a, b) => (!!at[b.id] - !!at[a.id]) || (val(statKey[b.id]) / b.goal - val(statKey[a.id]) / a.goal)).map(d => { const has = at[d.id], v = Math.min(d.goal, val(statKey[d.id])), pc = Math.round(v / d.goal * 100);
      return `<div class="fun-ach ${has ? 'on' : ''}"><i>${d.emoji}</i><div><b>${esc(d.name)}</b><span>${esc(d.desc)}</span>${has ? `<small>✓ ${new Date(has).toLocaleDateString('pt-BR')}</small>` : `<div class="fun-bar"><i style="width:${pc}%"></i></div><small>${v.toLocaleString('pt-BR')}/${d.goal.toLocaleString('pt-BR')}</small>`}</div><em>+${d.reward}</em></div>`; }).join('')}</div>`;
}

/* =============== atividade ("jogando...") =============== */
const ACTS = [['🎮', 'Jogando'], ['🎵', 'Ouvindo'], ['📺', 'Assistindo'], ['📚', 'Estudando'], ['💼', 'Trabalhando'], ['🍕', 'Comendo'], ['😴', 'Dormindo'], ['🚗', 'Na rua']];
const actLine = u => (u && u.activity ? `${esc(u.activity.emoji)} ${esc(u.activity.text)}` : '');
function activityModal() {
  const cur = H.S.me.activity; let emoji = cur ? cur.emoji : '🎮';
  H.modal(`<div class="modal-h"><h2>🎮 O que você está fazendo?</h2><p>Aparece embaixo do seu nome para os amigos. Some sozinho depois de 12 horas.</p></div>
    <div class="modal-b fun-form"><div class="fun-chips">${ACTS.map(([e, t]) => `<button type="button" class="fun-chip ${emoji === e ? 'on' : ''}" data-e="${e}" data-t="${t}">${e} ${t}</button>`).join('')}</div>
      <label class="field">Texto<input class="input" id="faT" maxlength="40" value="${esc(cur ? cur.text : '')}" placeholder="Jogando Valorant"></label></div>
    <div class="modal-f">${cur ? '<button class="btn ghost" id="faClr">Limpar</button><span style="flex:1"></span>' : ''}<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="faGo">Salvar</button></div>`, (md, close) => {
    const inp = md.querySelector('#faT');
    md.querySelector('.fun-chips').onclick = e => { const b = e.target.closest('[data-e]'); if (!b) return; emoji = b.dataset.e; md.querySelectorAll('.fun-chip').forEach(x => x.classList.toggle('on', x === b)); if (!inp.value.trim() || ACTS.some(([, t]) => inp.value.startsWith(t))) { inp.value = b.dataset.t + ' '; } inp.focus(); };
    md.querySelector('#faGo').onclick = async () => { const r = await call('activity:set', { text: inp.value, emoji }); if (r.ok) close(); };
    const clr = md.querySelector('#faClr'); if (clr) clr.onclick = async () => { const r = await call('activity:set', { text: '' }); if (r.ok) close(); };
    setTimeout(() => inp.focus(), 50);
  });
}

/* =============== eventos do grupo =============== */
const upcoming = g => (g && Array.isArray(g.events) ? g.events.filter(e => e.at > Date.now() - 3 * 3600e3).sort((a, b) => a.at - b.at) : []);
function eventPill(g) {
  const e = upcoming(g).find(x => x.at > Date.now() && x.at - Date.now() < 7 * 864e5); if (!e) return '';
  return `<button class="fun-evpill ${e.going.includes(me()) ? 'going' : ''}" data-fun="events" data-gid="${g.id}" data-tip="${esc(whenTxt(e.at))}">${esc(e.emoji)} ${esc(e.title)} · ${until(e.at)}</button>`;
}
function eventsModal(gid) {
  const g = H.S.groups[gid]; if (!g) return;
  H.modal(`<div class="modal-h"><h2>📅 Eventos de ${esc(g.name)}</h2><p>Marque um rolê. Quem clicar em "Vou" recebe aviso 10 minutos antes e quando começar.</p></div>
    <div class="modal-b fun-form" id="evBody"></div>
    <div class="modal-f"><button class="btn ghost" data-close>Fechar</button></div>`, (md, close) => {
    const body = md.querySelector('#evBody');
    const draw = () => {
      const gg = H.S.groups[gid], list = upcoming(gg);
      const canDel = e => e.by === me() || H.gCan(gg, 'manageServer');
      body.innerHTML = `${list.length ? `<div class="fun-evs">${list.map(e => { const go = e.going.includes(me()); return `<div class="fun-ev ${go ? 'going' : ''}"><i>${esc(e.emoji)}</i><div><b>${esc(e.title)}</b><span>${esc(whenTxt(e.at))} · ${e.at > Date.now() ? until(e.at) : 'acontecendo'}</span>${e.desc ? `<p>${esc(e.desc)}</p>` : ''}<div class="fun-ev-who">${e.going.slice(0, 8).map(u => H.av(u, 22, false)).join('')}<small>${plural(e.going.length, 'vai', 'vão')}</small></div></div>
          <div class="fun-ev-acts"><button class="btn sm ${go ? '' : 'primary'}" data-go="${go ? 0 : 1}" data-id="${e.id}">${go ? 'Não vou mais' : '✋ Vou!'}</button>${canDel(e) ? `<button class="icon-btn" data-del="${e.id}" aria-label="Apagar evento">🗑️</button>` : ''}</div></div>`; }).join('')}</div>` : '<div class="fun-empty">📅<b>Nenhum evento marcado</b><span>Que tal marcar uma noite de jogos?</span></div>'}
        <h4 class="fun-h">Marcar um evento</h4>
        <div class="fun-row"><input class="input fun-emo" id="evE" maxlength="8" value="🎉" aria-label="Emoji"><input class="input" id="evT" maxlength="60" placeholder="Noite do terror" aria-label="Nome"></div>
        <div class="fun-row"><label class="field">Quando<input class="input" type="datetime-local" id="evAt"></label></div>
        <label class="field">Detalhes (opcional)<input class="input" id="evD" maxlength="300" placeholder="Filme + call às 21h"></label>
        <button class="btn primary" id="evGo">📅 Marcar</button>`;
      const dt = new Date(Date.now() + 3600e3); dt.setMinutes(0, 0, 0); dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
      body.querySelector('#evAt').value = dt.toISOString().slice(0, 16);
    };
    draw();
    body.onclick = async e => {
      const go = e.target.closest('[data-go]'), del = e.target.closest('[data-del]');
      if (go) { const r = await call('event:rsvp', { gid, id: go.dataset.id, go: go.dataset.go === '1' }); if (r.ok) setTimeout(draw, 150); }
      if (del && await H.confirmBox('Apagar evento', 'O evento some para todo mundo.', 'Apagar')) { const r = await call('event:delete', { gid, id: del.dataset.del }); if (r.ok) setTimeout(draw, 150); }
      if (e.target.closest('#evGo')) {
        const at = new Date(body.querySelector('#evAt').value).getTime();
        const r = await call('event:create', { gid, title: body.querySelector('#evT').value, emoji: body.querySelector('#evE').value, at, desc: body.querySelector('#evD').value }, 'Evento marcado!');
        if (r.ok) setTimeout(draw, 150);
      }
    };
    F.evRedraw = () => { if (md.isConnected) draw(); };
    void close;
  });
}

/* =============== roleta da call =============== */
function rouletteModal() {
  if (!H.inCall()) return H.toast('Entre numa call para girar a roleta.', true);
  let mode = 'pessoa';
  H.modal(`<div class="modal-h"><h2>🎡 Roleta da call</h2><p>Todo mundo da call vê a roleta girar ao mesmo tempo. O sorteio é feito no servidor.</p></div>
    <div class="modal-b fun-form"><div class="fun-chips"><button type="button" class="fun-chip on" data-m="pessoa">👥 Sortear alguém da call</button><button type="button" class="fun-chip" data-m="opcoes">📝 Sortear entre opções</button></div>
      <label class="fun-check" id="frPrenda"><input type="checkbox" id="frP" checked> Com prenda divertida para quem for sorteado</label>
      <label class="field" id="frOpts" hidden>Opções (uma por linha)<textarea class="input" id="frO" rows="4" placeholder="Valorant&#10;LoL&#10;Minecraft"></textarea></label>
      <label class="field">Título (opcional)<input class="input" id="frT" maxlength="60" placeholder="Quem paga a pizza?"></label></div>
    <div class="modal-f"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="frGo">🎡 Girar!</button></div>`, (md, close) => {
    md.querySelector('.fun-chips').onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; mode = b.dataset.m; md.querySelectorAll('.fun-chip').forEach(x => x.classList.toggle('on', x === b)); md.querySelector('#frOpts').hidden = mode !== 'opcoes'; md.querySelector('#frPrenda').hidden = mode !== 'pessoa'; };
    md.querySelector('#frGo').onclick = async () => {
      const r = await call('roulette:spin', { mode, prenda: md.querySelector('#frP').checked, opts: md.querySelector('#frO').value.split('\n'), title: md.querySelector('#frT').value });
      if (r.ok) close();
    };
  });
}
const WHEEL = ['#ff5f6d', '#ffc371', '#47c9a2', '#4f8cff', '#b06cff', '#ff8ac6', '#f5b83d', '#3ee0c5', '#6c7cff', '#e8873a', '#5fd07d', '#ff6b8b'];
function showRoulette(d) {
  document.querySelector('.fun-wheel-back')?.remove();
  const n = d.items.length, seg = 360 / n, label = i => (d.kind === 'pessoa' ? H.nameOf(d.items[i]) : d.items[i]);
  const grad = d.items.map((_, i) => `${WHEEL[i % WHEEL.length]} ${i * seg}deg ${(i + 1) * seg}deg`).join(',');
  const el = document.createElement('div'); el.className = 'fun-wheel-back'; el.setAttribute('role', 'dialog');
  el.innerHTML = `<div class="fun-wheel-box"><h2>${esc(d.title || (d.kind === 'pessoa' ? 'Quem vai ser?' : 'Roleta'))}</h2><span class="muted small">girada por ${esc(H.nameOf(d.by))}</span>
    <div class="fun-wheel-wrap"><i class="fun-wheel-pin"></i><div class="fun-wheel" style="background:conic-gradient(${grad})">${d.items.map((_, i) => `<span style="--r:${i * seg + seg / 2}deg"><b>${esc(label(i).slice(0, 16))}</b>${d.kind === 'pessoa' ? `<i class="fw-ini">${esc((label(i).trim()[0] || '?').toUpperCase())}</i>` : ''}</span>`).join('')}</div></div>
    <div class="fun-wheel-res"></div></div>`;
  document.body.appendChild(el);
  const wheel = el.querySelector('.fun-wheel'), fast = H.reduceMotion();
  const target = 360 * (fast ? 1 : 7) + (360 - (d.win * seg + seg / 2)) + (Math.random() - .5) * seg * .6;
  wheel.style.transition = `transform ${fast ? .6 : 5.5}s cubic-bezier(.12,.85,.15,1)`;
  requestAnimationFrame(() => requestAnimationFrame(() => { wheel.style.transform = `rotate(${target}deg)`; }));
  // tiquinhos enquanto gira
  let t = 0; const tick = setInterval(() => { t++; if (t > 28) return clearInterval(tick); H.tone([[900 + Math.random() * 200, .02]], 'square', .02); }, 60 + t * 6);
  setTimeout(() => {
    clearInterval(tick);
    const res = el.querySelector('.fun-wheel-res');
    res.innerHTML = `${d.kind === 'pessoa' ? H.av(d.items[d.win], 56, false) : ''}<b>🎯 ${esc(label(d.win))}!</b>${d.prenda ? `<span class="fun-prenda">Prenda: ${esc(d.prenda)}</span>` : ''}<button class="btn primary sm">Fechar</button>`;
    res.classList.add('on');
    H.tone([[523, .08], [659, .08], [784, .08], [1047, .3]], 'triangle', .07);
    if (H.confetti) H.confetti();
    res.querySelector('button').onclick = () => el.remove();
    setTimeout(() => el.remove(), 15000);
  }, fast ? 800 : 5800);
  el.addEventListener('mousedown', e => { if (e.target === el) el.remove(); });
}

/* =============== retrospectiva do mês =============== */
async function retroModal(gid) {
  const g = H.S.groups[gid]; if (!g) return;
  const months = Array.from({ length: 6 }, (_, k) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - k); return d.toISOString().slice(0, 7); });
  const mName = ym => new Date(ym + '-15').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  H.modal(`<div class="modal-h"><h2>✨ Retrospectiva</h2><p>O mês de <b>${esc(g.name)}</b> em números.</p></div>
    <div class="modal-b"><select class="input" id="rtM">${months.map(m => `<option value="${m}">${mName(m)}</option>`).join('')}</select><div id="rtBody" class="fun-retro"></div></div>
    <div class="modal-f"><button class="btn ghost" data-close>Fechar</button><button class="btn primary" id="rtSend">📤 Mandar no chat</button></div>`, (md, close) => {
    let data = null;
    const load = async () => {
      const body = md.querySelector('#rtBody'); body.innerHTML = '<p class="muted">Contando as mensagens...</p>';
      const r = await H.emit('retro:get', { gid, ym: md.querySelector('#rtM').value }); if (!r.ok) { body.innerHTML = `<p class="form-err">${esc(r.erro)}</p>`; return; }
      data = r;
      if (!r.total) { body.innerHTML = '<div class="fun-empty">🦗<b>Silêncio total</b><span>Ninguém mandou mensagem neste mês.</span></div>'; return; }
      const crown = ['👑', '🥈', '🥉', '4º', '5º'];
      body.innerHTML = `<div class="fun-rc big"><span>Mensagens no mês</span><b>${r.total.toLocaleString('pt-BR')}</b><small>de ${plural(r.people, 'pessoa', 'pessoas')} · ${r.images} imagens e GIFs · ${plural(r.polls, 'enquete', 'enquetes')}</small></div>
        <div class="fun-rc"><span>🗣️ Quem mais falou</span>${r.talkers.map(([u, n], i) => `<div class="fun-rrow">${crown[i]} ${H.av(u, 24, false)} <b>${esc(H.nameOf(u))}</b><em>${n.toLocaleString('pt-BR')}</em></div>`).join('')}</div>
        ${r.best ? `<div class="fun-rc"><span>🔥 Mensagem mais reagida (${r.best.n} reações)</span><blockquote>“${esc(r.best.text)}”</blockquote><small>— ${esc(H.nameOf(r.best.by))}</small></div>` : ''}
        ${r.emoji.length ? `<div class="fun-rc"><span>😂 Reações favoritas</span><div class="fun-remo">${r.emoji.map(([e, n]) => `<b>${esc(e)}<small>${n}</small></b>`).join('')}</div></div>` : ''}
        ${r.day ? `<div class="fun-rc"><span>📅 Dia mais agitado</span><b>${new Date(r.day[0] + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</b><small>${r.day[1]} mensagens</small></div>` : ''}
        ${r.music.length ? `<div class="fun-rc"><span>🎵 Mais tocadas no DJ</span>${r.music.map(([t, n], i) => `<div class="fun-rrow">${i + 1}. <b>${esc(t)}</b><em>${n}×</em></div>`).join('')}</div>` : ''}
        ${r.call.length ? `<div class="fun-rc"><span>🎧 Reis da call (desde sempre)</span>${r.call.map(([u, m], i) => `<div class="fun-rrow">${crown[i]} ${H.av(u, 24, false)} <b>${esc(H.nameOf(u))}</b><em>${Math.round(m / 60)} h</em></div>`).join('')}</div>` : ''}`;
    };
    md.querySelector('#rtM').onchange = load; load();
    md.querySelector('#rtSend').onclick = async () => {
      if (!data || !data.total) return H.toast('Nada para mandar neste mês.', true);
      const cid = H.viewingCid() && H.S.view.gid === gid ? H.viewingCid() : (g.channels.find(c => c.type === 'text') || {}).id;
      const t = `✨ **Retrospectiva de ${mName(data.ym)}**\n💬 ${data.total} mensagens de ${data.people} pessoas\n🗣️ Quem mais falou: ${data.talkers.slice(0, 3).map(([u, n], i) => `${['👑', '🥈', '🥉'][i]} ${H.nameOf(u)} (${n})`).join(', ')}${data.best ? `\n🔥 Mais reagida: “${data.best.text.slice(0, 80)}” — ${H.nameOf(data.best.by)}` : ''}${data.emoji.length ? `\n😂 Reação favorita: ${data.emoji[0][0]}` : ''}`;
      const r = await call('message:send', { cid, content: t }, 'Retrospectiva enviada!'); if (r.ok) close();
    };
  });
}
function groupFunMenu(anchor, gid) {
  H.pop(`<button data-fun="events" data-gid="${gid}"><span>📅 Eventos do grupo</span></button><button data-fun="retro" data-gid="${gid}"><span>✨ Retrospectiva do mês</span></button>${H.inCall() ? '<button data-fun="roulette"><span>🎡 Roleta da call</span></button>' : ''}<button data-fun="activity"><span>🎮 Minha atividade</span></button><button data-fun="joinSound" data-gid="${gid}"><span>🔊 Meu som de entrada</span></button>${H.gCan(H.S.groups[gid], 'manageServer') ? `<hr><button data-fun="porteiro" data-gid="${gid}"><span>🤖 Porteiro: ${H.S.groups[gid].porteiro === false ? 'desligado (ligar)' : 'comentando (desligar)'}</span></button>` : ''}`, anchor, 'menu', 'below');
}

/* =============== cliques e tempo real =============== */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-fun]'); if (!b || !H) return;
  e.stopPropagation();
  const a = b.dataset.fun;
  if (a !== 'compose' && a !== 'groupFun') H.closePops();
  if (a === 'vote') call('poll:vote', { cid: b.dataset.cid, id: b.dataset.id, opt: +b.dataset.i });
  if (a === 'pclose') call('poll:close', { cid: b.dataset.cid, id: b.dataset.id });
  if (a === 'bomb') openBomb(b.dataset.cid, b.dataset.id);
  if (a === 'compose') composeMenu(b);
  if (a === 'newPoll') pollModal(b.dataset.cid);
  if (a === 'newBomb') bombModal(b.dataset.cid);
  if (a === 'events') eventsModal(b.dataset.gid || H.S.view.gid);
  if (a === 'retro') retroModal(b.dataset.gid || H.S.view.gid);
  if (a === 'roulette') rouletteModal();
  if (a === 'activity') activityModal();
  if (a === 'groupFun') groupFunMenu(b, b.dataset.gid);
  if (a === 'newBet') betModal(b.dataset.cid);
  if (a === 'betIn') betJoinModal(b.dataset.cid, b.dataset.id, +b.dataset.i);
  if (a === 'betLock') call('bet:lock', { cid: b.dataset.cid, id: b.dataset.id });
  if (a === 'betWin') H.confirmBox('Resultado', 'Confirmar esta opção como vencedora? O pote é dividido na hora.', 'Confirmar', false).then(y => y && call('bet:resolve', { cid: b.dataset.cid, id: b.dataset.id, opt: +b.dataset.i }));
  if (a === 'betCancel') H.confirmBox('Cancelar aposta', 'Todo mundo recebe os pontos de volta.', 'Cancelar aposta').then(y => y && call('bet:resolve', { cid: b.dataset.cid, id: b.dataset.id, cancel: true }));
  if (a === 'nickNew') nickModal(b.dataset.gid, b.dataset.uid);
  if (a === 'nickVote') call('nick:vote', { cid: b.dataset.cid, id: b.dataset.id });
  if (a === 'joinSound') joinSoundModal(b.dataset.gid);
  if (a === 'porteiro') { const g = H.S.groups[b.dataset.gid]; call('porteiro:set', { gid: b.dataset.gid, on: g.porteiro === false }, g.porteiro === false ? '🤖 O Porteiro voltou a comentar no grupo.' : '🤖 O Porteiro ficou quieto.'); }
  if (a === 'djVote') call('music:vote', { roomId: b.dataset.room, id: b.dataset.id, v: +b.dataset.v });
}, true);
function attach(sock) {
  sock.on('connect', loadDefs);
  sock.on('ach:new', d => achToast(d));
  sock.on('roulette:spin', d => showRoulette(d));
  sock.on('event:remind', d => { H.toast(`${d.emoji || '📅'} "${d.title}" começa em ${d.mins} min!`, false, 9000); H.tone([[660, .1], [880, .2]], 'triangle', .05); });
  sock.on('event:start', d => { H.toast(`${d.emoji || '🎉'} Começou: "${d.title}"!`, false, 9000); H.tone([[523, .1], [659, .1], [784, .3]], 'triangle', .06); });
  sock.on('group:update', () => setTimeout(() => F.evRedraw && F.evRedraw(), 50));
}

window.anarchyFun = {
  init(h) { H = h; }, attach,
  msgExtra: m => (m.poll ? pollHtml(m) : '') + (m.bomb ? bombHtml(m) : '') + (m.bet ? betHtml(m) : '') + (m.nick ? nickHtml(m) : ''),
  sysEvent: m => m.system === 'porteiro'
    ? `<div class="msg sys fun-port" id="m-${m.id}"><span class="fun-port-av" aria-hidden="true">🤖</span><span class="sys-t"><b>Porteiro</b> ${H.md(m.content)} <time>${new Date(m.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time></span></div>`
    : `<div class="msg sys fun-evmsg" id="m-${m.id}"><span class="sys-ic">🎉</span><span class="sys-t"><b>${esc(m.content)}</b> começou agora! <span class="muted">Evento marcado por ${esc(H.nameOf(m.authorId))}</span></span></div>`,
  achRow, achPane, actLine, eventPill, activityModal, loadDefs, nickTag, djVotes, fillShop
};
})();
