import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("convex/campaigns.ts", "utf8")

test("campaigns.ts exports a list query", () => {
  assert.match(source, /export\s+const\s+list\s*=\s*query\(/)
})

test("list query takes no arguments", () => {
  assert.match(source, /args:\s*\{\}/)
})

test("list query collects all campaigns", () => {
  assert.match(source, /ctx\.db\.query\("campaigns"\)\.collect\(\)/)
})

test("list query sorts by createdAt descending", () => {
  assert.match(source, /b\.createdAt\s*-\s*a\.createdAt/)
})

test("list query returns name field", () => {
  assert.match(source, /name:\s*c\.name/)
})

test("list query returns status field", () => {
  assert.match(source, /status:\s*c\.status/)
})

test("list query returns leadCount field", () => {
  assert.match(source, /leadCount:\s*c\.leadCount/)
})

test("list query returns stats field", () => {
  assert.match(source, /stats:\s*c\.stats/)
})

test("list query returns smartleadCampaignId field", () => {
  assert.match(source, /smartleadCampaignId:\s*c\.smartleadCampaignId/)
})
