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

// Extract only the generateGrid insert block
const insertMatch = mutationSource.match(
  /ctx\.db\.insert\("discoveryGrids",\s*\{([\s\S]*?)\}\)/,
);
const insertBody = insertMatch ? insertMatch[1] : "";

// ============================================================
// 1. Schema: discoveryGrids has no bounds fields
// ============================================================

test("discoveryGrids schema does not have swLat field", () => {
  assert.doesNotMatch(gridTableBody, /\bswLat\b/);
});

test("discoveryGrids schema does not have swLng field", () => {
  assert.doesNotMatch(gridTableBody, /\bswLng\b/);
});

test("discoveryGrids schema does not have neLat field", () => {
  assert.doesNotMatch(gridTableBody, /\bneLat\b/);
});

test("discoveryGrids schema does not have neLng field", () => {
  assert.doesNotMatch(gridTableBody, /\bneLng\b/);
});

// ============================================================
// 2. generateGrid insert does not persist bounds on grid record
// ============================================================

test("generateGrid insert does not include swLat", () => {
  assert.doesNotMatch(insertBody, /\bswLat\b/);
});

test("generateGrid insert does not include swLng", () => {
  assert.doesNotMatch(insertBody, /\bswLng\b/);
});

test("generateGrid insert does not include neLat", () => {
  assert.doesNotMatch(insertBody, /\bneLat\b/);
});

test("generateGrid insert does not include neLng", () => {
  assert.doesNotMatch(insertBody, /\bneLng\b/);
});

// ============================================================
// 3. generateGrid still accepts bounds as mutation args (for cell generation)
// ============================================================

test("generateGrid still accepts swLat, swLng, neLat, neLng as args", () => {
  const argsMatch = mutationSource.match(
    /export\s+const\s+generateGrid\s*=\s*mutation\(\{[\s\S]*?args:\s*\{([\s\S]*?)\},\s*handler/,
  );
  assert.ok(argsMatch, "generateGrid args block must exist");
  assert.match(argsMatch[1], /swLat:\s*v\.number\(\)/);
  assert.match(argsMatch[1], /swLng:\s*v\.number\(\)/);
  assert.match(argsMatch[1], /neLat:\s*v\.number\(\)/);
  assert.match(argsMatch[1], /neLng:\s*v\.number\(\)/);
});

// ============================================================
// 4. generateGrid still uses bounds args for cell generation math
// ============================================================

test("generateGrid still computes midLat from args.swLat and args.neLat", () => {
  assert.match(mutationSource, /midLat\s*=\s*\(args\.swLat\s*\+\s*args\.neLat\)\s*\/\s*2/);
});

test("generateGrid still iterates lat from args.swLat to args.neLat", () => {
  assert.match(mutationSource, /for\s*\(\s*let\s+lat\s*=\s*args\.swLat;\s*lat\s*<\s*args\.neLat/);
});

test("generateGrid still iterates lng from args.swLng to args.neLng", () => {
  assert.match(mutationSource, /for\s*\(\s*let\s+lng\s*=\s*args\.swLng;\s*lng\s*<\s*args\.neLng/);
});
