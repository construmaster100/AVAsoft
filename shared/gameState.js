// Forma del estado de juego, como una fábrica de datos planos (sin clases,
// sin DOM) — el mismo shape que más adelante viajará por WebSocket entre
// cliente y servidor, así que se define una sola vez y ambos lados lo
// importan en lugar de duplicar la estructura.
import {
  CHARACTER_RADIUS, BALL_RADIUS,
  PLAYER_ONE_START, PLAYER_TWO_START, BALL_START,
} from "./constants.js";

export function createInitialState() {
  return {
    playerOne: { u: PLAYER_ONE_START.u, v: PLAYER_ONE_START.v, vu: 0, vv: 0, radius: CHARACTER_RADIUS },
    playerTwo: { u: PLAYER_TWO_START.u, v: PLAYER_TWO_START.v, vu: 0, vv: 0, radius: CHARACTER_RADIUS },
    ball: { u: BALL_START.u, v: BALL_START.v, vu: 0, vv: 0, radius: BALL_RADIUS },
    score: { playerOne: 0, playerTwo: 0 },
  };
}

export function resetPositions(state) {
  Object.assign(state.playerOne, { u: PLAYER_ONE_START.u, v: PLAYER_ONE_START.v, vu: 0, vv: 0 });
  Object.assign(state.playerTwo, { u: PLAYER_TWO_START.u, v: PLAYER_TWO_START.v, vu: 0, vv: 0 });
  Object.assign(state.ball, { u: BALL_START.u, v: BALL_START.v, vu: 0, vv: 0 });
}
