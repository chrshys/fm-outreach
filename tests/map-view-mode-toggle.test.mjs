import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/map/page.tsx", "utf8")

test("declares viewMode state with clusters | discovery type, defaulting to clusters", () => {
  assert.match(source, /useState<"clusters"\s*\|\s*"discovery">\("clusters"\)/)
})

test("imports Grid3X3 icon from lucide-react", () => {
  assert.match(source, /import\s+\{[^}]*Grid3X3[^}]*\}\s+from\s+"lucide-react"/)
})

test("renders Grid3X3 icon in the toggle button", () => {
  assert.match(source, /<Grid3X3\s/)
})

test("toggle button label shows Discovery when in clusters mode and Clusters when in discovery mode", () => {
  assert.match(source, /viewMode\s*===\s*"clusters"\s*\?\s*"Discovery"\s*:\s*"Clusters"/)
})

test("toggle button calls setViewMode toggling between clusters and discovery", () => {
  assert.match(source, /setViewMode\(/)
  assert.match(source, /prev\s*===\s*"clusters"\s*\?\s*"discovery"\s*:\s*"clusters"/)
})

test("Draw Cluster button is conditionally rendered only in clusters mode", () => {
  assert.match(source, /viewMode\s*===\s*"clusters"\s*&&\s*\(/)
  // The Draw Cluster button should be inside the conditional
  assert.match(source, /viewMode\s*===\s*"clusters"\s*&&\s*\(\s*\n\s*<Button[\s\S]*?Draw Cluster/)
})

test("passes empty clusters array to MapContent in discovery mode", () => {
  assert.match(source, /clusters=\{viewMode\s*===\s*"clusters"\s*\?\s*filteredClusters\s*:\s*\[\]\}/)
})

test("toggle button and draw cluster button are in same container div", () => {
  assert.match(source, /className="absolute right-3 top-3 z-10 flex gap-2"/)
})
