import test from "node:test";
import assert from "node:assert/strict";
import { advertisementInspiration, advertisementOptionCount, advertisementSeed } from "../module/advertisements.mjs";

test("advertisement generator provides more than a million combinations", () => {
  assert.ok(advertisementOptionCount() > 1_000_000);
});

test("one click produces a complete readable advertisement seed", () => {
  const seed = advertisementSeed(() => 0);
  assert.equal(seed.product, "tienda de muebles");
  assert.match(seed.text, /^Una propuesta en formato de testimonio emocionado anuncia tienda de muebles\./);
  assert.match(seed.text, /La protagoniza una actriz retirada/);
  assert.match(seed.text, /promete recuperar el control de tu vida/);
  assert.match(seed.text, /pero la letra pequeña ocupa toda la pantalla\.$/);
});

test("the macro generates first and opens a window that already contains the proposal", async () => {
  const previousFoundry = globalThis.foundry;
  let config;
  try {
    globalThis.foundry = { applications: { api: { DialogV2: { prompt: async (options) => { config = options; return "ok"; } } } } };
    assert.equal(await advertisementInspiration(), "ok");
    assert.equal(config.window.title, "Tu propuesta de anuncio");
    assert.match(config.content, /SEMILLA PARA IMPROVISAR/);
    assert.match(config.content, /bb-ad-copy/);
    assert.match(config.content, /Ejecuta de nuevo la macro/);
  } finally {
    globalThis.foundry = previousFoundry;
  }
});
