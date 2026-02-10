import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("convex/seeds/seedTemplates.ts", "utf8")

// module structure
test("exports seedTemplates as an internalMutation", () => {
  assert.match(source, /export const seedTemplates = internalMutation\(\{/)
})

test("exports defaultTemplates array", () => {
  assert.match(source, /export const defaultTemplates = \[/)
})

test("imports internalMutation from _generated/server", () => {
  assert.match(source, /import\s*\{[\s\S]*?internalMutation[\s\S]*?\}\s*from\s*"\.\.\/\_generated\/server"/)
})

// template count
test("defines exactly 4 default templates", () => {
  const matches = source.match(/sequenceType:\s*"(initial|follow_up_1|follow_up_2|follow_up_3)"/g)
  assert.equal(matches.length, 4)
})

// template 1 — initial
test("template 1 is initial cold intro", () => {
  assert.match(source, /name:\s*"Cold Intro — Farm"/)
  assert.match(source, /sequenceType:\s*"initial"/)
})

test("initial template has subject with farmName placeholder", () => {
  // subject line should contain {{farmName}}
  assert.match(source, /sequenceType:\s*"initial"[\s\S]*?subject:[\s\S]*?\{\{farmName\}\}/)
})

// template 2 — follow_up_1
test("template 2 is follow-up 1 with social proof angle", () => {
  assert.match(source, /name:\s*"Follow-up 1 — Social Proof"/)
  assert.match(source, /sequenceType:\s*"follow_up_1"/)
})

test("follow_up_1 prompt mentions social proof", () => {
  assert.match(source, /sequenceType:\s*"follow_up_1"[\s\S]*?social proof/i)
})

// template 3 — follow_up_2
test("template 3 is follow-up 2 quick check-in", () => {
  assert.match(source, /name:\s*"Follow-up 2 — Quick Check-in"/)
  assert.match(source, /sequenceType:\s*"follow_up_2"/)
})

test("follow_up_2 prompt offers to help", () => {
  assert.match(source, /sequenceType:\s*"follow_up_2"[\s\S]*?help/i)
})

// template 4 — follow_up_3
test("template 4 is follow-up 3 breakup email", () => {
  assert.match(source, /name:\s*"Follow-up 3 — Breakup"/)
  assert.match(source, /sequenceType:\s*"follow_up_3"/)
})

test("follow_up_3 prompt leaves door open", () => {
  assert.match(source, /sequenceType:\s*"follow_up_3"[\s\S]*?door open/i)
})

// all templates are default
test("all 4 templates have isDefault: true", () => {
  const matches = source.match(/isDefault:\s*true/g)
  assert.equal(matches.length, 4)
})

// placeholders present in all prompts
const placeholders = [
  "{{farmName}}",
  "{{products}}",
  "{{salesChannels}}",
  "{{city}}",
  "{{contactName}}",
  "{{farmDescription}}",
  "{{sellsOnline}}",
  "{{socialLinks}}",
]

for (const placeholder of placeholders) {
  test(`all prompts contain placeholder ${placeholder}`, () => {
    // Each template prompt should contain this placeholder
    const escaped = placeholder.replace(/[{}]/g, "\\$&")
    const regex = new RegExp(escaped, "g")
    const matches = source.match(regex)
    // 4 templates, each should have the placeholder
    assert.ok(matches, `placeholder ${placeholder} not found`)
    assert.ok(matches.length >= 4, `expected ${placeholder} in all 4 templates, found ${matches.length}`)
  })
}

// word count guidelines in prompts
test("initial template specifies 50-125 word range", () => {
  assert.match(source, /sequenceType:\s*"initial"[\s\S]*?50-125 words/)
})

test("follow_up_1 template specifies 50-125 word range", () => {
  assert.match(source, /sequenceType:\s*"follow_up_1"[\s\S]*?50-125 words/)
})

// idempotency: seed skips existing templates
test("seed handler checks for existing templates before inserting", () => {
  assert.match(source, /const existing = await ctx\.db\.query\("emailTemplates"\)\.collect\(\)/)
  assert.match(source, /alreadyExists/)
  assert.match(source, /skipped/)
})

test("seed handler returns inserted and skipped counts", () => {
  assert.match(source, /return \{ inserted, skipped \}/)
})

// default management: clears existing defaults
test("seed handler clears existing default when inserting a default template", () => {
  assert.match(source, /if \(template\.isDefault\)/)
  assert.match(source, /currentDefault/)
  assert.match(source, /ctx\.db\.patch\(currentDefault\._id/)
})
