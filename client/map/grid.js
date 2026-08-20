// Líneas de la grilla de navegación (no son del terreno) y las celdas
// interactivas — hoy solo se usan de referencia visual, ya que la cámara
// sigue al personaje en vez de responder a clics sobre las celdas.
import { ROWS, COLS, QUAD } from "../../shared/constants.js";
import { quadPoint } from "../../shared/geometry.js";

const SVG_NS = "http://www.w3.org/2000/svg";
function el(tag, attrs = {}, parent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(node);
  return node;
}

export function drawGridLines(gridGroup) {
  for (let c = 1; c < COLS; c++) {
    const u = c / COLS;
    const p1 = quadPoint(QUAD, u, 0), p2 = quadPoint(QUAD, u, 1);
    el("line", { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, class: "grid-line" }, gridGroup);
  }
  for (let r = 1; r < ROWS; r++) {
    const v = r / ROWS;
    const p1 = quadPoint(QUAD, 0, v), p2 = quadPoint(QUAD, 1, v);
    el("line", { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, class: "grid-line" }, gridGroup);
  }
}
