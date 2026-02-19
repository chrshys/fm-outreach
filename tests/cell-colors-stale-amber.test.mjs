import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const cellColorsSource = fs.readFileSync(
  "src/components/map/cell-colors.ts",
  "utf8",
)

const enrichmentSource = fs.readFileSync(
  "src/lib/enrichment.ts",
  "utf8",
)

const panelSource = fs.readFileSync(
  "src/components/map/discovery-panel.tsx",
  "utf8",
)

// --- getStaleness returns "stale" for >90 days ---

test("getStaleness returns 'stale' for timestamps older than 90 days", () => {
  assert.match(enrichmentSource, /if\s*\(daysSince\s*<=\s*90\)\s*return\s*"aging"/)
  assert.match(enrichmentSource, /return\s*"stale"/)
})

// --- SEARCHED_FRESHNESS stale uses amber #f59e0b ---

test("SEARCHED_FRESHNESS stale color is amber #f59e0b", () => {
  assert.match(
    cellColorsSource,
    /SEARCHED_FRESHNESS[\s\S]*?stale:\s*\{[^}]*color:\s*"#f59e0b"/,
  )
})

test("SEARCHED_FRESHNESS stale fillColor is amber #f59e0b", () => {
  assert.match(
    cellColorsSource,
    /SEARCHED_FRESHNESS[\s\S]*?stale:\s*\{[^}]*fillColor:\s*"#f59e0b"/,
  )
})

test("stale amber (#f59e0b) is distinct from saturated orange (#f97316)", () => {
  assert.match(cellColorsSource, /#f59e0b/)
  assert.match(cellColorsSource, /#f97316/)
  assert.notEqual("#f59e0b", "#f97316")
})

// --- Legend shows amber for stale cells ---

test("legend searched-stale entry uses amber #f59e0b", () => {
  assert.match(panelSource, /searched-stale.*#f59e0b|#f59e0b.*searched-stale/)
})

test("legend labels stale searched cells as 'Searched (stale)'", () => {
  assert.match(panelSource, /label:\s*"Searched \(stale\)"/)
})
