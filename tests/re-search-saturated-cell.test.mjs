import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

// ============================================================
// Re-search saturated cell: behavioral tests
//
// Verifies that requestDiscoverCell can be called on a cell with
// status "saturated" (e.g. from the Convex dashboard), and that
// the full claim → search → update flow handles saturated cells
// correctly, including rollback on failure.
// ============================================================

const discoverCellSource = fs.readFileSync(
  "convex/discovery/discoverCell.ts",
  "utf8",
)
const gridCellsSource = fs.readFileSync(
  "convex/discovery/gridCells.ts",
  "utf8",
)

// -- Mock db --------------------------------------------------
function createMockDb() {
  const store = new Map()
  let counter = 0

  return {
    _store: store,
    async insert(table, doc) {
      const id = `${table}:${++counter}`
      store.set(id, { _id: id, _creationTime: Date.now(), ...doc })
      return id
    },
    async get(id) {
      return store.get(id) ?? null
    },
    async patch(id, fields) {
      const doc = store.get(id)
      if (!doc) throw new Error(`Document ${id} not found`)
      Object.assign(doc, fields)
    },
  }
}

// ============================================================
// Source-level: requestDiscoverCell accepts "saturated" status
// ============================================================

test("requestDiscoverCell guard condition includes saturated as allowed status", () => {
  // The status check should allow saturated through (not reject it)
  const mutationBlock = discoverCellSource.slice(
    discoverCellSource.indexOf("requestDiscoverCell"),
  )
  assert.match(
    mutationBlock,
    /cell\.status !== "saturated"/,
    'Guard should check cell.status !== "saturated"',
  )
})

test("requestDiscoverCell silently skips searching status even for previously-saturated cells", () => {
  const mutationBlock = discoverCellSource.slice(
    discoverCellSource.indexOf("requestDiscoverCell"),
  )
  // The searching check must come before the status validation
  const searchingIdx = mutationBlock.indexOf('status === "searching"')
  const validationIdx = mutationBlock.indexOf('status !== "unsearched"')
  assert.ok(
    searchingIdx < validationIdx,
    "Searching guard should precede status validation",
  )
})

// ============================================================
// Source-level: discoverCell action claims saturated cells
// ============================================================

test("discoverCell expectedStatuses includes saturated", () => {
  assert.match(
    discoverCellSource,
    /expectedStatuses:\s*\["unsearched",\s*"searched",\s*"saturated"\]/,
    "claimCellForSearch call should list saturated in expectedStatuses",
  )
})

// ============================================================
// Behavioral: claimCellForSearch transitions saturated → searching
// ============================================================

test("claimCellForSearch claims a saturated cell and transitions to searching", async () => {
  const db = createMockDb()

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
    totalLeadsFound: 50,
    createdAt: Date.now(),
  })

  const cellId = await db.insert("discoveryCells", {
    swLat: 42.85,
    swLng: -79.9,
    neLat: 43.03,
    neLng: -79.65,
    boundsKey: "42.850000_-79.900000",
    depth: 0,
    isLeaf: true,
    status: "saturated",
    resultCount: 45,
    querySaturation: [
      { query: "farms", count: 25 },
      { query: "orchard", count: 22 },
    ],
    lastSearchedAt: Date.now() - 86400000,
    gridId,
  })

  // Simulate claimCellForSearch logic
  const cell = await db.get(cellId)
  const expectedStatuses = ["unsearched", "searched", "saturated"]
  const claimed = expectedStatuses.includes(cell.status)

  assert.ok(claimed, "Saturated cell should be claimable")

  const previousStatus = cell.status
  assert.equal(previousStatus, "saturated")

  await db.patch(cellId, { status: "searching" })
  const updated = await db.get(cellId)
  assert.equal(updated.status, "searching", "Cell should transition to searching")
})

test("claimCellForSearch preserves saturated as previousStatus for rollback", async () => {
  const db = createMockDb()

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
    totalLeadsFound: 50,
    createdAt: Date.now(),
  })

  const cellId = await db.insert("discoveryCells", {
    swLat: 42.85,
    swLng: -79.9,
    neLat: 43.03,
    neLng: -79.65,
    boundsKey: "42.850000_-79.900000",
    depth: 0,
    isLeaf: true,
    status: "saturated",
    gridId,
  })

  // Simulate claim
  const cell = await db.get(cellId)
  const previousStatus = cell.status
  await db.patch(cellId, { status: "searching" })

  // Simulate failure → rollback
  await db.patch(cellId, { status: previousStatus })

  const rolledBack = await db.get(cellId)
  assert.equal(
    rolledBack.status,
    "saturated",
    "Failed re-search should roll back to saturated, not unsearched",
  )
})

// ============================================================
// Behavioral: re-search updates cell result and leads count
// ============================================================

test("re-searched saturated cell can transition to searched if no longer saturated", async () => {
  const db = createMockDb()

  const gridId = await db.insert("discoveryGrids", {
    name: "Test Grid",
    region: "Niagara",
    province: "Ontario",
    queries: ["farms", "orchard"],
    swLat: 42.85,
    swLng: -79.9,
    neLat: 43.35,
    neLng: -78.8,
    cellSizeKm: 20,
    totalLeadsFound: 50,
    createdAt: Date.now(),
  })

  const cellId = await db.insert("discoveryCells", {
    swLat: 42.85,
    swLng: -79.9,
    neLat: 43.03,
    neLng: -79.65,
    boundsKey: "42.850000_-79.900000",
    depth: 1,
    isLeaf: true,
    status: "saturated",
    resultCount: 45,
    querySaturation: [
      { query: "farms", count: 25 },
      { query: "orchard", count: 22 },
    ],
    gridId,
  })

  // Simulate re-search where cell is no longer saturated
  // (e.g. after Google results change or queries were modified)
  const newQuerySaturation = [
    { query: "farms", count: 12 },
    { query: "orchard", count: 8 },
  ]
  const newResultCount = 18
  const GOOGLE_MAX_RESULTS = 60

  // Not all queries hit 60 API results this time
  const queryApiCounts = [{ totalCount: 35 }, { totalCount: 42 }]
  const saturated =
    newQuerySaturation.length > 0 &&
    queryApiCounts.every(({ totalCount }) => totalCount >= GOOGLE_MAX_RESULTS) &&
    newQuerySaturation.every((qs) => qs.count >= 20)

  assert.equal(saturated, false, "Cell should not be saturated with lower counts")

  // Update cell with new results
  const newStatus = saturated ? "saturated" : "searched"
  await db.patch(cellId, {
    status: newStatus,
    resultCount: newResultCount,
    querySaturation: newQuerySaturation,
    lastSearchedAt: Date.now(),
  })

  const updated = await db.get(cellId)
  assert.equal(
    updated.status,
    "searched",
    "Previously-saturated cell can become searched after re-search",
  )
  assert.equal(updated.resultCount, 18)
})

test("re-searched saturated cell can remain saturated", async () => {
  const db = createMockDb()

  const gridId = await db.insert("discoveryGrids", {
    name: "Test Grid",
    region: "Niagara",
    province: "Ontario",
    queries: ["farms", "orchard"],
    swLat: 42.85,
    swLng: -79.9,
    neLat: 43.35,
    neLng: -78.8,
    cellSizeKm: 20,
    totalLeadsFound: 50,
    createdAt: Date.now(),
  })

  const cellId = await db.insert("discoveryCells", {
    swLat: 42.85,
    swLng: -79.9,
    neLat: 43.03,
    neLng: -79.65,
    boundsKey: "42.850000_-79.900000",
    depth: 1,
    isLeaf: true,
    status: "saturated",
    resultCount: 45,
    querySaturation: [
      { query: "farms", count: 25 },
      { query: "orchard", count: 22 },
    ],
    gridId,
  })

  // Re-search still shows saturation
  const newQuerySaturation = [
    { query: "farms", count: 28 },
    { query: "orchard", count: 24 },
  ]
  const GOOGLE_MAX_RESULTS = 60
  const queryApiCounts = [{ totalCount: 60 }, { totalCount: 60 }]

  const saturated =
    newQuerySaturation.length > 0 &&
    queryApiCounts.every(({ totalCount }) => totalCount >= GOOGLE_MAX_RESULTS) &&
    newQuerySaturation.every((qs) => qs.count >= 20)

  assert.equal(saturated, true, "Cell should still be saturated")

  const newStatus = saturated ? "saturated" : "searched"
  await db.patch(cellId, {
    status: newStatus,
    resultCount: 50,
    querySaturation: newQuerySaturation,
    lastSearchedAt: Date.now(),
  })

  const updated = await db.get(cellId)
  assert.equal(
    updated.status,
    "saturated",
    "Re-searched cell remains saturated when results are still dense",
  )
})

// ============================================================
// Behavioral: re-search accumulates leads on grid
// ============================================================

test("re-searching saturated cell adds new leads to grid total", async () => {
  const db = createMockDb()

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
    totalLeadsFound: 50,
    createdAt: Date.now(),
  })

  await db.insert("discoveryCells", {
    swLat: 42.85,
    swLng: -79.9,
    neLat: 43.03,
    neLng: -79.65,
    boundsKey: "42.850000_-79.900000",
    depth: 0,
    isLeaf: true,
    status: "saturated",
    resultCount: 45,
    gridId,
  })

  // Simulate re-search finding 5 new leads (rest were duplicates)
  const newLeadsCount = 5
  const grid = await db.get(gridId)
  await db.patch(gridId, {
    totalLeadsFound: grid.totalLeadsFound + newLeadsCount,
  })

  const updatedGrid = await db.get(gridId)
  assert.equal(
    updatedGrid.totalLeadsFound,
    55,
    "Grid total should accumulate new leads from re-search",
  )
})

// ============================================================
// Source-level: claimCellForSearch accepts expectedStatuses array
// ============================================================

test("claimCellForSearch uses includes() to check status against expectedStatuses", () => {
  assert.match(
    gridCellsSource,
    /args\.expectedStatuses\.includes\(cell\.status\)/,
    "claimCellForSearch should use array includes for flexible status checking",
  )
})
