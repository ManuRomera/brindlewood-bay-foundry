import {
  ID,
  STATS,
  STATS_INFO,
  QUEEN,
  VOID,
  VOID_TEXT,
  QUESTIONS,
  ADVANCES,
  MOVES,
  outcomes,
  LIMITS,
  PERMANENT,
  awardXp,
  expertMoveConflict,
  complexityIssue,
} from "./rules.mjs";
import * as op from "./operations.mjs";
import { attachInfo } from "./inspector.mjs";
import { rememberWindow } from "./window-state.mjs";
import { saveCaseNote } from "./case-collaboration.mjs";
import { EditorRetrato, pintarRetratos } from "./retrato.mjs";
import { catalogName, displayName } from "./catalog.mjs";
import { HandlebarsApplicationMixin, ActorSheetV2, ItemSheetV2 } from "./compat.mjs";
import {
  esc,
  field,
  area,
  select,
  check,
  prompt,
  confirm,
  guard,
  owner,
  safeSystem,
} from "./ui.mjs";

const Sheet = (Base) => rememberWindow(HandlebarsApplicationMixin(Base));

/** Movimientos que se lanzan desde «En la mesa». Afable no tira dados. */
const MOVE_CARDS = [
  { key: "day", label: "Diurno", icon: "fa-sun", hint: "Riesgo a plena luz" },
  { key: "night", label: "Nocturno", icon: "fa-moon", hint: "Peor de lo que imaginas" },
  { key: "meddle", label: "Metomentodo", icon: "fa-magnifying-glass", hint: "Busca una pista" },
  { key: "occult", label: "Ocultista", icon: "fa-eye", hint: "Al otro lado del velo" },
  {
    key: "afable",
    label: "Afable",
    icon: "fa-mug-hot",
    hint: "Quita una Condición",
    action: "afable",
    info: "Cuando compartas un momento de intimidad con otra Experta mientras una de las dos está afanada en su quehacer, puedes quitarte una Condición. Si se trata de tu quehacer, también das con una Pista relevante para el misterio activo.",
  },
];

const useLabel = (frequency) =>
  frequency === "session" ? "Una vez por sesión" : frequency === "once" ? "Una sola vez" : frequency === "mystery" ? "Una vez por misterio" : "Sin límite de usos";

export class ExpertSheet extends Sheet(ActorSheetV2) {
  get title() {
    return `Experta · ${displayName(this.actor.name)}`;
  }
  async _onRender(c, o) {
    await super._onRender(c, o);
    for (const b of this.element.querySelectorAll("[data-action=switchTab],[data-action=editMove]"))
      b.disabled = false;
    const xpButton = this.element.querySelector("[data-action=xp]");
    if (xpButton && this.actor.system.advances.length >= LIMITS.advances) xpButton.disabled = true;
    attachInfo(this.element);
    pintarRetratos(this.element);
  }
  static DEFAULT_OPTIONS = {
    classes: ["bb-app", "bb-sheet"],
    position: { width: 880, height: 680 },
    window: { resizable: true, icon: "fa-solid fa-mug-hot" },
    form: { submitOnChange: true },
    actions: {
      image: guard(async function () {
        owner(this.actor);
        await EditorRetrato.abrir(this.actor);
      }),
      roll: guard(async function (_e, b) {
        await op.rollMove(this.actor, b.dataset.move, b.dataset.stat);
      }),
      afable: guard(async function () {
        await op.afable(this.actor);
      }),
      switchTab: function (_e, b) {
        this.tab = b.dataset.tab;
        this.recordar("tab", this.tab);
        this.render();
      },
      resolveOccult: guard(async function (_e, b) {
        await op.resolveOccult(this.actor, b.dataset.id);
      }),
      crown: guard(async function (_e, b) {
        await op.crown(this.actor, b.dataset.record);
      }),
      condition: guard(async function () {
        await op.condition(this.actor);
      }),
      clear: guard(async function (_e, b) {
        await op.clearCondition(this.actor, Number(b.dataset.index));
      }),
      home: guard(async function () {
        await op.home(this.actor);
      }),
      removeHome: guard(async function (_e, b) {
        await op.removeHome(this.actor, b.dataset.id);
      }),
      toggleHome: guard(async function (_e, b) {
        owner(this.actor);
        const n = safeSystem(this.actor);
        const item = n.home.find((i) => i.id === b.dataset.id);
        if (!item || item.reusable) return;
        item.marked = !item.marked;
        await this.actor.update({ "system.home": n.home });
      }),
      advance: guard(async function () {
        await op.advancement(this.actor);
      }),
      end: guard(async function () {
        await op.endSession(this.actor);
      }),
      done: guard(async function (_e, b) {
        owner(this.actor);
        const pending = this.actor.system.pending.find((p) => p.id === b.dataset.id);
        if (pending?.kind === "crown") return op.crown(this.actor);
        await this.actor.update({
          "system.pending": this.actor.system.pending.filter((p) => p.id !== b.dataset.id),
        });
      }),
      editMove: guard(async function (_e, b) {
        await this.actor.items.get(b.dataset.id)?.sheet.render(true);
      }),
      useMove: guard(async function (_e, b) {
        await game.brindlewood.useExpert(this.actor, this.actor.items.get(b.dataset.id));
      }),
      recover: guard(async function (_e, b) {
        owner(this.actor);
        const r = this.actor.system.history.find((r) => r.id === b.dataset.id);
        if (r) await op.publishRoll(this.actor, r);
      }),
      lock: function () {
        this.unlocked = !this.unlocked;
        this.render();
      },
      questions: guard(async function () {
        owner(this.actor);
        const d = await prompt(
          "Objetivos de la próxima sesión",
          `<p>La primera pregunta siempre cuenta. Escoge exactamente dos más.</p>` +
            QUESTIONS.slice(1)
              .map((q, i) => check(String(i + 1), q, this.actor.system.questions.includes(i + 1)))
              .join(""),
          "Guardar preguntas",
          { cancel: true },
        );
        if (!d) return;
        const ids = [...d.keys()].map(Number);
        if (ids.length !== 2) throw Error("Escoge exactamente dos preguntas además de la primera.");
        await this.actor.update({ "system.questions": [0, ...ids] });
      }),
      xp: guard(async function () {
        owner(this.actor);
        if (this.actor.system.advances.length >= LIMITS.advances) throw Error("Ya has completado todos los avances.");
        const xp = awardXp(this.actor.system, 1);
        if (!xp.awarded) throw Error("El contador de PE está lleno. Elige un avance antes de obtener más PE.");
        const d = await prompt(
          "Experiencia por un movimiento",
          field("reason", "Movimiento o motivo (opcional; puedes decirlo por voz)"),
          "Anotar +1 PE",
          { cancel: true },
        );
        if (d) {
          const reason = d.get("reason").trim();
          await this.actor.update({ "system.xp": xp.xp });
          await op.chat(this.actor, "Experiencia", `<p>+1 PE${reason ? ` · ${esc(reason)}` : ""}</p>`);
        }
      }),
      editHome: guard(async function (_e, b) {
        owner(this.actor);
        const n = safeSystem(this.actor),
          h = n.home.find((i) => i.id === b.dataset.id);
        if (!h) return;
        const d = await prompt(
          "La historia de un objeto",
          field("name", "Nombre", h.name) +
            area("story", "Historia", h.story) +
            (h.reusable ? "" : check("marked", "Ya evocado (marcado: no vuelve a dar ventaja hasta desmarcarlo)", h.marked)),
          "Guardar",
          { cancel: true },
        );
        if (d?.get("name").trim()) {
          h.name = d.get("name").trim();
          h.story = d.get("story");
          if (!h.reusable) h.marked = d.has("marked");
          await this.actor.update({ system: n });
        }
      }),
    },
  };
  async _onDropItem(event, item) {
    if (item.parent?.id === this.actor.id) return super._onDropItem(event, item);
    owner(this.actor);
    if (this.actor.items.some((i) => i.name === item.name)) throw Error("Ya tienes este movimiento.");
    if (expertMoveConflict(item.name, op.experts(), this.actor.id))
      throw Error("Ese movimiento es exclusivo o entra en conflicto con Dale Cooper / Fox Mulder.");
    const n = safeSystem(this.actor);
    op.applyExpert(n, item);
    await this.actor.update({
      system: n,
      items: [
        ...this.actor.items.map((i) => i.toObject()),
        { ...item.toObject(), _id: foundry.utils.randomID() },
      ],
    });
    return this.actor.items.find((i) => i.name === item.name);
  }
  static PARTS = {
    body: {
      template: `systems/${ID}/templates/experta.hbs`,
      scrollable: [".bb-scroll"],
    },
  };
  async _prepareContext(o) {
    const a = this.actor,
      s = a.system,
      tab = this.tab ?? this.recordado("tab", "play");
    const session = op.club().session;
    return {
      ...(await super._prepareContext(o)),
      actor: a,
      cleanName: displayName(a.name),
      system: s,
      editable: a.isOwner,
      unlocked: this.unlocked,
      tab,
      tabs: [
        ["play", "En la mesa", "fa-mug-hot"],
        ["life", "Hogar y vida", "fa-house"],
        ["growth", "Avance", "fa-seedling"],
        ["crowns", "Coronas", "fa-crown"],
        ["history", "Historial", "fa-clock-rotate-left"],
      ].map(([id, label, icon]) => ({ id, label, icon, active: id === tab })),
      play: tab === "play",
      life: tab === "life",
      growth: tab === "growth",
      crowns: tab === "crowns",
      history: tab === "history",
      stats: Object.entries(STATS).map(([key, label]) => ({
        key,
        label,
        value: s.stats[key],
        info: STATS_INFO[key],
      })),
      resources: [
        { label: "PE", value: s.xp, max: LIMITS.xp, tab: "growth", extra: s.xpPending ? `+${s.xpPending}` : "", info: "Experiencia: al llegar a 5 se cambia por un avance." },
        { label: "avances", value: s.advances.length, max: LIMITS.advances, tab: "growth", info: "Avances elegidos." },
        { label: "Condiciones", value: s.conditions.length, max: LIMITS.conditions, tab: "play", alert: s.conditions.length >= LIMITS.conditions, info: "La cuarta Condición se sustituye por una Corona." },
        { label: "Hogar", value: s.home.length, max: LIMITS.home, tab: "life", info: "Objetos de Hogar, dulce hogar." },
        { label: "Reina", value: s.queen.length, max: LIMITS.queen, tab: "crowns", info: "Corona de la Reina: escenas de su vida." },
        { label: "Vacío", value: s.void, max: LIMITS.void, tab: "crowns", dark: s.void >= 3, info: "Corona del Vacío: la quinta retira a la Experta." },
      ],
      moves: MOVE_CARDS.map((card) => ({
        ...card,
        action: card.action ?? "roll",
        info: card.info ?? outcomes(card.key).map((result) => `${result.label}: ${result.text}`).join(" "),
      })),
      limits: LIMITS,
      homeFull: s.home.length >= LIMITS.home,
      conditionFull: s.conditions.length >= LIMITS.conditions,
      xpFull: s.xp >= LIMITS.xp,
      advancesFull: s.advances.length >= LIMITS.advances,
      xpPips: Array.from({ length: LIMITS.xp }, (_, index) => ({ on: index < s.xp })),
      homeSlots: Array.from({ length: LIMITS.home }, (_, index) => ({ number: index + 1, filled: index < s.home.length })),
      home: s.home.map((item) => ({
        ...item,
        state: item.reusable ? "Siempre disponible" : item.marked ? "Ya evocado" : "Disponible: da ventaja",
        spent: item.marked && !item.reusable,
      })),
      expertMoves: a.items.contents.map((item) => ({
        id: item.id,
        name: item.name,
        system: item.system,
        used: item.system.used && item.system.frequency !== "unlimited",
        useLabel: useLabel(item.system.frequency),
      })),
      conditions: s.conditions.map((text, index) => ({ text, index, permanent: text === PERMANENT })),
      queen: QUEEN.map((text, index) => ({ text, index, marked: s.queen.includes(index) })),
      void: VOID.map((text, index) => ({ text, detail: VOID_TEXT[index], marked: index < s.void, next: index === s.void && !s.retired })),
      advances: ADVANCES.map((text, index) => ({ text, marked: s.advances.includes(index) })),
      questions: s.questions.map((i) => QUESTIONS[i]),
      sessionClosed: s.endSession >= session,
      session,
      records: [...s.history].reverse().map((r) => ({
        ...r,
        label: MOVES[r.move],
        tierLabel: outcomes(r.move, { voidMystery: r.voidMystery })[r.tier].label,
        canCrown: r.tier < 3 && r.move !== "theorize" && !r.resolved,
        occultPending: r.move === "occult" && !r.resolved,
      })),
    };
  }
  _processFormData(e, form, data) {
    const allowed = [
      "name",
      "system.style",
      "system.hobby",
      "system.description",
      ...Object.keys(STATS).map((k) => `system.stats.${k}`),
    ];
    const obj = Object.fromEntries(Object.entries(data.object).filter(([k]) => allowed.includes(k)));
    if (!this.unlocked) for (const k of Object.keys(obj)) if (k.startsWith("system.stats.")) delete obj[k];
    if (Object.hasOwn(obj, "name")) obj.name = catalogName("player", obj.name) || this.actor.name;
    if (Object.hasOwn(obj, "system.hobby")) {
      const hobby = String(obj["system.hobby"]).normalize("NFKC").toLocaleLowerCase("es").trim();
      if (
        op.experts().some(
          (actor) =>
            actor.id !== this.actor.id && actor.system.hobby.normalize("NFKC").toLocaleLowerCase("es").trim() === hobby,
        )
      )
        throw Error("Ya hay una Experta activa con ese quehacer.");
    }
    return foundry.utils.expandObject(obj);
  }
}

export class MysterySheet extends Sheet(ActorSheetV2) {
  get title() {
    return `Misterio · ${displayName(this.actor.name)}`;
  }
  async _onRender(c, o) {
    await super._onRender(c, o);
    const b = this.element.querySelector("[data-action=theorize]");
    if (b && this.actor.testUserPermission(game.user, "OBSERVER")) b.disabled = false;
    for (const input of this.element.querySelectorAll("[data-case-note]")) {
      input.addEventListener(
        "change",
        guard(async () => {
          await saveCaseNote(this.actor, {
            kind: input.dataset.caseNote,
            id: input.dataset.id,
            index: input.dataset.index === undefined ? undefined : Number(input.dataset.index),
            text: input.value,
          });
        }),
      );
    }
    attachInfo(this.element);
    pintarRetratos(this.element);
  }
  static DEFAULT_OPTIONS = {
    classes: ["bb-app", "bb-sheet"],
    position: { width: 900, height: 740 },
    window: { resizable: true, icon: "fa-solid fa-magnifying-glass" },
    form: { submitOnChange: true },
    actions: {
      image: guard(async function () {
        owner(this.actor);
        await EditorRetrato.abrir(this.actor);
      }),
      theorize: guard(async function () {
        await op.theorize(this.actor);
      }),
      reveal: guard(async function () {
        await game.brindlewood.reveal(this.actor);
      }),
      dossier: guard(async function () {
        await game.brindlewood.dossier(this.actor.system.sourceId);
      }),
      editClueContext: guard(async function (_e, b) {
        owner(this.actor);
        const n = safeSystem(this.actor),
          c = n.clues.find((c) => c.id === b.dataset.id);
        if (!c) return;
        const d = await prompt(
          "Contexto público de la pista",
          area("text", "Añade un matiz sin modificar el texto original", c.context ?? ""),
          "Guardar",
          { cancel: true },
        );
        if (!d) return;
        c.context = d.get("text").trim();
        await this.actor.update({ system: n });
      }),
      editSuspect: guard(async function (_e, b) {
        if (!game.user.isGM) throw Error("Solo la Guardiana puede cambiar la presentación pública.");
        const n = safeSystem(this.actor),
          index = Number(b.dataset.index),
          person = n.suspects[index];
        if (!person) return;
        const d = await prompt(
          "Presentación pública",
          area("text", "Lo que el grupo conoce de esta persona", person.description ?? ""),
          "Guardar",
          { cancel: true },
        );
        if (!d) return;
        person.description = d.get("text").trim();
        await this.actor.update({ system: n });
      }),
      removeSuspect: guard(async function (_e, b) {
        if (!game.user.isGM) throw Error("Solo la Guardiana puede retirar personas del caso.");
        const n = safeSystem(this.actor),
          index = Number(b.dataset.index);
        const person = n.suspects[index];
        if (!person) return;
        if (
          !(await confirm(
            "Retirar persona de interés",
            `¿Quitar a ${person.name} de este tablero? La ficha original del personaje no se borrará.`,
          ))
        )
          return;
        n.suspects.splice(index, 1);
        await this.actor.update({ system: n });
      }),
      openSuspect: guard(async function (_e, b) {
        const actor = b.dataset.uuid ? await fromUuid(b.dataset.uuid) : null;
        if (!actor) throw Error("No se pudo abrir la ficha original de esta persona.");
        await actor.sheet.render(true);
      }),
      status: guard(async function () {
        owner(this.actor);
        if (
          this.actor.system.status !== "active" &&
          op.cases().filter((actor) => actor.system.status === "active").length >= LIMITS.activeMysteries
        )
          throw Error(`Ya hay ${LIMITS.activeMysteries} misterios activos. Resuelve uno antes de reabrir este.`);
        await this.actor.update({
          "system.status": this.actor.system.status === "active" ? "resolved" : "active",
        });
      }),
    },
  };
  static PARTS = {
    body: {
      template: `systems/${ID}/templates/misterio.hbs`,
      scrollable: [".bb-scroll"],
    },
  };
  async _prepareContext(o) {
    const s = this.actor.system;
    const pack = game.packs.get(`${ID}.sospechosos`);
    const suspectIndex = game.user.isGM && pack ? await pack.getIndex({ fields: ["img"] }) : [];
    const suspects = s.suspects.map((person, index) => {
      const match = suspectIndex.find((entry) => entry.name === person.name);
      const actorUuid = person.actorUuid || (match ? `Compendium.${ID}.sospechosos.Actor.${match._id}` : "");
      return {
        ...person,
        index,
        img: person.img || match?.img || `systems/${ID}/assets/teacup.svg`,
        actorUuid,
      };
    });
    const complexityOptions = s.voidMystery
      ? [LIMITS.voidComplexity]
      : s.complexity <= 5
        ? LIMITS.oneShotComplexities
        : [6, 7, 8];
    const regular = s.clues.filter((c) => !c.void).length;
    return {
      ...(await super._prepareContext(o)),
      actor: this.actor,
      cleanName: displayName(this.actor.name),
      system: s,
      suspects,
      clues: s.clues.map((clue) => ({ ...clue, hasNotes: Boolean(clue.notes?.trim()) })),
      canAnnotate: this.actor.testUserPermission(game.user, "OBSERVER"),
      resolved: s.status !== "active",
      statusLabel: s.status === "active" ? "En investigación" : "Resuelto",
      gm: game.user.isGM,
      editable: this.actor.isOwner,
      regular,
      voidClues: s.clues.length - regular,
      limits: LIMITS,
      complexityOptions: complexityOptions.map((value) => ({ value, selected: value === s.complexity })),
      complexityRule: s.voidMystery
        ? "El Misterio del Vacío usa 10."
        : s.complexity <= 5
          ? "Una sesión usa 4 o 5."
          : "Un misterio normal usa de 6 a 8.",
    };
  }
  async _onDropActor(_event, actor) {
    if (!game.user.isGM) throw Error("Solo la Guardiana puede añadir personas al caso.");
    if (actor?.type !== "pnj") throw Error("Arrastra una ficha de Persona de interés.");
    owner(this.actor);
    const n = safeSystem(this.actor);
    if (n.suspects.length >= LIMITS.suspectsMax)
      throw Error(`El misterio ya tiene el máximo de ${LIMITS.suspectsMax} personas de interés.`);
    if (n.suspects.some((person) => person.actorUuid === actor.uuid || person.name === actor.name))
      throw Error("Esta persona ya está en el tablero del caso.");
    n.suspects.push({
      id: foundry.utils.randomID(),
      actorUuid: actor.uuid ?? "",
      name: actor.name,
      img: actor.img ?? `systems/${ID}/assets/teacup.svg`,
      description: "",
      notes: "",
    });
    await this.actor.update({ system: n });
    return actor;
  }
  _processFormData(e, f, d) {
    const entries = Object.fromEntries(
      Object.entries(d.object).filter(([k]) => ["name", "system.description", "system.complexity", "system.theory"].includes(k)),
    );
    if (Object.hasOwn(entries, "name")) entries.name = catalogName("case", entries.name) || this.actor.name;
    if (Object.hasOwn(entries, "system.complexity")) {
      const n = Number(entries["system.complexity"]);
      const issue = complexityIssue(n, {
        oneShot: this.actor.system.complexity <= 5,
        voidMystery: this.actor.system.voidMystery,
      });
      if (issue) throw Error(issue);
      entries["system.complexity"] = n;
    }
    return foundry.utils.expandObject(entries);
  }
}

export class NPCSheet extends Sheet(ActorSheetV2) {
  get title() {
    return displayName(this.actor.name);
  }
  static DEFAULT_OPTIONS = {
    classes: ["bb-app", "bb-sheet"],
    position: { width: 600, height: 560 },
    window: { resizable: true, icon: "fa-solid fa-user" },
    form: { submitOnChange: true },
    actions: {
      image: guard(async function () {
        owner(this.actor);
        await EditorRetrato.abrir(this.actor);
      }),
    },
  };
  static PARTS = { body: { template: `systems/${ID}/templates/pnj.hbs` } };
  async _prepareContext(o) {
    return {
      ...(await super._prepareContext(o)),
      actor: this.actor,
      system: this.actor.system,
      editable: this.actor.isOwner,
    };
  }
  async _onRender(c, o) {
    await super._onRender(c, o);
    attachInfo(this.element);
    pintarRetratos(this.element);
  }
}

export class MoveSheet extends Sheet(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["bb-app", "bb-sheet"],
    position: { width: 560, height: 520 },
    window: { resizable: true, icon: "fa-solid fa-scroll" },
    form: { submitOnChange: true },
  };
  static PARTS = {
    body: { template: `systems/${ID}/templates/movimiento.hbs` },
  };
  async _prepareContext(o) {
    return {
      ...(await super._prepareContext(o)),
      item: this.item,
      system: this.item.system,
      editable: this.item.isOwner,
      useLabel: useLabel(this.item.system.frequency),
    };
  }
  async _onRender(c, o) {
    await super._onRender(c, o);
    attachInfo(this.element);
  }
  _processFormData(e, f, d) {
    return foundry.utils.expandObject(
      Object.fromEntries(
        Object.entries(d.object).filter(([k]) => ["name", "system.description", "system.source"].includes(k)),
      ),
    );
  }
}
