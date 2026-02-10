import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/leads/page.tsx", "utf8")

test("leads page imports Tabs components", () => {
  assert.match(source, /import\s+\{[^}]*Tabs[^}]*TabsList[^}]*TabsTrigger[^}]*\}\s+from\s+"@\/components\/ui\/tabs"/)
})

test("leads page renders tab navigation with All Leads and Social Outreach", () => {
  assert.match(source, /All Leads/)
  assert.match(source, /Social Outreach/)
  assert.match(source, /defaultValue="all"/)
})

test("Social Outreach tab links to /leads/social", () => {
  assert.match(source, /import\s+Link\s+from\s+"next\/link"/)
  assert.match(source, /href="\/leads\/social"/)
})

test("tabs use line variant", () => {
  assert.match(source, /variant="line"/)
})

test("tabs appear between page heading and search", () => {
  const headingIndex = source.indexOf("<h2")
  const tabsIndex = source.indexOf("<Tabs")
  const searchIndex = source.indexOf("<LeadSearch")
  assert.ok(headingIndex < tabsIndex, "Tabs should appear after heading")
  assert.ok(tabsIndex < searchIndex, "Tabs should appear before search")
})
