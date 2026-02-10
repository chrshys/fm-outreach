import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const wizardSource = fs.readFileSync("src/app/campaigns/new/page.tsx", "utf8")
const mutationSource = fs.readFileSync("convex/campaigns.ts", "utf8")
const schemaSource = fs.readFileSync("convex/schema.ts", "utf8")

// --- Schema: campaign draft record structure ---

test("schema defines campaigns table with draft status", () => {
  assert.match(schemaSource, /campaigns:\s*defineTable\(/)
  assert.match(schemaSource, /v\.literal\("draft"\)/)
})

test("schema campaigns table has templateIds field", () => {
  assert.match(schemaSource, /templateIds:\s*v\.array\(v\.id\("emailTemplates"\)\)/)
})

test("schema campaigns table has optional targetLeadIds field", () => {
  assert.match(schemaSource, /targetLeadIds:\s*v\.optional\(v\.array\(v\.id\("leads"\)\)\)/)
})

test("schema campaigns table has optional targetClusterId field", () => {
  assert.match(schemaSource, /targetClusterId:\s*v\.optional\(v\.id\("clusters"\)\)/)
})

test("schema campaigns table has optional targetFilter field", () => {
  assert.match(schemaSource, /targetFilter:\s*v\.optional\(v\.any\(\)\)/)
})

test("schema campaigns table has leadCount field", () => {
  assert.match(schemaSource, /leadCount:\s*v\.number\(\)/)
})

test("schema campaigns table has createdAt and updatedAt timestamps", () => {
  assert.match(schemaSource, /createdAt:\s*v\.number\(\)/)
  assert.match(schemaSource, /updatedAt:\s*v\.number\(\)/)
})

// --- Mutation: creates draft record ---

test("create mutation sets status to draft", () => {
  assert.match(mutationSource, /status:\s*"draft"/)
})

test("create mutation stores templateIds in the record", () => {
  assert.match(mutationSource, /templateIds:\s*args\.templateIds/)
})

test("create mutation stores targetLeadIds in the record", () => {
  assert.match(mutationSource, /targetLeadIds:\s*args\.targetLeadIds/)
})

test("create mutation stores targetClusterId in the record", () => {
  assert.match(mutationSource, /targetClusterId:\s*args\.targetClusterId/)
})

test("create mutation stores targetFilter in the record", () => {
  assert.match(mutationSource, /targetFilter:\s*args\.targetFilter/)
})

test("create mutation stores leadCount in the record", () => {
  assert.match(mutationSource, /leadCount:\s*args\.leadCount/)
})

test("create mutation inserts into campaigns table", () => {
  assert.match(mutationSource, /ctx\.db\.insert\("campaigns"/)
})

test("create mutation does not set smartleadCampaignId", () => {
  const handlerMatch = mutationSource.match(
    /export const create = mutation\(\{[\s\S]*?handler:\s*async\s*\(ctx,\s*args\)\s*=>\s*\{([\s\S]*?)\n\s*\},?\n\}\)/,
  )
  assert.ok(handlerMatch, "should find create handler body")
  const handlerBody = handlerMatch[1]
  assert.ok(!handlerBody.includes("smartleadCampaignId"), "create handler should not set smartleadCampaignId")
})

// --- Wizard: resolves lead IDs for all selection modes ---

test("wizard resolves targetLeadIds for cluster selection mode", () => {
  // When in cluster mode, wizard should resolve lead IDs from cluster
  assert.match(wizardSource, /selectionMode === "cluster"[\s\S]*?args\.targetLeadIds/)
})

test("wizard resolves targetLeadIds for filter selection mode", () => {
  // When in filter mode, wizard should resolve lead IDs from filter results
  assert.match(wizardSource, /selectionMode === "filter"[\s\S]*?args\.targetLeadIds/)
})

test("wizard resolves targetLeadIds for manual selection mode", () => {
  assert.match(wizardSource, /selectionMode === "manual"[\s\S]*?args\.targetLeadIds/)
})

test("cluster mode filters leads by clusterId to resolve IDs", () => {
  assert.match(wizardSource, /l\.clusterId === selectedClusterId/)
})

test("filter mode applies status filter when resolving IDs", () => {
  assert.match(wizardSource, /filterStatus !== "all" && l\.status !== filterStatus/)
})

test("filter mode applies type filter when resolving IDs", () => {
  assert.match(wizardSource, /filterType !== "all" && l\.type !== filterType/)
})

test("filter mode applies region filter when resolving IDs", () => {
  assert.match(wizardSource, /filterRegion !== "all" && l\.region !== filterRegion/)
})

test("wizard always passes leadCount to create mutation", () => {
  assert.match(wizardSource, /leadCount:\s*resolvedLeadCount/)
})

test("wizard always passes templateIds to create mutation", () => {
  assert.match(wizardSource, /templateIds:\s*activeTemplateIds/)
})

test("wizard calls campaigns.create mutation", () => {
  assert.match(wizardSource, /useMutation\([\s\S]*?api\.campaigns\.create[\s\S]*?\)/)
})

test("wizard shows success toast after draft creation", () => {
  assert.match(wizardSource, /toast\.success\("Campaign draft created"\)/)
})

test("wizard navigates to campaigns list after draft creation", () => {
  assert.match(wizardSource, /router\.push\("\/campaigns"\)/)
})

test("wizard handles create errors with error toast", () => {
  assert.match(wizardSource, /toast\.error\("Failed to create campaign"\)/)
})

// --- Draft record is the initial state ---

test("campaign status starts as draft (not pushed, active, etc.)", () => {
  // The create mutation should only set "draft", never any other status
  const handlerMatch = mutationSource.match(
    /export const create = mutation\(\{[\s\S]*?handler:\s*async\s*\(ctx,\s*args\)\s*=>\s*\{([\s\S]*?)\n\s*\},?\n\}\)/,
  )
  assert.ok(handlerMatch, "should find create handler body")
  const handlerBody = handlerMatch[1]
  assert.ok(!handlerBody.includes('"pushed"'), "create handler should not set pushed status")
  assert.ok(!handlerBody.includes('"active"'), "create handler should not set active status")
  assert.ok(!handlerBody.includes('"paused"'), "create handler should not set paused status")
  assert.ok(!handlerBody.includes('"completed"'), "create handler should not set completed status")
})

test("wizard Create Draft button is on the final step (step 4)", () => {
  assert.match(wizardSource, /step < 4[\s\S]*?Create Draft/)
})

test("wizard disables Create Draft button while submitting", () => {
  assert.match(wizardSource, /disabled=\{isSubmitting/)
})
