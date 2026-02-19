import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const panelSource = readFileSync(
  resolve("src/components/map/discovery-panel.tsx"),
  "utf-8",
)

// --- Legend freshness variants ---

test("legend replaces single Searched entry with fresh, aging, and stale variants", () => {
  // Should NOT have a bare "Searched" label (without parenthetical)
  const bareSearched = panelSource.match(/label:\s*"Searched"/g)
  assert.equal(bareSearched, null, "should not have bare 'Searched' label")

  // Should have all three freshness variants
  assert.match(panelSource, /label:\s*"Searched \(fresh\)"/)
  assert.match(panelSource, /label:\s*"Searched \(aging\)"/)
  assert.match(panelSource, /label:\s*"Searched \(stale\)"/)
})

test("fresh variant uses bright green (#4ade80), aging uses lime (#a3e635), stale uses amber (#f59e0b)", () => {
  assert.match(panelSource, /searched-fresh.*#4ade80|#4ade80.*searched-fresh/)
  assert.match(panelSource, /searched-aging.*#a3e635|#a3e635.*searched-aging/)
  assert.match(panelSource, /searched-stale.*#f59e0b|#f59e0b.*searched-stale/)
})

test("legend replaces single Saturated entry with fresh, aging, and stale variants", () => {
  // Should NOT have a bare "Saturated" label (without parenthetical)
  const bareSaturated = panelSource.match(/label:\s*"Saturated"/g)
  assert.equal(bareSaturated, null, "should not have bare 'Saturated' label")

  // Should have all three freshness variants
  assert.match(panelSource, /label:\s*"Saturated \(fresh\)"/)
  assert.match(panelSource, /label:\s*"Saturated \(aging\)"/)
  assert.match(panelSource, /label:\s*"Saturated \(stale\)"/)
})

test("saturated fresh uses orange (#f97316), aging uses dark amber (#d97706), stale uses brown (#92400e)", () => {
  assert.match(panelSource, /saturated-fresh.*#f97316|#f97316.*saturated-fresh/)
  assert.match(panelSource, /saturated-aging.*#d97706|#d97706.*saturated-aging/)
  assert.match(panelSource, /saturated-stale.*#92400e|#92400e.*saturated-stale/)
})

test("legend has eight entries total", () => {
  const entries = panelSource.match(/\{\s*status:\s*"/g)
  assert.equal(entries?.length, 8, "CELL_STATUS_LEGEND should have 8 entries")
})

test("legend grid uses grid-cols-2 for compact layout", () => {
  assert.match(panelSource, /grid\s+grid-cols-2/)
})
