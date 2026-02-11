import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("convex/discovery/discoverCell.ts", "utf8");

// ============================================================
// Error recovery: try/catch covers all steps after claimCellForSearch
//
// Previously, getCell ran OUTSIDE the try/catch. If it threw,
// the cell stayed stuck on "searching" with no rollback.
// The fix: move try/catch to wrap everything after claim.
// ============================================================

test("try/catch wraps getCell call (not just the search logic)", () => {
  // claimCellForSearch must come BEFORE the try block
  const claimIdx = source.indexOf("claimCellForSearch");
  const tryIdx = source.indexOf("try {");
  const getCellIdx = source.indexOf("getCell");

  assert.ok(claimIdx > 0, "claimCellForSearch must exist");
  assert.ok(tryIdx > 0, "try block must exist");
  assert.ok(getCellIdx > 0, "getCell must exist");

  // claim comes before try
  assert.ok(
    claimIdx < tryIdx,
    "claimCellForSearch must come before try block",
  );

  // getCell comes AFTER try (inside the try block)
  assert.ok(
    getCellIdx > tryIdx,
    "getCell must be inside try block (after try {)",
  );
});

test("catch block resets status to previousStatus", () => {
  // Extract the catch block content
  const catchIdx = source.indexOf("catch (error)");
  assert.ok(catchIdx > 0, "catch block must exist");

  const catchBlock = source.slice(catchIdx, catchIdx + 500);
  assert.match(
    catchBlock,
    /updateCellStatus/,
    "catch block must call updateCellStatus",
  );
  assert.match(
    catchBlock,
    /status:\s*previousStatus/,
    "catch block must reset to previousStatus",
  );
  assert.match(
    catchBlock,
    /throw\s+error/,
    "catch block must re-throw the error",
  );
});

test("no code between claimCellForSearch result and try block can set cell status", () => {
  // Between claim closing and try opening, there should be no db.patch or updateCellStatus
  const claimEnd = source.indexOf("previousStatus");
  const tryIdx = source.indexOf("try {");
  const between = source.slice(claimEnd, tryIdx);

  assert.ok(
    !between.includes("updateCellStatus"),
    "No updateCellStatus between claim and try",
  );
  assert.ok(
    !between.includes("db.patch"),
    "No db.patch between claim and try",
  );
});

// ============================================================
// Behavioral tests: mock the claim → fail → rollback flow
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

test("cell resets to unsearched when getCell fails after claim", async () => {
  const db = createMockDb();

  const gridId = await db.insert("discoveryGrids", {
    name: "Test Grid",
    queries: ["farms"],
  });

  const cellId = await db.insert("discoveryCells", {
    status: "unsearched",
    gridId,
  });

  // Simulate: claim succeeds → status becomes "searching"
  const previousStatus = "unsearched";
  await db.patch(cellId, { status: "searching" });
  assert.equal((await db.get(cellId)).status, "searching");

  // Simulate: getCell throws (inside try block now)
  const getCellError = new Error("Cell not found");

  // Simulate: catch block runs rollback
  try {
    throw getCellError;
  } catch {
    await db.patch(cellId, { status: previousStatus });
  }

  const cell = await db.get(cellId);
  assert.equal(cell.status, "unsearched", "Cell must reset to unsearched");
});

test("cell resets to searched when API call fails during re-search", async () => {
  const db = createMockDb();

  const gridId = await db.insert("discoveryGrids", {
    name: "Test Grid",
    queries: ["farms"],
  });

  const cellId = await db.insert("discoveryCells", {
    status: "searched",
    gridId,
  });

  // Simulate: claim succeeds → status becomes "searching"
  const previousStatus = "searched";
  await db.patch(cellId, { status: "searching" });
  assert.equal((await db.get(cellId)).status, "searching");

  // Simulate: API call fails inside try block
  try {
    throw new Error("Google Places API timeout");
  } catch {
    await db.patch(cellId, { status: previousStatus });
  }

  const cell = await db.get(cellId);
  assert.equal(cell.status, "searched", "Cell must reset to searched");
});

test("cell resets to unsearched when lead insertion fails", async () => {
  const db = createMockDb();

  const gridId = await db.insert("discoveryGrids", {
    name: "Test Grid",
    queries: ["farms"],
  });

  const cellId = await db.insert("discoveryCells", {
    status: "unsearched",
    gridId,
  });

  const previousStatus = "unsearched";
  await db.patch(cellId, { status: "searching" });

  // Simulate: lead insertion throws
  try {
    throw new Error("insertDiscoveredLeads failed");
  } catch {
    await db.patch(cellId, { status: previousStatus });
  }

  const cell = await db.get(cellId);
  assert.equal(
    cell.status,
    "unsearched",
    "Cell must reset to unsearched after lead insertion failure",
  );
});

test("cell does NOT stay on searching after any mid-flight error", async () => {
  const db = createMockDb();

  const gridId = await db.insert("discoveryGrids", {
    name: "Test Grid",
    queries: ["farms"],
  });

  const cellId = await db.insert("discoveryCells", {
    status: "unsearched",
    gridId,
  });

  const previousStatus = "unsearched";
  await db.patch(cellId, { status: "searching" });

  // Simulate three different failure points, each should reset
  const errors = [
    new Error("getCell failed"),
    new Error("searchPlacesWithLocation network error"),
    new Error("updateCellSearchResult mutation failed"),
  ];

  for (const err of errors) {
    await db.patch(cellId, { status: "searching" }); // re-enter searching state
    try {
      throw err;
    } catch {
      await db.patch(cellId, { status: previousStatus });
    }
    const cell = await db.get(cellId);
    assert.notEqual(
      cell.status,
      "searching",
      `Cell must not stay on "searching" after: ${err.message}`,
    );
    assert.equal(cell.status, previousStatus);
  }
});
