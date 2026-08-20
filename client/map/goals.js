// Dibuja los dos puntos/metas en los extremos de la cancha (fondo y
// frente), como referencia visual de dónde hay que empujar el balón para
// marcar. Puramente decorativo — la detección real del gol vive en
// shared/geometry.js#checkGoal.
import { QUAD, GOAL_HALF_WIDTH, PLAYER_ONE_COLOR, PLAYER_TWO_COLOR } from "../../shared/constants.js";
import { quadPoint } from "../../shared/geometry.js";

const SVG_NS = "http://www.w3.org/2000/svg";
function el(tag, attrs = {}, parent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(node);
  return node;
}

export function drawGoals(goalsGroup) {
  // Meta del fondo (v=0): la defiende Jugador 2, la ataca Jugador 1.
  const fondoLeft = quadPoint(QUAD, 0.5 - GOAL_HALF_WIDTH, 0);
  const fondoRight = quadPoint(QUAD, 0.5 + GOAL_HALF_WIDTH, 0);
  const fondoLabelPos = quadPoint(QUAD, 0.5, 0.045);

  const fondoGroup = el("g", { class: "goal-marker" }, goalsGroup);
  el("line", { x1: fondoLeft.x, y1: fondoLeft.y, x2: fondoRight.x, y2: fondoRight.y, stroke: PLAYER_TWO_COLOR }, fondoGroup);
  el("text", { x: fondoLabelPos.x, y: fondoLabelPos.y, "font-size": 15 }, fondoGroup).textContent = "META J2";

  // Meta del frente (v=1): la defiende Jugador 1, la ataca Jugador 2.
  const frenteLeft = quadPoint(QUAD, 0.5 - GOAL_HALF_WIDTH, 1);
  const frenteRight = quadPoint(QUAD, 0.5 + GOAL_HALF_WIDTH, 1);
  const frenteLabelPos = quadPoint(QUAD, 0.5, 0.955);

  const frenteGroup = el("g", { class: "goal-marker" }, goalsGroup);
  el("line", { x1: frenteLeft.x, y1: frenteLeft.y, x2: frenteRight.x, y2: frenteRight.y, stroke: PLAYER_ONE_COLOR }, frenteGroup);
  el("text", { x: frenteLabelPos.x, y: frenteLabelPos.y, "font-size": 15 }, frenteGroup).textContent = "META J1";
}
