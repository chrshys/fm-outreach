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
// generateGrid mutation still does NOT persist bounds on grid record
// ============================================================

const mutationSource = fs.readFileSync("convex/discovery/gridCells.ts", "utf8");
const insertMatch = mutationSource.match(
  /ctx\.db\.insert\("discoveryGrids",\s*\{([\s\S]*?)\}\)/,
);
const insertBody = insertMatch ? insertMatch[1] : "";

test("generateGrid insert does not write swLat to grid record", () => {
  assert.doesNotMatch(insertBody, /\bswLat\b/);
});

test("generateGrid insert does not write neLng to grid record", () => {
  assert.doesNotMatch(insertBody, /\bneLng\b/);
});

// ============================================================
// generateGrid mutation always sets boundsKey on new cells
// ============================================================

test("generateGrid sets boundsKey on every new cell insert", () => {
  // The cell insert in generateGrid must include boundsKey
  const cellInsertMatch = mutationSource.match(
    /ctx\.db\.insert\("discoveryCells",\s*\{([\s\S]*?)\}\)/,
  );
  assert.ok(cellInsertMatch, "discoveryCells insert block must exist");
  assert.match(cellInsertMatch[1], /boundsKey:/);
});

test("subdivideCell sets boundsKey on child cell inserts", () => {
  // Find the subdivide handler section
  const subdivideSection = mutationSource.slice(
    mutationSource.indexOf("export const subdivideCell"),
  );
  const childInsert = subdivideSection.match(
    /ctx\.db\.insert\("discoveryCells",\s*\{([\s\S]*?)\}\)/,
  );
  assert.ok(childInsert, "subdivideCell insert block must exist");
  assert.match(childInsert[1], /boundsKey:/);
});
