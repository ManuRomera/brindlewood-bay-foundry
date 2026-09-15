import { ID } from "./rules.mjs";
import { esc, select, prompt, gm } from "./ui.mjs";
import * as op from "./operations.mjs";

const OPTIONS = {
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
};

const labels = {
  product: "Producto o servicio",
  format: "Formato televisivo",
  star: "Protagonista",
  promise: "Gran promesa",
  twist: "Giro del anuncio",
};
const choice = (list) => list[Math.floor(Math.random() * list.length)];

export async function advertisement() {
  gm();
  const club = op.club();
  const fields = Object.entries(OPTIONS).map(([key, values]) =>
    select(key, labels[key], [["", "Sorpréndeme"], ...values.map((value) => [value, value])]),
  ).join("");
  const data = await prompt(
    "¡Volvemos en 20 segundos!",
    `<p>Tras un fallo peligroso o dramático, ofrece una idea de anuncio. Si la jugadora decide narrarlo, vuelve a la escena y resuelve el movimiento como un 10–11.</p>${club.adUsed ? '<p class="bb-note"><b>Ya hubo una pausa para anuncios esta sesión.</b> El manual recomienda una por sesión.</p>' : ""}${fields}`,
    "Generar el anuncio",
  );
  if (!data) return;
  const result = Object.fromEntries(Object.entries(OPTIONS).map(([key, values]) => [
    key,
    data.get(key) || choice(values),
  ]));
  await op.saveClub({ ...club, adUsed: true });
  return op.chat(
    null,
    "¡Volvemos en 20 segundos!",
    `<div class="bb-ad"><p class="bb-eyebrow">PAUSA PARA LOS ANUNCIOS</p><h3>${esc(result.product)}</h3><p><b>Formato:</b> ${esc(result.format)}.</p><p><b>Protagoniza:</b> ${esc(result.star)}.</p><p><b>Promete:</b> ${esc(result.promise)}.</p><p><b>Pero:</b> ${esc(result.twist)}.</p><hr><p>La jugadora puede narrar el anuncio. Si lo hace, regresad a la escena y tratad el fallo como un resultado de <b>10–11</b>.</p></div>`,
  );
}

export const advertisementOptionCount = () =>
  Object.values(OPTIONS).reduce((total, values) => total * values.length, 1);
