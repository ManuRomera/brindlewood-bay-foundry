# Auditoría 1.0.0 · Brindlewood Bay para Foundry VTT

Fecha: 7 de octubre de 2026. Fuente: *Brindlewood Bay* edición española 1.0 (PDF de 82 páginas). Foundry 13.351 real, servidor local con datos aislados.

## 1. Reglas del manual frente al sistema

| Regla (página) | Estado | Notas |
| --- | --- | --- |
| 2d6 + habilidad; ventaja 3d6 mayores, desventaja 3d6 menores; se cancelan sin apilar (p. 10) | ✔ | Vista previa de la fórmula en el diálogo |
| Niveles 6− / 7–9 / 10–11 / 12+ de Diurno, Nocturno, Metomentodo, Ocultista (pp. 12–14) | ✔ | Los cuatro textos en cada tarjeta |
| Ponerse una Corona: sube un nivel, conserva el dado original (p. 11) | ✔ | Desde la tarjeta o el Historial; Teorizar excluido |
| Corona de la Reina libre, Corona del Vacío en orden, Carruaje, Pepitas, retirada (p. 9) | ✔ | |
| Máximo 3 Condiciones; la cuarta exige una Corona (p. 8) | ✔ | |
| Hogar: 18 espacios, ventaja al evocar sin marcar, reutilizables (p. 9) | ✔ | Ahora también se marca/desmarca a mano |
| PE, 5 avances, tope +3, exceso pendiente (p. 7) | ✔ | |
| **Afable** (p. 13) | ✔ nuevo | Antes no existía en la ficha |
| Teorizar: 2d6 + pistas − complejidad, consenso, sin modificadores (p. 15) | ✔ | |
| Misterio del Vacío: complejidad 10 y **sin 12+** (p. 31) | ✔ corregido | Antes el 12+ ofrecía un texto propio |
| Máximo 3 misterios activos; complejidad 6–8, 4–5 en una sesión (pp. 5, 27) | ✔ | |
| Capas de conspiración 3/5/10/15 y Fox Mulder −1 (pp. 30, 72) | ✔ | Aviso privado nuevo al cruzar cada umbral |
| Pausa para anuncios, una por sesión (p. 22) | ✔ | |
| Amanda: una vez por sesión, sin repetir novela (pp. 14, 77) | ✔ | |
| Movimientos expertos únicos y exclusiones Dale Cooper / Fox Mulder (p. 74) | ✔ | |
| Movimientos de comienzo de sesión: Dale Cooper, Jim Rockford, Espantapájaros (pp. 74–75) | ✔ nuevo | Tarjeta de inicio de sesión |
| Movimiento ocultista nuevo disponible para todas (p. 14) | ✔ nuevo | «Nuevo movimiento ocultista» |

## 2. Automatizaciones

Implementadas: tiradas, Coronas, Afable, PE y avances, Hogar, usos por sesión/misterio/único, efectos de Dale Cooper, Jonathan Hart, Fox Mulder (bono visible en la ficha), Frank Dowling, Frank Colombo (casilla en Metomentodo), Colt Seavers, Thomas Magnum, Sonny Crockett, Michael Knight, R. Quincy, Gordon Shumway y Remington Steele (objeto de Hogar), Milton Hardcastle (pregunta extra), capas, inicio de sesión, ocultismo, anuncios.

Deliberadamente en manos de la mesa (el manual las deja a criterio narrativo): qué Condición afecta a una acción, cuándo Tom Hanson, Angus MacGyver o Rick & A. J. dan ventaja (el diálogo lo recuerda), el contenido de las Pistas, consecuencias y reacciones, M. A. Baracus, Rick & A. J., Jim Rockford y Espantapájaros más allá del recordatorio.

## 3. Problemas encontrados y corregidos

1. Ficha: unos 300 px de cabecera antes del primer botón; ahora unos 120 px, con los movimientos expertos visibles sin desplazar.
2. Tipografía con tamaños de 8–10 px en decenas de reglas; ahora ninguno baja de 12 px y todo escala con el ajuste de texto.
3. El bono de Fox Mulder no se veía en ninguna parte de la ficha.
4. «WIP · 0.6.8» fijo en el salón; el README anunciaba otras versiones.
5. La ayuda emergente solo describía los controles en el primer render de cada ventana.
6. Los diálogos de tirada no tenían «Cancelar» ni mostraban qué se iba a tirar.
7. Los títulos «PJ:» y «Caso:» (útiles en el directorio) aparecían en cabeceras y tarjetas.
8. Compendio Reglas: títulos de página truncados a la primera línea del PDF y erratas («sufr ís», «l as», «p álida»).
9. Las tiradas ignoraban la visibilidad elegida en el chat.
10. Los botones de «Cuaderno de la conspiración» y «Consejos» abrían el mismo compendio.
11. La publicación dependía de editar `system.json` y solo admitía prereleases; ahora es por etiqueta `vX.Y.Z` y el manifiesto usa `latest`.

## 4. Pendiente o a decidir

- **Derechos de los textos.** El repositorio público contiene el texto íntegro de las reglas y de las seis aventuras de la edición española. Conviene confirmar el permiso de publicación con los autores o editores antes de promocionarlo; si no lo hay, bastaría con retirar `_data/aventuras.json`, `reglas.json` y `guardiana.json` del repositorio y dejar los textos como material que cada mesa importa de su propio PDF.
- Foundry 14: la capa de compatibilidad está preparada, pero solo se ha probado en 13.351.
- Pruebas con jugadoras reales conectadas, Dice So Nice y lectores de pantalla.
- Un misterio propio no valida que se preparen veinte pistas.
- El título y el id no llevan el prefijo «MR-» porque ya estaba publicado; cambiarlo supondría un paquete nuevo.
