# Steam Hopper

Juego arcade vertical de estética retro donde piloteas una cápsula a vapor para escapar de la lava ascendente, esquivar trampas, gestionar tu presión (PSI) y derrotar jefes en un único archivo HTML de menos de **32 KB**.

- **Jugar en línea (GitHub Pages):** `https://edulz.github.io/SteamHopperGame/`
- **Jugar en local:** abre `index.html` directamente en cualquier navegador moderno (no requiere servidor).

---

## Cómo funciona el juego

El objetivo es ascender utilizando dos propulsores independientes mientras evitas caer en la lava y cuidas tus vidas.

### Controles básicos

- **Mover / Subir:** `A` y `D` (o `←` y `→`). Cada tecla activa un propulsor lateral; mantener **ambas** te impulsa hacia arriba.
- **Habilidad activa:** `Espacio`, `↓` o `Enter`.
- **Pausa:** `P` o `Esc`.
- **Extras:** `C` activa o desactiva el efecto de líneas CRT; `M` cambia el modo de audio en partida (`S` en el menú).
- **En pantalla táctil:** toca la mitad izquierda o derecha para controlar cada propulsor, y la parte inferior para activar tu habilidad.

### Mecánicas principales

- **Presión (PSI):** volar consume PSI. Si se agota, la nave entra en una purga momentánea hasta recuperar presión. Puedes recargar aterrizando en vigas/bases o rozando peligros cercanos (*graze*).
- **Jefes:** al llegar al final de una zona se limpia la arena, la lava se detiene y entras en combate directo con PSI infinito (regulado por el enfriamiento de tu habilidad).
- **Modos de juego:**
  - **Historia (Nv. 1–4):** recorre 4 zonas (*Fundición Carmesí*, *Torre Voltaica*, *Cripta Crio-Ácida* y *Ciudadela Cenit*), cada una con su propio jefe.
  - **Boss Rush:** combate consecutivo contra los 4 jefes.
  - **Torre Infinita:** ascenso procedural infinito con semilla fija (`F`) o aleatoria (`R`).
- **Hangar (`T`):** elige entre 4 naves y 4 habilidades desbloqueables al superar niveles o alcanzar cierta altura (por ejemplo, **Escudo Parry** para reflejar proyectiles, **Cañón Triple**, **Impulso Rayo** u **Onda Sísmica**).

---

## Cómo está hecho

Todo el juego está programado desde cero sin motores externos, imágenes ni archivos de audio:

- **Gráficos por código (`Canvas 2D`):** todo se dibuja en un lienzo de `320×240` px (fuente bitmap propia, escenarios, partículas, naves, enemigos y jefes) desde `src/main.js`.
- **Audio procedural (`Web Audio API`):** la música estilo retro y todos los efectos de sonido se sintetizan en tiempo real en el navegador.
- **Empaquetado en un solo archivo (`< 32 KB`):** `build.js` optimiza y minifica `src/main.js` con Terser para incrustarlo dentro de `index.html`.
- **Despliegue automático:** `.github/workflows/pages.yml` publica `index.html` automáticamente en GitHub Pages en cada `push` a `main`.

### Estructura del proyecto

- `index.html` — Juego completo compilado y listo para jugar.
- `src/main.js` — Código fuente del juego.
- `build.js` y `package.json` — Generador del build optimizado (< 32 KB).
- `.github/workflows/pages.yml` — Workflow de despliegue en GitHub Pages.

### Compilar localmente (opcional)

Si realizas cambios en `src/main.js` y quieres regenerar `index.html`:

```bash
npm install
npm run build
```
