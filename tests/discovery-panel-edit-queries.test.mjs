import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const panelSource = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")
const gridCellsSource = fs.readFileSync("convex/discovery/gridCells.ts", "utf8")
const discoverCellSource = fs.readFileSync("convex/discovery/discoverCell.ts", "utf8")

// --- Inline edit state ---

test("has editingQuery state for tracking which query is being edited", () => {
  assert.match(panelSource, /useState<string\s*\|\s*null>\(null\)/)
})

test("has editValue state for the current edit input value", () => {
  assert.match(panelSource, /\[editValue,\s*setEditValue\]\s*=\s*useState\(""\)/)
})

test("has editInputRef for focusing the edit input", () => {
  assert.match(panelSource, /editInputRef\s*=\s*useRef<HTMLInputElement>\(null\)/)
})

// --- handleStartEdit ---

test("handleStartEdit sets editingQuery and editValue", () => {
  assert.match(panelSource, /handleStartEdit\s*=\s*useCallback\(\(query:\s*string\)/)
  assert.match(panelSource, /setEditingQuery\(query\)/)
  assert.match(panelSource, /setEditValue\(query\)/)
})

test("handleStartEdit focuses edit input via ref after timeout", () => {
  assert.match(panelSource, /setTimeout\(\(\)\s*=>\s*editInputRef\.current\?\.focus\(\),\s*0\)/)
})

// --- handleSaveEdit ---

test("handleSaveEdit calls updateGridQueries with mapped queries", () => {
  assert.match(panelSource, /handleSaveEdit\s*=\s*useCallback\(async\s*\(\)/)
  assert.match(panelSource, /selectedGrid\.queries\.map\(\(q\)\s*=>\s*q\s*===\s*editingQuery\s*\?\s*trimmed\s*:\s*q\)/)
})

test("handleSaveEdit skips save when trimmed value is empty or unchanged", () => {
  assert.match(panelSource, /!trimmed\s*\|\|\s*trimmed\s*===\s*editingQuery/)
})

test("handleSaveEdit prevents duplicate queries on edit", () => {
  assert.match(panelSource, /selectedGrid\.queries\.includes\(trimmed\)[\s\S]*?Query already exists/)
})

test("handleSaveEdit clears editingQuery on success", () => {
  // After successful updateGridQueries, editingQuery is set to null
  assert.match(panelSource, /await\s+updateGridQueries\(\{[\s\S]*?\}\)\s*\n\s*setEditingQuery\(null\)/)
})

test("handleSaveEdit shows error toast on failure", () => {
  assert.match(panelSource, /toast\.error\("Failed to update query"\)/)
})

// --- handleCancelEdit ---

test("handleCancelEdit clears editingQuery", () => {
  assert.match(panelSource, /handleCancelEdit\s*=\s*useCallback\(\(\)\s*=>\s*\{\s*\n\s*setEditingQuery\(null\)/)
})

// --- Inline edit UI ---

test("renders inline input when editingQuery matches current query", () => {
  assert.match(panelSource, /editingQuery\s*===\s*query\s*\?/)
})

test("edit input uses editValue and onChange sets editValue", () => {
  assert.match(panelSource, /value=\{editValue\}/)
  assert.match(panelSource, /onChange=\{\(e\)\s*=>\s*setEditValue\(e\.target\.value\)\}/)
})

test("edit input saves on Enter key", () => {
  assert.match(panelSource, /e\.key\s*===\s*"Enter"\)\s*handleSaveEdit\(\)/)
})

test("edit input cancels on Escape key", () => {
  assert.match(panelSource, /e\.key\s*===\s*"Escape"\)\s*handleCancelEdit\(\)/)
})

test("edit input saves on blur", () => {
  assert.match(panelSource, /onBlur=\{handleSaveEdit\}/)
})

test("edit input has aria-label for accessibility", () => {
  assert.match(panelSource, /aria-label=\{`Edit query: \$\{query\}`\}/)
})

test("query text is wrapped in a clickable button that starts editing", () => {
  assert.match(panelSource, /aria-label=\{`Click to edit query: \$\{query\}`\}/)
  assert.match(panelSource, /onClick=\{\(\)\s*=>\s*handleStartEdit\(query\)\}/)
})

// --- Backend persists edits ---

test("updateGridQueries mutation patches grid with new queries array", () => {
  assert.match(gridCellsSource, /export\s+const\s+updateGridQueries\s*=\s*mutation/)
  assert.match(gridCellsSource, /ctx\.db\.patch\(args\.gridId,\s*\{\s*queries:\s*args\.queries\s*\}\)/)
})

// --- discoverCell reads latest queries from grid ---

test("discoverCell fetches grid queries before searching", () => {
  assert.match(discoverCellSource, /queries/)
  assert.match(discoverCellSource, /grid/)
})

test("discoverCell searches all queries in parallel", () => {
  assert.match(discoverCellSource, /Promise\.all\(\s*\n\s*queries\.map\(async\s*\(query\)/)
})
