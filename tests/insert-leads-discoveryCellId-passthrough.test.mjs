import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// ============================================================
// Verify discoveryCellId passes through insertDiscoveredLeads
// The handler does ctx.db.insert("leads", lead) with the full
// lead object, so any field in the validator (including
// discoveryCellId) is persisted.
// ============================================================

const discoverLeadsSource = fs.readFileSync(
  "convex/discovery/discoverLeads.ts",
  "utf8",
);
const placeHelpersSource = fs.readFileSync(
  "convex/discovery/placeHelpers.ts",
  "utf8",
);
const schemaSource = fs.readFileSync("convex/schema.ts", "utf8");

// -- Source-code pattern tests --------------------------------

test("insertDiscoveredLeads args use discoveredLeadValidator", () => {
  assert.match(
    discoverLeadsSource,
    /leads:\s*v\.array\(discoveredLeadValidator\)/,
    "args.leads should use discoveredLeadValidator",
  );
});

test("discoveredLeadValidator includes optional discoveryCellId", () => {
  assert.match(
    placeHelpersSource,
    /discoveryCellId:\s*v\.optional\(v\.id\("discoveryCells"\)\)/,
    "discoveredLeadValidator should have discoveryCellId field",
  );
});

test("insertDiscoveredLeads inserts the full lead object", () => {
  // The handler iterates `for (const lead of args.leads)` and inserts
  // `lead` directly — no field picking or destructuring that would drop fields.
  assert.match(
    discoverLeadsSource,
    /ctx\.db\.insert\("leads",\s*lead\)/,
    "Should insert the full lead object (not a subset of fields)",
  );
});

test("leads schema has discoveryCellId field", () => {
  assert.match(
    schemaSource,
    /discoveryCellId:\s*v\.optional\(v\.id\("discoveryCells"\)\)/,
    "leads table schema should accept discoveryCellId",
  );
});

// -- Behavioral test with mock db -----------------------------

function createMockDb() {
  const store = new Map();
  let counter = 0;
  return {
    _store: store,
    async insert(_table, doc) {
      const id = `${_table}:${++counter}`;
      store.set(id, { _id: id, ...doc });
      return id;
    },
    query(table) {
      const docs = [...store.values()].filter((d) =>
        d._id.startsWith(table + ":"),
      );
      return {
        withIndex: (_name, indexFn) => {
          let filtered = docs;
          if (indexFn) {
            const constraints = {};
            const q = {
              eq: (field, value) => {
                constraints[field] = value;
                return q;
              },
            };
            indexFn(q);
            filtered = docs.filter((d) =>
              Object.entries(constraints).every(([k, v]) => d[k] === v),
            );
          }
          return {
            filter: (filterFn) => {
              if (filterFn) {
                const q = {
                  eq: (a, b) => {
                    if (typeof a === "function")
                      return { _type: "field_eq", field: a, value: b };
                    return a === b;
                  },
                  field: (name) => (doc) => doc[name],
                };
                const condition = filterFn(q);
                if (condition && condition._type === "field_eq") {
                  filtered = filtered.filter(
                    (d) => condition.field(d) === condition.value,
                  );
                }
              }
              return { first: async () => filtered[0] ?? null };
            },
            first: async () => filtered[0] ?? null,
          };
        },
      };
    },
  };
}

function normalizeDedupValue(value) {
  return value.trim().toLocaleLowerCase();
}

function normalizeDedupName(value) {
  return normalizeDedupValue(value)
    .replace(/\bfarmers['']/g, "farmers")
    .replace(/\bst\.?\b/g, "street");
}

async function insertDiscoveredLeads(db, leads) {
  const seenPlaceIds = new Set();
  const seenNameCity = new Set();
  let inserted = 0;
  let skipped = 0;

  for (const lead of leads) {
    const nameCityKey = `${normalizeDedupName(lead.name)}::${normalizeDedupValue(lead.city)}`;
    if (seenPlaceIds.has(lead.placeId) || seenNameCity.has(nameCityKey)) {
      skipped += 1;
      continue;
    }
    if (lead.placeId) {
      const existing = await db
        .query("leads")
        .withIndex("by_placeId", (q) => q.eq("placeId", lead.placeId))
        .first();
      if (existing) {
        skipped += 1;
        seenPlaceIds.add(lead.placeId);
        seenNameCity.add(nameCityKey);
        continue;
      }
    }
    const existingByName = await db
      .query("leads")
      .withIndex("by_name", (q) => q.eq("name", lead.name))
      .filter((q) => q.eq(q.field("city"), lead.city))
      .first();
    if (existingByName) {
      skipped += 1;
      seenPlaceIds.add(lead.placeId);
      seenNameCity.add(nameCityKey);
      continue;
    }
    await db.insert("leads", lead);
    seenPlaceIds.add(lead.placeId);
    seenNameCity.add(nameCityKey);
    inserted += 1;
  }
  return { inserted, skipped };
}

test("discoveryCellId is preserved in inserted lead documents", async () => {
  const db = createMockDb();
  const now = Date.now();
  const fakeCellId = "discoveryCells:abc123";

  const leads = [
    {
      name: "Test Farm",
      type: "farm",
      address: "123 Main St, Lincoln, ON L0R, Canada",
      city: "Lincoln",
      postalCode: "L0R 1B0",
      countryCode: "CA",
      region: "Niagara",
      province: "Ontario",
      placeId: "place_xyz",
      latitude: 43.1,
      longitude: -79.4,
      source: "google_places",
      sourceDetail: "Discovery grid cell [depth=0]",
      status: "new_lead",
      followUpCount: 0,
      createdAt: now,
      updatedAt: now,
      discoveryCellId: fakeCellId,
    },
  ];

  const result = await insertDiscoveredLeads(db, leads);
  assert.equal(result.inserted, 1);

  const stored = [...db._store.values()].find((d) =>
    d._id.startsWith("leads:"),
  );
  assert.ok(stored, "Lead should be in the store");
  assert.equal(
    stored.discoveryCellId,
    fakeCellId,
    "discoveryCellId should be preserved on the inserted document",
  );
});

test("lead without discoveryCellId is inserted without the field", async () => {
  const db = createMockDb();
  const now = Date.now();

  const leads = [
    {
      name: "Legacy Farm",
      type: "farm",
      address: "456 Old Rd, Vineland, ON L0R, Canada",
      city: "Vineland",
      postalCode: "L0R 2C0",
      countryCode: "CA",
      region: "Niagara",
      province: "Ontario",
      placeId: "place_legacy",
      latitude: 43.15,
      longitude: -79.35,
      source: "google_places",
      sourceDetail: 'Google Places discovery: "farms in Niagara, Ontario"',
      status: "new_lead",
      followUpCount: 0,
      createdAt: now,
      updatedAt: now,
      // no discoveryCellId — simulates the old discoverLeads action path
    },
  ];

  const result = await insertDiscoveredLeads(db, leads);
  assert.equal(result.inserted, 1);

  const stored = [...db._store.values()].find((d) =>
    d._id.startsWith("leads:"),
  );
  assert.ok(stored, "Lead should be in the store");
  assert.equal(
    stored.discoveryCellId,
    undefined,
    "discoveryCellId should be undefined when not provided",
  );
});
