import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/discovery/gridCells.ts", "utf8");

// ============================================================
// 1. Module structure
// ============================================================

test("updateGridQueries is exported as a public mutation", () => {
  assert.match(source, /export\s+const\s+updateGridQueries\s*=\s*mutation\(/);
});

// ============================================================
// 2. Args validation
// ============================================================

test("updateGridQueries accepts gridId as v.id('discoveryGrids')", () => {
  const block = source.match(
    /export\s+const\s+updateGridQueries\s*=\s*mutation\(\{([\s\S]*?)\}\);/,
  );
  assert.ok(block, "updateGridQueries block not found");
  const body = block[1];

  assert.match(body, /gridId:\s*v\.id\("discoveryGrids"\)/);
});

test("updateGridQueries accepts queries as v.array(v.string())", () => {
  const block = source.match(
    /export\s+const\s+updateGridQueries\s*=\s*mutation\(\{([\s\S]*?)\}\);/,
  );
  assert.ok(block);
  const body = block[1];

  assert.match(body, /queries:\s*v\.array\(v\.string\(\)\)/);
});

// ============================================================
// 3. Grid existence check
// ============================================================

test("updateGridQueries fetches the grid record with ctx.db.get", () => {
  const block = source.match(
    /export\s+const\s+updateGridQueries\s*=\s*mutation\(\{([\s\S]*?)\}\);/,
  );
  assert.ok(block);
  const body = block[1];

  assert.match(body, /ctx\.db\.get\(args\.gridId\)/);
});

test("updateGridQueries throws ConvexError when grid not found", () => {
  const block = source.match(
    /export\s+const\s+updateGridQueries\s*=\s*mutation\(\{([\s\S]*?)\}\);/,
  );
  assert.ok(block);
  const body = block[1];

  assert.match(body, /throw\s+new\s+ConvexError\(/);
  assert.match(body, /Grid not found/);
});

// ============================================================
// 4. Patch operation
// ============================================================

test("updateGridQueries patches the grid with new queries array", () => {
  assert.match(
    source,
    /export\s+const\s+updateGridQueries[\s\S]*?ctx\.db\.patch\(args\.gridId,\s*\{\s*queries:\s*args\.queries\s*\}\)/,
  );
});

// ============================================================
// 5. Only patches queries (no extra fields)
// ============================================================

test("updateGridQueries patch object only contains queries field", () => {
  // Find the patch call in the updateGridQueries function
  const patchMatch = source.match(
    /export\s+const\s+updateGridQueries[\s\S]*?ctx\.db\.patch\([^,]+,\s*(\{[^}]+\})\)/,
  );
  assert.ok(patchMatch, "patch call should exist in updateGridQueries");
  const patchObj = patchMatch[1];

  // Should contain queries and nothing else
  assert.match(patchObj, /queries/);
  const fieldCount = patchObj.match(/\w+:/g);
  assert.equal(fieldCount.length, 1, "patch object should only have one field");
});
