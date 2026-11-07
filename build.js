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

  // 3. Limpiar espacios fuera de cadenas manteniendo saltos de línea seguros
  const compacted = tokenized
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n')
    .replace(/[ \t]*([=+\-*/%&|^<>!?:;,{}()[\]])[ \t]*/g, '$1');

  // 4. Restaurar cadenas originales intactas
  return compacted.replace(/__STR_(\d+)__/g, (_, idx) => strings[Number(idx)]);
}

const minJs = minifyJS(rawJs);

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.writeFileSync(path.join(distDir, 'game.min.js'), minJs, 'utf8');

const htmlContent = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><title>Steam Hopper (Vapor Ascent) - NES Edition</title><style>*{box-sizing:border-box;margin:0;padding:0;user-select:none;-webkit-user-select:none}html,body{width:100%;height:100%;background:#070506;display:flex;align-items:center;justify-content:center;overflow:hidden;touch-action:none}#c{width:min(100vw,calc(100vh * (256 / 240)));height:min(100vh,calc(100vw * (240 / 256)));image-rendering:pixelated;image-rendering:crisp-edges;border:3px solid #4a3228;box-shadow:0 0 32px rgba(255,119,34,0.2)}</style></head><body><canvas id="c"></canvas><script>\n${minJs}\n</script></body></html>`;

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
