import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")

// --- Map page imports DiscoveryPanel ---

test("map page imports DiscoveryPanel", () => {
  assert.match(pageSource, /import\s+\{\s*DiscoveryPanel\s*\}\s+from\s+["']@\/components\/map\/discovery-panel["']/)
})

// --- Conditional rendering ---

test("renders MapFilters when viewMode is clusters", () => {
  assert.match(pageSource, /viewMode\s*===\s*"clusters"\s*\?/)
  assert.match(pageSource, /<MapFilters/)
})

test("renders DiscoveryPanel when viewMode is discovery", () => {
  assert.match(pageSource, /<DiscoveryPanel/)
})

test("passes mapBounds to DiscoveryPanel", () => {
  assert.match(pageSource, /mapBounds=\{mapBounds\}/)
})

// --- listGrids returns queries field ---

test("listGrids query returns queries field for grids", () => {
  const gridCellsSource = fs.readFileSync("convex/discovery/gridCells.ts", "utf8")
  assert.match(gridCellsSource, /queries:\s*grid\.queries/)
})
