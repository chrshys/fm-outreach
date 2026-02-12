import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/map-content.tsx", "utf8")

test("DiscoveryGrid conditional only requires gridCells and onCellSelect", () => {
  // The conditional should be `{gridCells && onCellSelect && (` — not requiring cellSizeKm, gridId, etc.
  assert.match(source, /\{gridCells\s*&&\s*onCellSelect\s*&&\s*\(/)
  // Should NOT have cellSizeKm, gridId, activatedBoundsKeys, or onSelectVirtual in the conditional guard
  assert.doesNotMatch(source, /gridCells\s*&&\s*onCellSelect\s*&&\s*cellSizeKm/)
  assert.doesNotMatch(source, /gridCells\s*&&\s*onCellSelect\s*&&\s*gridId/)
})

test("cellSizeKm defaults to 20 via nullish coalescing", () => {
  assert.match(source, /cellSizeKm=\{cellSizeKm\s*\?\?\s*20\}/)
})

test("gridId defaults to empty string via nullish coalescing", () => {
  assert.match(source, /gridId=\{gridId\s*\?\?\s*""\}/)
})

test("activatedBoundsKeys defaults to empty array via nullish coalescing", () => {
  assert.match(source, /activatedBoundsKeys=\{activatedBoundsKeys\s*\?\?\s*\[\]\}/)
})

test("onSelectVirtualCell defaults to no-op function via nullish coalescing", () => {
  assert.match(source, /onSelectVirtualCell=\{onSelectVirtualCell\s*\?\?\s*\(\(\)\s*=>\s*\{\}\)\}/)
})
