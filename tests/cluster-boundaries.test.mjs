import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/map-content.tsx", "utf8")

test("imports Circle from react-leaflet", () => {
  assert.match(source, /import\s+\{[^}]*Circle[^M][^}]*\}\s+from\s+"react-leaflet"/)
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

test("ClusterBoundary type includes name", () => {
  // Check within the ClusterBoundary type definition
  const typeMatch = source.match(/export\s+type\s+ClusterBoundary\s*=\s*\{([^}]+)\}/)
  assert.ok(typeMatch, "ClusterBoundary type should be defined")
  assert.match(typeMatch[1], /name:\s*string/)
})

test("MapContentProps accepts optional clusters prop", () => {
  assert.match(source, /clusters\??:\s*ClusterBoundary\[\]/)
})

test("renders Circle elements for each cluster", () => {
  assert.match(source, /clusters\.map\(/)
  assert.match(source, /<Circle/)
})

test("Circle uses centerLat and centerLng for position", () => {
  assert.match(source, /center=\{\[cluster\.centerLat,\s*cluster\.centerLng\]/)
})

test("Circle radius converts radiusKm to meters (* 1000)", () => {
  assert.match(source, /radius=\{cluster\.radiusKm\s*\*\s*1000\}/)
})

test("Circle has semi-transparent fill (fillOpacity < 0.5)", () => {
  const circleSection = source.match(/<Circle[\s\S]*?<\/Circle>/g)
  assert.ok(circleSection, "should have Circle elements")
  const fillOpacityMatch = circleSection[0].match(/fillOpacity:\s*([\d.]+)/)
  assert.ok(fillOpacityMatch, "should have fillOpacity")
  const opacity = parseFloat(fillOpacityMatch[1])
  assert.ok(opacity < 0.5, `fillOpacity ${opacity} should be < 0.5 for semi-transparency`)
})

test("Circle color comes from getClusterColor", () => {
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
