// Diversão do Anarchy: enquetes, mensagem-bomba, conquistas, caixa diária, atividade ("jogando..."), eventos do grupo,
// roleta da call e retrospectiva do mês. Tudo decidido aqui no servidor (votos, sorteios, prêmios); a tela só desenha.
//
// Onde fica cada coisa (persistido pelo store.js):
//   mensagens: m.poll (enquete) e m.bomb (mensagem-bomba: o texto fica em m.bomb.c e NUNCA vai para quem não abriu)
//   usuário:   u.ach (conquistas: id -> data), u.stats (contadores), u.daily (caixa diária), u.activity (o que está fazendo)
//   grupo:     g.events (eventos com data, quem vai e avisos)
const crypto = require('crypto');

// [id, emoji, nome, descrição, contador, meta, prêmio em AnarchyPoints]
const ACH = [
  ['primeira', '💬', 'Primeira palavra', 'Mandou a primeira mensagem', 'msgs', 1, 50],
  ['falante', '📣', 'Falante', 'Mandou 100 mensagens', 'msgs', 100, 150],
  ['tagarela', '🗣️', 'Tagarela', 'Mandou 1.000 mensagens', 'msgs', 1000, 500],
  ['call1', '🎧', 'Primeira hora', 'Ficou 1 hora em call com amigos', 'callMin', 60, 100],
  ['call10', '📞', 'Grudado na call', 'Ficou 10 horas em call', 'callMin', 600, 300],
  ['call100', '🏠', 'Mora na call', 'Ficou 100 horas em call', 'callMin', 6000, 1000],
  ['caixa1', '📦', 'Curioso', 'Abriu a primeira caixa', 'boxes', 1, 50],
  ['caixa50', '🎰', 'Viciado em caixas', 'Abriu 50 caixas', 'boxes', 50, 400],
  ['sortudo', '🍀', 'Sortudo', 'Tirou um efeito lendário ou mítico', 'luck', 1, 300],
  ['enquete', '📊', 'Pesquisador', 'Criou uma enquete', 'polls', 1, 50],
  ['eleitor', '🗳️', 'Eleitor', 'Votou em 20 enquetes', 'votes', 20, 100],
  ['bomba', '💣', 'Explosivo', 'Mandou uma mensagem-bomba', 'bombs', 1, 50],
  ['fiel', '🔥', 'Fiel', 'Pegou a caixa diária 7 dias seguidos', 'streakMax', 7, 300],
  ['lenda', '👑', 'Lenda', 'Pegou a caixa diária 30 dias seguidos', 'streakMax', 30, 1000],
  ['destino', '🎡', 'Destino', 'Girou a roleta da call', 'spins', 1, 50],
  ['organizador', '📅', 'Organizador', 'Criou um evento no grupo', 'events', 1, 100],
  ['reator', '😂', 'Reage a tudo', 'Deu 100 reações', 'reacts', 100, 150],
  ['rico', '💰', 'Rico', 'Juntou 5.000 AnarchyPoints no total', 'pointsTotal', 5000, 500]
];
const PRENDAS = ['Cantar um trecho de música 🎤', 'Imitar alguém da call 🎭', 'Contar uma piada (ruim vale) 😂', 'Falar com sotaque até a próxima rodada 🗣️', 'Elogiar cada pessoa da call 💐',
  'Mandar o último meme que salvou 🖼️', 'Fazer barulho de animal 🐔', 'Contar uma vergonha leve 🙈', 'Ficar 1 minuto sem rir 😐', 'Escolher a próxima música do DJ 🎵',
  'Falar só rimando por 2 minutos 📜', 'Narrar o que acontece como locutor de futebol ⚽'];
// dia no horário de Brasília (a caixa diária vira à meia-noite daqui)
const day = ts => new Date(ts - 3 * 3600e3).toISOString().slice(0, 10);

function createDiversao({ db, save, newId, now, str, log, toUser, toUsers, canAccess, can, pushGroup, pushUser, selfUser, limited, voice, rollAvfx, AVFX, REFUND }) {
  const txt = (v, n) => str(v, n).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim();
  const int = (v, lo, hi, d) => { const n = Math.round(+v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
  const findMsg = (cid, id) => (db.messages[cid] || []).find(m => m.id === id);
  // mensagem que sai para as pessoas: a bomba vai sem o texto (só quem abrir recebe, pelo bomb:open)
  const pubMsg = m => (m && m.bomb ? { ...m, bomb: { secs: m.bomb.secs, opened: Object.keys(m.bomb.opened || {}) } } : m);

  /* ---------- conquistas ---------- */
  function statOf(u, k) { if (k === 'pointsTotal') return u.pointsTotal || 0; if (k === 'boxes') return u.boxes || 0; return (u.stats && u.stats[k]) || 0; }
  function check(u) {
    if (!u || u.bot) return false;
    u.ach = u.ach || {};
    let any = false, again = true;
    while (again) {
      again = false;
      for (const [id, , name, , k, goal, reward] of ACH) {
        if (u.ach[id] || statOf(u, k) < goal) continue;
        u.ach[id] = now(); any = again = true;
        u.points = (u.points || 0) + reward; u.pointsTotal = (u.pointsTotal || 0) + reward;
        toUser(u.id, 'ach:new', { id, reward, points: u.points });
        log(`   Conquista: @${u.username} ganhou "${name}".`);
      }
    }
    return any;
  }
  // soma num contador e confere conquistas (quem chama salva)
  function track(uid, k, n = 1) {
    const u = db.users[uid]; if (!u || u.bot) return;
    u.stats = u.stats || {}; u.stats[k] = (u.stats[k] || 0) + n;
    if (check(u)) toUser(uid, 'me:update', selfUser(u));
  }

  /* ---------- varredura: enquetes vencidas, bombas velhas, avisos de eventos ---------- */
  setInterval(() => {
    let changed = false; const t = now();
    for (const [cid, list] of Object.entries(db.messages)) {
      let info = null;
      for (const m of list.slice()) {
        if (m.poll && !m.poll.closed && m.poll.ends && m.poll.ends <= t) { m.poll.closed = true; changed = true; info = info || canAccess(m.authorId, cid); if (info) toUsers(info.members, 'message:update', m); }
        if (m.bomb && t - m.ts > 24 * 3600e3) { db.messages[cid] = db.messages[cid].filter(x => x !== m); changed = true; info = info || canAccess(m.authorId, cid); if (info) toUsers(info.members, 'message:delete', { cid, id: m.id }); }
      }
    }
    for (const g of Object.values(db.groups)) {
      if (!Array.isArray(g.events) || !g.events.length) continue;
      for (const e of g.events) {
        if (!e.n1 && e.at - t <= 10 * 60e3 && e.at > t) { e.n1 = 1; changed = true; toUsers(e.going, 'event:remind', { gid: g.id, id: e.id, title: e.title, emoji: e.emoji, mins: Math.max(1, Math.round((e.at - t) / 60e3)) }); }
        if (!e.n2 && t >= e.at) {
          e.n2 = 1; changed = true;
          // aviso no chat do grupo (canal de boas-vindas ou o primeiro de texto)
          const ch = g.channels.find(c => c.id === g.welcomeCid && c.type === 'text') || g.channels.find(c => c.type === 'text');
          if (ch) {
            const msg = { id: newId(), cid: ch.id, authorId: e.by, content: `${e.emoji || '🎉'} ${e.title}`, image: null, ts: t, edited: null, reactions: {}, replyTo: null, system: 'event' };
            const l = db.messages[ch.id] || (db.messages[ch.id] = []); l.push(msg);
            toUsers(g.members, 'message:new', msg);
          }
          toUsers(e.going, 'event:start', { gid: g.id, id: e.id, title: e.title, emoji: e.emoji });
        }
      }
      const before = g.events.length;
      g.events = g.events.filter(e => t - e.at < 864e5); // somem um dia depois de começar
      if (g.events.length !== before) { changed = true; pushGroup(g); }
    }
    if (changed) save();
  }, 30e3).unref();

  /* ---------- eventos do Socket.IO ---------- */
  function bind(socket, uid, on, ok, fail) {
    const me = () => db.users[uid];
    const newMsg = (info, cid, extra) => {
      const msg = { id: newId(), cid, authorId: uid, content: '', image: null, ts: now(), edited: null, reactions: {}, replyTo: null, ...extra };
      const list = db.messages[cid] || (db.messages[cid] = []);
      list.push(msg); if (list.length > 3000) list.splice(0, list.length - 3000);
      toUsers(info.members, 'message:new', pubMsg(msg));
      if (info.kind === 'dm') toUsers(info.members, 'dm:update', { ...info.dm, last: msg.ts });
      return msg;
    };

    // enquete: pergunta, de 2 a 10 opções, uma ou várias escolhas, prazo opcional
    on('poll:create', (d, cb) => {
      const info = canAccess(uid, str(d.cid, 40)); if (!info) return fail(cb, 'Sem acesso.');
      if (limited('poll:' + uid, 6, 60e3)) return fail(cb, 'Calma! Muitas enquetes seguidas.');
      const q = txt(d.q, 200); if (!q) return fail(cb, 'Escreva a pergunta.');
      const opts = [...new Set((Array.isArray(d.opts) ? d.opts : []).map(o => txt(o, 80)).filter(Boolean))].slice(0, 10);
      if (opts.length < 2) return fail(cb, 'Coloque pelo menos 2 opções.');
      const mins = int(d.mins, 0, 7 * 24 * 60, 0);
      const msg = newMsg(info, d.cid, { poll: { q, opts: opts.map(t => ({ t, v: [] })), multi: !!d.multi, ends: mins ? now() + mins * 60e3 : null, closed: false } });
      track(uid, 'polls'); save(); ok(cb, { message: msg });
    });
    on('poll:vote', (d, cb) => {
      const info = canAccess(uid, str(d.cid, 40)); const m = info && findMsg(d.cid, str(d.id, 40));
      if (!m || !m.poll) return fail(cb, 'Enquete não encontrada.');
      if (m.poll.closed || (m.poll.ends && m.poll.ends <= now())) return fail(cb, 'Esta enquete já terminou.');
      const k = int(d.opt, 0, m.poll.opts.length - 1, -1); if (k < 0) return fail(cb, 'Opção inválida.');
      const voted = m.poll.opts.some(o => o.v.includes(uid)), o = m.poll.opts[k], mine = o.v.includes(uid);
      if (!m.poll.multi) m.poll.opts.forEach(x => { x.v = x.v.filter(y => y !== uid); });
      if (mine) o.v = o.v.filter(y => y !== uid); else o.v.push(uid);
      if (!voted && !mine) track(uid, 'votes');
      save(); toUsers(info.members, 'message:update', m); ok(cb);
    });
    on('poll:close', (d, cb) => {
      const info = canAccess(uid, str(d.cid, 40)); const m = info && findMsg(d.cid, str(d.id, 40));
      if (!m || !m.poll) return fail(cb, 'Enquete não encontrada.');
      if (m.authorId !== uid && !(info.kind === 'group' && can(info.group, uid, 'manageMessages'))) return fail(cb, 'Só quem criou pode encerrar.');
      m.poll.closed = true; save(); toUsers(info.members, 'message:update', m); ok(cb);
    });

    // mensagem-bomba: só quem abre recebe o texto, que explode depois de alguns segundos.
    // Quando todo mundo abriu (ou depois de 24 h), some do chat de vez.
    on('bomb:send', (d, cb) => {
      const info = canAccess(uid, str(d.cid, 40)); if (!info) return fail(cb, 'Sem acesso.');
      if (limited('bomb:' + uid, 6, 60e3)) return fail(cb, 'Calma com as bombas!');
      const c = txt(d.text, 1000); if (!c) return fail(cb, 'Escreva a mensagem.');
      const msg = newMsg(info, d.cid, { bomb: { c, secs: int(d.secs, 3, 60, 10), opened: {} } });
      track(uid, 'bombs'); save(); ok(cb, { id: msg.id });
    });
    on('bomb:open', (d, cb) => {
      const info = canAccess(uid, str(d.cid, 40)); const m = info && findMsg(d.cid, str(d.id, 40));
      if (!m || !m.bomb) return fail(cb, 'Essa bomba já explodiu.');
      if (m.authorId !== uid) {
        if (m.bomb.opened[uid]) return fail(cb, 'Você já abriu essa. Ela explodiu! 💥');
        m.bomb.opened[uid] = now(); save();
        toUsers(info.members, 'message:update', pubMsg(m));
        const others = info.members.filter(x => x !== m.authorId && db.users[x] && !db.users[x].bot);
        if (others.every(x => m.bomb.opened[x])) setTimeout(() => {
          if (!db.messages[d.cid] || !db.messages[d.cid].includes(m)) return;
          db.messages[d.cid] = db.messages[d.cid].filter(x => x !== m); save();
          toUsers(info.members, 'message:delete', { cid: d.cid, id: m.id });
        }, (m.bomb.secs + 3) * 1000);
      }
      ok(cb, { text: m.bomb.c, secs: m.bomb.secs });
    });

    // caixa diária grátis (com sequência de dias seguidos e bônus de pontos)
    on('daily:claim', (_, cb) => {
      const u = me(); if (!u) return fail(cb, 'Conta não encontrada.');
      const today = day(now()), yest = day(now() - 864e5);
      u.daily = u.daily || {};
      if (u.daily.last === today) return fail(cb, 'Você já pegou a caixa de hoje. Volte amanhã!');
      const streak = u.daily.last === yest ? (u.daily.streak || 0) + 1 : 1;
      u.daily = { last: today, streak, max: Math.max(u.daily.max || 0, streak) };
      const item = rollAvfx(), tier = AVFX[item];
      u.items = u.items || [];
      const dup = u.items.some(x => x.item === 'av:' + item), refund = dup ? REFUND[tier] : 0;
      if (!dup) u.items.push({ id: newId(), item: 'av:' + item, from: 'diaria', at: now(), seen: true });
      const bonus = Math.min(100, streak * 10);
      u.points = (u.points || 0) + refund + bonus; u.pointsTotal = (u.pointsTotal || 0) + bonus;
      u.boxLog = [...(u.boxLog || []), { item, at: now(), dup, daily: true }].slice(-60);
      u.stats = u.stats || {}; u.stats.streakMax = Math.max(u.stats.streakMax || 0, streak);
      if (tier === 'lendario' || tier === 'mitico') u.stats.luck = (u.stats.luck || 0) + 1;
      check(u); save(); toUser(uid, 'me:update', selfUser(u));
      ok(cb, { item, tier, dup, refund, bonus, streak, points: u.points });
    });

    // o que você está fazendo agora ("🎮 Jogando Valorant"); some sozinho depois de 12 horas
    on('activity:set', (d, cb) => {
      const u = me(); if (!u) return fail(cb, 'Conta não encontrada.');
      const text = txt(d.text, 40);
      u.activity = text ? { text, emoji: txt(d.emoji, 8) || '🎮', at: now() } : null;
      save(); pushUser(uid); ok(cb);
    });

    // eventos do grupo: qualquer membro marca; quem vai recebe aviso 10 minutos antes e quando começa
    const groupOf = gid => { const g = db.groups[str(gid, 40)]; return g && g.members.includes(uid) ? g : null; };
    on('event:create', (d, cb) => {
      const g = groupOf(d.gid); if (!g) return fail(cb, 'Grupo não encontrado.');
      if (limited('event:' + uid, 10, 3600e3)) return fail(cb, 'Muitos eventos seguidos. Espere um pouco.');
      const title = txt(d.title, 60); if (!title) return fail(cb, 'Dê um nome ao evento.');
      const at = +d.at; if (!Number.isFinite(at) || at < now() - 60e3 || at > now() + 365 * 864e5) return fail(cb, 'Escolha uma data no futuro.');
      g.events = Array.isArray(g.events) ? g.events : [];
      if (g.events.length >= 30) return fail(cb, 'Limite de 30 eventos marcados neste grupo.');
      const e = { id: newId(), title, desc: txt(d.desc, 300), emoji: txt(d.emoji, 8) || '🎉', at, by: uid, going: [uid], n1: 0, n2: 0 };
      g.events.push(e); g.events.sort((a, b) => a.at - b.at);
      track(uid, 'events'); save(); pushGroup(g); ok(cb, { id: e.id });
    });
    on('event:rsvp', (d, cb) => {
      const g = groupOf(d.gid); const e = g && (g.events || []).find(x => x.id === str(d.id, 40));
      if (!e) return fail(cb, 'Evento não encontrado.');
      e.going = e.going.filter(x => x !== uid); if (d.go) e.going.push(uid);
      save(); pushGroup(g); ok(cb);
    });
    on('event:delete', (d, cb) => {
      const g = groupOf(d.gid); const e = g && (g.events || []).find(x => x.id === str(d.id, 40));
      if (!e) return fail(cb, 'Evento não encontrado.');
      if (e.by !== uid && !can(g, uid, 'manageServer')) return fail(cb, 'Só quem criou (ou quem gerencia o grupo) pode apagar.');
      g.events = g.events.filter(x => x !== e); save(); pushGroup(g); ok(cb);
    });

    // roleta da call: sorteia alguém da call (com prenda opcional) ou uma das opções escritas. Todo mundo vê girar.
    on('roulette:spin', (d, cb) => {
      const room = socket.data.voice; const peers = room && voice.get(room);
      if (!peers) return fail(cb, 'Entre numa call para girar a roleta.');
      if (limited('roleta:' + room, 1, 8e3)) return fail(cb, 'Espere a roleta parar!');
      const people = [...new Set([...peers.values()].map(s => s.uid))].filter(id => db.users[id] && !db.users[id].bot);
      let items, kind = d.mode === 'opcoes' ? 'opcoes' : 'pessoa';
      if (kind === 'opcoes') { items = [...new Set((Array.isArray(d.opts) ? d.opts : []).map(o => txt(o, 40)).filter(Boolean))].slice(0, 12); if (items.length < 2) return fail(cb, 'Escreva pelo menos 2 opções.'); }
      else { if (people.length < 2) return fail(cb, 'Precisa de pelo menos 2 pessoas na call.'); items = people; }
      const win = crypto.randomInt(0, items.length);
      const prenda = kind === 'pessoa' && d.prenda ? PRENDAS[crypto.randomInt(0, PRENDAS.length)] : null;
      toUsers(people, 'roulette:spin', { room, by: uid, kind, items, win, prenda, title: txt(d.title, 60) });
      track(uid, 'spins'); save(); ok(cb);
    });

    // retrospectiva do mês de um grupo: quem mais falou, mensagem com mais reações, emoji preferido, dia mais agitado...
    on('retro:get', (d, cb) => {
      const g = groupOf(d.gid); if (!g) return fail(cb, 'Grupo não encontrado.');
      const ym = /^\d{4}-\d{2}$/.test(d.ym) ? d.ym : day(now()).slice(0, 7);
      const [y, mo] = ym.split('-').map(Number), from = Date.UTC(y, mo - 1, 1) + 3 * 3600e3, to = Date.UTC(y, mo, 1) + 3 * 3600e3;
      const by = {}, days = {}, emo = {}, music = {}; let total = 0, best = null, bestN = 0, images = 0, polls = 0;
      for (const ch of g.channels.filter(c => c.type === 'text')) for (const m of db.messages[ch.id] || []) {
        if (m.ts < from || m.ts >= to || m.system || m.bomb) continue;
        const a = db.users[m.authorId]; if (!a || a.bot) { if (m.music) music[m.music.title] = (music[m.music.title] || 0) + 1; continue; }
        total++; by[m.authorId] = (by[m.authorId] || 0) + 1;
        const dk = day(m.ts); days[dk] = (days[dk] || 0) + 1;
        if (m.image || m.gif || m.sticker) images++;
        if (m.poll) polls++;
        let n = 0; for (const [e, us] of Object.entries(m.reactions || {})) { n += us.length; emo[e] = (emo[e] || 0) + us.length; }
        if (n > bestN) { bestN = n; best = m; }
      }
      const top = (o, k) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, k);
      const call = g.members.map(id => db.users[id]).filter(u => u && !u.bot).map(u => [u.id, (u.stats && u.stats.callMin) || 0]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
      ok(cb, { ym, group: g.name, total, images, polls, people: Object.keys(by).length,
        talkers: top(by, 5), day: top(days, 1)[0] || null, emoji: top(emo, 3),
        best: best ? { by: best.authorId, text: (best.content || (best.image || best.gif ? '🖼️ imagem' : best.sticker ? '🗂️ figurinha' : best.poll ? '📊 ' + best.poll.q : '')).slice(0, 160), n: bestN, ts: best.ts } : null,
        music: top(music, 3), call });
    });
  }

  return { bind, pubMsg, track, check, ACH: ACH.map(([id, emoji, name, desc, , goal, reward]) => ({ id, emoji, name, desc, goal, reward })), day };
}

module.exports = { createDiversao };
