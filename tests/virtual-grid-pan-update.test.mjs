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

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-vg-pan-"))
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
// 1. DiscoveryGrid re-computes virtual cells on moveend (pan)
// ============================================================

test("DiscoveryGrid uses useMapEvents to listen for moveend", () => {
  assert.match(discoveryGridSource, /useMapEvents\(\{/)
  assert.match(discoveryGridSource, /moveend/)
})

test("moveend handler calls updateBounds to refresh map bounds state", () => {
  assert.match(discoveryGridSource, /moveend:\s*\(\)\s*=>\s*updateBounds\(\)/)
})

test("updateBounds reads fresh bounds from map via getMapBounds", () => {
  assert.match(discoveryGridSource, /setMapBounds\(getMapBounds\(map\)\)/)
})

test("virtualCells useMemo depends on mapBounds so it recomputes after pan", () => {
  // Extract the useMemo for virtualCells and verify mapBounds is in its dependency array
  assert.match(
    discoveryGridSource,
    /const virtualCells\s*=\s*useMemo\(\(\)\s*=>\s*\{[\s\S]*?\},\s*\[mapBounds/,
  )
})

// ============================================================
// 2. Pan east: new cells appear covering the newly visible area
// ============================================================

test("panning east produces new cells that cover the new eastern area", () => {
  const cellSizeKm = 20
  // Original viewport
  const original = { swLat: 43.0, swLng: -79.5, neLat: 43.5, neLng: -79.0 }
  // Panned east by ~0.2 degrees
  const panned = { swLat: 43.0, swLng: -79.3, neLat: 43.5, neLng: -78.8 }

  const originalCells = mod.computeVirtualGrid(original, cellSizeKm)
  const pannedCells = mod.computeVirtualGrid(panned, cellSizeKm)

  assert.ok(originalCells.length > 0)
  assert.ok(pannedCells.length > 0)

  const originalMaxLng = Math.max(...originalCells.map((c) => c.neLng))
  const pannedMaxLng = Math.max(...pannedCells.map((c) => c.neLng))

  // After panning east, the grid should extend further east
  assert.ok(
    pannedMaxLng >= panned.neLng,
    `panned grid should cover new east edge: ${pannedMaxLng} >= ${panned.neLng}`,
  )
  assert.ok(
    pannedMaxLng > originalMaxLng,
    `panned grid eastern edge ${pannedMaxLng} should exceed original ${originalMaxLng}`,
  )
})

// ============================================================
// 3. Pan west: new cells appear covering the newly visible area
// ============================================================

test("panning west produces new cells that cover the new western area", () => {
  const cellSizeKm = 20
  const original = { swLat: 43.0, swLng: -79.5, neLat: 43.5, neLng: -79.0 }
  const panned = { swLat: 43.0, swLng: -79.7, neLat: 43.5, neLng: -79.2 }

  const originalCells = mod.computeVirtualGrid(original, cellSizeKm)
  const pannedCells = mod.computeVirtualGrid(panned, cellSizeKm)

  assert.ok(originalCells.length > 0)
  assert.ok(pannedCells.length > 0)

  const originalMinLng = Math.min(...originalCells.map((c) => c.swLng))
  const pannedMinLng = Math.min(...pannedCells.map((c) => c.swLng))

  assert.ok(
    pannedMinLng <= panned.swLng,
    `panned grid should cover new west edge: ${pannedMinLng} <= ${panned.swLng}`,
  )
  assert.ok(
    pannedMinLng < originalMinLng,
    `panned grid western edge ${pannedMinLng} should be further west than original ${originalMinLng}`,
  )
})

// ============================================================
// 4. Pan north: new cells appear covering the newly visible area
// ============================================================

test("panning north produces new cells that cover the new northern area", () => {
  const cellSizeKm = 20
  const original = { swLat: 43.0, swLng: -79.5, neLat: 43.5, neLng: -79.0 }
  const panned = { swLat: 43.2, swLng: -79.5, neLat: 43.7, neLng: -79.0 }

  const originalCells = mod.computeVirtualGrid(original, cellSizeKm)
  const pannedCells = mod.computeVirtualGrid(panned, cellSizeKm)

  assert.ok(originalCells.length > 0)
  assert.ok(pannedCells.length > 0)

  const originalMaxLat = Math.max(...originalCells.map((c) => c.neLat))
  const pannedMaxLat = Math.max(...pannedCells.map((c) => c.neLat))

  assert.ok(
    pannedMaxLat >= panned.neLat,
    `panned grid should cover new north edge: ${pannedMaxLat} >= ${panned.neLat}`,
  )
  assert.ok(
    pannedMaxLat > originalMaxLat,
    `panned grid northern edge ${pannedMaxLat} should exceed original ${originalMaxLat}`,
  )
})

// ============================================================
// 5. Pan south: new cells appear covering the newly visible area
// ============================================================

test("panning south produces new cells that cover the new southern area", () => {
  const cellSizeKm = 20
  const original = { swLat: 43.0, swLng: -79.5, neLat: 43.5, neLng: -79.0 }
  const panned = { swLat: 42.8, swLng: -79.5, neLat: 43.3, neLng: -79.0 }

  const originalCells = mod.computeVirtualGrid(original, cellSizeKm)
  const pannedCells = mod.computeVirtualGrid(panned, cellSizeKm)

  assert.ok(originalCells.length > 0)
  assert.ok(pannedCells.length > 0)

  const originalMinLat = Math.min(...originalCells.map((c) => c.swLat))
  const pannedMinLat = Math.min(...pannedCells.map((c) => c.swLat))

  assert.ok(
    pannedMinLat <= panned.swLat,
    `panned grid should cover new south edge: ${pannedMinLat} <= ${panned.swLat}`,
  )
  assert.ok(
    pannedMinLat < originalMinLat,
    `panned grid southern edge ${pannedMinLat} should be further south than original ${originalMinLat}`,
  )
})

// ============================================================
// 6. Diagonal pan: grid covers all four edges of new viewport
// ============================================================

test("panning diagonally (NE) produces grid covering entire new viewport", () => {
  const cellSizeKm = 20
  const panned = { swLat: 43.15, swLng: -79.35, neLat: 43.65, neLng: -78.85 }

  const pannedCells = mod.computeVirtualGrid(panned, cellSizeKm)
  assert.ok(pannedCells.length > 0)

  const minSwLat = Math.min(...pannedCells.map((c) => c.swLat))
  const minSwLng = Math.min(...pannedCells.map((c) => c.swLng))
  const maxNeLat = Math.max(...pannedCells.map((c) => c.neLat))
  const maxNeLng = Math.max(...pannedCells.map((c) => c.neLng))

  assert.ok(minSwLat <= panned.swLat, "covers south edge after diagonal pan")
  assert.ok(minSwLng <= panned.swLng, "covers west edge after diagonal pan")
  assert.ok(maxNeLat >= panned.neLat, "covers north edge after diagonal pan")
  assert.ok(maxNeLng >= panned.neLng, "covers east edge after diagonal pan")
})

// ============================================================
// 7. Grid has no gaps after pan — contiguity preserved
// ============================================================

test("grid remains contiguous (no gaps) after panning to a new viewport", () => {
  const cellSizeKm = 20
  // Simulates the bounds after a significant pan
  const panned = { swLat: 43.3, swLng: -79.9, neLat: 43.8, neLng: -79.4 }
  const cells = mod.computeVirtualGrid(panned, cellSizeKm)
  assert.ok(cells.length > 0)

  // Check horizontal contiguity
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
      assert.ok(gap < 1e-10, `horizontal gap of ${gap} after pan`)
    }
  }

  // Check vertical contiguity
  const rowKeys = [...rows.keys()].sort((a, b) => Number(a) - Number(b))
  for (let i = 1; i < rowKeys.length; i++) {
    const prevRow = rows.get(rowKeys[i - 1])
    const currRow = rows.get(rowKeys[i])
    const gap = Math.abs(currRow[0].swLat - prevRow[0].neLat)
    assert.ok(gap < 1e-10, `vertical gap of ${gap} after pan`)
  }
})

// ============================================================
// 8. Shared cells between overlapping viewports have stable keys
//    (horizontal pan where midLat stays constant)
// ============================================================

test("horizontal pan: shared cells between viewports have identical keys and coordinates", () => {
  const cellSizeKm = 20
  // Same latitude range (same midLat) — simulates a pure horizontal pan
  const before = { swLat: 43.0, swLng: -79.5, neLat: 43.5, neLng: -79.0 }
  const after = { swLat: 43.0, swLng: -79.3, neLat: 43.5, neLng: -78.8 }

  const beforeCells = mod.computeVirtualGrid(before, cellSizeKm)
  const afterCells = mod.computeVirtualGrid(after, cellSizeKm)

  assert.ok(beforeCells.length > 0)
  assert.ok(afterCells.length > 0)

  const beforeMap = new Map(beforeCells.map((c) => [c.key, c]))
  const afterMap = new Map(afterCells.map((c) => [c.key, c]))

  const commonKeys = [...beforeMap.keys()].filter((k) => afterMap.has(k))
  assert.ok(
    commonKeys.length > 0,
    "overlapping horizontal viewports should share cells",
  )

  for (const key of commonKeys) {
    const b = beforeMap.get(key)
    const a = afterMap.get(key)
    assert.equal(b.swLat, a.swLat, `swLat stable for key ${key}`)
    assert.equal(b.swLng, a.swLng, `swLng stable for key ${key}`)
    assert.equal(b.neLat, a.neLat, `neLat stable for key ${key}`)
    assert.equal(b.neLng, a.neLng, `neLng stable for key ${key}`)
  }
})

// ============================================================
// 9. Successive pans produce cells — no stale empty state
// ============================================================

test("successive pans each produce non-empty cell arrays", () => {
  const cellSizeKm = 20
  const viewports = [
    { swLat: 43.0, swLng: -79.5, neLat: 43.5, neLng: -79.0 },
    { swLat: 43.1, swLng: -79.4, neLat: 43.6, neLng: -78.9 },
    { swLat: 43.2, swLng: -79.3, neLat: 43.7, neLng: -78.8 },
    { swLat: 43.3, swLng: -79.2, neLat: 43.8, neLng: -78.7 },
  ]

  for (let i = 0; i < viewports.length; i++) {
    const cells = mod.computeVirtualGrid(viewports[i], cellSizeKm)
    assert.ok(
      cells.length > 0,
      `pan step ${i} should produce cells, got ${cells.length}`,
    )
    // Each viewport should be fully covered
    const minSwLat = Math.min(...cells.map((c) => c.swLat))
    const maxNeLat = Math.max(...cells.map((c) => c.neLat))
    assert.ok(minSwLat <= viewports[i].swLat, `step ${i}: covers south`)
    assert.ok(maxNeLat >= viewports[i].neLat, `step ${i}: covers north`)
  }
})

// ============================================================
// 10. Old cells outside new viewport are excluded after pan
// ============================================================

test("cells from old viewport that are outside new viewport are not produced", () => {
  const cellSizeKm = 20
  // Original viewport
  const original = { swLat: 43.0, swLng: -79.5, neLat: 43.5, neLng: -79.0 }
  // Pan far east so there is no overlap
  const panned = { swLat: 43.0, swLng: -78.0, neLat: 43.5, neLng: -77.5 }

  const originalCells = mod.computeVirtualGrid(original, cellSizeKm)
  const pannedCells = mod.computeVirtualGrid(panned, cellSizeKm)

  assert.ok(originalCells.length > 0)
  assert.ok(pannedCells.length > 0)

  const originalKeys = new Set(originalCells.map((c) => c.key))
  const pannedKeys = new Set(pannedCells.map((c) => c.key))

  // With no overlap, there should be no shared keys
  const shared = [...originalKeys].filter((k) => pannedKeys.has(k))
  assert.equal(
    shared.length,
    0,
    "non-overlapping viewports should share no cells",
  )
})

// ============================================================
// 11. Vertical pan: shared cells stay aligned (stable lngStep)
// ============================================================

test("vertical pan within same latitude band: shared cells have identical keys and coordinates", () => {
  const cellSizeKm = 20
  // Small vertical pan — both viewports stay in the same 5° band (midLat ≈ 43°, snaps to 45°)
  const before = { swLat: 43.0, swLng: -79.5, neLat: 43.5, neLng: -79.0 }
  const after = { swLat: 43.2, swLng: -79.5, neLat: 43.7, neLng: -79.0 }

  const beforeCells = mod.computeVirtualGrid(before, cellSizeKm)
  const afterCells = mod.computeVirtualGrid(after, cellSizeKm)

  assert.ok(beforeCells.length > 0)
  assert.ok(afterCells.length > 0)

  const beforeMap = new Map(beforeCells.map((c) => [c.key, c]))
  const afterMap = new Map(afterCells.map((c) => [c.key, c]))

  const commonKeys = [...beforeMap.keys()].filter((k) => afterMap.has(k))
  assert.ok(
    commonKeys.length > 0,
    "overlapping vertical viewports within same lat band should share cells",
  )

  for (const key of commonKeys) {
    const b = beforeMap.get(key)
    const a = afterMap.get(key)
    assert.equal(b.swLat, a.swLat, `swLat stable for key ${key}`)
    assert.equal(b.swLng, a.swLng, `swLng stable for key ${key}`)
    assert.equal(b.neLat, a.neLat, `neLat stable for key ${key}`)
    assert.equal(b.neLng, a.neLng, `neLng stable for key ${key}`)
  }
})

// ============================================================
// 12. Vertical pan: cell widths stay consistent (no jitter)
// ============================================================

test("vertical pan: cell widths are identical before and after pan within same lat band", () => {
  const cellSizeKm = 20
  const before = { swLat: 43.0, swLng: -79.5, neLat: 43.5, neLng: -79.0 }
  const after = { swLat: 43.3, swLng: -79.5, neLat: 43.8, neLng: -79.0 }

  const beforeCells = mod.computeVirtualGrid(before, cellSizeKm)
  const afterCells = mod.computeVirtualGrid(after, cellSizeKm)

  assert.ok(beforeCells.length > 0)
  assert.ok(afterCells.length > 0)

  const beforeWidth = beforeCells[0].neLng - beforeCells[0].swLng
  const afterWidth = afterCells[0].neLng - afterCells[0].swLng

  assert.ok(
    Math.abs(beforeWidth - afterWidth) < 1e-10,
    `cell widths should match: before=${beforeWidth}, after=${afterWidth}`,
  )
})

// ============================================================
// 13. Diagonal pan: cells stay aligned when midLat doesn't cross
//     a latitude band boundary
// ============================================================

test("diagonal pan within same lat band: shared cells have stable coordinates", () => {
  const cellSizeKm = 20
  // Diagonal pan (NE) but stays in same 5° lat band
  const before = { swLat: 43.0, swLng: -79.5, neLat: 43.5, neLng: -79.0 }
  const after = { swLat: 43.15, swLng: -79.35, neLat: 43.65, neLng: -78.85 }

  const beforeCells = mod.computeVirtualGrid(before, cellSizeKm)
  const afterCells = mod.computeVirtualGrid(after, cellSizeKm)

  assert.ok(beforeCells.length > 0)
  assert.ok(afterCells.length > 0)

  const beforeMap = new Map(beforeCells.map((c) => [c.key, c]))
  const afterMap = new Map(afterCells.map((c) => [c.key, c]))

  const commonKeys = [...beforeMap.keys()].filter((k) => afterMap.has(k))
  assert.ok(commonKeys.length > 0, "diagonal pan should share some cells")

  for (const key of commonKeys) {
    const b = beforeMap.get(key)
    const a = afterMap.get(key)
    assert.equal(b.swLng, a.swLng, `swLng stable for key ${key}`)
    assert.equal(b.neLng, a.neLng, `neLng stable for key ${key}`)
  }
})
