import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { randomExpert, randomExpertVariety } from "../module/expert-generator.mjs";

const moves = JSON.parse(fs.readFileSync(new URL("../_data/expertos.json", import.meta.url)));

test("random Expertas are complete and provide huge Spanish and coastal variety", () => {
  assert.ok(randomExpertVariety(false) > 1_000_000_000);
  assert.ok(randomExpertVariety(true) > 1_000_000_000);
  for (const castilian of [false, true]) {
    const draft = randomExpert({ castilian, moves, random: () => 0.42 });
    assert.ok(draft.name.includes(" "));
    assert.ok(draft.style && draft.hobby && draft.partner && draft.family && draft.career);
    assert.ok(draft.home.length >= 3 && draft.home.length <= 4);
    assert.equal(draft.questions.length, 3);
    assert.equal(draft.questions[0], 0);
    assert.ok(moves.some((move) => move._id === draft.expert));
  }
});

test("random creation respects unique hobbies and initial movement conflicts", () => {
  const first = { system: { hobby: "Cuidar los geranios" }, items: [{ name: "Dale Cooper" }] };
  for (let index = 0; index < 30; index++) {
    const draft = randomExpert({ castilian: true, moves, experts: [first] });
    assert.notEqual(draft.hobby, "Cuidar los geranios");
    assert.notEqual(moves.find((move) => move._id === draft.expert).name, "Dale Cooper");
    assert.notEqual(moves.find((move) => move._id === draft.expert).name, "Fox Mulder");
  }
});
