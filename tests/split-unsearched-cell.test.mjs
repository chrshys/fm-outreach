import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const gridSource = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)
const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")
const gridCellsSource = fs.readFileSync(
  "convex/discovery/gridCells.ts",
  "utf8",
)

// ============================================================
// Validation: Clicking "Split" on an unsearched cell works
// (relaxed constraint — subdivide is not gated on search status)
// ============================================================

// --- UI: Split button is enabled for unsearched cells ---

test("getAvailableActions does not gate subdivide on unsearched status", () => {
  const fnBlock = gridSource.slice(
    gridSource.indexOf("function getAvailableActions"),
    gridSource.indexOf("function formatRelativeTime"),
  )
  // subdivide is gated only on depth, not status
  assert.match(fnBlock, /cell\.depth\s*<\s*MAX_DEPTH/)
  assert.doesNotMatch(
    fnBlock,
    /cell\.status\s*===\s*"unsearched"/,
    "getAvailableActions should not check for unsearched status",
  )
})

test("getAvailableActions includes subdivide for unsearched cells below max depth", () => {
  const fnBlock = gridSource.slice(
    gridSource.indexOf("function getAvailableActions"),
    gridSource.indexOf("function formatRelativeTime"),
  )

  // subdivide is gated only on depth, not status
  assert.match(fnBlock, /cell\.depth\s*<\s*MAX_DEPTH/)
  assert.doesNotMatch(
    fnBlock,
    /cell\.status/,
    "getAvailableActions should not check cell status for subdivide",
  )
})

// --- Page handler: no status guard on subdivide ---

test("handleCellAction subdivide path has no unsearched guard", () => {
  const subdivideSection = pageSource.slice(
    pageSource.indexOf('action.type === "subdivide"'),
    pageSource.indexOf('action.type === "undivide"'),
  )

  // Only depth check, no status check
  assert.match(subdivideSection, /cell\.depth\s*>=\s*4/)
  assert.doesNotMatch(
    subdivideSection,
    /cell\.status/,
    "Subdivide handler should not check cell.status",
  )
})

// --- Backend: unsearched cells are explicitly allowed ---

test("subdivideCell mutation does not block unsearched status", () => {
  const fnMatch = gridCellsSource.match(
    /export const subdivideCell = mutation\(\{[\s\S]*?\n\}\);/,
  )
  assert.ok(fnMatch, "subdivideCell mutation must exist")
  const fnBody = fnMatch[0]

  // Only blocks "searching"
  assert.match(fnBody, /cell\.status\s*===\s*"searching"/)

  // Does NOT require saturated or any other specific status
  assert.doesNotMatch(
    fnBody,
    /cell\.status\s*===\s*"unsearched"/,
    "Should not have a guard against unsearched",
  )
  assert.doesNotMatch(
    fnBody,
    /cell\.status\s*!==\s*"saturated"/,
    "Should not require saturated status",
  )
})

// --- Behavioral: unsearched cell can actually be subdivided ---

class ConvexError extends Error {
  constructor(msg) {
    super(msg)
  }
}

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
      if (!doc) throw new Error(`Not found: ${id}`)
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
          return { collect: async () => filtered }
        },
      }
    },
  }
}

async function subdivideCell(ctx, args) {
  const cell = await ctx.db.get(args.cellId)
  if (!cell) throw new ConvexError("Cell not found")
  if (cell.status === "searching")
    throw new ConvexError("Cannot subdivide while cell is being searched")
  if (cell.depth >= 4)
    throw new ConvexError("Cell is already at maximum depth")

  const existingChildren = await ctx.db
    .query("discoveryCells")
    .withIndex("by_parentCellId", (q) => q.eq("parentCellId", args.cellId))
    .collect()
  if (existingChildren.length > 0)
    return { childIds: existingChildren.map((c) => c._id) }

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
      boundsKey: `${q.swLat.toFixed(6)}_${q.swLng.toFixed(6)}`,
      depth: childDepth,
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

async function seedUnsearchedCell(db, overrides = {}) {
  const gridId = await db.insert("discoveryGrids", {
    name: "Test",
    region: "Test",
    province: "ON",
    queries: ["farms"],
    swLat: 42.0,
    swLng: -80.0,
    neLat: 44.0,
    neLng: -78.0,
    cellSizeKm: 20,
    totalLeadsFound: 0,
    createdAt: Date.now(),
  })

  const cellId = await db.insert("discoveryCells", {
    swLat: 42.0,
    swLng: -80.0,
    neLat: 44.0,
    neLng: -78.0,
    boundsKey: "42.000000_-80.000000",
    depth: 0,
    isLeaf: true,
    status: "unsearched",
    gridId,
    ...overrides,
  })

  return { gridId, cellId }
}

test("unsearched cell at depth 0 produces 4 child cells", async () => {
  const db = createMockDb()
  const { cellId } = await seedUnsearchedCell(db)

  const result = await subdivideCell({ db }, { cellId })
  assert.equal(result.childIds.length, 4)
})

test("unsearched cell children are all unsearched leaves", async () => {
  const db = createMockDb()
  const { cellId } = await seedUnsearchedCell(db)

  const { childIds } = await subdivideCell({ db }, { cellId })
  for (const id of childIds) {
    const child = await db.get(id)
    assert.equal(child.status, "unsearched")
    assert.equal(child.isLeaf, true)
    assert.equal(child.depth, 1)
  }
})

test("unsearched cell becomes non-leaf after split", async () => {
  const db = createMockDb()
  const { cellId } = await seedUnsearchedCell(db)

  await subdivideCell({ db }, { cellId })
  const parent = await db.get(cellId)
  assert.equal(parent.isLeaf, false)
})

test("unsearched cell children tile parent bounds exactly", async () => {
  const db = createMockDb()
  const { cellId } = await seedUnsearchedCell(db)
  const parent = await db.get(cellId)

  const { childIds } = await subdivideCell({ db }, { cellId })
  const children = await Promise.all(childIds.map((id) => db.get(id)))

  const midLat = (parent.swLat + parent.neLat) / 2
  const midLng = (parent.swLng + parent.neLng) / 2

  // SW quadrant
  assert.equal(children[0].swLat, parent.swLat)
  assert.equal(children[0].swLng, parent.swLng)
  assert.equal(children[0].neLat, midLat)
  assert.equal(children[0].neLng, midLng)

  // SE quadrant
  assert.equal(children[1].swLat, parent.swLat)
  assert.equal(children[1].swLng, midLng)
  assert.equal(children[1].neLat, midLat)
  assert.equal(children[1].neLng, parent.neLng)

  // NW quadrant
  assert.equal(children[2].swLat, midLat)
  assert.equal(children[2].swLng, parent.swLng)
  assert.equal(children[2].neLat, parent.neLat)
  assert.equal(children[2].neLng, midLng)

  // NE quadrant
  assert.equal(children[3].swLat, midLat)
  assert.equal(children[3].swLng, midLng)
  assert.equal(children[3].neLat, parent.neLat)
  assert.equal(children[3].neLng, parent.neLng)
})

test("unsearched cell at max depth cannot be split", async () => {
  const db = createMockDb()
  const { cellId } = await seedUnsearchedCell(db, { depth: 4 })

  await assert.rejects(
    () => subdivideCell({ db }, { cellId }),
    { message: "Cell is already at maximum depth" },
  )
})
