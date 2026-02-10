import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/clusters/page.tsx", "utf8")

test("wraps the clusters page content with AppLayout", () => {
  assert.match(source, /import\s+\{\s*AppLayout\s*\}\s+from\s+"@\/components\/layout\/app-layout"/)
  assert.match(source, /<AppLayout>[\s\S]*<\/AppLayout>/)
})

test("is a client component", () => {
  assert.match(source, /"use client"/)
})

test("fetches clusters with useQuery", () => {
  assert.match(source, /import\s+\{.*useQuery.*\}\s+from\s+"convex\/react"/)
  assert.match(source, /useQuery\(api\.clusters\.list\)/)
})

test("renders two-column grid layout", () => {
  assert.match(source, /grid-cols-\[340px_1fr\]/)
})

test("renders Auto-generate Clusters button", () => {
  assert.match(source, /Auto-generate Clusters/)
  assert.match(source, /<Button/)
})

test("renders cluster cards with name, lead count, and radius", () => {
  assert.match(source, /cluster\.name/)
  assert.match(source, /cluster\.leadCount/)
  assert.match(source, /cluster\.radiusKm/)
})

test("manages selected cluster state", () => {
  assert.match(source, /useState<Id<"clusters"> \| null>\(null\)/)
  assert.match(source, /setSelectedClusterId/)
})

test("shows cluster detail when a cluster is selected", () => {
  assert.match(source, /selectedClusterId \?/)
  assert.match(source, /<ClusterDetail\s+clusterId=\{selectedClusterId\}/)
})

test("shows instruction to select a cluster when none selected", () => {
  assert.match(source, /Select a cluster/)
})

test("imports ClusterDetail from cluster-detail component", () => {
  assert.match(source, /import\s+\{\s*ClusterDetail\s*\}\s+from\s+"@\/components\/clusters\/cluster-detail"/)
})

test("renders loading state for clusters", () => {
  assert.match(source, /Loading clusters/)
})

test("renders empty state when no clusters exist", () => {
  assert.match(source, /No clusters yet/)
})

test("cluster cards are keyboard accessible", () => {
  assert.match(source, /role="button"/)
  assert.match(source, /tabIndex=\{0\}/)
  assert.match(source, /onKeyDown/)
})
