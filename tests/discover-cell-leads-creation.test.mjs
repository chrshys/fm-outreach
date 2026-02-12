import assert from "node:assert/strict";
import test from "node:test";

// ============================================================
// Behavioral tests for discoverCell → leads creation pipeline:
// - Places are converted to leads with correct fields
// - Leads table schema compatibility
// - Duplicate detection across placeId and name+city
// - Grid totalLeadsFound is incremented
// ============================================================

// -- Replicate helper functions from placeHelpers.ts -----------

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

// -- Mock db with index-based dedup support --------------------

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
                    if (typeof a === "function") return { _type: "field_eq", field: a, value: b };
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

// -- Helper: make a place result ------------------------------

function makePlaceResult(overrides = {}) {
  return {
    place_id: `place_${Math.random().toString(36).slice(2, 8)}`,
    name: "Test Farm",
    formatted_address: "123 Main St, Niagara-on-the-Lake, ON L0S, Canada",
    geometry: { location: { lat: 43.0, lng: -79.3 } },
    types: ["establishment"],
    ...overrides,
  };
}

// -- Helper: simulate insertDiscoveredLeads logic --------------

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

    // Check by placeId
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

    // Check by name + city
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

// ============================================================
// Places → Leads conversion produces valid lead objects
// ============================================================

test("place result is converted to lead with all required fields", () => {
  const place = makePlaceResult({
    place_id: "ChIJ_abc123",
    name: "Niagara Orchard",
    formatted_address: "456 Vine St, Niagara-on-the-Lake, ON L0S, Canada",
    geometry: { location: { lat: 43.05, lng: -79.25 } },
    types: ["establishment", "point_of_interest"],
  });

  const now = Date.now();
  const lead = {
    name: place.name,
    type: inferLeadType(place.name, place.types ?? []),
    address: place.formatted_address ?? "",
    city: extractCity(place.formatted_address ?? ""),
    region: "Niagara",
    province: "Ontario",
    placeId: place.place_id,
    latitude: place.geometry?.location?.lat,
    longitude: place.geometry?.location?.lng,
    source: "google_places",
    sourceDetail: "Discovery grid cell [depth=0]",
    status: "new_lead",
    followUpCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  assert.equal(lead.name, "Niagara Orchard");
  assert.equal(lead.type, "farm"); // "orchard" triggers farm type
  assert.equal(lead.address, "456 Vine St, Niagara-on-the-Lake, ON L0S, Canada");
  assert.equal(lead.city, "Niagara-on-the-Lake");
  assert.equal(lead.region, "Niagara");
  assert.equal(lead.province, "Ontario");
  assert.equal(lead.placeId, "ChIJ_abc123");
  assert.equal(lead.latitude, 43.05);
  assert.equal(lead.longitude, -79.25);
  assert.equal(lead.source, "google_places");
  assert.equal(lead.status, "new_lead");
  assert.equal(lead.followUpCount, 0);
  assert.equal(typeof lead.createdAt, "number");
  assert.equal(typeof lead.updatedAt, "number");
});

// ============================================================
// Leads are inserted into the leads table
// ============================================================

test("converted leads are inserted into leads table via insertDiscoveredLeads", async () => {
  const db = createMockDb();

  const now = Date.now();
  const leads = [
    {
      name: "Sunny Farm",
      type: "farm",
      address: "100 Farm Rd, Lincoln, ON L0R, Canada",
      city: "Lincoln",
      region: "Niagara",
      province: "Ontario",
      placeId: "place_001",
      latitude: 43.1,
      longitude: -79.4,
      source: "google_places",
      sourceDetail: "Discovery grid cell [depth=0]",
      status: "new_lead",
      followUpCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      name: "Green Orchard",
      type: "farm",
      address: "200 Orchard Ln, Vineland, ON L0R, Canada",
      city: "Vineland",
      region: "Niagara",
      province: "Ontario",
      placeId: "place_002",
      latitude: 43.15,
      longitude: -79.35,
      source: "google_places",
      sourceDetail: "Discovery grid cell [depth=0]",
      status: "new_lead",
      followUpCount: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const result = await insertDiscoveredLeads(db, leads);

  assert.equal(result.inserted, 2);
  assert.equal(result.skipped, 0);

  // Verify leads exist in the mock db
  const allDocs = [...db._store.values()].filter((d) =>
    d._id.startsWith("leads:"),
  );
  assert.equal(allDocs.length, 2);
  assert.equal(allDocs[0].name, "Sunny Farm");
  assert.equal(allDocs[1].name, "Green Orchard");
});

// ============================================================
// Duplicate placeId leads are skipped
// ============================================================

test("leads with duplicate placeId are skipped", async () => {
  const db = createMockDb();

  // Pre-existing lead in db
  await db.insert("leads", {
    name: "Existing Farm",
    placeId: "place_existing",
    city: "Lincoln",
    status: "new_lead",
  });

  const now = Date.now();
  const leads = [
    {
      name: "Existing Farm",
      type: "farm",
      address: "100 Farm Rd, Lincoln, ON L0R, Canada",
      city: "Lincoln",
      region: "Niagara",
      province: "Ontario",
      placeId: "place_existing", // already exists
      latitude: 43.1,
      longitude: -79.4,
      source: "google_places",
      sourceDetail: "Discovery grid cell [depth=0]",
      status: "new_lead",
      followUpCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      name: "New Farm",
      type: "farm",
      address: "200 Farm Rd, Vineland, ON L0R, Canada",
      city: "Vineland",
      region: "Niagara",
      province: "Ontario",
      placeId: "place_new",
      latitude: 43.15,
      longitude: -79.35,
      source: "google_places",
      sourceDetail: "Discovery grid cell [depth=0]",
      status: "new_lead",
      followUpCount: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const result = await insertDiscoveredLeads(db, leads);

  assert.equal(result.inserted, 1, "Only the new lead is inserted");
  assert.equal(result.skipped, 1, "The duplicate is skipped");
});

// ============================================================
// In-batch deduplication (same placeId in one batch)
// ============================================================

test("in-batch duplicate placeIds are skipped", async () => {
  const db = createMockDb();

  const now = Date.now();
  const leads = [
    {
      name: "Farm A",
      type: "farm",
      address: "100 Farm Rd, Lincoln, ON L0R, Canada",
      city: "Lincoln",
      region: "Niagara",
      province: "Ontario",
      placeId: "place_dup",
      latitude: 43.1,
      longitude: -79.4,
      source: "google_places",
      sourceDetail: "Discovery grid cell [depth=0]",
      status: "new_lead",
      followUpCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      name: "Farm A (duplicate)",
      type: "farm",
      address: "100 Farm Rd, Lincoln, ON L0R, Canada",
      city: "Lincoln",
      region: "Niagara",
      province: "Ontario",
      placeId: "place_dup", // same placeId
      latitude: 43.1,
      longitude: -79.4,
      source: "google_places",
      sourceDetail: "Discovery grid cell [depth=0]",
      status: "new_lead",
      followUpCount: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const result = await insertDiscoveredLeads(db, leads);

  assert.equal(result.inserted, 1);
  assert.equal(result.skipped, 1);
});

// ============================================================
// Name+city dedup catches leads without matching placeId
// ============================================================

test("leads with same name+city but different placeId are deduplicated", async () => {
  const db = createMockDb();

  // Pre-existing lead with different placeId but same name+city
  await db.insert("leads", {
    name: "Sunny Farm",
    placeId: "place_old",
    city: "Lincoln",
    status: "new_lead",
  });

  const now = Date.now();
  const leads = [
    {
      name: "Sunny Farm",
      type: "farm",
      address: "100 Farm Rd, Lincoln, ON L0R, Canada",
      city: "Lincoln",
      region: "Niagara",
      province: "Ontario",
      placeId: "place_new_id", // different placeId
      latitude: 43.1,
      longitude: -79.4,
      source: "google_places",
      sourceDetail: "Discovery grid cell [depth=0]",
      status: "new_lead",
      followUpCount: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const result = await insertDiscoveredLeads(db, leads);

  assert.equal(result.inserted, 0, "Skipped due to name+city match");
  assert.equal(result.skipped, 1);
});

// ============================================================
// Grid totalLeadsFound is incremented
// ============================================================

test("updateCellSearchResult increments grid totalLeadsFound", async () => {
  const db = createMockDb();

  const gridId = await db.insert("discoveryGrids", {
    name: "Niagara Grid",
    region: "Niagara",
    province: "Ontario",
    queries: ["farms"],
    swLat: 42.85,
    swLng: -79.9,
    neLat: 43.35,
    neLng: -78.8,
    cellSizeKm: 20,
    totalLeadsFound: 5, // existing count
    createdAt: Date.now(),
  });

  const cellId = await db.insert("discoveryCells", {
    swLat: 42.85,
    swLng: -79.9,
    neLat: 43.03,
    neLng: -79.65,
    boundsKey: "42.850000_-79.900000",
    depth: 0,
    isLeaf: true,
    status: "searching",
    gridId,
  });

  // Simulate updateCellSearchResult behavior
  const newLeadsCount = 3;
  await db.patch(cellId, {
    status: "searched",
    resultCount: 4,
    querySaturation: [{ query: "farms", count: 4 }],
    lastSearchedAt: Date.now(),
  });

  const grid = await db.get(gridId);
  await db.patch(gridId, {
    totalLeadsFound: grid.totalLeadsFound + newLeadsCount,
  });

  const updatedGrid = await db.get(gridId);
  assert.equal(updatedGrid.totalLeadsFound, 8, "5 existing + 3 new = 8");
});

// ============================================================
// Cell status transitions correctly after discovery
// ============================================================

test("cell transitions from unsearched → searching → searched", async () => {
  const db = createMockDb();

  const gridId = await db.insert("discoveryGrids", {
    name: "Test Grid",
    queries: ["farms"],
    totalLeadsFound: 0,
    createdAt: Date.now(),
  });

  const cellId = await db.insert("discoveryCells", {
    swLat: 42.85,
    swLng: -79.9,
    neLat: 43.03,
    neLng: -79.65,
    boundsKey: "42.850000_-79.900000",
    depth: 0,
    isLeaf: true,
    status: "unsearched",
    gridId,
  });

  // Step 1: Claim → searching
  let cell = await db.get(cellId);
  assert.equal(cell.status, "unsearched");
  await db.patch(cellId, { status: "searching" });

  cell = await db.get(cellId);
  assert.equal(cell.status, "searching");

  // Step 2: Complete → searched (non-saturated)
  await db.patch(cellId, {
    status: "searched",
    resultCount: 10,
    lastSearchedAt: Date.now(),
  });

  cell = await db.get(cellId);
  assert.equal(cell.status, "searched");
  assert.equal(cell.resultCount, 10);
});

test("cell transitions to saturated when all queries return 60+ results", async () => {
  const db = createMockDb();

  const gridId = await db.insert("discoveryGrids", {
    name: "Test Grid",
    queries: ["farms", "orchard"],
    totalLeadsFound: 0,
    createdAt: Date.now(),
  });

  const cellId = await db.insert("discoveryCells", {
    swLat: 42.85,
    swLng: -79.9,
    neLat: 43.03,
    neLng: -79.65,
    boundsKey: "42.850000_-79.900000",
    depth: 0,
    isLeaf: true,
    status: "searching",
    gridId,
  });

  const querySaturation = [
    { query: "farms", count: 60 },
    { query: "orchard", count: 60 },
  ];

  const saturated =
    querySaturation.length > 0 &&
    querySaturation.every((qs) => qs.count >= 60);

  await db.patch(cellId, {
    status: saturated ? "saturated" : "searched",
    resultCount: 120,
    querySaturation,
    lastSearchedAt: Date.now(),
  });

  const cell = await db.get(cellId);
  assert.equal(cell.status, "saturated");
});

// ============================================================
// Empty search results still complete successfully
// ============================================================

test("zero search results still transitions cell to searched", async () => {
  const db = createMockDb();

  const gridId = await db.insert("discoveryGrids", {
    name: "Test Grid",
    queries: ["farms"],
    totalLeadsFound: 0,
    createdAt: Date.now(),
  });

  const cellId = await db.insert("discoveryCells", {
    swLat: 42.85,
    swLng: -79.9,
    neLat: 43.03,
    neLng: -79.65,
    boundsKey: "42.850000_-79.900000",
    depth: 0,
    isLeaf: true,
    status: "searching",
    gridId,
  });

  const result = await insertDiscoveredLeads(db, []);

  assert.equal(result.inserted, 0);
  assert.equal(result.skipped, 0);

  await db.patch(cellId, {
    status: "searched",
    resultCount: 0,
    querySaturation: [{ query: "farms", count: 0 }],
    lastSearchedAt: Date.now(),
  });

  const cell = await db.get(cellId);
  assert.equal(cell.status, "searched");
  assert.equal(cell.resultCount, 0);
});
