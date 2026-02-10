import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/dashboard/needs-follow-up.tsx",
  "utf8",
)

test("exports NeedsFollowUp as a named export", () => {
  assert.match(source, /export function NeedsFollowUp/)
})

test("exports FollowUpLeadItem interface", () => {
  assert.match(source, /export interface FollowUpLeadItem/)
})

test("exports NeedsFollowUpStats interface", () => {
  assert.match(source, /export interface NeedsFollowUpStats/)
})

test("FollowUpLeadItem has required fields", () => {
  assert.match(source, /_id: string/)
  assert.match(source, /name: string/)
  assert.match(source, /city: string/)
  assert.match(source, /type: string/)
  assert.match(source, /nextFollowUpAt: number/)
})

test("NeedsFollowUpStats has dueToday, overdue, and now fields", () => {
  assert.match(source, /dueToday: FollowUpLeadItem\[\]/)
  assert.match(source, /overdue: FollowUpLeadItem\[\]/)
  assert.match(source, /now: number/)
})

test("accepts NeedsFollowUpProps with stats prop", () => {
  assert.match(source, /interface NeedsFollowUpProps/)
  assert.match(source, /stats: NeedsFollowUpStats/)
})

test("uses Card components from shadcn/ui", () => {
  assert.match(
    source,
    /import\s*\{[\s\S]*Card[\s\S]*\}\s*from\s*"@\/components\/ui\/card"/,
  )
})

test("uses p-4 on CardHeader and p-4 pt-0 on CardContent per design rules", () => {
  assert.match(source, /CardHeader className="p-4"/)
  assert.match(source, /CardContent className="p-4 pt-0"/)
})

test("card title is Needs Follow-up", () => {
  assert.match(source, />Needs Follow-up</)
})

test("has a data-testid on the card", () => {
  assert.match(source, /data-testid="needs-follow-up"/)
})

test("has a data-testid on the list container", () => {
  assert.match(source, /data-testid="needs-follow-up-list"/)
})

test("combines overdue items before dueToday items", () => {
  assert.match(source, /\[\.\.\.overdue, \.\.\.dueToday\]/)
})

test("renders lead names as links to /leads/[id]", () => {
  assert.match(source, /href=\{`\/leads\/\$\{lead\._id\}`\}/)
})

test("shows lead city and type", () => {
  assert.match(source, /lead\.city/)
  assert.match(source, /toLabel\(lead\.type\)/)
})

test("shows overdue text with day count for overdue items", () => {
  assert.match(source, /overdue/)
  assert.match(source, /day.*overdue/)
})

test("shows Due today for items due today", () => {
  assert.match(source, /Due today/)
})

test("overdue text uses red color", () => {
  assert.match(source, /text-red-600/)
})

test("has View all link to leads page filtered by needsFollowUp", () => {
  assert.match(source, /View all/)
  assert.match(source, /\/leads\?needsFollowUp=true/)
})

test("returns null when no items exist", () => {
  assert.match(source, /if \(items\.length === 0\) return null/)
})

test("uses Link from next/link", () => {
  assert.match(source, /import Link from "next\/link"/)
})

test("uses vertical layout with space-y-2", () => {
  assert.match(source, /space-y-2/)
})

test("lead rows use flex between layout", () => {
  assert.match(source, /flex items-center justify-between/)
})

test("lead name uses font-medium", () => {
  assert.match(source, /font-medium/)
})

test("city and type use muted foreground text", () => {
  assert.match(source, /text-muted-foreground/)
})

// Verify page.tsx integrates the component
const pageSource = fs.readFileSync("src/app/page.tsx", "utf8")

test("page.tsx imports NeedsFollowUp component", () => {
  assert.match(
    pageSource,
    /import\s+\{\s*NeedsFollowUp\s*\}\s+from\s+"@\/components\/dashboard\/needs-follow-up"/,
  )
})

test("page.tsx renders NeedsFollowUp with stats prop", () => {
  assert.match(pageSource, /<NeedsFollowUp/)
  assert.match(pageSource, /stats=\{\{/)
})

test("page.tsx passes followUps data to NeedsFollowUp", () => {
  assert.match(pageSource, /dueToday: followUps\.dueToday/)
  assert.match(pageSource, /overdue: followUps\.overdue/)
})

test("page.tsx no longer imports Card components directly for follow-ups", () => {
  assert.doesNotMatch(pageSource, /import[\s\S]*Card[\s\S]*from\s+"@\/components\/ui\/card"/)
})
