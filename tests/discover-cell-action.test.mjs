import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/discovery/discoverCell.ts", "utf8");

// ============================================================
// Module structure: exports and imports
// ============================================================

test("discoverCell is an internalAction", () => {
  assert.match(source, /export\s+const\s+discoverCell\s*=\s*internalAction\(/);
});

test("accepts cellId arg of type v.id('discoveryCells')", () => {
  assert.match(source, /cellId:\s*v\.id\("discoveryCells"\)/);
});

test("requires GOOGLE_PLACES_API_KEY", () => {
  assert.match(source, /process\.env\.GOOGLE_PLACES_API_KEY/);
  assert.match(source, /Missing\s+GOOGLE_PLACES_API_KEY/);
});

// ============================================================
// Step 1: Claims cell with expected statuses
// ============================================================

test("calls claimCellForSearch with expectedStatuses [unsearched, searched]", () => {
  assert.match(source, /claimCellForSearch/);
  assert.match(source, /expectedStatuses:\s*\["unsearched",\s*"searched"\]/);
});

test("captures previousStatus from claim result", () => {
  assert.match(source, /previousStatus/);
});

// ============================================================
// Step 2: Fetches cell + grid record via getCell
// ============================================================

test("calls getCell internal query", () => {
  assert.match(source, /getCell/);
  assert.match(source, /cellId:\s*args\.cellId/);
});

test("extracts queries, region, province from grid record", () => {
  assert.match(source, /queries/);
  assert.match(source, /region/);
  assert.match(source, /province/);
});

// ============================================================
// Step 3: try/catch with status reset on failure
// ============================================================

test("wraps search logic in try/catch", () => {
  assert.match(source, /try\s*\{/);
  assert.match(source, /catch\s*\(/);
});

test("resets cell status to previousStatus on failure", () => {
  assert.match(source, /updateCellStatus/);
  assert.match(source, /status:\s*previousStatus/);
});

test("re-throws error after resetting status", () => {
  assert.match(source, /throw\s+error/);
});

// ============================================================
// Step 4: Circumscribed radius computation
// ============================================================

test("imports haversineKm from pointInPolygon lib", () => {
  assert.match(source, /import\s*\{[^}]*haversineKm[^}]*\}\s*from\s*"\.\.\/lib\/pointInPolygon"/);
});

test("computes cell center lat/lng", () => {
  assert.match(source, /centerLat/);
  assert.match(source, /centerLng/);
  assert.match(source, /\(swLat\s*\+\s*neLat\)\s*\/\s*2/);
  assert.match(source, /\(swLng\s*\+\s*neLng\)\s*\/\s*2/);
});

test("computes circumscribed radius using haversineKm from center to corner", () => {
  assert.match(source, /haversineKm\(centerLat,\s*centerLng,\s*neLat,\s*neLng\)/);
});

// ============================================================
// Step 5: Searches for each query with location
// ============================================================

test("imports searchPlacesWithLocation from placeHelpers", () => {
  assert.match(source, /import\s*\{[^}]*searchPlacesWithLocation[^}]*\}\s*from\s*"\.\/placeHelpers"/);
});

test("executes all queries in parallel via Promise.all", () => {
  assert.match(source, /Promise\.all\(/);
  assert.match(source, /queries\.map\(/);
});

test("calls searchPlacesWithLocation with center and radius", () => {
  assert.match(source, /searchPlacesWithLocation\(\s*\n?\s*query/);
  assert.match(source, /centerLat/);
  assert.match(source, /centerLng/);
  assert.match(source, /radiusKm/);
});

test("tracks per-query result counts in querySaturation", () => {
  assert.match(source, /querySaturation\.push\(/);
  assert.match(source, /query,\s*count:\s*totalCount/);
});

// ============================================================
// Step 6: Deduplication by place_id
// ============================================================

test("deduplicates results by place_id", () => {
  assert.match(source, /seenPlaceIds/);
  assert.match(source, /place_id/);
});

// ============================================================
// Step 7: Post-filter to cell bounds
// ============================================================

test("filters results to cell bounds (sw/ne box)", () => {
  assert.match(source, /swLat/);
  assert.match(source, /neLat/);
  assert.match(source, /swLng/);
  assert.match(source, /neLng/);
  assert.match(source, /inBounds/);
});

// ============================================================
// Step 8: Convert to lead objects
// ============================================================

test("imports inferLeadType and extractCity from placeHelpers", () => {
  assert.match(source, /import\s*\{[^}]*inferLeadType[^}]*\}\s*from\s*"\.\/placeHelpers"/);
  assert.match(source, /import\s*\{[^}]*extractCity[^}]*\}\s*from\s*"\.\/placeHelpers"/);
});

test("sets sourceDetail with depth", () => {
  assert.match(source, /Discovery grid cell \[depth=\$\{depth\}\]/);
});

test("sets region and province from grid record", () => {
  assert.match(source, /region,/);
  assert.match(source, /province,/);
});

test("creates leads with google_places source", () => {
  assert.match(source, /source:\s*"google_places"/);
  assert.match(source, /status:\s*"new_lead"/);
  assert.match(source, /followUpCount:\s*0/);
});

// ============================================================
// Step 9: Insert via insertDiscoveredLeads
// ============================================================

test("calls insertDiscoveredLeads mutation", () => {
  assert.match(source, /insertDiscoveredLeads/);
});

// ============================================================
// Step 10: Saturation logic — all queries must hit 60
// ============================================================

test("uses GOOGLE_MAX_RESULTS constant of 60", () => {
  assert.match(source, /GOOGLE_MAX_RESULTS\s*=\s*60/);
});

test("saturated only when every query hits max results", () => {
  assert.match(source, /querySaturation\.every\(/);
  assert.match(source, /GOOGLE_MAX_RESULTS/);
});

// ============================================================
// Step 11: Updates cell via updateCellSearchResult
// ============================================================

test("calls updateCellSearchResult with correct fields", () => {
  assert.match(source, /updateCellSearchResult/);
  assert.match(source, /resultCount:\s*inBounds\.length/);
  assert.match(source, /querySaturation/);
  assert.match(source, /lastSearchedAt/);
  assert.match(source, /newLeadsCount:\s*newLeads/);
});

test("sets status to saturated or searched based on saturation", () => {
  assert.match(source, /saturated\s*\?\s*"saturated"\s*:\s*"searched"/);
});

// ============================================================
// Step 12: Return value
// ============================================================

test("returns totalApiResults, inBoundsResults, newLeads, duplicatesSkipped, saturated, querySaturation", () => {
  assert.match(source, /totalApiResults/);
  assert.match(source, /inBoundsResults/);
  assert.match(source, /newLeads/);
  assert.match(source, /duplicatesSkipped/);
  assert.match(source, /saturated/);
  assert.match(source, /querySaturation/);
});
