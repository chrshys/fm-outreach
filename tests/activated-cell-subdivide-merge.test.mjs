import assert from "node:assert/strict";
import test from "node:test";

// ============================================================
// End-to-end test: activated cells (created via activateCell)
// can be subdivided and merged back, with correct state
// transitions and listCells integration.
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

// Replicate activateCell handler logic from gridCells.ts
async function activateCell(ctx, args) {
  const existing = await ctx.db
    .query("discoveryCells")
    .withIndex("by_gridId_boundsKey", (q) =>
      q.eq("gridId", args.gridId).eq("boundsKey", args.boundsKey),
    )
    .first();

  if (existing) {
    return { cellId: existing._id, alreadyExisted: true };
  }

  const cellId = await ctx.db.insert("discoveryCells", {
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

const MAX_DEPTH = 4;

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
      boundsKey: `${q.swLat.toFixed(6)}_${q.swLng.toFixed(6)}`,
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

  const allGridCells = await ctx.db
    .query("discoveryCells")
    .withIndex("by_gridId", (q) => q.eq("gridId", args.gridId))
    .collect();
  const depth0Cells = allGridCells.filter((c) => c.depth === 0);
  const activatedBoundsKeys = depth0Cells
    .map((cell) => cell.boundsKey)
    .filter((key) => key !== undefined);

  return {
    cells: cells.map((cell) => ({
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
      boundsKey: cell.boundsKey,
    })),
    activatedBoundsKeys,
  };
}

// Replicate getOrCreateGlobalGrid handler logic from gridCells.ts
async function getOrCreateGlobalGrid(ctx) {
  const grids = await ctx.db.query("discoveryGrids").collect();
  const grid = grids[0];

  if (grid) {
    return { gridId: grid._id, created: false };
  }

  const gridId = await ctx.db.insert("discoveryGrids", {
    name: "Discovery",
    region: "Ontario",
    province: "Ontario",
    queries: ["farm market", "fruit stand", "farmers market"],
    cellSizeKm: 10,
    totalLeadsFound: 0,
    createdAt: Date.now(),
  });

  return { gridId, created: true };
}

// ============================================================
// Full lifecycle: activate → subdivide → verify children → merge → verify parent
// ============================================================

test("activated cell can be subdivided into 4 children", async () => {
  const db = createMockDb();
  const { gridId } = await getOrCreateGlobalGrid({ db });

  // Activate a virtual cell (simulating user click on virtual grid)
  const { cellId } = await activateCell({ db }, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09009,
    neLng: -79.37793,
    boundsKey: "43.000000_-79.500000",
  });

  // Subdivide the activated cell
  const { childIds } = await subdivideCell({ db }, { cellId });

  assert.equal(childIds.length, 4, "Must create exactly 4 children");

  for (const childId of childIds) {
    const child = await db.get(childId);
    assert.equal(child.depth, 1, "Children are at depth 1");
    assert.equal(child.isLeaf, true, "Children are leaves");
    assert.equal(child.status, "unsearched", "Children start unsearched");
    assert.equal(child.parentCellId, cellId, "Children reference activated parent");
    assert.equal(child.gridId, gridId, "Children inherit gridId");
    assert.ok(child.boundsKey, "Children have boundsKey set");
  }
});

test("subdivided activated cell is no longer a leaf", async () => {
  const db = createMockDb();
  const { gridId } = await getOrCreateGlobalGrid({ db });

  const { cellId } = await activateCell({ db }, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09009,
    neLng: -79.37793,
    boundsKey: "43.000000_-79.500000",
  });

  await subdivideCell({ db }, { cellId });

  const parent = await db.get(cellId);
  assert.equal(parent.isLeaf, false, "Activated parent becomes non-leaf");
});

test("listCells returns children (not parent) after subdividing an activated cell", async () => {
  const db = createMockDb();
  const { gridId } = await getOrCreateGlobalGrid({ db });

  const { cellId } = await activateCell({ db }, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09009,
    neLng: -79.37793,
    boundsKey: "43.000000_-79.500000",
  });

  // Before subdivide: 1 leaf cell
  const before = await listCells({ db }, { gridId });
  assert.equal(before.cells.length, 1, "Single activated cell before split");
  assert.equal(before.cells[0]._id, cellId);

  // After subdivide: 4 leaf cells (children)
  const { childIds } = await subdivideCell({ db }, { cellId });
  const after = await listCells({ db }, { gridId });
  assert.equal(after.cells.length, 4, "4 children after split");

  const afterIds = after.cells.map((c) => c._id).sort();
  assert.deepStrictEqual(afterIds, [...childIds].sort());
});

test("activatedBoundsKeys still contains parent key after subdivide", async () => {
  const db = createMockDb();
  const { gridId } = await getOrCreateGlobalGrid({ db });

  const { cellId } = await activateCell({ db }, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09009,
    neLng: -79.37793,
    boundsKey: "43.000000_-79.500000",
  });

  await subdivideCell({ db }, { cellId });

  const result = await listCells({ db }, { gridId });
  assert.ok(
    result.activatedBoundsKeys.includes("43.000000_-79.500000"),
    "activatedBoundsKeys should still contain the parent boundsKey after subdivide",
  );
});

test("children tile the activated cell exactly", async () => {
  const db = createMockDb();
  const { gridId } = await getOrCreateGlobalGrid({ db });

  const bounds = { swLat: 43.0, swLng: -79.5, neLat: 43.09009, neLng: -79.37793 };
  const { cellId } = await activateCell({ db }, {
    gridId,
    ...bounds,
    boundsKey: "43.000000_-79.500000",
  });

  const { childIds } = await subdivideCell({ db }, { cellId });
  const children = await Promise.all(childIds.map((id) => db.get(id)));

  const minLat = Math.min(...children.map((c) => c.swLat));
  const maxLat = Math.max(...children.map((c) => c.neLat));
  const minLng = Math.min(...children.map((c) => c.swLng));
  const maxLng = Math.max(...children.map((c) => c.neLng));

  assert.equal(minLat, bounds.swLat, "Union swLat matches activated cell");
  assert.equal(maxLat, bounds.neLat, "Union neLat matches activated cell");
  assert.equal(minLng, bounds.swLng, "Union swLng matches activated cell");
  assert.equal(maxLng, bounds.neLng, "Union neLng matches activated cell");
});

// ============================================================
// Merge: undivide children back to activated parent
// ============================================================

test("merge from child cell restores activated parent as leaf", async () => {
  const db = createMockDb();
  const { gridId } = await getOrCreateGlobalGrid({ db });

  const { cellId } = await activateCell({ db }, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09009,
    neLng: -79.37793,
    boundsKey: "43.000000_-79.500000",
  });

  const { childIds } = await subdivideCell({ db }, { cellId });

  // Merge from any child
  const result = await undivideCell({ db }, { cellId: childIds[0] });

  assert.equal(result.deletedCount, 4, "All 4 children deleted");

  const parent = await db.get(cellId);
  assert.equal(parent.isLeaf, true, "Activated parent restored to leaf");
  assert.equal(parent.status, "unsearched", "Activated parent retains original status");
  assert.equal(parent.boundsKey, "43.000000_-79.500000", "Activated parent retains boundsKey");
  assert.equal(parent.depth, 0, "Activated parent remains at depth 0");
});

test("merge from any sibling restores the same parent", async () => {
  const db = createMockDb();
  const { gridId } = await getOrCreateGlobalGrid({ db });

  const { cellId } = await activateCell({ db }, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09009,
    neLng: -79.37793,
    boundsKey: "43.000000_-79.500000",
  });

  const { childIds } = await subdivideCell({ db }, { cellId });

  // Merge from last child (not first)
  const result = await undivideCell({ db }, { cellId: childIds[3] });

  assert.equal(result.deletedCount, 4);
  const parent = await db.get(cellId);
  assert.equal(parent.isLeaf, true);
});

test("listCells returns parent again after merging subdivided activated cell", async () => {
  const db = createMockDb();
  const { gridId } = await getOrCreateGlobalGrid({ db });

  const { cellId } = await activateCell({ db }, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09009,
    neLng: -79.37793,
    boundsKey: "43.000000_-79.500000",
  });

  const { childIds } = await subdivideCell({ db }, { cellId });
  await undivideCell({ db }, { cellId: childIds[0] });

  const result = await listCells({ db }, { gridId });
  assert.equal(result.cells.length, 1, "Back to single leaf cell");
  assert.equal(result.cells[0]._id, cellId, "Parent cell is the one returned");
  assert.equal(result.cells[0].boundsKey, "43.000000_-79.500000", "boundsKey preserved");
});

// ============================================================
// Full round-trip: activate → subdivide → merge → re-subdivide
// ============================================================

test("can re-subdivide an activated cell after merge", async () => {
  const db = createMockDb();
  const { gridId } = await getOrCreateGlobalGrid({ db });

  const { cellId } = await activateCell({ db }, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09009,
    neLng: -79.37793,
    boundsKey: "43.000000_-79.500000",
  });

  // First subdivide
  const first = await subdivideCell({ db }, { cellId });
  assert.equal(first.childIds.length, 4);

  // Merge
  await undivideCell({ db }, { cellId: first.childIds[0] });

  // Re-subdivide
  const second = await subdivideCell({ db }, { cellId });
  assert.equal(second.childIds.length, 4);

  // New IDs (old children were deleted)
  const overlap = second.childIds.filter((id) => first.childIds.includes(id));
  assert.equal(overlap.length, 0, "Re-subdivide creates fresh child IDs");

  const result = await listCells({ db }, { gridId });
  assert.equal(result.cells.length, 4, "4 leaf cells after re-subdivide");
});

// ============================================================
// Multi-level subdivide on activated cells
// ============================================================

test("activated cell children can be subdivided to depth 2", async () => {
  const db = createMockDb();
  const { gridId } = await getOrCreateGlobalGrid({ db });

  const { cellId } = await activateCell({ db }, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09009,
    neLng: -79.37793,
    boundsKey: "43.000000_-79.500000",
  });

  // Subdivide root
  const { childIds } = await subdivideCell({ db }, { cellId });

  // Subdivide first child
  const { childIds: grandchildIds } = await subdivideCell({ db }, { cellId: childIds[0] });

  assert.equal(grandchildIds.length, 4, "4 grandchildren created");

  for (const gcId of grandchildIds) {
    const gc = await db.get(gcId);
    assert.equal(gc.depth, 2, "Grandchildren at depth 2");
    assert.equal(gc.parentCellId, childIds[0], "Grandchildren reference child parent");
  }

  // listCells: 3 children (non-subdivided) + 4 grandchildren = 7
  const result = await listCells({ db }, { gridId });
  assert.equal(result.cells.length, 7, "7 leaf cells total");
});

test("merge from grandchild collapses only its parent level", async () => {
  const db = createMockDb();
  const { gridId } = await getOrCreateGlobalGrid({ db });

  const { cellId } = await activateCell({ db }, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09009,
    neLng: -79.37793,
    boundsKey: "43.000000_-79.500000",
  });

  const { childIds } = await subdivideCell({ db }, { cellId });
  const { childIds: grandchildIds } = await subdivideCell({ db }, { cellId: childIds[0] });

  // Merge from a grandchild — collapses childIds[0]'s subtree
  const result = await undivideCell({ db }, { cellId: grandchildIds[0] });
  assert.equal(result.deletedCount, 4, "4 grandchildren deleted");

  // childIds[0] is a leaf again
  const child0 = await db.get(childIds[0]);
  assert.equal(child0.isLeaf, true);

  // listCells: back to 4 children
  const cells = await listCells({ db }, { gridId });
  assert.equal(cells.cells.length, 4);
});

test("merge from child with grandchildren collapses entire tree back to root", async () => {
  const db = createMockDb();
  const { gridId } = await getOrCreateGlobalGrid({ db });

  const { cellId } = await activateCell({ db }, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09009,
    neLng: -79.37793,
    boundsKey: "43.000000_-79.500000",
  });

  const { childIds } = await subdivideCell({ db }, { cellId });
  await subdivideCell({ db }, { cellId: childIds[0] });

  // Merge from a non-subdivided sibling — collapses root
  const result = await undivideCell({ db }, { cellId: childIds[1] });

  // 4 children + 4 grandchildren = 8
  assert.equal(result.deletedCount, 8, "All descendants deleted");

  const root = await db.get(cellId);
  assert.equal(root.isLeaf, true, "Root is leaf again");
  assert.equal(root.boundsKey, "43.000000_-79.500000", "Root boundsKey preserved");

  const cells = await listCells({ db }, { gridId });
  assert.equal(cells.cells.length, 1);
  assert.equal(cells.cells[0]._id, cellId);
});

// ============================================================
// Multiple activated cells: subdivide/merge one doesn't affect others
// ============================================================

test("subdividing one activated cell does not affect neighboring activated cells", async () => {
  const db = createMockDb();
  const { gridId } = await getOrCreateGlobalGrid({ db });

  // Activate two adjacent cells
  const { cellId: cellA } = await activateCell({ db }, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09009,
    neLng: -79.37793,
    boundsKey: "43.000000_-79.500000",
  });

  const { cellId: cellB } = await activateCell({ db }, {
    gridId,
    swLat: 43.0,
    swLng: -79.37793,
    neLat: 43.09009,
    neLng: -79.25587,
    boundsKey: "43.000000_-79.377930",
  });

  // Subdivide cell A
  await subdivideCell({ db }, { cellId: cellA });

  // Cell B is unaffected
  const cellBDoc = await db.get(cellB);
  assert.equal(cellBDoc.isLeaf, true, "Neighboring cell remains a leaf");
  assert.equal(cellBDoc.depth, 0, "Neighboring cell remains at depth 0");
  assert.equal(cellBDoc.status, "unsearched", "Neighboring cell retains status");

  // listCells: 4 children of A + 1 leaf B = 5
  const result = await listCells({ db }, { gridId });
  assert.equal(result.cells.length, 5, "5 leaf cells total");

  // activatedBoundsKeys still has both root keys
  assert.ok(result.activatedBoundsKeys.includes("43.000000_-79.500000"));
  assert.ok(result.activatedBoundsKeys.includes("43.000000_-79.377930"));
});

test("merging one activated cell's children does not affect neighboring activated cells", async () => {
  const db = createMockDb();
  const { gridId } = await getOrCreateGlobalGrid({ db });

  const { cellId: cellA } = await activateCell({ db }, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09009,
    neLng: -79.37793,
    boundsKey: "43.000000_-79.500000",
  });

  const { cellId: cellB } = await activateCell({ db }, {
    gridId,
    swLat: 43.0,
    swLng: -79.37793,
    neLat: 43.09009,
    neLng: -79.25587,
    boundsKey: "43.000000_-79.377930",
  });

  // Subdivide both
  const { childIds: childrenA } = await subdivideCell({ db }, { cellId: cellA });
  const { childIds: childrenB } = await subdivideCell({ db }, { cellId: cellB });

  // Merge only cell A
  await undivideCell({ db }, { cellId: childrenA[0] });

  // Cell A is a single leaf again
  const resultA = await db.get(cellA);
  assert.equal(resultA.isLeaf, true);

  // Cell B still has its 4 children
  for (const childId of childrenB) {
    const child = await db.get(childId);
    assert.notEqual(child, null, `Cell B child ${childId} still exists`);
  }

  // listCells: 1 (A restored) + 4 (B children) = 5
  const result = await listCells({ db }, { gridId });
  assert.equal(result.cells.length, 5);
});

// ============================================================
// Guard: cannot subdivide searching activated cell
// ============================================================

test("cannot subdivide an activated cell that is currently searching", async () => {
  const db = createMockDb();
  const { gridId } = await getOrCreateGlobalGrid({ db });

  const { cellId } = await activateCell({ db }, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09009,
    neLng: -79.37793,
    boundsKey: "43.000000_-79.500000",
  });

  // Simulate search in progress
  await db.patch(cellId, { status: "searching" });

  await assert.rejects(
    () => subdivideCell({ db }, { cellId }),
    { message: "Cannot subdivide while cell is being searched" },
  );

  // Cell unchanged
  const cell = await db.get(cellId);
  assert.equal(cell.isLeaf, true, "Cell remains a leaf");
});

// ============================================================
// Guard: cannot merge while any child of activated cell is searching
// ============================================================

test("cannot merge activated cell children while one is searching", async () => {
  const db = createMockDb();
  const { gridId } = await getOrCreateGlobalGrid({ db });

  const { cellId } = await activateCell({ db }, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09009,
    neLng: -79.37793,
    boundsKey: "43.000000_-79.500000",
  });

  const { childIds } = await subdivideCell({ db }, { cellId });

  // Mark one child as searching
  await db.patch(childIds[1], { status: "searching" });

  await assert.rejects(
    () => undivideCell({ db }, { cellId: childIds[0] }),
    { message: "Cannot undivide while a child cell is being searched" },
  );

  // All children still exist
  for (const id of childIds) {
    const child = await db.get(id);
    assert.notEqual(child, null, `Child ${id} must still exist`);
  }
});

// ============================================================
// Guard: cannot undivide a leaf activated cell (no children)
// ============================================================

test("cannot undivide a leaf activated cell with no children", async () => {
  const db = createMockDb();
  const { gridId } = await getOrCreateGlobalGrid({ db });

  const { cellId } = await activateCell({ db }, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09009,
    neLng: -79.37793,
    boundsKey: "43.000000_-79.500000",
  });

  await assert.rejects(
    () => undivideCell({ db }, { cellId }),
    { message: "Cell has no children to undivide" },
  );
});

// ============================================================
// Subdivide searched activated cell
// ============================================================

test("can subdivide an activated cell after it has been searched", async () => {
  const db = createMockDb();
  const { gridId } = await getOrCreateGlobalGrid({ db });

  const { cellId } = await activateCell({ db }, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09009,
    neLng: -79.37793,
    boundsKey: "43.000000_-79.500000",
  });

  // Simulate search completion
  await db.patch(cellId, {
    status: "searched",
    resultCount: 15,
    querySaturation: [{ query: "farm market", count: 15 }],
    lastSearchedAt: Date.now(),
  });

  const { childIds } = await subdivideCell({ db }, { cellId });

  assert.equal(childIds.length, 4, "Searched activated cell can be subdivided");

  for (const childId of childIds) {
    const child = await db.get(childId);
    assert.equal(child.status, "unsearched", "Children start unsearched regardless of parent status");
  }

  // Parent preserves its search data
  const parent = await db.get(cellId);
  assert.equal(parent.status, "searched", "Parent retains searched status");
  assert.equal(parent.resultCount, 15, "Parent retains resultCount");
  assert.equal(parent.isLeaf, false, "Parent is no longer a leaf");
});

// ============================================================
// Subdivide saturated activated cell
// ============================================================

test("can subdivide a saturated activated cell", async () => {
  const db = createMockDb();
  const { gridId } = await getOrCreateGlobalGrid({ db });

  const { cellId } = await activateCell({ db }, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09009,
    neLng: -79.37793,
    boundsKey: "43.000000_-79.500000",
  });

  // Simulate saturation
  await db.patch(cellId, {
    status: "saturated",
    resultCount: 60,
    querySaturation: [
      { query: "farm market", count: 20 },
      { query: "fruit stand", count: 20 },
      { query: "farmers market", count: 20 },
    ],
    lastSearchedAt: Date.now(),
  });

  const { childIds } = await subdivideCell({ db }, { cellId });

  assert.equal(childIds.length, 4, "Saturated activated cell can be subdivided");
});

// ============================================================
// Merge restores parent data after children were searched
// ============================================================

test("merge restores parent data even after children were searched", async () => {
  const db = createMockDb();
  const { gridId } = await getOrCreateGlobalGrid({ db });

  const { cellId } = await activateCell({ db }, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09009,
    neLng: -79.37793,
    boundsKey: "43.000000_-79.500000",
  });

  // Search the activated cell first
  await db.patch(cellId, {
    status: "saturated",
    resultCount: 60,
    querySaturation: [{ query: "farm market", count: 60 }],
    lastSearchedAt: 1700000000000,
  });

  // Subdivide
  const { childIds } = await subdivideCell({ db }, { cellId });

  // Search some children
  await db.patch(childIds[0], { status: "searched", resultCount: 10 });
  await db.patch(childIds[1], { status: "saturated", resultCount: 20 });

  // Merge
  await undivideCell({ db }, { cellId: childIds[0] });

  // Parent's original data is preserved (not overwritten by children)
  const parent = await db.get(cellId);
  assert.equal(parent.status, "saturated", "Parent status preserved");
  assert.equal(parent.resultCount, 60, "Parent resultCount preserved");
  assert.equal(parent.lastSearchedAt, 1700000000000, "Parent lastSearchedAt preserved");
  assert.equal(parent.boundsKey, "43.000000_-79.500000", "Parent boundsKey preserved");
});
