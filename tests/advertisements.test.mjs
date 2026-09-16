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

test("the macro opens one stable dialog and its button renders the proposal", () => {
  const previousFoundry = globalThis.foundry;
  let config;
  let rendered = false;
  class DialogV2 {
    constructor(options) { config = options; }
    render() { rendered = true; return this; }
  }
  try {
    globalThis.foundry = { applications: { api: { DialogV2 } } };
    const dialog = advertisementInspiration();
    assert.ok(dialog instanceof DialogV2);
    assert.equal(rendered, true);
    assert.equal(config.form.closeOnSubmit, false);
    assert.equal(config.buttons[0].action, "generate");
    const target = { innerHTML: "" };
    const result = config.buttons[0].callback(null, null, { element: { querySelector: () => target } });
    assert.ok(result.text);
    assert.match(target.innerHTML, /SEMILLA PARA IMPROVISAR/);
    assert.match(target.innerHTML, /bb-ad-copy/);
  } finally {
    globalThis.foundry = previousFoundry;
  }
});
