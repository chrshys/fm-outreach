import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("convex/leads.ts", "utf8")

test("exports listSocialOutreach query", () => {
  assert.match(source, /export\s+const\s+listSocialOutreach\s*=\s*query\(/)
})

test("filters leads with no_email status", () => {
  assert.match(source, /lead\.status\s*===\s*"no_email"/)
})

test("filters leads with social links and outreach-related statuses", () => {
  assert.match(source, /outreachNoReplyStatuses/)
  assert.match(source, /hasSocialLinks\(lead\)/)
  assert.match(source, /outreachNoReplyStatuses\.has\(lead\.status\)/)
})

test("defines outreach no-reply statuses set with correct values", () => {
  assert.match(source, /outreach_started/)
  assert.match(source, /no_response/)
  assert.match(source, /bounced/)
})

test("fetches activities to determine last social touch", () => {
  assert.match(source, /social_dm_sent/)
  assert.match(source, /social_dm_replied/)
  assert.match(source, /social_followed/)
  assert.match(source, /social_commented/)
  assert.match(source, /lastSocialTouch/)
})

test("sorts results by follow-up due date with overdue first", () => {
  assert.match(source, /results\.sort/)
  assert.match(source, /aOverdue/)
  assert.match(source, /bOverdue/)
})

test("returns expected fields for each lead", () => {
  // Check the return shape includes the required fields
  assert.match(source, /name:\s*lead\.name/)
  assert.match(source, /city:\s*lead\.city/)
  assert.match(source, /status:\s*lead\.status/)
  assert.match(source, /socialLinks:\s*lead\.socialLinks/)
  assert.match(source, /nextFollowUpAt:\s*lead\.nextFollowUpAt/)
  assert.match(source, /lastSocialTouch/)
})
