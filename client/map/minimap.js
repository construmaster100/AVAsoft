// Minimapa: la cancha completa con tres puntos (Jugador 1, Jugador 2 y el
// balón) mostrando dónde está cada uno en tiempo real. En el modo de dos
// jugadores la cámara principal ya muestra la cancha completa, así que acá
// no hace falta el rectángulo de "ventana visible" del prototipo anterior.
export function createMinimap({ playerOneDotEl, playerTwoDotEl, ballDotEl }) {
  function update({ playerOne, playerTwo, ball }) {
    playerOneDotEl.style.left = `${playerOne.u * 100}%`;
    playerOneDotEl.style.top = `${playerOne.v * 100}%`;

    playerTwoDotEl.style.left = `${playerTwo.u * 100}%`;
    playerTwoDotEl.style.top = `${playerTwo.v * 100}%`;

    ballDotEl.style.left = `${ball.u * 100}%`;
    ballDotEl.style.top = `${ball.v * 100}%`;
  }

  return { update };
}
