import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("src/app/leads/page.tsx", "utf8")

test("leads page imports and renders bulk actions with selected lead ids", () => {
  assert.match(source, /import\s+\{\s*BulkActions\s*\}\s+from\s+"@\/components\/leads\/bulk-actions"/)
  assert.match(
    source,
    /<BulkActions\s+selectedLeadIds=\{selectedLeadIds\s+as\s+Id<"leads">\[\]\}\s+clusterOptions=\{clusters\}\s+onComplete=\{handleBulkActionComplete\}\s*\/>/s
  )
})

test("bulk action completion clears selection and reloads leads", () => {
  assert.match(source, /const \[reloadToken, setReloadToken\] = useState\(0\)/)
  assert.match(source, /}, \[convex, listArgs, reloadToken\]\)/)
  assert.match(source, /function handleBulkActionComplete\(\)/)
  assert.match(source, /setSelectedLeadIds\(\[\]\)/)
  assert.match(source, /setReloadToken\(\(previous\) => previous \+ 1\)/)
})
