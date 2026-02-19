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

// -- locationComplete logic -----------------------------------

test("locationComplete checks address", () => {
  assert.match(fnBody, /lead\.address/, "Should check lead.address");
});

test("locationComplete checks city", () => {
  assert.match(fnBody, /lead\.city/, "Should check lead.city");
});

test("locationComplete checks province OR region", () => {
  assert.match(
    fnBody,
    /lead\.province\s*\|\|\s*lead\.region/,
    "Should check lead.province || lead.region",
  );
});

test("locationComplete checks postalCode", () => {
  assert.match(fnBody, /lead\.postalCode/, "Should check lead.postalCode");
});

test("locationComplete checks countryCode", () => {
  assert.match(fnBody, /lead\.countryCode/, "Should check lead.countryCode");
});

test("locationComplete checks latitude", () => {
  assert.match(fnBody, /lead\.latitude/, "Should check lead.latitude");
});

test("locationComplete checks longitude", () => {
  assert.match(fnBody, /lead\.longitude/, "Should check lead.longitude");
});

// -- hasWebPresence logic -------------------------------------

test("hasWebPresence checks website", () => {
  assert.match(fnBody, /lead\.website/, "Should check lead.website");
});

test("hasWebPresence checks socialLinks.instagram", () => {
  assert.match(
    fnBody,
    /lead\.socialLinks\?\.instagram/,
    "Should check lead.socialLinks?.instagram",
  );
});

test("hasWebPresence checks socialLinks.facebook", () => {
  assert.match(
    fnBody,
    /lead\.socialLinks\?\.facebook/,
    "Should check lead.socialLinks?.facebook",
  );
});

// -- directoryReady logic -------------------------------------

test("directoryReady requires both locationComplete AND hasWebPresence", () => {
  assert.match(
    fnBody,
    /isLocationComplete\s*&&\s*isWebPresence/,
    "Should require both isLocationComplete && isWebPresence for directoryReady",
  );
});
