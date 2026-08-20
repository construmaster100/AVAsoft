// El balón: círculo geométrico simple. Su posición/velocidad solo las
// escribe systems/collision.js — esta vista únicamente lee el estado y lo
// dibuja, nunca lo modifica.
import { quadPoint } from "../../shared/geometry.js";
import { QUAD, BALL_VISUAL_RADIUS } from "../../shared/constants.js";

const SVG_NS = "http://www.w3.org/2000/svg";
function el(tag, attrs = {}, parent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(node);
  return node;
}

export function createBallView(parentGroup) {
  const group = el("g", { class: "ball" }, parentGroup);
  el("circle", { class: "ball-body", r: BALL_VISUAL_RADIUS }, group);

  function sync(state) {
    const p = quadPoint(QUAD, state.u, state.v);
    group.setAttribute("transform", `translate(${p.x} ${p.y})`);
  }

  return { group, sync };
}
