import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("convex/discovery/gridCells.ts", "utf8")

test("subdivideCell blocks subdividing when cell status is searching", () => {
  assert.match(source, /if \(cell\.status === "searching"\)/)
  assert.match(source, /throw new ConvexError\("Cannot subdivide while cell is being searched"\)/)
})

test("subdivideCell does NOT require saturated status", () => {
  assert.doesNotMatch(source, /cell\.status !== "saturated"/)
  assert.doesNotMatch(source, /Cell must be saturated before subdividing/)
})

test("subdivideCell allows unsearched, searched, and saturated cells", () => {
  // The guard only blocks "searching" — all other statuses pass through
  // Verify no other status checks exist in the subdivideCell function
  const fnMatch = source.match(/export const subdivideCell = mutation\(\{[\s\S]*?\n\}\);/)
  assert.ok(fnMatch, "subdivideCell mutation should exist")
  const fnBody = fnMatch[0]

  // Only "searching" status should be blocked
  assert.match(fnBody, /cell\.status === "searching"/)

  // No other status equality/inequality checks besides "searching"
  const statusChecks = fnBody.match(/cell\.status\s*[!=]==?\s*"/g) || []
  assert.equal(statusChecks.length, 1, "Should have exactly one status check (for searching)")
})
