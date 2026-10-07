import test from "node:test";
import assert from "node:assert/strict";
import { planOps, BOARD } from "../module/board-rules.mjs";

const ctx = { clueIds: new Set(["pista0001"]), suspectIds: new Set(["persona01"]) };
const empty = () => ({ items: {}, links: {} });
const add = (id, data) => ({ op: "set", kind: "items", id, data });

test("un elemento nuevo se crea con sus campos y una ruta de update propia", () => {
  const plan = planOps(empty(), [add("abcdefgh", { type: "clue", ref: "pista0001", x: 100.4, y: 50, z: 3 })], ctx);
  assert.deepEqual(plan.board.items.abcdefgh, { type: "clue", ref: "pista0001", x: 100, y: 50, z: 3 });
  assert.equal(plan.update["system.board.items.abcdefgh.x"], 100);
  assert.ok(Object.keys(plan.update).every((key) => key.startsWith("system.board.items.abcdefgh.")));
});

test("mover un elemento solo escribe x, y y z de ese elemento", () => {
  const board = planOps(empty(), [add("abcdefgh", { type: "note" }), add("ijklmnop", { type: "note" })], ctx).board;
  const plan = planOps(board, [add("abcdefgh", { x: 5000, y: -4, z: 9, ignorado: "x" })], ctx);
  assert.deepEqual(Object.keys(plan.update).sort(), ["system.board.items.abcdefgh.x", "system.board.items.abcdefgh.y", "system.board.items.abcdefgh.z"]);
  assert.equal(plan.board.items.abcdefgh.x, BOARD.width - 40);
  assert.equal(plan.board.items.abcdefgh.y, 0);
});

test("rechaza referencias inexistentes, tipos y campos ajenos", () => {
  assert.throws(() => planOps(empty(), [add("abcdefgh", { type: "clue", ref: "falsa" })], ctx), /no existe/);
  assert.throws(() => planOps(empty(), [add("abcdefgh", { type: "person", ref: "falsa" })], ctx), /no existe/);
  assert.throws(() => planOps(empty(), [add("abcdefgh", { type: "bomba" })], ctx), /desconocido/);
  assert.throws(() => planOps(empty(), [add("abcdefgh", { type: "photo", src: "javascript:alert(1).png" })], ctx), /no permitida/);
  assert.throws(() => planOps(empty(), [add("abcdefgh", { type: "photo", src: "../../secreto.png" })], ctx), /no permitida/);
  assert.throws(() => planOps(empty(), [add("x", { type: "note" })], ctx), /Identificador/);
  const board = planOps(empty(), [add("abcdefgh", { type: "clue", ref: "pista0001" })], ctx).board;
  assert.throws(() => planOps(board, [add("abcdefgh", { text: "no" })], ctx), /solo las notas/i);
});

test("una foto acepta rutas de Foundry y URL de imagen", () => {
  for (const src of ["systems/brindlewood-bay/assets/cover.png", "worlds/x/Mi foto (1).JPG", "https://ejemplo.org/a.webp?v=2"]) {
    const plan = planOps(empty(), [add("abcdefgh", { type: "photo", src, text: "pie" })], ctx);
    assert.equal(plan.board.items.abcdefgh.src, src);
  }
});

test("los hilos unen dos elementos distintos, sin duplicados, y caen con ellos", () => {
  let board = planOps(empty(), [add("aaaaaaaa", { type: "note" }), add("bbbbbbbb", { type: "note" })], ctx).board;
  const link = (id, from, to, color = "rojo") => ({ op: "set", kind: "links", id, data: { from, to, color } });
  assert.throws(() => planOps(board, [link("hilo0001", "aaaaaaaa", "aaaaaaaa")], ctx), /dos elementos/);
  assert.throws(() => planOps(board, [link("hilo0001", "aaaaaaaa", "zzzzzzzz")], ctx), /dos elementos/);
  assert.throws(() => planOps(board, [link("hilo0001", "aaaaaaaa", "bbbbbbbb", "fucsia")], ctx), /Color/);
  board = planOps(board, [link("hilo0001", "aaaaaaaa", "bbbbbbbb")], ctx).board;
  const twin = planOps(board, [link("hilo0002", "bbbbbbbb", "aaaaaaaa")], ctx);
  assert.equal(twin.ops.length, 0);
  const other = planOps(board, [link("hilo0003", "bbbbbbbb", "aaaaaaaa", "azul")], ctx);
  assert.equal(other.ops.length, 1);
  const removed = planOps(board, [{ op: "remove", kind: "items", id: "aaaaaaaa" }], ctx);
  assert.deepEqual(removed.ops.map((o) => `${o.kind}:${o.id}`), ["items:aaaaaaaa", "links:hilo0001"]);
  assert.equal(removed.update["system.board.links.-=hilo0001"], null);
  assert.deepEqual(removed.board.links, {});
});

test("la pizarra tiene un tope de elementos", () => {
  const ops = Array.from({ length: 40 }, (_, i) => add(`item${String(i).padStart(4, "0")}`, { type: "note" }));
  let board = empty();
  for (let n = 0; n < 3; n++) board = planOps(board, ops.map((o) => ({ ...o, id: `lote${n}${o.id}` })), ctx).board;
  assert.equal(Object.keys(board.items).length, 120);
  assert.throws(() => planOps(board, ops.map((o) => ({ ...o, id: `lote9${o.id}` })), ctx), /llena/);
});
