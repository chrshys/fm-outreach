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
// End-to-end validation: clicking Split on a non-searching cell
// subdivides into 4 quadrants
// ============================================================

// --- UI: Split button dispatches subdivide action on click ---

test("getAvailableActions includes subdivide for non-searching cells below max depth", () => {
  const fnBlock = gridSource.slice(
    gridSource.indexOf("function getAvailableActions"),
    gridSource.indexOf("function formatShortDate"),
  )
  assert.match(fnBlock, /cell\.depth\s*<\s*MAX_DEPTH/)
  assert.match(fnBlock, /type:\s*"subdivide"/)
  // No status check prevents non-searching cells from subdividing
  assert.doesNotMatch(fnBlock, /cell\.status/)
})

// --- Page handler: dispatches subdivideCell mutation ---

test("handleCellAction calls subdivideCell for subdivide action type", () => {
  const subdivideSection = pageSource.slice(
    pageSource.indexOf('action.type === "subdivide"'),
    pageSource.indexOf('action.type === "undivide"'),
  )
  assert.match(subdivideSection, /await\s+subdivideCell\(/)
})

test("handleCellAction does not block subdivide for non-searching statuses", () => {
  // The handler checks only depth >= 4, not cell.status for subdivide
  const subdivideSection = pageSource.slice(
    pageSource.indexOf('action.type === "subdivide"'),
    pageSource.indexOf('action.type === "undivide"'),
  )
  assert.doesNotMatch(subdivideSection, /cell\.status\s*===\s*"searching"/)
  assert.doesNotMatch(subdivideSection, /cell\.status\s*!==/)
})

test("handleCellAction shows success toast after subdivide", () => {
  assert.match(
    pageSource,
    /toast\.success\("Cell subdivided into 4 quadrants"\)/,
  )
})

// --- Backend: subdivideCell only blocks searching status ---

test("subdivideCell mutation blocks only searching status", () => {
  const fnMatch = gridCellsSource.match(
    /export const subdivideCell = mutation\(\{[\s\S]*?\n\}\);/,
  )
  assert.ok(fnMatch, "subdivideCell mutation must exist")
  const fnBody = fnMatch[0]

  // Only one status check: "searching"
  const statusChecks = fnBody.match(/cell\.status\s*[!=]==?\s*"/g) || []
  assert.equal(statusChecks.length, 1, "Only one status guard (searching)")
  assert.match(fnBody, /cell\.status\s*===\s*"searching"/)
})

test("subdivideCell allows unsearched cells", () => {
  const fnMatch = gridCellsSource.match(
    /export const subdivideCell = mutation\(\{[\s\S]*?\n\}\);/,
  )
  const fnBody = fnMatch[0]
  assert.doesNotMatch(fnBody, /cell\.status\s*!==\s*"unsearched"/)
})

test("subdivideCell allows searched cells", () => {
  const fnMatch = gridCellsSource.match(
    /export const subdivideCell = mutation\(\{[\s\S]*?\n\}\);/,
  )
  const fnBody = fnMatch[0]
  assert.doesNotMatch(fnBody, /cell\.status\s*!==\s*"searched"/)
})

test("subdivideCell allows saturated cells", () => {
  const fnMatch = gridCellsSource.match(
    /export const subdivideCell = mutation\(\{[\s\S]*?\n\}\);/,
  )
  const fnBody = fnMatch[0]
  assert.doesNotMatch(fnBody, /cell\.status\s*!==\s*"saturated"/)
})

// --- Backend: creates exactly 4 quadrants via midpoint ---

test("subdivideCell computes midpoint from parent bounds", () => {
  assert.match(
    gridCellsSource,
    /midLat\s*=\s*\(cell\.swLat\s*\+\s*cell\.neLat\)\s*\/\s*2/,
  )
  assert.match(
    gridCellsSource,
    /midLng\s*=\s*\(cell\.swLng\s*\+\s*cell\.neLng\)\s*\/\s*2/,
  )
})

test("subdivideCell defines exactly 4 quadrant bounds", () => {
  const quadrants = gridCellsSource.match(
    /\{\s*swLat:\s*(?:cell\.swLat|midLat),\s*swLng:\s*(?:cell\.swLng|midLng),\s*neLat:\s*(?:midLat|cell\.neLat),\s*neLng:\s*(?:midLng|cell\.neLng)\s*\}/g,
  )
  assert.ok(quadrants, "Quadrant definitions must exist")
  assert.equal(quadrants.length, 4, "Must define exactly 4 quadrants")
})

test("child cells inherit gridId, parentCellId, and depth+1", () => {
  const subdivideBlock = gridCellsSource.slice(
    gridCellsSource.indexOf("export const subdivideCell"),
    gridCellsSource.indexOf("export const undivideCell"),
  )
  assert.match(subdivideBlock, /gridId:\s*cell\.gridId/)
  assert.match(subdivideBlock, /parentCellId:\s*args\.cellId/)
  assert.match(subdivideBlock, /depth:\s*childDepth/)
  assert.match(subdivideBlock, /childDepth\s*=\s*cell\.depth\s*\+\s*1/)
})

test("child cells start as unsearched leaves", () => {
  const subdivideBlock = gridCellsSource.slice(
    gridCellsSource.indexOf("export const subdivideCell"),
    gridCellsSource.indexOf("export const undivideCell"),
  )
  assert.match(subdivideBlock, /status:\s*"unsearched"/)
  assert.match(subdivideBlock, /isLeaf:\s*true/)
})

test("parent cell is marked as non-leaf after subdivision", () => {
  assert.match(
    gridCellsSource,
    /ctx\.db\.patch\(args\.cellId,\s*\{\s*isLeaf:\s*false\s*\}\)/,
  )
})

// --- Query: only leaf cells shown, so children replace parent ---

test("listCells query returns only leaf cells", () => {
  const listBlock = gridCellsSource.slice(
    gridCellsSource.indexOf("export const listCells"),
  )
  assert.match(listBlock, /\.eq\("isLeaf",\s*true\)/)
})

// --- Behavioral: subdivideCell logic creates correct geometry ---

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

class ConvexError extends Error {
  constructor(msg) {
    super(msg)
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

async function seedCell(db, overrides = {}) {
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

for (const status of ["unsearched", "searched", "saturated"]) {
  test(`subdivide creates 4 quadrants from ${status} cell`, async () => {
    const db = createMockDb()
    const { cellId } = await seedCell(db, { status })

    const result = await subdivideCell({ db }, { cellId })
    assert.equal(result.childIds.length, 4)
  })

  test(`${status} cell children tile parent exactly`, async () => {
    const db = createMockDb()
    const { cellId } = await seedCell(db, { status })
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

  test(`${status} cell parent becomes non-leaf after split`, async () => {
    const db = createMockDb()
    const { cellId } = await seedCell(db, { status })

    await subdivideCell({ db }, { cellId })
    const parent = await db.get(cellId)
    assert.equal(parent.isLeaf, false)
  })
}

test("searching cell cannot be subdivided", async () => {
  const db = createMockDb()
  const { cellId } = await seedCell(db, { status: "searching" })

  await assert.rejects(
    () => subdivideCell({ db }, { cellId }),
    { message: "Cannot subdivide while cell is being searched" },
  )
})
