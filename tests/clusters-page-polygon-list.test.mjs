import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const clustersQuery = fs.readFileSync("convex/clusters.ts", "utf8")
const clustersPage = fs.readFileSync("src/app/clusters/page.tsx", "utf8")
const clusterDetail = fs.readFileSync(
  "src/components/clusters/cluster-detail.tsx",
  "utf8",
)

// --- clusters.list query returns live lead counts ---

test("clusters.list query recalculates leadCount from the by_clusterId index", () => {
  assert.match(
    clustersQuery,
    /withIndex\("by_clusterId"/,
    "Should query leads using the by_clusterId index",
  )
  assert.match(
    clustersQuery,
    /leadCount:\s*leads\.length/,
    "Should set leadCount from actual lead count, not stored value",
  )
})

test("clusters.list returns boundary field for polygon rendering", () => {
  // The list query spreads cluster fields which includes boundary
  assert.match(
    clustersQuery,
    /\.\.\.\s*cluster/,
    "Should spread full cluster document (includes boundary)",
  )
})

// --- Clusters page renders polygon clusters with lead counts ---

test("clusters page calls api.clusters.list query", () => {
  assert.match(clustersPage, /useQuery\(api\.clusters\.list\)/)
})

test("clusters page renders cluster name in CardTitle", () => {
  assert.match(clustersPage, /<CardTitle>\{cluster\.name\}<\/CardTitle>/)
})

test("clusters page renders lead count with Users icon", () => {
  assert.match(clustersPage, /<Users/)
  assert.match(clustersPage, /cluster\.leadCount/)
  assert.match(clustersPage, /leads/)
})

test("clusters page renders radius with MapPin icon and rounding", () => {
  assert.match(clustersPage, /<MapPin/)
  assert.match(
    clustersPage,
    /Math\.round\(cluster\.radiusKm\)/,
    "Should round radiusKm for clean display",
  )
})

test("clusters page does not have auto-generate clusters button", () => {
  assert.doesNotMatch(
    clustersPage,
    /Auto[- ]?[Gg]enerate\s+[Cc]lusters/,
    "Should not contain auto-generate clusters button",
  )
})

test("clusters page has delete button on each cluster card", () => {
  assert.match(clustersPage, /handleDelete/)
  assert.match(clustersPage, /<Trash2/)
})

test("clusters page includes boundary in Cluster type", () => {
  assert.match(
    clustersPage,
    /boundary:\s*Array<\{\s*lat:\s*number;\s*lng:\s*number\s*\}>/,
    "Cluster type should include boundary field for polygon clusters",
  )
})

// --- Cluster detail shows correct polygon cluster info ---

test("cluster detail rounds radiusKm in description text", () => {
  assert.match(
    clusterDetail,
    /Math\.round\(cluster\.radiusKm\).*km radius/,
    "Should round radiusKm in description",
  )
})

test("cluster detail rounds radiusKm in stat card", () => {
  assert.match(
    clusterDetail,
    /Math\.round\(cluster\.radiusKm\).*km/,
    "Should round radiusKm in stat card",
  )
})

test("cluster detail renders cluster map with polygon boundary", () => {
  assert.match(
    clusterDetail,
    /boundary=\{cluster\.boundary\}/,
    "Should pass boundary to ClusterMap component",
  )
})

test("cluster detail shows leads table with names linked to lead detail", () => {
  assert.match(clusterDetail, /\/leads\/\$\{lead\._id\}/)
  assert.match(clusterDetail, /lead\.name/)
})
