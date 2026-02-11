import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/map-content.tsx", "utf8")

test("imports Polygon from react-leaflet", () => {
  assert.match(source, /import\s+\{[^}]*Polygon[^}]*\}\s+from\s+"react-leaflet"/)
})

test("imports Tooltip from react-leaflet", () => {
  assert.match(source, /import\s+\{[^}]*Tooltip[^}]*\}\s+from\s+"react-leaflet"/)
})

test("imports getClusterColor from cluster-colors", () => {
  assert.match(source, /import\s+\{.*getClusterColor.*\}\s+from\s+["']\.\/cluster-colors["']/)
})

test("exports ClusterBoundary type", () => {
  assert.match(source, /export\s+type\s+ClusterBoundary/)
})

test("ClusterBoundary type includes centerLat and centerLng", () => {
  assert.match(source, /centerLat:\s*number/)
  assert.match(source, /centerLng:\s*number/)
})

test("ClusterBoundary type includes radiusKm", () => {
  assert.match(source, /radiusKm:\s*number/)
})

test("ClusterBoundary type includes name and boundary", () => {
  const typeMatch = source.match(/export\s+type\s+ClusterBoundary\s*=\s*\{([\s\S]*?)\n\}/)
  assert.ok(typeMatch, "ClusterBoundary type should be defined")
  assert.match(typeMatch[1], /name:\s*string/)
  assert.match(typeMatch[1], /boundary:/)
})

test("MapContentProps accepts optional clusters prop", () => {
  assert.match(source, /clusters\??:\s*ClusterBoundary\[\]/)
})

test("renders Polygon elements for each cluster", () => {
  assert.match(source, /clusters\.map\(/)
  assert.match(source, /<Polygon/)
})

test("Polygon positions come from cluster boundary", () => {
  assert.match(source, /cluster\.boundary\.map\(/)
})

test("Polygon has semi-transparent fill (fillOpacity < 0.5)", () => {
  const polygonSection = source.match(/<Polygon[\s\S]*?<\/Polygon>/g)
  assert.ok(polygonSection, "should have Polygon elements")
  const fillOpacityMatch = polygonSection[0].match(/fillOpacity:\s*([\d.]+)/)
  assert.ok(fillOpacityMatch, "should have fillOpacity")
  const opacity = parseFloat(fillOpacityMatch[1])
  assert.ok(opacity < 0.5, `fillOpacity ${opacity} should be < 0.5 for semi-transparency`)
})

test("Polygon color comes from getClusterColor", () => {
  assert.match(source, /getClusterColor\(index\)/)
})

test("Tooltip shows cluster name", () => {
  assert.match(source, /<Tooltip[\s\S]*?cluster\.name[\s\S]*?<\/Tooltip>/)
})

test("cluster boundaries render before lead markers (z-order)", () => {
  const circlePos = source.indexOf("clusters.map(")
  const markerPos = source.indexOf("leads.map(")
  assert.ok(circlePos >= 0, "should have clusters.map")
  assert.ok(markerPos >= 0, "should have leads.map")
  assert.ok(circlePos < markerPos, "clusters should render before leads for proper z-order")
})
