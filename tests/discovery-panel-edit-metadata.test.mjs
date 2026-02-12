import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const panelSource = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")
const gridCellsSource = fs.readFileSync("convex/discovery/gridCells.ts", "utf8")

// --- Inline field edit state ---

test("has editingField state for tracking which metadata field is being edited", () => {
  assert.match(panelSource, /\[editingField,\s*setEditingField\]\s*=\s*useState<"region"\s*\|\s*"province"\s*\|\s*null>\(null\)/)
})

test("has fieldEditValue state for the current field edit input value", () => {
  assert.match(panelSource, /\[fieldEditValue,\s*setFieldEditValue\]\s*=\s*useState\(""\)/)
})

test("has fieldEditInputRef for focusing the field edit input", () => {
  assert.match(panelSource, /fieldEditInputRef\s*=\s*useRef<HTMLInputElement>\(null\)/)
})

// --- updateGridMetadata mutation ---

test("uses updateGridMetadata mutation from Convex", () => {
  assert.match(panelSource, /useMutation\(api\.discovery\.gridCells\.updateGridMetadata\)/)
})

test("updateGridMetadata mutation is exported from gridCells", () => {
  assert.match(gridCellsSource, /export\s+const\s+updateGridMetadata\s*=\s*mutation/)
})

test("updateGridMetadata accepts optional region and province", () => {
  assert.match(gridCellsSource, /region:\s*v\.optional\(v\.string\(\)\)/)
  assert.match(gridCellsSource, /province:\s*v\.optional\(v\.string\(\)\)/)
})

test("updateGridMetadata patches grid with provided fields", () => {
  assert.match(gridCellsSource, /ctx\.db\.patch\(args\.gridId,\s*patch\)/)
})

test("updateGridMetadata throws if grid not found", () => {
  assert.match(gridCellsSource, /updateGridMetadata[\s\S]*?Grid not found/)
})

// --- handleStartFieldEdit ---

test("handleStartFieldEdit sets editingField and fieldEditValue", () => {
  assert.match(panelSource, /handleStartFieldEdit\s*=\s*useCallback\(\(field:\s*"region"\s*\|\s*"province"/)
  assert.match(panelSource, /setEditingField\(field\)/)
  assert.match(panelSource, /setFieldEditValue\(currentValue\)/)
})

test("handleStartFieldEdit focuses field edit input via ref after timeout", () => {
  assert.match(panelSource, /setTimeout\(\(\)\s*=>\s*fieldEditInputRef\.current\?\.focus\(\),\s*0\)/)
})

// --- handleSaveFieldEdit ---

test("handleSaveFieldEdit calls updateGridMetadata", () => {
  assert.match(panelSource, /handleSaveFieldEdit\s*=\s*useCallback\(async\s*\(\)/)
  assert.match(panelSource, /await\s+updateGridMetadata\(/)
})

test("handleSaveFieldEdit skips save when trimmed value is empty or unchanged", () => {
  assert.match(panelSource, /!trimmed\s*\|\|\s*trimmed\s*===\s*selectedGrid\[editingField\]/)
})

test("handleSaveFieldEdit clears editingField on success", () => {
  assert.match(panelSource, /await\s+updateGridMetadata\(\{[\s\S]*?\}\)\s*\n\s*setEditingField\(null\)/)
})

test("handleSaveFieldEdit shows error toast on failure", () => {
  assert.match(panelSource, /toast\.error\(`Failed to update \$\{editingField\}`\)/)
})

// --- handleCancelFieldEdit ---

test("handleCancelFieldEdit clears editingField", () => {
  assert.match(panelSource, /handleCancelFieldEdit\s*=\s*useCallback\(\(\)\s*=>\s*\{\s*\n\s*setEditingField\(null\)/)
})

// --- Settings section UI ---

test("renders Settings section when selectedGrid exists", () => {
  assert.match(panelSource, /Settings/)
})

test("renders Region label and editable value", () => {
  assert.match(panelSource, /Region/)
  assert.match(panelSource, /selectedGrid\.region/)
})

test("renders Province label and editable value", () => {
  assert.match(panelSource, /Province/)
  assert.match(panelSource, /selectedGrid\.province/)
})

test("region edit input has aria-label for accessibility", () => {
  assert.match(panelSource, /aria-label="Edit region"/)
})

test("province edit input has aria-label for accessibility", () => {
  assert.match(panelSource, /aria-label="Edit province"/)
})

test("region text button has click-to-edit aria-label", () => {
  assert.match(panelSource, /aria-label="Click to edit region"/)
})

test("province text button has click-to-edit aria-label", () => {
  assert.match(panelSource, /aria-label="Click to edit province"/)
})

test("region edit input saves on Enter and cancels on Escape", () => {
  // The region section should have Enter/Escape handlers
  assert.match(panelSource, /editingField\s*===\s*"region"[\s\S]*?handleSaveFieldEdit/)
  assert.match(panelSource, /editingField\s*===\s*"region"[\s\S]*?handleCancelFieldEdit/)
})

test("province edit input saves on Enter and cancels on Escape", () => {
  assert.match(panelSource, /editingField\s*===\s*"province"[\s\S]*?handleSaveFieldEdit/)
  assert.match(panelSource, /editingField\s*===\s*"province"[\s\S]*?handleCancelFieldEdit/)
})

test("field edit inputs save on blur", () => {
  assert.match(panelSource, /onBlur=\{handleSaveFieldEdit\}/)
})

test("Settings section appears before Progress section", () => {
  const settingsIndex = panelSource.indexOf("{/* Settings */}")
  const progressIndex = panelSource.indexOf("{/* Progress Stats */}")
  assert.ok(settingsIndex > -1, "Settings comment exists")
  assert.ok(progressIndex > -1, "Progress Stats comment exists")
  assert.ok(settingsIndex < progressIndex, "Settings section appears before Progress")
})
