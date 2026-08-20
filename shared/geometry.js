// Geometría pura del trapezoide de la cancha. Nada de DOM aquí tampoco:
// estas mismas funciones sirven para dibujar en el cliente y, más adelante,
// para que el servidor valide posiciones/colisiones con las mismas reglas.

export const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Interpolación bilineal dentro del trapezoide: u = 0..1 izquierda→derecha,
// v = 0..1 fondo→frente. Convierte coordenadas normalizadas de juego a
// unidades de píxel del viewBox.
export function quadPoint(quad, u, v) {
  const top = lerp(quad.TL, quad.TR, u);
  const bottom = lerp(quad.BL, quad.BR, u);
  return lerp(top, bottom, v);
}

// Esquinas (TL,TR,BR,BL) de un bloque de rSpan×cSpan celdas que arranca en
// la celda (r,c) de una grilla rows×cols.
export function blockCorners(quad, rows, cols, r, c, rSpan, cSpan) {
  const u0 = c / cols, u1 = (c + cSpan) / cols;
  const v0 = r / rows, v1 = (r + rSpan) / rows;
  return [
    quadPoint(quad, u0, v0), quadPoint(quad, u1, v0),
    quadPoint(quad, u1, v1), quadPoint(quad, u0, v1),
  ];
}

export function cellCorners(quad, rows, cols, r, c) {
  return blockCorners(quad, rows, cols, r, c, 1, 1);
}

export function blockBBox(quad, rows, cols, r, c, rSpan, cSpan) {
  const corners = blockCorners(quad, rows, cols, r, c, rSpan, cSpan);
  const xs = corners.map(p => p.x), ys = corners.map(p => p.y);
  return {
    minX: Math.min(...xs), maxX: Math.max(...xs),
    minY: Math.min(...ys), maxY: Math.max(...ys),
  };
}

export function bboxToViewBox(b) {
  return `${b.minX.toFixed(2)} ${b.minY.toFixed(2)} ${(b.maxX - b.minX).toFixed(2)} ${(b.maxY - b.minY).toFixed(2)}`;
}

export function pointsToStr(points) {
  return points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

// Origen (esquina superior-izquierda) de una ventana de viewRows×viewCols
// celdas que sigue a la celda (r,c), sin salirse nunca de la grilla.
export function viewportOrigin(rows, cols, viewRows, viewCols, r, c) {
  const rWin = clamp(r - Math.floor((viewRows - 1) / 2), 0, rows - viewRows);
  const cWin = clamp(c - Math.floor((viewCols - 1) / 2), 0, cols - viewCols);
  return { rWin, cWin };
}

// Colisión círculo-círculo en espacio normalizado u/v. Nota: u/v no es un
// espacio euclídeo real (el trapezoide distorsiona más cerca del fondo),
// así que esto es una aproximación deliberada para el primer prototipo
// jugable — suficiente para "personaje empuja balón", no para físicas
// exactas en toda la cancha.
export function circlesOverlap(a, b) {
  const dx = a.u - b.u, dy = a.v - b.v;
  const dist = Math.hypot(dx, dy);
  return { overlapping: dist < a.radius + b.radius, dist, dx, dy };
}

// ¿El balón entró en alguna de las dos metas (extremos de la cancha,
// v=0 fondo / v=1 frente)? Devuelve "fondo", "frente" o null.
export function checkGoal(ball, goalHalfWidth, goalLineDepth) {
  const withinGoalWidth = Math.abs(ball.u - 0.5) < goalHalfWidth;
  if (!withinGoalWidth) return null;
  if (ball.v - ball.radius < goalLineDepth) return "fondo";
  if (ball.v + ball.radius > 1 - goalLineDepth) return "frente";
  return null;
}
