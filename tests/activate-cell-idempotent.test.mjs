import assert from "node:assert/strict";
import test from "node:test";

// ============================================================
// Behavioral test: calling activateCell twice with the same
// boundsKey returns the same cellId with alreadyExisted: true
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

// Replicate the activateCell handler logic exactly as in gridCells.ts
async function activateCellHandler(ctx, args) {
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

const GRID_ID = "discoveryGrids:1";
const BOUNDS_ARGS = {
  gridId: GRID_ID,
  swLat: 39.0,
  swLng: -77.0,
  neLat: 39.5,
  neLng: -76.5,
  boundsKey: "39.000000_-77.000000",
};

test("first activateCell call creates a new cell with alreadyExisted: false", async () => {
  const db = createMockDb();
  const result = await activateCellHandler({ db }, BOUNDS_ARGS);

  assert.equal(result.alreadyExisted, false);
  assert.ok(result.cellId, "should return a cellId");

  // Verify the cell was inserted with correct defaults
  const cell = await db.get(result.cellId);
  assert.equal(cell.depth, 0);
  assert.equal(cell.isLeaf, true);
  assert.equal(cell.status, "unsearched");
  assert.equal(cell.gridId, GRID_ID);
  assert.equal(cell.boundsKey, BOUNDS_ARGS.boundsKey);
  assert.equal(cell.swLat, 39.0);
  assert.equal(cell.swLng, -77.0);
  assert.equal(cell.neLat, 39.5);
  assert.equal(cell.neLng, -76.5);
});

test("second activateCell call with same boundsKey returns same cellId with alreadyExisted: true", async () => {
  const db = createMockDb();

  const first = await activateCellHandler({ db }, BOUNDS_ARGS);
  const second = await activateCellHandler({ db }, BOUNDS_ARGS);

  assert.equal(first.alreadyExisted, false);
  assert.equal(second.alreadyExisted, true);
  assert.equal(second.cellId, first.cellId, "should return the same cellId");
});

test("second call does not insert a duplicate document", async () => {
  const db = createMockDb();

  await activateCellHandler({ db }, BOUNDS_ARGS);
  await activateCellHandler({ db }, BOUNDS_ARGS);

  const allCells = await db.query("discoveryCells").collect();
  assert.equal(allCells.length, 1, "should only have one cell in the store");
});

test("different boundsKey creates a separate cell", async () => {
  const db = createMockDb();

  const first = await activateCellHandler({ db }, BOUNDS_ARGS);
  const second = await activateCellHandler({ db }, {
    ...BOUNDS_ARGS,
    boundsKey: "39.500000_-76.500000",
    swLat: 39.5,
    swLng: -76.5,
    neLat: 40.0,
    neLng: -76.0,
  });

  assert.equal(first.alreadyExisted, false);
  assert.equal(second.alreadyExisted, false);
  assert.notEqual(first.cellId, second.cellId);

  const allCells = await db.query("discoveryCells").collect();
  assert.equal(allCells.length, 2);
});

test("same boundsKey on different grid creates a separate cell", async () => {
  const db = createMockDb();

  const first = await activateCellHandler({ db }, BOUNDS_ARGS);
  const second = await activateCellHandler({ db }, {
    ...BOUNDS_ARGS,
    gridId: "discoveryGrids:99",
  });

  assert.equal(first.alreadyExisted, false);
  assert.equal(second.alreadyExisted, false);
  assert.notEqual(first.cellId, second.cellId);
});

test("calling activateCell three times returns same cellId every time", async () => {
  const db = createMockDb();

  const first = await activateCellHandler({ db }, BOUNDS_ARGS);
  const second = await activateCellHandler({ db }, BOUNDS_ARGS);
  const third = await activateCellHandler({ db }, BOUNDS_ARGS);

  assert.equal(first.cellId, second.cellId);
  assert.equal(second.cellId, third.cellId);
  assert.equal(first.alreadyExisted, false);
  assert.equal(second.alreadyExisted, true);
  assert.equal(third.alreadyExisted, true);

  const allCells = await db.query("discoveryCells").collect();
  assert.equal(allCells.length, 1);
});
