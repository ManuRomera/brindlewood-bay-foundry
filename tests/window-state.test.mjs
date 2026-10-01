import test from "node:test";
import assert from "node:assert/strict";
import { fitWindow, centerWindow } from "../module/window-state.mjs";

test("remembered windows are resized and kept inside the visible viewport", () => {
  assert.deepEqual(
    fitWindow({ left: 1900, top: -80, width: 1200, height: 900 }, { width: 1000, height: 700 }),
    { left: 12, top: 12, width: 976, height: 676 },
  );
  assert.deepEqual(
    fitWindow({ left: 100, top: 90, width: 600, height: 500 }, { width: 1200, height: 900 }),
    { left: 100, top: 90, width: 600, height: 500 },
  );
});

test("centerWindow centers a fitted window inside the viewport", () => {
  const p = centerWindow({ width: 800, height: 600 }, { width: 1200, height: 900 });
  assert.deepEqual(p, { width: 800, height: 600, left: 200, top: 150 });
});
