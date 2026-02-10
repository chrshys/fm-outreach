import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const layoutSource = fs.readFileSync("src/components/layout/app-layout.tsx", "utf8")
const leadsSource = fs.readFileSync("src/app/leads/page.tsx", "utf8")
const leadDetailSource = fs.readFileSync("src/app/leads/[id]/page.tsx", "utf8")

test("sidebar navigation includes dashboard, leads, map, clusters, campaigns, and settings", () => {
  for (const href of ["/", "/leads", "/map", "/clusters", "/campaigns", "/settings"]) {
    assert.match(layoutSource, new RegExp(`href:\\s*"${href}"`))
  }
})

test("leads page links to lead detail route", () => {
  assert.match(leadsSource, /import\s+\{\s*useRouter\s*\}\s+from\s+"next\/navigation"/)
  assert.match(leadsSource, /router\.push\(`\/leads\/\$\{leadId\}`\)/)
})

test("lead detail page links back to leads route", () => {
  assert.match(leadDetailSource, /import\s+Link\s+from\s+"next\/link"/)
  assert.match(leadDetailSource, /href="\/leads"/)
})
