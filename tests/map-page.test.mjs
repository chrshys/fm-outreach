import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/map/page.tsx", "utf8")

test("wraps the map page content with AppLayout", () => {
  assert.match(source, /import\s+\{\s*AppLayout\s*\}\s+from\s+"@\/components\/layout\/app-layout"/)
  assert.match(source, /<AppLayout>[\s\S]*<\/AppLayout>/)
})

test("uses useQuery to fetch leads with coords", () => {
  assert.match(source, /import\s+\{.*useQuery.*\}\s+from\s+"convex\/react"/)
  assert.match(source, /useQuery\(api\.leads\.listWithCoords\)/)
})

test("dynamically imports MapContent with ssr disabled", () => {
  assert.match(source, /import\s+dynamic\s+from\s+"next\/dynamic"/)
  assert.match(source, /dynamic\(/)
  assert.match(source, /ssr:\s*false/)
  assert.match(source, /import\("@\/components\/map\/map-content"\)/)
})

test("renders map container at full height minus topbar", () => {
  assert.match(source, /calc\(100vh/)
})

test("passes leads to MapContent", () => {
  assert.match(source, /<MapContent\s+leads=\{/)
})
