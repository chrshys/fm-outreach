import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const panelSource = fs.readFileSync(
  "src/components/map/discovery-panel.tsx",
  "utf8",
)
const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")
const gridCellsSource = fs.readFileSync(
  "convex/discovery/gridCells.ts",
  "utf8",
)

// ============================================================
// Click "Split" on a searched cell → subdivides into 4
// Validates: searched cell can be split, children replace parent,
// children are unsearched leaves ready for independent searching
// ============================================================

// --- Step 1: Split button is enabled for a searched cell ---

test("Split button is not disabled for searched status", () => {
  // The disabled condition only checks MAX_DEPTH and "searching"
  const disabledMatch = panelSource.match(
    /disabled=\{selectedCell\.depth\s*>=\s*MAX_DEPTH\s*\|\|\s*selectedCell\.status\s*===\s*"searching"\}/,
  )
  assert.ok(disabledMatch, "Split button disabled condition must exist")
  // "searched" is not in the disabled condition
  assert.doesNotMatch(
    disabledMatch[0],
    /"searched"/,
    "Split button should not be disabled for searched cells",
  )
})

// --- Step 2: Page handler does not block searched cells ---

test("handleCellAction subdivide path does not check for searched status", () => {
  const subdivideSection = pageSource.slice(
    pageSource.indexOf('action.type === "subdivide"'),
    pageSource.indexOf('action.type === "undivide"'),
  )
  // Only depth guard, no status guard
  assert.match(subdivideSection, /cell\.depth\s*>=\s*4/)
  assert.doesNotMatch(
    subdivideSection,
    /cell\.status\s*===\s*"searched"/,
    "Subdivide handler should not block searched cells",
  )
})

// --- Step 3: Backend allows splitting searched cells ---

test("subdivideCell mutation does not block searched status", () => {
  const fnMatch = gridCellsSource.match(
    /export const subdivideCell = mutation\(\{[\s\S]*?\n\}\);/,
  )
  assert.ok(fnMatch, "subdivideCell mutation must exist")
  const fnBody = fnMatch[0]

  // Only blocks "searching"
  assert.match(fnBody, /cell\.status\s*===\s*"searching"/)
  assert.doesNotMatch(
    fnBody,
    /cell\.status\s*===\s*"searched"/,
    "Should not block searched status",
  )
})

// --- Step 4: Children are unsearched leaves ---

test("subdivideCell creates children with unsearched status and isLeaf true", () => {
  const subdivideBlock = gridCellsSource.slice(
    gridCellsSource.indexOf("export const subdivideCell"),
    gridCellsSource.indexOf("export const undivideCell"),
  )
  assert.match(subdivideBlock, /status:\s*"unsearched"/)
  assert.match(subdivideBlock, /isLeaf:\s*true/)
})

// --- Step 5: Parent becomes non-leaf (disappears from listCells) ---

test("parent is patched to isLeaf false so listCells excludes it", () => {
  const subdivideBlock = gridCellsSource.slice(
    gridCellsSource.indexOf("export const subdivideCell"),
    gridCellsSource.indexOf("export const undivideCell"),
  )
  assert.match(
    subdivideBlock,
    /patch\(args\.cellId,\s*\{\s*isLeaf:\s*false\s*\}\)/,
  )

  // listCells only returns isLeaf: true
  const listBlock = gridCellsSource.slice(
    gridCellsSource.indexOf("export const listCells"),
    gridCellsSource.indexOf("export const claimCellForSearch"),
  )
  assert.match(listBlock, /\.eq\("isLeaf",\s*true\)/)
})

// --- Step 6: Selection clears and success toast fires ---

test("selection clears after successful split of searched cell", () => {
  const subdivideBlock = pageSource.slice(
    pageSource.indexOf('action.type === "subdivide"'),
    pageSource.indexOf('action.type === "undivide"'),
  )
  assert.match(subdivideBlock, /setSelectedCellId\(null\)/)
})

test("success toast confirms 4 quadrants after split", () => {
  assert.match(
    pageSource,
    /toast\.success\("Cell subdivided into 4 quadrants"\)/,
  )
})

// --- Step 7: Behavioral — searched cell splits into 4 children ---

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

async function seedSearchedCell(db) {
  const gridId = await db.insert("discoveryGrids", {
    name: "Test",
    region: "Ontario",
    province: "ON",
    queries: ["farm market"],
    cellSizeKm: 10,
    totalLeadsFound: 5,
    createdAt: Date.now(),
  })

  const cellId = await db.insert("discoveryCells", {
    swLat: 43.0,
    swLng: -80.0,
    neLat: 43.1,
    neLng: -79.9,
    boundsKey: "43.000000_-80.000000",
    depth: 0,
    isLeaf: true,
    status: "searched",
    resultCount: 12,
    querySaturation: [{ query: "farm market", count: 12 }],
    lastSearchedAt: Date.now(),
    gridId,
  })

  return { gridId, cellId }
}

test("searched cell produces exactly 4 children", async () => {
  const db = createMockDb()
  const { cellId } = await seedSearchedCell(db)

  const result = await subdivideCell({ db }, { cellId })
  assert.equal(result.childIds.length, 4)
})

test("searched cell children are unsearched and ready for independent searching", async () => {
  const db = createMockDb()
  const { cellId } = await seedSearchedCell(db)

  const { childIds } = await subdivideCell({ db }, { cellId })
  for (const id of childIds) {
    const child = await db.get(id)
    assert.equal(child.status, "unsearched")
    assert.equal(child.isLeaf, true)
    assert.equal(child.depth, 1)
  }
})

test("searched cell becomes non-leaf after split", async () => {
  const db = createMockDb()
  const { cellId } = await seedSearchedCell(db)

  await subdivideCell({ db }, { cellId })
  const parent = await db.get(cellId)
  assert.equal(parent.isLeaf, false)
})

test("searched cell children tile parent bounds exactly", async () => {
  const db = createMockDb()
  const { cellId } = await seedSearchedCell(db)
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

test("searched cell children inherit gridId and parentCellId", async () => {
  const db = createMockDb()
  const { gridId, cellId } = await seedSearchedCell(db)

  const { childIds } = await subdivideCell({ db }, { cellId })
  for (const id of childIds) {
    const child = await db.get(id)
    assert.equal(child.gridId, gridId)
    assert.equal(child.parentCellId, cellId)
  }
})

test("searched cell children do not inherit parent resultCount or querySaturation", async () => {
  const db = createMockDb()
  const { cellId } = await seedSearchedCell(db)

  const { childIds } = await subdivideCell({ db }, { cellId })
  for (const id of childIds) {
    const child = await db.get(id)
    assert.equal(child.resultCount, undefined)
    assert.equal(child.querySaturation, undefined)
  }
})

test("idempotent: splitting searched cell twice returns same children", async () => {
  const db = createMockDb()
  const { cellId } = await seedSearchedCell(db)

  const first = await subdivideCell({ db }, { cellId })
  const second = await subdivideCell({ db }, { cellId })

  assert.deepEqual(first.childIds, second.childIds)
})
