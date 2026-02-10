import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("src/components/leads/activity-timeline.tsx", "utf8")

test("activity timeline includes social_dm_replied in activityMetaByType", () => {
  assert.match(source, /social_dm_replied:\s*\{/)
})

test("social_dm_replied uses Reply icon with emerald colors", () => {
  // Extract the social_dm_replied block
  const match = source.match(/social_dm_replied:\s*\{([^}]+)\}/)
  assert.ok(match, "social_dm_replied block should exist")
  const block = match[1]
  assert.match(block, /icon:\s*Reply/)
  assert.match(block, /iconClassName:\s*"text-emerald-600"/)
  assert.match(block, /dotClassName:\s*"bg-emerald-500"/)
})
