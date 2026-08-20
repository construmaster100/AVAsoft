// Constantes compartidas del sistema de interacción. Sin dependencias de DOM
// ni de Node: este archivo se puede importar tanto en el cliente (navegador,
// <script type="module">) como más adelante en el servidor, para que ambos
// lados acuerden la misma grilla, el mismo campo y las mismas reglas físicas.

export const ROWS = 7;
export const COLS = 10;

// Tamaño de la ventana de cámara (viewport): 4 celdas de ancho × 3 de alto.
export const VIEW_ROWS = 3;
export const VIEW_COLS = 4;

// Esquinas del campo visible dentro de la imagen real, en unidades del
// viewBox del SVG (1000 × 562.5, igual a la proporción 16:9 de la imagen).
export const QUAD = {
  TL: { x: 142, y: 98 },
  TR: { x: 858, y: 98 },
  BL: { x: 26, y: 432 },
  BR: { x: 974, y: 432 },
};

export const VIEWBOX_WIDTH = 1000;
export const VIEWBOX_HEIGHT = 562.5;

export const IMAGE_SRC = "../assets/img/CANCHA%20FUTBOL/CANCHA%20VACIA.png";

// Posiciones y radios en espacio normalizado u/v (0..1 × 0..1), NO en
// píxeles del viewBox — así el gameplay no depende de la resolución de
// pantalla ni de la ventana de cámara activa.
export const CHARACTER_RADIUS = 0.018;
export const BALL_RADIUS = 0.012;

// Física en espacio u/v por segundo (se multiplica por dt en cada frame).
export const CHARACTER_ACCEL = 1.6;   // u/v por segundo^2 al mantener una tecla
export const CHARACTER_MAX_SPEED = 0.42; // u/v por segundo
export const CHARACTER_FRICTION = 6.5;   // más alto = frena más rápido al soltar teclas
export const BALL_FRICTION = 2.2;        // el balón rueda más y frena más lento
export const BALL_PUSH_FACTOR = 1.35;    // qué tan fuerte "patea" el personaje al balón

// Tamaño visual (en unidades del viewBox, NO en u/v) de los círculos —
// independiente del radio de colisión para poder ajustar cada uno por su
// cuenta durante el prototipado.
export const CHARACTER_VISUAL_RADIUS = 16;
export const BALL_VISUAL_RADIUS = 10;

// Metas: dos puntos en los extremos de la cancha (v=0 fondo, v=1 frente),
// centrados en u=0.5. GOAL_HALF_WIDTH es el ancho de la boca del arco en
// espacio u, GOAL_LINE_DEPTH qué tan adentro del extremo empieza la zona
// que cuenta como gol.
export const GOAL_HALF_WIDTH = 0.14;
export const GOAL_LINE_DEPTH = 0.06;

// Colores por jugador (se usan tanto en el personaje como en el HUD).
export const PLAYER_ONE_COLOR = "#2f6a8f";
export const PLAYER_TWO_COLOR = "#e8a23d";

// Posiciones iniciales (espacio u/v): Jugador 1 arranca cerca del frente y
// defiende la meta del frente (v=1); Jugador 2 arranca cerca del fondo y
// defiende la meta del fondo (v=0). El balón arranca en el centro.
export const PLAYER_ONE_START = { u: 0.5, v: 0.8 };
export const PLAYER_TWO_START = { u: 0.5, v: 0.2 };
export const BALL_START = { u: 0.5, v: 0.5 };
