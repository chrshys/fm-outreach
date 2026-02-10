import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("src/components/leads/follow-up-reminder.tsx", "utf8")

test("renders current follow-up date and set reminder trigger", () => {
  assert.match(source, /Next follow-up: \{formatDisplayDate\(nextFollowUpAt\)\}/)
  assert.match(source, />\s*Set Reminder\s*</)
  assert.match(source, /Set Follow-up Reminder/)
})

test("submits selected date through leads setFollowUp mutation", () => {
  assert.match(source, /const setFollowUp = useMutation\(api\.leads\.setFollowUp\)/)
  assert.match(source, /type="date"/)
  assert.match(source, /await setFollowUp\(\{\s*leadId,\s*nextFollowUpAt:\s*parseDateInputValue\(dateInput\),\s*\}\)/s)
})

test("supports empty state and pre-fills existing follow-up date", () => {
  assert.match(source, /return "None set"/)
  assert.match(source, /setDateInput\(formatDateInputValue\(nextFollowUpAt\)\)/)
})
