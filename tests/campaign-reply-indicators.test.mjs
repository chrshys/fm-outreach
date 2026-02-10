import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const detailSource = fs.readFileSync("src/app/campaigns/[id]/page.tsx", "utf8")
const querySource = fs.readFileSync("convex/campaigns.ts", "utf8")
const timelineSource = fs.readFileSync(
  "src/components/leads/activity-timeline.tsx",
  "utf8"
)
const leadDetailSource = fs.readFileSync("src/app/leads/[id]/page.tsx", "utf8")

// --- Backend: listLeads returns repliedAt ---

test("listLeads map type includes repliedAt field", () => {
  assert.match(querySource, /repliedAt: number \| undefined/)
})

test("listLeads preserves repliedAt from earlier emails when higher sequence step has none", () => {
  assert.match(querySource, /const repliedAt = email\.repliedAt \?\? existing\?\.repliedAt/)
})

test("listLeads carries forward repliedAt from earlier sequence step", () => {
  assert.match(querySource, /existing\.repliedAt = email\.repliedAt/)
  assert.match(querySource, /existing\.status = "replied"/)
})

test("listLeads returns repliedAt in results", () => {
  assert.match(querySource, /repliedAt: emailData\?\.repliedAt/)
})

// --- UI: replied rows highlighted ---

test("campaign detail imports cn utility for conditional classes", () => {
  assert.match(detailSource, /import.*\{ cn \}.*from "@\/lib\/utils"/)
})

test("replied leads get emerald highlight on table row", () => {
  assert.match(
    detailSource,
    /lead\.status === "replied" && "bg-emerald-50 dark:bg-emerald-950\/20"/
  )
})

// --- UI: View Reply link ---

test("View Reply link appears for leads with repliedAt", () => {
  assert.match(detailSource, /\{lead\.repliedAt \? \(/)
  assert.match(detailSource, /View Reply/)
})

test("View Reply links to lead detail page with #activity hash", () => {
  assert.match(detailSource, /href=\{`\/leads\/\$\{lead\._id\}#activity`\}/)
})

test("View Reply link uses Reply icon", () => {
  assert.match(detailSource, /<Reply className="size-3" \/>/)
})

test("View Reply link styled with emerald text", () => {
  assert.match(detailSource, /text-emerald-700/)
  assert.match(detailSource, /dark:text-emerald-400/)
})

// --- Activity timeline: email_replied type ---

test("activity timeline defines email_replied type with Reply icon and emerald color", () => {
  assert.match(timelineSource, /email_replied:\s*\{/)
  assert.match(timelineSource, /icon:\s*Reply,/)
  assert.match(timelineSource, /iconClassName:\s*"text-emerald-600"/)
})

test("activity timeline imports Reply icon from lucide-react", () => {
  assert.match(timelineSource, /Reply/)
})

// --- Lead detail page: activity anchor ---

test("lead detail page activity timeline card has id='activity' for hash links", () => {
  assert.match(leadDetailSource, /<Card id="activity">/)
})
