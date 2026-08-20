// Regla fundamental del balón: nunca responde al input directamente. Solo
// cambia de velocidad cuando un personaje lo toca — este es el único
// módulo (cliente o servidor) con permiso para escribir ball.vu / ball.vv.
import { circlesOverlap } from "./geometry.js";
import { BALL_PUSH_FACTOR } from "./constants.js";

export function resolveCharacterBallCollision(character, ball) {
  const { overlapping, dist, dx, dy } = circlesOverlap(character, ball);
  if (!overlapping) return false;

  // Dirección de empuje: del personaje hacia el balón (si están exactamente
  // superpuestos, empuja "hacia adelante" en v como salida segura).
  const pushDir = dist > 1e-6
    ? { u: -dx / dist, v: -dy / dist }
    : { u: 0, v: 1 };

  const charSpeed = Math.hypot(character.vu, character.vv);
  const kick = Math.max(charSpeed, 0.05) * BALL_PUSH_FACTOR; // impulso mínimo aunque el personaje esté casi quieto

  ball.vu = pushDir.u * kick;
  ball.vv = pushDir.v * kick;

  // Separa el balón del personaje para que no queden pegados empujándose
  // en cada frame (resolución de penetración).
  const minDist = character.radius + ball.radius;
  const overlapAmount = minDist - dist;
  if (overlapAmount > 0) {
    ball.u += pushDir.u * overlapAmount;
    ball.v += pushDir.v * overlapAmount;
  }

  return true;
}
