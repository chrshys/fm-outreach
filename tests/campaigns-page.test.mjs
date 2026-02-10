import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/app/campaigns/page.tsx", "utf8")

test("is a client component", () => {
  assert.match(source, /"use client"/)
})

test("wraps the campaigns page content with AppLayout", () => {
  assert.match(source, /import\s+\{\s*AppLayout\s*\}\s+from\s+"@\/components\/layout\/app-layout"/)
  assert.match(source, /<AppLayout>[\s\S]*<\/AppLayout>/)
})

test("fetches campaigns with useQuery", () => {
  assert.match(source, /import\s+\{.*useQuery.*\}\s+from\s+"convex\/react"/)
  assert.match(source, /useQuery\(api\.campaigns\.list\)/)
})

test("renders Create Campaign button", () => {
  assert.match(source, /Create Campaign/)
  assert.match(source, /<Button/)
})

test("renders card grid layout", () => {
  assert.match(source, /grid-cols-1/)
  assert.match(source, /sm:grid-cols-2/)
  assert.match(source, /lg:grid-cols-3/)
})

test("renders campaign name in each card", () => {
  assert.match(source, /campaign\.name/)
})

test("renders status badge with draft/active/paused/completed styles", () => {
  assert.match(source, /statusStyles\[campaign\.status\]/)
  assert.match(source, /draft:/)
  assert.match(source, /active:/)
  assert.match(source, /paused:/)
  assert.match(source, /completed:/)
})

test("renders lead count per campaign", () => {
  assert.match(source, /campaign\.leadCount/)
  assert.match(source, /leads/)
})

test("renders sent stat", () => {
  assert.match(source, /Sent/)
  assert.match(source, /stats\?\.sent/)
})

test("renders opened percentage stat", () => {
  assert.match(source, /Opened/)
  assert.match(source, /stats\?\.opened/)
})

test("renders replied percentage stat", () => {
  assert.match(source, /Replied/)
  assert.match(source, /stats\?\.replied/)
})

test("renders loading state", () => {
  assert.match(source, /Loading campaigns/)
})

test("renders empty state when no campaigns exist", () => {
  assert.match(source, /No campaigns yet/)
})

test("pct helper handles zero denominator", () => {
  assert.match(source, /if \(denominator === 0\) return "0%"/)
})

test("links each campaign card to its detail page", () => {
  assert.match(source, /href=\{`\/campaigns\/\$\{campaign\._id\}`\}/)
})
