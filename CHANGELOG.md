# 1.1.0

- **Pizarra de investigación** en cada caso (botón *Pizarra* en el tablero y en el salón): un corcho donde el grupo coloca las pistas descubiertas, las personas de interés con su retrato y nombre, notas y fotos propias, y los une con hilos de colores. Cada tarjeta se mueve libremente, se puede quitar sin borrar la pista y cada hilo se quita pulsándolo. Es ambientación: no cambia ninguna regla.
- Varias personas a la vez: cada tarjeta y cada hilo se guardan por separado, así que mover cosas distintas nunca se pisa; quien arrastra o escribe en una tarjeta la bloquea para el resto (con su nombre a la vista), y los demás la ven moverse en directo.
- El diálogo de tirada explica que ventaja y desventaja se cancelan aunque haya más fuentes de un lado (manual, p. 10).
- Corregido: la insignia de última versión del README no se cargaba; editar el contexto de una pista o una persona ya no reescribe el resto del caso (podía pisar cambios de la pizarra hechos mientras tanto).

# 1.0.0

Primera versión estable. A partir de ahora se actualiza desde Foundry con el manifiesto `releases/latest/download/system.json`.

- Ficha de Experta rehecha: cabecera compacta con habilidades y límites siempre visibles y cinco pestañas (En la mesa, Hogar y vida, Avance, Coronas, Historial). Los recursos saltan a su pestaña.
- Tablero del misterio y salón del club más compactos: notas plegables, pistas en cuadrícula, personas con retrato y avisos de sesión cerrada o escenas de Corona pendientes.
- Nuevo sistema de diseño: todo el color sale de variables y todos los tamaños son relativos (nada por debajo de 12 px); los perfiles Oscuro mate, Alto contraste AAA y Ámbar solo redefinen variables.
- Icono de accesibilidad en la cabecera de cada ventana con panel propio; nuevo tamaño de texto del 85 % al 160 % (sustituye al texto ampliado) y ajuste de ayuda inmediata.
- Retratos encuadrables (zona y zoom) válidos en ficha, salón, chat y directorio.
- Las ventanas recuerdan pestaña, secciones plegadas y desplazamiento además de posición y tamaño, y conservan el texto sin guardar.
- Capa de compatibilidad Foundry 13 ↔ 14 (`compat.mjs`); las tiradas respetan la visibilidad del chat.
- Diálogo de tirada con selector de habilidad, vista previa de la fórmula y botón Cancelar; Diurno y Nocturno proponen Compostura.
- Automatizaciones nuevas: movimiento **Afable**; tarjeta de **inicio de sesión** con los movimientos que se resuelven al empezar; **aviso privado** al desbloquear cada capa de la conspiración; **Nuevo movimiento ocultista** que se entrega a todas; Frank Colombo en la tirada de Metomentodo; Remington Steele añade su objeto al Hogar; el bono de Fox Mulder se ve en la ficha; marcar o desmarcar objetos del Hogar a mano.
- Corregido: en el Misterio del Vacío un 12+ al Teorizar se trata como 10–11 (no hay resultado extraordinario); la ayuda emergente dejaba de describir los controles tras el primer repintado; el salón mostraba una versión fija «WIP · 0.6.8»; los nombres «PJ:»/«Caso:» ya no se ven en las fichas; erratas heredadas del PDF.
- Compendios: nueva *Guía rápida de este sistema* y títulos de página legibles en Reglas, Guardiana y Aventuras.
- Publicación por etiqueta `vX.Y.Z`; el zip lleva `system.json` en la raíz.

# 0.9.0-wip.1

- Las tiradas fallidas muestran en su propia tarjeta de chat la acción «Ponerse una Corona» para la autora de la tirada y la Guardiana.
- La selección distingue Coronas de la Reina y Corona del Vacío; al aceptarla se aplica el efecto real, queda marcada en la ficha y el resultado sube un grado.
- La tarjeta original de chat se actualiza con el nuevo resultado y conserva el total y los dados originales.
- Las tarjetas antiguas no pueden gastar una segunda Corona como consecuencia de un botón desactualizado.
- Nuevos perfiles visuales por cliente: Estándar, Oscuro mate, Alto contraste AAA y Ámbar.
- Nuevos controles de accesibilidad: texto ampliado, tipografía de alta legibilidad, movimiento reducido, foco de teclado reforzado, centrado opcional de ventanas y ajuste de brillo, contraste y saturación del lienzo.
- Las acciones principales de accesibilidad quedan disponibles en Configurar controles para asignar atajos personalizados.

# 0.8.0-wip.1

- El tablero del misterio se convierte en un cuaderno de investigación colaborativo.
- La Guardiana puede arrastrar fichas de Persona de interés al caso, mostrar su imagen, editar la presentación pública, abrir la ficha original y retirarla del tablero sin borrar el Actor.
- Las jugadoras con acceso de Observador pueden escribir notas compartidas en cada persona, en cada pista y en un cuaderno libre del caso; el guardado se valida a través de la Guardiana conectada sin conceder propiedad total del misterio.
- Las pistas predefinidas conservan inmutable su texto original. El contexto de la Guardiana y las notas de investigación quedan almacenados por separado.
- Al Teorizar, el cuaderno de investigación sirve como punto de partida cuando todavía no existe una teoría guardada.

# 0.7.0-wip.1

- Ajustado el encuadre de la portada en la cabecera de The Candlelight para mantener visibles las caras de las protagonistas.
- Ajustado el fondo de la pantalla de acceso al mundo para mostrar completo el título de Brindlewood Bay.
- Eliminadas reglas duplicadas de posicionamiento de la imagen de portada.

# 0.6.9-wip.1

- Nueva portada de Brindlewood Bay aplicada al repositorio y al paquete instalable de Foundry VTT.
- El paquete de distribución se vuelve a generar para que las instalaciones existentes reciban la nueva imagen al actualizar.
- Se automatiza la publicación de nuevas releases cuando cambia la versión del manifiesto.

# 0.6.8-wip.1

- Las cinco tablas del generador quedan declaradas y verificadas individualmente: 32 productos, 16 formatos, 12 protagonistas, 12 promesas y 16 giros.
- La tarjeta de chat muestra cada elección en una línea y la propuesta completa usando únicamente HTML básico, sin los contenedores ni clases que podían ocultar el cuerpo en algunas instalaciones.

# 0.6.7-wip.1

- Se elimina por completo la ventana del generador. Cada ejecución de la macro crea una combinación aleatoria y la publica en el chat como «Propuesta de Guión de Anuncio».

# 0.6.6-wip.1

- La propuesta deja de depender de las alturas heredadas por los envoltorios internos de HandlebarsApplicationMixin. Su contenido queda anclado al área útil de la ventana mediante una cuadrícula absoluta.
- El renderizado aplica la geometría crítica también en línea, evitando diferencias entre hojas de estilo almacenadas en caché o envoltorios distintos entre compilaciones de Foundry 13.

# 0.6.5-wip.1

- El generador deja de usar `DialogV2.prompt`: una aplicación propia renderiza la propuesta desde una plantilla estable para evitar que ciertas compilaciones de Foundry descarten el cuerpo del diálogo.
- El manifiesto admite toda la rama principal de Foundry 13 (`minimum: 13`, `maximum: 13`) y declara 13.351 como versión verificada.

# 0.6.4-wip.1

- La ventana de propuesta tiene una altura real definida y un área de contenido desplazable, evitando que Foundry la reduzca hasta mostrar únicamente el botón «Cerrar».

# 0.6.3-wip.1

- La macro genera la propuesta antes de abrir la interfaz y muestra una ventana que ya contiene el anuncio; se elimina el botón interno que podía no responder.
- Volver a ejecutar la macro genera una propuesta distinta.

# 0.6.2-wip.1

- El Generador de anuncios usa una única ventana estable: «Generar propuesta» escribe el resultado dentro de ella y puede repetirse sin cerrar ni encadenar diálogos.
- La macro carga el generador directamente desde el sistema, incluso si el espacio global de la partida todavía no está disponible.

# 0.6.1-wip.1

- El Generador de anuncios entrega una propuesta aleatoria completa nada más pulsarlo y permite generar otra sin pasar por selectores.
- La escena del salón muestra los libros de los casos activos junto con los resueltos; el caso en curso queda arriba de la pila.
- El creador valida cada pantalla antes de avanzar, explica el requisito pendiente y ofrece «Cancelar» durante todo el proceso.
- Nombre, estilo y quehacer usan desplegables completos que siguen mostrando todas las sugerencias, además de admitir texto propio.

# 0.6.0-wip.1

- Botón «Crear mi Experta» visible para todas las jugadoras bajo el acceso al salón, con elección entre creación guiada y aleatoria.
- La Guardiana conectada valida la solicitud y crea la ficha con propiedad total para la jugadora, sin conceder permiso general para crear Actores.
- Expertas y misterios se catalogan como «PJ: nombre» y «Caso: título»; los documentos existentes se actualizan al entrar.
- El Generador de anuncios se instala en el directorio de Macros y en la casilla 1 de la barra de cada jugadora, con un icono propio.

# 0.5.1-wip.1

- Libros de casos rediseñados con lomos legibles, cantos de páginas, tapas y perspectiva común.
- Pila en el primer plano izquierdo: los seis títulos permanecen visibles y el libro principal queda libre.
- Los mundos existentes reciben las nuevas dimensiones y posiciones al entrar; las baldosas personales se conservan.

# 0.5.0-wip.1

- El creador de Expertas recorre identidad, distribución fija de habilidades, movimiento experto con descripción completa, vida anterior, Hogar y preguntas de primera sesión.
- Nuevo botón de creación aleatoria con miles de millones de combinaciones, revisión previa y opción de castellanizar nombres, estilo, quehacer y recuerdos.
- La ficha reduce y embellece los contadores para devolver espacio a la zona de juego.
- La Guardiana da paso a los anuncios con un único indicio; la macro opcional de las jugadoras conserva el generador completo para superar bloqueos creativos sin publicar nada.
- Todo mundo recibe The Candlelight, una escena original de salón de té sin cuadrícula, visión de token ni niebla. Seis baldosas de libros aparecen y se apilan automáticamente al resolver los misterios de campaña.

# 0.4.0-wip.1

- El salón muestra a toda la mesa contadores comunes, pistas desplegables por misterio y el progreso esencial de cada Experta.
- La ficha de Experta reorganiza recursos, movimientos, Condiciones, Hogar, experiencia e historial para mejorar jerarquía visual y aprovechar el espacio.
- Las ventanas del sistema recuerdan tamaño y posición por usuario y documento, reajustándose si quedan fuera del área visible.
- La Guardiana puede reiniciar todos los datos de campaña de Brindlewood Bay sin crear otro mundo y sin afectar contenido ajeno al sistema.
- Nuevo generador de anuncios con más de un millón de combinaciones, acceso desde el salón y macro incluida en compendio.

# 0.3.0-wip.1

- Los límites del manual aparecen dentro de las fichas y se aplican a Hogar, Condiciones, PE, avances, Coronas, habilidades, movimientos exclusivos, misterios activos, complejidad y sospechosos.
- Hogar presenta sus 18 espacios, permite retirar objetos y bloquea nuevas altas al llenarse.
- Los PE que rebasan la quinta casilla durante el cierre quedan pendientes hasta elegir un avance.

# 0.2.0-wip.1

- La narración previa a las tiradas, Teorizar y los movimientos expertos puede hacerse por voz; los campos escritos son apuntes opcionales.
- Nocturno muestra una advertencia final después de preparar la tirada y permite volver atrás antes de lanzar los dados.
- Información contextual tras dos segundos, persistencia con botón derecho y modo anclado con chincheta.
- Las fichas de chat detallan los cuatro grados de resultado y los modificadores aplicados.
- Retratos editables para Expertas y personajes, e imágenes editables para misterios.
- API actual de Foundry 13 y verificación pública reproducible sin enlaces de dependencias locales.

# 0.1.0-wip.1

Primera versión de trabajo: fichas de Experta, personas y misterios; salón del club; creación guiada; tiradas, Coronas, hogar, PE y avances; tablero público y expedientes privados; seis misterios, 19 talentos, ayudas y conspiración; portada original.
