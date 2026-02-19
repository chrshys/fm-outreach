import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/discovery-grid-shared.ts",
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
// Searching cells still return actions (buttons shown but disabled in UI)
// ============================================================

test("does not return empty array when cell status is searching", () => {
  // getAvailableActions should NOT early-return [] for searching cells;
  // the UI handles disabling buttons instead of hiding them.
  const fnBlock = source.slice(
    source.indexOf("export function getAvailableActions"),
    source.indexOf("function formatRelativeTime"),
  )
  assert.doesNotMatch(fnBlock, /cell\.status\s*===\s*"searching"\)\s*return\s*\[\]/)
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
    source.indexOf("function formatRelativeTime"),
  )
  assert.match(fnBlock, /\{\s*type:\s*"subdivide"\s*\}/)
})

// ============================================================
// Undivide action based on depth > 0
// ============================================================

test("includes undivide action when cell depth is greater than 0", () => {
  const fnBlock = source.slice(
    source.indexOf("export function getAvailableActions"),
    source.indexOf("function formatRelativeTime"),
  )
  assert.match(fnBlock, /cell\.depth\s*>\s*0/)
  assert.match(fnBlock, /\{\s*type:\s*"undivide"\s*\}/)
})

test("does not gate undivide action on parentCellId", () => {
  const fnBlock = source.slice(
    source.indexOf("export function getAvailableActions"),
    source.indexOf("function formatRelativeTime"),
  )
  assert.doesNotMatch(fnBlock, /cell\.parentCellId/)
})
