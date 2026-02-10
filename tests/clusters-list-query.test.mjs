import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("convex/clusters.ts", "utf8")

test("clusters.ts exports a list query", () => {
  assert.match(source, /export\s+const\s+list\s*=\s*query\(/)
})

test("list query collects all clusters", () => {
  assert.match(source, /ctx\.db\.query\("clusters"\)\.collect\(\)/)
})

test("list query takes no arguments", () => {
  assert.match(source, /args:\s*\{\}/)
})

test("list query computes live lead counts from leads table", () => {
  assert.match(source, /\.query\("leads"\)/)
  assert.match(source, /\.withIndex\("by_clusterId"/)
  assert.match(source, /leadCount:\s*leads\.length/)
})
