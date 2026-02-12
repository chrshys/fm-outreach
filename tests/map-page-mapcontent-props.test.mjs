import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/map/page.tsx", "utf8")

// ============================================================
// MapContent prop wiring — simplified discovery props
// ============================================================

test("passes cellSizeKm directly without viewMode guard", () => {
  assert.match(source, /cellSizeKm=\{cellSizeKm\}/)
  assert.doesNotMatch(
    source,
    /cellSizeKm=\{viewMode\s*===\s*"discovery"/,
    "cellSizeKm should not be wrapped in a viewMode conditional",
  )
})

test("passes gridId as globalGridId ?? undefined", () => {
  assert.match(source, /gridId=\{globalGridId\s*\?\?\s*undefined\}/)
})

test("passes activatedBoundsKeys directly without viewMode guard", () => {
  assert.match(source, /activatedBoundsKeys=\{activatedBoundsKeys\}/)
  assert.doesNotMatch(
    source,
    /activatedBoundsKeys=\{viewMode\s*===\s*"discovery"/,
    "activatedBoundsKeys should not be wrapped in a viewMode conditional",
  )
})

test("passes onSelectVirtualCell gated by viewMode discovery", () => {
  assert.match(
    source,
    /onSelectVirtualCell=\{viewMode\s*===\s*"discovery"\s*\?\s*handleSelectVirtual\s*:\s*undefined\}/,
  )
})

test("passes gridCells using cells variable gated by discovery mode", () => {
  assert.match(
    source,
    /gridCells=\{viewMode\s*===\s*"discovery"\s*\?\s*cells\s*\?\?\s*undefined\s*:\s*undefined\}/,
  )
})

test("uses cellSizeKm variable (not selectedGridCellSizeKm)", () => {
  assert.doesNotMatch(
    source,
    /selectedGridCellSizeKm/,
    "selectedGridCellSizeKm should be renamed to cellSizeKm",
  )
})
