const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const srcPath = path.join(__dirname, 'src', 'main.js');
const distDir = path.join(__dirname, 'dist');
const distHtmlPath = path.join(distDir, 'index.html');
const rootHtmlPath = path.join(__dirname, 'index.html');

function flattenSingletons(code, names) {
  const strings = [];
  let tokenized = code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\s+\/\/.*$/gm, '')
    .replace(/'([^'\\]|\\.)*'|"([^"\\]|\\.)*"|`([^`\\]|\\.)*`/g, (match) => {
      const id = `__STR_${strings.length}__`;
      strings.push(match);
      return id;
    });

  for (const objName of names) {
    const declRe = new RegExp(`(?:const|let)\\s+${objName}\\s*=\\s*\\{([\\s\\S]*?)\\};`);
    tokenized = tokenized.replace(declRe, (_, body) => {
      const pairs = body
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((pair) => {
          const idx = pair.indexOf(':');
          if (idx === -1) return `${objName}_${pair}=${pair}`;
          const k = pair.slice(0, idx).trim();
          const v = pair.slice(idx + 1).trim();
          return `${objName}_${k}=${v}`;
        });
      return `let ${pairs.join(',')};`;
    });
    tokenized = tokenized.replace(new RegExp(`\\b${objName}\\.([A-Za-z0-9_$]+)`, 'g'), `${objName}_$1`);
  }

  return tokenized.replace(/__STR_(\d+)__/g, (_, idx) => strings[Number(idx)]);
}

async function build() {
  const rawJs = fs.readFileSync(srcPath, 'utf8');
  const preparedJs = flattenSingletons(rawJs, ['drone', 'boss']);

  const result = await minify(preparedJs, {
    compress: {
      passes: 4,
      unsafe: true,
      unsafe_math: true,
      unsafe_arrows: true,
      unsafe_comps: true,
      unsafe_methods: true,
      hoist_funs: true,
      drop_console: true,
      ecma: 2020,
      toplevel: true,
    },
    mangle: {
      toplevel: true,
      properties: {
        regex: /^_/,
      },
    },
    format: {
      ecma: 2020,
    },
  });

  if (result.error) {
    throw result.error;
  }

  const minJs = result.code;

  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  fs.writeFileSync(path.join(distDir, 'game.min.js'), minJs, 'utf8');

  // Detectar resolución del canvas desde el código fuente (fallback 256x240)
  const wMatch = rawJs.match(/\bconst\s+W\s*=\s*(\d+)/);
  const hMatch = rawJs.match(/\bconst\s+H\s*=\s*(\d+)/);
  const cw = wMatch ? wMatch[1] : '256';
  const ch = hMatch ? hMatch[1] : '240';

  const htmlContent = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><title>Steam Hopper - Arcade Edition</title><link rel="icon" href="data:,"><style>*{box-sizing:border-box;margin:0;padding:0;user-select:none;-webkit-user-select:none}html,body{width:100%;height:100%;background:#060408;display:flex;align-items:center;justify-content:center;overflow:hidden;touch-action:none}#c{width:min(100vw,calc(100vh * (${cw} / ${ch})));height:min(100vh,calc(100vw * (${ch} / ${cw})));image-rendering:pixelated;image-rendering:crisp-edges;border:4px solid #3c2a21;box-shadow:0 0 0 2px #f59e0b44,0 0 40px rgba(255,119,34,0.22)}</style></head><body><canvas id="c"></canvas><script>${minJs}</script></body></html>`;

  fs.writeFileSync(distHtmlPath, htmlContent, 'utf8');
  fs.writeFileSync(rootHtmlPath, htmlContent, 'utf8');

  const bytes = Buffer.byteLength(htmlContent, 'utf8');
  const kb = (bytes / 1024).toFixed(2);
  const limit = 32768;

  console.log('====================================================');
  console.log(' STEAM HOPPER - BUILD COMPLETADO (TERSER)');
  console.log('====================================================');
  console.log(` Resolución   : ${cw}x${ch}`);
  console.log(` Archivo raíz : index.html`);
  console.log(` Archivo dist : dist/index.html`);
  console.log(` Peso exacto  : ${bytes} bytes (${kb} KB / 32.00 KB)`);
  console.log(` Margen libre : ${limit - bytes} bytes (${((limit - bytes) / 1024).toFixed(2)} KB)`);
  console.log('====================================================');

  if (bytes > limit) {
    console.error('ERROR: El archivo supera el límite de 32 KB (32,768 bytes)!');
    process.exit(1);
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
