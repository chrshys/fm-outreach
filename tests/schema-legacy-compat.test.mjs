import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const schemaSource = fs.readFileSync("convex/schema.ts", "utf8");

// ============================================================
// discoveryCells: boundsKey is optional for legacy records
// ============================================================

test("discoveryCells boundsKey is optional so legacy records without it validate", () => {
  const cellsBlock = schemaSource.slice(
    schemaSource.indexOf("discoveryCells: defineTable("),
  );
  assert.match(
    cellsBlock,
    /boundsKey:\s*v\.optional\(v\.string\(\)\)/,
    "boundsKey must be v.optional(v.string()) for backward compatibility",
  );
});

// ============================================================
// discoveryGrids: legacy bounds fields are optional
// ============================================================

const gridTableMatch = schemaSource.match(
  /discoveryGrids:\s*defineTable\(\{([\s\S]*?)\}\)/,
);
const gridTableBody = gridTableMatch ? gridTableMatch[1] : "";

test("discoveryGrids swLat is optional for legacy records", () => {
  assert.match(gridTableBody, /swLat:\s*v\.optional\(v\.number\(\)\)/);
});

test("discoveryGrids swLng is optional for legacy records", () => {
  assert.match(gridTableBody, /swLng:\s*v\.optional\(v\.number\(\)\)/);
});

test("discoveryGrids neLat is optional for legacy records", () => {
  assert.match(gridTableBody, /neLat:\s*v\.optional\(v\.number\(\)\)/);
});

test("discoveryGrids neLng is optional for legacy records", () => {
  assert.match(gridTableBody, /neLng:\s*v\.optional\(v\.number\(\)\)/);
});

// ============================================================
// generateGrid mutation has been removed (replaced by virtual grid)
// ============================================================

const mutationSource = fs.readFileSync("convex/discovery/gridCells.ts", "utf8");

test("generateGrid mutation no longer exists", () => {
  assert.doesNotMatch(mutationSource, /export\s+const\s+generateGrid/);
});

// ============================================================
// subdivideCell still sets boundsKey on new cells
// ============================================================

test("subdivideCell sets boundsKey on child cell inserts", () => {
  const subdivideSection = mutationSource.slice(
    mutationSource.indexOf("export const subdivideCell"),
  );
  const childInsert = subdivideSection.match(
    /ctx\.db\.insert\("discoveryCells",\s*\{([\s\S]*?)\}\)/,
  );
  assert.ok(childInsert, "subdivideCell insert block must exist");
  assert.match(childInsert[1], /boundsKey:/);
});
