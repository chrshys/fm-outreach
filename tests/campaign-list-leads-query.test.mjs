import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("convex/campaigns.ts", "utf8")

test("exports a listLeads query accepting a campaignId", () => {
  assert.match(source, /export const listLeads = query\(\{/)
  assert.match(source, /args:\s*\{\s*campaignId:\s*v\.id\("campaigns"\)\s*\}/)
})

test("fetches campaign and returns empty array when not found", () => {
  assert.match(source, /const campaign = await ctx\.db\.get\(args\.campaignId\)/)
  assert.match(source, /if \(!campaign\) return \[\]/)
})

test("reads targetLeadIds from campaign", () => {
  assert.match(source, /const leadIds = campaign\.targetLeadIds \?\? \[\]/)
})

test("queries emails by smartleadCampaignId index", () => {
  assert.match(source, /by_smartleadCampaignId/)
  assert.match(source, /q\.eq\("smartleadCampaignId", campaign\.smartleadCampaignId!\)/)
})

test("determines lead email status from timestamps", () => {
  assert.match(source, /if \(email\.bouncedAt\)/)
  assert.match(source, /status = "bounced"/)
  assert.match(source, /if \(email\.repliedAt\)/)
  assert.match(source, /status = "replied"/)
  assert.match(source, /if \(email\.openedAt\)/)
  assert.match(source, /status = "opened"/)
})

test("returns lead data with name, email, sequence step, status, and last activity", () => {
  assert.match(source, /name: lead\.name/)
  assert.match(source, /contactEmail: lead\.contactEmail/)
  assert.match(source, /sequenceStep: emailData\?\.sequenceStep \?\? 0/)
  assert.match(source, /status: emailData\?\.status/)
  assert.match(source, /lastActivityAt: emailData\?\.lastActivityAt/)
})
