import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/map/page.tsx", "utf8")

// ============================================================
// Switching to Clusters mode and back clears selection
// ============================================================

test("view mode toggle unconditionally clears selectedCellId", () => {
  // The toggle handler calls setSelectedCellId(null) on every invocation,
  // regardless of which direction the mode switch goes (discovery→clusters
  // or clusters→discovery). This ensures a round-trip always clears selection.
  const toggleMatch = source.match(
    /onClick=\{\(\)\s*=>\s*\{([\s\S]*?)setViewMode\(([\s\S]*?)\}\}/,
  )
  assert.ok(toggleMatch, "view mode toggle onClick handler should exist")
  const fullHandler = toggleMatch[0]
  assert.match(
    fullHandler,
    /setSelectedCellId\(null\)/,
    "toggle handler must clear selectedCellId",
  )
})

test("setSelectedCellId(null) is not guarded by viewMode check in toggle", () => {
  // Extract the toggle onClick handler body
  const toggleMatch = source.match(
    /onClick=\{\(\)\s*=>\s*\{([\s\S]*?)\}\}/,
  )
  assert.ok(toggleMatch, "toggle onClick should exist")
  const handlerBody = toggleMatch[1]

  // setSelectedCellId(null) should be a direct call, not inside an if/ternary on viewMode
  const lines = handlerBody.split("\n").map((l) => l.trim()).filter(Boolean)
  const clearLine = lines.find((l) => l.includes("setSelectedCellId(null)"))
  assert.ok(clearLine, "should have setSelectedCellId(null) in handler")
  assert.doesNotMatch(
    clearLine,
    /if\s*\(|viewMode.*\?/,
    "setSelectedCellId(null) should not be conditional on viewMode",
  )
})

test("toggle handler clears drawing state alongside selection", () => {
  // When switching modes, all ephemeral state should be cleared
  const toggleMatch = source.match(
    /onClick=\{\(\)\s*=>\s*\{([\s\S]*?)\}\}/,
  )
  assert.ok(toggleMatch)
  const body = toggleMatch[1]
  assert.match(body, /setIsDrawing\(false\)/, "should clear drawing state")
  assert.match(body, /setDrawnPolygon\(null\)/, "should clear drawn polygon")
  assert.match(body, /setShowNamingDialog\(false\)/, "should close naming dialog")
  assert.match(body, /setSelectedCellId\(null\)/, "should clear cell selection")
})

test("view mode toggle clears selectedVirtualCell", () => {
  const toggleMatch = source.match(
    /onClick=\{\(\)\s*=>\s*\{([\s\S]*?)\}\}/,
  )
  assert.ok(toggleMatch, "toggle onClick should exist")
  const body = toggleMatch[1]
  assert.match(
    body,
    /setSelectedVirtualCell\(null\)/,
    "toggle handler must clear selectedVirtualCell",
  )
})
