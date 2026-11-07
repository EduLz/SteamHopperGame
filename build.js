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

  // 3. Mangle seguro de identificadores y propiedades internas del ámbito IIFE
  const idMap = {
    MIN_FRAME_DELTA: '_M',
    WALL_LEFT: '_L',
    WALL_RIGHT: '_R',
    RAW_FONT: '_F',
    GLYPH_RUNS: '_Y',
    HERO_LEAD_B: '_HB',
    HERO_LEAD: '_HL',
    BASS_ROOTS: '_BR',
    CHORD_ARPS: '_CA',
    MAX_VY_DOWN: '_VD',
    MAX_VY_UP: '_VU',
    MAX_VX: '_VX',
    RESTITUTION: '_RS',
    POOL_SIZE: '_PS',
    UI_COL: '_U',
    BIOMES: '_B',
    CHASSIS: '_C',
    BOSS_ALTS: '_BA',
    resolveCircleAABB: '_rA',
    updateChunksWindow: '_uW',
    getHeightMetersAtY: '_gH',
    getDiffAtMeters: '_gD',
    isChassisUnlocked: '_iU',
    triggerVentSlam: '_tV',
    triggerGameOver: '_tO',
    playGateWarning: '_pW',
    updateParticles: '_uP',
    spawnParticle: '_sP',
    drawParticles: '_dP',
    drawBackground: '_dB',
    updatePhysics: '_uF',
    generateChunk: '_gC',
    scheduleNote: '_sN',
    handleTouches: '_hT',
    applyDamage: '_aD',
    getBiomeIndex: '_gB',
    levelBannerTimer: '_lT',
    selectedChassis: '_sC',
    totalCoresSaved: '_tS',
    nextSurgeMeters: '_nM',
    topChunkIndex: '_tI',
    currentMeters: '_cM',
    steamCooldown: '_sD',
    lastFrameTime: '_lF',
    activeChunks: '_aK',
    nextNoteTime: '_nT',
    elapsedTime: '_eT',
    screenShake: '_sH',
    damageFlash: '_dF',
    deathReason: '_dR',
    bannerText: '_bT',
    surgeTimer: '_sT',
    currentFps: '_cF',
    highScore: '_hS',
    diffLevel: '_dL',
    gameState: '_gS',
    maxMeters: '_mM',
    overdrive: '_ov',
    comboCores: '_cC',
    slamWaveR: '_wR',
    slamWaveX: '_wX',
    slamWaveY: '_wY',
    pressure: '_ps',
    grounded: '_gn',
    cooling: '_cl',
    leftOn: '_lO',
    rightOn: '_rO',
    platforms: '_pl',
    particles: '_pt',
    drone: '_d',
    chunk: '_k',
    biome: '_b',
    audioCtx: '_aC',
    noiseBuf: '_nB',
    drawText: '_dT',
    lcgRange: '_lR',
    sfxTone: '_sTn',
    sfxBounce: '_sB',
    sfxSteam: '_sS',
    initAudio: '_iA',
    startGame: '_sG',
    updateBGM: '_uB',
    drawWorld: '_dW',
    drawDrone: '_dD',
    drawLava: '_dLv',
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
    centerChunkIdx: '_cI',
    coolFactor: '_cf',
    moveSpeed: '_mS',
    barrierLen: '_bL',
    gapCenter: '_gC2',
    activeNozzles: '_aN',
    boostMult: '_bM',
    dragFactor: '_df',
    targetCamY: '_tY',
    baseLavaStep: '_bS',
    maxLavaLag: '_mL',
    parallaxY: '_pY',
    startRow: '_sR',
    spawnBoss: '_sBs',
    damageBoss: '_dBs',
    updateBoss: '_uBs',
    drawBoss: '_dBw',
    drawGhost: '_dGh',
    drawCRT: '_dCt',
    triggerGraze: '_tGz',
    bestGhost: '_bGh',
    curGhost: '_cGh',
    ghostSampleTimer: '_gST',
    biomeStage: '_bSt',
    nextBossIdx: '_nBI',
    nextBossMeters: '_nBM',
    chromaTimer: '_chT',
    crtEnabled: '_cEn',
    phaseTimer: '_pTm',
    actionState: '_aSt',
    coreTimer: '_cTm',
    hitFlash: '_hFl',
    bossName: '_bNm',
    bossAmmo: '_bAm',
    grazeCd: '_gCd',
    isFragile: '_iFg',
    hasSpring: '_hSp',
    crumble: '_crm',
    fragile: '_frg',
    boss: '_bs',
    // Propiedades internas y variables locales adicionales
    lavaDeep: '_ld',
    lavaMid: '_lm',
    lavaTop: '_lt',
    steelDark: '_sd',
    redDark: '_rd',
    bodyCol: '_bc',
    hiCol: '_hc',
    dmgMult: '_dm',
    maxPsi: '_mp',
    fromLeft: '_fl',
    curLen: '_cL',
    maxLen: '_mLn',
    period: '_pd',
    phase: '_ph',
    maxLife: '_mLf',
    bounces: '_bn',
    broken: '_bk',
    barrier: '_br',
    maxHp: '_mh',
    invuln: '_iv',
    purge: '_pg',
    yellow: '_yl',
    orange: '_or',
    copper: '_cp',
    purple: '_pp',
    spark: '_sp',
    chunkIdx: '_ci',
    yBottom: '_yb',
    hMeters: '_hm',
    rowStep: '_rs',
    numRows: '_nr',
    impactSpeed: '_is',
    platformVx: '_pv',
    energyLoss: '_el',
    actualHpLoss: '_ah',
    isSectionB: '_sb',
    rootMidi: '_rm',
    bassMidi: '_bm',
    leadMidi: '_lm2',
    arpMidi: '_am',
    stepDur: '_sd2',
    startX: '_sx',
    totalW: '_tw',
    rngState: '_rS',
    poolIdx: '_pI',
    fpsTimer: '_fT',
    fpsFrames: '_fF',
    elapsed: '_el2',
    distBoss: '_dB2',
    targetBaseY: '_tB',
    minDist: '_mD',
    vTangX: '_vX',
    vTangY: '_vY',
    shakeX: '_sX',
    barColor: '_bC',
    pWidth: '_pW2',
    lavaDistM: '_lD',
    edgeCol: '_eC',
    dragPow: '_dP2',
    setSeed: '_sSd',
    seqStep: '_sqS',
    startY: '_stY',
    lavaY: '_lvY',
    camY: '_cmY',
    shots: '_sh',
    gates: '_gt',
    gears: '_gr',
    cores: '_cr',
    vents: '_vn',
    spring: '_spg',
    taken: '_tk',
    omega: '_om',
    theta: '_th',
    wall: '_wl',
    cool: '_cl2',
    brick: '_brk',
    trim: '_trm',
    baseY: '_bY',
    grav: '_gv',
    stun: '_stn',
    gold: '_gld',
    brass: '_brs',
    rust: '_rst',
    cyan: '_cyn',
    white: '_wht',
    black: '_blk',
    gray: '_gry',
    green: '_grn',
    wantLeft: '_wL',
    wantRight: '_wR2',
    topChunk: '_tC',
    rawGhost: '_rG',
    intensity: '_in',
    fltType: '_fTp',
    maxExt: '_mE',
    leftSide: '_lS',
    beamW: '_bW',
    isWall: '_iW',
    dShot: '_dS',
    maxUp: '_mU',
    newDiff: '_nD',
    brickH: '_bH',
    offset: '_of',
    teeth: '_tt',
    pulse: '_pl2',
    mxMid: '_mM2',
    active: '_ac',
    angle: '_ag',
    runs: '_rn',
    scale: '_sc',
    align: '_al',
    startC: '_sC2',
    mask: '_mk',
    ratio: '_rt',
    steps: '_st',
    patrol: '_pt2',
    cycle: '_cy',
    muted: '_mt',
    color: '_cl3'
  };

  let mangled = tokenized;
  for (const [longName, shortName] of Object.entries(idMap)) {
    mangled = mangled.replace(new RegExp(`\\b${longName}\\b`, 'g'), shortName);
  }

  // Reemplazar const por let para ahorrar 2 bytes por declaración
  mangled = mangled.replace(/\bconst\b/g, 'let');

  // 4. Limpiar espacios y saltos de línea redundantes
  let compacted = mangled
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n')
    .replace(/[ \t]*([=+\-*/%&|^<>!?:;,{}()[\]])[ \t]*/g, '$1')
    .replace(/([;{},:])\n/g, '$1');

  while (/\blet ([^;{}\n]+);let /.test(compacted)) {
    compacted = compacted.replace(/\blet ([^;{}\n]+);let /g, 'let $1,');
  }

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
