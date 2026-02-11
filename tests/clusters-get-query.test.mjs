import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("convex/clusters.ts", "utf8")

test("clusters.ts exports a get query", () => {
  assert.match(source, /export\s+const\s+get\s*=\s*query\(/)
})

test("get query accepts a clusterId argument", () => {
  assert.match(source, /clusterId:\s*v\.id\("clusters"\)/)
})

test("get query fetches a single cluster by id", () => {
  assert.match(source, /ctx\.db\.get\(args\.clusterId\)/)
})
