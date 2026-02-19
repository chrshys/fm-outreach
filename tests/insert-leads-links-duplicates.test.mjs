import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// ============================================================
// Verify insertDiscoveredLeads links duplicate leads to the
// discovery cell when the existing lead has no discoveryCellId.
// ============================================================

const discoverLeadsSource = fs.readFileSync(
  "convex/discovery/discoverLeads.ts",
  "utf8",
);

// -- Source-code pattern tests --------------------------------

test("insertDiscoveredLeads patches duplicate (by placeId) with discoveryCellId", () => {
  assert.match(
    discoverLeadsSource,
    /existingByPlaceId[\s\S]*?lead\.discoveryCellId\s*&&\s*!existingByPlaceId\.discoveryCellId[\s\S]*?ctx\.db\.patch\(existingByPlaceId\._id,\s*\{\s*discoveryCellId:\s*lead\.discoveryCellId\s*\}\)/,
    "Should patch existing lead (matched by placeId) with discoveryCellId when missing",
  );
});

test("insertDiscoveredLeads patches duplicate (by name+city) with discoveryCellId", () => {
  assert.match(
    discoverLeadsSource,
    /existingByName[\s\S]*?lead\.discoveryCellId\s*&&\s*!existingByName\.discoveryCellId[\s\S]*?ctx\.db\.patch\(existingByName\._id,\s*\{\s*discoveryCellId:\s*lead\.discoveryCellId\s*\}\)/,
    "Should patch existing lead (matched by name+city) with discoveryCellId when missing",
  );
});

test("insertDiscoveredLeads returns linked count", () => {
  assert.match(
    discoverLeadsSource,
    /return\s*\{[^}]*linked/,
    "Return value should include linked count",
  );
});

// -- Behavioral tests with mock db ---------------------------

function normalizeDedupValue(value) {
  return value.trim().toLocaleLowerCase();
}

function normalizeDedupName(value) {
  return normalizeDedupValue(value)
    .replace(/\bfarmers['']/g, "farmers")
    .replace(/\bst\.?\b/g, "street");
}

function createMockDb() {
  const store = new Map();
  let counter = 0;
  return {
    _store: store,
    patches: [],
    async insert(_table, doc) {
      const id = `${_table}:${++counter}`;
      store.set(id, { _id: id, ...doc });
      return id;
    },
    async patch(id, fields) {
      const doc = store.get(id);
      if (doc) {
        Object.assign(doc, fields);
        this.patches.push({ id, fields });
      }
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

// Mirrors the actual insertDiscoveredLeads logic
async function insertDiscoveredLeads(db, leads) {
  const seenPlaceIds = new Set();
  const seenNameCity = new Set();
  let inserted = 0;
  let skipped = 0;
  let linked = 0;

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
        if (lead.discoveryCellId && !existing.discoveryCellId) {
          await db.patch(existing._id, { discoveryCellId: lead.discoveryCellId });
          linked += 1;
        }
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
      if (lead.discoveryCellId && !existingByName.discoveryCellId) {
        await db.patch(existingByName._id, { discoveryCellId: lead.discoveryCellId });
        linked += 1;
      }
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
  return { inserted, skipped, linked };
}

function makeLead(overrides = {}) {
  const now = Date.now();
  return {
    name: "Test Farm",
    type: "farm",
    address: "123 Main St",
    city: "Lincoln",
    postalCode: "L0R 1B0",
    countryCode: "CA",
    region: "Niagara",
    province: "Ontario",
    placeId: "place_xyz",
    latitude: 43.1,
    longitude: -79.4,
    source: "google_places",
    sourceDetail: "test",
    status: "new_lead",
    followUpCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test("duplicate by placeId: links existing lead to discovery cell", async () => {
  const db = createMockDb();
  // Insert existing lead without discoveryCellId
  await db.insert("leads", makeLead({ discoveryCellId: undefined }));

  // Re-discover with a cell ID
  const result = await insertDiscoveredLeads(db, [
    makeLead({ discoveryCellId: "discoveryCells:cell1" }),
  ]);

  assert.equal(result.inserted, 0);
  assert.equal(result.skipped, 1);
  assert.equal(result.linked, 1);

  const stored = [...db._store.values()].find((d) => d._id.startsWith("leads:"));
  assert.equal(stored.discoveryCellId, "discoveryCells:cell1",
    "Existing lead should now have discoveryCellId");
});

test("duplicate by placeId: does NOT overwrite existing discoveryCellId", async () => {
  const db = createMockDb();
  await db.insert("leads", makeLead({ discoveryCellId: "discoveryCells:original" }));

  const result = await insertDiscoveredLeads(db, [
    makeLead({ discoveryCellId: "discoveryCells:newCell" }),
  ]);

  assert.equal(result.linked, 0, "Should not link when existing lead already has a cell");

  const stored = [...db._store.values()].find((d) => d._id.startsWith("leads:"));
  assert.equal(stored.discoveryCellId, "discoveryCells:original",
    "Original discoveryCellId should be preserved");
});

test("duplicate by name+city: links existing lead to discovery cell", async () => {
  const db = createMockDb();
  // Insert with a different placeId so the placeId check doesn't match
  await db.insert("leads", makeLead({ placeId: "place_old", discoveryCellId: undefined }));

  const result = await insertDiscoveredLeads(db, [
    makeLead({ placeId: "place_new", discoveryCellId: "discoveryCells:cell2" }),
  ]);

  assert.equal(result.linked, 1);

  const stored = [...db._store.values()].find((d) => d._id.startsWith("leads:"));
  assert.equal(stored.discoveryCellId, "discoveryCells:cell2");
});

test("no discoveryCellId on incoming lead: does NOT patch existing", async () => {
  const db = createMockDb();
  await db.insert("leads", makeLead({ discoveryCellId: undefined }));

  const result = await insertDiscoveredLeads(db, [
    makeLead({ discoveryCellId: undefined }),
  ]);

  assert.equal(result.linked, 0);
  assert.equal(db.patches.length, 0, "No patches should be made");
});
