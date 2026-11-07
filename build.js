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
    color: '_cl3',
    SLAM_MAX_CD: '_SC',
    THRUST_X: '_TX',
    THRUST_Y: '_TY',
    GRAVITY: '_GV',
    slamCd: '_sCd',
    slamReady: '_sRy',
    slamRatio: '_sRt',
    nextAlertY: '_nAY',
    HULLS: '_HL2',
    SKILLS: '_SK',
    FONT_CHARS: '_FC',
    FONT_B36: '_FB',
    DIFF_STEP: '_DS',
    drawToothed: '_dTt',
    drawGarageBox: '_dGb',
    triggerActiveSkill: '_tAS',
    isHullUnlocked: '_iHU',
    isSkillUnlocked: '_iSU',
    bossUnlockMask: '_bUM',
    selectedHull: '_sHl',
    selectedSkill: '_sSk',
    playerShots: '_pSh',
    bossBuffs: '_bBf',
    menuTab: '_mTb',
    arenaY: '_aY',
    shield: '_shd',
    platTop: '_pTp',
    gearCol: '_gCl',
    gearRim: '_gRm',
    buffText: '_bfT',
    grazeBonus: '_gBn',
    psiUse: '_pUs',
    dmgFactor: '_dFc',
    rechargeBoost: '_rBs',
    ecoFactor: '_eFc',
    airRegen: '_aRg',
    hitByShot: '_hBS',
    plat: '_plt',
    rOut: '_rO2',
    rIn: '_rI',
    fillCol: '_fC',
    strokeCol: '_sCl',
    cand: '_cd',
    nextSk: '_nSk',
    unl: '_ul',
    sel: '_sl',
    btnCol: '_btC',
    bsy: '_bY2',
    minM: '_mnM',
    maxM: '_mxM',
    lCol: '_lCl',
    topY: '_tpY',
    rect: '_rc',
    relX: '_rlX',
    relY: '_rlY',
    spd: '_sp2',
    ang: '_an',
    rad: '_rd2',
    minW: '_mnW',
    maxW: '_mxW',
    minX: '_mnX',
    maxX: '_mxX',
    slot: '_slt',
    bType: '_bTp',
    hull: '_hl',
    cost: '_cst',
    desc: '_dsc',
    req: '_rq',
    body: '_bd',
    bIdx: '_bIx',
    core: '_cr2',
    size: '_sz2',
    sy1: '_y1',
    sy2: '_y2',
    px1: '_x1',
    mkBiome: '_mB',
    getMaxSlamCd: '_gSC',
    breakShield: '_bSh',
    enrage: '_enr',
    pat: '_pt3',
    maxCd: '_mCd',
    defeatedCount: '_dCt2',
    hsl: '_hs',
    fArc: '_fA',
    PI2: '_P2',
    lcg: '_lc',
    idx: '_ix',
    red: '_rd3',
    ice: '_ic',
    dark: '_dk',
    step: '_st2',
    bar: '_br2',
    sub: '_sb2',
    osc: '_os',
    src: '_sr2',
    flt: '_fl2',
    dur: '_dr',
    freq: '_fq',
    dist: '_ds',
    phi: '_ph2',
    col: '_cl4',
    str: '_st3',
    m2f: '_mf',
    h1: '_h1',
    h2: '_h2',
    ctx: '_cx',
    canvas: '_cv',
    keys: '_ks',
    seed: '_sd3',
    DRAG: '_DG',
    hpLoss: '_hL',
    reason: '_rsn',
    dmg: '_dm2',
    hi: '_hi2',
    hp: '_hp'
  };

  // Asignar automáticamente los nombres más cortos posibles (1 y 2 caracteres) según frecuencia de aparición
  const keysList = Object.keys(idMap);
  const freqMap = {};
  for (const k of keysList) {
    const matches = tokenized.match(new RegExp(`\\b${k}\\b`, 'g'));
    freqMap[k] = matches ? matches.length : 0;
  }
  keysList.sort((a, b) => freqMap[b] - freqMap[a]);

  // Generar pool seguro de identificadores cortos (1 char libre y 2 chars)
  const usedSingle = new Set(['W', 'H', 'M', 'G', 'R', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'y']);
  const shortPool = [];
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz$_';
  const alnum = alpha + '0123456789';
  for (const ch of alpha) {
    if (!usedSingle.has(ch)) shortPool.push(ch);
  }
  for (const c1 of '_$ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz') {
    for (const c2 of alnum) {
      const cand = c1 + c2;
      if (!['if', 'in', 'do', 'fl', 'rn', 'mx', 'mn', 'sn', 'cs', 'PI', 'fR', 'AC', 'sr', 'dt', 'tx', 'ty', 'vx', 'vy', 'ax', 'ay', 'dx', 'dy', 'nx', 'ny', 'vn', 'd2', 'x1', 'y1', 'x2', 'y2', 'gx', 'gy', 'sy', 'sx', 'pw', 'ph', 'gw', 'bx', 'by', 'bw', 'px', 'py', 'sz', 'lv', 'sk', 'ps', 'ch', 'a1', 'a2', 'f0', 'f1', 'v0'].includes(cand)) {
        shortPool.push(cand);
      }
    }
  }

  let mangled = tokenized;
  for (let i = 0; i < keysList.length; i++) {
    const longName = keysList[i];
    const shortName = shortPool[i];
    mangled = mangled.replace(new RegExp(`\\b${longName}\\b`, 'g'), () => shortName);
  }

  // Reemplazar const por let, booleanos y decimales con 0 inicial
  mangled = mangled
    .replace(/\bconst\b/g, 'let')
    .replace(/\btrue\b/g, '!0')
    .replace(/\bfalse\b/g, '!1')
    .replace(/\b0\.(\d+)/g, '.$1')
    .replace(/===/g, '==')
    .replace(/!==/g, '!=');

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
  compacted = compacted.replace(/;\}/g, '}');

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
