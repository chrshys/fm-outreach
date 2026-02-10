import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("convex/schema.ts", "utf8")

test("schema defines generatedEmails table", () => {
  assert.match(source, /generatedEmails:\s*defineTable\(/)
})

test("generatedEmails has campaignId field referencing campaigns", () => {
  // Extract the generatedEmails table definition
  const tableMatch = source.match(/generatedEmails:\s*defineTable\(\{([\s\S]*?)\}\)/)
  assert.ok(tableMatch, "generatedEmails table definition should exist")
  const tableDef = tableMatch[1]
  assert.match(tableDef, /campaignId:\s*v\.id\("campaigns"\)/)
})

test("generatedEmails has leadId field referencing leads", () => {
  const tableMatch = source.match(/generatedEmails:\s*defineTable\(\{([\s\S]*?)\}\)/)
  const tableDef = tableMatch[1]
  assert.match(tableDef, /leadId:\s*v\.id\("leads"\)/)
})

test("generatedEmails has templateId field referencing emailTemplates", () => {
  const tableMatch = source.match(/generatedEmails:\s*defineTable\(\{([\s\S]*?)\}\)/)
  const tableDef = tableMatch[1]
  assert.match(tableDef, /templateId:\s*v\.id\("emailTemplates"\)/)
})

test("generatedEmails has subject string field", () => {
  const tableMatch = source.match(/generatedEmails:\s*defineTable\(\{([\s\S]*?)\}\)/)
  const tableDef = tableMatch[1]
  assert.match(tableDef, /subject:\s*v\.string\(\)/)
})

test("generatedEmails has body string field", () => {
  const tableMatch = source.match(/generatedEmails:\s*defineTable\(\{([\s\S]*?)\}\)/)
  const tableDef = tableMatch[1]
  assert.match(tableDef, /body:\s*v\.string\(\)/)
})

test("generatedEmails has generatedAt number field", () => {
  const tableMatch = source.match(/generatedEmails:\s*defineTable\(\{([\s\S]*?)\}\)/)
  const tableDef = tableMatch[1]
  assert.match(tableDef, /generatedAt:\s*v\.number\(\)/)
})

test("generatedEmails has by_campaignId index", () => {
  assert.match(source, /\.index\("by_campaignId",\s*\["campaignId"\]\)/)
})

test("generatedEmails has by_leadId index", () => {
  // There's also a by_leadId on the emails table, so we need to check the generatedEmails context
  const genEmailSection = source.slice(source.indexOf("generatedEmails:"))
  const nextTable = genEmailSection.indexOf("campaigns:")
  const genEmailDef = genEmailSection.slice(0, nextTable)
  assert.match(genEmailDef, /\.index\("by_leadId",\s*\["leadId"\]\)/)
})
