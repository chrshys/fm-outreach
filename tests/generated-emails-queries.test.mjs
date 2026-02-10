import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("convex/generatedEmails.ts", "utf8")

test("exports listByCampaign query", () => {
  assert.match(source, /export\s+const\s+listByCampaign\s*=\s*query\(/)
})

test("listByCampaign accepts campaignId argument", () => {
  assert.match(source, /campaignId:\s*v\.id\("campaigns"\)/)
})

test("listByCampaign queries by_campaignId index", () => {
  assert.match(source, /\.withIndex\("by_campaignId"/)
})

test("listByCampaign returns lead name and email with each generated email", () => {
  assert.match(source, /leadName:/)
  assert.match(source, /leadEmail:/)
})

test("listByCampaign defaults status to generated", () => {
  assert.match(source, /email\.status\s*\?\?\s*"generated"/)
})

test("exports updateEmail mutation", () => {
  assert.match(source, /export\s+const\s+updateEmail\s*=\s*mutation\(/)
})

test("updateEmail accepts emailId, subject, and body", () => {
  assert.match(source, /emailId:\s*v\.id\("generatedEmails"\)/)
  assert.match(source, /subject:\s*v\.string\(\)/)
  assert.match(source, /body:\s*v\.string\(\)/)
})

test("updateEmail sets status to edited", () => {
  assert.match(source, /status:\s*"edited"/)
})

test("exports updateStatus mutation", () => {
  assert.match(source, /export\s+const\s+updateStatus\s*=\s*mutation\(/)
})

test("updateStatus accepts emailId and status union", () => {
  assert.match(source, /v\.union\([\s\S]*?"generated"[\s\S]*?"edited"[\s\S]*?"approved"/)
})

test("exports regenerate mutation", () => {
  assert.match(source, /export\s+const\s+regenerate\s*=\s*mutation\(/)
})

test("regenerate updates subject, body, status, and generatedAt", () => {
  // Check that regenerate patches all required fields
  const regenerateSection = source.slice(source.indexOf("regenerate = mutation"))
  assert.match(regenerateSection, /subject:\s*args\.subject/)
  assert.match(regenerateSection, /body:\s*args\.body/)
  assert.match(regenerateSection, /status:\s*"generated"/)
  assert.match(regenerateSection, /generatedAt:\s*Date\.now\(\)/)
})
