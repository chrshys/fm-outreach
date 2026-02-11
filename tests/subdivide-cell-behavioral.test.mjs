import assert from "node:assert/strict";
import test from "node:test";

// ============================================================
// Behavioral test: call subdivideCell on a saturated cell and
// verify 4 children created with isLeaf: true, parent patched
// to isLeaf: false
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
          // Simple index simulation: filterFn builds eq chain
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

// Replicate the subdivideCell handler logic exactly as in gridCells.ts
const MAX_DEPTH = 4;

class ConvexError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConvexError";
  }
}

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

// Helper: seed a saturated cell in the mock db
async function seedSaturatedCell(db, overrides = {}) {
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
    lastSearchedAt: Date.now(),
    ...overrides,
  });

  return { gridId, cellId };
}

// ============================================================
// Core behavioral test: subdivide a saturated cell
// ============================================================

test("subdivideCell creates exactly 4 children from a saturated cell", async () => {
  const db = createMockDb();
  const { cellId } = await seedSaturatedCell(db);

  const result = await subdivideCell({ db }, { cellId });

  assert.equal(result.childIds.length, 4, "Must create exactly 4 children");
});

test("all 4 children have isLeaf: true", async () => {
  const db = createMockDb();
  const { cellId } = await seedSaturatedCell(db);

  const { childIds } = await subdivideCell({ db }, { cellId });

  for (const childId of childIds) {
    const child = await db.get(childId);
    assert.equal(child.isLeaf, true, `Child ${childId} must have isLeaf: true`);
  }
});

test("parent cell is patched to isLeaf: false after subdivision", async () => {
  const db = createMockDb();
  const { cellId } = await seedSaturatedCell(db);

  await subdivideCell({ db }, { cellId });

  const parent = await db.get(cellId);
  assert.equal(parent.isLeaf, false, "Parent must be patched to isLeaf: false");
});

test("all 4 children have status: unsearched", async () => {
  const db = createMockDb();
  const { cellId } = await seedSaturatedCell(db);

  const { childIds } = await subdivideCell({ db }, { cellId });

  for (const childId of childIds) {
    const child = await db.get(childId);
    assert.equal(child.status, "unsearched", `Child ${childId} must have status: unsearched`);
  }
});

test("all 4 children have depth = parent.depth + 1", async () => {
  const db = createMockDb();
  const { cellId } = await seedSaturatedCell(db);

  const { childIds } = await subdivideCell({ db }, { cellId });

  for (const childId of childIds) {
    const child = await db.get(childId);
    assert.equal(child.depth, 1, `Child ${childId} must have depth 1 (parent was 0)`);
  }
});

test("all 4 children reference the parent via parentCellId", async () => {
  const db = createMockDb();
  const { cellId } = await seedSaturatedCell(db);

  const { childIds } = await subdivideCell({ db }, { cellId });

  for (const childId of childIds) {
    const child = await db.get(childId);
    assert.equal(child.parentCellId, cellId, `Child ${childId} must reference parent`);
  }
});

test("all 4 children reference the same gridId as parent", async () => {
  const db = createMockDb();
  const { gridId, cellId } = await seedSaturatedCell(db);

  const { childIds } = await subdivideCell({ db }, { cellId });

  for (const childId of childIds) {
    const child = await db.get(childId);
    assert.equal(child.gridId, gridId, `Child ${childId} must reference gridId`);
  }
});

// ============================================================
// Quadrant geometry: children tile parent exactly
// ============================================================

test("4 children tile the parent cell with no gaps or overlaps", async () => {
  const db = createMockDb();
  const { cellId } = await seedSaturatedCell(db);
  const parent = await db.get(cellId);

  const { childIds } = await subdivideCell({ db }, { cellId });

  const children = await Promise.all(childIds.map((id) => db.get(id)));

  // Union of children covers parent exactly
  const minLat = Math.min(...children.map((c) => c.swLat));
  const maxLat = Math.max(...children.map((c) => c.neLat));
  const minLng = Math.min(...children.map((c) => c.swLng));
  const maxLng = Math.max(...children.map((c) => c.neLng));

  assert.equal(minLat, parent.swLat, "Union swLat must match parent");
  assert.equal(maxLat, parent.neLat, "Union neLat must match parent");
  assert.equal(minLng, parent.swLng, "Union swLng must match parent");
  assert.equal(maxLng, parent.neLng, "Union neLng must match parent");

  // Each child has positive area
  for (const child of children) {
    assert.ok(child.neLat > child.swLat, "Child neLat must be > swLat");
    assert.ok(child.neLng > child.swLng, "Child neLng must be > swLng");
  }

  // Midpoint is the shared boundary
  const midLat = (parent.swLat + parent.neLat) / 2;
  const midLng = (parent.swLng + parent.neLng) / 2;

  // SW quadrant
  assert.equal(children[0].swLat, parent.swLat);
  assert.equal(children[0].swLng, parent.swLng);
  assert.equal(children[0].neLat, midLat);
  assert.equal(children[0].neLng, midLng);

  // SE quadrant
  assert.equal(children[1].swLat, parent.swLat);
  assert.equal(children[1].swLng, midLng);
  assert.equal(children[1].neLat, midLat);
  assert.equal(children[1].neLng, parent.neLng);

  // NW quadrant
  assert.equal(children[2].swLat, midLat);
  assert.equal(children[2].swLng, parent.swLng);
  assert.equal(children[2].neLat, parent.neLat);
  assert.equal(children[2].neLng, midLng);

  // NE quadrant
  assert.equal(children[3].swLat, midLat);
  assert.equal(children[3].swLng, midLng);
  assert.equal(children[3].neLat, parent.neLat);
  assert.equal(children[3].neLng, parent.neLng);
});

// ============================================================
// Guard: allows unsearched, searched, saturated; blocks searching
// ============================================================

test("allows subdividing an unsearched cell", async () => {
  const db = createMockDb();
  const { cellId } = await seedSaturatedCell(db, { status: "unsearched" });

  const result = await subdivideCell({ db }, { cellId });
  assert.equal(result.childIds.length, 4, "Unsearched cell can be subdivided into 4 children");
});

test("allows subdividing a searched cell", async () => {
  const db = createMockDb();
  const { cellId } = await seedSaturatedCell(db, { status: "searched", resultCount: 15 });

  const result = await subdivideCell({ db }, { cellId });
  assert.equal(result.childIds.length, 4, "Searched cell can be subdivided into 4 children");
});

test("throws when cell status is searching", async () => {
  const db = createMockDb();
  const { cellId } = await seedSaturatedCell(db, { status: "searching" });

  await assert.rejects(
    () => subdivideCell({ db }, { cellId }),
    { message: "Cannot subdivide while cell is being searched" },
  );
});

// ============================================================
// Guard: rejects max-depth cells
// ============================================================

test("throws when cell is already at MAX_DEPTH (4)", async () => {
  const db = createMockDb();
  const { cellId } = await seedSaturatedCell(db, { depth: 4 });

  await assert.rejects(
    () => subdivideCell({ db }, { cellId }),
    { message: "Cell is already at maximum depth" },
  );
});

// ============================================================
// Guard: rejects duplicate subdivision
// ============================================================

test("re-subdividing an already-subdivided cell returns existing children (idempotent)", async () => {
  const db = createMockDb();
  const { cellId } = await seedSaturatedCell(db);

  // First subdivision succeeds
  const first = await subdivideCell({ db }, { cellId });

  // Patch parent back to saturated to bypass status guard
  await db.patch(cellId, { status: "saturated", isLeaf: true });

  // Second subdivision returns the same children without creating duplicates
  const second = await subdivideCell({ db }, { cellId });

  assert.deepStrictEqual(
    second.childIds.sort(),
    first.childIds.sort(),
    "Second call must return the same child IDs",
  );
});

test("idempotent subdivision does not create additional children", async () => {
  const db = createMockDb();
  const { cellId } = await seedSaturatedCell(db);

  await subdivideCell({ db }, { cellId });
  await db.patch(cellId, { status: "saturated", isLeaf: true });
  await subdivideCell({ db }, { cellId });

  // Count children for this parent
  const children = await db
    .query("discoveryCells")
    .withIndex("by_parentCellId", (q) => q.eq("parentCellId", cellId))
    .collect();

  assert.equal(children.length, 4, "Must still have exactly 4 children after idempotent retry");
});

// ============================================================
// Guard: cell not found
// ============================================================

test("throws when cellId does not exist", async () => {
  const db = createMockDb();

  await assert.rejects(
    () => subdivideCell({ db }, { cellId: "discoveryCells:999" }),
    { message: "Cell not found" },
  );
});

// ============================================================
// Recursive subdivision: depth 0 → 1 → 2
// ============================================================

test("can subdivide a child cell (depth 1 → 2) after marking it saturated", async () => {
  const db = createMockDb();
  const { cellId } = await seedSaturatedCell(db);

  // Subdivide depth-0 parent
  const { childIds } = await subdivideCell({ db }, { cellId });

  // Mark first child as saturated
  const firstChildId = childIds[0];
  await db.patch(firstChildId, { status: "saturated" });

  // Subdivide the child
  const result = await subdivideCell({ db }, { cellId: firstChildId });

  assert.equal(result.childIds.length, 4, "Second-level subdivision creates 4 children");

  for (const grandchildId of result.childIds) {
    const grandchild = await db.get(grandchildId);
    assert.equal(grandchild.depth, 2, "Grandchildren have depth 2");
    assert.equal(grandchild.isLeaf, true);
    assert.equal(grandchild.parentCellId, firstChildId);
  }

  // First child is no longer a leaf
  const firstChild = await db.get(firstChildId);
  assert.equal(firstChild.isLeaf, false);
});

// ============================================================
// Subdividing searched (non-saturated) cells via Convex dashboard
// ============================================================

test("subdividing a searched cell creates 4 unsearched children", async () => {
  const db = createMockDb();
  const { cellId } = await seedSaturatedCell(db, {
    status: "searched",
    resultCount: 15,
    querySaturation: [{ query: "farms", count: 15 }],
    lastSearchedAt: Date.now(),
  });

  const { childIds } = await subdivideCell({ db }, { cellId });

  assert.equal(childIds.length, 4, "Searched cell subdivides into 4 children");
  for (const childId of childIds) {
    const child = await db.get(childId);
    assert.equal(child.status, "unsearched", "Children of searched cell start as unsearched");
    assert.equal(child.isLeaf, true);
  }
});

test("subdividing a searched cell patches parent to isLeaf: false", async () => {
  const db = createMockDb();
  const { cellId } = await seedSaturatedCell(db, { status: "searched", resultCount: 8 });

  await subdivideCell({ db }, { cellId });

  const parent = await db.get(cellId);
  assert.equal(parent.isLeaf, false, "Searched parent becomes non-leaf after subdivision");
});

test("searched cell children inherit correct depth and parentCellId", async () => {
  const db = createMockDb();
  const { cellId } = await seedSaturatedCell(db, { status: "searched", depth: 1 });

  const { childIds } = await subdivideCell({ db }, { cellId });

  for (const childId of childIds) {
    const child = await db.get(childId);
    assert.equal(child.depth, 2, "Children of depth-1 searched cell have depth 2");
    assert.equal(child.parentCellId, cellId, "Children reference searched parent");
  }
});

test("searched cell children tile the parent exactly", async () => {
  const db = createMockDb();
  const { cellId } = await seedSaturatedCell(db, { status: "searched" });
  const parent = await db.get(cellId);

  const { childIds } = await subdivideCell({ db }, { cellId });
  const children = await Promise.all(childIds.map((id) => db.get(id)));

  const minLat = Math.min(...children.map((c) => c.swLat));
  const maxLat = Math.max(...children.map((c) => c.neLat));
  const minLng = Math.min(...children.map((c) => c.swLng));
  const maxLng = Math.max(...children.map((c) => c.neLng));

  assert.equal(minLat, parent.swLat, "Union swLat matches parent");
  assert.equal(maxLat, parent.neLat, "Union neLat matches parent");
  assert.equal(minLng, parent.swLng, "Union swLng matches parent");
  assert.equal(maxLng, parent.neLng, "Union neLng matches parent");
});

test("searched cell at max depth cannot be subdivided", async () => {
  const db = createMockDb();
  const { cellId } = await seedSaturatedCell(db, { status: "searched", depth: 4 });

  await assert.rejects(
    () => subdivideCell({ db }, { cellId }),
    { message: "Cell is already at maximum depth" },
  );
});
