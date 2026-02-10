import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/campaigns/page.tsx", "utf8")

test("Create Campaign button links to /campaigns/new", () => {
  assert.match(source, /href="\/campaigns\/new"/)
})

test("imports Link from next/link", () => {
  assert.match(source, /import\s+Link\s+from\s+"next\/link"/)
})

test("Button uses asChild for Link wrapping", () => {
  assert.match(source, /<Button\s+asChild>/)
})
