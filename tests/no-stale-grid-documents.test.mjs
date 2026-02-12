import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const gridCellsSource = fs.readFileSync(
  "convex/discovery/gridCells.ts",
  "utf8",
);
const schemaSource = fs.readFileSync("convex/schema.ts", "utf8");

// --- purgeDiscoveryGrids completeness ---

test("purgeDiscoveryGrids deletes all cells and all grids (no documents left)", () => {
  const fnStart = gridCellsSource.indexOf(
    "export const purgeDiscoveryGrids = mutation({",
  );
  assert.ok(fnStart !== -1, "purgeDiscoveryGrids must exist");
  const fnBlock = gridCellsSource.slice(fnStart);

  // Queries both tables
  assert.match(fnBlock, /ctx\.db\.query\("discoveryCells"\)\.collect\(\)/);
  assert.match(fnBlock, /ctx\.db\.query\("discoveryGrids"\)\.collect\(\)/);

  // Deletes from both tables
  assert.match(fnBlock, /ctx\.db\.delete\(cell\._id\)/);
  assert.match(fnBlock, /ctx\.db\.delete\(grid\._id\)/);
});

test("purgeDiscoveryCells deletes every cell document", () => {
  const fnStart = gridCellsSource.indexOf(
    "export const purgeDiscoveryCells = mutation({",
  );
  const fnEnd = gridCellsSource.indexOf(
    "export const purgeDiscoveryGrids",
    fnStart,
  );
  const fnBlock = gridCellsSource.slice(fnStart, fnEnd);

  // Collects all cells and iterates with delete
  assert.match(fnBlock, /ctx\.db\.query\("discoveryCells"\)\.collect\(\)/);
  assert.match(fnBlock, /for\s*\(\s*const cell of cells\)/);
  assert.match(fnBlock, /ctx\.db\.delete\(cell\._id\)/);
});

// --- getOrCreateGlobalGrid creates clean grids ---

test("getOrCreateGlobalGrid does not set legacy bounds fields (swLat, swLng, neLat, neLng)", () => {
  const fnStart = gridCellsSource.indexOf(
    "export const getOrCreateGlobalGrid = mutation({",
  );
  assert.ok(fnStart !== -1, "getOrCreateGlobalGrid must exist");

  // Extract just the insert call within this function
  const fnEnd = gridCellsSource.indexOf(
    "export const purgeDiscoveryCells",
    fnStart,
  );
  const fnBlock = gridCellsSource.slice(fnStart, fnEnd);

  // The insert call should NOT include legacy bounds fields
  assert.ok(
    !fnBlock.includes("swLat:"),
    "getOrCreateGlobalGrid must not set swLat (legacy bounds field)",
  );
  assert.ok(
    !fnBlock.includes("swLng:"),
    "getOrCreateGlobalGrid must not set swLng (legacy bounds field)",
  );
  assert.ok(
    !fnBlock.includes("neLat:"),
    "getOrCreateGlobalGrid must not set neLat (legacy bounds field)",
  );
  assert.ok(
    !fnBlock.includes("neLng:"),
    "getOrCreateGlobalGrid must not set neLng (legacy bounds field)",
  );
});

// --- activateCell always sets boundsKey ---

test("activateCell requires boundsKey argument", () => {
  const fnStart = gridCellsSource.indexOf(
    "export const activateCell = mutation({",
  );
  assert.ok(fnStart !== -1, "activateCell must exist");

  const fnEnd = gridCellsSource.indexOf(
    "export const getOrCreateGlobalGrid",
    fnStart,
  );
  const fnBlock = gridCellsSource.slice(fnStart, fnEnd);

  // boundsKey is a required arg (v.string(), not v.optional)
  assert.match(
    fnBlock,
    /boundsKey:\s*v\.string\(\)/,
    "boundsKey must be a required string argument",
  );
});

test("activateCell stores boundsKey on every new cell", () => {
  const fnStart = gridCellsSource.indexOf(
    "export const activateCell = mutation({",
  );
  const fnEnd = gridCellsSource.indexOf(
    "export const getOrCreateGlobalGrid",
    fnStart,
  );
  const fnBlock = gridCellsSource.slice(fnStart, fnEnd);

  // The db.insert call must include boundsKey
  const insertStart = fnBlock.indexOf("ctx.db.insert(");
  assert.ok(insertStart !== -1, "activateCell must insert a cell");
  const insertBlock = fnBlock.slice(insertStart, insertStart + 300);
  assert.ok(
    insertBlock.includes("boundsKey"),
    "activateCell insert must include boundsKey field",
  );
});

// --- Schema marks legacy fields as optional ---

test("schema marks grid bounds fields as optional (legacy-only)", () => {
  const gridSchemaStart = schemaSource.indexOf("discoveryGrids: defineTable(");
  assert.ok(gridSchemaStart !== -1, "discoveryGrids schema must exist");

  const nextTable = schemaSource.indexOf("discoveryCells: defineTable(");
  const gridSchema = schemaSource.slice(gridSchemaStart, nextTable);

  // All four legacy bounds fields must be v.optional
  for (const field of ["swLat", "swLng", "neLat", "neLng"]) {
    const fieldIdx = gridSchema.indexOf(`${field}:`);
    assert.ok(fieldIdx !== -1, `schema must define ${field}`);
    const lineEnd = gridSchema.indexOf("\n", fieldIdx);
    const line = gridSchema.slice(fieldIdx, lineEnd);
    assert.match(
      line,
      /v\.optional/,
      `${field} must be v.optional (legacy field)`,
    );
  }
});

test("schema comment documents legacy bounds fields", () => {
  const gridSchemaStart = schemaSource.indexOf("discoveryGrids: defineTable(");
  const nextTable = schemaSource.indexOf("discoveryCells: defineTable(");
  const gridSchema = schemaSource.slice(gridSchemaStart, nextTable);

  assert.ok(
    gridSchema.toLowerCase().includes("legacy"),
    "schema should document that bounds fields are legacy",
  );
});

// --- No stale creation paths ---

test("subdivideCell always sets boundsKey on child cells", () => {
  const fnStart = gridCellsSource.indexOf(
    "export const subdivideCell = mutation({",
  );
  assert.ok(fnStart !== -1, "subdivideCell must exist");

  const fnEnd = gridCellsSource.indexOf(
    "export const undivideCell",
    fnStart,
  );
  const fnBlock = gridCellsSource.slice(fnStart, fnEnd);

  // Find the insert call for child cells
  const insertIdx = fnBlock.indexOf('ctx.db.insert("discoveryCells"');
  assert.ok(insertIdx !== -1, "subdivideCell must insert child cells");

  const insertBlock = fnBlock.slice(insertIdx, insertIdx + 400);
  assert.ok(
    insertBlock.includes("boundsKey"),
    "subdivideCell must set boundsKey on child cells",
  );
});
