// RPG de Mesa: atividade opcional dentro de qualquer grupo (servidor) ou conversa do Anarchy.
// Não cria login, grupo ou membro novo: usa os membros do grupo/conversa e os cargos que já existem.
//
// Papéis numa campanha (valem só nela; não dão nenhum poder no grupo):
//   mestre     controla tudo da campanha
//   jogador    tem personagem, rola dados, move o próprio personagem
//   convidado  foi chamado pelo Mestre e pode entrar
//   espectador membro do grupo/conversa que só assiste
//
// Tempo real: Socket.IO (cada mesa aberta entra na sala da campanha). Antes de mandar qualquer coisa, o servidor
// confere de novo se a pessoa ainda pode ver a campanha e filtra o que só o Mestre pode ver (monstros escondidos,
// armadilhas, anotações, rolagens privadas). Dados: db.rpg (tabelas rpg_* no Supabase, ver store.js).
const crypto = require('crypto');
const { generate, KINDS, TILE_CHARS } = require('./rpg-mapas');

const LIM = { camps: 30, maps: 20, ents: 150, chars: 40, snaps: 10, events: 300, classes: 20, attrs: 8, inv: 60, skills: 40, conds: 12, players: 20 };
const STATES = ['ativa', 'pausada', 'encerrada'];
const ENT_KINDS = ['monstro', 'chefe', 'npc', 'objeto'];
const DEF_ATTRS = ['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR'];
const DEF_CLASSES = [
  ['Guerreiro', '⚔️', 'Linha de frente: aguenta pancada e bate forte.', 12, 0, { FOR: 2, CON: 1 }, 'Ataque poderoso\nSegundo fôlego'],
  ['Mago', '🔮', 'Magias de longo alcance, mas pouca vida.', 6, 12, { INT: 2, SAB: 1 }, 'Bola de fogo\nEscudo arcano'],
  ['Ladino', '🗡️', 'Furtivo e preciso, abre fechaduras e desarma armadilhas.', 8, 4, { DES: 2, CAR: 1 }, 'Ataque furtivo\nDesarmar armadilha'],
  ['Clérigo', '✨', 'Cura o grupo e enfrenta mortos-vivos.', 8, 10, { SAB: 2, CON: 1 }, 'Curar ferimentos\nBênção'],
  ['Arqueiro', '🏹', 'Ataca de longe com arco e flecha.', 10, 2, { DES: 2, SAB: 1 }, 'Tiro certeiro\nChuva de flechas'],
  ['Bardo', '🎵', 'Inspira os aliados e engana os inimigos.', 8, 8, { CAR: 2, DES: 1 }, 'Inspiração\nCanção de ninar']
];
const ATTR_MOD = v => Math.floor(((+v || 10) - 10) / 2);

function createRpg({ db, save, newId, now, str, log, toUser, toUsers, isUpload, can, pushGroup, limited, users }) {
  db.rpg = db.rpg || {};
  for (const k of ['camps', 'chars', 'maps', 'ents', 'events', 'snaps']) if (!db.rpg[k] || typeof db.rpg[k] !== 'object') db.rpg[k] = {};
  const R = db.rpg;

  /* ---------- utilidades ---------- */
  const txt = (v, n) => str(v, n).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim();
  const int = (v, lo, hi, d) => { const n = Math.round(+v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
  const num = (v, lo, hi, d) => { const n = +v; return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
  const img = v => (typeof v === 'string' && isUpload(v) ? v : null);
  const hex = (v, d = null) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : d);
  const emo = v => txt(v, 16) || null;
  const list = (v, max, fn) => (Array.isArray(v) ? v.slice(0, max).map(fn).filter(x => x !== null && x !== undefined && x !== '') : []);
  const byCamp = (coll, cid) => Object.values(coll).filter(x => x.campId === cid);
  const userName = uid => (users[uid] && users[uid].displayName) || 'Alguém';

  /* ---------- escopo (grupo ou conversa) e papéis ---------- */
  function scope(kind, id) {
    if (kind === 'g') { const g = db.groups[id]; return g ? { kind, id, group: g, members: g.members, on: !g.rpg || g.rpg.on !== false } : null; }
    if (kind === 'dm') { const d = db.dms[id]; return d ? { kind, id, members: d.members, on: true } : null; }
    return null;
  }
  const scopeOf = c => scope(c.scope, c.scopeId);
  function role(c, uid) {
    const s = c && scopeOf(c);
    if (!s || !s.on || !s.members.includes(uid)) return null;
    if (c.masterId === uid) return 'mestre';
    if (c.players.includes(uid)) return 'jogador';
    if (c.invited.includes(uid)) return 'convidado';
    return 'espectador';
  }
  const isM = (c, uid) => role(c, uid) === 'mestre';
  const isP = (c, uid) => ['mestre', 'jogador'].includes(role(c, uid));
  // quem pode criar campanha no grupo: todos (padrão) ou só quem tem a permissão "Criar campanhas de RPG"
  function canCreate(s, uid) {
    if (!s || !s.on || !s.members.includes(uid) || (users[uid] && users[uid].bot)) return false;
    if (s.kind === 'g' && s.group.rpg && s.group.rpg.who === 'perm') return can(s.group, uid, 'rpg');
    return true;
  }
  // apagar: o Mestre, quem criou, ou quem gerencia o grupo (moderação)
  const canDelete = (c, uid) => isM(c, uid) || (c.createdBy === uid && role(c, uid)) || (c.scope === 'g' && db.groups[c.scopeId] && can(db.groups[c.scopeId], uid, 'manageServer'));

  /* ---------- quem está com a mesa aberta ---------- */
  const viewers = new Map(); // campId -> Set(socket)
  function watch(sock, cid) { for (const [k, set] of viewers) if (k !== cid) set.delete(sock); if (!viewers.has(cid)) viewers.set(cid, new Set()); viewers.get(cid).add(sock); sock.data.rpg = cid; }
  function unwatch(sock) { for (const set of viewers.values()) set.delete(sock); sock.data.rpg = null; }
  // manda para cada pessoa com a mesa aberta; fn(uid, papel) devolve o que ela pode ver (undefined = nada)
  function emitCamp(c, ev, fn) {
    const set = viewers.get(c.id); if (!set) return;
    for (const sk of [...set]) {
      const uid = sk.data.uid, r = R.camps[c.id] && role(c, uid);
      if (!r || (r === 'espectador' && !c.rules.spect)) { set.delete(sk); sk.data.rpg = null; sk.emit('rpg:closed', { cid: c.id, why: r ? 'O Mestre fechou a mesa para quem só assiste.' : 'Você não tem mais acesso a esta campanha.' }); continue; }
      const data = typeof fn === 'function' ? fn(uid, r) : fn;
      if (data !== undefined) sk.emit(ev, data);
    }
  }
  // a lista de campanhas do grupo/conversa mudou: quem estiver olhando atualiza
  function touchScope(c) { const s = scopeOf(c); if (s) toUsers(s.members, 'rpg:list', { scope: c.scope, id: c.scopeId }); }

  /* ---------- o que cada um vê ---------- */
  function summary(c, uid) {
    return { id: c.id, scope: c.scope, scopeId: c.scopeId, name: c.name, desc: c.desc, cover: c.cover, state: c.state, masterId: c.masterId,
      players: c.players, invited: c.invited, maxPlayers: c.maxPlayers, open: c.open, createdAt: c.createdAt, createdBy: c.createdBy, role: role(c, uid),
      maps: byCamp(R.maps, c.id).length, chars: byCamp(R.chars, c.id).length };
  }
  function campView(c, r) {
    const { snapsCache, ...rest } = c;
    return { ...rest, role: r, kinds: KINDS };
  }
  function mapView(m, r) {
    if (!m) return null;
    if (r === 'mestre') return m;
    return { ...m, traps: m.traps.filter(t => t.on), notes: undefined };
  }
  function entView(e, c, r) {
    if (r === 'mestre') return e;
    if (e.hidden) return undefined;
    const o = { id: e.id, campId: e.campId, mapId: e.mapId, kind: e.kind, name: e.name, img: e.img, emoji: e.emoji, size: e.size, x: e.x, y: e.y, conds: e.conds, color: e.color, level: e.level };
    if (c.rules.monsterHp || e.kind === 'npc' || e.kind === 'objeto') { o.hp = e.hp; o.hpMax = e.hpMax; }
    return o;
  }
  const evView = (e, uid, r) => (!e.priv || r === 'mestre' || e.uid === uid ? e : undefined);
  function full(c, uid) {
    const r = role(c, uid);
    const maps = byCamp(R.maps, c.id).sort((a, b) => a.createdAt - b.createdAt);
    const cur = R.maps[c.mapId] || null;
    return {
      camp: campView(c, r),
      maps: maps.map(m => ({ id: m.id, name: m.name, kind: m.kind, w: m.w, h: m.h, bg: m.bg })),
      map: mapView(cur, r),
      ents: cur ? byCamp(R.ents, c.id).filter(e => e.mapId === cur.id).map(e => entView(e, c, r)).filter(Boolean) : [],
      chars: byCamp(R.chars, c.id),
      events: evList(c.id).slice(-150).map(e => evView(e, uid, r)).filter(Boolean),
      snaps: r === 'mestre' ? byCamp(R.snaps, c.id).sort((a, b) => b.at - a.at).map(s => ({ id: s.id, name: s.name, at: s.at, by: s.by })) : []
    };
  }

  /* ---------- histórico (rolagens e acontecimentos) ---------- */
  const evIdx = new Map(); // campId -> [eventos em ordem]
  for (const e of Object.values(R.events).sort((a, b) => a.ts - b.ts)) { if (!evIdx.has(e.campId)) evIdx.set(e.campId, []); evIdx.get(e.campId).push(e); }
  const evList = cid => evIdx.get(cid) || [];
  function addEvent(c, e) {
    const ev = { id: newId(), campId: c.id, ts: now(), uid: null, type: 'log', text: '', priv: false, ...e };
    R.events[ev.id] = ev;
    if (!evIdx.has(c.id)) evIdx.set(c.id, []);
    const arr = evIdx.get(c.id); arr.push(ev);
    while (arr.length > LIM.events) delete R.events[arr.shift().id];
    emitCamp(c, 'rpg:event', (uid, r) => evView(ev, uid, r));
    return ev;
  }
  const say = (c, text, extra = {}) => addEvent(c, { type: 'log', text: txt(text, 400), ...extra });

  /* ---------- dados: "2d20+5", "d100", "4d6kh3" (fica com os 3 maiores), "2d20kl1" (o menor) ---------- */
  function roll(expr) {
    const src = String(expr || '').toLowerCase().replace(/\s+/g, '').replace(/^\+/, '');
    if (!src || src.length > 60) throw new Error('Escreva uma rolagem, por exemplo 1d20+3 ou 2d6.');
    const terms = src.match(/[+-]?[^+-]+/g) || [];
    if (!terms.length || terms.length > 10 || terms.join('') !== src) throw new Error('Não entendi essa rolagem. Exemplos: 1d20+5, 2d6+1d4, 4d6kh3.');
    let total = 0, dice = 0; const parts = [];
    for (const t of terms) {
      const sign = t[0] === '-' ? -1 : 1, body = t.replace(/^[+-]/, '');
      let m;
      if ((m = /^(\d*)d(\d+|%)(?:(kh|kl)(\d+))?$/.exec(body))) {
        const n = m[1] === '' ? 1 : +m[1], sides = m[2] === '%' ? 100 : +m[2];
        if (n < 1 || n > 100) throw new Error('Use de 1 a 100 dados por vez.');
        if (sides < 2 || sides > 1000) throw new Error('Os dados vão de d2 a d1000.');
        dice += n; if (dice > 200) throw new Error('Dados demais numa rolagem só.');
        const rolls = Array.from({ length: n }, () => crypto.randomInt(1, sides + 1));
        let kept = rolls.map((v, i) => i);
        if (m[3]) {
          const k = Math.max(1, Math.min(n, +m[4]));
          kept = rolls.map((v, i) => [v, i]).sort((a, b) => (m[3] === 'kh' ? b[0] - a[0] : a[0] - b[0])).slice(0, k).map(x => x[1]);
        }
        const sum = kept.reduce((s, i) => s + rolls[i], 0) * sign;
        total += sum;
        parts.push({ t: (sign < 0 ? '-' : '') + body, sides, rolls, kept, sum });
      } else if (/^\d{1,5}$/.test(body)) {
        total += sign * +body; parts.push({ t: (sign < 0 ? '-' : '+') + body, mod: sign * +body });
      } else throw new Error('Não entendi "' + body + '". Exemplos: 1d20+5, 2d6, d100, 4d6kh3.');
    }
    if (!dice) throw new Error('Coloque pelo menos um dado (ex.: 1d20).');
    const one = parts.length === 1 && parts[0].rolls && parts[0].rolls.length === 1 && parts[0].sides === 20 ? parts[0].rolls[0] : null;
    return { expr: src, total, parts, crit: one === 20, fail: one === 1 };
  }

  /* ---------- limpeza dos dados recebidos ---------- */
  function cleanClass(x, i) {
    if (!x || typeof x !== 'object') return null;
    const name = txt(x.name, 32); if (!name) return null;
    const mods = {}; for (const [k, v] of Object.entries(x.mods || {})) { const kk = txt(k, 6).toUpperCase(); if (kk) mods[kk] = int(v, -10, 10, 0); }
    return { id: txt(x.id, 24) || newId(), name, icon: emo(x.icon) || '🛡️', desc: txt(x.desc, 300), hp: int(x.hp, 1, 999, 8), mp: int(x.mp, 0, 999, 0), mods, skills: txt(x.skills, 800) };
  }
  function cleanRules(v, old = {}) {
    const o = v && typeof v === 'object' ? v : {};
    const b = (k, d) => (k in o ? !!o[k] : (k in old ? !!old[k] : d));
    return { grid: b('grid', true), lock: b('lock', false), walls: b('walls', true), editOwn: b('editOwn', true), monsterHp: b('monsterHp', false), spect: b('spect', true) };
  }
  const cleanConds = v => list(v, LIM.conds, x => txt(x, 24));
  function cleanChar(d, old, c) {
    const attrs = {}; for (const a of c.attrs) attrs[a] = int(d.attrs && d.attrs[a], 1, 30, old ? (old.attrs[a] ?? 10) : 10);
    const hpMax = int(d.hpMax, 1, 9999, old ? old.hpMax : 10), mpMax = int(d.mpMax, 0, 9999, old ? old.mpMax : 0);
    return {
      name: txt(d.name, 40) || (old && old.name) || 'Aventureiro',
      classId: c.classes.some(k => k.id === d.classId) ? d.classId : (old ? old.classId : null),
      level: int(d.level, 1, 99, old ? old.level : 1),
      hpMax, hp: int(d.hp, -999, hpMax, old ? Math.min(old.hp, hpMax) : hpMax),
      mpMax, mp: int(d.mp, 0, mpMax, old ? Math.min(old.mp, mpMax) : mpMax),
      def: int(d.def, 0, 99, old ? old.def : 10),
      attrs,
      skills: txt(d.skills, 1500),
      inv: list(d.inv, LIM.inv, x => (x && txt(x.name, 40) ? { id: txt(x.id, 24) || newId(), name: txt(x.name, 40), qty: int(x.qty, 0, 9999, 1), note: txt(x.note, 120) } : null)),
      conds: cleanConds(d.conds),
      notes: txt(d.notes, 2000),
      img: img(d.img),
      color: hex(d.color, old ? old.color : '#6c7cff')
    };
  }
  function cleanEnt(d, old) {
    const hpMax = int(d.hpMax, 0, 99999, old ? old.hpMax : 10);
    return {
      kind: ENT_KINDS.includes(d.kind) ? d.kind : (old ? old.kind : 'monstro'),
      name: txt(d.name, 40) || (old && old.name) || 'Criatura',
      img: 'img' in d ? img(d.img) : (old ? old.img : null),
      emoji: 'emoji' in d ? emo(d.emoji) : (old ? old.emoji : '👾'),
      size: int(d.size, 1, 6, old ? old.size : 1),
      hpMax, hp: int(d.hp, -99999, hpMax, old ? Math.min(old.hp, hpMax) : hpMax),
      def: int(d.def, 0, 99, old ? old.def : 10), atk: int(d.atk, -20, 50, old ? old.atk : 0), level: int(d.level, 0, 99, old ? old.level : 1),
      init: int(d.init, -10, 20, old ? old.init : 0),
      conds: 'conds' in d ? cleanConds(d.conds) : (old ? old.conds : []),
      hidden: 'hidden' in d ? !!d.hidden : (old ? old.hidden : false),
      notes: txt(d.notes, 1000),
      color: hex(d.color, old ? old.color : (d.kind === 'chefe' ? '#ff3b3b' : d.kind === 'npc' ? '#3fb97a' : '#d9822b'))
    };
  }

  /* ---------- mapas ---------- */
  function newMap(c, data) {
    if (byCamp(R.maps, c.id).length >= LIM.maps) throw new Error(`Limite de ${LIM.maps} mapas por campanha. Apague algum.`);
    const m = { id: newId(), campId: c.id, createdAt: now(), fog: false, seen: '', bg: null, notes: '', ...data };
    m.seen = '0'.repeat(m.w * m.h);
    R.maps[m.id] = m;
    return m;
  }
  function setActive(c, m) {
    c.mapId = m ? m.id : null;
    // personagens sem posição neste mapa aparecem no ponto de partida
    if (m) for (const ch of byCamp(R.chars, c.id)) if (!ch.pos[m.id]) ch.pos[m.id] = spawn(m, ch);
    emitCamp(c, 'rpg:state', (uid) => full(c, uid));
  }
  function spawn(m, ch) {
    const s = m.start || [Math.floor(m.w / 2), Math.floor(m.h / 2)];
    return freeSpot(ch.campId, m, s[0], s[1], 1, ch.id);
  }
  const walkable = (m, x, y) => { if (m.bg) return true; const ch = m.tiles[Math.floor(y) * m.w + Math.floor(x)]; return !!ch && '.,=DSbf'.includes(ch); };
  // casa livre mais próxima (onde dá para andar e sem ninguém em cima), para ninguém nascer empilhado
  function freeSpot(campId, m, x, y, size = 1, skip = null) {
    const occ = new Set(), cell = (px, py) => Math.round(py) * m.w + Math.round(px);
    for (const e of byCamp(R.ents, campId)) if (e.mapId === m.id && e.id !== skip) for (let a = 0; a < (e.size || 1); a++) for (let b = 0; b < (e.size || 1); b++) occ.add(cell(e.x + a, e.y + b));
    for (const k of byCamp(R.chars, campId)) { const p = k.pos && k.pos[m.id]; if (p && k.id !== skip) occ.add(cell(p[0], p[1])); }
    const fits = (px, py) => { for (let a = 0; a < size; a++) for (let b = 0; b < size; b++) { const xx = px + a, yy = py + b; if (xx >= m.w || yy >= m.h || !walkable(m, xx + .5, yy + .5) || occ.has(yy * m.w + xx)) return false; } return true; };
    const sx = Math.max(0, Math.min(m.w - 1, Math.round(x))), sy = Math.max(0, Math.min(m.h - 1, Math.round(y)));
    for (let r = 0; r < Math.max(m.w, m.h); r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const px = sx + dx, py = sy + dy; if (px < 0 || py < 0 || px >= m.w || py >= m.h) continue;
      if (fits(px, py)) return [px, py];
    }
    return [sx, sy];
  }

  /* ---------- combate ---------- */
  const fighter = (c, f) => (f.k === 'c' ? R.chars[f.id] : R.ents[f.id]);
  function combatView(c) { return c.combat; }
  function pushCombat(c) { c.updatedAt = now(); save(); emitCamp(c, 'rpg:combat', combatView(c)); }

  /* ---------- limpeza de campanhas sem grupo/conversa ---------- */
  function dropCamp(c) {
    for (const coll of [R.chars, R.maps, R.ents, R.snaps]) for (const x of byCamp(coll, c.id)) delete coll[x.id];
    for (const e of evList(c.id)) delete R.events[e.id];
    evIdx.delete(c.id);
    emitCamp(c, 'rpg:closed', { cid: c.id, why: 'Esta campanha foi apagada.' });
    viewers.delete(c.id);
    delete R.camps[c.id];
  }
  function prune() {
    let n = 0;
    for (const c of Object.values(R.camps)) if (!scopeOf(c)) { dropCamp(c); n++; }
    // pedaços soltos (de campanhas que não existem mais)
    for (const coll of [R.chars, R.maps, R.ents, R.snaps, R.events]) for (const x of Object.values(coll)) if (!R.camps[x.campId]) { delete coll[x.id]; n++; }
    if (n) { save(); log(`   RPG: ${n} item(ns) de campanhas sem grupo/conversa removidos.`); }
  }
  prune();
  setInterval(prune, 10 * 60e3).unref();

  /* ---------- eventos do Socket.IO ---------- */
  function bind(socket, uid, on, ok, fail) {
    const me = () => users[uid];
    // pega a campanha e confere o papel mínimo: 'ver' | 'jogar' (mestre ou jogador) | 'mestre'
    function camp(d, need = 'ver') {
      const c = R.camps[str(d && d.cid, 40)]; if (!c) return null;
      const r = role(c, uid); if (!r) return null;
      if (r === 'espectador' && !c.rules.spect && need === 'ver') return null;
      if (need === 'jogar' && !['mestre', 'jogador'].includes(r)) return null;
      if (need === 'mestre' && r !== 'mestre') return null;
      return c;
    }
    const NO = 'Você não pode fazer isso nesta campanha.';
    const touched = c => { c.updatedAt = now(); save(); };
    const ended = c => c.state === 'encerrada';

    on('rpg:list', (d, cb) => {
      const s = scope(d.scope, str(d.id, 40));
      if (!s || !s.members.includes(uid)) return fail(cb, 'Grupo ou conversa não encontrado.');
      if (!s.on) return ok(cb, { on: false, canCreate: false, camps: [] });
      const camps = Object.values(R.camps).filter(c => c.scope === s.kind && c.scopeId === s.id).sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)).map(c => summary(c, uid));
      ok(cb, { on: true, canCreate: canCreate(s, uid), camps });
    });

    on('rpg:create', (d, cb) => {
      const s = scope(d.scope, str(d.id, 40));
      if (!canCreate(s, uid)) return fail(cb, s && !s.on ? 'O RPG de Mesa está desligado neste grupo.' : 'Você não pode criar campanhas aqui.');
      if (limited('rpg-create:' + uid, 10, 3600e3)) return fail(cb, 'Muitas campanhas criadas seguidas. Espere um pouco.');
      if (Object.values(R.camps).filter(c => c.scope === s.kind && c.scopeId === s.id).length >= LIM.camps) return fail(cb, `Limite de ${LIM.camps} campanhas aqui. Apague alguma encerrada.`);
      const name = txt(d.name, 60); if (!name) return fail(cb, 'Dê um nome para a campanha.');
      const c = {
        id: newId(), scope: s.kind, scopeId: s.id, name, desc: txt(d.desc, 1000), cover: img(d.cover), createdBy: uid, createdAt: now(), updatedAt: now(),
        masterId: uid, players: [], invited: [], maxPlayers: int(d.maxPlayers, 1, LIM.players, 6), open: !!d.open, state: 'ativa',
        attrs: DEF_ATTRS.slice(), rules: cleanRules(d.rules),
        classes: DEF_CLASSES.map(([n, icon, desc, hp, mp, mods, skills]) => ({ id: newId(), name: n, icon, desc, hp, mp, mods, skills })),
        mapId: null, combat: { on: false, round: 1, turn: 0, order: [] }
      };
      R.camps[c.id] = c;
      const m = newMap(c, generate({ kind: 'masmorra', w: 30, h: 22, rooms: 7, traps: 3 }));
      c.mapId = m.id;
      say(c, `${userName(uid)} criou a campanha "${c.name}" e é o Mestre.`, { type: 'sys' });
      save(); touchScope(c);
      log(`   RPG: @${me().username} criou a campanha "${c.name}".`);
      ok(cb, { camp: summary(c, uid) });
    });

    on('rpg:open', (d, cb) => {
      const c = camp(d); if (!c) return fail(cb, 'Campanha não encontrada ou sem acesso.');
      watch(socket, c.id);
      ok(cb, full(c, uid));
    });
    on('rpg:close', (d, cb) => { unwatch(socket); ok(cb); });

    on('rpg:update', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      if ('name' in d) { const n = txt(d.name, 60); if (!n) return fail(cb, 'O nome não pode ficar vazio.'); c.name = n; }
      if ('desc' in d) c.desc = txt(d.desc, 1000);
      if ('cover' in d) c.cover = img(d.cover);
      if ('maxPlayers' in d) c.maxPlayers = int(d.maxPlayers, Math.max(1, c.players.length), LIM.players, c.maxPlayers);
      if ('open' in d) c.open = !!d.open;
      if ('state' in d && STATES.includes(d.state) && d.state !== c.state) { c.state = d.state; say(c, `A campanha agora está ${c.state}.`, { type: 'sys' }); }
      if ('rules' in d) c.rules = cleanRules(d.rules, c.rules);
      if ('attrs' in d) {
        const a = [...new Set(list(d.attrs, LIM.attrs, x => txt(x, 6).toUpperCase()))];
        if (!a.length) return fail(cb, 'Deixe pelo menos um atributo.');
        c.attrs = a;
        for (const ch of byCamp(R.chars, c.id)) { const n = {}; for (const k of a) n[k] = ch.attrs[k] ?? 10; ch.attrs = n; }
      }
      if ('classes' in d) {
        const cl = list(d.classes, LIM.classes, cleanClass);
        const ids = new Set(); c.classes = cl.filter(x => !ids.has(x.id) && ids.add(x.id));
        for (const ch of byCamp(R.chars, c.id)) if (ch.classId && !ids.has(ch.classId)) ch.classId = null;
      }
      touched(c); touchScope(c);
      emitCamp(c, 'rpg:state', (u) => full(c, u));
      ok(cb, {});
    });

    on('rpg:delete', (d, cb) => {
      const c = R.camps[str(d.cid, 40)]; if (!c || !canDelete(c, uid)) return fail(cb, NO);
      const s = scopeOf(c);
      dropCamp(c); save();
      if (s) toUsers(s.members, 'rpg:list', { scope: s.kind, id: s.id });
      ok(cb, {});
    });

    // participantes
    on('rpg:invite', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const s = scopeOf(c), ids = list(d.uids, 50, x => str(x, 40)).filter(x => s.members.includes(x) && x !== c.masterId && !c.players.includes(x) && users[x] && !users[x].bot);
      if (!ids.length) return fail(cb, 'Escolha alguém do grupo que ainda não está na campanha.');
      for (const x of ids) if (!c.invited.includes(x)) { c.invited.push(x); toUser(x, 'rpg:invited', { cid: c.id, name: c.name, scope: c.scope, scopeId: c.scopeId, from: userName(uid) }); }
      say(c, `${userName(uid)} convidou ${ids.map(userName).join(', ')}.`, { type: 'sys' });
      touched(c); touchScope(c); emitCamp(c, 'rpg:state', (u) => full(c, u));
      ok(cb, { n: ids.length });
    });
    on('rpg:join', (d, cb) => {
      const c = R.camps[str(d.cid, 40)], r = c && role(c, uid);
      if (!r) return fail(cb, 'Campanha não encontrada.');
      if (r === 'mestre' || r === 'jogador') return ok(cb, {});
      if (r !== 'convidado' && !c.open) return fail(cb, 'Você precisa de um convite do Mestre para jogar.');
      if (ended(c)) return fail(cb, 'Esta campanha já foi encerrada.');
      if (c.players.length >= c.maxPlayers) return fail(cb, 'A campanha está cheia.');
      c.invited = c.invited.filter(x => x !== uid); c.players.push(uid);
      say(c, `${userName(uid)} entrou na campanha como jogador.`, { type: 'sys' });
      touched(c); touchScope(c); emitCamp(c, 'rpg:state', (u) => full(c, u));
      ok(cb, {});
    });
    on('rpg:decline', (d, cb) => {
      const c = R.camps[str(d.cid, 40)]; if (!c || !c.invited.includes(uid)) return fail(cb, 'Convite não encontrado.');
      c.invited = c.invited.filter(x => x !== uid); touched(c); touchScope(c); emitCamp(c, 'rpg:state', (u) => full(c, u)); ok(cb, {});
    });
    on('rpg:leave', (d, cb) => {
      const c = R.camps[str(d.cid, 40)]; if (!c || !c.players.includes(uid)) return fail(cb, 'Você não está nesta campanha como jogador.');
      c.players = c.players.filter(x => x !== uid);
      say(c, `${userName(uid)} saiu da campanha.`, { type: 'sys' });
      touched(c); touchScope(c); emitCamp(c, 'rpg:state', (u) => full(c, u)); ok(cb, {});
    });
    on('rpg:kick', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const x = str(d.uid, 40); if (!c.players.includes(x) && !c.invited.includes(x)) return fail(cb, 'Essa pessoa não está na campanha.');
      c.players = c.players.filter(y => y !== x); c.invited = c.invited.filter(y => y !== x);
      say(c, `${userName(x)} foi tirado da campanha pelo Mestre.`, { type: 'sys' });
      touched(c); touchScope(c); emitCamp(c, 'rpg:state', (u) => full(c, u)); ok(cb, {});
    });
    on('rpg:master', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const x = str(d.uid, 40), s = scopeOf(c);
      if (!s.members.includes(x) || x === uid || !users[x] || users[x].bot) return fail(cb, 'Escolha alguém do grupo.');
      c.players = c.players.filter(y => y !== x); c.invited = c.invited.filter(y => y !== x);
      if (!c.players.includes(uid) && c.players.length < LIM.players) c.players.push(uid);
      c.masterId = x;
      say(c, `${userName(x)} agora é o Mestre da campanha.`, { type: 'sys' });
      touched(c); touchScope(c); emitCamp(c, 'rpg:state', (u) => full(c, u)); ok(cb, {});
    });

    // mapas
    on('rpg:map:gen', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      if (limited('rpg-gen:' + uid, 30, 60e3)) return fail(cb, 'Calma! Muitos mapas seguidos.');
      let m;
      try {
        const g = generate({ kind: d.kind, w: d.w, h: d.h, rooms: d.rooms, obst: d.obst, doors: d.doors !== false, traps: d.traps, wide: d.wide, seed: d.seed });
        const old = d.replace && R.maps[str(d.replace, 40)];
        if (old && old.campId === c.id) {
          Object.assign(old, g, { name: txt(d.name, 40) || old.name, bg: null, seen: '0'.repeat(g.w * g.h) });
          for (const e of byCamp(R.ents, c.id)) if (e.mapId === old.id) { e.x = Math.min(e.x, g.w - 1); e.y = Math.min(e.y, g.h - 1); }
          for (const ch of byCamp(R.chars, c.id)) if (ch.pos[old.id]) ch.pos[old.id] = spawn(old, ch);
          m = old;
        } else m = newMap(c, { ...g, name: txt(d.name, 40) || g.name });
      } catch (e) { return fail(cb, e.message); }
      say(c, `O Mestre ${d.replace ? 'refez' : 'criou'} o mapa "${m.name}".`, { type: 'sys' });
      setActive(c, m); touched(c);
      ok(cb, { id: m.id });
    });
    on('rpg:map:img', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const bg = img(d.url); if (!bg) return fail(cb, 'Envie a imagem do mapa primeiro.');
      const w = int(d.w, 4, 80, 30), h = int(d.h, 4, 80, 20);
      let m; try { m = newMap(c, { name: txt(d.name, 40) || 'Mapa importado', kind: 'imagem', w, h, seed: 0, tiles: '.'.repeat(w * h), traps: [], start: [Math.floor(w / 2), Math.floor(h / 2)], bg }); } catch (e) { return fail(cb, e.message); }
      say(c, `O Mestre importou o mapa "${m.name}".`, { type: 'sys' });
      setActive(c, m); touched(c); ok(cb, { id: m.id });
    });
    on('rpg:map:set', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const m = R.maps[str(d.mapId, 40)]; if (!m || m.campId !== c.id) return fail(cb, 'Mapa não encontrado.');
      say(c, `O grupo foi para o mapa "${m.name}".`, { type: 'sys' });
      setActive(c, m); touched(c); ok(cb, {});
    });
    on('rpg:map:edit', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const m = R.maps[str(d.mapId, 40)]; if (!m || m.campId !== c.id) return fail(cb, 'Mapa não encontrado.');
      if ('name' in d) m.name = txt(d.name, 40) || m.name;
      if ('notes' in d) m.notes = txt(d.notes, 2000);
      if (Array.isArray(d.cells)) { // pincel do Mestre: [[índice, casa], ...]
        const t = m.tiles.split('');
        for (const [i, ch] of d.cells.slice(0, 4000)) if (Number.isInteger(i) && i >= 0 && i < t.length && typeof ch === 'string' && ch.length === 1 && TILE_CHARS.includes(ch)) t[i] = ch;
        m.tiles = t.join('');
      }
      if (Array.isArray(d.traps)) { // [[índice, ligada(revelada)?, apagar?]]
        for (const [i, on, del] of d.traps.slice(0, 200)) {
          if (!Number.isInteger(i) || i < 0 || i >= m.w * m.h) continue;
          const k = m.traps.findIndex(x => x.i === i);
          if (del) { if (k >= 0) m.traps.splice(k, 1); } else if (k >= 0) m.traps[k].on = !!on; else if (m.traps.length < 60) m.traps.push({ i, on: !!on });
        }
      }
      if ('fog' in d) m.fog = !!d.fog;
      if (d.fogAll === 'show' || d.fogAll === 'hide') m.seen = (d.fogAll === 'show' ? '1' : '0').repeat(m.w * m.h);
      if (Array.isArray(d.reveal) || Array.isArray(d.hide)) {
        const s = m.seen.split('');
        for (const i of (d.reveal || []).slice(0, 4000)) if (Number.isInteger(i) && i >= 0 && i < s.length) s[i] = '1';
        for (const i of (d.hide || []).slice(0, 4000)) if (Number.isInteger(i) && i >= 0 && i < s.length) s[i] = '0';
        m.seen = s.join('');
      }
      touched(c);
      if (c.mapId === m.id) emitCamp(c, 'rpg:map', (u, r) => mapView(m, r));
      ok(cb, {});
    });
    on('rpg:map:del', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const m = R.maps[str(d.mapId, 40)]; if (!m || m.campId !== c.id) return fail(cb, 'Mapa não encontrado.');
      for (const e of byCamp(R.ents, c.id)) if (e.mapId === m.id) delete R.ents[e.id];
      for (const ch of byCamp(R.chars, c.id)) delete ch.pos[m.id];
      delete R.maps[m.id];
      c.combat.order = c.combat.order.filter(f => fighter(c, f));
      if (c.mapId === m.id) { const next = byCamp(R.maps, c.id).sort((a, b) => b.createdAt - a.createdAt)[0] || null; setActive(c, next); }
      else emitCamp(c, 'rpg:state', (u) => full(c, u));
      touched(c); ok(cb, {});
    });

    // personagens (fichas)
    on('rpg:char:save', (d, cb) => {
      const c = camp(d, 'jogar'); if (!c) return fail(cb, 'Entre na campanha como jogador para ter um personagem.');
      const master = isM(c, uid), x = d.char || {};
      const old = x.id ? R.chars[str(x.id, 40)] : null;
      if (old && old.campId !== c.id) return fail(cb, 'Ficha não encontrada.');
      if (old && !master && (old.ownerId !== uid || !c.rules.editOwn)) return fail(cb, 'Só o Mestre pode mudar esta ficha.');
      if (!old) {
        const owner = master && x.ownerId && (c.players.includes(x.ownerId) || x.ownerId === uid) ? x.ownerId : uid;
        if (!master && byCamp(R.chars, c.id).some(k => k.ownerId === owner)) return fail(cb, 'Você já tem um personagem nesta campanha.');
        if (byCamp(R.chars, c.id).length >= LIM.chars) return fail(cb, 'Limite de personagens desta campanha.');
        const ch = { id: newId(), campId: c.id, ownerId: owner, createdAt: now(), pos: {}, ...cleanChar(x, null, c) };
        // classe escolhida: aplica vida, mana e bônus na criação
        const cl = c.classes.find(k => k.id === ch.classId);
        if (cl && !x.custom) { ch.hpMax = ch.hp = cl.hp; ch.mpMax = ch.mp = cl.mp; for (const [a, v] of Object.entries(cl.mods)) if (a in ch.attrs) ch.attrs[a] = Math.max(1, Math.min(30, ch.attrs[a] + v)); }
        const m = R.maps[c.mapId]; if (m) ch.pos[m.id] = spawn(m, ch);
        R.chars[ch.id] = ch;
        say(c, `${userName(uid)} criou o personagem ${ch.name}${cl ? ' (' + cl.name + ')' : ''}.`, { type: 'sys' });
      } else {
        Object.assign(old, cleanChar(x, old, c));
        if (master && x.ownerId && (c.players.includes(x.ownerId) || x.ownerId === c.masterId)) old.ownerId = x.ownerId;
      }
      touched(c);
      emitCamp(c, 'rpg:chars', byCamp(R.chars, c.id));
      ok(cb, {});
    });
    on('rpg:char:del', (d, cb) => {
      const c = camp(d, 'jogar'); if (!c) return fail(cb, NO);
      const ch = R.chars[str(d.id, 40)]; if (!ch || ch.campId !== c.id || (!isM(c, uid) && ch.ownerId !== uid)) return fail(cb, NO);
      delete R.chars[ch.id];
      c.combat.order = c.combat.order.filter(f => !(f.k === 'c' && f.id === ch.id));
      say(c, `O personagem ${ch.name} saiu da história.`, { type: 'sys' });
      touched(c); emitCamp(c, 'rpg:chars', byCamp(R.chars, c.id)); emitCamp(c, 'rpg:combat', combatView(c)); ok(cb, {});
    });

    // criaturas, chefes, NPCs e objetos (só o Mestre)
    on('rpg:ent:save', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const x = d.ent || {}, old = x.id ? R.ents[str(x.id, 40)] : null;
      if (old && old.campId !== c.id) return fail(cb, 'Criatura não encontrada.');
      let e;
      if (old) { const wasHidden = old.hidden; Object.assign(old, cleanEnt(x, old)); e = old;
        // escondeu: some para os jogadores (o Mestre continua vendo). Mostrou: o envio logo abaixo faz aparecer.
        if (!wasHidden && e.hidden && c.mapId === e.mapId) emitCamp(c, 'rpg:ent:del', (u, r) => (r === 'mestre' ? undefined : { id: e.id }));
      } else {
        const m = R.maps[str(x.mapId, 40)] || R.maps[c.mapId]; if (!m || m.campId !== c.id) return fail(cb, 'Crie ou escolha um mapa primeiro.');
        if (byCamp(R.ents, c.id).filter(k => k.mapId === m.id).length >= LIM.ents) return fail(cb, `Limite de ${LIM.ents} criaturas por mapa.`);
        e = { id: newId(), campId: c.id, mapId: m.id, ...cleanEnt(x, null) };
        [e.x, e.y] = freeSpot(c.id, m, num(x.x, 0, m.w - 1, Math.floor(m.w / 2)), num(x.y, 0, m.h - 1, Math.floor(m.h / 2)), e.size);
        R.ents[e.id] = e;
        if (!e.hidden) say(c, `${e.kind === 'chefe' ? '☠️ Um chefe apareceu' : 'Apareceu'}: ${e.name}.`, { type: 'sys' });
      }
      touched(c);
      if (c.mapId === e.mapId) emitCamp(c, 'rpg:ent', (u, r) => entView(e, c, r));
      ok(cb, { id: e.id });
    });
    on('rpg:ent:del', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const e = R.ents[str(d.id, 40)]; if (!e || e.campId !== c.id) return fail(cb, 'Criatura não encontrada.');
      delete R.ents[e.id];
      c.combat.order = c.combat.order.filter(f => !(f.k === 'e' && f.id === e.id));
      touched(c); emitCamp(c, 'rpg:ent:del', { id: e.id }); emitCamp(c, 'rpg:combat', combatView(c)); ok(cb, {});
    });

    // mover (k: 'c' personagem, 'e' criatura). drag = só mostra o movimento enquanto arrasta (não salva)
    let lastDrag = 0;
    function movable(c, k, id) {
      const t = k === 'c' ? R.chars[id] : k === 'e' ? R.ents[id] : null;
      if (!t || t.campId !== c.id) return null;
      if (isM(c, uid)) return t;
      if (k === 'c' && t.ownerId === uid && !c.rules.lock && !ended(c) && c.state !== 'pausada') return t;
      return null;
    }
    on('rpg:drag', (d) => {
      const t0 = now(); if (t0 - lastDrag < 50) return; lastDrag = t0;
      const c = camp(d, 'jogar'); if (!c) return;
      const k = d.k === 'c' ? 'c' : 'e', t = movable(c, k, str(d.id, 40)), m = R.maps[c.mapId]; if (!t || !m) return;
      if (k === 'e' && t.mapId !== m.id) return;
      const x = num(d.x, 0, m.w - 1, 0), y = num(d.y, 0, m.h - 1, 0);
      emitCamp(c, 'rpg:drag', (u, r) => (u === uid || (k === 'e' && t.hidden && r !== 'mestre') ? undefined : { k, id: t.id, x, y }));
    });
    on('rpg:move', (d, cb) => {
      const c = camp(d, 'jogar'); if (!c) return fail(cb, NO);
      const k = d.k === 'c' ? 'c' : 'e', t = movable(c, k, str(d.id, 40)), m = R.maps[c.mapId];
      if (!t || !m) return fail(cb, c.rules.lock && !isM(c, uid) ? 'O Mestre travou a movimentação.' : 'Você não pode mover isso.');
      if (k === 'e' && t.mapId !== m.id) return fail(cb, 'Essa criatura está em outro mapa.');
      let x = num(d.x, 0, m.w - 1, 0), y = num(d.y, 0, m.h - 1, 0);
      if (c.rules.grid) { x = Math.round(x); y = Math.round(y); } else { x = Math.round(x * 20) / 20; y = Math.round(y * 20) / 20; }
      if (!isM(c, uid) && c.rules.walls && !walkable(m, x + 0.5, y + 0.5)) return fail(cb, 'Não dá para andar aí (parede ou obstáculo).');
      if (k === 'c') t.pos[m.id] = [x, y]; else { t.x = x; t.y = y; }
      save();
      emitCamp(c, 'rpg:move', (u, r) => (k === 'e' && t.hidden && r !== 'mestre' ? undefined : { k, id: t.id, x, y, mapId: m.id }));
      ok(cb, { x, y });
    });

    // vida e mana: dano (+) / cura (-) ou valor exato
    on('rpg:hp', (d, cb) => {
      const c = camp(d, 'jogar'); if (!c) return fail(cb, NO);
      const k = d.k === 'c' ? 'c' : 'e', t = k === 'c' ? R.chars[str(d.id, 40)] : R.ents[str(d.id, 40)];
      if (!t || t.campId !== c.id) return fail(cb, 'Não encontrado.');
      const master = isM(c, uid);
      if (!master && !(k === 'c' && t.ownerId === uid && c.rules.editOwn)) return fail(cb, 'Só o Mestre pode mudar isso.');
      const field = d.field === 'mp' ? 'mp' : 'hp', max = field === 'mp' ? t.mpMax : t.hpMax;
      if (field === 'mp' && k === 'e') return fail(cb, 'Criaturas não têm mana.');
      const before = t[field];
      if ('set' in d) t[field] = int(d.set, field === 'hp' ? -9999 : 0, max, before);
      else { const dmg = int(d.dmg, -99999, 99999, 0); t[field] = Math.max(field === 'hp' ? -9999 : 0, Math.min(max, before - dmg)); }
      const diff = t[field] - before;
      touched(c);
      if (k === 'c') emitCamp(c, 'rpg:chars', byCamp(R.chars, c.id)); else if (c.mapId === t.mapId) emitCamp(c, 'rpg:ent', (u, r) => entView(t, c, r));
      if (diff && !(k === 'e' && t.hidden)) {
        const what = field === 'mp' ? 'de mana' : '';
        const showHp = k === 'c' || c.rules.monsterHp || t.kind === 'npc' || t.kind === 'objeto';
        say(c, diff < 0 ? `💥 ${t.name} perdeu ${-diff} ${what || 'de vida'}${showHp && field === 'hp' ? ` (${t.hp}/${t.hpMax})` : ''}.${field === 'hp' && t.hp <= 0 ? ` ${t.name} caiu!` : ''}` : `💚 ${t.name} recuperou ${diff} ${what || 'de vida'}${showHp && field === 'hp' ? ` (${t.hp}/${t.hpMax})` : ''}.`, { type: diff < 0 ? 'dmg' : 'heal', uid });
      }
      ok(cb, { value: t[field] });
    });
    on('rpg:cond', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const k = d.k === 'c' ? 'c' : 'e', t = k === 'c' ? R.chars[str(d.id, 40)] : R.ents[str(d.id, 40)];
      if (!t || t.campId !== c.id) return fail(cb, 'Não encontrado.');
      t.conds = cleanConds(d.conds); touched(c);
      if (k === 'c') emitCamp(c, 'rpg:chars', byCamp(R.chars, c.id)); else if (c.mapId === t.mapId) emitCamp(c, 'rpg:ent', (u, r) => entView(t, c, r));
      ok(cb, {});
    });

    // dados
    on('rpg:roll', (d, cb) => {
      const c = camp(d, 'jogar'); if (!c) return fail(cb, 'Só quem joga a campanha pode rolar dados.');
      if (limited('rpg-roll:' + uid, 40, 30e3)) return fail(cb, 'Muitas rolagens seguidas. Espere um pouco.');
      let r; try { r = roll(d.expr); } catch (e) { return fail(cb, e.message); }
      const ev = addEvent(c, { type: 'roll', uid, text: txt(d.label, 60), roll: r, priv: !!d.priv });
      touched(c); ok(cb, { event: ev });
    });
    // acontecimento escrito (narração do Mestre ou ação de um jogador)
    on('rpg:say', (d, cb) => {
      const c = camp(d, 'jogar'); if (!c) return fail(cb, NO);
      const t = txt(d.text, 400); if (!t) return fail(cb, 'Escreva alguma coisa.');
      if (limited('rpg-say:' + uid, 20, 30e3)) return fail(cb, 'Calma! Muitas mensagens seguidas.');
      addEvent(c, { type: isM(c, uid) ? 'narr' : 'act', uid, text: t, priv: isM(c, uid) && !!d.priv });
      touched(c); ok(cb, {});
    });

    // combate e turnos
    on('rpg:combat', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const cb2 = c.combat;
      if (d.action === 'start') {
        const pick = list(d.ids, 60, x => (x && (x.k === 'c' || x.k === 'e') ? { k: x.k, id: str(x.id, 40) } : null)).filter(f => { const t = fighter(c, f); return t && t.campId === c.id; });
        if (!pick.length) return fail(cb, 'Escolha quem entra no combate.');
        cb2.order = pick.map(f => {
          const t = fighter(c, f), bonus = f.k === 'c' ? ATTR_MOD(t.attrs.DES) : (t.init || 0), d20 = crypto.randomInt(1, 21);
          return { ...f, init: d20 + bonus, d20 };
        }).sort((a, b) => b.init - a.init || b.d20 - a.d20);
        Object.assign(cb2, { on: true, round: 1, turn: 0 });
        say(c, `⚔️ Combate! Iniciativa: ${cb2.order.map(f => { const t = fighter(c, f); return `${f.k === 'e' && t.hidden ? '???' : t.name} ${f.init}`; }).join(', ')}.`, { type: 'combat' });
      } else if (d.action === 'next' || d.action === 'prev') {
        if (!cb2.on || !cb2.order.length) return fail(cb, 'Nenhum combate acontecendo.');
        const n = cb2.order.length;
        if (d.action === 'next') { cb2.turn++; if (cb2.turn >= n) { cb2.turn = 0; cb2.round++; } }
        else { cb2.turn--; if (cb2.turn < 0) { cb2.turn = n - 1; cb2.round = Math.max(1, cb2.round - 1); } }
        const t = fighter(c, cb2.order[cb2.turn]);
        if (t && !(cb2.order[cb2.turn].k === 'e' && t.hidden)) say(c, `Rodada ${cb2.round}: vez de ${t.name}.`, { type: 'turn' });
      } else if (d.action === 'set') {
        const ord = list(d.order, 60, x => (x && (x.k === 'c' || x.k === 'e') ? { k: x.k, id: str(x.id, 40), init: int(x.init, -99, 99, 0), d20: int(x.d20, 0, 20, 0) } : null)).filter(f => fighter(c, f) && fighter(c, f).campId === c.id);
        cb2.order = ord; cb2.turn = Math.min(cb2.turn, Math.max(0, ord.length - 1));
      } else if (d.action === 'end') {
        Object.assign(cb2, { on: false, round: 1, turn: 0, order: [] });
        say(c, 'O combate terminou.', { type: 'combat' });
      } else return fail(cb, 'Ação inválida.');
      pushCombat(c); ok(cb, {});
    });

    // sessões salvas (fotografia do jogo para voltar depois)
    on('rpg:snap:save', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const mine = byCamp(R.snaps, c.id);
      if (mine.length >= LIM.snaps) return fail(cb, `Limite de ${LIM.snaps} sessões salvas. Apague alguma.`);
      const data = {
        mapId: c.mapId, combat: c.combat,
        maps: byCamp(R.maps, c.id), ents: byCamp(R.ents, c.id),
        chars: byCamp(R.chars, c.id).map(k => ({ id: k.id, hp: k.hp, mp: k.mp, pos: k.pos, conds: k.conds, inv: k.inv, level: k.level, hpMax: k.hpMax, mpMax: k.mpMax }))
      };
      const size = JSON.stringify(data).length;
      if (size > 3e6) return fail(cb, 'Esta sessão ficou grande demais para salvar (apague mapas que não usa).');
      const s = { id: newId(), campId: c.id, name: txt(d.name, 60) || ('Sessão de ' + new Date().toLocaleDateString('pt-BR')), at: now(), by: uid, data: JSON.parse(JSON.stringify(data)) };
      R.snaps[s.id] = s;
      say(c, `💾 O Mestre salvou a sessão "${s.name}".`, { type: 'sys' });
      touched(c); emitCamp(c, 'rpg:state', (u) => full(c, u)); ok(cb, { id: s.id });
    });
    on('rpg:snap:load', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const s = R.snaps[str(d.id, 40)]; if (!s || s.campId !== c.id) return fail(cb, 'Sessão não encontrada.');
      const data = JSON.parse(JSON.stringify(s.data));
      for (const m of byCamp(R.maps, c.id)) delete R.maps[m.id];
      for (const e of byCamp(R.ents, c.id)) delete R.ents[e.id];
      for (const m of data.maps) R.maps[m.id] = { ...m, campId: c.id };
      for (const e of data.ents) R.ents[e.id] = { ...e, campId: c.id };
      for (const k of data.chars) { const ch = R.chars[k.id]; if (ch && ch.campId === c.id) Object.assign(ch, { hp: k.hp, mp: k.mp, pos: k.pos || {}, conds: k.conds || [], inv: k.inv || [], level: k.level, hpMax: k.hpMax, mpMax: k.mpMax }); }
      c.combat = data.combat && Array.isArray(data.combat.order) ? { ...data.combat, order: data.combat.order.filter(f => fighter(c, f)) } : { on: false, round: 1, turn: 0, order: [] };
      c.mapId = R.maps[data.mapId] ? data.mapId : null;
      say(c, `⏪ O Mestre voltou para a sessão "${s.name}".`, { type: 'sys' });
      touched(c); setActive(c, R.maps[c.mapId] || null); ok(cb, {});
    });
    on('rpg:snap:del', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const s = R.snaps[str(d.id, 40)]; if (!s || s.campId !== c.id) return fail(cb, 'Sessão não encontrada.');
      delete R.snaps[s.id]; touched(c); emitCamp(c, 'rpg:state', (u) => (role(c, u) === 'mestre' ? full(c, u) : undefined)); ok(cb, {});
    });

    // grupo: ligar/desligar o RPG e quem pode criar campanhas (quem gerencia o grupo)
    on('rpg:groupcfg', (d, cb) => {
      const g = db.groups[str(d.gid, 40)];
      if (!g || !can(g, uid, 'manageServer')) return fail(cb, 'Só quem gerencia o grupo pode mudar isso.');
      const was = !g.rpg || g.rpg.on !== false;
      g.rpg = { on: d.on !== false, who: d.who === 'perm' ? 'perm' : 'all' };
      save(); pushGroup(g);
      toUsers(g.members, 'rpg:list', { scope: 'g', id: g.id });
      if (was && !g.rpg.on) for (const c of Object.values(R.camps)) if (c.scope === 'g' && c.scopeId === g.id) emitCamp(c, 'rpg:closed', { cid: c.id, why: 'O RPG de Mesa foi desligado neste grupo.' });
      ok(cb, {});
    });

    socket.on('disconnect', () => unwatch(socket));
  }

  return { bind, roll, prune, _role: role };
}

module.exports = { createRpg, ATTR_MOD };
