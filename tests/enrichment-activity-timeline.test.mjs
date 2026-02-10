import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("src/components/leads/activity-timeline.tsx", "utf8")

test("activity timeline includes enrichment_started and enrichment_finished in LeadActivityType", () => {
  assert.match(source, /\|\s*"enrichment_started"/)
  assert.match(source, /\|\s*"enrichment_finished"/)
})

test("activity timeline defines enrichment_started metadata with Sparkles icon and teal color", () => {
  assert.match(source, /enrichment_started:\s*\{/)
  assert.match(source, /icon:\s*Sparkles,/)
  assert.match(source, /iconClassName:\s*"text-teal-600"/)
  assert.match(source, /dotClassName:\s*"bg-teal-500"/)
})

test("activity timeline defines enrichment_finished metadata with CheckCircle2 icon and teal color", () => {
  assert.match(source, /enrichment_finished:\s*\{/)
  assert.match(source, /icon:\s*CheckCircle2,/)
})

test("activity timeline imports Sparkles and CheckCircle2 from lucide-react", () => {
  assert.match(source, /import\s*\{[^}]*Sparkles[^}]*\}\s*from\s*"lucide-react"/)
  assert.match(source, /import\s*\{[^}]*CheckCircle2[^}]*\}\s*from\s*"lucide-react"/)
})

test("enrichment_started and enrichment_finished use distinct icons", () => {
  // Extract the icon for enrichment_started
  const startedBlock = source.match(/enrichment_started:\s*\{[^}]+\}/s)?.[0]
  const finishedBlock = source.match(/enrichment_finished:\s*\{[^}]+\}/s)?.[0]

  assert.ok(startedBlock, "enrichment_started block exists")
  assert.ok(finishedBlock, "enrichment_finished block exists")

  const startedIcon = startedBlock.match(/icon:\s*(\w+)/)?.[1]
  const finishedIcon = finishedBlock.match(/icon:\s*(\w+)/)?.[1]

  assert.ok(startedIcon, "enrichment_started has an icon")
  assert.ok(finishedIcon, "enrichment_finished has an icon")
  assert.notEqual(startedIcon, finishedIcon, "enrichment_started and enrichment_finished should use different icons")
})
