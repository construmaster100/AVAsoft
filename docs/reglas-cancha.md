# Reglas de la cancha y del entorno

## Propósito

Este documento registra las reglas espaciales y visuales de la cancha interactiva. Es la referencia para futuras modificaciones de ubicación, líneas, zonas, numeración y elementos del entorno.

El cuadro visual **Instrucciones** es únicamente informativo y no debe actualizarse automáticamente cada vez que cambie una regla. Las reglas vigentes se consultan en este archivo.

## Sistema de coordenadas

- El tablero completo tiene `12 columnas x 9 filas`.
- El área de juego verde ocupa `10 columnas x 7 filas`.
- La primera casilla verde es `A1`.
- La última casilla verde es `J7`.
- La columna `K` no pertenece al área verde.
- Las coordenadas aumentan de izquierda a derecha y de arriba hacia abajo.
- La geometría se calcula en el `viewBox` SVG `1672 x 941`.
- El eje vertical central está ubicado entre las columnas `E` y `F` del área verde.

## Marco o franja exterior

El marco exterior está formado por las casillas que cumplen una de estas condiciones:

- Primera fila del tablero.
- Última fila del tablero.
- Primera columna del tablero.
- Última columna del tablero.

El marco contiene `38 casillas` y se identifica con numeración omega continua: `Ω1` a `Ω38`.

Las casillas del marco tienen color naranja oscuro. El relleno y el perímetro del marco son independientes de las casillas verdes.

## Área verde

Las `70 casillas` interiores conservan numeración alfanumérica propia:

- Columnas: `A` a `J`.
- Filas: `1` a `7`.
- Rango: `A1` a `J7`.

La numeración verde no continúa la numeración omega y no incluye las casillas del marco.

## Líneas y grosores

- Las líneas internas normales son blancas de `1 px`.
- La línea vertical central entre `E` y `F` es blanca de `4 px`.
- El contorno del área verde es blanco de `8 px`.
- La división horizontal de la fila central es amarilla, delgada y punteada, de `2 px`.
- No hay línea de meta: se eliminó el complejo visual del arco de gol (líneas `LM`, línea de área y semicírculos de `B4`/`I4`) porque el juego ya no anota goles. El espacio cerrado de la cancha (el contorno del área verde) se conserva igual que antes.

## Centro de la cancha

- La línea magenta cruza horizontalmente la zona central.
- El círculo central está centrado en la intersección de la línea magenta y el eje E–F.
- El círculo no tiene relleno.
- Su radio corresponde a la dimensión de una casilla.
- El círculo tiene un borde blanco de `5 px` y conserva el efecto resplandeciente.

## Personaje y navegación

- El personaje se coloca dentro de la casilla activa.
- Su imagen ocupa exactamente los límites de esa casilla.
- El punto circular de navegación comparte el centro de la casilla activa.
- Las flechas de borde no son visibles.
- El movimiento se realiza con teclado y mediante la selección de celdas.
- Las capas interactivas no deben cambiar la geometría base de la cancha.

## Entorno de la interfaz

- La cancha ocupa la zona principal.
- La tabla de puntajes está en el sidebar derecho.
- Los jugadores conectados aparecen en la barra inferior horizontal.
- El encabezado superior muestra `CANCHA SINCRÓNICA INTERACTIVA LA GUACHA`.
- El cuadro Instrucciones está en la parte inferior del sidebar y ocupa aproximadamente una cuarta parte de su altura.
- El cuadro Instrucciones no es la fuente normativa de las reglas: la fuente normativa es este archivo Markdown.

## Sistema de combate

El juego ya no anota goles: la única mecánica de puntaje y progreso es el combate cuerpo a cuerpo entre jugadores conectados.

- Cada jugador tiene `25` puntos de vida al entrar y al reaparecer.
- `X` ataca a la vez las 4 casillas colindantes (arriba, abajo, izquierda, derecha). Cualquier jugador conectado que esté en una de esas casillas pierde `1` punto de vida, salvo que esté bloqueando.
- `C` bloquea: mientras se sostiene (ventana de `900 ms` por pulsación), el jugador no recibe daño de ningún ataque que lo alcance en ese instante.
- Cada jugador tiene `3` vidas, representadas como corazones. Al llegar a `0` de vida, pierde un corazón y reaparece en el centro de la cancha (`E4`) con la vida llena.
- Al perder el tercer corazón, el jugador queda eliminado y el juego lo saca automáticamente de la cancha (mismo efecto que el botón "Salir").
- El jugador que deja a otro sin sus 3 vidas gana `10` puntos de score.

## Acciones informativas

Los atajos existentes son:

- `X`: atacar las casillas colindantes (ver "Sistema de combate").
- `C`: bloquear un ataque.

## Regla de mantenimiento

Antes de cambiar posiciones, dimensiones, colores, numeración o grosores, actualizar primero este documento. El cuadro visual Instrucciones solo debe cambiar si se solicita explícitamente modificar su contenido o presentación.
