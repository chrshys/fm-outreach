import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const mapSource = fs.readFileSync("src/components/clusters/cluster-map.tsx", "utf8")
const detailSource = fs.readFileSync("src/components/clusters/cluster-detail.tsx", "utf8")

test("cluster detail map uses Polygon, not Circle, for boundary", () => {
  assert.match(mapSource, /<Polygon/)
  assert.doesNotMatch(mapSource, /<Circle[\s>]/)
})

test("cluster detail map fits bounds to polygon boundary", () => {
  assert.match(mapSource, /L\.latLngBounds\(positions\)/)
  assert.match(mapSource, /map\.fitBounds\(bounds/)
})

test("cluster detail map does not use radiusKm-based zoom", () => {
  assert.doesNotMatch(mapSource, /radiusKm/)
})

test("cluster detail page does not pass radiusKm to ClusterMap", () => {
  const clusterMapSection = detailSource.slice(
    detailSource.indexOf("<ClusterMap"),
    detailSource.indexOf("/>", detailSource.indexOf("<ClusterMap")) + 2
  )
  assert.doesNotMatch(clusterMapSection, /radiusKm/)
})

test("cluster detail map renders polygon from boundary coordinates", () => {
  assert.match(mapSource, /boundary\.map\(\(p\) => \[p\.lat, p\.lng\]\)/)
  assert.match(mapSource, /positions=\{positions\}/)
})
