import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("convex/discovery/gridCells.ts", "utf8");

test("exports purgeDiscoveryCells as a public mutation", () => {
  assert.match(source, /export const purgeDiscoveryCells = mutation\(\{/);
});

test("purgeDiscoveryCells takes no arguments", () => {
  const fnStart = source.indexOf(
    "export const purgeDiscoveryCells = mutation({",
  );
  assert.ok(fnStart !== -1, "purgeDiscoveryCells mutation must exist");
  const argsLine = source.indexOf("args: {},", fnStart);
  assert.ok(argsLine !== -1, "purgeDiscoveryCells must have empty args");
  const handlerLine = source.indexOf("handler:", fnStart);
  assert.ok(argsLine < handlerLine, "args must come before handler");
});

test("purgeDiscoveryCells queries all discoveryCells documents", () => {
  assert.match(source, /ctx\.db\.query\("discoveryCells"\)\.collect\(\)/);
});

test("purgeDiscoveryCells deletes each cell", () => {
  assert.match(source, /ctx\.db\.delete\(cell\._id\)/);
});

test("purgeDiscoveryCells returns deletedCount", () => {
  assert.match(source, /deletedCount:/);
});
