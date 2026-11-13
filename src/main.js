/**
 * STEAM HOPPER: HIGH-OCTANE EDITION (v6 - 10 Zone/Boss OSTs, Parry System, Zone Elevator, Pause, NG+ & Foreground Indicators)
 * Restricciones: <= 32 KB sin comprimir, 0 Assets Externos, 100% Vanilla JS, Hasta 240 FPS
 */

(() => {
  'use strict';

  // =========================================================================
  // 1. CONSTANTES, ALIAS MATEMÁTICOS Y 10 BIOMAS / JEFES DE ZONA
  // =========================================================================
  const W = 256;
  const H = 240;
  const MIN_FRAME_DELTA = 1000 / 240;
  const WALL_LEFT = 14;
  const WALL_RIGHT = W - 14;

  const M = Math;
  const fl = M.floor;
  const rn = M.random;
  const mx = M.max;
  const mn = M.min;
  const sn = M.sin;
  const cs = M.cos;
  const hy = M.hypot;
  const ab = M.abs;
  const PI = M.PI;
  const PI2 = PI * 2;

  const [
    C_BLK,
    C_DRK,
    C_RST,
    C_CPR,
    C_BRS,
    C_GLD,
    C_YLW,
    C_RDD,
    C_RED,
    C_ORG,
    C_CYN,
    C_ICE,
    C_GRY,
    C_WHT,
    C_GRN,
    C_PRP
  ] = '#06090f|#161920|#3b251e|#7a4832|#c87d3b|#fbbf24|#fde047|#8c1d18|#ef4444|#ff7722|#38bdf8|#bae6fd|#94a3b8|#f8fafc|#4ade80|#c084fc'.split(
    '|'
  );

  const hsl = (h, s, l) => 'hsl(' + h + ',' + s + '%,' + l + '%)';

  // 10 Zonas Únicas (Niveles 1 al 10) con sus 10 Jefes, Bonos y Paleta Dinámica
  const BIOMES =
    'Z1 FUNDICION|TRITURADOR IGNEO|BLINDAJE (-30% DANO)|12|38;Z2 TALLER VOLTAICO|CENTINELA VOLTAICO|+50% RECARGA VIGAS|205|48;Z3 REACTOR QUIMICO|AUTOMATA TOXICO|TOBERAS ECO (-25% PSI)|142|280;Z4 TIRO TORMENTA|NUCLEO TORMENTA|+1 VIDA MAXIMA|272|195;Z5 CRIPTA CRIO|CRIO-AUTOCLAVE|ENFRIAMIENTO RAPIDO|192|210;Z6 CALDERA RUBI|PIRO-COLOSO|+15% EMPUJE VAPOR|348|45;Z7 CAMARA CUARZO|PRISMA RESONANTE|ROCE +6 PSI EXTRA|42|18;Z8 SECTOR ABISAL|LEVIATAN HIERRO|RECARGA HABILIDAD +25%|220|190;Z9 FRAGUA SOLAR|SOLARIS MK.IX|OVERDRIVE EXTENDIDO|24|52;Z10 CORONA CENIT|EMPERADOR VAPOR|CORONA CENIT NG+ MAX|292|48'
      .split(';')
      .map((row) => {
        const [name, bossName, buffText, h1, h2] = row.split('|');
        return {
          name,
          bossName,
          buffText: 'BONO: ' + buffText,
          bg: hsl(h1, 45, 5),
          wall: hsl(h1, 42, 13),
          brick: hsl(h1, 45, 21),
          trim: hsl(h1, 78, 56),
          plat: hsl(h1, 48, 22),
          platTop: hsl(h2, 90, 62),
          gearCol: hsl(h1, 65, 78),
          gearRim: hsl(h2, 85, 52),
          lavaDeep: hsl(h1, 80, 26),
          lavaMid: hsl(h1, 85, 46),
          lavaTop: hsl(h1, 95, 62),
          spark: hsl(h2, 95, 76)
        };
      });

  const DIFF_STEP = 60;
  const getBossAlt = (idx) => 110 + idx * 120;
  const THRUST_X = 0.135;
  const THRUST_Y = -0.225;
  const GRAVITY = 0.095;
  const SLAM_MAX_CD = 135;

  // 4 Vehículos Desbloqueables (Teclas 1-4 en el Taller)
  const HULLS =
    'MK.I BRONCE|BASE|5|1|1|1|8|#c87d3b|#fbbf24;MK.II FORJA|RECORD 80M|6|.96|1.02|.9|8|#dc2626|#fde047;MK.III VOLTAICO|RECORD 180M|5|1.18|1.12|.95|10|#0284c7|#bae6fd;MK.IV ESPECTRO|RECORD 300M / JEFE 4|5|1.12|1.08|.8|14|#9333ea|#f5d0fe'
      .split(';')
      .map((row) => {
        const [name, req, hp, tx, ty, psiUse, grazeBonus, body, hi] = row.split('|');
        return { name, req, hp: +hp, tx: +tx, ty: +ty, psiUse: +psiUse, grazeBonus: +grazeBonus, body, hi };
      });

  // 4 Habilidades Activas [ESPACIO] (Incluyen capacidad de PARRY / Reflejo de proyectiles)
  const SKILLS =
    'ONDA SLAM|BASE|25|ONDA + PARRY REFLEJA PROYECTILES;CANON MAGMA|VENCER JEFE 1|25|3 BOLAS IGNEAS + PARRY CERCANO;ESCUDO VOLTAICO|VENCER JEFE 2|30|ESCUDO + EMBESTIDA + PARRY;IMPULSO TORMENTA|VENCER JEFE 3|20|SALTO PLASMA + DANO + PARRY'
      .split(';')
      .map((row) => {
        const [name, req, cost, desc] = row.split('|');
        return { name, req, cost: +cost, desc };
      });

  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d', { alpha: false });
  canvas.width = W;
  canvas.height = H;
  ctx.imageSmoothingEnabled = false;

  function fR(x, y, w, h, col) {
    if (col) ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
  }

  function fArc(x, y, r, col) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, PI2);
    ctx.fillStyle = col;
    ctx.fill();
  }

  function drawToothed(steps, rOut, rIn, fillCol, strokeCol) {
    ctx.beginPath();
    for (let i = 0; i < steps; i++) {
      const a1 = (i / steps) * PI2;
      const a2 = ((i + 0.62) / steps) * PI2;
      const rad = i & 1 ? rIn : rOut;
      ctx.lineTo(cs(a1) * rad, sn(a1) * rad);
      ctx.lineTo(cs(a2) * rad, sn(a2) * rad);
    }
    ctx.closePath();
    ctx.fillStyle = fillCol;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = strokeCol;
    ctx.stroke();
  }

  // =========================================================================
  // 2. TIPOGRAFÍA 5x5 COMPACTA PRE-INDEXADA (ZERO-GC)
  // =========================================================================
  const FONT_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-:.%/![]()|=+';
  const FONT_B36 =
    '94gtq 2qf0u 92pzz ir8zi blv7m jolz2 9p0z2 jdgn8 92wj2 92wxq 939yp j2uke 9opvz j2kam jomcf jomc0 9osa7 ayp81 8tjm6 4es7g azc5t ab6zj b5i5t b43n5 92ywe j2uj4 93231 j2ukx 9ony6 jfm2s aye5q aydz8 ayhkh at6q9 at6kk je7mn b28 2t8g 4 fnd3n nz0w 2ksn8 8wg0e 8s3f2 3wnba 7j58s 2ksqs 9ubk 34ao'.split(
      ' '
    );

  const GLYPH_RUNS = {};
  for (let idx = 0; idx < FONT_CHARS.length; idx++) {
    const mask = parseInt(FONT_B36[idx], 36);
    const runs = [];
    for (let r = 0; r < 5; r++) {
      let c = 0;
      while (c < 5) {
        if ((mask >> (24 - (r * 5 + c))) & 1) {
          const startC = c;
          while (c < 5 && ((mask >> (24 - (r * 5 + c))) & 1)) c++;
          runs.push(startC, r, c - startC);
        } else {
          c++;
        }
      }
    }
    GLYPH_RUNS[FONT_CHARS[idx]] = runs;
  }

  function drawText(str, x, y, color, scale = 1, align = 0) {
    const s = String(str).toUpperCase();
    const step = 6 * scale;
    const totalW = s.length * step - scale;
    const startX = (align === 1 ? x - (totalW >> 1) : align === 2 ? x - totalW : x) | 0;
    const sy = y | 0;

    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? color : '#000';
      const off = 1 - pass;
      for (let i = 0; i < s.length; i++) {
        const runs = GLYPH_RUNS[s[i]];
        if (!runs) continue;
        const gx = startX + i * step + off;
        for (let j = 0; j < runs.length; j += 3) {
          ctx.fillRect(gx + runs[j] * scale, sy + runs[j + 1] * scale + off, runs[j + 2] * scale, scale);
        }
      }
    }
  }

  // =========================================================================
  // 3. GENERADOR PSEUDOALEATORIO DETERMINISTA (LCG)
  // =========================================================================
  let seed = 1985;
  let rngState = seed;

  function setSeed(s) {
    seed = s >>> 0;
    rngState = seed || 1;
  }

  function lcg() {
    rngState = (1664525 * rngState + 1013904223) >>> 0;
    return rngState / 4294967296;
  }

  function lcgRange(min, max) {
    return min + lcg() * (max - min);
  }

  // =========================================================================
  // 4. SINTETIZADOR MULTI-TEMA: 10 TEMAS DE ZONA + 10 TEMAS DE BOSS-FIGHT
  // =========================================================================
  let audioCtx = null;
  let noiseBuf = null;
  let nextNoteTime = 0;
  let seqStep = 0;
  let steamCooldown = 0;
  let muted = false;

  const m2f = (m) => (m > 0 ? 440 * M.pow(2, (m - 69) / 12) : 0);

  // Melodías de Zona (A/B) y Melodía de Combate de Jefe (C)
  const HERO_LEAD = 'H HKO KOTROKO KHD DHK HKPOKHK HDF FJM JMRTVRT ROOMKJKJHGHJKMOSTO';

  // Motivo cromático/frigio intenso exclusivo para los duelos de Jefe (Boss Fight OST)
  const HERO_LEAD_B = 'TKNTWVTNTKNTZWVTPHKPTSPKPHKPVTSPRJMRVTRMVWYV[YWVTSPONOPSTOKJHKOT';

  // Transposición tonal por Zona (0..9) para que cada Zona y cada Jefe tenga su propia firma musical
  const ZONE_KEYS = [0, 3, -2, 5, 7, -4, 2, -5, 4, 6];
  const BASS_ROOTS = [36, 32, 34, 31];
  const CHORD_ARPS = [
    [60, 63, 67, 72],
    [56, 60, 63, 68],
    [58, 62, 65, 70],
    [55, 59, 62, 67]
  ];
  const WAVE_TYPES = ['square', 'sawtooth', 'triangle'];

  function initAudio() {
    if (audioCtx) {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = new AC();
    const sr = audioCtx.sampleRate;
    noiseBuf = audioCtx.createBuffer(1, sr * 0.25, sr);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = rn() * 2 - 1;
    nextNoteTime = audioCtx.currentTime + 0.05;
  }

  function playOsc(type, f0, f1, t, dur, v0) {
    if (!audioCtx || muted) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(mx(20, f1), t + dur);
    g.gain.setValueAtTime(v0, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.005);
  }

  function playNoise(fltType, freq, q, t, dur, v0) {
    if (!audioCtx || muted) return;
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuf;
    const flt = audioCtx.createBiquadFilter();
    flt.type = fltType;
    flt.frequency.setValueAtTime(freq, t);
    if (q) flt.Q.setValueAtTime(q, t);
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(v0, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(flt);
    flt.connect(g);
    g.connect(audioCtx.destination);
    src.start(t);
    src.stop(t + dur + 0.005);
  }

  function scheduleNote(step, time, stepDur) {
    const bIdx = getBiomeIndex();
    const isBoss = boss.active;
    // Transposición y progresión distintas para cada Zona (0..9) y para cada Jefe (0..9)
    const keyShift = ZONE_KEYS[isBoss ? boss.type : bIdx] + (isBoss ? 1 : 0);
    const bar = ((step >> 4) + (isBoss ? boss.type : bIdx)) & 3;
    const sub = step & 15;
    const isSectionB = isBoss || ((step >> 6) & 1) === 1;

    // 1. Bajo sintetizado: en Boss-Fight galopa en semicorcheas agresivas con salto de quinta/octava
    const rootMidi = BASS_ROOTS[bar] + keyShift;
    const bassMidi = isBoss
      ? rootMidi + (sub & 1 ? 12 : (sub & 2 ? 7 : 0))
      : (sub & 3) === 2
      ? rootMidi + 12
      : rootMidi;
    if (isBoss || (sub & 3) !== 1 || isSectionB) {
      playOsc(isBoss || bIdx & 1 ? 'sawtooth' : 'triangle', m2f(bassMidi), m2f(bassMidi), time, stepDur * 0.88, isBoss ? 0.052 : 0.042);
    }

    // 2. Percusión temática: doble bombo y redobles intensos en Boss-Fight
    if (sub % (isBoss ? 2 : 4) === 0 || (sub === 14 && bar === 3)) {
      playOsc('sine', isBoss ? 150 : 125, 34, time, 0.085, 0.11);
    }
    if (sub % 8 === 4 || (isBoss && sub % 4 === 2) || (bar === 3 && sub >= 12 && sub % 2 === 1)) {
      playNoise('highpass', isBoss ? 750 : 950, 0, time, 0.09, 0.065);
    } else if (sub % 2 === 1) {
      playNoise('highpass', 5200, 0, time, 0.035, 0.022);
    }

    // 3. Melodía Principal con timbre e inversión propios de cada Zona / Jefe
    const patIdx = isBoss ? (step + boss.type * 4) & 63 : (step + (bIdx & 1 ? 16 : 0)) & 63;
    let leadMidi = (isSectionB ? HERO_LEAD_B : HERO_LEAD).charCodeAt(patIdx);
    if (leadMidi > 60) {
      leadMidi += keyShift + (isBoss && (sub & 3) === 3 ? -1 : 0);
      const f = m2f(leadMidi);
      const leadWave = WAVE_TYPES[(isBoss ? boss.type + 1 : bIdx) % 3];
      playOsc(leadWave, f, f * 1.005, time, stepDur * (isBoss ? 1.15 : 1.4), 0.04);
    }

    // 4. Arpegio armónico con patrón rítmico variable según la Zona
    const arpStep = isBoss ? (3 - (sub & 3)) : (sub + bIdx) & 3;
    const arpMidi = CHORD_ARPS[bar][arpStep] + keyShift + (bIdx >= 5 ? 12 : 0);
    playOsc(isBoss ? 'square' : 'triangle', m2f(arpMidi), m2f(arpMidi), time, stepDur * 0.8, 0.032);
  }

  function updateBGM() {
    if (!audioCtx || muted || gameState !== 1) return;
    const bIdx = getBiomeIndex();
    // Cada Zona tiene su propio tempo base (146..173 BPM) y cada Jefe tiene su propio tempo de batalla (174..202 BPM)
    const bpm = drone.overdrive > 0
      ? 198
      : boss.active
      ? 174 + boss.type * 3 + (boss.hp <= boss.maxHp >> 1 ? 8 : 0)
      : mn(182, 146 + bIdx * 3 + (diffLevel - 1) * 2);
    const stepDur = 15 / bpm;
    const now = audioCtx.currentTime;
    if (nextNoteTime < now) nextNoteTime = now + 0.02;
    while (nextNoteTime < now + 0.1) {
      scheduleNote(seqStep, nextNoteTime, stepDur);
      nextNoteTime += stepDur;
      seqStep = (seqStep + 1) & 127;
    }
  }

  function sfxSteam(dual) {
    if (audioCtx) playNoise('bandpass', dual ? 920 : 800, 2.2, audioCtx.currentTime, 0.08, dual ? 0.08 : 0.05);
  }

  function sfxBounce(intensity = 1) {
    if (audioCtx) playOsc('sine', 220 * mn(1.4, mx(0.8, intensity)), 40, audioCtx.currentTime, 0.08, mn(0.18, 0.09 * intensity));
  }

  function sfxTone(f0, f1, dur, type = 'square', vol = 0.08) {
    if (audioCtx) playOsc(type, f0, f1, audioCtx.currentTime, dur, vol);
  }

  function playGateWarning() {
    sfxTone(520, 880, 0.18, 'sawtooth', 0.09);
    setTimeout(() => sfxTone(440, 780, 0.22, 'sawtooth', 0.09), 190);
  }

  // =========================================================================
  // 5. SISTEMA DE PARTÍCULAS (OBJECT POOL DE 64 OBJETOS)
  // =========================================================================
  const POOL_SIZE = 64;
  const particles = Array.from({ length: POOL_SIZE }, () => ({
    active: false,
    type: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 1,
    size: 2
  }));
  let poolIdx = 0;

  function spawnParticle(type, x, y, vx, vy, life, size) {
    const p = particles[poolIdx];
    poolIdx = (poolIdx + 1) & (POOL_SIZE - 1);
    p.active = true;
    p.type = type;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.maxLife = life;
    p.size = size;
  }

  function updateParticles(dt) {
    const dragPow = M.pow(0.9, dt);
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = particles[i];
      if (!p.active) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === 1) p.vy += 0.12 * dt;
      else if (p.type === 0) {
        p.vx *= dragPow;
        p.vy = p.vy * dragPow - 0.02 * dt;
      } else p.vy -= 0.03 * dt;
      p.life -= dt;
      if (p.life <= 0) p.active = false;
    }
  }

  function drawParticles(camY, biome) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = particles[i];
      if (!p.active) continue;
      const sy = (p.y - camY) | 0;
      if (sy < -8 || sy > H + 8) continue;
      const sx = p.x | 0;
      const ratio = p.life / p.maxLife;
      if (p.type === 0) {
        const sz = ratio > 0.6 ? p.size : mx(1, p.size - 1);
        fR(sx - (sz >> 1), sy - (sz >> 1), sz, sz, ratio > 0.45 ? C_WHT : C_GRY);
      } else if (p.type === 1) {
        fR(sx, sy, p.size, p.size, ratio > 0.4 ? biome.spark : biome.lavaTop);
      } else {
        fR(sx, sy, p.size, p.size, ratio > 0.5 ? biome.lavaTop : biome.lavaMid);
      }
    }
  }

  // =========================================================================
  // 6. ESTADO GLOBAL, PROGRESIÓN, ASCENSOR DE ZONA, PARRY Y ARENA DE JEFE
  // =========================================================================
  let gameState = 0; // 0: Menú, 1: Jugando, 2: Game Over, 3: Pausa
  let menuTab = 0; // 0: Guía Rápida, 1: Taller (Vehículos, Habilidades y Ascensor)
  let highScore = 0;
  let bossUnlockMask = 0; // Bits 0..9: Jefes 1..10 derrotados históricamente
  let selectedHull = 0;
  let selectedSkill = 0;
  let startZone = 0; // Ascensor de Zona Inicial (0..9, desbloqueable al vencer jefes)
  let crtEnabled = true;

  try {
    highScore = parseInt(localStorage.getItem('sh_hi') || '0', 10) || 0;
    bossUnlockMask = parseInt(localStorage.getItem('sh_unl') || '0', 10) || 0;
  } catch (_) {}

  const isHullUnlocked = (idx) =>
    idx === 0 ||
    (idx === 1 && highScore >= 80) ||
    (idx === 2 && highScore >= 180) ||
    (idx === 3 && (highScore >= 300 || (bossUnlockMask & 8) !== 0));

  const isSkillUnlocked = (idx) => idx === 0 || (bossUnlockMask & (1 << (idx - 1))) !== 0;
  const isZoneUnlocked = (z) => z === 0 || (bossUnlockMask & (1 << (z - 1))) !== 0;

  const DRAG = 0.945;
  const MAX_VX = 1.95;
  const MAX_VY_UP = -2.25;
  const MAX_VY_DOWN = 3.4;
  const RESTITUTION = 0.45;

  const drone = {
    x: W / 2,
    y: 184,
    vx: 0,
    vy: 0,
    r: 7,
    theta: 0,
    pressure: 100,
    maxPsi: 100,
    hp: 5,
    maxHp: 5,
    invuln: 0,
    shield: 0,
    purge: 0,
    overdrive: 0,
    comboCores: 0,
    slamWaveR: 0,
    slamWaveX: 0,
    slamWaveY: 0,
    slamCd: 0,
    grazeCd: 0,
    cooling: false,
    grounded: false,
    leftOn: false,
    rightOn: false
  };

  let playerShots = [];

  const boss = {
    active: false,
    type: 0,
    x: W / 2,
    y: 0,
    baseY: 0,
    arenaY: 0,
    vx: 1.2,
    vy: 0,
    r: 17,
    hp: 6,
    maxHp: 6,
    hitFlash: 0,
    shield: 0,
    phaseTimer: 0,
    actionState: 0,
    coreTimer: 0,
    shots: []
  };

  let startY = 184;
  let camY = 0;
  let lavaY = 250;
  let elapsedTime = 0;
  let currentMeters = 0;
  let maxMeters = 0;
  let diffLevel = 1;
  let biomeStage = 0;
  let bossBuffs = 0;
  let ngPlus = 0; // Nivel de Ascenso Infinito New Game+ tras derrotar al Jefe 10
  let nextBossIdx = 0;
  let nextBossMeters = getBossAlt(0);
  let levelBannerTimer = 0;
  let bannerText = '';
  let surgeTimer = 0;
  let nextSurgeMeters = 120;
  let deathReason = 'CONSUMIDO POR EL MAGMA';
  let screenShake = 0;
  let damageFlash = 0;
  let chromaTimer = 0;

  let activeChunks = [];
  let topChunkIndex = -1;

  const getHeightMetersAtY = (y) => mx(0, fl((startY - y) / 12));
  const getDiffAtMeters = (m) => 1 + fl(m / DIFF_STEP) + ngPlus * 2;
  const getBiomeIndex = () => biomeStage % 10;
  const getMaxSlamCd = () => (bossBuffs & 128 ? 100 : SLAM_MAX_CD);

  function triggerGraze(gx, gy) {
    if (drone.grazeCd > 0) return;
    const gain = HULLS[selectedHull].grazeBonus + (bossBuffs & 64 ? 6 : 0);
    drone.grazeCd = 18;
    drone.pressure = mn(drone.maxPsi, drone.pressure + gain);
    bannerText = '+' + gain + ' PSI ROCE!';
    levelBannerTimer = 36;
    sfxTone(780, 1180, 0.06, 'triangle', 0.06);
    for (let i = 0; i < 5; i++) {
      spawnParticle(1, (drone.x + gx) * 0.5, (drone.y + gy) * 0.5, (rn() - 0.5) * 2, -1 - rn(), 12, 2);
    }
  }

  function applyDamage(energyLoss, hpLoss, reason) {
    if (drone.invuln > 0 || drone.overdrive > 0 || drone.shield > 0) return;
    drone.invuln = 50;
    damageFlash = 10;
    chromaTimer = 14;
    screenShake = 9;
    const dmgFactor = bossBuffs & 1 ? 0.7 : 1.0;
    if (!boss.active) {
      drone.pressure = mx(0, drone.pressure - energyLoss * dmgFactor);
    }

    if (hpLoss > 0) {
      drone.hp = mx(0, drone.hp - hpLoss);
    }
    sfxTone(160, 45, 0.25, 'sawtooth', 0.16);

    if (drone.hp <= 0) {
      deathReason = reason || 'DRON DESTRUIDO';
      triggerGameOver();
      return;
    }
    if (!boss.active && drone.pressure <= 0 && drone.purge <= 0) {
      drone.pressure = 0;
      drone.purge = 72;
    }
  }

  function spawnBoss(bType) {
    const idx = bType % 10;
    boss.active = true;
    boss.type = idx;
    boss.maxHp = 6 + idx + (idx >> 1) + ngPlus * 4;
    boss.hp = boss.maxHp;
    boss.arenaY = drone.y - H * 0.58;
    camY = boss.arenaY;
    boss.x = W / 2;
    boss.baseY = boss.arenaY + 62;
    boss.y = boss.baseY;
    boss.vx = 1.2 + idx * 0.11 + ngPlus * 0.2;
    boss.vy = 0;
    boss.r = 17;
    boss.hitFlash = 0;
    boss.shield = 0;
    boss.phaseTimer = 0;
    boss.actionState = 0;
    boss.coreTimer = 95;
    boss.shots = [];

    drone.pressure = drone.maxPsi;
    drone.purge = 0;
    for (let c = 0; c < activeChunks.length; c++) {
      activeChunks[c].cores = [];
    }

    chromaTimer = 15;
    playGateWarning();
  }

  function damageBoss(dmg, breakShield = false) {
    if (!boss.active || boss.hitFlash > 0) return;

    if (boss.shield > 0 && !breakShield) {
      sfxBounce(1.4);
      bannerText = '!ESCUDO! HAZ PARRY O TOMA NUCLEO';
      levelBannerTimer = 45;
      return;
    }

    boss.shield = 0;
    boss.hp = mx(0, boss.hp - dmg);
    boss.hitFlash = 52;
    playerShots = [];
    screenShake = 11;
    chromaTimer = 12;
    sfxTone(420, 120, 0.22, 'sawtooth', 0.15);

    const dx = drone.x - boss.x;
    const dy = drone.y - boss.y;
    const d = hy(dx, dy) || 1;
    drone.vx = (dx / d) * 1.75;
    drone.vy = mx(0.9, (dy / d) * 1.75);

    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * PI2;
      spawnParticle(1, boss.x, boss.y, cs(a) * 2.5, sn(a) * 2.5, 18, 3);
    }

    if (boss.hp <= 0) {
      const bType = boss.type;
      boss.active = false;
      boss.shots = [];
      biomeStage++;
      if (bType === 9) ngPlus++;

      bossUnlockMask |= 1 << bType;
      try {
        localStorage.setItem('sh_unl', String(bossUnlockMask));
      } catch (_) {}

      bossBuffs |= 1 << bType;
      if (bType === 3 || bType === 9) drone.maxHp++;
      drone.hp = bType === 9 ? drone.maxHp : mn(drone.maxHp, drone.hp + 2);
      drone.pressure = drone.maxPsi;
      drone.overdrive = bossBuffs & 256 ? 270 : 190;

      if (activeChunks.length > 0) {
        activeChunks[activeChunks.length - 1].platforms.push({
          x1: WALL_LEFT + 36,
          y1: (drone.y + 22) | 0,
          x2: WALL_RIGHT - 36,
          y2: (drone.y + 31) | 0,
          w: WALL_RIGHT - WALL_LEFT - 72,
          cool: 1,
          wall: false,
          vx: 0,
          broken: 0
        });
      }

      bannerText = BIOMES[bType].buffText;
      levelBannerTimer = 165;
      screenShake = 16;
      chromaTimer = 22;
      sfxTone(261.6, 1046.5, 0.45, 'square', 0.14);

      nextBossIdx++;
      nextBossMeters = getBossAlt(nextBossIdx);
    }
  }

  function triggerActiveSkill() {
    if (gameState !== 1 || drone.purge > 0 || drone.slamCd > 0) return;
    const sk = SKILLS[selectedSkill];
    if (!boss.active && drone.pressure < sk.cost && drone.overdrive <= 0) return;
    if (!boss.active && drone.overdrive <= 0) drone.pressure = mx(0, drone.pressure - sk.cost);

    drone.slamCd = getMaxSlamCd();
    screenShake = 7;
    chromaTimer = 8;

    if (selectedSkill === 0) {
      drone.vy = boss.active ? -1.2 : mn(MAX_VY_DOWN * 1.35, drone.vy + 2.6);
      drone.slamWaveR = 2;
      drone.slamWaveX = drone.x;
      drone.slamWaveY = drone.y;
      sfxTone(380, 55, 0.22, 'triangle', 0.15);
      sfxSteam(true);

      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * PI2;
        spawnParticle(0, drone.x, drone.y, cs(a) * 2.4, sn(a) * 2.4, 18, 3);
      }
      if (boss.active && hy(boss.x - drone.x, boss.y - drone.y) < 92) damageBoss(1);
    } else if (selectedSkill === 1) {
      drone.vy = mx(MAX_VY_UP, drone.vy + 0.55);
      for (let k = -1; k <= 1; k++) {
        playerShots.push({ x: drone.x + k * 5, y: drone.y - 6, vx: k * 0.75, vy: -3.4, parry: 0 });
      }
      sfxTone(540, 160, 0.18, 'sawtooth', 0.14);
    } else if (selectedSkill === 2) {
      drone.shield = 155;
      sfxTone(320, 880, 0.25, 'square', 0.12);
    } else {
      drone.vy = MAX_VY_UP * 1.45;
      drone.pressure = mn(drone.maxPsi, drone.pressure + 15);
      drone.slamWaveR = 2;
      drone.slamWaveX = drone.x;
      drone.slamWaveY = drone.y;
      sfxTone(240, 960, 0.22, 'sawtooth', 0.14);
      if (boss.active && hy(boss.x - drone.x, boss.y - drone.y) < 94) damageBoss(1);
    }

    // MECÁNICA DE PARRY / CONTRAATAQUE: Reflejar proyectiles cercanos de vuelta hacia el Jefe (rompe su escudo)
    let parried = false;
    for (let i = boss.shots.length - 1; i >= 0; i--) {
      const s = boss.shots[i];
      if (hy(s.x - drone.x, s.y - drone.y) < 78) {
        if (boss.active) {
          const ang = M.atan2(boss.y - s.y, boss.x - s.x);
          playerShots.push({ x: s.x, y: s.y, vx: cs(ang) * 3.8, vy: sn(ang) * 3.8, parry: 1 });
          parried = true;
        }
        boss.shots.splice(i, 1);
      }
    }
    if (parried) {
      drone.slamCd = fl(drone.slamCd * 0.6);
      drone.pressure = mn(drone.maxPsi, drone.pressure + 15);
      bannerText = '!PARRY REFLEJADO CRITICO!';
      levelBannerTimer = 55;
      sfxTone(660, 1320, 0.16, 'square', 0.14);
    }

    if (!boss.active) {
      for (let c = 0; c < activeChunks.length; c++) {
        const ch = activeChunks[c];
        for (let i = 0; i < ch.gears.length; i++) {
          const g = ch.gears[i];
          if (hy(g.x - drone.x, g.y - drone.y) < 75) {
            g.omega *= 0.25;
            g.vx = 0;
          }
        }
        for (let i = 0; i < ch.vents.length; i++) {
          const v = ch.vents[i];
          if (ab(v.y - drone.y) < 65) v.stun = 120;
        }
      }
    }
  }

  // =========================================================================
  // 7. GENERACIÓN PROCEDIMENTAL DE CHUNKS
  // =========================================================================
  function generateChunk(chunkIdx) {
    setSeed((seed + chunkIdx * 7919) >>> 0);
    const yBottom = H - chunkIdx * H;
    const yTop = yBottom - H;

    const platforms = [
      { x1: 0, y1: yTop, x2: WALL_LEFT, y2: yBottom, cool: 0, wall: true },
      { x1: WALL_RIGHT, y1: yTop, x2: W, y2: yBottom, cool: 0, wall: true }
    ];
    const gears = [];
    const vents = [];
    const gates = [];
    const cores = [];

    if (chunkIdx === 0) {
      platforms.push({ x1: 68, y1: 194, x2: 188, y2: 205, w: 120, cool: 1, wall: false, vx: 0 });
    }

    const numRows = 5;
    const rowStep = H / numRows;

    for (let r = 0; r < numRows; r++) {
      if (chunkIdx === 0 && r === 0) continue;

      const py = fl(yBottom - (r + 0.75) * rowStep + lcgRange(-4, 4));
      const hMeters = getHeightMetersAtY(py);
      const lv = getDiffAtMeters(hMeters);
      const bIdx = getBiomeIndex();

      const minW = mx(28, 70 - (lv - 1) * 4 - bIdx * 2);
      const maxW = mx(38, 86 - (lv - 1) * 5 - bIdx * 2);
      const beamW = fl(lcgRange(minW, maxW));

      const slot = (chunkIdx * numRows + r) % 3;
      const minX = WALL_LEFT + 12;
      const maxX = WALL_RIGHT - beamW - 12;
      const px = slot === 0
        ? fl(lcgRange(minX, minX + (maxX - minX) * 0.4))
        : slot === 1
        ? fl(lcgRange(minX + (maxX - minX) * 0.6, maxX))
        : fl(lcgRange(minX + (maxX - minX) * 0.25, minX + (maxX - minX) * 0.75));

      const coolFactor = lv >= 4 && r % 2 === 1 ? 0.65 : 1.0;
      const moveSpeed = lv >= 2 && r === 2 && lcg() > 0.35
        ? (lcg() > 0.5 ? 1 : -1) * mn(0.95, 0.35 + lv * 0.06)
        : 0;

      const isFragile = !moveSpeed && lv >= 2 && r === 4 && lcg() > 0.45;
      const hasSpring = !isFragile && r === 1 && lcg() > 0.55;

      platforms.push({
        x1: px,
        y1: py,
        x2: px + beamW,
        y2: py + 9,
        w: beamW,
        cool: isFragile ? 0.4 : coolFactor,
        wall: false,
        vx: moveSpeed,
        minX: WALL_LEFT + 8,
        maxX: WALL_RIGHT - 8,
        fragile: isFragile,
        crumble: 0,
        broken: 0,
        spring: hasSpring
      });

      if ((chunkIdx > 0 || r >= 3) && r === 1 && lcg() > 0.25) {
        const fromLeft = px + beamW * 0.5 > W * 0.5;
        const barrierLen = mn(94, fl(lcgRange(46, 58 + lv * 4)));
        const by = py - 22;
        platforms.push({
          x1: fromLeft ? WALL_LEFT : WALL_RIGHT - barrierLen,
          y1: by,
          x2: fromLeft ? WALL_LEFT + barrierLen : WALL_RIGHT,
          y2: by + 10,
          cool: 0,
          wall: true,
          barrier: true
        });
      }

      if ((chunkIdx > 0 || r >= 2) && r === 3) {
        const fromLeft = lcg() > 0.5;
        const maxExt = mn(136, fl(lcgRange(82, 98 + lv * 4)));
        const period = mx(110, 200 - lv * 10);
        const gy = py - 24;
        gates.push({
          fromLeft,
          y1: gy,
          y2: gy + 10,
          maxLen: maxExt,
          curLen: 20,
          period,
          phase: fl(lcgRange(0, period)),
          state: 0
        });
        if (lcg() > 0.35) {
          cores.push({ x: fromLeft ? WALL_LEFT + maxExt - 14 : WALL_RIGHT - maxExt + 14, y: gy + 5, taken: false });
        }
      }

      if ((chunkIdx > 0 || r >= 2) && (r === 2 || (lv >= 3 && r === 4))) {
        if ((lv >= 4 || bIdx >= 1) && r === 4) {
          const gapCenter = fl(lcgRange(74, W - 74));
          const rad = 12;
          const spd = 0.05 + lv * 0.006;
          gears.push(
            { x: mx(WALL_LEFT + 22, gapCenter - 40), y: py - 22, R: rad, angle: 0, omega: spd, teeth: 10 },
            { x: mn(WALL_RIGHT - 22, gapCenter + 40), y: py - 22, R: rad, angle: 0.3, omega: -spd, teeth: 10 }
          );
          cores.push({ x: gapCenter, y: py - 22, taken: false });
        } else {
          const gx = px + beamW * 0.5 < W * 0.5
            ? fl(lcgRange(W * 0.56, WALL_RIGHT - 26))
            : fl(lcgRange(WALL_LEFT + 26, W * 0.44));
          const patrol = lv >= 3 ? (lcg() > 0.5 ? 0.45 : -0.45) : 0;
          const rad = fl(lcgRange(11, 14));
          gears.push({
            x: gx,
            y: py - 22,
            R: rad,
            angle: lcgRange(0, 6.28),
            omega: (lcg() > 0.5 ? 1 : -1) * (0.045 + lv * 0.006),
            teeth: 10,
            vx: patrol,
            minX: WALL_LEFT + 24,
            maxX: WALL_RIGHT - 24
          });
          if (lcg() > 0.3) {
            cores.push({ x: gx + (gx < W * 0.5 ? rad + 13 : -(rad + 13)), y: py - 22, taken: false });
          }
        }
      }

      if ((lv >= 2 || bIdx >= 1) && r === 0 && lcg() > 0.35) {
        const leftSide = lcg() > 0.5;
        vents.push({
          x: leftSide ? WALL_LEFT : WALL_RIGHT,
          y: py - 20,
          dir: leftSide ? 1 : -1,
          period: mx(100, fl(lcgRange(145, 185) - lv * 7)),
          phase: fl(lcgRange(0, 120)),
          len: fl(lcgRange(55, 82)),
          stun: 0
        });
      }
    }

    return { idx: chunkIdx, yTop, yBottom, platforms, gears, vents, gates, cores };
  }

  function updateChunksWindow() {
    const centerChunkIdx = mx(0, fl((H - (camY + H * 0.5)) / H));
    if (activeChunks.length === 0) {
      activeChunks = [generateChunk(centerChunkIdx), generateChunk(centerChunkIdx + 1), generateChunk(centerChunkIdx + 2)];
      topChunkIndex = centerChunkIdx + 2;
      return;
    }
    while (centerChunkIdx + 1 > topChunkIndex) {
      topChunkIndex++;
      activeChunks.shift();
      activeChunks.push(generateChunk(topChunkIndex));
    }
  }

  // =========================================================================
  // 8. CONTROLES, PAUSA RÁPIDA Y NAVEGACIÓN DEL MENÚ / TALLER / ASCENSOR
  // =========================================================================
  const keys = {};
  let touchLeft = false;
  let touchRight = false;

  window.addEventListener('keydown', (e) => {
    const firstPress = !keys[e.code];
    keys[e.code] = true;

    if (e.code === 'KeyM' && firstPress) muted = !muted;
    if (e.code === 'KeyC' && firstPress) crtEnabled = !crtEnabled;

    // Pausa rápida con [P] o [Escape]
    if ((e.code === 'KeyP' || e.code === 'Escape') && firstPress && (gameState === 1 || gameState === 3)) {
      gameState = gameState === 1 ? 3 : 1;
      sfxTone(340, gameState === 3 ? 220 : 520, 0.08, 'square', 0.07);
      return;
    }

    if (gameState !== 1 && firstPress) {
      if (e.code === 'KeyT' || e.code === 'Tab') {
        e.preventDefault();
        menuTab = 1 - menuTab;
        sfxTone(380, 560, 0.08, 'square', 0.07);
      } else if (e.code === 'Digit1' && isHullUnlocked(0)) {
        selectedHull = 0;
        sfxTone(330, 440, 0.08, 'square', 0.07);
      } else if (e.code === 'Digit2' && isHullUnlocked(1)) {
        selectedHull = 1;
        sfxTone(330, 520, 0.08, 'square', 0.07);
      } else if (e.code === 'Digit3' && isHullUnlocked(2)) {
        selectedHull = 2;
        sfxTone(330, 600, 0.08, 'square', 0.07);
      } else if (e.code === 'Digit4' && isHullUnlocked(3)) {
        selectedHull = 3;
        sfxTone(330, 680, 0.08, 'square', 0.07);
      } else if (e.code === 'KeyQ' || e.code === 'KeyF') {
        for (let k = 1; k <= 4; k++) {
          const cand = (selectedSkill + k) & 3;
          if (isSkillUnlocked(cand)) {
            selectedSkill = cand;
            sfxTone(440, 660, 0.08, 'triangle', 0.08);
            break;
          }
        }
      } else if (e.code === 'KeyE') {
        // Ascensor de Zona Inicial: permite iniciar en cualquier Zona desbloqueada (Z1..Z10)
        for (let k = 1; k <= 10; k++) {
          const cand = (startZone + k) % 10;
          if (isZoneUnlocked(cand)) {
            startZone = cand;
            sfxTone(300 + cand * 40, 520 + cand * 40, 0.08, 'triangle', 0.08);
            break;
          }
        }
      }
    }

    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter'].includes(e.code)) {
      e.preventDefault();
    }
    initAudio();

    if (gameState !== 1 && firstPress && (e.code === 'Space' || e.code === 'Enter')) {
      if (gameState === 3) gameState = 1;
      else startGame();
    } else if (gameState === 1 && firstPress && (e.code === 'Space' || e.code === 'KeyS' || e.code === 'ArrowDown')) {
      triggerActiveSkill();
    }
  });

  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  window.addEventListener('mousedown', (e) => {
    initAudio();
    if (gameState !== 1) {
      const rect = canvas.getBoundingClientRect();
      const relY = (e.clientY - rect.top) / rect.height;
      if (relY < 0.72) {
        menuTab = 1 - menuTab;
        sfxTone(380, 560, 0.08, 'square', 0.07);
      } else if (gameState === 3) {
        gameState = 1;
      } else {
        startGame();
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
      const tx = e.touches[i].clientX - rect.left;
      const ty = e.touches[i].clientY - rect.top;
      const relX = tx / rect.width;
      const relY = ty / rect.height;
      if (gameState === 1 && relY > 0.72 && e.type === 'touchstart') triggerActiveSkill();
      else if (relX < 0.5) touchLeft = true;
      else touchRight = true;
    }
    if (gameState !== 1 && e.type === 'touchstart' && e.touches.length > 0) {
      if (gameState === 3) gameState = 1;
      else startGame();
    }
  }

  window.addEventListener('touchstart', handleTouches, { passive: false });
  window.addEventListener('touchmove', handleTouches, { passive: false });
  window.addEventListener('touchend', handleTouches, { passive: false });

  // =========================================================================
  // 9. INICIALIZACIÓN CON ASCENSOR DE ZONA Y BUCLE FÍSICO DELTA-TIME
  // =========================================================================
  function startGame() {
    setSeed((Date.now() & 0xffff) ^ 1985);
    const hull = HULLS[selectedHull];
    const initMeters = startZone > 0 ? getBossAlt(startZone - 1) + 5 : 0;

    startY = 184;
    drone.x = W / 2;
    drone.y = startY - initMeters * 12;
    drone.vx = 0;
    drone.vy = 0;
    drone.theta = 0;
    drone.maxPsi = 100;
    drone.pressure = 100;
    drone.maxHp = hull.hp;
    drone.hp = hull.hp;
    drone.invuln = 0;
    drone.shield = 0;
    drone.purge = 0;
    drone.overdrive = 0;
    drone.comboCores = 0;
    drone.slamWaveR = 0;
    drone.slamCd = 0;
    drone.grazeCd = 0;
    drone.cooling = false;
    drone.grounded = false;

    playerShots = [];
    boss.active = false;
    boss.shots = [];
    biomeStage = startZone;
    bossBuffs = 0;
    ngPlus = 0;
    nextBossIdx = startZone;
    nextBossMeters = getBossAlt(startZone);

    camY = drone.y - H * 0.6;
    lavaY = drone.y + 68;
    elapsedTime = 0;
    currentMeters = initMeters;
    maxMeters = initMeters;
    diffLevel = getDiffAtMeters(initMeters);
    levelBannerTimer = startZone > 0 ? 90 : 0;
    bannerText = startZone > 0 ? 'ASCENSOR: ' + BIOMES[startZone].name : '';
    surgeTimer = 0;
    nextSurgeMeters = initMeters + 120;
    deathReason = 'CONSUMIDO POR EL MAGMA';
    screenShake = 0;
    damageFlash = 0;
    chromaTimer = 0;
    seqStep = 0;
    if (audioCtx) nextNoteTime = audioCtx.currentTime + 0.04;

    for (let i = 0; i < POOL_SIZE; i++) particles[i].active = false;
    activeChunks = [];
    updateChunksWindow();

    if (startZone > 0 && activeChunks.length > 0) {
      activeChunks[0].platforms.push({
        x1: 68,
        y1: drone.y + 10,
        x2: 188,
        y2: drone.y + 20,
        w: 120,
        cool: 1,
        wall: false,
        vx: 0,
        broken: 0
      });
    }

    gameState = 1;
    sfxTone(220, 440, 0.14, 'square', 0.08);
  }

  function triggerGameOver() {
    gameState = 2;
    menuTab = 0;
    screenShake = 14;
    chromaTimer = 20;
    if (maxMeters > highScore) {
      highScore = maxMeters;
    }
    try {
      localStorage.setItem('sh_hi', String(highScore));
    } catch (_) {}

    for (let i = 0; i < 28; i++) {
      const ang = (i / 28) * PI2;
      const spd = 0.8 + (i % 4) * 0.6;
      spawnParticle(i % 2 === 0 ? 1 : 0, drone.x, drone.y, cs(ang) * spd, sn(ang) * spd - 0.6, 24 + (i % 15), i % 3 === 0 ? 3 : 2);
    }
    sfxTone(180, 32, 0.45, 'sawtooth', 0.18);
  }

  function resolveCircleAABB(p, dt) {
    if (p.broken > 0) return false;
    const x1 = p.x1;
    const y1 = p.y1;
    const x2 = p.x2;
    const y2 = p.y2;
    const isWall = p.wall;
    const coolFactor = p.cool;
    const platformVx = p.vx || 0;

    const xn = mx(x1, mn(drone.x, x2));
    const yn = mx(y1, mn(drone.y, y2));
    const dx = drone.x - xn;
    const dy = drone.y - yn;
    const d2 = dx * dx + dy * dy;

    if (d2 < drone.r * drone.r) {
      const d = M.sqrt(d2) || 0.001;
      const nx = dx / d;
      const ny = dy / d;

      drone.x += nx * (drone.r - d);
      drone.y += ny * (drone.r - d);

      if (p.spring && ny < -0.65 && ab(drone.x - (x1 + x2) * 0.5) < 12) {
        drone.vy = MAX_VY_UP * 1.42;
        drone.pressure = mn(drone.maxPsi, drone.pressure + 15);
        sfxTone(180, 680, 0.16, 'triangle', 0.12);
        for (let s = 0; s < 6; s++) {
          spawnParticle(0, drone.x, y1, (rn() - 0.5) * 1.6, 1.5, 14, 3);
        }
        return true;
      }

      const vn = drone.vx * nx + drone.vy * ny;
      if (vn < 0) {
        const impactSpeed = -vn;
        if (!isWall && ny < -0.65 && ab(drone.vy) < 1.25 && !drone.leftOn && !drone.rightOn) {
          drone.vy = 0;
          // En Z5 Cripta Crio las vigas tienen hielo resbaladizo (menor fricción horizontal)
          const slide = getBiomeIndex() === 4 ? 0.94 : 0.75;
          drone.vx = drone.vx * slide + platformVx * 0.25;
          drone.grounded = true;
        } else {
          drone.vx -= (1 + RESTITUTION) * vn * nx;
          drone.vy -= (1 + RESTITUTION) * vn * ny;
          if (impactSpeed > 0.65) {
            sfxBounce(impactSpeed * 0.6);
            for (let s = 0; s < 3; s++) {
              spawnParticle(1, xn, yn, nx * 0.8 + (rn() - 0.5) * 1.4, ny * 0.8 - rn(), 12 + s * 3, 2);
            }
          }
        }
      }

      if (!isWall && ny < -0.65 && ab(drone.vy) < 1.3) {
        drone.grounded = true;
        if (platformVx !== 0 && !drone.leftOn && !drone.rightOn) drone.x += platformVx * dt;
        if (p.fragile) {
          p.crumble += dt;
          if (p.crumble >= 48) {
            p.broken = 180;
            p.crumble = 0;
            sfxTone(140, 50, 0.14, 'sawtooth', 0.1);
            for (let s = 0; s < 6; s++) {
              spawnParticle(1, (x1 + x2) * 0.5 + (rn() - 0.5) * 20, y1, (rn() - 0.5) * 1.5, 1.2, 16, 2);
            }
          }
        }
        if (coolFactor > 0 && drone.pressure < drone.maxPsi) {
          drone.cooling = true;
          const rechargeBoost = (bossBuffs & 2 ? 1.5 : 1.0) * (bossBuffs & 16 ? 1.25 : 1.0);
          drone.pressure = mn(drone.maxPsi, drone.pressure + 2.6 * coolFactor * rechargeBoost * dt);
          if (drone.purge > 0) drone.purge = mx(0, drone.purge - 3 * dt);
        }
      }
      return true;
    }
    return false;
  }

  function updateBoss(dt) {
    if (!boss.active) return;
    if (boss.hitFlash > 0) boss.hitFlash = mx(0, boss.hitFlash - dt);
    if (boss.shield > 0) boss.shield = mx(0, boss.shield - dt);
    boss.phaseTimer += dt;
    boss.coreTimer -= dt;

    const ay = boss.arenaY;
    if (drone.y - drone.r < ay + 36) {
      drone.y = ay + 36 + drone.r;
      drone.vy = ab(drone.vy) * 0.6 + 0.5;
    }
    if (drone.y + drone.r > ay + H - 14) {
      drone.y = ay + H - 14 - drone.r;
      drone.vy = -1.65;
      sfxBounce(0.9);
    }

    if (boss.coreTimer <= 0 && activeChunks.length > 0) {
      boss.coreTimer = 175;
      if (boss.shield <= 0 && boss.hitFlash <= 0) boss.shield = 130;
      const topChunk = activeChunks[activeChunks.length - 1];
      topChunk.cores.push({
        x: lcgRange(WALL_LEFT + 30, WALL_RIGHT - 30),
        y: ay + lcgRange(105, 195),
        taken: false,
        bossAmmo: true
      });
    }

    boss.baseY = ay + 64;
    const enrage = boss.hp <= boss.maxHp >> 1 ? 1.3 : 1.0;
    const pat = boss.type % 5;

    if (pat === 0) {
      if (boss.actionState === 0) {
        boss.x += boss.vx * enrage * dt;
        if (boss.x < WALL_LEFT + 26 || boss.x > WALL_RIGHT - 26) boss.vx = -boss.vx;
        boss.y += (boss.baseY - boss.y) * 0.1 * dt;
        if (boss.phaseTimer > 95 / enrage) {
          boss.actionState = 1;
          boss.phaseTimer = 0;
          boss.vy = 2.7 * enrage;
          sfxTone(200, 70, 0.2, 'sawtooth', 0.12);
        }
      } else {
        boss.y += boss.vy * dt;
        if (boss.y > ay + H - 38 || boss.phaseTimer > 42) {
          boss.actionState = 0;
          boss.phaseTimer = 0;
          screenShake = 6;
          for (let k = -1; k <= 1; k++) {
            boss.shots.push({ x: boss.x, y: boss.y, vx: k * 1.25 * enrage, vy: -1.5, r: 4, grav: 0.04 });
          }
        }
      }
    } else if (pat === 1) {
      boss.x += boss.vx * 1.3 * enrage * dt;
      if (boss.x < WALL_LEFT + 26 || boss.x > WALL_RIGHT - 26) boss.vx = -boss.vx;
      boss.y = boss.baseY + sn(boss.phaseTimer * 0.09) * 16;
      if (boss.phaseTimer > 68 / enrage) {
        boss.phaseTimer = 0;
        const ang = M.atan2(drone.y - boss.y, drone.x - boss.x);
        for (let k = -1; k <= 1; k++) {
          boss.shots.push({
            x: boss.x,
            y: boss.y,
            vx: cs(ang + k * 0.28) * 1.85 * enrage,
            vy: sn(ang + k * 0.28) * 1.85 * enrage,
            r: 4,
            grav: 0
          });
        }
        sfxTone(680, 240, 0.12, 'square', 0.09);
      }
    } else if (pat === 2) {
      boss.x += boss.vx * enrage * dt;
      if (boss.x < WALL_LEFT + 26 || boss.x > WALL_RIGHT - 26) boss.vx = -boss.vx;
      boss.y = boss.baseY + cs(boss.phaseTimer * 0.07) * 10;
      if (boss.phaseTimer > 58 / enrage) {
        boss.phaseTimer = 0;
        boss.shots.push(
          { x: boss.x, y: boss.y + 10, vx: 1.5 * enrage, vy: 0.9, r: 5, grav: 0.03, bounces: 1 },
          { x: boss.x, y: boss.y + 10, vx: -1.5 * enrage, vy: 0.9, r: 5, grav: 0.03, bounces: 1 }
        );
        sfxTone(320, 140, 0.12, 'triangle', 0.09);
      }
    } else if (pat === 3) {
      boss.x = W * 0.5 + sn(elapsedTime * 1.9 * enrage) * 66;
      boss.y = boss.baseY + cs(elapsedTime * 2.5) * 14;
      drone.vx += (boss.x > drone.x ? 0.02 : -0.02) * dt;
      if (boss.phaseTimer > 64 / enrage) {
        boss.phaseTimer = 0;
        for (let k = 0; k < 6; k++) {
          const a = elapsedTime * 2 + (k * PI2) / 6;
          boss.shots.push({ x: boss.x, y: boss.y, vx: cs(a) * 1.55 * enrage, vy: sn(a) * 1.55 * enrage, r: 4, grav: 0 });
        }
        sfxTone(840, 320, 0.14, 'sawtooth', 0.09);
      }
    } else {
      boss.x = W * 0.5 + sn(elapsedTime * 2.2) * 72;
      boss.y = boss.baseY + sn(elapsedTime * 4.4) * 18;
      if (boss.phaseTimer > 60 / enrage) {
        boss.phaseTimer = 0;
        const ang = M.atan2(drone.y - boss.y, drone.x - boss.x);
        boss.shots.push({ x: boss.x, y: boss.y, vx: cs(ang) * 2.1, vy: sn(ang) * 2.1, r: 5, grav: 0 });
        for (let k = 0; k < 4; k++) {
          const a = ang + 0.4 + (k * PI2) / 4;
          boss.shots.push({ x: boss.x, y: boss.y, vx: cs(a) * 1.4, vy: sn(a) * 1.4, r: 4, grav: 0, bounces: 1 });
        }
        sfxTone(920, 260, 0.15, 'sawtooth', 0.1);
      }
    }

    const distBoss = hy(drone.x - boss.x, drone.y - boss.y) || 0.001;
    if (distBoss <= drone.r + boss.r) {
      const nx = (drone.x - boss.x) / distBoss;
      const ny = (drone.y - boss.y) / distBoss;
      drone.x = boss.x + nx * (drone.r + boss.r + 2);
      drone.y = boss.y + ny * (drone.r + boss.r + 2);
      drone.vx = nx * 1.75;
      drone.vy = ny * 1.75;

      if (drone.overdrive > 0 || drone.slamWaveR > 0 || drone.shield > 0) {
        const hadShield = drone.shield > 0;
        if (hadShield) drone.shield = 0;
        damageBoss(1, hadShield);
      } else {
        applyDamage(26, 1, 'APLASTADO POR EL JEFE');
      }
    } else if (distBoss <= drone.r + boss.r + 6) {
      triggerGraze(boss.x, boss.y);
    }

    for (let i = boss.shots.length - 1; i >= 0; i--) {
      const s = boss.shots[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.grav) s.vy += s.grav * dt;

      if (s.bounces && (s.x < WALL_LEFT + s.r || s.x > WALL_RIGHT - s.r)) {
        s.vx = -s.vx;
      }

      const dShot = hy(drone.x - s.x, drone.y - s.y);
      if (dShot < drone.r + s.r) {
        boss.shots.splice(i, 1);
        if (drone.shield <= 0) applyDamage(20, 1, 'ABATIDO POR EL JEFE');
        continue;
      } else if (dShot < drone.r + s.r + 5) {
        triggerGraze(s.x, s.y);
      }

      if (s.y > camY + H + 20 || s.y < camY - 60 || s.x < 0 || s.x > W) {
        boss.shots.splice(i, 1);
      }
    }
  }

  function updatePhysics(dt) {
    elapsedTime += dt / 60;
    if (drone.invuln > 0) drone.invuln = mx(0, drone.invuln - dt);
    if (drone.shield > 0) drone.shield = mx(0, drone.shield - dt);
    if (drone.grazeCd > 0) drone.grazeCd = mx(0, drone.grazeCd - dt);
    if (drone.slamCd > 0) drone.slamCd = mx(0, drone.slamCd - dt);
    if (levelBannerTimer > 0) levelBannerTimer = mx(0, levelBannerTimer - dt);
    if (surgeTimer > 0) surgeTimer = mx(0, surgeTimer - dt);
    if (drone.slamWaveR > 0) {
      drone.slamWaveR += 3.8 * dt;
      if (drone.slamWaveR > 78) drone.slamWaveR = 0;
    }

    const hull = HULLS[selectedHull];
    const wantLeft = !!(keys['ArrowLeft'] || keys['KeyA'] || touchLeft);
    const wantRight = !!(keys['ArrowRight'] || keys['KeyD'] || touchRight);

    if (boss.active || drone.overdrive > 0) {
      if (drone.overdrive > 0) drone.overdrive = mx(0, drone.overdrive - dt);
      drone.pressure = drone.maxPsi;
      drone.purge = 0;
    }

    if (drone.purge > 0) {
      drone.purge = mx(0, drone.purge - dt);
      drone.leftOn = false;
      drone.rightOn = false;
      if (rn() < 0.25 * dt) {
        spawnParticle(0, drone.x + (rn() * 8 - 4), drone.y - 5, (rn() - 0.5) * 0.8, -0.9, 16, 3);
      }
      if (drone.purge <= 0) {
        drone.pressure = drone.maxPsi * 0.38;
        sfxTone(330, 520, 0.1, 'triangle', 0.07);
      }
    } else {
      drone.leftOn = wantLeft;
      drone.rightOn = wantRight;
      const activeNozzles = (drone.leftOn ? 1 : 0) + (drone.rightOn ? 1 : 0);
      if (!boss.active && activeNozzles > 0 && drone.overdrive <= 0) {
        const ecoFactor = (bossBuffs & 4 ? 0.75 : 1.0) * hull.psiUse;
        drone.pressure = mx(0, drone.pressure - 0.28 * activeNozzles * ecoFactor * dt);
        if (drone.pressure <= 0) {
          drone.pressure = 0;
          drone.purge = 72;
          screenShake = 6;
          sfxTone(480, 110, 0.32, 'sawtooth', 0.14);
        }
      } else if (!boss.active && !drone.grounded && drone.pressure < drone.maxPsi) {
        const airRegen = bossBuffs & 16 ? 0.15 : 0.06;
        drone.pressure = mn(drone.maxPsi, drone.pressure + airRegen * dt);
      }
    }

    const boostMult = (drone.overdrive > 0 ? 1.55 : 1.0) * (bossBuffs & 32 ? 1.15 : 1.0);
    const bIdx = getBiomeIndex();
    let ax = 0;
    let ay = 0;

    if (drone.leftOn) {
      ax += THRUST_X * hull.tx * boostMult;
      ay += THRUST_Y * hull.ty * boostMult;
      if (rn() < 0.85 * dt) {
        spawnParticle(drone.overdrive > 0 ? 1 : 0, drone.x - 6, drone.y + 3, -0.8 + (rn() - 0.5) * 0.4, 1.1 + rn() * 0.4, 13, 3);
      }
    }
    if (drone.rightOn) {
      ax -= THRUST_X * hull.tx * boostMult;
      ay += THRUST_Y * hull.ty * boostMult;
      if (rn() < 0.85 * dt) {
        spawnParticle(drone.overdrive > 0 ? 1 : 0, drone.x + 6, drone.y + 3, 0.8 + (rn() - 0.5) * 0.4, 1.1 + rn() * 0.4, 13, 3);
      }
    }

    // Efectos ambientales exclusivos por Zona durante la escalada
    if (!boss.active) {
      if (surgeTimer > 0) ay -= 0.042;
      if (bIdx === 3 || bIdx === 8) ay -= 0.022; // Corrientes térmicas ascendentes en Tormenta y Fragua Solar
      if (bIdx === 1 || bIdx === 7) ax += sn(elapsedTime * 2.2) * 0.02; // Pulsos magnéticos / corrientes abisales
    }

    if (drone.leftOn || drone.rightOn) {
      if (steamCooldown <= 0) {
        sfxSteam(drone.leftOn && drone.rightOn);
        steamCooldown = 5;
      }
    }
    if (steamCooldown > 0) steamCooldown -= dt;

    const dragFactor = M.pow(DRAG, dt);
    drone.vx = (drone.vx + ax * dt) * dragFactor;
    drone.vy = (drone.vy + (GRAVITY + ay) * dt) * dragFactor;

    const maxUp = drone.overdrive > 0 ? MAX_VY_UP * 1.3 : MAX_VY_UP;
    drone.vx = mx(-MAX_VX, mn(MAX_VX, drone.vx));
    drone.vy = mx(maxUp, mn(MAX_VY_DOWN, drone.vy));

    drone.x += drone.vx * dt;
    drone.y += drone.vy * dt;
    drone.theta = drone.vx * 0.12;

    drone.cooling = false;
    drone.grounded = false;

    for (let i = playerShots.length - 1; i >= 0; i--) {
      const ps = playerShots[i];
      ps.x += ps.vx * dt;
      ps.y += ps.vy * dt;
      if (boss.active && hy(ps.x - boss.x, ps.y - boss.y) < boss.r + 6) {
        const isParry = ps.parry === 1;
        playerShots.splice(i, 1);
        damageBoss(1, isParry);
        break;
      }
      if (ps.y < camY - 20 || ps.y > camY + H + 20 || ps.x < WALL_LEFT || ps.x > WALL_RIGHT) {
        playerShots.splice(i, 1);
      }
    }

    for (let c = 0; c < activeChunks.length; c++) {
      const chunk = activeChunks[c];

      for (let i = 0; i < chunk.platforms.length; i++) {
        const p = chunk.platforms[i];
        if (boss.active && (!p.wall || p.barrier)) continue;

        if (p.broken > 0) {
          p.broken = mx(0, p.broken - dt);
          continue;
        }
        if (p.crumble > 0 && !drone.grounded) {
          p.crumble = mx(0, p.crumble - 0.3 * dt);
        }
        if (p.vx) {
          p.x1 += p.vx * dt;
          p.x2 = p.x1 + p.w;
          if (p.x1 < p.minX || p.x2 > p.maxX) {
            p.vx = -p.vx;
            p.x1 = mx(p.minX, mn(p.x1, p.maxX - p.w));
            p.x2 = p.x1 + p.w;
          }
        }
        resolveCircleAABB(p, dt);
      }

      for (let i = 0; i < chunk.cores.length; i++) {
        const core = chunk.cores[i];
        if (core.taken || (boss.active && !core.bossAmmo)) continue;
        if (hy(drone.x - core.x, drone.y - core.y) < drone.r + 6) {
          core.taken = true;
          drone.comboCores++;
          drone.pressure = mn(drone.maxPsi, drone.pressure + 25);
          sfxTone(440, 880, 0.14, 'square', 0.1);

          if (boss.active) damageBoss(1, true);

          for (let s = 0; s < 8; s++) {
            const a = (s / 8) * PI2;
            spawnParticle(1, core.x, core.y, cs(a) * 1.6, sn(a) * 1.6, 15, 2);
          }

          if (drone.comboCores >= 3) {
            drone.comboCores = 0;
            drone.overdrive = bossBuffs & 256 ? 320 : 240;
            drone.pressure = drone.maxPsi;
            drone.purge = 0;
            bannerText = '!MODO OVERDRIVE!';
            levelBannerTimer = 95;
            screenShake = 8;
            chromaTimer = 14;
            sfxTone(523.2, 1046.5, 0.3, 'square', 0.12);
          }
        }
      }

      if (boss.active) continue;

      for (let i = 0; i < chunk.gates.length; i++) {
        const g = chunk.gates[i];
        const cycle = (elapsedTime * 60 + g.phase) % g.period;
        const closedRatio = cycle / g.period;

        if (closedRatio < 0.38) {
          g.state = 0;
          g.curLen += (16 - g.curLen) * 0.18 * dt;
        } else if (closedRatio < 0.52) {
          g.state = 1;
          g.curLen += (24 - g.curLen) * 0.15 * dt;
        } else if (closedRatio < 0.88) {
          g.state = 2;
          g.curLen += (g.maxLen - g.curLen) * 0.25 * dt;
        } else {
          g.state = 0;
          g.curLen += (16 - g.curLen) * 0.18 * dt;
        }

        const gx1 = g.fromLeft ? WALL_LEFT : WALL_RIGHT - g.curLen;
        const gx2 = g.fromLeft ? WALL_LEFT + g.curLen : WALL_RIGHT;

        if (resolveCircleAABB({ x1: gx1, y1: g.y1, x2: gx2, y2: g.y2, wall: true, cool: 0, broken: 0 }, dt)) {
          if (g.state === 2 && closedRatio < 0.62) applyDamage(20, 0, 'APLASTADO EN COMPUERTA');
        }
      }

      for (let i = chunk.gears.length - 1; i >= 0; i--) {
        const g = chunk.gears[i];
        g.angle += g.omega * dt;
        if (g.vx) {
          g.x += g.vx * dt;
          if (g.x < g.minX || g.x > g.maxX) g.vx = -g.vx;
        }

        let hitByShot = false;
        for (let j = playerShots.length - 1; j >= 0; j--) {
          if (hy(playerShots[j].x - g.x, playerShots[j].y - g.y) < g.R + 5) {
            playerShots.splice(j, 1);
            hitByShot = true;
            break;
          }
        }
        if (hitByShot) {
          chunk.gears.splice(i, 1);
          sfxTone(300, 90, 0.16, 'sawtooth', 0.12);
          continue;
        }

        const dx = drone.x - g.x;
        const dy = drone.y - g.y;
        const dist = hy(dx, dy) || 0.001;
        const minDist = drone.r + g.R;

        if (dist <= minDist) {
          if (drone.overdrive > 0 || drone.shield > 0) {
            for (let s = 0; s < 10; s++) {
              const a = (s / 10) * PI2;
              spawnParticle(1, g.x, g.y, cs(a) * 2.5, sn(a) * 2.5, 20, 3);
            }
            chunk.gears.splice(i, 1);
            screenShake = 8;
            sfxTone(300, 90, 0.18, 'sawtooth', 0.14);
            continue;
          }

          const nx = dx / dist;
          const ny = dy / dist;
          const phi = M.atan2(dy, dx);

          drone.x = g.x + nx * (minDist + 1);
          drone.y = g.y + ny * (minDist + 1);

          const vTangX = g.omega * g.R * -sn(phi) * 1.1;
          const vTangY = g.omega * g.R * cs(phi) * 1.1;
          drone.vx = mx(-MAX_VX, mn(MAX_VX, nx * 1.3 + vTangX));
          drone.vy = mx(MAX_VY_UP, mn(MAX_VY_DOWN, ny * 1.3 + vTangY));

          applyDamage(32, 1, 'DESTRUIDO POR SIERRA');

          for (let s = 0; s < 8; s++) {
            spawnParticle(1, g.x + nx * g.R, g.y + ny * g.R, (rn() - 0.5) * 2.4 + nx, (rn() - 0.5) * 2.4 + ny, 16, 2);
          }
        } else if (dist <= minDist + 6) {
          triggerGraze(g.x, g.y);
        }
      }

      for (let i = 0; i < chunk.vents.length; i++) {
        const v = chunk.vents[i];
        if (v.stun > 0) {
          v.stun -= dt;
          continue;
        }
        const cycle = (elapsedTime * 60 + v.phase) % v.period;
        if (cycle < 42) {
          if (rn() < 0.3 * dt) {
            spawnParticle(0, v.x + v.dir * 4, v.y + (rn() * 6 - 3), v.dir * lcgRange(1.6, 2.4), (rn() - 0.5) * 0.3, 15, 3);
          }
          const inY = ab(drone.y - v.y) < 10;
          const inX = v.dir === 1 ? drone.x > v.x && drone.x < v.x + v.len : drone.x < v.x && drone.x > v.x - v.len;
          if (inY && inX) {
            drone.vx = mx(-MAX_VX, mn(MAX_VX, drone.vx + v.dir * 0.16 * dt));
            drone.vy -= 0.04 * dt;
            if (drone.overdrive <= 0) drone.pressure = mx(0, drone.pressure - 0.32 * dt);
          }
        }
      }
    }

    updateBoss(dt);

    if (boss.active) {
      camY += (boss.arenaY - camY) * 0.2 * dt;
    } else {
      const targetCamY = drone.y - H * 0.6;
      if (targetCamY < camY) camY += (targetCamY - camY) * (1 - M.pow(0.88, dt));
      else if (targetCamY > camY + 32) camY += (targetCamY - camY - 32) * (1 - M.pow(0.92, dt));
    }

    updateChunksWindow();

    currentMeters = getHeightMetersAtY(drone.y);
    if (currentMeters > maxMeters) maxMeters = currentMeters;

    if (!boss.active && maxMeters >= nextBossMeters) {
      spawnBoss(nextBossIdx);
    }

    if (!boss.active && maxMeters >= nextSurgeMeters) {
      nextSurgeMeters += 130;
      surgeTimer = 300;
      playGateWarning();
    }

    const newDiff = getDiffAtMeters(maxMeters);
    if (newDiff > diffLevel) {
      diffLevel = newDiff;
      sfxTone(330, 660, 0.22, 'square', 0.09);
    }

    if (boss.active) {
      lavaY = mx(lavaY, camY + H + 28);
    } else {
      const baseLavaStep = 0.21 + (diffLevel - 1) * 0.046 + mn(0.1, elapsedTime * 0.001);
      lavaY -= baseLavaStep * (surgeTimer > 0 ? 1.6 : 1.0) * dt;

      const maxLavaLag = mx(140, 190 - (diffLevel - 1) * 6);
      if (lavaY > drone.y + maxLavaLag) lavaY -= (lavaY - (drone.y + maxLavaLag)) * 0.035 * dt;
    }

    if (rn() < 0.22 * dt) {
      spawnParticle(2, WALL_LEFT + 6 + rn() * (WALL_RIGHT - WALL_LEFT - 12), lavaY, (rn() - 0.5) * 0.3, -0.6 - rn() * 0.5, 20, 2);
    }

    if (drone.y + drone.r >= lavaY) {
      deathReason = 'CONSUMIDO POR EL MAGMA';
      triggerGameOver();
    }
  }

  // =========================================================================
  // 10. RENDERIZADO TEMÁTICO, INDICADORES EN PRIMER PLANO Y MODALES UNIFICADOS
  // =========================================================================
  function drawBackground(camY, biome) {
    const bIdx = getBiomeIndex();
    fR(0, 0, W, H, damageFlash > 0 ? C_RDD : biome.bg);
    const parallaxY = (camY * 0.4) | 0;
    const brickH = 16;
    const startRow = fl(parallaxY / brickH);

    if (bIdx % 3 === 0) {
      fR(34, 0, 6, H, biome.wall);
      fR(36, 0, 2, H, biome.lavaDeep);
      fR(W - 40, 0, 6, H, biome.wall);
      fR(W - 38, 0, 2, H, biome.lavaDeep);
    } else if (bIdx % 3 === 1) {
      fR(48, 0, 4, H, biome.brick);
      fR(W - 52, 0, 4, H, biome.brick);
    }

    for (let r = startRow; r < startRow + 17; r++) {
      const sy = r * brickH - parallaxY;
      fR(WALL_LEFT, sy, WALL_RIGHT - WALL_LEFT, 1, biome.wall);

      const pat = bIdx % 5;
      if (pat === 0) {
        const offset = (r & 1) * 16;
        for (let bx = WALL_LEFT + offset; bx < WALL_RIGHT; bx += 32) fR(bx, sy, 1, brickH);
        if (r % 5 === 0) fR(WALL_LEFT, sy + 2, WALL_RIGHT - WALL_LEFT, 4, biome.brick);
      } else if (pat === 1) {
        for (let bx = WALL_LEFT + 16; bx < WALL_RIGHT; bx += 48) {
          fR(bx, sy + 2, 2, brickH - 4, biome.brick);
          if ((r + bx) % 3 === 0) fR(bx, sy + 6, 2, 2, biome.trim);
        }
      } else if (pat === 2) {
        if (r % 3 === 0) {
          fR(WALL_LEFT, sy + 4, WALL_RIGHT - WALL_LEFT, 5, biome.brick);
          fR(((r * 37) % 180) + 36, sy + 5, 6, 3, biome.lavaTop);
        }
      } else if (pat === 3) {
        fR(((r * 53) % 190) + 32, sy + 6, 2, 2, r & 1 ? biome.trim : biome.spark);
        if (r % 4 === 0 && ((elapsedTime * 12 + r) | 0) % 3 === 0) {
          fR(WALL_LEFT + 20, sy + 8, WALL_RIGHT - WALL_LEFT - 40, 1, biome.trim);
        }
      } else {
        const cx = ((r * 61) % 176) + 40;
        fR(cx, sy + 3, 4, 10, biome.brick);
        fR(cx + 1, sy + 5, 2, 6, biome.spark);
      }
    }
  }

  function drawGear(g, camY, biome) {
    const sy = g.y - camY;
    if (sy < -g.R - 8 || sy > H + g.R + 8) return;

    ctx.save();
    ctx.translate(g.x, sy);
    ctx.rotate(g.angle);
    drawToothed(g.teeth * 2, g.R + 1, g.R - 4, biome.gearCol, biome.gearRim);
    fArc(0, 0, g.R - 5, biome.wall);
    fArc(0, 0, 2.5, biome.spark);
    ctx.restore();
  }

  function drawCore(core, camY) {
    if (core.taken) return;
    const sy = (core.y - camY) | 0;
    if (sy < -10 || sy > H + 10) return;
    const pulse = (2 + sn(elapsedTime * 8) * 1.2) | 0;

    ctx.save();
    ctx.translate(core.x, sy);
    ctx.rotate(elapsedTime * 3);
    fR(-4, -4, 8, 8, core.bossAmmo ? C_CYN : C_GLD);
    ctx.rotate(PI * 0.25);
    fR(-3, -3, 6, 6, C_YLW);
    fR(-1, -1, pulse, pulse, C_WHT);
    ctx.restore();
  }

  function drawBoss(camY, biome) {
    if (!boss.active) return;
    const sy = (boss.y - camY) | 0;
    const ay = (boss.arenaY - camY) | 0;

    for (let lx = WALL_LEFT; lx < WALL_RIGHT; lx += 10) {
      fR(lx, ay + 35, 6, 2, ((elapsedTime * 15) | 0) & 1 ? C_RED : C_YLW);
      fR(lx, ay + H - 14, 6, 3, ((elapsedTime * 15) | 0) & 1 ? C_CYN : C_ICE);
    }

    for (let i = 0; i < boss.shots.length; i++) {
      const s = boss.shots[i];
      fArc(s.x, s.y - camY, s.r, ((elapsedTime * 20) | 0) & 1 ? C_YLW : biome.lavaTop);
    }

    ctx.save();
    ctx.translate(boss.x, sy);
    if (boss.shield > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, boss.r + 6 + sn(elapsedTime * 22) * 1.5, 0, PI2);
      ctx.strokeStyle = ((elapsedTime * 16) | 0) & 1 ? C_CYN : C_PRP;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.rotate(elapsedTime * (boss.type & 1 ? -3.4 : 2.4));
    drawToothed(16 + (boss.type & 4), boss.r + 3, boss.r - 3, boss.hitFlash > 0 ? C_WHT : biome.lavaMid, C_YLW);
    fArc(0, 0, boss.r - 5, C_BLK);
    fArc(0, 0, 6, boss.hitFlash > 0 ? C_RED : biome.lavaTop);
    fR(-2, -2, 4, 4, C_YLW);
    ctx.restore();

    const bw = 48;
    const bx = (boss.x - (bw >> 1)) | 0;
    const by = sy - boss.r - 12;
    fR(bx, by, bw, 5, C_BLK);
    fR(bx + 1, by + 1, fl((boss.hp / boss.maxHp) * (bw - 2)), 3, boss.shield > 0 ? C_CYN : C_RED);
  }

  function drawWorld(camY, biome) {
    // 1. Dibujar primero bloques, vigas, compuertas, núcleos y sierras
    for (let c = 0; c < activeChunks.length; c++) {
      const chunk = activeChunks[c];

      for (let i = 0; i < chunk.platforms.length; i++) {
        const p = chunk.platforms[i];
        if (boss.active && (!p.wall || p.barrier)) continue;
        if (p.broken > 0) continue;
        const sy1 = (p.y1 - camY) | 0;
        const sy2 = (p.y2 - camY) | 0;
        if (sy2 < 0 || sy1 > H) continue;
        const pw = (p.x2 - p.x1) | 0;
        const ph = mx(1, sy2 - sy1);
        const shakeX = p.crumble > 0 ? ((rn() - 0.5) * 3) | 0 : 0;

        if (p.wall && !p.barrier) {
          fR(p.x1, sy1, pw, ph, biome.brick);
          fR(p.x1 === 0 ? pw - 3 : p.x1, sy1, 3, ph, biome.trim);
        } else if (p.barrier) {
          fR(p.x1, sy1, pw, ph, biome.wall);
          fR(p.x1, sy1, pw, 2, biome.trim);
          fR(p.x1, sy2 - 2, pw, 2, biome.trim);
          for (let sx = p.x1 + 4; sx < p.x2 - 6; sx += 10) {
            fR(sx, sy1 + 3, 4, ph - 6, biome.spark);
          }
        } else {
          const px1 = (p.x1 | 0) + shakeX;
          fR(px1, sy1, pw, ph, p.fragile ? C_RDD : biome.plat);
          fR(px1, sy1, pw, 3, p.fragile ? C_ORG : p.cool >= 1 ? biome.platTop : biome.trim);
          if (p.cool > 0 && !p.fragile) {
            for (let rx = px1 + 4; rx < p.x2 - 4; rx += 10) {
              fR(rx, sy1 + 1, 4, 1, C_WHT);
            }
          }
          if (p.spring) {
            const mxMid = ((p.x1 + p.x2) >> 1) - 6;
            fR(mxMid, sy1 - 4, 12, 4, C_YLW);
            fR(mxMid + 2, sy1 - 2, 8, 2, C_RED);
          }
          if (p.vx) fR(((p.x1 + p.x2) >> 1) - 2, sy1 + 4, 4, 3, biome.spark);
        }
      }

      for (let i = 0; i < chunk.cores.length; i++) {
        if (!boss.active || chunk.cores[i].bossAmmo) drawCore(chunk.cores[i], camY);
      }

      if (boss.active) continue;

      for (let i = 0; i < chunk.gates.length; i++) {
        const g = chunk.gates[i];
        const sy1 = (g.y1 - camY) | 0;
        const sy2 = (g.y2 - camY) | 0;
        if (sy2 < 0 || sy1 > H) continue;
        const ph = sy2 - sy1;
        const gx1 = (g.fromLeft ? WALL_LEFT : WALL_RIGHT - g.curLen) | 0;
        const gw = g.curLen | 0;

        fR(g.fromLeft ? WALL_LEFT : WALL_RIGHT - g.maxLen, sy1 + 3, g.maxLen, 4, biome.wall);
        fR(gx1, sy1, gw, ph, g.state === 2 ? C_RDD : biome.plat);
        const edgeCol = g.state === 2 ? C_RED : g.state === 1 ? C_YLW : biome.trim;
        fR(gx1, sy1, gw, 2, edgeCol);
        fR(gx1, sy2 - 2, gw, 2, edgeCol);
        fR(g.fromLeft ? gx1 + gw - 6 : gx1, sy1 + 2, 6, ph - 4, g.state === 2 ? C_ORG : biome.spark);
      }

      for (let i = 0; i < chunk.vents.length; i++) {
        const v = chunk.vents[i];
        const sy = (v.y - camY) | 0;
        if (sy < -10 || sy > H + 10) continue;
        fR(v.dir === 1 ? v.x - 2 : v.x - 4, sy - 4, 6, 8, v.stun > 0 ? C_GRY : biome.trim);
      }

      for (let i = 0; i < chunk.gears.length; i++) drawGear(chunk.gears[i], camY, biome);
    }

    for (let i = 0; i < playerShots.length; i++) {
      const ps = playerShots[i];
      fArc(ps.x, ps.y - camY, ps.parry ? 5 : 4, ps.parry ? C_CYN : C_ORG);
      fArc(ps.x, ps.y - camY, 2, C_WHT);
    }

    drawBoss(camY, biome);

    if (drone.slamWaveR > 0) {
      ctx.strokeStyle = C_ICE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(drone.slamWaveX, drone.slamWaveY - camY, drone.slamWaveR, 0, PI2);
      ctx.stroke();
    }

    // 2. CAPA DE PRIMER PLANO (FOREGROUND): Indicadores de Dificultad y Jefe SIEMPRE POR ENCIMA de bloques/celdas
    if (!boss.active) {
      const bsy = (startY - nextBossMeters * 12 - camY) | 0;
      const minM = mx(DIFF_STEP, fl(getHeightMetersAtY(camY + H) / DIFF_STEP) * DIFF_STEP);
      const maxM = getHeightMetersAtY(camY) + DIFF_STEP;

      for (let m = minM; m <= maxM; m += DIFF_STEP) {
        const sy = (startY - m * 12 - camY) | 0;
        // Evitar que una línea de dificultad se solape con la línea de Jefe o el HUD superior
        if (sy >= 38 && sy <= H - 18 && ab(sy - bsy) > 16) {
          const lCol = maxMeters >= m ? C_GRN : C_ORG;
          for (let lx = WALL_LEFT + 2; lx < WALL_RIGHT - 4; lx += 12) fR(lx, sy, 7, 1, lCol);
          fR((W >> 1) - 48, sy - 5, 96, 11, 'rgba(6, 9, 15, 0.92)');
          fR((W >> 1) - 48, sy - 5, 96, 1, lCol);
          drawText('DIFICULTAD NV.' + (1 + m / DIFF_STEP), W >> 1, sy - 2, lCol, 1, 1);
        }
      }

      if (bsy >= 38 && bsy <= H - 18) {
        for (let lx = WALL_LEFT + 2; lx < WALL_RIGHT - 4; lx += 10) fR(lx, bsy - 1, 6, 3, C_RED);
        fR((W >> 1) - 56, bsy - 6, 112, 12, 'rgba(6, 9, 15, 0.94)');
        fR((W >> 1) - 56, bsy - 6, 112, 1, C_RED);
        fR((W >> 1) - 56, bsy + 5, 112, 1, C_RED);
        drawText('! JEFE A ' + nextBossMeters + 'M !', W >> 1, bsy - 2, C_YLW, 1, 1);
      }
    }
  }

  function drawDrone(camY) {
    if (drone.invuln > 0 && ((drone.invuln >> 1) & 1)) return;
    const hull = HULLS[selectedHull];

    ctx.save();
    ctx.translate(drone.x, drone.y - camY);
    ctx.rotate(drone.theta);

    if (drone.overdrive > 0 || drone.shield > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, drone.r + 4 + sn(elapsedTime * 20) * 1.5, 0, PI2);
      ctx.strokeStyle = drone.shield > 0 ? C_CYN : C_YLW;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (selectedHull === 1) {
      fR(-6, -drone.r - 3, 12, 3, C_GLD);
    } else if (selectedHull === 2) {
      fR(-drone.r - 5, -4, 4, 3, C_CYN);
      fR(drone.r + 1, -4, 4, 3, C_CYN);
    } else if (selectedHull === 3) {
      fArc(0, -drone.r - 2, 3, C_PRP);
    }

    fR(-drone.r - 3, -1, 4, 6, drone.leftOn ? C_ORG : C_CPR);
    fR(drone.r - 1, -1, 4, 6, drone.rightOn ? C_ORG : C_CPR);
    if (drone.leftOn) fR(-drone.r - 3, 5, 3, 3, C_WHT);
    if (drone.rightOn) fR(drone.r, 5, 3, 3, C_WHT);

    fArc(
      0,
      0,
      drone.r,
      drone.overdrive > 0
        ? C_GLD
        : drone.purge > 0
        ? ((drone.purge >> 2) & 1 ? C_RED : hull.body)
        : drone.cooling
        ? C_CYN
        : hull.body
    );
    fArc(-2, -2, drone.r * 0.55, drone.overdrive > 0 ? C_YLW : drone.cooling ? C_ICE : hull.hi);
    fR(-2, -drone.r - 2, 4, 2, C_CPR);
    fArc(0, 0, 3.6, C_BLK);

    const px = mx(-1.8, mn(1.8, drone.vx * 0.8));
    const py = mx(-1.8, mn(1.8, drone.vy * 0.8));
    fR((px - 1) | 0, (py - 1) | 0, 2, 2, drone.purge > 0 ? C_ORG : drone.cooling ? C_ICE : C_YLW);

    ctx.restore();
  }

  function drawLava(camY, biome) {
    const sy = (lavaY - camY) | 0;
    if (sy > H) {
      const dist = mx(0, fl((lavaY - drone.y) / 12));
      if (dist < 14 && !boss.active) fR(WALL_LEFT, H - 3, WALL_RIGHT - WALL_LEFT, 3, (elapsedTime * 10) & 1 ? biome.lavaMid : biome.lavaTop);
      return;
    }

    const topY = mx(0, sy);
    fR(0, topY, W, H - topY, biome.lavaDeep);
    fR(0, topY, W, mn(10, H - topY), biome.lavaMid);

    for (let x = 0; x < W; x += 8) {
      fR(x, (topY + sn(elapsedTime * 6 + x * 0.2) * 2) | 0, 6, 3, biome.lavaTop);
    }
    for (let x = 2; x < W; x += 16) {
      fR(x, (topY + cs(elapsedTime * 8 + x * 0.3) * 1.5) | 0, 4, 1, biome.spark);
    }
  }

  function drawCRT() {
    if (!crtEnabled && chromaTimer <= 0) return;

    if (chromaTimer > 0) {
      fR(0, 0, 4, H, 'rgba(239, 68, 68, 0.14)');
      fR(W - 4, 0, 4, H, 'rgba(56, 189, 248, 0.14)');
    }

    if (crtEnabled) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      for (let y = 0; y < H; y += 2) {
        fR(0, y, W, 1);
      }
    }
  }

  function drawHUD(biome) {
    fR(0, 0, W, 25, C_BLK);
    fR(0, 24, W, 1, biome.trim);

    drawText(boss.active ? 'INF' : 'PSI', 4, 4, boss.active ? C_GLD : C_WHT, 1);
    fR(4, 12, 62, 7, C_DRK);

    const pWidth = fl((drone.pressure / drone.maxPsi) * 60);
    const barColor = boss.active || drone.overdrive > 0
      ? (((elapsedTime * 16) | 0) & 1 ? C_YLW : C_GLD)
      : drone.purge > 0
      ? (((drone.purge >> 2) & 1) ? C_RED : C_ORG)
      : drone.cooling
      ? C_ICE
      : drone.pressure < drone.maxPsi * 0.3
      ? C_ORG
      : C_CYN;
    fR(5, 13, pWidth, 5, barColor);

    for (let i = 0; i < drone.maxHp; i++) {
      fR(25 + i * 6, 4, 4, 5, i < drone.hp ? C_YLW : C_DRK);
    }

    drawText('Z' + (getBiomeIndex() + 1) + ' NV:' + diffLevel, 72, 4, C_ORG, 1);
    for (let i = 0; i < 3; i++) fR(138 + i * 6, 4, 4, 5, drone.overdrive > 0 || i < drone.comboCores ? C_YLW : C_DRK);

    const sk = SKILLS[selectedSkill];
    const maxCd = getMaxSlamCd();
    const slamReady = drone.purge <= 0 && drone.slamCd <= 0 && (boss.active || drone.pressure >= sk.cost || drone.overdrive > 0);
    const slamRatio = drone.slamCd > 0 ? 1 - drone.slamCd / maxCd : boss.active ? 1 : mn(1, drone.pressure / sk.cost);
    fR(72, 12, 92, 7, C_DRK);
    fR(73, 13, fl(slamRatio * 90), 5, slamReady ? C_GRN : C_RST);
    drawText(
      slamReady ? 'ESP:LISTO' : drone.slamCd > 0 ? 'ESP:RECARGA' : 'ESP:' + sk.cost + ' PSI',
      118,
      13,
      slamReady ? C_WHT : C_GRY,
      1,
      1
    );

    drawText('ALT:' + maxMeters + 'M', 251, 4, C_YLW, 1, 2);
    drawText('TOP:' + mx(highScore, maxMeters) + 'M', 251, 13, C_GRY, 1, 2);

    // RANURA 1: Barra superior de Arena 1v1 o Indicador de Pausa
    let nextAlertY = 27;
    if (boss.active) {
      fR(WALL_LEFT, nextAlertY, WALL_RIGHT - WALL_LEFT, 11, 'rgba(6, 9, 15, 0.92)');
      drawText('1V1: ' + BIOMES[boss.type].bossName + ' (PSI INF)', W >> 1, nextAlertY + 3, C_RED, 1, 1);
      nextAlertY += 13;
    } else {
      // Indicador no intrusivo de cercanía al Jefe (<30M) en su propia ranura dedicada
      const distToBoss = nextBossMeters - maxMeters;
      if (distToBoss > 0 && distToBoss <= 28 && levelBannerTimer <= 0) {
        fR(36, nextAlertY, W - 72, 11, 'rgba(6, 9, 15, 0.9)');
        drawText('PROXIMO JEFE EN ' + distToBoss + 'M', W >> 1, nextAlertY + 3, C_GLD, 1, 1);
        nextAlertY += 13;
      }
    }

    // RANURA 2: Notificaciones de Bonos, Parry, Overdrive o Sobrecarga
    if (levelBannerTimer > 0) {
      fR(20, nextAlertY, W - 40, 11, 'rgba(6, 9, 15, 0.9)');
      drawText(bannerText, W >> 1, nextAlertY + 3, C_YLW, 1, 1);
    } else if (surgeTimer > 0 && !boss.active) {
      fR(26, nextAlertY, W - 52, 11, 'rgba(6, 9, 15, 0.9)');
      drawText('!SOBRECARGA TERMICA ACTIVA!', W >> 1, nextAlertY + 3, C_ORG, 1, 1);
    }

    // RANURA 3 (Inferior): Alerta dedicada de Magma en la parte baja
    if (!boss.active) {
      const lavaDistM = mx(0, fl((lavaY - drone.y) / 12));
      if (lavaDistM < 12) {
        fR(62, H - 15, W - 124, 11, 'rgba(6, 9, 15, 0.92)');
        drawText(
          '! MAGMA A ' + lavaDistM + 'M !',
          W >> 1,
          H - 12,
          ((elapsedTime * 10) | 0) & 1 ? C_RED : C_YLW,
          1,
          1
        );
      }
    }
  }

  function drawGarageBox() {
    fR(22, 66, W - 44, 108, C_DRK);
    drawText('VEHICULOS [TECLAS 1-4]:', W >> 1, 71, C_CYN, 1, 1);
    for (let i = 0; i < 4; i++) {
      const unl = isHullUnlocked(i);
      const sel = selectedHull === i;
      const col = sel ? C_YLW : unl ? C_WHT : C_GRY;
      drawText(
        (sel ? '>' : ' ') + (i + 1) + ':' + HULLS[i].name + (unl ? '' : ' (' + HULLS[i].req + ')'),
        28,
        81 + i * 9,
        col,
        1,
        0
      );
    }

    drawText('HABILIDAD [ESP] (CAMBIAR CON [Q]):', W >> 1, 120, C_GLD, 1, 1);
    const sk = SKILLS[selectedSkill];
    drawText('> ' + sk.name + ' (' + sk.cost + ' PSI)', W >> 1, 130, C_GRN, 1, 1);
    drawText(sk.desc, W >> 1, 140, C_WHT, 1, 1);

    let defeatedCount = 0;
    for (let b = 0; b < 10; b++) if (bossUnlockMask & (1 << b)) defeatedCount++;
    drawText('ASCENSOR [E]: ' + BIOMES[startZone].name, W >> 1, 152, C_CYN, 1, 1);
    drawText('JEFES VENCIDOS: ' + defeatedCount + '/10', W >> 1, 162, C_ICE, 1, 1);
  }

  function drawModal(title, titleCol, borderCol, subText, btnText) {
    fR(16, 16, W - 32, H - 32, 'rgba(6, 9, 15, 0.94)');
    ctx.strokeStyle = borderCol;
    ctx.lineWidth = 2;
    ctx.strokeRect(17, 17, W - 34, H - 34);

    drawText(title, W >> 1, 24, titleCol, 2, 1);
    if (subText) drawText(subText, W >> 1, 44, C_RED, 1, 1);

    const btnCol = ((elapsedTime * 3) | 0) & 1 ? C_ORG : C_RST;
    fR(60, 182, W - 120, 20, btnCol);
    ctx.strokeStyle = C_YLW;
    ctx.strokeRect(60, 182, W - 120, 20);
    drawText(btnText, W >> 1, 190, C_WHT, 1, 1);
  }

  function drawMenu() {
    const biome = BIOMES[((elapsedTime * 0.2) | 0) % 10];
    drawBackground(elapsedTime * -12, biome);
    drawModal(
      'STEAM HOPPER',
      C_GLD,
      C_BRS,
      bossUnlockMask & 512 ? 'CORONA CENIT [NG+ DESBLOQUEADO]' : '',
      'JUGAR YA [ESP]'
    );

    drone.x = W >> 1;
    drone.y = 52 + sn(elapsedTime * 3) * 2;
    drone.vx = cs(elapsedTime * 1.8) * 1.1;
    drone.vy = sn(elapsedTime * 3) * 0.4;
    drone.theta = drone.vx * 0.12;
    drone.leftOn = sn(elapsedTime * 3) < 0;
    drone.rightOn = sn(elapsedTime * 3) < 0.2;
    drone.invuln = 0;
    drone.overdrive = 0;
    drone.shield = 0;
    drawDrone(0);

    if (menuTab === 0) {
      fR(24, 66, W - 48, 66, C_DRK);
      drawText('GUIA RAPIDA:', W >> 1, 72, C_CYN, 1, 1);
      drawText('A / D : PROPULSORES (AMBOS = SUBIR)', W >> 1, 84, C_WHT, 1, 1);
      drawText('ESPACIO : HABILIDAD (+PARRY EN JEFE)', W >> 1, 96, C_YLW, 1, 1);
      drawText('P / ESC : PAUSA | E : ASCENSOR ZONA', W >> 1, 108, C_GRN, 1, 1);
      drawText('EQUIPO: ' + HULLS[selectedHull].name, W >> 1, 120, C_ICE, 1, 1);

      drawText('INICIO [E]: ' + BIOMES[startZone].name, W >> 1, 140, C_GRY, 1, 1);
      drawText('RECORD MAXIMO: ' + highScore + 'M', W >> 1, 152, C_GLD, 1, 1);
      drawText('TECLA [T] : VEHICULOS Y HABILIDADES', W >> 1, 165, C_CYN, 1, 1);
    } else {
      drawGarageBox();
    }
  }

  function drawOverlayModal() {
    const isPause = gameState === 3;
    drawModal(
      isPause ? 'JUEGO EN PAUSA' : 'FIN DE PARTIDA',
      isPause ? C_CYN : C_ORG,
      isPause ? C_CYN : C_RED,
      isPause ? 'TEMA OST: ' + BIOMES[getBiomeIndex()].name : deathReason,
      isPause ? 'CONTINUAR [ESP]' : 'JUGAR YA [ESP]'
    );

    if (menuTab === 0) {
      fR(26, 66, W - 52, 74, C_DRK);
      drawText('ZONA: ' + BIOMES[getBiomeIndex()].name, W >> 1, 76, C_CYN, 1, 1);
      drawText('ALTURA MAXIMA: ' + maxMeters + 'M (NV.' + diffLevel + ')', W >> 1, 92, C_WHT, 1, 1);
      drawText('RECORD: ' + highScore + 'M', W >> 1, 108, C_YLW, 1, 1);
      let activeBuffs = 0;
      for (let b = 0; b < 10; b++) if (bossBuffs & (1 << b)) activeBuffs++;
      drawText('BONOS DE JEFE ACTIVOS: ' + activeBuffs, W >> 1, 124, C_GRN, 1, 1);
      drawText('TECLA [T] : VEHICULOS Y HABILIDADES', W >> 1, 154, C_CYN, 1, 1);
    } else {
      drawGarageBox();
    }
  }

  // =========================================================================
  // 11. BUCLE PRINCIPAL DESACOPLADO POR DELTA-TIME (TOPE 240 FPS)
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
      if (gameState !== 3) updateParticles(dt);
    }

    if (screenShake > 0) screenShake = mx(0, screenShake - dt);
    if (damageFlash > 0) damageFlash = mx(0, damageFlash - dt);
    if (chromaTimer > 0) chromaTimer = mx(0, chromaTimer - dt);

    const biome = BIOMES[getBiomeIndex()];

    ctx.save();
    if (screenShake > 0) {
      ctx.translate(((rn() - 0.5) * screenShake) | 0, ((rn() - 0.5) * screenShake) | 0);
    }

    if (gameState === 0) {
      drawMenu();
    } else {
      drawBackground(camY, biome);
      drawWorld(camY, biome);
      drawParticles(camY, biome);
      if (gameState !== 2) drawDrone(camY);
      drawLava(camY, biome);
      drawHUD(biome);
      if (gameState >= 2) drawOverlayModal();
    }
    drawCRT();

    ctx.restore();
  }

  requestAnimationFrame(frame);
})();
