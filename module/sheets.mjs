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
  TIER_NAMES,
  outcomes,
  LIMITS,
  awardXp,
  expertMoveConflict,
  complexityIssue,
} from "./rules.mjs";
import * as op from "./operations.mjs";
import { attachInfo } from "./inspector.mjs";
import { rememberWindow } from "./window-state.mjs";
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
const { HandlebarsApplicationMixin } = foundry.applications.api;
async function chooseImage(sheet) {
  owner(sheet.actor);
  const picker = new foundry.applications.apps.FilePicker.implementation({
    type: "image",
    current: sheet.actor.img,
    callback: async (path) => {
      await sheet.actor.update({ img: path, "prototypeToken.texture.src": path });
    },
    position: { top: sheet.position.top + 40, left: sheet.position.left + 10 },
  });
  await picker.browse();
}
export class ExpertSheet extends rememberWindow(HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2,
)) {
  get title() {
    return `Experta · ${this.actor.name}`;
  }
  async _onRender(c, o) {
    await super._onRender(c, o);
    for (const b of this.element.querySelectorAll(
      "[data-action=switchTab],[data-action=editMove]",
    ))
      b.disabled = false;
    const xpButton = this.element.querySelector("[data-action=xp]");
    if (xpButton && this.actor.system.advances.length >= LIMITS.advances)
      xpButton.disabled = true;
    attachInfo(this.element);
  }
  static DEFAULT_OPTIONS = {
    classes: ["bb-app", "bb-sheet"],
    position: { width: 920, height: 800 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      image: guard(async function () {
        await chooseImage(this);
      }),
      roll: guard(async function (_e, b) {
        await op.rollMove(this.actor, b.dataset.move, b.dataset.stat);
      }),
      switchTab: function (_e, b) {
        this.tab = b.dataset.tab;
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
      advance: guard(async function () {
        await op.advancement(this.actor);
      }),
      end: guard(async function () {
        await op.endSession(this.actor);
      }),
      done: guard(async function (_e, b) {
        owner(this.actor);
        const pending = this.actor.system.pending.find(
          (p) => p.id === b.dataset.id,
        );
        if (pending?.kind === "crown") return op.crown(this.actor);
        await this.actor.update({
          "system.pending": this.actor.system.pending.filter(
            (p) => p.id !== b.dataset.id,
          ),
        });
      }),
      editMove: guard(async function (_e, b) {
        await this.actor.items.get(b.dataset.id)?.sheet.render(true);
      }),
      useMove: guard(async function (_e, b) {
        await game.brindlewood.useExpert(
          this.actor,
          this.actor.items.get(b.dataset.id),
        );
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
          QUESTIONS.slice(1)
            .map((q, i) =>
              check(
                String(i + 1),
                q,
                this.actor.system.questions.includes(i + 1),
              ),
            )
            .join(""),
        );
        if (!d) return;
        const ids = [...d.keys()].map(Number);
        if (ids.length !== 2)
          throw Error("Escoge exactamente dos preguntas además de la primera.");
        await this.actor.update({ "system.questions": [0, ...ids] });
      }),
      xp: guard(async function () {
        owner(this.actor);
        if (this.actor.system.advances.length >= LIMITS.advances)
          throw Error("Ya has completado todos los avances.");
        const xp = awardXp(this.actor.system, 1);
        if (!xp.awarded)
          throw Error("El contador de PE está lleno. Elige un avance antes de obtener más PE.");
        const d = await prompt(
          "Experiencia por un movimiento",
          field("reason", "Movimiento o motivo (opcional; puedes decirlo por voz)"),
        );
        if (d) {
          const reason = d.get("reason").trim();
          await this.actor.update({ "system.xp": xp.xp });
          await op.chat(
            this.actor,
            "Experiencia",
            `<p>+1 PE${reason ? ` · ${esc(reason)}` : ""}</p>`,
          );
        }
      }),
      editHome: guard(async function (_e, b) {
        owner(this.actor);
        const n = safeSystem(this.actor),
          h = n.home.find((i) => i.id === b.dataset.id);
        if (!h) return;
        const d = await prompt(
          "La historia de un objeto",
          field("name", "Nombre", h.name) + area("story", "Historia", h.story),
        );
        if (d?.get("name").trim()) {
          h.name = d.get("name");
          h.story = d.get("story");
          await this.actor.update({ system: n });
        }
      }),
    },
  };
  async _onDropItem(event, item) {
    if (item.parent?.id === this.actor.id)
      return super._onDropItem(event, item);
    owner(this.actor);
    if (this.actor.items.some((i) => i.name === item.name))
      throw Error("Ya tienes este movimiento.");
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
      tab = this.tab ?? "play";
    return {
      ...(await super._prepareContext(o)),
      actor: a,
      system: s,
      editable: a.isOwner,
      unlocked: this.unlocked,
      tab,
      tabs: [
        ["play", "En la mesa"],
        ["life", "Una vida plena"],
        ["crowns", "Las Coronas"],
        ["history", "Historial"],
      ].map(([id, label]) => ({ id, label, active: id === tab })),
      play: tab === "play",
      life: tab === "life",
      crowns: tab === "crowns",
      history: tab === "history",
      stats: Object.entries(STATS).map(([key, label]) => ({
        key,
        label,
        value: s.stats[key],
        info: STATS_INFO[key],
      })),
      moves: Object.entries(MOVES)
        .filter(([k]) => k !== "theorize")
        .map(([key, label]) => ({
          key,
          label,
          info: outcomes(key).map((result) => `${result.label}: ${result.text}`).join(" "),
        })),
      limits: LIMITS,
      homeFull: s.home.length >= LIMITS.home,
      conditionFull: s.conditions.length >= LIMITS.conditions,
      xpFull: s.xp >= LIMITS.xp,
      advancesFull: s.advances.length >= LIMITS.advances,
      homeSlots: Array.from({ length: LIMITS.home }, (_, index) => ({
        number: index + 1,
        filled: index < s.home.length,
      })),
      expertMoves: a.items.contents.map((item) => ({
        id: item.id,
        name: item.name,
        system: item.system,
        useLabel: item.system.frequency === "session" ? "Una vez por sesión" : item.system.frequency === "once" ? "Una sola vez" : item.system.frequency === "mystery" ? "Una vez por misterio" : "Sin límite de usos",
      })),
      conditions: s.conditions.map((text, index) => ({
        text,
        index,
        permanent: text === "Obsesionada con el Vacío",
      })),
      queen: QUEEN.map((text, index) => ({
        text,
        index,
        marked: s.queen.includes(index),
      })),
      void: VOID.map((text, index) => ({
        text,
        detail: VOID_TEXT[index],
        marked: index < s.void,
      })),
      advances: ADVANCES.map((text, index) => ({
        text,
        marked: s.advances.includes(index),
      })),
      questions: s.questions.map((i) => QUESTIONS[i]),
      records: [...s.history]
        .reverse()
        .map((r) => ({
          ...r,
          label: MOVES[r.move],
          tierLabel: TIER_NAMES[r.tier],
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
    const obj = Object.fromEntries(
      Object.entries(data.object).filter(([k]) => allowed.includes(k)),
    );
    if (!this.unlocked)
      for (const k of Object.keys(obj))
        if (k.startsWith("system.stats.")) delete obj[k];
    if (Object.hasOwn(obj, "system.hobby")) {
      const hobby = String(obj["system.hobby"])
        .normalize("NFKC").toLocaleLowerCase("es").trim();
      if (op.experts().some((actor) =>
        actor.id !== this.actor.id &&
        actor.system.hobby.normalize("NFKC").toLocaleLowerCase("es").trim() === hobby
      )) throw Error("Ya hay una Experta activa con ese quehacer.");
    }
    return foundry.utils.expandObject(obj);
  }
}
export class MysterySheet extends rememberWindow(HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2,
)) {
  get title() {
    return `Misterio · ${this.actor.name}`;
  }
  async _onRender(c, o) {
    await super._onRender(c, o);
    const b = this.element.querySelector("[data-action=theorize]");
    if (b && this.actor.testUserPermission(game.user, "OBSERVER"))
      b.disabled = false;
    attachInfo(this.element);
  }
  static DEFAULT_OPTIONS = {
    classes: ["bb-app"],
    position: { width: 900, height: 780 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      image: guard(async function () {
        await chooseImage(this);
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
      editClue: guard(async function (_e, b) {
        owner(this.actor);
        const n = safeSystem(this.actor),
          c = n.clues.find((c) => c.id === b.dataset.id);
        if (!c) return;
        const d = await prompt(
          "Contextualizar la pista",
          area("text", "La misma pista, con nuevos detalles", c.text),
        );
        if (d?.get("text").trim()) {
          c.text = d.get("text").trim();
          await this.actor.update({ system: n });
        }
      }),
      status: guard(async function () {
        owner(this.actor);
        if (
          this.actor.system.status !== "active" &&
          op.cases().filter((actor) => actor.system.status === "active").length >= LIMITS.activeMysteries
        ) throw Error(`Ya hay ${LIMITS.activeMysteries} misterios activos. Resuelve uno antes de reabrir este.`);
        await this.actor.update({
          "system.status":
            this.actor.system.status === "active" ? "resolved" : "active",
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
    const complexityOptions = s.voidMystery
      ? [LIMITS.voidComplexity]
      : s.complexity <= 5
        ? LIMITS.oneShotComplexities
        : [6, 7, 8];
    return {
      ...(await super._prepareContext(o)),
      actor: this.actor,
      system: this.actor.system,
      statusLabel:
        this.actor.system.status === "active" ? "En investigación" : "Resuelto",
      gm: game.user.isGM,
      editable: this.actor.isOwner,
      regular: this.actor.system.clues.filter((c) => !c.void).length,
      limits: LIMITS,
      complexityOptions: complexityOptions.map((value) => ({
        value,
        selected: value === s.complexity,
      })),
      complexityRule: s.voidMystery
        ? "El Misterio del Vacío usa 10."
        : s.complexity <= 5
          ? "Una sesión usa 4 o 5."
          : "Un misterio normal usa de 6 a 8.",
    };
  }
  _processFormData(e, f, d) {
    const entries = Object.fromEntries(
        Object.entries(d.object).filter(([k]) =>
          [
            "name",
            "system.description",
            "system.complexity",
            "system.theory",
          ].includes(k),
        ));
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
export class NPCSheet extends rememberWindow(HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2,
)) {
  static DEFAULT_OPTIONS = {
    classes: ["bb-app"],
    position: { width: 620, height: 590 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      image: guard(async function () {
        await chooseImage(this);
      }),
    },
  };
  static PARTS = { body: { template: `systems/${ID}/templates/pnj.hbs` } };
  async _prepareContext(o) {
    return {
      ...(await super._prepareContext(o)),
      actor: this.actor,
      system: this.actor.system,
    };
  }
  async _onRender(c, o) {
    await super._onRender(c, o);
    attachInfo(this.element);
  }
}
export class MoveSheet extends rememberWindow(HandlebarsApplicationMixin(
  foundry.applications.sheets.ItemSheetV2,
)) {
  static DEFAULT_OPTIONS = {
    classes: ["bb-app"],
    position: { width: 630, height: 610 },
    window: { resizable: true },
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
    };
  }
  async _onRender(c, o) {
    await super._onRender(c, o);
    attachInfo(this.element);
  }
  _processFormData(e, f, d) {
    return foundry.utils.expandObject(
      Object.fromEntries(
        Object.entries(d.object).filter(([k]) =>
          ["name", "system.description", "system.source"].includes(k),
        ),
      ),
    );
  }
}
