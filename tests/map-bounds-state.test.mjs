import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/map/page.tsx", "utf8")

test("does not declare mapBounds state (removed — no longer needed by DiscoveryPanel)", () => {
  assert.doesNotMatch(source, /\[\s*mapBounds\s*,\s*setMapBounds\s*\]/)
})

test("does not define handleBoundsChange callback (removed with mapBounds)", () => {
  assert.doesNotMatch(source, /handleBoundsChange/)
})

test("does not pass onBoundsChange to MapContent (removed with mapBounds)", () => {
  assert.doesNotMatch(source, /onBoundsChange=\{handleBoundsChange\}/)
})
