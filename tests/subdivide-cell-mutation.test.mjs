import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/discovery/gridCells.ts", "utf8");

// ============================================================
// 1. Module structure
// ============================================================

test("subdivideCell is exported as a public mutation", () => {
  assert.match(source, /export\s+const\s+subdivideCell\s*=\s*mutation\(/);
});

test("imports ConvexError from convex/values", () => {
  assert.match(source, /import\s*\{[^}]*ConvexError[^}]*\}\s*from\s*"convex\/values"/);
});

// ============================================================
// 2. Args validation
// ============================================================

test("subdivideCell accepts cellId as id of discoveryCells", () => {
  // Extract only the subdivideCell block for scoped assertions
  const subdivideBlock = source.slice(source.indexOf("subdivideCell"));
  assert.match(subdivideBlock, /cellId:\s*v\.id\("discoveryCells"\)/);
});

// ============================================================
// 3. Guard: cell status must be saturated
// ============================================================

test("throws ConvexError when cell status is not saturated", () => {
  assert.match(source, /cell\.status\s*!==\s*"saturated"/);
  assert.match(source, /throw\s+new\s+ConvexError\("Cell must be saturated before subdividing"\)/);
});

// ============================================================
// 4. Guard: max depth check
// ============================================================

test("MAX_DEPTH constant is set to 4", () => {
  assert.match(source, /MAX_DEPTH\s*=\s*4/);
});

test("throws ConvexError when cell depth >= MAX_DEPTH", () => {
  assert.match(source, /cell\.depth\s*>=\s*MAX_DEPTH/);
  assert.match(source, /throw\s+new\s+ConvexError\("Cell is already at maximum depth"\)/);
});

// ============================================================
// 5. Guard: no existing children (prevents duplicate subdivision)
// ============================================================

test("queries by_parentCellId index to check for existing children", () => {
  assert.match(source, /\.withIndex\("by_parentCellId"/);
  assert.match(source, /q\.eq\("parentCellId",\s*args\.cellId\)/);
});

test("throws ConvexError when children already exist", () => {
  assert.match(source, /throw\s+new\s+ConvexError\("Cell has already been subdivided"\)/);
});

// ============================================================
// 6. Midpoint calculation
// ============================================================

test("computes midLat as average of cell swLat and neLat", () => {
  assert.match(source, /midLat\s*=\s*\(cell\.swLat\s*\+\s*cell\.neLat\)\s*\/\s*2/);
});

test("computes midLng as average of cell swLng and neLng", () => {
  assert.match(source, /midLng\s*=\s*\(cell\.swLng\s*\+\s*cell\.neLng\)\s*\/\s*2/);
});

// ============================================================
// 7. Child cell creation
// ============================================================

test("creates exactly 4 quadrant definitions", () => {
  const quadrantMatches = source.match(/\{\s*swLat:\s*(?:cell\.swLat|midLat),\s*swLng:\s*(?:cell\.swLng|midLng),\s*neLat:\s*(?:midLat|cell\.neLat),\s*neLng:\s*(?:midLng|cell\.neLng)\s*\}/g);
  assert.ok(quadrantMatches, "Must define quadrant objects");
  assert.equal(quadrantMatches.length, 4, "Must define exactly 4 quadrants");
});

test("child cells are inserted with depth + 1", () => {
  assert.match(source, /childDepth\s*=\s*cell\.depth\s*\+\s*1/);
  assert.match(source, /depth:\s*childDepth/);
});

test("child cells have parentCellId set to original cell", () => {
  assert.match(source, /parentCellId:\s*args\.cellId/);
});

test("child cells are created with isLeaf: true", () => {
  // Find the subdivideCell block to scope our assertion
  const subdivideBlock = source.slice(source.indexOf("subdivideCell"));
  assert.match(subdivideBlock, /isLeaf:\s*true/);
});

test("child cells are created with status unsearched", () => {
  const subdivideBlock = source.slice(source.indexOf("subdivideCell"));
  assert.match(subdivideBlock, /status:\s*"unsearched"/);
});

test("child cells reference the same gridId as parent", () => {
  assert.match(source, /gridId:\s*cell\.gridId/);
});

// ============================================================
// 8. Parent cell update
// ============================================================

test("patches parent cell to set isLeaf false", () => {
  assert.match(source, /ctx\.db\.patch\(args\.cellId,\s*\{\s*isLeaf:\s*false\s*\}\)/);
});

// ============================================================
// 9. Return value
// ============================================================

test("returns childIds array", () => {
  assert.match(source, /return\s*\{\s*childIds\s*\}/);
});

// ============================================================
// 10. Cell not found guard
// ============================================================

test("throws ConvexError when cell is not found", () => {
  assert.match(source, /throw\s+new\s+ConvexError\("Cell not found"\)/);
});
