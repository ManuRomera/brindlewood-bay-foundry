import test from "node:test";
import assert from "node:assert/strict";
import { afablePlan, layerChange, LAYERS, outcome, outcomes, conspiracyLayer, SESSION_START, ADVANTAGE_MOVES, PERMANENT } from "../module/rules.mjs";

const sheet = (conditions) => ({ conditions, hobby: "Observar aves" });

test("Afable quita la Condición elegida sin mutar la ficha", () => {
  const original = sheet(["Irritada", "Golpeada"]);
  const plan = afablePlan(original, { index: 0 });
  assert.equal(plan.removed, "Irritada");
  assert.deepEqual(plan.next.conditions, ["Golpeada"]);
  assert.deepEqual(original.conditions, ["Irritada", "Golpeada"]);
  assert.equal(plan.clue, false);
});

test("Afable sobre el propio quehacer da una Pista aunque no haya Condición", () => {
  const plan = afablePlan(sheet([]), { ownHobby: true });
  assert.equal(plan.removed, null);
  assert.equal(plan.clue, true);
});

test("Afable rechaza no hacer nada, Condiciones inexistentes y la permanente", () => {
  assert.throws(() => afablePlan(sheet(["Irritada"]), {}), /Elige una Condición/);
  assert.throws(() => afablePlan(sheet(["Irritada"]), { index: 2 }), /no existe/);
  assert.throws(() => afablePlan(sheet([PERMANENT]), { index: 0 }), /permanente/);
});

test("cada umbral de la conspiración anuncia su capa una sola vez", () => {
  assert.deepEqual(layerChange(0, 0), []);
  assert.deepEqual(layerChange(conspiracyLayer(2), conspiracyLayer(3)), [LAYERS[0]]);
  assert.deepEqual(layerChange(conspiracyLayer(4), conspiracyLayer(5)), [LAYERS[1]]);
  assert.deepEqual(layerChange(conspiracyLayer(9), conspiracyLayer(10)), [LAYERS[2]]);
  assert.deepEqual(layerChange(conspiracyLayer(14), conspiracyLayer(15)), [LAYERS[3]]);
  // Con Fox Mulder cada umbral baja una pista.
  assert.deepEqual(layerChange(conspiracyLayer(1, true), conspiracyLayer(2, true)), [LAYERS[0]]);
  // Saltarse dos capas de golpe anuncia ambas, en orden.
  assert.deepEqual(layerChange(0, 2), [LAYERS[0], LAYERS[1]]);
  assert.deepEqual(layerChange(3, 2), []);
});

test("el Misterio del Vacío no tiene resultado extraordinario al Teorizar", () => {
  assert.match(outcome("theorize", 3, { voidMystery: true }), /como un 10–11/);
  assert.doesNotMatch(outcome("theorize", 3), /como un 10–11/);
  assert.match(outcomes("theorize", { voidMystery: true })[3].label, /Como 10–11/);
  assert.equal(outcomes("theorize")[3].label, "12+ · Éxito extraordinario");
});

test("las tablas de avisos solo nombran movimientos expertos reales", async () => {
  const { readFile } = await import("node:fs/promises");
  const moves = JSON.parse(await readFile(new URL("../_data/expertos.json", import.meta.url)));
  const names = new Set(moves.map((move) => move.name));
  for (const name of [...Object.keys(SESSION_START), ...Object.keys(ADVANTAGE_MOVES)])
    assert.ok(names.has(name), `${name} no existe en el compendio de movimientos expertos`);
});
