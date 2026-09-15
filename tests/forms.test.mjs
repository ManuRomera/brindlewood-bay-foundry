import test from "node:test";
import assert from "node:assert/strict";
class Base {}
globalThis.foundry = {
  applications: {
    api: { HandlebarsApplicationMixin: (C) => C },
    sheets: { ActorSheetV2: Base, ItemSheetV2: Base },
  },
  utils: { expandObject: (o) => o },
};
const { ExpertSheet, MoveSheet, MysterySheet } = await import(
  "../module/sheets.mjs"
);
test("editing move description preserves mechanical keys by omission", () => {
  const result = MoveSheet.prototype._processFormData(null, null, {
    object: { "system.description": "Edited" },
  });
  assert.deepEqual(result, { "system.description": "Edited" });
  assert.ok(!Object.hasOwn(result, "system.used"));
  assert.ok(!Object.hasOwn(result, "system.frequency"));
});
test("locked sheet does not send absent resources or hidden stats", () => {
  const result = ExpertSheet.prototype._processFormData.call(
    { unlocked: false },
    null,
    null,
    {
      object: {
        name: "Violet",
        "system.stats.reason": 3,
        "system.queen": [],
        "system.xp": 0,
      },
    },
  );
  assert.deepEqual(result, { name: "Violet" });
});
test("explicit unlocked stat edit does not rewrite arrays", () => {
  const result = ExpertSheet.prototype._processFormData.call(
    { unlocked: true },
    null,
    null,
    { object: { "system.stats.reason": 2 } },
  );
  assert.deepEqual(result, { "system.stats.reason": 2 });
});
test("mystery form does not silently replace revealed clues", () => {
  const result = MysterySheet.prototype._processFormData(null, null, {
    object: {
      "system.description": "Public intro",
      "system.clues": [],
      "system.status": "resolved",
    },
  });
  assert.deepEqual(result, { "system.description": "Public intro" });
});
test("mystery form rejects complexity outside the manual range", () => {
  assert.throws(() =>
    MysterySheet.prototype._processFormData.call(
      { actor: { system: { complexity: 6, voidMystery: false } } },
      null,
      null,
      { object: { "system.complexity": 9 } },
    ),
  );
  const result = MysterySheet.prototype._processFormData.call(
    { actor: { system: { complexity: 6, voidMystery: false } } },
    null,
    null,
    { object: { "system.complexity": 8 } },
  );
  assert.deepEqual(result, { "system.complexity": 8 });
});
