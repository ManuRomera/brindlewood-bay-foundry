import test from "node:test";
import assert from "node:assert/strict";
import { ADVERTISEMENT_TABLES, advertisementInspiration, advertisementOptionCount, advertisementSeed } from "../module/advertisements.mjs";

test("the five advertisement tables contain usable options", () => {
  assert.deepEqual(Object.keys(ADVERTISEMENT_TABLES), ["product", "format", "star", "promise", "twist"]);
  for (const [name, values] of Object.entries(ADVERTISEMENT_TABLES)) {
    assert.ok(values.length >= 12, `${name} debe contener al menos doce opciones`);
    assert.ok(values.every((value) => typeof value === "string" && value.trim()), `${name} contiene una opción vacía`);
  }
});

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
    assert.match(message.content, /<strong>Producto:<\/strong>/);
    assert.match(message.content, /<strong>Formato:<\/strong>/);
    assert.match(message.content, /<strong>Protagonista:<\/strong>/);
    assert.match(message.content, /<strong>Promesa:<\/strong>/);
    assert.match(message.content, /<strong>Giro:<\/strong>/);
    assert.match(message.content, /<strong>Propuesta completa:<\/strong>/);
    assert.doesNotMatch(message.content, /bb-ad/);
    assert.doesNotMatch(message.content, /Solo tú ves/);
  } finally {
    globalThis.ChatMessage = previousChatMessage;
  }
});
