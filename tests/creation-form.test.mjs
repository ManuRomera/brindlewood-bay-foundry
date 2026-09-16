import test from "node:test";
import assert from "node:assert/strict";
import { identityIssue, lifeIssue } from "../module/creation-form.mjs";

test("guided identity accepts selectors or written alternatives and explains missing fields", () => {
  const data = new FormData();
  assert.match(identityIssue(data), /nombre/);
  data.set("namePreset", "Violet Whitmore");
  data.set("stylePreset", "Cárdigan");
  data.set("hobbyPreset", "Cuidar del jardín");
  assert.equal(identityIssue(data), "");
  data.set("styleCustom", "Traje violeta hecho a medida");
  assert.equal(identityIssue(data), "");
});

test("the final creation step requires life, three homes and two chosen goals", () => {
  const data = new FormData();
  data.set("partner", "Arthur, relojero");
  data.set("family", "Una hija y dos nietas");
  data.set("career", "Bibliotecaria");
  data.set("home1", "Una tetera");
  data.set("home2", "Una lupa");
  assert.match(lifeIssue(data), /tres y cinco objetos/);
  data.set("home3", "Un manojo de llaves");
  assert.match(lifeIssue(data), /exactamente dos objetivos/);
  data.set("q2", "on");
  data.set("q5", "on");
  assert.equal(lifeIssue(data), "");
});
