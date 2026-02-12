import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const discoverCellSource = fs.readFileSync(
  "convex/discovery/discoverCell.ts",
  "utf8",
);
const gridCellsSource = fs.readFileSync(
  "convex/discovery/gridCells.ts",
  "utf8",
);

// ============================================================
// Source-level: claimCellForSearch returns { claimed: false }
// instead of throwing when status doesn't match
// ============================================================

test("claimCellForSearch returns claimed: false instead of throwing on status mismatch", () => {
  const claimBlock = gridCellsSource.slice(
    gridCellsSource.indexOf("export const claimCellForSearch"),
    gridCellsSource.indexOf("export const getCell"),
  );

  // Should NOT throw on status mismatch
  assert.doesNotMatch(
    claimBlock,
    /throw new ConvexError\(\s*`Cell status is/,
    "Must not throw ConvexError on status mismatch",
  );

  // Should return { claimed: false } on mismatch
  assert.match(claimBlock, /claimed:\s*false/);
  assert.match(claimBlock, /previousStatus:\s*cell\.status/);
});

test("claimCellForSearch returns claimed: true on successful claim", () => {
  const claimBlock = gridCellsSource.slice(
    gridCellsSource.indexOf("export const claimCellForSearch"),
    gridCellsSource.indexOf("export const getCell"),
  );

  assert.match(claimBlock, /claimed:\s*true/);
});

// ============================================================
// Source-level: discoverCell skips silently when claim fails
// ============================================================

test("discoverCell checks claimResult.claimed before proceeding", () => {
  assert.match(discoverCellSource, /!claimResult\.claimed/);
});

test("discoverCell returns zero-result summary when claim not acquired", () => {
  // After the !claimResult.claimed check, should return an empty result
  const afterClaimCheck = discoverCellSource.slice(
    discoverCellSource.indexOf("!claimResult.claimed"),
  );

  assert.match(afterClaimCheck, /totalApiResults:\s*0/);
  assert.match(afterClaimCheck, /inBoundsResults:\s*0/);
  assert.match(afterClaimCheck, /newLeads:\s*0/);
  assert.match(afterClaimCheck, /duplicatesSkipped:\s*0/);
  assert.match(afterClaimCheck, /saturated:\s*false/);
  assert.match(afterClaimCheck, /querySaturation:\s*\[\]/);
});

test("discoverCell does not throw when a concurrent call loses the claim", () => {
  // The early return means no error is thrown — the action completes gracefully
  const claimIdx = discoverCellSource.indexOf("claimResult");
  const tryIdx = discoverCellSource.indexOf("try {");
  const between = discoverCellSource.slice(claimIdx, tryIdx);

  // Between claim result and try block, there's an early return, not a throw
  assert.ok(between.includes("return"), "Early return for unclaimed cells exists");
  assert.ok(!between.includes("throw"), "No throw between claim and try");
});

// ============================================================
// Source-level: requestDiscoverCell silently skips searching cells
// ============================================================

test("requestDiscoverCell returns early for cells in searching status", () => {
  const reqBlock = discoverCellSource.slice(
    discoverCellSource.indexOf("requestDiscoverCell"),
  );

  // Check for the early return when cell.status === "searching"
  assert.match(reqBlock, /cell\.status\s*===\s*"searching"/);
});

test("requestDiscoverCell does not throw for searching cells", () => {
  const reqBlock = discoverCellSource.slice(
    discoverCellSource.indexOf("requestDiscoverCell"),
  );

  // The searching check comes before the status mismatch error throw
  const searchingIdx = reqBlock.indexOf('=== "searching"');
  const statusThrowIdx = reqBlock.indexOf('expected "unsearched"');

  assert.ok(searchingIdx > 0, "searching check exists");
  assert.ok(statusThrowIdx > 0, "status error throw exists for other statuses");
  assert.ok(
    searchingIdx < statusThrowIdx,
    "searching check comes before the status error throw (early return)",
  );
});

// ============================================================
// Behavioral: mock concurrent claim flow
// ============================================================

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

async function claimCellForSearch(db, cellId, expectedStatuses) {
  const cell = await db.get(cellId);
  if (!cell) throw new Error("Cell not found");
  if (!expectedStatuses.includes(cell.status)) {
    return { claimed: false, previousStatus: cell.status };
  }
  const previousStatus = cell.status;
  await db.patch(cellId, { status: "searching" });
  return { claimed: true, previousStatus };
}

async function seedGridAndCell(db, overrides = {}) {
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
    boundsKey: "42.850000_-79.900000",
    depth: 0,
    isLeaf: true,
    status: "unsearched",
    gridId,
    ...overrides,
  });

  return { gridId, cellId };
}

test("concurrent claims: first succeeds, second gets claimed: false", async () => {
  const db = createMockDb();
  const { cellId } = await seedGridAndCell(db);

  // First claim
  const result1 = await claimCellForSearch(db, cellId, [
    "unsearched",
    "searched",
  ]);
  assert.equal(result1.claimed, true);
  assert.equal(result1.previousStatus, "unsearched");

  // Second concurrent claim
  const result2 = await claimCellForSearch(db, cellId, [
    "unsearched",
    "searched",
  ]);
  assert.equal(result2.claimed, false);
  assert.equal(result2.previousStatus, "searching");
});

test("second concurrent call does not modify cell status", async () => {
  const db = createMockDb();
  const { cellId } = await seedGridAndCell(db);

  await claimCellForSearch(db, cellId, ["unsearched", "searched"]);
  const statusAfterFirst = (await db.get(cellId)).status;

  await claimCellForSearch(db, cellId, ["unsearched", "searched"]);
  const statusAfterSecond = (await db.get(cellId)).status;

  assert.equal(statusAfterFirst, "searching");
  assert.equal(statusAfterSecond, "searching");
});

test("second concurrent call does not throw any error", async () => {
  const db = createMockDb();
  const { cellId } = await seedGridAndCell(db);

  await claimCellForSearch(db, cellId, ["unsearched", "searched"]);

  // This must not throw
  const result = await claimCellForSearch(db, cellId, [
    "unsearched",
    "searched",
  ]);

  assert.equal(result.claimed, false);
});

test("first call can complete its search after second is rejected", async () => {
  const db = createMockDb();
  const { cellId } = await seedGridAndCell(db);

  // First caller claims
  const claim = await claimCellForSearch(db, cellId, [
    "unsearched",
    "searched",
  ]);
  assert.equal(claim.claimed, true);

  // Second caller tries and gets rejected gracefully
  const secondClaim = await claimCellForSearch(db, cellId, [
    "unsearched",
    "searched",
  ]);
  assert.equal(secondClaim.claimed, false);

  // First caller completes — cell transitions to searched
  await db.patch(cellId, { status: "searched" });
  const cell = await db.get(cellId);
  assert.equal(cell.status, "searched");
});
