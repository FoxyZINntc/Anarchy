// Anarchy — aplicativo de computador
const { app, BrowserWindow, Tray, Menu, ipcMain, session, desktopCapturer, shell, nativeImage, net, clipboard, Notification, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { spawn } = require('child_process');

// o app se chamava "Discordia": continua usando a mesma pasta de dados (login, configurações, preferências)
const OLD_DATA = path.join(app.getPath('appData'), 'Discordia');
if (process.env.NEXO_USERDATA) app.setPath('userData', process.env.NEXO_USERDATA);
else if (fs.existsSync(OLD_DATA)) app.setPath('userData', OLD_DATA);
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

/* ---------- configuração ---------- */
const CFG_PATH = path.join(app.getPath('userData'), 'config.json');
const DEFAULTS = { mode: null, server: '', minimizeToTray: true, startMinimized: false, autoStart: false, hostPort: 3000, hostHttpsPort: 3443, supabaseUrl: '', supabaseKey: '', supabaseToken: '', publicOnStart: false, bounds: null, maximized: false, trayTipShown: false };
let cfg = { ...DEFAULTS };
try { cfg = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CFG_PATH, 'utf8')) }; } catch {}
// instalador do servidor: vem com o Supabase já configurado e abre direto no modo servidor
try {
  const pre = JSON.parse(fs.readFileSync(path.join(__dirname, 'servidor-padrao.json'), 'utf8'));
  if (!cfg.mode && pre.mode) cfg.mode = pre.mode;
  if (!cfg.supabaseKey && !cfg.supabaseToken && pre.supabaseUrl && pre.supabaseToken) { cfg.supabaseUrl = pre.supabaseUrl; cfg.supabaseToken = pre.supabaseToken; }
} catch {}
function saveCfg() { try { fs.mkdirSync(path.dirname(CFG_PATH), { recursive: true }); fs.writeFileSync(CFG_PATH, JSON.stringify(cfg, null, 2)); } catch {} }
const originOf = u => { try { return new URL(u).origin; } catch { return ''; } };
const hostOf = u => { try { return new URL(u).host; } catch { return ''; } };
// app "cliente": o endereço do servidor oficial vem embutido (desktop/servidor.json) e nunca é perguntado.
// "updates" é o repositório do GitHub onde saem as versões novas do app.
let FIXED = '', UPD_REPO = '', UPD_OLD = '';
try {
  const sj = JSON.parse(fs.readFileSync(path.join(__dirname, 'servidor.json'), 'utf8'));
  FIXED = originOf(String(sj.url || '').trim());
  if (/^[\w.-]+\/[\w.-]+$/.test(String(sj.updates || ''))) UPD_REPO = sj.updates;
  if (/^[\w.-]+\/[\w.-]+$/.test(String(sj.updatesOld || ''))) UPD_OLD = sj.updatesOld;
} catch {}
const UPD_REPOS = [UPD_REPO, UPD_OLD].filter(Boolean);
// só para testes: aponta o app para outro servidor (ex.: um servidor local) sem mexer no servidor.json
const TESTE = process.env.ANARCHY_SERVIDOR_TESTE || process.env.DISCORDIA_SERVIDOR_TESTE;
if (TESTE) FIXED = originOf(TESTE.trim());
if (FIXED) { cfg.mode = 'client'; cfg.server = FIXED; }

// um servidor em http:// na rede local precisa ser tratado como seguro para liberar microfone e tela
if (cfg.mode === 'client' && /^http:\/\//i.test(cfg.server)) app.commandLine.appendSwitch('unsafely-treat-insecure-origin-as-secure', originOf(cfg.server));
app.setAppUserModelId('com.discordia.app');
if (process.platform === 'linux' && process.getuid && process.getuid() === 0) app.commandLine.appendSwitch('no-sandbox');

const asset = n => path.join(__dirname, 'assets', n);
let win = null, panel = null, picker = null, tray = null, server = null, quitting = false;
let tunnel = { proc: null, url: null, state: 'off', error: '' };
let unread = 0;
const startHidden = process.argv.includes('--hidden') || cfg.startMinimized;

/* ---------- servidor embutido ---------- */
async function startHost() {
  if (server) return server;
  const nexo = require('../server/server.js');
  let lastErr;
  for (let i = 0; i < 6; i++) {
    try {
      server = await nexo.start({ supabaseUrl: cfg.supabaseUrl || undefined, supabaseKey: cfg.supabaseKey || undefined, supabaseToken: cfg.supabaseToken || undefined, log: m => console.log(m), dataDir: path.join(app.getPath('userData'), 'servidor'), publicDir: path.join(__dirname, '..', 'server', 'public'), port: cfg.hostPort + i, httpsPort: cfg.hostHttpsPort + i });
      if (cfg.publicOnStart) startTunnel();
      return server;
    } catch (e) { lastErr = e; if (e.code !== 'EADDRINUSE') break; }
  }
  throw new Error(lastErr && lastErr.code === 'EADDRINUSE' ? 'As portas do Anarchy já estão ocupadas. Feche o Anarchy.exe antigo, se estiver aberto, e tente de novo.' : (lastErr ? lastErr.message : 'Erro ao iniciar o servidor.'));
}
async function stopHost() { stopTunnel(); if (server) { await server.stop(); server = null; } }

/* ---------- link público (Cloudflare) ---------- */
const CF_NAME = process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared';
const CF_URL = process.platform === 'win32'
  ? 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe'
  : 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64';
const cfPath = () => path.join(app.getPath('userData'), CF_NAME);
function download(url, dest, hops = 0) {
  return new Promise((resolve, reject) => {
    if (hops > 6) return reject(new Error('Redirecionamentos demais.'));
    https.get(url, { headers: { 'User-Agent': 'Anarchy' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) { res.resume(); return resolve(download(new URL(res.headers.location, url).toString(), dest, hops + 1)); }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('Download falhou (' + res.statusCode + ').')); }
      const tmp = dest + '.part'; const f = fs.createWriteStream(tmp);
      res.pipe(f); f.on('finish', () => f.close(() => { fs.renameSync(tmp, dest); try { fs.chmodSync(dest, 0o755); } catch {} resolve(); }));
      f.on('error', reject);
    }).on('error', reject);
  });
}
async function startTunnel() {
  if (!server || tunnel.proc || tunnel.state === 'baixando') return;
  try {
    if (!fs.existsSync(cfPath())) { tunnel.state = 'baixando'; pushStatus(); await download(CF_URL, cfPath()); }
    tunnel.state = 'conectando'; tunnel.url = null; tunnel.error = ''; pushStatus();
    const p = spawn(cfPath(), ['tunnel', '--no-autoupdate', '--url', 'http://localhost:' + server.port], { windowsHide: true });
    tunnel.proc = p;
    const onData = d => {
      const m = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i.exec(d.toString());
      if (m && !tunnel.url) { tunnel.url = m[0]; tunnel.state = 'ativo'; pushStatus(); buildTray(); notify('Link público pronto', 'Mande o link para seus amigos. Ele está no painel do servidor.'); }
    };
    p.stdout.on('data', onData); p.stderr.on('data', onData);
    p.on('exit', () => { if (tunnel.proc === p) { tunnel = { proc: null, url: null, state: tunnel.state === 'parando' ? 'off' : 'erro', error: tunnel.state === 'parando' ? '' : 'O link público caiu. Gere outro.' }; pushStatus(); buildTray(); } });
    p.on('error', e => { tunnel.state = 'erro'; tunnel.error = e.message; pushStatus(); });
  } catch (e) { tunnel = { proc: null, url: null, state: 'erro', error: 'Não consegui baixar o cloudflared: ' + e.message }; pushStatus(); }
}
function stopTunnel() { if (tunnel.proc) { tunnel.state = 'parando'; try { tunnel.proc.kill(); } catch {} } else tunnel = { proc: null, url: null, state: 'off', error: '' }; pushStatus(); buildTray(); }

/* ---------- atualização automática (GitHub Releases) ---------- */
// Procura a versão mais nova, baixa o instalador em segundo plano e avisa a tela.
// Quando a pessoa clica em "Atualizar e reiniciar", roda o instalador em silêncio e ele abre o app de novo.
let upd = { state: 'parado', version: null, file: null, ready: false, error: '' };
const newer = (a, b) => {
  const p = s => String(s).replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const x = p(a), y = p(b);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
};
function sendUpd() { if (win && !win.isDestroyed()) win.webContents.send('update', upd); }
// O aviso não depende das telas do servidor: se a página não tiver a barra "Atualizar"
// (servidor antigo ou fora do ar), o próprio app pergunta numa janela do Windows.
let updAsked = null, lastCheck = 0;
async function announceUpdate() {
  if (!upd.ready || updAsked === upd.version) return;
  sendUpd(); buildTray();
  let pageHasBar = false;
  try { if (win && !win.isDestroyed() && /^https?:/.test(win.webContents.getURL())) pageHasBar = await win.webContents.executeJavaScript("!!document.getElementById('updBar')"); } catch {}
  if (pageHasBar) { updAsked = upd.version; return; }
  if (!win || win.isDestroyed() || !win.isVisible()) {
    // janela escondida perto do relógio: avisa por notificação; clicar abre a pergunta
    try {
      const n = new Notification({ title: 'Atualização do Anarchy pronta', body: `A versão ${upd.version} já foi baixada. Clique para atualizar.`, icon: asset('icon.png') });
      n.on('click', () => { showMain(); updAsked = null; announceUpdate(); });
      n.show();
    } catch {}
    return;
  }
  updAsked = upd.version;
  const r = await dialog.showMessageBox(win, {
    type: 'info', title: 'Atualização do Anarchy', message: `A versão ${upd.version} do Anarchy está pronta.`,
    detail: 'O Anarchy fecha, atualiza e abre de novo sozinho. Leva poucos segundos.',
    buttons: ['Reiniciar agora', 'Depois'], defaultId: 0, cancelId: 1, noLink: true
  });
  if (r.response === 0) installUpdate();
}
async function checkUpdate() {
  if (!UPD_REPO) { upd.state = 'desligado'; return upd; }
  if (!app.isPackaged) { upd.state = 'dev'; return upd; }
  if (upd.ready) { announceUpdate(); return upd; }
  if (upd.state === 'baixando' || upd.state === 'procurando') return upd;
  lastCheck = Date.now();
  try {
    upd.state = 'procurando';
    // "github.com/<repo>/releases/latest" redireciona para a página da versão mais nova (ex.: .../tag/v1.1.4).
    // Diferente da API, esse endereço não tem limite de 60 consultas por hora, então dá para olhar a cada minuto.
    const head = url => new Promise((resolve, reject) => {
      const q = https.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Anarchy' }, timeout: 15000 }, res => { res.resume(); resolve({ status: res.statusCode, location: res.headers.location || '' }); });
      q.on('timeout', () => q.destroy(new Error('tempo esgotado'))); q.on('error', reject); q.end();
    });
    // o repositório pode ter mudado de nome (Discordia -> Anarchy): tenta os dois e segue o redirecionamento do GitHub
    let m = null, loc = null, repo = UPD_REPO;
    for (const r of UPD_REPOS) {
      let url = `https://github.com/${r}/releases/latest`;
      for (let hop = 0; hop < 4 && url; hop++) {
        loc = await head(url);
        m = /github\.com\/([\w.-]+\/[\w.-]+)\/releases\/tag\/v?([\d.]+)\s*$/.exec(loc.location) || (/^\/([\w.-]+\/[\w.-]+)\/releases\/tag\/v?([\d.]+)\s*$/.exec(loc.location));
        if (m) break;
        url = loc.status >= 300 && loc.status < 400 && loc.location ? new URL(loc.location, url).href : null;
      }
      if (m) { repo = m[1]; break; }
    }
    if (!m) throw new Error('não achei a versão mais nova (GitHub respondeu ' + (loc && loc.status) + ')');
    const ver = m[2];
    if (!newer(ver, app.getVersion())) { upd.state = 'em-dia'; return upd; }
    const file = path.join(app.getPath('temp'), `Anarchy-Setup-${ver}.exe`);
    upd.state = 'baixando';
    // baixa para um arquivo temporário e só troca no fim: um download pela metade nunca é usado
    if (!fs.existsSync(file) || fs.statSync(file).size < 5 * 1024 * 1024) await download(`https://github.com/${repo}/releases/download/v${ver}/Anarchy-Setup.exe`, file);
    upd = { state: 'pronto', version: ver, file, ready: true, error: '' };
    announceUpdate();
  } catch (e) { upd.state = 'erro'; upd.error = e.message; }
  return upd;
}
function installUpdate() {
  if (!upd.ready || !fs.existsSync(upd.file)) return false;
  quitting = true;
  // instalador do electron-builder: /S = sem perguntas, --force-run = abre o Anarchy quando terminar
  spawn(upd.file, ['--updated', '/S', '--force-run'], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  setTimeout(() => app.exit(0), 400);
  return true;
}

/* ---------- janelas ---------- */
function showLocal(w, page, msg = '') { return w.loadFile(path.join(__dirname, 'ui', 'inicio.html'), { query: { page, msg, fixed: FIXED ? '1' : '' } }); }
function createWindow() {
  const b = cfg.bounds || { width: 1280, height: 800 };
  win = new BrowserWindow({
    ...b, minWidth: 940, minHeight: 560, title: 'Anarchy', icon: asset('icon.png'), backgroundColor: '#14171c', autoHideMenuBar: true, show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false, backgroundThrottling: false, spellcheck: true }
  });
  win.setMenu(null);
  if (cfg.maximized) win.maximize();
  win.once('ready-to-show', () => { if (!startHidden) win.show(); });
  let bt;
  const keep = () => { clearTimeout(bt); bt = setTimeout(() => { if (!win || win.isDestroyed()) return; cfg.maximized = win.isMaximized(); if (!cfg.maximized && !win.isMinimized()) cfg.bounds = win.getBounds(); saveCfg(); }, 500); };
  ['resize', 'move', 'maximize', 'unmaximize'].forEach(ev => win.on(ev, keep));
  win.on('close', e => {
    if (quitting || !cfg.minimizeToTray) return;
    e.preventDefault(); win.hide();
    if (!cfg.trayTipShown) { cfg.trayTipShown = true; saveCfg(); notify('O Anarchy continua aberto', 'Ele fica perto do relógio para você receber mensagens e chamadas. Para fechar de vez, use "Sair" no ícone.'); }
  });
  win.on('focus', () => { win.flashFrame(false); });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => {
    if (url.startsWith('file:')) return;
    const allowed = cfg.mode === 'host' ? (server && originOf(url) === 'http://localhost:' + server.port) : originOf(url) === originOf(cfg.server);
    if (!allowed) { e.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url); }
  });
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown') return;
    if (i.key === 'F5' || (i.control && i.key.toLowerCase() === 'r')) { e.preventDefault(); win.webContents.reload(); }
    if (i.key === 'F12' || (i.control && i.shift && i.key.toLowerCase() === 'i')) { e.preventDefault(); win.webContents.toggleDevTools(); }
    if (i.key === 'F11') { e.preventDefault(); win.setFullScreen(!win.isFullScreen()); }
  });
  win.webContents.on('did-fail-load', (e, code, desc, url, isMain) => {
    if (!isMain || code === -3 || url.startsWith('file:')) return;
    showLocal(win, 'offline', cfg.mode === 'host' ? 'O servidor deste computador não respondeu.' : FIXED ? 'O servidor do Anarchy está fora do ar ou sua internet caiu. Assim que ele voltar, eu conecto sozinho.' : 'Não consegui falar com ' + hostOf(cfg.server) + '. O servidor do seu amigo pode estar desligado, ou o link mudou.');
  });
  win.on('page-title-updated', (e, title) => {
    const m = /^\((\d+)\)/.exec(title); const n = m ? +m[1] : 0;
    if (n > unread && !win.isFocused()) win.flashFrame(true);
    unread = n;
    if (process.platform === 'win32') win.setOverlayIcon(n ? nativeImage.createFromPath(asset('badge.png')) : null, n ? n + ' mensagens novas' : '');
    if (process.platform !== 'win32') app.setBadgeCount(n);
    if (tray) tray.setToolTip(n ? `Anarchy (${n} novas)` : 'Anarchy');
  });
  route();
}
async function route() {
  if (!cfg.mode) return showLocal(win, 'inicio');
  if (cfg.mode === 'host') {
    try { await startHost(); buildTray(); win.loadURL('http://localhost:' + server.port); }
    catch (e) { showLocal(win, 'erro', e.message); }
    return;
  }
  win.loadURL(cfg.server);
}
function openPanel() {
  if (panel && !panel.isDestroyed()) { panel.show(); panel.focus(); return; }
  panel = new BrowserWindow({ width: 520, height: 720, minWidth: 420, minHeight: 500, title: 'Anarchy — Servidor', icon: asset('icon.png'), backgroundColor: '#14171c', autoHideMenuBar: true, parent: undefined, webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: false } });
  panel.setMenu(null);
  showLocal(panel, 'painel');
}
function showMain() { if (!win || win.isDestroyed()) return createWindow(); if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
function notify(title, body) { try { if (Notification.isSupported()) new Notification({ title, body, icon: asset('icon.png'), silent: true }).show(); } catch {} }

/* ---------- bandeja ---------- */
function buildTray() {
  if (!tray) {
    tray = new Tray(nativeImage.createFromPath(asset(process.platform === 'win32' ? 'tray.png' : 'tray@2x.png')).resize({ width: 16, height: 16 }));
    tray.setToolTip('Anarchy');
    tray.on('click', showMain); tray.on('double-click', showMain);
  }
  const host = cfg.mode === 'host';
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir o Anarchy', click: showMain },
    ...(upd.ready ? [{ label: `Atualizar e reiniciar (versão ${upd.version})`, click: installUpdate }] : []),
    { type: 'separator' },
    ...(host ? [
      { label: 'Painel do servidor', click: openPanel },
      tunnel.url ? { label: 'Copiar link público', click: () => clipboard.writeText(tunnel.url) } : { label: tunnel.state === 'off' || tunnel.state === 'erro' ? 'Gerar link público' : 'Gerando link...', enabled: tunnel.state === 'off' || tunnel.state === 'erro', click: startTunnel },
      { type: 'separator' }
    ] : []),
    { label: 'Iniciar com o Windows', type: 'checkbox', checked: cfg.autoStart, visible: process.platform !== 'linux', click: m => setSettings({ autoStart: m.checked }) },
    { label: 'Trocar de servidor...', click: resetMode, visible: !FIXED },
    { type: 'separator' },
    { label: 'Sair do Anarchy', click: () => { quitting = true; app.quit(); } }
  ]));
}
function setSettings(s) {
  ['minimizeToTray', 'startMinimized', 'autoStart', 'publicOnStart'].forEach(k => { if (k in s) cfg[k] = !!s[k]; });
  if ('autoStart' in s && process.platform !== 'linux') app.setLoginItemSettings({ openAtLogin: cfg.autoStart, args: ['--hidden'] });
  saveCfg(); buildTray();
}
async function resetMode() {
  if (FIXED) return route();
  await stopHost();
  cfg.mode = null; cfg.server = ''; saveCfg();
  quitting = true; app.relaunch(); app.exit(0);
}
function status() {
  return {
    version: app.getVersion(), platform: process.platform, mode: cfg.mode, server: cfg.server, fixed: !!FIXED, update: upd,
    settings: { minimizeToTray: cfg.minimizeToTray, startMinimized: cfg.startMinimized, autoStart: cfg.autoStart, publicOnStart: cfg.publicOnStart },
    host: server ? { running: true, storage: server.storage, storageKind: server.storageKind, port: server.port, httpsPort: server.httpsPort, ips: server.ips, stats: server.stats(), dataDir: server.dataDir } : { running: false },
    tunnel: { state: tunnel.state, url: tunnel.url, error: tunnel.error }
  };
}
function pushStatus() { [win, panel].forEach(w => { if (w && !w.isDestroyed()) w.webContents.send('status', status()); }); }

/* ---------- comunicação com as telas ---------- */
const isLocal = e => (e.senderFrame && e.senderFrame.url || '').startsWith('file:');
ipcMain.handle('info', () => status());
ipcMain.handle('settings', (e, s) => { setSettings(s || {}); return status(); });
ipcMain.handle('reset', () => resetMode());
ipcMain.handle('retry', () => route());
ipcMain.handle('panel', () => { if (cfg.mode === 'host') openPanel(); });
// só o painel local do app (arquivo do próprio programa) pode mexer no túnel e no banco; páginas da internet não
ipcMain.handle('tunnel', (e, on) => { if (!isLocal(e)) return status(); on ? startTunnel() : stopTunnel(); return status(); });
ipcMain.handle('db:get', e => (isLocal(e) ? { url: cfg.supabaseUrl, hasKey: !!(cfg.supabaseKey || cfg.supabaseToken) } : {}));
ipcMain.handle('db:set', async (e, d) => {
  if (!isLocal(e)) return { ok: false, erro: 'Não permitido.' };
  const prev = { url: cfg.supabaseUrl, key: cfg.supabaseKey, token: cfg.supabaseToken };
  cfg.supabaseUrl = String(d.url || '').trim(); if (d.key !== undefined) { cfg.supabaseKey = String(d.key || '').trim(); cfg.supabaseToken = ''; }
  if (d.clear) { cfg.supabaseUrl = ''; cfg.supabaseKey = ''; cfg.supabaseToken = ''; }
  try {
    if (server) { await server.stop(); server = null; } await startHost(); saveCfg();
    if (win && !win.isDestroyed()) win.loadURL('http://localhost:' + server.port);
    pushStatus(); return { ok: true, storage: server.storage };
  } catch (err) {
    cfg.supabaseUrl = prev.url; cfg.supabaseKey = prev.key; cfg.supabaseToken = prev.token;
    try { if (server) { await server.stop(); server = null; } await startHost(); if (win && !win.isDestroyed()) win.loadURL('http://localhost:' + server.port); } catch {}
    pushStatus(); return { ok: false, erro: err.message };
  }
});
ipcMain.handle('copy', (e, t) => { clipboard.writeText(String(t || '')); return true; });
ipcMain.handle('update:get', () => upd);
ipcMain.handle('update:check', () => checkUpdate());
ipcMain.handle('update:install', () => installUpdate());
ipcMain.handle('openData', () => { if (server) shell.openPath(server.dataDir); });
ipcMain.handle('test', async (e, url) => {
  if (!isLocal(e)) return { ok: false };
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : 'http://' + url);
    const r = await Promise.race([net.fetch(u.origin + '/api/config', { bypassCustomProtocolHandlers: true }), new Promise((_, rej) => setTimeout(() => rej(new Error('tempo esgotado')), 8000))]);
    if (!r.ok) return { ok: false, erro: 'Esse endereço respondeu, mas não parece ser um servidor Anarchy.' };
    const j = await r.json(); if (!j.iceServers) return { ok: false, erro: 'Esse endereço não é um servidor Anarchy.' };
    return { ok: true, url: u.origin };
  } catch (err) { return { ok: false, erro: 'Não consegui conectar (' + err.message + '). Confira o endereço e se o servidor está ligado.' }; }
});
ipcMain.handle('choose', async (e, d) => {
  if (!isLocal(e)) return { ok: false };
  if (d.mode === 'host') { cfg.mode = 'host'; saveCfg(); await route(); buildTray(); return { ok: true }; }
  cfg.mode = 'client'; cfg.server = originOf(d.server); saveCfg();
  if (/^http:\/\//i.test(cfg.server) && !/^http:\/\/localhost/i.test(cfg.server)) { quitting = true; app.relaunch(); app.exit(0); return { ok: true }; }
  await route(); return { ok: true };
});

/* seletor de tela */
// A janela abre na hora; a lista de telas e janelas (que pode demorar com muitas janelas abertas) carrega em paralelo.
let pickResolve = null, pickSources = [], pickReady = Promise.resolve([]);
let lastPick = null; // última tela escolhida: reusada se o app pedir de novo sem som (quando o Windows não deixa capturar o áudio)
let noLoopback = false; // o som do PC já falhou nesta sessão: nem tenta de novo (evita a espera e o erro)
ipcMain.handle('picker:sources', async () => {
  await pickReady;
  return pickSources.map(s => ({ id: s.id, name: s.name, thumb: s.thumbnail.toDataURL(), icon: s.appIcon ? s.appIcon.toDataURL() : null, screen: s.id.startsWith('screen') }));
});
ipcMain.handle('picker:choose', (e, id) => { if (pickResolve) pickResolve(id); pickResolve = null; if (picker && !picker.isDestroyed()) picker.close(); });
function askSource() {
  return new Promise(resolve => {
    if (picker && !picker.isDestroyed()) { picker.focus(); return resolve(null); }
    pickResolve = resolve; pickSources = [];
    pickReady = desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 320, height: 180 }, fetchWindowIcons: true })
      .then(l => { pickSources = l; return l; })
      .catch(() => { pickSources = []; return []; });
    picker = new BrowserWindow({ width: 860, height: 620, minWidth: 520, minHeight: 420, parent: win, modal: true, show: false, title: 'Compartilhar tela', icon: asset('icon.png'), backgroundColor: '#14171c', autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: false } });
    picker.setMenu(null);
    picker.once('ready-to-show', () => { if (picker && !picker.isDestroyed()) picker.show(); });
    showLocal(picker, 'picker');
    picker.on('closed', () => { if (pickResolve) { pickResolve(null); pickResolve = null; } picker = null; });
  });
}

/* ---------- som do compartilhamento de tela, sem o eco da call ----------
   Igual ao Discord: o somtela.exe usa a "process loopback" do Windows 10 2004+ / 11.
   Tela inteira: som de tudo MENOS o Anarchy (as vozes da call não voltam para quem falou).
   Janela: só o som do programa daquela janela. */
const SOMTELA = app.isPackaged ? path.join(process.resourcesPath, 'somtela.exe') : path.join(__dirname, 'native', 'somtela.exe');
const somtelaOk = process.platform === 'win32' && +(require('os').release().split('.')[2] || 0) >= 19041 && fs.existsSync(SOMTELA);
let lastShare = null, somProc = null;
function somStop() { const p = somProc; somProc = null; if (p) { try { p.stdin.end(); } catch {} try { p.kill(); } catch {} } }
ipcMain.handle('somtela:start', e => new Promise(resolve => {
  somStop();
  if (!somtelaOk || !lastShare || Date.now() - lastShare.at > 60000) return resolve(false);
  // janela do próprio Anarchy: o som dela são as vozes da call, então vai sem som
  if (BrowserWindow.getAllWindows().some(w => { try { return w.getMediaSourceId() === lastShare.id; } catch { return false; } })) return resolve(false);
  const m = /^window:(\d+):/.exec(lastShare.id);
  const args = m ? ['janela', m[1]] : ['excluir', String(process.pid)];
  let p;
  try { p = spawn(SOMTELA, args, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }); } catch { return resolve(false); }
  somProc = p;
  const wc = e.sender; let ok = false, done = false;
  const finish = v => { if (done) return; done = true; clearTimeout(t); if (!v && somProc === p) somStop(); resolve(v); };
  const t = setTimeout(() => finish(false), 4000);
  p.stderr.on('data', d => { const s = String(d); if (/^ok/m.test(s)) { ok = true; finish(true); } else if (/erro/.test(s)) finish(false); });
  // junta em pedaços de ~20 ms antes de mandar para a janela
  let parts = [], len = 0;
  p.stdout.on('data', d => {
    if (somProc !== p) return;
    parts.push(d); len += d.length;
    if (len >= 3840) { if (!wc.isDestroyed()) wc.send('somtela:data', Buffer.concat(parts, len)); parts = []; len = 0; }
  });
  p.on('error', () => finish(false));
  p.on('exit', () => { finish(false); if (somProc === p) { somProc = null; if (ok && !wc.isDestroyed()) wc.send('somtela:end'); } });
}));
ipcMain.handle('somtela:stop', () => somStop());
app.on('will-quit', somStop);

/* ---------- início ---------- */
app.on('second-instance', showMain);
app.on('certificate-error', (e, wc, url, err, cert, cb) => {
  const ok = (cfg.mode === 'client' && hostOf(url) === hostOf(cfg.server)) || /^https:\/\/localhost[:/]/.test(url);
  if (ok) { e.preventDefault(); cb(true); } else cb(false);
});
app.whenReady().then(() => {
  // "abrir com o Windows": o programa passou de Discordia.exe para Anarchy.exe; regrava o atalho de início com o caminho novo
  if (cfg.autoStart && process.platform === 'win32' && app.isPackaged) app.setLoginItemSettings({ openAtLogin: true, args: ['--hidden'] });
  const ses = session.defaultSession;
  const allowed = ['media', 'notifications', 'clipboard-sanitized-write', 'clipboard-read', 'fullscreen', 'display-capture', 'speaker-selection'];
  ses.setPermissionRequestHandler((wc, perm, cb) => cb(allowed.includes(perm)));
  ses.setPermissionCheckHandler((wc, perm) => allowed.includes(perm));
  ses.setDisplayMediaRequestHandler(async (req, cb) => {
    let src = null;
    // segunda tentativa, sem som, logo depois da primeira: usa a mesma tela sem abrir o seletor de novo
    if (!req.audioRequested && lastPick && Date.now() - lastPick.at < 15000) { src = lastPick.src; lastPick = null; noLoopback = true; }
    else {
      const id = await askSource();
      src = id && pickSources.find(s => s.id === id);
      lastPick = src ? { src, at: Date.now() } : null;
    }
    if (!src) return cb({});
    const grant = { video: src };
    lastShare = { id: src.id, at: Date.now() };
    // O som vai pelo somtela.exe (sem o eco da call). O 'loopback' do Chromium pegava o som do PC
    // inteiro, vozes da call incluídas: só fica para quem não tem o somtela (outros sistemas).
    if (req.audioRequested && !somtelaOk && !noLoopback && process.platform !== 'win32' && src.id.startsWith('screen')) grant.audio = 'loopback';
    cb(grant);
  });
  buildTray();
  createWindow();
  // procura atualização 5 s depois de abrir, a cada 1 minuto e quando a pessoa volta para a janela
  setTimeout(checkUpdate, 5000);
  setInterval(checkUpdate, 60e3);
  app.on('browser-window-focus', () => { if (Date.now() - lastCheck > 20e3) checkUpdate(); });
});
app.on('window-all-closed', () => { if (quitting || !cfg.minimizeToTray) app.quit(); });
app.on('before-quit', async e => {
  quitting = true;
  if (server || tunnel.proc) { e.preventDefault(); await stopHost(); app.exit(0); }
});
