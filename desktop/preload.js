const { contextBridge, ipcRenderer } = require('electron');

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
