const mongoose = require("mongoose");

const celdaSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true },
    fila: { type: Number, required: true },
    columna: { type: Number, required: true },
    marca: { type: String, default: null },
    color: { type: String, default: null },
    jugadorId: { type: String, default: null },
    puntosOtorgados: { type: Boolean, default: false },
  },
  { _id: false }
);

// Documento único (id fijo "tablero"): el tablero es un solo estado
// compartido por todos los jugadores de la sala, no algo por jugador.
const tableroSchema = new mongoose.Schema({
  _id: { type: String, default: "tablero" },
  celdas: { type: [celdaSchema], default: [] },
});

module.exports = mongoose.model("Tablero", tableroSchema);
