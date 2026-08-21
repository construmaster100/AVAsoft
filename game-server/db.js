const mongoose = require("mongoose");

// La persistencia es opcional: si no hay MONGODB_URI, o si Atlas no
// responde, el servidor sigue funcionando solo en memoria en vez de morir.
async function conectarMongo() {
  if (!process.env.MONGODB_URI) {
    console.warn("MONGODB_URI no está definido — CIA corre solo en memoria (sin persistencia).");
    return false;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: "cia-cr7" });
    console.log("CIA: MongoDB conectado (persistencia activa).");
    return true;
  } catch (err) {
    console.error("CIA: no se pudo conectar a MongoDB, sigue solo en memoria:", err.message);
    return false;
  }
}

module.exports = { conectarMongo };
