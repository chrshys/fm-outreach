import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("convex/activities.ts", "utf8")

test("create mutation accepts social_dm_replied type", () => {
  assert.match(source, /v\.literal\("social_dm_replied"\)/)
})

test("auto-advances lead status to replied when type is social_dm_replied and status is outreach_started or no_email", () => {
  assert.match(
    source,
    /args\.type === "social_dm_replied" &&\s*\(lead\.status === "outreach_started" \|\| lead\.status === "no_email"\)/s
  )
  assert.match(source, /await ctx\.db\.patch\(args\.leadId, \{ status: "replied", updatedAt: now \}\)/)
})

test("inserts status_changed activity when auto-advancing status", () => {
  assert.match(
    source,
    /await ctx\.db\.insert\("activities", \{\s*leadId: args\.leadId,\s*type: "status_changed",\s*description: `Lead status changed from \$\{lead\.status\} to replied`,\s*metadata: \{ oldStatus: lead\.status, newStatus: "replied" \},\s*createdAt: now,\s*\}\)/s
  )
})

test("does not auto-advance status for non-social_dm_replied types", () => {
  // The else branch just patches updatedAt without status change
  assert.match(source, /\} else \{\s*await ctx\.db\.patch\(args\.leadId, \{ updatedAt: now \}\);\s*\}/s)
})
