import test from "node:test";
import assert from "node:assert/strict";
import { advertisementOptionCount } from "../module/advertisements.mjs";

test("advertisement generator provides more than a million combinations", () => {
  assert.ok(advertisementOptionCount() > 1_000_000);
});
