import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/campaigns/[id]/page.tsx", "utf8")

test("campaign detail page is a client component with correct imports", () => {
  assert.match(source, /^"use client"/)
  assert.match(source, /import.*useQuery.*from "convex\/react"/)
  assert.match(source, /import.*api.*from.*convex\/_generated\/api/)
  assert.match(source, /import.*AppLayout.*from "@\/components\/layout\/app-layout"/)
})

test("fetches campaign and leads data via Convex queries", () => {
  assert.match(source, /useQuery\([\s\S]*?api\.campaigns\.get,[\s\S]*?\{\s*campaignId[\s,]*\}\s*\)/)
  assert.match(source, /useQuery\(api\.campaigns\.listLeads,\s*\{\s*campaignId\s*\}\)/)
})

test("renders breadcrumb navigation back to campaigns list", () => {
  assert.match(source, /href="\/campaigns"/)
  assert.match(source, /<ChevronRight/)
  assert.match(source, /\{campaign\.name\}/)
})

test("displays campaign name, status badge, and creation date in header", () => {
  assert.match(source, /text-xl font-semibold tracking-tight/)
  assert.match(source, /\{campaign\.name\}/)
  assert.match(source, /<Badge className=\{campaignStatusStyles\[campaign\.status\]\}>/)
  assert.match(source, /\{toLabel\(campaign\.status\)\}/)
  assert.match(source, /Created \{formatDate\(campaign\.createdAt\)\}/)
})

test("renders all six stats cards with correct labels", () => {
  assert.match(source, /Total Leads/)
  assert.match(source, /Emails Sent/)
  assert.match(source, /Open Rate/)
  assert.match(source, /Click Rate/)
  assert.match(source, /Reply Rate/)
  assert.match(source, /Bounce Rate/)
})

test("computes rates from campaign stats", () => {
  assert.match(source, /const sent = stats\?\.sent \?\? 0/)
  assert.match(source, /const openRate = pct\(stats\?\.opened \?\? 0, sent\)/)
  assert.match(source, /const clickRate = pct\(stats\?\.clicked \?\? 0, sent\)/)
  assert.match(source, /const replyRate = pct\(stats\?\.replied \?\? 0, sent\)/)
  assert.match(source, /const bounceRate = pct\(stats\?\.bounced \?\? 0, sent\)/)
})

test("renders leads table with correct column headers", () => {
  assert.match(source, /<TableHead>Name<\/TableHead>/)
  assert.match(source, /<TableHead>Email<\/TableHead>/)
  assert.match(source, /<TableHead>Sequence Step<\/TableHead>/)
  assert.match(source, /<TableHead>Status<\/TableHead>/)
  assert.match(source, /<TableHead>Last Activity<\/TableHead>/)
})

test("lead name in table links to lead detail page", () => {
  assert.match(source, /href=\{`\/leads\/\$\{lead\._id\}`\}/)
  assert.match(source, /\{lead\.name\}/)
  assert.match(source, /hover:underline/)
})

test("shows lead email status with styled badge", () => {
  assert.match(source, /const leadStatusStyles/)
  assert.match(source, /pending:.*bg-zinc-100/)
  assert.match(source, /sent:.*bg-blue-100/)
  assert.match(source, /opened:.*bg-indigo-100/)
  assert.match(source, /replied:.*bg-emerald-100/)
  assert.match(source, /bounced:.*bg-red-100/)
  assert.match(source, /<Badge className=\{leadStatusStyles\[lead\.status\]\}>/)
})

test("shows loading and not-found states", () => {
  assert.match(source, /<Loader2 className="size-5 animate-spin text-muted-foreground" \/>/)
  assert.match(source, /Campaign not found\./)
})

test("shows empty state when no leads are assigned", () => {
  assert.match(source, /No leads assigned to this campaign yet\./)
})

test("displays campaign status styles for all statuses", () => {
  assert.match(source, /const campaignStatusStyles/)
  assert.match(source, /draft:.*bg-zinc-100/)
  assert.match(source, /pushed:.*bg-violet-100/)
  assert.match(source, /active:.*bg-emerald-100/)
  assert.match(source, /paused:.*bg-amber-100/)
  assert.match(source, /completed:.*bg-blue-100/)
})
