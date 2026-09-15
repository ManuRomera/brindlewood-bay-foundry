import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Handlebars from "handlebars";
const read = (n) =>
  JSON.parse(fs.readFileSync(new URL(`../_data/${n}.json`, import.meta.url)));
test("six complete mysteries: all clues and suspects", () => {
  const a = read("mysteries");
  assert.equal(a.length, 6);
  assert.deepEqual(
    a.map((m) => m.complexity),
    [6, 6, 7, 7, 8, 8],
  );
  assert.deepEqual(
    a.map((m) => m.suspects.length),
    [7, 7, 8, 8, 9, 10],
  );
  for (const m of a) {
    assert.equal(m.clues.length, 20);
    assert.equal(m.voidClues.length, 6);
    assert.ok(m.introduction.length > 500);
    assert.ok(m.locations.length > 100);
    assert.equal(
      new Set([...m.clues, ...m.voidClues].map((c) => c.id)).size,
      26,
    );
  }
  assert.equal(a.at(-1).minLayer, 3);
});
test("19 complete talents with provenance", () => {
  const x = read("expertos");
  assert.equal(x.length, 19);
  for (const i of x) {
    assert.ok(i.system.description.length > 90);
    assert.match(i.system.source, /p\. 7[45]/);
    assert.ok(!i.system.description.includes("MOVIMIENTOS EXPERTOS"));
  }
});
test("every compendium document and page has stable IDs and no leaked local paths", () => {
  for (const n of [
    "reglas",
    "guardiana",
    "aventuras",
    "sospechosos",
    "expertos",
    "basicos",
    "anuncios",
  ]) {
    const ds = read(n);
    const ids = new Set();
    for (const d of ds) {
      assert.match(d._id, /^[a-f0-9]{16}$/);
      assert.ok(!ids.has(d._id));
      ids.add(d._id);
      for (const p of d.pages ?? []) assert.ok(p.text.content.length > 80);
    }
    assert.ok(!JSON.stringify(ds).includes("/Users/"));
  }
});
test("templates parse and render without unknown helpers", () => {
  Handlebars.registerHelper("eq", (a, b) => a === b);
  for (const f of fs.readdirSync(new URL("../templates", import.meta.url))) {
    const t = fs.readFileSync(
      new URL("../templates/" + f, import.meta.url),
      "utf8",
    );
    assert.doesNotThrow(() =>
      Handlebars.compile(t)({ actor: {}, system: {}, item: {} }),
    );
  }
});
test("GM content is not a player-observer pack", () => {
  const m = JSON.parse(
    fs.readFileSync(new URL("../system.json", import.meta.url)),
  );
  for (const p of m.packs.filter((p) =>
    ["aventuras", "sospechosos", "guardiana"].includes(p.name),
  ))
    assert.equal(p.ownership.PLAYER, "NONE");
});
