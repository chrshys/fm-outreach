import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import ts from "typescript"
import { createRequire } from "node:module"

// ── Source files ──

const mapPageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")
const mapContentSource = fs.readFileSync("src/components/map/map-content.tsx", "utf8")
const discoveryGridSource = fs.readFileSync("src/components/map/discovery-grid.tsx", "utf8")
const cellColorsSource = fs.readFileSync("src/components/map/cell-colors.ts", "utf8")

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

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-vg-toggle-"))
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
// E2E: Toggle to Discovery mode at default zoom (8) →
//       faint gray virtual grid covers the entire visible map
// ============================================================

// -- Step 1: Default zoom is 8 --

test("MapContent sets DEFAULT_ZOOM to 8", () => {
  assert.match(mapContentSource, /const\s+DEFAULT_ZOOM\s*=\s*8/)
})

test("MapContainer uses DEFAULT_ZOOM as initial zoom", () => {
  assert.match(mapContentSource, /<MapContainer[\s\S]*?zoom=\{DEFAULT_ZOOM\}/)
})

// -- Step 2: Toggling to discovery mode passes gridCells and onCellSelect --

test("discovery mode passes cells to MapContent as gridCells", () => {
  assert.match(
    mapPageSource,
    /gridCells=\{viewMode\s*===\s*"discovery"\s*\?\s*cells\s*\?\?\s*undefined\s*:\s*undefined\}/,
  )
})

test("discovery mode passes handleCellSelect to MapContent as onCellSelect", () => {
  assert.match(
    mapPageSource,
    /onCellSelect=\{viewMode\s*===\s*"discovery"\s*\?\s*handleCellSelect\s*:\s*undefined\}/,
  )
})

test("discovery mode passes onActivateCell to MapContent", () => {
  assert.match(
    mapPageSource,
    /onActivateCell=\{viewMode\s*===\s*"discovery"\s*\?\s*handleActivateCell\s*:\s*undefined\}/,
  )
})

// -- Step 3: Auto-create global grid on discovery entry --

test("page auto-creates global grid when entering discovery mode with null gridId", () => {
  assert.match(
    mapPageSource,
    /viewMode\s*===\s*"discovery"\s*&&\s*globalGridId\s*===\s*null/,
  )
  assert.match(mapPageSource, /getOrCreateGlobalGrid\(\{\}\)/)
})

test("page sets globalGridId from getOrCreateGlobalGrid result", () => {
  assert.match(mapPageSource, /setGlobalGridId\(result\.gridId\)/)
})

// -- Step 4: MapContent renders DiscoveryGrid when gridCells is provided --

test("MapContent renders DiscoveryGrid when gridCells and onCellSelect are truthy", () => {
  assert.match(mapContentSource, /\{gridCells\s*&&\s*onCellSelect\s*&&\s*\(/)
  assert.match(mapContentSource, /<DiscoveryGrid/)
})

test("MapContent wraps DiscoveryGrid in discovery-grid Pane at zIndex 450", () => {
  assert.match(mapContentSource, /<Pane\s+name="discovery-grid"\s+style=\{\{\s*zIndex:\s*450\s*\}\}/)
})

// -- Step 5: DiscoveryGrid computes virtual cells at zoom >= 8 --

test("DiscoveryGrid returns empty virtual cells below zoom 8", () => {
  assert.match(discoveryGridSource, /if\s*\(!mapBounds\s*\|\|\s*zoom\s*<\s*8\)\s*return\s*\[\]/)
})

test("DiscoveryGrid calls computeVirtualGrid with mapBounds and cellSizeKm at zoom >= 8", () => {
  assert.match(discoveryGridSource, /computeVirtualGrid\(mapBounds,\s*cellSizeKm\)/)
})

test("virtualCells useMemo depends on mapBounds, cellSizeKm, and zoom", () => {
  assert.match(discoveryGridSource, /\[mapBounds,\s*cellSizeKm,\s*zoom\]/)
})

// -- Step 6: Virtual cells use faint gray style --

test("VIRTUAL_CELL_STYLE color is faint gray (#d1d5db)", () => {
  assert.match(cellColorsSource, /VIRTUAL_CELL_STYLE[\s\S]*color:\s*["']#d1d5db["']/)
})

test("VIRTUAL_CELL_STYLE fillColor is faint gray (#d1d5db)", () => {
  assert.match(cellColorsSource, /VIRTUAL_CELL_STYLE[\s\S]*fillColor:\s*["']#d1d5db["']/)
})

test("VIRTUAL_CELL_STYLE fillOpacity is very low (0.05)", () => {
  assert.match(cellColorsSource, /VIRTUAL_CELL_STYLE[\s\S]*fillOpacity:\s*0\.05/)
})

test("VIRTUAL_CELL_STYLE weight is thin (0.5)", () => {
  assert.match(cellColorsSource, /VIRTUAL_CELL_STYLE[\s\S]*weight:\s*0\.5/)
})

test("VirtualGridCell renders Rectangle with VIRTUAL_CELL_STYLE pathOptions", () => {
  const virtualCellFn = discoveryGridSource
    .split("function VirtualGridCell")[1]
    .split("function DiscoveryGridCell")[0]
  assert.match(virtualCellFn, /pathOptions=\{VIRTUAL_CELL_STYLE\}/)
})

// -- Step 7: Virtual grid covers entire visible map at default zoom --

test("computeVirtualGrid produces cells for Niagara area at zoom-8 viewport", () => {
  // Niagara center is [43.08, -79.08], zoom 8 gives roughly this viewport
  const bounds = { swLat: 42.58, swLng: -79.78, neLat: 43.58, neLng: -78.38 }
  const cellSizeKm = 20
  const cells = mod.computeVirtualGrid(bounds, cellSizeKm)
  assert.ok(cells.length > 0, `expected cells but got ${cells.length}`)
  assert.ok(cells.length <= 500, `cell count ${cells.length} exceeds maxCells`)
})

test("virtual grid extends to or past all edges of the viewport at default zoom", () => {
  const bounds = { swLat: 42.58, swLng: -79.78, neLat: 43.58, neLng: -78.38 }
  const cells = mod.computeVirtualGrid(bounds, 20)

  const gridSouth = Math.min(...cells.map((c) => c.swLat))
  const gridWest = Math.min(...cells.map((c) => c.swLng))
  const gridNorth = Math.max(...cells.map((c) => c.neLat))
  const gridEast = Math.max(...cells.map((c) => c.neLng))

  assert.ok(gridSouth <= bounds.swLat, `grid south ${gridSouth} should be <= viewport south ${bounds.swLat}`)
  assert.ok(gridWest <= bounds.swLng, `grid west ${gridWest} should be <= viewport west ${bounds.swLng}`)
  assert.ok(gridNorth >= bounds.neLat, `grid north ${gridNorth} should be >= viewport north ${bounds.neLat}`)
  assert.ok(gridEast >= bounds.neLng, `grid east ${gridEast} should be >= viewport east ${bounds.neLng}`)
})

test("virtual grid cells tile contiguously with no gaps at default zoom", () => {
  const bounds = { swLat: 42.58, swLng: -79.78, neLat: 43.58, neLng: -78.38 }
  const cells = mod.computeVirtualGrid(bounds, 20)
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

// -- Step 8: With empty cells array, all virtual cells pass filter --

test("filteredVirtualCells passes all virtual cells when cells array is empty", () => {
  // When cells is [], activatedSet is empty, persistedBoundsKeySet is empty,
  // and cells.some() returns false — so all virtual cells pass the filter
  assert.match(discoveryGridSource, /filteredVirtualCells[\s\S]*virtualCells\.filter/)
  assert.match(discoveryGridSource, /!cells\.some/)
})

test("DiscoveryGrid renders VirtualGridCell for each filtered virtual cell", () => {
  assert.match(discoveryGridSource, /filteredVirtualCells\.map\(\(vc\)/)
  assert.match(discoveryGridSource, /<VirtualGridCell/)
})

// -- Step 9: DiscoveryGrid eagerly initializes map bounds (no blank frame) --

test("DiscoveryGrid initializes mapBounds eagerly from map state", () => {
  assert.match(discoveryGridSource, /useState.*\(\(\)\s*=>\s*getMapBounds\(map\)\)/)
})

test("DiscoveryGrid initializes zoom eagerly from map state", () => {
  assert.match(discoveryGridSource, /useState\(\(\)\s*=>\s*map\.getZoom\(\)\)/)
})

// -- Step 10: MapContent default cellSizeKm is 20 when not provided --

test("MapContent defaults cellSizeKm to 20 via nullish coalescing", () => {
  assert.match(mapContentSource, /cellSizeKm=\{cellSizeKm\s*\?\?\s*20\}/)
})

test("computeVirtualGrid produces cells with default 20km cell size at zoom-8 viewport", () => {
  const bounds = { swLat: 42.58, swLng: -79.78, neLat: 43.58, neLng: -78.38 }
  const cells = mod.computeVirtualGrid(bounds, 20)
  assert.ok(cells.length > 0, "should produce cells with 20km default size")

  // Verify cell dimensions are roughly 20km
  const latStepExpected = 20 / 111
  const firstCell = cells[0]
  const cellLatSpan = firstCell.neLat - firstCell.swLat
  const diff = Math.abs(cellLatSpan - latStepExpected)
  assert.ok(diff < 0.001, `cell lat span ${cellLatSpan} should be ~${latStepExpected}`)
})
