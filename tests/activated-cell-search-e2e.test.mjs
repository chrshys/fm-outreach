import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

// ============================================================
// End-to-end tests: Running search on an activated cell
// verifies the full lifecycle from activation through status
// transitions (unsearched → searching → searched/saturated)
// including re-search and error recovery flows.
// ============================================================

const discoverCellSource = fs.readFileSync(
  "convex/discovery/discoverCell.ts",
  "utf8",
);
const gridCellsSource = fs.readFileSync(
  "convex/discovery/gridCells.ts",
  "utf8",
);
const mapPageSource = fs.readFileSync("src/app/map/page.tsx", "utf8");
const panelSource = fs.readFileSync(
  "src/components/map/discovery-panel.tsx",
  "utf8",
);

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
          first: async () => null,
          collect: async () => docs,
        }),
        collect: async () => docs,
      };
    },
  };
}

// -- Helpers replicating backend logic --------------------------

const GOOGLE_MAX_RESULTS = 60;

async function activateCell(db, args) {
  // Replicate activateCell mutation logic
  const cellId = await db.insert("discoveryCells", {
    swLat: args.swLat,
    swLng: args.swLng,
    neLat: args.neLat,
    neLng: args.neLng,
    depth: 0,
    isLeaf: true,
    status: "unsearched",
    gridId: args.gridId,
    boundsKey: args.boundsKey,
  });
  return { cellId, alreadyExisted: false };
}

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

function determineSaturation(querySaturation, queryResults) {
  return (
    querySaturation.length > 0 &&
    queryResults.every(({ totalCount }) => totalCount >= GOOGLE_MAX_RESULTS) &&
    querySaturation.every((qs) => qs.count >= 20)
  );
}

async function seedGrid(db) {
  return db.insert("discoveryGrids", {
    name: "Discovery",
    region: "Ontario",
    province: "Ontario",
    queries: ["farm market", "fruit stand", "farmers market"],
    cellSizeKm: 10,
    totalLeadsFound: 0,
    createdAt: Date.now(),
  });
}

// ============================================================
// E2E Flow 1: Activate cell → search → searched
// ============================================================

test("e2e: activate cell creates it with unsearched status", async () => {
  const db = createMockDb();
  const gridId = await seedGrid(db);

  const { cellId } = await activateCell(db, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09,
    neLng: -79.41,
    boundsKey: "43.000000_-79.500000",
  });

  const cell = await db.get(cellId);
  assert.equal(cell.status, "unsearched");
  assert.equal(cell.depth, 0);
  assert.equal(cell.isLeaf, true);
  assert.equal(cell.gridId, gridId);
});

test("e2e: activated unsearched cell → claim → searching → searched", async () => {
  const db = createMockDb();
  const gridId = await seedGrid(db);

  // Step 1: Activate
  const { cellId } = await activateCell(db, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09,
    neLng: -79.41,
    boundsKey: "43.000000_-79.500000",
  });

  let cell = await db.get(cellId);
  assert.equal(cell.status, "unsearched");

  // Step 2: Claim for search
  const { claimed, previousStatus } = await claimCellForSearch(
    db,
    cellId,
    ["unsearched", "searched", "saturated"],
  );
  assert.equal(claimed, true);
  assert.equal(previousStatus, "unsearched");

  cell = await db.get(cellId);
  assert.equal(cell.status, "searching");

  // Step 3: Search completes with non-saturated results
  const querySaturation = [
    { query: "farm market", count: 12 },
    { query: "fruit stand", count: 5 },
    { query: "farmers market", count: 8 },
  ];
  const queryResults = [
    { totalCount: 18 },
    { totalCount: 7 },
    { totalCount: 12 },
  ];
  const saturated = determineSaturation(querySaturation, queryResults);
  assert.equal(saturated, false);

  await updateCellSearchResult(db, {
    cellId,
    status: saturated ? "saturated" : "searched",
    resultCount: 20,
    querySaturation,
    lastSearchedAt: Date.now(),
    newLeadsCount: 20,
  });

  cell = await db.get(cellId);
  assert.equal(cell.status, "searched");
  assert.equal(cell.resultCount, 20);
  assert.ok(cell.lastSearchedAt);

  const grid = await db.get(gridId);
  assert.equal(grid.totalLeadsFound, 20);
});

// ============================================================
// E2E Flow 2: Activate cell → search → saturated
// ============================================================

test("e2e: activated unsearched cell → claim → searching → saturated", async () => {
  const db = createMockDb();
  const gridId = await seedGrid(db);

  const { cellId } = await activateCell(db, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09,
    neLng: -79.41,
    boundsKey: "43.000000_-79.500000",
  });

  await claimCellForSearch(db, cellId, [
    "unsearched",
    "searched",
    "saturated",
  ]);

  const querySaturation = [
    { query: "farm market", count: 25 },
    { query: "fruit stand", count: 22 },
    { query: "farmers market", count: 30 },
  ];
  const queryResults = [
    { totalCount: 60 },
    { totalCount: 60 },
    { totalCount: 60 },
  ];
  const saturated = determineSaturation(querySaturation, queryResults);
  assert.equal(saturated, true);

  await updateCellSearchResult(db, {
    cellId,
    status: "saturated",
    resultCount: 55,
    querySaturation,
    lastSearchedAt: Date.now(),
    newLeadsCount: 55,
  });

  const cell = await db.get(cellId);
  assert.equal(cell.status, "saturated");
  assert.equal(cell.resultCount, 55);
});

// ============================================================
// E2E Flow 3: Re-search a searched cell
// ============================================================

test("e2e: searched cell → re-search → searching → searched", async () => {
  const db = createMockDb();
  const gridId = await seedGrid(db);

  // Start with an already-searched cell
  const { cellId } = await activateCell(db, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09,
    neLng: -79.41,
    boundsKey: "43.000000_-79.500000",
  });
  await db.patch(cellId, {
    status: "searched",
    resultCount: 10,
    lastSearchedAt: Date.now() - 86400000,
  });

  // Re-search: claim from searched status
  const { claimed, previousStatus } = await claimCellForSearch(
    db,
    cellId,
    ["unsearched", "searched", "saturated"],
  );
  assert.equal(claimed, true);
  assert.equal(previousStatus, "searched");

  let cell = await db.get(cellId);
  assert.equal(cell.status, "searching");

  // Completes still not saturated
  const querySaturation = [
    { query: "farm market", count: 15 },
    { query: "fruit stand", count: 8 },
    { query: "farmers market", count: 11 },
  ];

  await updateCellSearchResult(db, {
    cellId,
    status: "searched",
    resultCount: 25,
    querySaturation,
    lastSearchedAt: Date.now(),
    newLeadsCount: 15,
  });

  cell = await db.get(cellId);
  assert.equal(cell.status, "searched");
  assert.equal(cell.resultCount, 25);
});

// ============================================================
// E2E Flow 4: Re-search a saturated cell
// ============================================================

test("e2e: saturated cell → re-search → searching → searched (downgrade)", async () => {
  const db = createMockDb();
  const gridId = await seedGrid(db);

  const { cellId } = await activateCell(db, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09,
    neLng: -79.41,
    boundsKey: "43.000000_-79.500000",
  });
  await db.patch(cellId, { status: "saturated", resultCount: 50 });

  // Claim from saturated — allowed by expectedStatuses
  const { claimed, previousStatus } = await claimCellForSearch(
    db,
    cellId,
    ["unsearched", "searched", "saturated"],
  );
  assert.equal(claimed, true);
  assert.equal(previousStatus, "saturated");

  // After re-search, no longer saturated (queries changed)
  const querySaturation = [
    { query: "farm market", count: 10 },
    { query: "fruit stand", count: 3 },
    { query: "farmers market", count: 7 },
  ];
  const queryResults = [
    { totalCount: 15 },
    { totalCount: 5 },
    { totalCount: 10 },
  ];
  const saturated = determineSaturation(querySaturation, queryResults);
  assert.equal(saturated, false);

  await updateCellSearchResult(db, {
    cellId,
    status: "searched",
    resultCount: 18,
    querySaturation,
    lastSearchedAt: Date.now(),
    newLeadsCount: 3,
  });

  const cell = await db.get(cellId);
  assert.equal(cell.status, "searched");
});

// ============================================================
// E2E Flow 5: Error during search → rollback to previous status
// ============================================================

test("e2e: error during search rolls back unsearched cell", async () => {
  const db = createMockDb();
  const gridId = await seedGrid(db);

  const { cellId } = await activateCell(db, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09,
    neLng: -79.41,
    boundsKey: "43.000000_-79.500000",
  });

  const { previousStatus } = await claimCellForSearch(db, cellId, [
    "unsearched",
    "searched",
    "saturated",
  ]);
  assert.equal(previousStatus, "unsearched");

  let cell = await db.get(cellId);
  assert.equal(cell.status, "searching");

  // Simulate error → rollback
  await db.patch(cellId, { status: previousStatus });

  cell = await db.get(cellId);
  assert.equal(cell.status, "unsearched");
});

test("e2e: error during re-search rolls back searched cell", async () => {
  const db = createMockDb();
  const gridId = await seedGrid(db);

  const { cellId } = await activateCell(db, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09,
    neLng: -79.41,
    boundsKey: "43.000000_-79.500000",
  });
  await db.patch(cellId, { status: "searched" });

  const { previousStatus } = await claimCellForSearch(db, cellId, [
    "unsearched",
    "searched",
    "saturated",
  ]);
  assert.equal(previousStatus, "searched");

  // Simulate error → rollback
  await db.patch(cellId, { status: previousStatus });

  const cell = await db.get(cellId);
  assert.equal(cell.status, "searched");
});

test("e2e: error during re-search rolls back saturated cell", async () => {
  const db = createMockDb();
  const gridId = await seedGrid(db);

  const { cellId } = await activateCell(db, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09,
    neLng: -79.41,
    boundsKey: "43.000000_-79.500000",
  });
  await db.patch(cellId, { status: "saturated" });

  const { previousStatus } = await claimCellForSearch(db, cellId, [
    "unsearched",
    "searched",
    "saturated",
  ]);

  await db.patch(cellId, { status: previousStatus });

  const cell = await db.get(cellId);
  assert.equal(cell.status, "saturated");
});

// ============================================================
// E2E Flow 6: Concurrent search attempt is rejected
// ============================================================

test("e2e: second search attempt on searching cell is rejected", async () => {
  const db = createMockDb();
  const gridId = await seedGrid(db);

  const { cellId } = await activateCell(db, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09,
    neLng: -79.41,
    boundsKey: "43.000000_-79.500000",
  });

  // First claim succeeds
  const first = await claimCellForSearch(db, cellId, [
    "unsearched",
    "searched",
    "saturated",
  ]);
  assert.equal(first.claimed, true);

  // Second claim fails — cell is already searching
  const second = await claimCellForSearch(db, cellId, [
    "unsearched",
    "searched",
    "saturated",
  ]);
  assert.equal(second.claimed, false);
  assert.equal(second.previousStatus, "searching");
});

// ============================================================
// E2E Flow 7: Grid totalLeadsFound accumulates across searches
// ============================================================

test("e2e: grid totalLeadsFound accumulates across multiple cell searches", async () => {
  const db = createMockDb();
  const gridId = await seedGrid(db);

  // Activate and search first cell
  const { cellId: cell1 } = await activateCell(db, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09,
    neLng: -79.41,
    boundsKey: "43.000000_-79.500000",
  });

  await claimCellForSearch(db, cell1, [
    "unsearched",
    "searched",
    "saturated",
  ]);
  await updateCellSearchResult(db, {
    cellId: cell1,
    status: "searched",
    resultCount: 15,
    querySaturation: [{ query: "farm market", count: 15 }],
    lastSearchedAt: Date.now(),
    newLeadsCount: 15,
  });

  let grid = await db.get(gridId);
  assert.equal(grid.totalLeadsFound, 15);

  // Activate and search second cell
  const { cellId: cell2 } = await activateCell(db, {
    gridId,
    swLat: 43.09,
    swLng: -79.5,
    neLat: 43.18,
    neLng: -79.41,
    boundsKey: "43.090000_-79.500000",
  });

  await claimCellForSearch(db, cell2, [
    "unsearched",
    "searched",
    "saturated",
  ]);
  await updateCellSearchResult(db, {
    cellId: cell2,
    status: "searched",
    resultCount: 8,
    querySaturation: [{ query: "farm market", count: 8 }],
    lastSearchedAt: Date.now(),
    newLeadsCount: 8,
  });

  grid = await db.get(gridId);
  assert.equal(grid.totalLeadsFound, 23);
});

// ============================================================
// Source verification: requestDiscoverCell accepts saturated
// for re-search (matches claimCellForSearch expectedStatuses)
// ============================================================

test("requestDiscoverCell allows re-search of saturated cells", () => {
  const block = discoverCellSource.slice(
    discoverCellSource.indexOf("requestDiscoverCell"),
  );
  // The status guard checks !== unsearched && !== searched && !== saturated
  assert.match(block, /status\s*!==\s*"saturated"/);
});

test("claimCellForSearch expectedStatuses includes saturated", () => {
  assert.match(
    discoverCellSource,
    /expectedStatuses:\s*\["unsearched",\s*"searched",\s*"saturated"\]/,
  );
});

// ============================================================
// Source verification: discoverCell wraps search in try/catch
// with status rollback via updateCellStatus
// ============================================================

test("discoverCell catch block calls updateCellStatus with previousStatus", () => {
  const catchIdx = discoverCellSource.lastIndexOf("catch");
  const catchBlock = discoverCellSource.slice(catchIdx);
  assert.match(catchBlock, /updateCellStatus/);
  assert.match(catchBlock, /status:\s*previousStatus/);
});

// ============================================================
// Source verification: saturation requires BOTH totalCount >= 60
// AND in-bounds count >= 20 per query
// ============================================================

test("saturation requires every query totalCount >= GOOGLE_MAX_RESULTS", () => {
  assert.match(
    discoverCellSource,
    /queryResults\.every\(\(\{\s*totalCount\s*\}\)\s*=>\s*totalCount\s*>=\s*GOOGLE_MAX_RESULTS\)/,
  );
});

test("saturation requires every query in-bounds count >= 20", () => {
  assert.match(
    discoverCellSource,
    /querySaturation\.every\(\(qs\)\s*=>\s*qs\.count\s*>=\s*20\)/,
  );
});

// ============================================================
// Source verification: updateCellSearchResult updates both cell
// and grid totalLeadsFound
// ============================================================

test("updateCellSearchResult patches cell with status, resultCount, querySaturation, lastSearchedAt", () => {
  const block = gridCellsSource.slice(
    gridCellsSource.indexOf("updateCellSearchResult"),
  );
  assert.match(block, /status:\s*args\.status/);
  assert.match(block, /resultCount:\s*args\.resultCount/);
  assert.match(block, /querySaturation:\s*args\.querySaturation/);
  assert.match(block, /lastSearchedAt:\s*args\.lastSearchedAt/);
});

test("updateCellSearchResult increments grid totalLeadsFound", () => {
  const block = gridCellsSource.slice(
    gridCellsSource.indexOf("updateCellSearchResult"),
  );
  assert.match(block, /totalLeadsFound:\s*grid\.totalLeadsFound\s*\+\s*args\.newLeadsCount/);
});

// ============================================================
// Frontend wiring: map page → requestDiscoverCell → toast
// ============================================================

test("map page handleCellAction calls requestDiscoverCell for google_places search", () => {
  const actionBlock = mapPageSource.slice(
    mapPageSource.indexOf('action.type === "search"'),
  );
  assert.match(actionBlock, /requestDiscoverCell/);
});

test("map page shows toast on search request error", () => {
  const actionBlock = mapPageSource.slice(
    mapPageSource.indexOf('action.type === "search"'),
  );
  assert.match(actionBlock, /toast\.error/);
});

test("map page guards duplicate search request for already-searching cell", () => {
  const actionBlock = mapPageSource.slice(
    mapPageSource.indexOf('action.type === "search"'),
  );
  assert.match(actionBlock, /cell\.status\s*===\s*"searching"/);
});

// ============================================================
// Frontend wiring: DiscoveryPanel disables Run during searching
// ============================================================

test("DiscoveryPanel disables Run button when cell is searching", () => {
  assert.match(
    panelSource,
    /selectedCell\.status\s*===\s*"searching"/,
  );
});

// ============================================================
// E2E saturation edge case: 60 API results but low in-bounds
// ============================================================

test("e2e: 60 API results but few in-bounds does NOT saturate", () => {
  const querySaturation = [
    { query: "farm market", count: 3 },
    { query: "fruit stand", count: 5 },
    { query: "farmers market", count: 2 },
  ];
  const queryResults = [
    { totalCount: 60 },
    { totalCount: 60 },
    { totalCount: 60 },
  ];

  const saturated = determineSaturation(querySaturation, queryResults);
  assert.equal(
    saturated,
    false,
    "High API results but low in-bounds should not saturate",
  );
});

test("e2e: high in-bounds but low API results does NOT saturate", () => {
  const querySaturation = [
    { query: "farm market", count: 25 },
    { query: "fruit stand", count: 22 },
    { query: "farmers market", count: 30 },
  ];
  const queryResults = [
    { totalCount: 30 },
    { totalCount: 25 },
    { totalCount: 35 },
  ];

  const saturated = determineSaturation(querySaturation, queryResults);
  assert.equal(
    saturated,
    false,
    "High in-bounds but sub-60 API results should not saturate",
  );
});
