import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("convex/clusters.ts", "utf8")

test("exports update as a public mutation", () => {
  assert.match(source, /export const update = mutation\(\{/)
})

test("update accepts clusterId, optional name, and optional radiusKm arguments", () => {
  assert.match(source, /clusterId: v\.id\("clusters"\)/)
  assert.match(source, /name: v\.optional\(v\.string\(\)\)/)
  assert.match(source, /radiusKm: v\.optional\(v\.number\(\)\)/)
})

test("update builds a patch object from provided fields", () => {
  assert.match(source, /const patch: Record<string, string \| number> = \{\}/)
  assert.match(source, /if \(args\.name !== undefined\)/)
  assert.match(source, /patch\.name = args\.name/)
  assert.match(source, /if \(args\.radiusKm !== undefined\)/)
  assert.match(source, /patch\.radiusKm = args\.radiusKm/)
})

test("update only patches when there are fields to update", () => {
  assert.match(source, /if \(Object\.keys\(patch\)\.length > 0\)/)
  assert.match(source, /await ctx\.db\.patch\(args\.clusterId, patch\)/)
})
