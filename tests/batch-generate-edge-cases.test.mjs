import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("convex/email/batchGenerate.ts", "utf8")

// --- Return value structure ---

test("batchGenerate return object includes total from leadIds.length", () => {
  assert.match(source, /total:\s*leadIds\.length/)
})

test("batchGenerate return object includes succeeded, failed, skipped counters", () => {
  assert.match(source, /return\s*\{[\s\S]*?succeeded[\s\S]*?failed[\s\S]*?skipped[\s\S]*?results[\s\S]*?\}/)
})

test("success result includes subject from generated email", () => {
  assert.match(source, /subject:\s*generated\.subject/)
})

test("error result extracts message from Error instance", () => {
  assert.match(source, /err\s+instanceof\s+Error\s*\?\s*err\.message\s*:\s*String\(err\)/)
})

// --- Counter tracking ---

test("succeeded counter increments on successful generation", () => {
  // Find the success block and verify succeeded++ is there
  const successBlock = source.match(/results\.push\(\{\s*leadId,\s*status:\s*"success"[\s\S]*?\}\);\s*succeeded\+\+/)
  assert.ok(successBlock, "should increment succeeded after pushing success result")
})

test("failed counter increments on error", () => {
  const errorBlock = source.match(/results\.push\(\{\s*leadId,\s*status:\s*"error"[\s\S]*?\}\);\s*failed\+\+/)
  assert.ok(errorBlock, "should increment failed after pushing error result")
})

test("skipped counter increments for missing lead", () => {
  const skipBlock = source.match(/reason:\s*"Lead not found"\s*\}\);\s*skipped\+\+/)
  assert.ok(skipBlock, "should increment skipped after lead not found")
})

test("skipped counter increments for missing email", () => {
  const skipBlock = source.match(/reason:\s*"No contact email"[\s\S]*?\}\);\s*skipped\+\+/)
  assert.ok(skipBlock, "should increment skipped after no contact email")
})

// --- Lead ID resolution precedence ---

test("targetLeadIds takes priority over targetClusterId", () => {
  // targetLeadIds check comes first in the if/else chain
  const ifElseBlock = source.match(/if\s*\(campaign\.targetLeadIds[\s\S]*?\}\s*else\s+if\s*\(campaign\.targetClusterId/)
  assert.ok(ifElseBlock, "targetLeadIds should be checked before targetClusterId")
})

test("maps cluster leads to their _id for leadIds array", () => {
  assert.match(source, /clusterLeads\.map\(\(l[^)]*\)\s*=>\s*l\._id\)/)
})

// --- Template filtering ---

test("filters templates to find one with sequenceType initial", () => {
  assert.match(source, /templates\.find\(\s*\n?\s*\(t[^)]*\)\s*=>\s*t\s*!==\s*null\s*&&\s*t\.sequenceType\s*===\s*"initial"/)
})

test("fetches all campaign templates via Promise.all", () => {
  assert.match(source, /Promise\.all\(\s*\n?\s*campaign\.templateIds\.map/)
})

// --- Counters initialized to zero ---

test("counters are initialized to zero", () => {
  assert.match(source, /let\s+succeeded\s*=\s*0/)
  assert.match(source, /let\s+failed\s*=\s*0/)
  assert.match(source, /let\s+skipped\s*=\s*0/)
})

// --- Results array initialized empty ---

test("results array is initialized as empty typed array", () => {
  assert.match(source, /const\s+results:\s*BatchGenerateResult\["results"\]\s*=\s*\[\]/)
})

// --- saveGeneratedEmail returns insert result ---

test("saveGeneratedEmail returns the db insert result", () => {
  assert.match(source, /return\s+ctx\.db\.insert\("generatedEmails"/)
})

// --- DELAY_BETWEEN_LEADS_MS is module-level constant ---

test("DELAY_BETWEEN_LEADS_MS is a module-level const", () => {
  // Should be at the top level, not inside a function
  const lines = source.split("\n")
  const delayLine = lines.find((l) => l.includes("DELAY_BETWEEN_LEADS_MS"))
  assert.ok(delayLine, "DELAY_BETWEEN_LEADS_MS should be defined")
  assert.match(delayLine, /^const\s+DELAY_BETWEEN_LEADS_MS/, "should be a top-level const")
})

// --- Empty templateIds validation ---

test("validates templateIds.length before attempting template resolution", () => {
  // The template length check should come before Promise.all template fetch
  const lengthCheckIndex = source.indexOf("campaign.templateIds.length === 0")
  const promiseAllIndex = source.indexOf("Promise.all")
  assert.ok(lengthCheckIndex !== -1, "should check templateIds length")
  assert.ok(promiseAllIndex !== -1, "should have Promise.all for templates")
  assert.ok(
    lengthCheckIndex < promiseAllIndex,
    "templateIds length check should come before template fetch"
  )
})

// --- Campaign fetch happens before anything else ---

test("campaign fetch is the first operation in the handler", () => {
  const handlerIndex = source.indexOf("handler: async (ctx, args): Promise<BatchGenerateResult>")
  const campaignFetchIndex = source.indexOf("ctx.runQuery(api.campaigns.get")
  const templateFetchIndex = source.indexOf("Promise.all")
  assert.ok(handlerIndex < campaignFetchIndex, "handler should be defined before campaign fetch")
  assert.ok(
    campaignFetchIndex < templateFetchIndex,
    "campaign fetch should happen before template fetch"
  )
})
