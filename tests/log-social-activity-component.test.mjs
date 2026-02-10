import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("src/components/leads/log-social-activity.tsx", "utf8")

test("defines five social action buttons with correct labels", () => {
  assert.match(source, /label:\s*"Log Facebook DM"/)
  assert.match(source, /label:\s*"Log Instagram DM"/)
  assert.match(source, /label:\s*"Log Facebook Comment"/)
  assert.match(source, /label:\s*"Log Instagram Comment"/)
  assert.match(source, /label:\s*"Log Follow"/)
})

test("uses activities create mutation", () => {
  assert.match(source, /useMutation\(api\.activities\.create\)/)
})

test("defines social action configs with correct type and channel mappings", () => {
  assert.match(source, /label:\s*"Log Facebook DM",\s*type:\s*"social_dm_sent",\s*channel:\s*"facebook"/)
  assert.match(source, /label:\s*"Log Instagram DM",\s*type:\s*"social_dm_sent",\s*channel:\s*"instagram"/)
  assert.match(source, /label:\s*"Log Facebook Comment",\s*type:\s*"social_commented",\s*channel:\s*"facebook"/)
  assert.match(source, /label:\s*"Log Instagram Comment",\s*type:\s*"social_commented",\s*channel:\s*"instagram"/)
  assert.match(source, /label:\s*"Log Follow",\s*type:\s*"social_followed",\s*channel:\s*"facebook"/)
})

test("opens dialog with optional notes textarea", () => {
  assert.match(source, /<Dialog/)
  assert.match(source, /<DialogContent>/)
  assert.match(source, /<Textarea/)
  assert.match(source, /Notes \(optional\)/)
})

test("submits activity with type, channel, and description", () => {
  assert.match(source, /await createActivity\(\{/)
  assert.match(source, /type:\s*activeAction\.type/)
  assert.match(source, /channel:\s*activeAction\.channel/)
})

test("falls back to action label when notes are empty", () => {
  assert.match(source, /const description = notes\.trim\(\) \|\| activeAction\.label/)
})

test("accepts leadId prop typed as Id<leads>", () => {
  assert.match(source, /leadId:\s*Id<"leads">/)
})
