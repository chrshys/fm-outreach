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

test("extracts cellSizeKm from the matched grid", () => {
  assert.match(source, /\.cellSizeKm/)
})

test("passes cellSizeKm to MapContent in discovery mode", () => {
  assert.match(source, /cellSizeKm=\{viewMode\s*===\s*"discovery"\s*\?\s*selectedGridCellSizeKm/)
})
