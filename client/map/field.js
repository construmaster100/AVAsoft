// Dibuja la imagen real de la cancha, recortada al trapezoide del campo.
import { QUAD, VIEWBOX_WIDTH, VIEWBOX_HEIGHT, IMAGE_SRC } from "../../shared/constants.js";
import { pointsToStr } from "../../shared/geometry.js";

const SVG_NS = "http://www.w3.org/2000/svg";
function el(tag, attrs = {}, parent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(node);
  return node;
}

export function drawField(svg, turfGroup) {
  const defs = el("defs", {}, svg);
  const clip = el("clipPath", { id: "field-clip" }, defs);
  el("polygon", { points: pointsToStr([QUAD.TL, QUAD.TR, QUAD.BR, QUAD.BL]) }, clip);
  el("image", {
    href: IMAGE_SRC,
    x: 0, y: 0, width: VIEWBOX_WIDTH, height: VIEWBOX_HEIGHT,
    preserveAspectRatio: "none",
    "clip-path": "url(#field-clip)",
  }, turfGroup);
}
