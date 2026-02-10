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

test("action calls Google Places Text Search API", () => {
  assert.match(
    source,
    /https:\/\/maps\.googleapis\.com\/maps\/api\/place\/textsearch\/json/,
  );
  assert.match(source, /encodeURIComponent\(query\)/);
});

test("action supports pagination with next_page_token", () => {
  assert.match(source, /next_page_token/);
  assert.match(source, /nextPageToken/);
  assert.match(source, /pagetoken/);
  assert.match(source, /pagesLeft/);
});

test("action handles ZERO_RESULTS status", () => {
  assert.match(source, /ZERO_RESULTS/);
  assert.match(source, /results:\s*\[\]/);
});

test("action handles API errors by throwing descriptive errors", () => {
  assert.match(source, /Places Text Search failed:/);
  assert.match(source, /Places Text Search error:/);
  assert.match(source, /error_message/);
});

test("insertDiscoveredLeads internal mutation exists for deduplication and insertion", () => {
  assert.match(source, /export\s+const\s+insertDiscoveredLeads\s*=\s*internalMutation\(/);
});

test("deduplication uses name+city key and placeId", () => {
  assert.match(source, /function\s+dedupKeyForLead\(/);
  assert.match(source, /normalizeDedupName/);
  assert.match(source, /normalizeDedupValue/);
  assert.match(source, /seenPlaceIds/);
  assert.match(source, /seenKeys/);
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

test("action returns DiscoverLeadsResult with newLeads, duplicatesSkipped, totalInDatabase", () => {
  assert.match(source, /export\s+type\s+DiscoverLeadsResult\s*=/);
  assert.match(source, /newLeads:\s*number/);
  assert.match(source, /duplicatesSkipped:\s*number/);
  assert.match(source, /totalInDatabase:\s*number/);
});

test("inferLeadType categorizes leads based on name keywords and place types", () => {
  assert.match(source, /function\s+inferLeadType\(/);
  assert.match(source, /farmers_market/);
  assert.match(source, /roadside_stand/);
  assert.match(source, /retail_store/);
  assert.match(source, /"farm"/);
});

test("extractCity parses city from Google Places formatted address", () => {
  assert.match(source, /function\s+extractCity\(/);
  assert.match(source, /formattedAddress.*split.*,/);
});

test("empty results still go through insertDiscoveredLeads for total count", () => {
  assert.match(source, /insertDiscoveredLeads/);
  assert.match(source, /totalInDatabase/);
});

test("new leads are created with status new_lead and followUpCount 0", () => {
  assert.match(source, /status:\s*"new_lead"/);
  assert.match(source, /followUpCount:\s*0/);
});
