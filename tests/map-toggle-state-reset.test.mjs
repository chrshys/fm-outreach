import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/map/page.tsx", "utf8")

test("toggle onClick resets isDrawing to false", () => {
  // When switching modes, drawing state should be cleared
  assert.match(source, /setViewMode\(/)
  assert.match(source, /setIsDrawing\(false\)/)
})

test("toggle onClick closes naming dialog", () => {
  // When switching modes, the cluster naming dialog should close
  assert.match(source, /setShowNamingDialog\(false\)/)
})

test("toggle onClick clears drawn polygon", () => {
  // When switching modes, any in-progress polygon should be discarded
  assert.match(source, /setDrawnPolygon\(null\)/)
})

test("toggle handler resets all cluster-drawing state together", () => {
  // All three resets should be in the same onClick handler as setViewMode
  // Extract the onClick handler block for the toggle button
  const toggleOnClick = source.match(
    /onClick=\{\(\)\s*=>\s*\{[^}]*setViewMode[^}]*\}\}/s,
  )
  assert.ok(toggleOnClick, "toggle onClick should be a block with setViewMode")
  const handler = toggleOnClick[0]
  assert.match(handler, /setIsDrawing\(false\)/)
  assert.match(handler, /setShowNamingDialog\(false\)/)
  assert.match(handler, /setDrawnPolygon\(null\)/)
})

test("isDrawing prop to MapContent is gated by clusters viewMode", () => {
  // isDrawing should only be true when in clusters mode
  assert.match(
    source,
    /isDrawing=\{viewMode\s*===\s*"clusters"\s*&&\s*isDrawing\}/,
  )
})

test("isDrawing is never passed as bare state to MapContent", () => {
  // Should NOT have isDrawing={isDrawing} — must be gated by viewMode
  assert.doesNotMatch(source, /isDrawing=\{isDrawing\}/)
})
