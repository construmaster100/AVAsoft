// El personaje: por ahora una entidad geométrica simple (círculo + marca de
// dirección), sin sprite. id/playerId quedan previstos para cuando existan
// varios jugadores sincronizados por WebSocket — hoy solo se usa "local".
import { quadPoint } from "../../shared/geometry.js";
import { QUAD, CHARACTER_VISUAL_RADIUS } from "../../shared/constants.js";

const SVG_NS = "http://www.w3.org/2000/svg";
function el(tag, attrs = {}, parent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(node);
  return node;
}

export function createCharacterView(parentGroup, { id = "local", playerId = "player-1", color = "#2f6a8f" } = {}) {
  const group = el("g", { class: "character", "data-id": id, "data-player-id": playerId }, parentGroup);
  el("circle", { class: "character-body", r: CHARACTER_VISUAL_RADIUS, fill: color }, group);
  // Pequeño triángulo que apunta en la dirección de movimiento.
  const dirMark = el("polygon", {
    class: "character-dir",
    points: `0,${-CHARACTER_VISUAL_RADIUS - 6} 5,${-CHARACTER_VISUAL_RADIUS + 2} -5,${-CHARACTER_VISUAL_RADIUS + 2}`,
  }, group);

  function sync(state) {
    const p = quadPoint(QUAD, state.u, state.v);
    const speed = Math.hypot(state.vu, state.vv);
    if (speed > 0.01) {
      const angleDeg = (Math.atan2(state.vu, -state.vv) * 180) / Math.PI;
      group.setAttribute("transform", `translate(${p.x} ${p.y}) rotate(${angleDeg})`);
      dirMark.style.opacity = "1";
    } else {
      group.setAttribute("transform", `translate(${p.x} ${p.y})`);
    }
  }

  return { group, sync };
}
