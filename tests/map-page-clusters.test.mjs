import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/map/page.tsx", "utf8")

test("passes clusters prop to MapContent", () => {
  assert.match(source, /clusters=\{/)
})

test("maps cluster data with boundary, centerLat, centerLng, radiusKm", () => {
  assert.match(source, /boundary:\s*c\.boundary/)
  assert.match(source, /centerLat:\s*c\.centerLat/)
  assert.match(source, /centerLng:\s*c\.centerLng/)
  assert.match(source, /radiusKm:\s*c\.radiusKm/)
})

test("maps cluster name into the clusters prop", () => {
  assert.match(source, /name:\s*c\.name/)
})
