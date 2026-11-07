/**
 * STEAM HOPPER (Vapor Ascent)
 * Juego estilo NES en Vanilla JS (< 32 KB, Cero Assets)
 * Resolución interna: 256 x 240 px | Paso fijo: 60 FPS
 */

(() => {
  'use strict';

  // =========================================================================
  // 1. CONFIGURACIÓN Y PALETA NES (16 COLORES)
  // =========================================================================
  const W = 256;
  const H = 240;
  const DT = 1 / 60;

  // Paleta de 16 colores inspirada en NES (Óxido, Cobre, Carbón, Incandescente, Acero Frío)
  const PAL = [
    '#0d0a0b', // 0: Negro carbón profundo (Fondo pozo)
    '#1c1618', // 1: Gris hollín oscuro (Muros fondo)
    '#2e2224', // 2: Óxido sombrío (Ladrillos / Estructuras)
    '#4a3228', // 3: Marrón fundición (Vigas calientes)
    '#7a4832', // 4: Cobre envejecido (Bordes vigas / Engranajes)
    '#b56c3a', // 5: Latón industrial (Cuerpo del dron)
    '#e09f50', // 6: Latón brillante (Reflejos del dron)
    '#f4d27a', // 7: Amarillo chispa (Chispas / Alertas)
    '#8c1d18', // 8: Rojo magma oscuro (Lava profunda)
    '#d9381e', // 9: Naranja incandescente (Lava media / Peligro)
    '#ff7722', // 10: Naranja fuego brillante (Superficie lava / Purga)
    '#284b5c', // 11: Acero azulado oscuro (Viga de enfriamiento base)
    '#4789a8', // 12: Cian industrial (Viga de enfriamiento superficie)
    '#8cd4f5', // 13: Hielo / Escarcha brillante (Indicador recarga)
    '#9ea3a8', // 14: Gris vapor medio (Humo / Engranajes)
    '#f0f4f8'  // 15: Blanco humo puro (Texto / Vapor alta presión)
  ];

  // =========================================================================
  // 2. TIPOGRAFÍA EMBEBIDA (MINI-FONT BITMAP 3x5 - 15 BITS)
  // =========================================================================
  const FONT = {
    '0': 0x7B6F, '1': 0x2497, '2': 0x73E7, '3': 0x73CF, '4': 0x5BC9,
    '5': 0x79CF, '6': 0x79EF, '7': 0x7249, '8': 0x7BEF, '9': 0x7BCF,
    'A': 0x77EB, 'B': 0x73EB, 'C': 0x7247, 'D': 0x6B6E, 'E': 0x79E7,
    'F': 0x79E4, 'G': 0x726F, 'H': 0x5BEB, 'I': 0x7497, 'J': 0x126F,
    'K': 0x5AEB, 'L': 0x4927, 'M': 0x5FEB, 'N': 0x7B6B, 'O': 0x7B6F,
    'P': 0x77E4, 'Q': 0x7B7B, 'R': 0x77EA, 'S': 0x79CF, 'T': 0x7492,
    'U': 0x5B6F, 'V': 0x5B6A, 'W': 0x5B7F, 'X': 0x5AEA, 'Y': 0x5ACA,
    'Z': 0x72A7, '-': 0x01C0, ':': 0x0410, '.': 0x0002, '%': 0x4A91,
    '/': 0x1294, '!': 0x2482, '[': 0x6926, ']': 0x324B, '+': 0x05D0
  };

  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  canvas.width = W;
  canvas.height = H;
  ctx.imageSmoothingEnabled = false;

  function drawChar(char, x, y, color, scale = 1) {
    const glyph = FONT[char] || 0;
    if (!glyph) return;
    ctx.fillStyle = color;
    for (let i = 0; i < 15; i++) {
      if ((glyph >> (14 - i)) & 1) {
        ctx.fillRect(
          (x + (i % 3) * scale) | 0,
          (y + ((i / 3) | 0) * scale) | 0,
          scale,
          scale
        );
      }
    }
  }

  function drawText(str, x, y, color, scale = 1, align = 0) {
    const s = String(str).toUpperCase();
    const step = 4 * scale;
    const totalW = s.length * step - scale;
    let startX = align === 1 ? x - (totalW >> 1) : align === 2 ? x - totalW : x;
    for (let i = 0; i < s.length; i++) {
      if (s[i] !== ' ') {
        drawChar(s[i], startX + i * step, y, color, scale);
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
    // X_{n+1} = (a * X_n + c) mod m
    rngState = (1664525 * rngState + 1013904223) >>> 0;
    return rngState / 4294967296;
  }

  function lcgRange(min, max) {
    return min + lcg() * (max - min);
  }

  // =========================================================================
  // 4. MOTOR DE AUDIO PROCEDURAL (WEB AUDIO API - EMULACIÓN NES APU)
  // =========================================================================
  let audioCtx = null;
  let noiseBuf = null;
  let bgmTimer = 0;
  let bgmStep = 0;
  let steamCooldown = 0;
  let muted = false;

  // Escala menor pentatónica (La menor: A, C, D, E, G) en frecuencias Hz
  const LEAD_SEQ = [
    220, 0, 261.6, 293.7, 329.6, 0, 392.0, 329.6,
    440, 392.0, 329.6, 293.7, 261.6, 293.7, 220, 0
  ];
  const BASS_SEQ = [
    110, 110, 130.8, 130.8, 146.8, 146.8, 164.8, 130.8,
    110, 110, 98.0, 98.0, 87.3, 87.3, 98.0, 110
  ];

  function initAudio() {
    if (audioCtx) {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = new AC();
    // Búfer algorítmico generado por código en tiempo real para el ruido blanco
    const sr = audioCtx.sampleRate;
    noiseBuf = audioCtx.createBuffer(1, sr * 0.25, sr);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  // 5.3.1 Efecto de Vapor (Toberas): Ruido blanco + BiquadFilterNode bandpass 800Hz
  function sfxSteam(dual) {
    if (!audioCtx || muted) return;
    const now = audioCtx.currentTime;
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuf;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(dual ? 920 : 800, now);
    filter.Q.setValueAtTime(2.2, now);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(dual ? 0.12 : 0.08, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.09);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    src.start(now);
    src.stop(now + 0.09);
  }

  // 5.3.2 Impacto Metálico / Rebote: Senoidal 0.08s, rampa exponencial 220Hz -> 40Hz
  function sfxBounce(intensity = 1) {
    if (!audioCtx || muted) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220 * Math.min(1.4, Math.max(0.8, intensity)), now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

    gain.gain.setValueAtTime(Math.min(0.25, 0.12 * intensity), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Alarma de Purga de Emergencia / Tonos retro
  function sfxTone(freqStart, freqEnd, dur, type = 'square', vol = 0.08) {
    if (!audioCtx || muted) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + dur);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + dur);
  }

  // 5.3.3 Banda Sonora Procedural (Micro-Secuenciador de 16 pasos)
  function updateBGM() {
    if (!audioCtx || muted || gameState !== 1) return;
    bgmTimer++;
    // Tempo adaptativo según cercanía de la lava
    const stepFrames = drone.purge > 0 ? 7 : 9;
    if (bgmTimer >= stepFrames) {
      bgmTimer = 0;
      const now = audioCtx.currentTime;
      const dur = stepFrames * DT * 0.85;

      // Canal 1: Onda Cuadrada (Lead)
      const leadFreq = LEAD_SEQ[bgmStep];
      if (leadFreq > 0) {
        const osc1 = audioCtx.createOscillator();
        const g1 = audioCtx.createGain();
        osc1.type = 'square';
        // Sube una octava a partir de 200m de altura
        const octave = maxMeters >= 200 && (bgmStep % 4 === 0) ? 2 : 1;
        osc1.frequency.setValueAtTime(leadFreq * octave, now);
        g1.gain.setValueAtTime(0.032, now);
        g1.gain.exponentialRampToValueAtTime(0.001, now + dur);
        osc1.connect(g1);
        g1.connect(audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + dur);
      }

      // Canal 2: Onda Triángulo (Bajo continuo)
      const bassFreq = BASS_SEQ[bgmStep];
      if (bassFreq > 0) {
        const osc2 = audioCtx.createOscillator();
        const g2 = audioCtx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(bassFreq, now);
        g2.gain.setValueAtTime(0.06, now);
        g2.gain.exponentialRampToValueAtTime(0.002, now + dur * 0.95);
        osc2.connect(g2);
        g2.connect(audioCtx.destination);
        osc2.start(now);
        osc2.stop(now + dur);
      }

      bgmStep = (bgmStep + 1) & 15;
    }
  }

  // =========================================================================
  // 5. SISTEMA DE PARTÍCULAS (OBJECT POOL DE 64 OBJETOS PREALOJADOS)
  // =========================================================================
  // type: 0 = vapor (humo blanco), 1 = chispa metal (amarilla con gravedad), 2 = burbuja lava
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

  function updateParticles() {
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = particles[i];
      if (!p.active) continue;
      p.x += p.vx;
      p.y += p.vy;
      if (p.type === 1) {
        // Chispas con gravedad
        p.vy += 0.18;
      } else if (p.type === 0) {
        // Vapor desacelera y asciende ligeramente
        p.vx *= 0.92;
        p.vy = p.vy * 0.92 - 0.03;
      } else if (p.type === 2) {
        // Burbuja / brasa incandescente asciende
        p.vy -= 0.04;
      }
      p.life--;
      if (p.life <= 0) p.active = false;
    }
  }

  function drawParticles(camY) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = particles[i];
      if (!p.active) continue;
      const sy = (p.y - camY) | 0;
      if (sy < -8 || sy > H + 8) continue;
      const sx = p.x | 0;
      const ratio = p.life / p.maxLife;

      if (p.type === 0) {
        // Vapor (humo blanco translúcido / gris humo según vida)
        ctx.fillStyle = ratio > 0.45 ? PAL[15] : PAL[14];
        const sz = ratio > 0.6 ? p.size : Math.max(1, p.size - 1);
        ctx.fillRect(sx - (sz >> 1), sy - (sz >> 1), sz, sz);
      } else if (p.type === 1) {
        // Chispas de metal (amarillas / naranjas)
        ctx.fillStyle = ratio > 0.4 ? PAL[7] : PAL[10];
        ctx.fillRect(sx, sy, p.size, p.size);
      } else {
        // Burbujas / brasas incandescentes de lava
        ctx.fillStyle = ratio > 0.5 ? PAL[10] : PAL[9];
        ctx.fillRect(sx, sy, p.size, p.size);
      }
    }
  }

  // =========================================================================
  // 6. ESTADO DEL JUEGO, DRON Y GENERACIÓN DE CHUNKS (3 EN MEMORIA)
  // =========================================================================
  // Estados: 0 = MENU, 1 = INGAME, 2 = GAME OVER
  let gameState = 0;
  let highScore = 0;
  try {
    highScore = parseInt(localStorage.getItem('sh_hi') || '0', 10) || 0;
  } catch (_) {}

  // Parámetros cinemáticos exactos de la especificación (Sección 3.1)
  const GRAVITY_Y = 0.28;
  const DRAG = 0.985;
  const F_LEFT_X = 0.38;
  const F_LEFT_Y = -0.68;
  const F_RIGHT_X = -0.38;
  const F_RIGHT_Y = -0.68;
  const RESTITUTION = 0.55;
  const WALL_LEFT = 14;
  const WALL_RIGHT = W - 14;

  const drone = {
    x: W / 2,
    y: 180,
    vx: 0,
    vy: 0,
    r: 7,
    theta: 0,
    pressure: 100, // 0..100%
    purge: 0,      // frames restantes de purga (1.2s = 72 frames)
    cooling: false,
    grounded: false,
    leftOn: false,
    rightOn: false
  };

  let startY = 180;
  let camY = 0;
  let lavaY = 270;
  let lavaStartY = 270;
  let elapsedTime = 0;
  let currentMeters = 0;
  let maxMeters = 0;
  let screenShake = 0;
  let flashTimer = 0;

  // Arreglo circular de exactamente 3 Chunks de 240px de altura en memoria (Sección 6)
  // Cada chunk i cubre el rango vertical [ -i * 240, -(i - 1) * 240 ]
  let activeChunks = [];
  let topChunkIndex = -1;

  function getHeightMetersAtY(y) {
    return Math.max(0, Math.floor((startY - y) / 6));
  }

  function generateChunk(chunkIdx) {
    // Semilla determinista derivada del índice de chunk y la semilla global
    setSeed((seed + chunkIdx * 7919) >>> 0);

    const yBottom = H - chunkIdx * H; // ej. chunk 0: 240..0, chunk 1: 0..-240
    const yTop = yBottom - H;
    const chunkMeters = getHeightMetersAtY((yBottom + yTop) * 0.5);

    const platforms = [];
    const gears = [];
    const vents = [];

    // Muros laterales de la chimenea industrial (AABB)
    platforms.push(
      { x1: 0, y1: yTop, x2: WALL_LEFT, y2: yBottom, cool: 0, wall: true },
      { x1: WALL_RIGHT, y1: yTop, x2: W, y2: yBottom, cool: 0, wall: true }
    );

    if (chunkIdx === 0) {
      // Plataforma inicial de lanzamiento amplia y segura
      platforms.push({
        x1: 76,
        y1: 192,
        x2: 180,
        y2: 204,
        cool: 1,
        wall: false
      });
    }

    // Curva de dificultad dinámica según H (Sección 6):
    // H < 100m: Vigas estáticas amplias y distancias cortas (4 vigas por chunk)
    // 100m <= H < 300m: Escapes de vapor periódicos y engranajes pequeños
    // H >= 300m: Engranajes dobles contrarrotativos y vigas estrechas con enfriamiento reducido
    const numRows = 4;
    const rowStep = H / numRows; // 60 px entre niveles

    for (let r = 0; r < numRows; r++) {
      if (chunkIdx === 0 && r === 0) continue; // Ya pusimos la base inicial

      const py = Math.floor(yBottom - (r + 0.75) * rowStep + lcgRange(-6, 6));
      const hMeters = getHeightMetersAtY(py);

      // Ancho de la viga según dificultad
      let beamW = hMeters < 100
        ? Math.floor(lcgRange(58, 78))
        : hMeters < 300
        ? Math.floor(lcgRange(44, 62))
        : Math.floor(lcgRange(34, 48));

      // Alternar zonas izquierda/centro/derecha para exigir maniobra vectorial
      const zone = (chunkIdx * numRows + r) % 3;
      let minX = WALL_LEFT + 10;
      let maxX = WALL_RIGHT - beamW - 10;
      let px;
      if (zone === 0) {
        px = Math.floor(lcgRange(minX, minX + (maxX - minX) * 0.45));
      } else if (zone === 1) {
        px = Math.floor(lcgRange(minX + (maxX - minX) * 0.55, maxX));
      } else {
        px = Math.floor(lcgRange(minX + (maxX - minX) * 0.25, minX + (maxX - minX) * 0.75));
      }

      // Factor de recarga en cornisas frías (1.0 normal = 3%/frame; 0.65 reducido en H >= 300m)
      const coolFactor = hMeters >= 300 ? 0.65 : 1.0;

      platforms.push({
        x1: px,
        y1: py,
        x2: px + beamW,
        y2: py + 10,
        cool: coolFactor,
        wall: false
      });

      // Peldaño secundario ocasional en el lado opuesto
      if (hMeters < 220 && lcg() > 0.45) {
        const altW = Math.floor(lcgRange(32, 46));
        const altX = px + beamW * 0.5 < W * 0.5
          ? Math.floor(lcgRange(W * 0.54, WALL_RIGHT - altW - 8))
          : Math.floor(lcgRange(WALL_LEFT + 8, W * 0.46 - altW));
        const altY = py + Math.floor(lcgRange(-14, 14));
        platforms.push({
          x1: altX,
          y1: altY,
          x2: altX + altW,
          y2: altY + 9,
          cool: coolFactor,
          wall: false
        });
      }

      // Escapes de vapor periódicos (H >= 100m, o demostración suave desde 60m)
      if (hMeters >= 100 && lcg() > 0.45) {
        const leftSide = lcg() > 0.5;
        vents.push({
          x: leftSide ? WALL_LEFT : WALL_RIGHT,
          y: py - 24,
          dir: leftSide ? 1 : -1,
          period: Math.floor(lcgRange(110, 160)),
          phase: Math.floor(lcgRange(0, 120)),
          len: Math.floor(lcgRange(48, 72))
        });
      }

      // Engranajes industriales (Sección 4.2 y 6)
      if (hMeters >= 100 && hMeters < 300 && r % 2 === 1) {
        const gx = px + beamW * 0.5 < W * 0.5
          ? Math.floor(lcgRange(W * 0.58, WALL_RIGHT - 28))
          : Math.floor(lcgRange(WALL_LEFT + 28, W * 0.42));
        gears.push({
          x: gx,
          y: py - 22,
          R: Math.floor(lcgRange(13, 17)),
          angle: lcgRange(0, 6.28),
          omega: (lcg() > 0.5 ? 1 : -1) * lcgRange(0.035, 0.055),
          teeth: 10
        });
      } else if (hMeters >= 300 && r % 2 === 1) {
        // Engranajes dobles contrarrotativos (H >= 300m)
        const centerG = Math.floor(lcgRange(86, W - 86));
        const rad = 14;
        const spd = lcgRange(0.045, 0.065);
        gears.push(
          {
            x: centerG - rad - 1,
            y: py - 24,
            R: rad,
            angle: 0,
            omega: spd,
            teeth: 10
          },
          {
            x: centerG + rad + 1,
            y: py - 24,
            R: rad,
            angle: 0.31,
            omega: -spd,
            teeth: 10
          }
        );
      }
    }

    return { idx: chunkIdx, yTop, yBottom, chunkMeters, platforms, gears, vents };
  }

  function updateChunksWindow() {
    // Determinar el chunk actual según la cámara
    const centerChunkIdx = Math.max(0, Math.floor((H - (camY + H * 0.5)) / H));
    if (activeChunks.length === 0) {
      activeChunks = [
        generateChunk(0),
        generateChunk(1),
        generateChunk(2)
      ];
      topChunkIndex = 2;
      return;
    }

    // Si el jugador sube y se aproxima al chunk superior, reciclamos el inferior
    while (centerChunkIdx + 1 > topChunkIndex) {
      topChunkIndex++;
      activeChunks.shift(); // Descarta el chunk inferior consumido por la lava
      activeChunks.push(generateChunk(topChunkIndex)); // Añade el nuevo chunk superior
    }
  }

  // =========================================================================
  // 7. CONTROLES (TECLADO + PANTALLA TÁCTIL)
  // =========================================================================
  const keys = {};
  let touchLeft = false;
  let touchRight = false;
  let touchCenterTap = false;

  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyM') {
      muted = !muted;
    }
    if (e.code === 'KeyR' && gameState !== 1) {
      // Cambiar semilla en menú o game over
      setSeed(((Date.now() & 0xffff) ^ (seed * 31)) >>> 0);
    }
    if (
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space', 'Enter'].includes(e.code)
    ) {
      e.preventDefault();
    }
    initAudio();
    if ((e.code === 'Space' || e.code === 'Enter') && gameState !== 1) {
      startGame();
    }
  });

  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  function handleTouches(e) {
    e.preventDefault();
    initAudio();
    touchLeft = false;
    touchRight = false;
    const rect = canvas.getBoundingClientRect();
    for (let i = 0; i < e.touches.length; i++) {
      const tx = e.touches[i].clientX - rect.left;
      const relX = tx / rect.width;
      if ( gameState !== 1 && relX > 0.3 && relX < 0.7 ) {
        touchCenterTap = true;
      }
      if (relX < 0.5) touchLeft = true;
      else touchRight = true;
    }
    if (gameState !== 1 && (touchCenterTap || e.touches.length > 0)) {
      touchCenterTap = false;
      startGame();
    }
  }

  window.addEventListener('touchstart', handleTouches, { passive: false });
  window.addEventListener('touchmove', handleTouches, { passive: false });
  window.addEventListener('touchend', handleTouches, { passive: false });

  // =========================================================================
  // 8. INICIALIZACIÓN Y BUCLE FÍSICO (SECCIONES 3 Y 4)
  // =========================================================================
  function startGame() {
    setSeed(seed);
    drone.x = W / 2;
    drone.y = 180;
    drone.vx = 0;
    drone.vy = 0;
    drone.theta = 0;
    drone.pressure = 100;
    drone.purge = 0;
    drone.cooling = false;
    drone.grounded = false;

    startY = 180;
    camY = 0;
    lavaStartY = 268;
    lavaY = lavaStartY;
    elapsedTime = 0;
    currentMeters = 0;
    maxMeters = 0;
    screenShake = 0;
    flashTimer = 0;
    bgmStep = 0;
    bgmTimer = 0;

    for (let i = 0; i < POOL_SIZE; i++) particles[i].active = false;
    activeChunks = [];
    updateChunksWindow();

    gameState = 1;
    sfxTone(220, 440, 0.14, 'square', 0.08);
  }

  function triggerGameOver() {
    gameState = 2;
    screenShake = 14;
    if (maxMeters > highScore) {
      highScore = maxMeters;
      try {
        localStorage.setItem('sh_hi', String(highScore));
      } catch (_) {}
    }
    // Explosión de chispas y vapor al destruirse el dron
    for (let i = 0; i < 28; i++) {
      const ang = (i / 28) * Math.PI * 2;
      const spd = 1 + (i % 4) * 0.8;
      spawnParticle(
        i % 2 === 0 ? 1 : 0,
        drone.x,
        drone.y,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd - 1,
        24 + (i % 15),
        i % 3 === 0 ? 3 : 2
      );
    }
    sfxTone(180, 32, 0.45, 'sawtooth', 0.18);
  }

  function updatePhysics() {
    elapsedTime += DT;

    // Lectura de entradas (Tobera Izquierda / Tobera Derecha)
    const wantLeft = !!(keys['ArrowLeft'] || keys['KeyA'] || touchLeft);
    const wantRight = !!(keys['ArrowRight'] || keys['KeyD'] || touchRight);

    // 3.2 Dinámica de la Caldera (Termodinámica del Dron)
    if (drone.purge > 0) {
      drone.purge--;
      drone.leftOn = false;
      drone.rightOn = false;
      if (drone.purge % 4 === 0) {
        // Humo de purga de emergencia
        spawnParticle(0, drone.x + (Math.random() * 8 - 4), drone.y - 5, (Math.random() - 0.5) * 1.2, -1.4, 18, 3);
      }
      if (drone.purge === 0) {
        // Al concluir el bloqueo de 1.2s, restablece presión de reserva operativa
        drone.pressure = 35;
        sfxTone(330, 520, 0.1, 'triangle', 0.07);
      }
    } else {
      drone.leftOn = wantLeft;
      drone.rightOn = wantRight;

      const activeNozzles = (drone.leftOn ? 1 : 0) + (drone.rightOn ? 1 : 0);
      if (activeNozzles > 0) {
        // Cada frame de activación de tobera reduce la presión en 0.45%
        drone.pressure = Math.max(0, drone.pressure - 0.45 * activeNozzles);
        if (drone.pressure <= 0) {
          // Sobrecalentamiento -> Purga de Emergencia durante 1.2 segundos (72 frames)
          drone.pressure = 0;
          drone.purge = 72;
          screenShake = 6;
          sfxTone(480, 110, 0.32, 'sawtooth', 0.14);
        }
      }
    }

    // 3.1 Parámetros Cinemáticos y Empuje Vectorial
    let ax = 0;
    let ay = 0;

    if (drone.leftOn) {
      ax += F_LEFT_X;
      ay += F_LEFT_Y;
      // Partícula de vapor por tobera izquierda (expulsa abajo-izquierda)
      spawnParticle(
        0,
        drone.x - 6,
        drone.y + 3,
        -1.3 + (Math.random() - 0.5) * 0.5,
        1.6 + Math.random() * 0.6,
        14 + ((Math.random() * 8) | 0),
        3
      );
    }
    if (drone.rightOn) {
      ax += F_RIGHT_X;
      ay += F_RIGHT_Y;
      // Partícula de vapor por tobera derecha (expulsa abajo-derecha)
      spawnParticle(
        0,
        drone.x + 6,
        drone.y + 3,
        1.3 + (Math.random() - 0.5) * 0.5,
        1.6 + Math.random() * 0.6,
        14 + ((Math.random() * 8) | 0),
        3
      );
    }

    if (drone.leftOn || drone.rightOn) {
      if (steamCooldown <= 0) {
        sfxSteam(drone.leftOn && drone.rightOn);
        steamCooldown = 4;
      }
    }
    if (steamCooldown > 0) steamCooldown--;

    // Método semiexplícito de Euler (Sección 3):
    // v_{t+1} = (v_t + (g + a_empuje)) * mu
    // p_{t+1} = p_t + v_{t+1}
    drone.vx = (drone.vx + ax) * DRAG;
    drone.vy = (drone.vy + (GRAVITY_Y + ay)) * DRAG;

    drone.x += drone.vx;
    drone.y += drone.vy;

    // Inclinación angular visual: theta = v_x * 0.06 radianes
    drone.theta = drone.vx * 0.06;

    drone.cooling = false;
    drone.grounded = false;

    // 4. Detección y Respuesta a Colisiones
    for (let c = 0; c < activeChunks.length; c++) {
      const chunk = activeChunks[c];

      // 4.1 Dron (Círculo) vs. Muros/Plataformas (AABB)
      for (let i = 0; i < chunk.platforms.length; i++) {
        const p = chunk.platforms[i];
        // 1. Punto más cercano en el rectángulo:
        const xn = Math.max(p.x1, Math.min(drone.x, p.x2));
        const yn = Math.max(p.y1, Math.min(drone.y, p.y2));

        // 2. Distancia euclidiana al cuadrado:
        const dx = drone.x - xn;
        const dy = drone.y - yn;
        const d2 = dx * dx + dy * dy;

        // 3. Si d^2 < r^2, hay colisión
        if (d2 < drone.r * drone.r) {
          const d = Math.sqrt(d2) || 0.001;
          const nx = dx / d;
          const ny = dy / d;

          // Corrección posicional
          const overlap = drone.r - d;
          drone.x += nx * overlap;
          drone.y += ny * overlap;

          // Producto punto (v . n)
          const vn = drone.vx * nx + drone.vy * ny;
          if (vn < 0) {
            const impactSpeed = -vn;
            // Si aterriza suavemente sobre una cornisa fría (|vy| < 1.5) sin propulsar, estabilizar aterrizaje
            if (!p.wall && ny < -0.7 && Math.abs(drone.vy) < 1.5 && !drone.leftOn && !drone.rightOn) {
              drone.vy = 0;
              drone.vx *= 0.82;
              drone.grounded = true;
            } else {
              // Refleja velocidad con coeficiente de restitución elástico e = 0.55
              // v' = v - (1 + e)(v . n)n
              drone.vx -= (1 + RESTITUTION) * vn * nx;
              drone.vy -= (1 + RESTITUTION) * vn * ny;

              if (impactSpeed > 0.9) {
                sfxBounce(impactSpeed * 0.5);
                for (let s = 0; s < 4; s++) {
                  spawnParticle(
                    1,
                    xn,
                    yn,
                    nx * 1.2 + (Math.random() - 0.5) * 2,
                    ny * 1.2 - Math.random() * 1.5,
                    12 + s * 3,
                    2
                  );
                }
              }
            }
          }

          // 3.2.3 Zonas de Enfriamiento (Cornisas): |vy| < 1.5 recarga la presión a razón de 3% por frame
          if (!p.wall && ny < -0.65 && Math.abs(drone.vy) < 1.5) {
            drone.grounded = true;
            if (p.cool > 0 && drone.pressure < 100) {
              drone.cooling = true;
              drone.pressure = Math.min(100, drone.pressure + 3.0 * p.cool);
              if (drone.purge > 0) drone.purge = Math.max(0, drone.purge - 3);
              if ((Math.random() * 3) | 0 === 0) {
                spawnParticle(0, drone.x + (Math.random() * 10 - 5), drone.y + 5, 0, -0.6, 12, 2);
              }
            }
          }
        }
      }

      // 4.2 Dron (Círculo) vs. Engranaje Giratorio (Círculo con Impulso Tangencial)
      for (let i = 0; i < chunk.gears.length; i++) {
        const g = chunk.gears[i];
        g.angle += g.omega;

        const dx = drone.x - g.x;
        const dy = drone.y - g.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const minDist = drone.r + g.R;

        if (dist <= minDist) {
          const nx = dx / dist;
          const ny = dy / dist;
          const phi = Math.atan2(dy, dx);

          // Separar el dron del radio exterior del engranaje
          drone.x = g.x + nx * (minDist + 0.5);
          drone.y = g.y + ny * (minDist + 0.5);

          // Reflexión radial elástica + transferencia de velocidad tangencial:
          // v_tangente = omega * R * [-sin(phi), cos(phi)]
          const vn = drone.vx * nx + drone.vy * ny;
          if (vn < 0) {
            drone.vx -= (1 + RESTITUTION) * vn * nx;
            drone.vy -= (1 + RESTITUTION) * vn * ny;
          }
          const vTangX = g.omega * g.R * -Math.sin(phi) * 2.4;
          const vTangY = g.omega * g.R * Math.cos(phi) * 2.4;
          drone.vx += vTangX + nx * 0.9;
          drone.vy += vTangY + ny * 0.9;

          screenShake = 5;
          sfxBounce(1.5);
          for (let s = 0; s < 6; s++) {
            spawnParticle(
              1,
              g.x + nx * g.R,
              g.y + ny * g.R,
              (Math.random() - 0.5) * 3 + vTangX,
              (Math.random() - 0.5) * 3 + vTangY,
              15,
              2
            );
          }
        }
      }

      // Escapes de vapor periódicos (H >= 100m)
      for (let i = 0; i < chunk.vents.length; i++) {
        const v = chunk.vents[i];
        const cycle = ((elapsedTime * 60 + v.phase) | 0) % v.period;
        const active = cycle < 38;
        if (active) {
          if (cycle % 3 === 0) {
            spawnParticle(
              0,
              v.x + v.dir * 4,
              v.y + (Math.random() * 6 - 3),
              v.dir * lcgRange(2.2, 3.4),
              (Math.random() - 0.5) * 0.4,
              16,
              3
            );
          }
          // Empuje aerodinámico si el dron cruza el chorro de vapor
          const inY = Math.abs(drone.y - v.y) < 10;
          const inX = v.dir === 1
            ? drone.x > v.x && drone.x < v.x + v.len
            : drone.x < v.x && drone.x > v.x - v.len;
          if (inY && inX) {
            drone.vx += v.dir * 0.26;
            drone.vy -= 0.08;
          }
        }
      }
    }

    // Seguimiento vertical suave de la cámara (orientado al ascenso)
    const targetCamY = drone.y - H * 0.62;
    if (targetCamY < camY) {
      camY += (targetCamY - camY) * 0.14;
    } else if (targetCamY > camY + 36) {
      camY += (targetCamY - camY - 36) * 0.1;
    }

    updateChunksWindow();

    // Altura actual y récord en metros
    currentMeters = getHeightMetersAtY(drone.y);
    if (currentMeters > maxMeters) maxMeters = currentMeters;

    // 3.2.4 Marea de Lava Inferior: Y_lava(t) = Y_inicial - (v_base * t + a_lava * t^1.2)
    // Parámetros calibrados en píxeles/segundo para ascenso constante y tenso
    const vBase = 11.5;
    const aLava = 0.55;
    const formulaLavaY = lavaStartY - (vBase * elapsedTime + aLava * Math.pow(elapsedTime, 1.2));
    // Evitar que la lava quede demasiado lejos si el jugador asciende muy rápido
    lavaY = Math.min(formulaLavaY, camY + H + 42);

    // Burbujas incandescentes en la superficie de la lava
    if (((elapsedTime * 60) | 0) % 5 === 0) {
      spawnParticle(
        2,
        WALL_LEFT + 6 + Math.random() * (WALL_RIGHT - WALL_LEFT - 12),
        lavaY,
        (Math.random() - 0.5) * 0.4,
        -0.8 - Math.random() * 0.8,
        22,
        2
      );
    }

    // Destrucción térmica inmediata si Y_dron >= Y_lava
    if (drone.y + drone.r >= lavaY) {
      triggerGameOver();
    }
  }

  // =========================================================================
  // 9. MOTOR GRÁFICO PROCEDURAL (CANVAS 2D - SECCIÓN 5.1)
  // =========================================================================
  function drawBackground(camY) {
    ctx.fillStyle = PAL[0];
    ctx.fillRect(0, 0, W, H);

    // Patrón de mampostería y tuberías del pozo en parallax
    const parallaxY = (camY * 0.4) | 0;
    const brickH = 16;
    const startRow = Math.floor(parallaxY / brickH);

    for (let r = startRow; r < startRow + 17; r++) {
      const sy = r * brickH - parallaxY;
      ctx.fillStyle = PAL[1];
      ctx.fillRect(WALL_LEFT, sy, WALL_RIGHT - WALL_LEFT, 1);

      const offset = (r & 1) * 16;
      for (let bx = WALL_LEFT + offset; bx < WALL_RIGHT; bx += 32) {
        ctx.fillRect(bx, sy, 1, brickH);
      }

      // Vigas transversales de fondo cada 5 hileras
      if (r % 5 === 0) {
        ctx.fillStyle = PAL[2];
        ctx.fillRect(WALL_LEFT, sy + 2, WALL_RIGHT - WALL_LEFT, 4);
      }
    }
  }

  function drawGear(g, camY) {
    const sy = g.y - camY;
    if (sy < -g.R - 8 || sy > H + g.R + 8) return;

    // 5.1 Engranajes Industriales: funciones trigonométricas paramétricas
    // r(i) = R si i mod 2 == 0, R - h_diente si i mod 2 == 1
    const steps = g.teeth * 2;
    const hTooth = 4;

    ctx.save();
    ctx.translate(g.x, sy);
    ctx.rotate(g.angle);

    ctx.beginPath();
    for (let i = 0; i < steps; i++) {
      const a1 = (i / steps) * Math.PI * 2;
      const a2 = ((i + 0.85) / steps) * Math.PI * 2;
      const rad = i % 2 === 0 ? g.R : g.R - hTooth;
      ctx.lineTo(Math.cos(a1) * rad, Math.sin(a1) * rad);
      ctx.lineTo(Math.cos(a2) * rad, Math.sin(a2) * rad);
    }
    ctx.closePath();
    ctx.fillStyle = PAL[4];
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = PAL[6];
    ctx.stroke();

    // Anillo interior y eje central
    ctx.beginPath();
    ctx.arc(0, 0, g.R - 6, 0, Math.PI * 2);
    ctx.fillStyle = PAL[2];
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = PAL[14];
    ctx.fill();

    ctx.restore();
  }

  function drawWorld(camY) {
    for (let c = 0; c < activeChunks.length; c++) {
      const chunk = activeChunks[c];

      // Dibujar plataformas y muros laterales
      for (let i = 0; i < chunk.platforms.length; i++) {
        const p = chunk.platforms[i];
        const sy1 = (p.y1 - camY) | 0;
        const sy2 = (p.y2 - camY) | 0;
        if (sy2 < 0 || sy1 > H) continue;
        const pw = p.x2 - p.x1;
        const ph = Math.max(1, sy2 - sy1);

        if (p.wall) {
          // Muros de contención laterales con remaches
          ctx.fillStyle = PAL[2];
          ctx.fillRect(p.x1, sy1, pw, ph);
          ctx.fillStyle = PAL[4];
          const edgeX = p.x1 === 0 ? pw - 2 : p.x1;
          ctx.fillRect(edgeX, sy1, 2, ph);
          for (let ry = sy1; ry < sy2; ry += 12) {
            ctx.fillStyle = PAL[5];
            ctx.fillRect(p.x1 === 0 ? pw - 5 : p.x1 + 3, ry + 4, 2, 2);
          }
        } else {
          // Viga / Cornisa de enfriamiento
          ctx.fillStyle = p.cool > 0 ? PAL[11] : PAL[3];
          ctx.fillRect(p.x1, sy1, pw, ph);

          // Superficie superior refrigerante (azul cian / escarcha)
          ctx.fillStyle = p.cool >= 1 ? PAL[12] : PAL[4];
          ctx.fillRect(p.x1, sy1, pw, 3);

          // Brillo escarcha en cornisas de enfriamiento
          if (p.cool > 0) {
            ctx.fillStyle = PAL[13];
            for (let rx = p.x1 + 3; rx < p.x2 - 4; rx += 8) {
              ctx.fillRect(rx, sy1, 4, 1);
            }
          }

          // Remaches industriales
          ctx.fillStyle = PAL[0];
          ctx.fillRect(p.x1 + 2, sy1 + 5, 2, 2);
          ctx.fillRect(p.x2 - 4, sy1 + 5, 2, 2);
        }
      }

      // Dibujar escapes de vapor periódicos
      for (let i = 0; i < chunk.vents.length; i++) {
        const v = chunk.vents[i];
        const sy = (v.y - camY) | 0;
        if (sy < -10 || sy > H + 10) continue;
        ctx.fillStyle = PAL[5];
        const vx = v.dir === 1 ? v.x - 2 : v.x - 4;
        ctx.fillRect(vx, sy - 4, 6, 8);
        const cycle = ((elapsedTime * 60 + v.phase) | 0) % v.period;
        if (cycle > v.period - 30 || cycle < 38) {
          // Luz de advertencia antes y durante la expulsión
          ctx.fillStyle = cycle < 38 ? PAL[10] : PAL[7];
          ctx.fillRect(v.dir === 1 ? v.x : v.x - 2, sy - 1, 2, 2);
        }
      }

      // Dibujar engranajes
      for (let i = 0; i < chunk.gears.length; i++) {
        drawGear(chunk.gears[i], camY);
      }
    }
  }

  function drawDrone(camY) {
    const sx = drone.x;
    const sy = drone.y - camY;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(drone.theta);

    // Toberas laterales conctx.fillRect() (Sección 5.1)
    ctx.fillStyle = drone.leftOn ? PAL[10] : PAL[4];
    ctx.fillRect(-drone.r - 3, -1, 4, 6);
    ctx.fillStyle = drone.rightOn ? PAL[10] : PAL[4];
    ctx.fillRect(drone.r - 1, -1, 4, 6);

    // Llamarada / chorro corto en la boca de la tobera activa
    if (drone.leftOn) {
      ctx.fillStyle = PAL[15];
      ctx.fillRect(-drone.r - 3, 5, 3, 3);
    }
    if (drone.rightOn) {
      ctx.fillStyle = PAL[15];
      ctx.fillRect(drone.r, 5, 3, 3);
    }

    // Cúpula de latón mediante ctx.arc() (Sección 5.1)
    ctx.beginPath();
    ctx.arc(0, 0, drone.r, 0, Math.PI * 2);
    ctx.fillStyle = drone.purge > 0
      ? ((drone.purge >> 2) & 1 ? PAL[9] : PAL[5])
      : drone.cooling
      ? PAL[12]
      : PAL[5];
    ctx.fill();

    // Reflejo superior de la cúpula de latón
    ctx.beginPath();
    ctx.arc(-2, -2, drone.r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = drone.cooling ? PAL[13] : PAL[6];
    ctx.fill();

    // Remache superior (válvula de caldera)
    ctx.fillStyle = PAL[4];
    ctx.fillRect(-2, -drone.r - 2, 4, 2);

    // Ojo central cuya pupila se desplaza proporcionalmente a (vx, vy)
    ctx.beginPath();
    ctx.arc(0, 0, 3.6, 0, Math.PI * 2);
    ctx.fillStyle = PAL[0];
    ctx.fill();

    const px = Math.max(-1.8, Math.min(1.8, drone.vx * 0.45));
    const py = Math.max(-1.8, Math.min(1.8, drone.vy * 0.45));
    ctx.fillStyle = drone.purge > 0 ? PAL[10] : drone.cooling ? PAL[13] : PAL[7];
    ctx.fillRect((px - 1) | 0, (py - 1) | 0, 2, 2);

    ctx.restore();
  }

  function drawLava(camY) {
    const sy = (lavaY - camY) | 0;
    if (sy > H) {
      // Indicador térmico inferior de cercanía de la marea de lava
      const dist = Math.max(0, Math.floor((lavaY - drone.y) / 6));
      if (dist < 25) {
        ctx.fillStyle = (elapsedTime * 10) & 1 ? PAL[9] : PAL[10];
        ctx.fillRect(WALL_LEFT, H - 3, WALL_RIGHT - WALL_LEFT, 3);
      }
      return;
    }

    const topY = Math.max(0, sy);
    // Cuerpo de metal fundido
    ctx.fillStyle = PAL[8];
    ctx.fillRect(0, topY, W, H - topY);

    ctx.fillStyle = PAL[9];
    ctx.fillRect(0, topY, W, Math.min(10, H - topY));

    // Olas incandescentes superficiales
    ctx.fillStyle = PAL[10];
    for (let x = 0; x < W; x += 8) {
      const wave = Math.sin(elapsedTime * 6 + x * 0.2) * 2;
      ctx.fillRect(x, (topY + wave) | 0, 6, 3);
    }
    ctx.fillStyle = PAL[7];
    for (let x = 2; x < W; x += 16) {
      const wave = Math.cos(elapsedTime * 8 + x * 0.3) * 1.5;
      ctx.fillRect(x, (topY + wave) | 0, 4, 1);
    }
  }

  function drawHUD() {
    // Panel superior estilo NES
    ctx.fillStyle = PAL[0];
    ctx.fillRect(0, 0, W, 22);
    ctx.fillStyle = PAL[4];
    ctx.fillRect(0, 21, W, 1);

    // Barra de Presión de Vapor (P)
    drawText('PRESION', 8, 4, PAL[15], 1);
    ctx.fillStyle = PAL[2];
    ctx.fillRect(8, 11, 76, 7);

    const pWidth = Math.floor((drone.pressure / 100) * 74);
    let barColor = PAL[12];
    if (drone.purge > 0) {
      barColor = (drone.purge >> 2) & 1 ? PAL[9] : PAL[10];
    } else if (drone.cooling) {
      barColor = PAL[13];
    } else if (drone.pressure < 28) {
      barColor = PAL[10];
    } else if (drone.pressure < 55) {
      barColor = PAL[7];
    }
    ctx.fillStyle = barColor;
    ctx.fillRect(9, 12, pWidth, 5);

    if (drone.purge > 0) {
      drawText('PURGA!', 88, 12, PAL[10], 1);
    } else if (drone.cooling) {
      drawText('+FRIO', 88, 12, PAL[13], 1);
    } else {
      drawText((drone.pressure | 0) + '%', 88, 12, PAL[14], 1);
    }

    // Altitud actual y Récord
    drawText('ALT:' + maxMeters + 'M', 168, 4, PAL[7], 1);
    drawText('TOP:' + Math.max(highScore, maxMeters) + 'M', 168, 12, PAL[14], 1);

    // Alerta de marea de lava cercana
    const lavaDistM = Math.max(0, Math.floor((lavaY - drone.y) / 6));
    if (lavaDistM < 18 && ((elapsedTime * 8) | 0) % 2 === 0) {
      drawText('!LAVA A ' + lavaDistM + 'M!', W >> 1, 26, PAL[10], 1, 1);
    }
  }

  function drawMenu() {
    drawBackground(elapsedTime * -18);

    // Marco industrial estilo cartucho NES
    ctx.fillStyle = PAL[0];
    ctx.fillRect(22, 24, W - 44, H - 48);
    ctx.strokeStyle = PAL[5];
    ctx.lineWidth = 2;
    ctx.strokeRect(23, 25, W - 46, H - 50);

    drawText('STEAM HOPPER', W >> 1, 38, PAL[6], 3, 1);
    drawText('VAPOR ASCENT - NES EDITION', W >> 1, 58, PAL[12], 1, 1);

    // Dron de demostración animado en el menú
    drone.x = W >> 1;
    drone.y = 92 + Math.sin(elapsedTime * 4) * 5;
    drone.vx = Math.cos(elapsedTime * 2) * 2;
    drone.vy = Math.sin(elapsedTime * 4) * 0.8;
    drone.theta = drone.vx * 0.06;
    drone.leftOn = Math.sin(elapsedTime * 4) < 0;
    drone.rightOn = Math.sin(elapsedTime * 4) < 0.2;
    drawDrone(0);

    drawText('[A / IZQ] TOBERA IZQUIERDA', W >> 1, 118, PAL[15], 1, 1);
    drawText('[D / DER] TOBERA DERECHA', W >> 1, 128, PAL[15], 1, 1);
    drawText('[AMBAS] ASCENSO VERTICAL', W >> 1, 138, PAL[7], 1, 1);
    drawText('POSATE EN VIGAS AZULES PARA ENFRIAR', W >> 1, 152, PAL[13], 1, 1);

    drawText('SEMILLA:' + seed + ' [R CAMBIAR]', W >> 1, 168, PAL[14], 1, 1);
    drawText('RECORD:' + highScore + 'M', W >> 1, 180, PAL[6], 1, 1);

    if (((elapsedTime * 3) | 0) % 2 === 0) {
      drawText('PULSA ESPACIO O TOCA PARA INICIAR', W >> 1, 198, PAL[10], 1, 1);
    }
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(13, 10, 11, 0.78)';
    ctx.fillRect(28, 52, W - 56, 136);
    ctx.strokeStyle = PAL[9];
    ctx.lineWidth = 2;
    ctx.strokeRect(29, 53, W - 58, 134);

    drawText('DESTRUCCION TERMICA', W >> 1, 68, PAL[10], 2, 1);
    drawText('ALTURA ALCANZADA: ' + maxMeters + 'M', W >> 1, 96, PAL[15], 1, 1);
    drawText('RECORD MAXIMO: ' + highScore + 'M', W >> 1, 110, PAL[7], 1, 1);
    drawText('SEMILLA: ' + seed + ' [R NUEVA]', W >> 1, 126, PAL[12], 1, 1);

    if (((elapsedTime * 3) | 0) % 2 === 0) {
      drawText('ESPACIO / ENTER PARA REINTENTAR', W >> 1, 156, PAL[15], 1, 1);
    }
  }

  // =========================================================================
  // 10. BUCLE PRINCIPAL DE TIEMPO FIJO (dt = 1/60s)
  // =========================================================================
  let lastTime = performance.now();
  let accumulator = 0;

  function frame(now) {
    const delta = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;
    accumulator += delta;

    while (accumulator >= DT) {
      if (gameState === 1) {
        updatePhysics();
        updateBGM();
      } else {
        elapsedTime += DT;
      }
      updateParticles();
      if (screenShake > 0) screenShake--;
      if (flashTimer > 0) flashTimer--;
      accumulator -= DT;
    }

    // Renderizado
    ctx.save();
    if (screenShake > 0) {
      const sx = ((Math.random() - 0.5) * screenShake) | 0;
      const sy = ((Math.random() - 0.5) * screenShake) | 0;
      ctx.translate(sx, sy);
    }

    if (gameState === 0) {
      drawMenu();
    } else {
      drawBackground(camY);
      drawWorld(camY);
      drawParticles(camY);
      if (gameState === 1) {
        drawDrone(camY);
      }
      drawLava(camY);
      drawHUD();
      if (gameState === 2) {
        drawGameOver();
      }
    }

    ctx.restore();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
