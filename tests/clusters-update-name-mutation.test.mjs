import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("convex/clusters.ts", "utf8")

test("exports updateName as a public mutation", () => {
  assert.match(source, /export const updateName = mutation\(\{/)
})

test("updateName accepts clusterId and name arguments", () => {
  assert.match(source, /clusterId: v\.id\("clusters"\)/)
  assert.match(source, /name: v\.string\(\)/)
})

test("updateName patches the cluster document with new name", () => {
  assert.match(source, /await ctx\.db\.patch\(args\.clusterId, \{ name: args\.name \}\)/)
})
