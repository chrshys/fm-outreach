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
