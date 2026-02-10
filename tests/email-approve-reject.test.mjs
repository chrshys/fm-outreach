import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const schema = fs.readFileSync("convex/schema.ts", "utf8")
const mutations = fs.readFileSync("convex/generatedEmails.ts", "utf8")
const previewPage = fs.readFileSync(
  "src/app/campaigns/[id]/preview/page.tsx",
  "utf8",
)

// --- Schema: rejected status ---

test("generatedEmails schema includes rejected status literal", () => {
  const genEmailSection = schema.slice(schema.indexOf("generatedEmails:"))
  const nextTable = genEmailSection.indexOf("campaigns:")
  const genEmailDef = genEmailSection.slice(0, nextTable)
  assert.match(genEmailDef, /v\.literal\("rejected"\)/)
})

// --- Backend: updateStatus accepts rejected ---

test("updateStatus mutation accepts rejected in status union", () => {
  const updateSection = mutations.slice(
    mutations.indexOf("updateStatus = mutation"),
  )
  const nextExport = updateSection.indexOf("export", 10)
  const updateDef = updateSection.slice(0, nextExport)
  assert.match(updateDef, /v\.literal\("rejected"\)/)
})

// --- Backend: bulkUpdateStatus mutation ---

test("exports bulkUpdateStatus mutation", () => {
  assert.match(
    mutations,
    /export\s+const\s+bulkUpdateStatus\s*=\s*mutation\(/,
  )
})

test("bulkUpdateStatus accepts campaignId argument", () => {
  const bulkSection = mutations.slice(
    mutations.indexOf("bulkUpdateStatus = mutation"),
  )
  assert.match(bulkSection, /campaignId:\s*v\.id\("campaigns"\)/)
})

test("bulkUpdateStatus accepts status argument with approved and rejected", () => {
  const bulkSection = mutations.slice(
    mutations.indexOf("bulkUpdateStatus = mutation"),
  )
  const nextExport = bulkSection.indexOf("export", 10)
  const bulkDef = bulkSection.slice(0, nextExport)
  assert.match(bulkDef, /v\.literal\("approved"\)/)
  assert.match(bulkDef, /v\.literal\("rejected"\)/)
})

test("bulkUpdateStatus accepts optional excludeRejected flag", () => {
  const bulkSection = mutations.slice(
    mutations.indexOf("bulkUpdateStatus = mutation"),
  )
  assert.match(bulkSection, /excludeRejected:\s*v\.optional\(v\.boolean\(\)\)/)
})

test("bulkUpdateStatus queries by_campaignId index", () => {
  const bulkSection = mutations.slice(
    mutations.indexOf("bulkUpdateStatus = mutation"),
  )
  assert.match(bulkSection, /\.withIndex\("by_campaignId"/)
})

test("bulkUpdateStatus skips rejected emails when excludeRejected is true", () => {
  const bulkSection = mutations.slice(
    mutations.indexOf("bulkUpdateStatus = mutation"),
  )
  assert.match(bulkSection, /excludeRejected/)
  assert.match(bulkSection, /"rejected"/)
})

test("bulkUpdateStatus returns count of updated emails", () => {
  const bulkSection = mutations.slice(
    mutations.indexOf("bulkUpdateStatus = mutation"),
  )
  assert.match(bulkSection, /return\s*\{\s*updated\s*\}/)
})

// --- Backend: listApprovedByCampaign query ---

test("exports listApprovedByCampaign query", () => {
  assert.match(
    mutations,
    /export\s+const\s+listApprovedByCampaign\s*=\s*query\(/,
  )
})

test("listApprovedByCampaign filters for approved status only", () => {
  const approvedSection = mutations.slice(
    mutations.indexOf("listApprovedByCampaign = query"),
  )
  const nextExport = approvedSection.indexOf("export", 10)
  const approvedDef = approvedSection.slice(0, nextExport)
  assert.match(approvedDef, /\.filter\(.*status\s*===\s*"approved"/)
})

// --- Preview page: rejected status config ---

test("preview page includes rejected in status config", () => {
  assert.match(previewPage, /rejected:\s*\{/)
})

test("preview page rejected badge has red styling", () => {
  assert.match(previewPage, /rejected.*bg-red/)
})

test("preview page type includes rejected status", () => {
  assert.match(previewPage, /status:\s*"generated"\s*\|\s*"edited"\s*\|\s*"approved"\s*\|\s*"rejected"/)
})

// --- Preview page: reject button ---

test("preview page has a Reject button", () => {
  assert.match(previewPage, /Reject/)
  assert.match(previewPage, /handleReject/)
})

test("handleReject calls updateStatus with rejected", () => {
  assert.match(previewPage, /status:\s*"rejected"/)
})

test("reject button uses XCircle icon", () => {
  assert.match(previewPage, /XCircle/)
})

test("reject button is hidden when status is already rejected", () => {
  assert.match(previewPage, /email\.status\s*!==\s*"rejected"/)
})

// --- Preview page: Approve All button ---

test("preview page has Approve All button", () => {
  assert.match(previewPage, /Approve All/)
})

test("Approve All calls bulkUpdateStatus mutation", () => {
  assert.match(previewPage, /api\.generatedEmails\.bulkUpdateStatus/)
})

test("Approve All passes excludeRejected true", () => {
  assert.match(previewPage, /excludeRejected:\s*true/)
})

test("Approve All uses CheckCheck icon", () => {
  assert.match(previewPage, /CheckCheck/)
})

// --- Preview page: stats display ---

test("preview page shows rejected count in stats", () => {
  assert.match(previewPage, /rejectedCount/)
})

test("preview page shows pending count in stats", () => {
  assert.match(previewPage, /pendingCount/)
})
