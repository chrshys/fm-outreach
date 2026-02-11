import assert from "node:assert/strict";
import test from "node:test";

// ============================================================
// Behavioral tests for undividing subdivided cells via
// Convex dashboard — round-trip subdivide → undivide flow
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
    async delete(id) {
      const doc = store.get(id);
      if (!doc) throw new Error(`Document ${id} not found`);
      store.delete(id);
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

const MAX_DEPTH = 4;

class ConvexError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConvexError";
  }
}

// Replicate subdivideCell handler logic from gridCells.ts
async function subdivideCell(ctx, args) {
  const cell = await ctx.db.get(args.cellId);
  if (!cell) {
    throw new ConvexError("Cell not found");
  }

  if (cell.status === "searching") {
    throw new ConvexError("Cannot subdivide while cell is being searched");
  }

  if (cell.depth >= MAX_DEPTH) {
    throw new ConvexError("Cell is already at maximum depth");
  }

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

// Replicate undivideCell handler logic from gridCells.ts
async function undivideCell(ctx, args) {
  const cell = await ctx.db.get(args.cellId);
  if (!cell) {
    throw new ConvexError("Cell not found");
  }

  let targetCellId;

  if (cell.parentCellId) {
    const parentCell = await ctx.db.get(cell.parentCellId);
    if (!parentCell) {
      throw new ConvexError("Parent cell not found");
    }
    targetCellId = cell.parentCellId;
  } else {
    const children = await ctx.db
      .query("discoveryCells")
      .withIndex("by_parentCellId", (q) => q.eq("parentCellId", args.cellId))
      .collect();
    if (children.length === 0) {
      throw new ConvexError("Cell has no children to undivide");
    }
    targetCellId = args.cellId;
  }

  // BFS-walk all descendants of the target
  const toDelete = [];
  const queue = [targetCellId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    const children = await ctx.db
      .query("discoveryCells")
      .withIndex("by_parentCellId", (q) => q.eq("parentCellId", currentId))
      .collect();

    for (const child of children) {
      toDelete.push({ _id: child._id, status: child.status });
      queue.push(child._id);
    }
  }

  if (toDelete.some((d) => d.status === "searching")) {
    throw new ConvexError(
      "Cannot undivide while a child cell is being searched",
    );
  }

  for (const { _id } of toDelete) {
    await ctx.db.delete(_id);
  }

  await ctx.db.patch(targetCellId, { isLeaf: true });

  return { deletedCount: toDelete.length };
}

// Replicate listCells query logic from gridCells.ts
async function listCells(ctx, args) {
  const cells = await ctx.db
    .query("discoveryCells")
    .withIndex("by_gridId_isLeaf", (q) =>
      q.eq("gridId", args.gridId).eq("isLeaf", true),
    )
    .collect();

  return cells.map((cell) => ({
    _id: cell._id,
    parentCellId: cell.parentCellId,
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

// Helper: seed a grid with a single leaf cell
async function seedCell(db, overrides = {}) {
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
    depth: 0,
    isLeaf: true,
    status: "saturated",
    gridId,
    resultCount: 60,
    querySaturation: [{ query: "farms", count: 60 }],
    lastSearchedAt: 1700000000000,
    ...overrides,
  });

  return { gridId, cellId };
}

// ============================================================
// Round-trip: subdivide → undivide restores original state
// ============================================================

test("subdivide then undivide: parent returns to isLeaf true", async () => {
  const db = createMockDb();
  const { cellId } = await seedCell(db);

  const { childIds } = await subdivideCell({ db }, { cellId });
  await undivideCell({ db }, { cellId: childIds[0] });

  const cell = await db.get(cellId);
  assert.equal(cell.isLeaf, true);
});

test("subdivide then undivide: parent status unchanged", async () => {
  const db = createMockDb();
  const { cellId } = await seedCell(db);

  const before = await db.get(cellId);
  const { childIds } = await subdivideCell({ db }, { cellId });
  await undivideCell({ db }, { cellId: childIds[0] });
  const after = await db.get(cellId);

  assert.equal(after.status, before.status);
});

test("subdivide then undivide: parent resultCount unchanged", async () => {
  const db = createMockDb();
  const { cellId } = await seedCell(db);

  const before = await db.get(cellId);
  const { childIds } = await subdivideCell({ db }, { cellId });
  await undivideCell({ db }, { cellId: childIds[0] });
  const after = await db.get(cellId);

  assert.equal(after.resultCount, before.resultCount);
});

test("subdivide then undivide: parent querySaturation unchanged", async () => {
  const db = createMockDb();
  const { cellId } = await seedCell(db);

  const before = await db.get(cellId);
  const { childIds } = await subdivideCell({ db }, { cellId });
  await undivideCell({ db }, { cellId: childIds[0] });
  const after = await db.get(cellId);

  assert.deepStrictEqual(after.querySaturation, before.querySaturation);
});

test("subdivide then undivide: parent lastSearchedAt unchanged", async () => {
  const db = createMockDb();
  const { cellId } = await seedCell(db);

  const before = await db.get(cellId);
  const { childIds } = await subdivideCell({ db }, { cellId });
  await undivideCell({ db }, { cellId: childIds[0] });
  const after = await db.get(cellId);

  assert.equal(after.lastSearchedAt, before.lastSearchedAt);
});

test("subdivide then undivide: all children removed from db", async () => {
  const db = createMockDb();
  const { cellId } = await seedCell(db);

  const { childIds } = await subdivideCell({ db }, { cellId });
  await undivideCell({ db }, { cellId: childIds[0] });

  for (const id of childIds) {
    const child = await db.get(id);
    assert.equal(child, null, `Child ${id} must be deleted`);
  }
});

// ============================================================
// listCells integration: undivide restores parent as leaf
// ============================================================

test("listCells returns parent after undivide (back to single leaf)", async () => {
  const db = createMockDb();
  const { gridId, cellId } = await seedCell(db);

  // Before subdivide: 1 leaf cell
  const before = await listCells({ db }, { gridId });
  assert.equal(before.length, 1);
  assert.equal(before[0]._id, cellId);

  // After subdivide: 4 leaf cells (children), parent not a leaf
  const { childIds } = await subdivideCell({ db }, { cellId });
  const during = await listCells({ db }, { gridId });
  assert.equal(during.length, 4);
  const duringIds = during.map((c) => c._id).sort();
  assert.deepStrictEqual(duringIds, [...childIds].sort());

  // After undivide: back to 1 leaf cell (parent)
  await undivideCell({ db }, { cellId: childIds[0] });
  const after = await listCells({ db }, { gridId });
  assert.equal(after.length, 1);
  assert.equal(after[0]._id, cellId);
});

test("listCells shows parent with parentCellId undefined after undivide", async () => {
  const db = createMockDb();
  const { gridId, cellId } = await seedCell(db);

  const { childIds } = await subdivideCell({ db }, { cellId });
  await undivideCell({ db }, { cellId: childIds[0] });

  const cells = await listCells({ db }, { gridId });
  assert.equal(cells.length, 1);
  assert.equal(cells[0].parentCellId, undefined);
});

// ============================================================
// Multi-level round-trip: subdivide twice → undivide once
// ============================================================

test("undivide after 2-level subdivide: removes children and grandchildren", async () => {
  const db = createMockDb();
  const { gridId, cellId } = await seedCell(db);

  // Level 1: subdivide root
  const { childIds } = await subdivideCell({ db }, { cellId });

  // Level 2: subdivide first child
  const { childIds: grandchildIds } = await subdivideCell(
    { db },
    { cellId: childIds[0] },
  );

  // listCells shows 3 children (not subdivided) + 4 grandchildren = 7
  const during = await listCells({ db }, { gridId });
  assert.equal(during.length, 7);

  // Undivide from a grandchild — collapses childIds[0]'s children
  await undivideCell({ db }, { cellId: grandchildIds[0] });

  // Now 4 children again (childIds[0] is a leaf again)
  const after = await listCells({ db }, { gridId });
  assert.equal(after.length, 4);
  const child0 = await db.get(childIds[0]);
  assert.equal(child0.isLeaf, true);
});

test("undivide at root level after 2-level subdivide: removes all descendants", async () => {
  const db = createMockDb();
  const { gridId, cellId } = await seedCell(db);

  const { childIds } = await subdivideCell({ db }, { cellId });
  await subdivideCell({ db }, { cellId: childIds[0] });

  // Undivide from a non-subdivided sibling (childIds[1]) — collapses root
  const result = await undivideCell({ db }, { cellId: childIds[1] });

  // 4 children + 4 grandchildren = 8 deleted
  assert.equal(result.deletedCount, 8);

  // Back to single root leaf
  const after = await listCells({ db }, { gridId });
  assert.equal(after.length, 1);
  assert.equal(after[0]._id, cellId);
});

// ============================================================
// Guard: undividing a leaf root cell (no children) throws
// ============================================================

test("undivide on leaf root cell throws 'Cell has no children to undivide'", async () => {
  const db = createMockDb();
  const { cellId } = await seedCell(db);

  await assert.rejects(
    () => undivideCell({ db }, { cellId }),
    { message: "Cell has no children to undivide" },
  );
});

// ============================================================
// Undividing a subdivided root cell directly
// ============================================================

test("undivide on subdivided root cell: deletes children and restores leaf", async () => {
  const db = createMockDb();
  const { cellId } = await seedCell(db);

  const { childIds } = await subdivideCell({ db }, { cellId });
  const result = await undivideCell({ db }, { cellId });

  assert.equal(result.deletedCount, 4);

  for (const id of childIds) {
    const child = await db.get(id);
    assert.equal(child, null, `Child ${id} must be deleted`);
  }

  const cell = await db.get(cellId);
  assert.equal(cell.isLeaf, true);
});

test("undivide on subdivided root cell: listCells shows single leaf again", async () => {
  const db = createMockDb();
  const { gridId, cellId } = await seedCell(db);

  await subdivideCell({ db }, { cellId });
  await undivideCell({ db }, { cellId });

  const cells = await listCells({ db }, { gridId });
  assert.equal(cells.length, 1);
  assert.equal(cells[0]._id, cellId);
});

test("undivide on root cell with grandchildren: deletes all descendants", async () => {
  const db = createMockDb();
  const { gridId, cellId } = await seedCell(db);

  const { childIds } = await subdivideCell({ db }, { cellId });
  await subdivideCell({ db }, { cellId: childIds[0] });

  const result = await undivideCell({ db }, { cellId });

  // 4 children + 4 grandchildren = 8
  assert.equal(result.deletedCount, 8);

  const cells = await listCells({ db }, { gridId });
  assert.equal(cells.length, 1);
  assert.equal(cells[0]._id, cellId);
});

// ============================================================
// Guard: undividing while a child is searching throws
// ============================================================

test("undivide throws when a sibling cell is searching", async () => {
  const db = createMockDb();
  const { cellId } = await seedCell(db);

  const { childIds } = await subdivideCell({ db }, { cellId });
  await db.patch(childIds[2], { status: "searching" });

  await assert.rejects(
    () => undivideCell({ db }, { cellId: childIds[0] }),
    { message: "Cannot undivide while a child cell is being searched" },
  );

  // All children still exist (nothing deleted)
  for (const id of childIds) {
    const child = await db.get(id);
    assert.notEqual(child, null, `Child ${id} must still exist`);
  }

  // Parent unchanged
  const parent = await db.get(cellId);
  assert.equal(parent.isLeaf, false);
});

test("undivide throws when a grandchild is searching", async () => {
  const db = createMockDb();
  const { cellId } = await seedCell(db);

  const { childIds } = await subdivideCell({ db }, { cellId });
  const { childIds: grandchildIds } = await subdivideCell(
    { db },
    { cellId: childIds[0] },
  );

  await db.patch(grandchildIds[1], { status: "searching" });

  await assert.rejects(
    () => undivideCell({ db }, { cellId: childIds[1] }),
    { message: "Cannot undivide while a child cell is being searched" },
  );

  // Parent unchanged
  const parent = await db.get(cellId);
  assert.equal(parent.isLeaf, false);
});

// ============================================================
// Subdivide → undivide → re-subdivide works
// ============================================================

test("can re-subdivide after undividing (no stale children)", async () => {
  const db = createMockDb();
  const { gridId, cellId } = await seedCell(db);

  // First subdivide
  const first = await subdivideCell({ db }, { cellId });
  assert.equal(first.childIds.length, 4);

  // Undivide
  await undivideCell({ db }, { cellId: first.childIds[0] });

  // Re-subdivide — should create fresh children
  const second = await subdivideCell({ db }, { cellId });
  assert.equal(second.childIds.length, 4);

  // New children are different IDs (old ones were deleted)
  const overlap = second.childIds.filter((id) => first.childIds.includes(id));
  assert.equal(overlap.length, 0, "Re-subdivide creates new child IDs");

  // listCells shows 4 new leaves
  const cells = await listCells({ db }, { gridId });
  assert.equal(cells.length, 4);
});

// ============================================================
// Various parent statuses preserved through round-trip
// ============================================================

test("round-trip preserves searched parent status", async () => {
  const db = createMockDb();
  const { cellId } = await seedCell(db, {
    status: "searched",
    resultCount: 25,
    querySaturation: [{ query: "farms", count: 25 }],
  });

  const { childIds } = await subdivideCell({ db }, { cellId });
  await undivideCell({ db }, { cellId: childIds[0] });

  const cell = await db.get(cellId);
  assert.equal(cell.status, "searched");
  assert.equal(cell.resultCount, 25);
});

test("round-trip preserves unsearched parent status", async () => {
  const db = createMockDb();
  const { cellId } = await seedCell(db, {
    status: "unsearched",
    resultCount: undefined,
    querySaturation: undefined,
    lastSearchedAt: undefined,
  });

  const { childIds } = await subdivideCell({ db }, { cellId });
  await undivideCell({ db }, { cellId: childIds[0] });

  const cell = await db.get(cellId);
  assert.equal(cell.status, "unsearched");
  assert.equal(cell.resultCount, undefined);
});
