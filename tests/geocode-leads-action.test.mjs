import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/seeds/geocodeLeads.ts", "utf8");

test("geocodeLeads action exists and requires GOOGLE_MAPS_API_KEY", () => {
  assert.match(source, /export\s+const\s+geocodeLeads\s*=\s*action\(/);
  assert.match(source, /const\s+googleMapsApiKey\s*=\s*process\.env\.GOOGLE_MAPS_API_KEY/);
  assert.match(source, /Missing\s+GOOGLE_MAPS_API_KEY\s+environment\s+variable/);
});

test("geocode action gets leads missing latitude or longitude and tracks already geocoded count", () => {
  assert.match(source, /export\s+const\s+getLeadsForGeocoding\s*=\s*internalQuery\(/);
  assert.match(source, /query\("leads"\)\.collect\(\)/);
  assert.match(
    source,
    /missingCoordinates\s*=\s*leads\.filter\(\s*\(lead\)\s*=>\s*lead\.latitude\s*===\s*undefined\s*\|\|\s*lead\.longitude\s*===\s*undefined,\s*\)/s,
  );
  assert.match(source, /alreadyHadCoordsCount\s*=\s*leads\.length\s*-\s*missingCoordinates\.length/);
});

test("geocode action batches work and waits 200ms between batches", () => {
  assert.match(source, /const\s+BATCH_SIZE\s*=\s*10/);
  assert.match(source, /const\s+BATCH_DELAY_MS\s*=\s*200/);
  assert.match(source, /for\s*\(let\s+index\s*=\s*0;\s*index\s*<\s*missingCoordinates\.length;\s*index\s*\+=\s*BATCH_SIZE\)/);
  assert.match(source, /missingCoordinates\.slice\(index,\s*index\s*\+\s*BATCH_SIZE\)/);
  assert.match(source, /if\s*\(index\s*\+\s*BATCH_SIZE\s*<\s*missingCoordinates\.length\)\s*\{\s*await\s+sleep\(BATCH_DELAY_MS\)/s);
});

test("geocode action calls Google Geocoding API and patches coordinates", () => {
  assert.match(source, /encodeURIComponent\(/);
  assert.match(source, /https:\/\/maps\.googleapis\.com\/maps\/api\/geocode\/json/);
  assert.match(source, /\?address=\$\{encodedAddress\}&key=\$\{googleMapsApiKey\}/);
  assert.match(source, /await\s+ctx\.runMutation\(/);
  assert.match(source, /patchLeadCoordinates/);
  assert.match(source, /latitude:\s*location\.lat/);
  assert.match(source, /longitude:\s*location\.lng/);
});

test("geocode action retries with city+province fallback when full address fails", () => {
  assert.match(source, /function\s+buildFallbackAddress\s*\(\s*city:\s*string,\s*province:\s*string\s*\)/);
  assert.match(source, /const\s+fullAddress\s*=\s*buildAddress\(lead\.address,\s*lead\.city,\s*lead\.province\)/);
  assert.match(source, /const\s+fallbackAddress\s*=\s*buildFallbackAddress\(lead\.city,\s*lead\.province\)/);
  assert.match(source, /fetchCoordinatesForAddress\(fullAddress,\s*googleMapsApiKey\)\)\s*\?\?/);
  assert.match(source, /fetchCoordinatesForAddress\(fallbackAddress,\s*googleMapsApiKey\)/);
});

test("geocode action logs and returns geocoded, failed, and already-had-coords counts", () => {
  assert.match(source, /console\.log\("Batch geocode complete",\s*\{[\s\S]*geocodedCount,[\s\S]*failedCount,[\s\S]*alreadyHadCoordsCount,[\s\S]*\}\)/);
  assert.match(source, /return\s*\{[\s\S]*geocodedCount,[\s\S]*failedCount,[\s\S]*alreadyHadCoordsCount,[\s\S]*\}/);
});
