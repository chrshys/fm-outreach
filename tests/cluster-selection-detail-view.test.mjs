import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const pageSource = fs.readFileSync("src/app/clusters/page.tsx", "utf8")
const detailSource = fs.readFileSync("src/components/clusters/cluster-detail.tsx", "utf8")
const mapSource = fs.readFileSync("src/components/clusters/cluster-map.tsx", "utf8")

// --- Clusters page wires selection to detail view ---

test("clicking a cluster card sets selectedClusterId state", () => {
  assert.match(pageSource, /onClick=\{\(\) => setSelectedClusterId\(cluster\._id\)\}/)
})

test("conditionally renders ClusterDetail when a cluster is selected", () => {
  assert.match(pageSource, /selectedClusterId \?/)
  assert.match(pageSource, /<ClusterDetail\s+clusterId=\{selectedClusterId\}/)
})

test("shows placeholder when no cluster is selected", () => {
  assert.match(pageSource, /Select a cluster/)
  assert.match(pageSource, /Choose a cluster from the list/)
})

// --- Detail view renders mini-map ---

test("detail view dynamically imports ClusterMap (no SSR)", () => {
  assert.match(detailSource, /const ClusterMap = dynamic\(\(\) => import\("\.\/cluster-map"\), \{ ssr: false \}\)/)
})

test("detail view renders ClusterMap with cluster center and radius", () => {
  assert.match(detailSource, /<ClusterMap/)
  assert.match(detailSource, /centerLat=\{cluster\.centerLat\}/)
  assert.match(detailSource, /centerLng=\{cluster\.centerLng\}/)
  assert.match(detailSource, /radiusKm=\{cluster\.radiusKm\}/)
})

test("detail view passes filtered leads to ClusterMap", () => {
  assert.match(detailSource, /leads=\{/)
  assert.match(detailSource, /\.filter\(/)
  assert.match(detailSource, /latitude/)
  assert.match(detailSource, /longitude/)
})

test("mini-map renders inside a fixed-height container", () => {
  assert.match(detailSource, /h-\[250px\]/)
})

// --- Detail view renders lead table ---

test("detail view fetches leads for the selected cluster", () => {
  assert.match(detailSource, /useQuery\(api\.clusters\.getLeads,\s*\{\s*clusterId\s*\}\)/)
})

test("detail view renders a Table with Name, Status, and Email columns", () => {
  assert.match(detailSource, /<Table>/)
  assert.match(detailSource, /<TableHead>Name<\/TableHead>/)
  assert.match(detailSource, /<TableHead>Status<\/TableHead>/)
  assert.match(detailSource, /<TableHead>Email<\/TableHead>/)
})

test("lead names in table link to lead detail page", () => {
  assert.match(detailSource, /href=\{`\/leads\/\$\{lead\._id\}`\}/)
})

test("each lead row shows a status badge", () => {
  assert.match(detailSource, /<Badge variant="secondary">\{toLabel\(lead\.status\)\}<\/Badge>/)
})

test("each lead row shows email or dash placeholder", () => {
  assert.match(detailSource, /lead\.contactEmail \?\? "—"/)
})

// --- ClusterMap component renders the mini-map correctly ---

test("ClusterMap renders a Leaflet MapContainer with cluster center", () => {
  assert.match(mapSource, /MapContainer/)
  assert.match(mapSource, /center=\{\[centerLat, centerLng\]\}/)
})

test("ClusterMap renders cluster boundary as a Circle", () => {
  assert.match(mapSource, /<Circle/)
  assert.match(mapSource, /radius=\{radiusKm \* 1000\}/)
})

test("ClusterMap renders lead markers as CircleMarkers with status colors", () => {
  assert.match(mapSource, /<CircleMarker/)
  assert.match(mapSource, /getStatusColor\(lead\.status\)/)
})
