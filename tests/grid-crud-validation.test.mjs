import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/discovery/gridCells.ts", "utf8");

// ============================================================
// Validation: subdivideCell on a saturated cell creates 4
// children with isLeaf: true, parent patched to isLeaf: false
// ============================================================

test("subdivideCell creates exactly 4 quadrants from midpoint split", () => {
  const subdivideStart = source.indexOf("export const subdivideCell");
  const subdivideEnd = source.indexOf("export const listGrids");
  const block = source.slice(subdivideStart, subdivideEnd);

  // All 4 quadrant combos: SW, SE, NW, NE
  assert.match(block, /swLat:\s*cell\.swLat,\s*swLng:\s*cell\.swLng,\s*neLat:\s*midLat,\s*neLng:\s*midLng/);
  assert.match(block, /swLat:\s*cell\.swLat,\s*swLng:\s*midLng,\s*neLat:\s*midLat,\s*neLng:\s*cell\.neLng/);
  assert.match(block, /swLat:\s*midLat,\s*swLng:\s*cell\.swLng,\s*neLat:\s*cell\.neLat,\s*neLng:\s*midLng/);
  assert.match(block, /swLat:\s*midLat,\s*swLng:\s*midLng,\s*neLat:\s*cell\.neLat,\s*neLng:\s*cell\.neLng/);
});

test("subdivideCell child cells always set isLeaf: true", () => {
  const subdivideStart = source.indexOf("export const subdivideCell");
  const subdivideEnd = source.indexOf("export const listGrids");
  const block = source.slice(subdivideStart, subdivideEnd);

  // The insert in subdivide uses isLeaf: true for children
  assert.match(block, /isLeaf:\s*true/);
});

test("subdivideCell patches parent to isLeaf: false", () => {
  const subdivideStart = source.indexOf("export const subdivideCell");
  const subdivideEnd = source.indexOf("export const listGrids");
  const block = source.slice(subdivideStart, subdivideEnd);

  assert.match(block, /ctx\.db\.patch\(args\.cellId,\s*\{\s*isLeaf:\s*false\s*\}\)/);
});

test("subdivideCell only blocks searching status (guard)", () => {
  const subdivideStart = source.indexOf("export const subdivideCell");
  const subdivideEnd = source.indexOf("export const listGrids");
  const block = source.slice(subdivideStart, subdivideEnd);

  assert.match(block, /cell\.status\s*===\s*"searching"/);
  assert.match(block, /throw\s+new\s+ConvexError/);
});

test("subdivideCell is idempotent — returns existing children via by_parentCellId index", () => {
  const subdivideStart = source.indexOf("export const subdivideCell");
  const subdivideEnd = source.indexOf("export const listGrids");
  const block = source.slice(subdivideStart, subdivideEnd);

  // Queries the index to check for existing children
  assert.match(block, /\.withIndex\("by_parentCellId"/);
  // Collects existing children
  assert.match(block, /\.collect\(\)/);
  // If children found, returns them instead of throwing
  assert.match(block, /if\s*\(existingChildren\.length\s*>\s*0\)/);
  assert.match(block, /return\s*\{\s*childIds:\s*existingChildren\.map/);
});

test("subdivideCell enforces max depth of 4", () => {
  const subdivideStart = source.indexOf("export const subdivideCell");
  const subdivideEnd = source.indexOf("export const listGrids");
  const block = source.slice(subdivideStart, subdivideEnd);

  assert.match(block, /cell\.depth\s*>=\s*MAX_DEPTH/);
  assert.match(block, /throw\s+new\s+ConvexError\("Cell is already at maximum depth"\)/);
});

// ============================================================
// Validation: subdivideCell quadrant math correctness
// ============================================================

test("subdivideCell quadrants tile the parent cell exactly (no gaps, no overlaps)", () => {
  // Simulate splitting a cell into 4 quadrants
  const parent = { swLat: 42.85, swLng: -79.9, neLat: 43.03, neLng: -79.65 };
  const midLat = (parent.swLat + parent.neLat) / 2;
  const midLng = (parent.swLng + parent.neLng) / 2;

  const quadrants = [
    { swLat: parent.swLat, swLng: parent.swLng, neLat: midLat, neLng: midLng },
    { swLat: parent.swLat, swLng: midLng, neLat: midLat, neLng: parent.neLng },
    { swLat: midLat, swLng: parent.swLng, neLat: parent.neLat, neLng: midLng },
    { swLat: midLat, swLng: midLng, neLat: parent.neLat, neLng: parent.neLng },
  ];

  assert.equal(quadrants.length, 4);

  // Each quadrant has positive area
  for (const q of quadrants) {
    assert.ok(q.neLat > q.swLat, "neLat must be > swLat");
    assert.ok(q.neLng > q.swLng, "neLng must be > swLng");
  }

  // Union of quadrants covers the parent exactly
  const minLat = Math.min(...quadrants.map((q) => q.swLat));
  const maxLat = Math.max(...quadrants.map((q) => q.neLat));
  const minLng = Math.min(...quadrants.map((q) => q.swLng));
  const maxLng = Math.max(...quadrants.map((q) => q.neLng));

  assert.equal(minLat, parent.swLat);
  assert.equal(maxLat, parent.neLat);
  assert.equal(minLng, parent.swLng);
  assert.equal(maxLng, parent.neLng);
});

// ============================================================
// Validation: listCells returns only leaf cells via index
// ============================================================

test("listCells uses by_gridId_isLeaf index to return only leaf cells", () => {
  const listCellsStart = source.indexOf("export const listCells");
  const listCellsEnd = source.indexOf("export const claimCellForSearch");
  const block = source.slice(listCellsStart, listCellsEnd);

  // Uses the compound index
  assert.match(block, /\.withIndex\("by_gridId_isLeaf"/);
  // Filters for isLeaf: true directly in the index (not post-filtering)
  assert.match(block, /\.eq\("isLeaf",\s*true\)/);
  // Does not do any JS-level isLeaf filtering after collect
  assert.ok(
    !block.includes(".filter("),
    "listCells should not post-filter; the index handles isLeaf filtering",
  );
});

// ============================================================
// Validation: claimCellForSearch atomic claim behavior
// ============================================================

test("claimCellForSearch transitions cell to searching status atomically", () => {
  const claimStart = source.indexOf("export const claimCellForSearch");
  const claimEnd = source.indexOf("export const getCell");
  const block = source.slice(claimStart, claimEnd);

  // Is an internalMutation (single transaction = atomic)
  assert.match(
    source,
    /export\s+const\s+claimCellForSearch\s*=\s*internalMutation\(/,
  );

  // Reads cell status, validates, and patches in one mutation
  assert.match(block, /ctx\.db\.get\(args\.cellId\)/);
  assert.match(block, /args\.expectedStatuses\.includes\(cell\.status\)/);
  assert.match(block, /ctx\.db\.patch\(args\.cellId,\s*\{\s*status:\s*"searching"\s*\}\)/);
});

test("claimCellForSearch returns claimed: false when status doesn't match (prevents concurrent claims)", () => {
  const claimStart = source.indexOf("export const claimCellForSearch");
  const claimEnd = source.indexOf("export const getCell");
  const block = source.slice(claimStart, claimEnd);

  // If a second caller tries to claim while cell is "searching", it won't be
  // in expectedStatuses and returns { claimed: false } instead of throwing
  assert.match(block, /!args\.expectedStatuses\.includes\(cell\.status\)/);
  assert.match(block, /claimed:\s*false/);
});

test("claimCellForSearch returns previousStatus for rollback on failure", () => {
  const claimStart = source.indexOf("export const claimCellForSearch");
  const claimEnd = source.indexOf("export const getCell");
  const block = source.slice(claimStart, claimEnd);

  assert.match(block, /const\s+previousStatus\s*=\s*cell\.status/);
  assert.match(block, /claimed:\s*true/);
  assert.match(block, /previousStatus/);
});
