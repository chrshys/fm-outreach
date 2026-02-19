import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")

test("queries getGridEnrichmentStats from Convex", () => {
  assert.match(source, /useQuery\(\s*api\.discovery\.gridCells\.getGridEnrichmentStats/)
})

test("passes gridId from globalGridId when it exists", () => {
  assert.match(source, /globalGridId\s*\?\s*\{\s*gridId:\s*globalGridId\s*\}/)
})

test("passes 'skip' when globalGridId is absent", () => {
  assert.match(source, /globalGridId\s*\?\s*\{\s*gridId:\s*globalGridId\s*\}\s*:\s*"skip"/)
})

test("assigns result to gridEnrichmentStats variable", () => {
  assert.match(source, /const\s+gridEnrichmentStats\s*=\s*useQuery/)
})
