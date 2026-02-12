import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)
const sharedSource = fs.readFileSync(
  "src/components/map/discovery-grid-shared.ts",
  "utf8",
)

// ============================================================
// discovery-grid.tsx re-exports shared items and has its own default export
// ============================================================

test("re-exports CellAction and CellData types from discovery-grid-shared", () => {
  assert.match(source, /export\s+type\s+\{[^}]*CellAction[^}]*CellData[^}]*\}\s+from\s+["']\.\/discovery-grid-shared["']/)
})

test("re-exports DISCOVERY_MECHANISMS, MAX_DEPTH, getAvailableActions, formatShortDate, getStatusBadgeColor from discovery-grid-shared", () => {
  assert.match(source, /export\s+\{[^}]*DISCOVERY_MECHANISMS[^}]*MAX_DEPTH[^}]*getAvailableActions[^}]*formatShortDate[^}]*getStatusBadgeColor[^}]*\}\s+from\s+["']\.\/discovery-grid-shared["']/)
})

test("exports DiscoveryGrid as default export", () => {
  assert.match(source, /export\s+default\s+function\s+DiscoveryGrid/)
})

test("DiscoveryGridCell is NOT exported", () => {
  assert.doesNotMatch(source, /export\s+function\s+DiscoveryGridCell/)
})

// ============================================================
// Definitions in discovery-grid-shared.ts
// ============================================================

test("exports CellAction type", () => {
  assert.match(sharedSource, /export\s+type\s+CellAction/)
})

test("exports CellData type", () => {
  assert.match(sharedSource, /export\s+type\s+CellData/)
})

test("exports DISCOVERY_MECHANISMS as a const", () => {
  assert.match(sharedSource, /export\s+const\s+DISCOVERY_MECHANISMS/)
})

test("exports MAX_DEPTH as a const equal to 4", () => {
  assert.match(sharedSource, /export\s+const\s+MAX_DEPTH\s*=\s*4/)
})

test("exports getAvailableActions function", () => {
  assert.match(sharedSource, /export\s+function\s+getAvailableActions/)
})

test("exports formatShortDate function", () => {
  assert.match(sharedSource, /export\s+function\s+formatShortDate/)
})

test("formatShortDate accepts a number and returns a string", () => {
  assert.match(sharedSource, /formatShortDate\(timestamp:\s*number\):\s*string/)
})

test("exports getStatusBadgeColor function", () => {
  assert.match(sharedSource, /export\s+function\s+getStatusBadgeColor/)
})

test("getStatusBadgeColor accepts CellStatus and returns a string", () => {
  assert.match(sharedSource, /getStatusBadgeColor\(status:\s*CellStatus\):\s*string/)
})

test("getStatusBadgeColor handles all four cell statuses", () => {
  const fnBlock = sharedSource.slice(
    sharedSource.indexOf("export function getStatusBadgeColor"),
  )
  assert.match(fnBlock, /case\s+"unsearched"/)
  assert.match(fnBlock, /case\s+"searching"/)
  assert.match(fnBlock, /case\s+"searched"/)
  assert.match(fnBlock, /case\s+"saturated"/)
})
