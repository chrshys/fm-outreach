import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/clusters/page.tsx", "utf8")

test("imports useMutation from convex/react", () => {
  assert.match(source, /import\s+\{.*useMutation.*\}\s+from\s+"convex\/react"/)
})

test("imports Trash2 icon from lucide-react", () => {
  assert.match(source, /import\s+\{.*Trash2.*\}\s+from\s+"lucide-react"/)
})

test("imports Button component", () => {
  assert.match(source, /import\s+\{\s*Button\s*\}\s+from\s+"@\/components\/ui\/button"/)
})

test("initializes deleteCluster mutation", () => {
  assert.match(source, /useMutation\(api\.clusters\.deleteCluster\)/)
})

test("defines handleDelete that stops event propagation", () => {
  assert.match(source, /handleDelete/)
  assert.match(source, /e\.stopPropagation\(\)/)
})

test("shows confirmation dialog before deleting", () => {
  assert.match(source, /window\.confirm/)
})

test("confirmation message includes cluster name and lead count", () => {
  assert.match(source, /cluster\.name/)
  assert.match(source, /cluster\.leadCount/)
})

test("calls deleteCluster mutation with clusterId", () => {
  assert.match(source, /deleteCluster\(\{ clusterId: cluster\._id \}\)/)
})

test("clears selected cluster when deleting the selected one", () => {
  assert.match(source, /selectedClusterId === cluster\._id/)
  assert.match(source, /setSelectedClusterId\(null\)/)
})

test("renders a delete button with Trash2 icon on each cluster card", () => {
  assert.match(source, /<Button/)
  assert.match(source, /variant="ghost"/)
  assert.match(source, /<Trash2/)
})

test("delete button has accessible label", () => {
  assert.match(source, /Delete cluster/)
})

test("delete button uses destructive hover color", () => {
  assert.match(source, /hover:text-destructive/)
})

test("does not contain Auto-generate Clusters button", () => {
  assert.doesNotMatch(source, /Auto-generate/)
})

test("Cluster type includes boundary field", () => {
  assert.match(source, /boundary: Array<\{ lat: number; lng: number \}>/)
})
