/* Anarchy — Rádio do grupo e letras do karaokê (ajudantes do DJ em server.js).
   Rádio: quando a fila do DJ acaba, ele continua tocando músicas da estação escolhida (/radio funk).
   Letras: o servidor procura a letra sincronizada da música atual no LRCLIB (serviço livre de letras);
   só o nome da música vai na busca. */
const STATIONS = {
  pop: ['📻 Pop', ['Dua Lipa Levitating', 'The Weeknd Blinding Lights', 'Harry Styles As It Was', 'Taylor Swift Shake It Off', 'Bruno Mars Uptown Funk', 'Ed Sheeran Shape of You', 'Billie Eilish Bad Guy', 'Olivia Rodrigo good 4 u', 'Miley Cyrus Flowers', 'Sabrina Carpenter Espresso', 'Katy Perry Firework', 'Lady Gaga Bad Romance', 'Justin Bieber Peaches', 'Doja Cat Say So', 'Ariana Grande 7 rings']],
  brasil: ['🇧🇷 Pop BR', ['Anitta Envolver', 'Ludmilla Maldivas', 'Pabllo Vittar Amor de Que', 'Luísa Sonza Chico', 'Jão Idiota', 'Marina Sena Por Supuesto', 'Iza Pesadão', 'Vitor Kley O Sol', 'Melim Ouvi Dizer', 'Gloria Groove Bonekinha', 'Lagum Deixa', 'Tiago Iorc Amei Te Ver']],
  funk: ['🔊 Funk', ['MC Kevinho Olha a Explosão', 'Anitta Show das Poderosas', 'MC Livinho Fazer Falta', 'Ludmilla Hoje', 'MC Hariel Hino dos Cria', 'MC Ryan SP Tubarão Te Amo', 'Kevin o Chris Tudo OK', 'MC Don Juan Amar Amei', 'Dennis DJ Malandramente', 'MC Daniel Bonde do Tigrão']],
  sertanejo: ['🤠 Sertanejo', ['Marília Mendonça Infiel', 'Henrique e Juliano Liberdade Provisória', 'Jorge e Mateus Logo Eu', 'Gusttavo Lima Bloqueado', 'Maiara e Maraisa 10%', 'Zé Neto e Cristiano Notificação Preferida', 'Luan Santana Acordando o Prédio', 'Simone Mendes Erro Gostoso', 'Ana Castela Pipoco', 'Matheus e Kauan Que Sorte a Nossa']],
  rock: ['🎸 Rock', ['Queen Bohemian Rhapsody', 'AC/DC Back in Black', 'Nirvana Smells Like Teen Spirit', 'Guns N Roses Sweet Child O Mine', 'Arctic Monkeys Do I Wanna Know', 'Foo Fighters Everlong', 'Linkin Park Numb', 'The Killers Mr. Brightside', 'Legião Urbana Tempo Perdido', 'Charlie Brown Jr Só os Loucos Sabem', 'Titãs Epitáfio', 'Red Hot Chili Peppers Californication']],
  rap: ['🎤 Rap', ['Racionais MCs Negro Drama', 'Matuê Quer Voar', 'Filipe Ret Neurótico de Guerra', 'Djonga Olho de Tigre', 'Kendrick Lamar HUMBLE.', 'Eminem Lose Yourself', 'Drake Gods Plan', 'Travis Scott SICKO MODE', 'Veigh Novo Balanço', 'Orochi Balão']],
  lofi: ['☕ Lo-fi', ['lofi hip hop beats to relax', 'Nujabes Feather', 'lofi chill study beats', 'jazz hop cafe lofi', 'lofi rainy night beats', 'chillhop essentials', 'lofi sleep beats', 'lofi coffee shop music']],
  eletronica: ['🎧 Eletrônica', ['Avicii Wake Me Up', 'Alok Hear Me Now', 'Calvin Harris Summer', 'David Guetta Titanium', 'Martin Garrix Animals', 'Daft Punk One More Time', 'Swedish House Mafia Dont You Worry Child', 'Vintage Culture Free', 'Kygo Firestone', 'Zedd Clarity']],
  anos80: ['🕺 Anos 80 e 90', ['a-ha Take On Me', 'Michael Jackson Billie Jean', 'Rick Astley Never Gonna Give You Up', 'Bon Jovi Livin on a Prayer', 'Whitney Houston I Wanna Dance with Somebody', 'Backstreet Boys I Want It That Way', 'Spice Girls Wannabe', 'Madonna Like a Prayer', 'Cyndi Lauper Girls Just Want to Have Fun', 'Europe The Final Countdown', 'Blitz Você Não Soube Me Amar', 'RPM Olhar 43']],
  games: ['🎮 Trilhas de jogos', ['Minecraft Sweden C418', 'Undertale Megalovania', 'Zelda Main Theme', 'Super Mario Bros Theme', 'Halo Theme', 'Skyrim Far Horizons', 'Hollow Knight Main Theme', 'Pokemon Red Blue Opening', 'Tetris Theme Korobeiniki', 'Sonic Green Hill Zone']]
};
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
function stationOf(arg) {
  const a = norm(arg).replace(/[^a-z0-9]/g, '');
  const alias = { popbr: 'brasil', br: 'brasil', nacional: 'brasil', sertanejo: 'sertanejo', sertao: 'sertanejo', lofi: 'lofi', chill: 'lofi', eletro: 'eletronica', edm: 'eletronica', eletronica: 'eletronica', anos80: 'anos80', anos90: 'anos80', '80': 'anos80', '90': 'anos80', flashback: 'anos80', jogos: 'games', games: 'games', trap: 'rap', hiphop: 'rap' };
  return STATIONS[a] ? a : alias[a] || null;
}
function radioPick(st) {
  const s = STATIONS[st.radio]; if (!s) return null;
  st.radioUsed = st.radioUsed || [];
  let pool = s[1].filter(q => !st.radioUsed.includes(q)); if (!pool.length) { st.radioUsed = []; pool = s[1]; }
  const q = pool[Math.floor(Math.random() * pool.length)];
  st.radioUsed.push(q); if (st.radioUsed.length > s[1].length - 1) st.radioUsed.shift();
  return q;
}

// tira do título o que atrapalha a busca da letra: (Official Video), [Clipe], "ft. fulano", "| ..."
const cleanTitle = t => String(t || '').replace(/\[[^\]]*\]|\([^)]*\)|【[^】]*】/g, ' ').replace(/\b(official|oficial|video|vídeo|clipe|lyrics?|letra|audio|áudio|hd|4k|mv|remaster(ed)?|ao vivo|live)\b/gi, ' ').replace(/\s(ft|feat)\.?\s.*$/i, ' ').replace(/[|·•].*$/, ' ').replace(/\s+/g, ' ').trim();
function parseLrc(lrc) {
  const out = [];
  for (const line of String(lrc || '').split('\n')) {
    const m = /^\s*((?:\[\d+:\d+(?:[.:]\d+)?\])+)(.*)$/.exec(line); if (!m) continue;
    const text = m[2].trim();
    for (const t of m[1].matchAll(/\[(\d+):(\d+)(?:[.:](\d+))?\]/g)) out.push([+t[1] * 60 + +t[2] + (t[3] ? +('0.' + t[3]) : 0), text]);
  }
  return out.sort((a, b) => a[0] - b[0]);
}
const cache = new Map(); // título limpo -> letra (ou null)
async function lyricsFor(t) {
  const title = cleanTitle(t.title), by = t.by ? cleanTitle(t.by).replace(/\s*-\s*topic$/i, '') : '';
  const key = norm(title + ' ' + by); if (cache.has(key)) return cache.get(key);
  const get = async q => {
    const r = await fetch('https://lrclib.net/api/search?q=' + encodeURIComponent(q), { headers: { 'user-agent': 'Anarchy chat app (karaoke)' }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    return r.json();
  };
  let res = [];
  try {
    res = await get(by && !norm(title).includes(norm(by)) ? `${title} ${by}` : title);
    if (!res.length && / - /.test(title)) res = await get(title.replace(/ - /, ' '));
  } catch { return null; }
  const best = res.find(x => x.syncedLyrics && (!t.dur || !x.duration || Math.abs(x.duration - t.dur) < 12)) || res.find(x => x.syncedLyrics) || res.find(x => x.plainLyrics);
  const out = best ? { title: best.trackName, by: best.artistName, synced: best.syncedLyrics ? parseLrc(best.syncedLyrics) : null, plain: best.syncedLyrics ? null : String(best.plainLyrics || '').slice(0, 8000) } : null;
  cache.set(key, out); if (cache.size > 300) cache.delete(cache.keys().next().value);
  return out;
}
module.exports = { STATIONS, stationOf, radioPick, lyricsFor, cleanTitle, parseLrc };
