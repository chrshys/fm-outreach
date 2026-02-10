import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("convex/email/batchGenerate.ts", "utf8")

// --- Exports and structure ---

test("batchGenerate is exported as a public action", () => {
  assert.match(source, /export\s+const\s+batchGenerate\s*=\s*action\(/)
})

test("batchGenerate accepts campaignId argument", () => {
  assert.match(source, /campaignId:\s*v\.id\("campaigns"\)/)
})

test("batchGenerate returns Promise<BatchGenerateResult>", () => {
  assert.match(source, /Promise<BatchGenerateResult>/)
})

test("exports BatchGenerateResult type", () => {
  assert.match(source, /export\s+type\s+BatchGenerateResult\s*=/)
})

test("BatchGenerateResult includes total, succeeded, failed, skipped counts", () => {
  assert.match(source, /total:\s*number/)
  assert.match(source, /succeeded:\s*number/)
  assert.match(source, /failed:\s*number/)
  assert.match(source, /skipped:\s*number/)
})

test("BatchGenerateResult includes results array with success, skipped, and error variants", () => {
  assert.match(source, /status:\s*"success"/)
  assert.match(source, /status:\s*"skipped"/)
  assert.match(source, /status:\s*"error"/)
})

// --- saveGeneratedEmail internal mutation ---

test("saveGeneratedEmail is exported as an internalMutation", () => {
  assert.match(source, /export\s+const\s+saveGeneratedEmail\s*=\s*internalMutation\(/)
})

test("saveGeneratedEmail inserts into generatedEmails table", () => {
  assert.match(source, /ctx\.db\.insert\("generatedEmails"/)
})

test("saveGeneratedEmail sets generatedAt timestamp", () => {
  assert.match(source, /generatedAt:\s*Date\.now\(\)/)
})

test("saveGeneratedEmail accepts campaignId, leadId, templateId, subject, body", () => {
  // Within saveGeneratedEmail args block
  const mutationMatch = source.match(/saveGeneratedEmail\s*=\s*internalMutation\(\{[\s\S]*?args:\s*\{([\s\S]*?)\},\s*\n\s*handler/)
  assert.ok(mutationMatch, "saveGeneratedEmail should have args")
  const argsBlock = mutationMatch[1]
  assert.match(argsBlock, /campaignId:\s*v\.id\("campaigns"\)/)
  assert.match(argsBlock, /leadId:\s*v\.id\("leads"\)/)
  assert.match(argsBlock, /templateId:\s*v\.id\("emailTemplates"\)/)
  assert.match(argsBlock, /subject:\s*v\.string\(\)/)
  assert.match(argsBlock, /body:\s*v\.string\(\)/)
})

// --- Campaign fetching and validation ---

test("fetches campaign using campaigns.get query", () => {
  assert.match(source, /api\.campaigns\.get/)
})

test("throws when campaign not found", () => {
  assert.match(source, /Campaign not found/)
})

test("throws when campaign has no templates configured", () => {
  assert.match(source, /Campaign has no templates configured/)
})

test("throws when campaign has no initial template", () => {
  assert.match(source, /Campaign has no initial template/)
})

// --- Template resolution ---

test("fetches templates using emailTemplates.get query", () => {
  assert.match(source, /api\.emailTemplates\.get/)
})

test("finds initial template from campaign template sequence", () => {
  assert.match(source, /sequenceType\s*===\s*"initial"/)
})

// --- Lead resolution ---

test("resolves leads from targetLeadIds when available", () => {
  assert.match(source, /campaign\.targetLeadIds/)
})

test("resolves leads from targetClusterId using listByCluster", () => {
  assert.match(source, /api\.leads\.listByCluster/)
  assert.match(source, /campaign\.targetClusterId/)
})

test("throws when campaign has no target leads", () => {
  assert.match(source, /Campaign has no target leads/)
})

// --- Lead processing ---

test("fetches each lead to check email exists", () => {
  assert.match(source, /api\.leads\.get/)
})

test("skips leads without contact email", () => {
  assert.match(source, /lead\.contactEmail/)
  assert.match(source, /No contact email/)
})

test("skips leads that are not found", () => {
  assert.match(source, /Lead not found/)
})

// --- Email generation ---

test("calls generateEmail action for each lead", () => {
  assert.match(source, /api\.email\.generateEmail\.generateEmail/)
})

test("passes leadId and templateId to generateEmail", () => {
  assert.match(source, /leadId:\s*lead\._id/)
  assert.match(source, /templateId:\s*initialTemplate\._id/)
})

// --- Saving results ---

test("saves generated email via internal saveGeneratedEmail mutation", () => {
  assert.match(source, /internal\.email\.batchGenerate\.saveGeneratedEmail/)
})

test("passes campaignId, leadId, templateId, subject, body to saveGeneratedEmail", () => {
  assert.match(source, /campaignId:\s*args\.campaignId/)
  assert.match(source, /subject:\s*generated\.subject/)
  assert.match(source, /body:\s*generated\.body/)
})

// --- Delay between leads ---

test("delays 500ms between leads", () => {
  assert.match(source, /DELAY_BETWEEN_LEADS_MS\s*=\s*500/)
  assert.match(source, /await\s+sleep\(DELAY_BETWEEN_LEADS_MS\)/)
})

test("sleep helper uses setTimeout with Promise", () => {
  assert.match(source, /function\s+sleep\(ms:\s*number\)/)
  assert.match(source, /new\s+Promise.*setTimeout/)
})

test("skips delay after last lead", () => {
  assert.match(source, /i\s*<\s*leadIds\.length\s*-\s*1/)
})

// --- Error handling ---

test("catches errors per lead and continues processing", () => {
  assert.match(source, /catch\s*\(err\)/)
  assert.match(source, /err\s+instanceof\s+Error/)
})

// --- Imports ---

test("imports action and internalMutation from generated server", () => {
  assert.match(source, /import.*action.*internalMutation.*from.*_generated\/server/)
})

test("imports api and internal from generated api", () => {
  assert.match(source, /import.*api.*internal.*from.*_generated\/api/)
})

test("imports v from convex/values", () => {
  assert.match(source, /import.*v.*from.*convex\/values/)
})

test("imports Id type from generated dataModel", () => {
  assert.match(source, /import\s+type.*Id.*from.*_generated\/dataModel/)
})

test("imports GeneratedEmail type from generateEmail", () => {
  assert.match(source, /import\s+type.*GeneratedEmail.*from.*\.\/generateEmail/)
})

// --- Sequential processing ---

test("processes leads sequentially in a for loop", () => {
  assert.match(source, /for\s*\(\s*let\s+i\s*=\s*0;\s*i\s*<\s*leadIds\.length;\s*i\+\+\)/)
})
