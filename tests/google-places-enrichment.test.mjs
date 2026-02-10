import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/enrichment/googlePlaces.ts", "utf8");

test("enrichFromGooglePlaces action exists and requires GOOGLE_PLACES_API_KEY", () => {
  assert.match(source, /export\s+const\s+enrichFromGooglePlaces\s*=\s*action\(/);
  assert.match(source, /const\s+apiKey\s*=\s*process\.env\.GOOGLE_PLACES_API_KEY/);
  assert.match(source, /Missing\s+GOOGLE_PLACES_API_KEY\s+environment\s+variable/);
});

test("action accepts name, city, and optional address args", () => {
  assert.match(source, /name:\s*v\.string\(\)/);
  assert.match(source, /city:\s*v\.string\(\)/);
  assert.match(source, /address:\s*v\.optional\(v\.string\(\)\)/);
});

test("action calls Google Places Text Search API", () => {
  assert.match(
    source,
    /https:\/\/maps\.googleapis\.com\/maps\/api\/place\/textsearch\/json/,
  );
  assert.match(source, /encodeURIComponent\(/);
  assert.match(source, /\?query=\$\{encodedQuery\}&key=\$\{apiKey\}/);
});

test("action calls Google Place Details API with required fields", () => {
  assert.match(
    source,
    /https:\/\/maps\.googleapis\.com\/maps\/api\/place\/details\/json/,
  );
  assert.match(source, /place_id=\$\{placeId\}/);
  assert.match(source, /fields=/);
  assert.match(source, /formatted_phone_number/);
  assert.match(source, /website/);
  assert.match(source, /opening_hours/);
  assert.match(source, /rating/);
  assert.match(source, /formatted_address/);
});

test("action returns structured result with placeId, phone, website, hours, rating, formattedAddress", () => {
  assert.match(source, /placeId:/);
  assert.match(source, /phone:/);
  assert.match(source, /website:/);
  assert.match(source, /hours:/);
  assert.match(source, /rating:/);
  assert.match(source, /formattedAddress:/);
});

test("action exports GooglePlacesResult type with correct fields", () => {
  assert.match(source, /export\s+type\s+GooglePlacesResult\s*=/);
  assert.match(source, /placeId:\s*string/);
  assert.match(source, /phone:\s*string\s*\|\s*null/);
  assert.match(source, /website:\s*string\s*\|\s*null/);
  assert.match(source, /hours:\s*string\[\]\s*\|\s*null/);
  assert.match(source, /rating:\s*number\s*\|\s*null/);
  assert.match(source, /formattedAddress:\s*string\s*\|\s*null/);
});

test("action handles not-found (ZERO_RESULTS) by returning null", () => {
  assert.match(source, /ZERO_RESULTS/);
  assert.match(source, /return\s+null/);
});

test("action picks best match by name similarity when multiple results", () => {
  assert.match(source, /function\s+nameSimilarity\(/);
  assert.match(source, /function\s+pickBestMatch\(/);
  assert.match(source, /candidates\.length\s*===\s*1/);
});

test("nameSimilarity normalizes strings for comparison", () => {
  assert.match(source, /function\s+normalizeForComparison\(/);
  assert.match(source, /toLowerCase\(\)/);
  assert.match(source, /replace\(/);
});

test("action handles API errors by throwing descriptive errors", () => {
  assert.match(source, /Places Text Search failed:/);
  assert.match(source, /Places Text Search error:/);
  assert.match(source, /Place Details failed:/);
  assert.match(source, /Place Details error:/);
  assert.match(source, /response\.status/);
  assert.match(source, /error_message/);
});

test("action builds search query from name, city, and optional address", () => {
  assert.match(source, /args\.address/);
  assert.match(source, /args\.name/);
  assert.match(source, /args\.city/);
});
