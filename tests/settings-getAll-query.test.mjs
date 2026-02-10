import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const settingsSource = fs.readFileSync("convex/settings.ts", "utf8")

test("exports getAll as a public query", () => {
  assert.match(settingsSource, /export const getAll = query\(\{/)
})

test("getAll takes no arguments", () => {
  const getAllBlock = settingsSource.slice(settingsSource.indexOf("export const getAll"))
  assert.match(getAllBlock, /args:\s*\{\s*\}/)
})

test("getAll collects all settings rows", () => {
  const getAllBlock = settingsSource.slice(settingsSource.indexOf("export const getAll"))
  assert.match(getAllBlock, /ctx\.db\.query\("settings"\)\.collect\(\)/)
})

test("getAll returns key-value object via Object.fromEntries", () => {
  const getAllBlock = settingsSource.slice(settingsSource.indexOf("export const getAll"))
  assert.match(getAllBlock, /Object\.fromEntries/)
  assert.match(getAllBlock, /row\.key/)
  assert.match(getAllBlock, /row\.value/)
})
