// RPG de Mesa: gerador de mapas. Roda no servidor (todo mundo recebe exatamente o mesmo mapa).
// O mapa é uma grade w x h guardada como texto (um caractere por casa). As armadilhas ficam à parte
// (só o Mestre vê até serem reveladas).
//
// Casas:  .  chão de pedra     ,  grama        #  parede         H  parede de madeira/tijolo
//         ~  água              ^  rocha/morro  T  árvore         =  trilha/estrada
//         D  porta             S  areia        P  pilar          A  altar
//         B  barricada         _  buraco       b  ponte          f  plantação
const KINDS = {
  masmorra: 'Masmorra', caverna: 'Caverna', castelo: 'Castelo', templo: 'Templo', floresta: 'Floresta',
  montanha: 'Montanha', cidade: 'Cidade', vila: 'Vila', arena: 'Arena', campo: 'Campo de batalha'
};
// casas onde dá para andar (o resto bloqueia)
const WALK = new Set(['.', ',', '=', 'D', 'S', 'b', 'f']);

function rng(seed) { // mulberry32: mesma semente, mesmo mapa
  let a = seed >>> 0;
  const r = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  r.pick = arr => arr[Math.floor(r() * arr.length)];
  return r;
}
// ruído suave (valor interpolado): para florestas, montanhas e campos
function noise(w, h, r, scale) {
  const gw = Math.ceil(w / scale) + 2, gh = Math.ceil(h / scale) + 2, g = Array.from({ length: gw * gh }, () => r());
  const at = (x, y) => g[y * gw + x], sm = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = x / scale, fy = y / scale, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = sm(fx - x0), ty = sm(fy - y0);
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx, b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
    return a + (b - a) * ty;
  };
}

function grid(w, h, fill) {
  const t = new Array(w * h).fill(fill);
  const G = {
    w, h, t,
    in: (x, y) => x >= 0 && y >= 0 && x < w && y < h,
    get: (x, y) => (G.in(x, y) ? t[y * w + x] : null),
    set: (x, y, c) => { if (G.in(x, y)) t[y * w + x] = c; },
    rect: (x, y, rw, rh, c) => { for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) G.set(i, j, c); },
    box: (x, y, rw, rh, wall, floor) => { G.rect(x, y, rw, rh, wall); G.rect(x + 1, y + 1, rw - 2, rh - 2, floor); },
    // corredor em L entre dois pontos
    path: (x1, y1, x2, y2, c, r, wide = 1, only = null) => {
      const put = (x, y) => { for (let a = 0; a < wide; a++) for (let b = 0; b < wide; b++) { const v = G.get(x + a, y + b); if (v !== null && (!only || only.has(v))) G.set(x + a, y + b, c); } };
      let x = x1, y = y1; const hFirst = r() < 0.5;
      const stepX = () => { while (x !== x2) { put(x, y); x += Math.sign(x2 - x); } };
      const stepY = () => { while (y !== y2) { put(x, y); y += Math.sign(y2 - y); } };
      if (hFirst) { stepX(); stepY(); } else { stepY(); stepX(); }
      put(x, y);
    },
    // caminho sinuoso (trilhas, rios)
    // (cada curva pinta também a casa do lado: o caminho fica contínuo, sem pular na diagonal)
    wander: (x, y, dx, c, r, wide = 1, keep = null) => {
      let guard = 0;
      const put = (px, py) => { for (let a = 0; a < wide; a++) for (let b = 0; b < wide; b++) { const v = G.get(px + a, py + b); if (v !== null && (!keep || !keep.has(v))) G.set(px + a, py + b, c); } };
      while (G.in(x, y) && guard++ < w * h) {
        put(x, y);
        if (r() < 0.45) {
          if (dx) y = Math.max(1, Math.min(h - 2, y + (r() < 0.5 ? -1 : 1))); else x = Math.max(1, Math.min(w - 2, x + (r() < 0.5 ? -1 : 1)));
          put(x, y);
        }
        if (dx) x += dx; else y += 1;
      }
    },
    count: c => t.filter(v => v === c).length
  };
  return G;
}

// salas que não se encostam
function rooms(G, r, n, minS, maxS, pad = 1) {
  const out = [];
  for (let tries = 0; tries < n * 40 && out.length < n; tries++) {
    const rw = r.int(minS, maxS), rh = r.int(minS, maxS);
    const x = r.int(pad, G.w - rw - pad - 1), y = r.int(pad, G.h - rh - pad - 1);
    if (x < pad || y < pad) continue;
    if (out.some(o => x < o.x + o.w + 2 && x + rw + 2 > o.x && y < o.y + o.h + 2 && y + rh + 2 > o.y)) continue;
    out.push({ x, y, w: rw, h: rh, cx: x + Math.floor(rw / 2), cy: y + Math.floor(rh / 2) });
  }
  return out;
}
// liga as salas em sequência (da mais à esquerda para a direita) e mais algumas ligações extras
function connect(G, r, list, c, wide = 1, extra = 0.25) {
  const s = list.slice().sort((a, b) => a.cx - b.cx);
  for (let i = 1; i < s.length; i++) G.path(s[i - 1].cx, s[i - 1].cy, s[i].cx, s[i].cy, c, r, wide);
  for (let i = 0; i < s.length; i++) if (r() < extra && s.length > 2) { const o = r.pick(s); if (o !== s[i]) G.path(s[i].cx, s[i].cy, o.cx, o.cy, c, r, wide); }
}
// porta onde o corredor encontra a sala (casa de chão na borda da sala, entre duas paredes)
function doors(G, r, list, chance, wall = '#', floor = '.') {
  for (const o of list) {
    const edge = [];
    for (let i = o.x; i < o.x + o.w; i++) { edge.push([i, o.y - 1, 'h']); edge.push([i, o.y + o.h, 'h']); }
    for (let j = o.y; j < o.y + o.h; j++) { edge.push([o.x - 1, j, 'v']); edge.push([o.x + o.w, j, 'v']); }
    for (const [x, y, d] of edge) {
      if (G.get(x, y) !== floor || r() > chance) continue;
      const side = d === 'h' ? [G.get(x - 1, y), G.get(x + 1, y)] : [G.get(x, y - 1), G.get(x, y + 1)];
      if (side.every(v => v === wall)) G.set(x, y, 'D');
    }
  }
}
// espalha um tipo de casa em cima de outra (obstáculos)
function sprinkle(G, r, on, c, amount, avoid = []) {
  const cells = []; G.t.forEach((v, i) => { if (v === on) cells.push(i); });
  const n = Math.round(cells.length * amount);
  for (let k = 0; k < n && cells.length; k++) {
    const i = cells.splice(Math.floor(r() * cells.length), 1)[0], x = i % G.w, y = (i / G.w) | 0;
    if (avoid.some(([ax, ay]) => Math.abs(ax - x) + Math.abs(ay - y) < 3)) continue;
    G.t[i] = c;
  }
}
// maior região andável: o resto vira "fill" (cavernas sem bolsões fechados)
function keepLargest(G, fill) {
  const seen = new Uint8Array(G.w * G.h); let best = null;
  for (let i = 0; i < G.t.length; i++) {
    if (seen[i] || !WALK.has(G.t[i])) continue;
    const reg = [], st = [i]; seen[i] = 1;
    while (st.length) { const k = st.pop(); reg.push(k); const x = k % G.w, y = (k / G.w) | 0;
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + a, ny = y + b; if (!G.in(nx, ny)) continue; const n = ny * G.w + nx; if (!seen[n] && WALK.has(G.t[n])) { seen[n] = 1; st.push(n); } } }
    if (!best || reg.length > best.length) best = reg;
  }
  if (!best) return;
  const keep = new Set(best);
  G.t.forEach((v, i) => { if (WALK.has(v) && !keep.has(i)) G.t[i] = fill; });
}

const GEN = {
  masmorra(G, r, o) {
    G.rect(0, 0, G.w, G.h, '#');
    const list = rooms(G, r, o.rooms, 4, Math.max(5, Math.min(10, Math.floor(Math.min(G.w, G.h) / 4))));
    list.forEach(s => G.rect(s.x, s.y, s.w, s.h, '.'));
    connect(G, r, list, '.', o.wide);
    if (o.doors) doors(G, r, list, 0.9);
    // pilares nas salas grandes
    list.filter(s => s.w >= 7 && s.h >= 7 && r() < 0.3 + o.obst).forEach(s => { for (let x = s.x + 2; x < s.x + s.w - 2; x += 3) for (let y = s.y + 2; y < s.y + s.h - 2; y += 3) G.set(x, y, 'P'); });
    sprinkle(G, r, '.', '_', o.obst * 0.03);
    return list;
  },
  caverna(G, r, o) {
    const fill = 0.42 + o.obst * 0.08;
    G.t.forEach((_, i) => { G.t[i] = r() < fill ? '#' : '.'; });
    for (let it = 0; it < 5; it++) {
      const nt = G.t.slice();
      for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) {
        let n = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if ((a || b) && G.get(x + a, y + b) !== '.') n++;
        nt[y * G.w + x] = n >= 5 || x === 0 || y === 0 || x === G.w - 1 || y === G.h - 1 ? '#' : '.';
      }
      G.t.splice(0, G.t.length, ...nt);
    }
    keepLargest(G, '#');
    // poças e pedras
    const wet = noise(G.w, G.h, r, 6);
    for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) if (G.get(x, y) === '.' && wet(x, y) > 0.78) G.set(x, y, '~');
    sprinkle(G, r, '.', '^', o.obst * 0.05);
    return [];
  },
  castelo(G, r, o) {
    G.rect(0, 0, G.w, G.h, ',');
    const m = 2, x0 = m + 1, y0 = m + 1, cw = G.w - 2 * x0, ch = G.h - 2 * y0;
    G.box(x0 - 1, y0 - 1, cw + 2, ch + 2, '~', ','); // fosso
    G.box(x0, y0, cw, ch, '#', ','); // muralha e pátio
    // torres nos cantos
    for (const [tx, ty] of [[x0, y0], [x0 + cw - 3, y0], [x0, y0 + ch - 3], [x0 + cw - 3, y0 + ch - 3]]) G.box(tx, ty, 3, 3, '#', '.');
    // portão e ponte
    const gx = x0 + Math.floor(cw / 2); G.set(gx, y0 + ch - 1, 'D'); G.set(gx, y0 + ch, 'b'); G.set(gx, y0 + ch + 1, 'b'); G.set(gx, y0 + ch - 2, ',');
    // castelo central com salas
    const kw = Math.max(8, Math.floor(cw * 0.55)), kh = Math.max(7, Math.floor(ch * 0.5)), kx = x0 + Math.floor((cw - kw) / 2), ky = y0 + 3;
    G.box(kx, ky, kw, kh, '#', '.');
    const n = Math.max(1, Math.min(o.rooms, 6, Math.floor(kw / 5))); // cada sala com pelo menos ~4 casas de largura
    for (let i = 1; i < n; i++) { const xx = kx + Math.round(i * kw / n); for (let y = ky + 1; y < ky + kh - 1; y++) G.set(xx, y, '#'); G.set(xx, ky + 1 + r.int(0, kh - 3), o.doors ? 'D' : '.'); }
    G.set(kx + Math.floor(kw / 2), ky + kh - 1, o.doors ? 'D' : '.');
    G.path(gx, y0 + ch - 2, kx + Math.floor(kw / 2), ky + kh, '=', r, 1, new Set([',']));
    sprinkle(G, r, ',', 'T', o.obst * 0.04, [[gx, y0 + ch - 2]]);
    return [];
  },
  templo(G, r, o) {
    G.rect(0, 0, G.w, G.h, '#');
    const hw = Math.max(7, Math.floor(G.w * 0.4)), hx = Math.floor((G.w - hw) / 2), hy = 2, hh = G.h - 5;
    G.rect(hx, hy, hw, hh, '.');
    for (let y = hy + 2; y < hy + hh - 2; y += 3) { G.set(hx + 2, y, 'P'); G.set(hx + hw - 3, y, 'P'); } // colunas
    G.set(hx + Math.floor(hw / 2), hy + 1, 'A'); G.set(hx + Math.floor(hw / 2) - 1, hy + 1, 'A');
    G.set(hx + Math.floor(hw / 2), hy + hh, 'D'); G.rect(hx + Math.floor(hw / 2), hy + hh + 1, 1, G.h - hy - hh - 1, '=');
    // salas laterais
    const side = Math.max(1, Math.min(o.rooms, 8)), sh = Math.max(4, Math.floor((hh - 2) / Math.ceil(side / 2)));
    for (let i = 0; i < side; i++) {
      const left = i % 2 === 0, k = Math.floor(i / 2), rw = Math.max(4, hx - 3), y = hy + 1 + k * sh;
      if (y + sh - 1 > hy + hh) break;
      const x = left ? hx - rw - 1 : hx + hw + 1;
      if (x < 1 || x + rw >= G.w) continue;
      G.rect(x, y, rw, sh - 1, '.');
      G.set(left ? hx - 1 : hx + hw, y + Math.floor((sh - 1) / 2), o.doors ? 'D' : '.');
    }
    sprinkle(G, r, '.', '_', o.obst * 0.015);
    return [];
  },
  floresta(G, r, o) {
    G.rect(0, 0, G.w, G.h, ',');
    const n = noise(G.w, G.h, r, 5), dens = 0.62 - o.obst * 0.22;
    for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) if (n(x, y) > dens || r() < o.obst * 0.06) G.set(x, y, 'T');
    // lago
    const lx = r.int(3, G.w - 8), ly = r.int(3, G.h - 7), lw = r.int(3, 6), lh = r.int(2, 5);
    for (let y = ly; y < ly + lh; y++) for (let x = lx; x < lx + lw; x++) if (((x - lx - lw / 2) ** 2) / (lw * lw / 4) + ((y - ly - lh / 2) ** 2) / (lh * lh / 4) <= 1) G.set(x, y, '~');
    // clareira e trilha
    const cx = Math.floor(G.w / 2), cy = Math.floor(G.h / 2);
    for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 3; x <= cx + 3; x++) if (G.get(x, y) === 'T') G.set(x, y, ',');
    G.wander(0, r.int(2, G.h - 3), 1, '=', r, 1, new Set(['~']));
    return [];
  },
  montanha(G, r, o) {
    const hgt = noise(G.w, G.h, r, 7), det = noise(G.w, G.h, r, 3);
    for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) {
      const v = hgt(x, y) * 0.75 + det(x, y) * 0.25;
      G.set(x, y, v > 0.66 - o.obst * 0.1 ? '^' : v > 0.45 ? '.' : v < 0.2 ? '~' : ',');
    }
    G.wander(r.int(2, G.w - 3), 0, 0, '=', r, 1, new Set(['~']));
    sprinkle(G, r, ',', 'T', 0.05);
    return [];
  },
  cidade(G, r, o) {
    G.rect(0, 0, G.w, G.h, '=');
    const bw = 7, bh = 6, mx = Math.floor(G.w / 2), my = Math.floor(G.h / 2);
    // quarteirões de até 7x6 (os do fim da grade ficam menores, para não sobrar só rua)
    for (let by = 1; by + 4 <= G.h - 1; by += bh + 1) for (let bx = 1; bx + 4 <= G.w - 1; bx += bw + 1) {
      const qw = Math.min(bw, G.w - 1 - bx), qh = Math.min(bh, G.h - 1 - by);
      if (bx <= mx + 3 && bx + qw >= mx - 3 && by <= my + 3 && by + qh >= my - 3) continue; // o quarteirão do meio é a praça da fonte
      if (r() < 0.12 + o.obst * 0.05) { G.rect(bx, by, qw, qh, ','); continue; } // praça com grama
      const w = r.int(4, qw), h = r.int(4, qh), x = bx + r.int(0, qw - w), y = by + r.int(0, qh - h);
      G.box(x, y, w, h, 'H', '.');
      if (o.doors) G.set(x + r.int(1, w - 2), r() < 0.5 ? y : y + h - 1, 'D');
    }
    // fonte no meio
    const cx = Math.floor(G.w / 2), cy = Math.floor(G.h / 2);
    G.rect(cx - 2, cy - 2, 5, 5, '='); G.rect(cx - 1, cy - 1, 3, 3, '~');
    sprinkle(G, r, '=', 'B', o.obst * 0.02);
    return [];
  },
  vila(G, r, o) {
    G.rect(0, 0, G.w, G.h, ',');
    const cx = Math.floor(G.w / 2), cy = Math.floor(G.h / 2);
    // o centro (poço e praça) fica livre: nenhuma casa em cima dele
    const homes = rooms(G, r, Math.max(3, o.rooms) + 4, 4, 6, 2).filter(s => s.x > cx + 2 || s.x + s.w < cx - 2 || s.y > cy + 2 || s.y + s.h < cy - 2).slice(0, Math.max(3, o.rooms));
    homes.forEach(s => {
      G.box(s.x, s.y, s.w, s.h, 'H', '.');
      const dx = s.x + Math.floor(s.w / 2), dy = s.cy > cy ? s.y : s.y + s.h - 1;
      G.set(dx, dy, o.doors ? 'D' : '.');
      G.path(dx, dy + (dy === s.y ? -1 : 1), cx, cy, '=', r, 1, new Set([',', 'f']));
    });
    G.rect(cx - 1, cy - 1, 3, 3, '='); G.set(cx, cy, '~'); // poço
    // plantações e árvores em volta
    const fx = r.int(1, Math.max(1, G.w - 9)), fy = r.int(1, Math.max(1, G.h - 6));
    for (let y = fy; y < fy + 4; y++) for (let x = fx; x < fx + 7; x++) if (G.get(x, y) === ',') G.set(x, y, 'f');
    sprinkle(G, r, ',', 'T', 0.05 + o.obst * 0.06, [[cx, cy]]);
    return homes;
  },
  arena(G, r, o) {
    G.rect(0, 0, G.w, G.h, 'H');
    const cx = (G.w - 1) / 2, cy = (G.h - 1) / 2, rx = G.w / 2 - 2, ry = G.h / 2 - 2;
    for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) G.set(x, y, 'S');
    // portões nas pontas
    const gy = Math.round(cy); for (const gx of [0, 1, G.w - 2, G.w - 1]) G.set(gx, gy, gx === 0 || gx === G.w - 1 ? 'D' : 'S');
    sprinkle(G, r, 'S', 'P', o.obst * 0.025, [[1, gy], [G.w - 2, gy]]);
    sprinkle(G, r, 'S', 'B', o.obst * 0.015, [[1, gy], [G.w - 2, gy]]);
    return [];
  },
  campo(G, r, o) {
    const n = noise(G.w, G.h, r, 6);
    for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) G.set(x, y, n(x, y) > 0.55 ? '.' : ',');
    // rio com ponte
    const ry = r.int(Math.floor(G.h / 3), Math.floor(G.h * 2 / 3));
    G.wander(0, ry, 1, '~', r, 2);
    const bx = r.int(3, G.w - 4); for (let y = 0; y < G.h; y++) if (G.get(bx, y) === '~') G.set(bx, y, 'b');
    for (let y = 0; y < G.h; y++) if (G.get(bx + 1, y) === '~') G.set(bx + 1, y, 'b');
    // trincheiras, pedras, barricadas e crateras
    for (let k = 0; k < 2 + Math.round(o.obst * 4); k++) { const y = r.int(1, G.h - 2), x = r.int(1, G.w - 10); for (let i = 0; i < r.int(4, 9); i++) if (G.get(x + i, y) !== '~' && G.get(x + i, y) !== 'b') G.set(x + i, y, 'B'); }
    sprinkle(G, r, ',', '^', 0.02 + o.obst * 0.04);
    sprinkle(G, r, '.', '_', 0.01 + o.obst * 0.03);
    return [];
  }
};

// gera um mapa. opts: { kind, w, h, rooms, obst (0-100), doors, traps, wide (corredores), seed }
function generate(opts = {}) {
  const kind = KINDS[opts.kind] ? opts.kind : 'masmorra';
  const w = Math.max(12, Math.min(60, Math.round(+opts.w) || 30)), h = Math.max(10, Math.min(60, Math.round(+opts.h) || 22));
  const seed = Number.isFinite(+opts.seed) && opts.seed !== '' && opts.seed !== null ? (+opts.seed >>> 0) : (Math.random() * 2 ** 32) >>> 0;
  const r = rng(seed);
  const o = {
    rooms: Math.max(1, Math.min(20, Math.round(+opts.rooms) || 8)),
    obst: Math.max(0, Math.min(100, +opts.obst || 0)) / 100,
    doors: opts.doors !== false,
    wide: +opts.wide === 2 ? 2 : 1
  };
  const G = grid(w, h, '.');
  GEN[kind](G, r, o);
  // armadilhas: em casas de chão/grama/areia/trilha, longe das bordas
  const nTraps = Math.max(0, Math.min(30, Math.round(+opts.traps) || 0)), floor = [];
  G.t.forEach((v, i) => { const x = i % w, y = (i / w) | 0; if (['.', ',', 'S', '='].includes(v) && x > 1 && y > 1 && x < w - 2 && y < h - 2) floor.push(i); });
  const traps = [];
  for (let k = 0; k < nTraps && floor.length; k++) traps.push({ i: floor.splice(Math.floor(r() * floor.length), 1)[0], on: false });
  // um ponto de partida andável perto do centro (onde os personagens aparecem)
  let start = null, best = 1e9;
  G.t.forEach((v, i) => { if (!WALK.has(v)) return; const x = i % w, y = (i / w) | 0, d = (x - w / 2) ** 2 + (y - h / 2) ** 2; if (d < best) { best = d; start = [x, y]; } });
  return { kind, name: KINDS[kind], w, h, seed, tiles: G.t.join(''), traps, start: start || [1, 1] };
}

module.exports = { generate, KINDS, WALK: [...WALK], TILE_CHARS: '.,#H~^T=DSPAB_bf' };
