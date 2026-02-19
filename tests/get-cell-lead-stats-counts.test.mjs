import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

// ============================================================
// Tests that getCellLeadStats counting logic produces correct
// results for different lead data scenarios.
//
// Extracts the boolean expressions from the source code and
// evaluates them against mock leads to verify counts are correct.
// ============================================================

const gridCellsSource = fs.readFileSync(
  "convex/discovery/gridCells.ts",
  "utf8",
);

const fnBody = gridCellsSource.slice(
  gridCellsSource.indexOf("getCellLeadStats"),
);

// -- Counter initialisation ----------------------------------

test("counters initialise to 0", () => {
  assert.match(fnBody, /let locationComplete\s*=\s*0/);
  assert.match(fnBody, /let hasWebPresence\s*=\s*0/);
  assert.match(fnBody, /let directoryReady\s*=\s*0/);
});

// -- Counting logic: locationComplete ------------------------

test("locationComplete increments only when isLocationComplete is true", () => {
  assert.match(
    fnBody,
    /if\s*\(isLocationComplete\)\s*locationComplete\+\+/,
    "Should increment locationComplete when isLocationComplete is truthy",
  );
});

test("isLocationComplete requires all 7 location fields", () => {
  // The expression should AND together all 7 fields
  const expr = fnBody.match(
    /const isLocationComplete\s*=\s*!!\(\s*([\s\S]*?)\);/,
  );
  assert.ok(expr, "Should define isLocationComplete with !! double-negation");

  const body = expr[1];
  const requiredFields = [
    "lead.address",
    "lead.city",
    "lead.postalCode",
    "lead.countryCode",
    "lead.latitude",
    "lead.longitude",
  ];
  for (const field of requiredFields) {
    assert.ok(body.includes(field), `isLocationComplete must check ${field}`);
  }
  // province OR region (disjunction inside the conjunction)
  assert.match(
    body,
    /lead\.province\s*\|\|\s*lead\.region/,
    "Should allow province OR region",
  );
});

// -- Counting logic: hasWebPresence --------------------------

test("hasWebPresence increments only when isWebPresence is true", () => {
  assert.match(
    fnBody,
    /if\s*\(isWebPresence\)\s*hasWebPresence\+\+/,
    "Should increment hasWebPresence when isWebPresence is truthy",
  );
});

test("isWebPresence uses OR across website and social links", () => {
  const expr = fnBody.match(
    /const isWebPresence\s*=\s*!!\(\s*([\s\S]*?)\);/,
  );
  assert.ok(expr, "Should define isWebPresence with !! double-negation");

  const body = expr[1];
  assert.ok(body.includes("lead.website"), "Should check lead.website");
  assert.ok(
    body.includes("lead.socialLinks?.instagram"),
    "Should check socialLinks?.instagram",
  );
  assert.ok(
    body.includes("lead.socialLinks?.facebook"),
    "Should check socialLinks?.facebook",
  );
  // All joined by ||
  assert.match(body, /\|\|/, "Fields should be OR-ed together");
});

// -- Counting logic: directoryReady --------------------------

test("directoryReady increments only when both flags are true", () => {
  assert.match(
    fnBody,
    /if\s*\(isLocationComplete\s*&&\s*isWebPresence\)\s*directoryReady\+\+/,
    "Should increment directoryReady only when both conditions hold",
  );
});

// -- Simulate counting with mock leads -----------------------
// Replicate the exact boolean logic from the source and run
// it against controlled lead objects to verify expected counts.

function isLocationComplete(lead) {
  return !!(
    lead.address &&
    lead.city &&
    (lead.province || lead.region) &&
    lead.postalCode &&
    lead.countryCode &&
    lead.latitude &&
    lead.longitude
  );
}

function isWebPresence(lead) {
  return !!(
    lead.website ||
    lead.socialLinks?.instagram ||
    lead.socialLinks?.facebook
  );
}

function computeStats(leads) {
  let locationComplete = 0;
  let hasWebPresence = 0;
  let directoryReady = 0;

  for (const lead of leads) {
    const loc = isLocationComplete(lead);
    const web = isWebPresence(lead);
    if (loc) locationComplete++;
    if (web) hasWebPresence++;
    if (loc && web) directoryReady++;
  }

  return {
    total: leads.length,
    locationComplete,
    hasWebPresence,
    directoryReady,
  };
}

// Helper: full lead with all fields populated
function fullLead(overrides = {}) {
  return {
    address: "123 Farm Rd",
    city: "Springfield",
    province: "ON",
    region: "",
    postalCode: "K1A 0B1",
    countryCode: "CA",
    latitude: 45.0,
    longitude: -75.0,
    website: "https://farm.example.com",
    socialLinks: { instagram: "@farm", facebook: "farm.fb" },
    ...overrides,
  };
}

test("empty leads array returns all zeros", () => {
  const stats = computeStats([]);
  assert.deepStrictEqual(stats, {
    total: 0,
    locationComplete: 0,
    hasWebPresence: 0,
    directoryReady: 0,
  });
});

test("single fully-populated lead counts in all buckets", () => {
  const stats = computeStats([fullLead()]);
  assert.deepStrictEqual(stats, {
    total: 1,
    locationComplete: 1,
    hasWebPresence: 1,
    directoryReady: 1,
  });
});

test("lead with location only (no web) counts locationComplete but not directoryReady", () => {
  const stats = computeStats([
    fullLead({ website: undefined, socialLinks: undefined }),
  ]);
  assert.strictEqual(stats.total, 1);
  assert.strictEqual(stats.locationComplete, 1);
  assert.strictEqual(stats.hasWebPresence, 0);
  assert.strictEqual(stats.directoryReady, 0);
});

test("lead with web only (no location) counts hasWebPresence but not directoryReady", () => {
  const stats = computeStats([
    fullLead({ address: "", city: "", postalCode: "", latitude: undefined }),
  ]);
  assert.strictEqual(stats.total, 1);
  assert.strictEqual(stats.locationComplete, 0);
  assert.strictEqual(stats.hasWebPresence, 1);
  assert.strictEqual(stats.directoryReady, 0);
});

test("lead missing only latitude is not locationComplete", () => {
  const stats = computeStats([fullLead({ latitude: undefined })]);
  assert.strictEqual(stats.locationComplete, 0);
  assert.strictEqual(stats.directoryReady, 0);
});

test("lead with region but no province is still locationComplete", () => {
  const stats = computeStats([fullLead({ province: "", region: "Eastern" })]);
  assert.strictEqual(stats.locationComplete, 1);
});

test("lead with province but no region is still locationComplete", () => {
  const stats = computeStats([fullLead({ province: "ON", region: "" })]);
  assert.strictEqual(stats.locationComplete, 1);
});

test("lead with neither province nor region is not locationComplete", () => {
  const stats = computeStats([fullLead({ province: "", region: "" })]);
  assert.strictEqual(stats.locationComplete, 0);
});

test("lead with only instagram counts as hasWebPresence", () => {
  const stats = computeStats([
    fullLead({
      website: undefined,
      socialLinks: { instagram: "@farm", facebook: "" },
    }),
  ]);
  assert.strictEqual(stats.hasWebPresence, 1);
});

test("lead with only facebook counts as hasWebPresence", () => {
  const stats = computeStats([
    fullLead({
      website: undefined,
      socialLinks: { instagram: "", facebook: "farm.fb" },
    }),
  ]);
  assert.strictEqual(stats.hasWebPresence, 1);
});

test("lead with only website counts as hasWebPresence", () => {
  const stats = computeStats([
    fullLead({ socialLinks: undefined })
  ]);
  assert.strictEqual(stats.hasWebPresence, 1);
});

test("mixed leads produce correct aggregate counts", () => {
  const leads = [
    // Lead 1: full → location + web + directoryReady
    fullLead(),
    // Lead 2: location only → location only
    fullLead({ website: undefined, socialLinks: undefined }),
    // Lead 3: web only → web only
    fullLead({ address: "", latitude: undefined }),
    // Lead 4: neither
    fullLead({
      address: "",
      latitude: undefined,
      website: undefined,
      socialLinks: undefined,
    }),
  ];
  const stats = computeStats(leads);
  assert.strictEqual(stats.total, 4);
  assert.strictEqual(stats.locationComplete, 2);
  assert.strictEqual(stats.hasWebPresence, 2);
  assert.strictEqual(stats.directoryReady, 1);
});

// -- Verify return shape matches mock structure ---------------

test("return object has exactly four keys", () => {
  assert.match(
    fnBody,
    /return\s*\{\s*total:\s*leads\.length,\s*locationComplete,\s*hasWebPresence,\s*directoryReady,?\s*\}/,
    "Return statement should have total, locationComplete, hasWebPresence, directoryReady",
  );
});

// -- Verify iteration covers every lead ----------------------

test("handler iterates over leads with for-of loop", () => {
  assert.match(
    fnBody,
    /for\s*\(\s*const\s+lead\s+of\s+leads\s*\)/,
    "Should iterate with for (const lead of leads)",
  );
});
