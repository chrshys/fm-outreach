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

test("returns Promise<{ results: PlaceTextResult[]; totalCount: number }>", () => {
  assert.match(source, /Promise<\{\s*results:\s*PlaceTextResult\[\];\s*totalCount:\s*number\s*\}>/);
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

test("handles ZERO_RESULTS gracefully returning empty results and zero totalCount", () => {
  assert.match(source, /ZERO_RESULTS/);
  assert.match(source, /results:\s*\[\],\s*totalCount:\s*0/);
});

test("paginates up to 2 additional pages (60 results max)", () => {
  assert.match(source, /pagesLeft\s*=\s*2/);
});

test("collects all results across pages", () => {
  assert.match(source, /allResults\.push\(/);
});

test("returns totalCount equal to allResults.length", () => {
  assert.match(source, /totalCount:\s*allResults\.length/);
});

// ============================================================
// fetchPageWithRetry — exponential backoff on INVALID_REQUEST
// ============================================================

test("fetchPageWithRetry helper exists as a private function", () => {
  assert.match(source, /async\s+function\s+fetchPageWithRetry\(/);
});

test("fetchPageWithRetry accepts pageToken and apiKey parameters", () => {
  assert.match(source, /fetchPageWithRetry\(\s*\n?\s*pageToken:\s*string,\s*\n?\s*apiKey:\s*string/);
});

test("initial delay before first fetch attempt is 2000ms", () => {
  assert.match(source, /INITIAL_DELAY_MS\s*=\s*2000/);
});

test("retries up to 3 times on INVALID_REQUEST", () => {
  assert.match(source, /MAX_RETRIES\s*=\s*3/);
  assert.match(source, /INVALID_REQUEST/);
});

test("uses exponential backoff: INITIAL_DELAY_MS * Math.pow(2, attempt)", () => {
  assert.match(source, /INITIAL_DELAY_MS\s*\*\s*Math\.pow\(2,\s*attempt\)/);
});

test("returns null when retries exhausted or non-retryable status", () => {
  assert.match(source, /return\s+null/);
});

test("returns results and nextPageToken on successful page fetch", () => {
  assert.match(source, /results:\s*pageData\.results\s*\?\?\s*\[\]/);
  assert.match(source, /nextPageToken:\s*pageData\.next_page_token/);
});

test("searchPlacesWithLocation delegates pagination to fetchPageWithRetry", () => {
  assert.match(source, /fetchPageWithRetry\(nextToken,\s*apiKey\)/);
});

// ============================================================
// discoverCell caller uses new return shape
// ============================================================

test("discoverCell destructures results and totalCount from searchPlacesWithLocation", () => {
  const cellSource = fs.readFileSync("convex/discovery/discoverCell.ts", "utf8");
  assert.match(cellSource, /\{\s*results,\s*totalCount\s*\}\s*=\s*await\s+searchPlacesWithLocation/);
});

test("discoverCell uses in-bounds count for querySaturation count", () => {
  const cellSource = fs.readFileSync("convex/discovery/discoverCell.ts", "utf8");
  assert.match(cellSource, /count:\s*inBoundsForQuery\.length/);
});
