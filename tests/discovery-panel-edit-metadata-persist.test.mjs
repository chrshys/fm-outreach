import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const panelSource = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")
const gridCellsSource = fs.readFileSync("convex/discovery/gridCells.ts", "utf8")
const discoverCellSource = fs.readFileSync("convex/discovery/discoverCell.ts", "utf8")

// --- Persistence: updateGridMetadata writes region/province to DB ---

test("updateGridMetadata builds patch from optional region arg", () => {
  // Verifies the mutation conditionally adds region to the patch object
  assert.match(gridCellsSource, /if\s*\(args\.region\s*!==\s*undefined\)\s*patch\.region\s*=\s*args\.region/)
})

test("updateGridMetadata builds patch from optional province arg", () => {
  // Verifies the mutation conditionally adds province to the patch object
  assert.match(gridCellsSource, /if\s*\(args\.province\s*!==\s*undefined\)\s*patch\.province\s*=\s*args\.province/)
})

test("updateGridMetadata patches grid document in db", () => {
  // The patch call persists the values to Convex
  assert.match(gridCellsSource, /await\s+ctx\.db\.patch\(args\.gridId,\s*patch\)/)
})

// --- Read-back: listGrids returns updated region/province ---

test("listGrids returns region field from grid", () => {
  // After updateGridMetadata patches the grid, listGrids must return the updated region
  assert.match(gridCellsSource, /listGrids[\s\S]*?region:\s*grid\.region/)
})

test("listGrids returns province field from grid", () => {
  // After updateGridMetadata patches the grid, listGrids must return the updated province
  assert.match(gridCellsSource, /listGrids[\s\S]*?province:\s*grid\.province/)
})

// --- Panel displays persisted values from grid ---

test("panel reads grids via listGrids query", () => {
  assert.match(panelSource, /useQuery\(api\.discovery\.gridCells\.listGrids\)/)
})

test("panel derives selectedGrid from grids by globalGridId", () => {
  assert.match(panelSource, /grids\?\.find\(\(g\)\s*=>\s*g\._id\s*===\s*globalGridId\)/)
})

test("panel displays selectedGrid.region as the region value", () => {
  assert.match(panelSource, /selectedGrid\.region/)
})

test("panel displays selectedGrid.province as the province value", () => {
  assert.match(panelSource, /selectedGrid\.province/)
})

// --- Round-trip: edit calls mutation with dynamic field key ---

test("handleSaveFieldEdit passes editingField as dynamic key to mutation", () => {
  // The [editingField]: trimmed pattern ensures the correct field is sent
  assert.match(panelSource, /\[editingField\]:\s*trimmed/)
})

test("handleSaveFieldEdit includes gridId in mutation call", () => {
  assert.match(panelSource, /gridId:\s*selectedGrid\._id/)
})

// --- Downstream persistence: discoverCell reads grid region/province ---

test("discoverCell destructures region from grid data", () => {
  // discoverCell reads cellData.grid which includes region
  assert.match(discoverCellSource, /\{[^}]*queries,\s*region,\s*province[^}]*\}\s*=/)
})

test("discoverCell destructures province from grid data", () => {
  // discoverCell reads cellData.grid which includes province
  assert.match(discoverCellSource, /\{[^}]*region,\s*province[^}]*\}\s*=/)
})

test("discoverCell passes region to lead objects", () => {
  assert.match(discoverCellSource, /leads[\s\S]*?region,/)
})

test("discoverCell passes province to lead objects", () => {
  assert.match(discoverCellSource, /leads[\s\S]*?province,/)
})

// --- Edge cases: empty/unchanged values are not persisted ---

test("handleSaveFieldEdit skips mutation when value is empty after trim", () => {
  assert.match(panelSource, /!trimmed/)
})

test("handleSaveFieldEdit skips mutation when value is unchanged", () => {
  assert.match(panelSource, /trimmed\s*===\s*selectedGrid\[editingField\]/)
})

// --- GridWithStats type includes region and province ---

test("GridWithStats type includes region field", () => {
  assert.match(panelSource, /type\s+GridWithStats[\s\S]*?region:\s*string/)
})

test("GridWithStats type includes province field", () => {
  assert.match(panelSource, /type\s+GridWithStats[\s\S]*?province:\s*string/)
})
