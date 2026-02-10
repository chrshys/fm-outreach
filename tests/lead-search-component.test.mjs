import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/leads/lead-search.tsx", "utf8")

test("lead search renders a search input with icon", () => {
  assert.match(source, /import\s+\{\s*Search\s*\}\s+from\s+"lucide-react"/)
  assert.match(source, /import\s+\{\s*Input\s*\}\s+from\s+"@\/components\/ui\/input"/)
  assert.match(source, /placeholder="Search by name or city"/)
  assert.match(source, /className="pl-9"/)
})

test("lead search debounces updates for 300ms", () => {
  assert.match(source, /window\.setTimeout\(\(\)\s*=>\s*\{\s*onChange\(inputValue\)\s*\},\s*300\)/)
  assert.match(source, /window\.clearTimeout\(timeoutId\)/)
})
