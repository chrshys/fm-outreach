import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("src/components/leads/bulk-actions.tsx", "utf8")

test("bulk actions uses convex mutations for status and cluster updates", () => {
  assert.match(source, /useMutation\(api\.leads\.bulkUpdateStatus\)/)
  assert.match(source, /useMutation\(api\.leads\.bulkAssignCluster\)/)
  assert.match(source, /await bulkUpdateStatus\(\{\s*leadIds:\s*selectedLeadIds,\s*status,\s*\}\)/s)
  assert.match(source, /await bulkAssignCluster\(\{\s*leadIds:\s*selectedLeadIds,\s*clusterId,\s*\}\)/s)
})

test("bulk actions renders selected count and required dropdown actions", () => {
  assert.match(source, /selectedLeadIds\.length === 0/)
  assert.match(source, /selectedLeadIds\.length\} selected/)
  assert.match(source, />\s*Change Status\s*</)
  assert.match(source, />\s*Assign to Cluster\s*</)
  assert.match(source, /LEAD_STATUSES\.map/)
  assert.match(source, /clusterOptions\.map/)
})
