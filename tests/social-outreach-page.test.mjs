import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/leads/social/page.tsx", "utf8")

test("wraps the social outreach page with AppLayout", () => {
  assert.match(source, /import\s+\{\s*AppLayout\s*\}\s+from\s+"@\/components\/layout\/app-layout"/)
  assert.match(source, /<AppLayout>[\s\S]*<\/AppLayout>/)
})

test("uses the listSocialOutreach query from Convex", () => {
  assert.match(source, /api\.leads\.listSocialOutreach/)
  assert.match(source, /import\s+\{\s*useConvex\s*\}\s+from\s+"convex\/react"/)
})

test("renders correct table columns for social outreach", () => {
  for (const column of [
    "Name",
    "City",
    "Status",
    "Facebook",
    "Instagram",
    "Last Social Touch",
    "Follow-up Due",
  ]) {
    assert.match(source, new RegExp(`<TableHead>${column}<\\/TableHead>`))
  }
})

test("renders tab navigation with All Leads and Social Outreach tabs", () => {
  assert.match(source, /import\s+\{[^}]*Tabs[^}]*\}\s+from\s+"@\/components\/ui\/tabs"/)
  assert.match(source, /All Leads/)
  assert.match(source, /Social Outreach/)
  assert.match(source, /defaultValue="social"/)
})

test("All Leads tab links back to /leads", () => {
  assert.match(source, /import\s+Link\s+from\s+"next\/link"/)
  assert.match(source, /href="\/leads"/)
})

test("renders social link icons for Facebook and Instagram columns", () => {
  assert.match(source, /import\s+\{[^}]*ExternalLink[^}]*\}\s+from\s+"lucide-react"/)
  assert.match(source, /function SocialLink/)
  assert.match(source, /<SocialLink\s+url=\{lead\.socialLinks\?\.facebook\}/)
  assert.match(source, /<SocialLink\s+url=\{lead\.socialLinks\?\.instagram\}/)
})

test("shows mdash when social link is missing", () => {
  assert.match(source, /&mdash;/)
})

test("displays overdue indicator for past follow-up dates", () => {
  assert.match(source, /function isOverdue/)
  assert.match(source, /Overdue/)
  assert.match(source, /text-red-600/)
})

test("includes loading, error, and empty states", () => {
  assert.match(source, /Loading leads\.\.\./)
  assert.match(source, /Unable to load social outreach leads\./)
  assert.match(source, /No leads match the social outreach criteria\./)
})

test("navigates to lead detail when a row is clicked", () => {
  assert.match(source, /router\.push\(`\/leads\/\$\{leadId\}`\)/)
  assert.match(source, /function handleRowClick/)
  assert.match(source, /function handleRowKeyDown/)
  assert.match(source, /onClick=\{\(event\) => handleRowClick\(event, lead\._id\)\}/)
  assert.match(source, /onKeyDown=\{\(event\) => handleRowKeyDown\(event, lead\._id\)\}/)
})

test("renders page heading consistent with leads page", () => {
  assert.match(source, /<h2[^>]*>Leads<\/h2>/)
  assert.match(source, /Track outreach and follow-up timing by lead\./)
})
