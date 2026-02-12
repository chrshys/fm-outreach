import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/map-content.tsx", "utf8")

test("MapContentProps includes onSelectVirtualCell with correct signature", () => {
  assert.match(source, /onSelectVirtualCell\?:\s*\(cell:\s*VirtualCell\s*\|\s*null\)\s*=>\s*void/)
})

test("MapContentProps does not include onActivateCell", () => {
  assert.doesNotMatch(source, /onActivateCell/)
})

test("onSelectVirtualCell is destructured in function params", () => {
  const funcMatch = source.match(/export default function MapContent\(\{([^}]+)\}/)
  assert.ok(funcMatch, "should have MapContent function with destructured params")
  assert.ok(funcMatch[1].includes("onSelectVirtualCell"), "onSelectVirtualCell in function params")
})

test("onSelectVirtualCell does not return Promise<string>", () => {
  // The old onActivateCell returned Promise<string>; the new prop returns void
  assert.doesNotMatch(source, /onSelectVirtualCell\?:.*Promise/)
})

test("MapContentProps includes selectedVirtualCell prop", () => {
  assert.match(source, /selectedVirtualCell\?:\s*VirtualCell\s*\|\s*null/)
})

test("selectedVirtualCell is destructured in function params", () => {
  const funcMatch = source.match(/export default function MapContent\(\{([^}]+)\}/)
  assert.ok(funcMatch, "should have MapContent function with destructured params")
  assert.ok(funcMatch[1].includes("selectedVirtualCell"), "selectedVirtualCell in function params")
})

test("passes onSelectVirtualCell to DiscoveryGrid with fallback", () => {
  assert.match(source, /onSelectVirtualCell=\{onSelectVirtualCell\s*\?\?\s*\(\(\)\s*=>\s*\{\}\)\}/)
})

test("passes selectedVirtualCell to DiscoveryGrid with fallback", () => {
  assert.match(source, /selectedVirtualCell=\{selectedVirtualCell\s*\?\?\s*null\}/)
})

test("imports VirtualCell type from @/lib/virtual-grid", () => {
  assert.match(source, /import\s+type\s+\{\s*VirtualCell\s*\}\s+from\s+["']@\/lib\/virtual-grid["']/)
})

test("fallback DiscoveryGrid (virtual-grid-overlay pane) uses onSelectVirtualCell no-op, not onActivateCell", () => {
  // Extract the virtual-grid-overlay branch (the `: cellSizeKm != null && gridId ?` branch)
  const fallbackMatch = source.match(/virtual-grid-overlay[\s\S]*?<DiscoveryGrid([^/]+)\/>/)
  assert.ok(fallbackMatch, "should have a DiscoveryGrid inside virtual-grid-overlay pane")
  const fallbackProps = fallbackMatch[1]
  assert.ok(fallbackProps.includes("onSelectVirtualCell"), "fallback DiscoveryGrid should pass onSelectVirtualCell")
  assert.ok(!fallbackProps.includes("onActivateCell"), "fallback DiscoveryGrid must not use onActivateCell")
  assert.match(fallbackProps, /onSelectVirtualCell=\{.*\(\)\s*=>\s*\{\}.*\}/, "onSelectVirtualCell should be a no-op arrow function")
  assert.match(fallbackProps, /selectedVirtualCell=\{null\}/, "fallback DiscoveryGrid should pass selectedVirtualCell={null}")
})
