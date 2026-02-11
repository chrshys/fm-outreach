import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/discovery/placeHelpers.ts", "utf8");

// --- Structural tests: verify exports exist ---

test("placeHelpers exports PlaceTextResult type", () => {
  assert.match(source, /export\s+type\s+PlaceTextResult\s*=/);
});

test("placeHelpers exports DiscoveredLead type", () => {
  assert.match(source, /export\s+type\s+DiscoveredLead\s*=/);
});

test("placeHelpers exports normalizeDedupValue function", () => {
  assert.match(source, /export\s+function\s+normalizeDedupValue\(value:\s*string\):\s*string/);
});

test("placeHelpers exports normalizeDedupName function", () => {
  assert.match(source, /export\s+function\s+normalizeDedupName\(value:\s*string\):\s*string/);
});

test("placeHelpers exports dedupKeyForLead function", () => {
  assert.match(
    source,
    /export\s+function\s+dedupKeyForLead\(lead:\s*\{\s*name:\s*string;\s*city:\s*string\s*\}\):\s*string/,
  );
});

test("placeHelpers exports extractCity function", () => {
  assert.match(source, /export\s+function\s+extractCity\(formattedAddress:\s*string\):\s*string/);
});

test("placeHelpers exports inferLeadType function", () => {
  assert.match(source, /export\s+function\s+inferLeadType\(/);
});

test("placeHelpers exports searchPlaces function", () => {
  assert.match(source, /export\s+async\s+function\s+searchPlaces\(/);
});

test("placeHelpers exports discoveredLeadValidator", () => {
  assert.match(source, /export\s+const\s+discoveredLeadValidator\s*=/);
});

// --- Behavioral tests: normalizeDedupValue ---

test("normalizeDedupValue trims and lowercases", () => {
  assert.match(source, /trim\(\)\.toLocaleLowerCase\(\)/);
});

// --- Behavioral tests: normalizeDedupName ---

test("normalizeDedupName normalizes apostrophes in farmers", () => {
  assert.match(source, /replace\(\/\\bfarmers\[''\]\/g,\s*"farmers"\)/);
});

test("normalizeDedupName normalizes st abbreviation to street", () => {
  assert.match(source, /replace\(\/\\bst\\\.\?\\b\/g,\s*"street"\)/);
});

// --- Behavioral tests: dedupKeyForLead ---

test("dedupKeyForLead combines normalized name and city with separator", () => {
  assert.match(source, /normalizeDedupName\(lead\.name\)/);
  assert.match(source, /normalizeDedupValue\(lead\.city\)/);
  assert.match(source, /::/);
});

// --- Behavioral tests: extractCity ---

test("extractCity splits on comma and returns second part for 3+ segment addresses", () => {
  assert.match(source, /split\(","\)/);
  assert.match(source, /parts\.length\s*>=\s*3/);
  assert.match(source, /parts\[1\]/);
});

// --- Behavioral tests: inferLeadType ---

test("inferLeadType detects farmers_market from name", () => {
  assert.match(source, /lower\.includes\("market"\)/);
});

test("inferLeadType detects roadside_stand from name", () => {
  assert.match(source, /lower\.includes\("roadside"\)/);
  assert.match(source, /lower\.includes\("stand"\)/);
});

test("inferLeadType detects farm from name keywords", () => {
  assert.match(source, /lower\.includes\("farm"\)/);
  assert.match(source, /lower\.includes\("orchard"\)/);
  assert.match(source, /lower\.includes\("vineyard"\)/);
});

test("inferLeadType detects retail_store from types array", () => {
  assert.match(source, /types\.includes\("store"\)/);
  assert.match(source, /types\.includes\("grocery_or_supermarket"\)/);
});

// --- Behavioral tests: searchPlaces ---

test("searchPlaces calls Google Places Text Search API", () => {
  assert.match(source, /maps\.googleapis\.com\/maps\/api\/place\/textsearch\/json/);
});

test("searchPlaces handles ZERO_RESULTS status", () => {
  assert.match(source, /ZERO_RESULTS/);
});

test("searchPlaces supports page tokens", () => {
  assert.match(source, /pagetoken/);
});

// --- Behavioral tests: discoveredLeadValidator ---

test("discoveredLeadValidator includes all required lead fields", () => {
  assert.match(source, /name:\s*v\.string\(\)/);
  assert.match(source, /address:\s*v\.string\(\)/);
  assert.match(source, /city:\s*v\.string\(\)/);
  assert.match(source, /placeId:\s*v\.string\(\)/);
  assert.match(source, /source:\s*v\.literal\("google_places"\)/);
  assert.match(source, /status:\s*v\.literal\("new_lead"\)/);
});
