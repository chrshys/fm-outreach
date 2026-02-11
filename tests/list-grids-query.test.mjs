import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/discovery/gridCells.ts", "utf8");

// ============================================================
// 1. Module structure
// ============================================================

test("listGrids is exported as a public query", () => {
  assert.match(source, /export\s+const\s+listGrids\s*=\s*query\(/);
});

test("listGrids takes no args", () => {
  // Extract the args object for listGrids
  const match = source.match(
    /export\s+const\s+listGrids\s*=\s*query\(\{[\s\S]*?args:\s*\{(\s*)\}/,
  );
  assert.ok(match, "listGrids should have an empty args object");
});

// ============================================================
// 2. Data fetching
// ============================================================

test("listGrids queries the discoveryGrids table", () => {
  const listGridsBlock = source.match(
    /export\s+const\s+listGrids\s*=\s*query\(\{([\s\S]*?)\}\);/,
  );
  assert.ok(listGridsBlock, "listGrids block not found");
  const body = listGridsBlock[1];

  assert.match(body, /ctx\.db[\s\S]*?query\("discoveryGrids"\)/);
});

test("listGrids queries discoveryCells with by_gridId_isLeaf index", () => {
  const listGridsBlock = source.match(
    /export\s+const\s+listGrids\s*=\s*query\(\{([\s\S]*?)\}\);/,
  );
  assert.ok(listGridsBlock);
  const body = listGridsBlock[1];

  assert.match(body, /withIndex\("by_gridId_isLeaf"/);
  assert.match(body, /\.eq\("isLeaf",\s*true\)/);
});

// ============================================================
// 3. Summary stats computation
// ============================================================

test("listGrids computes totalLeafCells from leaf cell count", () => {
  const listGridsBlock = source.match(
    /export\s+const\s+listGrids\s*=\s*query\(\{([\s\S]*?)\}\);/,
  );
  assert.ok(listGridsBlock);
  const body = listGridsBlock[1];

  assert.match(body, /totalLeafCells/);
});

test("listGrids computes searchedCount", () => {
  const listGridsBlock = source.match(
    /export\s+const\s+listGrids\s*=\s*query\(\{([\s\S]*?)\}\);/,
  );
  assert.ok(listGridsBlock);
  const body = listGridsBlock[1];

  assert.match(body, /searchedCount/);
  assert.match(body, /status\s*===\s*"searched"/);
});

test("listGrids computes saturatedCount", () => {
  const listGridsBlock = source.match(
    /export\s+const\s+listGrids\s*=\s*query\(\{([\s\S]*?)\}\);/,
  );
  assert.ok(listGridsBlock);
  const body = listGridsBlock[1];

  assert.match(body, /saturatedCount/);
  assert.match(body, /status\s*===\s*"saturated"/);
});

test("listGrids includes totalLeadsFound from grid record", () => {
  const listGridsBlock = source.match(
    /export\s+const\s+listGrids\s*=\s*query\(\{([\s\S]*?)\}\);/,
  );
  assert.ok(listGridsBlock);
  const body = listGridsBlock[1];

  assert.match(body, /totalLeadsFound:\s*grid\.totalLeadsFound/);
});

// ============================================================
// 4. Return shape
// ============================================================

test("listGrids returns grid metadata fields", () => {
  const listGridsBlock = source.match(
    /export\s+const\s+listGrids\s*=\s*query\(\{([\s\S]*?)\}\);/,
  );
  assert.ok(listGridsBlock);
  const body = listGridsBlock[1];

  const expectedFields = [
    "_id",
    "name",
    "region",
    "province",
    "cellSizeKm",
    "totalLeadsFound",
    "createdAt",
    "totalLeafCells",
    "searchedCount",
    "saturatedCount",
  ];

  for (const field of expectedFields) {
    assert.match(
      body,
      new RegExp(`\\b${field}\\b`),
      `Return object should include ${field}`,
    );
  }
});

test("listGrids uses Promise.all for parallel cell queries", () => {
  const listGridsBlock = source.match(
    /export\s+const\s+listGrids\s*=\s*query\(\{([\s\S]*?)\}\);/,
  );
  assert.ok(listGridsBlock);
  const body = listGridsBlock[1];

  assert.match(body, /Promise\.all/);
});
