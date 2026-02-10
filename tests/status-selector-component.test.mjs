import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/leads/status-selector.tsx", "utf8")

test("renders a Select with all lead statuses", () => {
  assert.match(source, /export function StatusSelector\(/)
  assert.match(source, /<Select value=\{value\} disabled=\{disabled\} onValueChange=\{\(nextValue\) => void onChange\(nextValue as LeadStatus\)\}>/)

  const statuses = [
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
  ]

  for (const status of statuses) {
    assert.match(source, new RegExp(`value: \"${status}\"`))
  }
})

test("shows color indicators for each status option", () => {
  assert.match(source, /colorClassName:/)
  assert.match(source, /<span className=\{`size-2 rounded-full \$\{option\.colorClassName\}`\} aria-hidden="true" \/>/)
})
