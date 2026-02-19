import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")

test("queries getCellLeadStats from Convex", () => {
  assert.match(source, /useQuery\(\s*api\.discovery\.gridCells\.getCellLeadStats/)
})

test("passes cellId from persistedCell._id when persistedCell exists", () => {
  assert.match(source, /cellId:\s*persistedCell\._id\s+as\s+Id<"discoveryCells">/)
})

test("passes 'skip' when persistedCell is absent", () => {
  assert.match(source, /persistedCell\s*\?\s*\{\s*cellId/)
  assert.match(source, /:\s*"skip"/)
})

test("assigns result to cellLeadStats variable", () => {
  assert.match(source, /const\s+cellLeadStats\s*=\s*useQuery/)
})
