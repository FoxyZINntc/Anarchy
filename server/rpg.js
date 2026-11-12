// RPG de Mesa: atividade opcional dentro de qualquer grupo (servidor) ou conversa do Anarchy.
// Não cria login, grupo ou membro novo: usa os membros do grupo/conversa e os cargos que já existem.
//
// Papéis numa campanha (valem só nela; não dão nenhum poder no grupo):
//   mestre     controla tudo da campanha
//   jogador    tem personagem, rola dados, move o próprio personagem
//   convidado  foi chamado pelo Mestre e pode entrar
//   espectador membro do grupo/conversa que só assiste
//
// Cenas: a campanha tem a cena principal (c.mapId) e cenas/eventos privados (c.scenes), cada uma com o próprio mapa,
// participantes, combate e histórico. Quem não participa de uma cena privada não recebe nada dela (nem mapa, nem
// criaturas, nem rolagens): o servidor decide o que vai para cada pessoa.
//
// Visão (névoa de guerra): o servidor calcula o que cada personagem enxerga (paredes, portas fechadas, luzes,
// lanternas, escuridão) com o mesmo código da tela (public/rpg-core.js) e só manda para cada jogador as criaturas,
// marcadores e armadilhas que ele pode ver. A exploração fica guardada por personagem (m.seenBy).
//
// Tempo real: Socket.IO. Dados: db.rpg (tabelas rpg_* no Supabase, ver store.js; RLS fechada, só o servidor acessa).
const crypto = require('crypto');
const { generate, KINDS } = require('./rpg-mapas');
const C = require('./public/rpg-core');

const LIM = { camps: 30, maps: 20, ents: 150, chars: 40, snaps: 10, events: 300, classes: 20, attrs: 10, inv: 60, conds: 12, players: 20, lights: 80, marks: 150, doors: 400, scenes: 30, active: 8, mats: 60, cats: 12, stats: 20, smods: 6 };
const STATES = ['ativa', 'pausada', 'encerrada'];
const ENT_KINDS = ['monstro', 'chefe', 'npc', 'objeto'];
// Atributos: Intelecto junta a antiga Sabedoria e a Inteligência; Carisma junta Carisma e Lábia; Percepção é nova.
const DEF_ATTRS = ['FOR', 'DES', 'CON', 'INT', 'CAR', 'PER'];
const ATTR_NAMES = { FOR: 'Força', DES: 'Destreza', CON: 'Constituição', INT: 'Intelecto', CAR: 'Carisma', PER: 'Percepção' };
const DEF_CLASSES = [
  ['Guerreiro', '⚔️', 'Linha de frente: aguenta pancada e bate forte.', 12, 0, { FOR: 2, CON: 1 }, 'Ataque poderoso\nSegundo fôlego'],
  ['Mago', '🔮', 'Magias de longo alcance, mas pouca vida.', 6, 12, { INT: 2, PER: 1 }, 'Bola de fogo\nEscudo arcano'],
  ['Ladino', '🗡️', 'Furtivo e preciso, abre fechaduras e desarma armadilhas.', 8, 4, { DES: 2, PER: 1 }, 'Ataque furtivo\nDesarmar armadilha'],
  ['Clérigo', '✨', 'Cura o grupo e enfrenta mortos-vivos.', 8, 10, { INT: 2, CON: 1 }, 'Curar ferimentos\nBênção'],
  ['Arqueiro', '🏹', 'Ataca de longe com arco e flecha.', 10, 2, { DES: 2, PER: 1 }, 'Tiro certeiro\nChuva de flechas'],
  ['Bardo', '🎵', 'Inspira os aliados e engana os inimigos.', 8, 8, { CAR: 2, DES: 1 }, 'Inspiração\nCanção de ninar']
];
// status sugeridos (o Mestre muda tudo: nomes, categorias, limites, recuperação e modificadores)
const DEF_STATS = [
  ['Físicos', '💪', '#e2484e', [
    ['Resistência', '🛡️', 10, 0, 10, 'barra', [1, 'descanso'], []],
    ['Fadiga', '😮‍💨', 0, 0, 10, 'pontos', [-3, 'descanso'], [['DES', -2, '>=', 5]]],
    ['Ferimentos', '🩹', 0, 0, 5, 'pontos', [0, 'nunca'], [['FOR', -1, '>=', 3]]],
    ['Dor', '🤕', 0, 0, 10, 'barra', [-1, 'rodada'], []]]],
  ['Mentais', '🧠', '#6c7cff', [
    ['Sanidade', '🧠', 10, 0, 10, 'barra', [0, 'nunca'], [['INT', -2, '<=', 3]]],
    ['Estresse', '😰', 0, 0, 10, 'barra', [-2, 'descanso'], []],
    ['Medo', '😱', 0, 0, 5, 'pontos', [-1, 'rodada'], [['CAR', -1, '>=', 3]]],
    ['Concentração', '🎯', 5, 0, 5, 'pontos', [1, 'turno'], []]]],
  ['Sobrenaturais', '✨', '#b06cff', [
    ['Energia', '⚡', 10, 0, 10, 'barra', [1, 'turno'], []],
    ['Corrupção', '🕳️', 0, 0, 10, 'barra', [0, 'nunca'], [['CAR', -1, '>=', 5]]]]]
];
const ATTR_MOD = C.ATTR_MOD;

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
  const has = (o, k) => o && Object.prototype.hasOwnProperty.call(o, k);
  const shade = (h, k) => { const n = parseInt(h.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v + (k > 0 ? (255 - v) * k : v * k)))); return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join(''); };
  const clone = o => JSON.parse(JSON.stringify(o));

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
  function canCreate(s, uid) {
    if (!s || !s.on || !s.members.includes(uid) || (users[uid] && users[uid].bot)) return false;
    if (s.kind === 'g' && s.group.rpg && s.group.rpg.who === 'perm') return can(s.group, uid, 'rpg');
    return true;
  }
  const canDelete = (c, uid) => isM(c, uid) || (c.createdBy === uid && role(c, uid)) || (c.scope === 'g' && db.groups[c.scopeId] && can(db.groups[c.scopeId], uid, 'manageServer'));

  /* ---------- cenas (cena principal = '') ---------- */
  const active = c => (c.scenes || []).filter(s => s.state === 'ativa');
  const sceneById = (c, sid) => (sid ? (c.scenes || []).find(s => s.id === sid) || null : null);
  const sceneOfUser = (c, uid) => active(c).find(s => s.uids.includes(uid)) || null;
  const sceneOfChar = (c, chId) => active(c).find(s => s.chars.includes(chId)) || null;
  const mapOfScene = (c, sid) => { const s = sid && sceneById(c, sid); return s && s.state === 'ativa' ? s.mapId : c.mapId; };
  const charMap = (c, ch) => { const s = sceneOfChar(c, ch.id); return s ? s.mapId : c.mapId; };
  const mapBusy = (c, mapId, skip) => mapId === c.mapId ? 'principal' : active(c).some(s => s.mapId === mapId && s.id !== skip) ? 'cena' : null;
  // cena que a pessoa está vendo: o Mestre escolhe; quem participa de uma cena fica nela; os outros veem a principal
  // (ou assistem a uma cena compartilhada)
  function viewScene(c, sk) {
    const uid = sk.data.uid, r = role(c, uid), want = sk.data.view || '';
    if (r === 'mestre') { const s = sceneById(c, want); return s && s.state === 'ativa' ? s.id : ''; }
    const mine = sceneOfUser(c, uid); if (mine) return mine.id;
    const s = sceneById(c, want); return s && s.state === 'ativa' && s.vis === 'compartilhada' ? s.id : '';
  }
  // em que cena as ações desta pessoa acontecem (rolagens, falas)
  const actScene = (c, uid, sk) => (isM(c, uid) ? viewScene(c, sk) : (sceneOfUser(c, uid) || {}).id || '');
  const combatOf = (c, sid) => { const s = sceneById(c, sid); return s ? s.combat : c.combat; };
  function scenePerm(c, uid, what) { // participantes de uma cena só fazem o que o Mestre deixou
    if (isM(c, uid)) return true;
    const s = sceneOfUser(c, uid); return !s || s.perm[what] !== false;
  }

  /* ---------- quem está com a mesa aberta ---------- */
  const viewers = new Map(); // campId -> Set(socket)
  function watch(sock, cid) { for (const [k, set] of viewers) if (k !== cid) set.delete(sock); if (!viewers.has(cid)) viewers.set(cid, new Set()); viewers.get(cid).add(sock); sock.data.rpg = cid; }
  function unwatch(sock) { for (const set of viewers.values()) set.delete(sock); sock.data.rpg = null; }
  // cada pessoa com a mesa aberta (tira quem perdeu o acesso)
  function each(c, fn) {
    const set = viewers.get(c.id); if (!set) return;
    for (const sk of [...set]) {
      const uid = sk.data.uid, r = R.camps[c.id] && role(c, uid);
      if (!r || (r === 'espectador' && !c.rules.spect)) { set.delete(sk); sk.data.rpg = null; sk.emit('rpg:closed', { cid: c.id, why: r ? 'O Mestre fechou a mesa para quem só assiste.' : 'Você não tem mais acesso a esta campanha.' }); continue; }
      fn(sk, uid, r);
    }
  }
  function emitCamp(c, ev, fn) { each(c, (sk, uid, r) => { const data = typeof fn === 'function' ? fn(uid, r, sk) : fn; if (data !== undefined) sk.emit(ev, data); }); }
  const emitState = c => emitCamp(c, 'rpg:state', (u, r, sk) => full(c, u, sk));
  const emitChars = c => emitCamp(c, 'rpg:chars', (u, r, sk) => charsFor(c, u, r, sk));
  // quem está olhando o mapa mapId. Jogadores com névoa ligada não recebem o evento: recebem rpg:view (pushView)
  function emitMap(c, mapId, ev, fn, fogToo = false) {
    const m = R.maps[mapId];
    each(c, (sk, uid, r) => {
      if (mapOfScene(c, viewScene(c, sk)) !== mapId) return;
      if (!fogToo && m && m.fog && r !== 'mestre') return;
      const data = typeof fn === 'function' ? fn(uid, r, sk) : fn; if (data !== undefined) sk.emit(ev, data);
    });
  }
  function emitScene(c, sid, ev, data) { each(c, sk => { if (viewScene(c, sk) === sid) sk.emit(ev, data); }); }
  // jogadores com névoa: tudo que podem ver deste mapa, recalculado
  function pushView(c, m) {
    if (!m || !m.fog) return;
    each(c, (sk, uid, r) => { if (r !== 'mestre' && mapOfScene(c, viewScene(c, sk)) === m.id) sk.emit('rpg:view', viewPayload(c, m, uid, r, sk)); });
  }
  function touchScope(c) { const s = scopeOf(c); if (s) toUsers(s.members, 'rpg:list', { scope: c.scope, id: c.scopeId }); }

  /* ---------- visão e névoa ---------- */
  const vcache = new Map(); // mapId -> { F, lit, chars, cv: Map(charId -> o que vê) }
  const dirty = m => { if (m) vcache.delete(m.id); };
  function vstate(c, m) {
    let s = vcache.get(m.id); if (s) return s;
    const F = C.flags(m, c.mats);
    const chars = byCamp(R.chars, c.id).filter(ch => charMap(c, ch) === m.id && ch.pos && ch.pos[m.id]);
    const L = C.lighting(m, c.mats, F, chars), cv = new Map();
    let changed = false;
    for (const ch of chars) {
      const V = C.vision(m, F, L.lit, ch); if (!V) continue; cv.set(ch.id, V);
      if (m.fog) { // exploração guardada por personagem
        const before = m.seenBy[ch.id] || '', enc = C.bitsEnc(C.bitsOr(C.bitsDec(before, V.length), V));
        if (enc !== before) { m.seenBy[ch.id] = enc; changed = true; }
      }
    }
    s = { F, lit: L.lit, chars, cv }; vcache.set(m.id, s);
    if (changed) save();
    return s;
  }
  // o que esta pessoa vê no mapa: null = tudo (Mestre ou névoa desligada)
  function masks(c, m, uid, r) {
    if (!m || r === 'mestre' || !m.fog) return null;
    const s = vstate(c, m), n = m.w * m.h, manual = C.bitsDec(m.seen, n), mode = m.fogMode || 'manual';
    let mine = s.chars.filter(ch => ch.ownerId === uid);
    if (!mine.length) mine = s.chars; // sem personagem neste mapa: vê o que o grupo vê
    const vis = new Uint8Array(n);
    if (mode !== 'manual') for (const ch of mine) C.bitsOr(vis, s.cv.get(ch.id));
    C.bitsOr(vis, manual);
    let seen = vis;
    if (mode === 'descoberto') { seen = vis.slice(); for (const ch of mine) C.bitsOr(seen, C.bitsDec(m.seenBy[ch.id], n)); }
    return { vis, seen };
  }
  const cellOf = (m, x, y) => Math.max(0, Math.min(m.h - 1, Math.round(y))) * m.w + Math.max(0, Math.min(m.w - 1, Math.round(x)));
  const entSeen = (m, e, mk) => { if (!mk) return true; const sz = e.size || 1; for (let a = 0; a < sz; a++) for (let b = 0; b < sz; b++) { const x = Math.round(e.x) + a, y = Math.round(e.y) + b; if (x < m.w && y < m.h && mk.vis[y * m.w + x]) return true; } return false; };

  /* ---------- o que cada um vê ---------- */
  function summary(c, uid) {
    return { id: c.id, scope: c.scope, scopeId: c.scopeId, name: c.name, desc: c.desc, cover: c.cover, state: c.state, masterId: c.masterId,
      players: c.players, invited: c.invited, maxPlayers: c.maxPlayers, open: c.open, createdAt: c.createdAt, createdBy: c.createdBy, role: role(c, uid),
      maps: byCamp(R.maps, c.id).length, chars: byCamp(R.chars, c.id).length };
  }
  const sceneLite = s => ({ id: s.id, name: s.name, desc: s.desc, vis: s.vis, uids: s.uids, chars: s.chars, perm: s.perm, state: s.state, mapId: s.mapId, at: s.at });
  function campView(c, r, uid, sid) {
    const { snapsCache, scenes, combat, ...rest } = c;
    const sc = r === 'mestre' ? (scenes || []).filter(s => s.state === 'ativa' || s.endedAt > now() - 864e5).map(sceneLite)
      : active(c).filter(s => s.uids.includes(uid) || s.vis === 'compartilhada').map(s => ({ id: s.id, name: s.name, desc: s.desc, vis: s.vis, uids: s.uids, perm: s.perm, state: s.state }));
    return { ...rest, role: r, kinds: KINDS, scenes: sc, view: sid, myScene: (sceneOfUser(c, uid) || {}).id || '', combat: combatOf(c, sid) };
  }
  function markSeen(m, mk, uid, r, x) {
    if (r !== 'mestre') { if (x.vis === 'mestre') return false; if (x.vis === 'alguns' && !x.uids.includes(uid)) return false; }
    return !mk || !!mk.seen[cellOf(m, x.x, x.y)];
  }
  function mapView(c, m, r, uid, mk) {
    if (!m) return null;
    const base = { id: m.id, campId: m.campId, name: m.name, kind: m.kind, w: m.w, h: m.h, seed: m.seed, bg: m.bg, pal: m.pal, layers: m.layers, start: m.start,
      fog: m.fog, fogMode: m.fogMode, amb: m.amb, sight: m.sight, lights: m.lights, createdAt: m.createdAt, scene: mapBusy(c, m.id) };
    if (r === 'mestre') return { ...base, doors: m.doors, marks: m.marks, traps: m.traps, notes: m.notes, seen: m.seen, seenBy: m.seenBy };
    return { ...base,
      doors: m.doors.map(d => ({ id: d.id, i: d.i, state: d.state === 'trancada' ? 'fechada' : d.state, look: d.look, name: d.name })),
      marks: m.marks.filter(x => markSeen(m, mk, uid, r, x)).map(x => ({ id: x.id, x: x.x, y: x.y, emoji: x.emoji, size: x.size, name: x.name })),
      traps: m.traps.filter(t => t.on && (!mk || mk.seen[t.i])),
      vis: mk ? C.bitsEnc(mk.vis) : null, seenMask: mk ? C.bitsEnc(mk.seen) : null };
  }
  function entView(e, c, r) {
    if (r === 'mestre') return e;
    if (e.hidden) return undefined;
    const o = { id: e.id, campId: e.campId, mapId: e.mapId, kind: e.kind, name: e.name, img: e.img, emoji: e.emoji, size: e.size, x: e.x, y: e.y, conds: e.conds, color: e.color, level: e.level };
    if (c.rules.monsterHp || e.kind === 'npc' || e.kind === 'objeto') { o.hp = e.hp; o.hpMax = e.hpMax; }
    return o;
  }
  const entsFor = (c, m, r, mk) => (m ? byCamp(R.ents, c.id).filter(e => e.mapId === m.id && entSeen(m, e, mk)).map(e => entView(e, c, r)).filter(Boolean) : []);
  // fichas: todos veem as fichas da campanha, mas a posição só no mapa que estão vendo (e, com névoa, se enxergam)
  function charsFor(c, uid, r, sk) {
    const M = R.maps[mapOfScene(c, viewScene(c, sk))], mk = masks(c, M, uid, r);
    return byCamp(R.chars, c.id).map(ch => {
      const cm = charMap(c, ch), p = ch.pos && ch.pos[cm];
      const o = { ...ch, pos: {}, away: !M || cm !== M.id };
      if (p && M && cm === M.id && (r === 'mestre' || ch.ownerId === uid || !mk || mk.vis[cellOf(M, p[0], p[1])])) o.pos[cm] = p;
      if (r === 'mestre' && p) o.pos[cm] = p;
      if (r !== 'mestre' && ch.ownerId !== uid) { delete o.notes; delete o.notifs; } // avisos são só do dono (e do Mestre)
      return o;
    });
  }
  // histórico: rolagens secretas e acontecimentos de cenas privadas só para quem participa
  function evFor(c, e, uid, r) {
    if (r === 'mestre') return e;
    if (e.priv && e.uid !== uid) return undefined;
    if (e.sc) { const s = sceneById(c, e.sc); if (!s) return undefined; if (!s.uids.includes(uid) && !(s.state === 'ativa' && s.vis === 'compartilhada')) return undefined; }
    if (e.only && !e.only.includes(uid)) return undefined;
    return e;
  }
  function viewPayload(c, m, uid, r, sk) {
    const mk = masks(c, m, uid, r), mv = mapView(c, m, r, uid, mk);
    return { mapId: m.id, vis: mv.vis, seenMask: mv.seenMask, marks: mv.marks, traps: mv.traps, doors: mv.doors,
      ents: entsFor(c, m, r, mk), chars: charsFor(c, uid, r, sk) };
  }
  function full(c, uid, sk) {
    const r = role(c, uid), sid = viewScene(c, sk), cur = R.maps[mapOfScene(c, sid)] || null, mk = masks(c, cur, uid, r);
    const maps = byCamp(R.maps, c.id).sort((a, b) => a.createdAt - b.createdAt);
    return {
      camp: campView(c, r, uid, sid),
      maps: r === 'mestre' ? maps.map(m => ({ id: m.id, name: m.name, kind: m.kind, w: m.w, h: m.h, bg: m.bg, scene: mapBusy(c, m.id) })) : cur ? [{ id: cur.id, name: cur.name, kind: cur.kind, w: cur.w, h: cur.h, bg: cur.bg }] : [],
      map: mapView(c, cur, r, uid, mk),
      ents: entsFor(c, cur, r, mk),
      chars: charsFor(c, uid, r, sk),
      events: evList(c.id).slice(-200).map(e => evFor(c, e, uid, r)).filter(Boolean).slice(-150),
      snaps: r === 'mestre' ? byCamp(R.snaps, c.id).sort((a, b) => b.at - a.at).map(s => ({ id: s.id, name: s.name, at: s.at, by: s.by })) : []
    };
  }

  /* ---------- histórico (rolagens e acontecimentos) ---------- */
  const evIdx = new Map();
  for (const e of Object.values(R.events).sort((a, b) => a.ts - b.ts)) { if (!evIdx.has(e.campId)) evIdx.set(e.campId, []); evIdx.get(e.campId).push(e); }
  const evList = cid => evIdx.get(cid) || [];
  function addEvent(c, e) {
    const ev = { id: newId(), campId: c.id, ts: now(), uid: null, type: 'log', text: '', priv: false, sc: '', ...e };
    if (!ev.sc) delete ev.sc;
    R.events[ev.id] = ev;
    if (!evIdx.has(c.id)) evIdx.set(c.id, []);
    const arr = evIdx.get(c.id); arr.push(ev);
    while (arr.length > LIM.events) delete R.events[arr.shift().id];
    emitCamp(c, 'rpg:event', (uid, r) => evFor(c, ev, uid, r));
    return ev;
  }
  const say = (c, text, extra = {}) => addEvent(c, { type: 'log', text: txt(text, 400), ...extra });

  /* ---------- avisos do personagem: o dono recebe o que aconteceu com ele (dano, cura, atributos, status...) ---------- */
  // fica guardado na ficha (os últimos 60) e chega na hora para o dono, mesmo com a mesa fechada
  function notify(c, ch, list, by) {
    if (!ch || !ch.ownerId || !list.length || by === ch.ownerId) return;
    const at = now(), items = list.slice(0, 20).map(([ic, text, kind]) => ({ id: newId(), ts: at, ic, text: txt(text, 200), kind: kind || 'info' }));
    ch.notifs = [...(ch.notifs || []), ...items].slice(-60);
    toUser(ch.ownerId, 'rpg:notif', { cid: c.id, camp: c.name, charId: ch.id, char: ch.name, items, by: by ? userName(by) : null });
  }
  const sgnN = n => (n > 0 ? '+' : '') + n;
  // compara a ficha antes e depois de o Mestre salvar e descreve o que mudou, em português simples
  function sheetDiff(c, a, b) {
    const out = [], an = k => (c.attrNames && c.attrNames[k]) || k;
    for (const k of c.attrs) { const x = a.attrs[k] ?? 10, y = b.attrs[k] ?? 10; if (x !== y) out.push([y > x ? '⬆️' : '⬇️', `${an(k)}: ${x} → ${y} (${sgnN(y - x)})`, y > x ? 'ganho' : 'perda']); }
    if (a.level !== b.level) out.push(['⭐', `Nível: ${a.level} → ${b.level}`, b.level > a.level ? 'ganho' : 'perda']);
    if (a.hpMax !== b.hpMax) out.push(['❤️', `Vida máxima: ${a.hpMax} → ${b.hpMax}`, b.hpMax > a.hpMax ? 'ganho' : 'perda']);
    if (a.hp !== b.hp) out.push([b.hp < a.hp ? '💥' : '💚', `Vida: ${a.hp} → ${b.hp}/${b.hpMax}`, b.hp < a.hp ? 'dano' : 'cura']);
    if (a.mpMax !== b.mpMax) out.push(['🔷', `Mana máxima: ${a.mpMax} → ${b.mpMax}`, b.mpMax > a.mpMax ? 'ganho' : 'perda']);
    if (a.mp !== b.mp) out.push(['🔷', `Mana: ${a.mp} → ${b.mp}/${b.mpMax}`, b.mp < a.mp ? 'perda' : 'ganho']);
    if (a.def !== b.def) out.push(['🛡️', `Defesa: ${a.def} → ${b.def}`, b.def > a.def ? 'ganho' : 'perda']);
    if (a.classId !== b.classId) { const cl = c.classes.find(k => k.id === b.classId); out.push(['🎭', `Classe: ${cl ? cl.name : 'sem classe'}`]); }
    for (const s of statDefs(c)) { const x = (a.stats || {})[s.id], y = (b.stats || {})[s.id]; const xv = x ? x.v : s.start, yv = y ? y.v : s.start; if (xv !== yv) out.push([s.icon || '📊', `${s.name}: ${xv} → ${yv}`, yv > xv ? 'ganho' : 'perda']); const xm = x && x.max, ym = y && y.max; if ((xm ?? s.max) !== (ym ?? s.max)) out.push([s.icon || '📊', `${s.name} (máximo): ${xm ?? s.max} → ${ym ?? s.max}`]); }
    const names = l => (l || []).map(i => `${i.name}${i.qty !== 1 ? ' ×' + i.qty : ''}`);
    const ia = names(a.inv), ib = names(b.inv);
    for (const n of ib.filter(x => !ia.includes(x))) out.push(['🎒', `Ganhou: ${n}`, 'ganho']);
    for (const n of ia.filter(x => !ib.includes(x))) out.push(['🎒', `Perdeu: ${n}`, 'perda']);
    const ca = a.conds || [], cb = b.conds || [];
    for (const x of cb.filter(y => !ca.includes(y))) out.push(['⚠️', `Você ficou ${x}`, 'perda']);
    for (const x of ca.filter(y => !cb.includes(y))) out.push(['✨', `Não está mais ${x}`, 'ganho']);
    return out;
  }

  /* ---------- dados ---------- */
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
        if (m[3]) { const k = Math.max(1, Math.min(n, +m[4])); kept = rolls.map((v, i) => [v, i]).sort((a, b) => (m[3] === 'kh' ? b[0] - a[0] : a[0] - b[0])).slice(0, k).map(x => x[1]); }
        const sum = kept.reduce((s, i) => s + rolls[i], 0) * sign;
        total += sum; parts.push({ t: (sign < 0 ? '-' : '') + body, sides, rolls, kept, sum });
      } else if (/^\d{1,5}$/.test(body)) { total += sign * +body; parts.push({ t: (sign < 0 ? '-' : '+') + body, mod: sign * +body }); }
      else throw new Error('Não entendi "' + body + '". Exemplos: 1d20+5, 2d6, d100, 4d6kh3.');
    }
    if (!dice) throw new Error('Coloque pelo menos um dado (ex.: 1d20).');
    const one = parts.length === 1 && parts[0].rolls && parts[0].rolls.length === 1 && parts[0].sides === 20 ? parts[0].rolls[0] : null;
    return { expr: src, total, parts, crit: one === 20, fail: one === 1 };
  }

  /* ---------- limpeza dos dados recebidos ---------- */
  function cleanClass(x) {
    if (!x || typeof x !== 'object') return null;
    const name = txt(x.name, 32); if (!name) return null;
    const mods = {}; for (const [k, v] of Object.entries(x.mods || {})) { const kk = txt(k, 6).toUpperCase(); if (kk) mods[kk] = int(v, -10, 10, 0); }
    return { id: txt(x.id, 24) || newId(), name, icon: emo(x.icon) || '🛡️', desc: txt(x.desc, 300), hp: int(x.hp, 1, 999, 8), mp: int(x.mp, 0, 999, 0), mods, skills: txt(x.skills, 800) };
  }
  function cleanRules(v, old = {}) {
    const o = v && typeof v === 'object' ? v : {};
    const b = (k, d) => (k in o ? !!o[k] : (k in old ? !!old[k] : d));
    const gs = ['nenhuma', 'pontos', 'quadrados'].includes(o.gridStyle) ? o.gridStyle : (['nenhuma', 'pontos', 'quadrados'].includes(old.gridStyle) ? old.gridStyle : 'nenhuma');
    return { grid: b('grid', true), lock: b('lock', false), walls: b('walls', true), editOwn: b('editOwn', true), monsterHp: b('monsterHp', false), spect: b('spect', true), doors: b('doors', true), gridStyle: gs };
  }
  const cleanConds = v => list(v, LIM.conds, x => txt(x, 24));
  const statDefs = c => (c.statCats || []).flatMap(k => k.stats);
  // valores dos status de um personagem (o máximo próprio só o Mestre muda)
  function cleanStats(c, given, old, master) {
    const out = {};
    for (const s of statDefs(c)) {
      const o = old && old[s.id], g = given && given[s.id];
      let max = o && Number.isFinite(o.max) ? o.max : null;
      if (master && g && has(g, 'max')) max = g.max === null || g.max === '' ? null : int(g.max, s.min, 99999, s.max);
      const top = max ?? s.max;
      const v = g && has(g, 'v') ? int(g.v, s.min, top, s.start) : o ? int(o.v, s.min, top, s.start) : s.start;
      out[s.id] = max === null ? { v } : { v, max };
    }
    return out;
  }
  function cleanLantern(x, old) {
    if (!x || typeof x !== 'object') return null;
    const kind = C.LANTERN_KINDS[x.kind] ? x.kind : (old && old.kind) || 'lanterna', k = C.LANTERN_KINDS[kind];
    return { kind, on: has(x, 'on') ? !!x.on : old ? old.on : true, range: num(x.range, 1, 30, old ? old.range : k.range), angle: int(x.angle, 10, 360, old ? old.angle : k.angle),
      intensity: int(x.intensity, 5, 100, old ? old.intensity : k.intensity), color: hex(x.color, old ? old.color : k.color), toggle: has(x, 'toggle') ? !!x.toggle : old ? old.toggle : true, req: has(x, 'req') ? !!x.req : old ? old.req : false };
  }
  function cleanChar(d, old, c, master) {
    const attrs = {}; for (const a of c.attrs) attrs[a] = int(d.attrs && d.attrs[a], 1, 30, old ? (old.attrs[a] ?? 10) : 10);
    const hpMax = int(d.hpMax, 1, 9999, old ? old.hpMax : 10), mpMax = int(d.mpMax, 0, 9999, old ? old.mpMax : 0);
    const o = {
      name: txt(d.name, 40) || (old && old.name) || 'Aventureiro',
      classId: c.classes.some(k => k.id === d.classId) ? d.classId : (old ? old.classId : null),
      level: int(d.level, 1, 99, old ? old.level : 1),
      hpMax, hp: int(d.hp, -999, hpMax, old ? Math.min(old.hp, hpMax) : hpMax),
      mpMax, mp: int(d.mp, 0, mpMax, old ? Math.min(old.mp, mpMax) : mpMax),
      def: int(d.def, 0, 99, old ? old.def : 10),
      attrs,
      stats: cleanStats(c, d.stats, old && old.stats, master),
      skills: txt(d.skills, 1500),
      inv: list(d.inv, LIM.inv, x => (x && txt(x.name, 40) ? { id: txt(x.id, 24) || newId(), name: txt(x.name, 40), qty: int(x.qty, 0, 9999, 1), note: txt(x.note, 120) } : null)),
      conds: cleanConds(d.conds),
      notes: txt(d.notes, 2000),
      img: img(d.img),
      color: hex(d.color, old ? old.color : '#6c7cff')
    };
    // visão e lanterna: só o Mestre decide (o jogador não pode se dar visão no escuro)
    o.sight = master && has(d, 'sight') ? int(d.sight, 1, 30, 12) : old ? old.sight ?? null : null;
    o.dark = master && has(d, 'dark') ? int(d.dark, 0, 30, 1) : old ? old.dark ?? 1 : 1;
    if (master && has(d, 'sight') && (d.sight === null || d.sight === '')) o.sight = null;
    return o;
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
  function cleanStatCats(v) {
    const ids = new Set(), uid = x => { let id = txt(x, 24) || newId(); if (ids.has(id)) id = newId(); ids.add(id); return id; };
    return list(v, LIM.cats, cat => {
      if (!cat || typeof cat !== 'object') return null;
      const name = txt(cat.name, 30); if (!name) return null;
      const stats = list(cat.stats, LIM.stats, s => {
        if (!s || typeof s !== 'object') return null; const n = txt(s.name, 30); if (!n) return null;
        const min = int(s.min, -9999, 9999, 0), max = Math.max(min, int(s.max, -9999, 9999, 10));
        const rg = s.regen && typeof s.regen === 'object' ? s.regen : {};
        return { id: uid(s.id), name: n, desc: txt(s.desc, 200), icon: emo(s.icon) || '', color: hex(s.color, hex(cat.color, '#6c7cff')), min, max, start: int(s.start, min, max, min),
          show: ['barra', 'numero', 'pontos'].includes(s.show) ? s.show : 'barra',
          regen: { n: int(rg.n, -999, 999, 0), on: ['turno', 'rodada', 'descanso'].includes(rg.on) ? rg.on : 'nunca' },
          mods: list(s.mods, LIM.smods, md => (md && txt(md.attr, 6) && int(md.v, -20, 20, 0) ? { attr: txt(md.attr, 6).toUpperCase(), v: int(md.v, -20, 20, 0), op: md.op === '<=' ? '<=' : '>=', at: int(md.at, -9999, 9999, 0) } : null)) };
      });
      return { id: uid(cat.id), name, icon: emo(cat.icon) || '', color: hex(cat.color, '#6c7cff'), stats };
    });
  }
  const suggestedStats = () => cleanStatCats(DEF_STATS.map(([name, icon, color, st]) => ({ name, icon, color, stats: st.map(([n, ic, start, min, max, show, [rn, ron], mods]) => ({ name: n, icon: ic, start, min, max, show, regen: { n: rn, on: ron }, mods: mods.map(([attr, v, op, at]) => ({ attr, v, op, at })) })) })));
  function cleanMat(x, old) {
    if (!x || typeof x !== 'object') return null;
    const L = C.LAYERS.includes(x.L) ? x.L : old ? old.L : null; if (!L) return null;
    const n = txt(x.n, 30); if (!n) return null;
    const color = hex(x.color, old ? old.color : '#7a7a7a');
    return { id: old ? old.id : 'u-' + newId(), n, cat: C.CATS[x.cat] ? x.cat : 'custom', L, color, c: [color, shade(color, -0.14), shade(color, 0.14)],
      st: C.STYLES[L].includes(x.st) ? x.st : C.STYLES[L][0], img: has(x, 'img') ? img(x.img) : old ? old.img : null, emoji: emo(x.emoji),
      w: x.w ? 1 : 0, s: x.s ? 1 : 0, l: x.l ? 1 : 0, glow: x.glow ? color : null };
  }
  function cleanDoor(x, old, m) {
    const i = int(x.i, 0, m.w * m.h - 1, old ? old.i : 0);
    const test = x.test && typeof x.test === 'object' && txt(x.test.attr, 6) ? { attr: txt(x.test.attr, 6).toUpperCase(), dc: int(x.test.dc, 1, 40, 12) } : (has(x, 'test') ? null : old ? old.test : null);
    return { id: old ? old.id : newId(), i, name: has(x, 'name') ? txt(x.name, 30) : old ? old.name || '' : '',
      state: C.DOOR_STATES.includes(x.state) ? x.state : old ? old.state : 'fechada', look: C.DOOR_LOOKS[x.look] ? x.look : old ? old.look : 'madeira',
      open: has(x, 'open') ? !!x.open : old ? old.open : true, close: has(x, 'close') ? !!x.close : old ? old.close : true,
      key: has(x, 'key') ? txt(x.key, 40) : old ? old.key : '', test, msg: has(x, 'msg') ? txt(x.msg, 160) : old ? old.msg : '' };
  }
  function cleanLight(x, old, m) {
    return { id: old ? old.id : newId(), name: has(x, 'name') ? txt(x.name, 30) : old ? old.name : 'Lâmpada',
      x: int(x.x, 0, m.w - 1, old ? old.x : 0), y: int(x.y, 0, m.h - 1, old ? old.y : 0), r: num(x.r, 0, 30, old ? old.r : 5),
      intensity: int(x.intensity, 5, 100, old ? old.intensity : 80), color: hex(x.color, old ? old.color : '#ffd98a'),
      shape: C.LIGHT_SHAPES.includes(x.shape) ? x.shape : old ? old.shape : 'circulo', dir: int(x.dir, 0, 359, old ? old.dir : 0), angle: int(x.angle, 10, 360, old ? old.angle : 90),
      thru: has(x, 'thru') ? list(x.thru, 20, t => txt(t, 40)) : old ? old.thru : [], on: has(x, 'on') ? !!x.on : old ? old.on : true };
  }
  function cleanMark(x, old, m) {
    return { id: old ? old.id : newId(), x: num(x.x, 0, m.w - 1, old ? old.x : 0), y: num(x.y, 0, m.h - 1, old ? old.y : 0),
      emoji: emo(x.emoji) || (old ? old.emoji : '📍'), size: num(x.size, 0.4, 4, old ? old.size : 1), name: has(x, 'name') ? txt(x.name, 40) : old ? old.name : '',
      vis: ['todos', 'mestre', 'alguns'].includes(x.vis) ? x.vis : old ? old.vis : 'todos', uids: has(x, 'uids') ? list(x.uids, 30, u => str(u, 40)) : old ? old.uids : [] };
  }

  /* ---------- migração (campanhas e mapas antigos) ---------- */
  // atributos antigos: Sabedoria + Inteligência viram Intelecto (média), Lábia entra no Carisma (o maior) e a
  // Percepção começa com o valor da antiga Sabedoria. Os valores antigos ficam guardados em ch.attrsOld.
  function upgradeCamp(c) {
    if (c.v >= 2) return false;
    const a = Array.isArray(c.attrs) ? c.attrs.slice() : DEF_ATTRS.slice();
    const LAB = ['LAB', 'LABIA', 'LÁBIA'], hadSab = a.includes('SAB'), lab = a.filter(x => LAB.includes(x));
    let attrs = a.filter(x => x !== 'SAB' && !LAB.includes(x));
    if (hadSab && !attrs.includes('INT')) attrs.splice(Math.min(3, attrs.length), 0, 'INT');
    if (lab.length && !attrs.includes('CAR')) attrs.push('CAR');
    if (!attrs.includes('PER')) attrs.push('PER');
    attrs = attrs.slice(0, LIM.attrs);
    for (const ch of byCamp(R.chars, c.id)) {
      const o = { ...(ch.attrs || {}) }, n = {};
      for (const k of attrs) n[k] = o[k] ?? 10;
      if (hadSab) { n.INT = has(o, 'INT') ? Math.round(((+o.INT || 10) + (+o.SAB || 10)) / 2) : (+o.SAB || 10); if (attrs.includes('PER')) n.PER = has(o, 'PER') ? o.PER : (+o.SAB || 10); }
      if (lab.length) n.CAR = Math.max(+o.CAR || 0, ...lab.map(k => +o[k] || 0)) || 10;
      if (hadSab || lab.length) ch.attrsOld = o;
      ch.attrs = n;
      ch.stats = ch.stats || {};
    }
    for (const k of c.classes || []) {
      const mods = { ...(k.mods || {}) };
      if (has(mods, 'SAB')) { mods.INT = Math.max(-10, Math.min(10, (mods.INT || 0) + mods.SAB)); delete mods.SAB; }
      for (const l of LAB) if (has(mods, l)) { mods.CAR = Math.max(-10, Math.min(10, (mods.CAR || 0) + mods[l])); delete mods[l]; }
      k.mods = mods;
    }
    c.attrs = attrs;
    c.attrNames = { ...ATTR_NAMES, ...(c.attrNames || {}) };
    c.statCats = c.statCats || [];
    c.mats = c.mats || [];
    c.scenes = c.scenes || [];
    c.rules = cleanRules(c.rules, c.rules);
    c.v = 2;
    return true;
  }
  const doorObj = i => ({ id: newId(), i, name: '', state: 'fechada', look: 'madeira', open: true, close: true, key: '', test: null, msg: '' });
  // mapa antigo (uma letra por casa) → camadas independentes, portas, luzes e marcadores
  function upgradeMap(m) {
    let ch = false;
    if (!m.layers) {
      if (m.bg || !m.tiles) { Object.assign(m, C.emptyLayers(m.w, m.h, 'pedra')); m.doors = m.doors || []; }
      else { const L = C.fromTiles(m.tiles, m.w, m.h, m.kind); m.pal = L.pal; m.layers = L.layers; m.doors = L.doors.map(doorObj); }
      delete m.tiles; ch = true;
    }
    if (typeof m.seen === 'string' && /^[01]*$/.test(m.seen) && m.seen.length === m.w * m.h && m.w * m.h > 0) { m.seen = C.bitsEnc([...m.seen].map(x => (x === '1' ? 1 : 0))); ch = true; }
    for (const [k, d] of [['doors', []], ['lights', []], ['marks', []], ['traps', []], ['seenBy', {}]]) if (!m[k] || typeof m[k] !== 'object') { m[k] = d; ch = true; }
    if (!m.fogMode) { m.fogMode = 'manual'; ch = true; }
    if (!m.amb) { m.amb = 'dia'; ch = true; }
    if (!m.sight) { m.sight = 12; ch = true; }
    if (typeof m.seen !== 'string') { m.seen = ''; ch = true; }
    return ch;
  }
  function migrateAll() {
    let n = 0;
    for (const c of Object.values(R.camps)) if (upgradeCamp(c)) n++;
    for (const m of Object.values(R.maps)) if (upgradeMap(m)) n++;
    for (const s of Object.values(R.snaps)) if (s.data && Array.isArray(s.data.maps)) for (const m of s.data.maps) if (upgradeMap(m)) n++;
    for (const ch of Object.values(R.chars)) { if (!ch.stats) { ch.stats = {}; n++; } if (!('dir' in ch)) { ch.dir = 0; n++; } }
    if (n) { save(); log(`   RPG: ${n} item(ns) atualizados para o formato novo (atributos, camadas do mapa, portas e luzes).`); }
  }

  /* ---------- mapas ---------- */
  function mapFromGen(g) {
    const L = C.fromTiles(g.tiles, g.w, g.h, g.kind);
    const { tiles, decor, lights, ...rest } = g;
    // móveis e pisos das salas (cada sala com sua função) e as luzes de fogueiras e braseiros
    const M = { w: g.w, h: g.h, pal: L.pal, layers: L.layers };
    if (decor && decor.length) C.setCells(M, decor);
    const ls = (lights || []).slice(0, LIM.lights).map(x => ({ id: newId(), name: 'Luz', x: x.x, y: x.y, r: x.r, intensity: x.intensity || 80, color: x.color || '#ffb35a', shape: 'circulo', dir: 0, angle: 90, thru: [], on: true }));
    return { ...rest, pal: M.pal, layers: M.layers, doors: L.doors.map(doorObj), lights: ls };
  }
  function newMap(c, data) {
    if (byCamp(R.maps, c.id).length >= LIM.maps) throw new Error(`Limite de ${LIM.maps} mapas por campanha. Apague algum.`);
    const m = { id: newId(), campId: c.id, createdAt: now(), fog: false, fogMode: 'manual', amb: 'dia', sight: 12, seen: '', seenBy: {}, bg: null, notes: '', doors: [], lights: [], marks: [], traps: [], ...data };
    R.maps[m.id] = m;
    return m;
  }
  function setActive(c, m) {
    c.mapId = m ? m.id : null;
    if (m) for (const ch of byCamp(R.chars, c.id)) if (!sceneOfChar(c, ch.id) && !ch.pos[m.id]) ch.pos[m.id] = spawn(m, ch);
    dirty(m); emitState(c);
  }
  function spawn(m, ch, near) {
    const s = near || m.start || [Math.floor(m.w / 2), Math.floor(m.h / 2)];
    return freeSpot(ch.campId, m, s[0], s[1], 1, ch.id);
  }
  // casa livre mais próxima (onde dá para andar e sem ninguém em cima)
  function freeSpot(campId, m, x, y, size = 1, skip = null) {
    const c = R.camps[campId], F = C.flags(m, c && c.mats), occ = new Set(), cell = (px, py) => Math.round(py) * m.w + Math.round(px);
    for (const e of byCamp(R.ents, campId)) if (e.mapId === m.id && e.id !== skip) for (let a = 0; a < (e.size || 1); a++) for (let b = 0; b < (e.size || 1); b++) occ.add(cell(e.x + a, e.y + b));
    for (const k of byCamp(R.chars, campId)) { const p = k.pos && k.pos[m.id]; if (p && k.id !== skip) occ.add(cell(p[0], p[1])); }
    const fits = (px, py) => { for (let a = 0; a < size; a++) for (let b = 0; b < size; b++) { const xx = px + a, yy = py + b; if (xx >= m.w || yy >= m.h || (F[yy * m.w + xx] & 1) || occ.has(yy * m.w + xx)) return false; } return true; };
    const sx = Math.max(0, Math.min(m.w - 1, Math.round(x))), sy = Math.max(0, Math.min(m.h - 1, Math.round(y)));
    for (let r = 0; r < Math.max(m.w, m.h); r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const px = sx + dx, py = sy + dy; if (px < 0 || py < 0 || px >= m.w || py >= m.h) continue;
      if (fits(px, py)) return [px, py];
    }
    return [sx, sy];
  }
  // depois de mudar algo do mapa: quem vê manda o mapa novo e a visão é recalculada
  function mapChanged(c, m) {
    dirty(m);
    emitMap(c, m.id, 'rpg:map', (u, r, sk) => mapView(c, m, r, u, null));
    if (m.fog) { each(c, (sk, uid, r) => { if (r !== 'mestre' && mapOfScene(c, viewScene(c, sk)) === m.id) sk.emit('rpg:map', mapView(c, m, r, uid, masks(c, m, uid, r))); }); pushView(c, m); }
  }

  /* ---------- combate ---------- */
  const fighter = (c, f) => (f.k === 'c' ? R.chars[f.id] : R.ents[f.id]);
  // recuperação dos status: "turno" (na vez do personagem), "rodada" (começo de cada rodada) e "descanso"
  function regen(c, chars, on) {
    let any = false;
    for (const ch of chars) for (const s of statDefs(c)) {
      if (s.regen.on !== on || !s.regen.n) continue;
      const x = ch.stats[s.id] || { v: s.start }, top = x.max ?? s.max, v = Math.max(s.min, Math.min(top, x.v + s.regen.n));
      if (v !== x.v) { ch.stats[s.id] = { ...x, v }; any = true; }
    }
    return any;
  }

  /* ---------- limpeza de campanhas sem grupo/conversa ---------- */
  function dropCamp(c) {
    for (const coll of [R.chars, R.maps, R.ents, R.snaps]) for (const x of byCamp(coll, c.id)) { delete coll[x.id]; vcache.delete(x.id); }
    for (const e of evList(c.id)) delete R.events[e.id];
    evIdx.delete(c.id);
    emitCamp(c, 'rpg:closed', { cid: c.id, why: 'Esta campanha foi apagada.' });
    viewers.delete(c.id);
    delete R.camps[c.id];
  }
  function prune() {
    let n = 0;
    for (const c of Object.values(R.camps)) if (!scopeOf(c)) { dropCamp(c); n++; }
    for (const coll of [R.chars, R.maps, R.ents, R.snaps, R.events]) for (const x of Object.values(coll)) if (!R.camps[x.campId]) { delete coll[x.id]; n++; }
    if (n) { save(); log(`   RPG: ${n} item(ns) de campanhas sem grupo/conversa removidos.`); }
  }
  prune();
  migrateAll();
  setInterval(prune, 10 * 60e3).unref();

  /* ---------- eventos do Socket.IO ---------- */
  function bind(socket, uid, on, ok, fail) {
    const me = () => users[uid];
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
    const myView = c => viewScene(c, socket);
    const myMap = c => R.maps[mapOfScene(c, myView(c))] || null;
    // mapa da campanha pedido pelo Mestre (ou o que ele está vendo)
    const mapArg = (c, d) => { const m = d && d.mapId ? R.maps[str(d.mapId, 40)] : myMap(c); return m && m.campId === c.id ? m : null; };

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
        attrs: DEF_ATTRS.slice(), attrNames: { ...ATTR_NAMES }, rules: cleanRules(d.rules), statCats: suggestedStats(), mats: [], scenes: [], v: 2,
        classes: DEF_CLASSES.map(([n, icon, desc, hp, mp, mods, skills]) => ({ id: newId(), name: n, icon, desc, hp, mp, mods, skills })),
        mapId: null, combat: { on: false, round: 1, turn: 0, order: [] }
      };
      R.camps[c.id] = c;
      const m = newMap(c, mapFromGen(generate({ kind: 'masmorra', w: 30, h: 22, rooms: 7, traps: 3 })));
      c.mapId = m.id;
      say(c, `${userName(uid)} criou a campanha "${c.name}" e é o Mestre.`, { type: 'sys' });
      save(); touchScope(c);
      log(`   RPG: @${me().username} criou a campanha "${c.name}".`);
      ok(cb, { camp: summary(c, uid) });
    });

    on('rpg:open', (d, cb) => {
      const c = camp(d); if (!c) return fail(cb, 'Campanha não encontrada ou sem acesso.');
      watch(socket, c.id);
      socket.data.view = typeof d.view === 'string' ? str(d.view, 40) : '';
      ok(cb, full(c, uid, socket));
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
      if ('attrs' in d) { // [{k: 'FOR', n: 'Força'}] ou ['FOR', ...]
        const names = {}, a = [];
        for (const x of Array.isArray(d.attrs) ? d.attrs.slice(0, LIM.attrs) : []) {
          const k = txt(typeof x === 'object' && x ? x.k : x, 6).toUpperCase(); if (!k || a.includes(k)) continue;
          a.push(k); names[k] = txt(typeof x === 'object' && x ? x.n : '', 20) || (c.attrNames && c.attrNames[k]) || ATTR_NAMES[k] || k;
        }
        if (!a.length) return fail(cb, 'Deixe pelo menos um atributo.');
        c.attrs = a; c.attrNames = names;
        for (const ch of byCamp(R.chars, c.id)) { const n = {}; for (const k of a) n[k] = ch.attrs[k] ?? 10; ch.attrs = n; }
      }
      if ('classes' in d) {
        const cl = list(d.classes, LIM.classes, cleanClass);
        const ids = new Set(); c.classes = cl.filter(x => !ids.has(x.id) && ids.add(x.id));
        for (const ch of byCamp(R.chars, c.id)) if (ch.classId && !ids.has(ch.classId)) ch.classId = null;
      }
      touched(c); touchScope(c); emitState(c);
      ok(cb, {});
    });

    // status personalizados: categorias e subcategorias (o Mestre cria, edita, apaga e reorganiza)
    on('rpg:stats', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      c.statCats = d.suggest ? suggestedStats() : cleanStatCats(d.cats);
      for (const ch of byCamp(R.chars, c.id)) ch.stats = cleanStats(c, null, ch.stats, true);
      touched(c); emitState(c); ok(cb, {});
    });
    // muda um status de um personagem (o Mestre, ou o dono se a regra deixar)
    on('rpg:stat', (d, cb) => {
      const c = camp(d, 'jogar'); if (!c) return fail(cb, NO);
      const ch = R.chars[str(d.id, 40)]; if (!ch || ch.campId !== c.id) return fail(cb, 'Ficha não encontrada.');
      const master = isM(c, uid); if (!master && !(ch.ownerId === uid && c.rules.editOwn)) return fail(cb, 'Só o Mestre pode mudar isso.');
      const s = statDefs(c).find(x => x.id === str(d.stat, 40)); if (!s) return fail(cb, 'Status não encontrado.');
      const x = ch.stats[s.id] || { v: s.start }, top = x.max ?? s.max;
      const v = has(d, 'v') ? int(d.v, s.min, top, x.v) : Math.max(s.min, Math.min(top, x.v + int(d.dv, -9999, 9999, 0)));
      ch.stats[s.id] = { ...x, v };
      if (v !== x.v) notify(c, ch, [[s.icon || '📊', `${s.name}: ${x.v} → ${v}`, v > x.v ? 'ganho' : 'perda']], uid);
      touched(c); emitChars(c); ok(cb, { v });
    });
    // descanso: aplica a recuperação "descanso" dos status nos personagens da cena que o Mestre está vendo
    on('rpg:rest', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const sid = myView(c), mid = mapOfScene(c, sid), chars = byCamp(R.chars, c.id).filter(ch => charMap(c, ch) === mid);
      const before = new Map(chars.map(ch => [ch.id, clone(ch)]));
      regen(c, chars, 'descanso');
      if (d.full) for (const ch of chars) { ch.hp = ch.hpMax; ch.mp = ch.mpMax; }
      for (const ch of chars) notify(c, ch, [['🏕️', d.full ? 'Descanso longo: vida e mana cheias.' : 'Descanso curto.', 'cura'], ...sheetDiff(c, before.get(ch.id), ch).filter(x => x[0] !== '💚' && !/^Mana:/.test(x[1]))], uid);
      say(c, `🏕️ O grupo descansou${d.full ? ' e recuperou vida e mana' : ''}.`, { type: 'sys', sc: sid });
      touched(c); emitChars(c); ok(cb, {});
    });
    // materiais personalizados (nome, categoria, camada, cor, estilo, imagem de textura e propriedades)
    on('rpg:mat:save', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const x = d.mat || {}, old = x.id ? c.mats.find(k => k.id === str(x.id, 40)) : null;
      if (!old && c.mats.length >= LIM.mats) return fail(cb, `Limite de ${LIM.mats} materiais personalizados.`);
      const mt = cleanMat(x, old); if (!mt) return fail(cb, 'Dê um nome e escolha a camada do material.');
      if (old) Object.assign(old, mt); else c.mats.push(mt);
      for (const m of byCamp(R.maps, c.id)) dirty(m);
      touched(c); emitState(c); ok(cb, { id: mt.id });
    });
    on('rpg:mat:del', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const id = str(d.id, 40), k = c.mats.findIndex(x => x.id === id); if (k < 0) return fail(cb, 'Material não encontrado.');
      c.mats.splice(k, 1);
      // tira o material dos mapas (no chão ele vira pedra)
      for (const m of byCamp(R.maps, c.id)) {
        const cells = [];
        for (const L of C.LAYERS) for (let i = 0; i < m.w * m.h; i++) if (C.cellId(m, L, i) === id) cells.push([i, L, L === 'chao' ? 'pedra' : null]);
        if (cells.length) { C.setCells(m, cells); C.compactPal(m); }
        dirty(m);
      }
      touched(c); emitState(c); ok(cb, {});
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
      touched(c); touchScope(c); emitState(c);
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
      touched(c); touchScope(c); emitState(c);
      ok(cb, {});
    });
    on('rpg:decline', (d, cb) => {
      const c = R.camps[str(d.cid, 40)]; if (!c || !c.invited.includes(uid)) return fail(cb, 'Convite não encontrado.');
      c.invited = c.invited.filter(x => x !== uid); touched(c); touchScope(c); emitState(c); ok(cb, {});
    });
    const leaveScenes = (c, x) => { for (const s of active(c)) { s.uids = s.uids.filter(y => y !== x); s.chars = s.chars.filter(k => !R.chars[k] || R.chars[k].ownerId !== x); } };
    on('rpg:leave', (d, cb) => {
      const c = R.camps[str(d.cid, 40)]; if (!c || !c.players.includes(uid)) return fail(cb, 'Você não está nesta campanha como jogador.');
      c.players = c.players.filter(x => x !== uid); leaveScenes(c, uid);
      say(c, `${userName(uid)} saiu da campanha.`, { type: 'sys' });
      touched(c); touchScope(c); emitState(c); ok(cb, {});
    });
    on('rpg:kick', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const x = str(d.uid, 40); if (!c.players.includes(x) && !c.invited.includes(x)) return fail(cb, 'Essa pessoa não está na campanha.');
      c.players = c.players.filter(y => y !== x); c.invited = c.invited.filter(y => y !== x); leaveScenes(c, x);
      say(c, `${userName(x)} foi tirado da campanha pelo Mestre.`, { type: 'sys' });
      touched(c); touchScope(c); emitState(c); ok(cb, {});
    });
    on('rpg:master', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const x = str(d.uid, 40), s = scopeOf(c);
      if (!s.members.includes(x) || x === uid || !users[x] || users[x].bot) return fail(cb, 'Escolha alguém do grupo.');
      c.players = c.players.filter(y => y !== x); c.invited = c.invited.filter(y => y !== x); leaveScenes(c, x);
      if (!c.players.includes(uid) && c.players.length < LIM.players) c.players.push(uid);
      c.masterId = x;
      say(c, `${userName(x)} agora é o Mestre da campanha.`, { type: 'sys' });
      touched(c); touchScope(c); emitState(c); ok(cb, {});
    });

    /* ----- mapas ----- */
    on('rpg:map:gen', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      if (limited('rpg-gen:' + uid, 30, 60e3)) return fail(cb, 'Calma! Muitos mapas seguidos.');
      let m;
      try {
        const g = mapFromGen(generate({ kind: d.kind, w: d.w, h: d.h, rooms: d.rooms, obst: d.obst, doors: d.doors !== false, traps: d.traps, wide: d.wide, seed: d.seed }));
        const old = d.replace && R.maps[str(d.replace, 40)];
        if (old && old.campId === c.id) {
          Object.assign(old, g, { name: txt(d.name, 40) || old.name, bg: null, seen: '', seenBy: {}, marks: [] });
          for (const e of byCamp(R.ents, c.id)) if (e.mapId === old.id) { e.x = Math.min(e.x, g.w - 1); e.y = Math.min(e.y, g.h - 1); }
          for (const ch of byCamp(R.chars, c.id)) if (ch.pos[old.id]) ch.pos[old.id] = spawn(old, ch);
          m = old;
        } else m = newMap(c, { ...g, name: txt(d.name, 40) || g.name });
      } catch (e) { return fail(cb, e.message); }
      dirty(m);
      if (d.replace) { say(c, `O Mestre refez o mapa "${m.name}".`, { type: 'sys', sc: myView(c) }); touched(c); emitState(c); return ok(cb, { id: m.id }); }
      if (d.keep) { touched(c); emitState(c); return ok(cb, { id: m.id }); } // só cria (para usar numa cena)
      say(c, `O Mestre criou o mapa "${m.name}".`, { type: 'sys' });
      setActive(c, m); touched(c);
      ok(cb, { id: m.id });
    });
    on('rpg:map:img', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const bg = img(d.url); if (!bg) return fail(cb, 'Envie a imagem do mapa primeiro.');
      const w = int(d.w, 4, 80, 30), h = int(d.h, 4, 80, 20);
      let m; try { m = newMap(c, { name: txt(d.name, 40) || 'Mapa importado', kind: 'imagem', w, h, seed: 0, ...C.emptyLayers(w, h, 'pedra'), start: [Math.floor(w / 2), Math.floor(h / 2)], bg }); } catch (e) { return fail(cb, e.message); }
      say(c, `O Mestre importou o mapa "${m.name}".`, { type: 'sys' });
      setActive(c, m); touched(c); ok(cb, { id: m.id });
    });
    on('rpg:map:set', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const m = R.maps[str(d.mapId, 40)]; if (!m || m.campId !== c.id) return fail(cb, 'Mapa não encontrado.');
      if (mapBusy(c, m.id) === 'cena') return fail(cb, 'Este mapa está sendo usado numa cena. Encerre a cena antes.');
      say(c, `O grupo foi para o mapa "${m.name}".`, { type: 'sys' });
      socket.data.view = '';
      setActive(c, m); touched(c); ok(cb, {});
    });
    on('rpg:map:edit', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const m = R.maps[str(d.mapId, 40)]; if (!m || m.campId !== c.id) return fail(cb, 'Mapa não encontrado.');
      const n = m.w * m.h;
      if ('name' in d) m.name = txt(d.name, 40) || m.name;
      if ('notes' in d) m.notes = txt(d.notes, 2000);
      if (Array.isArray(d.cells)) { // pincel: [[índice, camada, material ou null], ...]; cada camada é independente
        const cells = [];
        for (const x of d.cells.slice(0, 6000)) {
          if (!Array.isArray(x)) continue;
          const [i, L, id] = x;
          if (!Number.isInteger(i) || i < 0 || i >= n || !C.LAYERS.includes(L)) continue;
          if (id === null) { if (L !== 'chao') cells.push([i, L, null]); continue; }
          const mt = C.mat(str(id, 40), c.mats); if (!mt || mt.L !== L) continue;
          cells.push([i, L, mt.id]);
        }
        C.setCells(m, cells);
      }
      if (Array.isArray(d.traps)) {
        for (const [i, on, del] of d.traps.slice(0, 200)) {
          if (!Number.isInteger(i) || i < 0 || i >= n) continue;
          const k = m.traps.findIndex(x => x.i === i);
          if (del) { if (k >= 0) m.traps.splice(k, 1); } else if (k >= 0) m.traps[k].on = !!on; else if (m.traps.length < 60) m.traps.push({ i, on: !!on });
        }
      }
      if ('fog' in d) m.fog = !!d.fog;
      if ('fogMode' in d && C.FOG_MODES[d.fogMode]) m.fogMode = d.fogMode;
      if ('amb' in d && C.AMBIENTS[d.amb]) m.amb = d.amb;
      if ('sight' in d) m.sight = int(d.sight, 1, 30, m.sight);
      if (d.resetExplore) m.seenBy = {};
      if (d.fogAll === 'show' || d.fogAll === 'hide') m.seen = C.bitsEnc(new Uint8Array(n).fill(d.fogAll === 'show' ? 1 : 0));
      if (Array.isArray(d.reveal) || Array.isArray(d.hide)) {
        const s = C.bitsDec(m.seen, n);
        for (const i of (d.reveal || []).slice(0, 6000)) if (Number.isInteger(i) && i >= 0 && i < n) s[i] = 1;
        for (const i of (d.hide || []).slice(0, 6000)) if (Number.isInteger(i) && i >= 0 && i < n) s[i] = 0;
        m.seen = C.bitsEnc(s);
      }
      touched(c); mapChanged(c, m);
      ok(cb, {});
    });
    on('rpg:map:del', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const m = R.maps[str(d.mapId, 40)]; if (!m || m.campId !== c.id) return fail(cb, 'Mapa não encontrado.');
      if (mapBusy(c, m.id) === 'cena') return fail(cb, 'Este mapa está numa cena ativa. Encerre a cena antes.');
      for (const e of byCamp(R.ents, c.id)) if (e.mapId === m.id) delete R.ents[e.id];
      for (const ch of byCamp(R.chars, c.id)) delete ch.pos[m.id];
      delete R.maps[m.id]; vcache.delete(m.id);
      c.combat.order = c.combat.order.filter(f => fighter(c, f));
      if (c.mapId === m.id) { const next = byCamp(R.maps, c.id).filter(x => !mapBusy(c, x.id)).sort((a, b) => b.createdAt - a.createdAt)[0] || null; setActive(c, next); }
      else emitState(c);
      touched(c); ok(cb, {});
    });

    /* ----- portas ----- */
    on('rpg:door:save', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const m = mapArg(c, d); if (!m) return fail(cb, 'Mapa não encontrado.');
      const x = d.door || {}, old = x.id ? m.doors.find(k => k.id === str(x.id, 40)) : null;
      if (!old) {
        if (m.doors.length >= LIM.doors) return fail(cb, 'Portas demais neste mapa.');
        const i = int(x.i, 0, m.w * m.h - 1, -1); if (i < 0) return fail(cb, 'Escolha uma casa.');
        if (m.doors.some(k => k.i === i)) return fail(cb, 'Já tem uma porta nesta casa.');
        const dr = cleanDoor(x, null, m); m.doors.push(dr);
        C.setCells(m, [[i, 'parede', null], [i, 'objeto', null]]); // a porta ocupa a abertura da parede; o chão fica igual
      } else Object.assign(old, cleanDoor({ ...x, i: old.i }, old, m));
      touched(c); mapChanged(c, m); ok(cb, {});
    });
    on('rpg:door:del', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const m = mapArg(c, d); if (!m) return fail(cb, 'Mapa não encontrado.');
      const k = m.doors.findIndex(x => x.id === str(d.id, 40)); if (k < 0) return fail(cb, 'Porta não encontrada.');
      m.doors.splice(k, 1); touched(c); mapChanged(c, m); ok(cb, {});
    });
    // abrir, fechar, trancar e destrancar. Jogadores: só perto da porta e se o Mestre deixar; trancada só com chave ou teste
    on('rpg:door', (d, cb) => {
      const c = camp(d, 'jogar'); if (!c) return fail(cb, NO);
      if (limited('rpg-door:' + uid, 30, 30e3)) return fail(cb, 'Calma com as portas!');
      const m = mapArg(c, isM(c, uid) ? d : {}); if (!m) return fail(cb, 'Mapa não encontrado.');
      const dr = m.doors.find(x => x.id === str(d.id, 40)); if (!dr) return fail(cb, 'Porta não encontrada.');
      const act = str(d.action, 12), sid = myView(c), label = dr.name ? `a porta "${dr.name}"` : 'a porta';
      const occupied = () => byCamp(R.chars, c.id).some(k => charMap(c, k) === m.id && k.pos[m.id] && cellOf(m, k.pos[m.id][0], k.pos[m.id][1]) === dr.i) || byCamp(R.ents, c.id).some(e => e.mapId === m.id && cellOf(m, e.x, e.y) === dr.i);
      const done = (text, extra = {}) => { touched(c); mapChanged(c, m); if (text) say(c, text, { type: 'sys', sc: sid, ...extra }); };
      if (isM(c, uid)) {
        const st = { abrir: 'aberta', fechar: 'fechada', trancar: 'trancada', destrancar: 'fechada' }[act]; if (!st) return fail(cb, 'Ação inválida.');
        if (st !== 'aberta' && occupied()) return fail(cb, 'Tem alguém parado na porta.');
        dr.state = st; done(null); return ok(cb, { state: st });
      }
      if (!c.rules.doors) return fail(cb, 'O Mestre não deixa os jogadores mexerem nas portas.');
      if (ended(c) || c.state === 'pausada') return fail(cb, 'A campanha está parada.');
      if (!scenePerm(c, uid, 'move')) return fail(cb, 'Nesta cena o Mestre controla tudo.');
      // um personagem seu precisa estar do lado da porta
      const dx = dr.i % m.w, dy = (dr.i / m.w) | 0;
      const who = byCamp(R.chars, c.id).find(k => k.ownerId === uid && charMap(c, k) === m.id && k.pos[m.id] && Math.max(Math.abs(Math.round(k.pos[m.id][0]) - dx), Math.abs(Math.round(k.pos[m.id][1]) - dy)) <= 1);
      if (!who) return fail(cb, 'Chegue perto da porta primeiro.');
      if (act === 'fechar') {
        if (dr.state !== 'aberta') return ok(cb, { state: dr.state });
        if (!dr.close) return fail(cb, dr.msg || 'Esta porta não fecha.');
        if (occupied()) return fail(cb, 'Tem alguém parado na porta.');
        dr.state = 'fechada'; done(`🚪 ${who.name} fechou ${label}.`); return ok(cb, { state: dr.state });
      }
      if (act !== 'abrir') return fail(cb, 'Só o Mestre tranca e destranca portas.');
      if (dr.state === 'aberta') return ok(cb, { state: dr.state });
      if (!dr.open) return fail(cb, dr.msg || 'Esta porta não abre.');
      const key = dr.key && (who.inv || []).find(it => it.qty > 0 && it.name.toLowerCase().includes(dr.key.toLowerCase()));
      if (dr.state === 'trancada' && key) { dr.state = 'aberta'; done(`🗝️ ${who.name} usou ${key.name} e abriu ${label}.`); return ok(cb, { state: 'aberta' }); }
      if (dr.test && (dr.state === 'trancada' || dr.state === 'fechada')) {
        const d20 = crypto.randomInt(1, 21), b = C.attrBonus(c, who, dr.test.attr), tot = d20 + b, pass = tot >= dr.test.dc;
        addEvent(c, { type: 'roll', uid, sc: sid, text: `Abrir ${label} (${dr.test.attr} CD ${dr.test.dc})`, roll: { expr: '1d20' + (b ? (b > 0 ? '+' : '') + b : ''), total: tot, parts: [{ t: '1d20', sides: 20, rolls: [d20], kept: [0], sum: d20 }, ...(b ? [{ t: (b > 0 ? '+' : '') + b, mod: b }] : [])], crit: d20 === 20, fail: d20 === 1 } });
        if (!pass) { touched(c); return fail(cb, dr.msg || `Não conseguiu abrir (${tot} contra ${dr.test.dc}).`); }
        dr.state = 'aberta'; done(`🚪 ${who.name} conseguiu abrir ${label}.`); return ok(cb, { state: 'aberta' });
      }
      if (dr.state === 'trancada') return fail(cb, dr.msg || (dr.key ? `Está trancada. Precisa de: ${dr.key}.` : 'Está trancada.'));
      dr.state = 'aberta'; done(`🚪 ${who.name} abriu ${label}.`); return ok(cb, { state: 'aberta' });
    });

    /* ----- luzes (lâmpadas do mapa) ----- */
    on('rpg:light:save', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const m = mapArg(c, d); if (!m) return fail(cb, 'Mapa não encontrado.');
      const x = d.light || {}, old = x.id ? m.lights.find(k => k.id === str(x.id, 40)) : null;
      if (!old && m.lights.length >= LIM.lights) return fail(cb, `Limite de ${LIM.lights} luzes por mapa.`);
      const L = cleanLight(x, old, m); if (old) Object.assign(old, L); else m.lights.push(L);
      touched(c); mapChanged(c, m); ok(cb, { id: L.id });
    });
    on('rpg:light:del', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const m = mapArg(c, d); if (!m) return fail(cb, 'Mapa não encontrado.');
      const k = m.lights.findIndex(x => x.id === str(d.id, 40)); if (k < 0) return fail(cb, 'Luz não encontrada.');
      m.lights.splice(k, 1); touched(c); mapChanged(c, m); ok(cb, {});
    });
    /* ----- marcadores (emojis no mapa) ----- */
    on('rpg:mark:save', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const m = mapArg(c, d); if (!m) return fail(cb, 'Mapa não encontrado.');
      const x = d.mark || {}, old = x.id ? m.marks.find(k => k.id === str(x.id, 40)) : null;
      if (!old && m.marks.length >= LIM.marks) return fail(cb, `Limite de ${LIM.marks} marcadores por mapa.`);
      const mk = cleanMark(x, old, m); if (old) Object.assign(old, mk); else m.marks.push(mk);
      touched(c); mapChanged(c, m); ok(cb, { id: mk.id });
    });
    on('rpg:mark:del', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const m = mapArg(c, d); if (!m) return fail(cb, 'Mapa não encontrado.');
      const k = m.marks.findIndex(x => x.id === str(d.id, 40)); if (k < 0) return fail(cb, 'Marcador não encontrado.');
      m.marks.splice(k, 1); touched(c); mapChanged(c, m); ok(cb, {});
    });

    /* ----- lanterna e direção do personagem ----- */
    on('rpg:lantern', (d, cb) => {
      const c = camp(d, 'jogar'); if (!c) return fail(cb, NO);
      const ch = R.chars[str(d.id, 40)]; if (!ch || ch.campId !== c.id) return fail(cb, 'Personagem não encontrado.');
      if (isM(c, uid)) {
        const had = !!ch.lantern, wasOn = had && ch.lantern.on;
        ch.lantern = d.lantern === null ? null : cleanLantern(d.lantern, ch.lantern);
        if (!had && ch.lantern) notify(c, ch, [['🔦', `O Mestre te deu: ${(C.LANTERN_KINDS[ch.lantern.kind] || {}).n || 'uma luz'} (${ch.lantern.range} casas).`, 'ganho']], uid);
        else if (had && !ch.lantern) notify(c, ch, [['🌑', 'O Mestre tirou a sua luz.', 'perda']], uid);
        else if (had && wasOn !== ch.lantern.on) notify(c, ch, [[ch.lantern.on ? '🔦' : '🌑', ch.lantern.on ? 'Sua luz foi acesa.' : 'Sua luz se apagou.']], uid);
      }
      else {
        if (ch.ownerId !== uid) return fail(cb, NO);
        if (!ch.lantern) return fail(cb, 'Você não tem lanterna. Peça ao Mestre.');
        if (!ch.lantern.toggle || ch.lantern.req) return fail(cb, 'O Mestre não deixa desligar esta luz.');
        ch.lantern.on = !!d.on;
      }
      touched(c); const m = R.maps[charMap(c, ch)]; dirty(m); emitChars(c); pushView(c, m); ok(cb, {});
    });
    on('rpg:face', (d, cb) => {
      const c = camp(d, 'jogar'); if (!c) return fail(cb, NO);
      const ch = R.chars[str(d.id, 40)]; if (!ch || ch.campId !== c.id) return fail(cb, 'Personagem não encontrado.');
      if (!isM(c, uid) && (ch.ownerId !== uid || c.rules.lock || !scenePerm(c, uid, 'move'))) return fail(cb, NO);
      ch.dir = ((int(d.dir, -720, 720, 0) % 360) + 360) % 360;
      save(); const m = R.maps[charMap(c, ch)]; dirty(m);
      emitMap(c, m && m.id, 'rpg:face', { id: ch.id, dir: ch.dir }); pushView(c, m); ok(cb, { dir: ch.dir });
    });

    /* ----- personagens (fichas) ----- */
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
        const ch = { id: newId(), campId: c.id, ownerId: owner, createdAt: now(), pos: {}, dir: 0, lantern: null, ...cleanChar(x, null, c, master) };
        const cl = c.classes.find(k => k.id === ch.classId);
        if (cl && !x.custom) { ch.hpMax = ch.hp = cl.hp; ch.mpMax = ch.mp = cl.mp; for (const [a, v] of Object.entries(cl.mods)) if (a in ch.attrs) ch.attrs[a] = Math.max(1, Math.min(30, ch.attrs[a] + v)); }
        R.chars[ch.id] = ch;
        // o personagem nasce na cena do dono (se ele estiver numa) ou na principal
        const sc = sceneOfUser(c, owner); if (sc) sc.chars.push(ch.id);
        const m = R.maps[charMap(c, ch)]; if (m) ch.pos[m.id] = spawn(m, ch);
        say(c, `${userName(uid)} criou o personagem ${ch.name}${cl ? ' (' + cl.name + ')' : ''}.`, { type: 'sys' });
        dirty(m); touched(c); emitChars(c); pushView(c, m);
        return ok(cb, { id: ch.id });
      }
      const prev = clone(old);
      Object.assign(old, cleanChar(x, old, c, master));
      if (master) notify(c, old, sheetDiff(c, prev, old), uid);
      if (master && x.ownerId && (c.players.includes(x.ownerId) || x.ownerId === c.masterId)) old.ownerId = x.ownerId;
      const m = R.maps[charMap(c, old)]; dirty(m);
      touched(c); emitChars(c); pushView(c, m);
      ok(cb, { id: old.id });
    });
    on('rpg:char:del', (d, cb) => {
      const c = camp(d, 'jogar'); if (!c) return fail(cb, NO);
      const ch = R.chars[str(d.id, 40)]; if (!ch || ch.campId !== c.id || (!isM(c, uid) && ch.ownerId !== uid)) return fail(cb, NO);
      const m = R.maps[charMap(c, ch)];
      delete R.chars[ch.id];
      for (const s of c.scenes) { s.chars = s.chars.filter(k => k !== ch.id); if (s.combat) s.combat.order = s.combat.order.filter(f => !(f.k === 'c' && f.id === ch.id)); }
      c.combat.order = c.combat.order.filter(f => !(f.k === 'c' && f.id === ch.id));
      say(c, `O personagem ${ch.name} saiu da história.`, { type: 'sys' });
      dirty(m); touched(c); emitState(c); ok(cb, {});
    });

    /* ----- criaturas, chefes, NPCs e objetos (só o Mestre) ----- */
    on('rpg:ent:save', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const x = d.ent || {}, old = x.id ? R.ents[str(x.id, 40)] : null;
      if (old && old.campId !== c.id) return fail(cb, 'Criatura não encontrada.');
      let e;
      if (old) { Object.assign(old, cleanEnt(x, old)); e = old; }
      else {
        const m = mapArg(c, x); if (!m) return fail(cb, 'Crie ou escolha um mapa primeiro.');
        if (byCamp(R.ents, c.id).filter(k => k.mapId === m.id).length >= LIM.ents) return fail(cb, `Limite de ${LIM.ents} criaturas por mapa.`);
        e = { id: newId(), campId: c.id, mapId: m.id, ...cleanEnt(x, null) };
        [e.x, e.y] = freeSpot(c.id, m, num(x.x, 0, m.w - 1, Math.floor(m.w / 2)), num(x.y, 0, m.h - 1, Math.floor(m.h / 2)), e.size);
        R.ents[e.id] = e;
        if (!e.hidden) say(c, `${e.kind === 'chefe' ? '☠️ Um chefe apareceu' : 'Apareceu'}: ${e.name}.`, { type: 'sys', sc: myView(c) });
      }
      touched(c);
      const m = R.maps[e.mapId];
      emitMap(c, e.mapId, 'rpg:ent', (u, r) => entView(e, c, r));
      if (old && e.hidden) emitMap(c, e.mapId, 'rpg:ent:del', (u, r) => (r === 'mestre' ? undefined : { id: e.id }));
      pushView(c, m);
      ok(cb, { id: e.id });
    });
    on('rpg:ent:del', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const e = R.ents[str(d.id, 40)]; if (!e || e.campId !== c.id) return fail(cb, 'Criatura não encontrada.');
      delete R.ents[e.id];
      for (const cb2 of [c.combat, ...c.scenes.map(s => s.combat)]) if (cb2) cb2.order = cb2.order.filter(f => !(f.k === 'e' && f.id === e.id));
      touched(c); emitMap(c, e.mapId, 'rpg:ent:del', { id: e.id }, true); emitCamp(c, 'rpg:combat', (u, r, sk) => combatOf(c, viewScene(c, sk))); ok(cb, {});
    });

    /* ----- mover (k: 'c' personagem, 'e' criatura). drag = só mostra o movimento enquanto arrasta ----- */
    let lastDrag = 0;
    function movable(c, k, id) {
      const t = k === 'c' ? R.chars[id] : k === 'e' ? R.ents[id] : null;
      if (!t || t.campId !== c.id) return null;
      if (isM(c, uid)) return t;
      if (k === 'c' && t.ownerId === uid && !c.rules.lock && !ended(c) && c.state !== 'pausada' && scenePerm(c, uid, 'move')) return t;
      return null;
    }
    on('rpg:drag', (d) => {
      const t0 = now(); if (t0 - lastDrag < 50) return; lastDrag = t0;
      const c = camp(d, 'jogar'); if (!c) return;
      const k = d.k === 'c' ? 'c' : 'e', t = movable(c, k, str(d.id, 40)); if (!t) return;
      const m = R.maps[k === 'c' ? charMap(c, t) : t.mapId]; if (!m) return;
      const x = num(d.x, 0, m.w - 1, 0), y = num(d.y, 0, m.h - 1, 0), i = cellOf(m, x, y);
      each(c, (sk, u, r) => {
        if (u === uid || mapOfScene(c, viewScene(c, sk)) !== m.id) return;
        if (r !== 'mestre' && k === 'e' && t.hidden) return;
        if (r !== 'mestre' && m.fog) { const mk = masks(c, m, u, r); if (!mk || !mk.vis[i]) return; }
        sk.emit('rpg:drag', { k, id: t.id, x, y });
      });
    });
    on('rpg:move', (d, cb) => {
      const c = camp(d, 'jogar'); if (!c) return fail(cb, NO);
      const k = d.k === 'c' ? 'c' : 'e', t = movable(c, k, str(d.id, 40));
      if (!t) return fail(cb, c.rules.lock && !isM(c, uid) ? 'O Mestre travou a movimentação.' : !scenePerm(c, uid, 'move') ? 'Nesta cena o Mestre controla os movimentos.' : 'Você não pode mover isso.');
      const m = R.maps[k === 'c' ? charMap(c, t) : t.mapId]; if (!m) return fail(cb, 'Mapa não encontrado.');
      const from = k === 'c' ? t.pos[m.id] : [t.x, t.y];
      // caminho traçado (ferramenta 👣): a miniatura percorre casa por casa; cada passo é conferido aqui
      if (Array.isArray(d.path)) {
        const steps = d.path.slice(0, 300), free = isM(c, uid) || !c.rules.walls;
        if (!steps.length || !from) return fail(cb, 'Caminho vazio.');
        const start = [Math.round(from[0]), Math.round(from[1])];
        if (!C.validPath(vstate(c, m).F, m.w, m.h, start, steps, free)) return fail(cb, 'Esse caminho passa por parede, obstáculo ou porta fechada.');
        const last = steps[steps.length - 1], prev = steps.length > 1 ? steps[steps.length - 2] : start;
        if (k === 'c') { t.dir = ((Math.round(Math.atan2(last[1] - prev[1], last[0] - prev[0]) * 180 / Math.PI / 45) * 45) % 360 + 360) % 360; t.pos[m.id] = [last[0], last[1]]; } else { t.x = last[0]; t.y = last[1]; }
        save(); dirty(m);
        emitMap(c, m.id, 'rpg:walk', (u, r) => (u === uid || (k === 'e' && t.hidden && r !== 'mestre') ? undefined : { k, id: t.id, mapId: m.id, path: steps, dir: k === 'c' ? t.dir : undefined }));
        pushView(c, m);
        return ok(cb, { x: last[0], y: last[1], dir: k === 'c' ? t.dir : undefined, path: steps });
      }
      let x = num(d.x, 0, m.w - 1, 0), y = num(d.y, 0, m.h - 1, 0);
      if (c.rules.grid) { x = Math.round(x); y = Math.round(y); } else { x = Math.round(x * 20) / 20; y = Math.round(y * 20) / 20; }
      // colisão de verdade: o caminho até o destino não pode atravessar parede, obstáculo nem porta fechada
      if (!isM(c, uid) && c.rules.walls) {
        const F = vstate(c, m).F, b = [Math.round(x), Math.round(y)];
        if (F[b[1] * m.w + b[0]] & 1) return fail(cb, 'Não dá para andar aí (parede, obstáculo ou porta fechada).');
        if (from && !C.reach(F, m.w, m.h, [Math.round(from[0]), Math.round(from[1])], b)) return fail(cb, 'Não tem passagem até aí. Ache uma porta aberta ou outro caminho.');
      }
      // o personagem passa a olhar para onde andou (a lanterna acompanha)
      if (k === 'c' && from && (from[0] !== x || from[1] !== y)) t.dir = ((Math.round(Math.atan2(y - from[1], x - from[0]) * 180 / Math.PI / 45) * 45) % 360 + 360) % 360;
      if (k === 'c') t.pos[m.id] = [x, y]; else { t.x = x; t.y = y; }
      save(); dirty(m);
      emitMap(c, m.id, 'rpg:move', (u, r) => (k === 'e' && t.hidden && r !== 'mestre' ? undefined : { k, id: t.id, x, y, mapId: m.id, dir: k === 'c' ? t.dir : undefined }));
      pushView(c, m);
      ok(cb, { x, y, dir: k === 'c' ? t.dir : undefined });
    });

    /* ----- vida e mana ----- */
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
      if (k === 'c' && diff) notify(c, t, [field === 'mp'
        ? ['🔷', diff < 0 ? `Você gastou ${-diff} de mana (${t.mp}/${t.mpMax}).` : `Você recuperou ${diff} de mana (${t.mp}/${t.mpMax}).`, diff < 0 ? 'perda' : 'ganho']
        : [diff < 0 ? '💥' : '💚', diff < 0 ? `Você tomou ${-diff} de dano (${t.hp}/${t.hpMax}).${t.hp <= 0 ? ' Você caiu!' : ''}` : `Você recuperou ${diff} de vida (${t.hp}/${t.hpMax}).`, diff < 0 ? 'dano' : 'cura']], uid);
      touched(c);
      const sc = k === 'c' ? (sceneOfChar(c, t.id) || {}).id || '' : (active(c).find(s => s.mapId === t.mapId) || {}).id || '';
      if (k === 'c') emitChars(c); else { emitMap(c, t.mapId, 'rpg:ent', (u, r) => entView(t, c, r)); pushView(c, R.maps[t.mapId]); }
      if (diff && !(k === 'e' && t.hidden)) {
        const what = field === 'mp' ? 'de mana' : '';
        const showHp = k === 'c' || c.rules.monsterHp || t.kind === 'npc' || t.kind === 'objeto';
        say(c, diff < 0 ? `💥 ${t.name} perdeu ${-diff} ${what || 'de vida'}${showHp && field === 'hp' ? ` (${t.hp}/${t.hpMax})` : ''}.${field === 'hp' && t.hp <= 0 ? ` ${t.name} caiu!` : ''}` : `💚 ${t.name} recuperou ${diff} ${what || 'de vida'}${showHp && field === 'hp' ? ` (${t.hp}/${t.hpMax})` : ''}.`, { type: diff < 0 ? 'dmg' : 'heal', uid, sc });
      }
      ok(cb, { value: t[field] });
    });
    on('rpg:cond', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const k = d.k === 'c' ? 'c' : 'e', t = k === 'c' ? R.chars[str(d.id, 40)] : R.ents[str(d.id, 40)];
      if (!t || t.campId !== c.id) return fail(cb, 'Não encontrado.');
      const was = (t.conds || []).slice();
      t.conds = cleanConds(d.conds); touched(c);
      if (k === 'c') notify(c, t, [...t.conds.filter(x => !was.includes(x)).map(x => ['⚠️', `Você ficou ${x}.`, 'perda']), ...was.filter(x => !t.conds.includes(x)).map(x => ['✨', `Não está mais ${x}.`, 'ganho'])], uid);
      if (k === 'c') emitChars(c); else { emitMap(c, t.mapId, 'rpg:ent', (u, r) => entView(t, c, r)); pushView(c, R.maps[t.mapId]); }
      ok(cb, {});
    });

    /* ----- dados, ping e histórico ----- */
    on('rpg:roll', (d, cb) => {
      const c = camp(d, 'jogar'); if (!c) return fail(cb, 'Só quem joga a campanha pode rolar dados.');
      if (!scenePerm(c, uid, 'roll')) return fail(cb, 'Nesta cena só o Mestre rola os dados.');
      if (limited('rpg-roll:' + uid, 40, 30e3)) return fail(cb, 'Muitas rolagens seguidas. Espere um pouco.');
      let r; try { r = roll(d.expr); } catch (e) { return fail(cb, e.message); }
      const ev = addEvent(c, { type: 'roll', uid, text: txt(d.label, 60), roll: r, priv: !!d.priv, sc: actScene(c, uid, socket) });
      touched(c); ok(cb, { event: ev });
    });
    on('rpg:ping', (d, cb) => {
      const c = camp(d, 'jogar'); if (!c) return fail(cb, NO);
      if (limited('rpg-ping:' + uid, 12, 10e3)) return fail(cb, 'Calma com os pings!');
      const m = myMap(c); if (!m) return fail(cb, 'Nenhum mapa.');
      const x = num(d.x, 0, m.w, 0), y = num(d.y, 0, m.h, 0), i = cellOf(m, x, y), master = isM(c, uid);
      if (!master && m.fog) { const mk = masks(c, m, uid, role(c, uid)); if (!mk || !mk.seen[i]) return fail(cb, 'Você ainda não conhece esse lugar.'); }
      each(c, (sk, u, r) => {
        if (mapOfScene(c, viewScene(c, sk)) !== m.id) return;
        if (!master && r !== 'mestre' && m.fog) { const mk = masks(c, m, u, r); if (!mk || !mk.seen[i]) return; }
        sk.emit('rpg:ping', { uid, x, y, color: hex(users[uid] && users[uid].color, '#ffd36b') });
      });
      ok(cb, {});
    });
    on('rpg:say', (d, cb) => {
      const c = camp(d, 'jogar'); if (!c) return fail(cb, NO);
      const t = txt(d.text, 400); if (!t) return fail(cb, 'Escreva alguma coisa.');
      if (!scenePerm(c, uid, 'say')) return fail(cb, 'Nesta cena só o Mestre escreve.');
      if (limited('rpg-say:' + uid, 20, 30e3)) return fail(cb, 'Calma! Muitas mensagens seguidas.');
      addEvent(c, { type: isM(c, uid) ? 'narr' : 'act', uid, text: t, priv: isM(c, uid) && !!d.priv, sc: actScene(c, uid, socket) });
      touched(c); ok(cb, {});
    });
    // fala do personagem: um balão em cima da miniatura (e do retrato). O jogador fala pelo próprio personagem;
    // o Mestre fala por qualquer um (NPCs, monstros). Quem não enxerga a miniatura (névoa) não recebe o balão.
    on('rpg:speak', (d, cb) => {
      const c = camp(d, 'jogar'); if (!c) return fail(cb, NO);
      const text = txt(d.text, 160); if (!text) return fail(cb, 'Escreva o que o personagem diz.');
      if (!scenePerm(c, uid, 'say')) return fail(cb, 'Nesta cena só o Mestre fala.');
      if (limited('rpg-speak:' + uid, 12, 15e3)) return fail(cb, 'Calma! Muitas falas seguidas.');
      const k = d.k === 'e' ? 'e' : 'c', t = k === 'c' ? R.chars[str(d.id, 40)] : R.ents[str(d.id, 40)];
      if (!t || t.campId !== c.id) return fail(cb, 'Personagem não encontrado.');
      const master = isM(c, uid);
      if (!master && (k !== 'c' || t.ownerId !== uid)) return fail(cb, 'Você só fala pelo seu personagem.');
      const m = R.maps[k === 'c' ? charMap(c, t) : t.mapId]; if (!m) return fail(cb, 'Mapa não encontrado.');
      const pos = k === 'c' ? t.pos[m.id] : [t.x, t.y]; if (!pos) return fail(cb, 'O personagem não está no mapa.');
      const i = cellOf(m, pos[0], pos[1]), hidden = k === 'e' && t.hidden, bubble = { k, id: t.id, name: t.name, text, mapId: m.id, ts: now() };
      each(c, (sk, u, r) => {
        if (mapOfScene(c, viewScene(c, sk)) !== m.id) return;
        if (r !== 'mestre' && (hidden || (m.fog && !(k === 'c' && t.ownerId === u) && !(masks(c, m, u, r) || { vis: [] }).vis[i]))) return;
        sk.emit('rpg:bubble', bubble);
      });
      if (!hidden) addEvent(c, { type: 'fala', uid, text, who: t.name, k, sc: (active(c).find(s => s.mapId === m.id) || {}).id || '' });
      touched(c); ok(cb, {});
    });
    // anúncio do Mestre: texto grande na tela de todos que estão vendo a cena (chefe, perigo, narração, vitória...)
    const ANN = ['chefe', 'perigo', 'narracao', 'vitoria', 'misterio'];
    on('rpg:announce', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const title = txt(d.title, 60); if (!title) return fail(cb, 'Escreva o texto do anúncio.');
      if (limited('rpg-ann:' + uid, 10, 30e3)) return fail(cb, 'Calma com os anúncios!');
      const sid = myView(c), a = { title, sub: txt(d.sub, 120), style: ANN.includes(d.style) ? d.style : 'narracao', dur: int(d.dur, 2, 15, 5), ts: now() };
      emitScene(c, sid, 'rpg:announce', a);
      addEvent(c, { type: 'narr', uid, text: `📢 ${title}${a.sub ? ' — ' + a.sub : ''}`, sc: sid });
      touched(c); ok(cb, {});
    });
    // o dono limpa os próprios avisos
    on('rpg:notif:clear', (d, cb) => {
      const c = camp(d, 'jogar'); if (!c) return fail(cb, NO);
      for (const ch of byCamp(R.chars, c.id)) if (ch.ownerId === uid) ch.notifs = [];
      touched(c); ok(cb, {});
    });

    /* ----- combate e turnos (cada cena tem o seu) ----- */
    on('rpg:combat', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const sid = myView(c), cb2 = combatOf(c, sid);
      let regenAny = false;
      if (d.action === 'start') {
        const pick = list(d.ids, 60, x => (x && (x.k === 'c' || x.k === 'e') ? { k: x.k, id: str(x.id, 40) } : null)).filter(f => { const t = fighter(c, f); return t && t.campId === c.id; });
        if (!pick.length) return fail(cb, 'Escolha quem entra no combate.');
        cb2.order = pick.map(f => {
          const t = fighter(c, f), bonus = f.k === 'c' ? C.attrBonus(c, t, 'DES') : (t.init || 0), d20 = crypto.randomInt(1, 21);
          return { ...f, init: d20 + bonus, d20 };
        }).sort((a, b) => b.init - a.init || b.d20 - a.d20);
        Object.assign(cb2, { on: true, round: 1, turn: 0 });
        say(c, `⚔️ Combate! Iniciativa: ${cb2.order.map(f => { const t = fighter(c, f); return `${f.k === 'e' && t.hidden ? '???' : t.name} ${f.init}`; }).join(', ')}.`, { type: 'combat', sc: sid });
      } else if (d.action === 'next' || d.action === 'prev') {
        if (!cb2.on || !cb2.order.length) return fail(cb, 'Nenhum combate acontecendo.');
        const n = cb2.order.length;
        if (d.action === 'next') {
          cb2.turn++;
          if (cb2.turn >= n) { cb2.turn = 0; cb2.round++; regenAny = regen(c, cb2.order.filter(f => f.k === 'c').map(f => R.chars[f.id]).filter(Boolean), 'rodada') || regenAny; }
          const f = cb2.order[cb2.turn]; if (f && f.k === 'c' && R.chars[f.id]) regenAny = regen(c, [R.chars[f.id]], 'turno') || regenAny;
        } else { cb2.turn--; if (cb2.turn < 0) { cb2.turn = n - 1; cb2.round = Math.max(1, cb2.round - 1); } }
        const t = fighter(c, cb2.order[cb2.turn]);
        if (t && !(cb2.order[cb2.turn].k === 'e' && t.hidden)) say(c, `Rodada ${cb2.round}: vez de ${t.name}.`, { type: 'turn', sc: sid });
      } else if (d.action === 'set') {
        const ord = list(d.order, 60, x => (x && (x.k === 'c' || x.k === 'e') ? { k: x.k, id: str(x.id, 40), init: int(x.init, -99, 99, 0), d20: int(x.d20, 0, 20, 0) } : null)).filter(f => fighter(c, f) && fighter(c, f).campId === c.id);
        cb2.order = ord; cb2.turn = Math.min(cb2.turn, Math.max(0, ord.length - 1));
      } else if (d.action === 'end') {
        Object.assign(cb2, { on: false, round: 1, turn: 0, order: [] });
        say(c, 'O combate terminou.', { type: 'combat', sc: sid });
      } else return fail(cb, 'Ação inválida.');
      c.updatedAt = now(); save();
      emitScene(c, sid, 'rpg:combat', cb2);
      if (regenAny) emitChars(c);
      ok(cb, {});
    });

    /* ----- cenas e eventos privados ----- */
    // o Mestre cria um evento para um ou mais jogadores, com mapa próprio; os outros continuam na cena principal
    on('rpg:scene:create', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      if (active(c).length >= LIM.active) return fail(cb, `No máximo ${LIM.active} cenas ao mesmo tempo.`);
      const name = txt(d.name, 50); if (!name) return fail(cb, 'Dê um nome ao evento.');
      const uids = [...new Set(list(d.uids, 20, x => str(x, 40)))].filter(x => c.players.includes(x));
      const charIds = [...new Set([...list(d.chars, 40, x => str(x, 40)), ...byCamp(R.chars, c.id).filter(k => uids.includes(k.ownerId)).map(k => k.id)])].filter(id => R.chars[id] && R.chars[id].campId === c.id);
      if (!uids.length && !charIds.length) return fail(cb, 'Escolha pelo menos um jogador ou personagem.');
      const main = R.maps[c.mapId], mo = d.map || {};
      let m;
      try {
        if (mo.mode === 'copia') {
          if (!main) throw new Error('Não há mapa principal para copiar.');
          const { id, createdAt, seenBy, ...rest } = clone(main);
          m = newMap(c, { ...rest, name: txt(mo.name, 40) || `${main.name} (${name})`, seen: '', seenBy: {}, copyOf: main.id, marks: main.marks.filter(x => x.vis === 'todos') });
        } else if (mo.mode === 'existente') {
          m = R.maps[str(mo.mapId, 40)];
          if (!m || m.campId !== c.id) throw new Error('Mapa não encontrado.');
          if (mapBusy(c, m.id)) throw new Error('Esse mapa já está em uso (na cena principal ou em outra cena).');
        } else m = newMap(c, { ...mapFromGen(generate({ kind: mo.kind, w: mo.w || 24, h: mo.h || 18, rooms: mo.rooms || 4, traps: 0 })), name: txt(mo.name, 40) || name });
      } catch (e) { return fail(cb, e.message); }
      const s = { id: newId(), name, desc: txt(d.desc, 600), mapId: m.id, uids, chars: [], vis: d.vis === 'compartilhada' ? 'compartilhada' : 'privada',
        perm: { move: d.perm ? d.perm.move !== false : true, roll: d.perm ? d.perm.roll !== false : true, say: d.perm ? d.perm.say !== false : true },
        combat: { on: false, round: 1, turn: 0, order: [] }, state: 'ativa', at: now(), by: uid };
      // tira os escolhidos de outras cenas (transferência) e põe os personagens no mapa da cena
      for (const o of active(c)) { o.uids = o.uids.filter(x => !uids.includes(x)); o.chars = o.chars.filter(x => !charIds.includes(x)); }
      c.scenes.push(s);
      const near = mo.mode === 'copia' && d.start === 'mesmo';
      for (const id of charIds) { const ch = R.chars[id], old = ch.pos[c.mapId]; s.chars.push(id); ch.pos[m.id] = near && old ? freeSpot(c.id, m, old[0], old[1], 1, id) : spawn(m, ch, Array.isArray(d.at) ? [int(d.at[0], 0, m.w - 1, 0), int(d.at[1], 0, m.h - 1, 0)] : null); }
      // NPCs e criaturas presentes: cópias no mapa da cena
      for (const eid of list(d.npcs, 20, x => str(x, 40))) {
        const e0 = R.ents[eid]; if (!e0 || e0.campId !== c.id || byCamp(R.ents, c.id).filter(k => k.mapId === m.id).length >= LIM.ents) continue;
        const e = { ...clone(e0), id: newId(), mapId: m.id }; [e.x, e.y] = freeSpot(c.id, m, (m.start || [1, 1])[0] + 1, (m.start || [1, 1])[1], e.size); R.ents[e.id] = e;
      }
      // cenas antigas: guarda só as 30 últimas
      const old = c.scenes.filter(x => x.state !== 'ativa'); if (c.scenes.length > LIM.scenes) for (const x of old.slice(0, c.scenes.length - LIM.scenes)) c.scenes.splice(c.scenes.indexOf(x), 1);
      say(c, `🎭 Começou o evento "${s.name}".${s.desc ? ' ' + s.desc : ''}`, { type: 'sys', sc: s.id });
      for (const x of uids) toUser(x, 'rpg:scene', { cid: c.id, sid: s.id, name: s.name });
      dirty(m); if (main) dirty(main);
      socket.data.view = s.id;
      touched(c); emitState(c); ok(cb, { id: s.id });
    });
    on('rpg:scene:update', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const s = sceneById(c, str(d.sid, 40)); if (!s || s.state !== 'ativa') return fail(cb, 'Cena não encontrada.');
      if ('name' in d) s.name = txt(d.name, 50) || s.name;
      if ('desc' in d) s.desc = txt(d.desc, 600);
      if ('vis' in d) s.vis = d.vis === 'compartilhada' ? 'compartilhada' : 'privada';
      if (d.perm && typeof d.perm === 'object') for (const k of ['move', 'roll', 'say']) if (k in d.perm) s.perm[k] = !!d.perm[k];
      const m = R.maps[s.mapId];
      if (Array.isArray(d.add)) for (const x of d.add.slice(0, 20).map(y => str(y, 40))) {
        if (!c.players.includes(x) || s.uids.includes(x)) continue;
        for (const o of active(c)) if (o !== s) { o.uids = o.uids.filter(y => y !== x); o.chars = o.chars.filter(k => !R.chars[k] || R.chars[k].ownerId !== x); }
        s.uids.push(x);
        for (const ch of byCamp(R.chars, c.id).filter(k => k.ownerId === x)) { if (!s.chars.includes(ch.id)) s.chars.push(ch.id); if (m && !ch.pos[m.id]) ch.pos[m.id] = spawn(m, ch); }
        toUser(x, 'rpg:scene', { cid: c.id, sid: s.id, name: s.name });
      }
      if (Array.isArray(d.remove)) for (const x of d.remove.slice(0, 20).map(y => str(y, 40))) { s.uids = s.uids.filter(y => y !== x); s.chars = s.chars.filter(k => !R.chars[k] || R.chars[k].ownerId !== x); }
      for (const mm of byCamp(R.maps, c.id)) dirty(mm);
      touched(c); emitState(c); ok(cb, {});
    });
    // leva um personagem (e o dono, se for jogador) para outra cena; to = '' volta para a cena principal
    on('rpg:scene:move', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const ch = R.chars[str(d.charId, 40)]; if (!ch || ch.campId !== c.id) return fail(cb, 'Personagem não encontrado.');
      const to = str(d.to || '', 40), s = to ? sceneById(c, to) : null;
      if (to && (!s || s.state !== 'ativa')) return fail(cb, 'Cena não encontrada.');
      const owner = ch.ownerId, withOwner = c.players.includes(owner) && d.owner !== false;
      for (const o of active(c)) { o.chars = o.chars.filter(k => k !== ch.id); if (withOwner) o.uids = o.uids.filter(x => x !== owner); }
      if (s) { s.chars.push(ch.id); if (withOwner && !s.uids.includes(owner)) s.uids.push(owner); }
      const m = R.maps[charMap(c, ch)]; if (m && !ch.pos[m.id]) ch.pos[m.id] = spawn(m, ch);
      if (withOwner) toUser(owner, 'rpg:scene', { cid: c.id, sid: s ? s.id : '', name: s ? s.name : 'Cena principal' });
      for (const mm of byCamp(R.maps, c.id)) dirty(mm);
      touched(c); emitState(c); ok(cb, {});
    });
    on('rpg:scene:end', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const s = sceneById(c, str(d.sid, 40)); if (!s || s.state !== 'ativa') return fail(cb, 'Cena não encontrada.');
      say(c, `🎭 O evento "${s.name}" terminou.`, { type: 'sys', sc: s.id });
      s.state = 'encerrada'; s.endedAt = now(); s.combat = { on: false, round: 1, turn: 0, order: [] };
      const m = R.maps[s.mapId];
      if (d.dropMap && m && m.id !== c.mapId) { for (const e of byCamp(R.ents, c.id)) if (e.mapId === m.id) delete R.ents[e.id]; for (const ch of byCamp(R.chars, c.id)) delete ch.pos[m.id]; delete R.maps[m.id]; vcache.delete(m.id); }
      for (const x of s.uids) toUser(x, 'rpg:scene', { cid: c.id, sid: '', name: 'Cena principal' });
      for (const mm of byCamp(R.maps, c.id)) dirty(mm);
      if (socket.data.view === s.id) socket.data.view = '';
      touched(c); emitState(c); ok(cb, {});
    });
    // trocar a cena que está vendo (o Mestre qualquer uma; os outros só as compartilhadas)
    on('rpg:scene:view', (d, cb) => {
      const c = camp(d); if (!c) return fail(cb, NO);
      const sid = str(d.sid || '', 40), s = sid ? sceneById(c, sid) : null;
      if (sid && (!s || s.state !== 'ativa')) return fail(cb, 'Cena não encontrada.');
      if (sid && !isM(c, uid) && !s.uids.includes(uid) && s.vis !== 'compartilhada') return fail(cb, 'Esta cena é privada.');
      if (!isM(c, uid) && sceneOfUser(c, uid) && sceneOfUser(c, uid).id !== sid) return fail(cb, 'Você está numa cena com o Mestre.');
      socket.data.view = sid;
      ok(cb, full(c, uid, socket));
    });

    /* ----- sessões salvas ----- */
    on('rpg:snap:save', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const mine = byCamp(R.snaps, c.id);
      if (mine.length >= LIM.snaps) return fail(cb, `Limite de ${LIM.snaps} sessões salvas. Apague alguma.`);
      const data = {
        mapId: c.mapId, combat: c.combat, scenes: c.scenes,
        maps: byCamp(R.maps, c.id), ents: byCamp(R.ents, c.id),
        chars: byCamp(R.chars, c.id).map(k => ({ id: k.id, hp: k.hp, mp: k.mp, pos: k.pos, conds: k.conds, inv: k.inv, level: k.level, hpMax: k.hpMax, mpMax: k.mpMax, stats: k.stats, lantern: k.lantern, dir: k.dir }))
      };
      if (JSON.stringify(data).length > 3e6) return fail(cb, 'Esta sessão ficou grande demais para salvar (apague mapas que não usa).');
      const s = { id: newId(), campId: c.id, name: txt(d.name, 60) || ('Sessão de ' + new Date().toLocaleDateString('pt-BR')), at: now(), by: uid, data: clone(data) };
      R.snaps[s.id] = s;
      say(c, `💾 O Mestre salvou a sessão "${s.name}".`, { type: 'sys' });
      touched(c); emitState(c); ok(cb, { id: s.id });
    });
    on('rpg:snap:load', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const s = R.snaps[str(d.id, 40)]; if (!s || s.campId !== c.id) return fail(cb, 'Sessão não encontrada.');
      const data = clone(s.data);
      for (const m of byCamp(R.maps, c.id)) { delete R.maps[m.id]; vcache.delete(m.id); }
      for (const e of byCamp(R.ents, c.id)) delete R.ents[e.id];
      for (const m of data.maps) { R.maps[m.id] = { ...m, campId: c.id }; upgradeMap(R.maps[m.id]); }
      for (const e of data.ents) R.ents[e.id] = { ...e, campId: c.id };
      for (const k of data.chars) { const ch = R.chars[k.id]; if (ch && ch.campId === c.id) Object.assign(ch, { hp: k.hp, mp: k.mp, pos: k.pos || {}, conds: k.conds || [], inv: k.inv || [], level: k.level, hpMax: k.hpMax, mpMax: k.mpMax, stats: k.stats || ch.stats || {}, lantern: 'lantern' in k ? k.lantern : ch.lantern, dir: k.dir || 0 }); }
      c.combat = data.combat && Array.isArray(data.combat.order) ? { ...data.combat, order: data.combat.order.filter(f => fighter(c, f)) } : { on: false, round: 1, turn: 0, order: [] };
      c.scenes = Array.isArray(data.scenes) ? data.scenes.filter(x => R.maps[x.mapId] || x.state !== 'ativa') : [];
      c.mapId = R.maps[data.mapId] ? data.mapId : null;
      say(c, `⏪ O Mestre voltou para a sessão "${s.name}".`, { type: 'sys' });
      touched(c); setActive(c, R.maps[c.mapId] || null); ok(cb, {});
    });
    on('rpg:snap:del', (d, cb) => {
      const c = camp(d, 'mestre'); if (!c) return fail(cb, NO);
      const s = R.snaps[str(d.id, 40)]; if (!s || s.campId !== c.id) return fail(cb, 'Sessão não encontrada.');
      delete R.snaps[s.id]; touched(c); emitCamp(c, 'rpg:state', (u, r, sk) => (r === 'mestre' ? full(c, u, sk) : undefined)); ok(cb, {});
    });

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
