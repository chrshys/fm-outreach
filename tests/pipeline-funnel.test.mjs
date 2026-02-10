import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/dashboard/pipeline-funnel.tsx", "utf8")

test("exports PipelineFunnel as a named export", () => {
  assert.match(source, /export function PipelineFunnel/)
})

test("accepts PipelineFunnelProps with pipeline record", () => {
  assert.match(source, /interface PipelineFunnelProps/)
  assert.match(source, /pipeline: Record<string, number>/)
})

test("renders 5 pipeline statuses in correct order", () => {
  assert.match(source, /new_lead/)
  assert.match(source, /enriched/)
  assert.match(source, /outreach_started/)
  assert.match(source, /replied/)
  assert.match(source, /onboarded/)
})

test("PIPELINE_ORDER contains exactly 5 statuses", () => {
  const match = source.match(/const PIPELINE_ORDER = \[([\s\S]*?)\] as const/)
  assert.ok(match, "PIPELINE_ORDER constant should exist")
  const entries = match[1].match(/"[a-z_]+"/g)
  assert.equal(entries.length, 5, "Should have exactly 5 pipeline statuses")
})

test("labels map statuses to human-readable names", () => {
  assert.match(source, /new_lead:\s*"New"/)
  assert.match(source, /enriched:\s*"Enriched"/)
  assert.match(source, /outreach_started:\s*"Outreach"/)
  assert.match(source, /replied:\s*"Replied"/)
  assert.match(source, /onboarded:\s*"Onboarded"/)
})

test("imports STATUS_COLORS from map/status-colors for bar colors", () => {
  assert.match(source, /import\s+\{[\s\S]*STATUS_COLORS[\s\S]*\}\s+from\s+"@\/components\/map\/status-colors"/)
})

test("uses STATUS_COLORS for bar backgroundColor via inline style", () => {
  assert.match(source, /backgroundColor:\s*STATUS_COLORS\[status\]/)
})

test("has a data-testid on the funnel container", () => {
  assert.match(source, /data-testid="pipeline-funnel"/)
})

test("calculates bar width as percentage of max count", () => {
  assert.match(source, /\(count \/ max\) \* 100/)
})

test("sets minimum bar width of 2%", () => {
  assert.match(source, /Math\.max\(/)
  assert.match(source, /, 2\)/)
})

test("renders each row with label, bar, and count", () => {
  assert.match(source, /PIPELINE_ORDER\.map/)
  assert.match(source, /PIPELINE_LABELS\[status\]/)
  assert.match(source, /\{count\}/)
})

test("uses Card components from shadcn/ui", () => {
  assert.match(source, /import\s*\{[\s\S]*Card[\s\S]*\}\s*from\s*"@\/components\/ui\/card"/)
})

test("uses p-4 on CardHeader and p-4 pt-0 on CardContent per design rules", () => {
  assert.match(source, /CardHeader className="p-4"/)
  assert.match(source, /CardContent className="p-4 pt-0"/)
})

test("card title is Pipeline", () => {
  assert.match(source, />Pipeline</)
})

test("bars have rounded corners and h-5 height", () => {
  assert.match(source, /h-5 rounded/)
})

test("status labels have muted foreground text style", () => {
  assert.match(source, /text-sm text-muted-foreground/)
})

test("count numbers use font-medium", () => {
  assert.match(source, /text-sm font-medium/)
})
