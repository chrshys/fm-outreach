import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/map/page.tsx", "utf8")

// Extract the subdivide branch of handleCellAction
function extractActionBranch(actionType) {
  const re = new RegExp(
    `if \\(action\\.type === "${actionType}"\\) \\{([\\s\\S]*?)\\n    \\}`,
  )
  const m = source.match(re)
  assert.ok(m, `should have an action.type === "${actionType}" branch`)
  return m[1]
}

test("subdivide branch calls setSelectedCellId(null) after success toast", () => {
  const branch = extractActionBranch("subdivide")
  const toastIdx = branch.indexOf('toast.success("Cell subdivided')
  const clearIdx = branch.indexOf("setSelectedCellId(null)")
  assert.ok(toastIdx !== -1, "should have a success toast for subdivide")
  assert.ok(clearIdx !== -1, "should call setSelectedCellId(null) after subdivide")
  assert.ok(
    clearIdx > toastIdx,
    "setSelectedCellId(null) should come after the success toast",
  )
})

test("undivide branch calls setSelectedCellId(null) after success toast", () => {
  const branch = extractActionBranch("undivide")
  const toastIdx = branch.indexOf('toast.success("Cell merged')
  const clearIdx = branch.indexOf("setSelectedCellId(null)")
  assert.ok(toastIdx !== -1, "should have a success toast for undivide")
  assert.ok(clearIdx !== -1, "should call setSelectedCellId(null) after undivide")
  assert.ok(
    clearIdx > toastIdx,
    "setSelectedCellId(null) should come after the success toast",
  )
})

test("search branch does NOT call setSelectedCellId(null)", () => {
  const branch = extractActionBranch("search")
  assert.ok(
    !branch.includes("setSelectedCellId"),
    "search branch should not clear selection",
  )
})
