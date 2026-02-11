import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/discovery/discoverLeads.ts", "utf8");

test("discoverLeads action exists and requires GOOGLE_PLACES_API_KEY", () => {
  assert.match(source, /export\s+const\s+discoverLeads\s*=\s*action\(/);
  assert.match(source, /process\.env\.GOOGLE_PLACES_API_KEY/);
  assert.match(source, /Missing\s+GOOGLE_PLACES_API_KEY\s+environment\s+variable/);
});

test("action accepts region and optional province args", () => {
  assert.match(source, /region:\s*v\.string\(\)/);
  assert.match(source, /province:\s*v\.optional\(v\.string\(\)\)/);
});

test("action builds search query with region and province", () => {
  assert.match(source, /farms in \$\{args\.region\}/);
  assert.match(source, /args\.province\s*\?\?\s*"Ontario"/);
});

test("action imports searchPlaces from placeHelpers", () => {
  assert.match(source, /import\s*\{[^}]*searchPlaces[^}]*\}\s*from\s*"\.\/placeHelpers"/);
});

test("action supports pagination via searchPlaces with page tokens", () => {
  assert.match(source, /nextPageToken/);
  assert.match(source, /pagesLeft/);
});

test("insertDiscoveredLeads internal mutation exists for deduplication and insertion", () => {
  assert.match(source, /export\s+const\s+insertDiscoveredLeads\s*=\s*internalMutation\(/);
});

test("deduplication uses by_placeId index and in-batch Set", () => {
  assert.match(source, /withIndex\("by_placeId"/);
  assert.match(source, /seenPlaceIds/);
});

test("deduplication uses by_name index with city filter for name+city dedup", () => {
  assert.match(source, /withIndex\("by_name"/);
  assert.match(source, /q\.eq\(q\.field\("city"\),\s*lead\.city\)/);
  assert.match(source, /seenNameCity/);
});

test("deduplication imports normalizeDedupName and normalizeDedupValue from placeHelpers", () => {
  assert.match(source, /import\s*\{[^}]*normalizeDedupName[^}]*\}\s*from\s*"\.\/placeHelpers"/);
  assert.match(source, /import\s*\{[^}]*normalizeDedupValue[^}]*\}\s*from\s*"\.\/placeHelpers"/);
});

test("in-batch dedup uses normalized name+city keys", () => {
  assert.match(source, /normalizeDedupName\(lead\.name\)/);
  assert.match(source, /normalizeDedupValue\(lead\.city\)/);
  assert.match(source, /nameCityKey/);
});

test("placeId check is guarded by truthiness check", () => {
  assert.match(source, /if\s*\(lead\.placeId\)/);
});

test("leads are created with google_places source", () => {
  assert.match(source, /source:\s*"google_places"/);
  assert.match(source, /sourceDetail:/);
  assert.match(source, /Google Places discovery/);
});

test("leads include geographic coordinates from Google Places", () => {
  assert.match(source, /latitude:\s*place\.geometry\?\.location\?\.lat/);
  assert.match(source, /longitude:\s*place\.geometry\?\.location\?\.lng/);
});

test("action returns DiscoverLeadsResult with newLeads and duplicatesSkipped", () => {
  assert.match(source, /export\s+type\s+DiscoverLeadsResult\s*=/);
  assert.match(source, /newLeads:\s*number/);
  assert.match(source, /duplicatesSkipped:\s*number/);
});

test("action imports inferLeadType and extractCity from placeHelpers", () => {
  assert.match(source, /import\s*\{[^}]*inferLeadType[^}]*\}\s*from\s*"\.\/placeHelpers"/);
  assert.match(source, /import\s*\{[^}]*extractCity[^}]*\}\s*from\s*"\.\/placeHelpers"/);
});

test("empty results still go through insertDiscoveredLeads", () => {
  assert.match(source, /insertDiscoveredLeads/);
});

test("new leads are created with status new_lead and followUpCount 0", () => {
  assert.match(source, /status:\s*"new_lead"/);
  assert.match(source, /followUpCount:\s*0/);
});

test("no full table scan - does not use .collect() on leads table", () => {
  // Ensure we're not doing ctx.db.query("leads").collect()
  assert.doesNotMatch(source, /\.query\("leads"\)\.collect\(\)/);
});
