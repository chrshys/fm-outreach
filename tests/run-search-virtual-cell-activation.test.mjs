import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")
const panelSource = fs.readFileSync(
  "src/components/map/discovery-panel.tsx",
  "utf8",
)

// ============================================================
// Source verification: handleCellAction lazy activation guards
// ============================================================

test("handleCellAction guards against null globalGridId before activating virtual cell", () => {
  const actionBlock = pageSource.slice(
    pageSource.indexOf("handleCellAction"),
    pageSource.indexOf("}, [cells, globalGridId"),
  )
  // The guard: if (!globalGridId) return  — before activateCell call
  assert.match(
    actionBlock,
    /if\s*\(!globalGridId\)\s*return/,
    "Should guard against null globalGridId before activating virtual cell",
  )
})

test("handleCellAction lazy activation checks selectedVirtualCell.key matches cellId", () => {
  const actionBlock = pageSource.slice(
    pageSource.indexOf("handleCellAction"),
    pageSource.indexOf("}, [cells, globalGridId"),
  )
  assert.match(
    actionBlock,
    /selectedVirtualCell\.key\s*===\s*cellId/,
    "Should check that selectedVirtualCell.key matches the cellId from the panel",
  )
})

test("handleCellAction calls handleActivateCell with selectedVirtualCell", () => {
  const actionBlock = pageSource.slice(
    pageSource.indexOf("handleCellAction"),
    pageSource.indexOf("}, [cells, globalGridId"),
  )
  assert.match(
    actionBlock,
    /handleActivateCell\(selectedVirtualCell\)/,
    "Should call handleActivateCell to persist the virtual cell to DB",
  )
})

test("handleCellAction clears selectedVirtualCell after activation", () => {
  const actionBlock = pageSource.slice(
    pageSource.indexOf("handleCellAction"),
    pageSource.indexOf("}, [cells, globalGridId"),
  )
  assert.match(
    actionBlock,
    /setSelectedVirtualCell\(null\)/,
    "Should clear virtual cell selection after activation",
  )
})

test("handleCellAction sets selectedCellId to newCellId after activation", () => {
  const actionBlock = pageSource.slice(
    pageSource.indexOf("handleCellAction"),
    pageSource.indexOf("}, [cells, globalGridId"),
  )
  assert.match(
    actionBlock,
    /setSelectedCellId\(newCellId\)/,
    "Should set selected cell to the newly activated DB cell ID",
  )
})

test("handleCellAction reassigns cellId to newCellId for subsequent action dispatch", () => {
  const actionBlock = pageSource.slice(
    pageSource.indexOf("handleCellAction"),
    pageSource.indexOf("}, [cells, globalGridId"),
  )
  assert.match(
    actionBlock,
    /cellId\s*=\s*newCellId/,
    "Should reassign cellId so requestDiscoverCell uses the persisted cell ID",
  )
})

test("handleCellAction constructs synthetic cell with unsearched status after activation", () => {
  const actionBlock = pageSource.slice(
    pageSource.indexOf("handleCellAction"),
    pageSource.indexOf("}, [cells, globalGridId"),
  )
  assert.match(
    actionBlock,
    /status:\s*"unsearched"\s*as\s*const/,
    "Synthetic cell should have unsearched status to pass the search guard",
  )
})

test("handleCellAction calls requestDiscoverCell after virtual cell activation", () => {
  // The flow: activate cell → reassign cellId → then the search branch calls requestDiscoverCell
  const actionBlock = pageSource.slice(
    pageSource.indexOf("handleCellAction"),
    pageSource.indexOf("}, [cells, globalGridId"),
  )
  // Activation block comes before the search dispatch block
  const activateIdx = actionBlock.indexOf("handleActivateCell(selectedVirtualCell)")
  const searchIdx = actionBlock.indexOf("requestDiscoverCell")
  assert.ok(activateIdx > -1, "Should contain handleActivateCell call")
  assert.ok(searchIdx > -1, "Should contain requestDiscoverCell call")
  assert.ok(
    activateIdx < searchIdx,
    "Activation must happen before requestDiscoverCell dispatch",
  )
})

test("handleCellAction shows toast.error on activation failure", () => {
  const actionBlock = pageSource.slice(
    pageSource.indexOf("handleCellAction"),
    pageSource.indexOf("}, [cells, globalGridId"),
  )
  // There should be a catch block with toast.error for activation failure
  const catchSection = actionBlock.slice(
    actionBlock.indexOf("handleActivateCell"),
    actionBlock.indexOf("if (!cell) return"),
  )
  assert.match(
    catchSection,
    /toast\.error/,
    "Should show error toast when cell activation fails",
  )
})

test("handleCellAction dependency array includes globalGridId", () => {
  const depMatch = pageSource.match(
    /handleCellAction[\s\S]*?\},\s*\[([\s\S]*?)\]\)/,
  )
  assert.ok(depMatch, "Should find handleCellAction dependency array")
  assert.match(
    depMatch[1],
    /globalGridId/,
    "Dependency array should include globalGridId",
  )
})

test("handleCellAction dependency array includes selectedVirtualCell", () => {
  const depMatch = pageSource.match(
    /handleCellAction[\s\S]*?\},\s*\[([\s\S]*?)\]\)/,
  )
  assert.ok(depMatch, "Should find handleCellAction dependency array")
  assert.match(
    depMatch[1],
    /selectedVirtualCell/,
    "Dependency array should include selectedVirtualCell",
  )
})

test("handleCellAction dependency array includes handleActivateCell", () => {
  const depMatch = pageSource.match(
    /handleCellAction[\s\S]*?\},\s*\[([\s\S]*?)\]\)/,
  )
  assert.ok(depMatch, "Should find handleCellAction dependency array")
  assert.match(
    depMatch[1],
    /handleActivateCell/,
    "Dependency array should include handleActivateCell",
  )
})

// ============================================================
// Source verification: DiscoveryPanel unified Selected Cell section
// includes Run button (virtual cells use selectedCell derivation)
// ============================================================

test("DiscoveryPanel renders Run button in unified Selected Cell section", () => {
  const selectedSection = panelSource.slice(
    panelSource.indexOf("{/* Selected Cell */}"),
    panelSource.indexOf("{/* Search Queries */}"),
  )
  assert.match(
    selectedSection,
    /Run/,
    "Selected Cell section should have Run button (covers both virtual and persisted cells)",
  )
})

test("DiscoveryPanel Run button calls onCellAction with selectedCell._id and search action", () => {
  const selectedSection = panelSource.slice(
    panelSource.indexOf("{/* Selected Cell */}"),
    panelSource.indexOf("{/* Search Queries */}"),
  )
  assert.match(
    selectedSection,
    /onCellAction\(selectedCell\._id,\s*\{\s*type:\s*"search",\s*mechanism:\s*mechanism\.id\s*\}\)/,
    "Run button should call onCellAction with selectedCell._id (virtual cell key for unactivated cells)",
  )
})

// ============================================================
// Behavioral tests: simulated Run-on-virtual-cell flow
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
    async get(id) {
      return store.get(id) ?? null
    },
    async patch(id, fields) {
      const doc = store.get(id)
      if (!doc) throw new Error(`Document ${id} not found`)
      Object.assign(doc, fields)
    },
    query(table) {
      const docs = [...store.values()].filter((d) =>
        d._id.startsWith(`${table}:`),
      )
      return {
        withIndex(_name, filterFn) {
          const eqs = []
          const builder = {
            eq(field, value) {
              eqs.push({ field, value })
              return builder
            },
          }
          filterFn(builder)
          const filtered = docs.filter((d) =>
            eqs.every((e) => d[e.field] === e.value),
          )
          return { first: async () => filtered[0] ?? null }
        },
      }
    },
  }
}

async function activateCellHandler(ctx, args) {
  const existing = await ctx.db
    .query("discoveryCells")
    .withIndex("by_gridId_boundsKey", (q) =>
      q.eq("gridId", args.gridId).eq("boundsKey", args.boundsKey),
    )
    .first()
  if (existing) return { cellId: existing._id, alreadyExisted: true }
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
  })
  return { cellId, alreadyExisted: false }
}

test("simulated: Run on virtual cell activates then triggers discovery (full flow)", async () => {
  const db = createMockDb()
  const gridId = await db.insert("discoveryGrids", {
    name: "Discovery",
    region: "Ontario",
    province: "Ontario",
    queries: ["farm market"],
    cellSizeKm: 10,
    totalLeadsFound: 0,
    createdAt: Date.now(),
  })

  const virtualCell = {
    key: "44.000000_-79.000000",
    swLat: 44.0,
    swLng: -79.0,
    neLat: 44.18,
    neLng: -78.87,
  }

  // Step 1: Simulate what handleCellAction does — activate the virtual cell
  const activateResult = await activateCellHandler({ db }, {
    gridId,
    swLat: virtualCell.swLat,
    swLng: virtualCell.swLng,
    neLat: virtualCell.neLat,
    neLng: virtualCell.neLng,
    boundsKey: virtualCell.key,
  })

  assert.equal(activateResult.alreadyExisted, false)
  const newCellId = activateResult.cellId

  // Step 2: Verify the cell exists in DB with correct initial state
  const cell = await db.get(newCellId)
  assert.equal(cell.status, "unsearched")
  assert.equal(cell.depth, 0)
  assert.equal(cell.isLeaf, true)
  assert.equal(cell.boundsKey, virtualCell.key)
  assert.equal(cell.gridId, gridId)

  // Step 3: Simulate requestDiscoverCell → claim for search
  const expectedStatuses = ["unsearched", "searched", "saturated"]
  assert.ok(
    expectedStatuses.includes(cell.status),
    "Newly activated cell should have a status that allows searching",
  )
  await db.patch(newCellId, { status: "searching" })

  const searchingCell = await db.get(newCellId)
  assert.equal(searchingCell.status, "searching")

  // Step 4: Simulate search completion
  await db.patch(newCellId, {
    status: "searched",
    resultCount: 15,
    lastSearchedAt: Date.now(),
    querySaturation: [{ query: "farm market", count: 15 }],
  })

  const finalCell = await db.get(newCellId)
  assert.equal(finalCell.status, "searched")
  assert.equal(finalCell.resultCount, 15)
})

test("simulated: Run on virtual cell idempotent — second activation returns same cell", async () => {
  const db = createMockDb()
  const gridId = await db.insert("discoveryGrids", {
    name: "Discovery",
    region: "Ontario",
    province: "Ontario",
    queries: ["farm market"],
    cellSizeKm: 10,
    totalLeadsFound: 0,
    createdAt: Date.now(),
  })

  const virtualCell = {
    key: "44.000000_-79.000000",
    swLat: 44.0,
    swLng: -79.0,
    neLat: 44.18,
    neLng: -78.87,
  }

  // First activation
  const first = await activateCellHandler({ db }, {
    gridId,
    swLat: virtualCell.swLat,
    swLng: virtualCell.swLng,
    neLat: virtualCell.neLat,
    neLng: virtualCell.neLng,
    boundsKey: virtualCell.key,
  })
  assert.equal(first.alreadyExisted, false)

  // Second activation (same boundsKey) — should return same cell
  const second = await activateCellHandler({ db }, {
    gridId,
    swLat: virtualCell.swLat,
    swLng: virtualCell.swLng,
    neLat: virtualCell.neLat,
    neLng: virtualCell.neLng,
    boundsKey: virtualCell.key,
  })
  assert.equal(second.alreadyExisted, true)
  assert.equal(second.cellId, first.cellId)
})

test("simulated: virtual cell activation returns cell with searchable status", async () => {
  const db = createMockDb()
  const gridId = await db.insert("discoveryGrids", {
    name: "Discovery",
    region: "Ontario",
    province: "Ontario",
    queries: ["farm market"],
    cellSizeKm: 10,
    totalLeadsFound: 0,
    createdAt: Date.now(),
  })

  const result = await activateCellHandler({ db }, {
    gridId,
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09,
    neLng: -79.41,
    boundsKey: "43.000000_-79.500000",
  })

  const cell = await db.get(result.cellId)

  // The cell must have "unsearched" status — the only initial status
  // that handleCellAction's search guard will allow through
  assert.equal(
    cell.status,
    "unsearched",
    "Activated cell must be 'unsearched' so the search guard passes",
  )
  assert.notEqual(
    cell.status,
    "searching",
    "Activated cell must NOT be 'searching' or the search guard would block it",
  )
})

test("simulated: handleCellAction early-returns when globalGridId is null", () => {
  // Verify the guard exists in source — behavioral simulation
  const actionBlock = pageSource.slice(
    pageSource.indexOf("const handleCellAction"),
  )
  const virtualCheck = actionBlock.indexOf("selectedVirtualCell.key === cellId")
  const gridGuard = actionBlock.indexOf("if (!globalGridId) return")

  assert.ok(virtualCheck > -1, "virtual cell check should exist")
  assert.ok(gridGuard > -1, "globalGridId guard should exist")
  assert.ok(
    gridGuard < virtualCheck + 200,
    "globalGridId guard should be near the virtual cell activation block",
  )
})
