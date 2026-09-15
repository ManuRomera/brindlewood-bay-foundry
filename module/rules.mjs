export const ID = "brindlewood-bay";
export const STATS = {
  vitality: "Vitalidad",
  composure: "Compostura",
  reason: "Razón",
  presence: "Presencia",
  sensitivity: "Sensibilidad",
};
export const STATS_INFO = {
  vitality: "Fuerza, resistencia y capacidad física.",
  composure: "Serenidad, autocontrol y aplomo bajo presión.",
  reason: "Lógica, conocimientos y capacidad para relacionar indicios.",
  presence: "Encanto, autoridad y habilidad para tratar con otras personas.",
  sensitivity: "Intuición y apertura a aquello que se oculta tras el mundo cotidiano.",
};
export const BASE = {
  vitality: 0,
  composure: 1,
  reason: 1,
  presence: 0,
  sensitivity: -1,
};
export const QUESTIONS = [
  "¿Han resuelto las Expertas algún misterio?",
  "¿Has menoscabado en secreto la autoridad de un oficial local?",
  "¿Has compartido tu sabiduría con una persona joven?",
  "¿Has compartido un recuerdo de un miembro de la familia fallecido?",
  "¿Te has comportado como una mujer con la mitad de tu edad?",
  "¿Te has vuelto loquita por alguien?",
  "¿Le has demostrado a alguien que «quien tuvo retuvo»?",
];
export const QUEEN = [
  "Narra tu recuerdo más preciado con tu pareja fallecida.",
  "Narra una escena que te muestre como una hermana o hija imperfecta.",
  "Narra una escena que te muestre como una madre imperfecta.",
  "Narra tu recuerdo más preciado con tus hijos.",
  "Narra una escena del presente que muestre un aspecto privado tuyo que pocas personas conocen.",
  "Narra una escena del presente que muestre un romance floreciente.",
  "Narra una escena del presente que muestre cómo satisfaces tus deseos físicos.",
];
export const VOID = [
  "Una sombra en el jardín",
  "El carruaje",
  "La pálida máscara",
  "Pepitas de granada",
  "El Vacío",
];
export const VOID_TEXT = [
  "En tus Retazos de una vida agradable y escenas Afables, narra la aparición sutil de entidades oscuras.",
  "Reduce Razón en 1 y aumenta Sensibilidad en 1.",
  "En conversaciones íntimas, haz una referencia casual a la muerte, el envejecimiento, el más allá o el Fin de Todas las Cosas.",
  "Obtienes la Condición permanente «Obsesionada con el Vacío».",
  "Retira a tu Experta mostrando cuán perdida está en el Vacío.",
];
export const ADVANCES = [
  "Aumentar una habilidad (+1, máximo +3)",
  "Aumentar una habilidad (+1, máximo +3)",
  "Aprender otro movimiento experto",
  "Aprender otro movimiento experto",
  "Desmarcar todos los objetos del hogar",
];
export const MOVES = {
  day: "Diurno",
  night: "Nocturno",
  meddle: "Metomentodo",
  occult: "Ocultista",
  theorize: "Teorizar",
};
export function tier(total) {
  return total >= 12 ? 3 : total >= 10 ? 2 : total >= 7 ? 1 : 0;
}
export const TIER_NAMES = [
  "6− · La Guardiana reacciona",
  "7–9 · Éxito con complicación",
  "10–11 · Éxito",
  "12+ · Éxito extraordinario",
];
export function formula({
  advantage = false,
  disadvantage = false,
  modifier = 0,
  move,
  clues = 0,
  complexity = 6,
} = {}) {
  if (move === "theorize")
    return `2d6 + ${integer(clues, 0, 1000)} - ${integer(complexity, 1, 20)}`;
  integer(modifier, -20, 30);
  return `${Boolean(advantage) === Boolean(disadvantage) ? "2d6" : advantage ? "3d6kh2" : "3d6kl2"} + ${modifier}`;
}
export function integer(v, min, max) {
  v = Number(v);
  if (!Number.isInteger(v) || v < min || v > max)
    throw Error(`Valor inválido (${min}–${max}).`);
  return v;
}
export function outcome(move, t, { voidMystery = false } = {}) {
  if (move === "theorize")
    return [
      "La teoría es incorrecta. La Guardiana reacciona.",
      "La teoría es correcta, pero hay una complicación molesta o una oportunidad peligrosa.",
      "La teoría es correcta. La Guardiana ofrece una oportunidad de atrapar al responsable o arreglar la situación.",
      voidMystery
        ? "La teoría es correcta. Averiguáis cuándo, dónde y cómo se celebrará el ritual."
        : "La teoría es correcta. Además, se da a conocer una persona de la conspiración.",
    ][t];
  if (move === "meddle")
    return [
      "La Guardiana reacciona.",
      "Encuentras una Pista, con una complicación. La Guardiana la concreta.",
      "Encuentras una Pista. La Guardiana la concreta.",
      "Encuentras una Pista y además una Pista del Vacío O una revelación de la conspiración, a elección de la Guardiana.",
    ][t];
  if (move === "occult")
    return [
      "Es algo que las Expertas nunca podrán hacer. Marca la Corona del Vacío.",
      "Funciona y marcas la Corona del Vacío. Definid el nuevo movimiento para toda la mesa.",
      "Funciona. Definid el movimiento con la Guardiana; queda disponible para todas y se conserva esta tirada.",
      "Funciona. Definid el movimiento con la Guardiana; queda disponible para todas y se conserva esta tirada.",
    ][t];
  return [
    "La Guardiana reacciona siguiendo la ficción y el peligro acordado.",
    move === "day"
      ? "La Guardiana explica cómo quedarías vulnerable. Decide si te retiras o sigues."
      : "Lo consigues con un coste o una complicación que narra la Guardiana.",
    "Lo consigues o mantienes la calma. Describe cómo.",
    "Lo consigues y la Guardiana concede un beneficio o ventaja adicional. Describe cómo.",
  ][t];
}
export function outcomes(move, options = {}) {
  return TIER_NAMES.map((label, index) => ({
    index,
    label,
    text: outcome(move, index, options),
  }));
}
export function crownPlan(s, kind, index) {
  const next = structuredClone(s);
  next.pending = next.pending.filter((p) => p.kind !== "crown");
  index = integer(index, 0, kind === "queen" ? 6 : 4);
  if (s.retired) throw Error("Esta Experta está retirada.");
  if (kind === "queen") {
    if (next.queen.includes(index)) throw Error("Esa Corona ya está marcada.");
    next.queen.push(index);
  } else if (kind === "void") {
    if (index !== next.void)
      throw Error("La Corona del Vacío se marca en orden.");
    next.void++;
    if (index === 1) {
      next.stats.reason--;
      next.stats.sensitivity++;
    }
    if (index === 3 && !next.conditions.includes("Obsesionada con el Vacío")) {
      if (next.conditions.length >= 3)
        next.pending.push({
          id: "condition-overflow",
          kind: "crown",
          text: "La cuarta Condición se sustituye por una Corona adicional. Márcala antes de cerrar la sesión.",
        });
      else next.conditions.push("Obsesionada con el Vacío");
    }
    if (index === 4) next.retired = true;
  } else throw Error("Corona desconocida.");
  next.pending.push({
    id: `${kind}-${index}-${next.pending.length}`,
    text: kind === "queen" ? QUEEN[index] : VOID_TEXT[index],
  });
  return next;
}
export function creationIssue(
  { name, hobby, style, boost, expert },
  actors,
  items,
) {
  if (
    !name?.trim() ||
    !hobby?.trim() ||
    !style?.trim() ||
    !Object.hasOwn(BASE, boost) ||
    !items.some((i) => i._id === expert)
  )
    return "Completa nombre, estilo, quehacer, habilidad y movimiento.";
  const move = items.find((i) => i._id === expert);
  const normalized = (x) => x.normalize("NFKC").toLocaleLowerCase("es").trim();
  if (
    actors.some(
      (a) =>
        !a.system.retired && normalized(a.system.hobby) === normalized(hobby),
    )
  )
    return "Ya hay una Experta con ese quehacer.";
  if (
    actors.some(
      (a) =>
        !a.system.retired &&
        a.items.some(
          (i) =>
            i.name === move.name ||
            (["Dale Cooper", "Fox Mulder"].includes(move.name) &&
              ["Dale Cooper", "Fox Mulder"].includes(i.name)),
        ),
    )
  )
    return "Ese movimiento inicial ya está elegido o entra en conflicto con Dale Cooper / Fox Mulder.";
  return null;
}
export function conspiracyLayer(count, mulder = false) {
  const thresholds = [3, 5, 10, 15].map((n) => n - (mulder ? 1 : 0));
  return thresholds.filter((n) => count >= n).length;
}
export function advancePlan(s, index, stat) {
  index = integer(index, 0, 4);
  if (s.xp < 5 || s.advances.includes(index))
    throw Error("Necesitas 5 PE y un avance disponible.");
  const n = structuredClone(s);
  if (index < 2) {
    if (!Object.hasOwn(STATS, stat) || n.stats[stat] >= 3)
      throw Error("Escoge una habilidad menor que +3.");
    n.stats[stat]++;
  }
  if (index === 4) n.home.forEach((i) => (i.marked = false));
  n.xp -= 5;
  n.advances.push(index);
  return n;
}
