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
      // PYTHONIOENCODING: no Windows o yt-dlp escrevia os erros com acento estragado ("you�re")
      execFile(bin, args, { timeout: ms, maxBuffer: 64 * 1024 * 1024, windowsHide: true, env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' } }, (err, out, errOut) => {
        if (err) {
          // o motivo vem só do que o yt-dlp escreveu (err.message traz a linha de comando inteira, que não explica nada
          // e fazia o bot achar que o yt-dlp era antigo, porque o comando tem "--js-runtimes")
          const lines = String(errOut || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          const why = err.killed || err.signal ? `o yt-dlp demorou mais de ${Math.round(ms / 1000)} s e foi parado`
            : (lines.filter(l => /ERROR/.test(l)).pop() || lines[lines.length - 1] || `o yt-dlp parou com erro (código ${err.code})`);
          log(`   DJ: yt-dlp falhou (${args.filter(a => !/^node:/.test(a)).slice(-1)[0]}): ${lines.slice(-4).join(' | ') || why}`);
          const e = new Error(why.replace(/^ERROR:\s*(\[[^\]]+\]\s*)?/, '').slice(0, 300)); e.stderr = lines.join('\n'); return reject(e);
        }
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
  // yt-dlp antigo que não conhece a opção --js-runtimes (olha só o erro dele, não a linha de comando)
  const oldYtdlp = e => /no such option:?\s*--js-runtimes/i.test(e.stderr || '');
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

  /* O YouTube às vezes bloqueia o servidor por um tempo ("Sign in to confirm you're not a bot").
     Quando isso acontece, o DJ procura a mesma música no SoundCloud e, por 15 minutos,
     as buscas por nome vão direto para o SoundCloud (insistir no YouTube só prolonga o bloqueio). */
  const isBlock = e => /confirm you.?re not a bot|sign in to confirm|HTTP Error 429|too many requests/i.test(e && e.message || '');
  let ytBlockedUntil = 0;
  const isYouTube = q => { try { return /(^|\.)(youtube\.com|youtu\.be)$/.test(new URL(q).hostname); } catch { return false; } };
  // nome do vídeo pelo oEmbed (funciona mesmo com o YouTube bloqueando o yt-dlp)
  async function ytName(url) {
    try {
      const r = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(url), { signal: AbortSignal.timeout(8000) });
      if (!r.ok) return null;
      const j = await r.json();
      return j.title ? String(j.title).replace(/\((official|oficial)[^)]*\)|\[(official|oficial)[^\]]*\]/ig, '').trim() : null;
    } catch { return null; }
  }
  async function soundcloud(name) {
    const r = await extract('scsearch1:' + name, name);
    r.via = 'SoundCloud';
    return r;
  }

  // pega a música: link (YouTube, SoundCloud, mp3...) ou nome (busca no YouTube). Devolve o endereço do áudio.
  // name: o nome da música, quando já se sabe (playlists), para procurar em outro lugar se o YouTube bloquear
  async function resolve(q, { name = null } = {}) {
    if (isUrl(q)) { const u = await publicUrl(q); const d = await direct(u); if (d) return d; }
    if (process.env.DJ_SEM_YTDLP) throw new Error('neste servidor só funcionam links diretos de áudio (mp3, ogg...)');
    await ensure();
    const byName = !isUrl(q), yt = byName || isYouTube(q);
    // YouTube bloqueado há pouco: busca por nome vai direto para o SoundCloud
    if (yt && Date.now() < ytBlockedUntil) {
      const n = name || (byName ? q : await ytName(q));
      if (n) { try { return await soundcloud(n); } catch {} }
    }
    try { return await extract(byName ? 'ytsearch1:' + q : q, q); }
    catch (e) {
      if (!yt) throw e;
      const block = isBlock(e);
      if (block) {
        if (Date.now() >= ytBlockedUntil) log('   DJ: o YouTube bloqueou o servidor por um tempo (verificação de robô). Usando o SoundCloud por 15 minutos.');
        ytBlockedUntil = Date.now() + 15 * 60e3;
      }
      // qualquer falha no YouTube (bloqueio, demora, mudança no site): procura a mesma música no SoundCloud
      const n = name || (byName ? q : await ytName(q));
      if (n) { try { return await soundcloud(n); } catch {} }
      if (block) throw new Error('o YouTube bloqueou o servidor por um tempo (pediu para provar que não é robô) e não achei essa música no SoundCloud. Tente de novo daqui a alguns minutos, ou mande um link do SoundCloud');
      throw new Error(`o YouTube falhou (${e.message}) e não achei essa música no SoundCloud`);
    }
  }
  async function extract(target, q) {
    // prefere arquivo comum (http) a áudio em pedaços (m3u8/HLS), que o app não toca
    // (sem arquivo comum, como no SoundCloud de hoje: prefere os pedaços em MP3, que juntos viram um MP3 normal)
    const fmtSel = 'bestaudio[ext=m4a][protocol^=http]/bestaudio[acodec=opus][protocol^=http]/bestaudio[protocol^=http]/bestaudio[ext=mp3]/bestaudio[acodec=mp3]/bestaudio[ext=m4a]/bestaudio/best';
    const args = ['-J', '--no-playlist', '--no-warnings', '-f', fmtSel, target];
    let out;
    try { out = await run([...jsArgs, ...args], 60000); }
    catch (e) { if (oldYtdlp(e)) out = await run(args, 60000); else throw e; } // yt-dlp antigo, sem essa opção
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
      src: { url: fmt.url, headers: fmt.http_headers || j.http_headers || {}, mime: fmt.ext === 'webm' ? 'audio/webm' : fmt.ext === 'mp3' || fmt.acodec === 'mp3' ? 'audio/mpeg' : fmt.ext === 'ogg' || fmt.ext === 'opus' ? 'audio/ogg' : 'audio/mp4',
        // em pedaços (HLS): o servidor junta antes de mandar para o app (server.js, hlsBuffer)
        hls: /m3u8/.test(fmt.protocol || '') || /\.m3u8(\?|$)/i.test(fmt.url) },
      at: Date.now()
    };
  }
  /* ---------- playlists e álbuns ----------
     A lista vem "rasa" (só nome, duração e link de cada música), o que é rápido mesmo com 200 músicas.
     O áudio de cada uma só é buscado perto da hora de tocar. */
  const MAX_LIST = 200;
  // o link é de uma playlist/álbum? (mix automático do YouTube, list=RD..., conta como música só)
  function isList(q) {
    if (!isUrl(q)) return false;
    let u; try { u = new URL(q); } catch { return false; }
    const h = u.hostname.replace(/^(www|m|music)\./, ''), list = u.searchParams.get('list') || '';
    if (/(^|\.)youtube\.com$|^youtu\.be$/.test(h)) return (!!list && !/^RD/.test(list)) || /^\/browse\/MPRE/.test(u.pathname) || /^\/playlist/.test(u.pathname);
    if (h === 'soundcloud.com') return /\/sets\//.test(u.pathname);
    if (/bandcamp\.com$/.test(h)) return /^\/album\//.test(u.pathname);
    if (h === 'open.spotify.com') return /^\/(intl-[a-z]+\/)?(album|playlist)\//.test(u.pathname);
    return false;
  }
  const isSpotify = q => { try { return new URL(q).hostname === 'open.spotify.com'; } catch { return false; } };
  const ytThumb = id => id && /^[\w-]{11}$/.test(id) ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
  async function flat(target, extra = []) {
    await ensure();
    const args = ['-J', '--flat-playlist', '--no-warnings', '--playlist-end', String(MAX_LIST), ...extra, target];
    let out;
    try { out = await run([...jsArgs, ...args], 60000); }
    catch (e) { if (oldYtdlp(e)) out = await run(args, 60000); else throw e; }
    return JSON.parse(out);
  }
  function fromFlat(e) {
    const url = e.url && isUrl(e.url) ? e.url : e.ie_key === 'Youtube' || /^[\w-]{11}$/.test(e.id || '') ? 'https://www.youtube.com/watch?v=' + e.id : e.webpage_url || null;
    if (!url || e.availability === 'private' || /^\[(Private|Deleted)/i.test(e.title || '')) return null;
    const th = Array.isArray(e.thumbnails) && e.thumbnails.length ? e.thumbnails[e.thumbnails.length - 1].url : e.thumbnail;
    return {
      title: String(e.title || 'Sem título').slice(0, 200), by: String(e.channel || e.uploader || e.artist || '').slice(0, 100),
      page: url.slice(0, 500), dur: Math.round(+e.duration || 0),
      thumb: th && /^https:\/\//.test(th) ? String(th).slice(0, 500) : ytThumb(e.id), q: url
    };
  }
  // Spotify não deixa baixar o áudio: pega a lista de músicas da página pública e cada uma é buscada no YouTube
  async function spotify(q) {
    const u = await publicUrl(q);
    const m = /\/(album|playlist|track)\/([A-Za-z0-9]+)/.exec(u.pathname);
    if (!m) throw new Error('link do Spotify não reconhecido');
    const r = await fetch(`https://open.spotify.com/embed/${m[1]}/${m[2]}`, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept-Language': 'pt-BR,pt;q=0.9' } });
    if (!r.ok) throw new Error('o Spotify não respondeu (HTTP ' + r.status + ')');
    const html = await r.text();
    const js = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
    if (!js) throw new Error('não consegui ler a página do Spotify');
    const ent = JSON.parse(js[1])?.props?.pageProps?.state?.data?.entity;
    if (!ent) throw new Error('não consegui ler a página do Spotify');
    const cover = (ent.coverArt?.sources || ent.visualIdentity?.image || []).slice(-1)[0]?.url || null;
    const items = m[1] === 'track' ? [{ title: ent.name || ent.title, subtitle: (ent.artists || []).map(a => a.name).join(', '), duration: ent.duration }] : (ent.trackList || []);
    const tracks = items.slice(0, MAX_LIST).filter(t => t && t.title).map(t => ({
      title: String(t.title).slice(0, 200), by: String(t.subtitle || '').replace(/ /g, ' ').slice(0, 100), page: null,
      dur: Math.round((+t.duration || 0) / 1000), thumb: cover && /^https:\/\//.test(cover) ? cover : null,
      q: `${t.title} ${String(t.subtitle || '').replace(/ /g, ' ')} audio`.slice(0, 200), keep: true
    }));
    if (!tracks.length) throw new Error('essa lista do Spotify está vazia');
    return { title: String(ent.name || ent.title || 'Spotify').slice(0, 200), tracks, single: m[1] === 'track' };
  }
  // playlist ou álbum por link; ou "álbum NOME": procura no YouTube a playlist do álbum
  async function resolveList(q, { album = false } = {}) {
    if (process.env.DJ_SEM_YTDLP) throw new Error('neste servidor só funcionam links diretos de áudio (mp3, ogg...)');
    if (isUrl(q) && isSpotify(q)) return spotify(q);
    let target = q;
    if (album) {
      // filtro "playlists" da busca do YouTube: os álbuns aparecem como playlists (OLAK5uy_...)
      const s = await flat('https://www.youtube.com/results?search_query=' + encodeURIComponent(q + ' album') + '&sp=EgIQAw%253D%253D', ['--playlist-end', '8']);
      const hits = (s.entries || []).filter(e => e && (e.url || '').includes('list='));
      const pick = hits.find(e => /list=OLAK5uy_/.test(e.url)) || hits[0];
      if (!pick) throw new Error('não achei nenhum álbum com esse nome');
      target = pick.url;
    } else await publicUrl(q);
    const j = await flat(target);
    const tracks = (j.entries || []).filter(Boolean).map(fromFlat).filter(Boolean);
    if (!tracks.length) throw new Error('essa playlist está vazia ou é privada');
    return { title: String(j.title || 'Playlist').replace(/^Album - /, '').slice(0, 200), tracks, single: false };
  }

  return { resolve, resolveList, isList, isSpotify, ensure, publicUrl, _spotify: spotify };
}
module.exports = { createMusic };
