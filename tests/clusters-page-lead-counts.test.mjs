import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const clustersQuery = fs.readFileSync("convex/clusters.ts", "utf8")
const clustersPage = fs.readFileSync("src/app/clusters/page.tsx", "utf8")
const clusterDetail = fs.readFileSync("src/components/clusters/cluster-detail.tsx", "utf8")

test("clusters list query returns live lead count per cluster", () => {
  // The list query should query leads by clusterId index and return actual count
  assert.match(clustersQuery, /withIndex\("by_clusterId",\s*\(q\)\s*=>\s*q\.eq\("clusterId",\s*cluster\._id\)\)/)
  assert.match(clustersQuery, /leadCount:\s*leads\.length/)
})

test("clusters list query uses Promise.all for parallel count computation", () => {
  assert.match(clustersQuery, /Promise\.all\(/)
  assert.match(clustersQuery, /clusters\.map\(async/)
})

test("clusters page displays lead count from query data", () => {
  assert.match(clustersPage, /cluster\.leadCount/)
  assert.match(clustersPage, /leads/)
})

test("clusters page shows lead count with Users icon", () => {
  assert.match(clustersPage, /import\s+\{.*Users.*\}\s+from\s+"lucide-react"/)
  assert.match(clustersPage, /<Users/)
})

test("cluster detail shows lead count in stat card", () => {
  assert.match(clusterDetail, /cluster\.leadCount/)
  assert.match(clusterDetail, /<CardDescription>Leads<\/CardDescription>/)
})

test("cluster detail description text includes lead count", () => {
  assert.match(clusterDetail, /cluster\.leadCount.*leads within/)
})
