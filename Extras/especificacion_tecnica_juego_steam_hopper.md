# Steam Hopper (Vapor Ascent)
### Documento de Diseño de Videojuego (GDD) y Especificación Técnica
**Objetivo:** Competencia de desarrollo web restringido (< 32 KB, cero assets, Vanilla JS).

---

## 1. Reglas y Restricciones del Reto

| Regla | Parámetro | Aplicación en el Proyecto |
| :--- | :--- | :--- |
| **01. Tamaño límite** | $\le 32\text{ KB}$ sin comprimir | El build final (`index.html` autocontenido) no debe exceder los 32,768 bytes. El código será minificado con Terser. |
| **02. Código propio** | 100% nativo | Prohibido el uso de motores (Phaser, Three.js, Pixi), frameworks (React, Vue) o micro-librerías externas. Solo APIs estándar del navegador. |
| **03. Cero assets** | 0 archivos externos | Prohibido cargar imágenes (`.png`, `.svg`), audio (`.mp3`, `.wav`) o fuentes (`.woff2`, Google Fonts). Todo se genera por código en tiempo real. |
| **04. Repositorio** | Nuevo y público | Repositorio GitHub creado exprofeso con despliegue en GitHub Pages, Vercel o Itch.io. |
| **05. Originalidad** | No clones directos | Mecánica híbrida original: escalada vertical con empuje vectorial asimétrico y gestión térmica. |
| **06. Participación** | Un juego por persona | Código compacto, modular y autocontenido. |

---

## 2. Visión General del Juego

### 2.1 Premisa
El jugador controla un pequeño dron de mantenimiento a vapor atrapado en la chimenea de fundición de una megaestructura industrial en colapso. Desde el fondo asciende una marea de metal fundido y vapor abrasador. El dron no posee extremidades para caminar: su único medio de locomoción son dos toberas de escape laterales que expulsan vapor a alta presión.

### 2.2 Estética
* **Resolución interna:** $256 \times 240$ píxeles (proporción clásica de NES de $4:3$, escalada por CSS con `image-rendering: pixelated`).
* **Paleta visual:** Paleta reducida de 16 colores inspirada en NES (tonos óxido, cobre, carbón, naranja incandescente y blanco humo).
* **Audio:** Chiptune procedural generado mediante Web Audio API con emulación del chip APU (ondas cuadradas y ruido blanco filtrado).

---

## 3. Modelo Físico y Cinemática

El movimiento del dron descansa sobre un modelo físico vectorial en 2D integrado mediante el método semiexplícito de Euler en un bucle de paso de tiempo fijo ($dt = \frac{1}{60}\text{ s}$):

$$\vec{v}_{t+1} = \left(\vec{v}_t + \left(\vec{g} + \vec{a}_{\text{empuje}}\right)\right) \cdot \mu$$

$$\vec{p}_{t+1} = \vec{p}_t + \vec{v}_{t+1}$$

### 3.1 Parámetros Cinemáticos
* **Gravedad ($\vec{g}$):** $[0, 0.28]\text{ px/frame}^2$.
* **Arrastre atmosférico ($\mu$):** $0.985$ (fricción para estabilizar velocidades límite).
* **Tobera Izquierda activada:**
  $$\vec{F}_{\text{izq}} = [0.38, -0.68]$$
  *(Aplica empuje hacia arriba y hacia la derecha, inclinando el chasis hacia la derecha).*
* **Tobera Derecha activada:**
  $$\vec{F}_{\text{der}} = [-0.38, -0.68]$$
  *(Aplica empuje hacia arriba y hacia la izquierda, inclinando el chasis hacia la izquierda).*
* **Ambas toberas simultáneas:**
  $$\vec{F}_{\text{total}} = [0, -1.36]$$
  *(Empuje vertical neto reforzado).*
* **Inclinación angular visual:**
  $$\theta = \vec{v}_x \cdot 0.06\text{ radianes}$$

### 3.2 Dinámica de la Caldera (Termodinámica del Dron)
Para prevenir el vuelo constante y obligar al jugador a tomar decisiones de aterrizaje:
1. **Presión de Vapor ($P$):** Inicia en $100\%$. Cada frame de activación de tobera reduce la presión en $0.45\%$.
2. **Sobrecalentamiento:** Si $P \le 0\%$, la caldera entra en estado de **Purga de Emergencia** durante $1.2$ segundos, bloqueando los propulsores mientras el dron cae en caída libre.
3. **Zonas de Enfriamiento (Cornisas):** Posarse con velocidad vertical baja ($|\vec{v}_y| < 1.5$) sobre vigas frías recarga la presión a razón de $3\%$ por frame.
4. **Marea de Lava Inferior ($Y_{\text{lava}}$):**
   $$Y_{\text{lava}}(t) = Y_{\text{inicial}} - (v_{\text{base}} \cdot t + a_{\text{lava}} \cdot t^{1.2})$$
   La lava sube constantemente. Si la coordenada $Y_{\text{dron}} \ge Y_{\text{lava}}$, se produce la destrucción térmica inmediata.

---

## 4. Detección y Respuesta a Colisiones

Se implementan dos rutinas matemáticas nativas ultralivianas:

### 4.1 Dron (Círculo) vs. Muros/Plataformas (AABB)
Sea el dron un círculo con centro $(x_c, y_c)$ y radio $r$, y un obstáculo rectangular definido por $[x_{\min}, y_{\min}, x_{\max}, y_{\max}]$:

1. Punto más cercano en el rectángulo:
   $$x_n = \max(x_{\min}, \min(x_c, x_{\max}))$$
   $$y_n = \max(y_{\min}, \min(y_c, y_{\max}))$$
2. Distancia euclidiana al cuadrado:
   $$d^2 = (x_c - x_n)^2 + (y_c - y_n)^2$$
3. Si $d^2 < r^2$, hay colisión. La normal de colisión $\hat{n} = \frac{(x_c - x_n, y_c - y_n)}{d}$ corrige la posición del dron y refleja la velocidad con coeficiente de restitución elástico:
   $$\vec{v}' = \vec{v} - (1 + e)(\vec{v} \cdot \hat{n})\hat{n} \quad (e = 0.55)$$

### 4.2 Dron (Círculo) vs. Engranaje Giratorio (Círculo con Impulso Tangencial)
Si el dron contacta un engranaje de radio $R$ centrado en $(x_g, y_g)$ que rota a velocidad angular $\omega$:
* Se detecta colisión radial si $\text{distancia}(C_d, C_g) \le r + R$.
* Se le transfiere al dron una componente de velocidad tangencial:
  $$\vec{v}_{\text{tangente}} = \omega \cdot R \cdot [-\sin\phi, \cos\phi]$$
  Donde $\phi$ es el ángulo de contacto relativo entre ambos centros.

---

## 5. Arquitectura del Código (Estrategia Cero Assets)

### 5.1 Motor Gráfico Procedural (Canvas 2D)
* **El Dron:** Se renderiza mediante combinaciones de `ctx.arc()` (cúpula de latón), `ctx.fillRect()` (toberas) y un ojo central cuya pupila se desplaza proporcionalmente al vector de dirección $(\vec{v}_x, \vec{v}_y)$.
* **Engranajes Industriales:** Dibujados por código iterando sobre funciones trigonométricas paramétricas:
  $$r(i) = \begin{cases} R & \text{si } i \bmod 2 = 0 \\ R - h_{\text{diente}} & \text{si } i \bmod 2 = 1 \end{cases}$$
* **Sistema de Partículas (Object Pool):** Un arreglo estático de 64 objetos prealojados que reciclan partículas de vapor (humo blanco translúcido), chispas de metal (amarillas con gravedad) y burbujas incandescentes.

### 5.2 Tipografía Embebida (Mini-Font Bitmap 3×5)
Para no violar la Regla 03 ni depender de fuentes del sistema que alteren el diseño según el sistema operativo, los caracteres alfanuméricos se codifican en máscaras de 15 bits empaquetadas en un mapa binario:

```javascript
// Cada número representa una matriz de 3 columnas x 5 filas
const FONT = {
  '0': 0x7B6F, '1': 0x2492, '2': 0x73E7, '3': 0x73CF,
  'A': 0x77EB, 'B': 0x73EB, 'C': 0x7267, 'S': 0x71CF,
  /* ... mapeo alfanumérico compacto ... */
};

function drawChar(ctx, char, x, y, color, scale = 1) {
  const glyph = FONT[char] || 0;
  ctx.fillStyle = color;
  for (let i = 0; i < 15; i++) {
    if ((glyph >> (14 - i)) & 1) {
      ctx.fillRect(x + (i % 3) * scale, y + Math.floor(i / 3) * scale, scale, scale);
    }
  }
}
```

### 5.3 Motor de Audio Procedural (Web Audio API)
La música y los efectos de sonido se sintetizan en tiempo real sin búfers precargados:

1. **Efecto de Vapor (Toberas):**
   * Generación de ruido blanco algorítmico (`Math.random() * 2 - 1`).
   * Pasa a través de un `BiquadFilterNode` de tipo *bandpass* con frecuencia central en $800\text{ Hz}$ y modulación por envolvente de decaimiento lineal.
2. **Impacto Metálico / Rebote:**
   * Generador de onda senoidal de corta duración ($0.08\text{ s}$) con rampa exponencial de frecuencia descendente ($220\text{ Hz} \to 40\text{ Hz}$).
3. **Banda Sonora Procedural (Micro-Secuenciador):**
   * Secuencia en bucle de 16 pasos basada en la escala menor pentatónica.
   * Dos osciladores: Canal 1 (Onda Cuadrada / Lead) y Canal 2 (Onda Triángulo / Bajo continuo).
   * Tamaño del sintetizador completo: $\le 1.8\text{ KB}$.

---

## 6. Generación Procedimental de Niveles (Vertical Chunks)

Para mantener el consumo de memoria mínimo y garantizar rejugabilidad infinita:
* El pozo vertical se segmenta en **Chunks de 240 píxeles de altura**.
* Solo **3 chunks** coexisten simultáneamente en memoria (el visible, el superior que se aproxima y el inferior que es consumido por la lava).
* **Generador Pseudoaleatorio Determinado (LCG):**
  $$X_{n+1} = (a \cdot X_n + c) \bmod m$$
  Permite reproducir la misma disposición de obstáculos si se comparte una semilla (*seed*).
* **Curva de Dificultad Dinámica ($H =$ metros de altura alcanzados):**
  * $H < 100\text{ m}$: Vigas estáticas amplias y distancias cortas.
  * $100\text{ m} \le H < 300\text{ m}$: Inclusión de escapes de vapor periódicos y engranajes pequeños.
  * $H \ge 300\text{ m}$: Engranajes dobles contrarrotativos y vigas estrechas con tiempo de enfriamiento reducido.

---

## 7. Desglose del Presupuesto de Bytes (Límite: 32 KB)

| Componente | Líneas aprox. | Peso estimado (Minificado) |
| :--- | :--- | :--- |
| HTML5 Shell + CSS Reset / Canvas Container | 25 | $\approx 0.4\text{ KB}$ |
| Game Loop determinista & Input Handler (Teclas + Touch) | 45 | $\approx 0.6\text{ KB}$ |
| Motor Físico (Euler, AABB, Círculos, Fricción) | 90 | $\approx 2.2\text{ KB}$ |
| Motor Gráfico Procedural (Primitivas, Partículas, Paleta) | 120 | $\approx 3.0\text{ KB}$ |
| Mini-Font Bitmap Engine (3×5 glyphs) | 60 | $\approx 1.2\text{ KB}$ |
| Motor de Síntesis de Sonido (Web Audio API + SFX + BGM) | 110 | $\approx 2.8\text{ KB}$ |
| Lógica del Nivel, Chunks y Generador LCG | 130 | $\approx 3.4\text{ KB}$ |
| Bucle de Estados (Menu, Ingame, Game Over, Highscore) | 80 | $\approx 1.8\text{ KB}$ |
| **Margen de seguridad restante para pulido/gameplay** | - | **$\approx 16.6\text{ KB}$** |
| **Total Estimado del Build Final** | **~660** | **$\approx 15.4\text{ KB} \text{ / } 32\text{ KB}$** |

---

## 8. Pipeline de Construcción y Empaquetado

Para compilar el juego en un único archivo HTML listo para desplegar:

```bash
# 1. Empaquetar y minificar el código JavaScript con Terser
npx terser src/main.js --compress --mangle --output dist/game.min.js

# 2. Inyectar el script minificado dentro del HTML base
# El archivo final dist/index.html contendrá:
# <!DOCTYPE html><html><head>...<style>...</style></head>
# <body><canvas id="c"></canvas><script>/* CÓDIGO MINIFICADO */</script></body></html>

# 3. Comprobar peso estricto en bytes
ls -lh dist/index.html
```

---

## 9. Controles de Juego

| Acción | Entrada Teclado | Entrada Pantalla Táctil |
| :--- | :--- | :--- |
| **Tobera Izquierda** | Flecha Izquierda / `Tecla A` | Tocar mitad izquierda de la pantalla |
| **Tobera Derecha** | Flecha Derecha / `Tecla D` | Tocar mitad derecha de la pantalla |
| **Ascenso Vertical** | Ambas teclas simultáneas | Tocar ambos lados con dos dedos |
| **Reiniciar / Comenzar** | `Espacio` / `Enter` | Toque simple en el centro |