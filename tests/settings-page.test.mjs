import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/settings/page.tsx", "utf8")

test("wraps the settings page content with AppLayout", () => {
  assert.match(source, /import\s+\{\s*AppLayout\s*\}\s+from\s+"@\/components\/layout\/app-layout"/)
  assert.match(source, /<AppLayout>[\s\S]*<\/AppLayout>/)
})

test("renders settings placeholder heading and phase copy", () => {
  assert.match(source, /<h2[^>]*>Settings<\/h2>/)
  assert.match(source, /Coming in Phase 5/)
})
