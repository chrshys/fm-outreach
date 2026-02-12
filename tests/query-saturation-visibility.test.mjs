import assert from "node:assert/strict";
import test from "node:test";

// ============================================================
// End-to-end behavioral tests for querySaturation visibility:
// Verifies that per-query result counts flow correctly from
// discovery through updateCellSearchResult to listCells output.
//
// Covers:
// - querySaturation populated with per-query counts after search
// - listCells returns querySaturation on searched/saturated cells
// - querySaturation absent (undefined) on unsearched cells
// - querySaturation updated on re-search
// - Multiple queries with mixed saturation levels
// - Source code wiring verification
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
    query(table) {
      const docs = [...store.values()].filter((d) =>
        d._id.startsWith(`${table}:`),
      );
      return {
        withIndex(_name, filterFn) {
          const eqs = [];
          const builder = {
            eq(field, value) {
              eqs.push({ field, value });
              return builder;
            },
          };
          filterFn(builder);
          const filtered = docs.filter((d) =>
            eqs.every((e) => d[e.field] === e.value),
          );
          return {
            first: async () => filtered[0] ?? null,
            collect: async () => filtered,
          };
        },
        collect: async () => docs,
      };
    },
  };
}

// -- Replicate updateCellSearchResult from gridCells.ts --------

async function updateCellSearchResult(db, args) {
  const cell = await db.get(args.cellId);
  if (!cell) throw new Error("Cell not found");

  await db.patch(args.cellId, {
    status: args.status,
    resultCount: args.resultCount,
    querySaturation: args.querySaturation,
    lastSearchedAt: args.lastSearchedAt,
    leadsFound: args.newLeadsCount,
  });

  const grid = await db.get(cell.gridId);
  if (!grid) throw new Error("Grid not found");

  await db.patch(cell.gridId, {
    totalLeadsFound: grid.totalLeadsFound + args.newLeadsCount,
  });
}

// -- Replicate listCells from gridCells.ts ---------------------

async function listCells(ctx, args) {
  const cells = await ctx.db
    .query("discoveryCells")
    .withIndex("by_gridId_isLeaf", (q) =>
      q.eq("gridId", args.gridId).eq("isLeaf", true),
    )
    .collect();

  return cells.map((cell) => ({
    _id: cell._id,
    swLat: cell.swLat,
    swLng: cell.swLng,
    neLat: cell.neLat,
    neLng: cell.neLng,
    depth: cell.depth,
    status: cell.status,
    resultCount: cell.resultCount,
    querySaturation: cell.querySaturation,
    lastSearchedAt: cell.lastSearchedAt,
  }));
}

// -- Determine status helper -----------------------------------

function determineStatus(querySaturation) {
  const saturated =
    querySaturation.length > 0 &&
    querySaturation.every((qs) => qs.count >= GOOGLE_MAX_RESULTS);
  return saturated ? "saturated" : "searched";
}

// -- Seed helper -----------------------------------------------

async function seedGridAndCell(db, overrides = {}) {
  const gridId = await db.insert("discoveryGrids", {
    name: "Test Grid",
    region: "Niagara",
    province: "Ontario",
    queries: ["farms", "farmers market", "orchard", "farm stand", "pick your own"],
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
// 1. querySaturation shows per-query counts after discovery
// ============================================================

test("querySaturation shows per-query result counts on cell after updateCellSearchResult", async () => {
  const db = createMockDb();
  const { gridId, cellId } = await seedGridAndCell(db);

  const querySaturation = [
    { query: "farms", count: 15 },
    { query: "farmers market", count: 8 },
    { query: "orchard", count: 3 },
    { query: "farm stand", count: 12 },
    { query: "pick your own", count: 1 },
  ];

  await updateCellSearchResult(db, {
    cellId,
    status: determineStatus(querySaturation),
    resultCount: 30,
    querySaturation,
    lastSearchedAt: Date.now(),
    newLeadsCount: 30,
  });

  const cells = await listCells({ db }, { gridId });

  assert.equal(cells.length, 1);
  assert.deepStrictEqual(cells[0].querySaturation, querySaturation);
  assert.equal(cells[0].querySaturation.length, 5, "All 5 queries have counts");

  // Verify each query has the correct count
  assert.equal(cells[0].querySaturation[0].query, "farms");
  assert.equal(cells[0].querySaturation[0].count, 15);
  assert.equal(cells[0].querySaturation[1].query, "farmers market");
  assert.equal(cells[0].querySaturation[1].count, 8);
  assert.equal(cells[0].querySaturation[2].query, "orchard");
  assert.equal(cells[0].querySaturation[2].count, 3);
  assert.equal(cells[0].querySaturation[3].query, "farm stand");
  assert.equal(cells[0].querySaturation[3].count, 12);
  assert.equal(cells[0].querySaturation[4].query, "pick your own");
  assert.equal(cells[0].querySaturation[4].count, 1);
});

// ============================================================
// 2. querySaturation absent on unsearched cells
// ============================================================

test("unsearched cell has undefined querySaturation in listCells output", async () => {
  const db = createMockDb();
  const { gridId } = await seedGridAndCell(db);

  const cells = await listCells({ db }, { gridId });

  assert.equal(cells.length, 1);
  assert.equal(cells[0].status, "unsearched");
  assert.equal(cells[0].querySaturation, undefined);
  assert.equal(cells[0].resultCount, undefined);
});

// ============================================================
// 3. Mixed saturation levels: some queries at 60, others not
// ============================================================

test("querySaturation shows which queries are saturated and which are not", async () => {
  const db = createMockDb();
  const { gridId, cellId } = await seedGridAndCell(db);

  const querySaturation = [
    { query: "farms", count: 60 },        // saturated
    { query: "farmers market", count: 12 }, // not saturated
    { query: "orchard", count: 60 },       // saturated
    { query: "farm stand", count: 0 },     // zero results
    { query: "pick your own", count: 45 }, // not saturated
  ];

  await updateCellSearchResult(db, {
    cellId,
    status: determineStatus(querySaturation), // "searched" — not all at 60
    resultCount: 90,
    querySaturation,
    lastSearchedAt: Date.now(),
    newLeadsCount: 90,
  });

  const cells = await listCells({ db }, { gridId });
  const cell = cells[0];

  assert.equal(cell.status, "searched", "Cell is searched, not saturated (not all queries at 60)");

  // User can inspect which queries are saturated
  const saturatedQueries = cell.querySaturation.filter((qs) => qs.count >= GOOGLE_MAX_RESULTS);
  const unsaturatedQueries = cell.querySaturation.filter((qs) => qs.count < GOOGLE_MAX_RESULTS);

  assert.equal(saturatedQueries.length, 2, "2 queries hit the API limit");
  assert.equal(unsaturatedQueries.length, 3, "3 queries have room");
  assert.deepStrictEqual(
    saturatedQueries.map((qs) => qs.query),
    ["farms", "orchard"],
  );
});

// ============================================================
// 4. Fully saturated cell shows all queries at 60
// ============================================================

test("saturated cell querySaturation shows all queries at or above 60", async () => {
  const db = createMockDb();
  const { gridId, cellId } = await seedGridAndCell(db);

  const querySaturation = [
    { query: "farms", count: 60 },
    { query: "farmers market", count: 60 },
    { query: "orchard", count: 60 },
    { query: "farm stand", count: 60 },
    { query: "pick your own", count: 60 },
  ];

  await updateCellSearchResult(db, {
    cellId,
    status: determineStatus(querySaturation), // "saturated"
    resultCount: 150,
    querySaturation,
    lastSearchedAt: Date.now(),
    newLeadsCount: 150,
  });

  const cells = await listCells({ db }, { gridId });
  const cell = cells[0];

  assert.equal(cell.status, "saturated");
  assert.ok(
    cell.querySaturation.every((qs) => qs.count >= GOOGLE_MAX_RESULTS),
    "All queries at or above 60",
  );
});

// ============================================================
// 5. querySaturation updated on re-search (new counts replace old)
// ============================================================

test("re-search updates querySaturation with new per-query counts", async () => {
  const db = createMockDb();
  const { gridId, cellId } = await seedGridAndCell(db);

  // First search: low counts
  const firstQS = [
    { query: "farms", count: 10 },
    { query: "farmers market", count: 5 },
    { query: "orchard", count: 2 },
    { query: "farm stand", count: 8 },
    { query: "pick your own", count: 0 },
  ];

  await updateCellSearchResult(db, {
    cellId,
    status: "searched",
    resultCount: 20,
    querySaturation: firstQS,
    lastSearchedAt: Date.now(),
    newLeadsCount: 20,
  });

  let cells = await listCells({ db }, { gridId });
  assert.deepStrictEqual(cells[0].querySaturation, firstQS);

  // Re-search: queries updated, higher counts
  const secondQS = [
    { query: "farms", count: 60 },
    { query: "farmers market", count: 60 },
    { query: "orchard", count: 60 },
    { query: "farm stand", count: 60 },
    { query: "pick your own", count: 60 },
  ];

  await updateCellSearchResult(db, {
    cellId,
    status: "saturated",
    resultCount: 150,
    querySaturation: secondQS,
    lastSearchedAt: Date.now(),
    newLeadsCount: 50,
  });

  cells = await listCells({ db }, { gridId });
  assert.equal(cells[0].status, "saturated");
  assert.deepStrictEqual(
    cells[0].querySaturation,
    secondQS,
    "querySaturation replaced with new counts from re-search",
  );
});

// ============================================================
// 6. Multiple cells in a grid each have independent querySaturation
// ============================================================

test("each cell in a grid has its own independent querySaturation", async () => {
  const db = createMockDb();
  const gridId = await db.insert("discoveryGrids", {
    name: "Multi-Cell Grid",
    region: "Niagara",
    province: "Ontario",
    queries: ["farms", "orchard"],
    swLat: 42.85,
    swLng: -79.9,
    neLat: 43.35,
    neLng: -78.8,
    cellSizeKm: 20,
    totalLeadsFound: 0,
    createdAt: Date.now(),
  });

  const cellA = await db.insert("discoveryCells", {
    swLat: 42.85, swLng: -79.9, neLat: 43.1, neLng: -79.35,
    boundsKey: "42.850000_-79.900000",
    depth: 0, isLeaf: true, status: "unsearched", gridId,
  });
  const cellB = await db.insert("discoveryCells", {
    swLat: 43.1, swLng: -79.9, neLat: 43.35, neLng: -79.35,
    boundsKey: "43.100000_-79.900000",
    depth: 0, isLeaf: true, status: "unsearched", gridId,
  });

  // Search cell A: low counts
  const qsA = [
    { query: "farms", count: 5 },
    { query: "orchard", count: 2 },
  ];
  await updateCellSearchResult(db, {
    cellId: cellA,
    status: "searched",
    resultCount: 6,
    querySaturation: qsA,
    lastSearchedAt: Date.now(),
    newLeadsCount: 6,
  });

  // Search cell B: saturated
  const qsB = [
    { query: "farms", count: 60 },
    { query: "orchard", count: 60 },
  ];
  await updateCellSearchResult(db, {
    cellId: cellB,
    status: "saturated",
    resultCount: 80,
    querySaturation: qsB,
    lastSearchedAt: Date.now(),
    newLeadsCount: 80,
  });

  const cells = await listCells({ db }, { gridId });
  assert.equal(cells.length, 2);

  const cellAResult = cells.find((c) => c._id === cellA);
  const cellBResult = cells.find((c) => c._id === cellB);

  assert.deepStrictEqual(cellAResult.querySaturation, qsA);
  assert.equal(cellAResult.status, "searched");

  assert.deepStrictEqual(cellBResult.querySaturation, qsB);
  assert.equal(cellBResult.status, "saturated");
});

// ============================================================
// 7. discoverCell action builds querySaturation from search loop
// ============================================================

test("discoverCell source builds querySaturation by pushing per-query counts", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync("convex/discovery/discoverCell.ts", "utf8");

  // Verify querySaturation array is initialized
  assert.match(
    source,
    /const querySaturation:\s*\{\s*query:\s*string;\s*count:\s*number\s*\}\[\]\s*=\s*\[\]/,
    "querySaturation initialized as empty typed array",
  );

  // Verify per-query counts are pushed in the search loop
  assert.match(
    source,
    /querySaturation\.push\(\{\s*query,\s*count:\s*inBoundsForQuery\.length\s*\}\)/,
    "Each query's in-bounds count is pushed to querySaturation",
  );

  // Verify querySaturation is passed to updateCellSearchResult
  assert.match(
    source,
    /querySaturation,/,
    "querySaturation passed to updateCellSearchResult",
  );

  // Verify querySaturation is included in the return value
  const returnBlock = source.slice(source.lastIndexOf("return {"));
  assert.match(
    returnBlock,
    /querySaturation/,
    "querySaturation included in return value",
  );
});

// ============================================================
// 8. listCells source projects querySaturation field
// ============================================================

test("listCells source includes querySaturation in cell projection", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync("convex/discovery/gridCells.ts", "utf8");

  const listCellsBlock = source.slice(
    source.indexOf("export const listCells"),
    source.indexOf("export const claimCellForSearch"),
  );

  assert.match(
    listCellsBlock,
    /querySaturation:\s*cell\.querySaturation/,
    "listCells maps querySaturation from cell document",
  );
});

// ============================================================
// 9. Schema defines querySaturation with correct shape
// ============================================================

test("schema defines querySaturation as optional array of {query, count}", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync("convex/schema.ts", "utf8");

  assert.match(
    source,
    /querySaturation:\s*v\.optional\(\s*v\.array\(v\.object\(\{\s*query:\s*v\.string\(\),\s*count:\s*v\.number\(\)\s*\}\)\)/,
    "querySaturation schema matches expected shape",
  );
});

// ============================================================
// 10. Single query grid shows correct querySaturation
// ============================================================

test("single-query grid cell shows one entry in querySaturation", async () => {
  const db = createMockDb();
  const { gridId, cellId } = await seedGridAndCell(db, {
    grid: { queries: ["farms"] },
  });

  const querySaturation = [{ query: "farms", count: 25 }];

  await updateCellSearchResult(db, {
    cellId,
    status: "searched",
    resultCount: 25,
    querySaturation,
    lastSearchedAt: Date.now(),
    newLeadsCount: 25,
  });

  const cells = await listCells({ db }, { gridId });

  assert.equal(cells[0].querySaturation.length, 1);
  assert.equal(cells[0].querySaturation[0].query, "farms");
  assert.equal(cells[0].querySaturation[0].count, 25);
});
