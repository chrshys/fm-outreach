import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("convex/clusters.ts", "utf8")

test("exports deleteCluster as a public mutation", () => {
  assert.match(source, /export const deleteCluster = mutation\(\{/)
})

test("deleteCluster accepts a clusterId argument", () => {
  // Extract deleteCluster block
  const start = source.indexOf("export const deleteCluster")
  const block = source.slice(start, source.indexOf("export const", start + 1))
  assert.match(block, /clusterId: v\.id\("clusters"\)/)
})

test("deleteCluster fetches the cluster doc and throws if not found", () => {
  const start = source.indexOf("export const deleteCluster")
  const block = source.slice(start, source.indexOf("export const", start + 1))
  assert.match(block, /await ctx\.db\.get\(args\.clusterId\)/)
  assert.match(block, /throw new Error\("Cluster not found"\)/)
})

test("deleteCluster queries leads by the by_clusterId index", () => {
  const start = source.indexOf("export const deleteCluster")
  const block = source.slice(start, source.indexOf("export const", start + 1))
  assert.match(block, /\.withIndex\("by_clusterId"/)
  assert.match(block, /q\.eq\("clusterId", args\.clusterId\)/)
})

test("deleteCluster patches each lead to remove clusterId and update updatedAt", () => {
  const start = source.indexOf("export const deleteCluster")
  const block = source.slice(start, source.indexOf("export const", start + 1))
  assert.match(block, /await ctx\.db\.patch\(lead\._id, \{/)
  assert.match(block, /clusterId: undefined/)
  assert.match(block, /updatedAt: now/)
})

test("deleteCluster logs an activity on each unassigned lead", () => {
  const start = source.indexOf("export const deleteCluster")
  const block = source.slice(start, source.indexOf("export const", start + 1))
  assert.match(block, /await ctx\.db\.insert\("activities"/)
  assert.match(block, /leadId: lead\._id/)
  assert.match(block, /type: "note_added"/)
  assert.match(block, /Unassigned from cluster/)
  assert.match(block, /clusterName: cluster\.name/)
})

test("deleteCluster deletes the cluster doc", () => {
  const start = source.indexOf("export const deleteCluster")
  const block = source.slice(start, source.indexOf("export const", start + 1))
  assert.match(block, /await ctx\.db\.delete\(args\.clusterId\)/)
})

test("deleteCluster returns the count of unassigned leads", () => {
  const start = source.indexOf("export const deleteCluster")
  const block = source.slice(start, source.indexOf("export const", start + 1))
  assert.match(block, /return \{ leadsUnassigned: leads\.length \}/)
})
