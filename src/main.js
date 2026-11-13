(() => {
  'use strict';

  // =========================================================================
  // 1. CONSTANTES GLOBALES, CANVAS 320x240 Y MOTOR 240 FPS
  // =========================================================================
  const W = 320;
  const H = 240;
  const WALL_L = 22;
  const WALL_R = 298;
  const PLAY_W = 276;
  const MIN_FRAME_DELTA = 1000 / 240;

  const GRAVITY = 0.098;
  const THRUST_X = 0.158;
  const THRUST_Y = -0.248;
  const DRAG = 0.946;
  const MAX_VX = 2.95;
  const MAX_VY_UP = -2.72;
  const MAX_VY_DOWN = 3.35;
  const RESTITUTION = 0.45;
  const PARRY_RADIUS = 28;
  const POOL_SIZE = 72;
  const M = Math;
  const PI2 = M.PI * 2;
  const ab = M.abs;
  const mn = M.min;
  const mx = M.max;
  const fl = M.floor;
  const rn = M.random;
  const sn = M.sin;
  const cs = M.cos;
  const hy = M.hypot;

  const canvas = document.getElementById('c');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;

  const BG9 = 'rgba(6,9,15,0.94)';
  const fR = (x, y, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
  };
  const sR = (x, y, w, h, c, lw) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = lw || 1;
    ctx.strokeRect(x | 0, y | 0, w | 0, h | 0);
  };
  const fArc = (x, y, r, c) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, PI2);
    ctx.fill();
  };
  const cArc = (x, y, r, c, w) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = w || 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, PI2);
    ctx.stroke();
  };
  const rot = (x, y, a, fn) => {
    ctx.save();
    ctx.translate(x, y);
    if (a) ctx.rotate(a);
    fn();
    ctx.restore();
  };
  const hsl = (h, s, l) => 'hsl(' + h + ',' + s + '%,' + l + '%)';

  // Paleta base estilo v6 (#06090f cobre/acero/cian/fuego)
  const PAL = '#06090f|#161920|#3b251e|#7a4832|#c87d3b|#fbbf24|#fde047|#8c1d18|#ef4444|#ff7722|#38bdf8|#bae6fd|#94a3b8|#f8fafc|#4ade80|#c084fc'.split('|');
  // 0:BG 1:DARK 2:PIPE 3:RUST 4:COPPER 5:GOLD 6:YG 7:CRIMSON 8:RED 9:ORANGE 10:CYAN 11:ICE 12:STEEL 13:WHITE 14:GREEN 15:PURPLE

  // =========================================================================
  // 2. FUENTE BITMAP 5x7 BASE-32 NITIDA Y CONTENEDORES V6
  // =========================================================================
  const FC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:,-+/!?[]()><%=|';
  const FG = 'ehhvhhhuhhuhhuehgggheuhhhhhuvgguggvvggugggehgnhhehhhvhhhe44444e72222ichikokihggggggvhrllhhhhpljhhhehhhhheuhhugggehhhliduhhukihfgge11uv444444hhhhhhehhhhha4hhhllrhhha4ahhhha4444v1248gvejlphhe4c4444eeh168gvu11e11u26aiv22vgu11heegguhhev124888ehhehheehhf11e000004400400440000048000v000044v44012448gg4444404eh24404e88888ee22222e6888886c22222c8421248248g842pq44bj30v000v04444444';

  function drawText(txt, x, y, col, sc, align, topCol) {
    const str = String(txt).toUpperCase();
    const s = sc || 1;
    const tw = str.length * 6 * s - s;
    const cx = (align === 1 ? x - tw * 0.5 : align === 2 ? x - tw : x) | 0;
    const py = y | 0;

    for (let pass = 0; pass < 2; pass++) {
      const o = pass ? 0 : s;
      if (!pass) ctx.fillStyle = PAL[0];
      for (let i = 0; i < str.length; i++) {
        const idx = FC.indexOf(str[i]);
        if (idx < 0) continue;
        const bx = cx + i * 6 * s + o;
        const off = idx * 7;
        for (let r = 0; r < 7; r++) {
          const row = parseInt(FG[off + r], 32);
          if (!row) continue;
          if (pass) ctx.fillStyle = topCol && r < 3 ? topCol : col;
          for (let c = 0; c < 5; c++) {
            if (row & (16 >> c)) ctx.fillRect(bx + c * s, py + r * s + o, s, s);
          }
        }
      }
    }
  }

  function drawPanel(x, y, w, h, bg, border) {
    const bc = border || PAL[4];
    fR(x, y, w, h, bg || PAL[0]);
    sR((x | 0) + 1, (y | 0) + 1, (w | 0) - 2, (h | 0) - 2, bc, 2);
    for (let k = 0; k < 4; k++) fR(k & 1 ? x + w - 5 : x + 3, k & 2 ? y + h - 5 : y + 3, 2, 2, bc);
  }

  function drawToothed(steps, rOut, rIn, fillCol, strokeCol) {
    ctx.fillStyle = fillCol;
    ctx.beginPath();
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * PI2;
      const r = i & 1 ? rOut : rIn;
      if (i) ctx.lineTo(cs(a) * r, sn(a) * r);
      else ctx.moveTo(cs(a) * r, sn(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    if (strokeCol) {
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // =========================================================================
  // 3. DATOS DE VEHICULOS, HABILIDADES Y 4 BIOMAS/NIVELES ARTESANALES (HSL V6)
  // =========================================================================
  const tbl = (s, fn) => s.split(';').map((r) => fn(r.split('|')));
  const HULLS = tbl('MK.I BRONCE|BASE|5|1|1|1|8|BALANCEADO Y VERSATIL|#c87d3b|#7a4832|#fbbf24;MK.II FORJA|NV.1 O 100M|6|.95|1.05|.9|8|TANQUE +1 VIDA MAX, -10% PSI|#ef4444|#7a4832|#fde047;MK.III VOLTA|NV.2 O 220M|5|1.16|1.12|.95|10|TURBO +16% MOTOR Y SUBIDA|#38bdf8|#1e3a8a|#fde047;MK.IV ESPECTRO|NV.3 O 360M|5|1.12|1.1|.8|14|ECO -20% PSI, +75% GRAZE|#c084fc|#4c1d95|#38bdf8', (a) => ({
    // _a:name _b:req _t:hp _x:tx _y:ty _s:psi _g:grz _l:trait _p:[c1,c2,c3]
    _a: a[0], _b: a[1], _t: +a[2], _x: +a[3], _y: +a[4], _s: +a[5], _g: +a[6], _l: a[7], _p: [a[8], a[9], a[10]]
  }));

  // SOLO indice 0 realiza PARRY (28px)! Las demas habilidades ofrecen combate/control/escudo orbital.
  const SKILLS = tbl('ESCUDO PARRY|BASE|22|86|UNICA CON PARRY 28PX + REFLEJA X2;CANON TRIPLE|BASE|24|70|3 RAYOS PERFORANTES (SIN PARRY);ORBES ESCOLTA|NV.1|22|220|2 ORBES BORRAN BALAS Y ATACAN 3.5S;TORMENTA EMP|NV.2|26|105|BORRA BALAS + RAYOS AL JEFE/ENEMIGOS', (a) => ({
    // _a:name _b:req _c:cost _l:cd _t:desc
    _a: a[0], _b: a[1], _c: +a[2], _l: +a[3], _t: a[4]
  }));

  const LEVELS = tbl('1: FUNDICION CARMESI|VULCANO MK-I|DRONES IGNEOS Y VAPOR|150|14|38|0|.19|0|4;2: TORRE VOLTAICA|ARLEQUIN VOLT|BOBINAS TESLA Y RESORTES|165|210|188|1|.215|1|4;3: CRIPTA CRIO-ACIDA|DR. CRIO-ACIDO|HIELO Y VAPORES TOXICOS|175|165|88|3|.24|2|5;4: CIUDADELA CENIT|EMPERADOR CENIT|ASALTO IMPERIAL FINAL|190|274|46|4|.265|3|5', (a) => {
    const h1 = +a[4];
    const h2 = +a[5];
    return {
      // _a:name _b:boss _s:sub _l:lenM _t:pat _vy:lavaSpd _x:track _y:bTrack
      _a: a[0], _b: a[1], _s: a[2], _l: +a[3], _t: +a[6],
      _vy: +a[7], _x: +a[8], _y: +a[9],
      _p: [
        hsl(h1, 45, 5), hsl(h1, 42, 13), hsl(h1, 45, 21), hsl(h1, 78, 56),
        hsl(h1, 48, 22), hsl(h2, 90, 62), hsl(h1, 65, 78), hsl(h2, 85, 52),
        hsl(h1, 80, 26), hsl(h1, 85, 46), hsl(h1, 95, 62), hsl(h2, 95, 76)
      ]
    };
  });

  // =========================================================================
  // 4. MOTOR OST HEROICO ESTILO V6 (4 CANALES, SIN ACELERAR NI AGUDOS ESTRIDENTES)
  // =========================================================================
  const WVS = ['square', 'triangle', 'sawtooth', 'sine'];
  const LEADS = [
    // 0: V6 A-Section ("Battle Against a True Hero" homage)
    'H HKO KOTROKO KHD DHK HKPOKHK HDF FJM JMRTVRT ROOMKJKJHGHJKMOSTO',
    // 1: V6 B-Section (Heroic Escalation)
    'TKNTWVTNTKNTZWVTPHKPTSPKPHKPVTSPRJMRVTRMVWYV[YWVTSPONOPSTOKJHKOT',
    // 2: Torre Voltaica (Heroic Syncopated Lead)
    'M MJQ QSVTSQS QMJ JMQ MQSQPQM HIK ILN NRUWTVU SQQNMLMKIJMNPQTV',
    // 3: Cripta Crio-Acida (Haunting Heroic Counterpoint)
    'K KOQ ORUUTRO QOK KOH HOQ QUTSQOM FJM JMP PSVUTSP OMMKJHJGHJMOQSUW',
    // 4: Boss Rush / Ciudadela Duel Lead
    'O ORT TWZXWTQ RPO OMJ JMO ORUUTRO QML LMO OQTTSRQ POOMKJHGHJMORUWZ',
    // 5: Final Imperial Climax Lead
    'W WTQ QOM MKH HOM ORU URO QRT TWZ ZWT QOM MKO ORU WVT RPO QTR OMJH',
    // 6: Menu / Hangar Heroic Pulse (Nueva funcionalidad - estilo v6 suave)
    'H   K   O   T   R   O   K   H   ',
    // 7: Level Clear / Victory Anthem (Nueva funcionalidad - estilo v6 triunfal)
    'C E G L O Q O L F H L O T R O M '
  ];
  const SONGS = tbl('146|0|0|1|36,32,34,31;152|1|2|1|38,34,36,33;142|2|3|0|36,31,32,34;156|0|4|5|36,32,34,35;162|0|1|4|36,32,34,31;166|2|5|1|38,34,36,33;120|1|6|6|36,32,34,31;136|0|7|7|36,41,43,36', (a) => ({
    // _s:bpm _t:w _a:a _b:b _p:roots
    _s: +a[0], _t: +a[1], _a: +a[2], _b: +a[3], _p: a[4].split(',').map(Number)
  }));
  const CHORD_ARPS = [
    [60, 63, 67, 72],
    [56, 60, 63, 68],
    [58, 62, 65, 70],
    [55, 59, 62, 67]
  ];

  let audioCtx = null;
  let noiseBuf = null;
  let bgmFilter = null;
  let soundMode = 0;
  let nextNoteTime = 0;
  let seqStep = 0;
  let barCount = 0;

  // Clamped a MIDI 36..79 (<= 784 Hz) para evitar agudos estridentes en partidas largas
  const m2f = (midi) => 440 * M.pow(2, (mn(79, mx(36, midi)) - 69) / 12);

  function initAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = new AC();
      bgmFilter = audioCtx.createBiquadFilter();
      bgmFilter.type = 'lowpass';
      bgmFilter.frequency.value = 4600;
      bgmFilter.connect(audioCtx.destination);
      const len = audioCtx.sampleRate * 0.25;
      noiseBuf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = rn() * 2 - 1;
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }

  const ramp = (p, a, b, t0, t1, l) => (p.setValueAtTime(a, t0), l ? p.linearRampToValueAtTime(b, t1) : p.exponentialRampToValueAtTime(b, t1));
  const playN = (n, g, b, t, d) => (g.connect((b && bgmFilter) || audioCtx.destination), n.start(t), n.stop(t + d + 0.01));

  function toneAt(f0, f1, dur, time, type, vol, toBgm) {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = WVS[type];
    ramp(o.frequency, f0, f1 && f1 !== f0 ? mx(25, f1) : f0, time, time + dur);
    ramp(g.gain, 0.0001, vol, time, time + 0.005, 1);
    if (toBgm && dur > 0.03) g.gain.linearRampToValueAtTime(vol * 0.72, time + dur * 0.58);
    g.gain.exponentialRampToValueAtTime(0.0008, time + dur);
    o.connect(g);
    playN(o, g, toBgm, time, dur);
  }

  function noteAt(midi, dur, time, w, vol, det) {
    toneAt(m2f(midi) * (det || 1), 0, dur, time, w, vol, 1);
  }

  function sfxTone(f0, f1, dur, type, vol) {
    if (soundMode !== 2 && audioCtx) toneAt(f0, f1, dur, audioCtx.currentTime, type, vol, 0);
  }

  function noiseBurst(ftype, freq, q, time, dur, vol, toBgm) {
    if (!audioCtx || !noiseBuf) return;
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuf;
    const flt = audioCtx.createBiquadFilter();
    flt.type = ftype;
    flt.frequency.value = freq;
    if (q) flt.Q.value = q;
    const g = audioCtx.createGain();
    ramp(g.gain, vol, 0.001, time, time + dur);
    src.connect(flt);
    flt.connect(g);
    playN(src, g, toBgm, time, dur);
  }

  function playJingle(kind) {
    if (soundMode === 2 || !audioCtx) return;
    const now = audioCtx.currentTime;
    const seq = [[60, 64, 67, 72], [60, 63, 67, 70, 72, 75], [57, 45, 57, 45], [67, 64, 60]][kind];
    for (let i = 0; i < seq.length; i++) noteAt(seq[i], 0.14, now + i * (kind === 2 ? 0.11 : 0.08), kind === 2 ? 2 : 0, 0.068);
  }

  function updateBGM() {
    if (soundMode !== 0 || !audioCtx || audioCtx.state !== 'running') return;
    if (gameState === 1 && (phase === 1 || phase === 3)) return;
    const isCalm = gameState !== 1;
    const isClear = gameState === 1 && phase >= 4;
    const lv = LEVELS[currentLevel % 4];
    const song = SONGS[isCalm ? 6 : isClear ? 7 : phase === 2 ? lv._y : lv._x];
    const stepDur = 60 / (song._s * 4);
    const barShift = isCalm || isClear ? 0 : [0, 0, 2, -1][barCount & 3];
    const bShift = barShift < 0 ? -1 : 0;
    const lVol = isCalm ? 0.044 : 0.072;
    const bassOff = [0, 0, 12, 7, 0, 12, 10, 7];

    while (nextNoteTime < audioCtx.currentTime + 0.09) {
      const idx = seqStep & 63;
      const chordIdx = (idx >> 4) & 3;
      const pat = LEADS[(barCount & 1) ? song._b : song._a];
      const ch = pat[idx % pat.length];

      // Canal 1: Melodia Heroica V6 con cuerpo dual y eco armonico
      if (ch && ch !== ' ') {
        const midi = ch.charCodeAt(0) + barShift;
        noteAt(midi, stepDur * 1.75, nextNoteTime, song._t, lVol);
        if (!isCalm) noteAt(midi, stepDur * 1.65, nextNoteTime, 1, 0.036, 0.996);
        if ((idx & 3) === 0) noteAt(midi - 5, stepDur * 1.5, nextNoteTime, 1, isCalm ? 0.022 : 0.04);
      } else if (!isCalm && (idx & 3) === 2) {
        noteAt(CHORD_ARPS[chordIdx][idx & 3] + barShift, stepDur * 1.1, nextNoteTime, 1, 0.028);
      }

      // Canal 2: Bajo motriz con linea de octava y quinta
      if ((idx & 1) === 0 || (gameState === 1 && phase === 2)) {
        noteAt(song._p[chordIdx] + bassOff[(idx >> 1) & 7] + bShift, stepDur * 1.45, nextNoteTime, 1, isCalm ? 0.052 : 0.095);
      }

      // Canal 3: Arpegio armonico continuo (sin subir de octava)
      if (!isCalm || !(idx & 1)) {
        noteAt(CHORD_ARPS[chordIdx][(idx >> (isCalm ? 1 : 0)) & 3] + bShift, stepDur * 1.05, nextNoteTime, 0, isCalm ? 0.02 : 0.032);
      }

      // Canal 4: Percusion Kick / Snare / Hi-hat + redoble en compas par
      if (!isCalm) {
        if ((barCount & 1) && idx >= 60) {
          toneAt(180 - (idx - 60) * 22, 55, 0.07, nextNoteTime, 1, 0.08, 1);
          noiseBurst('highpass', 2600, 1.4, nextNoteTime, 0.045, 0.048, 1);
        } else if ((idx & 7) === 0 || (phase === 2 && (idx & 15) === 10)) {
          toneAt(146, 36, 0.085, nextNoteTime, 3, 0.11, 1);
        } else if ((idx & 7) === 4) {
          noiseBurst('highpass', 2000, 1.1, nextNoteTime, 0.07, 0.055, 1);
        } else if (!(idx & 1)) {
          noiseBurst('highpass', 5600, 2, nextNoteTime, 0.026, 0.026, 1);
        }
      }

      nextNoteTime += stepDur;
      seqStep = (seqStep + 1) & 63;
      if (seqStep === 0) barCount++;
    }
  }

  function sfxSteam(dual) {
    if (soundMode !== 2 && audioCtx) noiseBurst('bandpass', dual ? 980 : 720, 0, audioCtx.currentTime, 0.055, dual ? 0.04 : 0.024, 0);
  }

  // =========================================================================
  // 5. ESTADO DEL JUEGO, SINGLETONS Y PERSISTENCIA
  // =========================================================================
  const stGet = (k) => { try { return parseInt(localStorage.getItem(k) || '0', 10) || 0; } catch (_) { return 0; } };
  let highScore = stGet('sh7_hi');
  let maxLevelReached = stGet('sh7_lv');
  function saveProg() {
    try {
      localStorage.setItem('sh7_hi', highScore);
      localStorage.setItem('sh7_lv', maxLevelReached);
    } catch (_) {}
  }

  // Importante para build.js flattenSingletons: mantener sin {} anidados ni comas en expresiones!
  const drone = {
    x: 160,
    y: 185,
    vx: 0,
    vy: 0,
    r: 6,
    theta: 0,
    hp: 5,
    maxHp: 5,
    invuln: 0,
    pressure: 100,
    maxPsi: 100,
    purge: 0,
    leftOn: false,
    rightOn: false,
    cooling: false,
    grounded: false,
    cores: 0,
    overdrive: 0,
    grazeCd: 0,
    slamCd: 0,
    empR: 0,
    parryRing: 0,
    shield: 0,
    orbsT: 0
  };

  const boss = {
    active: false,
    type: 0,
    x: 160,
    y: 0,
    baseY: 0,
    vx: 1,
    r: 17,
    hp: 8,
    maxHp: 8,
    arenaY: 0,
    phaseTimer: 0,
    invuln: 0,
    shield: 0
  };

  let bossShots = [];
  let playerShots = [];
  let empBolts = [];
  let activeChunks = [];

  const particles = [];
  let poolIdx = 0;
  for (let i = 0; i < POOL_SIZE; i++) {
    particles.push({ _on: 0, _t: 0, _x: 0, _y: 0, _vx: 0, _vy: 0, _l: 0, _s: 2, _c: PAL[3] });
  }

  let gameState = 0; // 0: Menu, 1: Jugando, 2: GameOver, 3: Pausa
  let menuTab = 0; // 0: Principal, 1: Hangar, 2: Guia
  let gameMode = 0; // 0: Historia, 1: Boss Rush, 2: Torre Infinita
  let phase = 0; // 0: Ascenso, 1: Boss Intro, 2: Boss Fight, 3: Boss Defeat, 4: Level Clear, 5: Victoria
  let phaseTimer = 0;
  let currentLevel = 0;
  let startLevel = 0;
  let selectedHull = 0;
  let selectedSkill = 0;
  let inspectHull = 0;
  let inspectSkill = 0;
  let ngPlus = 0;
  let crtEnabled = true;

  let seed = 1985;
  let randomSeed = true;
  let rngState = 1;
  let camY = 0;
  let lavaY = H + 50;
  let maxMeters = 0;
  let score = 0;
  let grazeCombo = 0;
  let grazeTimer = 0;
  let runSeconds = 0;
  let topChunkIndex = 0;
  let levelGoalY = -1800;
  let warnAlertLevel = 0;

  let elapsedTime = 0;
  let steamCooldown = 0;
  let screenShake = 0;
  let damageFlash = 0;
  let bannerText = '';
  let bannerCol = PAL[6];
  let bannerTimer = 0;
  let deathReason = '';
  let nextBossMeters = 120;
  let uiBtns = [];

  const keys = {};
  let touchLeft = false;
  let touchRight = false;

  const isHullUnlocked = (i) => i === 0 || maxLevelReached >= i || highScore >= [0, 100, 220, 360][i];
  const isSkillUnlocked = (i) => i <= 1 || maxLevelReached >= i - 1 || highScore >= [0, 0, 100, 220][i];
  const getHeightM = (wy) => mx(0, fl((200 - wy) / 12));

  const setSeed = (s) => (rngState = s >>> 0 || 1);
  const lcg = () => ((rngState = (1664525 * rngState + 1013904223) >>> 0) / 4294967296);
  const lcgR = (a, b) => a + lcg() * (b - a);
  const rollSeed = () => {
    seed = ((rn() * 900000 + 100000) | 0);
  };

  function editSeed() {
    randomSeed = false;
    let entered = null;
    try {
      if (typeof window.prompt === 'function') entered = window.prompt('Semilla numerica para Torre Infinita:', String(seed));
    } catch (_) {}
    if (entered !== null && /^\d+$/.test(entered.trim())) seed = parseInt(entered.trim(), 10) % 1000000 || 1;
    else seed = (seed + 137) % 999999 || 1;
    sfxTone(460, 690, 0.06, 1, 0.07);
  }

  function showBanner(txt, col, dur) {
    bannerText = txt;
    bannerCol = col || PAL[6];
    bannerTimer = dur || 120;
  }

  function spawnParticle(t, x, y, vx, vy, life, sz, col) {
    const p = particles[poolIdx];
    poolIdx = (poolIdx + 1) & (POOL_SIZE - 1);
    p._on = 1;
    p._t = t;
    p._x = x;
    p._y = y;
    p._vx = vx;
    p._vy = vy;
    p._l = life;
    p._s = sz || 2;
    p._c = col || PAL[13];
  }

  function burst(x, y, n, sp, l, c1, c2) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI2;
      spawnParticle(1, x, y, cs(a) * sp, sn(a) * sp, l, 2, i & 1 ? c2 || c1 : c1);
    }
  }

  function hitByOrbs(x, y, rad) {
    if (drone.orbsT <= 0) return 0;
    for (let k = 0; k < 2; k++) {
      const a = elapsedTime * 5.4 + k * M.PI;
      if (hy(x - (drone.x + cs(a) * 24), y - (drone.y + sn(a) * 24)) < rad) return 1;
    }
    return 0;
  }

  function stepBossShots(dt, minY, msg) {
    for (let i = bossShots.length - 1; i >= 0; i--) {
      const s = bossShots[i];
      s._x += s._vx * dt;
      s._y += s._vy * dt;
      if (s._g) s._vy += s._g * dt;
      if (s._b && (s._x < WALL_L + s._r || s._x > WALL_R - s._r)) s._vx = -s._vx;
      if (hitByOrbs(s._x, s._y, s._r + 7)) {
        bossShots.splice(i, 1);
        score += 40;
        sfxTone(620, 960, 0.04, 1, 0.05);
        spawnParticle(1, s._x, s._y, (rn() - 0.5) * 2, -0.8, 12, 2, PAL[10]);
        continue;
      }
      const ds = hy(drone.x - s._x, drone.y - s._y);
      if (ds < drone.r + s._r) {
        bossShots.splice(i, 1);
        if (drone.shield <= 0) applyDamage(24, 1, msg);
        continue;
      } else if (ds < drone.r + s._r + 6) triggerGraze(s._x, s._y);
      if (s._y > camY + H + 20 || s._y < camY - minY || s._x < WALL_L - 8 || s._x > WALL_R + 8) bossShots.splice(i, 1);
    }
  }

  const pushShot = (x, y, vx, vy, r, g, b) => bossShots.push({ _x: x, _y: y, _vx: vx, _vy: vy, _r: r || 4, _g: g || 0, _b: b || 0 });
  const cycOf = (o) => (elapsedTime * 60 + o._ph) % o._per;

  // =========================================================================
  // 6. GENERACION DENSA DE NIVELES (5 FILAS/CHUNK, VAPOR, COMPUERTAS, ENEMIGOS)
  // =========================================================================
  function createChunk(chunkIdx, lvIdx, isDesigned) {
    setSeed((seed + chunkIdx * 7919 + lvIdx * 131) >>> 0);
    const yBottom = H - chunkIdx * H;
    const yTop = yBottom - H;
    const lv = LEVELS[lvIdx % 4];
    const totalChunks = fl((lv._l * 12) / H);

    const plats = [
      { _x1: 0, _y1: yTop, _x2: WALL_L, _y2: yBottom, _wall: 1 },
      { _x1: WALL_R, _y1: yTop, _x2: W, _y2: yBottom, _wall: 1 }
    ];
    const foes = [];
    const saws = [];
    const gates = [];
    const vents = [];
    const cores = [];
    const rests = [];

    if (chunkIdx === 0) plats.push({ _x1: 95, _y1: 194, _x2: 225, _y2: 205, _w: 130, _cool: 1, _vx: 0 });

    const isRestChunk = isDesigned ? chunkIdx === 2 || chunkIdx === totalChunks - 2 : chunkIdx > 0 && chunkIdx % 4 === 0;
    if (isRestChunk) {
      const ry = fl(yBottom - 108);
      plats.push({ _x1: 96, _y1: ry, _x2: 224, _y2: ry + 11, _w: 128, _cool: 1.5, _vx: 0, _rest: 1 });
      rests.push({ _x: W * 0.5, _y: ry - 10, _on: 0 });
    }

    const rows = 5;
    const step = H / rows;

    for (let r = 0; r < rows; r++) {
      if ((chunkIdx === 0 && r === 0) || (isRestChunk && r === 2)) continue;

      const py = fl(yBottom - (r + 0.68) * step + lcgR(-3, 3));
      const slot = (chunkIdx * 3 + r + lvIdx) % 3;
      const beamW = isDesigned ? mx(46, 84 - lvIdx * 7 - (chunkIdx > totalChunks - 3 ? 6 : 0)) : mx(36, 80 - fl(chunkIdx * 1.2));
      const minX = WALL_L + 12;
      const maxX = WALL_R - beamW - 12;
      const span = maxX - minX;
      const px = fl(lcgR(minX + span * [0, 0.68, 0.25][slot], minX + span * [0.28, 1, 0.72][slot]));

      const vx = !isRestChunk && (r === 2 || r === 4) && (lvIdx >= 1 || chunkIdx >= 1) && lcg() > 0.35
        ? (lcg() > 0.5 ? 1 : -1) * mn(1.05, 0.42 + lvIdx * 0.14)
        : 0;
      const fragile = !vx && lvIdx >= 2 && (r === 1 || r === 3) && lcg() > 0.42;
      const spring = !fragile && ((lvIdx === 1 && (r & 1)) || ((r === 0 || r === 3) && lcg() > 0.48));

      plats.push({
        _x1: px, _y1: py, _x2: px + beamW, _y2: py + 9, _w: beamW,
        _cool: fragile ? 0.5 : 1, _vx: vx, _frag: fragile, _spr: spring
      });

      // Bloques laterales de obstaculo / cobertura segun nivel
      if ((chunkIdx > 0 || r >= 2) && (r === 1 || r === 3) && lcg() > 0.35) {
        const leftSide = px + beamW * 0.5 > W * 0.5;
        const bw = fl(lcgR(44, 62 + lvIdx * 6));
        plats.push({ _x1: leftSide ? WALL_L : WALL_R - bw, _y1: py - 20, _x2: leftSide ? WALL_L + bw : WALL_R, _y2: py - 11, _wall: 1, _bar: 1 });
      }

      // Enemigos acordes al nivel (hasta 2 por chunk!)
      if ((chunkIdx > 0 || r >= 2) && (r === 1 || r === 3) && lcg() > 0.3) {
        foes.push({
          _t: lvIdx % 4,
          _x: lcgR(WALL_L + 36, WALL_R - 36),
          _y: py - 16,
          _vx: (lcg() > 0.5 ? 1 : -1) * (0.5 + lvIdx * 0.11),
          _hp: lvIdx >= 2 ? 2 : 1,
          _cd: fl(lcgR(35, 95))
        });
      }

      // Sierras dentadas rotatorias V6
      if ((chunkIdx > 0 || r >= 3) && (r === 2 || r === 4) && lcg() > 0.34) {
        saws.push({
          _x: fl(lcgR(WALL_L + 30, WALL_R - 30)),
          _y: py - 15,
          _r: 8,
          _vx: (lcg() > 0.5 ? 1 : -1) * (0.48 + lvIdx * 0.13),
          _ang: 0,
          _omg: 0.16
        });
      }

      // Valvulas laterales de vapor (Vents V6!)
      if ((chunkIdx > 0 || r >= 3) && r === 2 && lcg() > 0.38) {
        const dir = lcg() > 0.5 ? 1 : -1;
        vents.push({
          _x: dir > 0 ? WALL_L : WALL_R,
          _y: py - 12,
          _dir: dir,
          _per: 155,
          _ph: fl(lcgR(0, 155))
        });
      }

      // Compuertas telescopicas temporizadas V6
      if (chunkIdx >= 1 && (r === 0 || r === 4) && lcg() > 0.42) {
        gates.push({ _x: fl(lcgR(WALL_L + 36, WALL_R - 90)), _y: py - 16, _w: 54, _per: 145, _ph: fl(lcgR(0, 145)) });
      }

      // Nucleos dorados coleccionables (riesgo/recompensa)
      if (lcg() > 0.36) cores.push({ _x: px + beamW * 0.5, _y: py - 12, _on: 1 });
    }

    return { _yTop: yTop, _yBot: yBottom, _plats: plats, _foes: foes, _saws: saws, _gates: gates, _vents: vents, _cores: cores, _rests: rests };
  }

  function loadLevelWorld(lvIdx, preserveHp) {
    currentLevel = lvIdx;
    const lv = LEVELS[lvIdx % 4];
    const hull = HULLS[selectedHull];

    drone.x = W * 0.5;
    drone.y = 184;
    drone.vx = 0;
    drone.vy = 0;
    drone.theta = 0;
    drone.maxHp = hull._t;
    drone.hp = preserveHp ? mn(drone.maxHp, drone.hp + 1) : hull._t;
    drone.invuln = 30;
    drone.pressure = 100;
    drone.maxPsi = 100;
    drone.purge = 0;
    drone.slamCd = 0;
    drone.empR = 0;
    drone.parryRing = 0;
    drone.shield = 0;
    drone.orbsT = 0;

    camY = 0;
    lavaY = H + 75;
    warnAlertLevel = 0;
    boss.active = false;
    bossShots = [];
    playerShots = [];
    empBolts = [];
    seqStep = 0;
    barCount = 0;
    if (audioCtx) nextNoteTime = audioCtx.currentTime + 0.05;

    for (let i = 0; i < POOL_SIZE; i++) particles[i]._on = 0;
    activeChunks = [];

    if (gameMode === 1) {
      phase = 0;
      levelGoalY = 120;
      const ch = createChunk(0, lvIdx, true);
      ch._foes = [];
      ch._saws = [];
      ch._gates = [];
      ch._vents = [];
      activeChunks.push(ch);
      beginBossIntro(lvIdx);
      return;
    }

    if (gameMode === 0) {
      levelGoalY = 200 - lv._l * 12;
      const numChunks = M.ceil((lv._l * 12 + 120) / H);
      for (let i = 0; i <= numChunks; i++) activeChunks.push(createChunk(i, lvIdx, true));
      phase = 0;
      showBanner(lv._a, PAL[6], 130);
    } else {
      topChunkIndex = 1;
      for (let i = 0; i <= 2; i++) activeChunks.push(createChunk(i, 0, false));
      nextBossMeters = 120;
      phase = 0;
      showBanner('TORRE INFINITA - SEMILLA ' + seed, PAL[10], 120);
    }
  }

  function startGame() {
    initAudio();
    if (gameMode === 2 && randomSeed) rollSeed();
    score = 0;
    maxMeters = 0;
    grazeCombo = 0;
    grazeTimer = 0;
    runSeconds = 0;
    ngPlus = 0;
    drone.cores = 0;
    drone.overdrive = 0;
    deathReason = 'CONSUMIDO POR EL MAGMA';

    loadLevelWorld(gameMode === 0 ? startLevel : 0, false);
    keys['Space'] = false;
    keys['Enter'] = false;
    gameState = 1;
    playJingle(3);
  }

  // =========================================================================
  // 7. TRANSICIONES DE JEFE, COMBATE Y HABILIDADES BALANCEADAS
  // =========================================================================
  function beginBossIntro(lvIdx) {
    boss.type = lvIdx % 4;
    boss.active = true;
    boss.arenaY = camY;
    boss.x = W * 0.5;
    boss.baseY = boss.arenaY + 62;
    boss.y = boss.arenaY - 28;
    boss.vx = 1.08 + boss.type * 0.15;
    boss.r = 17;
    boss.maxHp = 8 + boss.type * 3 + ngPlus * 4;
    boss.hp = boss.maxHp;
    boss.phaseTimer = 0;
    boss.invuln = 0;
    boss.shield = 0;
    bossShots = [];
    playerShots = [];
    empBolts = [];

    if (drone.y < boss.arenaY + 130) drone.y = boss.arenaY + 165;
    drone.vx = 0;
    drone.vy = 0;
    lavaY = mx(lavaY, boss.arenaY + H + 38);

    phase = 1;
    phaseTimer = 120;
    seqStep = 0;
    barCount = 0;
    if (audioCtx) nextNoteTime = audioCtx.currentTime + 0.05;
    playJingle(2);
  }

  function defeatBoss() {
    phase = 3;
    phaseTimer = 110;
    bossShots = [];
    empBolts = [];
    score += 1000 + boss.type * 500;
    if (currentLevel + 1 > maxLevelReached) {
      maxLevelReached = currentLevel + 1;
      saveProg();
    }
    playJingle(1);
    screenShake = 14;
    showBanner('JEFE DESTRUIDO! +1000 PTS', PAL[6], 130);
  }

  function damageBoss(dmg, mode) {
    if (phase !== 2 || boss.invuln > 0) return;
    if (boss.shield > 0) {
      if (!mode && drone.overdrive <= 0) {
        sfxTone(220, 150, 0.08, 1, 0.09);
        if (bannerTimer <= 0) showBanner('ESCUDO! USA PARRY O EMP', PAL[11], 75);
        boss.invuln = 14;
        return;
      }
      boss.shield = 0;
      showBanner(mode === 2 ? 'ESCUDO ROTO POR EMP!' : 'ESCUDO ROTO POR PARRY!', PAL[10], 90);
    }

    boss.hp = mx(0, boss.hp - dmg);
    boss.invuln = mode === 1 ? 18 : 12;
    screenShake = mx(screenShake, mode ? 10 : 6);
    score += dmg * 150;
    sfxTone(460, 140, 0.16, 2, 0.13);

    burst(boss.x, boss.y, 10, 2.1, 18, mode ? PAL[10] : PAL[9]);
    if (boss.hp <= 0) defeatBoss();
  }

  function applyDamage(invT, hpLoss, reason) {
    if (drone.invuln > 0 || drone.overdrive > 0 || (phase !== 0 && phase !== 2)) return;
    drone.invuln = mx(invT, 45);
    drone.hp = mx(0, drone.hp - hpLoss);
    grazeCombo = 0;
    damageFlash = 16;
    screenShake = 11;
    sfxTone(190, 50, 0.25, 2, 0.16);
    if (drone.hp <= 0) {
      deathReason = reason || 'NAVE DESTRUIDA';
      triggerGameOver();
    }
  }

  function triggerGraze(ox, oy) {
    if (drone.grazeCd > 0) return;
    drone.grazeCd = 16;
    grazeCombo = mn(8, grazeCombo + 1);
    grazeTimer = 210;
    drone.pressure = mn(drone.maxPsi, drone.pressure + HULLS[selectedHull]._g + grazeCombo * 2);
    score += 35 * grazeCombo;
    sfxTone(740, 1120, 0.05, 1, 0.05);
    spawnParticle(1, (drone.x + ox) * 0.5, (drone.y + oy) * 0.5, (rn() - 0.5) * 2, -0.9, 14, 2, PAL[10]);
  }

  function triggerActiveSkill() {
    if ((phase !== 0 && phase !== 2) || drone.slamCd > 0 || drone.purge > 0) return;
    const sk = SKILLS[selectedSkill];
    if (phase !== 2 && drone.overdrive <= 0 && drone.pressure < sk._c) {
      sfxTone(150, 100, 0.08, 0, 0.08);
      return;
    }

    if (phase !== 2 && drone.overdrive <= 0) drone.pressure -= sk._c;
    drone.slamCd = sk._l;

    if (selectedSkill === 0) {
      // 0: ESCUDO PARRY — UNICA con Parry (radio estricto 28px)
      drone.parryRing = 14;
      drone.shield = mx(drone.shield, 18);
      sfxTone(460, 880, 0.12, 1, 0.11);

      let reflected = 0;
      for (let i = bossShots.length - 1; i >= 0; i--) {
        const s = bossShots[i];
        if (hy(s._x - drone.x, s._y - drone.y) <= PARRY_RADIUS + s._r) {
          bossShots.splice(i, 1);
          reflected++;
          if (phase === 2) {
            const ang = M.atan2(boss.y - s._y, boss.x - s._x);
            playerShots.push({ _x: s._x, _y: s._y, _vx: cs(ang) * 4.3, _vy: sn(ang) * 4.3, _t: 1, _g: 2 });
          }
        }
      }
      if (reflected > 0) {
        drone.pressure = mn(drone.maxPsi, drone.pressure + 20);
        drone.slamCd = fl(drone.slamCd * 0.45);
        drone.shield = 28;
        screenShake = 8;
        score += 200 * reflected;
        showBanner('PARRY PERFECTO X' + reflected + '!', PAL[10], 75);
        sfxTone(620, 1280, 0.14, 0, 0.13);
        burst(drone.x, drone.y, 12, 2.6, 18, PAL[10]);
      }
    } else if (selectedSkill === 1) {
      // 1: CANON TRIPLE — 3 rayos perforantes (NO hace parry)
      sfxTone(680, 260, 0.11, 2, 0.1);
      for (let k = -1; k <= 1; k++) {
        playerShots.push({ _x: drone.x + k * 4, _y: drone.y - 6, _vx: k * 0.9, _vy: -3.8, _t: 0, _g: 1 });
      }
      drone.vy = mn(drone.vy + 0.25, MAX_VY_DOWN);
    } else if (selectedSkill === 2) {
      // 2: ORBES ESCOLTA — 2 satelites orbitales borran balas, destruyen amenazas y golpean jefes
      drone.orbsT = 210;
      sfxTone(360, 740, 0.14, 1, 0.11);
      burst(drone.x, drone.y, 8, 2.2, 16, PAL[10], PAL[14]);
    } else {
      // 3: TORMENTA EMP — Pulso 96px borra balas/amenazas + rayos auto al jefe o enemigos cercanos
      drone.empR = 8;
      drone.vy = mn(-0.65, drone.vy * 0.2);
      screenShake = 9;
      sfxTone(880, 130, 0.2, 2, 0.13);
      sfxTone(480, 1180, 0.14, 0, 0.09);

      for (let i = bossShots.length - 1; i >= 0; i--) {
        const s = bossShots[i];
        if (hy(s._x - drone.x, s._y - drone.y) <= 96) {
          bossShots.splice(i, 1);
          score += 35;
          spawnParticle(1, s._x, s._y, 0, -0.6, 12, 2, PAL[10]);
        }
      }

      let zaps = 0;
      const zap = (x, y) => {
        if (zaps < 3) {
          empBolts.push({ _x1: drone.x, _y1: drone.y, _x2: x, _y2: y, _t: 18 });
          zaps++;
        }
      };
      if (phase === 2 && boss.active) {
        zap(boss.x, boss.y);
        damageBoss(2, 2);
      }

      for (let c = 0; c < activeChunks.length; c++) {
        const ch = activeChunks[c];
        [ch._foes, ch._saws, ch._gates, ch._vents].forEach((arr, k) => {
          for (let i = arr.length - 1; i >= 0; i--) {
            const it = arr[i];
            const d = hy(it._x - drone.x, it._y - drone.y);
            if (k > 1) {
              if (d <= 102) it._stun = 180;
            } else if (d <= 96 || (zaps < 3 && d <= 165)) {
              zap(it._x, it._y);
              burst(it._x, it._y, 6, 2.1, 15, PAL[10], PAL[6]);
              arr.splice(i, 1);
              score += k ? 100 : 120;
            }
          }
        });
      }
    }
  }

  function triggerGameOver() {
    gameState = 2;
    menuTab = 0;
    screenShake = 14;
    if (maxMeters > highScore) {
      highScore = maxMeters;
      saveProg();
    }
    burst(drone.x, drone.y, 26, 2.2, 24, PAL[6], PAL[9]);
    sfxTone(170, 34, 0.42, 2, 0.17);
  }

  // =========================================================================
  // 8. FISICA, COLISIONES, ENEMIGOS, JEFES Y TRANSICIONES (240 FPS)
  // =========================================================================
  function resolveCircleAABB(p, dt) {
    if (p._brk > 0) return false;
    const xn = mx(p._x1, mn(drone.x, p._x2));
    const yn = mx(p._y1, mn(drone.y, p._y2));
    const dx = drone.x - xn;
    const dy = drone.y - yn;
    const d2 = dx * dx + dy * dy;
    if (d2 >= drone.r * drone.r) return false;

    const d = M.sqrt(d2) || 0.001;
    const nx = dx / d;
    const ny = dy / d;
    drone.x += nx * (drone.r - d);
    drone.y += ny * (drone.r - d);

    if (p._spr && ny < -0.6 && ab(drone.x - (p._x1 + p._x2) * 0.5) < 13) {
      drone.vy = MAX_VY_UP * 1.44;
      drone.pressure = mn(drone.maxPsi, drone.pressure + 16);
      sfxTone(200, 740, 0.14, 1, 0.1);
      for (let i = 0; i < 6; i++) spawnParticle(0, drone.x, p._y1, (rn() - 0.5) * 1.5, 1.3, 14, 2, PAL[10]);
      return true;
    }

    const vn = drone.vx * nx + drone.vy * ny;
    if (vn < 0) {
      if (!p._wall && ny < -0.65 && ab(drone.vy) < 1.35 && !drone.leftOn && !drone.rightOn) {
        drone.vy = 0;
        drone.vx = drone.vx * (currentLevel === 2 ? 0.94 : 0.74) + (p._vx || 0) * 0.25;
        drone.grounded = true;
      } else {
        drone.vx -= (1 + RESTITUTION) * vn * nx;
        drone.vy -= (1 + RESTITUTION) * vn * ny;
        if (-vn > 0.7) sfxTone(220, 90, 0.05, 1, 0.05);
      }
    }

    if (!p._wall && ny < -0.65) {
      drone.cooling = true;
      drone.pressure = mn(drone.maxPsi, drone.pressure + 1.05 * (p._cool || 1) * dt);
      if (p._frag && !(p._cr > 0)) p._cr = 38;
    }
    return true;
  }

  function updateBossCombat(dt) {
    const enr = boss.hp <= boss.maxHp >> 1 ? 1.28 : 1.0;
    boss.phaseTimer += dt;
    if (boss.invuln > 0) boss.invuln = mx(0, boss.invuln - dt);

    if (boss.type >= 1 && boss.shield <= 0 && ((elapsedTime * 10) | 0) % 75 === 0 && rn() < 0.05 * dt) boss.shield = 135;
    if (boss.shield > 0) boss.shield = mx(0, boss.shield - dt);

    const pt = boss.type;
    const rad = (yo, a, sp, r, g, b) => pushShot(boss.x, boss.y + yo, cs(a) * sp * enr, sn(a) * sp * enr, r, g, b);
    if (pt === 0) {
      boss.x = W * 0.5 + sn(elapsedTime * 1.55 * enr) * 76;
      boss.y = boss.baseY + sn(elapsedTime * 3.1) * 10;
      if (boss.phaseTimer > 64 / enr) {
        boss.phaseTimer = 0;
        const ang = M.atan2(drone.y - boss.y, drone.x - boss.x);
        for (let k = -1; k <= 1; k++) rad(8, ang + k * 0.26, 1.6);
        sfxTone(420, 150, 0.1, 0, 0.08);
      }
    } else if (pt === 1) {
      boss.x += boss.vx * enr * dt;
      if (boss.x < WALL_L + 30 || boss.x > WALL_R - 30) boss.vx = -boss.vx;
      boss.y = boss.baseY - ab(sn(elapsedTime * 2.8)) * 18;
      if (boss.phaseTimer > 54 / enr) {
        boss.phaseTimer = 0;
        pushShot(boss.x, boss.y + 8, 1.55 * enr, 0.75, 4, 0.025, 1);
        pushShot(boss.x, boss.y + 8, -1.55 * enr, 0.75, 4, 0.025, 1);
        sfxTone(540, 260, 0.1, 1, 0.08);
      }
    } else if (pt === 2) {
      boss.x = W * 0.5 + sn(elapsedTime * 1.3 * enr) * 62;
      boss.y = boss.baseY + cs(elapsedTime * 2.2) * 12;
      if (boss.phaseTimer > 56 / enr) {
        boss.phaseTimer = 0;
        const nShots = boss.hp <= boss.maxHp >> 1 ? 8 : 6;
        for (let k = 0; k < nShots; k++) rad(0, elapsedTime * 2.1 + (k * PI2) / nShots, 1.48);
        sfxTone(760, 320, 0.12, 3, 0.08);
      }
    } else {
      boss.x = W * 0.5 + sn(elapsedTime * 1.9 * enr) * 86;
      boss.y = boss.baseY + sn(elapsedTime * 3.8) * 14;
      if (boss.phaseTimer > 52 / enr) {
        boss.phaseTimer = 0;
        const ang = M.atan2(drone.y - boss.y, drone.x - boss.x);
        rad(0, ang, 2.1, 5);
        for (let k = 0; k < 4; k++) rad(0, ang + 0.4 + (k * PI2) / 4, 1.4, 4, 0, 1);
        sfxTone(880, 240, 0.13, 2, 0.09);
      }
    }

    if (boss.invuln <= 0 && hitByOrbs(boss.x, boss.y, boss.r + 7)) damageBoss(1, 0);

    const db = hy(drone.x - boss.x, drone.y - boss.y) || 0.001;
    if (db <= drone.r + boss.r) {
      const nx = (drone.x - boss.x) / db;
      const ny = (drone.y - boss.y) / db;
      drone.x = boss.x + nx * (drone.r + boss.r + 2);
      drone.y = boss.y + ny * (drone.r + boss.r + 2);
      drone.vx = nx * 1.8;
      drone.vy = ny * 1.8;
      if (drone.overdrive > 0) damageBoss(1, 0);
      else applyDamage(30, 1, 'APLASTADO POR ' + LEVELS[currentLevel % 4]._b);
    } else if (db <= drone.r + boss.r + 6) {
      triggerGraze(boss.x, boss.y);
    }

    stepBossShots(dt, 50, 'ABATIDO EN COMBATE');
  }

  function advanceAfterBoss() {
    if (gameMode === 2) {
      boss.active = false;
      phase = 0;
      nextBossMeters += 140;
      currentLevel = (currentLevel + 1) % 4;
      drone.hp = mn(drone.maxHp, drone.hp + 1);
      if (activeChunks.length > 0) {
        activeChunks[activeChunks.length - 1]._plats.push({ _x1: mx(WALL_L + 10, drone.x - 45), _y1: drone.y + 14, _x2: mn(WALL_R - 10, drone.x + 45), _y2: drone.y + 23, _w: 90, _cool: 1, _vx: 0 });
      }
      showBanner('ZONA SIGUIENTE! +1 HP', PAL[14], 110);
      return;
    }
    if (currentLevel < 3) loadLevelWorld(currentLevel + 1, true);
    else {
      phase = 5;
      phaseTimer = 0;
      saveProg();
      playJingle(1);
    }
  }

  function updatePhysics(dt) {
    elapsedTime += dt / 60;
    runSeconds += dt / 60;
    bannerTimer = mx(0, bannerTimer - dt);
    if (grazeTimer > 0) {
      grazeTimer = mx(0, grazeTimer - dt);
      if (grazeTimer <= 0) grazeCombo = 0;
    }

    if (phase === 1) {
      phaseTimer -= dt;
      boss.y += (boss.baseY - boss.y) * 0.08 * dt;
      camY += (boss.arenaY - camY) * 0.14 * dt;
      if (phaseTimer <= 0) {
        phase = 2;
        seqStep = 0;
        barCount = 0;
        if (audioCtx) nextNoteTime = audioCtx.currentTime + 0.04;
      }
      return;
    }
    if (phase === 3) {
      phaseTimer -= dt;
      if (((phaseTimer * 0.6) | 0) % 5 === 0 && rn() < 0.55 * dt) {
        burst(boss.x + (rn() - 0.5) * 26, boss.y + (rn() - 0.5) * 20, 5, 2.2, 22, PAL[6], PAL[9]);
        sfxTone(260, 70, 0.09, 2, 0.07);
      }
      if (phaseTimer <= 0) {
        phase = 4;
        phaseTimer = 175;
      }
      return;
    }
    if (phase === 4) {
      phaseTimer -= dt;
      if (phaseTimer <= 0) advanceAfterBoss();
      return;
    }
    if (phase === 5) return;

    drone.invuln = mx(0, drone.invuln - dt);
    drone.shield = mx(0, drone.shield - dt);
    drone.parryRing = mx(0, drone.parryRing - dt);
    drone.orbsT = mx(0, drone.orbsT - dt);
    drone.grazeCd = mx(0, drone.grazeCd - dt);
    drone.slamCd = mx(0, drone.slamCd - dt);
    if (drone.empR > 0) {
      drone.empR += 5.2 * dt;
      if (drone.empR > 96) drone.empR = 0;
    }
    for (let i = empBolts.length - 1; i >= 0; i--) {
      empBolts[i]._t -= dt;
      if (empBolts[i]._t <= 0) empBolts.splice(i, 1);
    }

    const hull = HULLS[selectedHull];
    const wantL = !!(keys['ArrowLeft'] || keys['KeyA'] || touchLeft);
    const wantR = !!(keys['ArrowRight'] || keys['KeyD'] || touchRight);

    if (phase === 2 || drone.overdrive > 0) {
      if (drone.overdrive > 0) drone.overdrive = mx(0, drone.overdrive - dt);
      drone.pressure = drone.maxPsi;
      drone.purge = 0;
    }

    if (drone.purge > 0) {
      drone.purge = mx(0, drone.purge - dt);
      drone.leftOn = false;
      drone.rightOn = false;
      if (rn() < 0.25 * dt) spawnParticle(0, drone.x, drone.y - 5, (rn() - 0.5) * 0.7, -0.8, 16, 2, PAL[13]);
      if (drone.purge <= 0) drone.pressure = 42;
    } else {
      drone.leftOn = wantL;
      drone.rightOn = wantR;
      const act = (drone.leftOn ? 1 : 0) + (drone.rightOn ? 1 : 0);
      if (phase !== 2 && act > 0 && drone.overdrive <= 0) {
        drone.pressure = mx(0, drone.pressure - 0.24 * act * hull._s * dt);
        if (drone.pressure <= 0) {
          drone.purge = 62;
          screenShake = 5;
          sfxTone(420, 110, 0.28, 2, 0.12);
        }
      } else if (phase !== 2 && !drone.grounded && drone.pressure < drone.maxPsi) {
        drone.pressure = mn(drone.maxPsi, drone.pressure + 0.085 * dt);
      }
    }

    const boost = drone.overdrive > 0 ? 1.48 : 1.0;
    let ax = currentLevel === 2 && phase === 0 ? sn(elapsedTime * 1.8) * 0.012 : 0;
    let ay = 0;
    [drone.leftOn, drone.rightOn].forEach((on, i) => {
      if (!on) return;
      const s = i ? -1 : 1;
      ax += s * THRUST_X * hull._x * boost;
      ay += THRUST_Y * hull._y * boost;
      if (rn() < 0.75 * dt) spawnParticle(0, drone.x - s * 5, drone.y + 4, -s * 0.6, 1.1, 12, 2, PAL[13]);
    });

    if (drone.leftOn || drone.rightOn) {
      if (steamCooldown <= 0) {
        sfxSteam(drone.leftOn && drone.rightOn);
        steamCooldown = 5;
      }
    }
    if (steamCooldown > 0) steamCooldown -= dt;

    const dragF = M.pow(DRAG, dt);
    drone.vx = mx(-MAX_VX, mn(MAX_VX, (drone.vx + ax * dt) * dragF));
    drone.vy = mx(MAX_VY_UP, mn(MAX_VY_DOWN, (drone.vy + (GRAVITY + ay) * dt) * dragF));
    drone.x += drone.vx * dt;
    drone.y += drone.vy * dt;
    drone.theta = drone.vx * 0.12;
    drone.cooling = false;
    drone.grounded = false;

    for (let i = playerShots.length - 1; i >= 0; i--) {
      const ps = playerShots[i];
      ps._x += ps._vx * dt;
      ps._y += ps._vy * dt;
      if (phase === 2 && hy(ps._x - boss.x, ps._y - boss.y) < boss.r + 6) {
        playerShots.splice(i, 1);
        damageBoss(ps._g, ps._t ? 1 : 0);
        continue;
      }
      if (ps._y < camY - 40 || ps._y > camY + H + 30 || ps._x < WALL_L || ps._x > WALL_R) playerShots.splice(i, 1);
    }

    if (phase === 2) {
      if (drone.x < WALL_L + drone.r) {
        drone.x = WALL_L + drone.r;
        drone.vx = ab(drone.vx) * 0.5;
      }
      if (drone.x > WALL_R - drone.r) {
        drone.x = WALL_R - drone.r;
        drone.vx = -ab(drone.vx) * 0.5;
      }
      if (drone.y < boss.arenaY + 48) {
        drone.y = boss.arenaY + 48;
        drone.vy = mx(0, drone.vy);
      }
      if (drone.y > boss.arenaY + H - 18) {
        drone.y = boss.arenaY + H - 18;
        drone.vy = -1.95;
        sfxTone(300, 560, 0.08, 1, 0.08);
      }
      updateBossCombat(dt);
      return;
    }

    const lv = LEVELS[currentLevel % 4];
    lavaY = mn(lavaY - lv._vy * (1 + ngPlus * 0.15) * dt, drone.y + H * 1.1);
    if (drone.y + drone.r >= lavaY) {
      deathReason = 'CONSUMIDO POR EL MAGMA';
      triggerGameOver();
      return;
    }

    for (let c = 0; c < activeChunks.length; c++) {
      const ch = activeChunks[c];
      if (ch._yBot < camY - 120 || ch._yTop > camY + H + 120) continue;

      for (let i = 0; i < ch._plats.length; i++) {
        const p = ch._plats[i];
        if (p._vx) {
          p._x1 += p._vx * dt;
          if (p._x1 < WALL_L + 8 || p._x1 + p._w > WALL_R - 8) {
            p._x1 = mx(WALL_L + 8, mn(WALL_R - 8 - p._w, p._x1));
            p._vx = -p._vx;
          }
          p._x2 = p._x1 + p._w;
        }
        if (p._cr > 0) {
          p._cr -= dt;
          if (p._cr <= 0) p._brk = 180;
        } else if (p._brk > 0) p._brk -= dt;
        resolveCircleAABB(p, dt);
      }

      for (let i = 0; i < ch._rests.length; i++) {
        const rs = ch._rests[i];
        if (hy(drone.x - rs._x, drone.y - rs._y) < 20) {
          drone.pressure = drone.maxPsi;
          drone.purge = 0;
          if (!rs._on) {
            rs._on = 1;
            if (drone.hp < drone.maxHp) drone.hp++;
            score += 250;
            showBanner('ESTACION: +1 HP Y PSI', PAL[14], 110);
            playJingle(0);
            burst(rs._x, rs._y, 10, 1.6, 20, PAL[14]);
          }
        }
      }

      for (let i = 0; i < ch._cores.length; i++) {
        const co = ch._cores[i];
        if (co._on && hy(drone.x - co._x, drone.y - co._y) < drone.r + 6) {
          co._on = 0;
          drone.cores++;
          score += 100;
          if (drone.cores >= 3) {
            drone.cores = 0;
            drone.overdrive = 220;
            showBanner('!OVERDRIVE ACTIVADO!', PAL[6], 100);
            sfxTone(440, 1100, 0.25, 0, 0.12);
          } else sfxTone(660, 990, 0.08, 1, 0.09);
        }
      }

      for (let i = 0; i < ch._gates.length; i++) {
        const gt = ch._gates[i];
        if (gt._stun > 0) {
          gt._stun -= dt;
          continue;
        }
        const cyc = cycOf(gt);
        if (cyc >= 102 && cyc < 138 && ab(drone.y - gt._y) < drone.r + 3 && drone.x > gt._x && drone.x < gt._x + gt._w) {
          applyDamage(30, 1, 'CORTADO POR COMPUERTA');
        }
      }

      for (let i = 0; i < ch._vents.length; i++) {
        const vt = ch._vents[i];
        if (vt._stun > 0) {
          vt._stun -= dt;
          continue;
        }
        const cyc = cycOf(vt);
        if (cyc >= 106 && cyc < 144 && ab(drone.y - vt._y) < 10) {
          const dist = (drone.x - vt._x) * vt._dir;
          if (dist > 0 && dist < 56) {
            drone.vx += vt._dir * 0.22 * dt;
            if (dist < 28) applyDamage(26, 1, 'QUEMADO POR VALVULA');
            else triggerGraze(vt._x + vt._dir * 20, vt._y);
          }
        }
      }

      for (let i = ch._foes.length - 1; i >= 0; i--) {
        const e = ch._foes[i];
        if (e._stun > 0) {
          e._stun -= dt;
          continue;
        }
        e._x += e._vx * dt;
        if (e._x < WALL_L + 16 || e._x > WALL_R - 16) e._vx = -e._vx;

        let dead = hitByOrbs(e._x, e._y, 13);
        if (!dead) {
          for (let j = playerShots.length - 1; j >= 0; j--) {
            if (hy(playerShots[j]._x - e._x, playerShots[j]._y - e._y) < 10) {
              playerShots.splice(j, 1);
              if (--e._hp <= 0) dead = 1;
              break;
            }
          }
        }
        if (dead) {
          ch._foes.splice(i, 1);
          score += 120;
          sfxTone(360, 110, 0.12, 2, 0.1);
          burst(e._x, e._y, 8, 2.2, 16, PAL[9]);
          continue;
        }

        if (e._y > camY + 20 && e._y < camY + H - 20) {
          e._cd -= dt;
          if (e._cd <= 0) {
            e._cd = e._t === 1 ? 98 : 122;
            const ang = M.atan2(drone.y - e._y, drone.x - e._x);
            pushShot(e._x, e._y, cs(ang) * 1.4, sn(ang) * 1.4, 3);
          }
        }

        const df = hy(drone.x - e._x, drone.y - e._y);
        if (df < drone.r + 6) applyDamage(26, 1, 'INTERCEPTADO POR CENTINELA');
        else if (df < drone.r + 12) triggerGraze(e._x, e._y);
      }

      for (let i = ch._saws.length - 1; i >= 0; i--) {
        const g = ch._saws[i];
        if (g._stun > 0) {
          g._stun -= dt;
          continue;
        }
        g._ang += g._omg * dt;
        g._x += g._vx * dt;
        if (g._x < WALL_L + g._r + 6 || g._x > WALL_R - g._r - 6) g._vx = -g._vx;

        const ds = hy(drone.x - g._x, drone.y - g._y) || 0.001;
        if ((drone.overdrive > 0 && ds <= drone.r + g._r) || hitByOrbs(g._x, g._y, g._r + 7)) {
          ch._saws.splice(i, 1);
          score += 100;
          burst(g._x, g._y, 6, 2, 14, PAL[10]);
          sfxTone(320, 90, 0.12, 2, 0.1);
          continue;
        }
        if (ds <= drone.r + g._r) {
          drone.vx = ((drone.x - g._x) / ds) * 1.6;
          drone.vy = ((drone.y - g._y) / ds) * 1.6;
          applyDamage(28, 1, 'DESTRUIDO POR SIERRA');
        } else if (ds <= drone.r + g._r + 6) triggerGraze(g._x, g._y);
      }
    }

    stepBossShots(dt, 30, 'ALCANZADO POR PROYECTIL');

    const targetCamY = drone.y - H * 0.56;
    if (targetCamY < camY) camY += (targetCamY - camY) * (1 - M.pow(0.85, dt));
    else if (targetCamY > camY + 26) camY += (targetCamY - camY - 26) * (1 - M.pow(0.9, dt));

    const cm = getHeightM(drone.y);
    if (cm > maxMeters) maxMeters = cm;

    if (gameMode === 0) {
      const distM = mx(0, fl((drone.y - levelGoalY) / 12));
      if (distM <= 30 && warnAlertLevel === 0) {
        warnAlertLevel = 1;
        playJingle(2);
      } else if (distM <= 12 && warnAlertLevel === 1) {
        warnAlertLevel = 2;
        playJingle(2);
      }
      if (drone.y <= levelGoalY) beginBossIntro(currentLevel);
    } else if (gameMode === 2) {
      while (activeChunks[activeChunks.length - 1]._yTop > camY - H) {
        topChunkIndex++;
        const nextLv = fl(topChunkIndex / 6) % 4;
        activeChunks.push(createChunk(topChunkIndex, nextLv, false));
        currentLevel = nextLv;
      }
      if (activeChunks.length > 4 && activeChunks[0]._yTop > camY + H + 120) activeChunks.shift();
      if (maxMeters >= nextBossMeters) beginBossIntro(fl(maxMeters / 120) % 4);
    }
  }

  function updateParticles(dt) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = particles[i];
      if (!p._on) continue;
      p._x += p._vx * dt;
      p._y += p._vy * dt;
      if (p._t === 1) p._vy += 0.04 * dt;
      p._l -= dt;
      if (p._l <= 0) p._on = 0;
    }
  }

  // =========================================================================
  // 9. RENDERIZADO ESTILO V6 (BIOMAS HSL, POD OCULAR, SIERRAS DENTADAS, LAVA)
  // =========================================================================
  function drawBackground(cy, lv) {
    const p = lv._p;
    fR(0, 0, W, H, p[0]);

    // Tuberias industriales parallax (estilo v6)
    const pSlow = fl(-cy * 0.22);
    const pipes = [WALL_L + 18, W * 0.5 - 6, WALL_R - 30];
    pipes.forEach((px) => fR(px, 0, 12, H, p[1]));

    for (let sy = ((pSlow % 44) + 44) % 44 - 44; sy < H; sy += 44) {
      fR(WALL_L + 16, sy + 6, PLAY_W - 32, 3, p[1]);
      pipes.forEach((px) => fR(px - 1, sy + 18, 14, 4, p[2]));

      if (lv._pat === 0) {
        fR(68, sy + 12, 6, 12, PAL[3]);
        fR(246, sy + 12, 6, 12, PAL[3]);
      } else if (lv._pat === 1) {
        fR(156, sy + 24, 8, 5, ((elapsedTime * 5) | 0) & 1 ? PAL[10] : PAL[12]);
      } else if (lv._pat === 3) {
        fR(96, sy + 10, 4, 14, p[3]);
        fR(220, sy + 10, 4, 14, p[3]);
      } else {
        fR(158, sy + 10, 4, 14, PAL[6]);
      }
    }

    // Muros laterales V6 con ladrillos y ribete brillante
    fR(0, 0, WALL_L, H, p[2]);
    fR(WALL_R, 0, W - WALL_R, H, p[2]);
    fR(WALL_L - 2, 0, 2, H, p[3]);
    fR(WALL_R, 0, 2, H, p[3]);

    const pWall = fl(-cy);
    const alarmFlash = warnAlertLevel > 0 && (((elapsedTime * 8) | 0) & 1);
    for (let sy = ((pWall % 24) + 24) % 24 - 24; sy < H; sy += 24) {
      [2, WALL_R + 4].forEach((wx, idx) => {
        fR(wx, sy + 2, 16, 18, p[1]);
        fR(wx + (idx ? 6 : 5), sy + 8, 5, 6, alarmFlash ? PAL[8] : p[3]);
      });
    }
  }

  function drawDronePod(cx, cy, ang, hull, eyeDx, eyeDy, fireL, fireR, isOver, isDash) {
    rot(cx, cy, ang, () => {
      const jC = isOver ? PAL[6] : isDash ? PAL[10] : PAL[9];
      [-9, 5].forEach((nx, i) => {
        fR(nx, 1, 4, 5, PAL[4]);
        if (i ? fireR : fireL) {
          const f = 7 + ((elapsedTime * 30) & 3);
          fR(nx, 6, 4, f, jC);
          fR(nx + 1, 6, 2, fl(f * 0.5), PAL[13]);
        }
      });

      const hi = HULLS.indexOf(hull);
      if (hi === 1) {
        fR(-9, -4, 3, 6, hull._p[0]);
        fR(6, -4, 3, 6, hull._p[0]);
      } else if (hi === 2) {
        fR(-10, -2, 4, 3, PAL[10]);
        fR(6, -2, 4, 3, PAL[10]);
        fR(-1, -10, 2, 4, hull._p[2]);
      } else if (hi === 3) {
        fArc(cs(elapsedTime * 5) * 9, sn(elapsedTime * 5) * 6, 2, PAL[10]);
        fArc(-cs(elapsedTime * 5) * 9, -sn(elapsedTime * 5) * 6, 2, PAL[15]);
      }

      fArc(0, 0, 7, hull._p[1]);
      fArc(0, 0, 6, hull._p[0]);
      fR(-2, -9, 4, 3, hull._p[2]);
      fArc(0, 0, 4.2, PAL[0]);
      fArc(eyeDx, eyeDy, 1.8, PAL[13]);
      fArc(eyeDx * 1.15, eyeDy * 1.15, 0.9, PAL[0]);
      fArc(-2, -2, 1.3, PAL[10]);
    });
  }

  function drawBossActor(lv) {
    const bx = boss.x;
    const by = boss.y - camY;
    if (boss.invuln > 0 && (((boss.invuln * 0.6) | 0) & 1)) return;

    rot(bx, by, [elapsedTime * 1.6, -elapsedTime * 2.4, elapsedTime * 1.3, elapsedTime * 1.9][boss.type], () => {
      if (boss.type === 0) {
        drawToothed(16, 18, 13, PAL[3], PAL[9]);
        drawToothed(10, 12, 8, PAL[7], PAL[5]);
      } else if (boss.type === 1) {
        drawToothed(14, 18, 12, '#1e1b4b', PAL[10]);
        fR(-21, -3, 5, 6, PAL[15]);
        fR(16, -3, 5, 6, PAL[15]);
      } else if (boss.type === 2) {
        drawToothed(12, 17, 13, '#064e3b', PAL[14]);
        for (let k = 0; k < 3; k++) {
          const a = elapsedTime * 1.7 + (k * PI2) / 3;
          fArc(cs(a) * 19, sn(a) * 19, 3.5, PAL[14]);
        }
      } else {
        drawToothed(18, 19, 14, '#3b0764', PAL[6]);
        ctx.rotate(-elapsedTime * 3.8);
        drawToothed(8, 13, 8, PAL[15], PAL[13]);
      }
      fArc(0, 0, 7.5, PAL[0]);
      fArc(0, 0, 4.5 + sn(elapsedTime * 8), lv._p[10]);
    });

    if (boss.shield > 0) cArc(bx, by, boss.r + 5, PAL[10], 2);
  }

  function drawEnemyActor(e, cy) {
    rot(e._x, e._y - cy, [elapsedTime * 3, 0, -elapsedTime * 2, sn(elapsedTime * 4) * 0.25][e._t], () => {
      if (e._t === 0) {
        drawToothed(8, 8, 5.5, PAL[7], PAL[9]);
        fArc(0, 0, 3, PAL[6]);
      } else if (e._t === 1) {
        fR(-7, -3, 14, 6, '#1e3a8a');
        fArc(-7, 0, 3, PAL[10]);
        fArc(7, 0, 3, PAL[10]);
        fArc(0, 0, 4, PAL[6]);
      } else if (e._t === 2) {
        drawToothed(6, 8, 6, '#064e3b', PAL[14]);
        fArc(0, 0, 3.2, PAL[11]);
      } else {
        fR(-9, -2, 18, 4, '#581c87');
        drawToothed(8, 7, 4, PAL[4], PAL[6]);
        fArc(0, 0, 2.5, PAL[8]);
      }
      if (e._stun > 0) cArc(0, 0, 10, PAL[10], 1.5);
    });
  }

  function drawWorld(cy, lv) {
    if (phase === 2 || phase === 1 || phase === 3) {
      fR(WALL_L, H - 14, PLAY_W, 3, PAL[10]);
      if (boss.active) drawBossActor(lv);
    } else {
      // Marcadores de horizonte V6 (tramos / torre / meta del jefe)
      for (let mMark = 60; mMark < 1000; mMark += 60) {
        const my = (200 - mMark * 12 - cy) | 0;
        if (my > -10 && my < H + 10) {
          for (let x = WALL_L; x < WALL_R; x += 14) fR(x, my, 7, 1, lv._p[3]);
          drawText('COTAS ' + mMark + 'M', WALL_L + 6, my - 8, lv._p[3], 1, 0);
        }
      }
      if (gameMode === 0) {
        const gy = (levelGoalY - cy) | 0;
        if (gy > -20 && gy < H + 20) {
          for (let x = WALL_L; x < WALL_R; x += 12) fR(x, gy, 7, 2, ((elapsedTime * 10) | 0) & 1 ? PAL[8] : PAL[6]);
          drawText('COMPUERTA DEL JEFE', W * 0.5, gy - 10, PAL[6], 1, 1);
        }
      }

      for (let c = 0; c < activeChunks.length; c++) {
        const ch = activeChunks[c];
        if (ch._yBot < cy - 30 || ch._yTop > cy + H + 30) continue;

        for (let i = 0; i < ch._plats.length; i++) {
          const p = ch._plats[i];
          if ((p._wall && !p._bar) || p._brk > 0) continue;
          const sx = p._x1 | 0;
          const sy = (p._y1 - cy) | 0;
          const pw = (p._x2 - p._x1) | 0;
          const ph = (p._y2 - p._y1) | 0;

          if (p._rest) {
            fR(sx, sy, pw, ph, '#064e3b');
            fR(sx, sy, pw, 2, PAL[14]);
            for (let k = 6; k < pw - 6; k += 14) fR(sx + k, sy + 4, 4, 2, PAL[13]);
            drawText('ESTACION DESCANSO', sx + pw * 0.5, sy - 26, PAL[14], 1, 1);
          } else if (p._bar) {
            fR(sx, sy, pw, ph, lv._p[2]);
            fR(sx, sy, pw, 2, lv._p[3]);
          } else {
            fR(sx, sy, pw, ph, p._frag ? PAL[3] : lv._p[4]);
            fR(sx, sy, pw, 2, p._frag ? PAL[9] : lv._p[5]);
            for (let rx = sx + 5; rx < sx + pw - 5; rx += 10) fR(rx, sy + 4, 4, 1, PAL[13]);
            if (p._spr) {
              const mxp = (sx + pw * 0.5) | 0;
              fR(mxp - 8, sy - 3, 16, 3, PAL[5]);
              fR(mxp - 6, sy - 5, 12, 2, PAL[10]);
            }
          }
        }

        for (let i = 0; i < ch._rests.length; i++) {
          const rs = ch._rests[i];
          const ry = rs._y - cy;
          rot(rs._x, ry, rs._on ? 0 : elapsedTime * 2, () => drawToothed(8, 10, 8, rs._on ? PAL[1] : '#064e3b', rs._on ? PAL[12] : PAL[14]));
          fArc(rs._x, ry, 4, rs._on ? PAL[12] : PAL[10]);
          if (!rs._on) {
            fR(rs._x - 3, ry - 1, 6, 2, PAL[13]);
            fR(rs._x - 1, ry - 3, 2, 6, PAL[13]);
          }
        }

        for (let i = 0; i < ch._cores.length; i++) {
          const co = ch._cores[i];
          if (!co._on) continue;
          rot(co._x, co._y - cy + sn(elapsedTime * 5) * 1.5, elapsedTime * 3, () => {
            fR(-4, -4, 8, 8, PAL[5]);
            ctx.rotate(M.PI * 0.25);
            fR(-3, -3, 6, 6, PAL[6]);
            fArc(0, 0, 1.5, PAL[13]);
          });
        }

        // Valvulas de vapor laterales V6
        for (let i = 0; i < ch._vents.length; i++) {
          const vt = ch._vents[i];
          const vy = vt._y - cy;
          const cyc = cycOf(vt);
          fR(vt._dir > 0 ? vt._x : vt._x - 7, vy - 4, 7, 8, PAL[4]);
          fArc(vt._x + vt._dir * 3, vy, 2, cyc >= 72 && cyc < 106 ? PAL[6] : PAL[8]);
          if (vt._stun <= 0 && cyc >= 106 && cyc < 144) {
            for (let k = 0; k < 5; k++) {
              fArc(vt._x + vt._dir * (10 + k * 10), vy + sn(elapsedTime * 18 + k) * 2, 5 - k * 0.6, k < 2 ? PAL[9] : PAL[13]);
            }
          }
        }

        // Compuertas telescopicas V6
        for (let i = 0; i < ch._gates.length; i++) {
          const gt = ch._gates[i];
          const cyc = cycOf(gt);
          const sy = (gt._y - cy) | 0;
          fR(gt._x, sy - 4, 4, 8, PAL[4]);
          fR(gt._x + gt._w - 4, sy - 4, 4, 8, PAL[4]);
          if (gt._stun <= 0) {
            if (cyc >= 80 && cyc < 102 && (((elapsedTime * 16) | 0) & 1)) fR(gt._x + 4, sy, gt._w - 8, 2, PAL[6]);
            else if (cyc >= 102 && cyc < 138) {
              fR(gt._x + 4, sy - 2, gt._w - 8, 4, PAL[8]);
              fR(gt._x + 4, sy - 1, gt._w - 8, 2, PAL[13]);
            }
          }
        }

        for (let i = 0; i < ch._foes.length; i++) drawEnemyActor(ch._foes[i], cy);

        for (let i = 0; i < ch._saws.length; i++) {
          const g = ch._saws[i];
          rot(g._x, g._y - cy, g._ang, () => {
            drawToothed(14, g._r + 1.5, g._r - 2, g._stun > 0 ? PAL[10] : lv._p[6], lv._p[7]);
            fArc(0, 0, 3, PAL[0]);
            fArc(0, 0, 1.5, g._stun > 0 ? PAL[11] : PAL[8]);
          });
        }
      }
    }

    for (let i = 0; i < playerShots.length; i++) {
      const ps = playerShots[i];
      fArc(ps._x, ps._y - cy, ps._t ? 4 : 3, ps._t ? PAL[10] : PAL[6]);
      fArc(ps._x, ps._y - cy, 1.5, PAL[13]);
    }

    const canShowParryHint = selectedSkill === 0 && drone.slamCd <= 0;
    for (let i = 0; i < bossShots.length; i++) {
      const s = bossShots[i];
      const sx = s._x | 0;
      const sy = (s._y - cy) | 0;
      const near = canShowParryHint && hy(s._x - drone.x, s._y - drone.y) <= PARRY_RADIUS + 6;
      fArc(sx, sy, s._r, near ? PAL[10] : PAL[9]);
      fArc(sx, sy, 1.5, PAL[13]);
      if (near) sR(sx - 6, sy - 6, 12, 12, PAL[10]);
    }

    for (let i = 0; i < empBolts.length; i++) {
      const b = empBolts[i];
      const y1 = b._y1 - cy;
      const y2 = b._y2 - cy;
      ctx.strokeStyle = ((b._t | 0) & 1) ? PAL[13] : PAL[10];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b._x1, y1);
      for (let s = 1; s < 4; s++) {
        const t = s * 0.25;
        ctx.lineTo(b._x1 + (b._x2 - b._x1) * t + (rn() - 0.5) * 14, y1 + (y2 - y1) * t + (rn() - 0.5) * 14);
      }
      ctx.lineTo(b._x2, y2);
      ctx.stroke();
    }
  }

  function drawDrone(cy) {
    const dx = drone.x;
    const dy = drone.y - cy;

    if (drone.parryRing > 0 || drone.empR > 0 || drone.shield > 0 || drone.overdrive > 0) {
      cArc(
        dx, dy,
        drone.parryRing > 0 ? PARRY_RADIUS : drone.empR > 0 ? drone.empR : 11,
        drone.overdrive > 0 ? PAL[6] : PAL[10],
        drone.parryRing > 0 || drone.empR > 0 ? 2 : 1.5
      );
      if (drone.empR > 12) cArc(dx, dy, drone.empR * 0.68, PAL[6], 1.5);
    }

    if (drone.orbsT > 0 && (drone.orbsT > 35 || ((drone.orbsT * 0.5) | 0) & 1)) {
      cArc(dx, dy, 24, 'rgba(56,189,248,0.28)', 1);
      for (let k = 0; k < 2; k++) {
        const a = elapsedTime * 5.4 + k * M.PI;
        const ox = dx + cs(a) * 24;
        const oy = dy + sn(a) * 24;
        fArc(ox, oy, 4.5, PAL[10]);
        fArc(ox, oy, 2, PAL[13]);
        cArc(ox, oy, 6, PAL[6], 1);
      }
    }

    ctx.globalAlpha = drone.invuln > 0 && (((drone.invuln * 0.5) | 0) & 1) ? 0.45 : 1;
    const lookX = phase === 2 ? boss.x - drone.x : drone.vx;
    const lookY = phase === 2 ? boss.y - drone.y : drone.vy;
    const lm = hy(lookX, lookY) || 1;
    drawDronePod(dx, dy, drone.theta, HULLS[selectedHull], (lookX / lm) * 1.8, (lookY / lm) * 1.8, drone.leftOn, drone.rightOn, drone.overdrive > 0, drone.orbsT > 0);
    ctx.globalAlpha = 1;
  }

  function drawLava(cy, lv) {
    const sy = (lavaY - cy) | 0;
    if (sy >= H) return;
    fR(WALL_L, sy + 6, PLAY_W, H - sy + 12, lv._p[8]);
    fR(WALL_L, sy + 2, PLAY_W, 8, lv._p[9]);
    for (let x = WALL_L; x < WALL_R; x += 6) {
      const wy = sy + ((sn(elapsedTime * 7 + x * 0.14) * 2) | 0);
      fR(x, wy, 6, 3, lv._p[10]);
      if (((x + ((elapsedTime * 20) | 0)) % 24) === 0) fR(x + 2, wy - 1, 2, 1, lv._p[11]);
    }
  }

  function drawParticles(cy) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = particles[i];
      if (p._on) fArc(p._x, p._y - cy, p._s * 0.6, p._c);
    }
  }

  function drawHUD(lv) {
    fR(0, 0, W, 24, PAL[0]);
    fR(0, 23, W, 2, lv._p[3]);

    drawText('HP', 6, 4, PAL[11], 1, 0);
    for (let i = 0; i < drone.maxHp; i++) fR(20 + i * 7, 4, 5, 7, i < drone.hp ? (drone.hp <= 1 ? PAL[8] : PAL[5]) : PAL[1]);

    drawText('PSI', 6, 13, PAL[6], 1, 0);
    fR(28, 13, 56, 7, PAL[1]);
    const rPsi = drone.pressure / drone.maxPsi;
    fR(29, 14, fl(54 * rPsi), 5, drone.purge > 0 ? PAL[8] : phase === 2 || drone.overdrive > 0 ? PAL[10] : rPsi < 0.25 ? PAL[9] : PAL[5]);
    if (phase === 2) drawText('INF', 87, 13, PAL[10], 1, 0);

    const goalText = gameMode === 0 ? maxMeters + '/' + lv._l + 'M' : maxMeters + 'M';
    drawText(lv._a, 160, 4, PAL[6], 1, 1, PAL[13]);
    drawText('ALT:' + goalText + (grazeCombo > 1 ? ' X' + grazeCombo : ''), 160, 13, PAL[11], 1, 1);

    const ready = drone.slamCd <= 0 && drone.purge <= 0;
    drawText('HAB:' + (ready ? 'LISTA' : fl(drone.slamCd / 6)), 314, 4, ready ? PAL[14] : PAL[4], 1, 2);
    drawText('PTS:' + score, 314, 13, PAL[5], 1, 2);

    let slotY = 27;
    if (phase === 2 || phase === 1) {
      drawPanel(WALL_L + 8, slotY, PLAY_W - 16, 16, PAL[0], PAL[8]);
      drawText(lv._b, W * 0.5, slotY + 2, PAL[6], 1, 1);
      fR(WALL_L + 14, slotY + 10, PLAY_W - 28, 4, PAL[1]);
      fR(WALL_L + 14, slotY + 10, fl(((PLAY_W - 28) * boss.hp) / boss.maxHp), 4, boss.shield > 0 ? PAL[10] : PAL[8]);
      slotY += 18;
    } else if (gameMode === 0) {
      const distM = mx(0, fl((drone.y - levelGoalY) / 12));
      if (distM > 0 && distM <= 30) {
        fR(WALL_L + 30, slotY, PLAY_W - 60, 11, BG9);
        drawText('ALERTA: JEFE A ' + distM + 'M!', W * 0.5, slotY + 2, distM <= 12 ? PAL[8] : PAL[6], 1, 1);
        slotY += 13;
      }
    }

    if (bannerTimer > 0) {
      fR(WALL_L + 14, slotY, PLAY_W - 28, 12, BG9);
      drawText(bannerText, W * 0.5, slotY + 3, bannerCol, 1, 1);
    }

    if (phase === 1) {
      const sh = fl(mn(24, ab(sn(elapsedTime * 5)) * 18 + 6));
      fR(WALL_L, 25, sh, H - 25, PAL[0]);
      fR(WALL_R - sh, 25, sh, H - 25, PAL[0]);
      fR(0, 88, W, 62, BG9);
      fR(0, 88, W, 2, PAL[8]);
      fR(0, 148, W, 2, PAL[8]);
      drawText('!! WARNING !!', W * 0.5, 96, ((elapsedTime * 10) | 0) & 1 ? PAL[8] : PAL[6], 2, 1, PAL[13]);
      drawText('VS ' + lv._b, W * 0.5, 116, PAL[10], 1, 1);
      drawText(lv._s, W * 0.5, 130, PAL[4], 1, 1);
    } else if (phase === 4) {
      drawPanel(28, 50, W - 56, 138, PAL[0], PAL[4]);
      drawText('NIVEL COMPLETADO', W * 0.5, 60, PAL[5], 2, 1, PAL[6]);
      drawText(lv._a, W * 0.5, 82, PAL[10], 1, 1);
      drawDronePod(66, 122 + sn(elapsedTime * 8) * 3, 0, HULLS[selectedHull], 0, -1.2, 1, 1, 0, 0);
      drawText('PUNTOS: ' + score, 184, 106, PAL[13], 1, 1);
      drawText('SIGUIENTE NIVEL...', 184, 124, PAL[14], 1, 1);
      drawText('CURA: +1 HP AL SUBIR', 184, 140, PAL[11], 1, 1);
      drawText('[ESPACIO] CONTINUAR', W * 0.5, 168, PAL[4], 1, 1);
    } else if (phase === 5) {
      drawPanel(24, 42, W - 48, 156, PAL[0], PAL[5]);
      drawText('MISION CUMPLIDA!', W * 0.5, 54, PAL[6], 2, 1, PAL[13]);
      drawText('CIUDADELA CENIT DERROTADA', W * 0.5, 78, PAL[10], 1, 1);
      drawText('PUNTUACION FINAL: ' + score, W * 0.5, 102, PAL[14], 1, 1);
      drawText('TIEMPO: ' + fl(runSeconds) + ' SEGUNDOS', W * 0.5, 118, PAL[13], 1, 1);
      drawText('TODOS LOS NIVELES COMPLETOS', W * 0.5, 136, PAL[11], 1, 1);
      addBtn(84, 158, W - 168, 22, 'VOLVER AL MENU [ESP]', PAL[2], goMenu, PAL[5]);
    }

    if (damageFlash > 0) fR(0, 0, W, H, 'rgba(239,68,68,' + mn(0.35, damageFlash * 0.025) + ')');
  }

  // =========================================================================
  // 10. MENUS V6 CON BOTONES CLICABLES, HANGAR CLARO Y SELECTOR DE SEMILLA
  // =========================================================================
  const PLAY_LBL = 'JUGAR YA [ESP]';
  const goMenu = () => {
    gameState = 0;
    phase = 0;
    menuTab = 0;
  };
  const toggleRnd = () => {
    randomSeed = !randomSeed;
    if (randomSeed) rollSeed();
    sfxTone(440, 620, 0.05, 1, 0.06);
  };
  function addBtn(x, y, w, h, label, bg, fn, borderCol) {
    drawPanel(x, y, w, h, bg || PAL[1], borderCol || PAL[4]);
    drawText(label, x + w * 0.5, y + ((h - 7) * 0.5) | 0, PAL[13], 1, 1);
    uiBtns.push({ _x: x, _y: y, _w: w, _l: h, _g: fn });
  }

  const cycleMode = (dir) => {
    gameMode = (gameMode + dir + 3) % 3;
    sfxTone(420, 580, 0.06, 0, 0.06);
  };

  const cycleStartLevel = (dir) => {
    startLevel = (startLevel + dir + 4) % 4;
    if (startLevel > maxLevelReached) startLevel = dir > 0 ? 0 : mn(3, maxLevelReached);
    sfxTone(360 + startLevel * 60, 520, 0.06, 1, 0.07);
  };

  function drawMenu() {
    uiBtns = [];
    const lv = LEVELS[gameMode === 0 ? startLevel : (((elapsedTime * 0.2) | 0) % 4)];
    drawBackground(elapsedTime * -14, lv);
    drawPanel(14, 10, W - 28, H - 20, BG9, PAL[4]);

    drawText('STEAM HOPPER', W * 0.5, 18, PAL[5], 2, 1, PAL[6]);

    addBtn(26, 38, 84, 15, 'INICIO', menuTab === 0 ? PAL[3] : PAL[1], () => (menuTab = 0), menuTab === 0 ? PAL[6] : PAL[4]);
    addBtn(118, 38, 84, 15, 'HANGAR [T]', menuTab === 1 ? '#0e7490' : PAL[1], () => (menuTab = 1), menuTab === 1 ? PAL[10] : PAL[4]);
    addBtn(210, 38, 84, 15, 'GUIA [G]', menuTab === 2 ? '#166534' : PAL[1], () => (menuTab = 2), menuTab === 2 ? PAL[14] : PAL[4]);

    if (menuTab === 0) {
      drawDronePod(W * 0.5, 70 + sn(elapsedTime * 3) * 2, sn(elapsedTime * 2) * 0.08, HULLS[selectedHull], sn(elapsedTime) * 1.4, -0.8, 1, 1, 0, 0);

      const mNames = ['HISTORIA (NV.1-4)', 'BOSS RUSH (4 JEFES)', 'TORRE INFINITA'];
      drawText('MODALIDAD [M]:', W * 0.5, 92, PAL[11], 1, 1);
      addBtn(36, 103, W - 72, 17, '<  ' + mNames[gameMode] + '  >', PAL[1], () => cycleMode(1), PAL[10]);

      if (gameMode === 0) {
        addBtn(36, 125, W - 72, 17, 'NIVEL [E]: ' + LEVELS[startLevel]._a, PAL[1], () => cycleStartLevel(1), PAL[5]);
      } else if (gameMode === 2) {
        addBtn(36, 125, 138, 17, 'SEMILLA [F]: ' + seed, PAL[1], editSeed, PAL[5]);
        addBtn(178, 125, 106, 17, 'AZAR [R]: ' + (randomSeed ? 'SI' : 'NO'), randomSeed ? '#0e7490' : PAL[1], toggleRnd, PAL[10]);
      } else {
        drawText('COMBATE CONTINUO CONTRA LOS 4 JEFES', W * 0.5, 130, PAL[6], 1, 1);
      }

      drawText('NAVE: ' + HULLS[selectedHull]._a + ' | ' + SKILLS[selectedSkill]._a, W * 0.5, 150, PAL[13], 1, 1);
      drawText('RECORD: ' + highScore + 'M | AUDIO [S]: ' + ['TODO', 'SFX', 'MUTE'][soundMode], W * 0.5, 163, PAL[4], 1, 1);
      addBtn(68, 182, W - 136, 26, PLAY_LBL, PAL[3], startGame, PAL[6]);
    } else if (menuTab === 1) {
      const ah = HULLS[inspectHull];
      const sk = SKILLS[inspectSkill];
      const uh = isHullUnlocked(inspectHull);
      const us = isSkillUnlocked(inspectSkill);

      drawText('VEHICULO [1-4]', 22, 58, PAL[10], 1, 0);
      drawText('HABILIDAD [Q]', 186, 58, PAL[6], 1, 0);

      for (let i = 0; i < 4; i++) {
        const h = HULLS[i];
        const hOk = isHullUnlocked(i);
        const hSel = selectedHull === i;
        addBtn(
          20, 68 + i * 14, 116, 13,
          (hSel ? '>' : '') + (i + 1) + '.' + h._a + (hOk ? '' : '*'),
          hSel ? '#0e7490' : inspectHull === i ? PAL[2] : PAL[1],
          () => {
            inspectHull = i;
            if (hOk) selectedHull = i;
          },
          hSel ? PAL[6] : hOk ? PAL[4] : PAL[12]
        );

        const s = SKILLS[i];
        const sOk = isSkillUnlocked(i);
        const sSel = selectedSkill === i;
        addBtn(
          184, 68 + i * 14, 116, 13,
          (sSel ? '>' : '') + s._a + (sOk ? '' : '*'),
          sSel ? PAL[3] : inspectSkill === i ? PAL[2] : PAL[1],
          () => {
            inspectSkill = i;
            if (sOk) selectedSkill = i;
          },
          sSel ? PAL[6] : sOk ? PAL[4] : PAL[12]
        );
      }

      // Visor animado del vehiculo seleccionado/inspeccionado
      drawPanel(140, 58, 40, 65, PAL[0], uh ? ah._p[0] : PAL[8]);
      fR(146, 103, 28, 2, uh ? ah._p[2] : PAL[12]);
      ctx.save();
      ctx.translate(160, 82);
      ctx.scale(1.25, 1.25);
      drawDronePod(0, sn(elapsedTime * 3) * 1.6, sn(elapsedTime * 2) * 0.1, ah, sn(elapsedTime) * 1.4, -0.8, 1, 1, 0, inspectSkill === 2);
      ctx.restore();
      drawText(selectedHull === inspectHull ? 'LISTO' : uh ? 'USAR' : 'BLOQ', 160, 110, selectedHull === inspectHull ? PAL[14] : uh ? PAL[6] : PAL[8], 1, 1);

      // Tarjeta intuitiva con barras legibles + rasgo real y desbloqueo
      drawPanel(22, 128, W - 44, 50, PAL[0], PAL[10]);

      [['VIDA:' + ah._t, 28, 74, 30, ah._t * 5, 14], ['VEL', 110, 132, 42, fl(ah._x * 34), 10], ['AHORRO', 180, 220, 52, fl((1.3 - ah._s) * 90), 6]].forEach((b) => {
        drawText(b[0], b[1], 133, PAL[b[5]], 1, 0);
        fR(b[2], 134, b[3], 5, PAL[1]);
        fR(b[2], 134, b[4], 5, PAL[b[5]]);
      });

      drawText(uh ? ah._l : 'BLOQUEADA: ' + ah._b, W * 0.5, 145, uh ? PAL[13] : PAL[8], 1, 1);
      drawText('HAB: ' + sk._a + ' (' + sk._c + ' PSI)' + (us ? '' : ' [' + sk._b + ']'), W * 0.5, 156, us ? PAL[6] : PAL[9], 1, 1);
      drawText(sk._t, W * 0.5, 167, PAL[11], 1, 1);
      addBtn(76, 184, W - 152, 24, PLAY_LBL, PAL[3], startGame, PAL[6]);
    } else {
      drawPanel(24, 62, W - 48, 114, PAL[0], PAL[14]);
      ['A/D O FLECHAS: PROPULSORES', 'AMBOS BOTONES: SUBIR RECTO', 'ESPACIO / ABAJO: HABILIDAD', 'ESCUDO PARRY REFLEJA BALAS', 'BASES VERDES: +1 HP Y PSI', '3 NUCLEOS: OVERDRIVE', '[S] AUDIO | [C] CRT | [P] PAUSA'].forEach((t, i) => {
        drawText(t, W * 0.5, 70 + i * 13, [PAL[13], PAL[11], PAL[6], PAL[10], PAL[14], PAL[9], PAL[4]][i], 1, 1);
      });
      addBtn(76, 184, W - 152, 24, PLAY_LBL, '#166534', startGame, PAL[14]);
    }
  }

  function drawOverlayModal() {
    uiBtns = [];
    const isPause = gameState === 3;
    drawPanel(28, 30, W - 56, H - 60, BG9, isPause ? PAL[10] : PAL[8]);
    drawText(isPause ? 'PAUSA' : 'FIN DE PARTIDA', W * 0.5, 42, isPause ? PAL[10] : PAL[9], 2, 1, PAL[13]);
    drawText(isPause ? LEVELS[currentLevel % 4]._a : deathReason, W * 0.5, 64, isPause ? PAL[6] : PAL[8], 1, 1);

    drawText('ALTURA: ' + maxMeters + 'M | PUNTOS: ' + score, W * 0.5, 86, PAL[13], 1, 1);
    drawText('RECORD: ' + highScore + 'M', W * 0.5, 102, PAL[5], 1, 1);
    drawText('HABILIDAD: ' + SKILLS[selectedSkill]._a, W * 0.5, 118, PAL[11], 1, 1);

    addBtn(56, 138, W - 112, 22, isPause ? 'CONTINUAR [ESP]' : 'REINTENTAR [ESP]', PAL[3], () => {
      if (isPause) gameState = 1;
      else startGame();
    }, PAL[6]);
    addBtn(56, 166, W - 112, 20, 'MENU PRINCIPAL [M]', PAL[1], goMenu, PAL[10]);
  }

  function drawCRT() {
    if (!crtEnabled) return;
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    for (let y = 0; y < H; y += 2) ctx.fillRect(0, y, W, 1);
  }

  // =========================================================================
  // 11. CONTROLES (TECLADO + RATON CLICABLE + TACTIL)
  // =========================================================================
  const onEv = (ev, fn, opt) => window.addEventListener(ev, fn, opt);
  const ptr = (p, r = canvas.getBoundingClientRect()) => [(p.clientX - r.left) / r.width, (p.clientY - r.top) / r.height];
  onEv('keydown', (e) => {
    const c = e.code;
    const first = !keys[c];
    keys[c] = true;
    initAudio();
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Tab', 'Enter'].includes(c)) e.preventDefault();

    if (c === 'KeyS' && first && gameState !== 1) return void (soundMode = (soundMode + 1) % 3);
    if (c === 'KeyC' && first) return void (crtEnabled = !crtEnabled);
    if ((c === 'KeyP' || c === 'Escape') && first && (gameState === 1 || gameState === 3)) {
      gameState = gameState === 1 ? 3 : 1;
      return;
    }

    if (gameState !== 1 && first) {
      if (c === 'KeyT' || c === 'Tab') menuTab = menuTab === 1 ? 0 : 1;
      else if (c === 'KeyG') menuTab = menuTab === 2 ? 0 : 2;
      else if (c === 'KeyM') {
        if (gameState === 0) cycleMode(1);
        else goMenu();
      } else if (c === 'KeyE') cycleStartLevel(1);
      else if (c === 'KeyF') editSeed();
      else if (c === 'KeyR') toggleRnd();
      else if (c === 'KeyQ') {
        for (let k = 1; k <= 4; k++) {
          const cand = (selectedSkill + k) & 3;
          if (isSkillUnlocked(cand)) {
            selectedSkill = cand;
            inspectSkill = cand;
            break;
          }
        }
      } else if (c.startsWith('Digit')) {
        const d = parseInt(c[5], 10) - 1;
        if (d >= 0 && d < 4) {
          inspectHull = d;
          if (isHullUnlocked(d)) selectedHull = d;
        }
      } else if (c === 'Space' || c === 'Enter') {
        if (gameState === 3) gameState = 1;
        else startGame();
      }
      return;
    }

    if (gameState === 1 && first) {
      if (c === 'KeyM') soundMode = (soundMode + 1) % 3;
      else if (c === 'Space' || c === 'ArrowDown' || c === 'Enter') {
        if (phase === 4 && phaseTimer < 120) advanceAfterBoss();
        else if (phase === 5) goMenu();
        else triggerActiveSkill();
      }
    }
  });

  onEv('keyup', (e) => {
    keys[e.code] = false;
  });

  onEv('mousedown', (e) => {
    initAudio();
    const [rx, ry] = ptr(e);
    const cx = rx * W;
    const cy = ry * H;
    for (let i = uiBtns.length - 1; i >= 0; i--) {
      const b = uiBtns[i];
      if (cx >= b._x && cx <= b._x + b._w && cy >= b._y && cy <= b._y + b._l) {
        b._g();
        return;
      }
    }
  });

  function handleTouches(e) {
    e.preventDefault();
    initAudio();
    touchLeft = false;
    touchRight = false;
    const rect = canvas.getBoundingClientRect();
    for (let i = 0; i < e.touches.length; i++) {
      const [rx, ry] = ptr(e.touches[i], rect);
      if (gameState === 1 && ry > 0.72 && e.type === 'touchstart') triggerActiveSkill();
      else if (rx < 0.5) touchLeft = true;
      else touchRight = true;
    }
  }
  ['touchstart', 'touchmove', 'touchend'].forEach((ev) => onEv(ev, handleTouches, { passive: false }));

  // =========================================================================
  // 12. BUCLE PRINCIPAL 240 FPS
  // =========================================================================
  let lastFrameTime = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = now - lastFrameTime;
    if (elapsed < MIN_FRAME_DELTA) return;
    lastFrameTime = now;

    const dt = mn(elapsed, 33.33) / 16.666;
    if (gameState === 1) {
      updatePhysics(dt);
      updateBGM();
      updateParticles(dt);
    } else {
      elapsedTime += dt / 60;
      if (gameState === 0) updateBGM();
      if (gameState !== 3) updateParticles(dt);
    }

    if (screenShake > 0) screenShake = mx(0, screenShake - dt);
    if (damageFlash > 0) damageFlash = mx(0, damageFlash - dt);

    const lv = LEVELS[currentLevel % 4];
    ctx.save();
    if (screenShake > 0) ctx.translate(((rn() - 0.5) * screenShake) | 0, ((rn() - 0.5) * screenShake) | 0);

    if (gameState === 0) {
      drawMenu();
    } else {
      drawBackground(camY, lv);
      drawWorld(camY, lv);
      drawParticles(camY);
      if (gameState !== 2 && phase !== 4 && phase !== 5) drawDrone(camY);
      drawLava(camY, lv);
      drawHUD(lv);
      if (gameState >= 2) drawOverlayModal();
    }
    drawCRT();
    ctx.restore();
  }

  requestAnimationFrame(frame);
})();
