import {
  ID,
  STATS,
  MOVES,
  TIER_NAMES,
  formula,
  tier,
  outcome,
  outcomes,
  crownPlan,
  QUEEN,
  VOID,
  VOID_TEXT,
  advancePlan,
  ADVANCES,
  QUESTIONS,
  LIMITS,
  awardXp,
  expertMoveConflict,
} from "./rules.mjs";
import {
  esc,
  field,
  area,
  select,
  check,
  prompt,
  confirm,
  owner,
  gm,
  locked,
  safeSystem,
} from "./ui.mjs";
export const experts = () =>
  game.actors.filter((a) => a.type === "experta" && !a.system.retired);
export const cases = () => game.actors.filter((a) => a.type === "misterio");
export const has = (a, name) => a.items.some((i) => i.name === name);
export function club() {
  return game.settings.get(ID, "club");
}
export async function saveClub(c) {
  gm();
  return game.settings.set(ID, "club", c);
}
export async function chat(a, title, body, roll = null, flags = {}) {
  const data = {
    speaker: ChatMessage.getSpeaker({ actor: a }),
    content: `<article class="bb-chat"><div class="bb-eyebrow">EL CLUB DE LAS EXPERTAS</div><h3>${esc(title)}</h3>${body}</article>`,
    flags: { [ID]: flags },
  };
  if (roll) data.rolls = [roll];
  return ChatMessage.create(data);
}
export async function publishRoll(a, record) {
  let r = record.roll ? Roll.fromData(record.roll) : null;
  const resultRows = outcomes(record.move, { voidMystery: record.voidMystery })
    .map(({ index, label, text }) => `<li class="${index === record.tier ? "active" : ""}"><strong>${esc(label)}</strong><span>${esc(text)}</span></li>`)
    .join("");
  const details = [
    record.stat ? STATS[record.stat] : "",
    Number.isFinite(record.modifier) ? `Modificador ${record.modifier >= 0 ? "+" : ""}${record.modifier}` : "",
    record.mode === "advantage" ? "Ventaja" : record.mode === "disadvantage" ? "Desventaja" : record.mode === "cancelled" ? "Ventaja y desventaja se cancelan" : "",
    record.home ? `Objeto: ${record.home}` : "",
    record.note || "",
  ].filter(Boolean).join(" · ");
  return chat(
    a,
    MOVES[record.move] ?? record.move,
    `<div class="bb-result">${esc(record.crowned ? ["6−", "7–9", "10–11", "12+"][record.tier] : record.total)}</div><p><strong>${TIER_NAMES[record.tier]}</strong></p><p class="bb-current-outcome">${esc(outcome(record.move, record.tier, { voidMystery: record.voidMystery }))}</p>${details || record.context ? `<p class="bb-source">${esc(details || record.context)}</p>` : ""}${record.crowned ? `<p class="bb-crowned">♛ Resultado revisado mediante Corona. Total original: ${esc(record.total)}.</p>` : ""}<details class="bb-outcomes" open><summary>Todos los grados de resultado</summary><ol>${resultRows}</ol></details>${r ? '<details class="bb-original-dice"><summary>Ver los dados originales · ' + esc(r.formula) + "</summary>" + (await r.render()) + "</details>" : ""}`,
    r,
    { recordId: record.id, actorId: a.id, move: record.move },
  );
}
export async function rollMove(a, move, stat) {
  owner(a);
  if (a.system.retired) throw Error("Esta Experta está retirada.");
  const s = a.system;
  let html = select(
    "stat",
    "Habilidad",
    Object.entries(STATS),
    move === "occult" ? "sensitivity" : (stat ?? "reason"),
  );
  html += area(
    "context",
    "Apunte opcional para el chat (puedes explicarlo por voz)",
  );
  html += select("home", "Objeto del hogar", [
    ["", "Sin objeto"],
    ...s.home.filter((i) => !i.marked || i.reusable).map((i) => [i.id, i.name]),
  ]);
  html +=
    check("adv", "Una circunstancia o movimiento concede ventaja") +
    check("dis", "Una Condición o el peligro impone desventaja") +
    `<p class="bb-note">${s.conditions.length ? "Condiciones: " + esc(s.conditions.join(" · ")) + ". Solo dan desventaja si afectan a esta acción." : "Ventaja y desventaja se cancelan; nunca se acumulan."}</p>`;
  const data = await prompt(MOVES[move], html, move === "night" ? "Revisar y tirar" : "Lanzar los dados");
  if (!data) return;
  if (move === "night" && !(await confirm(
    "Última advertencia · Movimiento Nocturno",
    "La Guardiana debe explicar cómo el peligro es peor de lo que parece. Puedes retirarte ahora y buscar otra forma de actuar. Si continúas, los dados se lanzarán inmediatamente.",
  ))) return;
  return locked(a.uuid, async () => {
    owner(a);
    const n = safeSystem(a);
    const key = move === "occult" ? "sensitivity" : data.get("stat");
    if (!Object.hasOwn(STATS, key)) throw Error("Habilidad desconocida.");
    const home = data.get("home")
      ? n.home.find((i) => i.id === data.get("home"))
      : null;
    if (data.get("home") && (!home || (home.marked && !home.reusable)))
      throw Error("Ese objeto ya no está disponible.");
    const f = formula({
      move,
      modifier: n.stats[key] + n.bonus,
      advantage: data.has("adv") || !!home,
      disadvantage: data.has("dis"),
    });
    const advantage = data.has("adv") || !!home;
    const disadvantage = data.has("dis");
    const roll = await new Roll(f).evaluate();
    const record = {
      id: foundry.utils.randomID(),
      move,
      roll: roll.toJSON(),
      total: roll.total,
      tier: tier(roll.total),
      stat: key,
      modifier: n.stats[key] + n.bonus,
      mode: advantage && disadvantage ? "cancelled" : advantage ? "advantage" : disadvantage ? "disadvantage" : "normal",
      home: home?.name || "",
      note: data.get("context").trim(),
      context: `${STATS[key]}${data.get("context").trim() ? ` · ${data.get("context").trim()}` : ""}`,
      crowned: false,
    };
    if (home && !home.reusable) home.marked = true;
    n.bonus = 0;
    n.history.push(record);
    await a.update({ system: n });
    try {
      await publishRoll(a, record);
    } catch (e) {
      ui.notifications.warn(
        "La tirada se ha guardado. Puedes recuperarla desde Historial; no repitas el gasto.",
      );
      throw e;
    }
  });
}
export async function crown(a, recordId = null, forced = null) {
  owner(a);
  const s = a.system;
  const record = recordId ? s.history.find((x) => x.id === recordId) : null;
  if (
    recordId &&
    (!record ||
      record.move === "theorize" ||
      record.tier >= 3 ||
      record.resolved)
  )
    throw Error("Esta tirada no admite Corona.");
  const opts = [];
  if (forced !== "void")
    QUEEN.forEach((t, i) => {
      if (!s.queen.includes(i)) opts.push([`queen:${i}`, t]);
    });
  if (s.void < 5)
    opts.push([`void:${s.void}`, `${VOID[s.void]} · ${VOID_TEXT[s.void]}`]);
  if (!opts.length) throw Error("No quedan Coronas disponibles.");
  const d = await prompt(
    "Ponerse una Corona",
    `<p>Después de narrar el resultado, podéis explorar otra línea temporal. La escena de Corona debe resolverse antes del fin de sesión.</p>${select("choice", "Escena", opts)}`,
    "Marcar Corona",
  );
  if (!d) return;
  return locked(a.uuid, async () => {
    const [kind, i] = d.get("choice").split(":");
    const n = crownPlan(safeSystem(a), kind, Number(i));
    if (recordId) {
      const r = n.history.find((x) => x.id === recordId);
      if (r.tier >= 3 || r.move === "theorize" || r.resolved)
        throw Error("La tirada ya no admite Corona.");
      r.tier++;
      r.crowned = true;
    }
    await a.update({ system: n });
    if (recordId)
      await publishRoll(
        a,
        n.history.find((x) => x.id === recordId),
      );
    else
      await chat(
        a,
        "Ponerse una Corona",
        `<p>${esc(kind === "queen" ? QUEEN[Number(i)] : VOID_TEXT[Number(i)])}</p>`,
      );
  });
}
export async function condition(a) {
  owner(a);
  if (a.system.conditions.length >= LIMITS.conditions) return crown(a);
  const d = await prompt(
    "Nueva Condición",
    field("name", "¿Cómo te ha afectado la escena?"),
  );
  if (!d?.get("name").trim()) return;
  return locked(a.uuid, async () => {
    if (a.system.conditions.length >= LIMITS.conditions)
      throw Error("Ya tienes tres Condiciones. Ponte una Corona.");
    await a.update({
      "system.conditions": [...a.system.conditions, d.get("name").trim()],
    });
  });
}
export async function clearCondition(a, index) {
  owner(a);
  const text = a.system.conditions[index];
  if (text === "Obsesionada con el Vacío")
    throw Error("Esta Condición es permanente.");
  if (!text) return;
  if (
    !(await confirm(
      "Resolver una Condición",
      `Eliminar «${text}» mediante una escena Afable o por indicación de la Guardiana.`,
    ))
  )
    return;
  await a.update({
    "system.conditions": a.system.conditions.filter((_, i) => i !== index),
  });
}
export async function home(a) {
  owner(a);
  if (a.system.home.length >= LIMITS.home)
    throw Error(`Hogar, dulce hogar tiene ${LIMITS.home} espacios y están todos ocupados.`);
  const d = await prompt(
    "Hogar, dulce hogar",
    field("name", "Un objeto con una historia") +
      area("story", "¿Por qué es especial?") +
      check("reusable", "Un movimiento permite usarlo sin marcarlo"),
  );
  if (!d?.get("name").trim()) return;
  return locked(a.uuid, async () => {
    if (a.system.home.length >= LIMITS.home)
      throw Error(`Hogar, dulce hogar tiene ${LIMITS.home} espacios y están todos ocupados.`);
    await a.update({
      "system.home": [
        ...a.system.home,
      {
        id: foundry.utils.randomID(),
        name: d.get("name").trim(),
        story: d.get("story"),
        marked: false,
        reusable: d.has("reusable"),
        },
      ],
    });
  });
}
export async function removeHome(a, id) {
  owner(a);
  const item = a.system.home.find((entry) => entry.id === id);
  if (!item) return;
  if (!(await confirm("Retirar un objeto del Hogar", `Quitar «${item.name}» de la ficha y dejar libre su espacio.`))) return;
  await a.update({ "system.home": a.system.home.filter((entry) => entry.id !== id) });
}
export async function advancement(a) {
  owner(a);
  const options = ADVANCES.flatMap((t, i) =>
    a.system.advances.includes(i) ? [] : [[i, t]],
  );
  if (a.system.xp < 5 || !options.length)
    throw Error("Necesitas 5 PE y un avance disponible.");
  const pack = await game.packs.get(`${ID}.expertos`).getDocuments();
  const d = await prompt(
    "Una vida de experiencia",
    select("index", "Avance", options) +
      select("stat", "Habilidad, si corresponde", Object.entries(STATS)) +
      select(
        "move",
        "Movimiento, si corresponde",
        pack.filter((i) => !has(a, i.name)).map((i) => [i.id, i.name]),
      ),
  );
  if (!d) return;
  return locked(a.uuid, async () => {
    const idx = Number(d.get("index"));
    const n = advancePlan(safeSystem(a), idx, d.get("stat"));
    if (n.advances.length >= LIMITS.advances) {
      n.xp = 0;
      n.xpPending = 0;
    } else {
      const pendingXp = Math.min(n.xpPending ?? 0, LIMITS.xp - n.xp);
      n.xp += pendingXp;
      n.xpPending = Math.max(0, (n.xpPending ?? 0) - pendingXp);
    }
    let item = null;
    if (idx === 2 || idx === 3) {
      item = pack.find((i) => i.id === d.get("move"));
      if (!item || has(a, item.name))
        throw Error("Selecciona un movimiento nuevo.");
      if (expertMoveConflict(item.name, experts(), a.id))
        throw Error("Ese movimiento es exclusivo o entra en conflicto con Dale Cooper / Fox Mulder.");
      applyExpert(n, item);
    }
    // One actor update includes embedded item creation, so the cost and benefit share the same operation.
    const update = { system: n };
    if (item)
      update.items = [
        ...a.items.map((i) => i.toObject()),
        { ...item.toObject(), _id: foundry.utils.randomID() },
      ];
    await a.update(update);
    await chat(a, "Un nuevo avance", `<p>${esc(ADVANCES[idx])}</p>`);
  });
}
export function applyExpert(n, item) {
  if (item.name === "Dale Cooper")
    n.stats.sensitivity = Math.min(3, n.stats.sensitivity + 1);
  if (item.name === "Jonathan Hart")
    n.stats.presence = Math.min(3, n.stats.presence + 1);
  const homes = {
    "Sonny Crockett": "Mi atuendo inconfundible",
    "Michael Knight": "Mi transporte de confianza",
    "R. Quincy": "Maletín médico",
    "Gordon Shumway": "Mi amistad felina",
  };
  if (homes[item.name])
    if (n.home.length >= LIMITS.home)
      throw Error(`Este movimiento necesita un espacio libre en Hogar, dulce hogar (${LIMITS.home} máximo).`);
  if (homes[item.name])
    n.home.push({
      id: foundry.utils.randomID(),
      name: homes[item.name],
      story: "Ponle nombre y cuenta su historia.",
      reusable: true,
      marked: false,
    });
}
export async function endSession(a) {
  owner(a);
  const session = club().session;
  if (a.system.endSession >= session)
    throw Error("Ya has cerrado esta sesión.");
  const qs = a.system.questions.map((i) => [i, QUESTIONS[i]]);
  if (has(a, "Milton Hardcastle"))
    qs.push([7, "¿Te has tomado la justicia por tu mano con algún malhechor?"]);
  const d = await prompt(
    "Fin de sesión",
    qs.map(([i, t]) => check(`q${i}`, t)).join("") +
      area("stars", "Estrellas: lo que más te ha gustado") +
      area("wishes", "Deseos: lo que te gustaría ver"),
    "Cerrar mi sesión",
  );
  if (!d) return;
  return locked(a.uuid, async () => {
    if (a.system.endSession >= session)
      throw Error("Esta sesión ya está cerrada.");
    if (a.system.history.some((r) => r.move === "occult" && !r.resolved))
      throw Error(
        "Resuelve primero las consecuencias ocultistas en Historial.",
      );
    if (a.system.pending.length)
      throw Error("Resuelve primero las escenas de Corona pendientes.");
    const gain = qs.filter(([i]) => d.has(`q${i}`)).length;
    const xp = awardXp(a.system, gain);
    const pendingCapacity = LIMITS.sessionQuestions + 1 - (a.system.xpPending ?? 0);
    const queued = Math.max(0, Math.min(xp.unawarded, pendingCapacity));
    await a.update({
      "system.xp": xp.xp,
      "system.xpPending": (a.system.xpPending ?? 0) + queued,
      "system.endSession": session,
    });
    await chat(
      a,
      "Estrellas y deseos",
      `<p>${gain} respuestas afirmativas${a.system.advances.length >= LIMITS.advances ? " · Los cinco avances ya están completos; la Experta no obtiene más PE" : ` · ${xp.awarded} PE anotados${queued ? ` · ${queued} PE queda pendiente y pasará al contador al elegir un avance` : ""}${xp.unawarded > queued ? " · El contador ya estaba completo: elige un avance antes de obtener más PE" : ""}`}.</p><p><b>Estrellas:</b> ${esc(d.get("stars"))}</p><p><b>Deseos:</b> ${esc(d.get("wishes"))}</p>`,
    );
  });
}
export async function theorize(a) {
  if (!a.testUserPermission(game.user, "OBSERVER"))
    throw Error("No puedes consultar este misterio.");
  const cs = a.system.clues.filter((c) => !c.void);
  const d = await prompt(
    "Teorizar · " + a.name,
    area("theory", "Apunte opcional de la teoría (podéis explicarla por voz)", a.system.theory) +
      cs.map((c) => check(c.id, c.text)).join("") +
      check(
        "consensus",
        "Todas hemos tenido ocasión de participar y hay consenso",
      ) +
      `<p>2d6 + pistas incorporadas − ${a.system.complexity}. Sin habilidades, ventajas, Coronas ni éxitos automáticos. Las pistas del Vacío no cuentan.</p>`,
    "Comprobar la teoría",
  );
  if (!d) return;
  if (!d.has("consensus")) throw Error("Hace falta una teoría consensuada.");
  const chosen = cs.filter((c) => d.has(c.id));
  const roll = await new Roll(
    formula({
      move: "theorize",
      clues: chosen.length,
      complexity: a.system.complexity,
    }),
  ).evaluate();
  await publishRoll(a, {
    id: foundry.utils.randomID(),
    move: "theorize",
    roll: roll.toJSON(),
    total: roll.total,
    tier: tier(roll.total),
    voidMystery: a.system.voidMystery,
    note: d.get("theory").trim(),
    context: `${d.get("theory").trim() ? `${d.get("theory").trim()} · ` : ""}${chosen.length} pistas: ${chosen.map((c) => c.text).join("; ")}`,
  });
  if (a.isOwner && d.get("theory").trim()) await a.update({ "system.theory": d.get("theory").trim() });
}

export async function resolveOccult(a, id) {
  owner(a);
  const record = a.system.history.find((r) => r.id === id);
  if (!record || record.move !== "occult" || record.resolved)
    throw Error("Este movimiento ya está resuelto.");
  if (
    !(await confirm(
      "Cerrar el resultado Ocultista",
      "Primero podéis usar Coronas para cambiar el resultado. Al cerrar, se aplican las consecuencias de este nivel y se conserva en el historial.",
    ))
  )
    return;
  if (record.tier <= 1) {
    const before = a.system.void;
    await crown(a, null, "void");
    if (a.system.void === before) return;
  }
  const history = structuredClone(a.system.history);
  const r = history.find((r) => r.id === id);
  r.resolved = true;
  await a.update({ "system.history": history });
  await chat(
    a,
    "Resultado Ocultista definitivo",
    `<p>${esc(outcome("occult", r.tier))}</p><p>${r.tier === 0 ? "Anotad que esta actividad está prohibida para las Expertas." : "La Guardiana puede crear un Movimiento en el directorio de Objetos y compartirlo con todas."}</p>`,
  );
}
