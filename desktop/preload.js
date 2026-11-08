const { contextBridge, ipcRenderer, webFrame } = require('electron');

// Compartilhar a tela inteira pede o som do PC junto. Em alguns Windows a captura do som falha
// ("Could not start audio source") e nada era compartilhado. Aqui, dentro do próprio app (sem depender
// das telas do servidor), tenta de novo só com a imagem e avisa a página.
// O som da tela vem do somtela.exe (veja desktop/native): tudo do PC menos o Discordia, como no Discord.
webFrame.executeJavaScript(`(() => {
  const md = navigator.mediaDevices;
  if (!md || !md.getDisplayMedia || md.__discordiaFix) return;
  const orig = md.getDisplayMedia.bind(md);
  md.__discordiaFix = true;
  // PCM 16 bits, 48 kHz, estéreo do somtela.exe virando uma faixa de áudio de verdade
  const somTrack = () => {
    const D = window.discordiaDesktop;
    const gen = new MediaStreamTrackGenerator({ kind: 'audio' });
    const writer = gen.writable.getWriter();
    let ts = 0, off = false;
    D.somtelaOn(buf => {
      if (off) return;
      const frames = buf.byteLength >> 2; if (!frames) return;
      // atrasou (a faixa não está dando conta): descarta em vez de acumular atraso
      if (writer.desiredSize !== null && writer.desiredSize < -10) return;
      try {
        const data = new AudioData({ format: 's16', sampleRate: 48000, numberOfChannels: 2, numberOfFrames: frames, timestamp: ts, data: buf });
        ts += Math.round(frames * 1e6 / 48000);
        writer.write(data).catch(() => {});
      } catch {}
    });
    const end = () => { if (off) return; off = true; D.somtelaStop(); D.somtelaOn(null); writer.close().catch(() => {}); };
    const stop = gen.stop.bind(gen);
    gen.stop = () => { end(); stop(); };
    return { tr: gen, end };
  };
  md.getDisplayMedia = async (c = {}) => {
    let s;
    try { s = await orig(c); }
    catch (e) {
      if (c && c.audio && (e.name === 'NotReadableError' || /audio/i.test(e.message || ''))) {
        s = await orig({ ...c, audio: false });
        window.dispatchEvent(new CustomEvent('discordia:screen-no-audio'));
        return s;
      }
      throw e;
    }
    const D = window.discordiaDesktop;
    if (c && c.audio && D && D.somtelaStart && typeof MediaStreamTrackGenerator === 'function' && !s.getAudioTracks().length) {
      try {
        if (await D.somtelaStart()) {
          const a = somTrack(); s.addTrack(a.tr);
          const vt = s.getVideoTracks()[0];
          if (vt) { vt.addEventListener('ended', a.end); const vs = vt.stop.bind(vt); vt.stop = () => { a.end(); vs(); }; }
        } else window.dispatchEvent(new CustomEvent('discordia:screen-no-audio'));
      } catch {}
    }
    return s;
  };
})()`).catch(() => {});

// som da tela: um só ouvinte, que repassa para quem estiver compartilhando agora
let somFn = null;
ipcRenderer.on('somtela:data', (_, b) => { if (somFn) somFn(b); });

contextBridge.exposeInMainWorld('discordiaDesktop', {
  isDesktop: true,
  info: () => ipcRenderer.invoke('info'),
  setSettings: s => ipcRenderer.invoke('settings', s),
  reset: () => ipcRenderer.invoke('reset'),
  retry: () => ipcRenderer.invoke('retry'),
  panel: () => ipcRenderer.invoke('panel'),
  tunnel: on => ipcRenderer.invoke('tunnel', on),
  dbGet: () => ipcRenderer.invoke('db:get'),
  dbSet: d => ipcRenderer.invoke('db:set', d),
  copy: t => ipcRenderer.invoke('copy', t),
  openData: () => ipcRenderer.invoke('openData'),
  test: url => ipcRenderer.invoke('test', url),
  choose: d => ipcRenderer.invoke('choose', d),
  pickerSources: () => ipcRenderer.invoke('picker:sources'),
  pickerChoose: id => ipcRenderer.invoke('picker:choose', id),
  onStatus: fn => ipcRenderer.on('status', (_, s) => fn(s)),
  updateGet: () => ipcRenderer.invoke('update:get'),
  updateCheck: () => ipcRenderer.invoke('update:check'),
  updateInstall: () => ipcRenderer.invoke('update:install'),
  onUpdate: fn => ipcRenderer.on('update', (_, s) => fn(s)),
  somtelaStart: () => ipcRenderer.invoke('somtela:start'),
  somtelaStop: () => ipcRenderer.invoke('somtela:stop'),
  somtelaOn: fn => { somFn = typeof fn === 'function' ? fn : null; }
});
