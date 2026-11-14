// Jogos da call do Anarchy: Desenha e adivinha e Quiz (perguntas ou "adivinhe a música" com o DJ).
// Uma partida por sala de voz. Palavra secreta, respostas certas e pontos ficam aqui no servidor: quem desenha recebe
// a palavra só para si; os outros recebem "_ _ _ _". Os vencedores ganham AnarchyPoints (com teto por dia).
const crypto = require('crypto');

// palavras do Desenha e adivinha (fáceis de desenhar)
const WORDS = ['casa', 'gato', 'cachorro', 'sol', 'lua', 'estrela', 'árvore', 'flor', 'carro', 'bicicleta', 'avião', 'barco', 'peixe', 'pássaro', 'cobra', 'elefante', 'girafa', 'macaco', 'leão', 'tartaruga',
  'pizza', 'hambúrguer', 'sorvete', 'bolo', 'banana', 'maçã', 'melancia', 'abacaxi', 'café', 'pipoca', 'ovo', 'pão', 'queijo', 'cenoura', 'uva',
  'guitarra', 'violão', 'piano', 'bateria', 'microfone', 'fone de ouvido', 'televisão', 'celular', 'computador', 'teclado', 'mouse', 'câmera', 'relógio', 'óculos', 'chapéu',
  'castelo', 'ponte', 'igreja', 'escola', 'hospital', 'farol', 'pirâmide', 'vulcão', 'montanha', 'praia', 'ilha', 'cachoeira', 'arco-íris', 'nuvem', 'chuva', 'raio', 'neve', 'boneco de neve',
  'futebol', 'basquete', 'skate', 'piscina', 'troféu', 'medalha', 'pipa', 'balão', 'presente', 'vela', 'fantasma', 'zumbi', 'vampiro', 'robô', 'alien', 'dragão', 'unicórnio', 'sereia', 'pirata', 'ninja',
  'tesoura', 'martelo', 'chave', 'cadeado', 'lâmpada', 'escada', 'cadeira', 'cama', 'sofá', 'geladeira', 'banheira', 'privada', 'escova de dente', 'guarda-chuva', 'mochila', 'livro', 'lápis', 'foguete', 'satélite', 'coroa'];
// perguntas do Quiz (a primeira opção é a certa; a ordem é embaralhada na hora)
const QUESTIONS = [
  ['Qual é o maior planeta do Sistema Solar?', 'Júpiter', 'Saturno', 'Terra', 'Netuno'], ['Quantos jogadores um time de futebol tem em campo?', '11', '10', '12', '9'],
  ['Qual é a capital da Austrália?', 'Camberra', 'Sydney', 'Melbourne', 'Perth'], ['Em que ano o Brasil foi pentacampeão da Copa?', '2002', '1994', '1998', '2006'],
  ['Qual é o maior oceano do mundo?', 'Pacífico', 'Atlântico', 'Índico', 'Ártico'], ['Quantos lados tem um hexágono?', '6', '5', '7', '8'],
  ['Qual animal é conhecido como o rei da selva?', 'Leão', 'Tigre', 'Elefante', 'Gorila'], ['Qual é o símbolo químico do ouro?', 'Au', 'Ag', 'Go', 'Or'],
  ['Quem pintou a Mona Lisa?', 'Leonardo da Vinci', 'Michelangelo', 'Picasso', 'Van Gogh'], ['Qual é o país mais populoso do mundo (2024)?', 'Índia', 'China', 'EUA', 'Indonésia'],
  ['Qual é a capital do Canadá?', 'Ottawa', 'Toronto', 'Vancouver', 'Montreal'], ['Quantos minutos tem uma partida de futebol (sem acréscimos)?', '90', '80', '100', '120'],
  ['Qual o maior mamífero do mundo?', 'Baleia-azul', 'Elefante', 'Girafa', 'Tubarão-baleia'], ['Qual é o idioma mais falado do mundo (nativos)?', 'Mandarim', 'Inglês', 'Espanhol', 'Hindi'],
  ['Quantos ossos tem o corpo humano adulto?', '206', '186', '226', '196'], ['Qual elemento a água tem além do oxigênio?', 'Hidrogênio', 'Carbono', 'Nitrogênio', 'Hélio'],
  ['Em que continente fica o Egito?', 'África', 'Ásia', 'Europa', 'Oceania'], ['Qual é a moeda do Japão?', 'Iene', 'Yuan', 'Won', 'Rúpia'],
  ['Qual é o rio mais extenso do Brasil (só dentro do país)?', 'São Francisco', 'Amazonas', 'Paraná', 'Tocantins'], ['Quem escreveu "Dom Casmurro"?', 'Machado de Assis', 'José de Alencar', 'Clarice Lispector', 'Jorge Amado'],
  ['Qual é a velocidade da luz (aprox.)?', '300 mil km/s', '30 mil km/s', '3 milhões km/s', '3 mil km/s'], ['Qual é o planeta vermelho?', 'Marte', 'Vênus', 'Mercúrio', 'Júpiter'],
  ['Qual a capital de Minas Gerais?', 'Belo Horizonte', 'Uberlândia', 'Ouro Preto', 'Juiz de Fora'], ['Quantas cores tem o arco-íris?', '7', '6', '8', '5'],
  ['Qual jogo tem o personagem Steve?', 'Minecraft', 'Roblox', 'Terraria', 'Fortnite'], ['Qual é o nome do encanador da Nintendo?', 'Mario', 'Luigi', 'Wario', 'Toad'],
  ['Em "League of Legends", como se chama o mapa principal?', "Summoner's Rift", 'Howling Abyss', 'Twisted Treeline', 'Crystal Scar'], ['Qual empresa criou o Valorant?', 'Riot Games', 'Valve', 'Blizzard', 'Epic Games'],
  ['Qual o nome do Pokémon amarelo mais famoso?', 'Pikachu', 'Raichu', 'Jolteon', 'Psyduck'], ['Qual é o nome do vilão de Harry Potter?', 'Voldemort', 'Sauron', 'Darth Vader', 'Thanos'],
  ['Quantos estados tem o Brasil (sem o DF)?', '26', '27', '25', '24'], ['Qual é o menor país do mundo?', 'Vaticano', 'Mônaco', 'San Marino', 'Malta'],
  ['Que instrumento tem 88 teclas?', 'Piano', 'Órgão', 'Acordeão', 'Teclado de 61'], ['Qual é a fórmula da água?', 'H₂O', 'CO₂', 'O₂', 'H₂O₂'],
  ['Qual é o maior deserto quente do mundo?', 'Saara', 'Atacama', 'Gobi', 'Kalahari'], ['Qual país inventou a pizza?', 'Itália', 'Grécia', 'EUA', 'França'],
  ['Quem é o "Rei do Futebol"?', 'Pelé', 'Maradona', 'Messi', 'Cristiano Ronaldo'], ['Qual é o animal mais rápido do mundo em terra?', 'Guepardo', 'Leão', 'Cavalo', 'Antílope'],
  ['Quantas horas tem uma semana?', '168', '144', '172', '160'], ['Qual o maior bioma do Brasil?', 'Amazônia', 'Cerrado', 'Mata Atlântica', 'Caatinga']
];
// músicas do Quiz de música: [busca no DJ, respostas aceitas (sem acento, minúsculas), como mostrar]
const SONGS = [
  ['Evidências Chitãozinho e Xororó', ['evidencias'], 'Evidências — Chitãozinho & Xororó'], ['Garota de Ipanema Tom Jobim', ['garota de ipanema'], 'Garota de Ipanema — Tom Jobim'],
  ['Asa Branca Luiz Gonzaga', ['asa branca'], 'Asa Branca — Luiz Gonzaga'], ['Aquarela Toquinho', ['aquarela'], 'Aquarela — Toquinho'],
  ['Anunciação Alceu Valença', ['anunciacao'], 'Anunciação — Alceu Valença'], ['Tempo Perdido Legião Urbana', ['tempo perdido'], 'Tempo Perdido — Legião Urbana'],
  ['Pais e Filhos Legião Urbana', ['pais e filhos'], 'Pais e Filhos — Legião Urbana'], ['Exagerado Cazuza', ['exagerado'], 'Exagerado — Cazuza'],
  ['Mas que Nada Jorge Ben', ['mas que nada'], 'Mas que Nada — Jorge Ben Jor'], ['País Tropical Jorge Ben', ['pais tropical'], 'País Tropical — Jorge Ben Jor'],
  ['Ai Se Eu Te Pego Michel Teló', ['ai se eu te pego'], 'Ai Se Eu Te Pego — Michel Teló'], ['Show das Poderosas Anitta', ['show das poderosas'], 'Show das Poderosas — Anitta'],
  ['Envolver Anitta', ['envolver'], 'Envolver — Anitta'], ['Trem Bala Ana Vilela', ['trem bala'], 'Trem-Bala — Ana Vilela'],
  ['Cheia de Manias Raça Negra', ['cheia de manias'], 'Cheia de Manias — Raça Negra'], ['Ela é Demais Rick e Renner', ['ela e demais'], 'Ela é Demais — Rick & Renner'],
  ['Bohemian Rhapsody Queen', ['bohemian rhapsody'], 'Bohemian Rhapsody — Queen'], ['Billie Jean Michael Jackson', ['billie jean'], 'Billie Jean — Michael Jackson'],
  ['Smells Like Teen Spirit Nirvana', ['smells like teen spirit'], 'Smells Like Teen Spirit — Nirvana'], ['Shape of You Ed Sheeran', ['shape of you'], 'Shape of You — Ed Sheeran'],
  ['Blinding Lights The Weeknd', ['blinding lights'], 'Blinding Lights — The Weeknd'], ['Rolling in the Deep Adele', ['rolling in the deep'], 'Rolling in the Deep — Adele'],
  ['Despacito Luis Fonsi', ['despacito'], 'Despacito — Luis Fonsi'], ['Uptown Funk Bruno Mars', ['uptown funk'], 'Uptown Funk — Mark Ronson & Bruno Mars'],
  ['Bad Guy Billie Eilish', ['bad guy'], 'Bad Guy — Billie Eilish'], ['Thriller Michael Jackson', ['thriller'], 'Thriller — Michael Jackson'],
  ['Wonderwall Oasis', ['wonderwall'], 'Wonderwall — Oasis'], ['Sweet Child O Mine Guns N Roses', ['sweet child o mine', 'sweet child of mine'], "Sweet Child O' Mine — Guns N' Roses"],
  ['Hotel California Eagles', ['hotel california'], 'Hotel California — Eagles'], ['Africa Toto', ['africa'], 'Africa — Toto'],
  ['Never Gonna Give You Up Rick Astley', ['never gonna give you up'], 'Never Gonna Give You Up — Rick Astley'], ['Dancing Queen ABBA', ['dancing queen'], 'Dancing Queen — ABBA'],
  ['Numb Linkin Park', ['numb'], 'Numb — Linkin Park'], ['In the End Linkin Park', ['in the end'], 'In the End — Linkin Park'],
  ['Seven Nation Army White Stripes', ['seven nation army'], 'Seven Nation Army — The White Stripes'], ['Believer Imagine Dragons', ['believer'], 'Believer — Imagine Dragons']
];
// sem acentos, minúsculo, sem pontuação: "Árvore!" e "arvore" valem igual
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
function lev(a, b) { const m = a.length, n = b.length; if (Math.abs(m - n) > 2) return 9; const d = Array.from({ length: m + 1 }, (_, i) => [i]); for (let j = 1; j <= n; j++) d[0][j] = j; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; }
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(0, i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const PRIZE = [150, 75, 30], DAY_CAP = 600; // AnarchyPoints para os 3 primeiros; teto por pessoa por dia
const DRAW_SECS = 80, QUIZ_SECS = 15, CLIP_SECS = 15;

function createJogos({ db, save, now, str, toUser, voice, sockets, limited, track, clip, selfUser, log }) {
  const games = new Map(); // roomId -> partida
  const humansIn = room => [...new Set([...(voice.get(room) || new Map()).values()].map(s => s.uid))].filter(id => db.users[id] && !db.users[id].bot);
  const roomEmit = (room, ev, data) => { for (const sid of (voice.get(room) || new Map()).keys()) { const sk = sockets.get(sid); if (sk) sk.emit(ev, data); } };
  const name = id => (db.users[id] && db.users[id].displayName) || 'alguém';
  const day = () => new Date(now() - 3 * 3600e3).toISOString().slice(0, 10);
  const mask = (w, shown) => [...w].map((ch, i) => (ch === ' ' || ch === '-' ? ch : shown.has(i) ? ch : '_')).join('');

  // o que todo mundo da sala vê (sem a palavra/resposta enquanto a rodada está valendo)
  function view(g) {
    const r = g.cur || {};
    const v = { room: g.room, kind: g.kind, mode: g.mode, host: g.host, phase: g.phase, round: g.round + 1, total: g.total, scores: [...g.scores.entries()].sort((a, b) => b[1] - a[1]),
      ends: r.ends || 0, guessed: r.guessed ? [...r.guessed] : [], serverNow: now() };
    if (g.kind === 'desenho') Object.assign(v, { drawer: r.drawer, mask: r.word ? (g.phase === 'jogando' ? mask(r.word, r.shown) : r.word) : '', strokes: r.strokes || [] });
    if (g.kind === 'quiz') Object.assign(v, { q: r.q || null, opts: r.opts || null, clip: r.clip || null, answered: r.answers ? [...r.answers.keys()] : [], reveal: g.phase === 'revelando' ? r.reveal : null });
    if (g.phase === 'fim') v.prizes = g.prizes || {};
    return v;
  }
  const push = g => roomEmit(g.room, 'game:state', view(g));
  function end(g, reason) {
    clearTimeout(g.timer); clearInterval(g.hintT);
    g.phase = 'fim';
    // prêmios: 3 primeiros com pontos > 0 (teto diário por pessoa)
    const top = [...g.scores.entries()].filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
    g.prizes = {};
    top.forEach(([uid], i) => {
      const u = db.users[uid]; if (!u) return;
      u.stats = u.stats || {}; if (!u.stats.gameCap || u.stats.gameCap.d !== day()) u.stats.gameCap = { d: day(), n: 0 };
      const give = Math.min(PRIZE[i], DAY_CAP - u.stats.gameCap.n); if (give <= 0) return;
      u.stats.gameCap.n += give; u.points = (u.points || 0) + give; u.pointsTotal = (u.pointsTotal || 0) + give;
      g.prizes[uid] = give; toUser(uid, 'me:update', selfUser(u));
    });
    if (top.length && humansIn(g.room).length >= 2) track(top[0][0], g.kind === 'desenho' ? 'drawWins' : 'quizWins');
    save(); push(g);
    if (reason) roomEmit(g.room, 'game:info', { text: reason });
    setTimeout(() => { if (games.get(g.room) === g) games.delete(g.room); }, 60e3);
  }

  /* ---------- Desenha e adivinha ---------- */
  function drawRound(g) {
    const players = humansIn(g.room).filter(id => g.scores.has(id));
    if (players.length < 2) return end(g, 'Faltou gente na call: o jogo acabou.');
    if (g.round >= g.total) return end(g);
    const drawer = g.order[g.round % g.order.length];
    if (!players.includes(drawer)) { g.round++; return drawRound(g); }
    let word; do { word = WORDS[crypto.randomInt(0, WORDS.length)]; } while (g.used.has(word) && g.used.size < WORDS.length); g.used.add(word);
    g.phase = 'jogando';
    g.cur = { drawer, word, shown: new Set(), guessed: new Set(), strokes: [], ends: now() + DRAW_SECS * 1000 };
    toUser(drawer, 'game:word', { room: g.room, word });
    push(g);
    // dicas: letras aparecem com 50% e 75% do tempo
    const idx = [...word].map((c, i) => (c !== ' ' && c !== '-' ? i : -1)).filter(i => i >= 0);
    let hints = 0; clearInterval(g.hintT);
    g.hintT = setInterval(() => {
      const left = g.cur.ends - now(); if (g.phase !== 'jogando') return clearInterval(g.hintT);
      const want = left < DRAW_SECS * 250 ? 2 : left < DRAW_SECS * 500 ? 1 : 0;
      if (want > hints && idx.length > 3) { hints++; const free = idx.filter(i => !g.cur.shown.has(i)); if (free.length > 1) { g.cur.shown.add(free[crypto.randomInt(0, free.length)]); push(g); } }
    }, 1000);
    clearTimeout(g.timer); g.timer = setTimeout(() => drawReveal(g), DRAW_SECS * 1000);
  }
  function drawReveal(g) {
    if (g.phase !== 'jogando') return;
    clearTimeout(g.timer); clearInterval(g.hintT);
    g.phase = 'revelando'; push(g);
    roomEmit(g.room, 'game:info', { text: `A palavra era: ${g.cur.word}` });
    g.round++; g.timer = setTimeout(() => drawRound(g), 5000);
  }
  /* ---------- Quiz ---------- */
  async function prepClip(g) {
    // pega a próxima música (busca no DJ); se falhar, a rodada vira pergunta
    for (let k = 0; k < 3; k++) {
      const s = g.songs.shift(); if (!s) return null;
      try { const c = await clip(s[0], g.room); if (c && c.url) return { ...c, answers: s[1], title: s[2] }; } catch {}
    }
    return null;
  }
  async function quizRound(g) {
    if (humansIn(g.room).length < 1) return end(g, 'A call ficou vazia.');
    if (g.round >= g.total) return end(g);
    g.phase = 'carregando'; push(g);
    let song = null;
    if (g.mode === 'musica') { song = g.next ? await g.next : await prepClip(g); g.next = prepClip(g); if (games.get(g.room) !== g) return; }
    const secs = song ? CLIP_SECS + 5 : QUIZ_SECS;
    g.phase = 'jogando';
    if (song) {
      const at = Math.max(20, Math.round((song.dur || 120) * 0.35));
      g.cur = { kind: 'musica', clip: { url: song.url, at, dur: CLIP_SECS }, answers: song.answers, reveal: { text: song.title }, guessed: new Set(), answers2: null, ends: now() + secs * 1000 };
    } else {
      let q; do { q = QUESTIONS[crypto.randomInt(0, QUESTIONS.length)]; } while (g.usedQ.has(q[0]) && g.usedQ.size < QUESTIONS.length); g.usedQ.add(q[0]);
      const opts = shuffle(q.slice(1).map((t, i) => ({ t, ok: i === 0 })));
      g.cur = { kind: 'pergunta', q: q[0], opts: opts.map(o => o.t), right: opts.findIndex(o => o.ok), answers: new Map(), reveal: { right: opts.findIndex(o => o.ok), text: q[1] }, guessed: new Set(), ends: now() + secs * 1000 };
    }
    push(g);
    clearTimeout(g.timer); g.timer = setTimeout(() => quizReveal(g), secs * 1000);
  }
  function quizReveal(g) {
    if (g.phase !== 'jogando') return;
    clearTimeout(g.timer);
    const r = g.cur;
    if (r.kind === 'pergunta') for (const [uid, a] of r.answers) if (a.i === r.right) { const pts = 50 + Math.round(100 * a.left); g.scores.set(uid, (g.scores.get(uid) || 0) + pts); r.guessed.add(uid); }
    g.phase = 'revelando'; push(g);
    g.round++; g.timer = setTimeout(() => quizRound(g), 4500);
  }

  function bind(socket, uid, on, ok, fail) {
    const room = () => socket.data.voice;
    on('game:start', (d, cb) => {
      const r = room(); if (!r) return fail(cb, 'Entre numa call para jogar.');
      if (games.has(r) && games.get(r).phase !== 'fim') return fail(cb, 'Já tem um jogo rolando nesta call.');
      if (limited('game:' + r, 3, 60e3)) return fail(cb, 'Espere um pouco para começar outro jogo.');
      const people = humansIn(r), kind = d.kind === 'quiz' ? 'quiz' : 'desenho';
      if (kind === 'desenho' && people.length < 2) return fail(cb, 'O Desenha e adivinha precisa de pelo menos 2 pessoas na call.');
      const g = { room: r, kind, mode: kind === 'quiz' && d.mode === 'musica' ? 'musica' : 'perguntas', host: uid, phase: 'jogando', round: 0, scores: new Map(people.map(p => [p, 0])), used: new Set(), usedQ: new Set(), timer: null, hintT: null };
      if (kind === 'desenho') { g.order = shuffle(people.slice()); g.total = people.length === 2 ? 4 : people.length; }
      else { g.total = Math.max(3, Math.min(15, Math.round(+d.rounds) || 8)); if (g.mode === 'musica') { g.songs = shuffle(SONGS.slice()); g.next = prepClip(g); } }
      games.set(r, g);
      roomEmit(r, 'game:info', { text: `${name(uid)} começou ${kind === 'desenho' ? 'um Desenha e adivinha' : g.mode === 'musica' ? 'um Quiz de música' : 'um Quiz'}!` });
      log(`   Jogo: @${(db.users[uid] || {}).username} começou ${kind}/${g.mode} numa call.`);
      if (kind === 'desenho') drawRound(g); else quizRound(g);
      ok(cb);
    });
    on('game:get', (_, cb) => { const g = games.get(room()); ok(cb, { game: g ? view(g) : null }); if (g && g.kind === 'desenho' && g.cur && g.cur.drawer === uid && g.phase === 'jogando') toUser(uid, 'game:word', { room: g.room, word: g.cur.word }); });
    on('game:stop', (_, cb) => {
      const g = games.get(room()); if (!g) return fail(cb, 'Nenhum jogo nesta call.');
      if (g.host !== uid) return fail(cb, 'Só quem começou pode encerrar.');
      end(g, `${name(uid)} encerrou o jogo.`); ok(cb);
    });
    // traço do desenho (só quem está desenhando); pontos de 0 a 1
    on('game:draw', d => {
      const g = games.get(room()); if (!g || g.kind !== 'desenho' || g.phase !== 'jogando' || g.cur.drawer !== uid) return;
      if (d.clear) { g.cur.strokes = []; roomEmit(g.room, 'game:stroke', { clear: true }); return; }
      const pts = (Array.isArray(d.pts) ? d.pts : []).slice(0, 200).map(p => [Math.max(0, Math.min(1, +p[0] || 0)), Math.max(0, Math.min(1, +p[1] || 0))]);
      if (pts.length < 1) return;
      const s = { pts, c: /^#[0-9a-f]{6}$/i.test(d.c) ? d.c : '#111111', w: Math.max(1, Math.min(40, +d.w || 4)), id: str(d.id, 20) };
      if (g.cur.strokes.length < 4000) g.cur.strokes.push(s);
      for (const sid of (voice.get(g.room) || new Map()).keys()) { const sk = sockets.get(sid); if (sk && sk !== socket) sk.emit('game:stroke', s); }
    });
    // palpite (desenho e música): certo dá pontos (mais rápido, mais pontos); errado vira conversa do jogo
    on('game:guess', (d, cb) => {
      const g = games.get(room()); if (!g || g.phase !== 'jogando' || !g.cur) return fail(cb, 'Nenhuma rodada valendo.');
      const r = g.cur, text = str(d.text, 60).trim(); if (!text) return fail(cb, 'Escreva um palpite.');
      if (limited('guess:' + uid, 20, 10e3)) return fail(cb, 'Calma com os palpites!');
      if (g.kind === 'quiz' && r.kind !== 'musica') return fail(cb, 'Nesta rodada é para escolher uma opção.');
      if (g.kind === 'desenho' && r.drawer === uid) return fail(cb, 'Você está desenhando!');
      if (r.guessed.has(uid)) return fail(cb, 'Você já acertou. Espere a próxima!');
      if (!g.scores.has(uid)) g.scores.set(uid, 0);
      const n = norm(text), targets = g.kind === 'desenho' ? [norm(r.word)] : r.answers;
      const left = Math.max(0, (r.ends - now()) / ((g.kind === 'desenho' ? DRAW_SECS : CLIP_SECS + 5) * 1000));
      if (targets.includes(n)) {
        r.guessed.add(uid);
        const pts = 50 + Math.round(100 * left); g.scores.set(uid, g.scores.get(uid) + pts);
        if (g.kind === 'desenho') g.scores.set(r.drawer, (g.scores.get(r.drawer) || 0) + 40);
        roomEmit(g.room, 'game:hit', { uid, name: name(uid), pts });
        push(g);
        const need = humansIn(g.room).filter(p => g.scores.has(p) && (g.kind !== 'desenho' || p !== r.drawer));
        if (need.every(p => r.guessed.has(p))) { if (g.kind === 'desenho') drawReveal(g); else quizReveal(g); }
        return ok(cb, { hit: true, pts });
      }
      const close = targets.some(t => t.length > 3 && lev(n, t) <= (t.length > 8 ? 2 : 1));
      roomEmit(g.room, 'game:chat', { uid, name: name(uid), text: text.slice(0, 60) });
      ok(cb, { hit: false, close });
    });
    // resposta do quiz de perguntas (uma por rodada)
    on('game:answer', (d, cb) => {
      const g = games.get(room()); if (!g || g.kind !== 'quiz' || g.phase !== 'jogando' || !g.cur || g.cur.kind !== 'pergunta') return fail(cb, 'Nenhuma pergunta valendo.');
      const r = g.cur; if (r.answers.has(uid)) return fail(cb, 'Você já respondeu.');
      const i = Math.round(+d.i); if (!(i >= 0 && i < r.opts.length)) return fail(cb, 'Opção inválida.');
      if (!g.scores.has(uid)) g.scores.set(uid, 0);
      r.answers.set(uid, { i, left: Math.max(0, (r.ends - now()) / (QUIZ_SECS * 1000)) });
      push(g);
      if (humansIn(g.room).every(p => r.answers.has(p))) quizReveal(g);
      ok(cb);
    });
  }
  // saiu da call: se era quem desenhava, a rodada acaba
  function onLeave(room, uid) {
    const g = games.get(room); if (!g || g.phase !== 'jogando') return;
    if (g.kind === 'desenho' && g.cur && g.cur.drawer === uid) { roomEmit(room, 'game:info', { text: `${name(uid)} saiu da call enquanto desenhava.` }); drawReveal(g); }
    if (!humansIn(room).length) end(g);
  }
  return { bind, onLeave, _games: games, _norm: norm };
}

module.exports = { createJogos, WORDS, QUESTIONS, SONGS };
