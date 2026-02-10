import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("convex/schema.ts", "utf8")

test("generatedEmails table has optional status field", () => {
  const genEmailSection = source.slice(source.indexOf("generatedEmails:"))
  const nextTable = genEmailSection.indexOf("campaigns:")
  const genEmailDef = genEmailSection.slice(0, nextTable)
  assert.match(genEmailDef, /status:\s*v\.optional\(/)
})

test("generatedEmails status is a union of generated, edited, approved", () => {
  const genEmailSection = source.slice(source.indexOf("generatedEmails:"))
  const nextTable = genEmailSection.indexOf("campaigns:")
  const genEmailDef = genEmailSection.slice(0, nextTable)
  assert.match(genEmailDef, /v\.literal\("generated"\)/)
  assert.match(genEmailDef, /v\.literal\("edited"\)/)
  assert.match(genEmailDef, /v\.literal\("approved"\)/)
})
