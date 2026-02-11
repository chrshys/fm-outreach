import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

// ============================================================
// No auto-action on cell click — clicking the cell rectangle
// itself does nothing. All actions require explicit button
// clicks inside the hover tooltip.
// ============================================================

test("Rectangle eventHandlers do not include a click handler", () => {
  // Extract the eventHandlers block from the Rectangle JSX
  const eventHandlersMatch = source.match(
    /eventHandlers=\{[\s\S]*?\{([\s\S]*?)\}\s*\}/,
  )
  assert.ok(eventHandlersMatch, "should have an eventHandlers prop on Rectangle")
  const handlersBlock = eventHandlersMatch[1]
  assert.doesNotMatch(handlersBlock, /click\s*:/, "eventHandlers must not contain a click handler")
})

test("Rectangle eventHandlers only include mouseover and mouseout", () => {
  const eventHandlersMatch = source.match(
    /eventHandlers=\{[\s\S]*?\{([\s\S]*?)\}\s*\}/,
  )
  assert.ok(eventHandlersMatch)
  const handlersBlock = eventHandlersMatch[1]
  assert.match(handlersBlock, /mouseover/, "should handle mouseover")
  assert.match(handlersBlock, /mouseout/, "should handle mouseout")
  // Count the handlers — exactly 2
  const handlerEntries = handlersBlock
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  assert.equal(handlerEntries.length, 2, "should have exactly 2 event handlers (mouseover, mouseout)")
})

test("no onCellAction call exists outside of button onClick handlers", () => {
  // All onCellAction calls should be inside onClick={(e) => { ... }} handlers
  // meaning they are preceded by e.stopPropagation()
  const actionCalls = [...source.matchAll(/onCellAction\(cell\._id/g)]
  assert.ok(actionCalls.length > 0, "should have at least one onCellAction call")

  // Every onCellAction should be inside an onClick handler
  for (const match of actionCalls) {
    // Look backwards from each onCellAction call for the nearest onClick
    const preceding = source.slice(Math.max(0, match.index - 200), match.index)
    assert.match(
      preceding,
      /onClick=\{?\(e\)\s*=>/,
      "onCellAction must be inside a button onClick handler",
    )
  }
})

test("Rectangle does not directly invoke onCellAction", () => {
  // Extract the Rectangle JSX block (from <Rectangle to its closing >)
  const rectangleStart = source.indexOf("<Rectangle")
  assert.ok(rectangleStart !== -1, "should find <Rectangle element")

  // Get the Rectangle opening tag + eventHandlers (up to the children)
  const afterRect = source.slice(rectangleStart)
  const closingAngle = afterRect.indexOf(">")
  const rectangleTag = afterRect.slice(0, closingAngle)

  assert.doesNotMatch(
    rectangleTag,
    /onCellAction/,
    "Rectangle tag should not reference onCellAction directly",
  )
})
