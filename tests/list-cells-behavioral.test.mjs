import assert from "node:assert/strict";
import test from "node:test";

// ============================================================
// Behavioral test: listCells returns only leaf cells via index,
// excluding subdivided parents and cells from other grids
// ============================================================

// Simulate Convex db with in-memory store
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

// Replicate the listCells handler logic exactly as in gridCells.ts
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

// Replicate subdivideCell for integration tests
const MAX_DEPTH = 4;

async function subdivideCell(ctx, args) {
  const cell = await ctx.db.get(args.cellId);
  if (!cell) throw new Error("Cell not found");
  if (cell.status !== "saturated")
    throw new Error("Cell must be saturated before subdividing");
  if (cell.depth >= MAX_DEPTH)
    throw new Error("Cell is already at maximum depth");

  const existingChildren = await ctx.db
    .query("discoveryCells")
    .withIndex("by_parentCellId", (q) => q.eq("parentCellId", args.cellId))
    .collect();

  if (existingChildren.length > 0) {
    return { childIds: existingChildren.map((c) => c._id) };
  }

  const midLat = (cell.swLat + cell.neLat) / 2;
  const midLng = (cell.swLng + cell.neLng) / 2;
  const childDepth = cell.depth + 1;

  const quadrants = [
    { swLat: cell.swLat, swLng: cell.swLng, neLat: midLat, neLng: midLng },
    { swLat: cell.swLat, swLng: midLng, neLat: midLat, neLng: cell.neLng },
    { swLat: midLat, swLng: cell.swLng, neLat: cell.neLat, neLng: midLng },
    { swLat: midLat, swLng: midLng, neLat: cell.neLat, neLng: cell.neLng },
  ];

  const childIds = [];
  for (const q of quadrants) {
    const childId = await ctx.db.insert("discoveryCells", {
      ...q,
      depth: childDepth,
      parentCellId: args.cellId,
      isLeaf: true,
      status: "unsearched",
      gridId: cell.gridId,
    });
    childIds.push(childId);
  }

  await ctx.db.patch(args.cellId, { isLeaf: false });

  return { childIds };
}

// Helper: seed a grid with cells
async function seedGrid(db, { cellCount = 3, gridOverrides = {} } = {}) {
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
    ...gridOverrides,
  });

  const cellIds = [];
  for (let i = 0; i < cellCount; i++) {
    const cellId = await db.insert("discoveryCells", {
      swLat: 42.85 + i * 0.18,
      swLng: -79.9,
      neLat: 42.85 + (i + 1) * 0.18,
      neLng: -79.65,
      depth: 0,
      isLeaf: true,
      status: "unsearched",
      gridId,
    });
    cellIds.push(cellId);
  }

  return { gridId, cellIds };
}

// ============================================================
// 1. Basic leaf filtering
// ============================================================

test("listCells returns all leaf cells for a grid", async () => {
  const db = createMockDb();
  const { gridId, cellIds } = await seedGrid(db, { cellCount: 4 });

  const result = await listCells({ db }, { gridId });

  assert.equal(result.length, 4, "Must return all 4 leaf cells");
  const returnedIds = result.map((c) => c._id);
  for (const cellId of cellIds) {
    assert.ok(returnedIds.includes(cellId), `Must include cell ${cellId}`);
  }
});

test("listCells excludes non-leaf cells (isLeaf: false)", async () => {
  const db = createMockDb();
  const { gridId, cellIds } = await seedGrid(db, { cellCount: 3 });

  // Mark the first cell as non-leaf (simulating subdivision)
  await db.patch(cellIds[0], { isLeaf: false });

  const result = await listCells({ db }, { gridId });

  assert.equal(result.length, 2, "Must return only 2 leaf cells");
  const returnedIds = result.map((c) => c._id);
  assert.ok(!returnedIds.includes(cellIds[0]), "Non-leaf cell must be excluded");
  assert.ok(returnedIds.includes(cellIds[1]), "Leaf cell 1 must be included");
  assert.ok(returnedIds.includes(cellIds[2]), "Leaf cell 2 must be included");
});

test("listCells returns empty array when all cells are non-leaf", async () => {
  const db = createMockDb();
  const { gridId, cellIds } = await seedGrid(db, { cellCount: 2 });

  await db.patch(cellIds[0], { isLeaf: false });
  await db.patch(cellIds[1], { isLeaf: false });

  const result = await listCells({ db }, { gridId });

  assert.equal(result.length, 0, "Must return empty array");
});

// ============================================================
// 2. Grid isolation — cells from other grids are excluded
// ============================================================

test("listCells only returns cells belonging to the requested grid", async () => {
  const db = createMockDb();
  const grid1 = await seedGrid(db, {
    cellCount: 3,
    gridOverrides: { name: "Grid A" },
  });
  const grid2 = await seedGrid(db, {
    cellCount: 2,
    gridOverrides: { name: "Grid B" },
  });

  const result1 = await listCells({ db }, { gridId: grid1.gridId });
  const result2 = await listCells({ db }, { gridId: grid2.gridId });

  assert.equal(result1.length, 3, "Grid A must have 3 cells");
  assert.equal(result2.length, 2, "Grid B must have 2 cells");

  // No cross-contamination
  const ids1 = new Set(result1.map((c) => c._id));
  const ids2 = new Set(result2.map((c) => c._id));
  for (const id of ids1) {
    assert.ok(!ids2.has(id), "Grid A cell must not appear in Grid B results");
  }
});

// ============================================================
// 3. Integration with subdivideCell
// ============================================================

test("after subdivision, parent disappears and 4 children appear in listCells", async () => {
  const db = createMockDb();
  const { gridId, cellIds } = await seedGrid(db, { cellCount: 2 });

  // Mark cell 0 as saturated so it can be subdivided
  await db.patch(cellIds[0], { status: "saturated" });

  // Before subdivision: 2 leaf cells
  const before = await listCells({ db }, { gridId });
  assert.equal(before.length, 2, "Before: 2 leaf cells");

  // Subdivide cell 0
  const { childIds } = await subdivideCell({ db }, { cellId: cellIds[0] });

  // After subdivision: cell 0 gone, 4 children + cell 1 = 5 leaf cells
  const after = await listCells({ db }, { gridId });
  assert.equal(after.length, 5, "After: 5 leaf cells (4 children + 1 original)");

  const afterIds = after.map((c) => c._id);
  assert.ok(!afterIds.includes(cellIds[0]), "Subdivided parent must not appear");
  assert.ok(afterIds.includes(cellIds[1]), "Untouched cell must still appear");
  for (const childId of childIds) {
    assert.ok(afterIds.includes(childId), `Child ${childId} must appear`);
  }
});

test("recursive subdivision: only deepest leaves appear", async () => {
  const db = createMockDb();
  const { gridId, cellIds } = await seedGrid(db, { cellCount: 1 });

  // Subdivide depth 0 → 4 children at depth 1
  await db.patch(cellIds[0], { status: "saturated" });
  const { childIds } = await subdivideCell({ db }, { cellId: cellIds[0] });

  // Subdivide first child (depth 1 → depth 2)
  await db.patch(childIds[0], { status: "saturated" });
  const { childIds: grandchildIds } = await subdivideCell(
    { db },
    { cellId: childIds[0] },
  );

  const result = await listCells({ db }, { gridId });

  // depth-0 parent: non-leaf (excluded)
  // depth-1 child 0: non-leaf (excluded)
  // depth-1 children 1-3: leaf (included) = 3
  // depth-2 grandchildren: leaf (included) = 4
  // Total = 7
  assert.equal(result.length, 7, "Only deepest leaves appear (3 + 4 = 7)");

  const resultIds = result.map((c) => c._id);
  assert.ok(!resultIds.includes(cellIds[0]), "Depth-0 parent excluded");
  assert.ok(!resultIds.includes(childIds[0]), "Depth-1 subdivided child excluded");

  for (const id of childIds.slice(1)) {
    assert.ok(resultIds.includes(id), `Depth-1 leaf child ${id} included`);
  }
  for (const id of grandchildIds) {
    assert.ok(resultIds.includes(id), `Depth-2 grandchild ${id} included`);
  }
});

// ============================================================
// 4. Return shape projection
// ============================================================

test("returned cells contain only projected fields", async () => {
  const db = createMockDb();
  const { gridId } = await seedGrid(db, { cellCount: 1 });

  const result = await listCells({ db }, { gridId });

  assert.equal(result.length, 1);
  const cell = result[0];
  const expectedKeys = [
    "_id",
    "swLat",
    "swLng",
    "neLat",
    "neLng",
    "depth",
    "status",
    "resultCount",
    "querySaturation",
    "lastSearchedAt",
  ];

  assert.deepStrictEqual(
    Object.keys(cell).sort(),
    expectedKeys.sort(),
    "Must contain exactly the projected fields",
  );
});

test("projected fields do not include isLeaf, gridId, or parentCellId", async () => {
  const db = createMockDb();
  const { gridId } = await seedGrid(db, { cellCount: 1 });

  const result = await listCells({ db }, { gridId });

  const cell = result[0];
  assert.ok(!("isLeaf" in cell), "isLeaf must not be exposed");
  assert.ok(!("gridId" in cell), "gridId must not be exposed");
  assert.ok(!("parentCellId" in cell), "parentCellId must not be exposed");
  assert.ok(!("_creationTime" in cell), "_creationTime must not be exposed");
});

// ============================================================
// 5. Cells with various statuses are all returned if leaf
// ============================================================

test("listCells returns leaf cells regardless of status", async () => {
  const db = createMockDb();
  const gridId = await db.insert("discoveryGrids", {
    name: "Status Grid",
    region: "Test",
    province: "ON",
    queries: ["farms"],
    swLat: 42.0,
    swLng: -80.0,
    neLat: 43.0,
    neLng: -79.0,
    cellSizeKm: 20,
    totalLeadsFound: 0,
    createdAt: Date.now(),
  });

  const statuses = ["unsearched", "searched", "saturated", "searching"];
  for (let i = 0; i < statuses.length; i++) {
    await db.insert("discoveryCells", {
      swLat: 42.0 + i * 0.25,
      swLng: -80.0,
      neLat: 42.0 + (i + 1) * 0.25,
      neLng: -79.5,
      depth: 0,
      isLeaf: true,
      status: statuses[i],
      gridId,
    });
  }

  const result = await listCells({ db }, { gridId });

  assert.equal(result.length, 4, "All 4 statuses returned when isLeaf: true");
  const returnedStatuses = result.map((c) => c.status).sort();
  assert.deepStrictEqual(returnedStatuses, statuses.sort());
});

// ============================================================
// 6. Index-only query — no post-filtering
// ============================================================

test("query uses index eq constraints, not post-filter", async () => {
  // Verify the implementation uses .withIndex with eq constraints
  // by checking that the mock index receives the correct field/value pairs
  const db = createMockDb();
  const { gridId } = await seedGrid(db, { cellCount: 1 });

  // Wrap the query method to capture index usage
  const originalQuery = db.query.bind(db);
  let indexName = null;
  let eqConstraints = [];

  db.query = (table) => {
    const result = originalQuery(table);
    const originalWithIndex = result.withIndex.bind(result);
    result.withIndex = (name, filterFn) => {
      indexName = name;
      const eqs = [];
      const builder = {
        eq(field, value) {
          eqs.push({ field, value });
          return builder;
        },
      };
      filterFn(builder);
      eqConstraints = eqs;
      return originalWithIndex(name, filterFn);
    };
    return result;
  };

  await listCells({ db }, { gridId });

  assert.equal(indexName, "by_gridId_isLeaf", "Must use by_gridId_isLeaf index");
  assert.equal(eqConstraints.length, 2, "Must have exactly 2 eq constraints");
  assert.equal(eqConstraints[0].field, "gridId", "First constraint is gridId");
  assert.equal(eqConstraints[0].value, gridId, "gridId matches requested grid");
  assert.equal(eqConstraints[1].field, "isLeaf", "Second constraint is isLeaf");
  assert.equal(eqConstraints[1].value, true, "isLeaf is true");
});

// ============================================================
// 7. Empty grid returns empty array
// ============================================================

test("listCells returns empty array for grid with no cells", async () => {
  const db = createMockDb();
  const gridId = await db.insert("discoveryGrids", {
    name: "Empty Grid",
    region: "Test",
    province: "ON",
    queries: ["farms"],
    swLat: 42.0,
    swLng: -80.0,
    neLat: 43.0,
    neLng: -79.0,
    cellSizeKm: 20,
    totalLeadsFound: 0,
    createdAt: Date.now(),
  });

  const result = await listCells({ db }, { gridId });

  assert.equal(result.length, 0, "Empty grid returns empty array");
});

// ============================================================
// 8. Cells with search results preserve optional fields
// ============================================================

test("listCells preserves resultCount and querySaturation on searched cells", async () => {
  const db = createMockDb();
  const gridId = await db.insert("discoveryGrids", {
    name: "Searched Grid",
    region: "Test",
    province: "ON",
    queries: ["farms", "orchard"],
    swLat: 42.0,
    swLng: -80.0,
    neLat: 43.0,
    neLng: -79.0,
    cellSizeKm: 20,
    totalLeadsFound: 15,
    createdAt: Date.now(),
  });

  const now = Date.now();
  await db.insert("discoveryCells", {
    swLat: 42.0,
    swLng: -80.0,
    neLat: 42.5,
    neLng: -79.5,
    depth: 0,
    isLeaf: true,
    status: "searched",
    gridId,
    resultCount: 15,
    querySaturation: [
      { query: "farms", count: 10 },
      { query: "orchard", count: 5 },
    ],
    lastSearchedAt: now,
  });

  const result = await listCells({ db }, { gridId });

  assert.equal(result.length, 1);
  assert.equal(result[0].resultCount, 15);
  assert.deepStrictEqual(result[0].querySaturation, [
    { query: "farms", count: 10 },
    { query: "orchard", count: 5 },
  ]);
  assert.equal(result[0].lastSearchedAt, now);
});
