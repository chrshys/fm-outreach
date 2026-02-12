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

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-pcpriority-"))
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
// 1. Render order: persisted cells render AFTER virtual cells
//    (later in SVG = visually on top)
// ============================================================

test("virtual cells are rendered before persisted cells in JSX", () => {
  const virtualIdx = discoveryGridSource.indexOf("filteredVirtualCells.map")
  const persistedIdx = discoveryGridSource.indexOf("cells.map((cell)")
  assert.ok(virtualIdx > 0, "virtual cells block found")
  assert.ok(persistedIdx > 0, "persisted cells block found")
  assert.ok(
    virtualIdx < persistedIdx,
    "virtual cells render first so persisted cells (later) appear on top in SVG",
  )
})

// ============================================================
// 2. Spatial overlap filtering: virtual cells excluded when
//    persisted cells overlap them (even without matching boundsKey)
// ============================================================

test("filteredVirtualCells includes spatial overlap check against persisted cells", () => {
  assert.match(
    discoveryGridSource,
    /cells\.some\(/,
    "filtering references cells.some() for spatial check",
  )
})

test("spatial overlap check compares latitude bounds", () => {
  assert.match(
    discoveryGridSource,
    /c\.swLat\s*<\s*vc\.neLat/,
    "checks persisted swLat < virtual neLat",
  )
  assert.match(
    discoveryGridSource,
    /c\.neLat\s*>\s*vc\.swLat/,
    "checks persisted neLat > virtual swLat",
  )
})

test("spatial overlap check compares longitude bounds", () => {
  assert.match(
    discoveryGridSource,
    /c\.swLng\s*<\s*vc\.neLng/,
    "checks persisted swLng < virtual neLng",
  )
  assert.match(
    discoveryGridSource,
    /c\.neLng\s*>\s*vc\.swLng/,
    "checks persisted neLng > virtual swLng",
  )
})

test("spatial overlap uses all four bound comparisons for AABB intersection", () => {
  // The AABB intersection test requires all 4 comparisons connected by &&
  assert.match(
    discoveryGridSource,
    /c\.swLat\s*<\s*vc\.neLat\s*&&\s*c\.neLat\s*>\s*vc\.swLat\s*&&\s*c\.swLng\s*<\s*vc\.neLng\s*&&\s*c\.neLng\s*>\s*vc\.swLng/,
    "AABB overlap uses all four bound checks with &&",
  )
})

// ============================================================
// 3. Key-based filtering still works alongside spatial check
// ============================================================

test("key-based filtering runs before spatial overlap check", () => {
  const keyCheckIdx = discoveryGridSource.indexOf("activatedSet.has(vc.key)")
  const spatialCheckIdx = discoveryGridSource.indexOf("cells.some(")
  assert.ok(keyCheckIdx > 0, "key check found")
  assert.ok(spatialCheckIdx > 0, "spatial check found")
  assert.ok(
    keyCheckIdx < spatialCheckIdx,
    "key-based filter is evaluated before spatial overlap (short-circuit)",
  )
})

test("filteredVirtualCells depends on cells in its useMemo dependency array", () => {
  // The spatial overlap references cells, so cells must be in the dependency array
  const filterBlock = discoveryGridSource.match(
    /const filteredVirtualCells = useMemo\([\s\S]*?\[.*?\]/,
  )
  assert.ok(filterBlock, "filteredVirtualCells useMemo found")
  assert.match(filterBlock[0], /\bcells\b/, "cells is in the dependency array")
})

// ============================================================
// 4. Virtual grid keys don't match subdivided child cells
//    (demonstrates why spatial overlap is necessary)
// ============================================================

test("subdivided child cells have different keys than parent virtual grid cell", () => {
  // A depth-0 cell at (43.0, -79.5) with size ~0.18 deg
  // gets subdivided into 4 children with different swLat/swLng
  const parentSwLat = 43.0
  const parentSwLng = -79.5
  const parentNeLat = 43.18
  const parentNeLng = -79.28
  const parentKey = mod.cellKey(parentSwLat, parentSwLng)

  const midLat = (parentSwLat + parentNeLat) / 2
  const midLng = (parentSwLng + parentNeLng) / 2

  const childKeys = [
    mod.cellKey(parentSwLat, parentSwLng),
    mod.cellKey(parentSwLat, midLng),
    mod.cellKey(midLat, parentSwLng),
    mod.cellKey(midLat, midLng),
  ]

  // Only the SW child has the same key as the parent
  // The other three children have different keys
  const nonMatchingChildren = childKeys.filter((k) => k !== parentKey)
  assert.ok(
    nonMatchingChildren.length >= 2,
    "most subdivided children have different keys than the parent virtual cell",
  )
})

test("virtual cell at parent position overlaps all four child cells spatially", () => {
  const parentSwLat = 43.0
  const parentSwLng = -79.5
  const parentNeLat = 43.18
  const parentNeLng = -79.28

  const midLat = (parentSwLat + parentNeLat) / 2
  const midLng = (parentSwLng + parentNeLng) / 2

  const children = [
    { swLat: parentSwLat, swLng: parentSwLng, neLat: midLat, neLng: midLng },
    { swLat: parentSwLat, swLng: midLng, neLat: midLat, neLng: parentNeLng },
    { swLat: midLat, swLng: parentSwLng, neLat: parentNeLat, neLng: midLng },
    { swLat: midLat, swLng: midLng, neLat: parentNeLat, neLng: parentNeLng },
  ]

  // The virtual cell covers the parent's full bounds
  const vc = { swLat: parentSwLat, swLng: parentSwLng, neLat: parentNeLat, neLng: parentNeLng }

  for (const child of children) {
    const overlaps =
      child.swLat < vc.neLat &&
      child.neLat > vc.swLat &&
      child.swLng < vc.neLng &&
      child.neLng > vc.swLng
    assert.ok(overlaps, `child at (${child.swLat}, ${child.swLng}) overlaps virtual cell`)
  }
})

// ============================================================
// 5. Non-overlapping cells don't get filtered
// ============================================================

test("virtual cells far from persisted cells are not filtered by spatial check", () => {
  // A persisted cell
  const persisted = { swLat: 43.0, swLng: -79.5, neLat: 43.18, neLng: -79.28 }
  // A virtual cell far away
  const vc = { swLat: 44.0, swLng: -78.0, neLat: 44.18, neLng: -77.78 }

  const overlaps =
    persisted.swLat < vc.neLat &&
    persisted.neLat > vc.swLat &&
    persisted.swLng < vc.neLng &&
    persisted.neLng > vc.swLng
  assert.ok(!overlaps, "non-overlapping cells should not be filtered")
})
