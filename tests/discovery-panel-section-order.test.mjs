import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")

// --- Panel Section Ordering ---
// The panel must render sections in this order:
// Settings (region/province) → Progress → Selected Cell → Search Queries → Color Legend

test("panel contains all five section comments", () => {
  assert.match(source, /\{\/\* Settings \*\/\}/)
  assert.match(source, /\{\/\* Progress Stats \*\/\}/)
  assert.match(source, /\{\/\* Selected Cell \*\/\}/)
  assert.match(source, /\{\/\* Search Queries \*\/\}/)
  assert.match(source, /\{\/\* Color Legend \*\/\}/)
})

test("sections appear in correct order: Settings → Progress → Selected Cell → Search Queries → Color Legend", () => {
  const settingsIdx = source.indexOf("{/* Settings */}")
  const progressIdx = source.indexOf("{/* Progress Stats */}")
  const selectedCellIdx = source.indexOf("{/* Selected Cell */}")
  const searchQueriesIdx = source.indexOf("{/* Search Queries */}")
  const colorLegendIdx = source.indexOf("{/* Color Legend */}")

  assert.ok(settingsIdx > -1, "Settings section exists")
  assert.ok(progressIdx > -1, "Progress section exists")
  assert.ok(selectedCellIdx > -1, "Selected Cell section exists")
  assert.ok(searchQueriesIdx > -1, "Search Queries section exists")
  assert.ok(colorLegendIdx > -1, "Color Legend section exists")

  assert.ok(settingsIdx < progressIdx, "Settings appears before Progress")
  assert.ok(progressIdx < selectedCellIdx, "Progress appears before Selected Cell")
  assert.ok(selectedCellIdx < searchQueriesIdx, "Selected Cell appears before Search Queries")
  assert.ok(searchQueriesIdx < colorLegendIdx, "Search Queries appears before Color Legend")
})

// --- Settings section renders region and province ---

test("Settings section contains Region and Province fields", () => {
  const settingsIdx = source.indexOf("{/* Settings */}")
  const progressIdx = source.indexOf("{/* Progress Stats */}")
  const settingsBlock = source.slice(settingsIdx, progressIdx)

  assert.match(settingsBlock, /Region/, "Settings block includes Region")
  assert.match(settingsBlock, /Province/, "Settings block includes Province")
})

test("Settings section has 'Settings' label", () => {
  const settingsIdx = source.indexOf("{/* Settings */}")
  const progressIdx = source.indexOf("{/* Progress Stats */}")
  const settingsBlock = source.slice(settingsIdx, progressIdx)

  assert.match(settingsBlock, /Settings/, "Settings section has label")
})

// --- Progress section renders stats ---

test("Progress section has 'Progress' label", () => {
  const progressIdx = source.indexOf("{/* Progress Stats */}")
  const selectedCellIdx = source.indexOf("{/* Selected Cell */}")
  const progressBlock = source.slice(progressIdx, selectedCellIdx)

  assert.match(progressBlock, /Progress/, "Progress section has label")
})

// --- Selected Cell section ---

test("Selected Cell section has 'Selected Cell' label", () => {
  const selectedCellIdx = source.indexOf("{/* Selected Cell */}")
  const searchQueriesIdx = source.indexOf("{/* Search Queries */}")
  const selectedCellBlock = source.slice(selectedCellIdx, searchQueriesIdx)

  assert.match(selectedCellBlock, /Selected Cell/, "Selected Cell section has label")
})

// --- Search Queries section ---

test("Search Queries section has 'Search Queries' label", () => {
  const searchQueriesIdx = source.indexOf("{/* Search Queries */}")
  const colorLegendIdx = source.indexOf("{/* Color Legend */}")
  const searchQueriesBlock = source.slice(searchQueriesIdx, colorLegendIdx)

  assert.match(searchQueriesBlock, /Search Queries/, "Search Queries section has label")
})

// --- Color Legend section ---

test("Color Legend section has 'Cell Status' label", () => {
  const colorLegendIdx = source.indexOf("{/* Color Legend */}")
  const colorLegendBlock = source.slice(colorLegendIdx)

  assert.match(colorLegendBlock, /Cell Status/, "Color Legend section has Cell Status label")
})
