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
  assert.match(seed.text, /Está protagonizada por una actriz retirada/);
  assert.match(seed.text, /promete recuperar el control de tu vida/);
  assert.match(seed.text, /pero la letra pequeña ocupa toda la pantalla\.$/);
});

test("the macro publishes one complete proposal in chat", async () => {
  const previousChatMessage = globalThis.ChatMessage;
  let message;
  try {
    globalThis.ChatMessage = {
      getSpeaker: () => ({ alias: "Jugadora QA" }),
      create: async (data) => { message = data; return data; },
    };
    await advertisementInspiration();
    assert.equal(message.speaker.alias, "Jugadora QA");
    assert.match(message.content, /Propuesta de Guión de Anuncio/);
    assert.match(message.content, /COMBINACIÓN ALEATORIA/);
    assert.match(message.content, /bb-ad-copy/);
    assert.doesNotMatch(message.content, /Solo tú ves/);
  } finally {
    globalThis.ChatMessage = previousChatMessage;
  }
});
