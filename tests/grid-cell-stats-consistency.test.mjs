import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

// ============================================================
// Tests that grid-level totals match sum of individual cell stats.
//
// Both cell and grid stats queries must use the same shared
// evaluateLeadEnrichment helper so their enrichment logic
// can never diverge.
// ============================================================

const gridCellsSource = fs.readFileSync(
  "convex/discovery/gridCells.ts",
  "utf8",
);

// Precise anchors for function body extraction
const helperStart = gridCellsSource.indexOf("export function evaluateLeadEnrichment");
const cellStart = gridCellsSource.indexOf("export const getCellLeadStats");
const gridStart = gridCellsSource.indexOf("export const getGridEnrichmentStats");
const afterGridStart = gridCellsSource.indexOf("export", gridStart + 1);

const helperBody = gridCellsSource.slice(helperStart, cellStart);
const cellFnBody = gridCellsSource.slice(cellStart, gridStart);
const gridFnBody = gridCellsSource.slice(gridStart, afterGridStart);

// -- Shared helper exists and is exported ---------------------

test("evaluateLeadEnrichment is exported from gridCells.ts", () => {
  assert.match(
    gridCellsSource,
    /export\s+function\s+evaluateLeadEnrichment/,
    "evaluateLeadEnrichment should be an exported function",
  );
});

// -- Both queries call the shared helper ----------------------

test("getCellLeadStats calls evaluateLeadEnrichment", () => {
  assert.match(
    cellFnBody,
    /evaluateLeadEnrichment\(lead\)/,
    "getCellLeadStats must call evaluateLeadEnrichment(lead)",
  );
});

test("getGridEnrichmentStats calls evaluateLeadEnrichment", () => {
  assert.match(
    gridFnBody,
    /evaluateLeadEnrichment\(lead\)/,
    "getGridEnrichmentStats must call evaluateLeadEnrichment(lead)",
  );
});

// -- Neither query has inline enrichment logic ----------------
// If either query defines its own isLocationComplete/isWebPresence,
// the shared helper is being bypassed and totals could diverge.

test("getCellLeadStats does not define inline isLocationComplete", () => {
  assert.doesNotMatch(
    cellFnBody,
    /const isLocationComplete\s*=/,
    "getCellLeadStats must not define its own isLocationComplete",
  );
});

test("getGridEnrichmentStats does not define inline isLocationComplete", () => {
  assert.doesNotMatch(
    gridFnBody,
    /const isLocationComplete\s*=/,
    "getGridEnrichmentStats must not define its own isLocationComplete",
  );
});

// -- Shared helper has correct enrichment logic ---------------

test("evaluateLeadEnrichment checks all 7 location fields", () => {
  const locationExpr = helperBody.match(
    /const isLocationComplete\s*=\s*!!\(\s*([\s\S]*?)\);/,
  );
  assert.ok(locationExpr, "Should define isLocationComplete with !!");
  const body = locationExpr[1];

  for (const field of [
    "lead.address",
    "lead.city",
    "lead.postalCode",
    "lead.countryCode",
    "lead.latitude",
    "lead.longitude",
  ]) {
    assert.ok(body.includes(field), `Must check ${field}`);
  }
  assert.match(body, /lead\.province\s*\|\|\s*lead\.region/);
});

test("evaluateLeadEnrichment checks website and social links for web presence", () => {
  const webExpr = helperBody.match(
    /const isWebPresence\s*=\s*!!\(\s*([\s\S]*?)\);/,
  );
  assert.ok(webExpr, "Should define isWebPresence with !!");
  const body = webExpr[1];

  assert.ok(body.includes("lead.website"), "Must check lead.website");
  assert.ok(body.includes("lead.socialLinks?.instagram"), "Must check instagram");
  assert.ok(body.includes("lead.socialLinks?.facebook"), "Must check facebook");
});

test("evaluateLeadEnrichment requires both conditions for directoryReady", () => {
  assert.match(
    helperBody,
    /isLocationComplete\s*&&\s*isWebPresence/,
    "isDirectoryReady must require both isLocationComplete && isWebPresence",
  );
});

// -- Return shapes are compatible -----------------------------
// getCellLeadStats returns { total, locationComplete, hasWebPresence, directoryReady }
// getGridEnrichmentStats returns { totalLeads, locationComplete, hasWebPresence, directoryReady }
// The enrichment fields (locationComplete, hasWebPresence, directoryReady) must match.

test("both queries return the same enrichment fields", () => {
  for (const field of ["locationComplete", "hasWebPresence", "directoryReady"]) {
    assert.match(cellFnBody, new RegExp(field), `getCellLeadStats must return ${field}`);
    assert.match(gridFnBody, new RegExp(field), `getGridEnrichmentStats must return ${field}`);
  }
});

// -- Grid query iterates all leaf cells -----------------------

test("getGridEnrichmentStats iterates leaf cells and their leads", () => {
  // Must loop over cells
  assert.match(gridFnBody, /for\s*\(\s*const\s+cell\s+of\s+leafCells\s*\)/);
  // Must loop over leads within each cell
  assert.match(gridFnBody, /for\s*\(\s*const\s+lead\s+of\s+leads\s*\)/);
  // Must sum totalLeads
  assert.match(gridFnBody, /totalLeads\s*\+=\s*leads\.length/);
});
