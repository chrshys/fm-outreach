import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("convex/campaigns/launchCampaign.ts", "utf8")

// --- setCampaignActive internal mutation ---

test("setCampaignActive is exported as an internalMutation", () => {
  assert.match(source, /export\s+const\s+setCampaignActive\s*=\s*internalMutation\(/)
})

test("setCampaignActive accepts campaignId argument", () => {
  assert.match(source, /campaignId:\s*v\.id\("campaigns"\)/)
})

test("setCampaignActive patches status to active", () => {
  assert.match(source, /status:\s*"active"/)
})

test("setCampaignActive updates the updatedAt timestamp", () => {
  assert.match(source, /updatedAt:\s*Date\.now\(\)/)
})

// --- launchCampaign action ---

test("launchCampaign is exported as a Convex action", () => {
  assert.match(source, /export\s+const\s+launchCampaign\s*=\s*action\(/)
})

test("launchCampaign accepts a campaignId argument", () => {
  // Match inside the action args block
  assert.match(source, /campaignId:\s*v\.id\("campaigns"\)/)
})

test("launchCampaign loads the campaign via api.campaigns.get", () => {
  assert.match(source, /ctx\.runQuery\(api\.campaigns\.get/)
})

test("launchCampaign rejects campaigns that are not in pushed status", () => {
  assert.match(source, /campaign\.status\s*!==\s*"pushed"/)
  assert.match(source, /only pushed campaigns can be launched/)
})

test("launchCampaign rejects campaigns without a smartleadCampaignId", () => {
  assert.match(source, /!campaign\.smartleadCampaignId/)
  assert.match(source, /Campaign has no Smartlead ID/)
})

test("launchCampaign calls updateCampaignStatus with START", () => {
  assert.match(source, /import\s*\{[^}]*updateCampaignStatus[^}]*\}\s*from\s*["']\.\.\/smartlead\/client["']/)
  assert.match(source, /await\s+updateCampaignStatus\(/)
  assert.match(source, /"START"/)
})

test("launchCampaign runs setCampaignActive mutation after Smartlead call", () => {
  assert.match(source, /ctx\.runMutation\(setCampaignActiveRef/)
})

test("launchCampaign throws if campaign is not found", () => {
  assert.match(source, /Campaign not found/)
})

test("launchCampaign returns void", () => {
  assert.match(source, /Promise<void>/)
})
