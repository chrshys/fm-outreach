import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/discovery/gridCells.ts", "utf8");
const schemaSource = fs.readFileSync("convex/schema.ts", "utf8");

// ============================================================
// 1. Module structure
// ============================================================

test("generateGrid is exported as a public mutation", () => {
  assert.match(source, /export\s+const\s+generateGrid\s*=\s*mutation\(/);
});

test("imports mutation from convex server", () => {
  assert.match(source, /import\s*\{[^}]*mutation[^}]*\}\s*from\s*"\.\.\/\_generated\/server"/);
});

// ============================================================
// 2. Args validation
// ============================================================

test("generateGrid accepts required string args: name, region, province", () => {
  assert.match(source, /name:\s*v\.string\(\)/);
  assert.match(source, /region:\s*v\.string\(\)/);
  assert.match(source, /province:\s*v\.string\(\)/);
});

test("generateGrid accepts required number args: swLat, swLng, neLat, neLng", () => {
  assert.match(source, /swLat:\s*v\.number\(\)/);
  assert.match(source, /swLng:\s*v\.number\(\)/);
  assert.match(source, /neLat:\s*v\.number\(\)/);
  assert.match(source, /neLng:\s*v\.number\(\)/);
});

test("generateGrid accepts optional queries array", () => {
  assert.match(source, /queries:\s*v\.optional\(v\.array\(v\.string\(\)\)\)/);
});

test("generateGrid accepts optional cellSizeKm number", () => {
  assert.match(source, /cellSizeKm:\s*v\.optional\(v\.number\(\)\)/);
});

// ============================================================
// 3. Default values
// ============================================================

test("default cellSizeKm is 20", () => {
  assert.match(source, /DEFAULT_CELL_SIZE_KM\s*=\s*20/);
});

test("default queries include all 5 expected terms", () => {
  const expectedQueries = [
    "farms",
    "farmers market",
    "orchard",
    "farm stand",
    "pick your own",
  ];
  for (const q of expectedQueries) {
    assert.ok(
      source.includes(`"${q}"`),
      `Default queries must include "${q}"`,
    );
  }
});

test("uses nullish coalescing for cellSizeKm default", () => {
  assert.match(source, /args\.cellSizeKm\s*\?\?\s*DEFAULT_CELL_SIZE_KM/);
});

test("uses nullish coalescing for queries default", () => {
  assert.match(source, /args\.queries\s*\?\?\s*DEFAULT_QUERIES/);
});

// ============================================================
// 4. Grid record creation
// ============================================================

test("inserts into discoveryGrids table", () => {
  assert.match(source, /ctx\.db\.insert\("discoveryGrids"/);
});

test("grid record includes totalLeadsFound: 0", () => {
  assert.match(source, /totalLeadsFound:\s*0/);
});

test("grid record includes createdAt timestamp", () => {
  assert.match(source, /createdAt:\s*now/);
});

// ============================================================
// 5. Cell generation math
// ============================================================

test("computes midLat as average of swLat and neLat", () => {
  assert.match(source, /midLat\s*=\s*\(args\.swLat\s*\+\s*args\.neLat\)\s*\/\s*2/);
});

test("computes latStep as cellSizeKm / 111", () => {
  assert.match(source, /latStep\s*=\s*cellSizeKm\s*\/\s*111/);
});

test("computes lngStep using cosine correction: cellSizeKm / (111 * cos(midLat))", () => {
  assert.match(source, /lngStep\s*=\s*cellSizeKm\s*\/\s*\(111\s*\*\s*Math\.cos\(/);
  // Ensure degrees-to-radians conversion
  assert.match(source, /\(midLat\s*\*\s*Math\.PI\)\s*\/\s*180/);
});

// ============================================================
// 6. Cell insertion
// ============================================================

test("inserts cells into discoveryCells table", () => {
  assert.match(source, /ctx\.db\.insert\("discoveryCells"/);
});

test("cells are created with isLeaf: true", () => {
  assert.match(source, /isLeaf:\s*true/);
});

test("cells are created with depth: 0", () => {
  assert.match(source, /depth:\s*0/);
});

test("cells are created with status unsearched", () => {
  assert.match(source, /status:\s*"unsearched"/);
});

test("cells reference the grid via gridId foreign key", () => {
  assert.match(source, /gridId/);
});

test("cell bounds are clamped to grid bounds using Math.min", () => {
  assert.match(source, /Math\.min\(lat\s*\+\s*latStep,\s*args\.neLat\)/);
  assert.match(source, /Math\.min\(lng\s*\+\s*lngStep,\s*args\.neLng\)/);
});

// ============================================================
// 7. Return value
// ============================================================

test("returns gridId and cellCount", () => {
  assert.match(source, /return\s*\{[^}]*gridId/);
  assert.match(source, /cellCount:\s*cellIds\.length/);
});

// ============================================================
// 8. Grid tiling loop structure
// ============================================================

test("iterates latitude from swLat to neLat", () => {
  assert.match(source, /for\s*\(\s*let\s+lat\s*=\s*args\.swLat;\s*lat\s*<\s*args\.neLat;\s*lat\s*\+=\s*latStep\)/);
});

test("iterates longitude from swLng to neLng", () => {
  assert.match(source, /for\s*\(\s*let\s+lng\s*=\s*args\.swLng;\s*lng\s*<\s*args\.neLng;\s*lng\s*\+=\s*lngStep\)/);
});

// ============================================================
// 9. Schema compatibility
// ============================================================

test("discoveryGrids table exists in schema for grid insertion", () => {
  assert.match(schemaSource, /discoveryGrids:\s*defineTable\(/);
});

test("discoveryCells table exists in schema for cell insertion", () => {
  assert.match(schemaSource, /discoveryCells:\s*defineTable\(/);
});

test("discoveryCells has gridId field referencing discoveryGrids", () => {
  assert.match(schemaSource, /gridId:\s*v\.id\("discoveryGrids"\)/);
});
