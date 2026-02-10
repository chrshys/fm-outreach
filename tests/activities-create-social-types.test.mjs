import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("convex/activities.ts", "utf8")

test("create mutation accepts social_commented and social_followed types", () => {
  assert.match(source, /v\.literal\("social_commented"\)/)
  assert.match(source, /v\.literal\("social_followed"\)/)
})

test("create mutation type union includes all five manual activity types", () => {
  assert.match(
    source,
    /type:\s*v\.union\(\s*v\.literal\("note_added"\),\s*v\.literal\("phone_call"\),\s*v\.literal\("social_dm_sent"\),\s*v\.literal\("social_commented"\),\s*v\.literal\("social_followed"\),\s*\)/s
  )
})
