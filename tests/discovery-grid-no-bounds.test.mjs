import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const schemaSource = fs.readFileSync("convex/schema.ts", "utf8");
const mutationSource = fs.readFileSync("convex/discovery/gridCells.ts", "utf8");

// Extract only the discoveryGrids table definition
const gridTableMatch = schemaSource.match(
  /discoveryGrids:\s*defineTable\(\{([\s\S]*?)\}\)/,
);
const gridTableBody = gridTableMatch ? gridTableMatch[1] : "";

// ============================================================
// 1. Schema: discoveryGrids bounds fields are optional (legacy compat)
// ============================================================

test("discoveryGrids schema has swLat as optional", () => {
  assert.match(gridTableBody, /swLat:\s*v\.optional\(v\.number\(\)\)/);
});

test("discoveryGrids schema has swLng as optional", () => {
  assert.match(gridTableBody, /swLng:\s*v\.optional\(v\.number\(\)\)/);
});

test("discoveryGrids schema has neLat as optional", () => {
  assert.match(gridTableBody, /neLat:\s*v\.optional\(v\.number\(\)\)/);
});

test("discoveryGrids schema has neLng as optional", () => {
  assert.match(gridTableBody, /neLng:\s*v\.optional\(v\.number\(\)\)/);
});

// ============================================================
// 2. generateGrid mutation has been removed (replaced by virtual grid)
// ============================================================

test("generateGrid mutation no longer exists", () => {
  assert.doesNotMatch(mutationSource, /export\s+const\s+generateGrid/);
});
