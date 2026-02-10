import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const schemaSource = fs.readFileSync("convex/schema.ts", "utf8")
const settingsSource = fs.readFileSync("convex/settings.ts", "utf8")

// Schema tests
test("settings table has key (string) and value (string) fields", () => {
  assert.match(schemaSource, /settings:\s*defineTable\(\{/)
  assert.match(schemaSource, /key:\s*v\.string\(\)/)
  assert.match(schemaSource, /value:\s*v\.string\(\)/)
})

test("settings table has by_key index", () => {
  assert.match(schemaSource, /settings:[\s\S]*?\.index\("by_key",\s*\["key"\]\)/)
})

// get query
test("exports get as a public query", () => {
  assert.match(settingsSource, /export const get = query\(\{/)
})

test("get accepts a key argument", () => {
  assert.match(settingsSource, /key:\s*v\.string\(\)/)
})

test("get queries settings with by_key index", () => {
  assert.match(settingsSource, /\.withIndex\("by_key"/)
  assert.match(settingsSource, /\.unique\(\)/)
})

test("get returns value or null", () => {
  assert.match(settingsSource, /setting\?\.value \?\? null/)
})

// list query
test("exports list as a public query", () => {
  assert.match(settingsSource, /export const list = query\(\{/)
})

test("list collects all settings", () => {
  assert.match(settingsSource, /ctx\.db\.query\("settings"\)\.collect\(\)/)
})

// set mutation
test("exports set as a public mutation", () => {
  assert.match(settingsSource, /export const set = mutation\(\{/)
})

test("set accepts key and value arguments", () => {
  // Both key and value should be v.string() in the set args
  assert.match(settingsSource, /set = mutation\(\{[\s\S]*?key:\s*v\.string\(\)/)
  assert.match(settingsSource, /set = mutation\(\{[\s\S]*?value:\s*v\.string\(\)/)
})

test("set upserts: patches existing or inserts new", () => {
  assert.match(settingsSource, /ctx\.db\.patch\(existing\._id/)
  assert.match(settingsSource, /ctx\.db\.insert\("settings"/)
})

// remove mutation
test("exports remove as a public mutation", () => {
  assert.match(settingsSource, /export const remove = mutation\(\{/)
})

test("remove deletes existing setting by key", () => {
  assert.match(settingsSource, /ctx\.db\.delete\(existing\._id\)/)
})
