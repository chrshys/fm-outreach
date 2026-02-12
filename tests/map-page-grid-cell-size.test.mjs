import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/map/page.tsx", "utf8")

test("queries listGrids to look up cellSizeKm", () => {
  assert.match(source, /useQuery\(api\.discovery\.gridCells\.listGrids\)/)
})

test("finds selected grid from grids result using globalGridId", () => {
  assert.match(source, /\.find\(\(?g\)?\s*=>\s*g\._id\s*===\s*globalGridId\)/)
})

test("derives cellSizeKm variable from the matched grid", () => {
  assert.match(source, /const\s+cellSizeKm\s*=\s*gridsResult\?\.find/)
})

test("passes cellSizeKm directly to MapContent", () => {
  assert.match(source, /cellSizeKm=\{cellSizeKm\}/)
})
