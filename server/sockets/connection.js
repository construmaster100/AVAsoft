// Punto de entrada de Socket.IO: hoy solo conecta el socket del juego de la
// cancha, pero queda separado de game.socket.js para que salas de otro tipo
// (chat, notificaciones del LMS, etc.) puedan sumarse acá sin tocar la
// lógica del juego.
const attachGameSockets = require("./game.socket");

module.exports = function attachConnection(io) {
  attachGameSockets(io).catch((err) => {
    console.error("No se pudieron montar los sockets del juego:", err);
  });
};
