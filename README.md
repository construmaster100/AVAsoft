# SENAEnglish — Sistema de Evaluación Interactiva de Inglés

Este README documenta específicamente **SENAEnglish**, la aplicación que corre
en la raíz de este repositorio (`index.html`, `pages/`, `assets/`,
`game-server/`) y que es lo que despliega el servicio de Render conectado a
este repo/branch. El resto de carpetas de este repositorio son otros
entregables del programa SENA ADSO (ficha 3293836) que conviven aquí pero
**no** son parte de SENAEnglish — ver la sección "Otros contenidos de este
repositorio" más abajo.

Cada participante ingresa con nombre y color, responde un cuestionario de
**30 preguntas** sobre **IF, THEN, USED TO e INFINITIVE**, y su resultado se
sincroniza en tiempo real con un ranking compartido de hasta **20
participantes**. SENAEnglish reemplaza el modelo anterior de este mismo
directorio raíz (una "cancha interactiva" de fútbol con grilla 7×10,
navegación WASD y marcas X/O) según
[`docs/SENAEnglish_Documento_Requisitos.docx`](docs/SENAEnglish_Documento_Requisitos.docx),
que es la fuente de requisitos vigente para `index.html` / `pages/` /
`game-server/`.

## Despliegue

| | |
| --- | --- |
| Carpeta local | `D:\cancha interactiva asincronica` |
| GitHub | [construmaster100/AVAsoft](https://github.com/construmaster100/AVAsoft), branch `cancha-svg-viewport` |
| Render (en vivo) | https://adsoavasoft.onrender.com |

Este repositorio es independiente de `construmaster100/MAP` (carpeta local
`D:\FT3P`, servicio Render `englishcoding`) — son dos proyectos separados que
por coincidencia recibieron una implementación similar de SENAEnglish; no
comparten historial ni despliegue.

## Cómo correrlo

```
npm install
npm run dev:game
```

Abre `http://localhost:4000/`. El cuestionario **necesita** el servidor Node
corriendo — Socket.IO sincroniza el ingreso de participantes, valida cada
respuesta y arma el ranking; abrir los `.html` como archivo local no
funciona (ver el aviso que muestra `assets/js/senaenglish-client.js` en ese caso).

Para verificar la lógica del servidor (sin navegador) con el servidor ya corriendo:

```
npm test
```

## Estructura de SENAEnglish

```
index.html                     Login: nombre + color (RF-02, RF-03)
pages/
  quiz.html                    Cuestionario: pregunta + 4 opciones con giro CSS
  resultado.html                Resultado final del participante + ranking (hasta 20)
  administrador.html            Panel de administración: participantes, ranking, reinicio
assets/
  css/style.css                 Estilos (tokens compartidos + login + quiz + paneles de solo lectura)
  js/senaenglish-client.js      Capa de conexión Socket.IO (sesión, unirse, responder, finalizar)
  js/quiz.js                    Lógica del cuestionario (pages/quiz.html)
game-server/
  index.js                      Servidor Express + Socket.IO (eventos, sala única)
  gameState.js                  Estado del servidor: participantes, respuestas, ranking (autoridad)
  questions.js                  Banco de 30 preguntas (IF 8 · THEN 7 · USED TO 7 · INFINITIVE 8)
pruebas/
  test-senaenglish.js           Prueba de flujo por Socket.IO (unirse/responder/reconexión/ranking)
docs/
  SENAEnglish_Documento_Requisitos.docx   Documento de requisitos vigente de SENAEnglish
```

## Arquitectura

```
GITHUB → SENAEnglish → Node.js + Express → Socket.IO
                                              │
                        ┌─────────────────────┼─────────────────────┐
                        ▼                     ▼                     ▼
                   Usuario 1             Usuario 2             Usuario N
                        └─────────────────────┼─────────────────────┘
                                              ▼
                                  ESTADO DE EVALUACIÓN (servidor)
                                   ├── Cuestionario (30 preguntas)
                                   └── Ranking (20 participantes)
```

El servidor es la única autoridad sobre la pregunta actual, la corrección de
cada respuesta y el score (RNF-06, RNF-07): el cliente nunca recibe la
respuesta correcta de una pregunta hasta después de contestarla.

## Eventos Socket.IO

**Cliente → servidor**: `unirse`, `responder`, `finalizar`, `observar`

**Servidor → clientes**: `jugador_nuevo` / `jugador_reconectado` /
`jugador_desconectado`, `pregunta_actualizada`, `respuesta_validada`,
`jugador_actualizado`, `ranking_actualizado` (RF-24), `evaluacion_finalizada`

## Reglas de puntuación

- 30 preguntas, 4 opciones cada una, una sola correcta.
- Acierto = 1 punto · Desacierto = 0 puntos · Score máximo = 30.
- `porcentaje = (aciertos / 30) × 100`.
- Un participante no puede responder dos veces la misma pregunta ni modificar
  el resultado una vez finalizada la evaluación.

## Otros contenidos de este repositorio (no forman parte de SENAEnglish)

Este repositorio reúne varios entregables independientes del mismo programa
formativo; ninguno de los siguientes fue tocado al construir SENAEnglish:

- `pages/aprendiz.html`, `pages/instructor.html`, `docs/documentacion/` — la
  plataforma AVA SENA (LMS) y su documentación de requisitos (RF01–RF13).
- `pages/Senacegafe/`, `pages/senacol/`, `pages/sena sofia/`, `pages/betowa/`,
  `pages/Sennova/`, `pages/LMS/` — micrositios institucionales independientes.
- `client/`, `shared/`, `server/sockets/` — una arquitectura modular más
  nueva del juego de cancha (entidades, física, colisiones), separada del
  `game-server/` que usa SENAEnglish.
- `server/` (routes, models, config) — API REST propia (Express + Mongoose)
  de otro entregable, no usada por SENAEnglish.
