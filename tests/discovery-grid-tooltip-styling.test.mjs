import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

// ============================================================
// Rectangle uses hover eventHandlers (not click) for tooltip
// ============================================================

test("Rectangle uses eventHandlers for mouseover and mouseout", () => {
  assert.match(source, /eventHandlers=\{/)
  assert.match(source, /mouseover:\s*handleEnter/)
  assert.match(source, /mouseout:\s*scheduleClose/)
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

test("CellTooltipContent is rendered inside Tooltip via hover wrapper div", () => {
  assert.match(source, /<CellTooltipContent\s+cell=\{cell\}\s+onCellAction=\{onCellAction\}\s*\/>/)
  // Wrapped in a div with onMouseEnter/onMouseLeave for delayed close
  assert.match(source, /<div onMouseEnter=\{handleEnter\} onMouseLeave=\{scheduleClose\}>/)
})

// ============================================================
// CSS hover-bridge: globals.css widens the ::before pseudo-element
// so the cursor can travel from the cell to the tooltip
// ============================================================

const cssSource = fs.readFileSync("src/app/globals.css", "utf8")

test("globals.css overrides .leaflet-tooltip-top::before for hover bridge", () => {
  assert.match(cssSource, /\.leaflet-tooltip-top::before/)
})

test("hover bridge is 14px tall to cover the 10px offset gap", () => {
  assert.match(cssSource, /height:\s*14px\s*!important/)
})

test("hover bridge spans the full tooltip width (left: 0, right: 0)", () => {
  assert.match(cssSource, /left:\s*0\s*!important/)
  assert.match(cssSource, /right:\s*0\s*!important/)
})

test("hover bridge positioned below the tooltip (bottom: -14px)", () => {
  assert.match(cssSource, /bottom:\s*-14px\s*!important/)
})

test("hover bridge removes default border arrow styling", () => {
  assert.match(cssSource, /border:\s*none\s*!important/)
})

test("hover bridge background is transparent", () => {
  assert.match(cssSource, /background:\s*transparent\s*!important/)
})
