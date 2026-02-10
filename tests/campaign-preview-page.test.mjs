import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/campaigns/[id]/preview/page.tsx", "utf8")

test("is a client component", () => {
  assert.match(source, /"use client"/)
})

test("wraps with AppLayout", () => {
  assert.match(source, /import\s+\{.*AppLayout.*\}\s+from\s+"@\/components\/layout\/app-layout"/)
  assert.match(source, /<AppLayout[\s\S]*>[\s\S]*<\/AppLayout>/)
})

test("fetches campaign with useQuery", () => {
  assert.match(source, /useQuery\(api\.campaigns\.get/)
})

test("fetches generated emails with useQuery", () => {
  assert.match(source, /useQuery\(api\.generatedEmails\.listByCampaign/)
})

test("renders breadcrumb navigation with back to campaigns", () => {
  assert.match(source, /href="\/campaigns"/)
  assert.match(source, /Campaigns/)
  assert.match(source, /Preview/)
})

test("renders page heading Email Preview", () => {
  assert.match(source, /Email Preview/)
})

test("renders email count and approved count stats", () => {
  assert.match(source, /emails\.length/)
  assert.match(source, /approvedCount/)
})

test("renders lead list sidebar", () => {
  assert.match(source, /emails\.map/)
  assert.match(source, /email\.leadName/)
})

test("clicking a lead selects it", () => {
  assert.match(source, /setSelectedEmailId/)
  assert.match(source, /onClick/)
})

test("shows email subject and body in detail panel", () => {
  assert.match(source, /email\.subject/)
  assert.match(source, /email\.body/)
})

test("shows word count for email body", () => {
  assert.match(source, /countWords/)
  assert.match(source, /words/)
})

test("shows personalization variables used", () => {
  assert.match(source, /extractPersonalizationVars/)
  assert.match(source, /Variables:/)
})

test("has Regenerate button", () => {
  assert.match(source, /Regenerate/)
  assert.match(source, /handleRegenerate/)
})

test("regenerate calls generateEmail action then regenerate mutation", () => {
  assert.match(source, /generateEmailAction\(/)
  assert.match(source, /regenerateEmail\(/)
})

test("has Edit button that toggles editing mode", () => {
  assert.match(source, /Edit/)
  assert.match(source, /isEditing/)
  assert.match(source, /handleStartEdit/)
})

test("edit mode shows input for subject and textarea for body", () => {
  assert.match(source, /<Input[\s\S]*?editSubject/)
  assert.match(source, /<Textarea[\s\S]*?editBody/)
})

test("save edit calls updateEmail mutation", () => {
  assert.match(source, /updateEmail\(/)
  assert.match(source, /handleSaveEdit/)
})

test("has Approve button that calls updateStatus", () => {
  assert.match(source, /Approve/)
  assert.match(source, /handleApprove/)
  assert.match(source, /updateStatus\(/)
})

test("renders status badge for each email (generated, edited, approved)", () => {
  assert.match(source, /statusConfig/)
  assert.match(source, /"generated"/)
  assert.match(source, /"edited"/)
  assert.match(source, /"approved"/)
})

test("renders loading state", () => {
  assert.match(source, /Loader2/)
  assert.match(source, /animate-spin/)
})

test("renders empty state when no emails", () => {
  assert.match(source, /No emails generated yet/)
})

test("renders campaign not found state", () => {
  assert.match(source, /Campaign not found/)
})

test("shows generated timestamp", () => {
  assert.match(source, /email\.generatedAt/)
  assert.match(source, /toLocaleString/)
})
