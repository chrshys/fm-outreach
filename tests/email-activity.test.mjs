import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/dashboard/email-activity.tsx",
  "utf8",
)

test("exports EmailActivity as a named export", () => {
  assert.match(source, /export function EmailActivity/)
})

test("exports EmailActivityStats interface", () => {
  assert.match(source, /export interface EmailActivityStats/)
})

test("EmailActivityStats has sent, opened, clicked fields", () => {
  assert.match(source, /sent: number/)
  assert.match(source, /opened: number/)
  assert.match(source, /clicked: number/)
})

test("accepts EmailActivityProps with stats prop", () => {
  assert.match(source, /interface EmailActivityProps/)
  assert.match(source, /stats: EmailActivityStats/)
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

test("card title is Email Activity (7d)", () => {
  assert.match(source, />Email Activity \(7d\)</)
})

test("has a data-testid on the card", () => {
  assert.match(source, /data-testid="email-activity"/)
})

test("renders stat-row layout with sent, opened, clicked", () => {
  assert.match(source, /data-testid="email-activity-stats"/)
  assert.match(source, />Sent</)
  assert.match(source, />Opened</)
  assert.match(source, />Clicked</)
})

test("displays stat values from props", () => {
  assert.match(source, /\{stats\.sent\}/)
  assert.match(source, /\{stats\.opened\}/)
  assert.match(source, /\{stats\.clicked\}/)
})

test("uses horizontal stat-row layout (flex between)", () => {
  assert.match(source, /flex items-center justify-between/)
})

test("stat labels use muted foreground text", () => {
  assert.match(source, /text-muted-foreground/)
})

test("stat values use font-medium", () => {
  assert.match(source, /font-medium/)
})

// Verify page.tsx integrates the component
const pageSource = fs.readFileSync("src/app/page.tsx", "utf8")

test("page.tsx imports EmailActivity component", () => {
  assert.match(
    pageSource,
    /import\s+\{\s*EmailActivity\s*\}\s+from\s+"@\/components\/dashboard\/email-activity"/,
  )
})

test("page.tsx renders EmailActivity with stats prop", () => {
  assert.match(pageSource, /<EmailActivity/)
  assert.match(pageSource, /stats=\{\{/)
})
