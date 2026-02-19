import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

// ============================================================
// Tests for getGridEnrichmentStats query in convex/discovery/gridCells.ts
// ============================================================

const gridCellsSource = fs.readFileSync(
  "convex/discovery/gridCells.ts",
  "utf8",
);

const fnStart = gridCellsSource.indexOf("export const getGridEnrichmentStats");
const fnBody = gridCellsSource.slice(
  fnStart,
  gridCellsSource.indexOf("export", fnStart + 1),
);

// -- Export & shape tests -------------------------------------

test("getGridEnrichmentStats is exported as a query", () => {
  assert.match(
    gridCellsSource,
    /export\s+const\s+getGridEnrichmentStats\s*=\s*query\(/,
    "Should be an exported query",
  );
});

test("getGridEnrichmentStats accepts gridId arg of type v.id('discoveryGrids')", () => {
  assert.match(
    fnBody,
    /gridId:\s*v\.id\(["']discoveryGrids["']\)/,
    "Should accept gridId as v.id('discoveryGrids')",
  );
});

// -- Index usage: leaf cells ----------------------------------

test("getGridEnrichmentStats fetches leaf cells using by_gridId_isLeaf index", () => {
  assert.match(
    fnBody,
    /withIndex\(["']by_gridId_isLeaf["']/,
    "Should use by_gridId_isLeaf index to get leaf cells",
  );
});

test("getGridEnrichmentStats filters leaf cells by gridId and isLeaf=true", () => {
  assert.match(
    fnBody,
    /eq\(["']gridId["'],\s*args\.gridId\)\.eq\(["']isLeaf["'],\s*true\)/,
    "Should filter by gridId and isLeaf=true",
  );
});

// -- Index usage: leads per cell ------------------------------

test("getGridEnrichmentStats queries leads using by_discoveryCellId index", () => {
  assert.match(
    fnBody,
    /withIndex\(["']by_discoveryCellId["']/,
    "Should use by_discoveryCellId index for leads",
  );
});

test("getGridEnrichmentStats filters leads by cell._id", () => {
  assert.match(
    fnBody,
    /eq\(["']discoveryCellId["'],\s*cell\._id\)/,
    "Should filter leads by discoveryCellId === cell._id",
  );
});

// -- Return shape ---------------------------------------------

test("getGridEnrichmentStats returns totalLeads", () => {
  assert.match(
    fnBody,
    /totalLeads/,
    "Should return totalLeads",
  );
});

test("getGridEnrichmentStats returns locationComplete", () => {
  assert.match(
    fnBody,
    /locationComplete/,
    "Should return locationComplete",
  );
});

test("getGridEnrichmentStats returns hasWebPresence", () => {
  assert.match(
    fnBody,
    /hasWebPresence/,
    "Should return hasWebPresence",
  );
});

test("getGridEnrichmentStats returns directoryReady", () => {
  assert.match(
    fnBody,
    /directoryReady/,
    "Should return directoryReady",
  );
});

// -- Aggregation logic ----------------------------------------

test("getGridEnrichmentStats aggregates totalLeads from leads.length", () => {
  assert.match(
    fnBody,
    /totalLeads\s*\+=\s*leads\.length/,
    "Should aggregate totalLeads += leads.length",
  );
});

// -- Uses shared enrichment helper ----------------------------

test("getGridEnrichmentStats uses evaluateLeadEnrichment for enrichment logic", () => {
  assert.match(
    fnBody,
    /evaluateLeadEnrichment\(lead\)/,
    "Should call evaluateLeadEnrichment(lead) for each lead",
  );
});
