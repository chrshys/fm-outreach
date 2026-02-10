import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const componentSource = fs.readFileSync("src/components/leads/log-social-activity.tsx", "utf8")
const mutationSource = fs.readFileSync("convex/activities.ts", "utf8")
const schemaSource = fs.readFileSync("convex/schema.ts", "utf8")

test("Facebook DM action maps to social_dm_sent type with facebook channel", () => {
  assert.match(
    componentSource,
    /label:\s*"Log Facebook DM",\s*type:\s*"social_dm_sent",\s*channel:\s*"facebook"/
  )
})

test("component passes channel to createActivity mutation call", () => {
  assert.match(componentSource, /await createActivity\(\{/)
  assert.match(componentSource, /channel:\s*activeAction\.channel/)
})

test("create mutation accepts facebook as a valid channel value", () => {
  assert.match(mutationSource, /v\.literal\("facebook"\)/)
})

test("create mutation stores channel on the activity when provided", () => {
  assert.match(
    mutationSource,
    /if \(args\.channel !== undefined\)\s*\{\s*activity\.channel = args\.channel;\s*\}/s
  )
})

test("schema defines facebook as a valid channel on activities table", () => {
  assert.match(schemaSource, /v\.literal\("facebook"\)/)
})

test("schema defines social_dm_sent as a valid activity type", () => {
  assert.match(schemaSource, /v\.literal\("social_dm_sent"\)/)
})

test("activity object includes channel in its type definition", () => {
  assert.match(mutationSource, /channel\?:\s*"phone"\s*\|\s*"facebook"\s*\|\s*"instagram"/)
})
