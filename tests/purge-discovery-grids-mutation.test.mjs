import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("convex/discovery/gridCells.ts", "utf8");

test("exports purgeDiscoveryGrids as a public mutation", () => {
  assert.match(source, /export const purgeDiscoveryGrids = mutation\(\{/);
});

test("purgeDiscoveryGrids takes no arguments", () => {
  const fnStart = source.indexOf(
    "export const purgeDiscoveryGrids = mutation({",
  );
  assert.ok(fnStart !== -1, "purgeDiscoveryGrids mutation must exist");
  const argsLine = source.indexOf("args: {},", fnStart);
  assert.ok(argsLine !== -1, "purgeDiscoveryGrids must have empty args");
  const handlerLine = source.indexOf("handler:", fnStart);
  assert.ok(argsLine < handlerLine, "args must come before handler");
});

test("purgeDiscoveryGrids deletes all discoveryCells first", () => {
  const fnStart = source.indexOf(
    "export const purgeDiscoveryGrids = mutation({",
  );
  const fnBlock = source.slice(fnStart);
  assert.match(fnBlock, /ctx\.db\.query\("discoveryCells"\)\.collect\(\)/);
  assert.match(fnBlock, /ctx\.db\.delete\(cell\._id\)/);
});

test("purgeDiscoveryGrids deletes all discoveryGrids", () => {
  const fnStart = source.indexOf(
    "export const purgeDiscoveryGrids = mutation({",
  );
  const fnBlock = source.slice(fnStart);
  assert.match(fnBlock, /ctx\.db\.query\("discoveryGrids"\)\.collect\(\)/);
  assert.match(fnBlock, /ctx\.db\.delete\(grid\._id\)/);
});

test("purgeDiscoveryGrids returns deletedCells and deletedGrids counts", () => {
  const fnStart = source.indexOf(
    "export const purgeDiscoveryGrids = mutation({",
  );
  const fnBlock = source.slice(fnStart);
  assert.match(fnBlock, /deletedCells:/);
  assert.match(fnBlock, /deletedGrids:/);
});

test("purgeDiscoveryGrids deletes cells before grids (referential integrity)", () => {
  const fnStart = source.indexOf(
    "export const purgeDiscoveryGrids = mutation({",
  );
  const fnBlock = source.slice(fnStart);
  const cellQueryIdx = fnBlock.indexOf('query("discoveryCells")');
  const gridQueryIdx = fnBlock.indexOf('query("discoveryGrids")');
  assert.ok(
    cellQueryIdx < gridQueryIdx,
    "cells must be deleted before grids to maintain referential integrity",
  );
});
