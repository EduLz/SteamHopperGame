/**
 * STEAM HOPPER: HIGH-OCTANE EDITION (v5 - 10 Zones, 10 1v1 Boss Arenas, Infinite Arena PSI, Vehicles & Skills)
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
  const PI = M.PI;
  const PI2 = PI * 2;

  const UI_COL = {
    black: '#06090f',
    dark: '#161920',
    rust: '#3b251e',
    copper: '#7a4832',
    brass: '#c87d3b',
    gold: '#fbbf24',
    yellow: '#fde047',
    redDark: '#8c1d18',
    red: '#ef4444',
    orange: '#ff7722',
    steelDark: '#1e3a4c',
    cyan: '#38bdf8',
    ice: '#bae6fd',
    gray: '#94a3b8',
    white: '#f8fafc',
    green: '#4ade80',
    purple: '#c084fc'
  };

  const hsl = (h, s, l) => 'hsl(' + h + ',' + s + '%,' + l + '%)';

  // 10 Zonas Únicas (Niveles 1 al 10) con sus 10 Jefes y Bonos de Victoria
  const BIOMES = [
    ['Z1 FUNDICION', 'TRITURADOR IGNEO', 'BLINDAJE (-30% DANO)', 12, 38],
    ['Z2 TALLER VOLTAICO', 'CENTINELA VOLTAICO', '+50% RECARGA VIGAS', 205, 48],
    ['Z3 REACTOR QUIMICO', 'AUTOMATA TOXICO', 'TOBERAS ECO (-25% PSI)', 142, 280],
    ['Z4 TIRO TORMENTA', 'NUCLEO TORMENTA', '+1 VIDA MAXIMA', 272, 195],
    ['Z5 CRIPTA CRIO', 'CRIO-AUTOCLAVE', 'ENFRIAMIENTO RAPIDO', 192, 210],
    ['Z6 CALDERA RUBI', 'PIRO-COLOSO', '+15% EMPUJE VAPOR', 348, 45],
    ['Z7 CAMARA CUARZO', 'PRISMA RESONANTE', 'ROCE +6 PSI EXTRA', 42, 18],
    ['Z8 SECTOR ABISAL', 'LEVIATAN HIERRO', 'RECARGA HABILIDAD +25%', 220, 190],
    ['Z9 FRAGUA SOLAR', 'SOLARIS MK.IX', 'OVERDRIVE EXTENDIDO', 24, 52],
    ['Z10 CORONA CENIT', 'EMPERADOR VAPOR', 'NUCLEO SUPREMO MAX', 292, 48]
  ].map(([name, bossName, buffText, h1, h2]) => ({
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
  }));

  // Distancia entre niveles de dificultad (60m) y alturas de los 10 Jefes de Zona
  const DIFF_STEP = 60;
  const BOSS_ALTS = [110, 230, 350, 470, 590, 710, 830, 950, 1070, 1200];
  const THRUST_X = 0.135;
  const THRUST_Y = -0.225;
  const GRAVITY = 0.095;
  const SLAM_MAX_CD = 135;

  // 4 Vehículos Desbloqueables (Teclas 1-4 en el Taller)
  const HULLS = [
    ['MK.I BRONCE', 'BASE', 5, 1, 1, 1, 8, '#c87d3b', '#fbbf24'],
    ['MK.II FORJA', 'RECORD 80M', 6, 0.96, 1.02, 0.9, 8, '#dc2626', '#fde047'],
    ['MK.III VOLTAICO', 'RECORD 180M', 5, 1.18, 1.12, 0.95, 10, '#0284c7', '#bae6fd'],
    ['MK.IV ESPECTRO', 'RECORD 300M / JEFE 4', 5, 1.12, 1.08, 0.8, 14, '#9333ea', '#f5d0fe']
  ].map(([name, req, hp, tx, ty, psiUse, grazeBonus, body, hi]) => ({
    name,
    req,
    hp,
    tx,
    ty,
    psiUse,
    grazeBonus,
    body,
    hi
  }));

  // 4 Habilidades Activas [ESPACIO] (Se desbloquean al derrotar a los Jefes)
  const SKILLS = [
    ['ONDA SLAM', 'BASE', 25, 'ONDA EXPANSIVA QUE DANA JEFES'],
    ['CANON MAGMA', 'VENCER JEFE 1', 25, 'DISPARA 3 BOLAS IGNEAS ARRIBA'],
    ['ESCUDO VOLTAICO', 'VENCER JEFE 2', 30, 'ESCUDO INVULNERABLE Y EMBESTIDA'],
    ['IMPULSO TORMENTA', 'VENCER JEFE 3', 20, 'SALTO PLASMA + DANO + 15 PSI']
  ].map(([name, req, cost, desc]) => ({ name, req, cost, desc }));

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

    ctx.fillStyle = '#000';
    for (let i = 0; i < s.length; i++) {
      const runs = GLYPH_RUNS[s[i]];
      if (!runs) continue;
      const gx = startX + i * step + 1;
      for (let j = 0; j < runs.length; j += 3) {
        ctx.fillRect(gx + runs[j] * scale, sy + runs[j + 1] * scale + 1, runs[j + 2] * scale, scale);
      }
    }

    ctx.fillStyle = color;
    for (let i = 0; i < s.length; i++) {
      const runs = GLYPH_RUNS[s[i]];
      if (!runs) continue;
      const gx = startX + i * step;
      for (let j = 0; j < runs.length; j += 3) {
        ctx.fillRect(gx + runs[j] * scale, sy + runs[j + 1] * scale, runs[j + 2] * scale, scale);
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
  // 4. ARQUITECTURA DE AUDIO NATIVO ("BATTLE OST" 4 CANALES)
  // =========================================================================
  let audioCtx = null;
  let noiseBuf = null;
  let nextNoteTime = 0;
  let seqStep = 0;
  let steamCooldown = 0;
  let muted = false;

  const m2f = (m) => (m > 0 ? 440 * M.pow(2, (m - 69) / 12) : 0);

  const HERO_LEAD = [
    72, 0, 72, 75, 79, 0, 75, 79, 84, 82, 79, 75, 79, 0, 75, 72,
    68, 0, 68, 72, 75, 0, 72, 75, 80, 79, 75, 72, 75, 0, 72, 68,
    70, 0, 70, 74, 77, 0, 74, 77, 82, 84, 86, 82, 84, 0, 82, 79,
    79, 77, 75, 74, 75, 74, 72, 71, 72, 74, 75, 77, 79, 83, 84, 79
  ];

  const HERO_LEAD_B = [
    84, 0, 79, 84, 87, 86, 84, 79, 84, 0, 79, 84, 89, 87, 86, 84,
    80, 0, 75, 80, 84, 82, 80, 75, 80, 0, 75, 80, 86, 84, 82, 80,
    82, 0, 77, 82, 86, 84, 82, 77, 86, 87, 89, 86, 91, 0, 89, 86,
    84, 83, 84, 86, 87, 86, 84, 83, 84, 79, 75, 74, 72, 75, 79, 83
  ];

  const BASS_ROOTS = [36, 32, 34, 31];
  const CHORD_ARPS = [
    [60, 63, 67, 72],
    [56, 60, 63, 68],
    [58, 62, 65, 70],
    [55, 59, 62, 67]
  ];

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
    const bar = (step >> 4) & 3;
    const sub = step & 15;
    const isSectionB = ((step >> 6) & 1) === 1 || boss.active;

    const rootMidi = BASS_ROOTS[bar] + (boss.active ? 2 : 0);
    const bassMidi = (sub & 3) === 2 ? rootMidi + 12 : rootMidi;
    if ((sub & 3) !== 1 || isSectionB) {
      playOsc('sawtooth', m2f(bassMidi), m2f(bassMidi), time, stepDur * 0.9, 0.045);
    }

    if (sub % 4 === 0 || (sub === 14 && bar === 3)) {
      playOsc('sine', 130, 35, time, 0.085, 0.11);
    }
    if (sub % 8 === 4 || (bar === 3 && sub >= 12 && sub % 2 === 1)) {
      playNoise('highpass', 900, 0, time, 0.09, 0.065);
    } else if (sub % 2 === 1) {
      playNoise('highpass', 5200, 0, time, 0.035, 0.022);
    }

    let leadMidi = (isSectionB ? HERO_LEAD_B : HERO_LEAD)[step & 63];
    if (leadMidi > 0) {
      if (boss.active) leadMidi += 2;
      const f = m2f(leadMidi);
      playOsc('square', f, f * 1.005, time, stepDur * 1.45, 0.038);
    }

    const arpMidi = CHORD_ARPS[bar][sub & 3] + (boss.active ? 2 : 0);
    playOsc('triangle', m2f(arpMidi), m2f(arpMidi), time, stepDur * 0.85, 0.035);
  }

  function updateBGM() {
    if (!audioCtx || muted || gameState !== 1) return;
    const bpm = drone.overdrive > 0 ? 192 : boss.active ? 176 : mn(180, 154 + (diffLevel - 1) * 3);
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
        fR(sx - (sz >> 1), sy - (sz >> 1), sz, sz, ratio > 0.45 ? UI_COL.white : UI_COL.gray);
      } else if (p.type === 1) {
        fR(sx, sy, p.size, p.size, ratio > 0.4 ? biome.spark : biome.lavaTop);
      } else {
        fR(sx, sy, p.size, p.size, ratio > 0.5 ? biome.lavaTop : biome.lavaMid);
      }
    }
  }

  // =========================================================================
  // 6. ESTADO GLOBAL, PROGRESIÓN, VEHÍCULOS, HABILIDADES Y ARENA DE JEFE
  // =========================================================================
  let gameState = 0;
  let menuTab = 0; // 0: Guía Rápida / Jugar, 1: Taller (Vehículos y Habilidades)
  let highScore = 0;
  let bossUnlockMask = 0; // Bits 0..9: Jefes 1..10 derrotados históricamente
  let selectedHull = 0;
  let selectedSkill = 0;
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

  // Estado del Jefe y su Arena de Combate 1v1 Limpia
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
    shield: 0, // Escudo refractario periódico del jefe (evita derrotarlo fácilmente)
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
  let bossBuffs = 0; // Bonificaciones ganadas en la partida al vencer jefes (Bits 0..9)
  let nextBossIdx = 0;
  let nextBossMeters = BOSS_ALTS[0];
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
  const getDiffAtMeters = (m) => 1 + fl(m / DIFF_STEP);
  const getBiomeIndex = () => mn(9, biomeStage);
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
    const idx = mn(9, bType);
    boss.active = true;
    boss.type = idx;
    // Escalar vida del Jefe (6 HP en Zona 1 hasta 18 HP en Zona 10)
    boss.maxHp = 6 + idx + (idx >> 1);
    boss.hp = boss.maxHp;
    boss.arenaY = drone.y - H * 0.58;
    camY = boss.arenaY;
    boss.x = W / 2;
    boss.baseY = boss.arenaY + 62;
    boss.y = boss.baseY;
    boss.vx = 1.2 + idx * 0.11;
    boss.vy = 0;
    boss.r = 17;
    boss.hitFlash = 0;
    boss.shield = 0;
    boss.phaseTimer = 0;
    boss.actionState = 0;
    boss.coreTimer = 95;
    boss.shots = [];

    // Limpiar núcleos anteriores y otorgar PSI infinito inmediato al entrar al Versus 1v1
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

    // Si el Jefe tiene su Escudo Refractario activo y no es un Núcleo de Ruptura, repele el ataque
    if (boss.shield > 0 && !breakShield) {
      sfxBounce(1.4);
      bannerText = '!ESCUDO ACTIVO! TOMA NUCLEO O ESPERA';
      levelBannerTimer = 45;
      return;
    }

    boss.shield = 0;
    boss.hp = mx(0, boss.hp - dmg);
    // 52 frames (~0.86s) de invulnerabilidad post-golpe + onda de repulsión para evitar daño múltiple instantáneo
    boss.hitFlash = 52;
    playerShots = [];
    screenShake = 11;
    chromaTimer = 12;
    sfxTone(420, 120, 0.22, 'sawtooth', 0.15);

    // Onda de contra-impulso del Jefe al recibir daño (evita quedarse pegado a él)
    const dx = drone.x - boss.x;
    const dy = drone.y - boss.y;
    const d = M.hypot(dx, dy) || 1;
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
      biomeStage = mn(9, biomeStage + 1);

      // Guardar desbloqueo permanente del Jefe derrotado
      bossUnlockMask |= 1 << bType;
      try {
        localStorage.setItem('sh_unl', String(bossUnlockMask));
      } catch (_) {}

      // Otorgar bonificación permanente al jugador para el resto de la partida
      bossBuffs |= 1 << bType;
      if (bType === 3 || bType === 9) drone.maxHp++;
      drone.hp = mn(drone.maxHp, drone.hp + 2);
      drone.pressure = drone.maxPsi;
      drone.overdrive = bossBuffs & 256 ? 270 : 190;

      // Al terminar el duelo 1v1, colocar una viga de apoyo debajo del jugador para continuar el ascenso
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
      nextBossMeters = nextBossIdx < BOSS_ALTS.length ? BOSS_ALTS[nextBossIdx] : maxMeters + 140;
    }
  }

  function triggerActiveSkill() {
    if (gameState !== 1 || drone.purge > 0 || drone.slamCd > 0) return;
    const sk = SKILLS[selectedSkill];
    // En la Zona de Jefe el PSI es infinito, pero el enfriamiento getMaxSlamCd() impide spamear
    if (!boss.active && drone.pressure < sk.cost && drone.overdrive <= 0) return;
    if (!boss.active && drone.overdrive <= 0) drone.pressure = mx(0, drone.pressure - sk.cost);

    drone.slamCd = getMaxSlamCd();
    screenShake = 7;
    chromaTimer = 8;

    if (selectedSkill === 0) {
      // Habilidad 0: ONDA SLAM (Onda expansiva de mayor alcance en 1v1)
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
      if (boss.active && M.hypot(boss.x - drone.x, boss.y - drone.y) < 92) damageBoss(1);
    } else if (selectedSkill === 1) {
      // Habilidad 1 (Jefe 1): CAÑÓN MAGMA (3 disparos ígneos ascendentes)
      drone.vy = mx(MAX_VY_UP, drone.vy + 0.55);
      for (let k = -1; k <= 1; k++) {
        playerShots.push({ x: drone.x + k * 5, y: drone.y - 6, vx: k * 0.75, vy: -3.4 });
      }
      sfxTone(540, 160, 0.18, 'sawtooth', 0.14);
    } else if (selectedSkill === 2) {
      // Habilidad 2 (Jefe 2): ESCUDO VOLTAICO (2.6s de escudo eléctrico y embestida)
      drone.shield = 155;
      sfxTone(320, 880, 0.25, 'square', 0.12);
    } else {
      // Habilidad 3 (Jefe 3): IMPULSO TORMENTA (Salto ascendente de plasma + onda + +15 PSI)
      drone.vy = MAX_VY_UP * 1.45;
      drone.pressure = mn(drone.maxPsi, drone.pressure + 15);
      drone.slamWaveR = 2;
      drone.slamWaveX = drone.x;
      drone.slamWaveY = drone.y;
      sfxTone(240, 960, 0.22, 'sawtooth', 0.14);
      if (boss.active && M.hypot(boss.x - drone.x, boss.y - drone.y) < 94) damageBoss(1);
    }

    // Limpiar proyectiles de jefe cercanos al activar habilidad
    for (let i = boss.shots.length - 1; i >= 0; i--) {
      if (M.hypot(boss.shots[i].x - drone.x, boss.shots[i].y - drone.y) < 76) {
        boss.shots.splice(i, 1);
      }
    }

    if (!boss.active) {
      for (let c = 0; c < activeChunks.length; c++) {
        const ch = activeChunks[c];
        for (let i = 0; i < ch.gears.length; i++) {
          const g = ch.gears[i];
          if (M.hypot(g.x - drone.x, g.y - drone.y) < 75) {
            g.omega *= 0.25;
            g.vx = 0;
          }
        }
        for (let i = 0; i < ch.vents.length; i++) {
          const v = ch.vents[i];
          if (M.abs(v.y - drone.y) < 65) v.stun = 120;
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
      activeChunks = [generateChunk(0), generateChunk(1), generateChunk(2)];
      topChunkIndex = 2;
      return;
    }
    while (centerChunkIdx + 1 > topChunkIndex) {
      topChunkIndex++;
      activeChunks.shift();
      activeChunks.push(generateChunk(topChunkIndex));
    }
  }

  // =========================================================================
  // 8. CONTROLES Y NAVEGACIÓN DEL MENÚ / TALLER
  // =========================================================================
  const keys = {};
  let touchLeft = false;
  let touchRight = false;

  window.addEventListener('keydown', (e) => {
    const firstPress = !keys[e.code];
    keys[e.code] = true;

    if (e.code === 'KeyM' && firstPress) muted = !muted;
    if (e.code === 'KeyC' && firstPress) crtEnabled = !crtEnabled;

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
      }
    }

    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter'].includes(e.code)) {
      e.preventDefault();
    }
    initAudio();

    if (gameState !== 1 && firstPress && (e.code === 'Space' || e.code === 'Enter')) {
      startGame();
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
    if (gameState !== 1 && e.type === 'touchstart' && e.touches.length > 0) startGame();
  }

  window.addEventListener('touchstart', handleTouches, { passive: false });
  window.addEventListener('touchmove', handleTouches, { passive: false });
  window.addEventListener('touchend', handleTouches, { passive: false });

  // =========================================================================
  // 9. INICIALIZACIÓN, ARENA DE JEFE 1V1 Y BUCLE FÍSICO DELTA-TIME
  // =========================================================================
  function startGame() {
    setSeed((Date.now() & 0xffff) ^ 1985);
    const hull = HULLS[selectedHull];

    drone.x = W / 2;
    drone.y = 184;
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
    biomeStage = 0;
    bossBuffs = 0;
    nextBossIdx = 0;
    nextBossMeters = BOSS_ALTS[0];

    startY = 184;
    camY = 0;
    lavaY = 252;
    elapsedTime = 0;
    currentMeters = 0;
    maxMeters = 0;
    diffLevel = 1;
    levelBannerTimer = 0;
    bannerText = '';
    surgeTimer = 0;
    nextSurgeMeters = 120;
    deathReason = 'CONSUMIDO POR EL MAGMA';
    screenShake = 0;
    damageFlash = 0;
    chromaTimer = 0;
    seqStep = 0;
    if (audioCtx) nextNoteTime = audioCtx.currentTime + 0.04;

    for (let i = 0; i < POOL_SIZE; i++) particles[i].active = false;
    activeChunks = [];
    updateChunksWindow();

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

      if (p.spring && ny < -0.65 && M.abs(drone.x - (x1 + x2) * 0.5) < 12) {
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
        if (!isWall && ny < -0.65 && M.abs(drone.vy) < 1.25 && !drone.leftOn && !drone.rightOn) {
          drone.vy = 0;
          drone.vx = drone.vx * 0.75 + platformVx * 0.25;
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

      if (!isWall && ny < -0.65 && M.abs(drone.vy) < 1.3) {
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
    // Sello láser superior de la Arena 1v1: impide escapar hacia arriba
    if (drone.y - drone.r < ay + 36) {
      drone.y = ay + 36 + drone.r;
      drone.vy = M.abs(drone.vy) * 0.6 + 0.5;
    }
    // Red de contención inferior repulsiva (no es un piso para posarse: impulsa al jugador al combate aéreo)
    if (drone.y + drone.r > ay + H - 14) {
      drone.y = ay + H - 14 - drone.r;
      drone.vy = -1.65;
      sfxBounce(0.9);
    }

    // Generar Núcleos de Ruptura en la arena limpia (rompen el escudo del Jefe y le infligen daño)
    if (boss.coreTimer <= 0 && activeChunks.length > 0) {
      boss.coreTimer = 175;
      // Al aparecer un núcleo, el Jefe también puede activar su Escudo Refractario temporal (130 frames)
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
    // Modo Furia (Enrage) cuando al Jefe le queda 50% o menos de vida
    const enrage = boss.hp <= boss.maxHp >> 1 ? 1.3 : 1.0;
    const pat = boss.type % 5;

    if (pat === 0) {
      // Patrón A (Jefes 1 y 6): Patrulla + Embestida vertical aplastante + Mortero triple
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
      // Patrón B (Jefes 2 y 7): Zig-zag sinusoidal + Abanico dirigido de alta velocidad
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
      // Patrón C (Jefes 3 y 8): Bombas rebotadoras en las paredes + Lluvia cruzada
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
      // Patrón D (Jefes 4 y 9): Vórtice gravitatorio + Espiral rotatoria de 6 vías
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
      // Patrón E (Jefes 5 y 10): Teletransporte / Figura en 8 + Nova radial + Disparo al jugador
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

    const distBoss = M.hypot(drone.x - boss.x, drone.y - boss.y) || 0.001;
    if (distBoss <= drone.r + boss.r) {
      const nx = (drone.x - boss.x) / distBoss;
      const ny = (drone.y - boss.y) / distBoss;
      drone.x = boss.x + nx * (drone.r + boss.r + 2);
      drone.y = boss.y + ny * (drone.r + boss.r + 2);
      drone.vx = nx * 1.75;
      drone.vy = ny * 1.75;

      if (drone.overdrive > 0 || drone.slamWaveR > 0 || drone.shield > 0) {
        if (drone.shield > 0) drone.shield = 0; // Consumir el escudo al embestir al Jefe
        damageBoss(1);
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

      const dShot = M.hypot(drone.x - s.x, drone.y - s.y);
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

    // En la Zona de Jefe el PSI es INFINITO para permitir el duelo aéreo 1v1 sin plataformas
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

    if (surgeTimer > 0 && !boss.active) ay -= 0.042;

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

    // Actualizar proyectiles de la habilidad Cañón Magma
    for (let i = playerShots.length - 1; i >= 0; i--) {
      const ps = playerShots[i];
      ps.x += ps.vx * dt;
      ps.y += ps.vy * dt;
      if (boss.active && M.hypot(ps.x - boss.x, ps.y - boss.y) < boss.r + 5) {
        playerShots.splice(i, 1);
        damageBoss(1);
        break;
      }
      if (ps.y < camY - 20 || ps.x < WALL_LEFT || ps.x > WALL_RIGHT) {
        playerShots.splice(i, 1);
      }
    }

    for (let c = 0; c < activeChunks.length; c++) {
      const chunk = activeChunks[c];

      for (let i = 0; i < chunk.platforms.length; i++) {
        const p = chunk.platforms[i];
        // En la Arena de Jefe 1v1 sólo existen las paredes laterales exteriores (campo 100% limpio)
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
        if (M.hypot(drone.x - core.x, drone.y - core.y) < drone.r + 6) {
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

      // Durante el duelo 1v1 contra el Jefe, desactivar compuertas, sierras y respiraderos del escenario
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
          if (M.hypot(playerShots[j].x - g.x, playerShots[j].y - g.y) < g.R + 5) {
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
        const dist = M.hypot(dx, dy) || 0.001;
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
          const inY = M.abs(drone.y - v.y) < 10;
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
  // 10. RENDERIZADO TEMÁTICO (10 ZONAS), ARENA 1V1, VEHÍCULOS Y TALLER
  // =========================================================================
  function drawBackground(camY, biome) {
    const bIdx = getBiomeIndex();
    fR(0, 0, W, H, damageFlash > 0 ? UI_COL.redDark : biome.bg);
    const parallaxY = (camY * 0.4) | 0;
    const brickH = 16;
    const startRow = fl(parallaxY / brickH);

    // Columnas / Conductos verticales exclusivos según la Zona (0..9)
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
        // Cristales / Prismas diagonales para Cripta Crio y Corona del Cenit
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
    fR(-4, -4, 8, 8, core.bossAmmo ? UI_COL.cyan : UI_COL.gold);
    ctx.rotate(PI * 0.25);
    fR(-3, -3, 6, 6, UI_COL.yellow);
    fR(-1, -1, pulse, pulse, UI_COL.white);
    ctx.restore();
  }

  function drawBoss(camY, biome) {
    if (!boss.active) return;
    const sy = (boss.y - camY) | 0;
    const ay = (boss.arenaY - camY) | 0;

    // Barrera láser superior e inferior repulsiva de la Arena 1v1 Limpia (sin plataformas estáticas)
    for (let lx = WALL_LEFT; lx < WALL_RIGHT; lx += 10) {
      fR(lx, ay + 35, 6, 2, ((elapsedTime * 15) | 0) & 1 ? UI_COL.red : UI_COL.yellow);
      fR(lx, ay + H - 14, 6, 3, ((elapsedTime * 15) | 0) & 1 ? UI_COL.cyan : UI_COL.ice);
    }

    for (let i = 0; i < boss.shots.length; i++) {
      const s = boss.shots[i];
      fArc(s.x, s.y - camY, s.r, ((elapsedTime * 20) | 0) & 1 ? UI_COL.yellow : biome.lavaTop);
    }

    ctx.save();
    ctx.translate(boss.x, sy);
    if (boss.shield > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, boss.r + 6 + sn(elapsedTime * 22) * 1.5, 0, PI2);
      ctx.strokeStyle = ((elapsedTime * 16) | 0) & 1 ? UI_COL.cyan : UI_COL.purple;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.rotate(elapsedTime * (boss.type & 1 ? -3.4 : 2.4));
    drawToothed(16 + (boss.type & 4), boss.r + 3, boss.r - 3, boss.hitFlash > 0 ? UI_COL.white : biome.lavaMid, UI_COL.yellow);
    fArc(0, 0, boss.r - 5, UI_COL.black);
    fArc(0, 0, 6, boss.hitFlash > 0 ? UI_COL.red : biome.lavaTop);
    fR(-2, -2, 4, 4, UI_COL.yellow);
    ctx.restore();

    const bw = 48;
    const bx = (boss.x - (bw >> 1)) | 0;
    const by = sy - boss.r - 12;
    fR(bx, by, bw, 5, UI_COL.black);
    fR(bx + 1, by + 1, fl((boss.hp / boss.maxHp) * (bw - 2)), 3, boss.shield > 0 ? UI_COL.cyan : UI_COL.red);
  }

  function drawWorld(camY, biome) {
    // En la Zona de Combate 1v1 del Jefe, ocultar líneas de dificultad y plataformas para dejar el campo 100% limpio
    if (!boss.active) {
      const minM = mx(DIFF_STEP, fl(getHeightMetersAtY(camY + H) / DIFF_STEP) * DIFF_STEP);
      const maxM = getHeightMetersAtY(camY) + DIFF_STEP;
      for (let m = minM; m <= maxM; m += DIFF_STEP) {
        const sy = (startY - m * 12 - camY) | 0;
        if (sy >= 25 && sy <= H) {
          const lCol = maxMeters >= m ? UI_COL.green : UI_COL.orange;
          for (let lx = WALL_LEFT + 2; lx < WALL_RIGHT - 4; lx += 12) fR(lx, sy, 7, 1, lCol);
          fR((W >> 1) - 46, sy - 4, 92, 9, UI_COL.black);
          drawText('DIFICULTAD NV.' + (1 + m / DIFF_STEP), W >> 1, sy - 2, lCol, 1, 1);
        }
      }

      const bsy = (startY - nextBossMeters * 12 - camY) | 0;
      if (bsy >= 25 && bsy <= H) {
        for (let lx = WALL_LEFT + 2; lx < WALL_RIGHT - 4; lx += 10) fR(lx, bsy - 1, 6, 3, UI_COL.red);
        fR((W >> 1) - 52, bsy - 4, 104, 9, UI_COL.black);
        drawText('! JEFE A ' + nextBossMeters + 'M !', W >> 1, bsy - 2, UI_COL.yellow, 1, 1);
      }
    }

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
          fR(px1, sy1, pw, ph, p.fragile ? UI_COL.redDark : biome.plat);
          fR(px1, sy1, pw, 3, p.fragile ? UI_COL.orange : p.cool >= 1 ? biome.platTop : biome.trim);
          if (p.cool > 0 && !p.fragile) {
            for (let rx = px1 + 4; rx < p.x2 - 4; rx += 10) {
              fR(rx, sy1 + 1, 4, 1, UI_COL.white);
            }
          }
          if (p.spring) {
            const mxMid = ((p.x1 + p.x2) >> 1) - 6;
            fR(mxMid, sy1 - 4, 12, 4, UI_COL.yellow);
            fR(mxMid + 2, sy1 - 2, 8, 2, UI_COL.red);
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
        fR(gx1, sy1, gw, ph, g.state === 2 ? UI_COL.redDark : biome.plat);
        const edgeCol = g.state === 2 ? UI_COL.red : g.state === 1 ? UI_COL.yellow : biome.trim;
        fR(gx1, sy1, gw, 2, edgeCol);
        fR(gx1, sy2 - 2, gw, 2, edgeCol);
        fR(g.fromLeft ? gx1 + gw - 6 : gx1, sy1 + 2, 6, ph - 4, g.state === 2 ? UI_COL.orange : biome.spark);
      }

      for (let i = 0; i < chunk.vents.length; i++) {
        const v = chunk.vents[i];
        const sy = (v.y - camY) | 0;
        if (sy < -10 || sy > H + 10) continue;
        fR(v.dir === 1 ? v.x - 2 : v.x - 4, sy - 4, 6, 8, v.stun > 0 ? UI_COL.gray : biome.trim);
      }

      for (let i = 0; i < chunk.gears.length; i++) drawGear(chunk.gears[i], camY, biome);
    }

    for (let i = 0; i < playerShots.length; i++) {
      fArc(playerShots[i].x, playerShots[i].y - camY, 4, UI_COL.orange);
      fArc(playerShots[i].x, playerShots[i].y - camY, 2, UI_COL.yellow);
    }

    drawBoss(camY, biome);

    if (drone.slamWaveR > 0) {
      ctx.strokeStyle = UI_COL.ice;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(drone.slamWaveX, drone.slamWaveY - camY, drone.slamWaveR, 0, PI2);
      ctx.stroke();
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
      ctx.strokeStyle = drone.shield > 0 ? UI_COL.cyan : UI_COL.yellow;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (selectedHull === 1) {
      fR(-6, -drone.r - 3, 12, 3, UI_COL.gold);
    } else if (selectedHull === 2) {
      fR(-drone.r - 5, -4, 4, 3, UI_COL.cyan);
      fR(drone.r + 1, -4, 4, 3, UI_COL.cyan);
    } else if (selectedHull === 3) {
      fArc(0, -drone.r - 2, 3, UI_COL.purple);
    }

    fR(-drone.r - 3, -1, 4, 6, drone.leftOn ? UI_COL.orange : UI_COL.copper);
    fR(drone.r - 1, -1, 4, 6, drone.rightOn ? UI_COL.orange : UI_COL.copper);
    if (drone.leftOn) fR(-drone.r - 3, 5, 3, 3, UI_COL.white);
    if (drone.rightOn) fR(drone.r, 5, 3, 3, UI_COL.white);

    fArc(
      0,
      0,
      drone.r,
      drone.overdrive > 0
        ? UI_COL.gold
        : drone.purge > 0
        ? ((drone.purge >> 2) & 1 ? UI_COL.red : hull.body)
        : drone.cooling
        ? UI_COL.cyan
        : hull.body
    );
    fArc(-2, -2, drone.r * 0.55, drone.overdrive > 0 ? UI_COL.yellow : drone.cooling ? UI_COL.ice : hull.hi);
    fR(-2, -drone.r - 2, 4, 2, UI_COL.copper);
    fArc(0, 0, 3.6, UI_COL.black);

    const px = mx(-1.8, mn(1.8, drone.vx * 0.8));
    const py = mx(-1.8, mn(1.8, drone.vy * 0.8));
    fR((px - 1) | 0, (py - 1) | 0, 2, 2, drone.purge > 0 ? UI_COL.orange : drone.cooling ? UI_COL.ice : UI_COL.yellow);

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
    fR(0, 0, W, 25, UI_COL.black);
    fR(0, 24, W, 1, biome.trim);

    // Columna Izquierda: Presión (PSI o INF en Arena de Jefe) y Vidas (HP)
    drawText(boss.active ? 'INF' : 'PSI', 4, 4, boss.active ? UI_COL.gold : UI_COL.white, 1);
    fR(4, 12, 62, 7, UI_COL.dark);

    const pWidth = fl((drone.pressure / drone.maxPsi) * 60);
    const barColor = boss.active || drone.overdrive > 0
      ? (((elapsedTime * 16) | 0) & 1 ? UI_COL.yellow : UI_COL.gold)
      : drone.purge > 0
      ? (((drone.purge >> 2) & 1) ? UI_COL.red : UI_COL.orange)
      : drone.cooling
      ? UI_COL.ice
      : drone.pressure < drone.maxPsi * 0.3
      ? UI_COL.orange
      : UI_COL.cyan;
    fR(5, 13, pWidth, 5, barColor);

    for (let i = 0; i < drone.maxHp; i++) {
      fR(25 + i * 6, 4, 4, 5, i < drone.hp ? UI_COL.yellow : UI_COL.dark);
    }

    // Columna Central: Nivel, Overdrive e Indicador de Disponibilidad de Habilidad [ESPACIO]
    drawText('Z' + (getBiomeIndex() + 1) + ' NV:' + diffLevel, 72, 4, UI_COL.orange, 1);
    for (let i = 0; i < 3; i++) fR(138 + i * 6, 4, 4, 5, drone.overdrive > 0 || i < drone.comboCores ? UI_COL.yellow : UI_COL.dark);

    const sk = SKILLS[selectedSkill];
    const maxCd = getMaxSlamCd();
    const slamReady = drone.purge <= 0 && drone.slamCd <= 0 && (boss.active || drone.pressure >= sk.cost || drone.overdrive > 0);
    const slamRatio = drone.slamCd > 0 ? 1 - drone.slamCd / maxCd : boss.active ? 1 : mn(1, drone.pressure / sk.cost);
    fR(72, 12, 92, 7, UI_COL.dark);
    fR(73, 13, fl(slamRatio * 90), 5, slamReady ? UI_COL.green : UI_COL.rust);
    drawText(
      slamReady ? 'ESP:LISTO' : drone.slamCd > 0 ? 'ESP:RECARGA' : 'ESP:' + sk.cost + ' PSI',
      118,
      13,
      slamReady ? UI_COL.white : UI_COL.gray,
      1,
      1
    );

    // Columna Derecha: Altura y Récord
    drawText('ALT:' + maxMeters + 'M', 251, 4, UI_COL.yellow, 1, 2);
    drawText('TOP:' + mx(highScore, maxMeters) + 'M', 251, 13, UI_COL.gray, 1, 2);

    // RANURA 1: Barra fija de Arena de Jefe 1v1
    let nextAlertY = 27;
    if (boss.active) {
      fR(WALL_LEFT, nextAlertY, WALL_RIGHT - WALL_LEFT, 11, 'rgba(6, 9, 15, 0.9)');
      drawText('1V1: ' + BIOMES[boss.type].bossName + ' (PSI INF)', W >> 1, nextAlertY + 3, UI_COL.red, 1, 1);
      nextAlertY += 13;
    }

    // RANURA 2: Notificaciones breves de estado
    if (levelBannerTimer > 0) {
      fR(20, nextAlertY, W - 40, 11, 'rgba(6, 9, 15, 0.88)');
      drawText(bannerText, W >> 1, nextAlertY + 3, UI_COL.yellow, 1, 1);
    } else if (surgeTimer > 0 && !boss.active) {
      fR(26, nextAlertY, W - 52, 11, 'rgba(6, 9, 15, 0.88)');
      drawText('!SOBRECARGA TERMICA ACTIVA!', W >> 1, nextAlertY + 3, UI_COL.orange, 1, 1);
    }

    // RANURA 3 (Inferior): Alerta dedicada de Magma en la parte baja
    if (!boss.active) {
      const lavaDistM = mx(0, fl((lavaY - drone.y) / 12));
      if (lavaDistM < 12) {
        fR(62, H - 15, W - 124, 11, 'rgba(6, 9, 15, 0.9)');
        drawText(
          '! MAGMA A ' + lavaDistM + 'M !',
          W >> 1,
          H - 12,
          ((elapsedTime * 10) | 0) & 1 ? UI_COL.red : UI_COL.yellow,
          1,
          1
        );
      }
    }
  }

  function drawGarageBox() {
    fR(22, 68, W - 44, 104, UI_COL.dark);
    drawText('VEHICULOS [TECLAS 1-4]:', W >> 1, 73, UI_COL.cyan, 1, 1);
    for (let i = 0; i < 4; i++) {
      const unl = isHullUnlocked(i);
      const sel = selectedHull === i;
      const col = sel ? UI_COL.yellow : unl ? UI_COL.white : UI_COL.gray;
      drawText(
        (sel ? '>' : ' ') + (i + 1) + ':' + HULLS[i].name + (unl ? '' : ' (' + HULLS[i].req + ')'),
        28,
        84 + i * 9,
        col,
        1,
        0
      );
    }

    drawText('HABILIDAD [ESP] (CAMBIAR CON [Q]):', W >> 1, 125, UI_COL.gold, 1, 1);
    const sk = SKILLS[selectedSkill];
    drawText('> ' + sk.name + ' (' + sk.cost + ' PSI)', W >> 1, 136, UI_COL.green, 1, 1);
    drawText(sk.desc, W >> 1, 146, UI_COL.white, 1, 1);
    const nextSk = (selectedSkill + 1) & 3;
    if (!isSkillUnlocked(nextSk)) {
      drawText('BLOQ: ' + SKILLS[nextSk].name + ' (' + SKILLS[nextSk].req + ')', W >> 1, 158, UI_COL.gray, 1, 1);
    } else {
      let defeatedCount = 0;
      for (let b = 0; b < 10; b++) if (bossUnlockMask & (1 << b)) defeatedCount++;
      drawText('JEFES DERROTADOS: ' + defeatedCount + '/10', W >> 1, 158, UI_COL.ice, 1, 1);
    }
  }

  function drawMenu() {
    const biome = BIOMES[((elapsedTime * 0.2) | 0) % 10];
    drawBackground(elapsedTime * -12, biome);

    fR(16, 16, W - 32, H - 32, 'rgba(6, 9, 15, 0.94)');
    ctx.strokeStyle = UI_COL.brass;
    ctx.lineWidth = 2;
    ctx.strokeRect(17, 17, W - 34, H - 34);

    drawText('STEAM HOPPER', W >> 1, 24, UI_COL.gold, 2, 1);

    drone.x = W >> 1;
    drone.y = 50 + sn(elapsedTime * 3) * 2;
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
      fR(24, 68, W - 48, 64, UI_COL.dark);
      drawText('GUIA RAPIDA:', W >> 1, 74, UI_COL.cyan, 1, 1);
      drawText('A / D : PROPULSORES (AMBOS = SUBIR)', W >> 1, 86, UI_COL.white, 1, 1);
      drawText('ESPACIO : HABILIDAD', W >> 1, 98, UI_COL.yellow, 1, 1);
      drawText('VIGAS RECARGAN PSI | JEFES DAN BONOS', W >> 1, 110, UI_COL.green, 1, 1);
      drawText('EQUIPO: ' + HULLS[selectedHull].name, W >> 1, 122, UI_COL.ice, 1, 1);

      drawText('ZONA: ' + BIOMES[0].name, W >> 1, 140, UI_COL.gray, 1, 1);
      drawText('RECORD MAXIMO: ' + highScore + 'M', W >> 1, 152, UI_COL.gold, 1, 1);
      drawText('TECLA [T] : VEHICULOS Y HABILIDADES', W >> 1, 165, UI_COL.cyan, 1, 1);
    } else {
      drawGarageBox();
    }

    const btnCol = ((elapsedTime * 3) | 0) & 1 ? UI_COL.orange : UI_COL.rust;
    fR(60, 180, W - 120, 20, btnCol);
    ctx.strokeStyle = UI_COL.yellow;
    ctx.strokeRect(60, 180, W - 120, 20);
    drawText('JUGAR YA [ESP]', W >> 1, 188, UI_COL.white, 1, 1);
  }

  function drawGameOver() {
    fR(18, 22, W - 36, 194, 'rgba(6, 9, 15, 0.94)');
    ctx.strokeStyle = UI_COL.red;
    ctx.lineWidth = 2;
    ctx.strokeRect(19, 23, W - 38, 192);

    drawText('FIN DE PARTIDA', W >> 1, 32, UI_COL.orange, 2, 1);
    drawText(deathReason, W >> 1, 52, UI_COL.red, 1, 1);

    if (menuTab === 0) {
      fR(26, 68, W - 52, 72, UI_COL.dark);
      drawText('ZONA: ' + BIOMES[getBiomeIndex()].name, W >> 1, 78, UI_COL.cyan, 1, 1);
      drawText('ALTURA MAXIMA: ' + maxMeters + 'M (NV.' + diffLevel + ')', W >> 1, 94, UI_COL.white, 1, 1);
      drawText('RECORD: ' + highScore + 'M', W >> 1, 110, UI_COL.yellow, 1, 1);
      drawText('EQUIPO: ' + HULLS[selectedHull].name, W >> 1, 126, UI_COL.green, 1, 1);
      drawText('TECLA [T] : VEHICULOS Y HABILIDADES', W >> 1, 154, UI_COL.cyan, 1, 1);
    } else {
      drawGarageBox();
    }

    const btnCol = ((elapsedTime * 3) | 0) & 1 ? UI_COL.orange : UI_COL.rust;
    fR(60, 180, W - 120, 20, btnCol);
    ctx.strokeStyle = UI_COL.yellow;
    ctx.strokeRect(60, 180, W - 120, 20);
    drawText('JUGAR YA [ESP]', W >> 1, 188, UI_COL.white, 1, 1);
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
    } else {
      elapsedTime += dt / 60;
    }
    updateParticles(dt);

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
      if (gameState === 1) drawDrone(camY);
      drawLava(camY, biome);
      drawHUD(biome);
      if (gameState === 2) drawGameOver();
    }
    drawCRT();

    ctx.restore();
  }

  requestAnimationFrame(frame);
})();
