import { ID, BASE, STATS, STATS_INFO, QUESTIONS, LIMITS, creationIssue, conspiracyLayer, complexityIssue } from "./rules.mjs";
import {
  esc,
  field,
  area,
  select,
  check,
  prompt,
  confirm,
  guard,
  gm,
  owner,
  locked,
  safeSystem,
} from "./ui.mjs";
import * as op from "./operations.mjs";
import { attachInfo } from "./inspector.mjs";
import { rememberWindow, clearRememberedWindows } from "./window-state.mjs";
import { advertisement } from "./advertisements.mjs";
import { creationPool, randomExpert, lifeText, creationQuestionOptions } from "./expert-generator.mjs";
import { syncCaseBooks } from "./salon-scene.mjs";
import { catalogName } from "./catalog.mjs";
const CREATION_SOCKET = `system.${ID}`;
const pendingCreations = new Map();
const content = async (name) => {
  const response = await fetch(`systems/${ID}/_data/${name}.json`);
  if (!response.ok) throw Error("No se pudo cargar el contenido.");
  return response.json();
};
const suggestionField = (key, label, values, value = "") =>
  `<label>${esc(label)}<input name="${esc(key)}" value="${esc(value)}" list="bb-${esc(key)}"></label><datalist id="bb-${esc(key)}">${values.map((entry) => `<option value="${esc(entry)}"></option>`).join("")}</datalist>`;
const frequencyLabel = (frequency) => frequency === "session" ? "Una vez por sesión" : frequency === "once" ? "Una sola vez" : frequency === "mystery" ? "Una vez por misterio" : "Sin límite de usos";
const moveChoices = (items, selected = "") => `<div class="bb-creation-choices">${items.map((item) => `<label class="bb-creation-choice"><input type="radio" name="expert" value="${item._id}" ${item._id === selected ? "checked" : ""}><span><b>${esc(item.name)}</b><small>${frequencyLabel(item.system.frequency)}</small><p>${esc(item.system.description)}</p></span></label>`).join("")}</div>`;
const homeFields = (values = []) => Array.from({ length: 5 }, (_, index) => field(`home${index + 1}`, `${index < 3 ? "Objeto obligatorio" : "Objeto opcional"} ${index + 1}`, values[index] ?? "")).join("");
const questionFields = (selected = [0, 1, 2]) => `<p class="bb-note"><b>Siempre marcada:</b> ${esc(QUESTIONS[0])}</p>${creationQuestionOptions().map(({ index, text }) => check(`q${index}`, text, selected.includes(index))).join("")}`;

async function finishExpert(data, items, { creatorId = game.user.id, render = true } = {}) {
  const issue = creationIssue(data, op.experts(), items);
  if (issue) throw Error(issue);
  const homes = data.home.map((entry) => entry.trim()).filter(Boolean);
  if (homes.length < 3 || homes.length > 5) throw Error("Hogar, dulce hogar empieza con entre tres y cinco objetos.");
  if (data.questions.length !== 3 || !data.questions.includes(0)) throw Error("Escoge exactamente dos preguntas además de la primera.");
  if (!data.partner.trim() || !data.family.trim() || !data.career.trim()) throw Error("Completa la pareja fallecida, la familia o mascotas y la carrera anterior.");
  const item = items.find((entry) => entry._id === data.expert);
  const system = {
    stats: { ...BASE },
    style: data.style.trim(),
    hobby: data.hobby.trim(),
    description: lifeText(data),
    home: homes.map((name) => ({ id: foundry.utils.randomID(), name, story: "Un recuerdo de la vida anterior de la Experta.", marked: false, reusable: false })),
    questions: data.questions,
    ready: true,
  };
  system.stats[data.boost]++;
  op.applyExpert(system, item);
  const actor = await Actor.create({
    name: catalogName("player", data.name),
    type: "experta",
    img: `systems/${ID}/assets/teacup.svg`,
    system,
    items: [{ ...item, _id: foundry.utils.randomID() }],
    ownership: { default: 0, [creatorId]: 3 },
    prototypeToken: { actorLink: true },
  });
  if (render) actor.sheet.render(true);
  return actor;
}

async function requestExpertCreation(data) {
  if (!game.users.activeGM) throw Error("La Guardiana debe estar conectada para validar y crear tu Experta.");
  const requestId = foundry.utils.randomID();
  const result = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingCreations.delete(requestId);
      reject(Error("La Guardiana no respondió a la solicitud de creación."));
    }, 15000);
    pendingCreations.set(requestId, { resolve, reject, timer });
  });
  game.socket.emit(CREATION_SOCKET, { action: "createExpert", requestId, data });
  const actorId = await result;
  const actor = game.actors.get(actorId);
  actor?.sheet.render(true);
  return actor;
}

async function submitExpert(data, items) {
  if (game.user.isGM) return finishExpert(data, items);
  return requestExpertCreation(data);
}

export function registerExpertCreationSocket() {
  game.socket.on(CREATION_SOCKET, async (message, senderId) => {
    if (message?.action === "expertCreated" && message.userId === game.user.id && game.users.get(senderId)?.isGM) {
      const pending = pendingCreations.get(message.requestId);
      if (!pending) return;
      clearTimeout(pending.timer);
      pendingCreations.delete(message.requestId);
      if (message.error) pending.reject(Error(message.error));
      else pending.resolve(message.actorId);
      return;
    }
    if (message?.action !== "createExpert" || game.users.activeGM?.id !== game.user.id) return;
    const user = game.users.get(senderId);
    if (!user || user.isGM) return;
    try {
      const items = await content("expertos");
      const actor = await locked("create-expert", () => finishExpert(message.data, items, { creatorId: user.id, render: false }));
      game.socket.emit(CREATION_SOCKET, { action: "expertCreated", requestId: message.requestId, userId: user.id, actorId: actor.id });
    } catch (error) {
      game.socket.emit(CREATION_SOCKET, { action: "expertCreated", requestId: message.requestId, userId: user.id, error: error.message });
    }
  });
}

export async function openExpertCreator() {
  const choice = await prompt(
    "Crear mi Experta del Crimen",
    `<p>Elige cómo quieres crear tu personaje. En ambos casos revisarás la ficha antes de guardarla.</p><div class="bb-creation-choices"><label class="bb-creation-choice"><input type="radio" name="mode" value="guided" checked><span><b>Paso a paso</b><small>Cinco etapas guiadas</small><p>Elige identidad, habilidad, movimiento experto, vida anterior, Hogar y objetivos.</p></span></label><label class="bb-creation-choice"><input type="radio" name="mode" value="random"><span><b>Creación aleatoria</b><small>Completa y revisable</small><p>Genera una Experta con gran variedad y opción de castellanizarla.</p></span></label></div>`,
    "Empezar",
  );
  if (!choice) return;
  return choice.get("mode") === "random" ? createRandomExpert() : createExpert();
}

export async function createExpert() {
  const items = await content("expertos"), actors = op.experts();
  const locale = await prompt("Crear una Experta · 1 de 5", `<p>El manual propone nombres y arquetipos de las series anglosajonas que inspiran el juego. Puedes trasladarlos por completo a España.</p>${check("castilian", "Castellanizar nombres, estilos, quehaceres y recuerdos")}`, "Elegir identidad");
  if (!locale) return;
  const pool = creationPool(locale.has("castilian"));
  const identity = await prompt("Crear una Experta · 2 de 5", `<p>Escoge una sugerencia o escribe la tuya. El quehacer debe ser único en el club.</p>${suggestionField("name", "Nombre y apellido", pool.names.flatMap((name) => pool.surnames.slice(0, 4).map((surname) => `${name} ${surname}`)))}${suggestionField("style", "Estilo", pool.styles, pool.styles[0])}${suggestionField("hobby", "Quehacer favorito", pool.hobbies)}`, "Asignar habilidades");
  if (!identity) return;
  if (!["name", "style", "hobby"].every((key) => identity.get(key)?.trim())) throw Error("Completa nombre, estilo y quehacer antes de continuar.");
  const normalizedHobby = identity.get("hobby").normalize("NFKC").toLocaleLowerCase("es").trim();
  if (actors.some((actor) => !actor.system.retired && actor.system.hobby.normalize("NFKC").toLocaleLowerCase("es").trim() === normalizedHobby)) throw Error("Ya hay una Experta activa con ese quehacer.");
  const stats = await prompt("Crear una Experta · 3 de 5", `<p><b>Las puntuaciones no se tiran.</b> El manual fija Vitalidad 0, Compostura +1, Razón +1, Presencia 0 y Sensibilidad −1. Añade +1 a una de ellas.</p><div class="bb-stat-preview">${Object.entries(STATS).map(([key, label]) => `<div><b>${esc(label)} ${BASE[key] >= 0 ? "+" : ""}${BASE[key]}</b><small>${esc(STATS_INFO[key])}</small></div>`).join("")}</div>${select("boost", "¿Dónde añades el punto?", Object.entries(STATS).map(([key, label]) => [key, `${label}: ${BASE[key] >= 0 ? "+" : ""}${BASE[key]} → ${BASE[key] + 1 >= 0 ? "+" : ""}${BASE[key] + 1}`]))}`, "Escoger movimiento experto");
  if (!stats) return;
  const available = items.filter((item) => !creationIssue({ name: identity.get("name"), style: identity.get("style"), hobby: identity.get("hobby"), boost: stats.get("boost"), expert: item._id }, actors, items));
  const movement = await prompt("Crear una Experta · 4 de 5", `<p>Lee el efecto completo antes de elegir. Al comienzo no puede repetirse y Dale Cooper entra en conflicto con Fox Mulder.</p>${moveChoices(available)}`, "Completar su vida");
  if (!movement?.get("expert")) return;
  const life = await prompt("Crear una Experta · 5 de 5", `<p>Presenta estos tres aspectos y anota entre tres y cinco objetos que la mesa encontraría en su casa.</p>${field("partner", "Su pareja fallecida")}${field("family", "Hijos, familia o mascotas")}${field("career", "Carrera antes de retirarse")}${homeFields()}<h3>Objetivos de la primera sesión</h3><p>Escoge exactamente dos además de la primera, que siempre cuenta.</p>${questionFields()}`, "Crear la Experta completa");
  if (!life) return;
  return locked("create-expert", async () => {
    const data = { ...Object.fromEntries(identity), boost: stats.get("boost"), expert: movement.get("expert"), ...Object.fromEntries(life) };
    data.home = [1, 2, 3, 4, 5].map((index) => data[`home${index}`]);
    data.questions = [0, ...[1, 2, 3, 4, 5, 6].filter((index) => life.has(`q${index}`))];
    return submitExpert(data, items);
  });
}

export async function createRandomExpert() {
  const locale = await prompt("Experta al azar", `<p>Generaremos nombre, estilo, quehacer, habilidad, movimiento, vida anterior, objetivos y objetos del hogar. Podrás revisarlo todo antes de crearla.</p>${check("castilian", "Castellanizar por completo a la Experta")}`, "Sorprenderme");
  if (!locale) return;
  const items = await content("expertos");
  const draft = randomExpert({ castilian: locale.has("castilian"), moves: items, experts: op.experts() });
  const move = items.find((item) => item._id === draft.expert);
  const review = await prompt("Revisar la Experta inesperada", `${field("name", "Nombre y apellido", draft.name)}${field("style", "Estilo", draft.style)}${field("hobby", "Quehacer", draft.hobby)}<div class="bb-note"><b>${esc(STATS[draft.boost])} recibe +1.</b> Las demás puntuaciones siguen la distribución fija del manual.</div><div class="bb-creation-choice selected"><span><b>${esc(move.name)}</b><small>${frequencyLabel(move.system.frequency)}</small><p>${esc(move.system.description)}</p></span></div>${field("partner", "Su pareja fallecida", draft.partner)}${field("family", "Hijos, familia o mascotas", draft.family)}${field("career", "Carrera antes de retirarse", draft.career)}${homeFields(draft.home)}<h3>Objetivos de la primera sesión</h3>${questionFields(draft.questions)}`, "Crear esta Experta");
  if (!review) return;
  const data = { ...draft, ...Object.fromEntries(review) };
  data.home = [1, 2, 3, 4, 5].map((index) => data[`home${index}`]);
  data.questions = [0, ...[1, 2, 3, 4, 5, 6].filter((index) => review.has(`q${index}`))];
  return locked("create-expert", () => submitExpert(data, items));
}
export async function importMystery() {
  gm();
  const list = await content("mysteries");
  const active = op.cases().filter((a) => a.system.status === "active");
  if (active.length >= LIMITS.activeMysteries)
    throw Error(
      "Ya hay tres misterios activos. Resuelve uno antes de abrir otro.",
    );
  const count = op
    .cases()
    .flatMap((a) => a.system.clues)
    .filter((c) => c.void).length;
  const layer = conspiracyLayer(
    count,
    op.experts().some((a) => op.has(a, "Fox Mulder")),
  );
  if (layer === 4)
    throw Error(
      "El Misterio del Vacío está desbloqueado. Resuelve los casos abiertos y preparad el final.",
    );
  const available = list.filter(
    (m) => !op.cases().some((a) => a.system.sourceId === m.id),
  );
  const d = await prompt(
    "Abrir un nuevo misterio",
    select(
      "case",
      "Caso",
      available.map((m) => [
        m.id,
        `${m.name} · Complejidad ${m.complexity}${m.minLayer ? " · Capa 3" : ""}`,
      ]),
    ) +
      check("one", "Partida de una sesión (complejidad 4 o 5)") +
      select(
        "complexity",
        "Complejidad para una sesión",
        [
          [4, "4"],
          [5, "5"],
        ],
        4,
      ),
  );
  if (!d) return;
  const m = list.find((m) => m.id === d.get("case"));
  if (!m) throw Error("No hay más misterios para importar.");
  if (layer < m.minLayer)
    throw Error("Este caso requiere la tercera capa de la conspiración.");
  const a = await Actor.create({
    name: catalogName("case", m.name),
    type: "misterio",
    img: `systems/${ID}/assets/teacup.svg`,
    ownership: { default: 2 },
    system: {
      sourceId: m.id,
      complexity: d.has("one") ? Number(d.get("complexity")) : m.complexity,
      description:
        "La Guardiana presentará el misterio. Las pistas aparecerán aquí a medida que se descubran.",
    },
  });
  await dossier(m.id);
  a.sheet.render(true);
  return a;
}
export async function dossier(id) {
  gm();
  const custom = game.journal.find((j) => j.getFlag(ID, "caseId") === id);
  if (custom) {
    await custom.sheet.render(true);
    return;
  }
  const doc = await game.packs.get(`${ID}.aventuras`).getDocument(id);
  if (doc) {
    const source = doc.toObject();
    delete source._id;
    source.name = `Guardiana · ${doc.name}`;
    source.ownership = { default: 0 };
    source.flags = { ...source.flags, [ID]: { caseId: id } };
    const journal = await JournalEntry.create(source);
    await journal.sheet.render(true);
    return;
  }
  ui.notifications.info(
    "Este misterio es propio. Prepara sus secretos en un diario privado.",
  );
}
export async function reveal(a) {
  gm();
  const list = await content("mysteries");
  const m = list.find((m) => m.id === a.system.sourceId);
  const opts = [
    ["custom", "Una pista propia"],
    ...(m?.clues ?? [])
      .filter((c) => !a.system.clues.some((x) => x.id === c.id))
      .map((c) => [c.id, "Pista · " + c.text]),
    ...(m?.voidClues ?? [])
      .filter((c) => !a.system.clues.some((x) => x.id === c.id))
      .map((c) => [c.id, "Vacío · " + c.text]),
    ...(m?.suspects ?? []).map((c, i) => [`npc-${i}`, "Persona · " + c.name]),
  ];
  const d = await prompt(
    "Revelar al grupo",
    select("id", "Elemento", opts) +
      area(
        "context",
        "Texto público / contexto (obligatorio para personas y pistas propias)",
      ) +
      check("void", "La pista propia pertenece al Vacío"),
  );
  if (!d) return;
  return locked(a.uuid, async () => {
    const id = d.get("id"),
      n = safeSystem(a);
    if (id.startsWith("npc-")) {
      const npc = m?.suspects[Number(id.slice(4))];
      if (!npc || !d.get("context").trim())
        throw Error(
          "Escribe una presentación pública. Los secretos del expediente no se copian.",
        );
      if (n.suspects.some((x) => x.name === npc.name))
        throw Error("Esta persona ya está presentada.");
      if (n.suspects.length >= LIMITS.suspectsMax)
        throw Error(`El misterio ya tiene el máximo de ${LIMITS.suspectsMax} sospechosos.`);
      n.suspects.push({ name: npc.name, description: d.get("context") });
      await a.update({ system: n });
      return;
    }
    const source =
      m?.clues.find((c) => c.id === id) ??
      m?.voidClues.find((c) => c.id === id);
    if (!source && id !== "custom") throw Error("Pista desconocida.");
    if (n.clues.some((c) => c.id === id))
      throw Error("La pista ya está revelada.");
    const text = d.get("context").trim() || source?.text;
    if (!text) throw Error("Escribe la pista.");
    const clue = {
      id: source?.id ?? foundry.utils.randomID(),
      text,
      void: source ? m.voidClues.some((c) => c.id === id) : d.has("void"),
    };
    n.clues.push(clue);
    await a.update({ system: n });
    await op.chat(
      a,
      clue.void ? "Una Pista del Vacío" : "Una nueva pista",
      `<p>${esc(text)}</p>`,
    );
  });
}
export async function useExpert(a, item) {
  owner(a);
  if (!item) throw Error("Movimiento desconocido.");
  const name = item.name;
  if (a.system.retired) throw Error("Esta Experta está retirada.");
  if (item.system.used && item.system.frequency !== "unlimited")
    throw Error("Este uso ya está gastado.");
  if (name === "Thomas Magnum") return golden(a, true);
  if (name === "Frank Dowling") {
    if (
      !(await confirm(
        "Resistir al Vacío",
        "Describe cómo tu fe te ayuda a resistir. Este movimiento solo puede usarse una vez.",
      ))
    )
      return;
    return locked(a.uuid, async () => {
      if (item.system.used) throw Error("El movimiento ya está usado.");
      const n = safeSystem(a);
      n.void = Math.max(0, n.void - Math.max(1, n.stats.sensitivity + 1));
      await a.update({
        system: n,
        items: a.items.map((i) => ({
          ...i.toObject(),
          system: {
            ...i.toObject().system,
            ...(i.id === item.id ? { used: true } : {}),
          },
        })),
      });
      await op.chat(
        a,
        name,
        `<p>La Corona del Vacío vuelve a ${n.void} marcas. «Obsesionada con el Vacío» permanece; las escenas pendientes y efectos anteriores se revisan con la Guardiana.</p>`,
      );
    });
  }
  if (name === "Fox Mulder") {
    const active = op.cases().filter((c) => c.system.status === "active");
    const d = await prompt(
      name,
      select(
        "case",
        "Misterio",
        active.map((c) => [c.id, c.name]),
      ) + area("scene", "Apunte opcional (puedes narrarlo por voz)"),
    );
    if (!d) return;
    return locked(a.uuid, async () => {
      const c = active.find((c) => c.id === d.get("case"));
      if (!c) throw Error("Misterio inválido.");
      const used = item.getFlag(ID, "mysteries") ?? [];
      if (used.includes(c.id))
        throw Error("Ya has visto al informante en este misterio.");
      const bonus = c.system.clues.filter((x) => x.void).length;
      const docs = a.items.map((i) => i.toObject());
      const own = docs.find((i) => i._id === item.id);
      own.flags = {
        ...own.flags,
        [ID]: { ...own.flags?.[ID], mysteries: [...used, c.id] },
      };
      await a.update({ "system.bonus": bonus, items: docs });
      await op.chat(
        a,
        name,
        `${d.get("scene").trim() ? `<p>${esc(d.get("scene"))}</p>` : ""}<p>+${bonus} en tu próxima tirada. No se aplica a Teorizar.</p>`,
      );
    });
  }
  const d = await prompt(
    name,
    `<p>${esc(item.system.description)}</p>${area("scene", "Apunte opcional (puedes narrarlo por voz)")}`,
    "Aplicar el movimiento",
  );
  if (!d) return;
  return locked(a.uuid, async () => {
    if (item.system.used && item.system.frequency !== "unlimited")
      throw Error("El movimiento ya está usado.");
    if (item.system.frequency === "session" || item.system.frequency === "once")
      await item.update({ "system.used": true });
    await op.chat(
      a,
      name,
      `${d.get("scene").trim() ? `<p>${esc(d.get("scene"))}</p>` : ""}<p>${esc(item.system.description)}</p>${name === "Colt Seavers" ? '<div class="bb-result">12+</div><p>Acción física peligrosa u osada. No se aplica a Teorizar.</p>' : ""}`,
    );
  });
}
export async function golden(a, extra = false) {
  if (extra) owner(a);
  else gm();
  const c = op.club();
  if (!extra && c.goldUsed)
    throw Error("El club ya ha usado Amanda en esta sesión.");
  const item = extra ? a.items.find((i) => i.name === "Thomas Magnum") : null;
  if (extra && (!item || item.system.used))
    throw Error("No queda el uso adicional de Thomas Magnum.");
  const d = await prompt(
    "¡Esto me recuerda a Amanda Delacourt!",
    field("title", "Título de la novela (sin repetir)") +
      area("similar", "¿En qué se parece a vuestra situación?") +
      area("solution", "¿Cómo lo resolvió Amanda?") +
      select("effect", "Efecto", [
        ["fact", "Declarar un hecho"],
        ["12", "12+ en una tirada relevante (nunca Teorizar)"],
      ]),
  );
  if (!d) return;
  const title = d.get("title").trim();
  if (!title || !d.get("similar").trim() || !d.get("solution").trim())
    throw Error("Completad título, semejanza y solución.");
  if (
    [
      ...c.novels,
      ...game.messages
        .filter((m) => m.getFlag(ID, "goldTitle"))
        .map((m) => m.getFlag(ID, "goldTitle")),
    ].some((x) => x.toLowerCase() === title.toLowerCase())
  )
    throw Error("Ya habéis usado esa novela.");
  if (extra) {
    await item.update({ "system.used": true });
  } else
    await op.saveClub({ ...c, goldUsed: true, novels: [...c.novels, title] });
  await op.chat(
    a,
    "Los misterios de la corona de oro",
    `<h4>${esc(title)}</h4><p>${esc(d.get("similar"))}</p><p>${esc(d.get("solution"))}</p><p>${d.get("effect") === "12" ? "12+ en la acción relevante. No es válido para Teorizar." : "El hecho queda incorporado a la ficción."}</p>`,
    null,
    { goldTitle: title },
  );
}
export async function newSession() {
  gm();
  if (
    !(await confirm(
      "Preparar la siguiente sesión",
      "Comienza una nueva sesión y recupera los movimientos de uso por sesión. Los objetos del hogar permanecen marcados.",
    ))
  )
    return;
  return locked("session", async () => {
    const c = op.club();
    for (const a of op.experts()) {
      const changes = a.items
        .filter((i) => i.system.frequency === "session")
        .map((i) => ({ _id: i.id, "system.used": false }));
      if (changes.length) await a.updateEmbeddedDocuments("Item", changes);
    }
    await op.saveClub({ ...c, session: c.session + 1, goldUsed: false, adUsed: false });
    ui.notifications.info(
      "Nueva sesión: recapitulación, finales abiertos, preguntas y retazos de una vida agradable.",
    );
  });
}
export async function resetCampaign() {
  gm();
  if (!(await confirm(
    "Reiniciar Brindlewood Bay",
    "Se eliminarán todas las Expertas, misterios, personas, movimientos del mundo, expedientes de campaña, mensajes y macros de ficha creados por este sistema. Los compendios y el contenido ajeno al sistema permanecerán. Esta acción no se puede deshacer.",
  ))) return;
  for (const app of [...foundry.applications.instances.values()])
    if (app instanceof ClubApp || app.document?.type && ["experta", "misterio", "pnj", "movimiento"].includes(app.document.type))
      await app.close();
  const actorIds = game.actors.filter((actor) => ["experta", "misterio", "pnj"].includes(actor.type)).map((actor) => actor.id);
  const itemIds = game.items.filter((item) => item.type === "movimiento").map((item) => item.id);
  const journalIds = game.journal.filter((journal) => journal.getFlag(ID, "caseId")).map((journal) => journal.id);
  const messageIds = game.messages.filter((message) => message.flags?.[ID] !== undefined).map((message) => message.id);
  const macroIds = game.macros.filter((macro) => macro.getFlag(ID, "actorUuid")).map((macro) => macro.id);
  if (messageIds.length) await ChatMessage.deleteDocuments(messageIds);
  if (journalIds.length) await JournalEntry.deleteDocuments(journalIds);
  if (macroIds.length) await Macro.deleteDocuments(macroIds);
  if (itemIds.length) await Item.deleteDocuments(itemIds);
  if (actorIds.length) await Actor.deleteDocuments(actorIds);
  await op.saveClub({ session: 1, goldUsed: false, adUsed: false, novels: [] });
  await syncCaseBooks();
  clearRememberedWindows();
  ui.notifications.info("Brindlewood Bay vuelve a estar listo para una campaña nueva.");
  new ClubApp().render(true);
}
export async function customMystery() {
  gm();
  const count = op
    .cases()
    .flatMap((a) => a.system.clues)
    .filter((c) => c.void).length;
  const final =
    conspiracyLayer(
      count,
      op.experts().some((a) => op.has(a, "Fox Mulder")),
    ) === 4;
  const active = op.cases().filter((a) => a.system.status === "active");
  if (active.length >= LIMITS.activeMysteries || (final && active.length))
    throw Error("Resuelve los misterios activos antes de continuar.");
  const d = await prompt(
    final ? "El Misterio del Vacío" : "Un misterio propio",
    field("name", "Título") +
      area("intro", "Presentación pública") +
      (final
        ? `<p class="bb-note">El Misterio del Vacío siempre tiene complejidad ${LIMITS.voidComplexity}.</p>`
        : select("complexity", "Complejidad normal", [[6, "6"], [7, "7"], [8, "8"]], 6)),
  );
  if (!d?.get("name").trim()) return;
  const complexity = final ? LIMITS.voidComplexity : Number(d.get("complexity"));
  const issue = complexityIssue(complexity, { voidMystery: final });
  if (issue) throw Error(issue);
  const a = await Actor.create({
    name: catalogName("case", d.get("name")),
    type: "misterio",
    ownership: { default: 2 },
    img: `systems/${ID}/assets/teacup.svg`,
    system: {
      complexity,
      voidMystery: final,
      description: d.get("intro"),
    },
  });
  await a.update({ "system.sourceId": a.id });
  await JournalEntry.create({
    name: `Guardiana · ${a.name}`,
    ownership: { default: 0 },
    flags: { [ID]: { caseId: a.id } },
    pages: [
      {
        name: "Preparación",
        type: "text",
        text: {
          format: 1,
          content:
            "<h2>El reparto</h2><p>Alrededor de diez personas; no fijes al culpable.</p><h2>Trazar la escena</h2><p>Cuatro o cinco localizaciones. En el Misterio del Vacío: ¿De qué manera se ha visto afectado este lugar por la magia negra de las Matronas?</p><h2>Veinte pistas</h2><p>Prepara pistas flexibles. En el final, la teoría debe resolver la hora, el lugar y el modo del ritual. Complejidad 10, sin efecto adicional de 12+.</p>",
        },
      },
    ],
  });
  a.sheet.render(true);
}
export class ClubApp extends rememberWindow(foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2,
)) {
  static DEFAULT_OPTIONS = {
    id: "bb-club",
    classes: ["bb-app", "bb-club"],
    window: { title: "The Candlelight · El salón del club", resizable: true },
    position: { width: 1040, height: 820 },
    actions: {
      create: guard(createExpert),
      random: guard(createRandomExpert),
      import: guard(importMystery),
      custom: guard(customMystery),
      open: guard(async function (_e, b) {
        game.actors.get(b.dataset.id)?.sheet.render(true);
      }),
      session: guard(newSession),
      gold: guard(async () => golden(null)),
      advertisement: guard(advertisement),
      reset: guard(resetCampaign),
      rules: guard(async () => game.packs.get(`${ID}.reglas`).render(true)),
      guardiana: guard(async () => {
        gm();
        game.packs.get(`${ID}.guardiana`).render(true);
      }),
      conspiracy: guard(async () => {
        gm();
        game.packs.get(`${ID}.guardiana`).render(true);
      }),
      safety: guard(async () =>
        op.chat(
          null,
          "Pausa de la escena",
          "<p>Una persona de la mesa pide una pausa. Revisad o saltad el contenido de la escena; no hace falta explicar el motivo.</p>",
        ),
      ),
    },
  };
  static PARTS = {
    body: {
      template: `systems/${ID}/templates/club.hbs`,
      scrollable: [".bb-scroll"],
    },
  };
  async _onRender(context, options) {
    await super._onRender(context, options);
    attachInfo(this.element);
  }
  async _prepareContext() {
    const cs = op.cases();
    const count = cs
      .flatMap((a) => a.system.clues)
      .filter((c) => c.void).length;
    const mulder = op.experts().some((a) => op.has(a, "Fox Mulder"));
    const visibleCases = cs.filter((a) => a.testUserPermission(game.user, "OBSERVER"));
    const visibleExperts = op.experts().filter((a) => a.testUserPermission(game.user, "OBSERVER"));
    const activeVisible = visibleCases.filter((a) => a.system.status === "active");
    return {
      gm: game.user.isGM,
      canCreate: true,
      club: op.club(),
      experts: visibleExperts.map((actor) => ({
        actor,
        id: actor.id,
        name: actor.name,
        img: actor.img,
        system: actor.system,
        crownTotal: actor.system.queen.length + actor.system.void,
      })),
      cases: visibleCases.map((actor) => ({
        actor,
        id: actor.id,
        name: actor.name,
        system: actor.system,
        regular: actor.system.clues.filter((clue) => !clue.void),
        voidClues: actor.system.clues.filter((clue) => clue.void),
      })),
      voidCount: count,
      layer: conspiracyLayer(count, mulder),
      thresholds: [3, 5, 10, 15].map((v, i) => ({
        value: v - (mulder ? 1 : 0),
        label: [
          "La historia de la bahía",
          "Las Matronas",
          "Acción directa",
          "El Misterio del Vacío",
        ][i],
        open: count >= v - (mulder ? 1 : 0),
      })),
      limits: LIMITS,
      activeCount: cs.filter((a) => a.system.status === "active").length,
      visibleActiveCount: activeVisible.length,
      teamClues: activeVisible.flatMap((actor) => actor.system.clues).filter((clue) => !clue.void).length,
      teamVoidClues: activeVisible.flatMap((actor) => actor.system.clues).filter((clue) => clue.void).length,
      expertCount: visibleExperts.length,
      adUsed: op.club().adUsed,
    };
  }
}
