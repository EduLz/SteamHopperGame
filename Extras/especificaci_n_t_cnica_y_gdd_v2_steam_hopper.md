# Steam Hopper: High-Octane Edition (GDD & Especificación Técnica v2)

### Documento de Arquitectura, Mecánicas de Rejugabilidad y Rendimiento a 240 FPS
**Restricción del Reto:** $\le 32\text{ KB}$ sin comprimir, 0 assets externos, 100% Vanilla JS nativo.

---

## 1. Resumen de Nuevos Sistemas Implementados

Para erradicar la monotonía y fomentar decisiones de riesgo/recompensa continuas, el juego incorpora cinco subsistemas mecánicos y visuales interconectados:

1. **Núcleos de Presión y Modo Overdrive:** Coleccionables procedurales colocados en zonas de alto riesgo que desbloquean un estado de sobrepresión temporal invencible.
2. **Cuatro Biomas Verticales Procedurales:** Modificación dinámica de paletas cromáticas, comportamientos ambientales y peligros según la altitud.
3. **Purga Explosiva / Venteo Rápido (*Slam*):** Maniobra activa de descenso en picado y onda de choque impulsada por la válvula de seguridad (`Espacio` o `S`/`↓`).
4. **Meta-Progresión Ligera (Chasis Desbloqueables):** Tres clases de dron seleccionables persistidas en `localStorage` con atributos físicos diferenciados.
5. **Eventos Atmosféricos (*Hazard Surges*):** Sobrecargas periódicas del tiro de la chimenea que alteran la gravedad y la velocidad del magma durante intervalos de 5 segundos.

---

## 2. Especificación Detallada de las Nuevas Mecánicas

### 2.1 Núcleos de Presión y Modo Overdrive (*Risk vs. Reward*)
* **Generación:** Los núcleos (engranajes dorados pulsantes) se sitúan proceduralmente en coordenadas de alta dificultad: entre filos de engranajes, en la trayectoria de compuertas hidráulicas o rozando el nivel del magma.
* **Mecánica Combo:** Recoger 3 núcleos sin morir activa el **Modo Overdrive** durante 4.0 segundos:
  * **Vapor Infinito:** La caldera queda congelada al $100\%$ de PSI.
  * **Super-Propulsión:** El empuje de las toberas se incrementa en un $60\%$.
  * **Chasis Destructor:** El dron se envuelve en un aura dorada; cualquier sierra que contacte es destrozada en esquirlas metálicas (`gears.splice`).
  * **Aceleración Musical:** El secuenciador de audio eleva su tempo en un $25\%$ ($154 \to 192\text{ BPM}$).

### 2.2 Cuatro Biomas Verticales Procedurales
A medida que la altitud ($Alt$) progresa, el renderizador y el generador efectúan transiciones cromáticas y de peligro continuas:

| Bioma | Rango Altitud | Paleta Visual | Peligros Específicos |
| :--- | :--- | :--- | :--- |
| **01. Fundición Inferior** | $0 - 120\text{ m}$ | Carbón `#06090f`, Lava roja `#991b1b`, Vigas cian | Plataformas anchas ($150\text{ px}$), sierras lentas, compuertas espaciadas. |
| **02. Taller Mecánico** | $120 - 300\text{ m}$ | Acero industrial `#08101a`, Lava azul `#0284c7`, Chispas voltaicas | Sierras dobles sincronizadas, compuertas en tándem y vents de vapor a alta presión. |
| **03. Reactor Químico** | $300 - 500\text{ m}$ | Óxido tóxico `#08140e`, Magma ácido verde `#16a34a` | Plataformas reducidas ($55-70\text{ px}$), compuertas con cierre acelerado ($1.8\text{ s}$). |
| **04. La Tormenta del Tiro** | $500\text{ m}+$ | Vacío tormentoso `#12091c`, Plasma violeta `#9333ea` | Corrientes de convección atmosféricas erráticas y frecuencia máxima de obstáculos. |

### 2.3 Acción Activa: Purga Explosiva (*Vent Slam*)
* **Disparador:** Tecla `Espacio` o `S` / `Flecha Abajo` (o toque en el tercio inferior del lienzo).
* **Cinemática:** Abre bruscamente las válvulas superiores del dron:
  $$\vec{v}_{y} \leftarrow \vec{v}_{y} + 8.5\text{ px/frame}$$
* **Onda de Choque:** Genera una ráfaga anular de partículas de vapor a $360^\circ$ que frena el giro de sierras cercanas e interrumpe temporalmente los escapes de vapor.
* **Coste Táctico:** Drena instantáneamente $25\text{ PSI}$ de vapor de la caldera. No ejecutable si la caldera está en purga de emergencia.

### 2.4 Meta-Progresión y Clases de Chasis (`localStorage`)
Los récords y núcleos totales se almacenan de forma persistente. En la pantalla de título, el jugador puede elegir el chasis activo (Teclas `1`, `2`, `3`):

1. **Chasis Estándar (Mk.I):**
   * *Desbloqueo:* Inicial.
   * *Atributos:* Masa y consumo balanceados ($THRUST_X = 0.30$, $THRUST_Y = 0.46$, $GRAV = 0.25$, Vapor máx: $100$).
2. **Chasis Titanio Blindado (Mk.II):**
   * *Desbloqueo:* Alcanzar $100\text{ m}$ en una partida.
   * *Atributos:* Chasis pesado ($GRAV = 0.29$). Reduce el daño de sierras y compuertas en un $50\%$ (solo pierde $11\text{ PSI}$ en impactos).
3. **Chasis Colibrí Acrobático (Mk.III):**
   * *Desbloqueo:* Recolectar $15$ núcleos de presión acumulados.
   * *Atributos:* Ultraliviano ($GRAV = 0.21$, $THRUST_Y = 0.54$). Maniobrabilidad acrobática, pero su caldera reducida alberga solo $70\text{ PSI}$ máximos.

### 2.5 Eventos de Sobrecarga Térmica (*Convection Surges*)
Cada múltiplo de $90\text{ m}$, el tiro de la chimenea entra en sobrecalentamiento durante $5.0$ segundos:
* Una sirena modulada (`playGateWarning()`) alerta del fenómeno.
* Las corrientes de aire ascendentes empujan al dron hacia arriba ($\vec{F}_y -= 0.18$), pero la velocidad del magma se duplica momentáneamente.

---

## 3. Modelo Físico y Motor Desacoplado (Hasta 240 FPS)

Para garantizar un movimiento uniforme en monitores de 60 Hz, 120 Hz, 144 Hz o 240 Hz, el motor integra física normalizada por Delta-Time ($\Delta t$):

$$\Delta t = \frac{\min(\text{elapsed}, 33.33)}{16.666}$$

$$\vec{v}_{t+1} = \left(\vec{v}_t + (\vec{g} + \vec{a}_{\text{empuje}}) \cdot \Delta t\right) \cdot \mu^{\Delta t}$$

$$\vec{p}_{t+1} = \vec{p}_t + \vec{v}_{t+1} \cdot \Delta t$$

Donde $\mu = 0.982$ es el arrastre atmosférico. El bucle rechaza cualquier fotograma con un intervalo menor a $4.166\text{ ms}$ (`MIN_FRAME_DELTA = 1000 / 240`), fijando un techo de cálculo para evitar saturación de CPU/GPU.

---

## 4. Arquitectura de Audio Nativo (*Battle OST*)

El motor musical opera bajo un secuenciador polifónico de 4 pistas en tiempo real sincronizado mediante `audioCtx.currentTime`:
* **Canal 1 (Bajo Galopante):** Onda de diente de sierra continua en semicorcheas (patrón $1-1-8-1$).
* **Canal 2 (Percusión Procedimental):** Bombo analógico sintético ($130\text{ Hz} \to 35\text{ Hz}$), caja con ruido blanco filtrado paso-alto y charles rítmico.
* **Canal 3 (Lead Heroico):** Melodía pentatónica dramática en onda cuadrada (inspirada en la intensidad de temas arcade de confrontación heroica).
* **Canal 4 (Arpegio de Tensión):** Ráfagas de onda triangular sobre la tónica y dominante de la progresión ($Cm \to Ab \to Bb \to G$).

---

## 5. Presupuesto de Bytes y Optimización Zero-GC

| Subsistema | Optimización Clave | Peso en Build Final |
| :--- | :--- | :--- |
| **Bucle Físico & Delta-Time** | Integración vectorial por potencia `Math.pow(DRAG, dt)` | $\approx 2.4\text{ KB}$ |
| **Audio Scheduler & SFX** | Síntesis por eventos en `currentTime` con osciladores nativos | $\approx 4.8\text{ KB}$ |
| **Render HD 640×720 & Biomas** | Primitivas directas y paletas procedurales indexadas | $\approx 6.8\text{ KB}$ |
| **Entidades & Obstáculos** | Sierras con daño, compuertas, vents, núcleos, partículas | $\approx 7.2\text{ KB}$ |
| **Meta-Prog & Chasis** | Persistencia directa en `localStorage` y selección UI | $\approx 2.2\text{ KB}$ |
| **Estructura HTML5 / Canvas** | Shell único autocontenido con CSS responsive | $\approx 0.8\text{ KB}$ |
| **Total Build Final** | **Sin librerías, sin imágenes, sin audio pregrabado** | **$\approx 29.8\text{ KB}$ ($\le 32\text{ KB}$)** |