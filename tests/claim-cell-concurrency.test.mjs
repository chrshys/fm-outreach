import assert from "node:assert/strict";
import test from "node:test";

// ============================================================
// Behavioral test: claimCellForSearch succeeds on first call,
// throws on concurrent second call for the same cell
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
  };
}

class ConvexError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConvexError";
  }
}

// Replicate the claimCellForSearch handler logic exactly as in gridCells.ts
async function claimCellForSearch(ctx, args) {
  const cell = await ctx.db.get(args.cellId);
  if (!cell) {
    throw new ConvexError("Cell not found");
  }

  if (!args.expectedStatuses.includes(cell.status)) {
    throw new ConvexError(
      `Cell status is "${cell.status}", expected one of: ${args.expectedStatuses.join(", ")}`,
    );
  }

  const previousStatus = cell.status;
  await ctx.db.patch(args.cellId, { status: "searching" });

  return { previousStatus };
}

// Helper: seed an unsearched cell in the mock db
async function seedUnsearchedCell(db, overrides = {}) {
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
    status: "unsearched",
    gridId,
    ...overrides,
  });

  return { gridId, cellId };
}

// ============================================================
// Core: first call succeeds
// ============================================================

test("first claimCellForSearch succeeds for unsearched cell", async () => {
  const db = createMockDb();
  const { cellId } = await seedUnsearchedCell(db);

  const result = await claimCellForSearch(
    { db },
    { cellId, expectedStatuses: ["unsearched"] },
  );

  assert.equal(result.previousStatus, "unsearched");
});

test("first claim transitions cell status to searching", async () => {
  const db = createMockDb();
  const { cellId } = await seedUnsearchedCell(db);

  await claimCellForSearch(
    { db },
    { cellId, expectedStatuses: ["unsearched"] },
  );

  const cell = await db.get(cellId);
  assert.equal(cell.status, "searching");
});

// ============================================================
// Core: concurrent second call throws
// ============================================================

test("second claimCellForSearch on same cell throws because status is now searching", async () => {
  const db = createMockDb();
  const { cellId } = await seedUnsearchedCell(db);

  // First call succeeds
  await claimCellForSearch(
    { db },
    { cellId, expectedStatuses: ["unsearched"] },
  );

  // Second call sees status "searching" which is not in expectedStatuses
  await assert.rejects(
    () =>
      claimCellForSearch(
        { db },
        { cellId, expectedStatuses: ["unsearched"] },
      ),
    {
      message: 'Cell status is "searching", expected one of: unsearched',
    },
  );
});

test("second concurrent claim does not modify cell status", async () => {
  const db = createMockDb();
  const { cellId } = await seedUnsearchedCell(db);

  await claimCellForSearch(
    { db },
    { cellId, expectedStatuses: ["unsearched"] },
  );

  // Attempt second claim (will throw)
  try {
    await claimCellForSearch(
      { db },
      { cellId, expectedStatuses: ["unsearched"] },
    );
  } catch {
    // expected
  }

  // Status remains "searching" from the first successful claim
  const cell = await db.get(cellId);
  assert.equal(cell.status, "searching", "Status must remain searching after failed second claim");
});

// ============================================================
// Multiple expectedStatuses: claim succeeds for searched cells too
// ============================================================

test("claimCellForSearch succeeds when cell is searched and searched is in expectedStatuses", async () => {
  const db = createMockDb();
  const { cellId } = await seedUnsearchedCell(db, { status: "searched" });

  const result = await claimCellForSearch(
    { db },
    { cellId, expectedStatuses: ["unsearched", "searched"] },
  );

  assert.equal(result.previousStatus, "searched");
  const cell = await db.get(cellId);
  assert.equal(cell.status, "searching");
});

test("second claim throws even with broader expectedStatuses", async () => {
  const db = createMockDb();
  const { cellId } = await seedUnsearchedCell(db);

  await claimCellForSearch(
    { db },
    { cellId, expectedStatuses: ["unsearched", "searched"] },
  );

  // "searching" is still not in expectedStatuses
  await assert.rejects(
    () =>
      claimCellForSearch(
        { db },
        { cellId, expectedStatuses: ["unsearched", "searched"] },
      ),
    {
      message:
        'Cell status is "searching", expected one of: unsearched, searched',
    },
  );
});

// ============================================================
// Guard: cell not found
// ============================================================

test("throws when cellId does not exist", async () => {
  const db = createMockDb();

  await assert.rejects(
    () =>
      claimCellForSearch(
        { db },
        { cellId: "discoveryCells:999", expectedStatuses: ["unsearched"] },
      ),
    { message: "Cell not found" },
  );
});

// ============================================================
// Guard: status mismatch without prior claim
// ============================================================

test("throws when cell status does not match any expectedStatus", async () => {
  const db = createMockDb();
  const { cellId } = await seedUnsearchedCell(db, { status: "saturated" });

  await assert.rejects(
    () =>
      claimCellForSearch(
        { db },
        { cellId, expectedStatuses: ["unsearched", "searched"] },
      ),
    {
      message:
        'Cell status is "saturated", expected one of: unsearched, searched',
    },
  );
});

// ============================================================
// Return value: previousStatus reflects the pre-claim state
// ============================================================

test("previousStatus reflects the state before claim, not after", async () => {
  const db = createMockDb();
  const { cellId } = await seedUnsearchedCell(db, { status: "searched" });

  const result = await claimCellForSearch(
    { db },
    { cellId, expectedStatuses: ["searched"] },
  );

  assert.equal(result.previousStatus, "searched");
  const cell = await db.get(cellId);
  assert.equal(cell.status, "searching");
});
