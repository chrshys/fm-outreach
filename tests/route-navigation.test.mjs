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

test("lead detail page back button uses browser history", () => {
  assert.match(leadDetailSource, /import\s+\{\s*useParams,\s*useRouter\s*\}\s+from\s+"next\/navigation"/)
  assert.match(leadDetailSource, /onClick=\{\(\)\s*=>\s*router\.back\(\)\}/)
})
