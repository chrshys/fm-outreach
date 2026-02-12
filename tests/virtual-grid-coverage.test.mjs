import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import ts from "typescript"
import { createRequire } from "node:module"

// ── Source files ──

const discoveryGridSource = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)
const cellColorsSource = fs.readFileSync(
  "src/components/map/cell-colors.ts",
  "utf8",
)
const mapContentSource = fs.readFileSync(
  "src/components/map/map-content.tsx",
  "utf8",
)

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

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-vg-coverage-"))
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

// ============================================================
// 1. VIRTUAL_CELL_STYLE defines faint gray appearance
// ============================================================

test("VIRTUAL_CELL_STYLE uses gray border color #d1d5db", () => {
  assert.match(cellColorsSource, /VIRTUAL_CELL_STYLE[\s\S]*color:\s*["']#d1d5db["']/)
})

test("VIRTUAL_CELL_STYLE uses gray fill color #d1d5db", () => {
  assert.match(cellColorsSource, /VIRTUAL_CELL_STYLE[\s\S]*fillColor:\s*["']#d1d5db["']/)
})

test("VIRTUAL_CELL_STYLE has very low fill opacity (0.05)", () => {
  assert.match(cellColorsSource, /VIRTUAL_CELL_STYLE[\s\S]*fillOpacity:\s*0\.05/)
})

test("VIRTUAL_CELL_STYLE has thin border weight (0.5)", () => {
  assert.match(cellColorsSource, /VIRTUAL_CELL_STYLE[\s\S]*weight:\s*0\.5/)
})

// ============================================================
// 2. Virtual grid only renders at zoom >= 8
// ============================================================

test("DiscoveryGrid returns empty virtual cells when zoom < 8", () => {
  assert.match(discoveryGridSource, /zoom\s*<\s*8/)
})

test("DiscoveryGrid computes virtual grid when zoom >= 8 (not skipped)", () => {
  // The condition `zoom < 8` returns [] — meaning zoom >= 8 computes normally
  assert.match(discoveryGridSource, /if\s*\(!mapBounds\s*\|\|\s*zoom\s*<\s*8\)\s*return\s*\[\]/)
})

// ============================================================
// 3. Virtual grid covers the entire visible map area
// ============================================================

test("computeVirtualGrid covers full Niagara-area bounds at default zoom", () => {
  // Simulates typical bounds visible at zoom 8 centered on Niagara
  const bounds = { swLat: 42.58, swLng: -79.78, neLat: 43.58, neLng: -78.38 }
  const cellSizeKm = 20
  const cells = mod.computeVirtualGrid(bounds, cellSizeKm)
  assert.ok(cells.length > 0, "should produce cells for Niagara area")

  const minSwLat = Math.min(...cells.map((c) => c.swLat))
  const minSwLng = Math.min(...cells.map((c) => c.swLng))
  const maxNeLat = Math.max(...cells.map((c) => c.neLat))
  const maxNeLng = Math.max(...cells.map((c) => c.neLng))

  assert.ok(minSwLat <= bounds.swLat, "grid extends to or past south edge")
  assert.ok(minSwLng <= bounds.swLng, "grid extends to or past west edge")
  assert.ok(maxNeLat >= bounds.neLat, "grid extends to or past north edge")
  assert.ok(maxNeLng >= bounds.neLng, "grid extends to or past east edge")
})

test("computeVirtualGrid produces contiguous cells with no gaps horizontally", () => {
  const bounds = { swLat: 42.58, swLng: -79.78, neLat: 43.58, neLng: -78.38 }
  const cells = mod.computeVirtualGrid(bounds, 20)
  assert.ok(cells.length > 0)

  // Group by row
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
})

test("computeVirtualGrid produces contiguous cells with no gaps vertically", () => {
  const bounds = { swLat: 42.58, swLng: -79.78, neLat: 43.58, neLng: -78.38 }
  const cells = mod.computeVirtualGrid(bounds, 20)
  assert.ok(cells.length > 0)

  const rows = new Map()
  for (const cell of cells) {
    const rowKey = cell.swLat.toFixed(10)
    if (!rows.has(rowKey)) rows.set(rowKey, [])
    rows.get(rowKey).push(cell)
  }

  const rowKeys = [...rows.keys()].sort((a, b) => Number(a) - Number(b))
  for (let i = 1; i < rowKeys.length; i++) {
    const prevRow = rows.get(rowKeys[i - 1])
    const currRow = rows.get(rowKeys[i])
    const gap = Math.abs(currRow[0].swLat - prevRow[0].neLat)
    assert.ok(gap < 1e-10, `vertical gap of ${gap}`)
  }
})

// ============================================================
// 4. Grid updates on pan (moveend/zoomend tracking)
// ============================================================

test("DiscoveryGrid listens for moveend events to update bounds", () => {
  assert.match(discoveryGridSource, /moveend:\s*\(\)\s*=>\s*updateBounds\(\)/)
})

test("DiscoveryGrid listens for zoomend events to update bounds", () => {
  assert.match(discoveryGridSource, /zoomend:\s*\(\)\s*=>\s*updateBounds\(\)/)
})

test("DiscoveryGrid initializes bounds eagerly from map state", () => {
  assert.match(discoveryGridSource, /useState.*\(\(\)\s*=>\s*getMapBounds\(map\)\)/)
})

// ============================================================
// 5. Virtual cells are filtered against persisted cells
// ============================================================

test("DiscoveryGrid filters virtual cells against activatedBoundsKeys set", () => {
  assert.match(discoveryGridSource, /activatedSet\.has\(vc\.key\)/)
})

test("DiscoveryGrid filters virtual cells against persistedBoundsKeySet", () => {
  assert.match(discoveryGridSource, /persistedBoundsKeySet\.has\(vc\.key\)/)
})

test("DiscoveryGrid builds activatedSet from props", () => {
  assert.match(discoveryGridSource, /new\s+Set\(activatedBoundsKeys\)/)
})

test("DiscoveryGrid builds persistedBoundsKeySet from cells boundsKey field", () => {
  assert.match(discoveryGridSource, /cells\.map\(.*boundsKey/)
})

// ============================================================
// 6. Persisted cells render on top of / instead of virtual cells
// ============================================================

test("DiscoveryGrid renders persisted cells after virtual cells in JSX (on top in SVG)", () => {
  const persistedIdx = discoveryGridSource.indexOf("cells.map((cell)")
  const virtualIdx = discoveryGridSource.indexOf("filteredVirtualCells.map")
  assert.ok(persistedIdx > 0, "persisted cells render block exists")
  assert.ok(virtualIdx > 0, "virtual cells render block exists")
  assert.ok(virtualIdx < persistedIdx, "virtual cells rendered first so persisted cells appear on top")
})

// ============================================================
// 7. VirtualGridCell uses VIRTUAL_CELL_STYLE (faint gray)
// ============================================================

test("VirtualGridCell renders Rectangle with VIRTUAL_CELL_STYLE", () => {
  const virtualCellSection = discoveryGridSource
    .split("function VirtualGridCell")[1]
    .split("function DiscoveryGridCell")[0]
  assert.match(virtualCellSection, /pathOptions=\{VIRTUAL_CELL_STYLE\}/)
})

// ============================================================
// 8. MapContent renders DiscoveryGrid in a dedicated pane
// ============================================================

test("MapContent renders DiscoveryGrid inside a Pane with zIndex 450", () => {
  assert.match(mapContentSource, /<Pane\s+name="discovery-grid"\s+style=\{\{\s*zIndex:\s*450\s*\}\}/)
})

test("MapContent conditionally renders DiscoveryGrid when all grid props provided", () => {
  assert.match(mapContentSource, /gridCells\s*&&\s*onCellSelect\s*&&\s*cellSizeKm\s*&&\s*gridId\s*&&\s*activatedBoundsKeys\s*&&\s*onActivateCell/)
})

// ============================================================
// 9. computeVirtualGrid handles various zoom-level viewport sizes
// ============================================================

test("computeVirtualGrid works for zoomed-in viewport (zoom ~10)", () => {
  // Smaller bounds simulating higher zoom
  const bounds = { swLat: 43.0, swLng: -79.1, neLat: 43.1, neLng: -79.0 }
  const cells = mod.computeVirtualGrid(bounds, 20)
  assert.ok(cells.length > 0, "should produce cells for small viewport")
})

test("computeVirtualGrid works for zoom ~12 viewport", () => {
  const bounds = { swLat: 43.04, swLng: -79.06, neLat: 43.06, neLng: -79.04 }
  const cells = mod.computeVirtualGrid(bounds, 20)
  assert.ok(cells.length > 0, "should produce cells for very small viewport")
})

test("computeVirtualGrid returns empty when viewport too wide for cell size", () => {
  // Very large viewport with small cells exceeds maxCells — returns empty as designed
  const bounds = { swLat: 41.0, swLng: -82.0, neLat: 45.0, neLng: -76.0 }
  const cells = mod.computeVirtualGrid(bounds, 20)
  assert.deepEqual(cells, [], "wide viewport with 20km cells exceeds 500 maxCells")
})

test("computeVirtualGrid produces cells for zoom-8 sized viewport with 20km cells", () => {
  // Realistic zoom 8 viewport — roughly 1 degree lat x 1.4 degrees lng
  const bounds = { swLat: 42.58, swLng: -79.78, neLat: 43.58, neLng: -78.38 }
  const cells = mod.computeVirtualGrid(bounds, 20)
  assert.ok(cells.length > 0, "should produce cells for zoom-8 viewport")
  assert.ok(cells.length <= 500, `cell count ${cells.length} should be within limit`)
})

// ============================================================
// 10. Virtual grid cell keys are stable across pan operations
// ============================================================

test("same-midLat overlapping viewports produce consistent keys for shared area", () => {
  const cellSizeKm = 20
  // Two viewports with same midLat so lngStep is identical — simulates horizontal pan
  const bounds1 = { swLat: 43.0, swLng: -79.5, neLat: 43.5, neLng: -79.0 }
  const bounds2 = { swLat: 43.0, swLng: -79.3, neLat: 43.5, neLng: -78.8 }

  const cells1 = mod.computeVirtualGrid(bounds1, cellSizeKm)
  const cells2 = mod.computeVirtualGrid(bounds2, cellSizeKm)

  assert.ok(cells1.length > 0, "first viewport has cells")
  assert.ok(cells2.length > 0, "second viewport has cells")

  const keyMap1 = new Map(cells1.map((c) => [c.key, c]))
  const keyMap2 = new Map(cells2.map((c) => [c.key, c]))

  // Find common keys
  const commonKeys = [...keyMap1.keys()].filter((k) => keyMap2.has(k))
  assert.ok(commonKeys.length > 0, "overlapping viewports should share some cells")

  // Verify coordinates match for shared keys
  for (const key of commonKeys) {
    const c1 = keyMap1.get(key)
    const c2 = keyMap2.get(key)
    assert.equal(c1.swLat, c2.swLat, `swLat mismatch for key ${key}`)
    assert.equal(c1.swLng, c2.swLng, `swLng mismatch for key ${key}`)
    assert.equal(c1.neLat, c2.neLat, `neLat mismatch for key ${key}`)
    assert.equal(c1.neLng, c2.neLng, `neLng mismatch for key ${key}`)
  }
})
