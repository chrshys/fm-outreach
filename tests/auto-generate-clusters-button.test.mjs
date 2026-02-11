import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/clusters/page.tsx", "utf8")

test("clusters page does not reference autoGenerate action", () => {
  assert.ok(
    !source.includes("autoGenerate"),
    "autoGenerate should be removed from clusters page",
  )
})

test("clusters page does not import useAction", () => {
  assert.ok(
    !source.includes("useAction"),
    "useAction should be removed since autoGenerate is gone",
  )
})

test("clusters page uses useQuery for cluster list", () => {
  assert.match(source, /useQuery\(api\.clusters\.list\)/)
})

test("clusters page does not render auto-generate button", () => {
  assert.ok(
    !source.includes("Auto-generate Clusters"),
    "Auto-generate button should be removed",
  )
})
