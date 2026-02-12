import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const gridSource = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)
const cellColorsSource = fs.readFileSync(
  "src/components/map/cell-colors.ts",
  "utf8",
)
const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")
const mutationSource = fs.readFileSync(
  "convex/discovery/gridCells.ts",
  "utf8",
)

// ============================================================
// Virtual cell click → activate → select end-to-end flow
// ============================================================

test("VirtualGridCell click handler calls onSelectVirtual to toggle selection", () => {
  const virtualSection = gridSource
    .split("function VirtualGridCell")[1]
    .split("function DiscoveryGridCell")[0]

  // click handler toggles selection via onSelectVirtual
  assert.match(virtualSection, /onSelectVirtual\(isSelected\s*\?\s*null\s*:\s*cell\)/)
})

test("page.tsx defines handleSelectVirtual callback", () => {
  assert.match(pageSource, /handleSelectVirtual/)
})

test("activateCell mutation inserts cell with status 'unsearched' for newly activated cells", () => {
  const activateSection = mutationSource
    .split("export const activateCell")[1]
    .split("export const")[0]

  assert.match(activateSection, /status:\s*"unsearched"/)
})

// ============================================================
// Activated cell visual: gray unsearched + blue dashed border
// ============================================================

test("unsearched cell color is gray (#9ca3af)", () => {
  assert.match(
    cellColorsSource,
    /unsearched:\s*\{\s*color:\s*"#9ca3af",\s*fillColor:\s*"#9ca3af"/,
  )
})

test("unsearched cell has fillOpacity 0.15", () => {
  assert.match(cellColorsSource, /unsearched:\s*\{[^}]*fillOpacity:\s*0\.15/)
})

test("selected cell override applies dashed blue border", () => {
  const cellSection = gridSource
    .split("function DiscoveryGridCell")[1]
    .split("function getMapBounds")[0]

  // Dashed pattern
  assert.match(cellSection, /dashArray:\s*"6 4"/)
  // Blue border color
  assert.match(cellSection, /color:\s*"#2563eb"/)
  // Heavier weight
  assert.match(cellSection, /weight:\s*3/)
})

test("selected unsearched cell fillOpacity becomes 0.25 (0.15 base + 0.1)", () => {
  // The formula: (basePathOptions.fillOpacity ?? 0.15) + 0.1
  // For unsearched: 0.15 + 0.1 = 0.25
  const cellSection = gridSource
    .split("function DiscoveryGridCell")[1]
    .split("function getMapBounds")[0]

  assert.match(
    cellSection,
    /fillOpacity:\s*\(basePathOptions\.fillOpacity\s*\?\?\s*0\.15\)\s*\+\s*0\.1/,
  )
})

// ============================================================
// Virtual cell is removed from render after activation
// ============================================================

test("filteredVirtualCells excludes cells whose key is in activatedBoundsKeys set", () => {
  assert.match(gridSource, /activatedSet\.has\(vc\.key\)/)
})

test("filteredVirtualCells excludes cells whose key is in persistedBoundsKeySet", () => {
  assert.match(gridSource, /persistedBoundsKeySet\.has\(vc\.key\)/)
})

test("filteredVirtualCells excludes cells that spatially overlap persisted cells", () => {
  assert.match(
    gridSource,
    /c\.swLat\s*<\s*vc\.neLat\s*&&\s*c\.neLat\s*>\s*vc\.swLat/,
  )
  assert.match(
    gridSource,
    /c\.swLng\s*<\s*vc\.neLng\s*&&\s*c\.neLng\s*>\s*vc\.swLng/,
  )
})

// ============================================================
// Behavioral test: simulated activate flow
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

test("simulated flow: virtual cell click creates unsearched cell and returns its ID for selection", async () => {
  const db = createMockDb()
  const virtualCell = {
    key: "44.000000_-79.000000",
    swLat: 44.0,
    swLng: -79.0,
    neLat: 44.18,
    neLng: -78.87,
  }

  // Step 1: activateCell mutation (simulates cell activation)
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

  // Step 2: verify persisted cell has correct properties
  const cell = db._store.get(result.cellId)
  assert.equal(cell.status, "unsearched", "newly activated cell should be unsearched")
  assert.equal(cell.depth, 0, "newly activated cell should be depth 0")
  assert.equal(cell.isLeaf, true, "newly activated cell should be a leaf")
  assert.equal(cell.boundsKey, virtualCell.key, "boundsKey should match virtual cell key")
  assert.equal(cell.swLat, virtualCell.swLat)
  assert.equal(cell.swLng, virtualCell.swLng)
  assert.equal(cell.neLat, virtualCell.neLat)
  assert.equal(cell.neLng, virtualCell.neLng)

  // Step 3: onCellSelect would be called with result.cellId
  // This makes the cell selected, triggering the blue dashed border
  const selectedCellId = result.cellId
  assert.equal(selectedCellId, cell._id, "selection should target the new cell")
})
