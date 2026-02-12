import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const panelSource = fs.readFileSync(
  "src/components/map/discovery-panel.tsx",
  "utf8",
)
const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")
const mutationSource = fs.readFileSync(
  "convex/discovery/gridCells.ts",
  "utf8",
)

// ============================================================
// DiscoveryPanel: Split button present in virtual cell section
// ============================================================

test("virtual cell section in DiscoveryPanel renders a Split button", () => {
  // Extract the virtual cell section (between the two selected cell sections)
  const virtualSection = panelSource
    .split("Selected Cell")[1]
    .split("Selected Cell")[0]

  assert.match(virtualSection, /Split/, "virtual cell section should have a Split button")
})

test("virtual cell Split button uses Grid2x2Plus icon", () => {
  const virtualSection = panelSource
    .split("Selected Cell")[1]
    .split("Selected Cell")[0]

  assert.match(virtualSection, /Grid2x2Plus/, "Split button should use Grid2x2Plus icon")
})

test("virtual cell Split button dispatches subdivide action with virtual cell key", () => {
  const virtualSection = panelSource
    .split("Selected Cell")[1]
    .split("Selected Cell")[0]

  assert.match(
    virtualSection,
    /onCellAction\(selectedVirtualCell\.key,\s*\{\s*type:\s*"subdivide"\s*\}\)/,
    "Split button should call onCellAction with subdivide type and virtual cell key",
  )
})

// ============================================================
// handleCellAction: subdivide path works after lazy activation
// ============================================================

test("handleCellAction subdivide branch calls subdivideCell mutation", () => {
  assert.match(
    pageSource,
    /action\.type\s*===\s*"subdivide"[\s\S]*?await\s+subdivideCell\(\{\s*cellId:\s*cellId\s+as\s+Id<"discoveryCells">\s*\}\)/,
  )
})

test("handleCellAction subdivide branch clears selection on success", () => {
  const subdivideBlock = pageSource
    .split('action.type === "subdivide"')[1]
    .split('action.type === "undivide"')[0]

  assert.match(subdivideBlock, /setSelectedCellId\(null\)/)
})

test("handleCellAction subdivide branch shows success toast", () => {
  const subdivideBlock = pageSource
    .split('action.type === "subdivide"')[1]
    .split('action.type === "undivide"')[0]

  assert.match(subdivideBlock, /toast\.success\("Cell subdivided into 4 quadrants"\)/)
})

// ============================================================
// Backend: subdivideCell mutation creates 4 children
// ============================================================

test("subdivideCell computes 4 quadrants from midpoint", () => {
  const subdivideSection = mutationSource
    .split("export const subdivideCell")[1]
    .split("export const")[0]

  assert.match(subdivideSection, /midLat/)
  assert.match(subdivideSection, /midLng/)
  // 4 quadrants defined
  assert.match(subdivideSection, /quadrants/)
})

test("subdivideCell marks parent as non-leaf", () => {
  const subdivideSection = mutationSource
    .split("export const subdivideCell")[1]
    .split("export const")[0]

  assert.match(subdivideSection, /isLeaf:\s*false/)
})

test("subdivideCell inserts children with depth+1", () => {
  const subdivideSection = mutationSource
    .split("export const subdivideCell")[1]
    .split("export const")[0]

  assert.match(subdivideSection, /depth:\s*childDepth/)
  assert.match(subdivideSection, /childDepth\s*=\s*cell\.depth\s*\+\s*1/)
})

// ============================================================
// End-to-end simulation: activate virtual cell then subdivide
// ============================================================

function createMockDb() {
  const store = new Map()
  let counter = 0
  return {
    _store: store,
    async get(id) {
      return store.get(id) ?? null
    },
    async insert(table, doc) {
      const id = `${table}:${++counter}`
      store.set(id, { _id: id, ...doc })
      return id
    },
    async patch(id, fields) {
      const doc = store.get(id)
      if (!doc) throw new Error("Not found")
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
          return {
            first: async () => filtered[0] ?? null,
            collect: async () => filtered,
          }
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

async function subdivideCellHandler(ctx, args) {
  const cell = await ctx.db.get(args.cellId)
  if (!cell) throw new Error("Cell not found")
  if (cell.depth >= 4) throw new Error("Max depth reached")

  const existingChildren = await ctx.db
    .query("discoveryCells")
    .withIndex("by_parentCellId", (q) => q.eq("parentCellId", args.cellId))
    .collect()
  if (existingChildren.length > 0) {
    return { childIds: existingChildren.map((c) => c._id) }
  }

  const midLat = (cell.swLat + cell.neLat) / 2
  const midLng = (cell.swLng + cell.neLng) / 2
  const childDepth = cell.depth + 1

  const quadrants = [
    { swLat: cell.swLat, swLng: cell.swLng, neLat: midLat, neLng: midLng },
    { swLat: cell.swLat, swLng: midLng, neLat: midLat, neLng: cell.neLng },
    { swLat: midLat, swLng: cell.swLng, neLat: cell.neLat, neLng: midLng },
    { swLat: midLat, swLng: midLng, neLat: cell.neLat, neLng: cell.neLng },
  ]

  const childIds = []
  for (const q of quadrants) {
    const childId = await ctx.db.insert("discoveryCells", {
      ...q,
      depth: childDepth,
      parentCellId: args.cellId,
      isLeaf: true,
      status: "unsearched",
      gridId: cell.gridId,
      boundsKey: `${q.swLat.toFixed(6)}_${q.swLng.toFixed(6)}`,
    })
    childIds.push(childId)
  }

  await ctx.db.patch(args.cellId, { isLeaf: false })
  return { childIds }
}

test("simulated flow: Split on virtual cell activates it then subdivides into 4 children", async () => {
  const db = createMockDb()
  const virtualCell = {
    key: "44.000000_-79.000000",
    swLat: 44.0,
    swLng: -79.0,
    neLat: 44.18,
    neLng: -78.87,
  }

  // Step 1: Activate the virtual cell (lazy activation)
  const activateResult = await activateCellHandler({ db }, {
    gridId: "discoveryGrids:1",
    swLat: virtualCell.swLat,
    swLng: virtualCell.swLng,
    neLat: virtualCell.neLat,
    neLng: virtualCell.neLng,
    boundsKey: virtualCell.key,
  })

  assert.equal(activateResult.alreadyExisted, false)
  assert.ok(activateResult.cellId)

  // Step 2: Subdivide the newly activated cell
  const subdivideResult = await subdivideCellHandler({ db }, {
    cellId: activateResult.cellId,
  })

  assert.equal(subdivideResult.childIds.length, 4, "should create exactly 4 children")

  // Step 3: Verify parent is no longer a leaf
  const parent = db._store.get(activateResult.cellId)
  assert.equal(parent.isLeaf, false, "parent should be marked non-leaf after split")

  // Step 4: Verify children have correct properties
  for (const childId of subdivideResult.childIds) {
    const child = db._store.get(childId)
    assert.equal(child.depth, 1, "children should be depth 1")
    assert.equal(child.isLeaf, true, "children should be leaves")
    assert.equal(child.status, "unsearched", "children should be unsearched")
    assert.equal(child.parentCellId, activateResult.cellId, "children should reference parent")
    assert.equal(child.gridId, "discoveryGrids:1", "children should belong to same grid")
  }
})

test("simulated flow: children of split virtual cell cover the parent bounds exactly", async () => {
  const db = createMockDb()
  const virtualCell = {
    key: "44.000000_-79.000000",
    swLat: 44.0,
    swLng: -79.0,
    neLat: 44.18,
    neLng: -78.87,
  }

  const activateResult = await activateCellHandler({ db }, {
    gridId: "discoveryGrids:1",
    swLat: virtualCell.swLat,
    swLng: virtualCell.swLng,
    neLat: virtualCell.neLat,
    neLng: virtualCell.neLng,
    boundsKey: virtualCell.key,
  })

  const subdivideResult = await subdivideCellHandler({ db }, {
    cellId: activateResult.cellId,
  })

  const children = subdivideResult.childIds.map((id) => db._store.get(id))

  // All children combined should cover the same area as the parent
  const minSwLat = Math.min(...children.map((c) => c.swLat))
  const minSwLng = Math.min(...children.map((c) => c.swLng))
  const maxNeLat = Math.max(...children.map((c) => c.neLat))
  const maxNeLng = Math.max(...children.map((c) => c.neLng))

  assert.equal(minSwLat, virtualCell.swLat, "children SW lat should match parent")
  assert.equal(minSwLng, virtualCell.swLng, "children SW lng should match parent")
  assert.equal(maxNeLat, virtualCell.neLat, "children NE lat should match parent")
  assert.equal(maxNeLng, virtualCell.neLng, "children NE lng should match parent")
})
