import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/map-content.tsx", "utf8")

test("lead markers render after DiscoveryGrid so they appear on top", () => {
  const gridPos = source.indexOf("<DiscoveryGrid")
  const circleMarkerPos = source.indexOf("<CircleMarker")

  assert.ok(gridPos >= 0, "DiscoveryGrid should exist in source")
  assert.ok(circleMarkerPos >= 0, "CircleMarker should exist in source")
  assert.ok(
    gridPos < circleMarkerPos,
    "DiscoveryGrid should render before CircleMarker so leads appear on top of grid cells",
  )
})

test("lead markers render after cluster Polygons so they appear on top of clusters", () => {
  const polygonPos = source.indexOf("<Polygon")
  const circleMarkerPos = source.indexOf("<CircleMarker")

  assert.ok(polygonPos >= 0, "Polygon should exist in source")
  assert.ok(circleMarkerPos >= 0, "CircleMarker should exist in source")
  assert.ok(
    polygonPos < circleMarkerPos,
    "Cluster Polygon should render before CircleMarker so leads appear on top",
  )
})

test("leads are always passed to MapContent regardless of viewMode", () => {
  const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")
  // leads prop is not conditionally set based on viewMode
  assert.match(pageSource, /leads=\{filteredLeads\}/)
  // Verify filteredLeads is not wrapped in a viewMode conditional
  assert.doesNotMatch(
    pageSource,
    /leads=\{viewMode\s*===\s*"clusters"\s*\?/,
    "leads should not be conditional on viewMode — they show in both modes",
  )
})

test("leads.map renders CircleMarker unconditionally in MapContent", () => {
  // The leads.map block should NOT be wrapped in a viewMode or gridCells conditional
  // It should always render when leads are provided
  assert.match(source, /\{leads\.map\(\(lead\)/)
  // Verify there's no conditional wrapping the leads rendering
  // The leads.map should come right after the grid block with no intermediate conditions
  const leadsMapPos = source.indexOf("{leads.map((lead)")
  const linesBefore = source.substring(Math.max(0, leadsMapPos - 100), leadsMapPos)
  assert.doesNotMatch(
    linesBefore,
    /viewMode\s*===\s*"clusters"/,
    "lead markers should not be conditional on viewMode in MapContent",
  )
})
