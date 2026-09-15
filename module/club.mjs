import { ID, BASE, STATS, creationIssue, conspiracyLayer } from "./rules.mjs";
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
const content = async (name) => {
  const response = await fetch(`systems/${ID}/_data/${name}.json`);
  if (!response.ok) throw Error("No se pudo cargar el contenido.");
  return response.json();
};
export async function createExpert() {
  if (!game.user.can("ACTOR_CREATE"))
    throw Error(
      "La Guardiana puede crear tu Experta o habilitar Crear Actores en los permisos del mundo.",
    );
  const items = await content("expertos");
  const d = await prompt(
    "Una nueva Experta del Crimen",
    `<p>Compostura y Razón +1; Vitalidad y Presencia 0; Sensibilidad −1. Añade un punto a una habilidad y elige un talento.</p>${field("name", "Nombre y apellido", "")}${field("style", "Estilo", "Cárdigan")}${field("hobby", "Quehacer favorito", "")}${select("boost", "Tu habilidad destacada", Object.entries(STATS))}${select(
      "expert",
      "Movimiento experto",
      items.map((i) => [i._id, i.name]),
    )}${area("life", "Pareja fallecida, hijos o mascotas y carrera anterior")}`,
    "Crear y abrir mi Experta",
  );
  if (!d) return;
  return locked("create-expert", async () => {
    const data = Object.fromEntries(d);
    const issue = creationIssue(data, op.experts(), items);
    if (issue) throw Error(issue);
    const item = items.find((i) => i._id === data.expert);
    const system = {
      stats: { ...BASE },
      style: data.style.trim(),
      hobby: data.hobby.trim(),
      description: data.life,
      home: [],
      ready: true,
    };
    system.stats[data.boost]++;
    op.applyExpert(system, item);
    const a = await Actor.create({
      name: data.name.trim(),
      type: "experta",
      img: `systems/${ID}/assets/teacup.svg`,
      system,
      items: [{ ...item, _id: foundry.utils.randomID() }],
      ownership: { default: 0, [game.user.id]: 3 },
      prototypeToken: { actorLink: true },
    });
    a.sheet.render(true);
    return a;
  });
}
export async function importMystery() {
  gm();
  const list = await content("mysteries");
  const active = op.cases().filter((a) => a.system.status === "active");
  if (active.length >= 3)
    throw Error(
      "Ya hay tres misterios activos. Resolved uno antes de abrir otro.",
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
      "El Misterio del Vacío está desbloqueado. Resolved los casos abiertos y preparad el final.",
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
    name: m.name,
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
    await op.saveClub({ ...c, session: c.session + 1, goldUsed: false });
    ui.notifications.info(
      "Nueva sesión: recapitulación, finales abiertos, preguntas y retazos de una vida agradable.",
    );
  });
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
  if (active.length >= 3 || (final && active.length))
    throw Error("Resuelve los misterios activos antes de continuar.");
  const d = await prompt(
    final ? "El Misterio del Vacío" : "Un misterio propio",
    field("name", "Título") +
      area("intro", "Presentación pública") +
      field("complexity", "Complejidad", final ? 10 : 6, "number"),
  );
  if (!d?.get("name").trim()) return;
  const a = await Actor.create({
    name: d.get("name"),
    type: "misterio",
    ownership: { default: 2 },
    img: `systems/${ID}/assets/teacup.svg`,
    system: {
      complexity: final ? 10 : Number(d.get("complexity")),
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
export class ClubApp extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2,
) {
  static DEFAULT_OPTIONS = {
    id: "bb-club",
    classes: ["bb-app", "bb-club"],
    window: { title: "The Candlelight · El salón del club", resizable: true },
    position: { width: 1040, height: 820 },
    actions: {
      create: guard(createExpert),
      import: guard(importMystery),
      custom: guard(customMystery),
      open: guard(async function (_e, b) {
        game.actors.get(b.dataset.id)?.sheet.render(true);
      }),
      session: guard(newSession),
      gold: guard(async () => golden(null)),
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
    return {
      gm: game.user.isGM,
      canCreate: game.user.can("ACTOR_CREATE"),
      club: op.club(),
      experts: op
        .experts()
        .filter((a) => a.testUserPermission(game.user, "OBSERVER")),
      cases: cs.filter((a) => a.testUserPermission(game.user, "OBSERVER")),
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
    };
  }
}
