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
  canCrownRecord,
  QUEEN,
  VOID,
  VOID_TEXT,
  advancePlan,
  ADVANCES,
  QUESTIONS,
  LIMITS,
  awardXp,
  expertMoveConflict,
  PERMANENT,
  ADVANTAGE_MOVES,
  afablePlan,
} from "./rules.mjs";
import { aplicarModo } from "./compat.mjs";
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
export const signed = (n) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);
export function club() {
  return game.settings.get(ID, "club");
}
export async function saveClub(c) {
  gm();
  return game.settings.set(ID, "club", c);
}
function chatContent(title, body) {
  return `<article class="bb-chat"><div class="bb-eyebrow">EL CLUB DE LAS EXPERTAS</div><h3>${esc(title)}</h3>${body}</article>`;
}
export async function chat(a, title, body, roll = null, flags = {}) {
  const data = {
    speaker: ChatMessage.getSpeaker({ actor: a }),
    content: chatContent(title, body),
    flags: { [ID]: flags },
  };
  if (roll) {
    data.rolls = [roll];
    // Las tiradas respetan la visibilidad elegida en el chat (pública, solo Guardiana, ciega, privada).
    aplicarModo(data);
  }
  return ChatMessage.create(data);
}
/** Mensaje solo para la Guardiana (avisos de reglas que no deben leer las jugadoras). */
export async function whisperGM(title, body) {
  const whisper = game.users.filter((user) => user.isGM && user.active).map((user) => user.id);
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ alias: "Brindlewood Bay" }),
    content: chatContent(title, body),
    whisper: whisper.length ? whisper : [game.user.id],
    flags: { [ID]: { whisper: true } },
  });
}
async function rollBody(record) {
  const r = record.roll ? Roll.fromData(record.roll) : null;
  const grades = outcomes(record.move, { voidMystery: record.voidMystery });
  const resultRows = grades
    .map(({ index, label, text }) => `<li class="${index === record.tier ? "active" : ""}"><strong>${esc(label)}</strong><span>${esc(text)}</span></li>`)
    .join("");
  const details = [
    record.stat ? STATS[record.stat] : "",
    Number.isFinite(record.modifier) ? `Modificador ${record.modifier >= 0 ? "+" : ""}${record.modifier}` : "",
    record.mode === "advantage" ? "Ventaja" : record.mode === "disadvantage" ? "Desventaja" : record.mode === "cancelled" ? "Ventaja y desventaja se cancelan" : "",
    record.home ? `Objeto: ${record.home}` : "",
    record.colombo ? "Frank Colombo: Pista extra aunque falle; Pista del Vacío extra con 12+" : "",
    record.note || "",
  ].filter(Boolean).join(" · ");
  const body = `<div class="bb-result">${esc(record.crowned ? ["6−", "7–9", "10–11", "12+"][record.tier] : record.total)}</div><p><strong>${esc(grades[record.tier].label)}</strong></p><p class="bb-current-outcome">${esc(outcome(record.move, record.tier, { voidMystery: record.voidMystery }))}</p>${details || record.context ? `<p class="bb-source">${esc(details || record.context)}</p>` : ""}${record.crowned ? `<p class="bb-crowned"><i class="fas fa-crown" aria-hidden="true"></i> Resultado revisado mediante Corona. Total original: ${esc(record.total)}.</p>` : ""}<details class="bb-outcomes" open><summary>Todos los grados de resultado</summary><ol>${resultRows}</ol></details>${r ? '<details class="bb-original-dice"><summary>Ver los dados originales · ' + esc(r.formula) + "</summary>" + (await r.render()) + "</details>" : ""}`;
  return { body, roll: r };
}
export async function publishRoll(a, record) {
  const rendered = await rollBody(record);
  return chat(
    a,
    MOVES[record.move] ?? record.move,
    rendered.body,
    rendered.roll,
    { recordId: record.id, actorId: a.id, move: record.move },
  );
}
async function reviseRollMessage(messageId, a, record) {
  const message = game.messages.get(messageId);
  if (!message || (!message.isAuthor && !game.user.isGM))
    throw Error("No puedes modificar esta tarjeta de chat.");
  if (
    message.getFlag(ID, "recordId") !== record.id ||
    message.getFlag(ID, "actorId") !== a.id
  ) throw Error("La tarjeta no corresponde a esta tirada.");
  const rendered = await rollBody(record);
  await message.update({
    content: chatContent(MOVES[record.move] ?? record.move, rendered.body),
  });
}
export async function rollMove(a, move, stat) {
  owner(a);
  if (a.system.retired) throw Error("Esta Experta está retirada.");
  const s = a.system;
  const chosen = move === "occult" ? "sensitivity" : (stat ?? (move === "day" || move === "night" ? "composure" : "reason"));
  const chips = Object.entries(STATS)
    .map(([key, label]) => `<label class="bb-chip-radio"><input type="radio" name="stat" value="${key}" ${key === chosen ? "checked" : ""} ${move === "occult" && key !== "sensitivity" ? "disabled" : ""}><span>${esc(label)}<b>${signed(s.stats[key])}</b></span></label>`)
    .join("");
  const colombo = move === "meddle" ? a.items.find((item) => item.name === "Frank Colombo" && !item.system.used) : null;
  const hints = a.items.filter((item) => ADVANTAGE_MOVES[item.name]).map((item) => `${esc(item.name)}: ${esc(ADVANTAGE_MOVES[item.name])}`);
  const html =
    `<div class="bb-roll"><fieldset class="bb-stat-pick"><legend>${move === "occult" ? "Habilidad (siempre Sensibilidad)" : "Habilidad"}</legend><div class="bb-chip-group">${chips}</div></fieldset>` +
    select("home", "Objeto del Hogar (concede ventaja)", [
      ["", "Sin objeto"],
      ...s.home.filter((i) => !i.marked || i.reusable).map((i) => [i.id, i.name]),
    ]) +
    check("adv", "Una circunstancia o un movimiento concede ventaja") +
    check("dis", "Una Condición o el peligro impone desventaja") +
    (colombo ? check("colombo", "Frank Colombo: es un lugar de ricos y famosos (gasta su uso de la sesión)") : "") +
    `<p class="bb-roll-preview" data-roll-preview aria-live="polite"></p>` +
    (s.bonus ? `<p class="bb-nota bb-bonus"><b>Fox Mulder:</b> +${s.bonus} en esta tirada, por las Pistas del Vacío del caso.</p>` : "") +
    (s.conditions.length ? `<p class="bb-nota"><b>Condiciones:</b> ${esc(s.conditions.join(" · "))}. Solo dan desventaja si afectan a esta acción.</p>` : "") +
    (hints.length ? `<p class="bb-nota"><b>Tus movimientos:</b> ${hints.join(" · ")}.</p>` : "") +
    area("context", "Apunte opcional para el chat (puedes explicarlo por voz)") +
    "</div>";
  const preview = (form) => {
    const out = form.querySelector("[data-roll-preview]");
    const refresh = () => {
      const d = new FormData(form);
      const key = move === "occult" ? "sensitivity" : d.get("stat");
      const adv = d.has("adv") || Boolean(d.get("home"));
      const dis = d.has("dis");
      const text = formula({ move, modifier: s.stats[key] + s.bonus, advantage: adv, disadvantage: dis });
      const how = adv && dis
        ? "Ventaja y desventaja se cancelan: tirada normal."
        : adv ? "Ventaja: tres dados, cuentan los dos mayores."
        : dis ? "Desventaja: tres dados, cuentan los dos menores."
        : "Tirada normal.";
      out.innerHTML = `<b>${esc(text.replace(/\+ -(\d+)/, "− $1"))}</b><span>${how}</span>`;
    };
    form.addEventListener("input", refresh);
    form.addEventListener("change", refresh);
    refresh();
  };
  const data = await prompt(MOVES[move], html, move === "night" ? "Revisar y tirar" : "Lanzar los dados", { onRender: preview, width: 520, cancel: true });
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
      colombo: Boolean(colombo) && data.has("colombo"),
      note: data.get("context").trim(),
      context: `${STATS[key]}${data.get("context").trim() ? ` · ${data.get("context").trim()}` : ""}`,
      crowned: false,
    };
    if (home && !home.reusable) home.marked = true;
    n.bonus = 0;
    n.history.push(record);
    if (record.colombo) await colombo.update({ "system.used": true });
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
export async function crown(
  a,
  recordId = null,
  forced = null,
  messageId = null,
  failureOnly = false,
) {
  owner(a);
  const s = a.system;
  const record = recordId ? s.history.find((x) => x.id === recordId) : null;
  if (recordId && !canCrownRecord(record))
    throw Error("Esta tirada no admite Corona.");
  if (failureOnly && record?.tier !== 0)
    throw Error("Este resultado ya no es un fallo que pueda corregirse desde esta tarjeta.");
  const opts = [];
  if (forced !== "void")
    QUEEN.forEach((t, i) => {
      if (!s.queen.includes(i))
        opts.push([`queen:${i}`, `Corona de la Reina · ${t}`]);
    });
  if (s.void < 5)
    opts.push([
      `void:${s.void}`,
      `Corona del Vacío · ${VOID[s.void]} · ${VOID_TEXT[s.void]}`,
    ]);
  if (!opts.length) throw Error("No quedan Coronas disponibles.");
  const d = await prompt(
    "Ponerse una Corona",
    `<p>Elige la Corona que aceptas. La tirada subirá un grado y la Corona quedará marcada en tu ficha. La escena asociada deberá resolverse antes del fin de sesión.</p>${select("choice", "Corona", opts)}`,
    recordId ? "Aceptar Corona y mejorar resultado" : "Marcar Corona",
  );
  if (!d) return;
  return locked(a.uuid, async () => {
    const current = recordId
      ? safeSystem(a).history.find((x) => x.id === recordId)
      : null;
    if (recordId && !canCrownRecord(current))
      throw Error("Esta tirada ya no admite Corona.");
    if (failureOnly && current?.tier !== 0)
      throw Error("Este fallo ya ha sido revisado.");

    const [kind, i] = d.get("choice").split(":");
    const n = crownPlan(safeSystem(a), kind, Number(i));
    if (recordId) {
      const r = n.history.find((x) => x.id === recordId);
      r.tier++;
      r.crowned = true;
    }
    await a.update({ system: n });
    if (recordId) {
      const revised = n.history.find((x) => x.id === recordId);
      if (messageId) await reviseRollMessage(messageId, a, revised);
      else await publishRoll(a, revised);
    } else {
      await chat(
        a,
        "Ponerse una Corona",
        `<p>${esc(kind === "queen" ? QUEEN[Number(i)] : VOID_TEXT[Number(i)])}</p>`,
      );
    }
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
  if (text === PERMANENT)
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
  // [nombre del objeto, ¿se puede evocar sin marcarlo?]
  const homes = {
    "Sonny Crockett": ["Mi atuendo inconfundible", true],
    "Michael Knight": ["Mi transporte de confianza", true],
    "R. Quincy": ["Maletín médico", true],
    "Gordon Shumway": ["Mi amistad felina", true],
    "Remington Steele": ["Mi disfraz o identificación", false],
  };
  const home = homes[item.name];
  if (!home) return;
  if (n.home.length >= LIMITS.home)
    throw Error(`Este movimiento necesita un espacio libre en Hogar, dulce hogar (${LIMITS.home} máximo).`);
  n.home.push({
    id: foundry.utils.randomID(),
    name: home[0],
    story: "Ponle nombre y cuenta su historia.",
    reusable: home[1],
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
    area("theory", "Apunte opcional de la teoría (podéis explicarla por voz)", a.system.theory || a.system.notes) +
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
    `<p>${esc(outcome("occult", r.tier))}</p><p>${r.tier === 0 ? "Anotad que esta actividad está prohibida para las Expertas." : "La Guardiana lo registra desde el salón con «Nuevo movimiento ocultista»: se entrega a todas las Expertas."}</p>`,
  );
}
/** Movimiento Afable (p. 13): quita una Condición y, si gira en torno al quehacer, da con una Pista. */
export async function afable(a) {
  owner(a);
  if (a.system.retired) throw Error("Esta Experta está retirada.");
  const options = [["", "No quito ninguna Condición"]];
  a.system.conditions.forEach((text, index) => {
    if (text !== PERMANENT) options.push([index, text]);
  });
  const d = await prompt(
    "Movimiento Afable",
    `<p>Compartís un momento de intimidad mientras una de las dos está afanada en su quehacer.</p>` +
      select("condition", "Condición que desaparece", options, options.length > 1 ? options[1][0] : "") +
      check("hobby", `El momento gira en torno a mi quehacer (${a.system.hobby || "sin definir"})`) +
      area("scene", "Apunte opcional de la escena (también puedes narrarlo por voz)") +
      `<p class="bb-nota">Si es tu quehacer, también das con una Pista relevante para el misterio activo: díselo a la Guardiana. La Pista no puede resolver el misterio por sí misma.</p>`,
    "Compartir el momento",
    { cancel: true },
  );
  if (!d) return;
  return locked(a.uuid, async () => {
    const plan = afablePlan(safeSystem(a), { index: d.get("condition"), ownHobby: d.has("hobby") });
    if (plan.removed) await a.update({ "system.conditions": plan.next.conditions });
    const scene = d.get("scene").trim();
    await chat(
      a,
      "Afable",
      `${scene ? `<p>${esc(scene)}</p>` : ""}${plan.removed ? `<p>Desaparece la Condición «${esc(plan.removed)}».</p>` : ""}${plan.clue ? `<p><b>Pista relevante:</b> la Guardiana describe una Pista del misterio activo. No puede resolverlo por sí sola.</p>` : ""}`,
    );
  });
}
/** La Guardiana registra un movimiento ocultista (p. 14): queda disponible para todas las Expertas activas. */
export async function createOccultMove() {
  gm();
  const d = await prompt(
    "Nuevo movimiento ocultista",
    `<p>Definid el movimiento con la mesa. Recomendación del manual: una versión muy concreta del Nocturno, con un fallo detallado y severo.</p>` +
      field("name", "Nombre del movimiento") +
      area("text", "Cuando [lo que lo activa], tira con Sensibilidad…") +
      check("everyone", "Entregarlo ahora a todas las Expertas activas", true),
    "Crear el movimiento",
    { cancel: true, validate: (data) => (data.get("name").trim() && data.get("text").trim() ? "" : "escribe el nombre y el texto del movimiento.") },
  );
  if (!d) return;
  const data = {
    name: d.get("name").trim(),
    type: "movimiento",
    img: `systems/${ID}/assets/teacup.svg`,
    system: { description: d.get("text").trim(), source: `Movimiento ocultista · sesión ${club().session}`, frequency: "unlimited" },
    flags: { [ID]: { occult: true } },
  };
  const receivers = d.has("everyone") ? experts().filter((actor) => !has(actor, data.name)) : [];
  await Item.create(data);
  for (const actor of receivers) await actor.createEmbeddedDocuments("Item", [data]);
  await chat(null, "Un nuevo movimiento ocultista", `<h4>${esc(data.name)}</h4><p>${esc(data.system.description)}</p><p>${receivers.length ? `Disponible desde ahora para ${receivers.length} Experta${receivers.length === 1 ? "" : "s"}.` : "Guardado en el directorio de Objetos."}</p>`);
}
