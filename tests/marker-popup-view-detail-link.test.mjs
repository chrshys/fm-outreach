import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const popupSource = fs.readFileSync("src/components/map/marker-popup.tsx", "utf8")
const mapContentSource = fs.readFileSync("src/components/map/map-content.tsx", "utf8")

test("View Detail link renders as an anchor to /leads/[id]", () => {
  assert.match(popupSource, /href=\{`\/leads\/\$\{id\}`\}/)
})

test("View Detail link text is present", () => {
  assert.match(popupSource, />\s*View Detail\s*</)
})

test("View Detail link uses Next.js Link component", () => {
  assert.match(popupSource, /<Link\s/)
  assert.match(popupSource, /import\s+Link\s+from\s+["']next\/link["']/)
})

test("MarkerPopup receives id prop from map-content", () => {
  assert.match(mapContentSource, /id=\{lead\._id\}/)
})

test("MarkerPopup id prop is typed as string", () => {
  assert.match(popupSource, /id:\s*string/)
})

test("View Detail link has accessible styling for visibility", () => {
  assert.match(popupSource, /text-primary/)
  assert.match(popupSource, /hover:underline/)
})
