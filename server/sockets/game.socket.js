// Estado autoritativo de la partida 1v1 (un solo partido fijo, sin salas:
// las dos cuentas fijas del login ya hacen de "código de sala"). Usa las
// mismas reglas de física/colisión/gol que el cliente porque son módulos
// puros en shared/ — el cliente ya no simula nada, solo manda su input y
// dibuja lo que el servidor le devuelve.
//
// server.js es CommonJS y shared/ está escrito como ES modules (para poder
// importarse tal cual en el navegador con <script type="module">), así que
// acá se cargan con import() dinámico en vez de require().
const path = require("path");
const { pathToFileURL } = require("url");

const TICK_MS = 1000 / 30; // 30 actualizaciones por segundo

async function loadShared() {
  const sharedDir = path.join(__dirname, "..", "..", "shared");
  // pathToFileURL hace el percent-encoding correcto (la ruta tiene espacios:
  // "D:\FIFA 27\shared\..."), a diferencia de armar el string a mano.
  const toFileUrl = (name) => pathToFileURL(path.join(sharedDir, name)).href;
  const [constants, geometry, physics, collision, gameState] = await Promise.all([
    import(toFileUrl("constants.js")),
    import(toFileUrl("geometry.js")),
    import(toFileUrl("physics.js")),
    import(toFileUrl("collision.js")),
    import(toFileUrl("gameState.js")),
  ]);
  return { constants, geometry, physics, collision, gameState };
}

function createGameRoom(shared) {
  const {
    constants: { GOAL_HALF_WIDTH, GOAL_LINE_DEPTH, CHARACTER_ACCEL, CHARACTER_MAX_SPEED, CHARACTER_FRICTION, BALL_FRICTION },
    geometry: { checkGoal },
    physics: { applyAccel, integrate },
    collision: { resolveCharacterBallCollision },
    gameState: { createInitialState, resetPositions },
  } = shared;

  const state = createInitialState();
  const slots = { playerOne: null, playerTwo: null }; // socket.id ocupando cada slot
  const names = { playerOne: "Jugador 1", playerTwo: "Jugador 2" };
  const inputs = { playerOne: { du: 0, dv: 0 }, playerTwo: { du: 0, dv: 0 } };

  function otherSlot(slot) { return slot === "playerOne" ? "playerTwo" : "playerOne"; }

  function peerStatus() {
    return {
      playerOneConnected: !!slots.playerOne,
      playerTwoConnected: !!slots.playerTwo,
      playerOneName: names.playerOne,
      playerTwoName: names.playerTwo,
    };
  }

  function snapshot() {
    return {
      playerOne: { u: state.playerOne.u, v: state.playerOne.v },
      playerTwo: { u: state.playerTwo.u, v: state.playerTwo.v },
      ball: { u: state.ball.u, v: state.ball.v },
      score: { ...state.score },
    };
  }

  function join(io, socket, slot, name) {
    if (slot !== "playerOne" && slot !== "playerTwo") {
      socket.emit("join-error", { message: "Slot inválido." });
      return;
    }
    const occupant = slots[slot];
    if (occupant && occupant !== socket.id) {
      socket.emit("join-error", { message: `${name || slot} ya está conectado desde otro dispositivo.` });
      return;
    }

    slots[slot] = socket.id;
    names[slot] = name || names[slot];
    socket.data.slot = slot;
    socket.join("match");

    socket.emit("joined", { slot, state: snapshot(), peers: peerStatus() });
    io.to("match").emit("peer-status", peerStatus());
  }

  function setInput(socket, du, dv) {
    const slot = socket.data.slot;
    if (!slot) return;
    // Clamp defensivo: el cliente ya manda un vector unitario, pero el
    // servidor es quien manda — nunca confiar ciegamente en el input.
    const len = Math.hypot(du, dv) || 1;
    const k = Math.min(1, 1 / len);
    inputs[slot] = { du: du * k, dv: dv * k };
  }

  function leave(io, socket) {
    const slot = socket.data.slot;
    if (!slot) return;
    if (slots[slot] === socket.id) {
      slots[slot] = null;
      inputs[slot] = { du: 0, dv: 0 };
    }
    io.to("match").emit("peer-status", peerStatus());

    // Si ambos se fueron, reiniciar el partido para el próximo par.
    if (!slots.playerOne && !slots.playerTwo) {
      resetPositions(state);
      state.score.playerOne = 0;
      state.score.playerTwo = 0;
    }
  }

  function tick(io) {
    applyAccel(state.playerOne, inputs.playerOne.du, inputs.playerOne.dv, CHARACTER_ACCEL, CHARACTER_MAX_SPEED, TICK_MS / 1000);
    integrate(state.playerOne, CHARACTER_FRICTION, TICK_MS / 1000);

    applyAccel(state.playerTwo, inputs.playerTwo.du, inputs.playerTwo.dv, CHARACTER_ACCEL, CHARACTER_MAX_SPEED, TICK_MS / 1000);
    integrate(state.playerTwo, CHARACTER_FRICTION, TICK_MS / 1000);

    integrate(state.ball, BALL_FRICTION, TICK_MS / 1000);
    resolveCharacterBallCollision(state.playerOne, state.ball);
    resolveCharacterBallCollision(state.playerTwo, state.ball);

    const side = checkGoal(state.ball, GOAL_HALF_WIDTH, GOAL_LINE_DEPTH);
    let goalEvent = null;
    if (side) {
      if (side === "fondo") { state.score.playerOne += 1; goalEvent = "playerOne"; }
      else { state.score.playerTwo += 1; goalEvent = "playerTwo"; }
      resetPositions(state);
    }

    if (slots.playerOne || slots.playerTwo) {
      io.to("match").emit("state", snapshot());
      if (goalEvent) io.to("match").emit("goal", { scorer: goalEvent, score: { ...state.score } });
    }
  }

  return { join, setInput, leave, tick };
}

async function attachGameSockets(io) {
  const shared = await loadShared();
  const room = createGameRoom(shared);

  io.on("connection", (socket) => {
    socket.on("join", ({ slot, name } = {}) => room.join(io, socket, slot, name));
    socket.on("input", ({ du, dv } = {}) => {
      if (typeof du === "number" && typeof dv === "number") room.setInput(socket, du, dv);
    });
    socket.on("disconnect", () => room.leave(io, socket));
  });

  setInterval(() => room.tick(io), TICK_MS);
  console.log(`Sockets de juego listos (tick cada ${TICK_MS.toFixed(1)}ms)`);
}

module.exports = attachGameSockets;
