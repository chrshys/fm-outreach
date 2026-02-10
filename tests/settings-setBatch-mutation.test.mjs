import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const settingsSource = fs.readFileSync("convex/settings.ts", "utf8")

test("exports setBatch as a public mutation", () => {
  assert.match(settingsSource, /export const setBatch = mutation\(\{/)
})

test("setBatch accepts items array of {key, value} objects", () => {
  const setBatchBlock = settingsSource.slice(settingsSource.indexOf("export const setBatch"))
  assert.match(setBatchBlock, /items:\s*v\.array\(v\.object\(\{/)
  assert.match(setBatchBlock, /key:\s*v\.string\(\)/)
  assert.match(setBatchBlock, /value:\s*v\.string\(\)/)
})

test("setBatch iterates over items", () => {
  const setBatchBlock = settingsSource.slice(settingsSource.indexOf("export const setBatch"))
  assert.match(setBatchBlock, /for\s*\(const item of args\.items\)/)
})

test("setBatch queries by_key index for each item", () => {
  const setBatchBlock = settingsSource.slice(
    settingsSource.indexOf("export const setBatch"),
    settingsSource.indexOf("export const remove")
  )
  assert.match(setBatchBlock, /\.withIndex\("by_key"/)
  assert.match(setBatchBlock, /\.unique\(\)/)
})

test("setBatch upserts: patches existing or inserts new", () => {
  const setBatchBlock = settingsSource.slice(
    settingsSource.indexOf("export const setBatch"),
    settingsSource.indexOf("export const remove")
  )
  assert.match(setBatchBlock, /ctx\.db\.patch\(existing\._id/)
  assert.match(setBatchBlock, /ctx\.db\.insert\("settings"/)
})
