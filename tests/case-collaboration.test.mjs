import test from "node:test";
import assert from "node:assert/strict";
import { caseNotePatch } from "../module/case-collaboration.mjs";

const caseSystem = () => ({
  notes: "",
  clues: [{ id: "c1", text: "Texto oficial", context: "", notes: "" }],
  suspects: [{ name: "Persona", description: "Presentación", notes: "" }],
});

test("case notebook updates without touching official content", () => {
  const source = caseSystem();
  const patch = caseNotePatch(source, { kind: "case", text: "Hipótesis compartida" });
  assert.equal(patch["system.notes"], "Hipótesis compartida");
  assert.equal(source.notes, "");
});

test("clue notes preserve the original clue text", () => {
  const source = caseSystem();
  const patch = caseNotePatch(source, {
    kind: "clue",
    id: "c1",
    text: "Puede relacionarse con la hora.",
  });
  assert.equal(patch["system.clues"][0].text, "Texto oficial");
  assert.equal(patch["system.clues"][0].notes, "Puede relacionarse con la hora.");
  assert.equal(source.clues[0].notes, "");
});

test("suspect notes only update the selected case card", () => {
  const source = caseSystem();
  const patch = caseNotePatch(source, {
    kind: "suspect",
    index: 0,
    text: "Coartada dudosa.",
  });
  assert.equal(patch["system.suspects"][0].description, "Presentación");
  assert.equal(patch["system.suspects"][0].notes, "Coartada dudosa.");
});
