import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("src/components/leads/log-activity.tsx", "utf8")

test("renders manual activity buttons and uses activities create mutation", () => {
  assert.match(source, /useMutation\(api\.activities\.create\)/)
  assert.match(source, />\s*Add Note\s*</)
  assert.match(source, />\s*Log Call\s*</)
  assert.match(source, />\s*Log Social DM\s*</)
})

test("submits note, call, and social dm activity types", () => {
  assert.match(source, /type ManualActivityType = "note_added" \| "phone_call" \| "social_dm_sent"/)
  assert.match(source, /const channel = getChannelForType\(openDialogType, socialChannel\)/)
  assert.match(source, /const payload:[\s\S]*=\s*\{\s*leadId,\s*type:\s*openDialogType,\s*description:\s*trimmedDescription,\s*\}/s)
  assert.match(source, /if \(channel !== undefined\)\s*\{\s*payload\.channel = channel\s*\}/s)
  assert.match(source, /await createActivity\(payload\)/)
  assert.match(source, /if \(type === "phone_call"\)\s*\{\s*return "phone" as const\s*\}/s)
})

test("add note path does not force a channel field", () => {
  assert.match(source, /return undefined/)
  assert.match(source, /if \(channel !== undefined\)\s*\{\s*payload\.channel = channel\s*\}/s)
})

test("shows social channel selector with facebook and instagram options", () => {
  assert.match(source, /openDialogType === "social_dm_sent"/)
  assert.match(source, /<Select value=\{socialChannel\} onValueChange=\{\(value\) => setSocialChannel\(value as SocialChannel\)\}>/)
  assert.match(source, /<SelectItem value="facebook">Facebook<\/SelectItem>/)
  assert.match(source, /<SelectItem value="instagram">Instagram<\/SelectItem>/)
})
