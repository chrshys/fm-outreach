import assert from "node:assert/strict";
import test from "node:test";

// ============================================================
// Behavioral tests for undivideCell mutation
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

class ConvexError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConvexError";
  }
}

// Replicate undivideCell handler logic from gridCells.ts
async function undivideCell(ctx, args) {
  const cell = await ctx.db.get(args.cellId);
  if (!cell) {
    throw new ConvexError("Cell not found");
  }

  const parentCellId = cell.parentCellId;
  if (!parentCellId) {
    throw new ConvexError("Cell has no parent to undivide");
  }

  const parentCell = await ctx.db.get(parentCellId);
  if (!parentCell) {
    throw new ConvexError("Parent cell not found");
  }

  // BFS-walk all descendants of the parent
  const toDelete = [];
  const queue = [parentCellId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    const children = await ctx.db
      .query("discoveryCells")
      .withIndex("by_parentCellId", (q) => q.eq("parentCellId", currentId))
      .collect();

    for (const child of children) {
      toDelete.push(child._id);
      queue.push(child._id);
    }
  }

  for (const id of toDelete) {
    await ctx.db.delete(id);
  }

  await ctx.db.patch(parentCellId, { isLeaf: true });

  return { deletedCount: toDelete.length };
}

// Helper: seed a grid with a parent cell and 4 children
async function seedSubdividedCell(db, overrides = {}) {
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

  const parentId = await db.insert("discoveryCells", {
    swLat: 42.85,
    swLng: -79.9,
    neLat: 43.03,
    neLng: -79.65,
    depth: 0,
    isLeaf: false,
    status: "saturated",
    gridId,
    resultCount: 60,
    querySaturation: [{ query: "farms", count: 60 }],
    lastSearchedAt: Date.now(),
  });

  const midLat = (42.85 + 43.03) / 2;
  const midLng = (-79.9 + -79.65) / 2;

  const quadrants = [
    { swLat: 42.85, swLng: -79.9, neLat: midLat, neLng: midLng },
    { swLat: 42.85, swLng: midLng, neLat: midLat, neLng: -79.65 },
    { swLat: midLat, swLng: -79.9, neLat: 43.03, neLng: midLng },
    { swLat: midLat, swLng: midLng, neLat: 43.03, neLng: -79.65 },
  ];

  const childIds = [];
  for (const q of quadrants) {
    const childId = await db.insert("discoveryCells", {
      ...q,
      depth: 1,
      parentCellId: parentId,
      isLeaf: true,
      status: "unsearched",
      gridId,
      ...overrides,
    });
    childIds.push(childId);
  }

  return { gridId, parentId, childIds };
}

// ============================================================
// Core: undivide deletes children and restores parent leaf
// ============================================================

test("undivideCell deletes all 4 children", async () => {
  const db = createMockDb();
  const { childIds } = await seedSubdividedCell(db);

  const result = await undivideCell({ db }, { cellId: childIds[0] });

  assert.equal(result.deletedCount, 4, "Must delete exactly 4 children");

  for (const childId of childIds) {
    const child = await db.get(childId);
    assert.equal(child, null, `Child ${childId} must be deleted`);
  }
});

test("undivideCell sets parent isLeaf back to true", async () => {
  const db = createMockDb();
  const { parentId, childIds } = await seedSubdividedCell(db);

  await undivideCell({ db }, { cellId: childIds[0] });

  const parent = await db.get(parentId);
  assert.equal(parent.isLeaf, true, "Parent must be restored to isLeaf: true");
});

test("undivideCell preserves parent status, resultCount, querySaturation", async () => {
  const db = createMockDb();
  const { parentId, childIds } = await seedSubdividedCell(db);

  const parentBefore = await db.get(parentId);
  await undivideCell({ db }, { cellId: childIds[0] });
  const parentAfter = await db.get(parentId);

  assert.equal(parentAfter.status, parentBefore.status);
  assert.equal(parentAfter.resultCount, parentBefore.resultCount);
  assert.deepStrictEqual(parentAfter.querySaturation, parentBefore.querySaturation);
});

test("undivideCell returns { deletedCount } matching children count", async () => {
  const db = createMockDb();
  const { childIds } = await seedSubdividedCell(db);

  const result = await undivideCell({ db }, { cellId: childIds[0] });
  assert.equal(result.deletedCount, childIds.length);
});

// ============================================================
// Any sibling can trigger undivide
// ============================================================

test("undivideCell works when called with any sibling cell", async () => {
  const db = createMockDb();
  const { parentId, childIds } = await seedSubdividedCell(db);

  // Call with the last child instead of the first
  const result = await undivideCell({ db }, { cellId: childIds[3] });

  assert.equal(result.deletedCount, 4);
  const parent = await db.get(parentId);
  assert.equal(parent.isLeaf, true);
});

// ============================================================
// Guard: cell not found
// ============================================================

test("throws when cellId does not exist", async () => {
  const db = createMockDb();

  await assert.rejects(
    () => undivideCell({ db }, { cellId: "discoveryCells:999" }),
    { message: "Cell not found" },
  );
});

// ============================================================
// Guard: cell has no parent (root cell)
// ============================================================

test("throws when cell has no parentCellId (root cell)", async () => {
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

  const rootCellId = await db.insert("discoveryCells", {
    swLat: 42.85,
    swLng: -79.9,
    neLat: 43.03,
    neLng: -79.65,
    depth: 0,
    isLeaf: true,
    status: "unsearched",
    gridId,
  });

  await assert.rejects(
    () => undivideCell({ db }, { cellId: rootCellId }),
    { message: "Cell has no parent to undivide" },
  );
});

// ============================================================
// Guard: parent cell not found
// ============================================================

test("throws when parent cell does not exist", async () => {
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

  const orphanCellId = await db.insert("discoveryCells", {
    swLat: 42.85,
    swLng: -79.9,
    neLat: 43.03,
    neLng: -79.65,
    depth: 1,
    parentCellId: "discoveryCells:nonexistent",
    isLeaf: true,
    status: "unsearched",
    gridId,
  });

  await assert.rejects(
    () => undivideCell({ db }, { cellId: orphanCellId }),
    { message: "Parent cell not found" },
  );
});

// ============================================================
// Undividing while a child is searching succeeds
// ============================================================

test("succeeds when any child cell has status searching", async () => {
  const db = createMockDb();
  const { parentId, childIds } = await seedSubdividedCell(db);

  // Mark one child as searching
  await db.patch(childIds[2], { status: "searching" });

  const result = await undivideCell({ db }, { cellId: childIds[0] });
  assert.equal(result.deletedCount, 4);

  // All children deleted including the searching one
  for (const id of childIds) {
    const child = await db.get(id);
    assert.equal(child, null, `Child ${id} must be deleted`);
  }

  // Parent restored to leaf
  const parent = await db.get(parentId);
  assert.equal(parent.isLeaf, true);
});

test("succeeds when a grandchild cell has status searching", async () => {
  const db = createMockDb();
  const { parentId, childIds, gridId } = await seedSubdividedCell(db);

  // Subdivide first child to create grandchildren
  const firstChild = await db.get(childIds[0]);
  await db.patch(childIds[0], { isLeaf: false });

  const midLat = (firstChild.swLat + firstChild.neLat) / 2;
  const midLng = (firstChild.swLng + firstChild.neLng) / 2;

  const gcId = await db.insert("discoveryCells", {
    swLat: firstChild.swLat,
    swLng: firstChild.swLng,
    neLat: midLat,
    neLng: midLng,
    depth: 2,
    parentCellId: childIds[0],
    isLeaf: true,
    status: "searching", // This grandchild is being searched
    gridId,
  });

  // Undivide from a sibling — succeeds despite grandchild searching
  const result = await undivideCell({ db }, { cellId: childIds[1] });
  // 4 children + 1 grandchild = 5
  assert.equal(result.deletedCount, 5);

  // Grandchild also deleted
  const gc = await db.get(gcId);
  assert.equal(gc, null, "Searching grandchild must be deleted");

  // Parent restored to leaf
  const parent = await db.get(parentId);
  assert.equal(parent.isLeaf, true);
});

// ============================================================
// Multi-level: undivide deletes grandchildren too
// ============================================================

test("undivide deletes grandchildren (multi-level descendants)", async () => {
  const db = createMockDb();
  const { parentId, childIds, gridId } = await seedSubdividedCell(db);

  // Subdivide first child
  const firstChild = await db.get(childIds[0]);
  await db.patch(childIds[0], { isLeaf: false });

  const midLat = (firstChild.swLat + firstChild.neLat) / 2;
  const midLng = (firstChild.swLng + firstChild.neLng) / 2;

  const grandchildIds = [];
  const quadrants = [
    { swLat: firstChild.swLat, swLng: firstChild.swLng, neLat: midLat, neLng: midLng },
    { swLat: firstChild.swLat, swLng: midLng, neLat: midLat, neLng: firstChild.neLng },
    { swLat: midLat, swLng: firstChild.swLng, neLat: firstChild.neLat, neLng: midLng },
    { swLat: midLat, swLng: midLng, neLat: firstChild.neLat, neLng: firstChild.neLng },
  ];

  for (const q of quadrants) {
    const gcId = await db.insert("discoveryCells", {
      ...q,
      depth: 2,
      parentCellId: childIds[0],
      isLeaf: true,
      status: "unsearched",
      gridId,
    });
    grandchildIds.push(gcId);
  }

  // Undivide from a sibling of the subdivided child
  const result = await undivideCell({ db }, { cellId: childIds[1] });

  // 4 children + 4 grandchildren = 8
  assert.equal(result.deletedCount, 8, "Must delete children and grandchildren");

  // All descendants gone
  for (const id of [...childIds, ...grandchildIds]) {
    const doc = await db.get(id);
    assert.equal(doc, null, `Descendant ${id} must be deleted`);
  }

  // Parent restored
  const parent = await db.get(parentId);
  assert.equal(parent.isLeaf, true);
});

// ============================================================
// Searched/saturated children can be undivided
// ============================================================

test("allows undividing when children are searched", async () => {
  const db = createMockDb();
  const { childIds } = await seedSubdividedCell(db, { status: "searched" });

  const result = await undivideCell({ db }, { cellId: childIds[0] });
  assert.equal(result.deletedCount, 4);
});

test("allows undividing when children are saturated", async () => {
  const db = createMockDb();
  const { childIds } = await seedSubdividedCell(db, { status: "saturated" });

  const result = await undivideCell({ db }, { cellId: childIds[0] });
  assert.equal(result.deletedCount, 4);
});

test("allows undividing when children are unsearched", async () => {
  const db = createMockDb();
  const { childIds } = await seedSubdividedCell(db);

  const result = await undivideCell({ db }, { cellId: childIds[0] });
  assert.equal(result.deletedCount, 4);
});
