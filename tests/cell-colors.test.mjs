import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/cell-colors.ts",
  "utf8",
)

test("exports getCellColor function", () => {
  assert.match(source, /export\s+function\s+getCellColor/)
})

test("exports CellStatus type", () => {
  assert.match(source, /export\s+type\s+CellStatus/)
})

test("maps unsearched to gray (#9ca3af)", () => {
  assert.match(source, /unsearched.*#9ca3af/)
})

test("maps searching to blue (#3b82f6)", () => {
  assert.match(source, /searching.*#3b82f6/)
})

test("maps searched to green (#22c55e)", () => {
  assert.match(source, /searched.*#22c55e/)
})

test("maps saturated to orange (#f97316)", () => {
  assert.match(source, /saturated.*#f97316/)
})

test("getCellColor returns object with color, fillColor, fillOpacity", () => {
  assert.match(source, /color:\s*"#/)
  assert.match(source, /fillColor:\s*"#/)
  assert.match(source, /fillOpacity:\s*\d/)
})

test("covers all 4 cell statuses", () => {
  const statuses = ["unsearched", "searching", "searched", "saturated"]
  for (const status of statuses) {
    assert.match(source, new RegExp(`${status}:`), `missing status: ${status}`)
  }
})

test("getCellColor returns a default for unknown status", () => {
  assert.match(source, /\?\?\s*DEFAULT_CELL_COLOR/)
})

test("exports VIRTUAL_CELL_STYLE constant", () => {
  assert.match(source, /export\s+const\s+VIRTUAL_CELL_STYLE/)
})

test("VIRTUAL_CELL_STYLE uses faint gray (#d1d5db)", () => {
  assert.match(source, /VIRTUAL_CELL_STYLE[\s\S]*?color:\s*"#d1d5db"/)
  assert.match(source, /VIRTUAL_CELL_STYLE[\s\S]*?fillColor:\s*"#d1d5db"/)
})

test("VIRTUAL_CELL_STYLE has low fillOpacity (0.05)", () => {
  assert.match(source, /VIRTUAL_CELL_STYLE[\s\S]*?fillOpacity:\s*0\.05/)
})

test("VIRTUAL_CELL_STYLE has thin weight (0.5)", () => {
  assert.match(source, /VIRTUAL_CELL_STYLE[\s\S]*?weight:\s*0\.5/)
})
