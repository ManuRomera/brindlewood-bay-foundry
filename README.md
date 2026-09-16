![Brindlewood Bay · El club de las Expertas del Crimen](assets/cover.png)

# Brindlewood Bay para Foundry VTT

**Hay té. Hay pastas. Y algo no encaja.**

Sistema nativo en español para Foundry **13.351**. Seis misterios, un club de lectura y un oscuro secreto bajo la bahía. Creado por ManuRomera a partir de la edición española 1.0 de Jason Cordova.

> **WIP · 0.6.8-wip.1.** Compatible con toda la rama estable de Foundry 13. No se declara compatibilidad con Foundry 14. Consulta [el alcance y la verificación](docs/QA.md).

## Entrar en el club

En Foundry → Game Systems → Install System, pega este manifiesto:

```text
https://raw.githubusercontent.com/ManuRomera/brindlewood-bay-foundry/main/system.json
```

Crea un mundo con **Brindlewood Bay · El club de las Expertas**. Al entrar aparece el tablero de The Candlelight y se crea su escena de salón de té a pantalla completa, sin cuadrícula, visión de token ni niebla. También puedes abrir el tablero desde el directorio de Actores o los ajustes del sistema.

1. **Crear una Experta:** cada jugadora tiene «Crear mi Experta» bajo el botón del salón, aunque su rol no tenga permiso general para crear Actores. Allí elige el asistente paso a paso o la creación aleatoria. Cada pantalla indica lo que falta y bloquea el avance hasta cumplir sus requisitos; siempre ofrece «Cancelar». La Guardiana conectada valida la ficha y el sistema entrega su propiedad a la jugadora.
2. **Habilidades:** no se eligen ni se tiran libremente. El manual fija Vitalidad 0, Compostura +1, Razón +1, Presencia 0 y Sensibilidad −1; después se suma +1 a una de ellas.
3. **Creación aleatoria:** «Experta al azar» produce una ficha completa que puede revisarse antes de guardarla. «Castellanizar» utiliza nombres, aficiones, estilos, familias, carreras y objetos reconociblemente españoles.
4. **Abrir un misterio:** la Guardiana consulta el expediente y presenta el caso. Se recomienda *Papá por la borda*.
5. **Revelar y Teorizar:** publica pistas y presentaciones; después seleccionad las pistas que explica la teoría. La fórmula y sus restricciones se aplican automáticamente.

No requiere otros módulos. Descarga alternativa: [versiones WIP](https://github.com/ManuRomera/brindlewood-bay-foundry/releases).

## En el centro de la mesa

| Misterio | Complejidad | Pistas + Vacío |
| --- | ---: | ---: |
| Papá por la borda | 6 | 20 + 6 |
| Un grito en Halloween | 6 | 20 + 6 |
| Brindlewood Bay precocinado | 7 | 20 + 6 |
| Pero mira cómo mueren | 7 | 20 + 6 |
| La muerte a escena | 8 | 20 + 6 |
| Un asesinato en aguas oscuras | 8 | 20 + 6 |

Ocho compendios incluyen reglas, ayudas, 19 movimientos expertos, siete básicos, los seis expedientes, 49 personas de interés, la escena del salón, la macro de anuncios y las herramientas de la Guardiana. Cada entrada identifica su fuente. Los compendios de expedientes y sospechosos se ocultan del directorio de las jugadoras; las copias de trabajo se abren como diarios privados. Las personas pueden aparecer en varios misterios: no hay un culpable establecido de antemano.

## Una vida plena

Fichas de marfil, verde salvia y rosa antiguo; retratos editables; controles de habilidades protegidos; objetos con historia; Condiciones; objetivos de fin de sesión; Coronas con escenas pendientes y un historial de tiradas recuperable. Las narraciones previas a las tiradas pueden hacerse por voz y los apuntes del chat son opcionales. Los límites del manual se muestran junto a cada recurso y se aplican en la propia ficha: 18 objetos del Hogar, 3 Condiciones, 5 PE, 5 avances y los rangos de complejidad correspondientes.

El salón funciona como tablero común: muestra misterios activos, pistas ordinarias y del Vacío, y el progreso de todas las Expertas. Las pistas descubiertas pueden consultarse allí sin abrir varias ventanas. Las ventanas recuerdan su tamaño y ubicación por usuario. La Guardiana dispone de un reinicio de campaña que conserva los compendios y cualquier contenido ajeno al sistema.

El **Generador de anuncios** aparece en el directorio de Macros y el sistema lo coloca en la casilla 1 de la barra de cada jugadora, con su propio icono de televisor. Sus cinco tablas contienen 32 productos, 16 formatos, 12 protagonistas, 12 promesas y 16 giros: más de un millón de combinaciones. Cada ejecución publica en el chat una tarjeta titulada «Propuesta de Guión de Anuncio» que muestra las cinco elecciones y el texto combinado. La Guardiana solo da paso al anuncio desde el salón con el indicio sencillo que establece el manual.

La escena **The Candlelight · Salón del club** usa una ilustración original de máximo detalle. El libro central lleva el título del sistema. Los seis libros de caso están incluidos como baldosas ocultas y el sistema revela el caso en curso y los ya resueltos en el primer plano izquierdo, con los lomos visibles y el libro principal libre.

Deja el cursor quieto dos segundos sobre movimientos, habilidades, pistas, personajes o controles para consultar su información; se cierra al moverlo. El botón derecho la mantiene abierta y la chincheta la ancla hasta desanclarla o pulsar el aspa. Las fichas de chat muestran el resultado aplicado, los cuatro grados posibles, la habilidad, el modificador, ventaja o desventaja y el objeto utilizado.

Ventaja y desventaja no se acumulan. Las Coronas cambian el nivel del resultado conservando los dados originales. Teorizar utiliza exclusivamente 2d6 + pistas incorporadas − complejidad, nunca ventajas, habilidades, Coronas o éxitos automáticos. Las pistas del Vacío no suman. El final de campaña usa complejidad 10 y no tiene efecto adicional de 12+.

La Guardiana conserva las decisiones narrativas: relevancia de Condiciones, adjudicación de pistas, consecuencias, movimientos ocultistas nuevos, contactos y ventajas situacionales. El sistema ofrece el texto y los registros necesarios; consulta la [matriz de automatizaciones](docs/REGLAS.md).

## Capturas de Foundry

![El salón del club](docs/salon-foundry.png)

![La ficha de Experta](docs/experta-foundry.png)

## Bajo la superficie

El salón lleva la cuenta de sesiones y la progresión de la conspiración (3 / 5 / 10 / 15 pistas del Vacío, con el ajuste de Fox Mulder). Hay un máximo de tres investigaciones activas. *Un asesinato en aguas oscuras* requiere la tercera capa. Tras desbloquear la cuarta, se prepara el Misterio del Vacío en lugar de nuevos asesinatos.

## Desarrollo y créditos

`npm ci`, `npm test`, `npm run check`, `npm run build`. El ZIP de distribución se construye con una lista explícita de archivos y compendios LevelDB. [Criterios aprendidos de anteriores sistemas](docs/REGLAS.md) · [QA](docs/QA.md).

Sistema de ManuRomera. Juego escrito y diseñado por **Jason Cordova**; traducción de **Chus Abascal**. Créditos completos y separación entre licencia del código y contenido en [LICENSE](LICENSE). El titular del proyecto declara permiso expreso para incluir las aventuras y contenido necesario. No se distribuye el PDF ni su arte original. La portada es una ilustración original generada con IA para esta adaptación, sin carácter oficial; [dirección artística y prompt](docs/ARTE.md).

La actualización 0.5.1 recoloca y redimensiona automáticamente los libros de casos de los mundos existentes al entrar como Guardiana.

La actualización 0.6.0 cataloga automáticamente las fichas como «PJ: nombre» y «Caso: título», incluidos los personajes y casos ya presentes en el mundo.
