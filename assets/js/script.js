/* ==========================================================================
   CANCHA MULTIJUGADOR — grilla interactiva 7×10 sincronizada por Socket.IO,
   con marco decorativo Ω de 38 casillas y foto aérea de fondo.
   --------------------------------------------------------------------------
   La geometría se calcula en un espacio de 9 filas × 12 columnas: la fila 0,
   la fila 8, la columna 0 y la columna 11 forman el marco Ω (decorativo, sin
   clic ni celdaId). El interior (filas 1-7 × columnas 1-10) ES el tablero
   jugable de siempre — 70 celdas, celdaId 1-70, exactamente el mismo
   contrato que ya usa el servidor (game-server/gameState.js: ROWS=7,
   COLS=10). Por eso `active` (la celda del jugador local) se guarda en
   coordenadas "exteriores" (r∈[1,7], c∈[1,10]) y solo se le resta 1 a cada
   eje cuando hace falta hablar con el servidor o indexar celdaId.

   El resto del estado (posición de los demás jugadores, score, vida, TOP)
   llega y se sincroniza en vivo desde el servidor — esta página no decide
   nada por su cuenta, solo pide acciones y pinta lo que el servidor
   confirma.

   La mecánica es de combate: cada jugador tiene 25 puntos de vida. `X`
   ataca las 4 casillas colindantes a la vez — cualquier jugador conectado
   ahí pierde 1 punto de vida, salvo que esté bloqueando con `C`. Al llegar
   a 0 de vida se pierde una de las 3 "vidas" (corazones) y se reaparece en
   el centro de la cancha con la vida llena; al perder la tercera vida el
   jugador queda eliminado y sale automáticamente del juego. Quien deja a
   otro sin vidas gana 10 puntos. Todo esto es autoridad 100% del servidor
   (game-server/gameState.js) — este archivo solo pide la acción y pinta lo
   que el servidor confirma por socket.
   ========================================================================== */

const SVG_NS = "http://www.w3.org/2000/svg";
const svg = document.getElementById("pitch-svg");

const ROWS = 9;
const COLS = 12;
const INNER_ROWS = 7;
const INNER_COLS = 10;
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

/* compensa el margen transparente de los PNG de personaje: el marcador y el
   recuadro de la casilla activa comparten este mismo zoom para que ambos
   queden del mismo tamaño visual. */
const MARCADOR_ZOOM = 1.35;
function scaledCellCorners(r, c, zoom) {
  const center = cellCenter(r, c);
  return cellCorners(r, c).map((p) => ({
    x: center.x + (p.x - center.x) * zoom,
    y: center.y + (p.y - center.y) * zoom,
  }));
}

function pointsToStr(points) {
  return points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

function el(tag, attrs = {}, parent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(node);
  return node;
}

/* celdaId 1-70 del tablero jugable, a partir de coordenadas EXTERIORES
   (r∈[1,7], c∈[1,10]) — coincide exactamente con lo que espera el
   servidor (fila*10+columna+1 en su espacio interior 0-based). */
function zoneNumber(r, c) { return (r - 1) * INNER_COLS + (c - 1) + 1; }

const ROW_THIRDS = ["fondo", "mediocampo", "frente"];
const COL_THIRDS = ["banda izquierda", "centro", "banda derecha"];
function zoneDescription(r, c) {
  const rowLabel = ROW_THIRDS[Math.min(2, Math.floor(((r - 1) / INNER_ROWS) * 3))];
  const colLabel = COL_THIRDS[Math.min(2, Math.floor(((c - 1) / INNER_COLS) * 3))];
  return `${colLabel} — ${rowLabel}`;
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

/* ---------------------------------------------------------------------- */
/* Grupos base                                                            */
/* ---------------------------------------------------------------------- */
const sceneGroup       = el("g", { class: "scene-group" }, svg);
const pitchGroup        = el("g", {}, sceneGroup);
const specialLinesGroup = el("g", {}, sceneGroup);
const cellsGroup        = el("g", {}, sceneGroup);
const labelsGroup       = el("g", {}, sceneGroup);
const highlightGroup    = el("g", {}, sceneGroup);
const playersGroup      = el("g", {}, sceneGroup);
const movementGroup     = el("g", { class: "movement-controls" }, sceneGroup);

/* ---------------------------------------------------------------------- */
/* Cancha: foto aérea de fondo + capas vectoriales que la foto no trae     */
/* (borde verde, línea central, línea de área, semicírculos, línea de     */
/* meta amarilla).                                                        */
/* ---------------------------------------------------------------------- */
function dibujarCancha() {
  el("image", {
    href: "../assets/img/CANCHA%20FUTBOL/vista%20aerea.png",
    x: 0, y: 0, width: 1672, height: 941,
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
    x1: magentaLineStart.x, y1: magentaLineStart.y,
    x2: magentaLineEnd.x, y2: magentaLineEnd.y,
    class: "magenta-row-line",
  }, specialLinesGroup);

  const centerPoint = quadPoint(6 / COLS, 4.5 / ROWS);
  const centerCell = cellCorners(4, 5);
  const centerCellWidth = centerCell[1].x - centerCell[0].x;
  const centerCellHeight = centerCell[3].y - centerCell[0].y;
  el("circle", {
    cx: centerPoint.x, cy: centerPoint.y,
    r: Math.min(centerCellWidth, centerCellHeight),
    class: "center-cell-circle",
  }, specialLinesGroup);

}

/* Etiquetas del marco Ω: puramente decorativas, sin cell-hit ni celdaId. */
function dibujarMarcoDecorativo() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!isOuterFrameCell(r, c)) continue;
      const labelCorner = cellCorners(r, c)[0];
      const label = el("text", {
        x: labelCorner.x + 8, y: labelCorner.y + 23,
        class: "cell-label",
        "aria-label": `Casilla ${displayCellLabel(r, c)}`,
      }, labelsGroup);
      label.textContent = displayCellLabel(r, c);
    }
  }
}

/* ---------------------------------------------------------------------- */
/* Celdas jugables: capa de golpe (clic para moverse) — 70 = 7×10. Solo   */
/* el interior de la grilla (filas 1-7, columnas 1-10) es interactivo.    */
/* ---------------------------------------------------------------------- */
function crearCeldas() {
  for (let r = 1; r <= INNER_ROWS; r++) {
    for (let c = 1; c <= INNER_COLS; c++) {
      const hit = el("polygon", { points: pointsToStr(cellCorners(r, c)), class: "cell-hit" }, cellsGroup);
      hit.addEventListener("click", () => requestMove(r - active.r, c - active.c));

      const labelCorner = cellCorners(r, c)[0];
      const label = el("text", {
        x: labelCorner.x + 8, y: labelCorner.y + 23,
        class: "cell-label",
        "aria-label": `Casilla ${displayCellLabel(r, c)}`,
      }, labelsGroup);
      label.textContent = displayCellLabel(r, c);
    }
  }
}

/* ---------------------------------------------------------------------- */
/* Marcadores de los demás jugadores sobre el propio SVG                  */
/* ---------------------------------------------------------------------- */
const marcadoresJugadores = new Map();
const PERSONAJE_SRC = (personaje) => `../assets/img/pj/PERSONAJE/${personaje || "BLUE"}.png`;

function actualizarMarcadorJugador(jugador) {
  let marcador = marcadoresJugadores.get(jugador.id);
  if (!jugador.conectado) {
    if (marcador) { marcador.remove(); marcadoresJugadores.delete(jugador.id); }
    return;
  }
  const r = jugador.fila + 1, c = jugador.columna + 1;
  const centro = cellCenter(r, c);
  const corners = cellCorners(r, c);
  const cellWidth = (corners[1].x - corners[0].x) * MARCADOR_ZOOM;
  const cellHeight = (corners[3].y - corners[0].y) * MARCADOR_ZOOM;
  if (!marcador) {
    marcador = el("image", { class: "player-marker" }, playersGroup);
    marcadoresJugadores.set(jugador.id, marcador);
  }
  marcador.setAttribute("x", centro.x - cellWidth / 2);
  marcador.setAttribute("y", centro.y - cellHeight / 2);
  marcador.setAttribute("width", cellWidth);
  marcador.setAttribute("height", cellHeight);
  marcador.setAttribute("href", PERSONAJE_SRC(jugador.personaje));
  marcador.setAttribute("preserveAspectRatio", "xMidYMid meet");
}

/* ---------------------------------------------------------------------- */
/* Vida, vidas (corazones) y combate — autoridad 100% del servidor; este  */
/* archivo solo pinta lo que llega por "jugador_actualizado" y da         */
/* feedback visual momentáneo a los eventos de ataque/defensa.            */
/* ---------------------------------------------------------------------- */
const VIDA_MAXIMA = 25;
const VIDAS_MAXIMAS = 3;
// DURACION_DEFENSA_MS y DEFENSA_COOLDOWN_MS deben coincidir con
// game-server/gameState.js: el servidor es quien realmente hace cumplir el
// cooldown (rechaza "defender" si llega antes de tiempo); estos valores acá
// solo sirven para que el feedback visual/local no se adelante a eso.
const DURACION_DEFENSA_MS = 400;
const DEFENSA_COOLDOWN_MS = 400;
const DURACION_FEEDBACK_MS = 350;

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

const SONIDO_GOLPE_SRC = "../assets/audio/Sonido%20-%20Golpe.mp3";
function reproducirSonidoGolpe() {
  new Audio(SONIDO_GOLPE_SRC).play().catch(() => {});
}

const SONIDO_QUEJIDO_SRC = "../assets/audio/quejido.mp3";
function reproducirSonidoQuejido() {
  new Audio(SONIDO_QUEJIDO_SRC).play().catch(() => {});
}

const eliminationModalEl = document.getElementById("elimination-modal");
const eliminationModalSubEl = document.getElementById("elimination-modal-sub");

function mostrarEliminacion() {
  eliminationModalSubEl.textContent = "Perdiste tus 3 vidas. Saliendo de la cancha...";
  eliminationModalEl.hidden = false;
  setTimeout(() => {
    CIA.borrarSesion();
    window.location.href = "../index.html";
  }, 1800);
}

// Las tarjetas del roster se recrean enteras en cada renderPlayersRoster()
// (innerHTML = ""), así que no se les puede simplemente agregar/quitar una
// clase: guardamos qué clase está "brillando" por jugador y la reaplicamos
// cada vez que se reconstruye la tarjeta, hasta que expire.
//
// Se guarda junto con un token único por llamada (no solo el nombre de la
// clase) para que, si dos llamadas para el mismo jugador se superponen
// (por ejemplo el feedback local al presionar C y el "jugador_defendiendo"
// que confirma el servidor, casi al mismo tiempo), solo el timeout de la
// llamada más reciente pueda apagar la clase — comparar solo el nombre no
// alcanza porque ambas guardan el mismo string ("is-blocking").
const cardFlash = new Map(); // jugadorId -> { clase, token }

function marcarFeedback(jugadorId, clase, duracion) {
  const marcador = marcadoresJugadores.get(jugadorId);
  if (marcador) marcador.classList.add(clase);
  const token = Symbol();
  cardFlash.set(jugadorId, { clase, token });
  renderPlayersRoster();
  setTimeout(() => {
    const actual = cardFlash.get(jugadorId);
    if (actual && actual.token === token) {
      cardFlash.delete(jugadorId);
      if (marcador) marcador.classList.remove(clase);
      renderPlayersRoster();
    }
  }, duracion);
}

// Un golpe de C bloquea por DURACION_DEFENSA_MS y despues queda en cooldown
// por DEFENSA_COOLDOWN_MS: no se puede volver a activar hasta que termine
// esa espera (el servidor rechaza "defender" si llega antes de tiempo; este
// timestamp local solo evita mandar el pedido de antemano y mantiene el
// feedback visual sincronizado con esa ventana).
let defensaDisponibleEn = 0;

function activarDefensa() {
  if (Date.now() < defensaDisponibleEn) return;
  CIA.defender();
  marcarFeedback(miJugadorId, "is-blocking", DURACION_DEFENSA_MS);
  defensaDisponibleEn = Date.now() + DURACION_DEFENSA_MS + DEFENSA_COOLDOWN_MS;
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
  const center = cellCenter(active.r, active.c);
  const positions = {
    up: { x: center.x - 14, y: center.y - 57 },
    down: { x: center.x - 14, y: center.y + 29 },
    left: { x: center.x - 57, y: center.y - 14 },
    right: { x: center.x + 29, y: center.y - 14 },
  };
  Object.entries(positions).forEach(([direction, position]) => {
    movementButtons[direction].setAttribute("transform", `translate(${position.x} ${position.y})`);
    const { dr, dc } = DIRS[direction];
    const valid = active.r + dr >= 1 && active.r + dr <= INNER_ROWS && active.c + dc >= 1 && active.c + dc <= INNER_COLS;
    movementButtons[direction].classList.toggle("is-disabled", !valid);
  });
}

/* ---------------------------------------------------------------------- */
/* Selección de la casilla activa (en coordenadas EXTERIORES)             */
/* ---------------------------------------------------------------------- */
let active = { r: 4, c: 5 };
let highlightPts = scaledCellCorners(active.r, active.c, MARCADOR_ZOOM);
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
  animate(420, (t) => {
    const cur = fromPts.map((p, i) => lerp(p, newPts[i], t));
    highlightPoly.setAttribute("points", pointsToStr(cur));
  }, () => { highlightPts = newPts; });
}

const gallery = document.getElementById("image-gallery");
const galleryImage = document.getElementById("gallery-image");
const galleryCell = document.getElementById("gallery-cell");
const galleryCounter = document.getElementById("gallery-counter");
let galleryIndex = 0;

const SERIES_IMAGES = [
  "../assets/img/CANCHA%20FUTBOL/grilla%207x10.png",
  "../assets/img/CANCHA%20FUTBOL/CANCHA%20VACIA.png",
  "../assets/img/CANCHA%20FUTBOL/cancha%20medidas.png",
];
const seriesPorCelda = Array.from({ length: INNER_ROWS * INNER_COLS }, () => SERIES_IMAGES);

function actualizarGaleria() {
  const serie = seriesPorCelda[zoneNumber(active.r, active.c) - 1] || SERIES_IMAGES;
  galleryImage.src = serie[galleryIndex];
  galleryImage.alt = `Imagen ${galleryIndex + 1} de la casilla ${zoneNumber(active.r, active.c)}`;
  galleryCell.textContent = `Casilla ${zoneNumber(active.r, active.c)} · Fila ${active.r}, columna ${active.c}`;
  galleryCounter.textContent = `${galleryIndex + 1} / ${serie.length}`;
}

function abrirGaleria() {
  galleryIndex = 0;
  actualizarGaleria();
  gallery.hidden = false;
}

document.getElementById("gallery-close").addEventListener("click", () => { gallery.hidden = true; });
document.getElementById("gallery-prev").addEventListener("click", () => {
  const serie = seriesPorCelda[zoneNumber(active.r, active.c) - 1] || SERIES_IMAGES;
  galleryIndex = (galleryIndex - 1 + serie.length) % serie.length;
  actualizarGaleria();
});
document.getElementById("gallery-next").addEventListener("click", () => {
  const serie = seriesPorCelda[zoneNumber(active.r, active.c) - 1] || SERIES_IMAGES;
  galleryIndex = (galleryIndex + 1) % serie.length;
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
const minimapPlayersEl = document.getElementById("minimap-players");
const footerScoreEl = document.getElementById("footer-score");
const footerVidaEl = document.getElementById("footer-vida");
const footerCorazonesEl = document.getElementById("footer-corazones");
const samplePlayersEl = document.getElementById("sample-players");
const top5ListEl = document.getElementById("top5-list");
const characterPhotoImageEl = document.getElementById("character-photo-image");
const characterPhotoRegisteredEl = document.getElementById("character-photo-registered");
const characterPhotoCharacterEl = document.getElementById("character-photo-character");

function refreshStatus() {
  const n = zoneNumber(active.r, active.c);
  zoneNumberEl.textContent = n;
  zoneNumberEl.classList.remove("pulse");
  void zoneNumberEl.offsetWidth;
  zoneNumberEl.classList.add("pulse");

  const coordsText = `Fila ${active.r} · Columna ${active.c}`;
  zoneCoordsEl.textContent = coordsText;
  zoneDescEl.textContent = `${zoneDescription(active.r, active.c)} · celda ${n} de ${INNER_ROWS * INNER_COLS}`;

  minimapLocationEl.style.left = `${((active.c - 1) / INNER_COLS) * 100}%`;
  minimapLocationEl.style.top = `${((active.r - 1) / INNER_ROWS) * 100}%`;
  minimapCoordsEl.textContent = coordsText;
  minimapZoneEl.textContent = `ZONA ${n} / ${INNER_ROWS * INNER_COLS}`;
}

function refreshMinimapMarkers() {
  minimapPlayersEl.innerHTML = "";
  jugadoresMap.forEach((j) => {
    if (!j.conectado) return;
    const dot = document.createElement("span");
    dot.className = "minimap-player-dot" + (j.id === miJugadorId ? " is-self" : "");
    dot.style.left = `${((j.columna + 0.5) / INNER_COLS) * 100}%`;
    dot.style.top = `${((j.fila + 0.5) / INNER_ROWS) * 100}%`;
    dot.style.background = paletaPorId[j.color] || "#999";
    dot.title = j.nombre;
    minimapPlayersEl.appendChild(dot);
  });
}

function renderPlayersRoster() {
  const conectados = [...jugadoresMap.values()].filter((j) => j.conectado);
  samplePlayersEl.innerHTML = "";
  conectados.forEach((j) => {
    const hex = paletaPorId[j.color] || "#999";
    const esSelf = j.id === miJugadorId;
    const card = document.createElement("div");
    const flash = cardFlash.get(j.id);
    card.className = "player-bottom-card" + (esSelf ? " is-self" : "") + (flash ? " " + flash.clase : "");
    card.innerHTML = `
      <div class="player-image-frame" style="border-color:${hex};background:${hex}">
        <span class="player-color-choice" style="background:${hex}"></span>
        <img src="${PERSONAJE_SRC(j.personaje)}" alt="Personaje de ${j.nombre}">
      </div>
      <div class="player-bottom-info">
        <div class="player-bottom-name"><span>${j.nombre}</span><span>${esSelf ? "(tú)" : ""}</span></div>
        <div class="player-bottom-score"><span>Score</span><strong>${j.score}</strong></div>
        ${vidaBarHtml(j.vida)}
        <div class="corazones">${corazonesHtml(j.vidas)}</div>
      </div>`;
    samplePlayersEl.appendChild(card);
  });
  refreshMinimapMarkers();

  if (miJugadorId) {
    const yo = jugadoresMap.get(miJugadorId);
    if (yo) {
      footerVidaEl.innerHTML = vidaBarHtml(yo.vida);
      footerCorazonesEl.innerHTML = corazonesHtml(yo.vidas);
      actualizarColorFooterVida(yo.vida);
    }
  }
}

function renderTop5(top5) {
  top5ListEl.innerHTML = "";
  top5.forEach((j, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${index + 1}</td><td>${j.nombre}</td><td class="score-value">${j.score}</td>`;
    top5ListEl.appendChild(tr);
  });
}

function applyOwnPosition(r, c) {
  active = { r, c };
  tweenHighlightTo(scaledCellCorners(r, c, MARCADOR_ZOOM));
  const jugador = jugadoresMap.get(miJugadorId);
  if (jugador) {
    jugador.fila = r - 1;
    jugador.columna = c - 1;
    actualizarMarcadorJugador(jugador);
  }
  refreshStatus();
  refreshMovementButtons();
  refreshMinimapMarkers();
}

function requestMove(dr, dc) {
  if (!dr && !dc) return;
  const nr = active.r + dr, nc = active.c + dc;
  if (nr < 1 || nr > INNER_ROWS || nc < 1 || nc > INNER_COLS) return;
  CIA.mover(dr, dc);
}

/* ---------------------------------------------------------------------- */
/* Arranque: reclamar sesión, pedir estado inicial, montar la escena      */
/* ---------------------------------------------------------------------- */
let miJugadorId = null;
let paletaPorId = {};
const jugadoresMap = new Map();

async function iniciar() {
  if (!CIA.obtenerSesion()) {
    window.location.href = "../index.html";
    return;
  }

  const respuesta = await CIA.reclamarSesion();
  if (!respuesta.ok) {
    CIA.borrarSesion();
    window.location.href = "../index.html";
    return;
  }

  miJugadorId = respuesta.jugadorId;
  const estado = respuesta.estado;
  estado.config.paleta.forEach((c) => { paletaPorId[c.id] = c.hex; });
  estado.jugadores.forEach((j) => jugadoresMap.set(j.id, j));

  const miJugador = jugadoresMap.get(miJugadorId);
  characterPhotoImageEl.src = PERSONAJE_SRC(miJugador.personaje);
  characterPhotoRegisteredEl.textContent = miJugador.nombre;
  characterPhotoCharacterEl.textContent = miJugador.personaje;

  dibujarCancha();
  dibujarMarcoDecorativo();
  crearCeldas();
  jugadoresMap.forEach(actualizarMarcadorJugador);

  active = { r: miJugador.fila + 1, c: miJugador.columna + 1 };
  highlightPts = scaledCellCorners(active.r, active.c, MARCADOR_ZOOM);
  highlightPoly.setAttribute("points", pointsToStr(highlightPts));
  svg.setAttribute("viewBox", FIXED_VIEWBOX);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  refreshStatus();
  refreshMovementButtons();

  footerScoreEl.textContent = miJugador.score;
  renderPlayersRoster();
  renderTop5(estado.top5);

  conectarEventos();
}

function conectarEventos() {
  CIA.socket.on("jugador_movido", ({ id, fila, columna }) => {
    const j = jugadoresMap.get(id);
    if (j) { j.fila = fila; j.columna = columna; }
    if (id === miJugadorId) {
      applyOwnPosition(fila + 1, columna + 1);
    } else if (j) {
      actualizarMarcadorJugador(j);
      refreshMinimapMarkers();
    }
  });

  CIA.socket.on("jugador_actualizado", (jugador) => {
    const anterior = jugadoresMap.get(jugador.id);
    const actualizado = { ...anterior, ...jugador };
    jugadoresMap.set(jugador.id, actualizado);
    if (jugador.id === miJugadorId) {
      footerScoreEl.textContent = jugador.score;
      // El respawn en el centro llega por este evento (no por "jugador_movido"):
      // hay que resincronizar `active` para que movimiento/ataque sigan
      // partiendo de la posición real.
      if (anterior && (anterior.fila !== actualizado.fila || anterior.columna !== actualizado.columna)) {
        applyOwnPosition(actualizado.fila + 1, actualizado.columna + 1);
      }
    } else {
      actualizarMarcadorJugador(actualizado);
    }
    renderPlayersRoster();
  });

  CIA.socket.on("ataque_resuelto", ({ atacanteId, objetivoId, bloqueado, eliminado }) => {
    marcarFeedback(atacanteId, "is-attacking", DURACION_FEEDBACK_MS);
    marcarFeedback(objetivoId, bloqueado ? "is-blocked" : "is-hit", DURACION_FEEDBACK_MS);
    if (!bloqueado) reproducirSonidoQuejido();
    if (objetivoId === miJugadorId && eliminado) mostrarEliminacion();
  });

  CIA.socket.on("jugador_defendiendo", ({ id }) => {
    marcarFeedback(id, "is-blocking", DURACION_DEFENSA_MS);
  });

  CIA.socket.on("top5_actualizado", (top5) => renderTop5(top5));

  CIA.socket.on("jugador_nuevo", (jugador) => {
    jugadoresMap.set(jugador.id, jugador);
    actualizarMarcadorJugador(jugador);
    renderPlayersRoster();
  });

  CIA.socket.on("jugador_reconectado", (jugador) => {
    jugadoresMap.set(jugador.id, jugador);
    actualizarMarcadorJugador(jugador);
    renderPlayersRoster();
  });

  CIA.socket.on("jugador_desconectado", ({ id }) => {
    const j = jugadoresMap.get(id);
    if (j) j.conectado = false;
    actualizarMarcadorJugador(j || { id, conectado: false });
    renderPlayersRoster();
  });

  CIA.socket.on("estado_inicial", () => window.location.reload());
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
    reproducirSonidoGolpe();
    // Feedback local inmediato: "ataque_resuelto" solo llega del servidor si
    // el golpe conecta con alguien adyacente, así que sin esto no había
    // ningún resplandor al presionar X si no había rival al lado.
    marcarFeedback(miJugadorId, "is-attacking", DURACION_FEEDBACK_MS);
    CIA.atacar();
    return;
  }
  if (e.code === "KeyC") {
    e.preventDefault();
    if (e.repeat) return;
    activarDefensa();
    return;
  }
});

document.getElementById("btn-salir").addEventListener("click", () => {
  CIA.borrarSesion();
  window.location.href = "../index.html";
});

document.getElementById("minimap").addEventListener("click", (event) => {
  const bounds = event.currentTarget.getBoundingClientRect();
  const c = Math.min(INNER_COLS - 1, Math.floor(((event.clientX - bounds.left) / bounds.width) * INNER_COLS));
  const r = Math.min(INNER_ROWS - 1, Math.floor(((event.clientY - bounds.top) / bounds.height) * INNER_ROWS));
  requestMove((r + 1) - active.r, (c + 1) - active.c);
});

iniciar();
