import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const campaignsSource = fs.readFileSync("convex/campaigns.ts", "utf8")
const schemaSource = fs.readFileSync("convex/schema.ts", "utf8")
const leadsSource = fs.readFileSync("convex/leads.ts", "utf8")

// Schema: targetLeadIds field
test("campaigns schema includes targetLeadIds as optional array of lead ids", () => {
  assert.match(schemaSource, /targetLeadIds:\s*v\.optional\(v\.array\(v\.id\("leads"\)\)\)/)
})

// campaigns.create mutation: targetLeadIds argument
test("campaigns.create accepts optional targetLeadIds argument", () => {
  assert.match(campaignsSource, /targetLeadIds:\s*v\.optional\(v\.array\(v\.id\("leads"\)\)\)/)
})

test("campaigns.create inserts targetLeadIds into campaigns table", () => {
  assert.match(campaignsSource, /targetLeadIds:\s*args\.targetLeadIds/)
})

// leads.listAllSummary query
test("leads.ts exports a listAllSummary query", () => {
  assert.match(leadsSource, /export\s+const\s+listAllSummary\s*=\s*query\(/)
})

test("listAllSummary takes no arguments", () => {
  const listAllBlock = leadsSource.slice(leadsSource.indexOf("listAllSummary"))
  assert.match(listAllBlock, /args:\s*\{\s*\}/)
})

test("listAllSummary returns _id, name, type, city, region, status, contactEmail, clusterId", () => {
  const listAllBlock = leadsSource.slice(leadsSource.indexOf("listAllSummary"))
  assert.match(listAllBlock, /_id:\s*lead\._id/)
  assert.match(listAllBlock, /name:\s*lead\.name/)
  assert.match(listAllBlock, /type:\s*lead\.type/)
  assert.match(listAllBlock, /city:\s*lead\.city/)
  assert.match(listAllBlock, /region:\s*lead\.region/)
  assert.match(listAllBlock, /status:\s*lead\.status/)
  assert.match(listAllBlock, /contactEmail:\s*lead\.contactEmail/)
  assert.match(listAllBlock, /clusterId:\s*lead\.clusterId/)
})

test("listAllSummary sorts by name", () => {
  const listAllBlock = leadsSource.slice(leadsSource.indexOf("listAllSummary"))
  assert.match(listAllBlock, /\.sort\(/)
  assert.match(listAllBlock, /localeCompare/)
})
