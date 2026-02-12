import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const panelSource = fs.readFileSync(
  "src/components/map/discovery-panel.tsx",
  "utf8",
)
const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")

// ============================================================
// DiscoveryPanel accepts selectedVirtualCell prop
// ============================================================

test("DiscoveryPanelProps includes selectedVirtualCell as optional VirtualCell | null", () => {
  assert.match(panelSource, /selectedVirtualCell\?:\s*VirtualCell\s*\|\s*null/)
})

test("panel imports VirtualCell type from virtual-grid", () => {
  assert.match(panelSource, /import\s+type\s+\{\s*VirtualCell\s*\}\s+from\s+["']@\/lib\/virtual-grid["']/)
})

test("DiscoveryPanel destructures selectedVirtualCell from props", () => {
  assert.match(panelSource, /selectedVirtualCell,/)
})

// ============================================================
// Map page passes selectedVirtualCell to DiscoveryPanel
// ============================================================

test("map page passes selectedVirtualCell to DiscoveryPanel", () => {
  assert.match(
    pageSource,
    /<DiscoveryPanel[\s\S]*?selectedVirtualCell=\{selectedVirtualCell\}/,
  )
})

// ============================================================
// Virtual cell section renders when no real cell is selected
// ============================================================

test("panel shows virtual cell section only when selectedCell is absent and selectedVirtualCell is present", () => {
  assert.match(panelSource, /!selectedCell\s*&&\s*selectedVirtualCell/)
})

test("virtual cell section shows 'virtual' status badge", () => {
  // The virtual cell section should display a "virtual" label
  assert.match(panelSource, /virtual/)
})

test("virtual cell section renders Run buttons using DISCOVERY_MECHANISMS", () => {
  // Should iterate DISCOVERY_MECHANISMS in the virtual cell block
  const virtualBlock = panelSource.slice(
    panelSource.indexOf("Selected Virtual Cell"),
    panelSource.indexOf("Selected Cell */"),
  )
  assert.match(virtualBlock, /DISCOVERY_MECHANISMS\.map/)
})

test("virtual cell Run button calls onCellAction with selectedVirtualCell.key", () => {
  assert.match(panelSource, /onCellAction\(selectedVirtualCell\.key,\s*\{\s*type:\s*"search",\s*mechanism:\s*mechanism\.id\s*\}\)/)
})
