// Integración de velocidad → posición para cualquier "body" con
// {u, v, vu, vv, radius}. Sin DOM: la usa tanto el cliente (para
// renderizar) como el servidor (autoritativo) con exactamente las mismas
// reglas de fricción y límites de cancha.
import { clamp } from "./geometry.js";

export function applyAccel(body, du, dv, accel, maxSpeed, dt) {
  body.vu += du * accel * dt;
  body.vv += dv * accel * dt;
  const speed = Math.hypot(body.vu, body.vv);
  if (speed > maxSpeed) {
    const k = maxSpeed / speed;
    body.vu *= k;
    body.vv *= k;
  }
}

export function integrate(body, friction, dt) {
  body.u += body.vu * dt;
  body.v += body.vv * dt;

  // Fricción exponencial (independiente del framerate): a mayor `friction`,
  // más rápido se detiene el cuerpo al dejar de recibir aceleración.
  const damp = Math.exp(-friction * dt);
  body.vu *= damp;
  body.vv *= damp;

  // Límite del campo: clamp simple en espacio u/v (aproximado — no sigue
  // el contorno exacto del trapezoide, ver nota en geometry.js).
  const before = { u: body.u, v: body.v };
  body.u = clamp(body.u, body.radius, 1 - body.radius);
  body.v = clamp(body.v, body.radius, 1 - body.radius);
  if (body.u !== before.u) body.vu = 0;
  if (body.v !== before.v) body.vv = 0;
}
