/**
 * Reglas puras de la pizarra de investigación (sin Foundry): validación, límites y traducción de
 * operaciones a un `update` de Actor. Cada elemento y cada hilo se guarda bajo su propia clave
 * (`system.board.items.<id>`), así que dos personas que mueven cosas distintas nunca se pisan.
 */
export const BOARD = Object.freeze({ maxItems: 150, maxLinks: 300, width: 3200, height: 2000, textMax: 1200 });
export const THREAD_COLORS = Object.freeze({
  rojo: "#c0392b",
  azul: "#2c6fbb",
  verde: "#2f8f5b",
  ambar: "#d9a21b",
  violeta: "#7d4fb5",
  negro: "#2b2b2b",
});
export const NOTE_COLORS = Object.freeze(["amarillo", "rosa", "verde", "azul"]);
export const ITEM_TYPES = Object.freeze(["clue", "person", "note", "photo"]);

const ID = /^[A-Za-z0-9]{8,24}$/;
const IMAGE = /^(?:https?:\/\/[^\s"'<>]+|[\w%@+\-. /()]+)\.(?:png|jpe?g|webp|gif|avif|svg)(?:\?[^\s"'<>]*)?$/i;
const clamp = (value, min, max) => Math.min(max, Math.max(min, Math.round(Number(value))));
const text = (value) => String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").slice(0, BOARD.textMax);

const requireId = (id) => {
  if (!ID.test(String(id))) throw Error("Identificador de pizarra inválido.");
  return String(id);
};

function cleanFields(data, existing) {
  const out = {};
  if ("x" in data) out.x = clamp(data.x, 0, BOARD.width - 40);
  if ("y" in data) out.y = clamp(data.y, 0, BOARD.height - 40);
  if ("z" in data) out.z = clamp(data.z, 0, 99999);
  if ("text" in data) {
    if (!["note", "photo"].includes(existing.type)) throw Error("Solo las notas y las fotos tienen texto propio.");
    out.text = text(data.text);
  }
  if ("color" in data) {
    if (existing.type !== "note") throw Error("Solo las notas tienen color.");
    if (!NOTE_COLORS.includes(data.color)) throw Error("Color de nota desconocido.");
    out.color = data.color;
  }
  if ("src" in data) {
    if (existing.type !== "photo") throw Error("Solo las fotos tienen imagen.");
    if (!IMAGE.test(String(data.src)) || String(data.src).includes("..")) throw Error("Imagen no permitida.");
    out.src = String(data.src);
  }
  return out;
}

/**
 * @param {{items?:object, links?:object}} board  estado actual
 * @param {object[]} ops  {op:"set"|"remove", kind:"items"|"links", id, data?}
 * @param {{clueIds:Set<string>, suspectIds:Set<string>}} ctx  referencias válidas del caso
 * @returns {{ops:object[], update:object, board:object}}  operaciones limpias (incluye los hilos que caen con un elemento),
 *   el `update` de Actor equivalente y el estado resultante.
 */
export function planOps(board, ops, ctx) {
  const work = { items: structuredClone(board?.items ?? {}), links: structuredClone(board?.links ?? {}) };
  const clean = [];
  const update = {};
  const dropLink = (id) => {
    delete work.links[id];
    update[`system.board.links.-=${id}`] = null;
    clean.push({ op: "remove", kind: "links", id });
  };
  if (!Array.isArray(ops) || ops.length > 40) throw Error("Lote de operaciones inválido.");
  for (const raw of ops) {
    const id = requireId(raw?.id);
    if (raw.kind === "items" && raw.op === "set") {
      const data = raw.data ?? {};
      const existing = work.items[id];
      if (existing) {
        const fields = cleanFields(data, existing);
        Object.assign(existing, fields);
        for (const [key, value] of Object.entries(fields)) update[`system.board.items.${id}.${key}`] = value;
        clean.push({ op: "set", kind: "items", id, data: fields });
        continue;
      }
      if (!ITEM_TYPES.includes(data.type)) throw Error("Tipo de elemento desconocido.");
      if (Object.keys(work.items).length >= BOARD.maxItems) throw Error("La pizarra está llena.");
      const item = { type: data.type, x: 0, y: 0, z: 1 };
      if (data.type === "clue") {
        if (!ctx.clueIds.has(data.ref)) throw Error("Esa pista no existe en este caso.");
        item.ref = data.ref;
      } else if (data.type === "person") {
        if (!ctx.suspectIds.has(data.ref)) throw Error("Esa persona no existe en este caso.");
        item.ref = data.ref;
      } else if (data.type === "note") Object.assign(item, { text: "", color: "amarillo" });
      else Object.assign(item, { text: "", src: "" });
      if (data.type === "photo" && !("src" in data)) throw Error("Una foto necesita su imagen.");
      const fields = cleanFields(data, item);
      Object.assign(item, fields);
      work.items[id] = item;
      for (const [key, value] of Object.entries(item)) update[`system.board.items.${id}.${key}`] = value;
      clean.push({ op: "set", kind: "items", id, data: { ...item } });
    } else if (raw.kind === "items" && raw.op === "remove") {
      if (!work.items[id]) continue;
      delete work.items[id];
      update[`system.board.items.-=${id}`] = null;
      clean.push({ op: "remove", kind: "items", id });
      for (const [linkId, link] of Object.entries(work.links)) if (link.from === id || link.to === id) dropLink(linkId);
    } else if (raw.kind === "links" && raw.op === "set") {
      const data = raw.data ?? {};
      if (work.links[id]) throw Error("Ese hilo ya existe.");
      if (!work.items[data.from] || !work.items[data.to] || data.from === data.to) throw Error("Un hilo une dos elementos distintos de la pizarra.");
      if (!Object.hasOwn(THREAD_COLORS, data.color)) throw Error("Color de hilo desconocido.");
      if (Object.keys(work.links).length >= BOARD.maxLinks) throw Error("Hay demasiados hilos.");
      const twin = Object.values(work.links).some(
        (link) => link.color === data.color && [link.from, link.to].sort().join() === [data.from, data.to].sort().join(),
      );
      if (twin) continue;
      const link = { from: data.from, to: data.to, color: data.color };
      work.links[id] = link;
      for (const [key, value] of Object.entries(link)) update[`system.board.links.${id}.${key}`] = value;
      clean.push({ op: "set", kind: "links", id, data: link });
    } else if (raw.kind === "links" && raw.op === "remove") {
      if (work.links[id]) dropLink(id);
    } else throw Error("Operación de pizarra desconocida.");
  }
  return { ops: clean, update, board: work };
}
