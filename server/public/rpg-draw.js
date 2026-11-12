/* Anarchy — RPG de Mesa: desenho do mapa em camadas (só no navegador).
   Camadas, de baixo para cima: 1 chão, 2 terreno especial, 3 paredes e estruturas, 4 objetos (este arquivo, num
   canvas só), 5 portas (canvas próprio), 6 personagens (DOM em rpg.js), 7 iluminação (canvas próprio),
   8 efeitos e marcadores (DOM em rpg.js). Colocar um objeto nunca muda o chão: cada camada é desenhada por si. */
(() => {
'use strict';
const C = window.RpgCore;
function rnd(i, k = 0) { let x = (i * 374761393 + k * 668265263) | 0; x = (x ^ (x >>> 13)) * 1274126177 | 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; }
const SEE = { grade: 1, vidro: 1, barreira: 1 }; // paredes que se vê através: desenhadas como linha, não bloco

/* ---------- texturas (128×128, repetidas) ---------- */
const texCache = new Map(), imgCache = new Map();
let onImg = null; // chamado quando a imagem de um material personalizado termina de carregar
function texCanvas(mt) {
  const key = mt.id + '|' + (mt.c || []).join(',') + '|' + mt.st + '|' + (mt.img || '');
  if (texCache.has(key)) return texCache.get(key);
  const n = 128, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d');
  const [base, dark, light] = mt.c || ['#777', '#666', '#888'], st = mt.st;
  if (mt.img) {
    let im = imgCache.get(mt.img);
    if (!im) { im = new Image(); im.crossOrigin = 'anonymous'; im.src = mt.img; imgCache.set(mt.img, im); im.onload = () => { for (const k of [...texCache.keys()]) if (k.endsWith('|' + mt.img)) texCache.delete(k); onImg && onImg(); }; }
    if (im.complete && im.naturalWidth) { g.drawImage(im, 0, 0, n, n); texCache.set(key, c); return c; }
  }
  g.fillStyle = base; g.fillRect(0, 0, n, n);
  const specks = (k0, sz, a) => { for (let k = 0; k < 420; k++) { g.fillStyle = rnd(k, k0) < .5 ? dark : light; g.globalAlpha = a + rnd(k, k0 + 1) * .22; const s = 1 + rnd(k, k0 + 2) * sz; g.fillRect(rnd(k, k0 + 3) * n, rnd(k, k0 + 4) * n, s, s); } g.globalAlpha = 1; };
  if (!['vazio', 'trevas', 'buraco', 'nevoa'].includes(st)) specks(1, st === 'lajota' || st === 'rocha' ? 3 : 2, .16);
  const line = (w, col, f) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); f(); g.stroke(); };
  const bricks = (bw, bh, mort) => { line(1.5, mort, () => { for (let y = 0; y <= n; y += bh) { g.moveTo(0, y); g.lineTo(n, y); for (let x = (y / bh) % 2 ? 0 : bw / 2; x < n; x += bw) { g.moveTo(x, y); g.lineTo(x, y + bh); } } }); g.fillStyle = 'rgba(255,255,255,.06)'; for (let y = 0; y < n; y += bh) g.fillRect(0, y + 1.5, n, 1.5); };
  const planks = (vert, gap) => {
    const w = 16;
    for (let k = 0; k < n / w; k++) { g.fillStyle = rnd(k, 31) < .5 ? dark : light; g.globalAlpha = .18; vert ? g.fillRect(k * w, 0, w, n) : g.fillRect(0, k * w, n, w); }
    g.globalAlpha = 1;
    line(gap ? 2.5 : 1.3, 'rgba(25,14,6,.6)', () => { for (let k = 0; k <= n / w; k++) { if (vert) { g.moveTo(k * w, 0); g.lineTo(k * w, n); } else { g.moveTo(0, k * w); g.lineTo(n, k * w); } } });
    line(1, 'rgba(25,14,6,.28)', () => { for (let k = 0; k < n / w; k++) { const o = rnd(k, 33) * n; if (vert) { g.moveTo(k * w, o); g.lineTo(k * w + w, o); } else { g.moveTo(o, k * w); g.lineTo(o, k * w + w); } } });
    g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = .8; for (let k = 0; k < 30; k++) { g.beginPath(); const a = rnd(k, 34) * n, b = rnd(k, 35) * n; if (vert) { g.moveTo(a, b); g.bezierCurveTo(a + 2, b + 10, a - 2, b + 20, a, b + 30); } else { g.moveTo(b, a); g.bezierCurveTo(b + 10, a + 2, b + 20, a - 2, b + 30, a); } g.stroke(); }
  };
  switch (st) {
    case 'lajota': line(1.2, 'rgba(0,0,0,.22)', () => { for (let y = 0; y < n; y += 32) for (let x = (y / 32) % 2 ? 16 : 0; x < n + 16; x += 32) { g.moveTo(x + rnd(x, y) * 4, y); g.lineTo(x + 30, y + rnd(y, x) * 3); g.lineTo(x + 31, y + 30); g.lineTo(x, y + 31); g.closePath(); } }); break;
    case 'blocos': bricks(32, 16, 'rgba(0,0,0,.32)'); break;
    case 'tijolo': case 'tijolo-pedra': bricks(32, 16, st === 'tijolo' ? 'rgba(60,40,30,.75)' : 'rgba(0,0,0,.35)'); break;
    case 'seixos': for (let y = 0; y < n; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < n + 8; x += 16) { g.fillStyle = rnd(x, y) < .5 ? dark : light; g.beginPath(); g.ellipse(x + 8, y + 8, 6.5, 6, rnd(y, x) * 3, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.2; g.stroke(); } break;
    case 'marmore': for (let k = 0; k < 7; k++) { g.strokeStyle = k % 2 ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.22)'; g.lineWidth = .8 + rnd(k, 40) * 1.4; g.beginPath(); const y = rnd(k, 41) * n; g.moveTo(-5, y); g.bezierCurveTo(n * .3, y + (rnd(k, 42) - .5) * 60, n * .6, y + (rnd(k, 43) - .5) * 60, n + 5, y + (rnd(k, 44) - .5) * 40); g.stroke(); } line(1, 'rgba(0,0,0,.1)', () => { for (let k = 0; k <= n; k += 64) { g.moveTo(k, 0); g.lineTo(k, n); g.moveTo(0, k); g.lineTo(n, k); } }); break;
    case 'tabuas': planks(true, false); break;
    case 'tabuas-h': planks(false, false); break;
    case 'tabuas-velhas': planks(true, true); break;
    case 'tapete': g.strokeStyle = 'rgba(230,190,90,.55)'; g.lineWidth = 3; g.strokeRect(6, 6, n - 12, n - 12); g.lineWidth = 1.5; g.strokeRect(12, 12, n - 24, n - 24); g.beginPath(); g.moveTo(n / 2, 24); g.lineTo(n - 24, n / 2); g.lineTo(n / 2, n - 24); g.lineTo(24, n / 2); g.closePath(); g.stroke(); break;
    case 'terra': g.fillStyle = 'rgba(40,28,16,.35)'; for (let k = 0; k < 40; k++) { g.beginPath(); g.arc(rnd(k, 13) * n, rnd(k, 14) * n, 1 + rnd(k, 15) * 2.2, 0, 7); g.fill(); } break;
    case 'lama': for (let k = 0; k < 18; k++) { g.fillStyle = rnd(k, 50) < .5 ? 'rgba(20,14,8,.3)' : 'rgba(255,255,255,.07)'; g.beginPath(); g.ellipse(rnd(k, 51) * n, rnd(k, 52) * n, 4 + rnd(k, 53) * 10, 3 + rnd(k, 54) * 6, rnd(k, 55) * 3, 0, 7); g.fill(); } break;
    case 'grama': line(1, 'rgba(20,45,12,.5)', () => { for (let k = 0; k < 90; k++) { const x = rnd(k, 7) * n, y = rnd(k, 8) * n; g.moveTo(x, y); g.lineTo(x + (rnd(k, 9) - .5) * 4, y - 4 - rnd(k, 10) * 3); } }); break;
    case 'plantacao': g.fillStyle = 'rgba(160,180,70,.55)'; for (let y = 4; y < n; y += 10) g.fillRect(0, y, n, 3); break;
    case 'trilha': g.fillStyle = 'rgba(70,52,30,.35)'; for (let k = 0; k < 40; k++) { g.beginPath(); g.arc(rnd(k, 13) * n, rnd(k, 14) * n, 1 + rnd(k, 15) * 2, 0, 7); g.fill(); } break;
    case 'neve': for (let k = 0; k < 16; k++) { g.fillStyle = 'rgba(140,170,210,.12)'; g.beginPath(); g.ellipse(rnd(k, 60) * n, rnd(k, 61) * n, 10 + rnd(k, 62) * 16, 5 + rnd(k, 63) * 8, 0, 0, 7); g.fill(); } g.fillStyle = '#fff'; for (let k = 0; k < 60; k++) g.fillRect(rnd(k, 64) * n, rnd(k, 65) * n, 1.5, 1.5); break;
    case 'gelo': line(1, 'rgba(255,255,255,.55)', () => { for (let k = 0; k < 8; k++) { let x = rnd(k, 70) * n, y = rnd(k, 71) * n; g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (rnd(k, 72 + j) - .5) * 40; y += (rnd(k, 76 + j) - .5) * 40; g.lineTo(x, y); } } }); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 0, n, 6); break;
    case 'metal': case 'rebites': line(1.5, 'rgba(0,0,0,.4)', () => { for (let k = 0; k <= n; k += 64) { g.moveTo(k, 0); g.lineTo(k, n); g.moveTo(0, k); g.lineTo(n, k); } }); g.fillStyle = 'rgba(255,255,255,.12)'; for (let k = 0; k < n; k += 64) g.fillRect(k + 2, 2, 60, 2); if (st === 'rebites') { for (let y = 6; y < n; y += 64) for (let x = 6; x < n; x += 64) for (const [a, b] of [[0, 0], [52, 0], [0, 52], [52, 52]]) { g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.arc(x + a + 1, y + b + 1, 2.4, 0, 7); g.fill(); g.fillStyle = light; g.beginPath(); g.arc(x + a, y + b, 2.2, 0, 7); g.fill(); } } break;
    case 'grelha': g.fillStyle = 'rgba(0,0,0,.55)'; for (let y = 4; y < n; y += 16) for (let x = 4; x < n; x += 16) g.fillRect(x, y, 9, 9); break;
    case 'vidro': g.fillStyle = 'rgba(255,255,255,.18)'; for (let k = 0; k < 4; k++) { g.save(); g.translate(k * 36, 0); g.rotate(-.6); g.fillRect(0, 0, 8, n * 2); g.restore(); } line(1, 'rgba(255,255,255,.3)', () => { g.rect(1, 1, n - 2, n - 2); }); break;
    case 'cristal': for (let k = 0; k < 14; k++) { g.fillStyle = rnd(k, 80) < .5 ? 'rgba(255,255,255,.16)' : 'rgba(40,10,80,.18)'; g.beginPath(); const x = rnd(k, 81) * n, y = rnd(k, 82) * n; g.moveTo(x, y); g.lineTo(x + 18 + rnd(k, 83) * 14, y + 6); g.lineTo(x + 6, y + 22 + rnd(k, 84) * 12); g.closePath(); g.fill(); } break;
    case 'runas': g.strokeStyle = (mt.glow || light) ; g.globalAlpha = .55; g.lineWidth = 1.4; for (let k = 0; k < 6; k++) { const x = 12 + (k % 3) * 40, y = 18 + Math.floor(k / 3) * 60; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 10, y + 14); g.lineTo(x, y + 26); g.moveTo(x + 10, y); g.lineTo(x + 18, y + 12); g.stroke(); } g.beginPath(); g.arc(n / 2, n / 2, 40, 0, 7); g.stroke(); g.globalAlpha = 1; break;
    case 'corrompido': line(2, 'rgba(190,80,220,.35)', () => { for (let k = 0; k < 7; k++) { let x = rnd(k, 90) * n, y = rnd(k, 91) * n; g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (rnd(k, 92 + j) - .5) * 50; y += (rnd(k, 96 + j) - .5) * 50; g.quadraticCurveTo(x + 8, y - 8, x, y); } } }); break;
    case 'ossos': g.fillStyle = light; for (let k = 0; k < 14; k++) { g.save(); g.translate(rnd(k, 100) * n, rnd(k, 101) * n); g.rotate(rnd(k, 102) * 3); g.fillRect(-7, -1.5, 14, 3); for (const s of [-7, 7]) { g.beginPath(); g.arc(s, -1.6, 2.2, 0, 7); g.arc(s, 1.6, 2.2, 0, 7); g.fill(); } g.restore(); } break;
    case 'vazio': for (let k = 0; k < 70; k++) { g.fillStyle = `rgba(${200 + rnd(k, 110) * 55},${200 + rnd(k, 111) * 55},255,${.3 + rnd(k, 112) * .7})`; const s = rnd(k, 113) < .9 ? 1 : 2; g.fillRect(rnd(k, 114) * n, rnd(k, 115) * n, s, s); } break;
    case 'agua': line(1.5, 'rgba(190,230,255,.22)', () => { for (let k = 0; k < 14; k++) { const x = rnd(k, 11) * n, y = rnd(k, 12) * n; g.moveTo(x, y); g.quadraticCurveTo(x + 8, y - 4, x + 16, y); } }); break;
    case 'lava': g.fillStyle = dark; for (let k = 0; k < 16; k++) { g.beginPath(); g.ellipse(rnd(k, 120) * n, rnd(k, 121) * n, 8 + rnd(k, 122) * 14, 6 + rnd(k, 123) * 10, rnd(k, 124) * 3, 0, 7); g.fill(); } line(2, light, () => { for (let k = 0; k < 9; k++) { let x = rnd(k, 125) * n, y = rnd(k, 126) * n; g.moveTo(x, y); for (let j = 0; j < 3; j++) { x += (rnd(k, 127 + j) - .5) * 40; y += (rnd(k, 130 + j) - .5) * 40; g.lineTo(x, y); } } }); break;
    case 'brasas': for (let k = 0; k < 40; k++) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, 4); g.save(); g.translate(rnd(k, 140) * n, rnd(k, 141) * n); gr.addColorStop(0, light); gr.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = gr; g.fillRect(-4, -4, 8, 8); g.restore(); } break;
    case 'ponte': planks(false, true); break;
    case 'palicada': for (let x = 0; x < n; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, dark); gr.addColorStop(.5, light); gr.addColorStop(1, dark); g.fillStyle = gr; g.fillRect(x + 1, 0, 14, n); } break;
    case 'sebe': for (let k = 0; k < 60; k++) { g.fillStyle = rnd(k, 150) < .5 ? dark : light; g.beginPath(); g.arc(rnd(k, 151) * n, rnd(k, 152) * n, 4 + rnd(k, 153) * 6, 0, 7); g.fill(); } break;
    case 'sombra': line(3, 'rgba(120,60,160,.25)', () => { for (let k = 0; k < 6; k++) { const x = rnd(k, 160) * n, y = rnd(k, 161) * n; g.moveTo(x, y); g.arc(x, y, 10 + rnd(k, 162) * 20, 0, 4); } }); break;
    case 'barreira': line(1.2, 'rgba(200,225,255,.4)', () => { for (let y = 0; y < n; y += 14) for (let x = (y / 14) % 2 ? 8 : 0; x < n; x += 16) { for (let a = 0; a < 6; a++) { const t = a * Math.PI / 3; g[a ? 'lineTo' : 'moveTo'](x + Math.cos(t) * 8, y + Math.sin(t) * 8); } g.closePath(); } }); break;
    case 'nevoa': for (let k = 0; k < 12; k++) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, 30); g.save(); g.translate(rnd(k, 170) * n, rnd(k, 171) * n); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(-30, -30, 60, 60); g.restore(); } break;
    default: break;
  }
  texCache.set(key, c);
  return c;
}

/* ---------- objetos (desenhados por cima do chão, centrados na casa) ---------- */
const OBJ = {
  pilar(g, x, y, S, c) { g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(x + S * .08, y + S * .14, S * .36, S * .3, 0, 0, 7); g.fill(); const gr = g.createRadialGradient(x - S * .1, y - S * .1, 1, x, y, S * .34); gr.addColorStop(0, c[2]); gr.addColorStop(1, c[1]); g.fillStyle = gr; g.beginPath(); g.arc(x, y, S * .32, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, S * .22, 0, 7); g.stroke(); },
  pedregulho(g, x, y, S, c, i) { const r = S * (.46 + rnd(i, 6) * .14); g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(x + r * .18, y + r * .3, r * 1.02, r * .8, 0, 0, 7); g.fill(); const gr = g.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r * 1.05); gr.addColorStop(0, c[0]); gr.addColorStop(.6, c[1]); gr.addColorStop(1, c[2]); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * (.82 + rnd(i, 7) * .15), rnd(i, 8) * 3, 0, 7); g.fill(); g.strokeStyle = 'rgba(30,24,18,.45)'; g.lineWidth = Math.max(1, S * .025); g.beginPath(); const t = rnd(i, 9) * 6; g.moveTo(x + Math.cos(t) * r * .55, y + Math.sin(t) * r * .45); g.lineTo(x + Math.cos(t + .4) * r * .1, y + Math.sin(t + .4) * r * .1); g.lineTo(x + Math.cos(t + 2.6) * r * .5, y + Math.sin(t + 2.6) * r * .4); g.moveTo(x + Math.cos(t + .4) * r * .1, y + Math.sin(t + .4) * r * .1); g.lineTo(x + Math.cos(t + 4.4) * r * .35, y + Math.sin(t + 4.4) * r * .3); g.stroke(); g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(x - r * .35, y - r * .35, r * .28, r * .16, -.6, 0, 7); g.fill(); },
  estatua(g, x, y, S, c) { g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x - S * .36, y - S * .26, S * .76, S * .7); g.fillStyle = c[1]; g.fillRect(x - S * .38, y - S * .38, S * .76, S * .76); const gr = g.createRadialGradient(x - S * .08, y - S * .1, 1, x, y, S * .3); gr.addColorStop(0, c[2]); gr.addColorStop(1, c[0]); g.fillStyle = gr; g.beginPath(); g.arc(x, y - S * .04, S * .2, 0, 7); g.fill(); g.beginPath(); g.ellipse(x, y + S * .16, S * .26, S * .14, 0, 0, 7); g.fill(); },
  arvore(g, x, y, S, c, i) { const r = S * (.48 + rnd(i, 52) * .18); x += (rnd(i, 50) - .5) * S * .3; y += (rnd(i, 51) - .5) * S * .3; g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x + r * .25, y + r * .45, r * 1.05, r * .75, 0, 0, 7); g.fill(); const greens = [c[0], c[1], c[2], c[0]]; for (let k = 0; k < 4; k++) { g.fillStyle = greens[(i + k) % 4]; g.beginPath(); g.arc(x + (rnd(i, 20 + k) - .5) * r * .9, y + (rnd(i, 30 + k) - .5) * r * .9, r * (.55 + rnd(i, 40 + k) * .25), 0, 7); g.fill(); } g.fillStyle = 'rgba(190,240,150,.12)'; g.beginPath(); g.arc(x - r * .25, y - r * .3, r * .4, 0, 7); g.fill(); },
  pinheiro(g, x, y, S, c, i) { const r = S * (.5 + rnd(i, 52) * .12); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x + r * .2, y + r * .4, r * .9, r * .65, 0, 0, 7); g.fill(); for (let k = 0; k < 3; k++) { const rr = r * (1 - k * .28); g.fillStyle = [c[1], c[0], c[2]][k]; g.beginPath(); for (let a = 0; a < 8; a++) { const t = a / 8 * Math.PI * 2 + k * .3, q = a % 2 ? rr * .62 : rr; g[a ? 'lineTo' : 'moveTo'](x + Math.cos(t) * q, y + Math.sin(t) * q); } g.closePath(); g.fill(); } },
  arbusto(g, x, y, S, c, i) { for (let k = 0; k < 5; k++) { g.fillStyle = [c[1], c[0], c[2]][k % 3]; g.beginPath(); g.arc(x + (rnd(i, 60 + k) - .5) * S * .5, y + (rnd(i, 70 + k) - .5) * S * .5, S * (.2 + rnd(i, 80 + k) * .12), 0, 7); g.fill(); } },
  cristais(g, x, y, S, c, i) { for (let k = 0; k < 4; k++) { const a = -Math.PI / 2 + (rnd(i, 90 + k) - .5) * 1.6, l = S * (.25 + rnd(i, 95 + k) * .2), bx = x + (rnd(i, 99 + k) - .5) * S * .3, by = y + S * .25; g.fillStyle = k % 2 ? c[0] : c[2]; g.beginPath(); g.moveTo(bx - S * .06, by); g.lineTo(bx + Math.cos(a) * l, by + Math.sin(a) * l); g.lineTo(bx + S * .06, by); g.closePath(); g.fill(); g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1; g.stroke(); } },
  altar(g, x, y, S, c) { g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x - S * .36, y - S * .16, S * .8, S * .5); const gr = g.createLinearGradient(0, y - S * .25, 0, y + S * .25); gr.addColorStop(0, c[0]); gr.addColorStop(1, c[1]); g.fillStyle = gr; g.fillRect(x - S * .4, y - S * .24, S * .8, S * .46); g.fillStyle = c[2]; for (const k of [-.25, .25]) { g.beginPath(); g.arc(x + S * k, y - S * .2, S * .05, 0, 7); g.fill(); } },
  barricada(g, x, y, S, c) { g.lineCap = 'round'; for (const [w, col] of [[S * .12, c[1]], [S * .07, c[0]]]) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x - S * .35, y + S * .3); g.lineTo(x + S * .35, y - S * .25); g.moveTo(x - S * .35, y - S * .25); g.lineTo(x + S * .35, y + S * .3); g.stroke(); } },
  mesa(g, x, y, S, c) { g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x - S * .38, y - S * .26, S * .82, S * .62); g.fillStyle = c[1]; g.fillRect(x - S * .42, y - S * .32, S * .84, S * .62); g.fillStyle = c[0]; g.fillRect(x - S * .39, y - S * .29, S * .78, S * .56); g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 1; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(x - S * .39, y + k * S * .1); g.lineTo(x + S * .39, y + k * S * .1); g.stroke(); } },
  cadeira(g, x, y, S, c) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x - S * .18, y - S * .12, S * .4, S * .4); g.fillStyle = c[0]; g.fillRect(x - S * .2, y - S * .16, S * .4, S * .36); g.fillStyle = c[1]; g.fillRect(x - S * .22, y - S * .26, S * .44, S * .1); },
  cama(g, x, y, S, c) { g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x - S * .3, y - S * .4, S * .66, S * .86); g.fillStyle = c[0]; g.fillRect(x - S * .34, y - S * .44, S * .68, S * .86); g.fillStyle = c[1]; g.fillRect(x - S * .3, y - S * .4, S * .6, S * .22); g.fillStyle = c[2]; g.fillRect(x - S * .3, y - S * .14, S * .6, S * .52); },
  estante(g, x, y, S, c) { g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x - S * .44, y - S * .2, S * .92, S * .5); g.fillStyle = c[1]; g.fillRect(x - S * .46, y - S * .26, S * .92, S * .48); for (let k = 0; k < 8; k++) { g.fillStyle = ['#8a2f2f', '#2f5a8a', '#3a7a3a', '#b08d3a'][k % 4]; g.fillRect(x - S * .42 + k * S * .105, y - S * .2, S * .08, S * .36); } },
  bau(g, x, y, S, c) { g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x - S * .3, y - S * .16, S * .66, S * .46); g.fillStyle = c[0]; g.fillRect(x - S * .34, y - S * .22, S * .68, S * .44); g.fillStyle = c[1]; g.fillRect(x - S * .34, y - S * .06, S * .68, S * .05); g.fillStyle = c[2]; g.fillRect(x - S * .04, y - S * .08, S * .08, S * .12); },
  barril(g, x, y, S, c) { g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.arc(x + S * .06, y + S * .08, S * .32, 0, 7); g.fill(); g.fillStyle = c[0]; g.beginPath(); g.arc(x, y, S * .32, 0, 7); g.fill(); g.strokeStyle = c[2]; g.lineWidth = S * .04; g.beginPath(); g.arc(x, y, S * .3, 0, 7); g.stroke(); g.beginPath(); g.arc(x, y, S * .18, 0, 7); g.stroke(); },
  caixote(g, x, y, S, c) { g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x - S * .28, y - S * .24, S * .62, S * .62); g.fillStyle = c[0]; g.fillRect(x - S * .32, y - S * .32, S * .64, S * .64); g.strokeStyle = c[1]; g.lineWidth = S * .05; g.strokeRect(x - S * .3, y - S * .3, S * .6, S * .6); g.beginPath(); g.moveTo(x - S * .3, y - S * .3); g.lineTo(x + S * .3, y + S * .3); g.stroke(); },
  tumulo(g, x, y, S, c) { g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x - S * .22, y - S * .36, S * .5, S * .82); g.fillStyle = c[0]; g.fillRect(x - S * .26, y - S * .42, S * .52, S * .84); g.strokeStyle = c[1]; g.lineWidth = S * .04; g.beginPath(); g.moveTo(x, y - S * .3); g.lineTo(x, y + S * .1); g.moveTo(x - S * .12, y - S * .16); g.lineTo(x + S * .12, y - S * .16); g.stroke(); },
  poco(g, x, y, S, c) { g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.arc(x + S * .05, y + S * .08, S * .42, 0, 7); g.fill(); g.fillStyle = c[0]; g.beginPath(); g.arc(x, y, S * .42, 0, 7); g.fill(); g.fillStyle = c[2]; g.beginPath(); g.arc(x, y, S * .27, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(x, y, S * .27, 0, 7); g.fill(); },
  fogueira(g, x, y, S, c) { g.strokeStyle = c[0]; g.lineWidth = S * .1; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - S * .3, y + S * .2); g.lineTo(x + S * .3, y - S * .1); g.moveTo(x - S * .3, y - S * .1); g.lineTo(x + S * .3, y + S * .2); g.stroke(); const gr = g.createRadialGradient(x, y, 0, x, y, S * .3); gr.addColorStop(0, c[2]); gr.addColorStop(.5, c[1]); gr.addColorStop(1, 'rgba(255,80,20,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, S * .3, 0, 7); g.fill(); },
  braseiro(g, x, y, S, c) { g.fillStyle = c[0]; g.beginPath(); g.arc(x, y, S * .3, 0, 7); g.fill(); const gr = g.createRadialGradient(x, y, 0, x, y, S * .24); gr.addColorStop(0, c[2]); gr.addColorStop(1, c[1]); g.fillStyle = gr; g.beginPath(); g.arc(x, y, S * .22, 0, 7); g.fill(); },
  totem(g, x, y, S, c) { g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x - S * .14, y - S * .34, S * .34, S * .76); g.fillStyle = c[0]; g.fillRect(x - S * .18, y - S * .4, S * .36, S * .8); g.fillStyle = c[1]; g.fillRect(x - S * .18, y - S * .2, S * .36, S * .08); g.fillStyle = c[2]; g.beginPath(); g.arc(x - S * .07, y - S * .3, S * .04, 0, 7); g.arc(x + S * .07, y - S * .3, S * .04, 0, 7); g.fill(); },
  circulo(g, x, y, S, c) { g.strokeStyle = c[0]; g.lineWidth = S * .05; g.beginPath(); g.arc(x, y, S * .42, 0, 7); g.stroke(); g.lineWidth = S * .025; g.beginPath(); g.arc(x, y, S * .3, 0, 7); g.stroke(); g.beginPath(); for (let a = 0; a < 5; a++) { const t = -Math.PI / 2 + a * 4 * Math.PI / 5; g[a ? 'lineTo' : 'moveTo'](x + Math.cos(t) * S * .3, y + Math.sin(t) * S * .3); } g.closePath(); g.stroke(); },
  emoji(g, x, y, S, c, i, mt) { g.font = `${Math.round(S * .72)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(mt.emoji || '❔', x, y + S * .04); }
};

/* ---------- pintura do mapa (camadas 1 a 4) ---------- */
function paintMap(m, cv, opt = {}) {
  const CELL = opt.cell || 32, res = Math.min(2, Math.max(1, 2400 / (Math.max(m.w, m.h) * CELL))), S = CELL * res;
  cv.width = Math.round(m.w * S); cv.height = Math.round(m.h * S);
  const g = cv.getContext('2d'), W = cv.width, Hh = cv.height, n = m.w * m.h, mats = opt.mats || [];
  const M = id => C.mat(id, mats);
  const ids = {}; for (const L of C.LAYERS) { const a = new Array(n); for (let i = 0; i < n; i++) a[i] = C.cellId(m, L, i); ids[L] = a; }
  const pat = mt => g.createPattern(texCanvas(mt), 'repeat');
  const jx = i => (rnd(i, 1) - .5) * .22 * S, jy = i => (rnd(i, 2) - .5) * .22 * S;
  // contorno orgânico: cada casa liga ao centro das vizinhas com um traço grosso e redondo (sem quadrados)
  const smooth = (match, width) => {
    g.beginPath(); let any = false;
    for (let i = 0; i < n; i++) {
      if (!match(i)) continue; any = true;
      const x = i % m.w, y = (i / m.w) | 0, cx = (x + .5) * S + jx(i), cy = (y + .5) * S + jy(i);
      g.moveTo(cx, cy); g.lineTo(cx + .01, cy);
      for (const [a, b] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
        const nx = x + a, ny = y + b; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
        const k = ny * m.w + nx; if (!match(k)) continue;
        g.moveTo(cx, cy); g.lineTo((nx + .5) * S + jx(k), (ny + .5) * S + jy(k));
      }
    }
    if (any) { g.lineWidth = width * S; g.lineCap = 'round'; g.lineJoin = 'round'; }
    return any;
  };
  const rects = match => { g.beginPath(); let any = false; for (let i = 0; i < n; i++) if (match(i)) { any = true; g.rect((i % m.w) * S - .5, ((i / m.w) | 0) * S - .5, S + 1, S + 1); } return any; };
  const group = L => { const out = {}; ids[L].forEach((id, i) => { if (id) (out[id] = out[id] || []).push(i); }); return out; };
  const showStruct = !m.bg || opt.master; // mapa importado: a imagem já tem o desenho; paredes só aparecem (claras) para o Mestre
  if (!m.bg) {
    // 1) chão: o mais comum de base, os outros por cima (orgânicos com contorno suave, construídos em blocos)
    const fl = group('chao'), order = Object.entries(fl).sort((a, b) => b[1].length - a[1].length);
    const base = order[0] && M(order[0][0]);
    g.fillStyle = base ? pat(base) : '#444'; g.fillRect(0, 0, W, Hh);
    for (const [id, cells] of order.slice(1).sort((a, b) => (M(b[0]) || {}).org - (M(a[0]) || {}).org)) {
      const mt = M(id); if (!mt) continue; const set = new Set(cells);
      if (mt.org ? smooth(i => set.has(i), 1.4) : rects(i => set.has(i))) { if (mt.org) { g.strokeStyle = pat(mt); g.stroke(); } else { g.fillStyle = pat(mt); g.fill(); } }
    }
    // 2) terreno especial (por cima do chão, sem trocar o chão)
    for (const [id, cells] of Object.entries(group('terreno'))) {
      const mt = M(id); if (!mt) continue; const set = new Set(cells), st = mt.st;
      g.save();
      if (st === 'nevoa') g.globalAlpha = .7;
      if (st === 'trevas') g.globalAlpha = .9;
      if (st === 'buraco') { for (const i of cells) { const cx = (i % m.w + .5) * S, cy = (((i / m.w) | 0) + .5) * S, gr = g.createRadialGradient(cx, cy, 0, cx, cy, S * .75); gr.addColorStop(0, 'rgba(0,0,0,.97)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(cx - S, cy - S, 2 * S, 2 * S); } g.restore(); continue; }
      if (st === 'ponte') { if (rects(i => set.has(i))) { g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = S * .3; g.fillStyle = pat(mt); g.fill(); } g.restore(); continue; }
      // margem de espuma/umidade em volta da água (contorno claro e úmido antes do líquido)
      if (st === 'agua' && mt.org && smooth(i => set.has(i), 1.62)) { g.strokeStyle = 'rgba(30,22,14,.35)'; g.stroke(); smooth(i => set.has(i), 1.48); g.strokeStyle = 'rgba(225,240,255,.22)'; g.stroke(); }
      if (mt.org ? smooth(i => set.has(i), 1.35) : rects(i => set.has(i))) { if (mt.org) { g.strokeStyle = pat(mt); g.stroke(); } else { g.fillStyle = pat(mt); g.fill(); } }
      g.restore();
      // brilhos na água (reflexo da luz) e brasas na lava
      if (st === 'agua' || st === 'lava') { g.save(); g.globalCompositeOperation = 'lighter'; for (const i of cells) { if (rnd(i, 70) > .35) continue; const x = (i % m.w + rnd(i, 71)) * S, y = (((i / m.w) | 0) + rnd(i, 72)) * S; g.strokeStyle = st === 'lava' ? 'rgba(255,200,90,.5)' : 'rgba(255,255,255,.22)'; g.lineWidth = Math.max(1, S * .04); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + S * .12, y - S * .05, x + S * .25, y); g.stroke(); } g.restore(); }
      // água e lava: fundo mais escuro/quente longe da margem
      if (st === 'agua' || st === 'lava') {
        g.save(); g.beginPath();
        for (const i of cells) { const x = i % m.w, y = (i / m.w) | 0; if ([[1, 0], [-1, 0], [0, 1], [0, -1]].every(([a, b]) => { const xx = x + a, yy = y + b; return xx < 0 || yy < 0 || xx >= m.w || yy >= m.h || set.has(yy * m.w + xx); })) { const cx = (x + .5) * S, cy = (y + .5) * S; g.moveTo(cx + S * .7, cy); g.arc(cx, cy, S * .7, 0, 7); } }
        g.fillStyle = st === 'lava' ? 'rgba(255,190,60,.35)' : 'rgba(10,35,70,.38)'; g.filter = `blur(${S * .35}px)`; g.fill(); g.restore();
      }
    }
  }
  // desgaste: manchas de sujeira e umidade no chão, poeira mais clara nas áreas de passagem, cascalho perto das paredes
  if (!m.bg) {
    g.save(); g.globalCompositeOperation = 'multiply';
    for (let k = 0; k < n / 4; k++) { const x = rnd(k, 200) * W, y = rnd(k, 201) * Hh, rr = S * (1 + rnd(k, 202) * 2.6), a = .08 + rnd(k, 203) * .14, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, `rgba(55,42,30,${a})`); gr.addColorStop(1, 'rgba(55,42,30,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, 2 * rr, 2 * rr); }
    g.globalCompositeOperation = 'screen';
    for (let k = 0; k < n / 14; k++) { const x = rnd(k, 210) * W, y = rnd(k, 211) * Hh, rr = S * (1.5 + rnd(k, 212) * 2), gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(255,235,200,.05)'); gr.addColorStop(1, 'rgba(255,235,200,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, 2 * rr, 2 * rr); }
    g.restore();
    for (let i = 0; i < n; i++) {
      if (ids.parede[i] || ids.terreno[i]) continue; const x = i % m.w, y = (i / m.w) | 0;
      const wall = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => { const xx = x + a, yy = y + b; return xx >= 0 && yy >= 0 && xx < m.w && yy < m.h ? ids.parede[yy * m.w + xx] : null; }).find(Boolean);
      if (!wall || rnd(i, 220) > .45) continue;
      const wm = M(wall); if (!wm || SEE[wm.st]) continue;
      for (let k = 0; k < 3; k++) { const px = (x + rnd(i, 221 + k)) * S, py = (y + rnd(i, 224 + k)) * S, rr = S * (.03 + rnd(i, 227 + k) * .05); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(px + rr * .4, py + rr * .5, rr, 0, 7); g.fill(); g.fillStyle = wm.c[2]; g.beginPath(); g.arc(px, py, rr, 0, 7); g.fill(); }
    }
  }
  // 3) paredes e estruturas. Rocha maciça (parede cercada só de parede) vira escuridão: as salas e os corredores
  //    ficam em destaque, como num mapa de mesa de verdade. Só a "casca" da parede ganha textura, volume e sombra.
  const solid = i => { const id = ids.parede[i]; const mt = id && M(id); return !!mt && !SEE[mt.st]; };
  const deep = new Uint8Array(n);
  if (showStruct && !m.bg) {
    for (let i = 0; i < n; i++) {
      if (!solid(i)) continue; const x = i % m.w, y = (i / m.w) | 0; let all = true;
      for (let b = -1; b <= 1 && all; b++) for (let a = -1; a <= 1; a++) { const xx = x + a, yy = y + b; if (xx < 0 || yy < 0 || xx >= m.w || yy >= m.h) continue; if (!solid(yy * m.w + xx)) { all = false; break; } }
      deep[i] = all ? 1 : 0;
    }
    g.save(); g.beginPath(); let any = false;
    for (let i = 0; i < n; i++) if (deep[i]) { any = true; g.rect((i % m.w) * S - .5, ((i / m.w) | 0) * S - .5, S + 1, S + 1); }
    if (any) { g.fillStyle = '#0c0a09'; g.fill(); g.clip(); g.globalAlpha = .1; for (let k = 0; k < n / 2; k++) { g.fillStyle = rnd(k, 260) < .5 ? '#2a241e' : '#000'; const x = rnd(k, 261) * W, y = rnd(k, 262) * Hh, rr = S * (.08 + rnd(k, 263) * .3); g.beginPath(); g.ellipse(x, y, rr, rr * .7, rnd(k, 264) * 3, 0, 7); g.fill(); } }
    g.restore();
  }
  if (showStruct) for (const [id, all] of Object.entries(group('parede'))) {
    const cells = all.filter(i => !deep[i]);
    const mt = M(id); if (!mt || !cells.length) continue; const set = new Set(all), has = i => set.has(i) && !deep[i];
    g.save(); if (m.bg) g.globalAlpha = .4;
    if (SEE[mt.st]) { // grade, vidro e barreira: uma linha ligando as casas (dá para ver através)
      const w = mt.st === 'grade' ? .16 : .2;
      g.strokeStyle = 'rgba(0,0,0,.5)'; if (smooth(has, w + .06)) g.stroke();
      if (smooth(has, w)) { g.strokeStyle = mt.st === 'vidro' ? 'rgba(170,220,240,.75)' : mt.st === 'barreira' ? 'rgba(120,170,255,.8)' : mt.c[0]; if (mt.st === 'barreira') { g.shadowColor = mt.c[2]; g.shadowBlur = S * .5; } g.stroke(); }
      if (mt.st === 'grade') { g.fillStyle = mt.c[2]; for (const i of cells) { g.beginPath(); g.arc((i % m.w + .5) * S, (((i / m.w) | 0) + .5) * S, S * .1, 0, 7); g.fill(); } }
      g.restore(); continue;
    }
    const rough = mt.org;
    const shape = () => (rough ? smooth(has, 1.5) : rects(has));
    const paint = style => { if (rough) { g.strokeStyle = style; g.stroke(); } else { g.fillStyle = style; g.fill(); } };
    if (!shape()) { g.restore(); continue; }
    // sombra: a luz vem de cima à esquerda, então as paredes projetam sombra para baixo e para a direita;
    // depois uma sombra de contato suave em volta (oclusão: cantos e rodapés mais escuros)
    g.save(); g.shadowColor = 'rgba(0,0,0,.72)'; g.shadowBlur = S * .9; g.shadowOffsetX = S * .24; g.shadowOffsetY = S * .34; paint('#000'); g.restore();
    shape(); g.save(); g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = S * 1.4; paint('#000'); g.restore();
    shape(); paint(pat(mt));
    if (!rough) for (const i of cells) {
      const x = i % m.w, y = (i / m.w) | 0, at = (a, b) => { const xx = x + a, yy = y + b; return xx < 0 || yy < 0 || xx >= m.w || yy >= m.h ? true : set.has(yy * m.w + xx); };
      // faces: baixo e direita na sombra, cima e esquerda pegando luz (dá volume ao bloco)
      if (!at(0, 1)) { const gr = g.createLinearGradient(0, (y + .62) * S, 0, (y + 1) * S); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = gr; g.fillRect(x * S, (y + .62) * S, S, S * .38); }
      if (!at(1, 0)) { const gr = g.createLinearGradient((x + .7) * S, 0, (x + 1) * S, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.4)'); g.fillStyle = gr; g.fillRect((x + .7) * S, y * S, S * .3, S); }
      if (!at(0, -1)) { g.fillStyle = 'rgba(255,240,210,.16)'; g.fillRect(x * S, y * S, S, S * .07); }
      if (!at(-1, 0)) { g.fillStyle = 'rgba(255,240,210,.1)'; g.fillRect(x * S, y * S, S * .06, S); }
      // rachaduras e manchas na pedra
      if (rnd(i, 240) < .18) { g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = Math.max(1, S * .025); g.beginPath(); const sx = (x + rnd(i, 241)) * S, sy = (y + rnd(i, 242)) * S; g.moveTo(sx, sy); g.lineTo(sx + (rnd(i, 243) - .5) * S * .5, sy + rnd(i, 244) * S * .4); g.lineTo(sx + (rnd(i, 245) - .5) * S * .6, sy + S * .45); g.stroke(); }
    }
    g.restore();
  }
  // 4) objetos
  if (showStruct) for (let i = 0; i < n; i++) {
    const id = ids.objeto[i]; if (!id) continue; const mt = M(id); if (!mt) continue;
    const f = mt.img ? null : OBJ[mt.st] || OBJ.emoji, x = (i % m.w + .5) * S, y = (((i / m.w) | 0) + .5) * S;
    g.save(); if (m.bg) g.globalAlpha = .5;
    // todo objeto projeta uma sombra suave na mesma direção das paredes
    g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = S * .22; g.shadowOffsetX = S * .1; g.shadowOffsetY = S * .14;
    if (mt.img) { const im = texCanvas(mt); g.drawImage(im, x - S * .45, y - S * .45, S * .9, S * .9); } else f(g, x, y, S, mt.c, i, mt);
    g.restore();
  }
  // brilho dos materiais mágicos/fogo
  if (!m.bg) { g.save(); g.globalCompositeOperation = 'lighter'; for (const L of ['terreno', 'objeto', 'chao']) for (let i = 0; i < n; i++) { const id = ids[L][i]; if (!id) continue; const mt = M(id); if (!mt || !mt.glow) continue; if (L === 'chao' && rnd(i, 9) > .25) continue; const x = (i % m.w + .5) * S, y = (((i / m.w) | 0) + .5) * S, r = S * (L === 'objeto' ? 1.4 : .8), gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, mt.glow + '55'); gr.addColorStop(1, mt.glow + '00'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); } g.restore(); }
  // cor de cinema: luz quente vindo de cima à esquerda, sombras frias embaixo à direita, contraste e cantos escuros
  if (!m.bg) {
    g.save(); g.globalCompositeOperation = 'soft-light';
    const lg = g.createLinearGradient(0, 0, W, Hh); lg.addColorStop(0, 'rgba(255,196,130,.32)'); lg.addColorStop(.55, 'rgba(128,128,128,0)'); lg.addColorStop(1, 'rgba(40,70,150,.32)');
    g.fillStyle = lg; g.fillRect(0, 0, W, Hh); g.restore();
    const vg = g.createRadialGradient(W * .45, Hh * .42, Math.min(W, Hh) * .25, W / 2, Hh / 2, Math.max(W, Hh) * .78); vg.addColorStop(0, 'rgba(255,220,160,.05)'); vg.addColorStop(1, 'rgba(0,0,0,.58)'); g.fillStyle = vg; g.fillRect(0, 0, W, Hh);
  }
  return res;
}

/* ---------- portas (camada 5) ---------- */
function drawDoors(m, cv, opt = {}) {
  const CELL = opt.cell || 32, res = 2, S = CELL * res;
  cv.width = m.w * S; cv.height = m.h * S;
  const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
  const wall = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && !!C.cellId(m, 'parede', y * m.w + x);
  for (const d of m.doors || []) {
    const x = d.i % m.w, y = (d.i / m.w) | 0, X = x * S, Y = y * S;
    const horiz = wall(x - 1, y) || wall(x + 1, y) || !(wall(x, y - 1) || wall(x, y + 1));
    const look = d.look || 'madeira', open = d.state === 'aberta', locked = d.state === 'trancada';
    const col = { madeira: ['#7b4a22', '#4a2c12'], reforcada: ['#6a4020', '#2e2e32'], ferro: ['#5b6168', '#33373c'], grade: ['#2b2d31', '#4a4d52'], vidro: ['rgba(160,210,230,.6)', '#5a8aa0'], pedra: ['#55504a', '#3a3632'], magica: ['#4a5fd8', '#28307a'] }[look] || ['#7b4a22', '#4a2c12'];
    g.save();
    // batente (as duas pontas da parede)
    g.fillStyle = 'rgba(0,0,0,.45)';
    if (horiz) { g.fillRect(X, Y + S * .3, S * .1, S * .4); g.fillRect(X + S * .9, Y + S * .3, S * .1, S * .4); } else { g.fillRect(X + S * .3, Y, S * .4, S * .1); g.fillRect(X + S * .3, Y + S * .9, S * .4, S * .1); }
    if (look === 'pedra' && !open && !opt.master) { // passagem secreta: para os jogadores parece parede
      g.fillStyle = '#3f3a35'; g.fillRect(X, Y, S, S); g.restore(); continue;
    }
    if (open) { // porta aberta: a folha encostada num lado, gira 90°
      g.fillStyle = col[0]; g.strokeStyle = col[1]; g.lineWidth = 2;
      if (horiz) { g.fillRect(X + S * .08, Y + S * .36 - S * .7, S * .12, S * .7); g.strokeRect(X + S * .08, Y + S * .36 - S * .7, S * .12, S * .7); }
      else { g.fillRect(X + S * .36 - S * .7, Y + S * .08, S * .7, S * .12); g.strokeRect(X + S * .36 - S * .7, Y + S * .08, S * .7, S * .12); }
      g.setLineDash([3, 4]); g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1.5; g.beginPath();
      if (horiz) g.arc(X + S * .14, Y + S * .36, S * .7, -Math.PI / 2, 0); else g.arc(X + S * .36, Y + S * .14, S * .7, Math.PI, Math.PI / 2, true);
      g.stroke(); g.setLineDash([]);
    } else {
      const r = horiz ? [X + S * .08, Y + S * .32, S * .84, S * .36] : [X + S * .32, Y + S * .08, S * .36, S * .84];
      g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = S * .2; g.fillStyle = col[0]; g.fillRect(...r); g.shadowBlur = 0;
      g.strokeStyle = col[1]; g.lineWidth = 2; g.strokeRect(...r);
      if (look === 'grade') { g.strokeStyle = '#6a6e75'; g.lineWidth = 2; g.beginPath(); for (let k = 1; k < 6; k++) { if (horiz) { g.moveTo(r[0] + r[2] * k / 6, r[1]); g.lineTo(r[0] + r[2] * k / 6, r[1] + r[3]); } else { g.moveTo(r[0], r[1] + r[3] * k / 6); g.lineTo(r[0] + r[2], r[1] + r[3] * k / 6); } } g.stroke(); }
      else if (look === 'reforcada' || look === 'ferro') { g.fillStyle = 'rgba(30,30,34,.7)'; for (const k of [.25, .75]) horiz ? g.fillRect(r[0] + r[2] * k - 2, r[1], 4, r[3]) : g.fillRect(r[0], r[1] + r[3] * k - 2, r[2], 4); }
      else if (look === 'magica') { g.strokeStyle = 'rgba(160,190,255,.8)'; g.shadowColor = '#8fb2ff'; g.shadowBlur = S * .3; g.strokeRect(...r); }
      g.fillStyle = '#c99a3a'; horiz ? g.fillRect(X + S * .72, Y + S * .45, S * .07, S * .1) : g.fillRect(X + S * .45, Y + S * .72, S * .1, S * .07);
      if (locked && opt.master) { g.font = `${Math.round(S * .42)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🔒', X + S * .5, Y + S * .5); }
    }
    g.restore();
  }
}

/* ---------- iluminação (camada 7) ---------- */
// escurece o mapa conforme o ambiente e "acende" o que cada fonte de luz alcança (respeitando paredes e portas)
function drawLight(m, cv, srcs, opt = {}) {
  const k = 8; // pixels por casa (o canvas é esticado com desfoque: bordas suaves)
  cv.width = m.w * k; cv.height = m.h * k;
  const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
  // o Mestre vê o mapa mesmo no escuro (só um pouco sombreado) para conseguir trabalhar
  const dark = m.amb === 'escuro' ? (opt.master ? .32 : .9) : m.amb === 'penumbra' ? (opt.master ? .18 : .5) : 0;
  if (!dark && !srcs.length) return false;
  if (dark) { g.fillStyle = `rgba(4,4,10,${dark})`; g.fillRect(0, 0, cv.width, cv.height); }
  for (const s of srcs) {
    const cx = s.x * k, cy = s.y * k, R = Math.max(1, s.r + .5) * k, a = (s.intensity || 80) / 100;
    // área alcançada com bordas arredondadas (círculos por casa) em vez de quadrados
    g.save(); g.beginPath();
    for (let i = 0; i < s.mask.length; i++) if (s.mask[i]) { const x = ((i % m.w) + .5) * k, y = (((i / m.w) | 0) + .5) * k; g.moveTo(x + k * .78, y); g.arc(x, y, k * .78, 0, 7); }
    g.clip();
    if (dark) { g.globalCompositeOperation = 'destination-out'; const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(.7, `rgba(0,0,0,${a * .85})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(cx - R, cy - R, 2 * R, 2 * R); }
    // brilho colorido: um halo largo e suave e um miolo quente perto da fonte (efeito de "bloom")
    g.globalCompositeOperation = 'lighter';
    const col = s.color || '#ffd98a', hx = v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
    const gr2 = g.createRadialGradient(cx, cy, 0, cx, cy, R);
    gr2.addColorStop(0, col + hx(a * 95)); gr2.addColorStop(.45, col + hx(a * 40)); gr2.addColorStop(1, col + '00');
    g.fillStyle = gr2; g.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    const rc = Math.min(R, k * 1.6), gr3 = g.createRadialGradient(cx, cy, 0, cx, cy, rc);
    gr3.addColorStop(0, `rgba(255,245,220,${(a * .55).toFixed(2)})`); gr3.addColorStop(1, 'rgba(255,245,220,0)');
    g.fillStyle = gr3; g.fillRect(cx - rc, cy - rc, 2 * rc, 2 * rc);
    g.restore();
  }
  return true;
}

window.RpgDraw = { paintMap, drawDoors, drawLight, texCanvas, OBJ, setOnImg: f => { onImg = f; } };
})();
