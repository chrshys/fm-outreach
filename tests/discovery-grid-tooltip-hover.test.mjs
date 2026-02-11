import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const gridSource = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)
const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")

// ============================================================
// Interactive tooltip shows mechanism rows and action buttons
// ============================================================

test("Tooltip uses interactive prop so it stays open on hover", () => {
  // The Tooltip component must have the interactive prop to allow
  // mouse movement from the cell to the tooltip without closing
  const tooltipBlock = gridSource.slice(
    gridSource.indexOf("<Tooltip"),
    gridSource.indexOf("</Tooltip>"),
  )
  assert.match(tooltipBlock, /interactive/)
})

test("tooltip contains mechanism rows via DISCOVERY_MECHANISMS.map", () => {
  assert.match(gridSource, /DISCOVERY_MECHANISMS\.map\(\(mechanism\)/)
})

test("each mechanism row has a Run button with Play icon", () => {
  assert.match(gridSource, /<Play\s+className="h-3 w-3"/)
})

test("each mechanism row shows mechanism label text", () => {
  assert.match(gridSource, /\{mechanism\.label\}/)
})

test("tooltip has action buttons (Split and Merge) in a bottom section", () => {
  assert.match(gridSource, /Grid2x2Plus/)
  assert.match(gridSource, /Split/)
  assert.match(gridSource, /Minimize2/)
  assert.match(gridSource, /Merge/)
})

// ============================================================
// Buttons inside tooltip are clickable (stopPropagation prevents map interaction)
// ============================================================

test("all tooltip buttons use e.stopPropagation to prevent map interaction", () => {
  const stopPropMatches = gridSource.match(/e\.stopPropagation\(\)/g)
  assert.ok(stopPropMatches, "should have stopPropagation calls")
  assert.ok(stopPropMatches.length >= 3, "Run, Split, Merge buttons all use stopPropagation")
})

// ============================================================
// Web Scraping row shows as disabled with dash for date
// ============================================================

test("Web Scraping mechanism is in DISCOVERY_MECHANISMS with enabled: false", () => {
  assert.match(gridSource, /id:\s*"web_scraper",\s*label:\s*"Web Scraping",\s*enabled:\s*false/)
})

test("disabled mechanisms get opacity-50 and pointer-events-none", () => {
  // When !mechanism.enabled || isSearching, the button gets disabled styling
  assert.match(gridSource, /!mechanism\.enabled\s*\|\|\s*isSearching/)
  assert.match(gridSource, /opacity-50 pointer-events-none/)
})

test("non-google_places mechanisms show dash for last-run date", () => {
  // The ternary falls through to "—" for mechanisms other than google_places
  assert.match(gridSource, /mechanism\.id\s*===\s*"google_places"\s*&&\s*cell\.lastSearchedAt/)
  assert.match(gridSource, /:\s*"—"/)
})

// ============================================================
// Split button hidden at max depth (depth 4)
// ============================================================

test("Split button is conditionally rendered when depth < MAX_DEPTH", () => {
  assert.match(gridSource, /cell\.depth\s*<\s*MAX_DEPTH/)
  // Verify MAX_DEPTH is 4
  assert.match(gridSource, /const\s+MAX_DEPTH\s*=\s*4/)
})

// ============================================================
// Merge button hidden on root cells (no parentCellId)
// ============================================================

test("Merge button is conditionally rendered when parentCellId exists", () => {
  // The conditional guard appears before the Merge button
  const beforeMerge = gridSource.slice(0, gridSource.indexOf("<Minimize2"))
  assert.match(beforeMerge, /cell\.parentCellId\s*&&/)
})

// ============================================================
// No buttons shown on cells with status "searching"
// ============================================================

test("bottom row (Split/Merge) is hidden when isSearching", () => {
  assert.match(gridSource, /!isSearching\s*&&/)
})

test("Run buttons are disabled when cell is searching", () => {
  // isSearching is derived from cell.status
  assert.match(gridSource, /const\s+isSearching\s*=\s*cell\.status\s*===\s*"searching"/)
  // disabled flag includes isSearching
  assert.match(gridSource, /!mechanism\.enabled\s*\|\|\s*isSearching/)
})

// ============================================================
// Page handler: undivide action wired up
// ============================================================

test("page wires up undivideCell mutation", () => {
  assert.match(pageSource, /undivideCell\s*=\s*useMutation\(api\.discovery\.gridCells\.undivideCell\)/)
})

test("handleCellAction dispatches undivide via action.type", () => {
  assert.match(pageSource, /action\.type\s*===\s*"undivide"/)
})

test("undivide action calls undivideCell mutation", () => {
  assert.match(pageSource, /await\s+undivideCell\(/)
})

test("undivide success shows 'Cell merged back to parent' toast", () => {
  assert.match(pageSource, /toast\.success\("Cell merged back to parent"\)/)
})

// ============================================================
// Page handler: non-google_places mechanisms show "Coming soon"
// ============================================================

test("search action checks mechanism and shows Coming soon for non-google_places", () => {
  assert.match(pageSource, /action\.mechanism\s*!==\s*"google_places"/)
  assert.match(pageSource, /toast\.info\("Coming soon"\)/)
})

// ============================================================
// Page handler: saturated cells can be re-searched
// ============================================================

test("search action no longer restricts to only unsearched/searched statuses", () => {
  // The old code had: cell.status === "unsearched" || cell.status === "searched"
  // The new code removes that guard and lets the backend handle status validation
  // It only blocks "searching" status and non-google_places mechanisms
  const handleBlock = pageSource.slice(
    pageSource.indexOf("handleCellAction"),
    pageSource.indexOf("}, [gridCells, requestDiscoverCell"),
  )
  // Should have searching guard
  assert.match(handleBlock, /cell\.status\s*===\s*"searching"/)
  // Should have mechanism guard
  assert.match(handleBlock, /action\.mechanism\s*!==\s*"google_places"/)
  // Should call requestDiscoverCell without further status filtering
  assert.match(handleBlock, /await\s+requestDiscoverCell\(/)
})

// ============================================================
// Page handler: undivideCell in dependency array
// ============================================================

test("handleCellAction dependency array includes undivideCell", () => {
  assert.match(pageSource, /\[gridCells,\s*requestDiscoverCell,\s*subdivideCell,\s*undivideCell\]/)
})
