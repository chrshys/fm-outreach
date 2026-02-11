import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

// ============================================================
// Leaflet DomEvent.disableClickPropagation on tooltip container
// (Leaflet Popup does this but Tooltip does not — we fix it)
// ============================================================

test("imports leaflet for L.DomEvent access", () => {
  assert.match(source, /import\s+L\s+from\s+["']leaflet["']/)
})

test("imports useEffect from react", () => {
  assert.match(source, /useEffect/)
  assert.match(source, /import\s+\{[^}]*useEffect[^}]*\}\s+from\s+["']react["']/)
})

test("creates a wrapperRef for the tooltip content div", () => {
  assert.match(source, /const\s+wrapperRef\s*=\s*useRef<HTMLDivElement\s*\|\s*null>\(null\)/)
})

test("wrapper div receives the ref", () => {
  assert.match(source, /<div ref=\{wrapperRef\}/)
})

test("useEffect finds the closest .leaflet-tooltip ancestor", () => {
  assert.match(source, /wrapperRef\.current\?\.closest.*\.leaflet-tooltip/)
})

test("calls L.DomEvent.disableClickPropagation on the tooltip element", () => {
  assert.match(source, /L\.DomEvent\.disableClickPropagation\(el\)/)
})

test("calls L.DomEvent.disableScrollPropagation on the tooltip element", () => {
  assert.match(source, /L\.DomEvent\.disableScrollPropagation\(el\)/)
})

// ============================================================
// All buttons still use e.stopPropagation for React event layer
// ============================================================

test("all three button onClick handlers call e.stopPropagation", () => {
  const matches = source.match(/e\.stopPropagation\(\)/g)
  assert.ok(matches, "should find stopPropagation calls")
  assert.ok(matches.length >= 3, "Run, Split, and Merge buttons all call stopPropagation")
})

// ============================================================
// Buttons are native <button> elements (not divs) for accessibility
// ============================================================

test("tooltip action buttons are <button> elements", () => {
  const buttonMatches = source.match(/<button\s/g)
  assert.ok(buttonMatches, "should find <button> elements")
  assert.ok(buttonMatches.length >= 3, "at least 3 button elements (Run, Split, Merge)")
})

test("enabled buttons do not have pointer-events-none", () => {
  // The pointer-events-none class only appears inside a conditional for disabled buttons
  const disabledOnly = source.match(/disabled\s*\?\s*"opacity-50 pointer-events-none"/g)
  assert.ok(disabledOnly, "pointer-events-none is conditional on disabled state")
})
