const crypto = require("crypto");

const ROWS = 7;
const COLS = 10;
const TOTAL_CELDAS = ROWS * COLS;
const MAX_JUGADORES = 20;
const PUNTOS_POR_CELDA = 3;
const MS_ANTES_DE_LIBERAR_COLOR = 8000;

const PALETA = [
  { id: "rojo", nombre: "Rojo", hex: "#e63946" },
  { id: "azul", nombre: "Azul", hex: "#2f6a8f" },
  { id: "verde", nombre: "Verde", hex: "#2f9e44" },
  { id: "amarillo", nombre: "Amarillo", hex: "#f4b400" },
  { id: "naranja", nombre: "Naranja", hex: "#ef6c1a" },
  { id: "morado", nombre: "Morado", hex: "#7b4fd6" },
  { id: "rosa", nombre: "Rosa", hex: "#e0559c" },
  { id: "cian", nombre: "Cian", hex: "#17a2b8" },
  { id: "blanco", nombre: "Blanco", hex: "#f5f5f5" },
  { id: "negro", nombre: "Negro", hex: "#1c1c1c" },
];
const PALETA_IDS = new Set(PALETA.map((c) => c.id));

function crearTablero() {
  const tablero = [];
  for (let i = 0; i < TOTAL_CELDAS; i++) {
    tablero.push({
      id: i + 1,
      fila: Math.floor(i / COLS),
      columna: i % COLS,
      marca: null,
      color: null,
      jugadorId: null,
      puntosOtorgados: false,
    });
  }
  return tablero;
}

class GameState {
  constructor() {
    this.jugadores = new Map(); // jugadorId -> jugador
    this.tablero = crearTablero();
    this.timersDesconexion = new Map(); // jugadorId -> Timeout
  }

  colorEnUso(colorId, excluirJugadorId) {
    for (const jugador of this.jugadores.values()) {
      if (jugador.id === excluirJugadorId) continue;
      if (jugador.conectado && jugador.color === colorId) return true;
    }
    return false;
  }

  jugadoresConectados() {
    return [...this.jugadores.values()].filter((j) => j.conectado).length;
  }

  serializarJugador(jugador) {
    const { id, nombre, color, fila, columna, score, conectado, ultimaAccion } = jugador;
    return { id, nombre, color, fila, columna, score, conectado, ultimaAccion };
  }

  serializarEstado() {
    return {
      config: { rows: ROWS, cols: COLS, total: TOTAL_CELDAS, paleta: PALETA, puntosPorCelda: PUNTOS_POR_CELDA },
      jugadores: [...this.jugadores.values()].map((j) => this.serializarJugador(j)),
      tablero: this.tablero,
      top5: this.top5(),
    };
  }

  top5() {
    return [...this.jugadores.values()]
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((j) => ({ id: j.id, nombre: j.nombre, color: j.color, score: j.score }));
  }

  unirse({ nombre, color, jugadorId }) {
    if (jugadorId && this.jugadores.has(jugadorId)) {
      const jugador = this.jugadores.get(jugadorId);
      const timer = this.timersDesconexion.get(jugadorId);
      if (timer) {
        clearTimeout(timer);
        this.timersDesconexion.delete(jugadorId);
      }
      jugador.conectado = true;
      jugador.ultimaAccion = Date.now();
      return { ok: true, jugador, esNuevo: false };
    }

    const nombreLimpio = String(nombre || "").trim().slice(0, 20);
    if (!nombreLimpio) return { ok: false, motivo: "Ingresa un nombre de usuario." };
    if (!PALETA_IDS.has(color)) return { ok: false, motivo: "Elige un color válido." };
    if (this.colorEnUso(color)) return { ok: false, motivo: "Ese color ya está en uso por otro jugador conectado." };
    if (this.jugadoresConectados() >= MAX_JUGADORES) {
      return { ok: false, motivo: `La sala está llena (máximo ${MAX_JUGADORES} jugadores).` };
    }

    const jugador = {
      id: crypto.randomUUID(),
      nombre: nombreLimpio,
      color,
      fila: Math.floor(Math.random() * ROWS),
      columna: Math.floor(Math.random() * COLS),
      score: 0,
      conectado: true,
      ultimaAccion: Date.now(),
    };
    this.jugadores.set(jugador.id, jugador);
    return { ok: true, jugador, esNuevo: true };
  }

  desconectar(jugadorId) {
    const jugador = this.jugadores.get(jugadorId);
    if (!jugador) return;
    jugador.conectado = false;
    jugador.ultimaAccion = Date.now();
    const timer = setTimeout(() => {
      this.timersDesconexion.delete(jugadorId);
    }, MS_ANTES_DE_LIBERAR_COLOR);
    this.timersDesconexion.set(jugadorId, timer);
  }

  mover(jugadorId, dr, dc) {
    const jugador = this.jugadores.get(jugadorId);
    if (!jugador || !jugador.conectado) return { ok: false };
    const nr = jugador.fila + dr;
    const nc = jugador.columna + dc;
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return { ok: false };
    jugador.fila = nr;
    jugador.columna = nc;
    jugador.ultimaAccion = Date.now();
    return { ok: true, jugador };
  }

  marcar(jugadorId, celdaId, marca) {
    const jugador = this.jugadores.get(jugadorId);
    if (!jugador || !jugador.conectado) return { ok: false };
    if (!Number.isInteger(celdaId) || celdaId < 1 || celdaId > TOTAL_CELDAS) return { ok: false };
    if (marca !== "X" && marca !== "O") return { ok: false };

    const celda = this.tablero[celdaId - 1];
    celda.marca = marca;
    celda.jugadorId = jugadorId;
    let puntajeCambio = false;
    if (!celda.puntosOtorgados) {
      celda.puntosOtorgados = true;
      jugador.score += PUNTOS_POR_CELDA;
      puntajeCambio = true;
    }
    jugador.ultimaAccion = Date.now();
    return { ok: true, celda, jugador, puntajeCambio };
  }

  cambiarColorCelda(jugadorId, celdaId) {
    const jugador = this.jugadores.get(jugadorId);
    if (!jugador || !jugador.conectado) return { ok: false };
    if (!Number.isInteger(celdaId) || celdaId < 1 || celdaId > TOTAL_CELDAS) return { ok: false };

    const celda = this.tablero[celdaId - 1];
    celda.color = jugador.color;
    celda.jugadorId = jugadorId;
    jugador.ultimaAccion = Date.now();
    return { ok: true, celda };
  }

  reiniciar() {
    this.tablero = crearTablero();
    for (const jugador of this.jugadores.values()) jugador.score = 0;
  }
}

module.exports = { GameState, ROWS, COLS, TOTAL_CELDAS, MAX_JUGADORES, PALETA, PUNTOS_POR_CELDA };
