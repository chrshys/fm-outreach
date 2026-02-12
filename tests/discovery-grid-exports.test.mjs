import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

// ============================================================
// Exact export surface — only the listed items are exported
// ============================================================

test("exports exactly the specified named exports", () => {
  const exportLines = source.match(/^export\s+(type|const|function|default\s+function)\s+\w+/gm)
  assert.ok(exportLines)
  const names = exportLines.map((l) => l.replace(/^export\s+(type|const|default\s+function|function)\s+/, ""))
  assert.deepStrictEqual(names.sort(), [
    "CellAction",
    "CellData",
    "DISCOVERY_MECHANISMS",
    "DiscoveryGrid",
    "MAX_DEPTH",
    "formatShortDate",
    "getAvailableActions",
    "getStatusBadgeColor",
  ])
})

test("DiscoveryGridCell is NOT exported", () => {
  assert.doesNotMatch(source, /export\s+function\s+DiscoveryGridCell/)
})

// ============================================================
// CellAction type is exported
// ============================================================

test("exports CellAction type", () => {
  assert.match(source, /export\s+type\s+CellAction/)
})

// ============================================================
// CellData type is exported
// ============================================================

test("exports CellData type", () => {
  assert.match(source, /export\s+type\s+CellData/)
})

// ============================================================
// DISCOVERY_MECHANISMS is exported
// ============================================================

test("exports DISCOVERY_MECHANISMS as a const", () => {
  assert.match(source, /export\s+const\s+DISCOVERY_MECHANISMS/)
})

// ============================================================
// MAX_DEPTH is exported
// ============================================================

test("exports MAX_DEPTH as a const", () => {
  assert.match(source, /export\s+const\s+MAX_DEPTH\s*=\s*4/)
})

// ============================================================
// getAvailableActions is exported
// ============================================================

test("exports getAvailableActions function", () => {
  assert.match(source, /export\s+function\s+getAvailableActions/)
})

// ============================================================
// formatShortDate is exported
// ============================================================

test("exports formatShortDate function", () => {
  assert.match(source, /export\s+function\s+formatShortDate/)
})

test("formatShortDate accepts a number and returns a string", () => {
  assert.match(source, /formatShortDate\(timestamp:\s*number\):\s*string/)
})

// ============================================================
// getStatusBadgeColor is exported
// ============================================================

test("exports getStatusBadgeColor function", () => {
  assert.match(source, /export\s+function\s+getStatusBadgeColor/)
})

test("getStatusBadgeColor accepts CellStatus and returns a string", () => {
  assert.match(source, /getStatusBadgeColor\(status:\s*CellStatus\):\s*string/)
})

test("getStatusBadgeColor handles all four cell statuses", () => {
  const fnBlock = source.slice(
    source.indexOf("export function getStatusBadgeColor"),
    source.indexOf("function DiscoveryGridCell"),
  )
  assert.match(fnBlock, /case\s+"unsearched"/)
  assert.match(fnBlock, /case\s+"searching"/)
  assert.match(fnBlock, /case\s+"searched"/)
  assert.match(fnBlock, /case\s+"saturated"/)
})

// ============================================================
// Default export is DiscoveryGrid
// ============================================================

test("exports DiscoveryGrid as default export", () => {
  assert.match(source, /export\s+default\s+function\s+DiscoveryGrid/)
})
