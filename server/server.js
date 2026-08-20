require("dotenv").config();
const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const attachConnection = require("./sockets/connection");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Sirve el sitio estático (index.html, client/, shared/, assets/, pages/)
// desde el mismo origen que la API y los sockets, así el juego puede pedir
// /socket.io/socket.io.js sin configurar CORS aparte.
app.use(express.static(path.join(__dirname, "..")));

app.get("/api", (req, res) => {
    res.json({
        mensaje: "Servidor AVAsena funcionando"
    });
});

app.use("/api/aprendices", require("./routes/aprendices"));
app.use("/api/resultados", require("./routes/resultados"));

const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });
attachConnection(io);

httpServer.listen(PORT, () => {
    console.log(`Servidor AVAsena ejecutándose en http://localhost:${PORT}`);
});

// La conexión a MongoDB ya no bloquea el arranque del servidor: si la base
// de datos no está disponible, las rutas que la usan van a fallar, pero el
// resto del sitio (incluida la cancha con sockets) sigue funcionando.
connectDB().catch((err) => {
    console.error("MongoDB no disponible, el resto del servidor sigue arriba:", err.message);
});

