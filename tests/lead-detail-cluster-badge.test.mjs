import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/leads/[id]/page.tsx", "utf8")

test("lead detail page queries the cluster when lead has a clusterId", () => {
  assert.match(source, /useQuery\(\s*api\.clusters\.get,\s*lead\?\.clusterId \? \{ clusterId: lead\.clusterId \} : "skip"\s*\)/)
})

test("lead detail page renders a cluster badge linking to the clusters page", () => {
  assert.match(source, /<Link href="\/clusters">/)
  assert.match(source, /<Badge variant="outline">\{cluster\.name\}<\/Badge>/)
})

test("cluster badge is conditionally rendered only when cluster exists", () => {
  assert.match(source, /\{cluster \? \(/)
})
