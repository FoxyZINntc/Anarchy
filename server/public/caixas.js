/* Anarchy — Caixas: animações de abrir (várias, escolhidas ao acaso ou pela pessoa) e fundos animados do perfil.
   O sorteio é sempre no servidor (box:open / daily:claim); aqui só o show. O app.js entrega os ajudantes em init(). */
(() => {
'use strict';
let H = null;
const esc = s => H.esc(s);

/* ---------- fundos animados (o visual está em caixas.css: .bgx-ID) ---------- */
const BG = {
  aurora: ['Aurora Boreal', 'comum'], nuvens: ['Céu de Nuvens', 'comum'], ondas: ['Ondas Suaves', 'comum'], bolhas: ['Bolhas', 'comum'], chuva: ['Chuva', 'comum'],
  listras: ['Listras Doces', 'comum'], poeira: ['Poeira Estelar', 'comum'], degrade: ['Degradê Vivo', 'comum'], grade: ['Grade Neon', 'comum'], confete: ['Confete', 'comum'],
  sakura: ['Sakura', 'raro'], neve: ['Nevasca', 'raro'], vagalumes: ['Vagalumes', 'raro'], oceano: ['Fundo do Mar', 'raro'], por_do_sol: ['Pôr do Sol Retrô', 'raro'],
  hexagonos: ['Colmeia Tech', 'raro'], radar: ['Radar', 'raro'], pixels: ['Pixel Party', 'raro'], plasma: ['Plasma', 'raro'], fumaca: ['Fumaça', 'raro'],
  galaxia: ['Galáxia', 'epico'], matrix: ['Código Verde', 'epico'], synthwave: ['Synthwave', 'epico'], lava: ['Lava', 'epico'], tempestade: ['Tempestade', 'epico'],
  holograma: ['Holograma', 'epico'], vortice: ['Vórtice', 'epico'], cristais: ['Cristais', 'epico'],
  inferno: ['Inferno', 'lendario'], cosmos: ['Cosmos', 'lendario'], glitch: ['Glitch', 'lendario'], dragao: ['Fúria do Dragão', 'lendario'], ouro: ['Chuva de Ouro', 'lendario'], abismo: ['Abismo', 'lendario'],
  arco_iris: ['Arco-íris Infinito', 'mitico'], supernova: ['Supernova', 'mitico'], anarquia: ['Anarquia', 'mitico'], dimensao: ['Outra Dimensão', 'mitico']
};
const BG_IDS = Object.keys(BG);
const TIERS = ['comum', 'raro', 'epico', 'lendario', 'mitico'];
const TCOL = { comum: '#4b69ff', raro: '#8847ff', epico: '#d32ce6', lendario: '#eb4b4b', mitico: '#e4ae39' };
const bgLayer = id => (id && BG[id] ? `<div class="bgx bgx-${id}" aria-hidden="true"></div>` : '');
const isBg = id => String(id).startsWith('bg:');
const pTier = id => (isBg(id) ? (BG[id.slice(3)] || [, 'comum'])[1] : (H.AVFX[id] || { tier: 'comum' }).tier);
const pName = id => (isBg(id) ? (BG[id.slice(3)] || [id])[0] : (H.AVFX[id] || { name: id }).name);
const pKind = id => (isBg(id) ? 'Fundo animado do perfil' : 'Efeito da foto');
const pView = (id, size = 64) => (isBg(id) ? `<div class="bgx-prev" style="width:${Math.round(size * 1.9)}px">${bgLayer(id.slice(3))}</div>` : H.avWith(id, size));
// prêmio de mentira para encher as animações (mesmas chances da caixa)
function fake() {
  const roll = Math.random() * 100, t = roll < 70 ? 'comum' : roll < 90 ? 'raro' : roll < 97 ? 'epico' : roll < 99.5 ? 'lendario' : 'mitico';
  if (Math.random() < .4) { const p = BG_IDS.filter(k => BG[k][1] === t); return 'bg:' + p[Math.floor(Math.random() * p.length)]; }
  const p = H.AVFX_IDS.filter(k => H.AVFX[k].tier === t); return p[Math.floor(Math.random() * p.length)];
}

/* ---------- escolha da animação ---------- */
const ANIMS = { roleta: '🎰 Roleta', slot: '🎲 Caça-níquel', bau: '🧰 Baú', cartas: '🃏 Cartas', capsula: '🔮 Cápsula', portal: '🌀 Portal', meteoro: '☄️ Meteoro', roda: '🎡 Roda da sorte', ovo: '🥚 Ovo surpresa' };
const pref = () => { try { return localStorage.getItem('anarchy.caseAnim') || 'surpresa'; } catch { return 'surpresa'; } };
const pickHtml = () => `<label class="cx-pick">Animação da caixa <select class="input" data-cxpick>${[['surpresa', '✨ Surpresa (cada vez uma)'], ...Object.entries(ANIMS)].map(([k, v]) => `<option value="${k}" ${pref() === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`;
document.addEventListener('change', e => { if (e.target.matches && e.target.matches('[data-cxpick]')) { try { localStorage.setItem('anarchy.caseAnim', e.target.value); } catch {} } });

/* ---------- tempo que dá para pular ---------- */
let SK = null;
const wait = ms => new Promise(r => { if (SK.skip) return r(); const t = setTimeout(r, ms); SK.wake.add(() => { clearTimeout(t); r(); }); });
const tick = (f = 1100, v = .025) => { if (!SK.skip) H.tone([[f + Math.random() * 120, .025]], 'square', v); };
// rolagem com freio (roleta e caça-níquel): chama set(x) a cada quadro
const glide = (dist, dur, set, onIdx, size) => new Promise(done => {
  const t0 = performance.now(), ease = x => 1 - Math.pow(1 - x, 4); let last = -1;
  const step = now => {
    const k = SK.skip ? 1 : Math.min(1, (now - t0) / dur), x = dist * ease(k);
    set(x); const idx = Math.floor(x / size); if (idx !== last) { last = idx; if (k < .995) onIdx(); }
    if (k < 1) requestAnimationFrame(step); else done();
  };
  requestAnimationFrame(step);
});
// "suspense de raridade": a cor sobe de raridade até a do prêmio
async function tease(tier, setCol, ms = 650) {
  const top = TIERS.indexOf(tier);
  for (let i = 0; i <= top; i++) { setCol(TCOL[TIERS[i]], i); H.tone([[330 + i * 120, .12]], 'triangle', .05); await wait(i === top ? 300 : ms); }
}
const card = id => `<div class="reel-it r-c-${pTier(id)}">${pView(id, 56)}<span>${esc(pName(id))}</span></div>`;

/* ---------- as animações ---------- */
const A = {
  async roleta(st, r) {
    const N = 60, WIN = 52, W = 130, items = Array.from({ length: N }, (_, i) => (i === WIN ? r.item : fake()));
    st.innerHTML = `<div class="reel-win"><div class="reel">${items.map(card).join('')}</div><i class="reel-mark"></i></div>`;
    const reel = st.querySelector('.reel'), center = st.querySelector('.reel-win').clientWidth / 2;
    await glide(WIN * W + 62 - center + (Math.random() - .5) * (W - 30), H.reduceMotion() ? 600 : 6200, x => { reel.style.transform = `translateX(${-x}px)`; }, () => tick(), W);
    reel.children[WIN].classList.add('win');
  },
  async slot(st, r) {
    const N = 40, WIN = 34, Hh = 120, items = Array.from({ length: N }, (_, i) => (i === WIN ? r.item : fake()));
    st.innerHTML = `<div class="cx-slot"><div class="col">${items.map(id => `<div class="it r-c-${pTier(id)}">${pView(id, 50)}<span style="color:var(--rc)">${esc(pName(id))}</span></div>`).join('')}</div><i class="line"></i></div>`;
    const col = st.querySelector('.col');
    H.tone([[200, .08], [150, .1]], 'sawtooth', .04); // alavanca
    await glide(WIN * Hh - 70, H.reduceMotion() ? 600 : 5200, x => { col.style.transform = `translateY(${-x}px)`; }, () => tick(900), Hh);
  },
  async bau(st, r) {
    st.innerHTML = '<div class="cx-bau"><i class="glow"></i><div class="lid"></div><div class="base"></div><i class="lock"></i></div>';
    const b = st.querySelector('.cx-bau'), glow = st.querySelector('.glow');
    for (let k = 0; k < 3; k++) { b.classList.add('cx-shake'); H.tone([[90 + k * 30, .15]], 'sawtooth', .05); await wait(380 + k * 120); b.classList.remove('cx-shake'); await wait(260); }
    glow.style.opacity = 1;
    await tease(pTier(r.item), c => { b.style.setProperty('--glow', c); b.classList.add('cx-shake'); });
    b.classList.remove('cx-shake'); b.classList.add('open'); H.tone([[523, .06], [1047, .2]], 'triangle', .07);
    await wait(500);
  },
  async cartas(st, r) {
    const n = 5, win = Math.floor(Math.random() * n), ids = Array.from({ length: n }, (_, i) => (i === win ? r.item : fake()));
    st.innerHTML = `<div class="cx-cards">${ids.map(id => `<div class="cx-card"><div class="back"></div><div class="front r-c-${pTier(id)}">${pView(id, 50)}<b>${esc(pName(id))}</b></div></div>`).join('')}</div>`;
    const cs = [...st.querySelectorAll('.cx-card')];
    // embaralha (as cartas trocam de lugar algumas vezes)
    for (let k = 0; k < 6; k++) { cs.forEach(c => { c.style.translate = `${(Math.random() - .5) * 60}px ${(Math.random() - .5) * 30}px`; }); tick(700); await wait(220); }
    cs.forEach(c => { c.style.translate = ''; }); await wait(300);
    // a carta sorteada sobe, as outras escurecem e então vira
    cs.forEach((c, i) => c.classList.add(i === win ? 'chosen' : 'dim'));
    await tease(pTier(r.item), c => { cs[win].style.setProperty('--cg', c); }, 450);
    cs[win].classList.add('flip'); await wait(700);
    cs.forEach((c, i) => { if (i !== win) setTimeout(() => c.classList.add('flip'), 120 * i); });
    await wait(500);
  },
  async capsula(st, r) {
    st.innerHTML = '<div class="cx-capsule drop"><div class="top"></div><div class="bot"></div></div>';
    const c = st.querySelector('.cx-capsule');
    [0, 600, 780, 930].forEach((t, i) => setTimeout(() => tick(300 - i * 40, .04), t));
    await wait(1150); c.classList.remove('drop'); c.classList.add('spin');
    await tease(pTier(r.item), col => c.style.setProperty('--cap', col), 550);
    c.classList.remove('spin'); c.classList.add('open'); H.tone([[784, .06], [1175, .15]], 'triangle', .07);
    await wait(450);
  },
  async portal(st, r) {
    st.innerHTML = '<div class="cx-portal"></div>';
    const p = st.querySelector('.cx-portal'); let spd = 2.2;
    await tease(pTier(r.item), col => { p.style.setProperty('--glow', col); spd *= .62; p.style.setProperty('--spd', spd + 's'); }, 700);
    for (let k = 0; k < 8; k++) { tick(400 + k * 90, .03); await wait(60); }
    p.animate([{ transform: 'scale(1)' }, { transform: 'scale(.1)', opacity: 0 }], { duration: 350, easing: 'ease-in', fill: 'forwards' });
    await wait(350);
  },
  async meteoro(st, r) {
    st.innerHTML = '<div class="cx-meteor"></div>';
    const m = st.querySelector('.cx-meteor'), tier = pTier(r.item);
    m.style.setProperty('--glow', TCOL.comum);
    await wait(300);
    tease(tier, col => m.style.setProperty('--glow', col), 220);
    m.classList.add('fall'); H.tone([[1200, .1], [900, .2], [500, .4], [200, .6]], 'sine', .04);
    await wait(1400);
    for (let k = 0; k < 3; k++) { const ring = document.createElement('i'); ring.className = 'cx-ring'; ring.style.setProperty('--glow', TCOL[tier]); ring.style.animationDelay = k * .15 + 's'; st.appendChild(ring); }
    m.remove(); H.tone([[60, .4]], 'sawtooth', .09); shakeScreen();
    await wait(600);
  },
  async roda(st, r) {
    const n = 10, win = Math.floor(Math.random() * n), ids = Array.from({ length: n }, (_, i) => (i === win ? r.item : fake())), seg = 360 / n;
    const grad = ids.map((id, i) => `${TCOL[pTier(id)]}${i % 2 ? 'cc' : 'ff'} ${i * seg}deg ${(i + 1) * seg}deg`).join(',');
    st.innerHTML = `<div class="cx-wheel"><i class="pin"></i><div class="w" style="background:conic-gradient(${grad})">${ids.map((id, i) => `<span style="--a:${i * seg + seg / 2 - 90}deg"><i>${isBg(id) ? '🌌' : '✨'}</i></span>`).join('')}</div></div>`;
    const w = st.querySelector('.w'), target = 360 * 6 + (360 - (win * seg + seg / 2)) + (Math.random() - .5) * seg * .5;
    let lastSeg = -1;
    await glide(target, H.reduceMotion() ? 600 : 5600, x => { w.style.transform = `rotate(${x}deg)`; }, () => tick(1000), seg).then(() => lastSeg);
  },
  async ovo(st, r) {
    st.innerHTML = '<div class="cx-egg"><svg viewBox="0 0 130 170" fill="none" stroke="#5a3a12" stroke-width="3" stroke-linecap="round"></svg></div>';
    const egg = st.querySelector('.cx-egg'), svg = egg.querySelector('svg');
    const cracks = ['M65 20 L58 40 L70 52 L60 70', 'M60 70 L42 78 L36 96', 'M60 70 L80 82 L92 76 L100 92', 'M36 96 L30 118 L44 128', 'M100 92 L96 116 L84 126'];
    await tease(pTier(r.item), (col, i) => {
      egg.style.setProperty('--glow', col); egg.classList.add('cx-shake'); setTimeout(() => egg.classList.remove('cx-shake'), 300);
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', cracks[i] || cracks[cracks.length - 1]); svg.appendChild(p); H.tone([[1500, .03], [900, .03]], 'square', .04);
    }, 650);
    egg.classList.add('hatch'); H.tone([[523, .06], [784, .06], [1047, .2]], 'triangle', .07);
    await wait(500);
  }
};

/* ---------- efeitos da revelação, conforme a raridade ---------- */
function shakeScreen() { if (H.reduceMotion()) return; const c = document.querySelector('.case'); if (!c) return; c.classList.remove('cx-shake-screen'); void c.offsetWidth; c.classList.add('cx-shake-screen'); }
function revealFx(el, tier) {
  const lvl = TIERS.indexOf(tier), col = TCOL[tier];
  if (lvl >= 2) { const rays = document.createElement('div'); rays.className = 'cx-rays'; rays.style.setProperty('--rc', col); el.querySelector('.case-out').prepend(rays); }
  if (H.reduceMotion()) return;
  if (lvl >= 3) {
    const f = document.createElement('div'); f.className = 'cx-flash'; f.style.setProperty('--rc', col); document.body.appendChild(f); setTimeout(() => f.remove(), 800);
    shakeScreen();
    for (let i = 0; i < (lvl === 4 ? 70 : 35); i++) {
      const c = document.createElement('i'); c.className = 'cx-coin'; c.style.left = Math.random() * 100 + 'vw'; document.body.appendChild(c);
      c.animate([{ transform: 'translateY(0) rotateY(0)' }, { transform: `translateY(${innerHeight + 60}px) rotateY(${720 + Math.random() * 720}deg)` }], { duration: 1600 + Math.random() * 1600, delay: Math.random() * 900, easing: 'cubic-bezier(.4,0,1,1)', fill: 'both' }).onfinish = () => c.remove();
    }
  }
}

/* ---------- abrir ---------- */
async function open(r, daily) {
  let kind = pref(); if (!ANIMS[kind]) { const ks = Object.keys(ANIMS); kind = ks[Math.floor(Math.random() * ks.length)]; }
  if (H.reduceMotion() && !['roleta', 'slot'].includes(kind)) kind = 'roleta';
  SK = { skip: false, wake: new Set() };
  const el = document.createElement('div'); el.className = 'case-back'; el.setAttribute('role', 'dialog');
  el.innerHTML = `<div class="case"><h2>${daily ? `🎁 Caixa diária grátis · 🔥 ${r.streak} ${r.streak === 1 ? 'dia' : 'dias seguidos'}` : 'Abrindo a Caixa Anarchy...'}</h2>
    <div class="cx-stage"><div class="cx-in" style="width:100%;display:grid;place-items:center"></div><button class="cx-skip" data-c="skip">Pular animação ⏩</button></div>
    <div class="case-out"></div></div>`;
  document.body.appendChild(el);
  el.querySelector('[data-c="skip"]').onclick = () => { SK.skip = true; SK.wake.forEach(f => f()); };
  await A[kind](el.querySelector('.cx-in'), r);
  el.querySelector('.cx-skip')?.remove();
  const tier = pTier(r.item), lvl = TIERS.indexOf(tier);
  const fan = [[[523, .1], [784, .2]], [[523, .1], [659, .1], [988, .25]], [[523, .08], [659, .08], [784, .08], [1047, .3]], [[392, .1], [523, .1], [659, .1], [784, .1], [1047, .35]], [[392, .08], [523, .08], [659, .08], [784, .08], [1047, .1], [1319, .1], [1568, .45]]][lvl];
  H.tone(fan, 'triangle', .09);
  // o palco dá lugar ao prêmio
  const stage = el.querySelector('.cx-stage'); if (kind !== 'roleta') stage.style.height = 'auto'; if (!['roleta', 'cartas', 'roda', 'slot'].includes(kind)) stage.innerHTML = '';
  const out = el.querySelector('.case-out');
  out.className = `case-out case-res r-c-${tier}`;
  const bg = isBg(r.item);
  out.innerHTML = `${lvl === 4 ? '<div class="cx-big">✦ MÍTICO! ✦</div>' : ''}<div class="gift-rar">${H.AVR[tier][0]} · ${pKind(r.item)}</div>
    ${bg ? `<div class="bgx-prev big">${bgLayer(r.item.slice(3))}</div>` : H.avWith(r.item, 96)}<div class="gift-title">${esc(pName(r.item))}</div>
    ${r.dup ? `<div class="muted">Você já tinha esse. Ganhou <b style="color:#ffd36b">+${r.refund} pontos</b> de volta.</div>` : `<div class="muted">${bg ? 'Novo fundo animado para o seu cartão de perfil!' : 'Novo efeito para a sua foto de perfil!'}</div>`}
    ${daily ? `<div class="muted">Bônus da sequência: <b style="color:#ffd36b">+${r.bonus} pontos</b>. Volte amanhã para a sequência continuar!</div>` : ''}
    <div class="gift-acts">${r.dup ? '' : '<button class="btn primary" data-c="eq">Usar agora</button>'}<button class="btn" data-c="again" ${r.points < H.BOX_COST ? 'disabled' : ''}>Abrir outra · ${H.BOX_COST}</button><button class="btn ghost" data-c="x" style="color:#fff">Fechar</button></div>
    ${pickHtml()}<div class="muted small">Saldo: ${r.points.toLocaleString('pt-BR')} pontos</div>`;
  revealFx(el, tier);
  if (lvl >= 2) H.giftSparks(out.querySelector('.bgx-prev, .av'), TCOL[tier], 30 + lvl * 20);
  out.onclick = async e => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    if (b.dataset.c === 'eq') {
      const q = await H.emit(bg ? 'bg:equip' : 'avfx:equip', { item: bg ? r.item.slice(3) : r.item });
      if (!q.ok) return H.toast(q.erro, true);
      H.toast(bg ? `🌌 ${pName(r.item)} no seu perfil!` : `${pName(r.item)} na sua foto!`);
    }
    el.remove();
    if (b.dataset.c === 'again') H.openCase();
  };
}

window.anarchyBox = { init(h) { H = h; }, open, BG, BG_IDS, bgLayer, isBg, pTier, pName, pView, pickHtml, TCOL };
})();
