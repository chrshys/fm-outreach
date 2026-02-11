import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/map-content.tsx", "utf8")

test("imports Polygon from react-leaflet", () => {
  assert.match(source, /import\s+\{[\s\S]*Polygon[\s\S]*\}\s+from\s+"react-leaflet"/)
})

test("imports Tooltip from react-leaflet", () => {
  assert.match(source, /import\s+\{[\s\S]*Tooltip[\s\S]*\}\s+from\s+"react-leaflet"/)
})

test("imports getClusterColor from cluster-colors", () => {
  assert.match(source, /import\s+\{.*getClusterColor.*\}\s+from\s+["']\.\/cluster-colors["']/)
})

test("ClusterBoundary type includes boundary field", () => {
  assert.match(source, /boundary:\s*Array<\{\s*lat:\s*number;\s*lng:\s*number\s*\}>/)
})

test("MapContentProps includes optional clusters prop", () => {
  assert.match(source, /clusters\?:\s*ClusterBoundary\[\]/)
})

test("clusters defaults to empty array", () => {
  assert.match(source, /clusters\s*=\s*\[\]/)
})

test("maps over clusters array to render polygons", () => {
  assert.match(source, /clusters\.filter\(.*\)\.map\(/)
})

test("converts boundary coordinates to positions array", () => {
  assert.match(source, /cluster\.boundary\.map\(/)
  assert.match(source, /\[p\.lat,\s*p\.lng\]/)
})

test("renders Polygon with positions from boundary", () => {
  assert.match(source, /<Polygon/)
  assert.match(source, /positions=\{positions\}/)
})

test("applies semi-transparent fill to cluster polygons", () => {
  assert.match(source, /fillOpacity:\s*0\.15/)
})

test("uses getClusterColor for polygon color", () => {
  assert.match(source, /getClusterColor\(index\)/)
  assert.match(source, /fillColor:\s*color/)
})

test("renders Tooltip with cluster name inside Polygon", () => {
  assert.match(source, /<Tooltip[\s\S]*?>[\s\S]*?\{cluster\.name\}[\s\S]*?<\/Tooltip>/)
})

test("exports ClusterBoundary type", () => {
  assert.match(source, /export\s+type\s+ClusterBoundary/)
})
