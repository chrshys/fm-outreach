import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("convex/campaigns.ts", "utf8")

test("campaigns.ts exports a create mutation", () => {
  assert.match(source, /export\s+const\s+create\s*=\s*mutation\(/)
})

test("create accepts name as a string argument", () => {
  assert.match(source, /name:\s*v\.string\(\)/)
})

test("create accepts templateIds as an array of emailTemplates ids", () => {
  assert.match(source, /templateIds:\s*v\.array\(v\.id\("emailTemplates"\)\)/)
})

test("create accepts optional targetClusterId argument", () => {
  assert.match(source, /targetClusterId:\s*v\.optional\(v\.id\("clusters"\)\)/)
})

test("create accepts optional targetFilter argument", () => {
  assert.match(source, /targetFilter:\s*v\.optional\(v\.any\(\)\)/)
})

test("create accepts leadCount as a number argument", () => {
  assert.match(source, /leadCount:\s*v\.number\(\)/)
})

test("create sets status to draft", () => {
  assert.match(source, /status:\s*"draft"/)
})

test("create inserts into campaigns table", () => {
  assert.match(source, /ctx\.db\.insert\("campaigns"/)
})

test("create sets createdAt timestamp", () => {
  assert.match(source, /createdAt:\s*now/)
})

test("create sets updatedAt timestamp", () => {
  assert.match(source, /updatedAt:\s*now/)
})

test("create returns the inserted campaign id", () => {
  assert.match(source, /return\s+ctx\.db\.insert\(/)
})
