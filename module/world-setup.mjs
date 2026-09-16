import { ID } from "./rules.mjs";

export const AD_MACRO_FLAG = "advertisementInspiration";

export async function ensureAdvertisementMacro() {
  if (!game.user.isGM) return null;
  let macro = game.macros.find((entry) => entry.getFlag(ID, AD_MACRO_FLAG));
  const data = {
    name: "Generador de anuncios",
    type: "script",
    img: `systems/${ID}/assets/ad-generator.svg`,
    scope: "global",
    command: "await game.brindlewood.advertisementInspiration();",
    ownership: { default: 2 },
    flags: { [ID]: { [AD_MACRO_FLAG]: true } },
  };
  if (!macro) macro = await Macro.create(data);
  else {
    const { type: _type, ...update } = data;
    await macro.update(update);
  }
  for (const user of game.users.filter((entry) => !entry.isGM))
    if (user.hotbar?.[1] !== macro.id) await user.assignHotbarMacro(macro, 1);
  return macro;
}
