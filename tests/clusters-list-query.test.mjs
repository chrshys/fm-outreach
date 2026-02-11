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

test("list query returns boundary field via cluster spread", () => {
  // The spread { ...cluster, leadCount } includes all cluster fields.
  // Verify the spread is used so boundary (a schema field) is passed through.
  assert.match(source, /\{\s*\.\.\.cluster/)
})

test("clusters schema includes boundary field", () => {
  const schema = fs.readFileSync("convex/schema.ts", "utf8")
  assert.match(schema, /boundary:\s*v\.array\(v\.object\(\{\s*lat:\s*v\.number\(\),\s*lng:\s*v\.number\(\)\s*\}\)\)/)
})
