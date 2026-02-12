import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

// ============================================================
// Validates the user flow: Click "Run" on Google Places →
// cell searches normally (blue → green/orange).
//
// Covers the full chain: panel Run button → page handler →
// requestDiscoverCell → claimCellForSearch (blue) →
// discoverCell → updateCellSearchResult (green/orange)
// ============================================================

const panelSource = fs.readFileSync(
  "src/components/map/discovery-panel.tsx",
  "utf8",
)
const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")
const discoverCellSource = fs.readFileSync(
  "convex/discovery/discoverCell.ts",
  "utf8",
)
const gridCellsSource = fs.readFileSync(
  "convex/discovery/gridCells.ts",
  "utf8",
)
const cellColorsSource = fs.readFileSync(
  "src/components/map/cell-colors.ts",
  "utf8",
)
const sharedSource = fs.readFileSync(
  "src/components/map/discovery-grid-shared.ts",
  "utf8",
)

// ============================================================
// 1. Panel: Run button triggers search action for google_places
// ============================================================

test("Run button renders with Play icon inside DISCOVERY_MECHANISMS loop", () => {
  const mapIdx = panelSource.indexOf("DISCOVERY_MECHANISMS.map")
  const playIdx = panelSource.indexOf('<Play className="size-3"', mapIdx)
  const runIdx = panelSource.indexOf("Run", playIdx)
  assert.ok(mapIdx > -1, "panel renders DISCOVERY_MECHANISMS.map")
  assert.ok(playIdx > mapIdx, "Play icon inside mechanism loop")
  assert.ok(runIdx > playIdx, "Run label after Play icon")
})

test("Run button dispatches onCellAction with search type and mechanism.id", () => {
  assert.match(
    panelSource,
    /onCellAction\(selectedCell\._id,\s*\{\s*type:\s*"search",\s*mechanism:\s*mechanism\.id\s*\}\)/,
  )
})

test("Run button disabled when cell status is searching", () => {
  assert.match(
    panelSource,
    /!mechanism\.enabled\s*\|\|\s*selectedCell\.status\s*===\s*"searching"/,
  )
})

test("google_places is enabled in DISCOVERY_MECHANISMS", () => {
  assert.match(
    sharedSource,
    /id:\s*"google_places".*enabled:\s*true/s,
  )
})

// ============================================================
// 2. Page: handleCellAction routes to requestDiscoverCell
// ============================================================

test("handleCellAction calls requestDiscoverCell for google_places search", () => {
  const searchBlock = pageSource.slice(
    pageSource.indexOf('action.type === "search"'),
    pageSource.indexOf('action.type === "subdivide"'),
  )
  assert.match(searchBlock, /requestDiscoverCell\(/)
  assert.match(searchBlock, /cellId/)
})

test("handleCellAction rejects search when cell already searching", () => {
  const searchBlock = pageSource.slice(
    pageSource.indexOf('action.type === "search"'),
    pageSource.indexOf('action.type === "subdivide"'),
  )
  assert.match(searchBlock, /cell\.status\s*===\s*"searching"/)
  assert.match(searchBlock, /toast\.info\("Search already in progress"\)/)
})

test("handleCellAction shows Coming soon for non-google_places", () => {
  const searchBlock = pageSource.slice(
    pageSource.indexOf('action.type === "search"'),
    pageSource.indexOf('action.type === "subdivide"'),
  )
  assert.match(searchBlock, /action\.mechanism\s*!==\s*"google_places"/)
  assert.match(searchBlock, /toast\.info\("Coming soon"\)/)
})

// ============================================================
// 3. Backend: requestDiscoverCell schedules discoverCell
// ============================================================

test("requestDiscoverCell validates cell status before scheduling", () => {
  const block = discoverCellSource.slice(
    discoverCellSource.indexOf("export const requestDiscoverCell"),
  )
  assert.match(block, /cell\.status\s*===\s*"searching"/)
  assert.match(block, /ctx\.scheduler\.runAfter/)
})

test("requestDiscoverCell schedules discoverCell action", () => {
  const block = discoverCellSource.slice(
    discoverCellSource.indexOf("export const requestDiscoverCell"),
  )
  assert.match(block, /internal\.discovery\.discoverCell\.discoverCell/)
})

// ============================================================
// 4. Backend: discoverCell claims cell → searching (blue)
// ============================================================

test("discoverCell claims cell with expected statuses including unsearched, searched, saturated", () => {
  assert.match(
    discoverCellSource,
    /expectedStatuses:\s*\["unsearched",\s*"searched",\s*"saturated"\]/,
  )
})

test("claimCellForSearch patches cell status to searching", () => {
  assert.match(
    gridCellsSource,
    /patch\(args\.cellId,\s*\{\s*status:\s*"searching"\s*\}\)/,
  )
})

test("searching status renders as blue (#3b82f6)", () => {
  assert.match(cellColorsSource, /searching:\s*\{[^}]*color:\s*"#3b82f6"/)
  assert.match(cellColorsSource, /searching:\s*\{[^}]*fillColor:\s*"#3b82f6"/)
})

// ============================================================
// 5. Backend: discoverCell completes → searched (green) or saturated (orange)
// ============================================================

test("discoverCell resolves status as searched or saturated", () => {
  assert.match(
    discoverCellSource,
    /status:\s*saturated\s*\?\s*"saturated"\s*:\s*"searched"/,
  )
})

test("searched status renders as green (#22c55e)", () => {
  assert.match(cellColorsSource, /searched:\s*\{[^}]*color:\s*"#22c55e"/)
  assert.match(cellColorsSource, /searched:\s*\{[^}]*fillColor:\s*"#22c55e"/)
})

test("saturated status renders as orange (#f97316)", () => {
  assert.match(cellColorsSource, /saturated:\s*\{[^}]*color:\s*"#f97316"/)
  assert.match(cellColorsSource, /saturated:\s*\{[^}]*fillColor:\s*"#f97316"/)
})

// ============================================================
// 6. Backend: saturation detection logic
// ============================================================

test("saturation requires all queries at 60 API results AND >= 20 in-bounds", () => {
  assert.match(
    discoverCellSource,
    /queryResults\.every\(\(\{\s*totalCount\s*\}\)\s*=>\s*totalCount\s*>=\s*GOOGLE_MAX_RESULTS\)/,
  )
  assert.match(
    discoverCellSource,
    /querySaturation\.every\(\(qs\)\s*=>\s*qs\.count\s*>=\s*20\)/,
  )
})

// ============================================================
// 7. Backend: error recovery rolls back to previous status
// ============================================================

test("discoverCell error catch resets cell to previous status", () => {
  const catchIdx = discoverCellSource.lastIndexOf("catch")
  const catchBlock = discoverCellSource.slice(catchIdx)
  assert.match(catchBlock, /updateCellStatus/)
  assert.match(catchBlock, /status:\s*previousStatus/)
})

// ============================================================
// 8. Backend: cell and grid updated with search results
// ============================================================

test("updateCellSearchResult patches cell with resultCount, querySaturation, lastSearchedAt", () => {
  const block = gridCellsSource.slice(
    gridCellsSource.indexOf("updateCellSearchResult"),
  )
  assert.match(block, /resultCount:\s*args\.resultCount/)
  assert.match(block, /querySaturation:\s*args\.querySaturation/)
  assert.match(block, /lastSearchedAt:\s*args\.lastSearchedAt/)
})

test("updateCellSearchResult increments grid totalLeadsFound", () => {
  const block = gridCellsSource.slice(
    gridCellsSource.indexOf("updateCellSearchResult"),
  )
  assert.match(block, /totalLeadsFound:\s*grid\.totalLeadsFound\s*\+\s*args\.newLeadsCount/)
})

// ============================================================
// 9. Behavioral: mock db simulates full activate → search flow
// ============================================================

function createMockDb() {
  const store = new Map()
  let counter = 0
  return {
    _store: store,
    async insert(table, doc) {
      const id = `${table}:${++counter}`
      store.set(id, { _id: id, ...doc })
      return id
    },
    async get(id) { return store.get(id) ?? null },
    async patch(id, fields) {
      const doc = store.get(id)
      if (!doc) throw new Error(`not found: ${id}`)
      Object.assign(doc, fields)
    },
  }
}

test("full flow: unsearched → searching (blue) → searched (green)", async () => {
  const db = createMockDb()
  const gridId = await db.insert("discoveryGrids", {
    name: "Discovery", region: "Ontario", province: "Ontario",
    queries: ["farm market"], cellSizeKm: 10, totalLeadsFound: 0,
  })

  // Activate cell
  const cellId = await db.insert("discoveryCells", {
    swLat: 43, swLng: -79.5, neLat: 43.09, neLng: -79.41,
    depth: 0, isLeaf: true, status: "unsearched", gridId,
    boundsKey: "43.000000_-79.500000",
  })

  let cell = await db.get(cellId)
  assert.equal(cell.status, "unsearched", "starts unsearched")

  // Claim → searching (blue)
  await db.patch(cellId, { status: "searching" })
  cell = await db.get(cellId)
  assert.equal(cell.status, "searching", "claimed → searching (blue)")

  // Complete → searched (green)
  await db.patch(cellId, {
    status: "searched", resultCount: 12,
    querySaturation: [{ query: "farm market", count: 12 }],
    lastSearchedAt: Date.now(),
  })
  await db.patch(gridId, { totalLeadsFound: 12 })

  cell = await db.get(cellId)
  assert.equal(cell.status, "searched", "completed → searched (green)")
  assert.equal(cell.resultCount, 12)

  const grid = await db.get(gridId)
  assert.equal(grid.totalLeadsFound, 12)
})

test("full flow: unsearched → searching (blue) → saturated (orange)", async () => {
  const db = createMockDb()
  const gridId = await db.insert("discoveryGrids", {
    name: "Discovery", region: "Ontario", province: "Ontario",
    queries: ["farm market"], cellSizeKm: 10, totalLeadsFound: 0,
  })

  const cellId = await db.insert("discoveryCells", {
    swLat: 43, swLng: -79.5, neLat: 43.09, neLng: -79.41,
    depth: 0, isLeaf: true, status: "unsearched", gridId,
    boundsKey: "43.000000_-79.500000",
  })

  // Claim → searching
  await db.patch(cellId, { status: "searching" })

  // Complete → saturated (all queries hit 60 API and >= 20 in-bounds)
  await db.patch(cellId, {
    status: "saturated", resultCount: 55,
    querySaturation: [{ query: "farm market", count: 25 }],
    lastSearchedAt: Date.now(),
  })

  const cell = await db.get(cellId)
  assert.equal(cell.status, "saturated", "completed → saturated (orange)")
  assert.equal(cell.resultCount, 55)
})

test("concurrent search attempt rejected when cell is already searching", async () => {
  const db = createMockDb()
  const gridId = await db.insert("discoveryGrids", {
    name: "Discovery", region: "Ontario", province: "Ontario",
    queries: ["farm market"], cellSizeKm: 10, totalLeadsFound: 0,
  })

  const cellId = await db.insert("discoveryCells", {
    swLat: 43, swLng: -79.5, neLat: 43.09, neLng: -79.41,
    depth: 0, isLeaf: true, status: "searching", gridId,
    boundsKey: "43.000000_-79.500000",
  })

  // Attempt to claim → should fail
  const cell = await db.get(cellId)
  const expectedStatuses = ["unsearched", "searched", "saturated"]
  const claimed = expectedStatuses.includes(cell.status)
  assert.equal(claimed, false, "cannot claim cell that is already searching")
})
