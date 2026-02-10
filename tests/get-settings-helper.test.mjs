import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("convex/lib/getSettings.ts", "utf8")

test("getSettings module exists", () => {
  assert.ok(source.length > 0)
})

test("exports getSetting as a named async function", () => {
  assert.match(source, /export async function getSetting/)
})

test("accepts ctx with db and a key string parameter", () => {
  assert.match(source, /getSetting\(\s*ctx:\s*\w+/)
  assert.match(source, /key:\s*string/)
})

test("returns Promise<string | null>", () => {
  assert.match(source, /Promise<string \| null>/)
})

test("queries settings table with by_key index", () => {
  assert.match(source, /ctx\.db\s*\n?\s*\.query\("settings"\)/)
  assert.match(source, /\.withIndex\("by_key"/)
})

test("uses .unique() for single row lookup", () => {
  assert.match(source, /\.unique\(\)/)
})

test("returns value or null fallback", () => {
  assert.match(source, /row\?\.value \?\? null/)
})

test("imports context types from _generated/server", () => {
  assert.match(source, /import.*(?:QueryCtx|MutationCtx).*from ["']\.\.\/\_generated\/server["']/)
})

test("context type accepts both QueryCtx and MutationCtx", () => {
  assert.match(source, /QueryCtx/)
  assert.match(source, /MutationCtx/)
})
