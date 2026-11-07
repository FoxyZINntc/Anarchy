const { contextBridge, ipcRenderer, webFrame } = require('electron');

// Compartilhar a tela inteira pede o som do PC junto. Em alguns Windows a captura do som falha
// ("Could not start audio source") e nada era compartilhado. Aqui, dentro do próprio app (sem depender
// das telas do servidor), tenta de novo só com a imagem e avisa a página.
webFrame.executeJavaScript(`(() => {
  const md = navigator.mediaDevices;
  if (!md || !md.getDisplayMedia || md.__discordiaFix) return;
  const orig = md.getDisplayMedia.bind(md);
  md.__discordiaFix = true;
  md.getDisplayMedia = async (c = {}) => {
    try { return await orig(c); }
    catch (e) {
      if (c && c.audio && (e.name === 'NotReadableError' || /audio/i.test(e.message || ''))) {
        const s = await orig({ ...c, audio: false });
        window.dispatchEvent(new CustomEvent('discordia:screen-no-audio'));
        return s;
      }
      throw e;
    }
  };
})()`).catch(() => {});

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
  onUpdate: fn => ipcRenderer.on('update', (_, s) => fn(s))
});
