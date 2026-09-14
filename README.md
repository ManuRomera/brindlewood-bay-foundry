![Brindlewood Bay · El club de las Expertas del Crimen](assets/cover.png)

# Brindlewood Bay para Foundry VTT

**Hay té. Hay pastas. Y algo no encaja.**

Sistema nativo en español para Foundry **13.351**. Seis misterios, un club de lectura y un oscuro secreto bajo la bahía. Creado por ManuRomera a partir de la edición española 1.0 de Jason Cordova.

> **WIP · 0.1.0-wip.1.** Versión de trabajo para probar en un mundo nuevo. No se declara compatibilidad con Foundry 14. Consulta [el alcance y la verificación](docs/QA.md).

## Entrar en el club

En Foundry → Game Systems → Install System, pega este manifiesto:

```text
https://raw.githubusercontent.com/ManuRomera/brindlewood-bay-foundry/main/system.json
```

Crea un mundo con **Brindlewood Bay · El club de las Expertas**. Al entrar aparece The Candlelight, el salón del club. También puedes abrirlo desde el directorio de Actores o los ajustes del sistema.

1. **Crear una Experta:** nombre, estilo, quehacer, habilidad y movimiento. Se comprueban las exclusividades iniciales; el reparto parte de 0 / +1 / +1 / 0 / −1.
2. **Hogar, dulce hogar:** cuenta su pasado y añade entre tres y cinco objetos junto con la mesa.
3. **Abrir un misterio:** la Guardiana consulta el expediente y presenta el caso. Se recomienda *Papá por la borda*.
4. **Revelar al grupo:** publica pistas y presentaciones de sospechosos; sus secretos permanecen en el expediente.
5. **Teorizar:** seleccionad las pistas que explica vuestra teoría. La fórmula y sus restricciones se aplican automáticamente.

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

Seis compendios incluyen reglas, ayudas, 19 movimientos expertos, siete básicos, los seis expedientes, 49 personas de interés y las herramientas de la Guardiana. Cada entrada identifica su fuente. Los compendios de expedientes y sospechosos se ocultan del directorio de las jugadoras; las copias de trabajo se abren como diarios privados. Las personas pueden aparecer en varios misterios: no hay un culpable establecido de antemano.

## Una vida plena

Fichas de marfil, verde salvia y rosa antiguo; controles de habilidades protegidos; objetos con historia; Condiciones; objetivos de fin de sesión; Coronas con escenas pendientes y un historial de tiradas recuperable. Controles accesibles con teclado y opción de lectura cómoda.

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
