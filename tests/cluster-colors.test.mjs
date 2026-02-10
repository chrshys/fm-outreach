import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/cluster-colors.ts",
  "utf8",
)

test("exports getClusterColor function", () => {
  assert.match(source, /export\s+function\s+getClusterColor/)
})

test("defines CLUSTER_PALETTE array with hex colors", () => {
  assert.match(source, /const\s+CLUSTER_PALETTE\s*=\s*\[/)
})

test("palette contains at least 10 colors", () => {
  const hexMatches = source.match(/"#[0-9a-fA-F]{6}"/g)
  assert.ok(hexMatches, "should contain hex color values")
  assert.ok(hexMatches.length >= 10, `expected >= 10 colors, got ${hexMatches.length}`)
})

test("getClusterColor uses modulo to cycle through palette", () => {
  assert.match(source, /index\s*%\s*CLUSTER_PALETTE\.length/)
})

test("palette includes blue (#3b82f6)", () => {
  assert.match(source, /#3b82f6/)
})

test("palette includes red (#ef4444)", () => {
  assert.match(source, /#ef4444/)
})

test("palette includes green (#22c55e)", () => {
  assert.match(source, /#22c55e/)
})
