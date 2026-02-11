import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("convex/campaigns/launchCampaign.ts", "utf8")

// --- launchCampaign action structure ---

test("imports updateCampaignStatus from smartlead client", () => {
  assert.match(source, /import\s+\{[\s\S]*updateCampaignStatus[\s\S]*\}\s+from\s+"\.\.\/smartlead\/client"/)
})

test("exports launchCampaign as a Convex action", () => {
  assert.match(source, /export const launchCampaign = action\(/)
})

test("action takes campaignId as argument", () => {
  assert.match(source, /campaignId:\s*v\.id\("campaigns"\)/)
})

// --- Validation ---

test("loads campaign via api.campaigns.get query", () => {
  assert.match(source, /ctx\.runQuery\(api\.campaigns\.get/)
})

test("throws error when campaign not found", () => {
  assert.match(source, /Campaign not found/)
})

test("validates campaign status is pushed", () => {
  assert.match(source, /campaign\.status !== "pushed"/)
})

test("throws error when campaign is not in pushed status", () => {
  assert.match(source, /only pushed campaigns can be launched/)
})

test("validates smartleadCampaignId exists", () => {
  assert.match(source, /!campaign\.smartleadCampaignId/)
})

test("throws error when no Smartlead ID", () => {
  assert.match(source, /Campaign has no Smartlead ID/)
})

// --- Smartlead API call ---

test("calls updateCampaignStatus with START", () => {
  assert.match(source, /updateCampaignStatus\(/)
  assert.match(source, /"START"/)
})

test("converts smartleadCampaignId to Number for API call", () => {
  assert.match(source, /Number\(campaign\.smartleadCampaignId\)/)
})

// --- Local status update ---

test("has setCampaignActive internal mutation", () => {
  assert.match(source, /export const setCampaignActive = internalMutation\(/)
})

test("setCampaignActive patches campaign status to active", () => {
  assert.match(source, /status:\s*"active"/)
})

test("setCampaignActive updates updatedAt timestamp", () => {
  assert.match(source, /updatedAt:\s*Date\.now\(\)/)
})

test("action calls setCampaignActive mutation after Smartlead API call", () => {
  assert.match(source, /internal\.campaigns\.launchCampaign\.setCampaignActive/)
  assert.match(source, /ctx\.runMutation\(internal\.campaigns\.launchCampaign\.setCampaignActive/)
})

// --- Push flow updated ---

const pushSource = fs.readFileSync("convex/campaigns/pushToSmartlead.ts", "utf8")

test("pushToSmartlead now sets status to pushed instead of active", () => {
  assert.match(pushSource, /setCampaignPushed/)
  assert.match(pushSource, /status:\s*"pushed"/)
})

// --- Schema ---

const schemaSource = fs.readFileSync("convex/schema.ts", "utf8")

test("schema includes pushed status for campaigns", () => {
  assert.match(schemaSource, /v\.literal\("pushed"\)/)
})
