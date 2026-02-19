import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const panelSource = fs.readFileSync(
  "src/components/map/discovery-panel.tsx",
  "utf8",
)
const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")
const cellColorsSource = fs.readFileSync(
  "src/components/map/cell-colors.ts",
  "utf8",
)
const gridSource = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)
const sharedSource = fs.readFileSync(
  "src/components/map/discovery-grid-shared.ts",
  "utf8",
)

// ============================================================
// Panel: Run button dispatches search action for google_places
// ============================================================

test("panel Run button onClick dispatches search action with mechanism.id", () => {
  assert.match(
    panelSource,
    /onCellAction\(selectedCell\._id,\s*\{\s*type:\s*"search",\s*mechanism:\s*mechanism\.id\s*\}\)/,
  )
})

test("panel Run button is wrapped in DISCOVERY_MECHANISMS.map", () => {
  // The Run button is rendered inside DISCOVERY_MECHANISMS.map
  const mapIdx = panelSource.indexOf("DISCOVERY_MECHANISMS.map")
  const runIdx = panelSource.indexOf("Run", mapIdx)
  assert.ok(mapIdx > -1, "panel uses DISCOVERY_MECHANISMS.map")
  assert.ok(runIdx > mapIdx, "Run button appears inside the mechanisms map block")
})

test("google_places mechanism is enabled in DISCOVERY_MECHANISMS", () => {
  assert.match(
    sharedSource,
    /\{\s*id:\s*"google_places",\s*label:\s*"Google Places",\s*enabled:\s*true\s*\}/,
  )
})

test("panel Run button is only disabled when mechanism not enabled or cell is searching", () => {
  assert.match(
    panelSource,
    /const isDisabled\s*=\s*!mechanism\.enabled\s*\|\|\s*selectedCell\.status\s*===\s*"searching"/,
  )
})

// ============================================================
// Page: handleCellAction routes search to requestDiscoverCell
// ============================================================

test("page handleCellAction checks action.type === 'search'", () => {
  assert.match(pageSource, /action\.type\s*===\s*"search"/)
})

test("page handleCellAction checks action.mechanism === 'google_places'", () => {
  assert.match(pageSource, /action\.mechanism\s*!==\s*"google_places"/)
})

test("page calls requestDiscoverCell with cellId on google_places search", () => {
  // Find the search block and verify requestDiscoverCell is called within it
  const searchIdx = pageSource.indexOf('action.type === "search"')
  const nextActionIdx = pageSource.indexOf('action.type === "subdivide"')
  const searchBlock = pageSource.slice(searchIdx, nextActionIdx)
  assert.match(searchBlock, /requestDiscoverCell\(\{\s*cellId:\s*cellId\s+as\s+Id<"discoveryCells">\s*\}/)
})

test("page shows success toast after requestDiscoverCell", () => {
  assert.match(pageSource, /toast\.success\("Discovery started for cell"\)/)
})

test("page guards against searching a cell already in progress", () => {
  assert.match(pageSource, /cell\.status\s*===\s*"searching"/)
  assert.match(pageSource, /toast\.info\("Search already in progress"\)/)
})

// ============================================================
// Cell turns blue: "searching" status maps to blue color
// ============================================================

test("cell-colors defines searching status with blue color #3b82f6", () => {
  assert.match(cellColorsSource, /searching:\s*\{[^}]*color:\s*"#3b82f6"/)
})

test("cell-colors defines searching status with blue fillColor #3b82f6", () => {
  assert.match(cellColorsSource, /searching:\s*\{[^}]*fillColor:\s*"#3b82f6"/)
})

test("discovery-grid uses getCellColor to set pathOptions from cell.status", () => {
  assert.match(gridSource, /getCellColor\(cell\.status,\s*cell\.lastSearchedAt\)/)
})

// ============================================================
// Backend wiring: requestDiscoverCell mutation is used
// ============================================================

test("page imports requestDiscoverCell mutation", () => {
  assert.match(
    pageSource,
    /useMutation\(api\.discovery\.discoverCell\.requestDiscoverCell\)/,
  )
})

// ============================================================
// DiscoveryPanel receives onCellAction from the page
// ============================================================

test("page passes handleCellAction to DiscoveryPanel as onCellAction", () => {
  assert.match(pageSource, /onCellAction=\{handleCellAction\}/)
})

test("DiscoveryPanel prop type includes onCellAction callback", () => {
  assert.match(
    panelSource,
    /onCellAction:\s*\(cellId:\s*string,\s*action:\s*CellAction\)\s*=>\s*void/,
  )
})
