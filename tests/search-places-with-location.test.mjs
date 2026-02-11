import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/discovery/placeHelpers.ts", "utf8");

// ============================================================
// searchPlacesWithLocation function contract tests
// ============================================================

test("searchPlacesWithLocation is exported", () => {
  assert.match(source, /export\s+async\s+function\s+searchPlacesWithLocation/);
});

test("accepts query, apiKey, lat, lng, radiusKm parameters", () => {
  assert.match(
    source,
    /searchPlacesWithLocation\(\s*\n?\s*query:\s*string,\s*\n?\s*apiKey:\s*string,\s*\n?\s*lat:\s*number,\s*\n?\s*lng:\s*number,\s*\n?\s*radiusKm:\s*number/,
  );
});

test("returns Promise<PlaceTextResult[]>", () => {
  assert.match(source, /Promise<PlaceTextResult\[\]>/);
});

test("converts radiusKm to meters for the API", () => {
  assert.match(source, /radiusKm\s*\*\s*1000/);
});

test("includes location parameter in API URL", () => {
  assert.match(source, /location=\$\{lat\},\$\{lng\}/);
});

test("includes radius parameter in API URL", () => {
  assert.match(source, /radius=\$\{radiusMeters\}/);
});

test("handles ZERO_RESULTS gracefully", () => {
  assert.match(source, /ZERO_RESULTS/);
});

test("paginates up to 2 additional pages", () => {
  assert.match(source, /pagesLeft\s*=\s*2/);
  assert.match(source, /next_page_token/);
});

test("collects all results across pages", () => {
  assert.match(source, /allResults\.push\(/);
});
