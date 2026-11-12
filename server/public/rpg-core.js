/* Anarchy — RPG de Mesa: núcleo compartilhado (servidor e navegador usam exatamente o mesmo código).
   - Materiais (catálogo + personalizados do Mestre), organizados por categoria e camada.
   - Mapa em camadas independentes: chão, terreno especial, paredes/estruturas e objetos (cada uma é um texto com
     um caractere por casa, indexando a paleta do mapa). Portas, luzes e marcadores ficam em listas próprias.
     Colocar um objeto nunca mexe no chão.
   - Colisão (quem anda por onde), linha de visão, luz (lâmpadas e lanternas em cone) e campo de visão.
   No servidor: require('./public/rpg-core'). No navegador: window.RpgCore. */
(function (root, factory) { const M = factory(); if (typeof module === 'object' && module.exports) module.exports = M; else root.RpgCore = M; })(typeof self !== 'undefined' ? self : this, function () {
'use strict';

const LAYERS = ['chao', 'terreno', 'parede', 'objeto'];
const LAYER_NAMES = { chao: 'Chão', terreno: 'Terreno especial', parede: 'Paredes e estruturas', objeto: 'Objetos e móveis' };
const CATS = {
  pedra: 'Pedra', madeira: 'Madeira', construcao: 'Tijolo e construção', natureza: 'Terra e plantas', agua: 'Água, neve e gelo',
  fogo: 'Fogo e lava', metal: 'Metal e ferro', vidro: 'Vidro e cristal', magico: 'Mágicos', sobrenatural: 'Sobrenaturais', moveis: 'Móveis', decoracao: 'Decoração', custom: 'Personalizados'
};
// Propriedades padrão de cada camada: w = dá para andar em cima, s = bloqueia a visão, l = bloqueia a luz
const LAYER_DEF = { chao: { w: 1, s: 0, l: 0 }, terreno: { w: 1, s: 0, l: 0 }, parede: { w: 0, s: 1, l: 1 }, objeto: { w: 0, s: 0, l: 0 } };
// id: [nome, categoria, camada, [cor base, escura, clara], estilo do desenho, propriedades extras]
const RAW = {
  // ---- chão ----
  'pedra': ['Pedra (lajotas)', 'pedra', 'chao', ['#57514a', '#4c463f', '#635c53'], 'lajota'],
  'pedra-trab': ['Pedra trabalhada', 'pedra', 'chao', ['#6a655d', '#5d5850', '#78736a'], 'blocos'],
  'paralelepipedo': ['Paralelepípedo', 'pedra', 'chao', ['#666058', '#58524a', '#756e65'], 'seixos'],
  'marmore': ['Mármore branco', 'pedra', 'chao', ['#d9d4cb', '#c4beb3', '#ebe7df'], 'marmore'],
  'marmore-negro': ['Mármore negro', 'pedra', 'chao', ['#2c2a2e', '#212024', '#3b383d'], 'marmore'],
  'tijolo-piso': ['Piso de tijolos', 'construcao', 'chao', ['#8a4b35', '#77402d', '#9b5841'], 'tijolo'],
  'carvalho': ['Carvalho', 'madeira', 'chao', ['#7a5a3a', '#6a4d31', '#8a6845'], 'tabuas'],
  'pinho': ['Pinho (madeira clara)', 'madeira', 'chao', ['#b08d5c', '#9c7b4f', '#c29f6c'], 'tabuas'],
  'ebano': ['Ébano (madeira escura)', 'madeira', 'chao', ['#3e2a1c', '#332216', '#4b3424'], 'tabuas'],
  'tabuas-velhas': ['Tábuas velhas', 'madeira', 'chao', ['#6b5b47', '#5a4c3b', '#7a6a55'], 'tabuas-velhas'],
  'tapete': ['Tapete vermelho', 'decoracao', 'chao', ['#7a1f24', '#64181c', '#8f2a2f'], 'tapete'],
  'terra': ['Terra', 'natureza', 'chao', ['#6b5038', '#5c442f', '#7a5c42'], 'terra', { org: 1 }],
  'chao-caverna': ['Chão de caverna', 'natureza', 'chao', ['#5e5547', '#52493c', '#6b6152'], 'liso', { org: 1 }],
  'lama': ['Lama', 'natureza', 'chao', ['#4a3b2a', '#3d3022', '#574633'], 'lama', { org: 1 }],
  'grama': ['Grama', 'natureza', 'chao', ['#4d7a37', '#436d30', '#5b8a41'], 'grama', { org: 1 }],
  'grama-seca': ['Grama seca', 'natureza', 'chao', ['#8a8a45', '#7a7a3b', '#9a9a52'], 'grama', { org: 1 }],
  'plantacao': ['Plantação', 'natureza', 'chao', ['#7d8b38', '#6e7c30', '#93a243'], 'plantacao'],
  'trilha': ['Trilha', 'natureza', 'chao', ['#957b55', '#86704c', '#a68b62'], 'trilha', { org: 1 }],
  'areia': ['Areia', 'natureza', 'chao', ['#cdb57e', '#c2a96f', '#d9c391'], 'liso', { org: 1 }],
  'neve': ['Neve', 'agua', 'chao', ['#e8eef4', '#d5dee8', '#f6f9fc'], 'neve', { org: 1 }],
  'gelo': ['Gelo', 'agua', 'chao', ['#a9d3e8', '#93c2da', '#c3e4f3'], 'gelo'],
  'metal': ['Chapa de metal', 'metal', 'chao', ['#6f767d', '#5f656b', '#80878e'], 'metal'],
  'ferro': ['Grelha de ferro', 'metal', 'chao', ['#4a4c50', '#3c3e42', '#585b60'], 'grelha'],
  'vidro-piso': ['Piso de vidro', 'vidro', 'chao', ['#8fb8c8', '#7aa5b6', '#a9cfdc'], 'vidro'],
  'cristal-piso': ['Piso de cristal', 'vidro', 'chao', ['#9d7fd6', '#8a6cc4', '#b497e6'], 'cristal'],
  'runas': ['Piso rúnico', 'magico', 'chao', ['#3a3f6b', '#2f3459', '#4a5080'], 'runas', { glow: '#8fa2ff' }],
  'pedra-encantada': ['Pedra encantada', 'magico', 'chao', ['#2d4f5c', '#244350', '#3a6372'], 'runas', { glow: '#6fe3d2' }],
  'corrompido': ['Solo corrompido', 'sobrenatural', 'chao', ['#3b2240', '#2f1a33', '#4d2d54'], 'corrompido', { org: 1 }],
  'ossos': ['Chão de ossos', 'sobrenatural', 'chao', ['#b9ad94', '#a39780', '#cfc4ab'], 'ossos'],
  'vazio': ['Vazio estrelado', 'sobrenatural', 'chao', ['#0d0b1a', '#080612', '#1a1630'], 'vazio'],
  // ---- terreno especial (fica por cima do chão; o chão continua lá embaixo) ----
  'agua': ['Água rasa', 'agua', 'terreno', ['#3a7fb2', '#2e6c9b', '#4b90c2'], 'agua', { org: 1 }],
  'agua-funda': ['Água funda', 'agua', 'terreno', ['#22567f', '#1c4a6e', '#2e6c9b'], 'agua', { org: 1, w: 0 }],
  'pantano': ['Pântano', 'agua', 'terreno', ['#3f5232', '#34452a', '#4d633d'], 'lama', { org: 1 }],
  'gelo-fino': ['Gelo fino', 'agua', 'terreno', ['#bfe3f2', '#a8d4e8', '#d6eef8'], 'gelo', { org: 1 }],
  'lava': ['Lava', 'fogo', 'terreno', ['#d2451e', '#a8320f', '#ffb13b'], 'lava', { org: 1, w: 0, glow: '#ff7a2a' }],
  'brasas': ['Brasas', 'fogo', 'terreno', ['#3a2420', '#2a1714', '#ff6a2a'], 'brasas', { org: 1, glow: '#ff5a1a' }],
  'buraco': ['Buraco', 'natureza', 'terreno', ['#0d0b0a', '#080706', '#151210'], 'buraco', { w: 0 }],
  'ponte': ['Ponte de madeira', 'madeira', 'terreno', ['#8a6239', '#5a3d20', '#9c7247'], 'ponte'],
  'acido': ['Poça de ácido', 'sobrenatural', 'terreno', ['#7fbf2a', '#5f9a18', '#a8e05a'], 'agua', { org: 1, glow: '#a8ff3a' }],
  'nevoa': ['Névoa mágica (esconde a visão)', 'magico', 'terreno', ['#a7a3c9', '#8e8ab3', '#c4c0e0'], 'nevoa', { org: 1, s: 1 }],
  'trevas': ['Trevas (bloqueiam visão e luz)', 'sobrenatural', 'terreno', ['#0a0710', '#050308', '#1a1224'], 'trevas', { org: 1, s: 1, l: 1 }],
  // ---- paredes e estruturas ----
  'parede-pedra': ['Parede de pedra', 'pedra', 'parede', ['#3f3a35', '#36312c', '#4a443e'], 'tijolo-pedra'],
  'muralha': ['Muralha (pedra trabalhada)', 'pedra', 'parede', ['#55504a', '#48443e', '#625d56'], 'blocos'],
  'rocha': ['Rocha (caverna)', 'pedra', 'parede', ['#1c1916', '#141210', '#28231f'], 'rocha', { org: 1 }],
  'parede-marmore': ['Parede de mármore', 'pedra', 'parede', ['#bdb7ac', '#a8a297', '#d2cdc4'], 'marmore'],
  'tijolo': ['Tijolos', 'construcao', 'parede', ['#7a3f2c', '#6a3524', '#8b4c37'], 'tijolo'],
  'parede-madeira': ['Parede de madeira', 'madeira', 'parede', ['#6b4a2c', '#5c3f25', '#7a5634'], 'tabuas-h'],
  'palicada': ['Paliçada', 'madeira', 'parede', ['#5e4127', '#4d351f', '#6f4e31'], 'palicada'],
  'parede-metal': ['Parede de metal', 'metal', 'parede', ['#5d646b', '#4f555b', '#6e757c'], 'metal'],
  'parede-ferro': ['Ferro reforçado', 'metal', 'parede', ['#3d3f44', '#313337', '#4b4e53'], 'rebites'],
  'grade': ['Grade de ferro (dá para ver)', 'metal', 'parede', ['#2b2d31', '#1f2124', '#4a4d52'], 'grade', { s: 0, l: 0 }],
  'vidro': ['Vidro (dá para ver)', 'vidro', 'parede', ['#9cc6d6', '#82b0c2', '#c4e6f2'], 'vidro', { s: 0, l: 0 }],
  'parede-cristal': ['Cristal (deixa a luz passar)', 'vidro', 'parede', ['#8e6fd0', '#7a5cbd', '#b497e6'], 'cristal', { l: 0, glow: '#b497e6' }],
  'barreira': ['Barreira mágica (dá para ver)', 'magico', 'parede', ['#4a7bd8', '#3a66bd', '#8fb2ff'], 'barreira', { s: 0, l: 0, glow: '#6f9bff' }],
  'cerca-viva': ['Cerca viva', 'natureza', 'parede', ['#2c5a26', '#234a1f', '#3a6e31'], 'sebe'],
  'muro-sombras': ['Muro de sombras', 'sobrenatural', 'parede', ['#1a1022', '#120a18', '#2e1c3c'], 'sombra'],
  // ---- objetos (ficam por cima do chão, sem trocar o chão) ----
  'pilar': ['Pilar', 'pedra', 'objeto', ['#c9c3b8', '#6f6a62', '#e0dbd2'], 'pilar'],
  'coluna': ['Coluna de mármore', 'pedra', 'objeto', ['#ece7de', '#a9a397', '#ffffff'], 'pilar'],
  'pedregulho': ['Pedregulho', 'pedra', 'objeto', ['#a99e8d', '#776d5e', '#3a332b'], 'pedregulho'],
  'estatua': ['Estátua', 'pedra', 'objeto', ['#b8b2a6', '#7a756c', '#d8d3ca'], 'estatua'],
  'arvore': ['Árvore', 'natureza', 'objeto', ['#2c6326', '#1f4a1b', '#336d2b'], 'arvore', { s: 1 }],
  'pinheiro': ['Pinheiro', 'natureza', 'objeto', ['#1f4d2e', '#163a22', '#2a5f3a'], 'pinheiro', { s: 1 }],
  'arbusto': ['Arbusto (esconde, mas dá para passar)', 'natureza', 'objeto', ['#3d6e2e', '#2f5a23', '#4d8239'], 'arbusto', { w: 1, s: 1 }],
  'cristais': ['Cristais', 'vidro', 'objeto', ['#9d7fd6', '#6d50a8', '#d8c6ff'], 'cristais', { glow: '#b497e6' }],
  'altar': ['Altar', 'decoracao', 'objeto', ['#e9dcc0', '#a8987c', '#ffcf6b'], 'altar'],
  'barricada': ['Barricada', 'madeira', 'objeto', ['#8a5a2b', '#4a2f16', '#a06b36'], 'barricada'],
  'mesa': ['Mesa', 'moveis', 'objeto', ['#8a6239', '#5a3d20', '#a07448'], 'mesa'],
  'cadeira': ['Cadeira', 'moveis', 'objeto', ['#7a5634', '#4d351f', '#8f6640'], 'cadeira', { w: 1 }],
  'cama': ['Cama', 'moveis', 'objeto', ['#6b4a2c', '#c9c0b0', '#8a2f2f'], 'cama'],
  'estante': ['Estante de livros', 'moveis', 'objeto', ['#5c3f25', '#3a2716', '#8a4b35'], 'estante', { s: 1 }],
  'bau': ['Baú', 'moveis', 'objeto', ['#7b4a22', '#4a2c12', '#c99a3a'], 'bau'],
  'barril': ['Barril', 'moveis', 'objeto', ['#7a5230', '#4a3018', '#3a3a3a'], 'barril'],
  'caixote': ['Caixote', 'moveis', 'objeto', ['#a07a48', '#6b4f2c', '#b88d55'], 'caixote'],
  'tumulo': ['Túmulo', 'sobrenatural', 'objeto', ['#8a857c', '#5c5852', '#a39e95'], 'tumulo'],
  'poco': ['Poço', 'construcao', 'objeto', ['#7a756c', '#4a4640', '#2e6c9b'], 'poco'],
  'fogueira': ['Fogueira', 'fogo', 'objeto', ['#5a3d20', '#ff7a2a', '#ffd36b'], 'fogueira', { glow: '#ff8a3a' }],
  'braseiro': ['Braseiro', 'fogo', 'objeto', ['#3a3a3a', '#ff7a2a', '#ffd36b'], 'braseiro', { glow: '#ff8a3a' }],
  'totem': ['Totem', 'sobrenatural', 'objeto', ['#5a3d20', '#8a2f2f', '#d8b04a'], 'totem'],
  'circulo-arcano': ['Círculo arcano', 'magico', 'objeto', ['#6f9bff', '#3a66bd', '#c9d8ff'], 'circulo', { w: 1, glow: '#6f9bff' }]
};
const MATS = {};
for (const [id, [n, cat, L, c, st, x]] of Object.entries(RAW)) MATS[id] = { id, n, cat, L, c, st, ...LAYER_DEF[L], ...(x || {}) };
// estilos que o Mestre pode escolher para um material personalizado (desenho por camada)
const STYLES = {
  chao: ['liso', 'lajota', 'blocos', 'seixos', 'marmore', 'tijolo', 'tabuas', 'terra', 'grama', 'neve', 'gelo', 'metal', 'grelha', 'vidro', 'cristal', 'runas', 'corrompido', 'vazio'],
  terreno: ['agua', 'lama', 'lava', 'brasas', 'gelo', 'nevoa', 'trevas', 'buraco', 'ponte'],
  parede: ['tijolo-pedra', 'blocos', 'rocha', 'marmore', 'tijolo', 'tabuas-h', 'palicada', 'metal', 'rebites', 'grade', 'vidro', 'cristal', 'barreira', 'sebe', 'sombra'],
  objeto: ['emoji', 'pilar', 'pedregulho', 'estatua', 'arvore', 'arbusto', 'cristais', 'altar', 'barricada', 'mesa', 'cadeira', 'cama', 'estante', 'bau', 'barril', 'caixote', 'tumulo', 'fogueira', 'totem', 'circulo']
};
// aparência das portas: grade e vidro deixam ver e passar luz mesmo fechadas
const DOOR_LOOKS = { madeira: { n: 'Madeira', s: 1, l: 1 }, reforcada: { n: 'Madeira reforçada', s: 1, l: 1 }, ferro: { n: 'Ferro', s: 1, l: 1 }, grade: { n: 'Grade', s: 0, l: 0 }, vidro: { n: 'Vidro', s: 0, l: 0 }, pedra: { n: 'Pedra (passagem secreta)', s: 1, l: 1 }, magica: { n: 'Mágica', s: 1, l: 1 } };
const DOOR_STATES = ['aberta', 'fechada', 'trancada'];
const LIGHT_SHAPES = ['circulo', 'cone', 'quadrado'];
const LANTERN_KINDS = {
  lanterna: { n: 'Lanterna', range: 8, angle: 60, color: '#fff3c4', intensity: 85 },
  tocha: { n: 'Tocha', range: 5, angle: 360, color: '#ffb35a', intensity: 75 },
  lampiao: { n: 'Lampião', range: 6, angle: 360, color: '#ffd98a', intensity: 70 },
  vela: { n: 'Vela', range: 2, angle: 360, color: '#ffcf7a', intensity: 55 },
  magica: { n: 'Luz mágica', range: 7, angle: 90, color: '#9fc2ff', intensity: 80 }
};
const FOG_MODES = { manual: 'Neblina permanente (só o que o Mestre revelar)', descoberto: 'Áreas descobertas (o explorado fica escurecido)', tempo_real: 'Visão em tempo real (só o que se vê agora)' };
const AMBIENTS = { dia: 'Claro (dia)', penumbra: 'Penumbra', escuro: 'Escuro (só se vê com luz)' };

// material pelo id (catálogo ou personalizado da campanha)
function mat(id, custom) {
  if (!id) return null;
  if (MATS[id]) return MATS[id];
  if (custom) { const c = Array.isArray(custom) ? custom.find(x => x.id === id) : custom[id]; if (c) return { ...LAYER_DEF[c.L], ...c }; }
  return null;
}

/* ---------- camadas ---------- */
// cada camada é um texto (uma letra por casa). ' ' = vazio; as outras letras apontam para m.pal (paleta do mapa)
const ALPHA = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+,-./:;<=>?@[]^_{|}~';
const code = (s, i) => { const ch = s[i]; return ch === ' ' || ch === undefined ? -1 : ALPHA.indexOf(ch); };
function cellId(m, layer, i) { const k = code(m.layers[layer], i); return k < 0 ? null : m.pal[k] || null; }
function palIndex(m, id) {
  let k = m.pal.indexOf(id);
  if (k >= 0) return k;
  if (m.pal.length >= ALPHA.length) compactPal(m);
  if (m.pal.length >= ALPHA.length) return -1;
  m.pal.push(id); return m.pal.length - 1;
}
// tira da paleta o que nenhuma casa usa mais
function compactPal(m) {
  const used = new Set();
  for (const L of LAYERS) for (const ch of m.layers[L]) if (ch !== ' ') used.add(ALPHA.indexOf(ch));
  const keep = m.pal.map((id, k) => (used.has(k) ? id : null)), map = {}, pal = [];
  keep.forEach((id, k) => { if (id !== null) { map[k] = pal.length; pal.push(id); } });
  for (const L of LAYERS) m.layers[L] = [...m.layers[L]].map(ch => (ch === ' ' ? ' ' : ALPHA[map[ALPHA.indexOf(ch)]])).join('');
  m.pal = pal;
}
// troca várias casas de uma vez: cells = [[índice, camada, id ou null], ...]
function setCells(m, cells) {
  const arr = {}; for (const L of LAYERS) arr[L] = null;
  for (const [i, L, id] of cells) {
    if (!(L in arr) || !Number.isInteger(i) || i < 0 || i >= m.w * m.h) continue;
    if (L === 'chao' && !id) continue; // o chão nunca fica vazio
    if (!arr[L]) arr[L] = m.layers[L].split('');
    if (!id) { arr[L][i] = ' '; continue; }
    const k = palIndex(m, id); if (k < 0) continue;
    arr[L][i] = ALPHA[k];
  }
  for (const L of LAYERS) if (arr[L]) m.layers[L] = arr[L].join('');
}
function emptyLayers(w, h, floor) {
  const n = w * h;
  return { pal: [floor], layers: { chao: '0'.repeat(n), terreno: ' '.repeat(n), parede: ' '.repeat(n), objeto: ' '.repeat(n) } };
}
// mapas antigos (e o gerador) usam uma letra por casa misturando tudo; aqui vira camadas separadas
const THEME = {
  masmorra: { '.': 'pedra', '#': 'parede-pedra' }, caverna: { '.': 'chao-caverna', '#': 'rocha' }, castelo: { '.': 'pedra-trab', '#': 'muralha' },
  templo: { '.': 'marmore', '#': 'parede-marmore', P: 'coluna' }, floresta: { '.': 'terra', '#': 'rocha' }, montanha: { '.': 'chao-caverna', '#': 'rocha', T: 'pinheiro' },
  cidade: { '.': 'carvalho', H: 'tijolo', '=': 'paralelepipedo' }, vila: { '.': 'pinho' }, arena: { '.': 'pedra' }, campo: { '.': 'terra' }
};
function fromTiles(tiles, w, h, kind) {
  const T = { '.': 'pedra', ',': 'grama', '=': 'trilha', S: 'areia', f: 'plantacao', '#': 'parede-pedra', H: 'parede-madeira', P: 'pilar', T: 'arvore', ...(THEME[kind] || {}) };
  const floorOf = ch => ({ '.': T['.'], ',': 'grama', '=': T['='], S: 'areia', f: 'plantacao', D: T['.'], P: T['.'], A: T['.'], T: 'grama', B: 'grama' })[ch] || null;
  // chão de base (embaixo de paredes, água etc.): o mais comum do mapa
  const cnt = {}; for (const ch of tiles) { const f = floorOf(ch); if (f) cnt[f] = (cnt[f] || 0) + 1; }
  const base = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0] || T['.'];
  const M = { w, h, ...emptyLayers(w, h, base) }, cells = [], doors = [];
  for (let i = 0; i < tiles.length; i++) {
    const ch = tiles[i], f = floorOf(ch);
    if (ch === '^' && (kind === 'caverna' || kind === 'montanha')) cells.push([i, 'chao', 'chao-caverna']);
    else if (f && f !== base) cells.push([i, 'chao', f]);
    if (ch === '~') cells.push([i, 'terreno', 'agua-funda']);
    if (ch === '_') cells.push([i, 'terreno', 'buraco']);
    if (ch === 'b') cells.push([i, 'terreno', 'ponte']);
    if (ch === '#') cells.push([i, 'parede', T['#']]);
    if (ch === 'H') cells.push([i, 'parede', T.H]);
    if (ch === 'P') cells.push([i, 'objeto', T.P]);
    if (ch === 'T') cells.push([i, 'objeto', T.T]);
    if (ch === 'A') cells.push([i, 'objeto', 'altar']);
    if (ch === 'B') cells.push([i, 'objeto', 'barricada']);
    if (ch === '^') cells.push([i, 'objeto', 'pedregulho']);
    if (ch === 'D') doors.push(i);
  }
  setCells(M, cells);
  return { pal: M.pal, layers: M.layers, doors };
}

/* ---------- propriedades por casa ---------- */
// bits: 1 = não dá para andar, 2 = bloqueia a visão, 4 = bloqueia a luz.
// thru (opcional): materiais (ou "porta:<aparência>") que esta luz atravessa
function flags(m, custom, thru) {
  const n = m.w * m.h, F = new Uint8Array(n), skip = thru && thru.length ? new Set(thru) : null;
  const cache = {}, prop = k => { if (!(k in cache)) cache[k] = mat(m.pal[k], custom); return cache[k]; };
  for (const L of LAYERS) {
    const s = m.layers[L];
    for (let i = 0; i < n; i++) {
      const ch = s[i]; if (ch === ' ') continue;
      const p = prop(ALPHA.indexOf(ch)); if (!p) continue;
      if (!p.w) F[i] |= 1;
      if (p.s) F[i] |= 2;
      if (p.l && !(skip && skip.has(p.id))) F[i] |= 4;
    }
  }
  for (const d of m.doors || []) {
    if (d.i < 0 || d.i >= n) continue;
    if (d.state === 'aberta') { F[d.i] &= ~7; continue; } // porta aberta: passagem livre (sem parede na casa da porta)
    const look = DOOR_LOOKS[d.look] || DOOR_LOOKS.madeira;
    F[d.i] |= 1; if (look.s) F[d.i] |= 2; if (look.l && !(skip && skip.has('porta:' + (d.look || 'madeira')))) F[d.i] |= 4;
  }
  return F;
}
// dá para ir de a até b sem atravessar parede, obstáculo ou porta fechada? (andando casa a casa, diagonal sem cortar quina)
function reach(F, w, h, a, b) {
  const s = a[1] * w + a[0], t = b[1] * w + b[0];
  if (s === t) return true;
  if (b[0] < 0 || b[1] < 0 || b[0] >= w || b[1] >= h || (F[t] & 1)) return false;
  const seen = new Uint8Array(w * h), q = [s]; seen[s] = 1;
  for (let k = 0; k < q.length; k++) {
    const i = q[k], x = i % w, y = (i / w) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx; if (seen[j] || (F[j] & 1)) continue;
      if (dx && dy && ((F[y * w + nx] & 1) || (F[ny * w + x] & 1))) continue;
      if (j === t) return true;
      seen[j] = 1; q.push(j);
    }
  }
  return false;
}

/* ---------- linha de visão, luz e campo de visão ---------- */
// segmento livre de (ox,oy) até o ponto (ex,ey) dentro da casa (tx,ty)? Não pode passar por casa com o bit nem
// escapar pela quina entre duas casas bloqueadas na diagonal.
function clear(F, w, ox, oy, ex, ey, tx, ty, bit) {
  const dx = ex - ox, dy = ey - oy, n = Math.max(2, Math.ceil(Math.hypot(dx, dy) / 0.2));
  let px = Math.floor(ox), py = Math.floor(oy);
  for (let k = 1; k <= n; k++) {
    const cx = Math.floor(ox + dx * k / n), cy = Math.floor(oy + dy * k / n);
    if (cx === px && cy === py) continue;
    if (cx !== px && cy !== py && (F[py * w + cx] & bit) && (F[cy * w + px] & bit)) return false;
    if (cx === tx && cy === ty) return true;
    if (F[cy * w + cx] & bit) return false;
    px = cx; py = cy;
  }
  return true;
}
const PTS = [[0.5, 0.5], [0.12, 0.12], [0.88, 0.12], [0.12, 0.88], [0.88, 0.88]];
const sees = (F, w, ox, oy, tx, ty, bit) => PTS.some(([a, b]) => clear(F, w, ox, oy, tx + a, ty + b, tx, ty, bit));
const angDiff = (a, b) => Math.abs(((a - b) % 360 + 540) % 360 - 180);
// casas alcançadas a partir de (ox,oy): range em casas; bit 2 = visão, 4 = luz; cone {dir, angle}; square = alcance quadrado
function fov(F, w, h, ox, oy, range, bit, o = {}) {
  const out = new Uint8Array(w * h), sx = Math.floor(ox), sy = Math.floor(oy);
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return out;
  out[sy * w + sx] = 1;
  const R = Math.ceil(range) + 1, cone = o.cone && o.cone.angle < 360 ? o.cone : null;
  for (let y = Math.max(0, sy - R); y <= Math.min(h - 1, sy + R); y++) for (let x = Math.max(0, sx - R); x <= Math.min(w - 1, sx + R); x++) {
    if (x === sx && y === sy) continue;
    const dx = x + 0.5 - ox, dy = y + 0.5 - oy, d = Math.hypot(dx, dy);
    if ((o.square ? Math.max(Math.abs(dx), Math.abs(dy)) : d) > range + 0.5) continue;
    if (cone && angDiff(Math.atan2(dy, dx) * 180 / Math.PI, cone.dir) > cone.angle / 2 + (d < 1.6 ? 50 : 4)) continue;
    if (sees(F, w, ox, oy, x, y, bit)) out[y * w + x] = 1;
  }
  return out;
}
const clampN = (v, lo, hi, d) => { const n = +v; return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
// luz de todas as fontes do mapa: lâmpadas ligadas + lanternas ligadas dos personagens que estão neste mapa.
// devolve lit (casa iluminada?) e, para desenhar, a lista de fontes com as casas que cada uma alcança
function lighting(m, custom, F, chars) {
  const n = m.w * m.h, lit = new Uint8Array(n), srcs = [];
  const add = (src, mask) => { for (let i = 0; i < n; i++) if (mask[i]) lit[i] = 1; srcs.push({ ...src, mask }); };
  for (const L of m.lights || []) {
    if (!L.on) continue;
    const Fx = L.thru && L.thru.length ? flags(m, custom, L.thru) : F;
    const r = clampN(L.r, 0, 30, 5);
    add({ kind: 'luz', id: L.id, x: L.x + 0.5, y: L.y + 0.5, r, color: L.color, intensity: L.intensity, shape: L.shape, dir: L.dir || 0, angle: L.angle || 90 },
      fov(Fx, m.w, m.h, L.x + 0.5, L.y + 0.5, r, 4, { cone: L.shape === 'cone' ? { dir: L.dir || 0, angle: L.angle || 90 } : null, square: L.shape === 'quadrado' }));
  }
  for (const c of chars || []) {
    const p = c.pos && c.pos[m.id], lt = c.lantern; if (!p || !lt || !lt.on) continue;
    const r = clampN(lt.range, 1, 30, 6), ang = clampN(lt.angle, 10, 360, 60), x = p[0] + 0.5, y = p[1] + 0.5;
    add({ kind: 'lanterna', id: c.id, x, y, r, color: lt.color, intensity: lt.intensity, shape: ang >= 360 ? 'circulo' : 'cone', dir: c.dir || 0, angle: ang },
      fov(F, m.w, m.h, x, y, r, 4, { cone: { dir: c.dir || 0, angle: ang } }));
  }
  // materiais que brilham (lava, cristais, fogueira...) iluminam a própria casa e as vizinhas
  for (const Lr of ['terreno', 'objeto', 'chao']) {
    const s = m.layers[Lr];
    for (let i = 0; i < n; i++) {
      if (s[i] === ' ') continue; const p = mat(m.pal[ALPHA.indexOf(s[i])], custom); if (!p || !p.glow) continue;
      const x = i % m.w, y = (i / m.w) | 0, rr = p.st === 'fogueira' || p.st === 'braseiro' ? 4 : 1;
      for (let b = -rr; b <= rr; b++) for (let a = -rr; a <= rr; a++) { const xx = x + a, yy = y + b; if (xx >= 0 && yy >= 0 && xx < m.w && yy < m.h && a * a + b * b <= rr * rr + 1 && (rr === 1 || sees(F, m.w, x + 0.5, y + 0.5, xx, yy, 4))) lit[yy * m.w + xx] = 1; }
    }
  }
  return { lit, srcs };
}
// o que um personagem vê agora: linha de visão (paredes e portas fechadas bloqueiam) até o alcance da visão;
// no escuro, só as casas iluminadas (ou bem pertinho, pela "visão no escuro")
function vision(m, F, lit, ch) {
  const p = ch.pos && ch.pos[m.id]; if (!p) return null;
  const amb = m.amb || 'dia', sight = clampN(ch.sight || m.sight, 1, 30, 12), x = p[0] + 0.5, y = p[1] + 0.5;
  const V = fov(F, m.w, m.h, x, y, sight, 2);
  if (amb === 'dia') return V;
  const near = amb === 'penumbra' ? Math.max(2, clampN(ch.dark, 0, 30, 1)) : clampN(ch.dark, 0, 30, 1);
  for (let i = 0; i < V.length; i++) if (V[i] && !lit[i]) { const dx = (i % m.w) + 0.5 - x, dy = ((i / m.w) | 0) + 0.5 - y; if (Math.hypot(dx, dy) > near + 0.5) V[i] = 0; }
  return V;
}

/* ---------- máscaras de casas (exploração) em base64 compacto ---------- */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function bitsEnc(mask) {
  let out = '';
  for (let i = 0; i < mask.length; i += 6) { let v = 0; for (let k = 0; k < 6; k++) if (mask[i + k]) v |= 1 << k; out += B64[v]; }
  return out;
}
function bitsDec(s, n) {
  const out = new Uint8Array(n); if (!s) return out;
  for (let j = 0; j < s.length; j++) { const v = B64.indexOf(s[j]); if (v <= 0) continue; for (let k = 0; k < 6; k++) if (v & (1 << k) && j * 6 + k < n) out[j * 6 + k] = 1; }
  return out;
}
const bitsOr = (a, b) => { if (!b) return a; for (let i = 0; i < a.length; i++) if (b[i]) a[i] = 1; return a; };

/* ---------- status personalizados ---------- */
// modificadores dos status: ex. "Fadiga >= 5 dá DES -2". Devolve { ATRIBUTO: soma dos bônus/penalidades ativos }
function statVal(s, ch) { const x = ch && ch.stats && ch.stats[s.id]; return x && Number.isFinite(+x.v) ? +x.v : s.start; }
function statMods(cats, ch) {
  const out = {};
  for (const cat of cats || []) for (const s of cat.stats || []) { const v = statVal(s, ch); for (const md of s.mods || []) if (md.op === '<=' ? v <= md.at : v >= md.at) out[md.attr] = (out[md.attr] || 0) + md.v; }
  return out;
}
const ATTR_MOD = v => Math.floor(((Number.isFinite(+v) ? +v : 10) - 10) / 2);
const attrBonus = (camp, ch, a) => ATTR_MOD(ch && ch.attrs ? ch.attrs[a] : 10) + (statMods(camp && camp.statCats, ch)[a] || 0);

return { LAYERS, LAYER_NAMES, statVal, statMods, ATTR_MOD, attrBonus, CATS, MATS, STYLES, DOOR_LOOKS, DOOR_STATES, LIGHT_SHAPES, LANTERN_KINDS, FOG_MODES, AMBIENTS, ALPHA,
  mat, cellId, setCells, compactPal, emptyLayers, fromTiles, flags, reach, fov, lighting, vision, bitsEnc, bitsDec, bitsOr };
});
