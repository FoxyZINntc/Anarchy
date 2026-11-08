/* Anarchy — temas animados: cenas desenhadas num <canvas> atrás do app.
   Cada cena é original (inspirada no estilo, sem copiar logos, personagens ou artes de jogos/animes).
   Leve de propósito: no máximo 30 quadros por segundo, para quando a janela está escondida e
   respeita "Animações" desligado (fica parada) e o "Modo leve" (menos partículas, 20 qps). */
(() => {
  'use strict';
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  let cv = null, ctx = null, W = 0, H = 0, DPR = 1, scene = null, name = null, raf = 0, last = 0, opts = { anim: true, lite: false };

  function layer() {
    if (cv) return;
    cv = document.createElement('canvas'); cv.id = 'fxCanvas'; cv.setAttribute('aria-hidden', 'true');
    (document.getElementById('bgLayer') || document.body).appendChild(cv);
    ctx = cv.getContext('2d');
    addEventListener('resize', () => { if (scene) { size(); scene.init(); draw(performance.now(), true); } });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && scene && opts.anim) loop(); });
  }
  function size() {
    DPR = Math.min(opts.lite ? 1 : 1.5, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  const off = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * DPR)); c.height = Math.max(1, Math.round(h * DPR)); const x = c.getContext('2d'); x.setTransform(DPR, 0, 0, DPR, 0, 0); return [c, x]; };
  const blit = (c) => ctx.drawImage(c, 0, 0, W, H);
  const many = n => Math.round(n * (opts.lite ? 0.45 : 1) * Math.min(1.6, Math.max(0.5, (W * H) / (1440 * 900))));

  /* ---------- Neon City: cidade cyberpunk à noite, chuva neon, letreiros e glitch ---------- */
  function neonCity() {
    let base, rain = [], signs = [], wins = [], glitchAt = 0, glitchUntil = 0;
    const NEON = ['#fcee0a', '#00f0ff', '#ff2a6d', '#b967ff'];
    return {
      init() {
        const [c, x] = off(W, H); base = c;
        const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#05030c'); g.addColorStop(.55, '#140a2a'); g.addColorStop(1, '#2a0b33'); x.fillStyle = g; x.fillRect(0, 0, W, H);
        // brilho da cidade no horizonte
        const hz = x.createRadialGradient(W * .5, H * .95, 0, W * .5, H * .95, W * .7); hz.addColorStop(0, 'rgba(255,42,109,.35)'); hz.addColorStop(1, 'transparent'); x.fillStyle = hz; x.fillRect(0, 0, W, H);
        wins = []; signs = [];
        // duas camadas de prédios (a de trás mais clara e baixa)
        [[.55, '#120a24', .35], [.75, '#07040f', .6]].forEach(([hmax, color, wfrac], layerI) => {
          let px = -20;
          while (px < W + 20) {
            const w = rnd(40, 120), h = rnd(H * .18, H * hmax), y = H - h;
            x.fillStyle = color; x.fillRect(px, y, w, h);
            if (Math.random() < .3) x.fillRect(px + w * .4, y - rnd(10, 40), 3, rnd(10, 40)); // antena
            // janelas
            for (let wy = y + 10; wy < H - 10; wy += 9) for (let wx = px + 6; wx < px + w - 6; wx += 8) {
              if (Math.random() < wfrac * .35) wins.push({ x: wx, y: wy, c: pick(NEON), on: Math.random() < .7, t: rnd(2, 12) });
            }
            if (layerI === 1 && Math.random() < .35 && h > H * .25) signs.push({ x: px + rnd(4, w - 14), y: y + rnd(20, h * .5), w: rnd(6, 10), h: rnd(40, 90), c: pick(NEON), ph: rnd(0, 6) });
            px += w + rnd(2, 14);
          }
        });
        rain = Array.from({ length: many(220) }, () => ({ x: rnd(-100, W), y: rnd(-H, H), l: rnd(10, 26), v: rnd(500, 900), a: rnd(.08, .3) }));
      },
      frame(t, dt) {
        blit(base);
        // janelas piscando
        for (const w of wins) { w.t -= dt; if (w.t < 0) { w.on = Math.random() < .75; w.t = rnd(2, 14); } if (w.on) { ctx.fillStyle = w.c; ctx.globalAlpha = .55; ctx.fillRect(w.x, w.y, 3, 4); } }
        ctx.globalAlpha = 1;
        // letreiros de neon (com tremidinha de vez em quando)
        for (const s of signs) {
          const fl = Math.sin(t * 3 + s.ph) > -.92 || Math.random() < .5 ? 1 : .25;
          ctx.shadowColor = s.c; ctx.shadowBlur = opts.lite ? 0 : 14; ctx.fillStyle = s.c; ctx.globalAlpha = .85 * fl;
          ctx.fillRect(s.x, s.y, s.w, s.h);
        }
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        // chuva
        ctx.strokeStyle = '#7fe9ff'; ctx.lineWidth = 1;
        for (const d of rain) {
          d.y += d.v * dt; d.x += d.v * .18 * dt;
          if (d.y > H) { d.y = rnd(-60, -10); d.x = rnd(-100, W); }
          ctx.globalAlpha = d.a; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * .18, d.y - d.l); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // glitch: faixas da tela deslocadas por um instante
        if (opts.anim && t > glitchAt) { glitchAt = t + rnd(5, 11); glitchUntil = t + .14; }
        if (t < glitchUntil) {
          for (let i = 0; i < 5; i++) {
            const y = rnd(0, H), h = rnd(4, 26), dx = rnd(-30, 30);
            ctx.drawImage(cv, 0, y * DPR, cv.width, h * DPR, dx, y, W, h);
            ctx.fillStyle = pick(['rgba(0,240,255,.12)', 'rgba(255,42,109,.12)']); ctx.fillRect(0, y, W, h);
          }
        }
      }
    };
  }

  /* ---------- Pôr do sol retrô: synthwave com sol listrado, montanhas e grade andando ---------- */
  function synthwave() {
    let base, stars = [], z = 0;
    return {
      init() {
        const [c, x] = off(W, H); base = c;
        const hz = H * .62;
        const g = x.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#0c0322'); g.addColorStop(.55, '#3b0a5c'); g.addColorStop(1, '#ff3e8a'); x.fillStyle = g; x.fillRect(0, 0, W, hz);
        // sol listrado
        const r = Math.min(W, H) * .2, cx = W * .5, cy = hz - r * .35;
        const sg = x.createLinearGradient(0, cy - r, 0, cy + r); sg.addColorStop(0, '#ffe66d'); sg.addColorStop(.6, '#ff8a3d'); sg.addColorStop(1, '#ff2e88');
        x.save(); x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.clip(); x.fillStyle = sg; x.fillRect(cx - r, cy - r, r * 2, r * 2);
        for (let i = 0; i < 7; i++) { const yy = cy + r * (.1 + i * .13); x.clearRect(cx - r, yy, r * 2, 2 + i * 1.4); }
        x.restore();
        // montanhas
        [['#2a0845', .78, .16], ['#14032a', .9, .1]].forEach(([col, k, amp]) => {
          x.fillStyle = col; x.beginPath(); x.moveTo(0, hz);
          for (let px = 0; px <= W; px += W / 14) x.lineTo(px, hz - Math.abs(Math.sin(px * .013 * k + k * 5)) * H * amp - rnd(0, H * .03));
          x.lineTo(W, hz); x.closePath(); x.fill();
        });
        // chão
        const fg = x.createLinearGradient(0, hz, 0, H); fg.addColorStop(0, '#1b0433'); fg.addColorStop(1, '#07010f'); x.fillStyle = fg; x.fillRect(0, hz, W, H - hz);
        stars = Array.from({ length: many(120) }, () => ({ x: rnd(0, W), y: rnd(0, hz * .7), r: rnd(.4, 1.4), p: rnd(0, 6) }));
      },
      frame(t, dt) {
        blit(base);
        const hz = H * .62;
        for (const s of stars) { ctx.globalAlpha = .4 + .5 * Math.sin(t * 2 + s.p) ** 2; ctx.fillStyle = '#fff'; ctx.fillRect(s.x, s.y, s.r, s.r); }
        ctx.globalAlpha = 1;
        // grade em perspectiva vindo na sua direção
        z = (z + dt * .35) % 1;
        ctx.strokeStyle = '#ff3ea5'; ctx.lineWidth = 1.4; ctx.shadowColor = '#ff3ea5'; ctx.shadowBlur = opts.lite ? 0 : 8;
        ctx.beginPath();
        for (let i = 0; i < 18; i++) { const k = (i + z) / 18, y = hz + (H - hz) * k * k; ctx.moveTo(0, y); ctx.lineTo(W, y); }
        for (let i = -14; i <= 14; i++) { ctx.moveTo(W / 2 + i * 14, hz); ctx.lineTo(W / 2 + i * W * .16, H); }
        ctx.stroke(); ctx.shadowBlur = 0;
        const fade = ctx.createLinearGradient(0, hz, 0, hz + 40); fade.addColorStop(0, 'rgba(27,4,51,1)'); fade.addColorStop(1, 'rgba(27,4,51,0)'); ctx.fillStyle = fade; ctx.fillRect(0, hz, W, 40);
      }
    };
  }

  /* ---------- Terminal: chuva de código verde ---------- */
  function terminal() {
    let cols = [], fs = 16;
    const CH = '0101010123456789ABCDEF<>/{}[]=+*#$%&;:'.split('');
    return {
      init() {
        fs = W < 700 ? 14 : 16; cols = Array.from({ length: Math.ceil(W / fs) }, () => ({ y: rnd(-H, 0), v: rnd(60, 160) * (opts.lite ? .8 : 1) }));
        ctx.fillStyle = '#020604'; ctx.fillRect(0, 0, W, H);
      },
      frame(t, dt) {
        ctx.fillStyle = 'rgba(2,6,4,.16)'; ctx.fillRect(0, 0, W, H);
        ctx.font = `${fs}px "JetBrains Mono", Consolas, monospace`;
        cols.forEach((c, i) => {
          const prev = c.y; c.y += c.v * dt;
          if (Math.floor(c.y / fs) !== Math.floor(prev / fs)) {
            const y = Math.floor(c.y / fs) * fs;
            ctx.fillStyle = '#d6ffe0'; ctx.fillText(pick(CH), i * fs, y);
            ctx.fillStyle = 'rgba(43,255,106,.75)'; ctx.fillText(pick(CH), i * fs, y - fs);
          }
          if (c.y > H + rnd(0, H * .6)) { c.y = rnd(-200, 0); c.v = rnd(60, 160); }
        });
      }
    };
  }

  /* ---------- Sakura ao vento: céu de fim de tarde e pétalas caindo ---------- */
  function sakura() {
    let base, petals = [];
    const newP = top => ({ x: rnd(-50, W + 50), y: top ? rnd(-H, 0) : rnd(0, H), s: rnd(5, 11), r: rnd(0, 6.3), vr: rnd(-1.5, 1.5), vy: rnd(25, 60), sw: rnd(.6, 1.6), ph: rnd(0, 6), c: pick(['#ffb7cf', '#ffc9da', '#ff9dbd', '#ffe1ea']) });
    return {
      init() {
        const [c, x] = off(W, H); base = c;
        const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ffe9f1'); g.addColorStop(.6, '#f7d6ea'); g.addColorStop(1, '#e8d6ff'); x.fillStyle = g; x.fillRect(0, 0, W, H);
        // galhos com flores no canto
        x.strokeStyle = 'rgba(90,50,60,.55)'; x.lineCap = 'round';
        const branch = (x0, y0, a, len, w) => { if (len < 14) { x.fillStyle = 'rgba(255,170,200,.8)'; x.beginPath(); x.arc(x0, y0, rnd(4, 9), 0, 7); x.fill(); return; } const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len; x.lineWidth = w; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); branch(x1, y1, a + rnd(.2, .6), len * .72, w * .7); branch(x1, y1, a - rnd(.2, .6), len * .7, w * .7); };
        branch(W + 10, -10, Math.PI * .75, Math.min(W, H) * .18, 10);
        petals = Array.from({ length: many(70) }, () => newP(false));
      },
      frame(t, dt) {
        blit(base);
        const wind = Math.sin(t * .3) * 30 + 20;
        for (const p of petals) {
          p.y += p.vy * dt; p.x += (wind + Math.sin(t * p.sw + p.ph) * 25) * dt; p.r += p.vr * dt;
          if (p.y > H + 20 || p.x > W + 60) Object.assign(p, newP(true), { y: -20 });
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(1, .55 + .45 * Math.sin(t * 2 + p.ph));
          ctx.fillStyle = p.c; ctx.globalAlpha = .9; ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.quadraticCurveTo(p.s, 0, 0, p.s); ctx.quadraticCurveTo(-p.s, 0, 0, -p.s); ctx.fill(); ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
    };
  }

  /* ---------- Galáxia: nebulosa, estrelas piscando e estrelas cadentes ---------- */
  function galaxia() {
    let base, stars = [], shoot = null, next = 3;
    return {
      init() {
        const [c, x] = off(W, H); base = c;
        x.fillStyle = '#03030a'; x.fillRect(0, 0, W, H);
        [['#5b3cff', .2, .25], ['#ff3ea5', .8, .7], ['#16c8ff', .6, .2], ['#8f7bff', .3, .8]].forEach(([col, fx, fy]) => {
          const r = Math.max(W, H) * rnd(.35, .55), g = x.createRadialGradient(W * fx, H * fy, 0, W * fx, H * fy, r);
          g.addColorStop(0, col + '40'); g.addColorStop(1, 'transparent'); x.fillStyle = g; x.fillRect(0, 0, W, H);
        });
        for (let i = 0; i < many(500); i++) { x.fillStyle = `rgba(255,255,255,${rnd(.1, .5)})`; x.fillRect(rnd(0, W), rnd(0, H), rnd(.5, 1.2), rnd(.5, 1.2)); }
        stars = Array.from({ length: many(140) }, () => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(.8, 2.2), p: rnd(0, 6), s: rnd(.6, 2) }));
      },
      frame(t, dt) {
        blit(base);
        for (const s of stars) { ctx.globalAlpha = .25 + .75 * Math.abs(Math.sin(t * s.s + s.p)); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * .6, 0, 7); ctx.fill(); }
        ctx.globalAlpha = 1;
        next -= dt;
        if (!shoot && next < 0) { shoot = { x: rnd(W * .2, W), y: rnd(0, H * .4), v: rnd(700, 1100), life: 0 }; next = rnd(3, 8); }
        if (shoot) {
          shoot.life += dt; shoot.x -= shoot.v * dt; shoot.y += shoot.v * .45 * dt;
          const g = ctx.createLinearGradient(shoot.x, shoot.y, shoot.x + 140, shoot.y - 63); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(shoot.x, shoot.y); ctx.lineTo(shoot.x + 140, shoot.y - 63); ctx.stroke();
          if (shoot.life > 1.2) shoot = null;
        }
      }
    };
  }

  /* ---------- Brasas: fagulhas subindo de uma fogueira ---------- */
  function brasas() {
    let base, sprite, em = [];
    const newE = () => ({ x: rnd(0, W), y: H + rnd(0, 60), v: rnd(30, 90), r: rnd(1, 3.4), ph: rnd(0, 6), sw: rnd(.5, 1.5), life: rnd(4, 10) });
    return {
      init() {
        const [c, x] = off(W, H); base = c;
        const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b0505'); g.addColorStop(.7, '#1f0a06'); g.addColorStop(1, '#4a1406'); x.fillStyle = g; x.fillRect(0, 0, W, H);
        const gl = x.createRadialGradient(W * .5, H * 1.1, 0, W * .5, H * 1.1, W * .6); gl.addColorStop(0, 'rgba(255,106,26,.45)'); gl.addColorStop(1, 'transparent'); x.fillStyle = gl; x.fillRect(0, 0, W, H);
        [sprite] = off(24, 24); const sx = sprite.getContext('2d'); sx.setTransform(DPR, 0, 0, DPR, 0, 0);
        const sg = sx.createRadialGradient(12, 12, 0, 12, 12, 12); sg.addColorStop(0, 'rgba(255,230,160,1)'); sg.addColorStop(.3, 'rgba(255,140,40,.8)'); sg.addColorStop(1, 'rgba(255,60,0,0)'); sx.fillStyle = sg; sx.fillRect(0, 0, 24, 24);
        em = Array.from({ length: many(110) }, () => Object.assign(newE(), { y: rnd(0, H) }));
      },
      frame(t, dt) {
        blit(base);
        ctx.globalCompositeOperation = 'lighter';
        for (const e of em) {
          e.y -= e.v * dt; e.x += Math.sin(t * e.sw + e.ph) * 18 * dt; e.life -= dt;
          if (e.y < -20 || e.life < 0) Object.assign(e, newE());
          const s = e.r * 6 * (0.6 + 0.4 * Math.sin(t * 6 + e.ph));
          ctx.globalAlpha = Math.min(1, e.life / 2) * Math.min(1, (H - e.y) / (H * .2) + .2);
          ctx.drawImage(sprite, e.x - s / 2, e.y - s / 2, s, s);
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
    };
  }

  const SCENES = { neon: neonCity, synth: synthwave, terminal, sakura, galaxia, brasas };
  function draw(now, still) {
    const t = now / 1000, dt = Math.min(.1, last ? (now - last) / 1000 : 0.016); last = now;
    try { scene.frame(t, still ? 0.016 : dt); } catch (e) { console.warn('fx', e); }
  }
  function loop() {
    cancelAnimationFrame(raf);
    const step = now => {
      if (!scene || document.hidden || !opts.anim) return;
      const fps = opts.lite ? 20 : 30;
      if (now - last >= 1000 / fps - 2) draw(now);
      raf = requestAnimationFrame(step);
    };
    last = 0; raf = requestAnimationFrame(step);
  }
  window.AnarchyFx = {
    names: Object.keys(SCENES),
    start(n, o = {}) {
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const nopts = { anim: o.anim !== false && !reduce, lite: !!o.lite };
      // mesma cena e mesmas opções (ex.: mudou só o tamanho da fonte): deixa rodando como está
      if (n === name && scene && nopts.anim === opts.anim && nopts.lite === opts.lite) return;
      opts = nopts;
      layer();
      if (n !== name || !scene) { name = n; scene = SCENES[n] ? SCENES[n]() : null; }
      if (!scene) return this.stop();
      cv.hidden = false; size(); scene.init(); last = 0; draw(performance.now(), true);
      if (opts.anim) loop();
    },
    stop() { cancelAnimationFrame(raf); scene = null; name = null; if (cv) { cv.hidden = true; ctx.clearRect(0, 0, W, H); } }
  };
})();
