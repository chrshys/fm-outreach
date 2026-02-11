import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

// ============================================================
// Rectangle no longer has click eventHandler
// ============================================================

test("Rectangle does not use eventHandlers prop", () => {
  assert.doesNotMatch(source, /eventHandlers=\{/)
})

test("Rectangle does not fire onCellAction on click", () => {
  // The old click: () => onCellAction(...) pattern is removed
  assert.doesNotMatch(source, /click:\s*\(\)\s*=>\s*onCellAction/)
})

// ============================================================
// Tooltip overrides Leaflet default styles via Tailwind !important
// ============================================================

test("Tooltip has className with !bg-card", () => {
  assert.match(source, /!bg-card/)
})

test("Tooltip has className with !border and !border-border", () => {
  assert.match(source, /!border !border-border/)
})

test("Tooltip has className with !rounded-lg", () => {
  assert.match(source, /!rounded-lg/)
})

test("Tooltip has className with !shadow-md", () => {
  assert.match(source, /!shadow-md/)
})

test("Tooltip has className with !px-2.5 and !py-2", () => {
  assert.match(source, /!px-2\.5 !py-2/)
})

test("Tooltip has className with !text-foreground", () => {
  assert.match(source, /!text-foreground/)
})

// ============================================================
// Tooltip positioning
// ============================================================

test("Tooltip direction is top", () => {
  assert.match(source, /direction="top"/)
})

test("Tooltip offset is [0, -10]", () => {
  assert.match(source, /offset=\{\[0,\s*-10\]\}/)
})

// ============================================================
// Tooltip is still interactive with CellTooltipContent
// ============================================================

test("Tooltip remains interactive", () => {
  assert.match(source, /<Tooltip[\s\S]*?interactive/)
})

test("CellTooltipContent is rendered inside Tooltip", () => {
  assert.match(source, /<CellTooltipContent\s+cell=\{cell\}\s+onCellAction=\{onCellAction\}\s*\/>/)
})
