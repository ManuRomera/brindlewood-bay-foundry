import { ID, LIMITS } from "./rules.mjs";
import { ExpertModel, MysteryModel, NPCModel, MoveModel } from "./models.mjs";
import { ExpertSheet, MysterySheet, NPCSheet, MoveSheet } from "./sheets.mjs";
import {
  ClubApp,
  createExpert,
  createRandomExpert,
  openExpertCreator,
  registerExpertCreationSocket,
  importMystery,
  reveal,
  dossier,
  useExpert,
  customMystery,
  resetCampaign,
} from "./club.mjs";
import { advertisement, advertisementInspiration } from "./advertisements.mjs";
import { guard } from "./ui.mjs";
import { attachInfo } from "./inspector.mjs";
import { ensureSalonScene, syncCaseBooks } from "./salon-scene.mjs";
import { ensureAdvertisementMacro } from "./world-setup.mjs";
import { catalogName } from "./catalog.mjs";
Hooks.once("init", () => {
  CONFIG.Actor.dataModels = {
    ...CONFIG.Actor.dataModels,
    experta: ExpertModel,
    misterio: MysteryModel,
    pnj: NPCModel,
  };
  CONFIG.Item.dataModels = { ...CONFIG.Item.dataModels, movimiento: MoveModel };
  const sheets = foundry.applications.apps.DocumentSheetConfig;
  sheets.registerSheet(Actor, ID, ExpertSheet, {
    types: ["experta"],
    makeDefault: true,
    label: "Experta · Cuaderno personal",
  });
  sheets.registerSheet(Actor, ID, MysterySheet, {
    types: ["misterio"],
    makeDefault: true,
    label: "Misterio · Tablero de pistas",
  });
  sheets.registerSheet(Actor, ID, NPCSheet, {
    types: ["pnj"],
    makeDefault: true,
    label: "Persona de interés",
  });
  sheets.registerSheet(Item, ID, MoveSheet, {
    types: ["movimiento"],
    makeDefault: true,
    label: "Movimiento · Referencia",
  });
  game.settings.register(ID, "club", {
    scope: "world",
    config: false,
    type: Object,
    default: { session: 1, goldUsed: false, adUsed: false, novels: [] },
  });
  game.settings.register(ID, "welcome", {
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    name: "Abrir el salón al entrar",
    hint: "El club, las fichas y los misterios al alcance de la mano.",
  });
  game.settings.register(ID, "largeText", {
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    name: "Lectura cómoda",
    hint: "Aumenta el tamaño de texto en las fichas y el salón.",
    onChange: (v) => document.body.classList.toggle("bb-large", v),
  });
  game.settings.registerMenu(ID, "salon", {
    name: "The Candlelight",
    label: "Abrir el salón del club",
    hint: "Personajes, casos, movimientos y sesiones.",
    icon: "fas fa-mug-hot",
    type: ClubApp,
    restricted: false,
  });
  game.brindlewood = {
    open: () => new ClubApp().render(true),
    createExpert,
    createRandomExpert,
    openExpertCreator,
    importMystery,
    reveal,
    dossier,
    useExpert,
    customMystery,
    advertisement,
    advertisementInspiration,
    resetCampaign,
  };
  Handlebars.registerHelper("eq", (a, b) => a === b);
});
Hooks.once("ready", async () => {
  registerExpertCreationSocket();
  if (game.user.isGM) {
    await guard(ensureSalonScene)();
    await guard(ensureAdvertisementMacro)();
  }
  if (game.user.isGM) {
    for (const actor of game.actors) {
      const source = actor._source.system;
      const catalogued = actor.type === "experta"
        ? catalogName("player", actor.name)
        : actor.type === "misterio"
          ? catalogName("case", actor.name)
          : actor.name;
      if (catalogued !== actor.name) await actor.update({ name: catalogued });
      if (actor.type === "experta") {
        const overflow = Math.max(0, Number(source.xp ?? 0) - LIMITS.xp);
        const stats = Object.fromEntries(Object.entries(source.stats ?? {}).map(([key, value]) => [
          key,
          Math.max(LIMITS.statMin, Math.min(LIMITS.statMax, Number(value))),
        ]));
        const update = {
          "system.stats": stats,
          "system.xp": (source.advances?.length ?? 0) >= LIMITS.advances ? 0 : Math.max(0, Math.min(LIMITS.xp, Number(source.xp ?? 0))),
          "system.xpPending": (source.advances?.length ?? 0) >= LIMITS.advances ? 0 : Math.min(LIMITS.sessionQuestions + 1, Number(source.xpPending ?? 0) + overflow),
          "system.conditions": (source.conditions ?? []).slice(0, LIMITS.conditions),
          "system.home": (source.home ?? []).slice(0, LIMITS.home),
          "system.queen": (source.queen ?? []).slice(0, LIMITS.queen),
          "system.void": Math.min(LIMITS.void, Number(source.void ?? 0)),
          "system.advances": (source.advances ?? []).slice(0, LIMITS.advances),
        };
        if (JSON.stringify(Object.fromEntries(Object.keys(update).map((key) => [key.slice(7), update[key]]))) !== JSON.stringify({
          stats: source.stats,
          xp: source.xp,
          xpPending: source.xpPending ?? 0,
          conditions: source.conditions,
          home: source.home,
          queen: source.queen,
          void: source.void,
          advances: source.advances,
        })) await actor.update(update);
      }
      if (actor.type === "misterio" && (source.suspects?.length ?? 0) > LIMITS.suspectsMax)
        await actor.update({ "system.suspects": source.suspects.slice(0, LIMITS.suspectsMax) });
    }
  }
  document.body.classList.toggle(
    "bb-large",
    game.settings.get(ID, "largeText"),
  );
  if (game.settings.get(ID, "welcome")) game.brindlewood.open();
});
Hooks.on("renderActorDirectory", (_app, html) => {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;
  const header = root.querySelector(".directory-header");
  if (!root.querySelector("[data-bb-club]")) {
    const club = document.createElement("button");
    club.dataset.bbClub = "true";
    club.type = "button";
    club.className = "bb-sidebar-button";
    club.innerHTML = '<i class="fas fa-mug-hot"></i> El salón del club';
    club.addEventListener("click", () => game.brindlewood.open());
    header?.append(club);
  }
  if (!root.querySelector("[data-bb-create-expert]")) {
    const create = document.createElement("button");
    create.dataset.bbCreateExpert = "true";
    create.type = "button";
    create.className = "bb-sidebar-button bb-sidebar-create";
    create.innerHTML = '<i class="fas fa-user-plus"></i> Crear mi Experta';
    create.addEventListener("click", guard(openExpertCreator));
    header?.append(create);
  }
});
Hooks.on("createUser", () => {
  if (game.user.isGM) guard(ensureAdvertisementMacro)();
});
Hooks.on("renderChatMessageHTML", (_message, html) => {
  if (html) attachInfo(html);
});
for (const hook of [
  "updateActor",
  "createActor",
  "deleteActor",
  "updateSetting",
])
  Hooks.on(hook, () => {
    for (const app of foundry.applications.instances.values())
      if (app instanceof ClubApp && app.rendered) app.render();
  });
Hooks.on("updateActor", (actor, changes) => {
  if (actor.type === "misterio" && foundry.utils.hasProperty(changes, "system.status")) guard(syncCaseBooks)();
});
Hooks.on("deleteActor", (actor) => {
  if (actor.type === "misterio") guard(syncCaseBooks)();
});
Hooks.on("hotbarDrop", (_bar, data, slot) => {
  if (data.type !== "Actor") return;
  guard(async () => {
    const actor = await fromUuid(data.uuid);
    if (!actor) return;
    let macro = game.macros.find(
      (m) => m.getFlag(ID, "actorUuid") === actor.uuid,
    );
    if (!macro)
      macro = await Macro.create({
        name: actor.name,
        type: "script",
        img: actor.img,
        command: `const a = await fromUuid(${JSON.stringify(actor.uuid)}); a?.sheet.render(true);`,
        flags: { [ID]: { actorUuid: actor.uuid } },
      });
    await game.user.assignHotbarMacro(macro, slot);
  })();
  return false;
});
