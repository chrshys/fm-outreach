import assert from "node:assert/strict"
import test from "node:test"
import fs from "node:fs"

// ============================================================
// End-to-end: Click "Merge" on a child cell → merges back to parent
//
// Validates the full chain:
//   1. Panel Merge button dispatches { type: "undivide" } action
//   2. Page handler calls undivideCell mutation
//   3. Mutation BFS-deletes all children
//   4. Parent cell is restored as isLeaf: true
//   5. listCells returns parent (not children)
//   6. Selection is cleared after merge
// ============================================================

// --- Source analysis helpers ---

const panelSource = fs.readFileSync(
  "src/components/map/discovery-panel.tsx",
  "utf8",
)
const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")
// --- Mock DB for behavioral tests ---

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
    async delete(id) {
      const doc = store.get(id)
      if (!doc) throw new Error(`Document ${id} not found`)
      store.delete(id)
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
        collect: async () => docs,
      }
    },
  }
}

class ConvexError extends Error {
  constructor(message) {
    super(message)
    this.name = "ConvexError"
  }
}

const MAX_DEPTH = 4

// Replicate mutation handlers from gridCells.ts
async function subdivideCell(ctx, args) {
  const cell = await ctx.db.get(args.cellId)
  if (!cell) throw new ConvexError("Cell not found")
  if (cell.status === "searching")
    throw new ConvexError("Cannot subdivide while cell is being searched")
  if (cell.depth >= MAX_DEPTH)
    throw new ConvexError("Cell is already at maximum depth")

  const existingChildren = await ctx.db
    .query("discoveryCells")
    .withIndex("by_parentCellId", (q) => q.eq("parentCellId", args.cellId))
    .collect()
  if (existingChildren.length > 0) {
    return { childIds: existingChildren.map((c) => c._id) }
  }

  const midLat = (cell.swLat + cell.neLat) / 2
  const midLng = (cell.swLng + cell.neLng) / 2

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
      boundsKey: `${q.swLat.toFixed(6)}_${q.swLng.toFixed(6)}`,
      depth: cell.depth + 1,
      parentCellId: args.cellId,
      isLeaf: true,
      status: "unsearched",
      gridId: cell.gridId,
    })
    childIds.push(childId)
  }

  await ctx.db.patch(args.cellId, { isLeaf: false })
  return { childIds }
}

async function undivideCell(ctx, args) {
  const cell = await ctx.db.get(args.cellId)
  if (!cell) throw new ConvexError("Cell not found")

  let targetCellId
  if (cell.parentCellId) {
    const parentCell = await ctx.db.get(cell.parentCellId)
    if (!parentCell) throw new ConvexError("Parent cell not found")
    targetCellId = cell.parentCellId
  } else {
    const children = await ctx.db
      .query("discoveryCells")
      .withIndex("by_parentCellId", (q) => q.eq("parentCellId", args.cellId))
      .collect()
    if (children.length === 0)
      throw new ConvexError("Cell has no children to undivide")
    targetCellId = args.cellId
  }

  const toDelete = []
  const queue = [targetCellId]
  while (queue.length > 0) {
    const currentId = queue.shift()
    const children = await ctx.db
      .query("discoveryCells")
      .withIndex("by_parentCellId", (q) => q.eq("parentCellId", currentId))
      .collect()
    for (const child of children) {
      toDelete.push({ _id: child._id, status: child.status })
      queue.push(child._id)
    }
  }

  if (toDelete.some((d) => d.status === "searching")) {
    throw new ConvexError(
      "Cannot undivide while a child cell is being searched",
    )
  }

  for (const { _id } of toDelete) {
    await ctx.db.delete(_id)
  }

  await ctx.db.patch(targetCellId, { isLeaf: true })
  return { deletedCount: toDelete.length }
}

async function listCells(ctx, args) {
  const cells = await ctx.db
    .query("discoveryCells")
    .withIndex("by_gridId_isLeaf", (q) =>
      q.eq("gridId", args.gridId).eq("isLeaf", true),
    )
    .collect()

  const allGridCells = await ctx.db
    .query("discoveryCells")
    .withIndex("by_gridId", (q) => q.eq("gridId", args.gridId))
    .collect()
  const depth0Cells = allGridCells.filter((c) => c.depth === 0)
  const activatedBoundsKeys = depth0Cells
    .map((cell) => cell.boundsKey)
    .filter((key) => key !== undefined)

  return {
    cells: cells.map((cell) => ({
      _id: cell._id,
      parentCellId: cell.parentCellId,
      swLat: cell.swLat,
      swLng: cell.swLng,
      neLat: cell.neLat,
      neLng: cell.neLng,
      depth: cell.depth,
      status: cell.status,
      resultCount: cell.resultCount,
      querySaturation: cell.querySaturation,
      lastSearchedAt: cell.lastSearchedAt,
      boundsKey: cell.boundsKey,
    })),
    activatedBoundsKeys,
  }
}

// Helper: seed a grid with an activated cell
async function seedActivatedCell(db, overrides = {}) {
  const gridId = await db.insert("discoveryGrids", {
    name: "Discovery",
    region: "Ontario",
    province: "Ontario",
    queries: ["farm market", "fruit stand", "farmers market"],
    cellSizeKm: 10,
    totalLeadsFound: 0,
    createdAt: Date.now(),
  })

  const cellId = await db.insert("discoveryCells", {
    swLat: 43.0,
    swLng: -79.5,
    neLat: 43.09009,
    neLng: -79.37793,
    boundsKey: "43.000000_-79.500000",
    depth: 0,
    isLeaf: true,
    status: "unsearched",
    gridId,
    ...overrides,
  })

  return { gridId, cellId }
}

// ============================================================
// WIRING: Panel Merge button dispatches undivide action for child cells
// ============================================================

test("Merge button is visible only for child cells (depth > 0)", () => {
  assert.match(panelSource, /selectedCell\.depth\s*>\s*0/)
})

test("Merge button dispatches undivide action to onCellAction", () => {
  assert.match(
    panelSource,
    /onCellAction\(selectedCell\._id,\s*\{\s*type:\s*"undivide"\s*\}\)/,
  )
})

test("page handler invokes undivideCell mutation for undivide action type", () => {
  const undivideBlock = pageSource.slice(
    pageSource.indexOf('action.type === "undivide"'),
  )
  assert.match(undivideBlock, /await\s+undivideCell\(\{/)
})

test("page handler clears selection after successful merge", () => {
  const undivideBlock = pageSource.slice(
    pageSource.indexOf('action.type === "undivide"'),
  )
  assert.match(undivideBlock, /setSelectedCellId\(null\)/)
})

// ============================================================
// BEHAVIORAL: clicking Merge on a child cell merges back to parent
// ============================================================

test("click Merge on child cell: parent becomes leaf again", async () => {
  const db = createMockDb()
  const { cellId } = await seedActivatedCell(db)

  // Subdivide to create children
  const { childIds } = await subdivideCell({ db }, { cellId })
  assert.equal(childIds.length, 4)

  // Simulate "click Merge on a child cell"
  const result = await undivideCell({ db }, { cellId: childIds[0] })

  assert.equal(result.deletedCount, 4)
  const parent = await db.get(cellId)
  assert.equal(parent.isLeaf, true, "Parent restored as leaf")
})

test("click Merge on child cell: all siblings are deleted", async () => {
  const db = createMockDb()
  const { cellId } = await seedActivatedCell(db)

  const { childIds } = await subdivideCell({ db }, { cellId })

  // Click Merge on child 2 — all 4 children should be deleted
  await undivideCell({ db }, { cellId: childIds[1] })

  for (const id of childIds) {
    const child = await db.get(id)
    assert.equal(child, null, `Child ${id} must be deleted`)
  }
})

test("click Merge on child cell: parent reappears in listCells", async () => {
  const db = createMockDb()
  const { gridId, cellId } = await seedActivatedCell(db)

  const { childIds } = await subdivideCell({ db }, { cellId })

  // Before merge: listCells shows 4 children, not the parent
  const before = await listCells({ db }, { gridId })
  assert.equal(before.cells.length, 4)
  assert.ok(
    before.cells.every((c) => c._id !== cellId),
    "Parent should not appear in listCells before merge",
  )

  // Click Merge on a child
  await undivideCell({ db }, { cellId: childIds[0] })

  // After merge: listCells shows only the parent
  const after = await listCells({ db }, { gridId })
  assert.equal(after.cells.length, 1)
  assert.equal(after.cells[0]._id, cellId, "Parent is the visible cell")
  assert.equal(after.cells[0].depth, 0)
  assert.equal(after.cells[0].boundsKey, "43.000000_-79.500000")
})

test("click Merge on child cell: parent retains original search data", async () => {
  const db = createMockDb()
  const { cellId } = await seedActivatedCell(db, {
    status: "saturated",
    resultCount: 45,
    querySaturation: [
      { query: "farm market", count: 20 },
      { query: "fruit stand", count: 25 },
    ],
    lastSearchedAt: 1700000000000,
  })

  const { childIds } = await subdivideCell({ db }, { cellId })

  // Mark some children as searched (simulating work done on children)
  await db.patch(childIds[0], { status: "searched", resultCount: 8 })
  await db.patch(childIds[1], { status: "searched", resultCount: 12 })

  // Click Merge
  await undivideCell({ db }, { cellId: childIds[2] })

  // Parent retains its OWN search data, not the children's
  const parent = await db.get(cellId)
  assert.equal(parent.status, "saturated")
  assert.equal(parent.resultCount, 45)
  assert.equal(parent.lastSearchedAt, 1700000000000)
  assert.deepStrictEqual(parent.querySaturation, [
    { query: "farm market", count: 20 },
    { query: "fruit stand", count: 25 },
  ])
})

test("click Merge on depth-2 grandchild: only collapses to depth-1 parent", async () => {
  const db = createMockDb()
  const { gridId, cellId } = await seedActivatedCell(db)

  // Split root → 4 depth-1 children
  const { childIds } = await subdivideCell({ db }, { cellId })

  // Split first child → 4 depth-2 grandchildren
  const { childIds: grandchildIds } = await subdivideCell(
    { db },
    { cellId: childIds[0] },
  )

  // Click Merge on a grandchild — collapses only childIds[0]
  const result = await undivideCell({ db }, { cellId: grandchildIds[0] })
  assert.equal(result.deletedCount, 4, "Only 4 grandchildren deleted")

  // childIds[0] is restored as leaf, other children unchanged
  const child0 = await db.get(childIds[0])
  assert.equal(child0.isLeaf, true, "Parent of grandchildren is leaf again")

  // Root is still non-leaf (has 4 children)
  const root = await db.get(cellId)
  assert.equal(root.isLeaf, false, "Root still non-leaf")

  // listCells: 4 depth-1 children (all leaves now)
  const cells = await listCells({ db }, { gridId })
  assert.equal(cells.cells.length, 4)
})

test("click Merge on child cell: activatedBoundsKeys still contains root key", async () => {
  const db = createMockDb()
  const { gridId, cellId } = await seedActivatedCell(db)

  const { childIds } = await subdivideCell({ db }, { cellId })
  await undivideCell({ db }, { cellId: childIds[0] })

  const result = await listCells({ db }, { gridId })
  assert.ok(
    result.activatedBoundsKeys.includes("43.000000_-79.500000"),
    "Root boundsKey still in activatedBoundsKeys after merge",
  )
})

test("click Merge blocked when any sibling is searching", async () => {
  const db = createMockDb()
  const { cellId } = await seedActivatedCell(db)

  const { childIds } = await subdivideCell({ db }, { cellId })

  // One sibling is being searched
  await db.patch(childIds[2], { status: "searching" })

  // Clicking Merge on another child should fail
  await assert.rejects(
    () => undivideCell({ db }, { cellId: childIds[0] }),
    { message: "Cannot undivide while a child cell is being searched" },
  )

  // Nothing was deleted
  for (const id of childIds) {
    const child = await db.get(id)
    assert.notEqual(child, null, `Child ${id} still exists`)
  }
})

test("click Merge then re-subdivide: creates fresh children", async () => {
  const db = createMockDb()
  const { gridId, cellId } = await seedActivatedCell(db)

  // Subdivide
  const first = await subdivideCell({ db }, { cellId })

  // Merge
  await undivideCell({ db }, { cellId: first.childIds[0] })

  // Re-subdivide
  const second = await subdivideCell({ db }, { cellId })
  assert.equal(second.childIds.length, 4)

  // New IDs (old children were deleted)
  const overlap = second.childIds.filter((id) =>
    first.childIds.includes(id),
  )
  assert.equal(overlap.length, 0, "Fresh child IDs after merge + re-split")

  const cells = await listCells({ db }, { gridId })
  assert.equal(cells.cells.length, 4)
})
