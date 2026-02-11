import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

// ============================================================
// Re-searching a "searched" cell: updates counts, finds new
// leads if queries changed, deduplicates existing leads.
// ============================================================

const discoverCellSource = fs.readFileSync(
  "convex/discovery/discoverCell.ts",
  "utf8",
);
const gridCellsSource = fs.readFileSync(
  "convex/discovery/gridCells.ts",
  "utf8",
);
const discoverLeadsSource = fs.readFileSync(
  "convex/discovery/discoverLeads.ts",
  "utf8",
);

// ============================================================
// Source verification: re-search is accepted at every gate
// ============================================================

test("requestDiscoverCell accepts 'searched' status", () => {
  const block = discoverCellSource.slice(
    discoverCellSource.indexOf("requestDiscoverCell"),
  );
  // The guard condition allows searched cells through
  assert.match(block, /status\s*!==\s*"unsearched"\s*&&\s*cell\.status\s*!==\s*"searched"/);
});

test("discoverCell passes 'searched' in expectedStatuses to claimCellForSearch", () => {
  assert.match(
    discoverCellSource,
    /expectedStatuses:\s*\["unsearched",\s*"searched"\]/,
  );
});

test("claimCellForSearch uses includes() so 'searched' passes validation", () => {
  const block = gridCellsSource.slice(
    gridCellsSource.indexOf("claimCellForSearch"),
  );
  assert.match(block, /args\.expectedStatuses\.includes\(cell\.status\)/);
});

test("claimCellForSearch captures previousStatus for rollback on re-search", () => {
  const block = gridCellsSource.slice(
    gridCellsSource.indexOf("claimCellForSearch"),
  );
  assert.match(block, /const\s+previousStatus\s*=\s*cell\.status/);
  assert.match(block, /return\s*\{\s*previousStatus\s*\}/);
});

// ============================================================
// Source verification: updateCellSearchResult overwrites fields
// ============================================================

test("updateCellSearchResult patches resultCount (overwrites old count)", () => {
  const block = gridCellsSource.slice(
    gridCellsSource.indexOf("updateCellSearchResult"),
  );
  assert.match(block, /resultCount:\s*args\.resultCount/);
});

test("updateCellSearchResult patches querySaturation (overwrites old data)", () => {
  const block = gridCellsSource.slice(
    gridCellsSource.indexOf("updateCellSearchResult"),
  );
  assert.match(block, /querySaturation:\s*args\.querySaturation/);
});

test("updateCellSearchResult patches lastSearchedAt (timestamp updates)", () => {
  const block = gridCellsSource.slice(
    gridCellsSource.indexOf("updateCellSearchResult"),
  );
  assert.match(block, /lastSearchedAt:\s*args\.lastSearchedAt/);
});

test("updateCellSearchResult increments grid totalLeadsFound by newLeadsCount", () => {
  const block = gridCellsSource.slice(
    gridCellsSource.indexOf("updateCellSearchResult"),
  );
  assert.match(block, /totalLeadsFound:\s*grid\.totalLeadsFound\s*\+\s*args\.newLeadsCount/);
});

// ============================================================
// Source verification: lead deduplication on re-search
// ============================================================

test("insertDiscoveredLeads deduplicates by placeId index", () => {
  assert.match(discoverLeadsSource, /by_placeId/);
  assert.match(discoverLeadsSource, /existingByPlaceId/);
});

test("insertDiscoveredLeads deduplicates by name+city as fallback", () => {
  assert.match(discoverLeadsSource, /by_name/);
  assert.match(discoverLeadsSource, /lead\.city/);
});

test("insertDiscoveredLeads tracks inserted vs skipped counts", () => {
  assert.match(discoverLeadsSource, /inserted\s*\+=/);
  assert.match(discoverLeadsSource, /skipped\s*\+=/);
  assert.match(discoverLeadsSource, /return\s*\{\s*inserted,\s*skipped\s*\}/);
});

// ============================================================
// Behavioral: full re-search lifecycle with mock db
// ============================================================

const GOOGLE_MAX_RESULTS = 60;

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
  };
}

async function seedGridAndCell(db, overrides = {}) {
  const gridId = await db.insert("discoveryGrids", {
    name: "Test Grid",
    region: "Niagara",
    province: "Ontario",
    queries: ["farms", "farmers market", "orchard"],
    swLat: 42.85,
    swLng: -79.9,
    neLat: 43.35,
    neLng: -78.8,
    cellSizeKm: 20,
    totalLeadsFound: 0,
    createdAt: Date.now(),
    ...overrides.grid,
  });

  const cellId = await db.insert("discoveryCells", {
    swLat: 42.85,
    swLng: -79.9,
    neLat: 43.03,
    neLng: -79.65,
    depth: 0,
    isLeaf: true,
    status: "unsearched",
    gridId,
    ...overrides.cell,
  });

  return { gridId, cellId };
}

async function claimCellForSearch(db, cellId, expectedStatuses) {
  const cell = await db.get(cellId);
  if (!cell) throw new Error("Cell not found");
  if (!expectedStatuses.includes(cell.status)) {
    throw new Error(
      `Cell status is "${cell.status}", expected one of: ${expectedStatuses.join(", ")}`,
    );
  }
  const previousStatus = cell.status;
  await db.patch(cellId, { status: "searching" });
  return { previousStatus };
}

async function updateCellSearchResult(db, args) {
  const cell = await db.get(args.cellId);
  if (!cell) throw new Error("Cell not found");
  await db.patch(args.cellId, {
    status: args.status,
    resultCount: args.resultCount,
    querySaturation: args.querySaturation,
    lastSearchedAt: args.lastSearchedAt,
  });
  const grid = await db.get(cell.gridId);
  if (!grid) throw new Error("Grid not found");
  await db.patch(cell.gridId, {
    totalLeadsFound: grid.totalLeadsFound + args.newLeadsCount,
  });
}

function determineStatus(querySaturation) {
  const saturated =
    querySaturation.length > 0 &&
    querySaturation.every((qs) => qs.count >= GOOGLE_MAX_RESULTS);
  return saturated ? "saturated" : "searched";
}

// ============================================================
// Re-search updates resultCount and querySaturation
// ============================================================

test("re-search overwrites resultCount with new value", async () => {
  const db = createMockDb();
  const { cellId } = await seedGridAndCell(db, {
    cell: {
      status: "searched",
      resultCount: 10,
      querySaturation: [
        { query: "farms", count: 10 },
        { query: "farmers market", count: 5 },
        { query: "orchard", count: 2 },
      ],
      lastSearchedAt: 1000,
    },
  });

  await claimCellForSearch(db, cellId, ["unsearched", "searched"]);

  const newQs = [
    { query: "farms", count: 18 },
    { query: "farmers market", count: 12 },
    { query: "orchard", count: 5 },
  ];

  await updateCellSearchResult(db, {
    cellId,
    status: determineStatus(newQs),
    resultCount: 25,
    querySaturation: newQs,
    lastSearchedAt: 2000,
    newLeadsCount: 15,
  });

  const cell = await db.get(cellId);
  assert.equal(cell.resultCount, 25, "resultCount updated to new value");
  assert.deepEqual(cell.querySaturation, newQs, "querySaturation replaced");
  assert.equal(cell.lastSearchedAt, 2000, "lastSearchedAt updated");
});

// ============================================================
// Re-search finds new leads when queries change
// ============================================================

test("re-search with changed queries updates querySaturation entries", async () => {
  const db = createMockDb();
  const { cellId } = await seedGridAndCell(db, {
    cell: {
      status: "searched",
      resultCount: 8,
      querySaturation: [
        { query: "farms", count: 5 },
        { query: "farmers market", count: 3 },
      ],
    },
  });

  await claimCellForSearch(db, cellId, ["unsearched", "searched"]);

  // Queries changed: now includes "organic farm" instead of "farmers market"
  const newQs = [
    { query: "farms", count: 12 },
    { query: "organic farm", count: 8 },
  ];

  await updateCellSearchResult(db, {
    cellId,
    status: determineStatus(newQs),
    resultCount: 15,
    querySaturation: newQs,
    lastSearchedAt: Date.now(),
    newLeadsCount: 7,
  });

  const cell = await db.get(cellId);
  assert.equal(cell.status, "searched");
  assert.equal(cell.resultCount, 15);
  const queryNames = cell.querySaturation.map((qs) => qs.query);
  assert.ok(queryNames.includes("organic farm"), "new query appears in saturation");
  assert.ok(!queryNames.includes("farmers market"), "old query replaced");
});

// ============================================================
// Re-search increments grid totalLeadsFound only for new leads
// ============================================================

test("re-search increments totalLeadsFound by only new (non-duplicate) leads", async () => {
  const db = createMockDb();
  const { gridId, cellId } = await seedGridAndCell(db, {
    cell: { status: "searched", resultCount: 10 },
    grid: { totalLeadsFound: 50 },
  });

  await claimCellForSearch(db, cellId, ["unsearched", "searched"]);

  // Of 20 in-bounds results, 15 are duplicates and 5 are new
  await updateCellSearchResult(db, {
    cellId,
    status: "searched",
    resultCount: 20,
    querySaturation: [{ query: "farms", count: 20 }],
    lastSearchedAt: Date.now(),
    newLeadsCount: 5,
  });

  const grid = await db.get(gridId);
  assert.equal(grid.totalLeadsFound, 55, "50 + 5 new leads");
});

test("re-search with all duplicates increments totalLeadsFound by 0", async () => {
  const db = createMockDb();
  const { gridId, cellId } = await seedGridAndCell(db, {
    cell: { status: "searched", resultCount: 10 },
    grid: { totalLeadsFound: 50 },
  });

  await claimCellForSearch(db, cellId, ["unsearched", "searched"]);

  await updateCellSearchResult(db, {
    cellId,
    status: "searched",
    resultCount: 10,
    querySaturation: [{ query: "farms", count: 10 }],
    lastSearchedAt: Date.now(),
    newLeadsCount: 0,
  });

  const grid = await db.get(gridId);
  assert.equal(grid.totalLeadsFound, 50, "unchanged when all leads are duplicates");
});

// ============================================================
// Re-search can transition searched -> saturated
// ============================================================

test("re-search transitions cell to 'saturated' when all queries now hit 60", async () => {
  const db = createMockDb();
  const { cellId } = await seedGridAndCell(db, {
    cell: {
      status: "searched",
      resultCount: 10,
      querySaturation: [
        { query: "farms", count: 10 },
        { query: "farmers market", count: 8 },
      ],
    },
  });

  await claimCellForSearch(db, cellId, ["unsearched", "searched"]);

  const newQs = [
    { query: "farms", count: 60 },
    { query: "farmers market", count: 60 },
  ];

  await updateCellSearchResult(db, {
    cellId,
    status: determineStatus(newQs),
    resultCount: 85,
    querySaturation: newQs,
    lastSearchedAt: Date.now(),
    newLeadsCount: 75,
  });

  const cell = await db.get(cellId);
  assert.equal(cell.status, "saturated");
});

// ============================================================
// Re-search stays searched when still not saturated
// ============================================================

test("re-search keeps cell 'searched' when queries still below 60", async () => {
  const db = createMockDb();
  const { cellId } = await seedGridAndCell(db, {
    cell: {
      status: "searched",
      resultCount: 10,
      querySaturation: [
        { query: "farms", count: 10 },
        { query: "orchard", count: 5 },
      ],
    },
  });

  await claimCellForSearch(db, cellId, ["unsearched", "searched"]);

  const newQs = [
    { query: "farms", count: 15 },
    { query: "orchard", count: 9 },
  ];

  await updateCellSearchResult(db, {
    cellId,
    status: determineStatus(newQs),
    resultCount: 18,
    querySaturation: newQs,
    lastSearchedAt: Date.now(),
    newLeadsCount: 8,
  });

  const cell = await db.get(cellId);
  assert.equal(cell.status, "searched");
});

// ============================================================
// Re-search failure rolls back to 'searched' (not 'unsearched')
// ============================================================

test("failure during re-search rolls cell back to 'searched'", async () => {
  const db = createMockDb();
  const { cellId } = await seedGridAndCell(db, {
    cell: { status: "searched", resultCount: 10 },
  });

  const { previousStatus } = await claimCellForSearch(db, cellId, [
    "unsearched",
    "searched",
  ]);
  assert.equal(previousStatus, "searched");

  let cell = await db.get(cellId);
  assert.equal(cell.status, "searching");

  // Simulate failure — rollback to previousStatus
  await db.patch(cellId, { status: previousStatus });

  cell = await db.get(cellId);
  assert.equal(cell.status, "searched", "rolled back to searched, not unsearched");
});

// ============================================================
// Cannot re-search a cell that is currently searching
// ============================================================

test("cannot claim a cell already in 'searching' status", async () => {
  const db = createMockDb();
  const { cellId } = await seedGridAndCell(db, {
    cell: { status: "searching" },
  });

  await assert.rejects(
    () => claimCellForSearch(db, cellId, ["unsearched", "searched"]),
    /Cell status is "searching"/,
  );
});

// ============================================================
// Lead deduplication behavioral test
// ============================================================

test("insertDiscoveredLeads skips leads with existing placeId on re-search", async () => {
  // Simulate the dedup logic from insertDiscoveredLeads
  const existingLeads = new Map();
  existingLeads.set("place_AAA", { name: "Farm A", placeId: "place_AAA" });
  existingLeads.set("place_BBB", { name: "Farm B", placeId: "place_BBB" });

  const incomingLeads = [
    { name: "Farm A", placeId: "place_AAA" },  // existing — skip
    { name: "Farm B", placeId: "place_BBB" },  // existing — skip
    { name: "Farm C", placeId: "place_CCC" },  // new — insert
    { name: "Farm D", placeId: "place_DDD" },  // new — insert
  ];

  let inserted = 0;
  let skipped = 0;

  for (const lead of incomingLeads) {
    if (existingLeads.has(lead.placeId)) {
      skipped++;
    } else {
      existingLeads.set(lead.placeId, lead);
      inserted++;
    }
  }

  assert.equal(inserted, 2, "only truly new leads are inserted");
  assert.equal(skipped, 2, "existing leads are skipped");
  assert.equal(existingLeads.size, 4, "total leads after re-search");
});
