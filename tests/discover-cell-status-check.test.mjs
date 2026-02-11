import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("convex/discovery/discoverCell.ts", "utf8")

test("requestDiscoverCell allows unsearched, searched, and saturated statuses", () => {
  assert.match(
    source,
    /cell\.status !== "unsearched" && cell\.status !== "searched" && cell\.status !== "saturated"/,
  )
})

test("requestDiscoverCell error message lists all three allowed statuses", () => {
  assert.match(
    source,
    /expected "unsearched", "searched", or "saturated"/,
  )
})
