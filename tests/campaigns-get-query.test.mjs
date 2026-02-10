import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("convex/campaigns.ts", "utf8")

test("campaigns.ts exports a get query", () => {
  assert.match(source, /export\s+const\s+get\s*=\s*query\(/)
})

test("get accepts campaignId as a campaigns id argument", () => {
  assert.match(source, /campaignId:\s*v\.id\("campaigns"\)/)
})

test("get fetches campaign from database by id", () => {
  assert.match(source, /ctx\.db\.get\(args\.campaignId\)/)
})
