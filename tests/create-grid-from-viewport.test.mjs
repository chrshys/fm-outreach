import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const panelSource = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")
const mutationSource = fs.readFileSync("convex/discovery/gridCells.ts", "utf8")
const schemaSource = fs.readFileSync("convex/schema.ts", "utf8")
const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")

// ============================================================
// 1. Schema requires region and province on discoveryGrids
// ============================================================

test("discoveryGrids schema has region field as v.string()", () => {
  // Match the region field inside the discoveryGrids defineTable block
  const gridTableMatch = schemaSource.match(
    /discoveryGrids:\s*defineTable\(\{([\s\S]*?)\}\)/
  )
  assert.ok(gridTableMatch, "discoveryGrids table must exist in schema")
  assert.match(gridTableMatch[1], /region:\s*v\.string\(\)/)
})

test("discoveryGrids schema has province field as v.string()", () => {
  const gridTableMatch = schemaSource.match(
    /discoveryGrids:\s*defineTable\(\{([\s\S]*?)\}\)/
  )
  assert.ok(gridTableMatch, "discoveryGrids table must exist in schema")
  assert.match(gridTableMatch[1], /province:\s*v\.string\(\)/)
})

// ============================================================
// 2. generateGrid mutation accepts region and province args
// ============================================================

test("generateGrid mutation requires region arg as v.string()", () => {
  const argsMatch = mutationSource.match(
    /export\s+const\s+generateGrid\s*=\s*mutation\(\{[\s\S]*?args:\s*\{([\s\S]*?)\},\s*handler/
  )
  assert.ok(argsMatch, "generateGrid args block must exist")
  assert.match(argsMatch[1], /region:\s*v\.string\(\)/)
})

test("generateGrid mutation requires province arg as v.string()", () => {
  const argsMatch = mutationSource.match(
    /export\s+const\s+generateGrid\s*=\s*mutation\(\{[\s\S]*?args:\s*\{([\s\S]*?)\},\s*handler/
  )
  assert.ok(argsMatch, "generateGrid args block must exist")
  assert.match(argsMatch[1], /province:\s*v\.string\(\)/)
})

test("generateGrid stores region on the grid record", () => {
  assert.match(mutationSource, /region:\s*args\.region/)
})

test("generateGrid stores province on the grid record", () => {
  assert.match(mutationSource, /province:\s*args\.province/)
})

// ============================================================
// 3. generateGrid accepts all four bounding box coordinates
// ============================================================

test("generateGrid accepts swLat, swLng, neLat, neLng as v.number()", () => {
  const argsMatch = mutationSource.match(
    /export\s+const\s+generateGrid\s*=\s*mutation\(\{[\s\S]*?args:\s*\{([\s\S]*?)\},\s*handler/
  )
  assert.ok(argsMatch)
  assert.match(argsMatch[1], /swLat:\s*v\.number\(\)/)
  assert.match(argsMatch[1], /swLng:\s*v\.number\(\)/)
  assert.match(argsMatch[1], /neLat:\s*v\.number\(\)/)
  assert.match(argsMatch[1], /neLng:\s*v\.number\(\)/)
})

// ============================================================
// 4. DiscoveryPanel form captures region and province
// ============================================================

test("DiscoveryPanel has region state variable", () => {
  assert.match(panelSource, /const\s+\[region,\s*setRegion\]\s*=\s*useState/)
})

test("DiscoveryPanel has province state variable", () => {
  assert.match(panelSource, /const\s+\[province,\s*setProvince\]\s*=\s*useState/)
})

test("form has Region input with placeholder", () => {
  assert.match(panelSource, /placeholder="Region"/)
})

test("form has Province input with placeholder", () => {
  assert.match(panelSource, /placeholder="Province"/)
})

test("Region input is wired to region state", () => {
  assert.match(panelSource, /value=\{region\}/)
  assert.match(panelSource, /onChange=\{\(e\)\s*=>\s*setRegion\(e\.target\.value\)/)
})

test("Province input is wired to province state", () => {
  assert.match(panelSource, /value=\{province\}/)
  assert.match(panelSource, /onChange=\{\(e\)\s*=>\s*setProvince\(e\.target\.value\)/)
})

// ============================================================
// 5. Form pre-fills viewport bounds from mapBounds prop
// ============================================================

test("form displays swLat from mapBounds", () => {
  assert.match(panelSource, /mapBounds\.swLat\.toFixed\(4\)/)
})

test("form displays swLng from mapBounds", () => {
  assert.match(panelSource, /mapBounds\.swLng\.toFixed\(4\)/)
})

test("form displays neLat from mapBounds", () => {
  assert.match(panelSource, /mapBounds\.neLat\.toFixed\(4\)/)
})

test("form displays neLng from mapBounds", () => {
  assert.match(panelSource, /mapBounds\.neLng\.toFixed\(4\)/)
})

test("bounds inputs are read-only", () => {
  // Count readOnly occurrences in the form — should be at least 4 for the bounds inputs
  const readOnlyCount = (panelSource.match(/readOnly/g) || []).length
  assert.ok(readOnlyCount >= 4, `Expected at least 4 readOnly inputs, found ${readOnlyCount}`)
})

test("shows dash placeholder when mapBounds is null", () => {
  assert.match(panelSource, /mapBounds\s*\?\s*mapBounds\.swLat\.toFixed\(4\)\s*:\s*"—"/)
})

// ============================================================
// 6. handleCreateGrid passes region, province, and bounds
// ============================================================

test("handleCreateGrid passes region to generateGrid", () => {
  assert.match(panelSource, /region:\s*region\.trim\(\)/)
})

test("handleCreateGrid passes province to generateGrid", () => {
  assert.match(panelSource, /province:\s*province\.trim\(\)/)
})

test("handleCreateGrid passes swLat from mapBounds", () => {
  assert.match(panelSource, /swLat:\s*mapBounds\.swLat/)
})

test("handleCreateGrid passes swLng from mapBounds", () => {
  assert.match(panelSource, /swLng:\s*mapBounds\.swLng/)
})

test("handleCreateGrid passes neLat from mapBounds", () => {
  assert.match(panelSource, /neLat:\s*mapBounds\.neLat/)
})

test("handleCreateGrid passes neLng from mapBounds", () => {
  assert.match(panelSource, /neLng:\s*mapBounds\.neLng/)
})

// ============================================================
// 7. Create button validation — requires all fields
// ============================================================

test("Create Grid button disabled when region is empty", () => {
  assert.match(panelSource, /!region\.trim\(\)/)
})

test("Create Grid button disabled when province is empty", () => {
  assert.match(panelSource, /!province\.trim\(\)/)
})

test("Create Grid button disabled when mapBounds is null", () => {
  assert.match(panelSource, /!\s*mapBounds/)
})

test("Create Grid button disabled when gridName is empty", () => {
  assert.match(panelSource, /!gridName\.trim\(\)/)
})

// ============================================================
// 8. Form resets after successful creation
// ============================================================

test("region state resets after grid creation", () => {
  assert.match(panelSource, /setRegion\(""\)/)
})

test("province state resets after grid creation", () => {
  assert.match(panelSource, /setProvince\(""\)/)
})

test("gridName state resets after grid creation", () => {
  assert.match(panelSource, /setGridName\(""\)/)
})

test("form hides after successful creation", () => {
  assert.match(panelSource, /setShowNewGridForm\(false\)/)
})

// ============================================================
// 9. Map page passes mapBounds to DiscoveryPanel
// ============================================================

test("map page tracks mapBounds state", () => {
  assert.match(pageSource, /useState<MapBounds\s*\|\s*null>\(null\)/)
})

test("map page passes mapBounds prop to DiscoveryPanel", () => {
  assert.match(pageSource, /mapBounds=\{mapBounds\}/)
})

test("map page passes onBoundsChange to MapContent", () => {
  assert.match(pageSource, /onBoundsChange=\{handleBoundsChange\}/)
})

// ============================================================
// 10. listGrids returns region and province for display
// ============================================================

test("listGrids query returns region field", () => {
  assert.match(mutationSource, /region:\s*grid\.region/)
})

test("listGrids query returns province field", () => {
  assert.match(mutationSource, /province:\s*grid\.province/)
})

// ============================================================
// 11. Success feedback
// ============================================================

test("shows success toast with cell count after grid creation", () => {
  assert.match(panelSource, /toast\.success\(`Grid created with \$\{result\.cellCount\} cells`\)/)
})

test("shows error toast on grid creation failure", () => {
  assert.match(panelSource, /toast\.error\("Failed to create grid"\)/)
})

// ============================================================
// 12. New grid is auto-selected after creation
// ============================================================

test("onGridSelect called with new grid ID after creation", () => {
  assert.match(panelSource, /onGridSelect\(result\.gridId/)
})
