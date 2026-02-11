import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

// ============================================================
// getAvailableActions function exists and is exported
// ============================================================

test("exports getAvailableActions function", () => {
  assert.match(source, /export\s+function\s+getAvailableActions/)
})

test("getAvailableActions accepts a CellData parameter", () => {
  assert.match(source, /getAvailableActions\(cell:\s*CellData\)/)
})

test("getAvailableActions returns CellAction[]", () => {
  assert.match(source, /getAvailableActions\(cell:\s*CellData\):\s*CellAction\[\]/)
})

// ============================================================
// Searching cells return no actions
// ============================================================

test("returns empty array when cell status is searching", () => {
  assert.match(source, /cell\.status\s*===\s*"searching"\)\s*return\s*\[\]/)
})

// ============================================================
// Search actions from enabled mechanisms
// ============================================================

test("filters DISCOVERY_MECHANISMS by enabled flag", () => {
  assert.match(source, /DISCOVERY_MECHANISMS[\s\S]*?\.filter\(\(?m\)?\s*=>\s*m\.enabled\)/)
})

test("maps enabled mechanisms to search actions with mechanism id", () => {
  assert.match(source, /\.map\(\(?m\)?\s*=>\s*\(\{\s*type:\s*"search"/)
  assert.match(source, /mechanism:\s*m\.id/)
})

// ============================================================
// Subdivide action based on depth
// ============================================================

test("includes subdivide action when cell depth is less than MAX_DEPTH", () => {
  assert.match(source, /cell\.depth\s*<\s*MAX_DEPTH/)
  // The function body should push subdivide
  const fnBlock = source.slice(
    source.indexOf("export function getAvailableActions"),
    source.indexOf("function formatShortDate"),
  )
  assert.match(fnBlock, /\{\s*type:\s*"subdivide"\s*\}/)
})

// ============================================================
// Undivide action based on parentCellId
// ============================================================

test("includes undivide action when cell has parentCellId", () => {
  const fnBlock = source.slice(
    source.indexOf("export function getAvailableActions"),
    source.indexOf("function formatShortDate"),
  )
  assert.match(fnBlock, /cell\.parentCellId/)
  assert.match(fnBlock, /\{\s*type:\s*"undivide"\s*\}/)
})
