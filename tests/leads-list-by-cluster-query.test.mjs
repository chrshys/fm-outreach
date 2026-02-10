import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("convex/leads.ts", "utf8")

test("leads.ts exports a listByCluster query", () => {
  assert.match(source, /export\s+const\s+listByCluster\s*=\s*query\(/)
})

test("listByCluster accepts a clusterId argument", () => {
  assert.match(source, /clusterId:\s*v\.id\("clusters"\)/)
})

test("listByCluster uses by_clusterId index", () => {
  assert.match(source, /withIndex\("by_clusterId"/)
})

test("listByCluster queries the leads table", () => {
  assert.match(source, /ctx\.db[\s\S]*?\.query\("leads"\)[\s\S]*?\.withIndex\("by_clusterId"/)
})

test("listByCluster collects results", () => {
  assert.match(source, /\.withIndex\("by_clusterId"[\s\S]*?\.collect\(\)/)
})
