import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("convex/clusters.ts", "utf8")

test("exports deleteAllClusters as a public mutation", () => {
  assert.match(source, /export const deleteAllClusters = mutation\(\{/)
})

test("deleteAllClusters takes no arguments", () => {
  // Extract the deleteAllClusters block
  const fnStart = source.indexOf("export const deleteAllClusters = mutation({")
  assert.ok(fnStart !== -1, "deleteAllClusters mutation must exist")
  const argsLine = source.indexOf("args: {},", fnStart)
  assert.ok(argsLine !== -1, "deleteAllClusters must have empty args")
  // Ensure the args line comes before the handler (i.e., is inside this mutation)
  const handlerLine = source.indexOf("handler:", fnStart)
  assert.ok(argsLine < handlerLine, "args must come before handler")
})

test("deleteAllClusters queries and deletes all cluster documents", () => {
  assert.match(source, /ctx\.db\.query\("clusters"\)\.collect\(\)/)
  assert.match(source, /ctx\.db\.delete\(cluster\._id\)/)
})

test("deleteAllClusters queries leads and clears clusterId", () => {
  assert.match(source, /ctx\.db\.query\("leads"\)\.collect\(\)/)
  assert.match(source, /lead\.clusterId !== undefined/)
  assert.match(source, /clusterId: undefined/)
})

test("deleteAllClusters updates lead updatedAt timestamp", () => {
  assert.match(source, /updatedAt: now/)
})

test("deleteAllClusters returns counts of deleted clusters and patched leads", () => {
  assert.match(source, /clustersDeleted:/)
  assert.match(source, /leadsPatched/)
})
