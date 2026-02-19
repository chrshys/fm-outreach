import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/cell-colors.ts",
  "utf8",
)

test("getCellColor accepts optional lastSearchedAt parameter", () => {
  assert.match(source, /getCellColor\(status:\s*string,\s*lastSearchedAt\?:\s*number\)/)
})

test("imports getStaleness from @/lib/enrichment", () => {
  assert.match(source, /import\s+\{\s*getStaleness\s*\}\s*from\s*["']@\/lib\/enrichment["']/)
})

test("getCellColor calls getStaleness when lastSearchedAt is provided", () => {
  assert.match(source, /getStaleness\(lastSearchedAt\)/)
})

test("getCellColor returns SEARCHED_FRESHNESS color for searched status with lastSearchedAt", () => {
  assert.match(source, /status\s*===\s*"searched"\)\s*return\s+SEARCHED_FRESHNESS\[staleness\]/)
})

test("getCellColor returns SATURATED_FRESHNESS color for saturated status with lastSearchedAt", () => {
  assert.match(source, /status\s*===\s*"saturated"\)\s*return\s+SATURATED_FRESHNESS\[staleness\]/)
})

test("getCellColor falls through to CELL_COLORS when lastSearchedAt is undefined", () => {
  // The fallthrough line should still exist
  assert.match(source, /return\s+CELL_COLORS\[status\s+as\s+CellStatus\]\s*\?\?\s*DEFAULT_CELL_COLOR/)
})

test("getCellColor checks lastSearchedAt !== undefined before using freshness", () => {
  assert.match(source, /lastSearchedAt\s*!==\s*undefined/)
})

test("unsearched status ignores lastSearchedAt (no freshness branch for unsearched)", () => {
  // Only searched and saturated get freshness treatment
  const fnBody = source.match(/function getCellColor[\s\S]*?\n\}/)?.[0]
  assert.ok(fnBody, "getCellColor function found")
  assert.doesNotMatch(fnBody, /status\s*===\s*"unsearched"\)\s*return\s+.*FRESHNESS/)
})

test("searching status ignores lastSearchedAt (no freshness branch for searching)", () => {
  const fnBody = source.match(/function getCellColor[\s\S]*?\n\}/)?.[0]
  assert.ok(fnBody, "getCellColor function found")
  assert.doesNotMatch(fnBody, /status\s*===\s*"searching"\)\s*return\s+.*FRESHNESS/)
})
