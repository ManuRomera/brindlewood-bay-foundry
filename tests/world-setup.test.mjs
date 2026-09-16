import test from "node:test";
import assert from "node:assert/strict";
import { ensureAdvertisementMacro } from "../module/world-setup.mjs";

test("the GM installs the advertisement macro in every player's first slot", async () => {
  const previousGame = globalThis.game;
  const previousMacro = globalThis.Macro;
  try {
    const assignments = [];
    const players = ["p1", "p2"].map((id) => ({
      id,
      isGM: false,
      hotbar: {},
      assignHotbarMacro: async (macro, slot) => assignments.push([id, macro.id, slot]),
    }));
    const macro = { id: "ad-macro", getFlag: () => true, update: async (data) => Object.assign(macro, data) };
    globalThis.game = {
      user: { isGM: true },
      users: [{ isGM: true }, ...players],
      macros: [],
    };
    globalThis.Macro = { create: async (data) => Object.assign(macro, data) };
    const result = await ensureAdvertisementMacro();
    assert.equal(result.name, "Generador de anuncios");
    assert.match(result.img, /ad-generator\.svg$/);
    assert.deepEqual(result.ownership, { default: 2 });
    assert.deepEqual(assignments, [["p1", "ad-macro", 1], ["p2", "ad-macro", 1]]);
  } finally {
    globalThis.game = previousGame;
    globalThis.Macro = previousMacro;
  }
});

test("a player never tries to create or assign the shared macro", async () => {
  const previousGame = globalThis.game;
  try {
    globalThis.game = { user: { isGM: false } };
    assert.equal(await ensureAdvertisementMacro(), null);
  } finally {
    globalThis.game = previousGame;
  }
});
