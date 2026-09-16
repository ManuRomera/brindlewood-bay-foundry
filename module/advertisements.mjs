import { esc, select, prompt, gm } from "./ui.mjs";
import * as op from "./operations.mjs";

export const ADVERTISEMENT_TABLES = Object.freeze({
  product: [
    "tienda de muebles", "alarma de emergencia", "sorteo por correo", "abogada de lesiones",
    "residencia frente al mar", "audífonos discretos", "seguro de decesos", "crucero con baile",
    "sillón elevador", "vitaminas milagrosas", "dentadura de aspecto natural", "teléfono de teclas grandes",
    "robot aspirador", "colchón ortopédico", "gafas para leer la letra pequeña", "clases de baile",
    "comida preparada a domicilio", "club de jardinería", "tinte capilar", "balneario de fin de semana",
    "pastillero inteligente", "seguro para mascotas", "enciclopedia de coleccionista", "curso de pintura",
    "detective privado", "crema rejuvenecedora", "calzado cómodo", "agencia matrimonial",
    "té digestivo", "cerradura de alta seguridad", "cupón para un bufé", "línea telefónica de tarot",
  ],
  format: [
    "testimonio emocionado", "demostración en un plató", "antes y después", "teletienda con público",
    "jingle pegadizo", "entrevista a una supuesta especialista", "recreación dramática", "concurso telefónico",
    "familia agradecida", "animación barata", "presentador demasiado entusiasta", "noticia patrocinada",
    "musical de treinta segundos", "comparación de laboratorio", "venta desde una feria local", "llamada en directo",
  ],
  star: [
    "una actriz retirada", "un médico de televisión", "dos gemelas idénticas", "un matrimonio competitivo",
    "una nieta muy paciente", "un gato con pajarita", "una abogada sonriente", "un antiguo atleta",
    "una médium local", "un coro de jubiladas", "un mayordomo impecable", "una clienta sospechosamente feliz",
  ],
  promise: [
    "recuperar el control de tu vida", "no volver a preocuparte", "parecer diez años más joven",
    "dejar boquiabierta a la familia", "convertir cada sábado en una fiesta", "resolverlo con una sola llamada",
    "proteger lo que más quieres", "dormir como no dormías desde 1978", "ahorrar una fortuna",
    "hacer nuevas amistades", "ser la envidia del vecindario", "recibir un segundo producto gratis",
  ],
  twist: [
    "la letra pequeña ocupa toda la pantalla", "nadie sabe pronunciar el nombre del producto",
    "el teléfono suena antes de mostrar el número", "el decorado empieza a desmoronarse",
    "la mascota demuestra ser quien manda", "el testimonio contradice al presentador",
    "aparece una inquietante silueta al fondo", "la oferta caducó ayer", "el jingle no termina nunca",
    "la demostración funciona demasiado bien", "una taza de té aparece en todos los planos",
    "el precio final requiere seis cuotas adicionales", "la voz en off parece conocer a la Experta",
    "el número gratuito contiene demasiados sietes", "todo sucede en una cocina idéntica a la de alguien del club",
    "el eslogan resulta ser una advertencia",
  ],
});

const choice = (list) => list[Math.floor(Math.random() * list.length)];

export function advertisementSeed(random = Math.random) {
  const result = Object.fromEntries(Object.entries(ADVERTISEMENT_TABLES).map(([key, values]) => [
    key,
    values[Math.floor(random() * values.length)],
  ]));
  return {
    ...result,
    text: `Una propuesta en formato de ${result.format} anuncia ${result.product}. Está protagonizada por ${result.star} y promete ${result.promise}, pero ${result.twist}.`,
  };
}

export const advertisementSeedMarkup = (result) =>
  `<p><strong>Producto:</strong> ${esc(result.product)}</p>` +
  `<p><strong>Formato:</strong> ${esc(result.format)}</p>` +
  `<p><strong>Protagonista:</strong> ${esc(result.star)}</p>` +
  `<p><strong>Promesa:</strong> ${esc(result.promise)}</p>` +
  `<p><strong>Giro:</strong> ${esc(result.twist)}</p>` +
  `<hr><p><strong>Propuesta completa:</strong> ${esc(result.text)}</p>` +
  `<p>Usadla como punto de partida: podéis cambiar cualquier detalle.</p>`;

export async function advertisement() {
  gm();
  const club = op.club();
  const data = await prompt(
    "¡Volvemos en 20 segundos!",
    `<p>Tras un fallo peligroso o dramático, da a la jugadora un indicio sencillo. Ella puede improvisar el anuncio o recurrir a la macro de inspiración.</p>${club.adUsed ? '<p class="bb-note"><b>Ya hubo una pausa para anuncios esta sesión.</b> El manual recomienda una por sesión.</p>' : ""}${select("product", "Indicio", [["", "Sorpréndeme"], ...ADVERTISEMENT_TABLES.product.map((value) => [value, value])])}`,
    "Dar paso al anuncio",
  );
  if (!data) return;
  const product = data.get("product") || choice(ADVERTISEMENT_TABLES.product);
  await op.saveClub({ ...club, adUsed: true });
  return op.chat(
    null,
    "¡Volvemos en 20 segundos!",
    `<div class="bb-ad"><p class="bb-eyebrow">PAUSA PARA LOS ANUNCIOS</p><h3>${esc(product)}</h3><p>La jugadora puede narrar cualquier anuncio inspirado por este indicio. Si se bloquea, puede usar su macro opcional de inspiración.</p><hr><p>Si narra el anuncio, regresad a la escena y tratad el fallo como un resultado de <b>10–11</b>.</p></div>`,
  );
}

export function advertisementInspiration() {
  const result = advertisementSeed();
  return op.chat(
    null,
    "Propuesta de Guión de Anuncio",
    advertisementSeedMarkup(result),
  );
}

export const advertisementOptionCount = () =>
  Object.values(ADVERTISEMENT_TABLES).reduce((total, values) => total * values.length, 1);
