import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("convex/leads.ts", "utf8")

test("exports update mutation with lead id and optional patchable fields", () => {
  assert.match(source, /export const update = mutation\(/)
  assert.match(source, /leadId:\s*v\.id\("leads"\)/)
  assert.match(source, /name:\s*v\.optional\(v\.string\(\)\)/)
  assert.match(source, /notes:\s*v\.optional\(v\.string\(\)\)/)
  assert.match(source, /socialLinks:\s*v\.optional\(\s*v\.object\(/s)
  assert.match(source, /locationDescription:\s*v\.optional\(v\.string\(\)\)/)
  assert.match(source, /imagePrompt:\s*v\.optional\(v\.string\(\)\)/)
})

test("update mutation merges partial payload and always sets updatedAt", () => {
  assert.match(source, /const now = Date\.now\(\)/)
  assert.match(source, /for \(const \[key, value\] of Object\.entries\(args\)\)/)
  assert.match(source, /if \(key !== "leadId" && value !== undefined\)/)
  assert.match(source, /if \(args\.socialLinks !== undefined\)\s*\{[\s\S]*\.\.\.lead\.socialLinks,[\s\S]*\.\.\.args\.socialLinks/s)
  assert.match(source, /patch\.updatedAt = now/)
  assert.match(source, /await ctx\.db\.patch\(args\.leadId, patch\)/)
})

test("update mutation logs status_changed activity when status value changes", () => {
  assert.match(source, /const shouldLogStatusChange = args\.status !== undefined && args\.status !== lead\.status/)
  assert.match(source, /if \(shouldLogStatusChange\) \{/)
  assert.match(source, /await ctx\.db\.insert\("activities",\s*\{[\s\S]*type:\s*"status_changed"/s)
  assert.match(source, /description:\s*`Lead status changed from \$\{lead\.status\} to \$\{args\.status\}`/)
  assert.match(source, /metadata:\s*\{\s*oldStatus:\s*lead\.status,\s*newStatus:\s*args\.status,\s*\}/s)
})

test("updateStatus mutation updates status and logs status_changed activity with metadata", () => {
  assert.match(source, /export const updateStatus = mutation\(/)
  assert.match(source, /leadId:\s*v\.id\("leads"\)/)
  assert.match(source, /status:\s*leadStatusValidator/)
  assert.match(source, /if \(lead\.status === args\.status\)/)
  assert.match(source, /await ctx\.db\.patch\(args\.leadId,\s*\{\s*status:\s*args\.status,\s*updatedAt:\s*now,\s*\}\)/s)
  assert.match(source, /await ctx\.db\.insert\("activities",\s*\{[\s\S]*type:\s*"status_changed"/s)
  assert.match(source, /description:\s*`Lead status changed from \$\{lead\.status\} to \$\{args\.status\}`/)
  assert.match(source, /metadata:\s*\{\s*oldStatus:\s*lead\.status,\s*newStatus:\s*args\.status,\s*\}/s)
})

test("setFollowUp mutation updates next follow-up and logs an activity", () => {
  assert.match(source, /export const setFollowUp = mutation\(/)
  assert.match(source, /leadId:\s*v\.id\("leads"\)/)
  assert.match(source, /nextFollowUpAt:\s*v\.number\(\)/)
  assert.match(source, /await ctx\.db\.patch\(args\.leadId,\s*\{\s*nextFollowUpAt:\s*args\.nextFollowUpAt,\s*updatedAt:\s*now,\s*\}\)/s)
  assert.match(source, /const followUpDate = new Date\(args\.nextFollowUpAt\)\.toISOString\(\)\.slice\(0, 10\)/)
  assert.match(source, /await ctx\.db\.insert\("activities",\s*\{[\s\S]*type:\s*"note_added"/s)
  assert.match(source, /description:\s*`Follow-up reminder set for \$\{followUpDate\}`/)
  assert.match(source, /metadata:\s*\{\s*nextFollowUpAt:\s*args\.nextFollowUpAt,\s*\}/s)
})
