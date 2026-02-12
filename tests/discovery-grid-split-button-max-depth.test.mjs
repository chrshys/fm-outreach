import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const sharedSource = fs.readFileSync(
  "src/components/map/discovery-grid-shared.ts",
  "utf8",
)

const panelSource = fs.readFileSync(
  "src/components/map/discovery-panel.tsx",
  "utf8",
)

// ============================================================
// MAX_DEPTH constant is defined
// ============================================================

test("MAX_DEPTH is defined as 4", () => {
  assert.match(sharedSource, /const\s+MAX_DEPTH\s*=\s*4/)
})

// ============================================================
// getAvailableActions uses MAX_DEPTH for subdivide guard
// ============================================================

test("getAvailableActions guards subdivide with depth < MAX_DEPTH", () => {
  const fnBlock = sharedSource.slice(
    sharedSource.indexOf("export function getAvailableActions"),
    sharedSource.indexOf("export function formatShortDate"),
  )
  assert.match(fnBlock, /cell\.depth\s*<\s*MAX_DEPTH/)
  assert.match(fnBlock, /\{\s*type:\s*"subdivide"\s*\}/)
})

// ============================================================
// Panel split button disables at MAX_DEPTH
// ============================================================

test("panel imports MAX_DEPTH from discovery-grid-shared", () => {
  assert.match(panelSource, /import\s+\{[^}]*MAX_DEPTH[^}]*\}\s+from\s+["']\.\/discovery-grid-shared["']/)
})

test("panel split button disabled when depth >= MAX_DEPTH", () => {
  assert.match(panelSource, /selectedCell\.depth\s*>=\s*MAX_DEPTH/)
})

test("panel split button dispatches subdivide action", () => {
  assert.match(panelSource, /onCellAction\(selectedCell\._id,\s*\{\s*type:\s*"subdivide"\s*\}\)/)
})
