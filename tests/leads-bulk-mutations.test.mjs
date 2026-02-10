import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("convex/leads.ts", "utf8")

test("exports bulk status mutation with leads id array and status validator", () => {
  assert.match(source, /export const bulkUpdateStatus = mutation\(/)
  assert.match(source, /leadIds:\s*v\.array\(v\.id\("leads"\)\)/)
  assert.match(source, /status:\s*leadStatusValidator/)
  assert.match(source, /await ctx\.db\.patch\(leadId,\s*\{\s*status:\s*args\.status,\s*updatedAt:\s*now,\s*\}\)/s)
  assert.match(source, /await ctx\.db\.insert\("activities",\s*\{\s*leadId,\s*type:\s*"status_changed"/s)
  assert.match(source, /description:\s*`Lead status changed to \$\{args\.status\}`/)
  assert.match(source, /createdAt:\s*now/)
})

test("exports bulk cluster mutation with leads id array and cluster id", () => {
  assert.match(source, /export const bulkAssignCluster = mutation\(/)
  assert.match(source, /clusterId:\s*v\.id\("clusters"\)/)
  assert.match(source, /await ctx\.db\.patch\(leadId,\s*\{\s*clusterId:\s*args\.clusterId,\s*updatedAt:\s*now,\s*\}\)/s)
  assert.match(source, /await ctx\.db\.insert\("activities",\s*\{\s*leadId,\s*type:\s*"note_added"/s)
  assert.match(source, /description:\s*`Lead assigned to cluster \$\{args\.clusterId\}`/)
  assert.match(source, /updatedCount:\s*uniqueLeadIds\.length/)
})
