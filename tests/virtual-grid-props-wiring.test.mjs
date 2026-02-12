import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const mapContentSource = fs.readFileSync("src/components/map/map-content.tsx", "utf8")
const mapPageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")

// ── MapContentProps includes virtual grid fields ──

test("MapContentProps includes cellSizeKm", () => {
  assert.match(mapContentSource, /cellSizeKm\?:\s*number/)
})

test("MapContentProps includes gridId", () => {
  assert.match(mapContentSource, /gridId\?:\s*string/)
})

test("MapContentProps includes activatedBoundsKeys", () => {
  assert.match(mapContentSource, /activatedBoundsKeys\?:\s*string\[\]/)
})

test("MapContentProps includes onActivateCell", () => {
  assert.match(mapContentSource, /onActivateCell\?:.*VirtualCell.*Promise<string>/)
})

// ── MapContent passes virtual grid props to DiscoveryGrid ──

test("MapContent passes cellSizeKm to DiscoveryGrid with default", () => {
  assert.match(mapContentSource, /DiscoveryGrid[\s\S]*cellSizeKm=\{cellSizeKm\s*\?\?\s*20\}/)
})

test("MapContent passes gridId to DiscoveryGrid with default", () => {
  assert.match(mapContentSource, /DiscoveryGrid[\s\S]*gridId=\{gridId\s*\?\?\s*""\}/)
})

test("MapContent passes activatedBoundsKeys to DiscoveryGrid with default", () => {
  assert.match(mapContentSource, /DiscoveryGrid[\s\S]*activatedBoundsKeys=\{activatedBoundsKeys\s*\?\?\s*\[\]\}/)
})

test("MapContent passes onActivateCell to DiscoveryGrid with default", () => {
  assert.match(mapContentSource, /DiscoveryGrid[\s\S]*onActivateCell=\{onActivateCell\s*\?\?/)
})

// ── Map page passes virtual grid props to MapContent ──

test("Map page passes cellSizeKm to MapContent", () => {
  assert.match(mapPageSource, /<MapContent[\s\S]*cellSizeKm=/)
})

test("Map page passes gridId to MapContent", () => {
  assert.match(mapPageSource, /<MapContent[\s\S]*gridId=/)
})

test("Map page passes activatedBoundsKeys to MapContent", () => {
  assert.match(mapPageSource, /<MapContent[\s\S]*activatedBoundsKeys=/)
})

test("Map page passes onActivateCell to MapContent", () => {
  assert.match(mapPageSource, /<MapContent[\s\S]*onActivateCell=/)
})

// ── Map page sets up activateCell mutation and handler ──

test("Map page uses activateCell mutation", () => {
  assert.match(mapPageSource, /useMutation\(api\.discovery\.gridCells\.activateCell\)/)
})

test("Map page extracts activatedBoundsKeys from gridCellsData", () => {
  assert.match(mapPageSource, /gridCellsData\?\.activatedBoundsKeys/)
})
