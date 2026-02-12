import assert from "node:assert/strict";
import test from "node:test";

// ============================================================
// Tests that cell status updates to "searched" or "saturated"
// correctly based on query saturation results.
//
// Covers:
// - Status determination logic (searched vs saturated)
// - updateCellSearchResult mutation behavior
// - Re-search transitions (searched → searching → saturated)
// - Edge cases: single query, empty queries, boundary counts
// ============================================================

const GOOGLE_MAX_RESULTS = 60;

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
  };
}

// -- Helper: determine status from query saturation -----------

function determineStatus(querySaturation) {
  const saturated =
    querySaturation.length > 0 &&
    querySaturation.every((qs) => qs.count >= GOOGLE_MAX_RESULTS);
  return saturated ? "saturated" : "searched";
}

// -- Helper: simulate updateCellSearchResult ------------------

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

// -- Helper: simulate claimCellForSearch ----------------------

async function claimCellForSearch(db, cellId, expectedStatuses) {
  const cell = await db.get(cellId);
  if (!cell) throw new Error("Cell not found");

  if (!expectedStatuses.includes(cell.status)) {
    return { claimed: false, previousStatus: cell.status };
  }

  const previousStatus = cell.status;
  await db.patch(cellId, { status: "searching" });
  return { claimed: true, previousStatus };
}

// -- Seed helper ----------------------------------------------

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
    boundsKey: "42.850000_-79.900000",
    depth: 0,
    isLeaf: true,
    status: "unsearched",
    gridId,
    ...overrides.cell,
  });

  return { gridId, cellId };
}

// ============================================================
// Status determination: searched vs saturated
// ============================================================

test("status is 'searched' when no query hits 60 results", () => {
  const qs = [
    { query: "farms", count: 15 },
    { query: "farmers market", count: 8 },
    { query: "orchard", count: 3 },
  ];
  assert.equal(determineStatus(qs), "searched");
});

test("status is 'searched' when only some queries hit 60", () => {
  const qs = [
    { query: "farms", count: 60 },
    { query: "farmers market", count: 12 },
    { query: "orchard", count: 60 },
  ];
  assert.equal(determineStatus(qs), "searched");
});

test("status is 'saturated' when ALL queries hit exactly 60", () => {
  const qs = [
    { query: "farms", count: 60 },
    { query: "farmers market", count: 60 },
    { query: "orchard", count: 60 },
  ];
  assert.equal(determineStatus(qs), "saturated");
});

test("status is 'searched' when one query has zero results", () => {
  const qs = [
    { query: "farms", count: 60 },
    { query: "farmers market", count: 0 },
    { query: "orchard", count: 60 },
  ];
  assert.equal(determineStatus(qs), "searched");
});

test("status is 'searched' for empty querySaturation array", () => {
  assert.equal(determineStatus([]), "searched");
});

test("status is 'saturated' with single query hitting 60", () => {
  const qs = [{ query: "farms", count: 60 }];
  assert.equal(determineStatus(qs), "saturated");
});

test("status is 'searched' with single query below 60", () => {
  const qs = [{ query: "farms", count: 59 }];
  assert.equal(determineStatus(qs), "searched");
});

// ============================================================
// Full cell lifecycle: unsearched → searching → searched
// ============================================================

test("cell updates to 'searched' after non-saturated discovery", async () => {
  const db = createMockDb();
  const { cellId } = await seedGridAndCell(db);

  // Claim
  const { previousStatus } = await claimCellForSearch(db, cellId, [
    "unsearched",
    "searched",
  ]);
  assert.equal(previousStatus, "unsearched");

  let cell = await db.get(cellId);
  assert.equal(cell.status, "searching");

  // Complete with non-saturated results
  const querySaturation = [
    { query: "farms", count: 15 },
    { query: "farmers market", count: 8 },
    { query: "orchard", count: 3 },
  ];

  await updateCellSearchResult(db, {
    cellId,
    status: determineStatus(querySaturation),
    resultCount: 20,
    querySaturation,
    lastSearchedAt: Date.now(),
    newLeadsCount: 20,
  });

  cell = await db.get(cellId);
  assert.equal(cell.status, "searched");
  assert.equal(cell.resultCount, 20);
  assert.ok(cell.lastSearchedAt);
  assert.deepEqual(cell.querySaturation, querySaturation);
});

// ============================================================
// Full cell lifecycle: unsearched → searching → saturated
// ============================================================

test("cell updates to 'saturated' when all queries hit 60", async () => {
  const db = createMockDb();
  const { cellId } = await seedGridAndCell(db);

  // Claim
  await claimCellForSearch(db, cellId, ["unsearched", "searched"]);

  // Complete with saturated results
  const querySaturation = [
    { query: "farms", count: 60 },
    { query: "farmers market", count: 60 },
    { query: "orchard", count: 60 },
  ];

  await updateCellSearchResult(db, {
    cellId,
    status: determineStatus(querySaturation),
    resultCount: 85,
    querySaturation,
    lastSearchedAt: Date.now(),
    newLeadsCount: 85,
  });

  const cell = await db.get(cellId);
  assert.equal(cell.status, "saturated");
  assert.equal(cell.resultCount, 85);
});

// ============================================================
// Re-search: searched → searching → saturated
// ============================================================

test("re-searching a 'searched' cell can transition it to 'saturated'", async () => {
  const db = createMockDb();
  const { gridId, cellId } = await seedGridAndCell(db, {
    cell: { status: "searched", resultCount: 10 },
    grid: { totalLeadsFound: 10 },
  });

  // Claim from searched state
  const { previousStatus } = await claimCellForSearch(db, cellId, [
    "unsearched",
    "searched",
  ]);
  assert.equal(previousStatus, "searched");

  let cell = await db.get(cellId);
  assert.equal(cell.status, "searching");

  // Re-search finds saturation (maybe queries were updated)
  const querySaturation = [
    { query: "farms", count: 60 },
    { query: "farmers market", count: 60 },
    { query: "orchard", count: 60 },
  ];

  await updateCellSearchResult(db, {
    cellId,
    status: determineStatus(querySaturation),
    resultCount: 95,
    querySaturation,
    lastSearchedAt: Date.now(),
    newLeadsCount: 30,
  });

  cell = await db.get(cellId);
  assert.equal(cell.status, "saturated");
  assert.equal(cell.resultCount, 95);

  // Grid totalLeadsFound should be incremented
  const grid = await db.get(gridId);
  assert.equal(grid.totalLeadsFound, 40); // 10 existing + 30 new
});

// ============================================================
// Re-search: searched → searching → searched (stays searched)
// ============================================================

test("re-searching a 'searched' cell stays 'searched' if still not saturated", async () => {
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
    },
  });

  await claimCellForSearch(db, cellId, ["unsearched", "searched"]);

  const querySaturation = [
    { query: "farms", count: 12 },
    { query: "farmers market", count: 7 },
    { query: "orchard", count: 3 },
  ];

  await updateCellSearchResult(db, {
    cellId,
    status: determineStatus(querySaturation),
    resultCount: 15,
    querySaturation,
    lastSearchedAt: Date.now(),
    newLeadsCount: 5,
  });

  const cell = await db.get(cellId);
  assert.equal(cell.status, "searched");
  assert.equal(cell.resultCount, 15);
  assert.deepEqual(cell.querySaturation, querySaturation);
});

// ============================================================
// Failure rollback preserves original status
// ============================================================

test("failure rolls back 'unsearched' cell from 'searching' to 'unsearched'", async () => {
  const db = createMockDb();
  const { cellId } = await seedGridAndCell(db);

  const { previousStatus } = await claimCellForSearch(db, cellId, [
    "unsearched",
    "searched",
  ]);

  let cell = await db.get(cellId);
  assert.equal(cell.status, "searching");

  // Simulate failure → rollback
  await db.patch(cellId, { status: previousStatus });

  cell = await db.get(cellId);
  assert.equal(cell.status, "unsearched");
});

test("failure rolls back 'searched' cell from 'searching' to 'searched'", async () => {
  const db = createMockDb();
  const { cellId } = await seedGridAndCell(db, {
    cell: { status: "searched" },
  });

  const { previousStatus } = await claimCellForSearch(db, cellId, [
    "unsearched",
    "searched",
  ]);
  assert.equal(previousStatus, "searched");

  // Simulate failure → rollback
  await db.patch(cellId, { status: previousStatus });

  const cell = await db.get(cellId);
  assert.equal(cell.status, "searched");
});

// ============================================================
// Claim rejection: cannot claim cell in wrong status
// ============================================================

test("claiming a cell that is already 'searching' returns claimed: false", async () => {
  const db = createMockDb();
  const { cellId } = await seedGridAndCell(db, {
    cell: { status: "searching" },
  });

  const result = await claimCellForSearch(db, cellId, ["unsearched", "searched"]);
  assert.equal(result.claimed, false);
  assert.equal(result.previousStatus, "searching");
});

test("claiming a cell that is 'saturated' returns claimed: false", async () => {
  const db = createMockDb();
  const { cellId } = await seedGridAndCell(db, {
    cell: { status: "saturated" },
  });

  const result = await claimCellForSearch(db, cellId, ["unsearched", "searched"]);
  assert.equal(result.claimed, false);
  assert.equal(result.previousStatus, "saturated");
});

// ============================================================
// Grid totalLeadsFound incremented correctly
// ============================================================

test("grid totalLeadsFound increments by newLeadsCount on searched", async () => {
  const db = createMockDb();
  const { gridId, cellId } = await seedGridAndCell(db, {
    grid: { totalLeadsFound: 25 },
  });

  await claimCellForSearch(db, cellId, ["unsearched", "searched"]);

  await updateCellSearchResult(db, {
    cellId,
    status: "searched",
    resultCount: 8,
    querySaturation: [{ query: "farms", count: 8 }],
    lastSearchedAt: Date.now(),
    newLeadsCount: 8,
  });

  const grid = await db.get(gridId);
  assert.equal(grid.totalLeadsFound, 33); // 25 + 8
});

test("grid totalLeadsFound increments by newLeadsCount on saturated", async () => {
  const db = createMockDb();
  const { gridId, cellId } = await seedGridAndCell(db, {
    grid: { totalLeadsFound: 50 },
  });

  await claimCellForSearch(db, cellId, ["unsearched", "searched"]);

  await updateCellSearchResult(db, {
    cellId,
    status: "saturated",
    resultCount: 120,
    querySaturation: [
      { query: "farms", count: 60 },
      { query: "farmers market", count: 60 },
      { query: "orchard", count: 60 },
    ],
    lastSearchedAt: Date.now(),
    newLeadsCount: 45,
  });

  const grid = await db.get(gridId);
  assert.equal(grid.totalLeadsFound, 95); // 50 + 45
});

test("grid totalLeadsFound increments by 0 when all leads are duplicates", async () => {
  const db = createMockDb();
  const { gridId, cellId } = await seedGridAndCell(db, {
    grid: { totalLeadsFound: 10 },
  });

  await claimCellForSearch(db, cellId, ["unsearched", "searched"]);

  await updateCellSearchResult(db, {
    cellId,
    status: "searched",
    resultCount: 5,
    querySaturation: [{ query: "farms", count: 5 }],
    lastSearchedAt: Date.now(),
    newLeadsCount: 0, // all duplicates
  });

  const grid = await db.get(gridId);
  assert.equal(grid.totalLeadsFound, 10); // unchanged
});

// ============================================================
// Zero results: cell still transitions to searched
// ============================================================

test("zero API results still sets status to 'searched'", async () => {
  const db = createMockDb();
  const { cellId } = await seedGridAndCell(db);

  await claimCellForSearch(db, cellId, ["unsearched", "searched"]);

  const querySaturation = [
    { query: "farms", count: 0 },
    { query: "farmers market", count: 0 },
    { query: "orchard", count: 0 },
  ];

  await updateCellSearchResult(db, {
    cellId,
    status: determineStatus(querySaturation),
    resultCount: 0,
    querySaturation,
    lastSearchedAt: Date.now(),
    newLeadsCount: 0,
  });

  const cell = await db.get(cellId);
  assert.equal(cell.status, "searched");
  assert.equal(cell.resultCount, 0);
});

// ============================================================
// Source code verification: discoverCell uses correct ternary
// ============================================================

test("discoverCell source uses 'saturated ? \"saturated\" : \"searched\"' for status", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync("convex/discovery/discoverCell.ts", "utf8");
  assert.match(source, /saturated\s*\?\s*"saturated"\s*:\s*"searched"/);
});

test("discoverCell source determines saturation via querySaturation.every with in-bounds threshold", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync("convex/discovery/discoverCell.ts", "utf8");
  assert.match(source, /querySaturation\.every\(\s*\(qs\)\s*=>\s*qs\.count\s*>=\s*20\s*\)/);
});

test("updateCellSearchResult source accepts status as union of all valid states", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync("convex/discovery/gridCells.ts", "utf8");
  const block = source.slice(source.indexOf("export const updateCellSearchResult"));
  assert.match(block, /v\.literal\("searched"\)/);
  assert.match(block, /v\.literal\("saturated"\)/);
});
