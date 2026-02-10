import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("convex/clusters.ts", "utf8")

test("clusters.ts exports a getLeads query", () => {
  assert.match(source, /export\s+const\s+getLeads\s*=\s*query\(/)
})

test("getLeads accepts a clusterId argument", () => {
  assert.match(source, /clusterId:\s*v\.id\("clusters"\)/)
})

test("getLeads uses by_clusterId index", () => {
  assert.match(source, /withIndex\("by_clusterId"/)
})

test("getLeads queries the leads table", () => {
  assert.match(source, /ctx\.db[\s\S]*?\.query\("leads"\)/)
})
