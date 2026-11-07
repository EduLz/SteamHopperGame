const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'src', 'main.js');
const distDir = path.join(__dirname, 'dist');
const distHtmlPath = path.join(distDir, 'index.html');
const rootHtmlPath = path.join(__dirname, 'index.html');

const rawJs = fs.readFileSync(srcPath, 'utf8');

function minifyJS(code) {
  const strings = [];
  // 1. Eliminar comentarios de bloque y de línea antes de extraer strings
  const noComments = code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\s+\/\/.*$/gm, '');

  // 2. Proteger literales de cadena
  const tokenized = noComments.replace(/'[^']*'/g, (match) => {
    const id = `__STR_${strings.length}__`;
    strings.push(match);
    return id;
  });

  // 3. Mangle seguro de identificadores internos largos del ámbito IIFE
  const idMap = {
    MIN_FRAME_DELTA: '_MFD',
    WALL_LEFT: '_WL',
    WALL_RIGHT: '_WR',
    RAW_FONT: '_RF',
    GLYPH_RUNS: '_GR',
    HERO_LEAD_B: '_HLB',
    HERO_LEAD: '_HL',
    BASS_ROOTS: '_BR',
    CHORD_ARPS: '_CA',
    MAX_VY_DOWN: '_MVD',
    MAX_VY_UP: '_MVU',
    MAX_VX: '_MVX',
    RESTITUTION: '_RST',
    POOL_SIZE: '_PS',
    UI_COL: '_UC',
    BIOMES: '_BM',
    CHASSIS: '_CH',
    resolveCircleAABB: '_rCA',
    updateChunksWindow: '_uCW',
    getHeightMetersAtY: '_gHM',
    getDiffAtMeters: '_gDM',
    isChassisUnlocked: '_iCU',
    triggerVentSlam: '_tVS',
    triggerGameOver: '_tGO',
    playGateWarning: '_pGW',
    updateParticles: '_uPt',
    spawnParticle: '_sPt',
    drawParticles: '_dPt',
    drawBackground: '_dBg',
    updatePhysics: '_uPh',
    generateChunk: '_gCk',
    scheduleNote: '_sNt',
    handleTouches: '_hTc',
    applyDamage: '_aDm',
    getBiomeIndex: '_gBI',
    levelBannerTimer: '_lBT',
    selectedChassis: '_sCh',
    totalCoresSaved: '_tCS',
    nextSurgeMeters: '_nSM',
    topChunkIndex: '_tCI',
    currentMeters: '_cMt',
    steamCooldown: '_sCd',
    lastFrameTime: '_lFT',
    activeChunks: '_aCk',
    nextNoteTime: '_nNT',
    elapsedTime: '_eTm',
    screenShake: '_sSh',
    damageFlash: '_dFl',
    deathReason: '_dRs',
    bannerText: '_bTx',
    surgeTimer: '_sTm',
    currentFps: '_cFp',
    highScore: '_hSc',
    diffLevel: '_dLv',
    gameState: '_gSt',
    maxMeters: '_mMt',
    overdrive: '_ovd',
    comboCores: '_cCr',
    slamWaveR: '_sWR',
    slamWaveX: '_sWX',
    slamWaveY: '_sWY',
    pressure: '_psi',
    grounded: '_gnd',
    cooling: '_clg',
    RightOn: '_rOn',
    leftOn: '_lOn',
    rightOn: '_rOn',
    platforms: '_plts',
    particles: '_ptcs',
    drone: '_d',
    chunk: '_k',
    biome: '_b',
    audioCtx: '_aC',
    noiseBuf: '_nB',
    drawText: '_dT',
    lcgRange: '_lR',
    sfxTone: '_sT',
    sfxBounce: '_sB',
    sfxSteam: '_sS',
    initAudio: '_iA',
    startGame: '_sG',
    updateBGM: '_uB',
    drawWorld: '_dW',
    drawDrone: '_dD',
    drawLava: '_dL',
    drawHUD: '_dH',
    drawMenu: '_dM',
    drawGameOver: '_dG',
    drawGear: '_dGr',
    drawCore: '_dCr',
    playOsc: '_pO',
    playNoise: '_pN',
    firstPress: '_fP',
    touchLeft: '_tL',
    touchRight: '_tR',
    closedRatio: '_cR',
    centerChunkIdx: '_cCI',
    coolFactor: '_cF',
    moveSpeed: '_mSp',
    barrierLen: '_bLn',
    gapCenter: '_gCt',
    activeNozzles: '_aNz',
    boostMult: '_bMl',
    dragFactor: '_dFc',
    targetCamY: '_tCY',
    baseLavaStep: '_bLS',
    maxLavaLag: '_mLL',
    parallaxY: '_pY',
    startRow: '_sRw'
  };

  let mangled = tokenized;
  for (const [longName, shortName] of Object.entries(idMap)) {
    mangled = mangled.replace(new RegExp(`\\b${longName}\\b`, 'g'), shortName);
  }

  // 4. Limpiar espacios y saltos de línea redundantes
  const compacted = mangled
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n')
    .replace(/[ \t]*([=+\-*/%&|^<>!?:;,{}()[\]])[ \t]*/g, '$1')
    .replace(/([;{},:])\n/g, '$1');

  // 5. Restaurar cadenas originales intactas
  return compacted.replace(/__STR_(\d+)__/g, (_, idx) => strings[Number(idx)]);
}

const minJs = minifyJS(rawJs);

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.writeFileSync(path.join(distDir, 'game.min.js'), minJs, 'utf8');

const htmlContent = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><title>Steam Hopper (Vapor Ascent) - High-Octane Edition</title><style>*{box-sizing:border-box;margin:0;padding:0;user-select:none;-webkit-user-select:none}html,body{width:100%;height:100%;background:#070506;display:flex;align-items:center;justify-content:center;overflow:hidden;touch-action:none}#c{width:min(100vw,calc(100vh * (256 / 240)));height:min(100vh,calc(100vw * (240 / 256)));image-rendering:pixelated;image-rendering:crisp-edges;border:3px solid #4a3228;box-shadow:0 0 32px rgba(255,119,34,0.2)}</style></head><body><canvas id="c"></canvas><script>${minJs}</script></body></html>`;

fs.writeFileSync(distHtmlPath, htmlContent, 'utf8');
fs.writeFileSync(rootHtmlPath, htmlContent, 'utf8');

const bytes = Buffer.byteLength(htmlContent, 'utf8');
const kb = (bytes / 1024).toFixed(2);
const limit = 32768;

console.log('====================================================');
console.log(' STEAM HOPPER - BUILD COMPLETADO');
console.log('====================================================');
console.log(` Archivo raíz : index.html`);
console.log(` Archivo dist : dist/index.html`);
console.log(` Peso exacto  : ${bytes} bytes (${kb} KB / 32.00 KB)`);
console.log(` Margen libre : ${limit - bytes} bytes (${((limit - bytes) / 1024).toFixed(2)} KB)`);
console.log('====================================================');

if (bytes > limit) {
  console.error('ERROR: El archivo supera el límite de 32 KB (32,768 bytes)!');
  process.exit(1);
}
