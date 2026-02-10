import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("convex/campaigns.ts", "utf8")

test("exports a getWithLeads query accepting a campaignId", () => {
  assert.match(source, /export const getWithLeads = query\(\{/)
  assert.match(source, /campaignId:\s*v\.id\("campaigns"\)/)
})

test("fetches campaign and returns null when not found", () => {
  assert.match(source, /const campaign = await ctx\.db\.get\(args\.campaignId\)/)
  assert.match(source, /if \(!campaign\) return null/)
})

test("reads targetLeadIds from campaign", () => {
  assert.match(source, /const leadIds = campaign\.targetLeadIds \?\? \[\]/)
})

test("queries emails by smartleadCampaignId index", () => {
  assert.match(source, /by_smartleadCampaignId/)
  assert.match(source, /q\.eq\("smartleadCampaignId", campaign\.smartleadCampaignId!\)/)
})

test("collects per-lead email timestamps including sentAt, openedAt, clickedAt, repliedAt, bouncedAt", () => {
  assert.match(source, /sentAt: email\.sentAt/)
  assert.match(source, /openedAt: email\.openedAt/)
  assert.match(source, /clickedAt: email\.clickedAt/)
  assert.match(source, /repliedAt: email\.repliedAt/)
  assert.match(source, /bouncedAt: email\.bouncedAt/)
})

test("collects sequence step per email", () => {
  assert.match(source, /sequenceStep: email\.sequenceStep/)
})

test("sorts lead emails by sequence step ascending", () => {
  assert.match(source, /leadEmails\.sort\(\(a, b\) => a\.sequenceStep - b\.sequenceStep\)/)
})

test("derives lead status from latest email event timestamps", () => {
  assert.match(source, /const latest = leadEmails\[leadEmails\.length - 1\]/)
  assert.match(source, /if \(latest\.bouncedAt\)/)
  assert.match(source, /status = "bounced"/)
  assert.match(source, /if \(latest\.repliedAt\)/)
  assert.match(source, /status = "replied"/)
  assert.match(source, /if \(latest\.clickedAt\)/)
  assert.match(source, /status = "clicked"/)
  assert.match(source, /if \(latest\.openedAt\)/)
  assert.match(source, /status = "opened"/)
})

test("returns lead data with name, email, status, sequenceStep, and emails array", () => {
  assert.match(source, /name: lead\.name/)
  assert.match(source, /contactEmail: lead\.contactEmail/)
  assert.match(source, /status,/)
  assert.match(source, /sequenceStep: latest\?\.sequenceStep \?\? 0/)
  assert.match(source, /emails: leadEmails/)
})

test("returns campaign object spread with leads array", () => {
  assert.match(source, /return \{ \.\.\.campaign, leads \}/)
})
