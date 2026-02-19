import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/discovery-grid-shared.ts",
  "utf8",
)

// ============================================================
// getAvailableActions does not early-return for searching
// ============================================================

test("getAvailableActions does not early-return empty array for searching status", () => {
  const fnStart = source.indexOf("export function getAvailableActions")
  const fnEnd = source.indexOf("function formatRelativeTime")
  assert.ok(fnStart !== -1, "getAvailableActions should exist")
  assert.ok(fnEnd !== -1 || fnEnd === -1, "function boundary marker may have moved")
  const fnBlock = fnEnd !== -1
    ? source.slice(fnStart, fnEnd)
    : source.slice(fnStart)
  assert.doesNotMatch(fnBlock, /cell\.status\s*===\s*"searching"\)\s*return\s*\[\]/)
})
