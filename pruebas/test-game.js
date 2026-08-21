const { io } = require("socket.io-client");

function connect() {
  return io("http://localhost:4000", { transports: ["websocket"] });
}
function emit(socket, evt, payload) {
  return new Promise((resolve) => socket.emit(evt, payload, resolve));
}
function once(socket, evt) {
  return new Promise((resolve) => socket.once(evt, resolve));
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function assert(cond, msg) {
  if (!cond) { console.error("FAIL:", msg); process.exitCode = 1; }
  else console.log("ok:", msg);
}

(async () => {
  const s1 = connect();
  const s2 = connect();
  await Promise.all([once(s1, "connect"), once(s2, "connect")]);

  const r1 = await emit(s1, "unirse", { nombre: "Carlos", color: "verde" });
  assert(r1.ok, "jugador 1 se une con color verde");
  const j1id = r1.jugadorId;

  const rDup = await emit(s2, "unirse", { nombre: "Pedro", color: "verde" });
  assert(rDup.ok === false, "color repetido es rechazado: " + JSON.stringify(rDup));

  const r2 = await emit(s2, "unirse", { nombre: "Pedro", color: "azul" });
  assert(r2.ok, "jugador 2 se une con color azul");
  const j2id = r2.jugadorId;

  assert(r1.estado.tablero.length === 70, "tablero tiene 70 celdas");
  assert(r1.estado.config.rows === 7 && r1.estado.config.cols === 10, "grilla es 7x10");

  const p1antes = r1.estado.jugadores.find((j) => j.id === j1id);
  const movePromise = once(s1, "jugador_movido");
  s1.emit("mover", { dr: 1, dc: 0 });
  const movido = await movePromise;
  assert(movido.id === j1id && movido.fila === p1antes.fila + 1, "jugador 1 se mueve una fila hacia abajo");

  // mover fuera de los límites: intentar 100 filas -> el servidor no debe emitir jugador_movido para eso
  let eventoInesperado = false;
  const guard = (payload) => { if (payload.id === j1id) eventoInesperado = true; };
  s1.on("jugador_movido", guard);
  s1.emit("mover", { dr: 100, dc: 0 });
  await sleep(150);
  s1.off("jugador_movido", guard);
  assert(!eventoInesperado, "movimiento fuera de límites es ignorado por el servidor");

  const celdaId = 25;
  const marcaPromise = once(s2, "celda_actualizada");
  const scorePromise = once(s2, "jugador_actualizado");
  s1.emit("marcar", { celdaId, marca: "X" });
  const celda = await marcaPromise;
  const jugadorActualizado = await scorePromise;
  assert(celda.id === celdaId && celda.marca === "X", "celda 25 queda marcada con X");
  assert(jugadorActualizado.id === j1id && jugadorActualizado.score === 3, "jugador 1 gana 3 puntos por la primera marca: score=" + jugadorActualizado.score);

  // re-marcar la misma celda SÍ debe volver a sumar puntos (aunque ya esté tachada)
  const reMarcaScorePromise = once(s2, "jugador_actualizado");
  s1.emit("marcar", { celdaId, marca: "O" });
  const jugadorTrasRemarcar = await reMarcaScorePromise;
  assert(jugadorTrasRemarcar.id === j1id && jugadorTrasRemarcar.score === 6, "re-marcar la misma celda vuelve a otorgar puntos: score=" + jugadorTrasRemarcar.score);

  const top5 = await emit(s2, "observar", {});
  assert(top5.top5[0].id === j1id && top5.top5[0].score === 6, "TOP5 refleja el puntaje de jugador 1");

  // cambiar color de celda (jugador 2 pinta la celda 25, ya marcada por jugador 1)
  const colorPromise = once(s1, "celda_actualizada");
  s2.emit("cambiar_color_celda", { celdaId });
  const celdaPintada = await colorPromise;
  // la celda fue re-marcada como "O" en el paso anterior (mismo jugador, sin
  // puntaje extra); lo que valida RF-19 acá es que pintar no borra la marca.
  assert(celdaPintada.color === "azul" && celdaPintada.marca === "O", "jugador 2 pinta la celda 25 sin borrar la marca (RF-19)");

  // volver a presionar el propio color decolora la celda al estado original
  // y penaliza con -2 puntos a quien marcó la celda (jugador 1, no jugador 2)
  const penalizacionPromise = once(s1, "jugador_actualizado");
  const decolorPromise = once(s1, "celda_actualizada");
  s2.emit("cambiar_color_celda", { celdaId });
  const celdaDecolorada = await decolorPromise;
  const jugadorPenalizado = await penalizacionPromise;
  assert(celdaDecolorada.color === null, "presionar el mismo color de nuevo decolora la celda al estado original");
  assert(jugadorPenalizado.id === j1id && jugadorPenalizado.score === 4, "decolorar penaliza con -2 al jugador que marcó la celda: score=" + jugadorPenalizado.score);

  // reconexión: nueva conexión con el mismo jugadorId no debe crear un jugador duplicado
  s1.disconnect();
  await sleep(50);
  const s1b = connect();
  await once(s1b, "connect");
  const r1b = await emit(s1b, "unirse", { nombre: "Carlos", color: "verde", jugadorId: j1id });
  assert(r1b.ok && r1b.jugadorId === j1id, "reconexión reclama el mismo jugadorId");
  assert(r1b.estado.jugadores.filter((j) => j.color === "verde").length === 1, "no se duplica el jugador al reconectar");
  assert(r1b.estado.jugadores.find((j) => j.id === j1id).score === 4, "el score se conserva tras la reconexión");

  console.log("\nTodas las verificaciones terminaron.");
  s1b.disconnect();
  s2.disconnect();
  process.exit();
})().catch((err) => {
  console.error("ERROR EN TEST:", err);
  process.exit(1);
});
