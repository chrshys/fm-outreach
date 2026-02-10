import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const filterSource = fs.readFileSync("src/components/leads/lead-filters.tsx", "utf8")
const pageSource = fs.readFileSync("src/app/leads/page.tsx", "utf8")

test("lead filters uses shadcn Select and Badge components", () => {
  assert.match(filterSource, /from\s+"@\/components\/ui\/select"/)
  assert.match(filterSource, /from\s+"@\/components\/ui\/badge"/)
  assert.match(filterSource, /<Select\s+value=\{value\.status\}/)
  assert.match(filterSource, /<Select\s+value=\{value\.type\}/)
  assert.match(filterSource, /<Select\s+value=\{value\.source\}/)
})

test("lead filters includes all required statuses, types, and sources", () => {
  for (const status of [
    "new_lead",
    "enriched",
    "outreach_started",
    "replied",
    "meeting_booked",
    "onboarded",
    "declined",
    "not_interested",
    "bounced",
    "no_response",
    "no_email",
  ]) {
    assert.match(filterSource, new RegExp(`"${status}"`))
  }

  for (const type of ["farm", "farmers_market", "retail_store", "roadside_stand", "other"]) {
    assert.match(filterSource, new RegExp(`"${type}"`))
  }

  for (const source of [
    "spreadsheet_import",
    "google_places",
    "farm_directory",
    "manual",
    "web_scrape",
  ]) {
    assert.match(filterSource, new RegExp(`"${source}"`))
  }
})

test("lead filters renders required toggles and dismissible pills", () => {
  assert.match(filterSource, /Has Email/)
  assert.match(filterSource, /Has Social/)
  assert.match(filterSource, /Needs Follow-up/)
  assert.match(filterSource, /activeFilters\.map\(\(filter\) => \(/)
  assert.match(filterSource, /aria-label=\{`Clear \$\{filter\.label\}`\}/)
})

test("leads page renders lead filters above the table", () => {
  assert.match(pageSource, /import\s+\{\s*LeadFilters/)
  assert.match(pageSource, /<LeadFilters\s+value=\{filters\}\s+onChange=\{setFilters\}\s*\/>/)
  assert.match(pageSource, /const\s+filteredLeads\s*=\s*useMemo\(/)
})
