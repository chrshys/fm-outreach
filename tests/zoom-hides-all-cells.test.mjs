import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

// ============================================================
// Persisted cells hidden below zoom 8 (same as virtual cells)
// ============================================================

test("DiscoveryGrid tracks zoom level in state", () => {
  assert.match(source, /const\s+\[zoom,\s*setZoom\]\s*=\s*useState\(\(\)\s*=>\s*map\.getZoom\(\)\)/)
})

test("updateBounds updates zoom state alongside map bounds", () => {
  assert.match(source, /setZoom\(map\.getZoom\(\)\)/)
})

test("persisted cells are gated by zoom >= 8", () => {
  assert.match(source, /zoom\s*>=\s*8\s*&&\s*cells\.map/)
})

test("virtual cells use zoom state (not map.getZoom()) for the < 8 check", () => {
  // The virtualCells memo should reference the reactive zoom state variable
  const virtualCellsMemo = source.split("const virtualCells")[1].split("const activatedSet")[0]
  assert.match(virtualCellsMemo, /zoom\s*<\s*8/)
  assert.doesNotMatch(virtualCellsMemo, /map\.getZoom\(\)/)
})

test("virtualCells useMemo depends on zoom (not map)", () => {
  // Extract the dependency array for virtualCells useMemo
  const virtualCellsMemo = source.split("const virtualCells")[1].split("const activatedSet")[0]
  assert.match(virtualCellsMemo, /\[mapBounds,\s*cellSizeKm,\s*zoom\]/)
})

test("both virtual and persisted cells are hidden below zoom 8", () => {
  // Virtual cells: `if (!mapBounds || zoom < 8) return []`
  assert.match(source, /if\s*\(!mapBounds\s*\|\|\s*zoom\s*<\s*8\)\s*return\s*\[\]/)
  // Persisted cells: `{zoom >= 8 && cells.map(...)`
  assert.match(source, /zoom\s*>=\s*8\s*&&\s*cells\.map/)
})
