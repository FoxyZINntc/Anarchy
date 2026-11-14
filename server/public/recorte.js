/* Anarchy — Editor de recorte de imagens e GIFs (foto de perfil, banner, ícone do grupo, figurinha, imagem no chat...).
   Arraste para mover, use a rodinha/o controle (ou pinça no celular) para o zoom e escolha o formato.
   Foto: recortada num canvas. GIF: cada quadro é lido (ImageDecoder do navegador), recortado e o GIF é montado de
   novo (vendor/gifenc.js), então continua animado. Sem ImageDecoder, o GIF vai sem recorte (com aviso).
   anarchyCrop.open(file, preset) → Promise<dataURL | null> (null = cancelou). */
(() => {
'use strict';
const PRESETS = {
  avatar: { title: 'Ajustar foto de perfil', shape: 'circle', aspects: [['Quadrada', 1]], out: [384, 384], gif: [256, 256] },
  icone: { title: 'Ajustar ícone do grupo', shape: 'round', aspects: [['Quadrado', 1]], out: [256, 256], gif: [192, 192] },
  banner: { title: 'Ajustar banner', aspects: [['Banner', 3], ['Mais alto', 2.2]], max: 1200, gifMax: 600 },
  figurinha: { title: 'Ajustar figurinha', aspects: [['Original', 0], ['Quadrada', 1]], max: 320, gifMax: 256, keepAlpha: true },
  chat: { title: 'Enviar imagem', aspects: [['Original', 0], ['Quadrada', 1], ['4:3', 4 / 3], ['16:9', 16 / 9], ['Retrato', 3 / 4]], max: 2000, gifMax: 480, original: true, ok: 'Enviar' },
  fundo: { title: 'Ajustar fundo do app', aspects: [['Tela', 16 / 9], ['Original', 0]], max: 1920, gifMax: 960 }
};
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const readUrl = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function open(file, presetName = 'chat', extra = {}) {
  const P = { ...(PRESETS[presetName] || PRESETS.chat), ...extra };
  return new Promise(async done => {
    const isGif = file.type === 'image/gif';
    const url = URL.createObjectURL(file);
    const img = new Image(); img.src = url; img.decoding = 'async';
    try { await img.decode(); } catch { URL.revokeObjectURL(url); window.anarchyToast && window.anarchyToast('Não consegui abrir essa imagem.', true); return done(null); }
    const W = img.naturalWidth, H = img.naturalHeight;
    let asp = P.aspects[0][1] || W / H, z = 1, x = 0, y = 0, fw = 0, fh = 0, touched = false;
    const back = document.createElement('div'); back.className = 'crp-back'; back.setAttribute('role', 'dialog'); back.setAttribute('aria-label', P.title);
    back.innerHTML = `<div class="crp">
      <div class="crp-h"><b>${esc(P.title)}</b>${isGif ? '<span class="crp-gif">GIF animado: continua animado depois do recorte</span>' : ''}</div>
      <div class="crp-stage"><img alt="" draggable="false"><i class="crp-frame ${P.shape || ''}"></i><span class="crp-tip">Arraste para mover · rodinha ou controle para o zoom</span></div>
      <div class="crp-ctl">
        ${P.aspects.length > 1 ? `<div class="crp-asp">${P.aspects.map(([l, a], i) => `<button type="button" data-a="${i}" class="${i === 0 ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>` : ''}
        <label class="crp-zoom"><span aria-hidden="true">➖</span><input type="range" min="0" max="100" value="0" step="1" aria-label="Zoom"><span aria-hidden="true">➕</span></label>
        <div class="crp-acts"><button type="button" class="btn ghost sm" data-c="fit">Mostrar inteira</button><button type="button" class="btn ghost sm" data-c="center">Centralizar</button></div>
      </div>
      <div class="crp-prog" hidden><i></i><span></span></div>
      <div class="crp-f">${P.original ? '<button type="button" class="btn ghost" data-c="orig">Enviar sem cortar</button>' : ''}<span style="flex:1"></span><button type="button" class="btn ghost" data-c="x">Cancelar</button><button type="button" class="btn primary" data-c="ok">${esc(P.ok || 'Salvar')}</button></div></div>`;
    document.body.appendChild(back);
    const $ = s => back.querySelector(s), stage = $('.crp-stage'), im = $('.crp-stage img'), frame = $('.crp-frame'), range = $('.crp-zoom input');
    im.src = url;
    // escala que cobre o quadro (zoom 1) e a que mostra a imagem inteira (zoom mínimo)
    const cover = () => Math.max(fw / W, fh / H), contain = () => Math.min(fw / W, fh / H);
    const zMin = () => contain() / cover(), zMax = 6;
    const scale = () => cover() * z;
    function layout() {
      const sw = stage.clientWidth, sh = stage.clientHeight, pad = 24;
      const k = Math.min((sw - pad * 2) / asp, sh - pad * 2);
      fh = Math.round(k); fw = Math.round(k * asp);
      frame.style.width = fw + 'px'; frame.style.height = fh + 'px';
      frame.style.left = (sw - fw) / 2 + 'px'; frame.style.top = (sh - fh) / 2 + 'px';
    }
    function fix() {
      const s = scale(), iw = W * s, ih = H * s;
      x = clamp(x, Math.min(0, fw - iw), Math.max(0, fw - iw));
      y = clamp(y, Math.min(0, fh - ih), Math.max(0, fh - ih));
    }
    function draw() {
      fix(); const s = scale(), ox = parseFloat(frame.style.left), oy = parseFloat(frame.style.top);
      im.style.width = W * s + 'px'; im.style.height = H * s + 'px';
      im.style.transform = `translate(${ox + x}px, ${oy + y}px)`;
      const lo = zMin(); range.value = Math.round(((z - lo) / (zMax - lo)) * 100);
    }
    function center() { const s = scale(); x = (fw - W * s) / 2; y = (fh - H * s) / 2; }
    // zoom mantendo fixo o ponto (px, py) do quadro
    function zoomTo(nz, px = fw / 2, py = fh / 2) {
      nz = clamp(nz, zMin(), zMax); const s0 = scale(); z = nz; const s1 = scale();
      x = px - (px - x) * (s1 / s0); y = py - (py - y) * (s1 / s0); touched = true; draw();
    }
    function setAspect(i) {
      asp = P.aspects[i][1] || W / H; back.querySelectorAll('.crp-asp button').forEach((b, k) => b.classList.toggle('on', k === i));
      layout(); z = 1; center(); draw(); touched = i !== 0;
    }
    layout(); center(); draw();
    // arrastar (mouse e dedo) e pinça
    const pts = new Map(); let last = null, pinch = null;
    stage.addEventListener('pointerdown', e => { stage.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); last = [e.clientX, e.clientY]; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z }; } stage.classList.add('drag'); });
    stage.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()]; const r = frame.getBoundingClientRect(); zoomTo(pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top); return; }
      x += e.clientX - last[0]; y += e.clientY - last[1]; last = [e.clientX, e.clientY]; touched = true; draw();
    });
    const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) stage.classList.remove('drag'); else last = [...pts.values()][0]; };
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
    stage.addEventListener('wheel', e => { e.preventDefault(); const r = frame.getBoundingClientRect(); zoomTo(z * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    range.oninput = () => { const lo = zMin(); zoomTo(lo + (+range.value / 100) * (zMax - lo)); };
    const onKey = e => {
      if (e.key === 'Escape') { e.stopPropagation(); finish(null); }
      const mv = { ArrowLeft: [8, 0], ArrowRight: [-8, 0], ArrowUp: [0, 8], ArrowDown: [0, -8] }[e.key];
      if (mv && e.target === document.body) { x += mv[0]; y += mv[1]; touched = true; draw(); e.preventDefault(); }
    };
    document.addEventListener('keydown', onKey, true);
    const onResize = () => { const s0 = scale(), cx = (fw / 2 - x) / s0, cy = (fh / 2 - y) / s0; layout(); const s1 = scale(); x = fw / 2 - cx * s1; y = fh / 2 - cy * s1; draw(); };
    window.addEventListener('resize', onResize);
    function finish(v) { document.removeEventListener('keydown', onKey, true); window.removeEventListener('resize', onResize); back.remove(); URL.revokeObjectURL(url); done(v); }
    back.addEventListener('click', async e => {
      const b = e.target.closest('[data-a], [data-c]'); if (!b) return;
      if (b.dataset.a) return setAspect(+b.dataset.a);
      const c = b.dataset.c;
      if (c === 'x') return finish(null);
      if (c === 'fit') { z = zMin(); center(); touched = true; draw(); return; }
      if (c === 'center') { center(); draw(); return; }
      if (c === 'orig' || (c === 'ok' && P.original && !touched)) { finish(await readUrl(file)); return; }
      if (c === 'ok') {
        back.querySelectorAll('button').forEach(x => { x.disabled = true; });
        try { finish(await render(isGif)); }
        catch (err) { back.querySelectorAll('button').forEach(x => { x.disabled = false; }); progress(null); (window.anarchyToast || alert)(err.message || 'Não consegui recortar.', true); }
      }
    });
    function progress(p, text) { const el = $('.crp-prog'); if (p === null) { el.hidden = true; return; } el.hidden = false; el.querySelector('i').style.width = Math.round(p * 100) + '%'; el.querySelector('span').textContent = text || ''; }
    // tamanho final: fixo (foto/ícone) ou o recorte na resolução real, limitado ao máximo
    function outSize(gif) {
      if (gif && P.gif) return P.gif;
      if (!gif && P.out) return P.out;
      const s = scale(), max = gif ? P.gifMax || 480 : P.max || 2000;
      let w = Math.round(fw / s), h = Math.round(fh / s);
      // imagem menor que o quadro (Mostrar inteira): usa o tamanho do quadro em relação à imagem
      w = Math.max(w, 16); h = Math.max(h, 16);
      const k = Math.min(1, max / Math.max(w, h)); return [Math.round(w * k), Math.round(h * k)];
    }
    function paintTo(ctx, src, ow, oh) {
      const k = ow / fw, s = scale();
      ctx.drawImage(src, x * k, y * k, W * s * k, H * s * k);
    }
    async function render(gif) {
      if (!gif) {
        const [ow, oh] = outSize(false), c = document.createElement('canvas'); c.width = ow; c.height = oh;
        const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high';
        const alpha = P.keepAlpha || /png|webp/.test(file.type);
        if (!alpha) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, ow, oh); }
        paintTo(ctx, img, ow, oh);
        return alpha ? c.toDataURL(/webp/.test(file.type) ? 'image/webp' : 'image/png') : c.toDataURL('image/jpeg', .9);
      }
      if (!('ImageDecoder' in window) || !window.gifenc) { (window.anarchyToast || (() => {}))('Este app não consegue recortar GIF: ele vai inteiro, sem corte.', true); return readUrl(file); }
      let [ow, oh] = outSize(true);
      for (let attempt = 0; attempt < 3; attempt++) {
        const data = await encodeGif(ow, oh);
        if (data.length < 7.5e6) return data;
        ow = Math.round(ow * .75); oh = Math.round(oh * .75); // grande demais: tenta menor
      }
      throw new Error('O GIF ficou grande demais. Tente um GIF menor ou mais curto.');
    }
    async function encodeGif(ow, oh) {
      const { GIFEncoder, quantize, applyPalette } = window.gifenc;
      const dec = new ImageDecoder({ data: await file.arrayBuffer(), type: 'image/gif' });
      await dec.tracks.ready; await dec.completed;
      const n = Math.min(dec.tracks.selectedTrack.frameCount, 400);
      const c = document.createElement('canvas'); c.width = ow; c.height = oh;
      const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.imageSmoothingQuality = 'high';
      const enc = GIFEncoder();
      for (let i = 0; i < n; i++) {
        const { image } = await dec.decode({ frameIndex: i });
        ctx.clearRect(0, 0, ow, oh); paintTo(ctx, image, ow, oh);
        const delay = Math.max(20, Math.round((image.duration || 100000) / 1000));
        image.close();
        const rgba = ctx.getImageData(0, 0, ow, oh).data;
        const palette = quantize(rgba, 256, { format: 'rgba4444', oneBitAlpha: true });
        const index = applyPalette(rgba, palette, 'rgba4444');
        const ti = palette.findIndex(p => p[3] === 0);
        enc.writeFrame(index, ow, oh, { palette, delay, ...(ti >= 0 ? { transparent: true, transparentIndex: ti, dispose: 2 } : {}) });
        if (i % 3 === 0) { progress((i + 1) / n, `Refazendo o GIF... ${Math.round((i + 1) / n * 100)}%`); await new Promise(r => setTimeout(r, 0)); }
      }
      dec.close(); enc.finish();
      progress(1, 'Pronto!');
      const bytes = enc.bytes(); let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return 'data:image/gif;base64,' + btoa(bin);
    }
  });
}
window.anarchyCrop = { open, PRESETS };
})();
