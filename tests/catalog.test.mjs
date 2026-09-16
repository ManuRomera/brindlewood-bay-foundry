import test from "node:test";
import assert from "node:assert/strict";
import { catalogName, displayName } from "../module/catalog.mjs";

test("player characters and cases receive one stable catalogue prefix", () => {
  assert.equal(catalogName("player", "Violet Whitmore"), "PJ: Violet Whitmore");
  assert.equal(catalogName("player", "PJ: Violet Whitmore"), "PJ: Violet Whitmore");
  assert.equal(catalogName("case", "Papá por la borda"), "Caso: Papá por la borda");
  assert.equal(catalogName("case", "Caso: Papá por la borda"), "Caso: Papá por la borda");
  assert.equal(displayName("Caso: Papá por la borda"), "Papá por la borda");
});
