// Traduce input de teclado en una dirección de aceleración para UN
// personaje. No toca posiciones ni velocidades directamente — eso es
// trabajo de physics.js. Cada jugador tiene su propio mapa de teclas, así
// que dos personajes pueden moverse a la vez en el mismo teclado.
const DIR_VECTOR = {
  up:    { du: 0, dv: -1 },
  down:  { du: 0, dv:  1 },
  left:  { du: -1, dv: 0 },
  right: { du:  1, dv: 0 },
};

export const WASD_KEYS = { KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right" };
export const ARROW_KEYS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };

export function createMovementInput(keyMap) {
  const pressed = new Set();

  window.addEventListener("keydown", (e) => {
    const dir = keyMap[e.code];
    if (!dir) return;
    e.preventDefault();
    pressed.add(dir);
  });
  window.addEventListener("keyup", (e) => {
    const dir = keyMap[e.code];
    if (!dir) return;
    pressed.delete(dir);
  });

  // Vector unitario (o {0,0} si no hay input) con la dirección deseada,
  // combinando todas las teclas de este jugador presionadas a la vez.
  function getAccelDirection() {
    let du = 0, dv = 0;
    pressed.forEach((dir) => {
      du += DIR_VECTOR[dir].du;
      dv += DIR_VECTOR[dir].dv;
    });
    const len = Math.hypot(du, dv);
    if (len === 0) return { du: 0, dv: 0 };
    return { du: du / len, dv: dv / len };
  }

  return { getAccelDirection };
}
