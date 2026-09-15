import { QUESTIONS } from "./rules.mjs";

const COASTAL = {
  names: ["Barbara", "Billy", "Birdie", "Daisy", "Doris", "Ernestine", "Georgina", "Hyacinth", "Jane", "Jessica", "Laura", "Louise", "Marilyn", "Mavis", "Maxine", "Muriel", "Nellie", "Opal", "Pearl", "Rosemary", "Ruby", "Ruth", "Violet", "Agnes", "Beatrice", "Dorothy", "Evelyn", "Florence", "Gladys", "Harriet", "Irene", "Joan", "Lillian", "Martha", "Mildred", "Nancy", "Sylvia"],
  surnames: ["Whitmore", "Callahan", "Beaumont", "Hargrove", "Sinclair", "Pembroke", "Bellweather", "Davenport", "Winslow", "Prescott", "Hawthorne", "Bishop", "Holloway", "Mercer", "Fletcher", "Goodwin", "Webster", "Caldwell", "Abbott", "Langley", "Pritchard", "Marlowe", "Gable", "Sutton", "Tremayne", "Fairchild"],
  styles: ["Cárdigan", "Jackie O", "Boutique de alta costura", "Dorothy Zbornak", "Hippy", "Jogging", "Oficina", "Taconazos", "A la última", "¡A pescar!", "Alexis Carrington Colby", "Elegancia de domingo", "Náutica impecable", "Flores y perlas", "Gabardina de detective"],
  hobbies: ["Asistir a eventos benéficos", "Bordar colchas", "Cocinar", "Coleccionar botones", "Coleccionar flores prensadas", "Coleccionar sellos", "Crear álbumes de recortes", "Cuidar del jardín", "Hacer calceta", "Hacer pasteles", "Modelar objetos con barro", "Observar aves", "Pintar", "Restaurar antigüedades", "Resolver crucigramas", "Cantar en el coro", "Organizar el mercadillo", "Pasear junto al faro", "Escribir cartas", "Cultivar rosas"],
  partners: ["Arthur, paciente relojero", "Edmund, capitán de ferry", "Frank, maestro de escuela", "George, veterinario de manos enormes", "Henry, bibliotecario y pésimo bailarín", "Walter, fotógrafo de bodas", "Samuel, carpintero naval", "Thomas, cocinero del puerto"],
  families: ["dos hijas que llaman cada domingo", "un hijo en Boston y una nieta curiosa", "tres hijos dispersos y un terrier mandón", "ningún hijo, pero una gata llamada Agatha", "una hijastra muy querida y dos nietos", "gemelos adultos que jamás se ponen de acuerdo"],
  careers: ["bibliotecaria municipal", "enfermera de urgencias", "directora de instituto", "periodista local", "abogada de familia", "restauradora de arte", "inspectora de correos", "contable de un astillero", "dueña de una mercería", "profesora de química", "agente de viajes", "productora de televisión regional"],
  homes: ["Una tetera heredada", "Prismáticos de observación", "Un manojo de llaves antiguas", "La cámara de fotos de Arthur", "Un impermeable amarillo", "Un costurero de nogal", "Una radio portátil", "El recetario familiar", "Una lupa con mango de plata", "Un atlas de carreteras", "Un termo abollado", "Una linterna de dinamo", "Una caja de postales", "Un bastón con compartimento", "Una grabadora de casete", "Un juego de ganzúas heredado", "Unas botas de agua", "El álbum del club"],
};

const SPANISH = {
  names: ["Amparo", "Angelines", "Aurora", "Begoña", "Carmen", "Carmina", "Concha", "Consuelo", "Dolores", "Elvira", "Encarna", "Esperanza", "Eugenia", "Felisa", "Gloria", "Inés", "Isabel", "Josefina", "Lola", "Lourdes", "Luisa", "Manuela", "Maribel", "Maruja", "Mercedes", "Milagros", "Montserrat", "Nieves", "Paquita", "Pilar", "Puri", "Remedios", "Rocío", "Rosario", "Sagrario", "Soledad", "Teresa", "Trini"],
  surnames: ["Alonso", "Álvarez", "Benítez", "Cabrera", "Calvo", "Campos", "Carmona", "Castillo", "Domínguez", "Esteban", "Fernández", "Fuentes", "Gallardo", "Garrido", "Giménez", "Herrera", "Iglesias", "Jiménez", "Lorenzo", "Marín", "Márquez", "Medina", "Molina", "Montero", "Morales", "Navarro", "Nieto", "Ortega", "Pascual", "Peña", "Prieto", "Ramírez", "Romero", "Sáez", "Santos", "Serrano", "Soler", "Vega", "Vicente"],
  styles: ["Rebeca y collar de perlas", "Domingo de misa", "Señora de barrio elegante", "Veraneo en Benidorm", "Luto impecable", "Traje de chaqueta", "Bata de flores con autoridad", "Chal de punto", "Peluquería de los jueves", "Mercadillo con estilo", "Marinera del Cantábrico", "Folclórica discreta", "Señora de notaría", "Abuela moderna", "Abrigo de paño castellano", "Pendientes de coral"],
  hobbies: ["Hacer croché", "Cuidar los geranios", "Preparar croquetas", "Jugar al dominó", "Ir a clases de sevillanas", "Restaurar muebles castellanos", "Coleccionar abanicos", "Organizar las fiestas del barrio", "Resolver autodefinidos", "Pintar azulejos", "Coser trajes regionales", "Hacer encaje de bolillos", "Pasear por el paseo marítimo", "Cantar en la rondalla", "Preparar conservas", "Jugar a la brisca", "Cuidar el huerto", "Hacer rosquillas", "Coleccionar décimos de lotería", "Participar en la asociación vecinal", "Visitar mercadillos", "Bailar pasodobles", "Leer novela negra", "Ir de balneario"],
  partners: ["Antonio, ferroviario y hombre de pocas palabras", "Manolo, relojero del barrio", "Julián, maestro de escuela", "Pepe, dueño de una ferretería", "Ramón, patrón de pesca", "Vicente, funcionario de Correos", "Rafael, médico rural", "Emilio, fotógrafo de bodas"],
  families: ["dos hijas que llaman después del parte", "un hijo en Zaragoza y tres nietas", "tres hijos repartidos por media España", "ningún hijo, pero un caniche llamado Curro", "una hijastra muy querida y una nieta universitaria", "gemelos adultos que discuten en cada comida familiar", "una hija en Alemania y un sobrino policía local"],
  careers: ["maestra de escuela pública", "enfermera de ambulatorio", "secretaria de ayuntamiento", "inspectora de Hacienda", "locutora de radio local", "abogada laboralista", "dueña de una mercería", "química de una conservera", "bibliotecaria municipal", "jefa de estación", "farmacéutica", "restauradora del museo provincial", "cocinera de un parador", "administrativa de banca"],
  homes: ["La olla a presión de su madre", "Un abanico con compartimento secreto", "La caja de herramientas de Manolo", "Un transistor que nunca falla", "Un manojo de llaves del antiguo ayuntamiento", "La mantelería buena", "Un costurero de madera", "Una guía Campsa de 1982", "Un rosario de plata", "La libreta de recetas", "Un termo de café", "Una cámara Werlisa", "Unas tijeras de modista", "Una petaca sin estrenar", "El álbum de la primera comunión", "Una bata de guatiné", "Un paraguas irrompible", "Una caja de polvorones", "Prismáticos del servicio militar", "Un sello de caucho oficial", "Una navaja de Albacete", "Un juego de dominó de marfilina"],
};

export const creationPool = (castilian = false) => castilian ? SPANISH : COASTAL;
const pick = (values, random) => values[Math.floor(random() * values.length)];
const sample = (values, count, random) => {
  const copy = [...values];
  const result = [];
  while (result.length < count && copy.length) result.push(copy.splice(Math.floor(random() * copy.length), 1)[0]);
  return result;
};

export function randomExpert({ castilian = false, moves = [], experts = [], random = Math.random } = {}) {
  const pool = creationPool(castilian);
  const activeExperts = experts.filter((actor) => !actor.system.retired);
  const usedHobbies = new Set(activeExperts.map((actor) => actor.system.hobby.normalize("NFKC").toLocaleLowerCase("es").trim()));
  const hobbies = pool.hobbies.filter((hobby) => !usedHobbies.has(hobby.normalize("NFKC").toLocaleLowerCase("es").trim()));
  const usedMoves = new Set(activeExperts.flatMap((actor) => actor.items.map((item) => item.name)));
  const hasDale = usedMoves.has("Dale Cooper"), hasFox = usedMoves.has("Fox Mulder");
  const availableMoves = moves.filter((move) => !usedMoves.has(move.name) && !(move.name === "Dale Cooper" && hasFox) && !(move.name === "Fox Mulder" && hasDale));
  if (!hobbies.length || !availableMoves.length) throw Error("No quedan combinaciones iniciales únicas para otra Experta.");
  const homeCount = 3 + Math.floor(random() * 2);
  return {
    castilian,
    name: `${pick(pool.names, random)} ${pick(pool.surnames, random)}`,
    style: pick(pool.styles, random),
    hobby: pick(hobbies, random),
    boost: pick(["vitality", "composure", "reason", "presence", "sensitivity"], random),
    expert: pick(availableMoves, random)._id,
    partner: pick(pool.partners, random),
    family: pick(pool.families, random),
    career: pick(pool.careers, random),
    home: sample(pool.homes, homeCount, random),
    questions: [0, ...sample([1, 2, 3, 4, 5, 6], 2, random)],
  };
}

export const randomExpertVariety = (castilian = false) => {
  const p = creationPool(castilian);
  const homeTrios = p.homes.length * (p.homes.length - 1) * (p.homes.length - 2) / 6;
  const questionPairs = 15;
  const initialMoves = 19;
  return p.names.length * p.surnames.length * p.styles.length * p.hobbies.length * 5 * p.partners.length * p.families.length * p.careers.length * homeTrios * questionPairs * initialMoves;
};

export function lifeText(data) {
  return `Pareja fallecida: ${data.partner.trim()}\nFamilia, hijos o mascotas: ${data.family.trim()}\nCarrera anterior: ${data.career.trim()}`;
}

export function creationQuestionOptions() {
  return QUESTIONS.slice(1).map((text, index) => ({ index: index + 1, text }));
}
