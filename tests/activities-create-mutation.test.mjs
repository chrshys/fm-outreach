import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("convex/activities.ts", "utf8")

test("exports manual activity create mutation with expected args", () => {
  assert.match(source, /export const create = mutation\(/)
  assert.match(source, /leadId:\s*v\.id\("leads"\)/)
  assert.match(source, /type:\s*v\.union\(\s*v\.literal\("note_added"\),\s*v\.literal\("phone_call"\),\s*v\.literal\("social_dm_sent"\),\s*v\.literal\("social_dm_replied"\),\s*v\.literal\("social_commented"\),\s*v\.literal\("social_followed"\),\s*\)/s)
  assert.match(source, /description:\s*v\.string\(\)/)
  assert.match(source, /channel:\s*v\.optional\(\s*v\.union\(\s*v\.literal\("phone"\),\s*v\.literal\("facebook"\),\s*v\.literal\("instagram"\),\s*\),\s*\)/s)
  assert.match(source, /metadata:\s*v\.optional\(v\.any\(\)\)/)
})

test("create mutation verifies lead exists and inserts activity with timestamp", () => {
  assert.match(source, /const lead = await ctx\.db\.get\(args\.leadId\)/)
  assert.match(source, /if \(lead === null\)\s*\{\s*throw new Error\("Lead not found"\);?\s*\}/s)
  assert.match(source, /const now = Date\.now\(\)/)
  assert.match(source, /await ctx\.db\.patch\(args\.leadId,\s*\{\s*updatedAt:\s*now\s*\}\)/)
  assert.match(source, /const activity:[\s\S]*=\s*\{[\s\S]*leadId:\s*args\.leadId,[\s\S]*type:\s*args\.type,[\s\S]*description:\s*args\.description,[\s\S]*createdAt:\s*now,[\s\S]*\}/s)
  assert.match(source, /if \(args\.channel !== undefined\)\s*\{\s*activity\.channel = args\.channel;\s*\}/s)
  assert.match(source, /if \(args\.metadata !== undefined\)\s*\{\s*activity\.metadata = args\.metadata;\s*\}/s)
  assert.match(source, /return ctx\.db\.insert\("activities", activity\)/)
})
