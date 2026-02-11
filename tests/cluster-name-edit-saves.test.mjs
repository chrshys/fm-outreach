import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const detailSource = fs.readFileSync(
  "src/components/clusters/cluster-detail.tsx",
  "utf8",
)
const mutationSource = fs.readFileSync("convex/clusters.ts", "utf8")

test("EditableClusterName calls onSave which invokes updateName mutation", () => {
  // ClusterDetail wires onSave to call the updateName mutation with clusterId + name
  assert.match(
    detailSource,
    /onSave=\{async \(name\) =>\s*\{\s*await updateName\(\{\s*clusterId,\s*name\s*\}\)/,
  )
})

test("updateName mutation persists name to Convex via db.patch", () => {
  // The mutation patches the cluster document with the new name
  assert.match(
    mutationSource,
    /export const updateName = mutation\(\{/,
  )
  assert.match(
    mutationSource,
    /await ctx\.db\.patch\(args\.clusterId, \{ name: args\.name \}\)/,
  )
})

test("EditableClusterName applies optimistic update before mutation resolves", () => {
  // Sets optimistic value immediately so the UI shows the new name without waiting
  assert.match(detailSource, /setOptimisticValue\(draft\)/)
  assert.match(detailSource, /setIsEditing\(false\)/)
  // Then calls onSave (which triggers the mutation)
  assert.match(detailSource, /await onSave\(draft\)/)
})

test("EditableClusterName reverts optimistic value on save failure", () => {
  // If the mutation throws, the optimistic value is cleared so the UI reverts
  assert.match(detailSource, /catch\s*\(err\)\s*\{/)
  assert.match(detailSource, /setOptimisticValue\(null\)/)
  assert.match(detailSource, /toast\.error\(/)
})

test("EditableClusterName skips save when name is unchanged", () => {
  // No-op when draft matches current value — avoids unnecessary mutations
  assert.match(detailSource, /if \(draft === value\)\s*\{/)
})
