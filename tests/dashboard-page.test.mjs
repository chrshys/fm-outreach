import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/page.tsx", "utf8")

test("wraps the dashboard page content with AppLayout", () => {
  assert.match(source, /import\s+\{\s*AppLayout\s*\}\s+from\s+"@\/components\/layout\/app-layout"/)
  assert.match(source, /<AppLayout>[\s\S]*<\/AppLayout>/)
})

test("renders dashboard placeholder heading and phase copy", () => {
  assert.match(source, /<h2[^>]*>Dashboard<\/h2>/)
  assert.match(source, /Coming in Phase 10/)
})
