// DJ do Anarchy: busca músicas com o yt-dlp (YouTube, SoundCloud, links diretos de áudio...).
// O yt-dlp é baixado sozinho do GitHub oficial (github.com/yt-dlp/yt-dlp) para server/bin e se atualiza 1x por dia.
// Para usar um yt-dlp já instalado: YTDLP_PATH=caminho no .env.
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

function createMusic({ log = () => {} } = {}) {
  const BIN_DIR = path.join(__dirname, 'bin');
  const exeName = process.platform === 'win32' ? 'yt-dlp.exe' : process.platform === 'darwin' ? 'yt-dlp_macos' : 'yt-dlp_linux';
  const own = path.join(BIN_DIR, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
  let bin = process.env.YTDLP_PATH || own;
  let ready = null; // promessa: o yt-dlp está pronto para uso

  async function download() {
    fs.mkdirSync(BIN_DIR, { recursive: true });
    const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${exeName}`;
    log('   DJ: baixando o yt-dlp (github.com/yt-dlp)...');
    const r = await fetch(url, { redirect: 'follow' });
    if (!r.ok) throw new Error('download do yt-dlp falhou (HTTP ' + r.status + ')');
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 1e6) throw new Error('download do yt-dlp veio incompleto');
    const tmp = own + '.novo';
    fs.writeFileSync(tmp, buf); if (process.platform !== 'win32') fs.chmodSync(tmp, 0o755);
    fs.renameSync(tmp, own);
    log('   DJ: yt-dlp pronto.');
  }
  function run(args, ms = 45000) {
    return new Promise((resolve, reject) => {
      execFile(bin, args, { timeout: ms, maxBuffer: 64 * 1024 * 1024, windowsHide: true }, (err, out, errOut) => {
        if (err) { const why = String(errOut || err.message).split(/\r?\n/).filter(l => /ERROR|error/.test(l)).pop() || err.message; return reject(new Error(why.replace(/^ERROR:\s*/, '').slice(0, 300))); }
        resolve(out);
      });
    });
  }
  function ensure() {
    if (!ready) ready = (async () => {
      if (!process.env.YTDLP_PATH && !fs.existsSync(own)) await download();
      return true;
    })().catch(e => { ready = null; throw e; });
    return ready;
  }
  // atualiza 1x por dia (o YouTube muda e o yt-dlp acompanha)
  async function update() {
    if (process.env.YTDLP_PATH || !fs.existsSync(own)) return;
    try { const out = await run(['-U'], 120000); if (/Updated yt-dlp to/i.test(out)) log('   DJ: yt-dlp atualizado.'); } catch (e) { log('   DJ: não consegui atualizar o yt-dlp (' + e.message + ').'); }
  }
  // DJ_SEM_YTDLP=1: não baixa o yt-dlp (só links diretos de áudio funcionam)
  if (!process.env.DJ_SEM_YTDLP) {
    setTimeout(() => ensure().then(update).catch(e => log('   DJ: ' + e.message)), 5000).unref();
    setInterval(update, 24 * 3600e3).unref();
  }

  // o YouTube exige rodar um pedaço de JavaScript para liberar o áudio: usa o próprio Node deste servidor
  const jsArgs = ['--js-runtimes', 'node:' + process.execPath];
  const isUrl = q => /^https?:\/\//i.test(q);

  // link de outro lugar: só endereços públicos (ninguém usa o bot para o servidor acessar a rede da casa)
  async function publicUrl(q) {
    let u; try { u = new URL(q); } catch { throw new Error('link inválido'); }
    if (!/^https?:$/.test(u.protocol)) throw new Error('link inválido');
    const host = u.hostname.replace(/^\[|\]$/g, '');
    const { address } = await require('dns').promises.lookup(host).catch(() => ({ address: null }));
    if (!address) throw new Error('não consegui acessar esse site');
    const priv = /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(address) || /^(::1|f[cd]|fe80|::ffff:(127|10|192\.168)\.)/i.test(address) || address === '::';
    if (priv) throw new Error('esse endereço não é permitido');
    return u;
  }
  // link direto de um arquivo de áudio: toca sem precisar do yt-dlp
  async function direct(u) {
    const r = await fetch(u, { method: 'HEAD', redirect: 'follow' }).catch(() => null);
    const type = r && r.ok ? (r.headers.get('content-type') || '').split(';')[0] : '';
    if (!/^audio\//.test(type) && !/\.(mp3|ogg|oga|opus|wav|m4a|aac|flac|webm)$/i.test(u.pathname)) return null;
    const name = decodeURIComponent(u.pathname.split('/').pop() || 'áudio').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ');
    return { title: name.slice(0, 200) || 'Áudio', by: u.hostname, page: u.href, dur: 0, thumb: null, src: { url: r && r.url ? r.url : u.href, headers: {}, mime: type || 'audio/mpeg' }, at: Date.now() };
  }

  // pega a música: link (YouTube, SoundCloud, mp3...) ou nome (busca no YouTube). Devolve o endereço do áudio.
  async function resolve(q) {
    if (isUrl(q)) { const u = await publicUrl(q); const d = await direct(u); if (d) return d; }
    if (process.env.DJ_SEM_YTDLP) throw new Error('neste servidor só funcionam links diretos de áudio (mp3, ogg...)');
    await ensure();
    const target = isUrl(q) ? q : 'ytsearch1:' + q;
    const args = ['-J', '--no-playlist', '--no-warnings', '-f', 'bestaudio[ext=m4a]/bestaudio[acodec=opus]/bestaudio/best', target];
    let out;
    try { out = await run([...jsArgs, ...args]); }
    catch (e) { if (/js-runtimes|no such option/i.test(e.message)) out = await run(args); else throw e; } // yt-dlp antigo, sem essa opção
    let j = JSON.parse(out);
    if (j && Array.isArray(j.entries)) j = j.entries.find(Boolean);
    if (!j) throw new Error('não achei nenhuma música com esse nome');
    if (j.is_live || j.live_status === 'is_live') throw new Error('transmissões ao vivo não funcionam');
    const fmt = j.url ? j : (j.requested_formats || []).find(f => f.url) || null;
    if (!fmt || !fmt.url) throw new Error('não consegui pegar o áudio dessa música');
    const thumb = j.thumbnail || (Array.isArray(j.thumbnails) && j.thumbnails.length ? j.thumbnails[j.thumbnails.length - 1].url : null);
    return {
      title: String(j.title || j.fulltitle || 'Sem título').slice(0, 200),
      by: String(j.uploader || j.channel || j.artist || '').slice(0, 100),
      page: String(j.webpage_url || (isUrl(q) ? q : '')).slice(0, 500),
      dur: Math.round(+j.duration || 0),
      thumb: thumb && /^https:\/\//.test(thumb) ? String(thumb).slice(0, 500) : null,
      src: { url: fmt.url, headers: fmt.http_headers || j.http_headers || {}, mime: fmt.ext === 'webm' ? 'audio/webm' : fmt.ext === 'mp3' ? 'audio/mpeg' : fmt.ext === 'ogg' || fmt.ext === 'opus' ? 'audio/ogg' : 'audio/mp4' },
      at: Date.now()
    };
  }
  return { resolve, ensure, publicUrl };
}
module.exports = { createMusic };
