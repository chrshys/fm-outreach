import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("src/components/leads/log-activity.tsx", "utf8")

test("imports FollowUpPrompt component", () => {
  assert.match(source, /import \{ FollowUpPrompt \} from "\.\/follow-up-prompt"/)
})

test("tracks showFollowUpPrompt state", () => {
  assert.match(source, /useState\(false\)/)
  assert.match(source, /showFollowUpPrompt/)
  assert.match(source, /setShowFollowUpPrompt/)
})

test("sets showFollowUpPrompt to true after logging a social_dm_sent", () => {
  assert.match(source, /const wasDmSent = openDialogType === "social_dm_sent"/)
  assert.match(source, /if \(wasDmSent\)\s*\{\s*setShowFollowUpPrompt\(true\)\s*\}/s)
})

test("does not trigger follow-up prompt for note_added or phone_call", () => {
  // The condition only triggers for social_dm_sent, not other types
  assert.match(source, /openDialogType === "social_dm_sent"/)
  // Confirm there is no unconditional setShowFollowUpPrompt(true)
  const lines = source.split("\n")
  const unconditionalCalls = lines.filter(
    (line) => line.includes("setShowFollowUpPrompt(true)") && !line.trim().startsWith("//")
  )
  // Should only appear once — inside the wasDmSent conditional
  assert.equal(unconditionalCalls.length, 1)
})

test("renders FollowUpPrompt with leadId and open/onOpenChange props", () => {
  assert.match(
    source,
    /<FollowUpPrompt\s+leadId=\{leadId\}\s+open=\{showFollowUpPrompt\}\s+onOpenChange=\{setShowFollowUpPrompt\}\s*\/>/s,
  )
})

test("follow-up prompt triggers after activity is created, not before", () => {
  const createIdx = source.indexOf("await createActivity(payload)")
  const wasDmIdx = source.indexOf('const wasDmSent = openDialogType === "social_dm_sent"')
  assert.ok(createIdx > 0, "createActivity call must exist")
  assert.ok(wasDmIdx > 0, "wasDmSent check must exist")
  assert.ok(wasDmIdx > createIdx, "follow-up prompt trigger must come after createActivity call")
})
