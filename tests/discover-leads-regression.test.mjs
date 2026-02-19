import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

// ---------- Source files under test ----------
const actionSource = fs.readFileSync(
  "convex/discovery/discoverLeads.ts",
  "utf8",
);
const helperSource = fs.readFileSync(
  "convex/discovery/placeHelpers.ts",
  "utf8",
);
const schemaSource = fs.readFileSync("convex/schema.ts", "utf8");

// ---------- Dynamic import of pure helpers for behavioral tests ----------
// We compile the helpers at import time so we can run real assertions, not just
// regex matches.

// Dynamically import helpers (ESM-compatible)
const helpers = await import("../convex/discovery/placeHelpers.ts");
const {
  extractCity,
  inferLeadType,
  normalizeDedupName,
  normalizeDedupValue,
  dedupKeyForLead,
} = helpers;

// ============================================================
// 1. discoverLeads action contract — regression guards
// ============================================================

test("discoverLeads action is a public action, not internalAction", () => {
  // Must remain a public action so the CLI script can call it
  assert.match(actionSource, /export\s+const\s+discoverLeads\s*=\s*action\(/);
  assert.doesNotMatch(
    actionSource,
    /export\s+const\s+discoverLeads\s*=\s*internalAction\(/,
  );
});

test("discoverLeads returns DiscoverLeadsResult with exactly newLeads and duplicatesSkipped", () => {
  assert.match(actionSource, /newLeads:\s*result\.inserted/);
  assert.match(actionSource, /duplicatesSkipped:\s*result\.skipped/);
});

test("discoverLeads maps leads with all required DiscoveredLead fields", () => {
  // These fields must appear in the mapping closure to guarantee lead shape
  const requiredFields = [
    "name:",
    "type:",
    "address:",
    "city:",
    "region:",
    "province:",
    "placeId:",
    "latitude:",
    "longitude:",
    "source:",
    "sourceDetail:",
    "status:",
    "followUpCount:",
    "createdAt:",
    "updatedAt:",
  ];
  for (const field of requiredFields) {
    assert.ok(
      actionSource.includes(field),
      `discoverLeads mapping must include field "${field}"`,
    );
  }
});

test("discoverLeads calls insertDiscoveredLeads via internal mutation ref", () => {
  assert.match(
    actionSource,
    /internal\.discovery\.discoverLeads\.insertDiscoveredLeads/,
  );
  assert.match(actionSource, /ctx\.runMutation\(insertRef/);
});

// ============================================================
// 2. insertDiscoveredLeads dedup contract
// ============================================================

test("insertDiscoveredLeads is an internalMutation, not public", () => {
  assert.match(
    actionSource,
    /export\s+const\s+insertDiscoveredLeads\s*=\s*internalMutation\(/,
  );
});

test("insertDiscoveredLeads uses index-based dedup, NOT full table scan", () => {
  // Must NOT do ctx.db.query("leads").collect()
  assert.doesNotMatch(actionSource, /\.query\("leads"\)\.collect\(\)/);
  // Must use indexes
  assert.match(actionSource, /withIndex\("by_placeId"/);
  assert.match(actionSource, /withIndex\("by_name"/);
});

test("insertDiscoveredLeads tracks both placeId and name+city for in-batch dedup", () => {
  assert.match(actionSource, /seenPlaceIds/);
  assert.match(actionSource, /seenNameCity/);
});

test("insertDiscoveredLeads returns { inserted, skipped, linked } shape", () => {
  assert.match(actionSource, /return\s*\{\s*inserted,\s*skipped,\s*linked\s*\}/);
});

// ============================================================
// 3. Schema guards — required indexes must exist
// ============================================================

test("leads table has by_placeId index for dedup lookups", () => {
  assert.match(schemaSource, /by_placeId/);
});

test("leads table has by_name index for name+city dedup fallback", () => {
  assert.match(schemaSource, /by_name/);
});

test("leads table placeId field is optional (supports leads without placeId)", () => {
  assert.match(schemaSource, /placeId:\s*v\.optional\(v\.string\(\)\)/);
});

// ============================================================
// 4. Helper function behavioral regression tests
// ============================================================

// --- extractCity ---

test("extractCity returns city from standard Ontario formatted address", () => {
  assert.equal(
    extractCity("123 Main St, Niagara-on-the-Lake, ON L0S 1J0, Canada"),
    "Niagara-on-the-Lake",
  );
});

test("extractCity returns city from short address (2 parts)", () => {
  assert.equal(extractCity("Niagara-on-the-Lake, ON"), "Niagara-on-the-Lake");
});

test("extractCity returns raw string when no commas", () => {
  assert.equal(extractCity("Niagara"), "Niagara");
});

test("extractCity handles extra whitespace around commas", () => {
  assert.equal(
    extractCity("123 Main St ,  Toronto ,  ON , Canada"),
    "Toronto",
  );
});

// --- inferLeadType ---

test("inferLeadType detects farmers_market from name", () => {
  assert.equal(inferLeadType("Sunday Farmers Market", []), "farmers_market");
  assert.equal(inferLeadType("The Market Place", []), "farmers_market");
});

test("inferLeadType detects roadside_stand from name", () => {
  assert.equal(inferLeadType("Bill's Roadside Stand", []), "roadside_stand");
  assert.equal(inferLeadType("Apple Stand", []), "roadside_stand");
});

test("inferLeadType detects farm variants from name", () => {
  assert.equal(inferLeadType("Green Acres Farm", []), "farm");
  assert.equal(inferLeadType("Pine Ridge Orchard", []), "farm");
  assert.equal(inferLeadType("Valley Vineyard", []), "farm");
  assert.equal(inferLeadType("Smith Ranch", []), "farm");
  assert.equal(inferLeadType("Happy Acres", []), "farm");
});

test("inferLeadType detects retail_store from Google types", () => {
  assert.equal(
    inferLeadType("Fresh Groceries", ["store", "food"]),
    "retail_store",
  );
  assert.equal(
    inferLeadType("Food Mart", ["grocery_or_supermarket"]),
    "retail_store",
  );
});

test("inferLeadType defaults to farm for unrecognized names", () => {
  assert.equal(inferLeadType("Some Random Place", []), "farm");
});

// --- normalizeDedupValue ---

test("normalizeDedupValue lowercases and trims", () => {
  assert.equal(normalizeDedupValue("  Hello World  "), "hello world");
});

test("normalizeDedupValue handles empty string", () => {
  assert.equal(normalizeDedupValue(""), "");
});

// --- normalizeDedupName ---

test("normalizeDedupName normalizes ASCII possessive farmers apostrophe", () => {
  assert.equal(
    normalizeDedupName("Farmers' Market"),
    "farmers market",
  );
});

test("normalizeDedupName does not normalize unicode right single quote (U+2019)", () => {
  // Regex character class only contains ASCII apostrophe (0x27)
  assert.equal(
    normalizeDedupName("Farmers\u2019 Market"),
    "farmers\u2019 market",
  );
});

test("normalizeDedupName normalizes standalone St to street", () => {
  assert.equal(normalizeDedupName("Main St"), "main street");
});

test("normalizeDedupName: St. keeps the dot (regex word boundary stops before dot)", () => {
  // \bst\.?\b — the dot is non-word, so \b after \.? fails when dot is present
  // Only the "st" portion matches, dot is left behind
  assert.equal(normalizeDedupName("123 St. James"), "123 street. james");
});

test("normalizeDedupName applies both normalizations together", () => {
  assert.equal(
    normalizeDedupName("  Farmers' Stand on Main St  "),
    "farmers stand on main street",
  );
});

// --- dedupKeyForLead ---

test("dedupKeyForLead creates normalized name::city key", () => {
  const key = dedupKeyForLead({ name: "Green Acres Farm", city: "Toronto" });
  assert.equal(key, "green acres farm::toronto");
});

test("dedupKeyForLead produces same key for cosmetically different inputs", () => {
  const a = dedupKeyForLead({
    name: "Farmers' Market",
    city: "  Niagara-on-the-Lake ",
  });
  const b = dedupKeyForLead({
    name: "farmers market",
    city: "niagara-on-the-lake",
  });
  assert.equal(a, b);
});

test("dedupKeyForLead produces different keys for different cities", () => {
  const a = dedupKeyForLead({ name: "Farm", city: "Toronto" });
  const b = dedupKeyForLead({ name: "Farm", city: "Ottawa" });
  assert.notEqual(a, b);
});

// ============================================================
// 5. discoveredLeadValidator shape regression
// ============================================================

test("discoveredLeadValidator is exported from placeHelpers", () => {
  assert.match(
    helperSource,
    /export\s+const\s+discoveredLeadValidator/,
  );
});

test("discoveredLeadValidator includes all lead fields", () => {
  const requiredValidatorFields = [
    "name:",
    "type:",
    "address:",
    "city:",
    "region:",
    "province:",
    "placeId:",
    "latitude:",
    "longitude:",
    "source:",
    "sourceDetail:",
    "status:",
    "followUpCount:",
    "createdAt:",
    "updatedAt:",
  ];
  for (const field of requiredValidatorFields) {
    assert.ok(
      helperSource.includes(field),
      `discoveredLeadValidator must include "${field}"`,
    );
  }
});

// ============================================================
// 6. Pagination contract
// ============================================================

test("discoverLeads paginates up to 2 additional pages (max 60 results)", () => {
  assert.match(actionSource, /pagesLeft\s*=\s*2/);
  assert.match(actionSource, /pagesLeft\s*-=\s*1/);
});

test("discoverLeads waits between page token requests", () => {
  assert.match(actionSource, /setTimeout\(resolve,\s*2000\)/);
});

// ============================================================
// 7. searchPlaces contract
// ============================================================

test("searchPlaces uses Google Places Text Search endpoint", () => {
  assert.match(
    helperSource,
    /maps\.googleapis\.com\/maps\/api\/place\/textsearch\/json/,
  );
});

test("searchPlaces handles ZERO_RESULTS gracefully", () => {
  assert.match(helperSource, /ZERO_RESULTS/);
  assert.match(helperSource, /return\s*\{\s*results:\s*\[\]/);
});

test("searchPlaces returns nextPageToken from API response", () => {
  assert.match(helperSource, /next_page_token/);
  assert.match(helperSource, /nextPageToken/);
});

// ============================================================
// 8. Integration seams — placeHelpers exports used by action
// ============================================================

test("discoverLeads imports all needed helpers from placeHelpers", () => {
  const neededImports = [
    "searchPlaces",
    "extractCity",
    "inferLeadType",
    "normalizeDedupName",
    "normalizeDedupValue",
    "discoveredLeadValidator",
    "PlaceTextResult",
    "DiscoveredLead",
  ];
  for (const name of neededImports) {
    assert.ok(
      actionSource.includes(name),
      `discoverLeads must import "${name}" from placeHelpers`,
    );
  }
});
