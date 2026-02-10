import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/dashboard/metric-cards.tsx", "utf8")

test("renders 4 metric cards in a responsive grid", () => {
  assert.match(source, /data-testid="metric-cards"/)
  assert.match(source, /grid-cols-1/)
  assert.match(source, /sm:grid-cols-2/)
  assert.match(source, /lg:grid-cols-4/)
})

test("Sellers Onboarded card shows X / 100 with Goal progress subtext", () => {
  assert.match(source, /Sellers Onboarded/)
  assert.match(source, /\{onboarded\} \/ 100/)
  assert.match(source, /Goal progress/)
})

test("Total Leads card shows count with All statuses subtext", () => {
  assert.match(source, /Total Leads/)
  assert.match(source, /\{totalLeads\}/)
  assert.match(source, /All statuses/)
})

test("Replies (30d) card shows count with reply rate percentage subtext", () => {
  assert.match(source, /Replies \(30d\)/)
  assert.match(source, /\{replies30d\}/)
  assert.match(source, /pct\(replies30d, sent30d\)/)
  assert.match(source, /reply rate/)
})

test("Follow-ups Due card shows count with overdue count in red", () => {
  assert.match(source, /Follow-ups Due/)
  assert.match(source, /\{followUpCount\}/)
  assert.match(source, /text-red-600/)
  assert.match(source, /\{overdueCount\} overdue/)
})

test("Follow-ups Due card shows None overdue when overdueCount is 0", () => {
  assert.match(source, /None overdue/)
  assert.match(source, /text-muted-foreground/)
})

test("conditionally renders overdue text in red only when overdueCount > 0", () => {
  assert.match(source, /overdueCount > 0/)
})

test("exports MetricCards as a named export", () => {
  assert.match(source, /export function MetricCards/)
})

test("accepts MetricCardsProps with all required fields", () => {
  assert.match(source, /interface MetricCardsProps/)
  assert.match(source, /onboarded: number/)
  assert.match(source, /totalLeads: number/)
  assert.match(source, /replies30d: number/)
  assert.match(source, /sent30d: number/)
  assert.match(source, /followUpCount: number/)
  assert.match(source, /overdueCount: number/)
})

test("has a local pct helper for reply rate calculation", () => {
  assert.match(source, /function pct\(n: number, d: number\): string/)
  // Returns "0%" when denominator is 0
  assert.match(source, /if \(d === 0\) return "0%"/)
})

test("uses Card components from shadcn/ui", () => {
  assert.match(source, /import\s*\{[\s\S]*Card[\s\S]*\}\s*from\s*"@\/components\/ui\/card"/)
})

test("uses p-4 on CardHeader and p-4 pt-0 on CardContent per design rules", () => {
  assert.match(source, /CardHeader className="p-4"/)
  assert.match(source, /CardContent className="p-4 pt-0"/)
})

test("card titles use muted foreground small text style", () => {
  assert.match(source, /text-sm font-medium text-muted-foreground/)
})

test("metric values use text-2xl font-bold", () => {
  assert.match(source, /text-2xl font-bold/)
})
