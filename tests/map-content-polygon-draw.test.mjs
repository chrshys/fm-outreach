import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/map-content.tsx", "utf8")

test("imports PolygonDraw component", () => {
  assert.match(source, /import\s+\{\s*PolygonDraw\s*\}\s+from\s+"\.\/polygon-draw"/)
})

test("MapContentProps includes optional isDrawing prop", () => {
  assert.match(source, /isDrawing\?:\s*boolean/)
})

test("MapContentProps includes optional onPolygonDrawn prop", () => {
  assert.match(source, /onPolygonDrawn\?:\s*\(latlngs:\s*\{\s*lat:\s*number;\s*lng:\s*number\s*\}\[\]\)\s*=>\s*void/)
})

test("renders PolygonDraw when onPolygonDrawn is provided", () => {
  assert.match(source, /<PolygonDraw/)
  assert.match(source, /isDrawing=\{isDrawing\}/)
  assert.match(source, /onPolygonDrawn=\{onPolygonDrawn\}/)
})

test("conditionally renders PolygonDraw only when onPolygonDrawn exists", () => {
  assert.match(source, /onPolygonDrawn && /)
})

test("isDrawing defaults to false", () => {
  assert.match(source, /isDrawing = false/)
})
