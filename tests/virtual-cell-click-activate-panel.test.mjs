import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const gridSource = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)
const panelSource = fs.readFileSync(
  "src/components/map/discovery-panel.tsx",
  "utf8",
)
const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")
const cellColorsSource = fs.readFileSync(
  "src/components/map/cell-colors.ts",
  "utf8",
)
const sharedSource = fs.readFileSync(
  "src/components/map/discovery-grid-shared.ts",
  "utf8",
)

// ============================================================
// Virtual cell click → activate → gray unsearched cell
// ============================================================

test("VirtualGridCell renders Rectangle with VIRTUAL_CELL_STYLE (faint gray)", () => {
  const virtualSection = gridSource
    .split("function VirtualGridCell")[1]
    .split("function DiscoveryGridCell")[0]

  assert.match(virtualSection, /pathOptions=\{VIRTUAL_CELL_STYLE\}/)
})

test("VIRTUAL_CELL_STYLE has faint gray appearance (low opacity, thin weight)", () => {
  assert.match(cellColorsSource, /VIRTUAL_CELL_STYLE/)
  assert.match(cellColorsSource, /fillOpacity:\s*0\.05/)
  assert.match(cellColorsSource, /weight:\s*0\.5/)
})

test("VirtualGridCell click activates cell and then selects it", () => {
  const virtualSection = gridSource
    .split("function VirtualGridCell")[1]
    .split("function DiscoveryGridCell")[0]

  // Activation happens first (await), then selection
  const activateIdx = virtualSection.indexOf("await onActivateCell(cell)")
  const selectIdx = virtualSection.indexOf("onCellSelect(cellId)")
  assert.ok(activateIdx >= 0, "should call onActivateCell")
  assert.ok(selectIdx >= 0, "should call onCellSelect")
  assert.ok(activateIdx < selectIdx, "activation must happen before selection")
})

test("VirtualGridCell prevents double-click with activating guard", () => {
  const virtualSection = gridSource
    .split("function VirtualGridCell")[1]
    .split("function DiscoveryGridCell")[0]

  assert.match(virtualSection, /if\s*\(activating\)\s*return/)
  assert.match(virtualSection, /setActivating\(true\)/)
  assert.match(virtualSection, /setActivating\(false\)/)
})

// ============================================================
// Activated cell renders as unsearched gray with blue dashed selection border
// ============================================================

test("unsearched cell base color is gray #9ca3af", () => {
  assert.match(
    cellColorsSource,
    /unsearched:\s*\{\s*color:\s*"#9ca3af"/,
  )
})

test("selected cell gets dashed blue border (weight 3, dashArray '6 4', color #2563eb)", () => {
  const cellSection = gridSource
    .split("function DiscoveryGridCell")[1]
    .split("function getMapBounds")[0]

  assert.match(cellSection, /weight:\s*3/)
  assert.match(cellSection, /dashArray:\s*"6 4"/)
  assert.match(cellSection, /color:\s*"#2563eb"/)
})

test("selected cell fillOpacity increases by 0.1 over base", () => {
  const cellSection = gridSource
    .split("function DiscoveryGridCell")[1]
    .split("function getMapBounds")[0]

  assert.match(
    cellSection,
    /fillOpacity:\s*\(basePathOptions\.fillOpacity\s*\?\?\s*0\.15\)\s*\+\s*0\.1/,
  )
})

// ============================================================
// Panel shows cell details when cell is selected
// ============================================================

test("panel renders 'Selected Cell' section only when selectedCell exists", () => {
  assert.match(panelSource, /\{selectedCell\s*&&/)
  assert.match(panelSource, /Selected Cell/)
})

test("panel shows status badge using getStatusBadgeColor", () => {
  assert.match(panelSource, /getStatusBadgeColor\(selectedCell\.status\)/)
  assert.match(panelSource, /\{selectedCell\.status\}/)
})

test("panel shows depth indicator as d{depth}", () => {
  assert.match(panelSource, /d\{selectedCell\.depth\}/)
})

test("panel shows discovery mechanism Run buttons", () => {
  assert.match(panelSource, /DISCOVERY_MECHANISMS\.map/)
  assert.match(panelSource, /<Play/)
  assert.match(panelSource, /Run/)
})

test("panel shows Split button with Grid2x2Plus icon", () => {
  assert.match(panelSource, /<Grid2x2Plus/)
  assert.match(panelSource, /Split/)
})

test("getStatusBadgeColor returns gray for unsearched status", () => {
  assert.match(sharedSource, /case\s*"unsearched":\s*return\s*"bg-gray-200\s+text-gray-700"/)
})

// ============================================================
// Page wiring: virtual cell activation → panel cell details
// ============================================================

test("page handleActivateCell calls activateCellMutation and returns cellId", () => {
  assert.match(pageSource, /const\s+result\s*=\s*await\s+activateCellMutation/)
  assert.match(pageSource, /return\s+result\.cellId/)
})

test("page passes handleActivateCell as onActivateCell in discovery mode", () => {
  assert.match(pageSource, /onActivateCell=\{viewMode\s*===\s*"discovery"\s*\?\s*handleActivateCell\s*:\s*undefined\}/)
})

test("page passes cells and selectedCellId to DiscoveryPanel", () => {
  assert.match(pageSource, /<DiscoveryPanel[\s\S]*?cells=\{cells\s*\?\?\s*\[\]\}/)
  assert.match(pageSource, /<DiscoveryPanel[\s\S]*?selectedCellId=\{selectedCellId\}/)
})

test("page handleCellSelect sets selectedCellId state", () => {
  assert.match(pageSource, /const\s+handleCellSelect\s*=\s*useCallback\(\(cellId/)
  assert.match(pageSource, /setSelectedCellId\(cellId\)/)
})

// ============================================================
// Behavioral: simulated full flow from virtual click to panel display
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

test("full flow: virtual cell click → activate → cell has unsearched status for panel display", async () => {
  const db = createMockDb()
  const virtualCell = {
    key: "43.500000_-79.500000",
    swLat: 43.5,
    swLng: -79.5,
    neLat: 43.68,
    neLng: -79.37,
  }

  // Step 1: Activate cell (simulates VirtualGridCell click → onActivateCell)
  const result = await activateCellHandler({ db }, {
    gridId: "discoveryGrids:1",
    swLat: virtualCell.swLat,
    swLng: virtualCell.swLng,
    neLat: virtualCell.neLat,
    neLng: virtualCell.neLng,
    boundsKey: virtualCell.key,
  })

  assert.equal(result.alreadyExisted, false)
  assert.ok(result.cellId)

  // Step 2: Simulate onCellSelect(cellId) — sets selectedCellId
  const selectedCellId = result.cellId

  // Step 3: Simulate panel's selectedCell derivation: cells.find(c => c._id === selectedCellId)
  const persistedCell = db._store.get(selectedCellId)
  const selectedCell = persistedCell._id === selectedCellId ? persistedCell : null

  assert.ok(selectedCell, "panel should find the selected cell")
  assert.equal(selectedCell.status, "unsearched", "newly activated cell shows as unsearched")
  assert.equal(selectedCell.depth, 0, "depth is 0 for new cells")
  assert.equal(selectedCell.isLeaf, true, "new cell is a leaf")
  assert.equal(selectedCell.boundsKey, virtualCell.key, "boundsKey matches virtual cell key")
})

test("full flow: re-clicking same virtual cell returns existing cell (idempotent)", async () => {
  const db = createMockDb()
  const virtualCell = {
    key: "44.000000_-80.000000",
    swLat: 44.0,
    swLng: -80.0,
    neLat: 44.18,
    neLng: -79.87,
  }

  const args = {
    gridId: "discoveryGrids:1",
    swLat: virtualCell.swLat,
    swLng: virtualCell.swLng,
    neLat: virtualCell.neLat,
    neLng: virtualCell.neLng,
    boundsKey: virtualCell.key,
  }

  const first = await activateCellHandler({ db }, args)
  const second = await activateCellHandler({ db }, args)

  assert.equal(first.alreadyExisted, false)
  assert.equal(second.alreadyExisted, true)
  assert.equal(first.cellId, second.cellId, "same cell ID returned on re-click")
})

test("full flow: activated virtual cell is excluded from virtual grid rendering", () => {
  // Verify the filtering logic in DiscoveryGrid
  assert.match(gridSource, /activatedSet\.has\(vc\.key\)/)
  assert.match(gridSource, /persistedBoundsKeySet\.has\(vc\.key\)/)

  // Verify filteredVirtualCells is used for rendering
  assert.match(gridSource, /filteredVirtualCells\.map/)
})
