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
  ['rico', '💰', 'Rico', 'Juntou 5.000 AnarchyPoints no total', 'pointsTotal', 5000, 500],
  ['apostador', '🎲', 'Apostador', 'Ganhou uma aposta', 'betWins', 1, 100],
  ['apelidado', '🏷️', 'Apelidado', 'O grupo votou um apelido para você', 'nicked', 1, 50],
  ['comprador', '🛒', 'Cliente fiel', 'Comprou algo na loja da semana', 'buys', 1, 100],
  ['artista', '🎨', 'Picasso da call', 'Ganhou uma partida de Desenha e adivinha', 'drawWins', 1, 150],
  ['sabichao', '🧠', 'Sabichão', 'Ganhou um Quiz na call', 'quizWins', 1, 150],
  ['carteado', '🃏', 'Rei do carteado', 'Ganhou 5 jogos de cartas na call', 'cardWins', 5, 300]
];
// conquistas que o Porteiro anuncia no grupo (as grandes)
const BIG = new Set(['tagarela', 'call100', 'lenda', 'rico', 'sortudo', 'caixa50']);
// Loja da semana: preço por raridade (efeitos de foto) e das placas de nome
const PRICE = { comum: 400, raro: 900, epico: 2000, lendario: 5000, mitico: 12000 }, PLATE_PRICE = 6000;
const PRENDAS = ['Cantar um trecho de música 🎤', 'Imitar alguém da call 🎭', 'Contar uma piada (ruim vale) 😂', 'Falar com sotaque até a próxima rodada 🗣️', 'Elogiar cada pessoa da call 💐',
  'Mandar o último meme que salvou 🖼️', 'Fazer barulho de animal 🐔', 'Contar uma vergonha leve 🙈', 'Ficar 1 minuto sem rir 😐', 'Escolher a próxima música do DJ 🎵',
  'Falar só rimando por 2 minutos 📜', 'Narrar o que acontece como locutor de futebol ⚽'];
// dia no horário de Brasília (a caixa diária vira à meia-noite daqui)
const day = ts => new Date(ts - 3 * 3600e3).toISOString().slice(0, 10);

function createDiversao({ db, save, newId, now, str, log, toUser, toUsers, canAccess, can, pushGroup, pushUser, selfUser, limited, voice, sockets, rollAvfx, AVFX, REFUND, PLATES, prizeTier, prizeItem }) {
  const txt = (v, n) => str(v, n).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim();
  const int = (v, lo, hi, d) => { const n = Math.round(+v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
  const findMsg = (cid, id) => (db.messages[cid] || []).find(m => m.id === id);
  // mensagem que sai para as pessoas: a bomba vai sem o texto (só quem abrir recebe, pelo bomb:open)
  // a fofoca vai sem quem mandou (só a moderação descobre, pelo gossip:who)
  const pubMsg = m => {
    if (!m) return m;
    if (m.bomb) m = { ...m, bomb: { secs: m.bomb.secs, opened: Object.keys(m.bomb.opened || {}) } };
    if (m.gossip) m = { ...m, gossip: { n: m.gossip.n } };
    return m;
  };

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
        if (BIG.has(id)) for (const g of Object.values(db.groups)) if (g.members.includes(u.id)) porteiro(g, `${u.displayName} acabou de ganhar a conquista **${name}** ${ACH.find(a => a[0] === id)[1]}! Respeita. 🫡`, 'ach:' + u.id + ':' + id, 0);
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

  /* ---------- Porteiro: comenta o que acontece no grupo (dá para desligar em cada grupo) ---------- */
  const portLast = new Map(); // chave -> última vez que falou disso
  const groupChan = g => (g.channels.find(c => c.id === g.welcomeCid && c.type === 'text') || g.channels.find(c => c.type === 'text'));
  function porteiro(g, text, key, cooldown = 2 * 3600e3) {
    if (!g || g.porteiro === false) return null;
    const k = g.id + ':' + key, t = now();
    if (cooldown && t - (portLast.get(k) || 0) < cooldown) return null;
    if (!cooldown && portLast.has(k)) return null;
    portLast.set(k, t);
    const ch = groupChan(g); if (!ch) return null;
    const msg = { id: newId(), cid: ch.id, authorId: null, content: text, image: null, ts: t, edited: null, reactions: {}, replyTo: null, system: 'porteiro' };
    const l = db.messages[ch.id] || (db.messages[ch.id] = []); l.push(msg); if (l.length > 3000) l.splice(0, l.length - 3000);
    toUsers(g.members, 'message:new', msg); save();
    return msg;
  }
  // hora de Brasília (0-23)
  const brHour = ts => (new Date(ts).getUTCHours() + 21) % 24;
  // alguém entrou numa call: som de entrada da pessoa (Central de Áudio do grupo) e o Porteiro contando as entradas do dia
  function onVoiceJoin(socket, uid, roomId, info) {
    const u = db.users[uid]; if (!u || u.bot || !info || info.kind !== 'group') return;
    const g = info.group, sid = u.joinSounds && u.joinSounds[g.id], snd = sid && g.sounds.find(s => s.id === sid);
    if (snd && !limited('joinsound:' + uid, 1, 20e3)) {
      const ev = { roomId, uid, id: snd.id, url: snd.url, name: snd.name, emoji: snd.emoji, volume: snd.volume, duration: snd.duration, entrance: true };
      setTimeout(() => { for (const s of (voice.get(roomId) || new Map()).keys()) { const sk = sockets.get(s); if (sk) sk.emit('sound:played', ev); } }, 900);
    }
    const today = day(now()); u.stats = u.stats || {};
    if (!u.stats.joins || u.stats.joins.d !== today) u.stats.joins = { d: today, n: 0 };
    const n = ++u.stats.joins.n;
    if (n === 5 || n === 10 || n === 20) porteiro(g, `${u.displayName} entrou na call pela ${n}ª vez hoje 👀`, 'joins:' + uid + ':' + n, 0);
  }
  // mensagem nova: o Porteiro manda dormir quem está acordado de madrugada
  function onMessage(uid, info) {
    const u = db.users[uid]; if (!u || u.bot || !info || info.kind !== 'group') return;
    const h = brHour(now());
    if (h >= 3 && h < 5) porteiro(info.group, `${u.displayName}, são ${h} da manhã. Vai dormir! 😴`, 'sono:' + uid, 20 * 3600e3);
  }

  /* ---------- varredura: enquetes vencidas, bombas velhas, avisos de eventos ---------- */
  // grupo silencioso à noite: o Porteiro chama o pessoal
  setInterval(() => {
    const t = now(), h = brHour(t); if (h < 19 || h > 22) return;
    for (const g of Object.values(db.groups)) {
      if (g.porteiro === false || g.members.length < 3) continue;
      const ch = groupChan(g); if (!ch) continue;
      const l = db.messages[ch.id] || []; const lastTs = l.length ? l[l.length - 1].ts : 0;
      const on = g.members.filter(m => db.users[m] && !db.users[m].bot && sockets && [...sockets.values()].some(s => s.data.uid === m)).length;
      if (on >= 2 && lastTs && t - lastTs > 6 * 3600e3) porteiro(g, `Faz ${Math.round((t - lastTs) / 3600e3)} horas que ninguém fala aqui... tem alguém vivo? 👀 Bora uma call?`, 'quieto', 24 * 3600e3);
    }
  }, 10 * 60e3).unref();
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

  /* ---------- loja da semana (a mesma para todo mundo; troca toda segunda à meia-noite de Brasília) ---------- */
  function shopNow() {
    const t = now() - 3 * 3600e3, monday = 4 * 864e5; // 1/1/1970 foi quinta: +4 dias acerta a semana na segunda
    const week = Math.floor((t - monday) / (7 * 864e5)), ends = (week + 1) * 7 * 864e5 + monday + 3 * 3600e3;
    let s = (week * 2654435761) >>> 0; const r = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    const pickTier = tier => { const pool = Object.keys(AVFX).filter(k => AVFX[k] === tier).sort(); return pool[Math.floor(r() * pool.length)]; };
    const avs = [...new Set(['raro', 'epico', 'epico', 'lendario', r() < .35 ? 'mitico' : 'lendario'].map(pickTier))];
    const plate = PLATES[Math.floor(r() * PLATES.length)];
    return { week, ends, items: [...avs.map(id => ({ kind: 'av', id, tier: AVFX[id], price: PRICE[AVFX[id]] })), { kind: 'plate', id: plate, tier: 'placa', price: PLATE_PRICE }] };
  }
  const owns = (u, it) => (u.items || []).some(x => x.item === (it.kind === 'av' ? 'av:' + it.id : it.id));

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
      const item = rollAvfx(), tier = prizeTier(item); // efeito de foto ou fundo animado
      u.items = u.items || [];
      const dup = u.items.some(x => x.item === prizeItem(item)), refund = dup ? REFUND[tier] : 0;
      if (!dup) u.items.push({ id: newId(), item: prizeItem(item), from: 'diaria', at: now(), seen: true });
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

    /* ----- apostas amistosas: cada um aposta AnarchyPoints numa opção; quem criou decide quem ganhou ----- */
    const betOf = d => { const info = canAccess(uid, str(d.cid, 40)); const m = info && findMsg(d.cid, str(d.id, 40)); return m && m.bet ? { info, m } : null; };
    const pushBet = (info, m) => { save(); toUsers(info.members, 'message:update', m); };
    on('bet:create', (d, cb) => {
      const info = canAccess(uid, str(d.cid, 40)); if (!info) return fail(cb, 'Sem acesso.');
      if (limited('bet:' + uid, 6, 60e3)) return fail(cb, 'Calma! Muitas apostas seguidas.');
      const q = txt(d.q, 160); if (!q) return fail(cb, 'Sobre o que é a aposta?');
      const opts = [...new Set((Array.isArray(d.opts) ? d.opts : []).map(o => txt(o, 60)).filter(Boolean))].slice(0, 6);
      if (opts.length < 2) return fail(cb, 'Coloque pelo menos 2 opções.');
      const msg = newMsg(info, d.cid, { bet: { q, opts: opts.map(t => ({ t, s: {} })), st: 'aberta', win: null } });
      save(); ok(cb, { id: msg.id });
    });
    on('bet:join', (d, cb) => {
      const b = betOf(d); if (!b) return fail(cb, 'Aposta não encontrada.');
      const { info, m } = b, bet = m.bet, u = me();
      if (bet.st !== 'aberta') return fail(cb, 'As apostas desta rodada já fecharam.');
      const k = int(d.opt, 0, bet.opts.length - 1, -1); if (k < 0) return fail(cb, 'Opção inválida.');
      const other = bet.opts.findIndex((o, i) => i !== k && o.s[uid]); if (other >= 0) return fail(cb, 'Você já apostou em outra opção.');
      const amt = int(d.amount, 10, 5000, 0); if (!amt) return fail(cb, 'Aposte de 10 a 5.000 pontos.');
      if ((u.points || 0) < amt) return fail(cb, `Você só tem ${(u.points || 0).toLocaleString('pt-BR')} pontos.`);
      u.points -= amt; bet.opts[k].s[uid] = (bet.opts[k].s[uid] || 0) + amt;
      toUser(uid, 'me:update', selfUser(u)); pushBet(info, m); ok(cb, { points: u.points });
    });
    const betJudge = (info, m) => m.authorId === uid || (info.kind === 'group' && can(info.group, uid, 'manageMessages'));
    on('bet:lock', (d, cb) => {
      const b = betOf(d); if (!b) return fail(cb, 'Aposta não encontrada.');
      if (!betJudge(b.info, b.m)) return fail(cb, 'Só quem criou a aposta pode fechar.');
      if (b.m.bet.st !== 'aberta') return fail(cb, 'Já está fechada.');
      b.m.bet.st = 'fechada'; pushBet(b.info, b.m); ok(cb);
    });
    // devolve tudo (cancelada ou ninguém acertou) ou divide o pote entre quem acertou, na proporção do que cada um apostou
    function payout(m, winIdx) {
      const bet = m.bet, all = bet.opts.flatMap(o => Object.entries(o.s)), pot = all.reduce((a, [, v]) => a + v, 0);
      const winners = winIdx === null ? [] : Object.entries(bet.opts[winIdx].s), wsum = winners.reduce((a, [, v]) => a + v, 0);
      const back = {};
      if (!wsum) for (const [u2, v] of all) back[u2] = (back[u2] || 0) + v;
      else for (const [u2, v] of winners) back[u2] = (back[u2] || 0) + Math.floor(pot * v / wsum);
      for (const [u2, v] of Object.entries(back)) { const x = db.users[u2]; if (!x) continue; x.points = (x.points || 0) + v; toUser(u2, 'me:update', selfUser(x)); }
      if (wsum) for (const [u2] of winners) track(u2, 'betWins');
      return { pot, back };
    }
    on('bet:resolve', (d, cb) => {
      const b = betOf(d); if (!b) return fail(cb, 'Aposta não encontrada.');
      if (!betJudge(b.info, b.m)) return fail(cb, 'Só quem criou a aposta decide quem ganhou.');
      const bet = b.m.bet; if (bet.st === 'paga' || bet.st === 'cancelada') return fail(cb, 'Essa aposta já acabou.');
      const cancel = !!d.cancel, k = cancel ? null : int(d.opt, 0, bet.opts.length - 1, -1);
      if (!cancel && k < 0) return fail(cb, 'Escolha a opção vencedora.');
      const r = payout(b.m, k);
      bet.st = cancel ? 'cancelada' : 'paga'; bet.win = k; bet.paid = r.back; bet.pot = r.pot;
      pushBet(b.info, b.m); ok(cb, r);
    });

    /* ----- apelidos votados: alguém sugere, o grupo vota; aprovado, vale por 7 dias ----- */
    on('nick:propose', (d, cb) => {
      const g = db.groups[str(d.gid, 40)]; if (!g || !g.members.includes(uid)) return fail(cb, 'Grupo não encontrado.');
      const target = str(d.uid, 40); if (!g.members.includes(target) || !db.users[target] || db.users[target].bot) return fail(cb, 'Essa pessoa não está no grupo.');
      const nick = txt(d.nick, 30); if (!nick) return fail(cb, 'Escreva o apelido.');
      if (limited('nick:' + uid, 5, 3600e3)) return fail(cb, 'Muitas sugestões seguidas. Espere um pouco.');
      const ch = groupChan(g); if (!ch) return fail(cb, 'O grupo não tem canal de texto.');
      const humans = g.members.filter(m => db.users[m] && !db.users[m].bot).length;
      const need = Math.max(2, Math.min(5, Math.ceil(humans * 0.34)));
      const info = canAccess(uid, ch.id);
      const msg = newMsg(info, ch.id, { nick: { target, nick, votes: [uid], need, done: false, at: now() } });
      save(); ok(cb, { id: msg.id, cid: ch.id });
    });
    on('nick:vote', (d, cb) => {
      const info = canAccess(uid, str(d.cid, 40)); const m = info && findMsg(d.cid, str(d.id, 40));
      if (!m || !m.nick || info.kind !== 'group') return fail(cb, 'Votação não encontrada.');
      const n = m.nick; if (n.done) return fail(cb, 'Essa votação já acabou.');
      if (now() - n.at > 2 * 864e5) return fail(cb, 'Essa votação expirou.');
      n.votes = n.votes.includes(uid) ? n.votes.filter(x => x !== uid) : [...n.votes, uid];
      if (n.votes.length >= n.need) {
        n.done = true; const g = info.group;
        g.nicks = g.nicks && typeof g.nicks === 'object' ? g.nicks : {};
        g.nicks[n.target] = { nick: n.nick, until: now() + 7 * 864e5 };
        track(n.target, 'nicked');
        pushGroup(g);
        porteiro(g, `O grupo decidiu: ${(db.users[n.target] || {}).displayName} agora é **“${n.nick}”** por 7 dias. 🏷️`, 'nick:' + m.id, 0);
      }
      save(); toUsers(info.members, 'message:update', m); ok(cb);
    });

    /* ----- som de entrada: um som da Central de Áudio do grupo toca quando você entra numa call dele ----- */
    on('joinsound:set', (d, cb) => {
      const g = db.groups[str(d.gid, 40)], u = me(); if (!g || !g.members.includes(uid)) return fail(cb, 'Grupo não encontrado.');
      const id = d.id ? str(d.id, 40) : null; if (id && !g.sounds.some(s => s.id === id)) return fail(cb, 'Som não encontrado.');
      u.joinSounds = { ...(u.joinSounds || {}) }; if (id) u.joinSounds[g.id] = id; else delete u.joinSounds[g.id];
      save(); toUser(uid, 'me:update', selfUser(u)); ok(cb);
    });
    // ligar/desligar os comentários do Porteiro no grupo
    /* ----- modo fofoca: mensagem anônima no grupo (só se quem gerencia ligar). A moderação pode ver quem mandou. ----- */
    on('fofoca:set', (d, cb) => {
      const g = db.groups[str(d.gid, 40)]; if (!g || !can(g, uid, 'manageServer')) return fail(cb, 'Só quem gerencia o grupo.');
      g.fofoca = !!d.on; save(); pushGroup(g); ok(cb);
      porteiro(g, g.fofoca ? 'O **modo fofoca** foi ligado. 🤫 Agora dá para mandar mensagem anônima pelo 🎉 do chat. (A moderação ainda consegue ver quem mandou, então nada de maldade!)' : 'O modo fofoca foi desligado. 🤐', 'fofoca:' + g.fofoca, 60e3);
    });
    on('gossip:send', (d, cb) => {
      const cid = str(d.cid, 40), info = canAccess(uid, cid);
      if (!info || info.kind !== 'group' || info.channel.type !== 'text') return fail(cb, 'A fofoca só vale em canal de texto de grupo.');
      const g = info.group; if (!g.fofoca) return fail(cb, 'O modo fofoca está desligado neste grupo.');
      const c = txt(d.text, 500); if (!c) return fail(cb, 'Escreva a fofoca.');
      if (limited('fofoca:' + uid, 3, 10 * 60e3)) return fail(cb, 'Muita fofoca! Espere uns minutos. 🤫');
      g.fofocaN = (g.fofocaN || 0) + 1;
      const msg = { id: newId(), cid, authorId: null, content: c, image: null, ts: now(), edited: null, reactions: {}, replyTo: null, system: 'fofoca', gossip: { by: uid, n: g.fofocaN } };
      const list = db.messages[cid] || (db.messages[cid] = []); list.push(msg); if (list.length > 3000) list.splice(0, list.length - 3000);
      toUsers(info.members, 'message:new', pubMsg(msg));
      save(); ok(cb, { id: msg.id }); // sem conquista: ela apareceria no perfil e entregaria quem fofoca
    });
    on('gossip:who', (d, cb) => {
      const info = canAccess(uid, str(d.cid, 40)); const m = info && findMsg(d.cid, str(d.id, 40));
      if (!m || !m.gossip) return fail(cb, 'Fofoca não encontrada.');
      if (info.kind !== 'group' || !can(info.group, uid, 'manageMessages')) return fail(cb, 'Só a moderação (Gerenciar mensagens) pode ver.');
      log(`   Fofoca: @${(me() || {}).username} viu quem mandou a fofoca #${m.gossip.n} em ${info.group.name}.`);
      ok(cb, { uid: m.gossip.by, name: (db.users[m.gossip.by] || {}).displayName || 'alguém' });
    });

    on('porteiro:set', (d, cb) => {
      const g = db.groups[str(d.gid, 40)]; if (!g || !can(g, uid, 'manageServer')) return fail(cb, 'Só quem gerencia o grupo.');
      g.porteiro = d.on !== false; save(); pushGroup(g); ok(cb);
    });

    /* ----- loja da semana: efeitos e uma placa que só ficam à venda até domingo ----- */
    on('shop:get', (_, cb) => { const s = shopNow(), u = me(); ok(cb, { ...s, items: s.items.map(it => ({ ...it, owned: owns(u, it) })) }); });
    on('shop:buy', (d, cb) => {
      const s = shopNow(), it = s.items.find(x => x.id === str(d.id, 60)), u = me();
      if (!it) return fail(cb, 'Esse item não está mais à venda.');
      if (owns(u, it)) return fail(cb, 'Você já tem esse item.');
      if ((u.points || 0) < it.price) return fail(cb, `Faltam ${(it.price - (u.points || 0)).toLocaleString('pt-BR')} pontos.`);
      u.points -= it.price; u.items = u.items || [];
      u.items.push({ id: newId(), item: it.kind === 'av' ? 'av:' + it.id : it.id, from: 'loja', at: now(), seen: it.kind === 'av' });
      u.stats = u.stats || {}; u.stats.buys = (u.stats.buys || 0) + 1; check(u);
      save(); pushUser(uid); log(`   Loja: @${u.username} comprou ${it.id} por ${it.price}.`);
      ok(cb, { points: u.points });
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

  return { bind, pubMsg, track, check, onVoiceJoin, onMessage, porteiro, ACH: ACH.map(([id, emoji, name, desc, k, goal, reward]) => ({ id, emoji, name, desc, k, goal, reward })), day };
}

module.exports = { createDiversao };
