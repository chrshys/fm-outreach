import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("src/components/leads/follow-up-prompt.tsx", "utf8")

test("renders dialog with Set follow-up reminder title", () => {
  assert.match(source, /Set follow-up reminder\?/)
})

test("defaults date picker to 3 days from now", () => {
  assert.match(source, /date\.setDate\(date\.getDate\(\) \+ 3\)/)
  assert.match(source, /useState\(getDefaultFollowUpDate\)/)
})

test("uses leads setFollowUp mutation", () => {
  assert.match(source, /useMutation\(api\.leads\.setFollowUp\)/)
})

test("submits parsed date through setFollowUp mutation", () => {
  assert.match(source, /await setFollowUp\(\{\s*leadId,\s*nextFollowUpAt:\s*parseDateInputValue\(dateInput\),\s*\}\)/s)
})

test("has a Skip button to dismiss without setting reminder", () => {
  assert.match(source, /Skip/)
  assert.match(source, /handleSkip/)
  assert.match(source, /onOpenChange\(false\)/)
})

test("has a date input of type date", () => {
  assert.match(source, /type="date"/)
})

test("accepts leadId, open, and onOpenChange props", () => {
  assert.match(source, /leadId:\s*Id<"leads">/)
  assert.match(source, /open:\s*boolean/)
  assert.match(source, /onOpenChange:\s*\(open:\s*boolean\)\s*=>\s*void/)
})

test("resets date to default when dialog opens", () => {
  assert.match(source, /setDateInput\(getDefaultFollowUpDate\(\)\)/)
})

test("description mentions defaulting to 3 days", () => {
  assert.match(source, /Defaults to 3 days from now/)
})
