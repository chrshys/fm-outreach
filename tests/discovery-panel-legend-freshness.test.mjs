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

test("fresh variant uses bright green (#4ade80), aging uses lime (#a3e635), stale uses amber (#ca8a04)", () => {
  assert.match(panelSource, /searched-fresh.*#4ade80|#4ade80.*searched-fresh/)
  assert.match(panelSource, /searched-aging.*#a3e635|#a3e635.*searched-aging/)
  assert.match(panelSource, /searched-stale.*#ca8a04|#ca8a04.*searched-stale/)
})

test("legend has six entries total", () => {
  const entries = panelSource.match(/\{\s*status:\s*"/g)
  assert.equal(entries?.length, 6, "CELL_STATUS_LEGEND should have 6 entries")
})

test("legend grid uses grid-cols-2 for 5-item layout", () => {
  assert.match(panelSource, /grid\s+grid-cols-2/)
})
