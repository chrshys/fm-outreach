import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")

// --- Exports ---

test("exports DiscoveryPanel as named export", () => {
  assert.match(source, /export\s+function\s+DiscoveryPanel/)
})

// --- Props ---

test("accepts globalGridId prop of type Id<discoveryGrids> | null", () => {
  assert.match(source, /globalGridId:\s*Id<"discoveryGrids">\s*\|\s*null/)
})

test("does not import MapBounds type (mapBounds prop removed)", () => {
  assert.doesNotMatch(source, /import\s+type\s+\{\s*MapBounds\s*\}\s+from\s+["']\.\/map-bounds-emitter["']/)
})

// --- Convex integration ---

test("queries listGrids from Convex", () => {
  assert.match(source, /useQuery\(api\.discovery\.gridCells\.listGrids\)/)
})

test("does not use removed generateGrid mutation", () => {
  assert.doesNotMatch(source, /generateGrid/)
})

test("uses updateGridQueries mutation", () => {
  assert.match(source, /useMutation\(api\.discovery\.gridCells\.updateGridQueries\)/)
})

// --- Collapsible panel ---

test("has collapse/expand toggle like MapFilters", () => {
  assert.match(source, /useState\(true\)/)
  assert.match(source, /setOpen\(false\)/)
  assert.match(source, /setOpen\(true\)/)
})

test("shows Discovery button when collapsed", () => {
  assert.match(source, /Discovery/)
  assert.match(source, /Search\s+className/)
})

test("renders close button with aria-label", () => {
  assert.match(source, /aria-label="Close discovery panel"/)
})

// --- Grid Selector ---

test("renders grid selector dropdown when grids exist", () => {
  assert.match(source, /grids && grids\.length > 0/)
  assert.match(source, /ChevronDown/)
  assert.match(source, /showGridSelector/)
})

test("grid selector lists all grids by name", () => {
  assert.match(source, /grids\.map\(\(grid\)/)
  assert.match(source, /grid\.name/)
})

test("no New Grid form (grid creation replaced by virtual grid)", () => {
  assert.doesNotMatch(source, /showNewGridForm/)
  assert.doesNotMatch(source, /handleCreateGrid/)
})

// --- Progress Stats ---

test("shows searched count out of total leaf cells", () => {
  assert.match(source, /selectedGrid\.searchedCount/)
  assert.match(source, /selectedGrid\.totalLeafCells/)
})

test("shows saturated cell count", () => {
  assert.match(source, /selectedGrid\.saturatedCount/)
})

test("shows total leads found", () => {
  assert.match(source, /selectedGrid\.totalLeadsFound/)
})

test("renders progress bar based on searched + saturated / total", () => {
  assert.match(source, /searchedCount\s*\+\s*selectedGrid\.saturatedCount.*totalLeafCells/)
})

// --- Search Queries ---

test("renders queries as removable badges", () => {
  assert.match(source, /selectedGrid\.queries\.map/)
  assert.match(source, /<Badge/)
  assert.match(source, /variant="secondary"/)
})

test("each query badge has a remove button with aria-label", () => {
  assert.match(source, /aria-label=\{`Remove query: \$\{query\}`\}/)
})

test("handleRemoveQuery calls updateGridQueries with filtered queries", () => {
  assert.match(source, /selectedGrid\.queries\.filter\(\(q\)\s*=>\s*q\s*!==\s*queryToRemove\)/)
})

test("has text input to add new queries", () => {
  assert.match(source, /placeholder="Add query…"/)
  assert.match(source, /newQuery/)
})

test("add query form submits on enter via form onSubmit", () => {
  assert.match(source, /onSubmit=\{\(e\)/)
  assert.match(source, /e\.preventDefault\(\)/)
  assert.match(source, /handleAddQuery\(\)/)
})

test("handleAddQuery prevents duplicate queries", () => {
  assert.match(source, /selectedGrid\.queries\.includes\(trimmed\)/)
  assert.match(source, /Query already exists/)
})

test("handleAddQuery calls updateGridQueries with appended query", () => {
  assert.match(source, /\[\.\.\.selectedGrid\.queries,\s*trimmed\]/)
})

// --- Color Legend ---

test("renders cell status color legend", () => {
  assert.match(source, /Cell Status/)
  assert.match(source, /CELL_STATUS_LEGEND/)
})

test("legend includes all four statuses", () => {
  assert.match(source, /Unsearched/)
  assert.match(source, /Searching/)
  assert.match(source, /Searched/)
  assert.match(source, /Saturated/)
})

test("legend colors match cell-colors.ts values", () => {
  assert.match(source, /#9ca3af/)  // unsearched
  assert.match(source, /#3b82f6/)  // searching
  assert.match(source, /#22c55e/)  // searched
  assert.match(source, /#f97316/)  // saturated
})

// --- Positioning / Styling ---

test("positioned same as MapFilters (absolute left-3 top-3 z-10)", () => {
  assert.match(source, /absolute\s+left-3\s+top-3\s+z-10/)
})

test("panel has same width as MapFilters (w-72)", () => {
  assert.match(source, /w-72/)
})

test("panel uses bg-card with shadow-md", () => {
  assert.match(source, /bg-card/)
  assert.match(source, /shadow-md/)
})
