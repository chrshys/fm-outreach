import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("convex/emailTemplates.ts", "utf8")

test("emailTemplates.ts exports a list query", () => {
  assert.match(source, /export\s+const\s+list\s*=\s*query\(/)
})

test("list query takes no arguments", () => {
  assert.match(source, /args:\s*\{\}/)
})

test("list query collects all emailTemplates", () => {
  assert.match(source, /ctx\.db\.query\("emailTemplates"\)\.collect\(\)/)
})

test("defines SEQUENCE_ORDER with correct sequence types in order", () => {
  assert.match(
    source,
    /SEQUENCE_ORDER\s*=\s*\["initial",\s*"follow_up_1",\s*"follow_up_2",\s*"follow_up_3"\]/,
  )
})

test("sorts templates by sequenceType using SEQUENCE_ORDER", () => {
  assert.match(source, /\.sort\(/)
  assert.match(source, /SEQUENCE_ORDER\.indexOf\(a\.sequenceType\)/)
  assert.match(source, /SEQUENCE_ORDER\.indexOf\(b\.sequenceType\)/)
})

test("imports query from convex server", () => {
  assert.match(source, /import\s*\{.*query.*\}\s*from\s*["']\.\/(_generated\/)?server["']/)
})
