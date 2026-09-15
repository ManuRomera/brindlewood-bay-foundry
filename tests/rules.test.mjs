import test from "node:test";
import assert from "node:assert/strict";
import {
  BASE,
  formula,
  tier,
  outcome,
  outcomes,
  crownPlan,
  creationIssue,
  conspiracyLayer,
  advancePlan,
  LIMITS,
  awardXp,
  complexityIssue,
  expertMoveConflict,
} from "../module/rules.mjs";
const state = () => ({
  stats: { ...BASE },
  xp: 5,
  queen: [],
  void: 0,
  conditions: [],
  home: [{ id: "h", marked: true }],
  pending: [],
  advances: [],
  retired: false,
});
test("advantage and disadvantage cancel without stacking", () => {
  assert.equal(
    formula({ advantage: true, disadvantage: true, modifier: 1 }),
    "2d6 + 1",
  );
  assert.equal(formula({ advantage: true, modifier: -1 }), "3d6kh2 + -1");
  assert.equal(formula({ disadvantage: true }), "3d6kl2 + 0");
});
test("theorize ignores every ordinary modifier", () =>
  assert.equal(
    formula({
      move: "theorize",
      clues: 6,
      complexity: 8,
      modifier: 99,
      advantage: true,
      disadvantage: false,
    }),
    "2d6 + 6 - 8",
  ));
test("outcome boundaries", () =>
  assert.deepEqual([6, 7, 9, 10, 11, 12, 19].map(tier), [0, 1, 1, 2, 2, 3, 3]));
test("void finale never reveals a conspirator at 12", () =>
  assert.match(outcome("theorize", 3, { voidMystery: true }), /ritual/));
test("every move exposes all four result degrees in order", () => {
  for (const move of ["day", "night", "meddle", "occult", "theorize"]) {
    const rows = outcomes(move, { voidMystery: move === "theorize" });
    assert.equal(rows.length, 4);
    assert.deepEqual(rows.map((row) => row.index), [0, 1, 2, 3]);
    assert.ok(rows.every((row) => row.label && row.text));
  }
});
test("queen selection does not mutate input, rejects duplicates", () => {
  const s = state();
  const n = crownPlan(s, "queen", 4);
  assert.deepEqual(s.queen, []);
  assert.deepEqual(n.queen, [4]);
  assert.equal(n.pending.length, 1);
  assert.throws(() => crownPlan(n, "queen", 4));
});
test("void is ordered and carriage changes the right stats", () => {
  const s = state();
  assert.throws(() => crownPlan(s, "void", 1));
  const n = crownPlan(crownPlan(s, "void", 0), "void", 1);
  assert.equal(n.stats.reason, 0);
  assert.equal(n.stats.sensitivity, 0);
});
test("pomegranate is permanent and final crown retires", () => {
  let n = state();
  for (let i = 0; i < 5; i++) n = crownPlan(n, "void", i);
  assert.equal(n.retired, true);
  assert.ok(n.conditions.includes("Obsesionada con el Vacío"));
  assert.throws(() => crownPlan(n, "queen", 0));
});
test("advancement validates resources and maximum before spending", () => {
  const s = state();
  s.stats.reason = 3;
  assert.throws(() => advancePlan(s, 0, "reason"));
  assert.equal(s.xp, 5);
  s.stats.reason = 2;
  const n = advancePlan(s, 0, "reason");
  assert.equal(n.stats.reason, 3);
  assert.equal(n.xp, 0);
  assert.throws(() => advancePlan(n, 1, "reason"));
});
test("home advancement alone recovers marked home items", () => {
  const s = state();
  const n = advancePlan(s, 4);
  assert.equal(n.home[0].marked, false);
  assert.equal(s.home[0].marked, true);
});
test("conspiracy thresholds and Mulder reduction", () => {
  assert.deepEqual(
    [0, 2, 3, 4, 5, 9, 10, 14, 15].map((n) => conspiracyLayer(n)),
    [0, 0, 1, 1, 2, 2, 3, 3, 4],
  );
  assert.deepEqual(
    [2, 4, 9, 14].map((n) => conspiracyLayer(n, true)),
    [1, 2, 3, 4],
  );
});
test("creation requires full identity and rejects conflicting talents", () => {
  const items = [{ _id: "x", name: "Dale Cooper" }];
  const d = {
    name: "Violet",
    hobby: "Jardín",
    style: "Cárdigan",
    boost: "reason",
    expert: "x",
  };
  assert.equal(creationIssue(d, [], items), null);
  assert.ok(creationIssue({ ...d, name: "" }, [], items));
  assert.ok(
    creationIssue(d, [{ system: { hobby: " jardín " }, items: [] }], items),
  );
  assert.ok(
    creationIssue(
      d,
      [{ system: { hobby: "Calceta" }, items: [{ name: "Fox Mulder" }] }],
      items,
    ),
  );
});
test("all 216 d6 triples give symmetric advantage/disadvantage", () => {
  let advantage = 0,
    disadvantage = 0;
  for (let a = 1; a <= 6; a++)
    for (let b = 1; b <= 6; b++)
      for (let c = 1; c <= 6; c++) {
        const d = [a, b, c].sort((a, b) => a - b);
        advantage += d[1] + d[2];
        disadvantage += d[0] + d[1];
      }
  assert.equal(advantage + disadvantage, 216 * 14);
  assert.ok(advantage > 216 * 7);
});
test("a fourth condition from pomegranate requests an extra crown without deleting conditions", () => {
  const s = state();
  s.void = 3;
  s.conditions = ["Agotada", "Asustada", "Herida"];
  const n = crownPlan(s, "void", 3);
  assert.deepEqual(n.conditions, s.conditions);
  assert.ok(n.pending.some((p) => p.kind === "crown"));
  const resolved = crownPlan(n, "queen", 0);
  assert.ok(!resolved.pending.some((p) => p.kind === "crown"));
});
test("manual limits are centralized and XP never exceeds its five boxes", () => {
  assert.equal(LIMITS.home, 18);
  assert.equal(LIMITS.conditions, 3);
  assert.equal(LIMITS.xp, 5);
  assert.deepEqual(awardXp({ xp: 4, advances: [] }, 3), {
    xp: 5,
    awarded: 1,
    unawarded: 2,
  });
  assert.deepEqual(awardXp({ xp: 0, advances: [0, 1, 2, 3, 4] }, 1), {
    xp: 0,
    awarded: 0,
    unawarded: 0,
  });
});
test("mystery complexity follows normal, one-session and Void ranges", () => {
  assert.equal(complexityIssue(6), null);
  assert.equal(complexityIssue(8), null);
  assert.ok(complexityIssue(5));
  assert.equal(complexityIssue(5, { oneShot: true }), null);
  assert.equal(complexityIssue(10, { voidMystery: true }), null);
  assert.ok(complexityIssue(9, { voidMystery: true }));
});
test("Dale and Fox are mutually exclusive between different Expertas", () => {
  const actors = [{ id: "a", system: { retired: false }, items: [{ name: "Dale Cooper" }] }];
  assert.equal(expertMoveConflict("Fox Mulder", actors, "b"), true);
  assert.equal(expertMoveConflict("Fox Mulder", actors, "a"), false);
  assert.equal(expertMoveConflict("Jonathan Hart", actors, "b"), false);
});
