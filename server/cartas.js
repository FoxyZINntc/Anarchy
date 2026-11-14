/* Anarchy — Jogos de cartas da call: Cartas Malucas (cor e número, com +2, pular, inverter e coringas) e Truco paulista.
   Tudo é decidido aqui: o baralho é embaralhado no servidor, cada pessoa só recebe a própria mão (cards:state é
   montado por pessoa) e as jogadas são conferidas antes de valer. Um jogo de cartas por call. */
const crypto = require('crypto');
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(0, i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const PRIZE = 150, PRIZE2 = 50, DAY_CAP = 600, TURN_SECS = 30, TRUCO_SECS = 40, LOBBY_SECS = 20;

/* ---------- Cartas Malucas ---------- */
const COLORS = ['vermelho', 'amarelo', 'verde', 'azul'];
function malucasDeck() {
  const d = []; let n = 0; const add = (c, v) => d.push({ id: 'm' + (n++), c, v });
  for (const c of COLORS) { add(c, '0'); for (let k = 0; k < 2; k++) { for (let v = 1; v <= 9; v++) add(c, String(v)); add(c, '+2'); add(c, 'pular'); add(c, 'inverter'); } }
  for (let k = 0; k < 4; k++) { add('coringa', 'cor'); add('coringa', '+4'); }
  return shuffle(d);
}
/* ---------- Truco paulista ---------- */
const RANKS = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3']; // do mais fraco ao mais forte
const SUITS = ['ouros', 'espadas', 'copas', 'paus']; // força da manilha: ouros < espadas < copas < paus (zap)
const trucoDeck = () => shuffle(RANKS.flatMap(r => SUITS.map(s => ({ id: 't' + r + s[0], r, s }))));
const RAISE = { 1: 3, 3: 6, 6: 9, 9: 12 };
const RAISE_NAME = { 3: 'TRUCO', 6: 'SEIS', 9: 'NOVE', 12: 'DOZE' };

function createCartas({ db, save, now, str, toUser, voice, sockets, limited, track, selfUser, log, otherBusy }) {
  const games = new Map(); // roomId -> partida
  const humansIn = room => [...new Set([...(voice.get(room) || new Map()).values()].map(s => s.uid))].filter(id => db.users[id] && !db.users[id].bot);
  const name = id => (db.users[id] && db.users[id].displayName) || 'alguém';
  const day = () => new Date(now() - 3 * 3600e3).toISOString().slice(0, 10);
  const roomEach = (room, fn) => { for (const sid of (voice.get(room) || new Map()).keys()) { const sk = sockets.get(sid); if (sk) fn(sk, sk.data.uid); } };
  const info = (g, text) => { g.log.push(text); if (g.log.length > 30) g.log.shift(); roomEach(g.room, sk => sk.emit('cards:info', { text })); };

  /* ----- o que cada pessoa vê: a própria mão; dos outros, só quantas cartas têm ----- */
  function view(g, uid) {
    // convite: só quem topou e quem recusou (ainda não tem cartas)
    if (g.phase === 'convite') return { room: g.room, kind: g.kind, host: g.host, phase: 'convite', invited: [...g.invited], declined: [...g.declined], ends: g.lobbyEnds, serverNow: now(), log: g.log.slice(-6), players: [...g.invited].map(p => ({ uid: p, n: 0 })), me: null };
    const v = { room: g.room, kind: g.kind, host: g.host, phase: g.phase, players: g.players.map(p => ({ uid: p, n: g.hands[p] ? g.hands[p].length : 0 })), turn: g.players[g.turn], ends: g.ends, serverNow: now(), log: g.log.slice(-6), winner: g.winner || null, prizes: g.prizes || null, me: g.players.includes(uid) ? (g.hands[uid] || []) : null };
    if (g.kind === 'malucas') Object.assign(v, { top: g.pile[g.pile.length - 1], color: g.color, dir: g.dir, drawn: g.drawn && g.players[g.turn] === uid ? g.drawn : null, deck: g.deck.length, last: g.players.filter(p => g.hands[p].length === 1 && g.saidLast[p]), catchable: g.players.filter(p => g.hands[p].length === 1 && !g.saidLast[p]) });
    if (g.kind === 'truco') Object.assign(v, { teams: g.teams, score: g.score, value: g.value, vira: g.vira, manilha: g.manilha, table: g.table, tricks: g.tricks, ask: g.ask, dealer: g.players[g.dealer] });
    return v;
  }
  const push = g => roomEach(g.room, (sk, uid) => sk.emit('cards:state', view(g, uid)));
  function prize(uid, amount, g) {
    const u = db.users[uid]; if (!u) return 0;
    u.stats = u.stats || {}; if (!u.stats.gameCap || u.stats.gameCap.d !== day()) u.stats.gameCap = { d: day(), n: 0 };
    const give = Math.min(amount, DAY_CAP - u.stats.gameCap.n); if (give <= 0) return 0;
    u.stats.gameCap.n += give; u.points = (u.points || 0) + give; u.pointsTotal = (u.pointsTotal || 0) + give;
    g.prizes[uid] = give; toUser(uid, 'me:update', selfUser(u)); return give;
  }
  function end(g, winners, reason) {
    clearTimeout(g.timer); g.phase = 'fim'; g.winner = winners; g.prizes = {};
    if (winners && winners.length && g.players.length >= 2) {
      winners.forEach(w => { prize(w, PRIZE, g); track(w, 'cardWins'); });
      if (g.kind === 'malucas') { const second = g.players.filter(p => !winners.includes(p)).sort((a, b) => g.hands[a].length - g.hands[b].length)[0]; if (second) prize(second, PRIZE2, g); }
    }
    save(); if (reason) info(g, reason); push(g);
    setTimeout(() => { if (games.get(g.room) === g) games.delete(g.room); }, 60e3);
  }
  const timer = (g, secs, fn) => { clearTimeout(g.timer); g.ends = now() + secs * 1000; g.timer = setTimeout(fn, secs * 1000); };

  /* =============== Cartas Malucas =============== */
  const playable = (g, c) => c.c === 'coringa' || c.c === g.color || c.v === g.pile[g.pile.length - 1].v;
  function mDraw(g, uid, n) {
    const out = [];
    for (let k = 0; k < n; k++) {
      if (!g.deck.length) { const top = g.pile.pop(); g.deck = shuffle(g.pile.map(c => (c.c === 'coringa' ? { ...c, pick: undefined } : c))); g.pile = [top]; if (!g.deck.length) break; }
      out.push(g.deck.pop());
    }
    g.hands[uid].push(...out); if (g.hands[uid].length > 2) g.saidLast[uid] = false; // comprou: o "última carta" não vale mais
    return out;
  }
  const nextI = (g, steps = 1) => ((g.turn + g.dir * steps) % g.players.length + g.players.length) % g.players.length;
  function mTurn(g, i) {
    g.turn = i; g.drawn = null;
    const p = g.players[i];
    timer(g, TURN_SECS, () => { // tempo acabou: compra uma e passa
      if (g.phase !== 'jogando' || g.players[g.turn] !== p) return;
      if (!g.drawn) mDraw(g, p, 1);
      info(g, `⏰ ${name(p)} demorou e comprou uma carta.`);
      mTurn(g, nextI(g)); push(g);
    });
  }
  function mStart(g) {
    g.deck = malucasDeck(); g.pile = []; g.hands = {}; g.saidLast = {}; g.dir = 1;
    for (const p of g.players) { g.hands[p] = []; mDraw(g, p, 7); }
    let first; do { first = g.deck.pop(); if (first.c === 'coringa') g.deck.unshift(first); } while (first.c === 'coringa');
    g.pile.push(first); g.color = first.c; g.phase = 'jogando';
    mTurn(g, crypto.randomInt(0, g.players.length));
  }
  function mPlay(g, uid, d) {
    if (g.players[g.turn] !== uid) return 'Não é a sua vez.';
    const hand = g.hands[uid], i = hand.findIndex(c => c.id === str(d.id, 10)); if (i < 0) return 'Carta não encontrada.';
    const c = hand[i];
    if (g.drawn && g.drawn !== c.id) return 'Depois de comprar, só dá para jogar a carta comprada (ou passar).';
    if (!playable(g, c)) return 'Essa carta não combina com a da mesa.';
    if (c.c === 'coringa' && !COLORS.includes(d.color)) return 'Escolha uma cor.';
    hand.splice(i, 1);
    const played = c.c === 'coringa' ? { ...c, pick: d.color } : c;
    g.pile.push(played); if (g.pile.length > 60) g.pile.splice(0, g.pile.length - 60);
    g.color = c.c === 'coringa' ? d.color : c.c;
    if (hand.length === 1 && d.last) g.saidLast[uid] = true;
    if (!hand.length) { end(g, [uid], `🏆 ${name(uid)} acabou com as cartas e venceu!`); return null; }
    const n = g.players.length; let skip = 1;
    if (c.v === 'inverter') { if (n === 2) skip = 2; else g.dir *= -1; }
    if (c.v === 'pular') skip = 2;
    if (c.v === '+2' || c.v === '+4') { const vi = nextI(g); const v = g.players[vi]; mDraw(g, v, c.v === '+2' ? 2 : 4); info(g, `${c.v === '+2' ? '➕2' : '🌈➕4'} ${name(v)} comprou ${c.v === '+2' ? 2 : 4} e perdeu a vez!`); skip = 2; }
    if (c.v === 'pular') info(g, `⛔ ${name(g.players[nextI(g)])} foi pulado(a)!`);
    if (c.v === 'inverter' && n > 2) info(g, '🔄 A ordem inverteu!');
    if (c.c === 'coringa') info(g, `🎨 ${name(uid)} escolheu ${g.color}.`);
    mTurn(g, nextI(g, skip)); return null;
  }

  /* =============== Truco paulista =============== */
  const power = (g, c) => (c.r === g.manilha ? 100 + SUITS.indexOf(c.s) : RANKS.indexOf(c.r));
  const teamOf = (g, uid) => (g.teams[0].includes(uid) ? 0 : 1);
  function tDeal(g) {
    const deck = trucoDeck(); g.hands = {};
    for (const p of g.players) g.hands[p] = [deck.pop(), deck.pop(), deck.pop()];
    g.vira = deck.pop(); g.manilha = RANKS[(RANKS.indexOf(g.vira.r) + 1) % RANKS.length];
    g.value = 1; g.ask = null; g.table = []; g.tricks = []; g.lastRaiseTeam = null;
    g.dealer = (g.dealer + 1) % g.players.length; g.phase = 'jogando';
    tTurn(g, (g.dealer + 1) % g.players.length);
  }
  function tTurn(g, i) {
    g.turn = i; const p = g.players[i];
    timer(g, TRUCO_SECS, () => {
      if (g.phase !== 'jogando' || g.players[g.turn] !== p) return;
      if (g.ask) { // ninguém respondeu o truco: corre
        tRun(g, g.ask.to); push(g); return;
      }
      const lo = g.hands[p].slice().sort((a, b) => power(g, a) - power(g, b))[0];
      info(g, `⏰ ${name(p)} demorou: jogou a carta mais fraca.`); tPlay(g, p, lo.id); push(g);
    });
  }
  function handWinner(tr) {
    // tr: lista com 0, 1 ou 'empate' para cada rodada
    const w0 = tr.filter(x => x === 0).length, w1 = tr.filter(x => x === 1).length;
    if (w0 >= 2) return 0; if (w1 >= 2) return 1;
    if (tr.length >= 2 && tr[0] === 'empate' && tr[1] !== 'empate') return tr[1];
    if (tr.length >= 2 && tr[0] !== 'empate' && tr[1] === 'empate') return tr[0];
    if (tr.length === 3) { if (tr[2] === 'empate') return tr[0] === 'empate' ? (tr[1] === 'empate' ? null : tr[1]) : tr[0]; return tr[2]; }
    return undefined; // ainda não acabou
  }
  function tScore(g, team, pts, why) {
    g.score[team] += pts; clearTimeout(g.timer);
    info(g, `${why} Dupla ${team === 0 ? 'A' : 'B'} ganhou ${pts} ponto${pts > 1 ? 's' : ''}. (${g.score[0]} x ${g.score[1]})`);
    if (g.score[team] >= 12) return end(g, g.teams[team], `🏆 Dupla ${team === 0 ? 'A' : 'B'} (${g.teams[team].map(name).join(' e ')}) venceu o Truco!`);
    g.phase = 'entremao'; push(g);
    g.timer = setTimeout(() => { if (g.phase === 'entremao') { tDeal(g); push(g); } }, 4000);
  }
  function tPlay(g, uid, id) {
    const hand = g.hands[uid], i = hand.findIndex(c => c.id === id); if (i < 0) return 'Carta não encontrada.';
    const [c] = hand.splice(i, 1); g.table.push({ uid, c });
    const n = g.players.length;
    if (g.table.length < n) { tTurn(g, (g.turn + 1) % n); return null; }
    // todos jogaram: quem levou a rodada
    const best = Math.max(...g.table.map(t => power(g, t.c)));
    const top = g.table.filter(t => power(g, t.c) === best), teams = [...new Set(top.map(t => teamOf(g, t.uid)))];
    const res = teams.length > 1 ? 'empate' : teams[0];
    g.tricks.push(res);
    info(g, res === 'empate' ? '🤝 Rodada empatou (cangou)!' : `🃏 ${name(top[0].uid)} levou a rodada.`);
    const hw = handWinner(g.tricks);
    const starter = res === 'empate' ? g.players.indexOf(g.table[0].uid) : g.players.indexOf(top[0].uid);
    g.lastTable = g.table; g.table = [];
    if (hw === null) { info(g, 'Mão empatada: ninguém pontua.'); g.phase = 'entremao'; clearTimeout(g.timer); push(g); g.timer = setTimeout(() => { if (g.phase === 'entremao') { tDeal(g); push(g); } }, 4000); return null; }
    if (hw !== undefined) { tScore(g, hw, g.value, '🎉'); return null; }
    tTurn(g, starter); return null;
  }
  function tRun(g, team) { // a dupla "team" correu do truco: a outra leva o valor de antes do pedido
    const other = 1 - team, pts = g.value; g.ask = null;
    tScore(g, other, pts, `🏃 A dupla ${team === 0 ? 'A' : 'B'} correu!`);
  }
  function tStart(g) {
    const ps = g.players.length >= 4 ? g.players.slice(0, 4) : g.players.slice(0, 2);
    g.players = ps; g.teams = ps.length === 4 ? [[ps[0], ps[2]], [ps[1], ps[3]]] : [[ps[0]], [ps[1]]];
    g.score = [0, 0]; g.dealer = crypto.randomInt(0, ps.length);
    tDeal(g);
  }

  const answered = g => humansIn(g.room).every(p => g.invited.has(p) || g.declined.has(p));
  // fim do convite: dá as cartas para quem aceitou (devolve um erro se ainda não dá para começar pelo botão)
  function begin(g, manual) {
    if (g.phase !== 'convite') return null;
    const here = humansIn(g.room), ps = [g.host, ...shuffle([...g.invited].filter(p => p !== g.host))].filter(p => here.includes(p));
    let n = ps.length;
    if (g.kind === 'truco') n = n >= 4 ? 4 : n >= 2 ? 2 : n; else n = Math.min(n, 10);
    if (n < 2) {
      if (manual) return 'Precisa de pelo menos 2 jogando.';
      clearTimeout(g.timer); g.phase = 'fim'; g.winner = null; g.prizes = {}; push(g); info(g, 'Pouca gente topou. Fica para a próxima!');
      setTimeout(() => { if (games.get(g.room) === g) games.delete(g.room); }, 60e3); return null;
    }
    clearTimeout(g.timer);
    g.players = ps.slice(0, n); g.phase = 'jogando';
    if (g.kind === 'malucas') mStart(g); else tStart(g);
    const out = ps.slice(n);
    info(g, `Começou! Na mesa: ${g.players.map(name).join(', ')}.${out.length ? ` (${out.map(name).join(', ')} ${out.length > 1 ? 'ficaram' : 'ficou'} de fora: o Truco é com 2 ou 4.)` : ''}`);
    push(g); return null;
  }
  function bind(socket, uid, on, ok, fail) {
    const room = () => socket.data.voice;
    on('cards:start', (d, cb) => {
      const r = room(); if (!r) return fail(cb, 'Entre numa call para jogar.');
      if ((games.has(r) && games.get(r).phase !== 'fim') || (otherBusy && otherBusy(r))) return fail(cb, 'Já tem um jogo rolando nesta call.');
      if (limited('cards:' + r, 3, 60e3)) return fail(cb, 'Espere um pouco para começar outro jogo.');
      const kind = d.kind === 'truco' ? 'truco' : 'malucas';
      if (humansIn(r).length < 2) return fail(cb, 'Precisa de pelo menos 2 pessoas na call.');
      // convite: quem quiser entra; ninguém é obrigado a jogar
      const g = { room: r, kind, host: uid, players: [], invited: new Set([uid]), declined: new Set(), phase: 'convite', lobbyEnds: now() + LOBBY_SECS * 1000, turn: 0, log: [], timer: null, ends: 0 };
      games.set(r, g);
      info(g, `${name(uid)} chamou a call para ${kind === 'truco' ? 'um Truco' : 'Cartas Malucas'}! Entre se quiser.`);
      g.timer = setTimeout(() => begin(g), LOBBY_SECS * 1000);
      log(`   Cartas: @${(db.users[uid] || {}).username} chamou ${kind}.`);
      push(g); ok(cb);
    });
    on('cards:join', (_, cb) => {
      const g = games.get(room()); if (!g || g.phase === 'fim') return fail(cb, 'Nenhum jogo nesta call.');
      if (g.phase !== 'convite') return fail(cb, 'As cartas já foram dadas. Espere a próxima partida.');
      g.invited.add(uid); g.declined.delete(uid); push(g); ok(cb);
      if (answered(g)) begin(g);
    });
    on('cards:decline', (_, cb) => {
      const g = games.get(room()); if (!g || g.phase !== 'convite') return ok(cb);
      if (uid === g.host) return fail(cb, 'Você chamou o jogo. Para cancelar, use o ⏹.');
      g.invited.delete(uid); g.declined.add(uid); push(g); ok(cb);
      if (answered(g)) begin(g);
    });
    // sair da mesa no meio (nas Cartas Malucas o jogo segue; no Truco a partida acaba)
    on('cards:leave', (_, cb) => {
      const g = games.get(room()); if (!g || g.phase === 'fim') return ok(cb);
      if (g.phase === 'convite') { if (uid !== g.host) { g.invited.delete(uid); g.declined.add(uid); push(g); } return ok(cb); }
      if (g.players.includes(uid)) onLeave(g.room, uid, true);
      ok(cb);
    });
    on('cards:begin', (_, cb) => {
      const g = games.get(room()); if (!g || g.phase !== 'convite') return fail(cb, 'O jogo já começou.');
      if (g.host !== uid) return fail(cb, 'Só quem chamou pode começar antes do tempo.');
      const e = begin(g, true); if (e) return fail(cb, e); ok(cb);
    });
    on('cards:get', (_, cb) => { const g = games.get(room()); ok(cb, { game: g ? view(g, uid) : null }); });
    on('cards:stop', (_, cb) => {
      const g = games.get(room()); if (!g || g.phase === 'fim') return fail(cb, 'Nenhum jogo nesta call.');
      // quem começou encerra; se essa pessoa já saiu da call, qualquer um da call pode encerrar
      if (g.host !== uid && humansIn(g.room).includes(g.host)) return fail(cb, `Só ${name(g.host)} (quem começou) pode encerrar. Você pode minimizar no ▁.`);
      end(g, null, `${name(uid)} encerrou o jogo.`); ok(cb);
    });
    const mine = cb => { const g = games.get(room()); if (!g || g.phase !== 'jogando' || !g.players.includes(uid)) { fail(cb, 'Você não está jogando agora.'); return null; } if (limited('cardsact:' + uid, 60, 10e3)) { fail(cb, 'Calma!'); return null; } return g; };
    // Cartas Malucas
    on('cards:play', (d, cb) => {
      const g = mine(cb); if (!g) return;
      if (g.kind === 'truco') {
        if (g.players[g.turn] !== uid) return fail(cb, 'Não é a sua vez.');
        if (g.ask) return fail(cb, 'Esperando a resposta do truco.');
        const e = tPlay(g, uid, str(d.id, 10)); if (e) return fail(cb, e); push(g); return ok(cb);
      }
      const e = mPlay(g, uid, d || {}); if (e) return fail(cb, e); push(g); ok(cb);
    });
    on('cards:draw', (_, cb) => {
      const g = mine(cb); if (!g) return; if (g.kind !== 'malucas') return fail(cb, 'Aqui não se compra carta.');
      if (g.players[g.turn] !== uid) return fail(cb, 'Não é a sua vez.');
      if (g.drawn) return fail(cb, 'Você já comprou. Jogue a carta ou passe.');
      const [c] = mDraw(g, uid, 1);
      if (c && playable(g, c)) g.drawn = c.id; else { mTurn(g, nextI(g)); }
      push(g); ok(cb, { card: c || null });
    });
    on('cards:pass', (_, cb) => {
      const g = mine(cb); if (!g) return; if (g.kind !== 'malucas' || g.players[g.turn] !== uid || !g.drawn) return fail(cb, 'Compre uma carta antes de passar.');
      mTurn(g, nextI(g)); push(g); ok(cb);
    });
    on('cards:last', (_, cb) => { // "Última carta!"
      const g = mine(cb); if (!g) return; if (g.kind !== 'malucas') return fail(cb, 'Só nas Cartas Malucas.');
      if (g.hands[uid].length > 2) return fail(cb, 'Só vale com 1 ou 2 cartas na mão.');
      g.saidLast[uid] = true; info(g, `📣 ${name(uid)} gritou: ÚLTIMA CARTA!`); push(g); ok(cb);
    });
    on('cards:catch', (d, cb) => { // pegou alguém que ficou com 1 carta sem avisar: compra 2
      const g = games.get(room()); if (!g || g.phase !== 'jogando' || g.kind !== 'malucas' || !g.players.includes(uid)) return fail(cb, 'Nada para pegar.');
      const t = str(d.uid, 40); if (t === uid || !g.hands[t] || g.hands[t].length !== 1 || g.saidLast[t]) return fail(cb, 'Não dá para pegar essa pessoa agora.');
      mDraw(g, t, 2); info(g, `🫵 ${name(uid)} pegou ${name(t)} sem avisar a última carta: comprou 2!`); push(g); ok(cb);
    });
    // Truco: pedir (truco/seis/nove/doze) e responder (aceitar, correr, aumentar)
    on('cards:truco', (d, cb) => {
      const g = mine(cb); if (!g) return; if (g.kind !== 'truco') return fail(cb, 'Só no Truco.');
      const team = teamOf(g, uid);
      if (d.answer) {
        if (!g.ask || g.ask.to !== team) return fail(cb, 'Ninguém pediu truco para a sua dupla.');
        if (d.answer === 'correr') { tRun(g, team); push(g); return ok(cb); }
        if (d.answer === 'aceitar') { g.value = g.ask.v; g.lastRaiseTeam = g.ask.from; info(g, `✅ ${name(uid)} aceitou! A mão vale ${g.value}.`); g.ask = null; tTurn(g, g.turn); push(g); return ok(cb); }
        if (d.answer === 'aumentar') {
          const nv = RAISE[g.ask.v]; if (!nv) return fail(cb, 'Já está no máximo (12).');
          g.value = g.ask.v; g.ask = { from: team, to: 1 - team, v: nv, by: uid };
          info(g, `🔥 ${name(uid)} pediu ${RAISE_NAME[nv]}!`); tTurn(g, g.turn); push(g); return ok(cb);
        }
        return fail(cb, 'Resposta inválida.');
      }
      if (g.ask) return fail(cb, 'Já tem um pedido esperando resposta.');
      if (g.players[g.turn] !== uid) return fail(cb, 'Só dá para pedir truco na sua vez.');
      const nv = RAISE[g.value]; if (!nv) return fail(cb, 'A mão já vale 12.');
      if (g.lastRaiseTeam === team) return fail(cb, 'Agora quem pode aumentar é a outra dupla.');
      if (g.score[0] >= 11 || g.score[1] >= 11) return fail(cb, 'Na mão de onze não tem truco.');
      g.ask = { from: team, to: 1 - team, v: nv, by: uid };
      info(g, `🔥 ${name(uid)} pediu ${RAISE_NAME[nv]}!`); tTurn(g, g.turn); push(g); ok(cb);
    });
  }
  function onLeave(room, uid, quit) {
    const g = games.get(room); if (!g || g.phase === 'fim') return;
    if (g.phase === 'convite') { if (!humansIn(room).length) { clearTimeout(g.timer); games.delete(room); } else if (answered(g)) begin(g); return; }
    if (!g.players.includes(uid)) return;
    if (g.kind === 'truco') return end(g, null, `${name(uid)} ${quit ? 'saiu da mesa' : 'saiu da call'}: o Truco acabou.`);
    // Cartas Malucas: a pessoa sai da mesa e o jogo segue
    const i = g.players.indexOf(uid), wasTurn = g.turn === i;
    g.players.splice(i, 1); g.deck.unshift(...g.hands[uid]); delete g.hands[uid];
    if (g.players.length < 2) return end(g, g.players.slice(), `${name(uid)} saiu: sobrou só ${g.players.length ? name(g.players[0]) : 'ninguém'}.`);
    if (g.turn > i || g.turn >= g.players.length) g.turn = (g.turn - (g.turn > i ? 1 : 0)) % g.players.length;
    info(g, `${name(uid)} saiu da mesa.`);
    if (wasTurn) mTurn(g, g.turn % g.players.length);
    push(g);
  }
  return { bind, onLeave, busy: r => games.has(r) && games.get(r).phase !== 'fim', _games: games, _handWinner: handWinner };
}
module.exports = { createCartas, malucasDeck, trucoDeck, RANKS, SUITS };
