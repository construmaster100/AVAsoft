/* ==========================================================================
  CANCHA — viewport de navegación 12×9, modo local (un jugador, sin servidor)
   --------------------------------------------------------------------------
  La cancha se representa como una grilla exacta de 12×9. Esta versión no
   depende de Socket.IO ni de un backend: todo el estado (posición, marcas
   X/O, color de celda, casillas visitadas, combate) vive en memoria del
   navegador.

   No hay línea de gol ni balones: el jugador tiene 25 de vida y 3 vidas
   (corazones), y `X`/`C` son las acciones de golpe y defensa (feedback
   visual sobre el propio marcador). Al ser un prototipo de un solo jugador
   no hay un rival real al que dañar — esa parte vive en la versión
   multijugador (pages/cancha.html + game-server/). La segunda tarjeta de
   "jugadores conectados" es solo un maquetado estático para visualizar esa
   sección con más de un jugador, no un personaje con el que se combate.
   ========================================================================== */

const SVG_NS = "http://www.w3.org/2000/svg";
const svg = document.getElementById("pitch-svg");

const ROWS = 9;
const COLS = 12;
const FIXED_VIEWBOX = "0 0 1672 941";

const QUAD = {
  TL: { x: 0, y: 0 },
  TR: { x: 1672, y: 0 },
  BL: { x: 0, y: 941 },
  BR: { x: 1672, y: 941 },
};

const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

function quadPoint(u, v) {
  const top = lerp(QUAD.TL, QUAD.TR, u);
  const bottom = lerp(QUAD.BL, QUAD.BR, u);
  return lerp(top, bottom, v);
}

function blockCorners(r, c, rSpan, cSpan) {
  const u0 = c / COLS, u1 = (c + cSpan) / COLS;
  const v0 = r / ROWS, v1 = (r + rSpan) / ROWS;
  return [quadPoint(u0, v0), quadPoint(u1, v0), quadPoint(u1, v1), quadPoint(u0, v1)];
}

function cellCorners(r, c) { return blockCorners(r, c, 1, 1); }
function cellCenter(r, c) { return quadPoint((c + 0.5) / COLS, (r + 0.5) / ROWS); }

function pointsToStr(points) {
  return points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

function el(tag, attrs = {}, parent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(node);
  return node;
}

function zoneNumber(r, c) { return r * COLS + c + 1; }

const ROW_THIRDS = ["fondo", "mediocampo", "frente"];
const COL_THIRDS = ["banda izquierda", "centro", "banda derecha"];
function zoneDescription(r, c) {
  const rowLabel = ROW_THIRDS[Math.min(2, Math.floor((r / ROWS) * 3))];
  const colLabel = COL_THIRDS[Math.min(2, Math.floor((c / COLS) * 3))];
  return `${colLabel} — ${rowLabel}`;
}

/* ---------------------------------------------------------------------- */
/* Grupos base                                                            */
/* ---------------------------------------------------------------------- */
const sceneGroup     = el("g", { class: "scene-group" }, svg);
const pitchGroup      = el("g", {}, sceneGroup);
const specialLinesGroup = el("g", {}, sceneGroup);
const paintGroup      = el("g", {}, sceneGroup);
const cellsGroup      = el("g", {}, sceneGroup);
const markGroup       = el("g", {}, sceneGroup);
const highlightGroup  = el("g", {}, sceneGroup);
const playersGroup    = el("g", {}, sceneGroup);
const labelsGroup     = el("g", {}, sceneGroup);
const movementGroup   = el("g", { class: "movement-controls" }, sceneGroup);

function dibujarCancha() {
  const PITCH_PHOTO_SCALE = 0.98;
  const pitchPhotoWidth = 1672 * PITCH_PHOTO_SCALE;
  const pitchPhotoHeight = 941 * PITCH_PHOTO_SCALE;
  el("image", {
    href: "assets/img/CANCHA%20FUTBOL/vista%20aerea.png",
    x: 0, y: 0,
    width: pitchPhotoWidth,
    height: pitchPhotoHeight,
    preserveAspectRatio: "none",
    class: "pitch-photo",
  }, pitchGroup);
  const greenTopLeft = quadPoint(1 / COLS, 1 / ROWS);
  const greenBottomRight = quadPoint((COLS - 1) / COLS, (ROWS - 1) / ROWS);
  el("rect", {
    x: greenTopLeft.x,
    y: greenTopLeft.y,
    width: greenBottomRight.x - greenTopLeft.x,
    height: greenBottomRight.y - greenTopLeft.y,
    class: "green-border",
  }, specialLinesGroup);
  const magentaLineStart = quadPoint(1 / COLS, 4.5 / ROWS);
  const magentaLineEnd = quadPoint((COLS - 1) / COLS, 4.5 / ROWS);
  el("line", {
    x1: magentaLineStart.x,
    y1: magentaLineStart.y,
    x2: magentaLineEnd.x,
    y2: magentaLineEnd.y,
    class: "magenta-row-line",
  }, specialLinesGroup);
  const centerPoint = quadPoint(6 / COLS, 4.5 / ROWS);
  const centerCell = cellCorners(4, 5);
  const centerCellWidth = centerCell[1].x - centerCell[0].x;
  const centerCellHeight = centerCell[3].y - centerCell[0].y;
  el("circle", {
    cx: centerPoint.x,
    cy: centerPoint.y,
    r: Math.min(centerCellWidth, centerCellHeight),
    class: "center-cell-circle",
  }, specialLinesGroup);
}

/* ---------------------------------------------------------------------- */
/* Celdas: capa de pintura (color), capa de golpe (clic) y capa de marca  */
/* (X/O) — 108 = 12×9, una de cada por celda.                              */
/* ---------------------------------------------------------------------- */
const PALETA = ["#e23c2f", "#2f6a8f", "#2f9e44", "#f2bd57", "#8a4fd6"];
const paintPolys = [];
const markTexts = [];
const labelTexts = [];
const cellState = Array.from({ length: ROWS * COLS }, () => ({ colorIdx: -1, marca: "" }));

function cellLabel(r, c) {
  return `${String.fromCharCode(65 + c)}${r + 1}`;
}

function isOuterFrameCell(r, c) {
  return r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1;
}

function outerFrameNumber(r, c) {
  if (r === 0) return c + 1;
  if (c === COLS - 1) return COLS + r;
  if (r === ROWS - 1) return COLS + ROWS - 1 + (COLS - 1 - c);
  return COLS + ROWS - 1 + COLS - 1 + (ROWS - 1 - r);
}

function displayCellLabel(r, c) {
  if (isOuterFrameCell(r, c)) return `Ω${outerFrameNumber(r, c)}`;
  return `${String.fromCharCode(65 + c - 1)}${r}`;
}

function crearCeldas() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const idx = zoneNumber(r, c) - 1;

      const paint = el("polygon", { points: pointsToStr(cellCorners(r, c)), class: "cell-paint" }, paintGroup);
      paintPolys[idx] = paint;

      const hit = el("polygon", { points: pointsToStr(cellCorners(r, c)), class: "cell-hit" }, cellsGroup);
      hit.addEventListener("click", () => requestMove(r - active.r, c - active.c));

      const center = cellCenter(r, c);
      const mark = el("text", { x: center.x, y: center.y, class: "cell-mark", "text-anchor": "middle", "dominant-baseline": "central" }, markGroup);
      markTexts[idx] = mark;

      const labelCorner = cellCorners(r, c)[0];
      const label = el("text", {
        x: labelCorner.x + 8,
        y: labelCorner.y + 23,
        class: "cell-label",
        "aria-label": `Casilla ${displayCellLabel(r, c)}`,
      }, labelsGroup);
      label.textContent = displayCellLabel(r, c);
      labelTexts[idx] = label;
    }
  }
}

function pintarCelda(idx) {
  const estado = cellState[idx];
  const hex = estado.colorIdx >= 0 ? PALETA[estado.colorIdx] : null;
  paintPolys[idx].setAttribute("fill", hex || "transparent");
  paintPolys[idx].style.opacity = hex ? "0.55" : "0";
  markTexts[idx].textContent = estado.marca || "";
}

function marcarCelda(zona, simbolo) {
  const idx = zona - 1;
  cellState[idx].marca = cellState[idx].marca === simbolo ? "" : simbolo;
  pintarCelda(idx);
}

function cambiarColorCelda(zona) {
  const idx = zona - 1;
  cellState[idx].colorIdx = (cellState[idx].colorIdx + 2) % (PALETA.length + 1) - 1;
  pintarCelda(idx);
}

/* ---------------------------------------------------------------------- */
/* Marcador del jugador local sobre el SVG                                */
/* ---------------------------------------------------------------------- */
const PERSONAJE_SRC = "assets/img/pj/PERSONAJE/ORANGE.png";
let playerMarker = null;
let navigationPoint = null;

const MARCADOR_ZOOM = 1.35; // compensa el margen transparente de los PNG de personaje

function actualizarMarcadorJugador(r, c) {
  const centro = cellCenter(r, c);
  const corners = cellCorners(r, c);
  const cellWidth = (corners[1].x - corners[0].x) * MARCADOR_ZOOM;
  const cellHeight = (corners[3].y - corners[0].y) * MARCADOR_ZOOM;
  if (!navigationPoint) {
    navigationPoint = el("circle", { r: 12, class: "navigation-point" }, playersGroup);
  }
  navigationPoint.setAttribute("cx", centro.x);
  navigationPoint.setAttribute("cy", centro.y);
  if (!playerMarker) {
    playerMarker = el("image", {
      class: "player-marker", href: PERSONAJE_SRC,
      preserveAspectRatio: "none",
    }, playersGroup);
  }
  playerMarker.setAttribute("x", centro.x - cellWidth / 2);
  playerMarker.setAttribute("y", centro.y - cellHeight / 2);
  playerMarker.setAttribute("width", cellWidth);
  playerMarker.setAttribute("height", cellHeight);
  playersGroup.appendChild(navigationPoint);
}

/* ---------------------------------------------------------------------- */
/* Vida y vidas (corazones) del jugador local. Sin servidor ni otros       */
/* jugadores reales aquí, `X` y `C` quedan como las acciones de golpe y    */
/* defensa (feedback visual sobre el propio marcador), sin un rival al     */
/* que dañar de verdad. La segunda tarjeta de "jugadores conectados" es    */
/* solo un maquetado estático — no un personaje con el que se combate —    */
/* para visualizar cómo se ve esa sección con más de un jugador, como en   */
/* la versión multijugador real (pages/cancha.html + game-server/).        */
/* ---------------------------------------------------------------------- */
const VIDA_MAXIMA = 25;
const VIDAS_MAXIMAS = 3;
const DURACION_DEFENSA_MS = 400;
const DEFENSA_COOLDOWN_MS = 400;
const DUMMY_SRC = "assets/img/pj/PERSONAJE/ERROR.png";

const jugador = { vida: VIDA_MAXIMA, vidas: VIDAS_MAXIMAS, score: 0 };
const dummy = { nombre: "Jugador de ejemplo", fila: 4, columna: 5, vida: VIDA_MAXIMA, vidas: VIDAS_MAXIMAS };
let dummyMarker = null;

function colorVida(vida) {
  if (vida >= VIDA_MAXIMA * 0.6) return "#2f9e44";
  if (vida >= VIDA_MAXIMA * 0.3) return "#f4b400";
  return "#e63946";
}

// El footer entero (desde la sidebar de conectados hasta el sidebar de
// puntajes) usa este color como fondo — más oscuro/saturado que
// colorVida() (pensado para una barra fina) porque acá el texto blanco
// tiene que seguir siendo legible sobre toda la superficie.
function colorVidaFondo(vida) {
  if (vida >= VIDA_MAXIMA * 0.6) return "#1f7a3d";
  if (vida >= VIDA_MAXIMA * 0.3) return "#8a6d13";
  return "#9c2b2b";
}

function actualizarColorFooterVida(vida) {
  document.documentElement.style.setProperty("--vida-color", colorVidaFondo(vida));
}

function corazonesHtml(vidas) {
  return Array.from({ length: VIDAS_MAXIMAS }, (_, i) =>
    `<span class="corazon${i < vidas ? "" : " corazon-vacio"}">❤</span>`
  ).join("");
}

function vidaBarHtml(vida) {
  const pct = Math.max(0, Math.min(100, (vida / VIDA_MAXIMA) * 100));
  return `<div class="vida-bar"><div class="vida-bar-fill" style="width:${pct}%;background:${colorVida(vida)}"></div></div>`;
}

function actualizarMarcadorDummy() {
  const centro = cellCenter(dummy.fila, dummy.columna);
  const corners = cellCorners(dummy.fila, dummy.columna);
  const cellWidth = (corners[1].x - corners[0].x) * MARCADOR_ZOOM;
  const cellHeight = (corners[3].y - corners[0].y) * MARCADOR_ZOOM;
  if (!dummyMarker) {
    dummyMarker = el("image", { class: "player-marker dummy-marker", href: DUMMY_SRC, preserveAspectRatio: "none" }, playersGroup);
  }
  dummyMarker.setAttribute("x", centro.x - cellWidth / 2);
  dummyMarker.setAttribute("y", centro.y - cellHeight / 2);
  dummyMarker.setAttribute("width", cellWidth);
  dummyMarker.setAttribute("height", cellHeight);
}

// Token por elemento+clase (no solo un setTimeout directo) para que, si
// atacar y defender coinciden en el mismo elemento, cada clase se apague
// por su propia cuenta sin que una pise el timeout de la otra.
const feedbackTokens = new WeakMap(); // elemento -> Map<clase, token>
function marcarFeedback(elemento, clase, duracion) {
  if (!elemento) return;
  elemento.classList.add(clase);
  if (!feedbackTokens.has(elemento)) feedbackTokens.set(elemento, new Map());
  const tokens = feedbackTokens.get(elemento);
  const token = Symbol();
  tokens.set(clase, token);
  setTimeout(() => {
    if (tokens.get(clase) === token) {
      elemento.classList.remove(clase);
      tokens.delete(clase);
    }
  }, duracion);
}

const playerCardEl = document.getElementById("player-card");

const SONIDO_GOLPE_SRC = "assets/audio/Sonido%20-%20Golpe.mp3";
function reproducirSonidoGolpe() {
  new Audio(SONIDO_GOLPE_SRC).play().catch(() => {});
}

function atacar() {
  reproducirSonidoGolpe();
  marcarFeedback(playerMarker, "is-attacking", 350);
  marcarFeedback(playerCardEl, "is-attacking", 350);
}

function defender() {
  marcarFeedback(playerMarker, "is-blocking", DURACION_DEFENSA_MS);
  marcarFeedback(playerCardEl, "is-blocking", DURACION_DEFENSA_MS);
}

// Un golpe de C bloquea por DURACION_DEFENSA_MS y despues queda en cooldown
// por DEFENSA_COOLDOWN_MS antes de poder volver a activarse.
let defensaDisponibleEn = 0;

function activarDefensa() {
  if (Date.now() < defensaDisponibleEn) return;
  defender();
  defensaDisponibleEn = Date.now() + DURACION_DEFENSA_MS + DEFENSA_COOLDOWN_MS;
}

function actualizarHUD() {
  footerScoreEl.textContent = jugador.score;
  playerBottomScoreEl.textContent = jugador.score;
  if (footerVidaEl) footerVidaEl.innerHTML = vidaBarHtml(jugador.vida);
  if (footerCorazonesEl) footerCorazonesEl.innerHTML = corazonesHtml(jugador.vidas);
  if (playerVidaEl) playerVidaEl.innerHTML = vidaBarHtml(jugador.vida);
  if (playerCorazonesEl) playerCorazonesEl.innerHTML = corazonesHtml(jugador.vidas);
  if (dummyVidaEl) dummyVidaEl.innerHTML = vidaBarHtml(dummy.vida);
  if (dummyCorazonesEl) dummyCorazonesEl.innerHTML = corazonesHtml(dummy.vidas);
  actualizarColorFooterVida(jugador.vida);
}


/* ---------------------------------------------------------------------- */
/* Botones de movimiento contextuales alrededor de la celda activa        */
/* ---------------------------------------------------------------------- */
const DIRS = {
  up: { dr: -1, dc: 0 }, down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 }, right: { dr: 0, dc: 1 },
};

const movementButtons = {};
const movementButtonShapes = {
  up: "12,0 24,14 16,14 16,28 8,28 8,14 0,14",
  down: "8,0 16,0 16,14 24,14 12,28 0,14 8,14",
  left: "0,12 14,0 14,8 28,8 28,16 14,16 14,24",
  right: "0,8 14,8 14,0 28,12 14,24 14,16 0,16",
};

Object.entries(movementButtonShapes).forEach(([direction, points]) => {
  const button = el("g", { class: "movement-button", role: "button", tabindex: "0", "aria-label": `Mover ${direction}` }, movementGroup);
  el("polygon", { points }, button);
  button.addEventListener("click", () => requestMove(DIRS[direction].dr, DIRS[direction].dc));
  button.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") requestMove(DIRS[direction].dr, DIRS[direction].dc);
  });
  movementButtons[direction] = button;
});

function refreshMovementButtons() {
  Object.entries(DIRS).forEach(([direction, { dr, dc }]) => {
    const neighbor = {
      r: active.r + dr,
      c: active.c + dc,
    };
    const center = cellCenter(active.r, active.c);
    const neighborCenter = cellCenter(
      Math.max(0, Math.min(ROWS - 1, neighbor.r)),
      Math.max(0, Math.min(COLS - 1, neighbor.c)),
    );
    const position = {
      x: (center.x + neighborCenter.x) / 2 - 14,
      y: (center.y + neighborCenter.y) / 2 - 14,
    };
    movementButtons[direction].setAttribute("transform", `translate(${position.x} ${position.y})`);
    const valid = active.r + dr >= 0 && active.r + dr < ROWS && active.c + dc >= 0 && active.c + dc < COLS;
    movementButtons[direction].classList.toggle("is-disabled", !valid);
  });
}

/* ---------------------------------------------------------------------- */
/* Selección de la casilla activa + animación del recuadro                */
/* ---------------------------------------------------------------------- */
let active = { r: 3, c: 4 };
let highlightPts = cellCorners(active.r, active.c);
const highlightPoly = el("polygon", { class: "highlight-box", points: pointsToStr(highlightPts) }, highlightGroup);

function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

function animate(duration, onFrame, onDone) {
  const start = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    onFrame(easeInOutCubic(t));
    if (t < 1) requestAnimationFrame(frame); else if (onDone) onDone();
  }
  requestAnimationFrame(frame);
}

function tweenHighlightTo(newPts) {
  const fromPts = highlightPts.map(p => ({ ...p }));
  animate(300, (t) => {
    const cur = fromPts.map((p, i) => lerp(p, newPts[i], t));
    highlightPoly.setAttribute("points", pointsToStr(cur));
  }, () => { highlightPts = newPts; });
}

/* ---------------------------------------------------------------------- */
/* Galería de imágenes de la casilla                                      */
/* ---------------------------------------------------------------------- */
const gallery = document.getElementById("image-gallery");
const galleryImage = document.getElementById("gallery-image");
const galleryCell = document.getElementById("gallery-cell");
const galleryCounter = document.getElementById("gallery-counter");
let galleryIndex = 0;

const SERIES_IMAGES = ["assets/img/CANCHA%20FUTBOL/grilla%207x10.png"];

function actualizarGaleria() {
  galleryImage.src = SERIES_IMAGES[galleryIndex];
  galleryImage.alt = `Imagen ${galleryIndex + 1} de la casilla ${zoneNumber(active.r, active.c)}`;
  galleryCell.textContent = `Casilla ${zoneNumber(active.r, active.c)} · Fila ${active.r + 1}, columna ${active.c + 1}`;
  galleryCounter.textContent = `${galleryIndex + 1} / ${SERIES_IMAGES.length}`;
}

document.getElementById("gallery-close").addEventListener("click", () => { gallery.hidden = true; });
document.getElementById("gallery-prev").addEventListener("click", () => {
  galleryIndex = (galleryIndex - 1 + SERIES_IMAGES.length) % SERIES_IMAGES.length;
  actualizarGaleria();
});
document.getElementById("gallery-next").addEventListener("click", () => {
  galleryIndex = (galleryIndex + 1) % SERIES_IMAGES.length;
  actualizarGaleria();
});

/* ---------------------------------------------------------------------- */
/* Estado / UI                                                            */
/* ---------------------------------------------------------------------- */
const zoneNumberEl = document.getElementById("zone-number");
const zoneCoordsEl = document.getElementById("zone-coords");
const zoneDescEl = document.getElementById("zone-desc");
const minimapLocationEl = document.getElementById("minimap-location");
const minimapCoordsEl = document.getElementById("minimap-coords");
const minimapZoneEl = document.getElementById("minimap-zone");
const visitedCountEl = document.getElementById("visited-count");
const playersCountEl = document.getElementById("players-count");
const playerBottomNameEl = document.getElementById("player-bottom-name");
const playerBottomScoreEl = document.getElementById("player-bottom-score");
const playerBottomImageEl = document.getElementById("player-bottom-image");
const characterPhotoImageEl = document.getElementById("character-photo-image");
const characterPhotoRegisteredEl = document.getElementById("character-photo-registered");
const characterPhotoCharacterEl = document.getElementById("character-photo-character");
const playerColorChoiceEl = document.getElementById("player-color-choice");
const top5ListEl = document.getElementById("top5-list");
const footerScoreEl = document.getElementById("footer-score");
const footerVidaEl = document.getElementById("footer-vida");
const footerCorazonesEl = document.getElementById("footer-corazones");
const playerVidaEl = document.getElementById("player-vida");
const playerCorazonesEl = document.getElementById("player-corazones");
const dummyVidaEl = document.getElementById("dummy-vida");
const dummyCorazonesEl = document.getElementById("dummy-corazones");

const visited = new Set();

function refreshStatus() {
  const n = zoneNumber(active.r, active.c);
  zoneNumberEl.textContent = n;
  zoneNumberEl.classList.remove("pulse");
  void zoneNumberEl.offsetWidth;
  zoneNumberEl.classList.add("pulse");

  const coordsText = `Fila ${active.r + 1} · Columna ${active.c + 1}`;
  zoneCoordsEl.textContent = coordsText;
  zoneDescEl.textContent = `${zoneDescription(active.r, active.c)} · celda ${n} de ${ROWS * COLS}`;

  minimapLocationEl.style.left = `${(active.c / COLS) * 100}%`;
  minimapLocationEl.style.top = `${(active.r / ROWS) * 100}%`;
  minimapCoordsEl.textContent = coordsText;
  minimapZoneEl.textContent = `ZONA ${n} / ${ROWS * COLS}`;

  visited.add(n);
  visitedCountEl.textContent = `${visited.size} / ${ROWS * COLS}`;
  playerBottomNameEl.innerHTML = "<span>Jugador</span><span>Equipo</span>";
  playerBottomImageEl.src = PERSONAJE_SRC;
  characterPhotoImageEl.src = PERSONAJE_SRC;
  characterPhotoRegisteredEl.textContent = "Jugador Equipo";
  characterPhotoCharacterEl.textContent = "Orange";
  playerColorChoiceEl.style.backgroundColor = "#f97316";
  const MAX_JUGADORES_TABLA = 10;
  const filasTabla = [[1, "Jugador local", jugador.score]];
  for (let posicion = 2; posicion <= MAX_JUGADORES_TABLA; posicion++) {
    filasTabla.push([posicion, "—", "—"]);
  }
  top5ListEl.innerHTML = filasTabla
    .map(([position, name, score]) => `<tr><td>${position}</td><td>${name}</td><td class="score-value">${score}</td></tr>`)
    .join("");
  actualizarHUD();
}

function applyOwnPosition(r, c) {
  active = { r, c };
  tweenHighlightTo(cellCorners(r, c));
  actualizarMarcadorJugador(r, c);
  refreshStatus();
  refreshMovementButtons();
}

function requestMove(dr, dc) {
  if (!dr && !dc) return;
  const nr = active.r + dr, nc = active.c + dc;
  if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return;
  applyOwnPosition(nr, nc);
}

/* ---------------------------------------------------------------------- */
/* Arranque: montar la escena localmente, sin servidor                    */
/* ---------------------------------------------------------------------- */
function iniciar() {
  dibujarCancha();
  crearCeldas();
  actualizarMarcadorJugador(active.r, active.c);
  actualizarMarcadorDummy();

  highlightPts = cellCorners(active.r, active.c);
  highlightPoly.setAttribute("points", pointsToStr(highlightPts));
  svg.setAttribute("viewBox", FIXED_VIEWBOX);
  svg.setAttribute("preserveAspectRatio", "none");

  refreshStatus();
  refreshMovementButtons();
}

document.addEventListener("keydown", (e) => {
  const moveMap = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right",
  };
  if (moveMap[e.code]) {
    e.preventDefault();
    const { dr, dc } = DIRS[moveMap[e.code]];
    requestMove(dr, dc);
    return;
  }
  if (e.code === "Escape") { gallery.hidden = true; return; }
  if (e.code === "KeyX") {
    e.preventDefault();
    if (e.repeat) return;
    atacar();
    return;
  }
  if (e.code === "KeyC") {
    e.preventDefault();
    if (e.repeat) return;
    activarDefensa();
    return;
  }
  if (e.code === "KeyO") { e.preventDefault(); marcarCelda(zoneNumber(active.r, active.c), "O"); return; }
  if (e.code === "Space") { e.preventDefault(); cambiarColorCelda(zoneNumber(active.r, active.c)); return; }
  if (e.code === "KeyG") { e.preventDefault(); galleryIndex = 0; actualizarGaleria(); gallery.hidden = false; return; }
});

const minimap = document.getElementById("minimap");
if (minimap) {
  minimap.addEventListener("click", (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const c = Math.min(COLS - 1, Math.floor(((event.clientX - bounds.left) / bounds.width) * COLS));
    const r = Math.min(ROWS - 1, Math.floor(((event.clientY - bounds.top) / bounds.height) * ROWS));
    requestMove(r - active.r, c - active.c);
  });
}

iniciar();
