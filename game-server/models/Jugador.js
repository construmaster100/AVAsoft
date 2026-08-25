const mongoose = require("mongoose");

const jugadorSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    nombre: { type: String, required: true, trim: true },
    color: { type: String, required: true },
    personaje: { type: String, default: "BLUE" },
    vida: { type: Number, default: 25, min: 0, max: 25 },
    vidas: { type: Number, default: 3, min: 0, max: 3 },
    fila: { type: Number, default: 0 },
    columna: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Jugador", jugadorSchema);
