import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("convex/discovery/discoverCell.ts", "utf8")

test("discoverCell passes 'saturated' in expectedStatuses to claimCellForSearch", () => {
  // The expectedStatuses array should include "saturated" so that
  // already-saturated cells can be re-discovered
  assert.match(
    source,
    /expectedStatuses:\s*\["unsearched",\s*"searched",\s*"saturated"\]/,
  )
})

test("requestDiscoverCell allows saturated cells", () => {
  // The mutation guard should accept "saturated" as a valid status
  assert.match(
    source,
    /cell\.status\s*!==\s*"saturated"/,
  )
})
