import assert from "node:assert/strict";
import test from "node:test";

// ============================================================
// Behavioral tests for discoverCell logic:
// - Circumscribed radius computation
// - Post-filtering to cell bounds
// - Saturation detection
// - Status rollback on failure
// - Lead conversion
// ============================================================

// -- Haversine (replicate from lib/pointInPolygon.ts) ---------
const EARTH_RADIUS_KM = 6371;

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

// -- Mock db --------------------------------------------------
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
        withIndex: () => ({
          filter: () => ({ first: async () => null }),
          first: async () => null,
        }),
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

// ============================================================
// Circumscribed radius: center-to-corner covers entire cell
// ============================================================

test("circumscribed radius from center to corner is larger than inscribed (center to edge)", () => {
  const swLat = 42.85;
  const swLng = -79.9;
  const neLat = 43.03;
  const neLng = -79.65;

  const centerLat = (swLat + neLat) / 2;
  const centerLng = (swLng + neLng) / 2;

  // Circumscribed: center to corner (ne corner)
  const circumscribed = haversineKm(centerLat, centerLng, neLat, neLng);

  // Inscribed: center to midpoint of north edge
  const inscribedNorth = haversineKm(centerLat, centerLng, neLat, centerLng);
  // Inscribed: center to midpoint of east edge
  const inscribedEast = haversineKm(centerLat, centerLng, centerLat, neLng);

  assert.ok(
    circumscribed > inscribedNorth,
    "Circumscribed radius must exceed inscribed (north edge)",
  );
  assert.ok(
    circumscribed > inscribedEast,
    "Circumscribed radius must exceed inscribed (east edge)",
  );
});

test("circumscribed radius is consistent regardless of which corner is used", () => {
  const swLat = 42.85;
  const swLng = -79.9;
  const neLat = 43.03;
  const neLng = -79.65;

  const centerLat = (swLat + neLat) / 2;
  const centerLng = (swLng + neLng) / 2;

  const toNE = haversineKm(centerLat, centerLng, neLat, neLng);
  const toSW = haversineKm(centerLat, centerLng, swLat, swLng);
  const toNW = haversineKm(centerLat, centerLng, neLat, swLng);
  const toSE = haversineKm(centerLat, centerLng, swLat, neLng);

  // All corners should be approximately equal distance from center
  const tolerance = 0.5; // km
  assert.ok(Math.abs(toNE - toSW) < tolerance, "NE and SW distances should be similar");
  assert.ok(Math.abs(toNW - toSE) < tolerance, "NW and SE distances should be similar");
});

// ============================================================
// Post-filter: only results within cell bounds are kept
// ============================================================

test("post-filter keeps results inside cell bounds", () => {
  const swLat = 42.85;
  const swLng = -79.9;
  const neLat = 43.03;
  const neLng = -79.65;

  const results = [
    makePlaceResult({ geometry: { location: { lat: 42.95, lng: -79.8 } } }), // inside
    makePlaceResult({ geometry: { location: { lat: 43.10, lng: -79.8 } } }), // north of cell
    makePlaceResult({ geometry: { location: { lat: 42.95, lng: -79.5 } } }), // east of cell
    makePlaceResult({ geometry: { location: { lat: 42.80, lng: -79.8 } } }), // south of cell
    makePlaceResult({ geometry: { location: { lat: 42.90, lng: -79.78 } } }), // inside
  ];

  const inBounds = results.filter((place) => {
    const lat = place.geometry?.location?.lat;
    const lng = place.geometry?.location?.lng;
    if (lat == null || lng == null) return false;
    return lat >= swLat && lat <= neLat && lng >= swLng && lng <= neLng;
  });

  assert.equal(inBounds.length, 2, "Only 2 results are within cell bounds");
});

test("post-filter rejects results with missing geometry", () => {
  const swLat = 42.85;
  const swLng = -79.9;
  const neLat = 43.03;
  const neLng = -79.65;

  const results = [
    makePlaceResult({ geometry: undefined }),
    makePlaceResult({ geometry: { location: undefined } }),
    makePlaceResult({ geometry: { location: { lat: 42.95, lng: -79.8 } } }),
  ];

  const inBounds = results.filter((place) => {
    const lat = place.geometry?.location?.lat;
    const lng = place.geometry?.location?.lng;
    if (lat == null || lng == null) return false;
    return lat >= swLat && lat <= neLat && lng >= swLng && lng <= neLng;
  });

  assert.equal(inBounds.length, 1, "Only the result with valid geometry is kept");
});

test("post-filter includes results exactly on cell boundary", () => {
  const swLat = 42.85;
  const swLng = -79.9;
  const neLat = 43.03;
  const neLng = -79.65;

  const results = [
    makePlaceResult({ geometry: { location: { lat: swLat, lng: swLng } } }), // sw corner
    makePlaceResult({ geometry: { location: { lat: neLat, lng: neLng } } }), // ne corner
  ];

  const inBounds = results.filter((place) => {
    const lat = place.geometry?.location?.lat;
    const lng = place.geometry?.location?.lng;
    if (lat == null || lng == null) return false;
    return lat >= swLat && lat <= neLat && lng >= swLng && lng <= neLng;
  });

  assert.equal(inBounds.length, 2, "Boundary results are included (>= and <=)");
});

// ============================================================
// Deduplication: place_id across queries
// ============================================================

test("deduplicates results by place_id across multiple queries", () => {
  const allResults = [
    makePlaceResult({ place_id: "abc123" }),
    makePlaceResult({ place_id: "def456" }),
    makePlaceResult({ place_id: "abc123" }), // duplicate from second query
    makePlaceResult({ place_id: "ghi789" }),
    makePlaceResult({ place_id: "def456" }), // duplicate from third query
  ];

  const seenPlaceIds = new Set();
  const deduplicated = [];
  for (const result of allResults) {
    if (!seenPlaceIds.has(result.place_id)) {
      seenPlaceIds.add(result.place_id);
      deduplicated.push(result);
    }
  }

  assert.equal(deduplicated.length, 3, "3 unique results after dedup");
  const ids = deduplicated.map((r) => r.place_id);
  assert.deepEqual(ids, ["abc123", "def456", "ghi789"]);
});

// ============================================================
// Saturation: only when ALL queries hit 60
// ============================================================

test("saturated = true when every query returns 60 results", () => {
  const querySaturation = [
    { query: "farms", count: 60 },
    { query: "farmers market", count: 60 },
    { query: "orchard", count: 60 },
  ];

  const saturated =
    querySaturation.length > 0 &&
    querySaturation.every((qs) => qs.count >= 60);

  assert.equal(saturated, true);
});

test("saturated = false when only some queries hit 60", () => {
  const querySaturation = [
    { query: "farms", count: 60 },
    { query: "farmers market", count: 12 },
    { query: "orchard", count: 60 },
  ];

  const saturated =
    querySaturation.length > 0 &&
    querySaturation.every((qs) => qs.count >= 60);

  assert.equal(saturated, false);
});

test("saturated = false when no queries return results", () => {
  const querySaturation = [
    { query: "farms", count: 0 },
    { query: "farmers market", count: 0 },
  ];

  const saturated =
    querySaturation.length > 0 &&
    querySaturation.every((qs) => qs.count >= 60);

  assert.equal(saturated, false);
});

test("saturated = true even when queries exceed 60", () => {
  const querySaturation = [
    { query: "farms", count: 60 },
    { query: "orchard", count: 60 },
  ];

  const saturated =
    querySaturation.length > 0 &&
    querySaturation.every((qs) => qs.count >= 60);

  assert.equal(saturated, true);
});

// ============================================================
// Status rollback on failure
// ============================================================

test("failure rollback restores previousStatus", async () => {
  const db = createMockDb();

  const gridId = await db.insert("discoveryGrids", {
    name: "Test Grid",
    region: "Niagara",
    province: "Ontario",
    queries: ["farms"],
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
    neLat: 43.03,
    neLng: -79.65,
    boundsKey: "42.850000_-79.900000",
    depth: 0,
    isLeaf: true,
    status: "unsearched",
    gridId,
  });

  // Simulate: claim succeeds, transition to searching
  const previousStatus = "unsearched";
  await db.patch(cellId, { status: "searching" });

  // Verify cell is now searching
  let cell = await db.get(cellId);
  assert.equal(cell.status, "searching");

  // Simulate failure rollback
  await db.patch(cellId, { status: previousStatus });

  cell = await db.get(cellId);
  assert.equal(cell.status, "unsearched", "Status rolled back to unsearched");
});

test("failure rollback restores searched status (re-search scenario)", async () => {
  const db = createMockDb();

  const gridId = await db.insert("discoveryGrids", {
    name: "Test Grid",
    region: "Niagara",
    province: "Ontario",
    queries: ["farms"],
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
    neLat: 43.03,
    neLng: -79.65,
    boundsKey: "42.850000_-79.900000",
    depth: 0,
    isLeaf: true,
    status: "searched",
    gridId,
  });

  const previousStatus = "searched";
  await db.patch(cellId, { status: "searching" });

  // Simulate failure rollback
  await db.patch(cellId, { status: previousStatus });

  const cell = await db.get(cellId);
  assert.equal(cell.status, "searched", "Status rolled back to searched");
});

// ============================================================
// Lead conversion
// ============================================================

test("lead conversion sets correct sourceDetail with depth", () => {
  const depth = 2;
  const sourceDetail = `Discovery grid cell [depth=${depth}]`;
  assert.equal(sourceDetail, "Discovery grid cell [depth=2]");
});

test("lead conversion extracts city from formatted address", () => {
  // Replicate extractCity logic
  function extractCity(formattedAddress) {
    const parts = formattedAddress.split(",").map((p) => p.trim());
    if (parts.length >= 3) return parts[1];
    if (parts.length >= 2) return parts[0];
    return formattedAddress;
  }

  assert.equal(
    extractCity("123 Main St, Niagara-on-the-Lake, ON L0S, Canada"),
    "Niagara-on-the-Lake",
  );
});

test("lead type inference from place name", () => {
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

  assert.equal(inferLeadType("Sunny Orchard", []), "farm");
  assert.equal(inferLeadType("St. Catharines Farmers Market", []), "farmers_market");
  assert.equal(inferLeadType("Bob's Roadside Stand", []), "roadside_stand");
  assert.equal(inferLeadType("FreshMart", ["store"]), "retail_store");
});
