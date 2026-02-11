import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/discovery/gridCells.ts", "utf8");

// ============================================================
// 1. Module structure
// ============================================================

test("listCells is exported as a public query", () => {
  assert.match(source, /export\s+const\s+listCells\s*=\s*query\(/);
});

test("imports query from convex server", () => {
  assert.match(
    source,
    /import\s*\{[^}]*query[^}]*\}\s*from\s*"\.\.\/\_generated\/server"/,
  );
});

// ============================================================
// 2. Args validation
// ============================================================

test("listCells accepts gridId as v.id('discoveryGrids')", () => {
  // Extract the listCells block to avoid matching args from other functions
  const listCellsBlock = source.slice(source.indexOf("listCells"));
  assert.match(listCellsBlock, /gridId:\s*v\.id\("discoveryGrids"\)/);
});

// ============================================================
// 3. Index usage
// ============================================================

test("queries discoveryCells using by_gridId_isLeaf index", () => {
  assert.match(source, /\.withIndex\("by_gridId_isLeaf"/);
});

test("filters by gridId and isLeaf: true in index query", () => {
  assert.match(source, /\.eq\("gridId",\s*args\.gridId\)/);
  assert.match(source, /\.eq\("isLeaf",\s*true\)/);
});

test("collects all matching cells", () => {
  const listCellsBlock = source.slice(source.indexOf("listCells"));
  assert.match(listCellsBlock, /\.collect\(\)/);
});

// ============================================================
// 4. Return fields
// ============================================================

test("returns _id field", () => {
  const listCellsBlock = source.slice(source.indexOf("listCells"));
  assert.match(listCellsBlock, /_id:\s*cell\._id/);
});

test("returns parentCellId field", () => {
  const listCellsBlock = source.slice(source.indexOf("listCells"));
  assert.match(listCellsBlock, /parentCellId:\s*cell\.parentCellId/);
});

test("returns swLat field", () => {
  const listCellsBlock = source.slice(source.indexOf("listCells"));
  assert.match(listCellsBlock, /swLat:\s*cell\.swLat/);
});

test("returns swLng field", () => {
  const listCellsBlock = source.slice(source.indexOf("listCells"));
  assert.match(listCellsBlock, /swLng:\s*cell\.swLng/);
});

test("returns neLat field", () => {
  const listCellsBlock = source.slice(source.indexOf("listCells"));
  assert.match(listCellsBlock, /neLat:\s*cell\.neLat/);
});

test("returns neLng field", () => {
  const listCellsBlock = source.slice(source.indexOf("listCells"));
  assert.match(listCellsBlock, /neLng:\s*cell\.neLng/);
});

test("returns depth field", () => {
  const listCellsBlock = source.slice(source.indexOf("listCells"));
  assert.match(listCellsBlock, /depth:\s*cell\.depth/);
});

test("returns status field", () => {
  const listCellsBlock = source.slice(source.indexOf("listCells"));
  assert.match(listCellsBlock, /status:\s*cell\.status/);
});

test("returns resultCount field", () => {
  const listCellsBlock = source.slice(source.indexOf("listCells"));
  assert.match(listCellsBlock, /resultCount:\s*cell\.resultCount/);
});

test("returns querySaturation field", () => {
  const listCellsBlock = source.slice(source.indexOf("listCells"));
  assert.match(listCellsBlock, /querySaturation:\s*cell\.querySaturation/);
});

test("returns lastSearchedAt field", () => {
  const listCellsBlock = source.slice(source.indexOf("listCells"));
  assert.match(listCellsBlock, /lastSearchedAt:\s*cell\.lastSearchedAt/);
});

// ============================================================
// 5. Shape projection (does NOT leak extra fields)
// ============================================================

test("maps cells to projected shape via .map()", () => {
  const listCellsBlock = source.slice(source.indexOf("listCells"));
  assert.match(listCellsBlock, /cells\.map\(/);
});
