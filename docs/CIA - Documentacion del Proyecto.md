# CIA — Cancha Interactiva Asincrónica «CR7»
## Documentación técnica del proyecto

**Fecha:** 21 de agosto de 2026
**Repositorio:** `construmaster100/AVAsoft`, rama `cancha-svg-viewport`
**Autor de esta implementación:** desarrollada con asistencia de Claude Code (Anthropic)

---

## 1. Identificación del sistema

| Campo | Valor |
|---|---|
| Nombre | CIA — Cancha Interactiva Asincrónica «CR7» |
| Tipo de sistema | Aplicación web multijugador en tiempo real |
| Modelo de interacción | Cliente–servidor con estado compartido y sincronización bidireccional |
| Interfaz | HTML5, CSS3, JavaScript (sin frameworks de frontend) |
| Servidor | Node.js con Express |
| Comunicación en tiempo real | Socket.IO (WebSocket, con reintento y respaldo por polling) |
| Persistencia | En memoria (sin base de datos) |
| Despliegue | Render.com (plan gratuito) |

---

## 2. Tipo de sistema utilizado

El sistema es una **aplicación web multijugador de tiempo real**, con arquitectura **cliente–servidor autoritativa**: el servidor Node.js es la única fuente de verdad del estado de la partida (posición de los jugadores, marcas, colores de celda, puntajes); los navegadores conectados nunca deciden el resultado de una acción por sí mismos, solo la solicitan y renderizan lo que el servidor confirma.

La sincronización entre clientes se resuelve mediante **Socket.IO**, una librería sobre WebSocket con reconexión automática y compatibilidad con distintos entornos de red. Se optó por **juego libre/concurrente** en lugar de turnos estrictos: cada jugador se desplaza y actúa en cualquier momento, de forma asincrónica respecto de los demás (coherente con el nombre del proyecto), mientras el servidor valida cada acción de forma independiente.

No se utiliza base de datos: todo el estado de la partida vive en memoria del proceso Node.js (`game-server/gameState.js`), lo que es suficiente para el alcance actual y evita depender de infraestructura adicional. Esto implica que el estado se reinicia si el proceso del servidor se reinicia (por ejemplo, por inactividad en el plan gratuito de Render).

---

## 3. Arquitectura del sistema

```
                    GITHUB (rama cancha-svg-viewport)
                                  │
                                  ▼
                    RENDER.COM (Web Service, Node.js)
                                  │
                                  ▼
                 game-server/index.js  (Express + Socket.IO)
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
              Archivos        Eventos      GameState
              estáticos       Socket.IO    (en memoria)
           (/, /assets,     unirse, mover,  game-server/
              /pages)        marcar, etc.   gameState.js
                    │             │             │
                    └─────────────┼─────────────┘
                                  ▼
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
               Navegador       Navegador     Navegador
               Jugador 1       Jugador 2     Jugador N
```

### 3.1 Componentes del servidor

- **`game-server/index.js`** — servidor HTTP (Express) + servidor de sockets (Socket.IO). Sirve los archivos estáticos del sitio (`index.html`, `assets/`, `pages/`) y expone los manejadores de eventos en tiempo real. Es independiente del backend original del proyecto (`server/`, orientado a un sistema de gestión académica no relacionado con la cancha).
- **`game-server/gameState.js`** — módulo con el modelo de datos y toda la lógica de negocio: alta de jugadores, validación de movimientos, marcado de celdas, cálculo de puntaje, ranking y reinicio de partida. No depende de Express ni de Socket.IO: es lógica pura, fácil de probar de forma aislada.

### 3.2 Componentes del cliente

- **`index.html`** — pantalla de ingreso (nombre de usuario + selección de color) y sala de espera con la lista de jugadores conectados en tiempo real.
- **`pages/cancha.html`** — tablero de juego: visor SVG de la cancha, controles de teclado y botones en pantalla, panel lateral (jugador propio, minimapa, lista de conectados, TOP 5).
- **`pages/score.html`** — marcador de solo lectura con el TOP 5 en vivo (pensado para proyectar en una pantalla aparte).
- **`pages/administrador.html`** — panel de monitoreo de solo lectura: estado completo de las 70 celdas, tabla de jugadores, y un botón para reiniciar la partida.
- **`assets/js/game-client.js`** — capa compartida de conexión Socket.IO (sesión del jugador, reconexión, envoltorios de los eventos) usada por todas las páginas anteriores.
- **`assets/js/script.js`** — lógica específica del tablero: la matemática de proyección en perspectiva de la grilla 7×10 sobre la imagen de la cancha, el viewport de cámara, y el renderizado de marcas/colores/otros jugadores a partir del estado recibido del servidor.

### 3.3 Modelo de datos

**Jugador**
```
{ id, nombre, color, fila, columna, score, conectado, socketId, ultimaAccion }
```

**Casilla** (una de las 70, en un arreglo `tablero`)
```
{ id, fila, columna, marca, color, jugadorId, puntosOtorgados }
```

**Estado global (`GameState`)**
```
{ jugadores: Map<id, Jugador>, tablero: Casilla[70] }
```

### 3.4 Eventos de Socket.IO

| Evento (cliente → servidor) | Payload | Efecto |
|---|---|---|
| `observar` | — | Une al socket a la sala sin crear un jugador (usado por el login y las pantallas de solo lectura) |
| `unirse` | `{ nombre, color, jugadorId? }` | Crea un jugador nuevo o reclama uno existente (reconexión) |
| `mover` | `{ dr, dc }` | Desplaza al jugador si el destino está dentro de la grilla |
| `marcar` | `{ celdaId, marca }` | Marca una celda con X u O; otorga 3 puntos solo la primera vez |
| `cambiar_color_celda` | `{ celdaId }` | Pinta una celda con el color del jugador |
| `admin_reiniciar` | — | Limpia el tablero y los puntajes |

| Evento (servidor → clientes) | Cuándo se emite |
|---|---|
| `jugador_nuevo` / `jugador_reconectado` / `jugador_desconectado` | Alta, reconexión o baja de un jugador |
| `jugador_movido` | Tras un movimiento válido |
| `celda_actualizada` | Tras marcar o pintar una celda |
| `jugador_actualizado` | Cuando cambia el puntaje de un jugador |
| `top5_actualizado` | Cuando cambia el ranking |
| `estado_inicial` | Snapshot completo (al unirse, o tras un reinicio de partida) |

---

## 4. Requisitos funcionales implementados

| # | Requisito | Estado |
|---|---|---|
| RF-01 | Acceso mediante enlace público | Implementado (despliegue en Render.com) |
| RF-02 | Pantalla de ingreso (nombre + color) | Implementado |
| RF-03 | Registro del jugador (ID, nombre, color, estado, posición, score) | Implementado |
| RF-04 | Selección del color por el propio jugador | Implementado, con validación de color no repetido entre conectados |
| RF-05 | Identificación única del jugador por sesión | Implementado (UUID persistente en `sessionStorage`) |
| RF-06 | Múltiples jugadores, sin límite fijo a dos | Implementado (máximo configurable, 20 por defecto) |
| RF-07 | Reporte de nuevo jugador a la sala | Implementado (`jugador_nuevo`) |
| RF-08 | Actualización del tablero al ingresar, sin recargar | Implementado |
| RF-09 | Cancha de exactamente 70 casillas | Implementado |
| RF-10 | Identificación única de cada casilla (fila, columna, id) | Implementado |
| RF-11 | Navegación con WASD | Implementado |
| RF-12 | Navegación con flechas | Implementado |
| RF-13 | Identificación del jugador por nombre y color durante la sesión | Implementado |
| RF-14 | Indicación visual de la casilla seleccionada | Implementado (recuadro resaltado + panel de estado) |
| RF-15 | Marcación con X | Implementado |
| RF-16 | Marcación con O | Implementado |
| RF-17 | 3 puntos por casilla válida, calculado en el servidor | Implementado (ver nota de interpretación abajo) |
| RF-18 | Cambio de color de celda con ESPACIO | Implementado |
| RF-19 | Modificación de celdas ya intervenidas por otro jugador | Implementado (último cambio de marca/color prevalece) |
| RF-20 | Control de las acciones disponibles por jugador | Implementado como modelo libre/concurrente (ver nota abajo) |
| RF-21 | Validación, cálculo y difusión tras cada acción | Implementado |
| RF-22 | Puntuación individual por jugador | Implementado |
| RF-23 | Tabla TOP 5 en el panel lateral | Implementado |
| RF-24 | Actualización automática del TOP 5 | Implementado |
| RF-25 | Minimapa con posición del jugador | Implementado, extendido para mostrar también a los demás jugadores |
| RF-26 | Estado compartido de las 70 celdas en el servidor | Implementado |
| RF-27 | Comunicación en tiempo real vía Socket.IO | Implementado |
| RF-28 | Flujo jugador → servidor → validación → difusión | Implementado |
| RF-29 | Estado de conexión de los jugadores | Implementado |
| RF-30 | Sincronización consistente entre todos los clientes de la sala | Implementado |

**Nota sobre RF-17/RF-19 (interpretación de puntaje):** el documento de requisitos original no precisaba qué ocurre cuando una celda ya marcada se vuelve a intervenir. Se definió que cada celda otorga sus 3 puntos **una sola vez**, al primer jugador que la marca válidamente; los cambios posteriores de marca o color (por el mismo jugador u otro) se aplican con normalidad pero no generan puntaje adicional, evitando que se dupliquen puntos reclamando la misma celda en bucle.

**Nota sobre RF-20 (modelo de turnos):** el documento original describe un "turno" que controla las acciones disponibles, pero el nombre del proyecto ("Asincrónica") y la naturaleza multijugador en tiempo real llevaron a implementar un modelo **libre y concurrente**: todos los jugadores pueden desplazarse y actuar en cualquier momento, sin bloquearse entre sí. El servidor sigue siendo la autoridad que valida cada acción; el campo de "última acción" del jugador queda como dato informativo, no como un bloqueo.

---

## 5. Requisitos no funcionales implementados

| # | Requisito | Estado |
|---|---|---|
| RNF-01 | Disponibilidad mediante enlace accesible desde distintas redes | Implementado (Render.com) |
| RNF-02 | El jugador no necesita instalar nada, solo un navegador | Implementado |
| RNF-03 | Concurrencia de múltiples jugadores, límite configurable | Implementado (`MAX_JUGADORES` en `gameState.js`) |
| RNF-04 | Baja latencia en las acciones | Implementado (Socket.IO sobre WebSocket) |
| RNF-05 | Sincronización sin recargar la página | Implementado |
| RNF-06 | El servidor es la fuente de verdad; el cliente no controla score/turno/validez | Implementado |
| RNF-07 | Integridad: sin puntuaciones duplicadas, movimientos inválidos ni estados inconsistentes | Implementado, incluida una corrección de una condición de carrera en la reconexión (ver §7) |
| RNF-08 | Usabilidad: información clara de usuario, color, posición, score, TOP5 | Implementado |
| RNF-09 | Diseño visual con la cancha como protagonista y un sidebar de apoyo | Implementado |
| RNF-10 | Compatibilidad con navegadores modernos (HTML5/CSS3/JS/WebSocket) | Implementado |
| RNF-11 | Optimizado para pantalla horizontal de computador | Implementado |
| RNF-12 | Separación de HTML, CSS, JS de cliente, servidor y lógica del juego | Implementado |
| RNF-13 | Estructura de carpetas clara y mantenible | Implementado |
| RNF-14 | Control de versiones con GitHub | Implementado (rama `cancha-svg-viewport`) |
| RNF-15 | Despliegue en un servidor con soporte de Node.js y WebSocket | Implementado (Render.com, plan gratuito) |
| RNF-16 | Independencia del servidor respecto del computador del usuario | Implementado |
| RNF-17 | Persistencia en memoria en la primera versión; MySQL opcional a futuro | Implementado (persistencia en memoria; sin base de datos) |

---

## 6. Restricciones y decisiones de diseño

- **Sin base de datos:** toda la partida vive en memoria del proceso; un reinicio del servidor borra el estado. Es una limitación conocida y aceptada para esta versión, coherente con RNF-17.
- **Paleta de colores fija (10 colores):** un color no puede estar en uso por dos jugadores conectados al mismo tiempo; el color queda liberado unos segundos después de que su jugador se desconecta, para tolerar recargas de página sin perderlo de inmediato.
- **El servidor de juego es independiente** del backend original del proyecto (sistema de gestión académica, con MongoDB): corre en un proceso y puerto distintos, y no depende de que la base de datos esté disponible.
- **Plan gratuito de Render:** el servicio se suspende tras 15 minutos de inactividad; la siguiente persona que ingresa espera unos 30-50 segundos mientras se reactiva. Es un comportamiento esperado del plan gratuito, no una falla.

---

## 7. Incidencias relevantes durante el desarrollo

Durante las pruebas en el entorno desplegado se detectó y corrigió una **condición de carrera** entre el login y la cancha: al navegar de una pantalla a otra, la conexión anterior podía notificar su desconexión al servidor *después* de que la conexión nueva ya hubiera reclamado la sesión del jugador, marcándolo como desconectado por error y provocando que sus movimientos y marcas quedaran ignorados en silencio. Se corrigió asociando cada jugador a la conexión activa más reciente, de modo que una desconexión tardía de una conexión ya reemplazada no tenga efecto.

---

## 8. Estructura de archivos

```
cancha interactiva asincronica/
├── index.html                     Pantalla de ingreso / sala de espera
├── game-server/
│   ├── index.js                   Servidor Express + Socket.IO
│   └── gameState.js                Modelo de datos y lógica de juego
├── assets/
│   ├── css/style.css               Estilos de todas las pantallas del juego
│   ├── js/game-client.js           Capa de conexión Socket.IO compartida
│   ├── js/script.js                Visor SVG del tablero (matemática de perspectiva)
│   └── img/CANCHA FUTBOL/          Imagen de referencia de la cancha
├── pages/
│   ├── cancha.html                 Tablero de juego
│   ├── score.html                  Marcador TOP 5 (solo lectura)
│   ├── administrador.html          Panel de monitoreo (solo lectura + reinicio)
│   ├── jugador 1.html, jugador 2.html   Alias que redirigen a cancha.html
│   └── Lobby de espera.html        Alias que redirige a index.html
├── pruebas/
│   └── test-game.js                Suite de pruebas de integración (Socket.IO)
└── package.json                    Dependencias y script "dev:game"
```

---

## 9. Verificación y pruebas

- **Pruebas de integración automatizadas** (`pruebas/test-game.js`): ingreso, rechazo de colores repetidos, límites de movimiento, regla de puntaje, TOP 5, y reconexión sin duplicar jugador.
- **Pruebas manuales en navegador real** (Playwright, durante el desarrollo): flujo completo de ingreso, navegación con teclado, marcado, pintado de celdas, y sincronización en vivo entre dos pestañas simultáneas.
- **Verificación en el entorno desplegado** (Render.com): confirmación de que el enlace público funciona igual que en el entorno local.
