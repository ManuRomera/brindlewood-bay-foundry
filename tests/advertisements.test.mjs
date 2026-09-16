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
  let rendered;
  class ApplicationV2 {
    constructor() {}
    render(options) { rendered = { app: this, options }; return this; }
    close() {}
  }
  try {
    globalThis.foundry = { applications: { api: {
      ApplicationV2,
      HandlebarsApplicationMixin: (Base) => class extends Base {},
    } } };
    const app = advertisementInspiration();
    assert.equal(app, rendered.app);
    assert.deepEqual(rendered.options, { force: true });
    assert.ok(app.result.text);
    assert.equal(app.constructor.DEFAULT_OPTIONS.window.title, "Tu propuesta de anuncio");
    assert.equal(app.constructor.DEFAULT_OPTIONS.position.height, 430);
    assert.ok(app.constructor.DEFAULT_OPTIONS.classes.includes("bb-ad-dialog"));
    assert.match(app.constructor.PARTS.body.template, /advertisement-inspiration\.hbs$/);
  } finally {
    globalThis.foundry = previousFoundry;
  }
});
