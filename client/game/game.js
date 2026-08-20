// Orquestador del juego de dos jugadores EN LÍNEA: el servidor es quien
// simula (física, colisión, goles) — este archivo solo manda el input
// local por socket y dibuja el último estado que el servidor devolvió. No
// hay física del lado del cliente: si el servidor no manda nada, nada se
// mueve en pantalla (así los dos navegadores ven siempre lo mismo).
import { QUAD } from "../../shared/constants.js";
import { blockBBox, bboxToViewBox } from "../../shared/geometry.js";

import { drawField } from "../map/field.js";
import { drawGridLines } from "../map/grid.js";
import { drawGoals } from "../map/goals.js";
import { createMinimap } from "../map/minimap.js";

import { createCharacterView } from "../entities/character.js";
import { createBallView } from "../entities/ball.js";

import { createMovementInput } from "../systems/movement.js";

const PLAYER_ONE_COLOR = "#2f6a8f";
const PLAYER_TWO_COLOR = "#e8a23d";

// Sesión: login.js valida contra una de las dos cuentas fijas y guarda el
// slot asignado. Sin slot no hay forma de unirse a la partida — al login.
const mySlot = sessionStorage.getItem("mySlot");
const myName = sessionStorage.getItem("myName");
if (!mySlot || !myName) {
  window.location.href = "../login/login.html";
}

const connectionBannerEl = document.getElementById("connection-banner");
function setConnectionMessage(text, isError = false) {
  connectionBannerEl.textContent = text;
  connectionBannerEl.classList.toggle("is-error", isError);
  connectionBannerEl.classList.toggle("is-visible", !!text);
}

const SVG_NS = "http://www.w3.org/2000/svg";
function el(tag, attrs = {}, parent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(node);
  return node;
}

const svg = document.getElementById("pitch-svg");
const sceneGroup = el("g", { class: "scene-group" }, svg);
const turfGroup = el("g", {}, sceneGroup);
const gridGroup = el("g", {}, sceneGroup);
const goalsGroup = el("g", {}, sceneGroup);
const entitiesGroup = el("g", {}, sceneGroup);

drawField(svg, turfGroup);
drawGridLines(gridGroup);
drawGoals(goalsGroup);

// Cámara fija sobre la cancha entera: con dos jugadores independientes no
// hay un solo personaje al que seguir, así que se ven los dos extremos
// (y las dos metas) todo el tiempo.
svg.setAttribute("viewBox", bboxToViewBox(blockBBox(QUAD, 1, 1, 0, 0, 1, 1)));

const playerOneView = createCharacterView(entitiesGroup, { id: "p1", playerId: "player-1", color: PLAYER_ONE_COLOR });
const playerTwoView = createCharacterView(entitiesGroup, { id: "p2", playerId: "player-2", color: PLAYER_TWO_COLOR });
const ballView = createBallView(entitiesGroup);

const minimap = createMinimap({
  playerOneDotEl: document.getElementById("minimap-p1-dot"),
  playerTwoDotEl: document.getElementById("minimap-p2-dot"),
  ballDotEl: document.getElementById("minimap-ball-dot"),
});

const scoreOneEl = document.getElementById("score-one");
const scoreTwoEl = document.getElementById("score-two");
const goalBannerEl = document.getElementById("goal-banner");
const playerOneNameEl = document.getElementById("player-one-name");
const playerTwoNameEl = document.getElementById("player-two-name");

function pulseScore(scoreEl) {
  scoreEl.classList.remove("pulse");
  void scoreEl.offsetWidth;
  scoreEl.classList.add("pulse");
}

let goalBannerTimeout = null;
function announceGoal(text) {
  goalBannerEl.textContent = text;
  goalBannerEl.classList.remove("is-visible");
  void goalBannerEl.offsetWidth;
  goalBannerEl.classList.add("is-visible");
  clearTimeout(goalBannerTimeout);
  goalBannerTimeout = setTimeout(() => goalBannerEl.classList.remove("is-visible"), 1600);
}

// Último estado recibido del servidor — game.js nunca lo calcula, solo lo
// pinta. Arranca en el centro de la cancha hasta que llegue el primer
// mensaje "state".
let renderState = {
  playerOne: { u: 0.5, v: 0.8 },
  playerTwo: { u: 0.5, v: 0.2 },
  ball: { u: 0.5, v: 0.5 },
  score: { playerOne: 0, playerTwo: 0 },
};

function render() {
  playerOneView.sync(renderState.playerOne);
  playerTwoView.sync(renderState.playerTwo);
  ballView.sync(renderState.ball);
  minimap.update(renderState);
}
render();

/* ---------------------------------------------------------------------- */
/* Conexión Socket.IO                                                     */
/* ---------------------------------------------------------------------- */
// `io` lo expone globalmente /socket.io/socket.io.js (cargado en game.html
// antes que este módulo) — servido automáticamente por el mismo servidor
// Express que atiende esta página.
const socket = io();

setConnectionMessage("Conectando al servidor…");

socket.on("connect", () => {
  socket.emit("join", { slot: mySlot, name: myName });
});

socket.on("join-error", ({ message }) => {
  setConnectionMessage(message || "No se pudo unir a la partida.", true);
});

socket.on("joined", ({ state, peers }) => {
  renderState = state;
  render();
  updatePeerStatus(peers);
});

socket.on("peer-status", updatePeerStatus);

function updatePeerStatus(peers) {
  playerOneNameEl.textContent = peers.playerOneName;
  playerTwoNameEl.textContent = peers.playerTwoName;
  const waitingForMe = mySlot === "playerOne" ? "playerTwoConnected" : "playerOneConnected";
  if (!peers[waitingForMe]) {
    setConnectionMessage(`Conectado. Esperando a ${mySlot === "playerOne" ? peers.playerTwoName : peers.playerOneName}…`);
  } else {
    setConnectionMessage("");
  }
}

socket.on("state", (state) => {
  renderState = state;
  scoreOneEl.textContent = state.score.playerOne;
  scoreTwoEl.textContent = state.score.playerTwo;
  render();
});

socket.on("goal", ({ scorer }) => {
  const name = scorer === "playerOne" ? playerOneNameEl.textContent : playerTwoNameEl.textContent;
  pulseScore(scorer === "playerOne" ? scoreOneEl : scoreTwoEl);
  announceGoal(`¡Gol de ${name}!`);
});

socket.on("disconnect", () => setConnectionMessage("Se perdió la conexión con el servidor…", true));

/* ---------------------------------------------------------------------- */
/* Input local: un solo jugador físico por dispositivo, así que WASD y     */
/* flechas controlan lo mismo — no hace falta repartir teclas.            */
/* ---------------------------------------------------------------------- */
const input = createMovementInput({
  KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right",
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
});

function sendInputLoop() {
  const { du, dv } = input.getAccelDirection();
  if (socket.connected) socket.emit("input", { du, dv });
  requestAnimationFrame(sendInputLoop);
}
requestAnimationFrame(sendInputLoop);
