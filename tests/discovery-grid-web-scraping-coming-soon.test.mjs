import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")
const gridSource = fs.readFileSync(
  "src/components/map/discovery-grid-shared.ts",
  "utf8",
)
const panelSource = fs.readFileSync(
  "src/components/map/discovery-panel.tsx",
  "utf8",
)

// ============================================================
// Web Scraping mechanism is enabled in the UI
// ============================================================

test("web_scraper mechanism is enabled so button is clickable", () => {
  const wsBlock = gridSource.match(/\{\s*id:\s*"web_scraper"[^}]*\}/s)
  assert.ok(wsBlock, "web_scraper entry should exist")
  assert.match(wsBlock[0], /enabled:\s*true/)
})

// ============================================================
// handleCellAction shows "Coming soon" for non-google_places mechanisms
// ============================================================

test("handleCellAction guards non-google_places mechanisms with Coming soon toast", () => {
  assert.match(
    pageSource,
    /action\.mechanism\s*!==\s*"google_places"/,
    "should check if mechanism is not google_places",
  )
  assert.match(
    pageSource,
    /toast\.info\("Coming soon"\)/,
    "should show Coming soon toast for unsupported mechanisms",
  )
})

test("Coming soon guard returns early before calling requestDiscoverCell", () => {
  const handlerStart = pageSource.indexOf("handleCellAction")
  const handlerSource = pageSource.slice(handlerStart)
  const comingSoonIdx = handlerSource.indexOf('toast.info("Coming soon")')
  const discoverIdx = handlerSource.indexOf("await requestDiscoverCell")
  assert.ok(comingSoonIdx > -1, "Coming soon toast should exist in handler")
  assert.ok(discoverIdx > -1, "requestDiscoverCell call should exist in handler")
  assert.ok(
    comingSoonIdx < discoverIdx,
    "Coming soon guard should appear before requestDiscoverCell call",
  )
})

// ============================================================
// Panel button dispatches search action with web_scraper mechanism
// ============================================================

test("panel button dispatches search action with mechanism id via onCellAction", () => {
  assert.match(
    panelSource,
    /onCellAction\(selectedCell\._id,\s*\{\s*type:\s*"search",\s*mechanism:\s*mechanism\.id\s*\}\)/,
    "panel button onClick should dispatch search action with the mechanism id",
  )
})

// ============================================================
// Both mechanisms are enabled so getAvailableActions includes both
// ============================================================

test("getAvailableActions includes web_scraper search action (both mechanisms enabled)", () => {
  const mechanisms = gridSource.match(
    /\{\s*id:\s*"[^"]+",\s*label:\s*"[^"]+",\s*enabled:\s*true\s*\}/g,
  )
  assert.ok(mechanisms, "should find enabled mechanism entries")
  assert.equal(mechanisms.length, 2, "both mechanisms should be enabled")
})
