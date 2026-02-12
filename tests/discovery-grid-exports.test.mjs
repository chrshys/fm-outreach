import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

// ============================================================
// MAX_DEPTH is exported
// ============================================================

test("exports MAX_DEPTH as a const", () => {
  assert.match(source, /export\s+const\s+MAX_DEPTH\s*=\s*4/)
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
    source.indexOf("export default function"),
  )
  assert.match(fnBlock, /case\s+"unsearched"/)
  assert.match(fnBlock, /case\s+"searching"/)
  assert.match(fnBlock, /case\s+"searched"/)
  assert.match(fnBlock, /case\s+"saturated"/)
})
