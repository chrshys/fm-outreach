import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("convex/emailTemplates.ts", "utf8")

// create mutation
test("exports create as a public mutation", () => {
  assert.match(source, /export const create = mutation\(\{/)
})

test("create accepts name, sequenceType, prompt, subject, isDefault args", () => {
  assert.match(source, /create = mutation\(\{[\s\S]*?name:\s*v\.string\(\)/s)
  assert.match(source, /create = mutation\(\{[\s\S]*?sequenceType:/s)
  assert.match(source, /create = mutation\(\{[\s\S]*?prompt:\s*v\.string\(\)/s)
  assert.match(source, /create = mutation\(\{[\s\S]*?subject:\s*v\.string\(\)/s)
  assert.match(source, /create = mutation\(\{[\s\S]*?isDefault:\s*v\.boolean\(\)/s)
})

test("create inserts into emailTemplates table", () => {
  assert.match(source, /ctx\.db\.insert\("emailTemplates"/)
})

test("create clears existing default when isDefault is true", () => {
  assert.match(source, /if \(args\.isDefault\)/)
  assert.match(source, /currentDefault/)
  assert.match(source, /ctx\.db\.patch\(currentDefault\._id,\s*\{\s*isDefault:\s*false\s*\}\)/)
})

// update mutation
test("exports update as a public mutation", () => {
  assert.match(source, /export const update = mutation\(\{/)
})

test("update accepts id and optional fields", () => {
  assert.match(source, /update = mutation\(\{[\s\S]*?id:\s*v\.id\("emailTemplates"\)/s)
  assert.match(source, /update = mutation\(\{[\s\S]*?name:\s*v\.optional\(v\.string\(\)\)/s)
  assert.match(source, /update = mutation\(\{[\s\S]*?prompt:\s*v\.optional\(v\.string\(\)\)/s)
  assert.match(source, /update = mutation\(\{[\s\S]*?subject:\s*v\.optional\(v\.string\(\)\)/s)
  assert.match(source, /update = mutation\(\{[\s\S]*?isDefault:\s*v\.optional\(v\.boolean\(\)\)/s)
})

test("update verifies template exists", () => {
  assert.match(source, /const template = await ctx\.db\.get\(args\.id\)/)
  assert.match(source, /if \(template === null\)\s*\{\s*throw new Error\("Template not found"\)/s)
})

test("update patches the template", () => {
  assert.match(source, /await ctx\.db\.patch\(id, patch\)/)
})

test("update clears existing default when setting isDefault true", () => {
  assert.match(source, /if \(patch\.isDefault === true\)/)
})

// remove mutation
test("exports remove as a public mutation", () => {
  assert.match(source, /export const remove = mutation\(\{/)
})

test("remove accepts id argument", () => {
  assert.match(source, /remove = mutation\(\{[\s\S]*?id:\s*v\.id\("emailTemplates"\)/s)
})

test("remove verifies template exists before deleting", () => {
  // The remove handler should check the template exists
  assert.match(source, /const template = await ctx\.db\.get\(args\.id\)/)
  assert.match(source, /await ctx\.db\.delete\(args\.id\)/)
})

// imports
test("imports mutation from _generated/server", () => {
  assert.match(source, /import\s*\{[\s\S]*?mutation[\s\S]*?\}\s*from\s*"\.\/\_generated\/server"/)
})

test("imports v from convex/values", () => {
  assert.match(source, /import\s*\{[\s\S]*?v[\s\S]*?\}\s*from\s*"convex\/values"/)
})
