import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/status-colors.ts",
  "utf8",
)

test("exports STATUS_COLORS record", () => {
  assert.match(source, /export\s+const\s+STATUS_COLORS/)
})

test("exports getStatusColor function", () => {
  assert.match(source, /export\s+function\s+getStatusColor/)
})

test("maps new_lead to gray", () => {
  assert.match(source, /new_lead:\s*"#6b7280"/)
})

test("maps enriched to blue", () => {
  assert.match(source, /enriched:\s*"#3b82f6"/)
})

test("maps outreach_started to amber", () => {
  assert.match(source, /outreach_started:\s*"#f59e0b"/)
})

test("maps replied to green", () => {
  assert.match(source, /replied:\s*"#22c55e"/)
})

test("maps meeting_booked to purple", () => {
  assert.match(source, /meeting_booked:\s*"#a855f7"/)
})

test("maps onboarded to emerald", () => {
  assert.match(source, /onboarded:\s*"#10b981"/)
})

test("maps no_email to orange", () => {
  assert.match(source, /no_email:\s*"#f97316"/)
})

test("maps declined to red", () => {
  assert.match(source, /declined:\s*"#ef4444"/)
})

test("maps not_interested to red", () => {
  assert.match(source, /not_interested:\s*"#ef4444"/)
})

test("maps bounced to slate", () => {
  assert.match(source, /bounced:\s*"#64748b"/)
})

test("maps no_response to slate", () => {
  assert.match(source, /no_response:\s*"#64748b"/)
})

test("covers all 11 pipeline statuses", () => {
  const statuses = [
    "new_lead",
    "enriched",
    "outreach_started",
    "replied",
    "meeting_booked",
    "onboarded",
    "no_email",
    "declined",
    "not_interested",
    "bounced",
    "no_response",
  ]
  for (const status of statuses) {
    assert.match(source, new RegExp(`${status}:\\s*"`), `missing status: ${status}`)
  }
})

test("getStatusColor returns a default color for unknown status", () => {
  assert.match(source, /\?\?\s*DEFAULT_COLOR/)
})
