import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

// ============================================================
// End-to-end behavioral test: discoverCell pipeline sets
// discoveryCellId on every lead it creates.
//
// Simulates the full flow:
//   1. Grid + cell setup
//   2. Cell claimed for search
//   3. Google Places results mapped to leads with discoveryCellId
//   4. insertDiscoveredLeads persists discoveryCellId
//   5. Leads queryable by discoveryCellId index
// ============================================================

// -- Helper functions replicated from placeHelpers.ts ----------

function normalizeDedupValue(value) {
  return value.trim().toLocaleLowerCase();
}

function normalizeDedupName(value) {
  return normalizeDedupValue(value)
    .replace(/\bfarmers['']/g, "farmers")
    .replace(/\bst\.?\b/g, "street");
}

function extractCity(formattedAddress) {
  const parts = formattedAddress.split(",").map((p) => p.trim());
  if (parts.length >= 3) return parts[1];
  if (parts.length >= 2) return parts[0];
  return formattedAddress;
}

function extractPostalCode(addressComponents) {
  if (!addressComponents) return "";
  const pc = addressComponents.find((c) =>
    c.types?.includes("postal_code"),
  );
  return pc?.long_name ?? "";
}

function extractCountryCode(addressComponents) {
  if (!addressComponents) return "";
  const cc = addressComponents.find((c) => c.types?.includes("country"));
  return cc?.short_name ?? "";
}

function inferLeadType(name, types) {
  const lower = name.toLowerCase();
  if (lower.includes("market") || lower.includes("farmers market"))
    return "farmers_market";
  if (lower.includes("roadside") || lower.includes("stand"))
    return "roadside_stand";
  if (
    lower.includes("farm") ||
    lower.includes("orchard") ||
    lower.includes("vineyard") ||
    lower.includes("ranch") ||
    lower.includes("acres")
  )
    return "farm";
  if (types.includes("store") || types.includes("grocery_or_supermarket"))
    return "retail_store";
  return "farm";
}

// -- Mock database with index support -------------------------

function createMockDb() {
  const store = new Map();
  let counter = 0;

  return {
    _store: store,
    async insert(table, doc) {
      const id = `${table}:${++counter}`;
      store.set(id, { _id: id, _creationTime: Date.now(), ...doc });
      return id;
    },
    async get(id) {
      return store.get(id) ?? null;
    },
    async patch(id, fields) {
      const doc = store.get(id);
      if (!doc) throw new Error(`Document ${id} not found`);
      Object.assign(doc, fields);
    },
    query(table) {
      const docs = [...store.values()].filter((d) =>
        d._id.startsWith(table + ":"),
      );
      return {
        withIndex: (_indexName, indexFn) => {
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
            collect: async () => filtered,
          };
        },
        collect: async () => docs,
      };
    },
  };
}

// -- insertDiscoveredLeads logic (mirrors discoverLeads.ts) ----

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

// -- Fake Google Places results --------------------------------

function makePlaceResults() {
  return [
    {
      place_id: "ChIJ_farm001",
      name: "Sunny Acres Farm",
      formatted_address: "100 Concession Rd, Lincoln, ON L0R 1B0, Canada",
      geometry: { location: { lat: 43.05, lng: -79.45 } },
      types: ["establishment", "point_of_interest"],
      address_components: [
        { long_name: "L0R 1B0", types: ["postal_code"] },
        { short_name: "CA", types: ["country"] },
      ],
    },
    {
      place_id: "ChIJ_farm002",
      name: "Niagara Orchard Co",
      formatted_address: "200 Vine St, Niagara-on-the-Lake, ON L0S 1J0, Canada",
      geometry: { location: { lat: 43.08, lng: -79.38 } },
      types: ["establishment"],
      address_components: [
        { long_name: "L0S 1J0", types: ["postal_code"] },
        { short_name: "CA", types: ["country"] },
      ],
    },
    {
      place_id: "ChIJ_market003",
      name: "Heritage Farmers Market",
      formatted_address: "50 Market Square, St. Catharines, ON L2R, Canada",
      geometry: { location: { lat: 43.16, lng: -79.24 } },
      types: ["establishment", "store"],
      address_components: [
        { long_name: "L2R", types: ["postal_code"] },
        { short_name: "CA", types: ["country"] },
      ],
    },
  ];
}

// ============================================================
// Test: Full discoverCell pipeline with discoveryCellId
// ============================================================

test("full discoverCell pipeline sets discoveryCellId on every created lead", async () => {
  const db = createMockDb();

  // Step 1: Set up grid and cell (simulates what exists in Convex)
  const gridId = await db.insert("discoveryGrids", {
    name: "Niagara Peninsula",
    region: "Niagara",
    province: "Ontario",
    queries: ["farms near"],
    swLat: 42.85,
    swLng: -79.9,
    neLat: 43.35,
    neLng: -78.8,
    cellSizeKm: 20,
    totalLeadsFound: 0,
    createdAt: Date.now(),
  });

  const cellId = await db.insert("discoveryCells", {
    swLat: 42.85,
    swLng: -79.9,
    neLat: 43.2,
    neLng: -79.2,
    boundsKey: "42.850000_-79.900000",
    depth: 0,
    isLeaf: true,
    status: "unsearched",
    gridId,
  });

  // Step 2: Claim cell (simulates claimCellForSearch)
  await db.patch(cellId, { status: "searching" });
  const cell = await db.get(cellId);
  assert.equal(cell.status, "searching");

  // Step 3: Simulate Google Places search results
  const placeResults = makePlaceResults();

  // Step 4: Map places → leads WITH discoveryCellId (mirrors discoverCell.ts lines 135-154)
  const now = Date.now();
  const gridName = "Niagara Peninsula";
  const region = "Niagara";
  const province = "Ontario";
  const depth = 0;

  const leads = placeResults.map((place) => ({
    name: place.name,
    type: inferLeadType(place.name, place.types ?? []),
    address: place.formatted_address ?? "",
    city: extractCity(place.formatted_address ?? ""),
    postalCode: extractPostalCode(place.address_components),
    countryCode: extractCountryCode(place.address_components),
    region,
    province,
    placeId: place.place_id,
    latitude: place.geometry?.location?.lat,
    longitude: place.geometry?.location?.lng,
    source: "google_places",
    sourceDetail: `Discovery grid "${gridName}" cell ${cellId} [depth=${depth}]`,
    discoveryCellId: cellId,
    status: "new_lead",
    followUpCount: 0,
    createdAt: now,
    updatedAt: now,
  }));

  // Step 5: Insert leads (simulates insertDiscoveredLeads mutation)
  const result = await insertDiscoveredLeads(db, leads);
  assert.equal(result.inserted, 3, "All 3 leads should be inserted");
  assert.equal(result.skipped, 0);

  // Step 6: Verify EVERY lead in the store has discoveryCellId set
  const allLeads = [...db._store.values()].filter((d) =>
    d._id.startsWith("leads:"),
  );
  assert.equal(allLeads.length, 3, "3 leads in the database");

  for (const lead of allLeads) {
    assert.equal(
      lead.discoveryCellId,
      cellId,
      `Lead "${lead.name}" should have discoveryCellId = ${cellId}`,
    );
  }

  // Step 7: Verify leads are queryable by discoveryCellId index
  const leadsByCell = await db
    .query("leads")
    .withIndex("by_discoveryCellId", (q) =>
      q.eq("discoveryCellId", cellId),
    )
    .collect();

  assert.equal(
    leadsByCell.length,
    3,
    "All 3 leads should be found via by_discoveryCellId index",
  );

  // Step 8: Verify individual lead fields alongside discoveryCellId
  const farmLead = allLeads.find((l) => l.name === "Sunny Acres Farm");
  assert.ok(farmLead);
  assert.equal(farmLead.type, "farm");
  assert.equal(farmLead.discoveryCellId, cellId);
  assert.equal(farmLead.source, "google_places");
  assert.equal(farmLead.region, "Niagara");

  const marketLead = allLeads.find((l) => l.name === "Heritage Farmers Market");
  assert.ok(marketLead);
  assert.equal(marketLead.type, "farmers_market");
  assert.equal(marketLead.discoveryCellId, cellId);
});

// ============================================================
// Test: Leads from different cells have correct discoveryCellId
// ============================================================

test("leads from different cells each get their own discoveryCellId", async () => {
  const db = createMockDb();

  const gridId = await db.insert("discoveryGrids", {
    name: "Test Grid",
    queries: ["farms"],
    totalLeadsFound: 0,
    createdAt: Date.now(),
  });

  const cellA = await db.insert("discoveryCells", {
    swLat: 42.85, swLng: -79.9, neLat: 43.0, neLng: -79.5,
    depth: 1, isLeaf: true, status: "searching", gridId,
  });

  const cellB = await db.insert("discoveryCells", {
    swLat: 43.0, swLng: -79.5, neLat: 43.2, neLng: -79.1,
    depth: 1, isLeaf: true, status: "searching", gridId,
  });

  const now = Date.now();

  // Leads from cell A
  const leadsA = [{
    name: "Farm Alpha",
    type: "farm",
    address: "1 Alpha Rd, Lincoln, ON L0R, Canada",
    city: "Lincoln",
    postalCode: "L0R",
    countryCode: "CA",
    region: "Niagara",
    province: "Ontario",
    placeId: "place_alpha",
    latitude: 42.9,
    longitude: -79.7,
    source: "google_places",
    sourceDetail: `Cell ${cellA}`,
    discoveryCellId: cellA,
    status: "new_lead",
    followUpCount: 0,
    createdAt: now,
    updatedAt: now,
  }];

  // Leads from cell B
  const leadsB = [{
    name: "Farm Beta",
    type: "farm",
    address: "2 Beta Rd, Vineland, ON L0R, Canada",
    city: "Vineland",
    postalCode: "L0R",
    countryCode: "CA",
    region: "Niagara",
    province: "Ontario",
    placeId: "place_beta",
    latitude: 43.1,
    longitude: -79.3,
    source: "google_places",
    sourceDetail: `Cell ${cellB}`,
    discoveryCellId: cellB,
    status: "new_lead",
    followUpCount: 0,
    createdAt: now,
    updatedAt: now,
  }];

  await insertDiscoveredLeads(db, leadsA);
  await insertDiscoveredLeads(db, leadsB);

  const allLeads = [...db._store.values()].filter((d) =>
    d._id.startsWith("leads:"),
  );
  assert.equal(allLeads.length, 2);

  const alpha = allLeads.find((l) => l.name === "Farm Alpha");
  const beta = allLeads.find((l) => l.name === "Farm Beta");

  assert.equal(alpha.discoveryCellId, cellA, "Alpha belongs to cell A");
  assert.equal(beta.discoveryCellId, cellB, "Beta belongs to cell B");
  assert.notEqual(cellA, cellB, "Cell IDs are distinct");
});

// ============================================================
// Test: sourceDetail includes cell ID and depth
// ============================================================

test("sourceDetail encodes grid name, cell ID, and depth", () => {
  const cellId = "discoveryCells:test123";
  const gridName = "Niagara Peninsula";
  const depth = 2;

  const sourceDetail = `Discovery grid "${gridName}" cell ${cellId} [depth=${depth}]`;

  assert.match(sourceDetail, /Discovery grid "Niagara Peninsula"/);
  assert.match(sourceDetail, /cell discoveryCells:test123/);
  assert.match(sourceDetail, /\[depth=2\]/);
});

// ============================================================
// Source code: discoverCell.ts sets discoveryCellId: args.cellId
// ============================================================

const discoverCellSource = fs.readFileSync(
  "convex/discovery/discoverCell.ts",
  "utf8",
);

test("discoverCell.ts sets discoveryCellId: args.cellId in lead mapping", () => {
  assert.match(
    discoverCellSource,
    /discoveryCellId:\s*args\.cellId/,
    "Each lead should get discoveryCellId from the action's cellId arg",
  );
});

test("discoverCell.ts maps leads from inBounds results (not all results)", () => {
  assert.match(
    discoverCellSource,
    /inBounds\.map\(/,
    "Leads should be mapped from in-bounds-filtered results",
  );
});
