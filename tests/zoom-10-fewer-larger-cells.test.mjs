import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import ts from "typescript"
import { createRequire } from "node:module"

// ── Load virtual-grid module at runtime ──

function loadVirtualGrid() {
  const source = fs.readFileSync("src/lib/virtual-grid.ts", "utf8")
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: "virtual-grid.ts",
  }).outputText

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-vg-zoom10-"))
  const modulePath = path.join(tempDir, "virtual-grid.cjs")
  fs.writeFileSync(modulePath, transpiled, "utf8")

  const requireFromTest = createRequire(import.meta.url)
  try {
    return requireFromTest(modulePath)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

const mod = loadVirtualGrid()

const discoveryGridSource = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

// ============================================================
// Zoom 10 → fewer, larger-appearing cells, still aligned
//
// At zoom 10 the map viewport is roughly 4× smaller than zoom 8.
// The same cellSizeKm produces fewer cells that each occupy more
// screen real-estate. Grid alignment must be preserved.
// ============================================================

// Approximate viewport bounds at zoom 8 vs zoom 10 around Niagara
const ZOOM_8_BOUNDS = { swLat: 42.58, swLng: -79.78, neLat: 43.58, neLng: -78.38 }
const ZOOM_10_BOUNDS = { swLat: 42.96, swLng: -79.26, neLat: 43.21, neLng: -78.91 }
const CELL_SIZE_KM = 10

// -- 1. Virtual cells are produced at zoom 10 --

test("computeVirtualGrid produces cells for zoom-10 viewport", () => {
  const cells = mod.computeVirtualGrid(ZOOM_10_BOUNDS, CELL_SIZE_KM)
  assert.ok(cells.length > 0, `expected cells but got ${cells.length}`)
})

// -- 2. Fewer cells at zoom 10 than at zoom 8 --

test("zoom-10 viewport produces fewer cells than zoom-8 viewport", () => {
  const zoom8Cells = mod.computeVirtualGrid(ZOOM_8_BOUNDS, CELL_SIZE_KM)
  const zoom10Cells = mod.computeVirtualGrid(ZOOM_10_BOUNDS, CELL_SIZE_KM)

  assert.ok(zoom8Cells.length > 0)
  assert.ok(zoom10Cells.length > 0)
  assert.ok(
    zoom10Cells.length < zoom8Cells.length,
    `zoom-10 cell count (${zoom10Cells.length}) should be less than zoom-8 (${zoom8Cells.length})`,
  )
})

// -- 3. Cell dimensions are identical at both zoom levels --

test("cell dimensions are identical at zoom 8 and zoom 10 (same cellSizeKm)", () => {
  const zoom8Cells = mod.computeVirtualGrid(ZOOM_8_BOUNDS, CELL_SIZE_KM)
  const zoom10Cells = mod.computeVirtualGrid(ZOOM_10_BOUNDS, CELL_SIZE_KM)

  const z8LatSpan = zoom8Cells[0].neLat - zoom8Cells[0].swLat
  const z10LatSpan = zoom10Cells[0].neLat - zoom10Cells[0].swLat
  assert.ok(
    Math.abs(z8LatSpan - z10LatSpan) < 1e-10,
    `lat span should match: zoom8=${z8LatSpan}, zoom10=${z10LatSpan}`,
  )

  const z8LngSpan = zoom8Cells[0].neLng - zoom8Cells[0].swLng
  const z10LngSpan = zoom10Cells[0].neLng - zoom10Cells[0].swLng
  assert.ok(
    Math.abs(z8LngSpan - z10LngSpan) < 1e-10,
    `lng span should match: zoom8=${z8LngSpan}, zoom10=${z10LngSpan}`,
  )
})

// -- 4. Zoom-10 cells align with zoom-8 cells (shared cells have same coordinates) --

test("zoom-10 cells align with zoom-8 cells — shared keys have identical coordinates", () => {
  const zoom8Cells = mod.computeVirtualGrid(ZOOM_8_BOUNDS, CELL_SIZE_KM)
  const zoom10Cells = mod.computeVirtualGrid(ZOOM_10_BOUNDS, CELL_SIZE_KM)

  const zoom8Map = new Map(zoom8Cells.map((c) => [c.key, c]))
  const zoom10Map = new Map(zoom10Cells.map((c) => [c.key, c]))

  const commonKeys = [...zoom10Map.keys()].filter((k) => zoom8Map.has(k))
  assert.ok(
    commonKeys.length > 0,
    "zoom-10 viewport is contained within zoom-8 viewport, so they must share cells",
  )

  for (const key of commonKeys) {
    const z8 = zoom8Map.get(key)
    const z10 = zoom10Map.get(key)
    assert.equal(z8.swLat, z10.swLat, `swLat mismatch for key ${key}`)
    assert.equal(z8.swLng, z10.swLng, `swLng mismatch for key ${key}`)
    assert.equal(z8.neLat, z10.neLat, `neLat mismatch for key ${key}`)
    assert.equal(z8.neLng, z10.neLng, `neLng mismatch for key ${key}`)
  }
})

// -- 5. All zoom-10 cells are a subset of zoom-8 cells --

test("every zoom-10 cell key exists in the zoom-8 cell set", () => {
  const zoom8Cells = mod.computeVirtualGrid(ZOOM_8_BOUNDS, CELL_SIZE_KM)
  const zoom10Cells = mod.computeVirtualGrid(ZOOM_10_BOUNDS, CELL_SIZE_KM)

  const zoom8Keys = new Set(zoom8Cells.map((c) => c.key))

  for (const cell of zoom10Cells) {
    assert.ok(
      zoom8Keys.has(cell.key),
      `zoom-10 cell ${cell.key} should exist in zoom-8 grid`,
    )
  }
})

// -- 6. Zoom-10 grid covers the entire zoom-10 viewport --

test("zoom-10 grid covers the entire visible viewport", () => {
  const cells = mod.computeVirtualGrid(ZOOM_10_BOUNDS, CELL_SIZE_KM)

  const gridSouth = Math.min(...cells.map((c) => c.swLat))
  const gridWest = Math.min(...cells.map((c) => c.swLng))
  const gridNorth = Math.max(...cells.map((c) => c.neLat))
  const gridEast = Math.max(...cells.map((c) => c.neLng))

  assert.ok(gridSouth <= ZOOM_10_BOUNDS.swLat, `grid south ${gridSouth} <= viewport south ${ZOOM_10_BOUNDS.swLat}`)
  assert.ok(gridWest <= ZOOM_10_BOUNDS.swLng, `grid west ${gridWest} <= viewport west ${ZOOM_10_BOUNDS.swLng}`)
  assert.ok(gridNorth >= ZOOM_10_BOUNDS.neLat, `grid north ${gridNorth} >= viewport north ${ZOOM_10_BOUNDS.neLat}`)
  assert.ok(gridEast >= ZOOM_10_BOUNDS.neLng, `grid east ${gridEast} >= viewport east ${ZOOM_10_BOUNDS.neLng}`)
})

// -- 7. Zoom-10 grid is contiguous (no gaps) --

test("zoom-10 grid tiles contiguously with no gaps", () => {
  const cells = mod.computeVirtualGrid(ZOOM_10_BOUNDS, CELL_SIZE_KM)
  assert.ok(cells.length > 0)

  // Check horizontal contiguity within each row
  const rows = new Map()
  for (const cell of cells) {
    const rowKey = cell.swLat.toFixed(10)
    if (!rows.has(rowKey)) rows.set(rowKey, [])
    rows.get(rowKey).push(cell)
  }

  for (const [, rowCells] of rows) {
    rowCells.sort((a, b) => a.swLng - b.swLng)
    for (let i = 1; i < rowCells.length; i++) {
      const gap = Math.abs(rowCells[i].swLng - rowCells[i - 1].neLng)
      assert.ok(gap < 1e-10, `horizontal gap of ${gap}`)
    }
  }

  // Check vertical contiguity between rows
  const rowKeys = [...rows.keys()].sort((a, b) => Number(a) - Number(b))
  for (let i = 1; i < rowKeys.length; i++) {
    const prevRow = rows.get(rowKeys[i - 1])
    const currRow = rows.get(rowKeys[i])
    const gap = Math.abs(currRow[0].swLat - prevRow[0].neLat)
    assert.ok(gap < 1e-10, `vertical gap of ${gap}`)
  }
})

// -- 8. DiscoveryGrid component shows virtual cells at zoom 10 (zoom >= 8 gate) --

test("DiscoveryGrid shows virtual cells at zoom 10 (zoom >= 8 gate passes)", () => {
  // The zoom < 8 check means zoom 10 passes the gate
  assert.match(discoveryGridSource, /zoom\s*<\s*8/)
  // zoom 10 >= 8 is true, so virtual cells are computed
})

test("DiscoveryGrid shows persisted cells at all zoom levels (no zoom gate)", () => {
  // Persisted cells render without zoom gate so they're visible even when zoomed out
  const mainComponent = discoveryGridSource.split("export default function DiscoveryGrid")[1]
  assert.doesNotMatch(mainComponent, /zoom\s*>=\s*\d+\s*&&\s*cells\.map/)
  assert.match(mainComponent, /cells\.map/)
})

// -- 9. Cell count is reasonable at zoom 10 (not exceeding maxCells) --

test("zoom-10 cell count is well under maxCells limit of 500", () => {
  const cells = mod.computeVirtualGrid(ZOOM_10_BOUNDS, CELL_SIZE_KM)
  assert.ok(cells.length <= 500, `cell count ${cells.length} should be <= 500`)
  assert.ok(cells.length < 100, `zoom-10 should have a small number of cells, got ${cells.length}`)
})

// -- 10. Pan at zoom 10 preserves alignment --

test("panning at zoom 10 produces cells aligned with the original grid", () => {
  const original = ZOOM_10_BOUNDS
  const panned = {
    swLat: original.swLat + 0.05,
    swLng: original.swLng + 0.05,
    neLat: original.neLat + 0.05,
    neLng: original.neLng + 0.05,
  }

  const originalCells = mod.computeVirtualGrid(original, CELL_SIZE_KM)
  const pannedCells = mod.computeVirtualGrid(panned, CELL_SIZE_KM)

  assert.ok(originalCells.length > 0)
  assert.ok(pannedCells.length > 0)

  const originalMap = new Map(originalCells.map((c) => [c.key, c]))
  const pannedMap = new Map(pannedCells.map((c) => [c.key, c]))

  const commonKeys = [...originalMap.keys()].filter((k) => pannedMap.has(k))
  assert.ok(commonKeys.length > 0, "overlapping viewports at zoom 10 should share cells")

  for (const key of commonKeys) {
    const o = originalMap.get(key)
    const p = pannedMap.get(key)
    assert.equal(o.swLat, p.swLat, `swLat stable for key ${key}`)
    assert.equal(o.swLng, p.swLng, `swLng stable for key ${key}`)
    assert.equal(o.neLat, p.neLat, `neLat stable for key ${key}`)
    assert.equal(o.neLng, p.neLng, `neLng stable for key ${key}`)
  }
})

// -- 11. Zoom 10 with 20km cell size (MapContent default fallback) also works --

test("zoom-10 viewport with 20km cells produces fewer, aligned cells", () => {
  const cells20km = mod.computeVirtualGrid(ZOOM_10_BOUNDS, 20)
  const cells10km = mod.computeVirtualGrid(ZOOM_10_BOUNDS, 10)

  assert.ok(cells20km.length > 0, "should produce cells with 20km size at zoom 10")
  assert.ok(
    cells20km.length < cells10km.length,
    `20km cells (${cells20km.length}) should be fewer than 10km cells (${cells10km.length})`,
  )

  // 20km cells should also cover the viewport
  const gridSouth = Math.min(...cells20km.map((c) => c.swLat))
  const gridNorth = Math.max(...cells20km.map((c) => c.neLat))
  assert.ok(gridSouth <= ZOOM_10_BOUNDS.swLat)
  assert.ok(gridNorth >= ZOOM_10_BOUNDS.neLat)
})
