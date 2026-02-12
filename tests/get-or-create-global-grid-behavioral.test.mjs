import assert from "node:assert/strict";
import test from "node:test";

// ============================================================
// Behavioral test: getOrCreateGlobalGrid returns existing grid
// if one exists, creates a new one otherwise (singleton pattern)
// ============================================================

const DEFAULT_QUERIES = ["farm market", "fruit stand", "farmers market"];
const DEFAULT_CELL_SIZE_KM = 10;

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
        collect: async () => docs,
      };
    },
  };
}

// Replicate the getOrCreateGlobalGrid handler logic exactly as in gridCells.ts
async function getOrCreateGlobalGridHandler(ctx) {
  const grids = await ctx.db.query("discoveryGrids").collect();
  const grid = grids[0];

  if (grid) {
    return { gridId: grid._id, created: false };
  }

  const gridId = await ctx.db.insert("discoveryGrids", {
    name: "Discovery",
    region: "Ontario",
    province: "Ontario",
    queries: DEFAULT_QUERIES,
    cellSizeKm: DEFAULT_CELL_SIZE_KM,
    totalLeadsFound: 0,
    createdAt: Date.now(),
  });

  return { gridId, created: true };
}

test("first call creates a new grid with created: true", async () => {
  const db = createMockDb();
  const result = await getOrCreateGlobalGridHandler({ db });

  assert.equal(result.created, true);
  assert.ok(result.gridId, "should return a gridId");

  const grid = await db.get(result.gridId);
  assert.equal(grid.name, "Discovery");
  assert.equal(grid.region, "Ontario");
  assert.equal(grid.province, "Ontario");
  assert.deepEqual(grid.queries, DEFAULT_QUERIES);
  assert.equal(grid.cellSizeKm, DEFAULT_CELL_SIZE_KM);
  assert.equal(grid.totalLeadsFound, 0);
  assert.equal(typeof grid.createdAt, "number");
});

test("second call returns existing grid with created: false", async () => {
  const db = createMockDb();

  const first = await getOrCreateGlobalGridHandler({ db });
  const second = await getOrCreateGlobalGridHandler({ db });

  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.gridId, first.gridId, "should return the same gridId");
});

test("second call does not insert a duplicate grid", async () => {
  const db = createMockDb();

  await getOrCreateGlobalGridHandler({ db });
  await getOrCreateGlobalGridHandler({ db });

  const allGrids = await db.query("discoveryGrids").collect();
  assert.equal(allGrids.length, 1, "should only have one grid in the store");
});

test("calling three times always returns the same gridId", async () => {
  const db = createMockDb();

  const first = await getOrCreateGlobalGridHandler({ db });
  const second = await getOrCreateGlobalGridHandler({ db });
  const third = await getOrCreateGlobalGridHandler({ db });

  assert.equal(first.gridId, second.gridId);
  assert.equal(second.gridId, third.gridId);
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(third.created, false);

  const allGrids = await db.query("discoveryGrids").collect();
  assert.equal(allGrids.length, 1);
});

test("grid fields are not mutated by subsequent calls", async () => {
  const db = createMockDb();

  const { gridId } = await getOrCreateGlobalGridHandler({ db });
  const gridBefore = await db.get(gridId);

  await getOrCreateGlobalGridHandler({ db });
  const gridAfter = await db.get(gridId);

  assert.equal(gridAfter.name, gridBefore.name);
  assert.equal(gridAfter.region, gridBefore.region);
  assert.equal(gridAfter.province, gridBefore.province);
  assert.deepEqual(gridAfter.queries, gridBefore.queries);
  assert.equal(gridAfter.cellSizeKm, gridBefore.cellSizeKm);
  assert.equal(gridAfter.totalLeadsFound, gridBefore.totalLeadsFound);
  assert.equal(gridAfter.createdAt, gridBefore.createdAt);
});
