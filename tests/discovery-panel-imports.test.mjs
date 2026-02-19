import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/discovery-panel.tsx", "utf8")

// ============================================================
// lucide-react icon imports
// ============================================================

test("imports Play from lucide-react", () => {
  const lucideImport = source.match(/from\s+["']lucide-react["']/)
  assert.ok(lucideImport, "should import from lucide-react")
  const importLine = source.split("\n").find((l) => l.includes("lucide-react"))
  assert.ok(importLine)
  assert.match(importLine, /\bPlay\b/)
})

test("imports Grid2x2Plus from lucide-react", () => {
  const importLine = source.split("\n").find((l) => l.includes("lucide-react"))
  assert.ok(importLine)
  assert.match(importLine, /\bGrid2x2Plus\b/)
})

test("imports Minimize2 from lucide-react", () => {
  const importLine = source.split("\n").find((l) => l.includes("lucide-react"))
  assert.ok(importLine)
  assert.match(importLine, /\bMinimize2\b/)
})

// ============================================================
// discovery-grid-shared type imports
// ============================================================

test("imports CellData type from ./discovery-grid-shared", () => {
  assert.match(source, /import\s+type\s+\{[^}]*\bCellData\b[^}]*\}\s+from\s+["']\.\/discovery-grid-shared["']/)
})

test("imports CellAction type from ./discovery-grid-shared", () => {
  assert.match(source, /import\s+type\s+\{[^}]*\bCellAction\b[^}]*\}\s+from\s+["']\.\/discovery-grid-shared["']/)
})

// ============================================================
// discovery-grid-shared value imports
// ============================================================

test("imports DISCOVERY_MECHANISMS from ./discovery-grid-shared", () => {
  assert.match(source, /import\s+\{[^}]*\bDISCOVERY_MECHANISMS\b[^}]*\}\s+from\s+["']\.\/discovery-grid-shared["']/)
})

test("imports MAX_DEPTH from ./discovery-grid-shared", () => {
  assert.match(source, /import\s+\{[^}]*\bMAX_DEPTH\b[^}]*\}\s+from\s+["']\.\/discovery-grid-shared["']/)
})

test("imports getStatusBadgeColor from ./discovery-grid-shared", () => {
  assert.match(source, /import\s+\{[^}]*\bgetStatusBadgeColor\b[^}]*\}\s+from\s+["']\.\/discovery-grid-shared["']/)
})

test("imports formatRelativeTime from ./discovery-grid-shared", () => {
  assert.match(source, /import\s+\{[^}]*\bformatRelativeTime\b[^}]*\}\s+from\s+["']\.\/discovery-grid-shared["']/)
})
