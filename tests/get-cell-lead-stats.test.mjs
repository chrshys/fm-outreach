import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

// ============================================================
// Tests for getCellLeadStats query in convex/discovery/gridCells.ts
// ============================================================

const gridCellsSource = fs.readFileSync(
  "convex/discovery/gridCells.ts",
  "utf8",
);

const fnBody = gridCellsSource.slice(
  gridCellsSource.indexOf("getCellLeadStats"),
);

// -- Export & shape tests -------------------------------------

test("getCellLeadStats is exported as a query", () => {
  assert.match(
    gridCellsSource,
    /export\s+const\s+getCellLeadStats\s*=\s*query\(/,
    "Should be an exported query",
  );
});

test("getCellLeadStats accepts cellId arg of type v.id('discoveryCells')", () => {
  assert.match(
    fnBody,
    /cellId:\s*v\.id\(["']discoveryCells["']\)/,
    "Should accept cellId as v.id('discoveryCells')",
  );
});

// -- Index usage ----------------------------------------------

test("getCellLeadStats queries leads using by_discoveryCellId index", () => {
  assert.match(
    fnBody,
    /withIndex\(["']by_discoveryCellId["']/,
    "Should use by_discoveryCellId index",
  );
});

test("getCellLeadStats filters index by args.cellId", () => {
  assert.match(
    fnBody,
    /eq\(["']discoveryCellId["'],\s*args\.cellId\)/,
    "Should filter by discoveryCellId === args.cellId",
  );
});

// -- Return shape ---------------------------------------------

test("getCellLeadStats returns total count", () => {
  assert.match(
    fnBody,
    /total:\s*leads\.length/,
    "Should return total as leads.length",
  );
});

test("getCellLeadStats returns locationComplete count", () => {
  assert.match(
    fnBody,
    /locationComplete/,
    "Should return locationComplete",
  );
});

test("getCellLeadStats returns hasWebPresence count", () => {
  assert.match(
    fnBody,
    /hasWebPresence/,
    "Should return hasWebPresence",
  );
});

test("getCellLeadStats returns directoryReady count", () => {
  assert.match(
    fnBody,
    /directoryReady/,
    "Should return directoryReady",
  );
});

test("getCellLeadStats returns exported count", () => {
  assert.match(
    fnBody,
    /exported/,
    "Should return exported",
  );
});

// -- Uses shared enrichment helper ----------------------------

test("getCellLeadStats uses evaluateLeadEnrichment for enrichment logic", () => {
  assert.match(
    fnBody,
    /evaluateLeadEnrichment\(lead\)/,
    "Should call evaluateLeadEnrichment(lead) for each lead",
  );
});
