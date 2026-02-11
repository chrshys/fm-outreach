import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")
const gridSource = fs.readFileSync("src/components/map/discovery-grid.tsx", "utf8")
const gridCellsSource = fs.readFileSync("convex/discovery/gridCells.ts", "utf8")

// ============================================================
// Tooltip: saturated cell shows subdivision hint
// ============================================================

test("tooltip includes 'Click to subdivide' for saturated cells below max depth", () => {
  assert.match(gridSource, /cell\.depth\s*<\s*MAX_DEPTH/)
  assert.match(gridSource, /"Click to subdivide"/)
})

test("tooltip includes 'Max depth reached' for saturated cells at max depth", () => {
  assert.match(gridSource, /"Max depth reached"/)
})

test("MAX_DEPTH is defined as 4 in discovery-grid component", () => {
  assert.match(gridSource, /MAX_DEPTH\s*=\s*4/)
})

// ============================================================
// UI max-depth guard: prevent backend call for max-depth cells
// ============================================================

test("handleCellClick checks depth >= 4 before calling subdivideCell", () => {
  assert.match(pageSource, /cell\.depth\s*>=\s*4/)
})

test("handleCellClick shows info toast for max-depth cells", () => {
  assert.match(pageSource, /toast\.info\("Cell is already at maximum depth"\)/)
})

test("max-depth guard returns before calling subdivideCell", () => {
  // The depth check and return must appear before the subdivideCell call
  const saturatedBlock = pageSource.slice(
    pageSource.indexOf('cell.status === "saturated"'),
  )
  const depthCheckIdx = saturatedBlock.indexOf("cell.depth >= 4")
  const subdividCallIdx = saturatedBlock.indexOf("await subdivideCell")
  assert.ok(depthCheckIdx > -1, "depth check must exist")
  assert.ok(subdividCallIdx > -1, "subdivide call must exist")
  assert.ok(
    depthCheckIdx < subdividCallIdx,
    "depth check must come before subdivide call",
  )
})

// ============================================================
// Click handler: saturated cell triggers subdivision
// ============================================================

test("handleCellClick calls subdivideCell for saturated cells", () => {
  assert.match(pageSource, /cell\.status\s*===\s*"saturated"/)
  assert.match(pageSource, /subdivideCell\(\{/)
})

test("handleCellClick passes cellId to subdivideCell", () => {
  assert.match(pageSource, /subdivideCell\(\{\s*cellId:\s*cellId\s+as\s+Id<"discoveryCells">/)
})

test("success toast confirms subdivision into 4 quadrants", () => {
  assert.match(pageSource, /toast\.success\("Cell subdivided into 4 quadrants"\)/)
})

test("error toast on subdivide failure", () => {
  assert.match(
    pageSource,
    /toast\.error\(err instanceof Error \? err\.message : "Failed to subdivide cell"\)/,
  )
})

// ============================================================
// Backend: subdivideCell creates exactly 4 children
// ============================================================

test("subdivideCell creates 4 quadrants from midpoint", () => {
  const quadrantMatches = gridCellsSource.match(
    /\{\s*swLat:\s*(?:cell\.swLat|midLat),\s*swLng:\s*(?:cell\.swLng|midLng),\s*neLat:\s*(?:midLat|cell\.neLat),\s*neLng:\s*(?:midLng|cell\.neLng)\s*\}/g,
  )
  assert.ok(quadrantMatches)
  assert.equal(quadrantMatches.length, 4)
})

test("child cells are unsearched with isLeaf: true", () => {
  const subdivideBlock = gridCellsSource.slice(
    gridCellsSource.indexOf("subdivideCell"),
  )
  assert.match(subdivideBlock, /status:\s*"unsearched"/)
  assert.match(subdivideBlock, /isLeaf:\s*true/)
})

test("parent cell is patched to isLeaf: false after subdivision", () => {
  assert.match(
    gridCellsSource,
    /ctx\.db\.patch\(args\.cellId,\s*\{\s*isLeaf:\s*false\s*\}\)/,
  )
})

// ============================================================
// Query: listCells only returns leaf cells (children visible after subdivide)
// ============================================================

test("listCells filters by isLeaf: true via index", () => {
  const listBlock = gridCellsSource.slice(gridCellsSource.indexOf("listCells"))
  assert.match(listBlock, /by_gridId_isLeaf/)
  assert.match(listBlock, /\.eq\("isLeaf",\s*true\)/)
})

// ============================================================
// Tooltip structure: saturated cell tooltip has capacity + action hint
// ============================================================

test("formatTooltip shows at capacity queries for saturated cells", () => {
  assert.match(gridSource, /At capacity:/)
  assert.match(gridSource, /qs\.count\s*>=\s*60/)
})

test("formatTooltip shows result count for saturated cells", () => {
  assert.match(gridSource, /cell\.resultCount\s*\?\?\s*0/)
})
