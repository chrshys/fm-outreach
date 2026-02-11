import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

// ============================================================
// DiscoveryGridCell manages tooltip open/close via React state
// ============================================================

test("DiscoveryGridCell component is defined", () => {
  assert.match(source, /function\s+DiscoveryGridCell\(/)
})

test("DiscoveryGridCell uses useState to track open state", () => {
  assert.match(source, /useState\(false\)/)
})

test("DiscoveryGridCell uses useRef for the close timer", () => {
  assert.match(source, /useRef<ReturnType<typeof setTimeout> \| null>\(null\)/)
})

// ============================================================
// Delayed close: scheduleClose sets a timeout, cancelClose clears it
// ============================================================

test("TOOLTIP_CLOSE_DELAY is defined as 150ms", () => {
  assert.match(source, /const\s+TOOLTIP_CLOSE_DELAY\s*=\s*150/)
})

test("scheduleClose calls setTimeout with TOOLTIP_CLOSE_DELAY", () => {
  assert.match(source, /setTimeout\(/)
  assert.match(source, /TOOLTIP_CLOSE_DELAY/)
})

test("cancelClose clears the timer via clearTimeout", () => {
  assert.match(source, /clearTimeout\(closeTimer\.current\)/)
})

test("handleEnter cancels any pending close and sets open to true", () => {
  const handleEnterBlock = source.slice(
    source.indexOf("const handleEnter"),
    source.indexOf("const pathOptions"),
  )
  assert.match(handleEnterBlock, /cancelClose\(\)/)
  assert.match(handleEnterBlock, /setOpen\(true\)/)
})

test("scheduleClose sets open to false after delay", () => {
  const scheduleBlock = source.slice(
    source.indexOf("const scheduleClose"),
    source.indexOf("const handleEnter"),
  )
  assert.match(scheduleBlock, /setOpen\(false\)/)
})

// ============================================================
// Rectangle eventHandlers wire to hover management functions
// ============================================================

test("Rectangle uses mouseover handler for enter", () => {
  assert.match(source, /mouseover:\s*handleEnter/)
})

test("Rectangle uses mouseout handler for scheduled close", () => {
  assert.match(source, /mouseout:\s*scheduleClose/)
})

// ============================================================
// Tooltip uses permanent prop controlled by open state
// ============================================================

test("Tooltip has permanent prop bound to open state", () => {
  assert.match(source, /permanent=\{open\}/)
})

test("Tooltip still has interactive prop", () => {
  const tooltipBlock = source.slice(
    source.indexOf("<Tooltip"),
    source.indexOf("</Tooltip>"),
  )
  assert.match(tooltipBlock, /interactive/)
})

// ============================================================
// Tooltip content wrapper div has mouse enter/leave handlers
// ============================================================

test("wrapper div has onMouseEnter={handleEnter}", () => {
  assert.match(source, /onMouseEnter=\{handleEnter\}/)
})

test("wrapper div has onMouseLeave={scheduleClose}", () => {
  assert.match(source, /onMouseLeave=\{scheduleClose\}/)
})

// ============================================================
// DiscoveryGrid renders DiscoveryGridCell for each cell
// ============================================================

test("DiscoveryGrid maps cells to DiscoveryGridCell components", () => {
  assert.match(source, /<DiscoveryGridCell/)
})
