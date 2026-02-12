import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

test("imports VIRTUAL_CELL_STYLE from cell-colors", () => {
  assert.match(source, /VIRTUAL_CELL_STYLE/)
})

test("imports VIRTUAL_CELL_SELECTED_STYLE from cell-colors", () => {
  assert.match(source, /import\s*\{[^}]*VIRTUAL_CELL_SELECTED_STYLE[^}]*\}\s*from\s*["']\.\/cell-colors["']/)
})

test("imports getCellColor from cell-colors", () => {
  assert.match(source, /getCellColor/)
})
