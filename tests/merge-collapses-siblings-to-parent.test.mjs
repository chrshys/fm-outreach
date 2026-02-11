import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

// ============================================================
// Tests: Clicking "Merge" on a child cell collapses all siblings
// back to parent — parent reappears with its original status
// ============================================================

// === Mock Convex DB ===

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

// Replicate undivideCell handler from gridCells.ts
async function undivideCell(ctx, args) {
  const cell = await ctx.db.get(args.cellId);
  if (!cell) throw new ConvexError("Cell not found");

  let targetCellId;
  if (cell.parentCellId) {
    const parentCell = await ctx.db.get(cell.parentCellId);
    if (!parentCell) throw new ConvexError("Parent cell not found");
    targetCellId = cell.parentCellId;
  } else {
    const children = await ctx.db
      .query("discoveryCells")
      .withIndex("by_parentCellId", (q) => q.eq("parentCellId", args.cellId))
      .collect();
    if (children.length === 0) throw new ConvexError("Cell has no children to undivide");
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
      toDelete.push(child._id);
      queue.push(child._id);
    }
  }

  for (const id of toDelete) {
    await ctx.db.delete(id);
  }

  await ctx.db.patch(targetCellId, { isLeaf: true });
  return { deletedCount: toDelete.length };
}

// Replicate listCells from gridCells.ts
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

// Helper: create a grid with a parent cell and 4 children
async function seedSubdividedCell(db, { parentStatus = "searched", parentOverrides = {}, childOverrides = {} } = {}) {
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
    status: parentStatus,
    gridId,
    resultCount: 45,
    querySaturation: [{ query: "farms", count: 45 }],
    lastSearchedAt: 1700000000000,
    ...parentOverrides,
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
      ...childOverrides,
    });
    childIds.push(childId);
  }

  return { gridId, parentId, childIds };
}

// ============================================================
// Merge from any child: all siblings deleted, parent reappears
// ============================================================

test("merge from child deletes all 4 siblings (including the clicked cell)", async () => {
  const db = createMockDb();
  const { childIds } = await seedSubdividedCell(db);

  const result = await undivideCell({ db }, { cellId: childIds[0] });
  assert.equal(result.deletedCount, 4);

  for (const id of childIds) {
    assert.equal(await db.get(id), null);
  }
});

test("merge from child restores parent as leaf (visible on map)", async () => {
  const db = createMockDb();
  const { parentId, childIds } = await seedSubdividedCell(db);

  await undivideCell({ db }, { cellId: childIds[0] });

  const parent = await db.get(parentId);
  assert.equal(parent.isLeaf, true);
});

test("parent reappears in listCells after merge", async () => {
  const db = createMockDb();
  const { gridId, parentId, childIds } = await seedSubdividedCell(db);

  // Before merge: 4 children shown, parent hidden
  const before = await listCells({ db }, { gridId });
  assert.equal(before.length, 4);
  assert.ok(before.every((c) => c._id !== parentId));

  // After merge: parent shown, children gone
  await undivideCell({ db }, { cellId: childIds[0] });
  const after = await listCells({ db }, { gridId });
  assert.equal(after.length, 1);
  assert.equal(after[0]._id, parentId);
});

// ============================================================
// Parent reappears with its ORIGINAL status (not reset)
// ============================================================

test("parent retains searched status after merge", async () => {
  const db = createMockDb();
  const { parentId, childIds } = await seedSubdividedCell(db, {
    parentStatus: "searched",
  });

  await undivideCell({ db }, { cellId: childIds[0] });

  const parent = await db.get(parentId);
  assert.equal(parent.status, "searched");
});

test("parent retains saturated status after merge", async () => {
  const db = createMockDb();
  const { parentId, childIds } = await seedSubdividedCell(db, {
    parentStatus: "saturated",
    parentOverrides: {
      resultCount: 60,
      querySaturation: [{ query: "farms", count: 60 }],
    },
  });

  await undivideCell({ db }, { cellId: childIds[0] });

  const parent = await db.get(parentId);
  assert.equal(parent.status, "saturated");
});

test("parent retains unsearched status after merge", async () => {
  const db = createMockDb();
  const { parentId, childIds } = await seedSubdividedCell(db, {
    parentStatus: "unsearched",
    parentOverrides: {
      resultCount: undefined,
      querySaturation: undefined,
      lastSearchedAt: undefined,
    },
  });

  await undivideCell({ db }, { cellId: childIds[0] });

  const parent = await db.get(parentId);
  assert.equal(parent.status, "unsearched");
});

test("parent retains resultCount after merge", async () => {
  const db = createMockDb();
  const { parentId, childIds } = await seedSubdividedCell(db, {
    parentOverrides: { resultCount: 45 },
  });

  await undivideCell({ db }, { cellId: childIds[0] });

  const parent = await db.get(parentId);
  assert.equal(parent.resultCount, 45);
});

test("parent retains querySaturation after merge", async () => {
  const db = createMockDb();
  const saturation = [{ query: "farms", count: 45 }, { query: "orchard", count: 12 }];
  const { parentId, childIds } = await seedSubdividedCell(db, {
    parentOverrides: { querySaturation: saturation },
  });

  await undivideCell({ db }, { cellId: childIds[0] });

  const parent = await db.get(parentId);
  assert.deepStrictEqual(parent.querySaturation, saturation);
});

test("parent retains lastSearchedAt after merge", async () => {
  const db = createMockDb();
  const { parentId, childIds } = await seedSubdividedCell(db, {
    parentOverrides: { lastSearchedAt: 1700000000000 },
  });

  await undivideCell({ db }, { cellId: childIds[0] });

  const parent = await db.get(parentId);
  assert.equal(parent.lastSearchedAt, 1700000000000);
});

// ============================================================
// Merge works from any sibling (not just the first)
// ============================================================

test("merge from second child collapses all siblings", async () => {
  const db = createMockDb();
  const { parentId, childIds } = await seedSubdividedCell(db);

  await undivideCell({ db }, { cellId: childIds[1] });

  const parent = await db.get(parentId);
  assert.equal(parent.isLeaf, true);
  for (const id of childIds) {
    assert.equal(await db.get(id), null);
  }
});

test("merge from last child collapses all siblings", async () => {
  const db = createMockDb();
  const { parentId, childIds } = await seedSubdividedCell(db);

  await undivideCell({ db }, { cellId: childIds[3] });

  const parent = await db.get(parentId);
  assert.equal(parent.isLeaf, true);
  for (const id of childIds) {
    assert.equal(await db.get(id), null);
  }
});

// ============================================================
// Frontend: source code assertions
// ============================================================

const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8");
const gridSource = fs.readFileSync("src/components/map/discovery-grid.tsx", "utf8");

test("handleCellAction dispatches undivide action type", () => {
  assert.match(pageSource, /action\.type\s*===\s*"undivide"/);
});

test("handleCellAction calls undivideCell mutation for undivide", () => {
  assert.match(pageSource, /undivideCell\(\{.*cellId.*\}\)/);
});

test("handleCellAction shows success toast on merge", () => {
  assert.match(pageSource, /toast\.success\(["']Cell merged back to parent["']\)/);
});

test("handleCellAction shows error toast on merge failure", () => {
  assert.match(pageSource, /toast\.error\(/);
});

test("Merge button dispatches undivide action on click", () => {
  assert.match(gridSource, /onCellAction\(cell\._id,\s*\{\s*type:\s*"undivide"\s*\}\)/);
});

test("Merge button shown for child cells (depth > 0)", () => {
  const tooltipBlock = gridSource.slice(
    gridSource.indexOf("function CellTooltipContent"),
    gridSource.indexOf("function DiscoveryGridCell"),
  );
  assert.match(tooltipBlock, /cell\.depth\s*>\s*0\s*&&/);
});

test("undivideCell mutation is wired up in map page", () => {
  assert.match(pageSource, /useMutation\(api\.discovery\.gridCells\.undivideCell\)/);
});
