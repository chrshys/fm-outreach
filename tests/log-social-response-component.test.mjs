import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("src/components/leads/log-social-response.tsx", "utf8")

test("renders Log Facebook Response and Log Instagram Response buttons", () => {
  assert.match(source, /Log Facebook Response/)
  assert.match(source, /Log Instagram Response/)
})

test("uses activities create mutation", () => {
  assert.match(source, /useMutation\(api\.activities\.create\)/)
})

test("submits social_dm_replied activity type with channel and description", () => {
  assert.match(source, /type: "social_dm_replied" as const/)
  assert.match(source, /description: trimmed/)
  assert.match(source, /channel,/)
})

test("opens dialog with required response summary textarea", () => {
  assert.match(source, /<Dialog/)
  assert.match(source, /<DialogContent>/)
  assert.match(source, /<Textarea/)
  assert.match(source, /Response Summary/)
  assert.match(source, /Summarize the response received/)
})

test("disables submit when summary is empty", () => {
  assert.match(source, /disabled=\{isSubmitting \|\| !summary\.trim\(\)\}/)
})

test("does not submit when trimmed summary is empty", () => {
  assert.match(source, /if \(!trimmed\) return/)
})

test("accepts leadId prop typed as Id<leads>", () => {
  assert.match(source, /leadId:\s*Id<"leads">/)
})

test("mentions auto-advance in dialog description", () => {
  assert.match(source, /automatically advance to replied/)
})
