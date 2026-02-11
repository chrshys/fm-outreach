import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/map/page.tsx", "utf8")

test("imports MapBounds type from map-bounds-emitter", () => {
  assert.match(source, /import\s+type\s+\{\s*MapBounds\s*\}\s+from\s+["']@\/components\/map\/map-bounds-emitter["']/)
})

test("declares mapBounds state initialized to null", () => {
  assert.match(source, /useState<MapBounds\s*\|\s*null>\(null\)/)
  assert.match(source, /\[\s*mapBounds\s*,\s*setMapBounds\s*\]/)
})

test("defines handleBoundsChange callback that calls setMapBounds", () => {
  assert.match(source, /handleBoundsChange\s*=\s*useCallback\(\s*\(\s*bounds:\s*MapBounds\s*\)/)
  assert.match(source, /setMapBounds\(bounds\)/)
})

test("passes onBoundsChange={handleBoundsChange} to MapContent", () => {
  assert.match(source, /onBoundsChange=\{handleBoundsChange\}/)
})
