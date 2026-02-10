import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("src/components/map/marker-popup.tsx", "utf8")

test("exports MarkerPopup as named export", () => {
  assert.match(source, /export\s+function\s+MarkerPopup/)
})

test("accepts id, name, type, city, status, and optional contactEmail props", () => {
  assert.match(source, /id:\s*string/)
  assert.match(source, /name:\s*string/)
  assert.match(source, /type:\s*string/)
  assert.match(source, /city:\s*string/)
  assert.match(source, /status:\s*string/)
  assert.match(source, /contactEmail\?:\s*string/)
})

test("renders lead name", () => {
  assert.match(source, /\{name\}/)
})

test("renders type badge with formatted label", () => {
  assert.match(source, /<Badge.*variant="outline".*>/)
  assert.match(source, /formatLabel\(type\)/)
})

test("renders status badge with status-specific class names", () => {
  assert.match(source, /statusClassNames\[status\]/)
  assert.match(source, /formatLabel\(status\)/)
})

test("defines status class names for all pipeline statuses", () => {
  const statuses = [
    "new_lead",
    "enriched",
    "outreach_started",
    "replied",
    "meeting_booked",
    "onboarded",
    "declined",
    "not_interested",
    "bounced",
    "no_response",
    "no_email",
  ]
  for (const status of statuses) {
    assert.match(source, new RegExp(`${status}:`), `missing status class for ${status}`)
  }
})

test("renders city", () => {
  assert.match(source, /\{city\}/)
})

test("conditionally renders contactEmail when present", () => {
  assert.match(source, /contactEmail\s*&&/)
  assert.match(source, /\{contactEmail\}/)
})

test("renders View Detail link to /leads/[id]", () => {
  assert.match(source, /href=\{`\/leads\/\$\{id\}`\}/)
  assert.match(source, /View Detail/)
})

test("imports Link from next/link", () => {
  assert.match(source, /import\s+Link\s+from\s+["']next\/link["']/)
})

test("imports Badge from ui components", () => {
  assert.match(source, /import\s+\{.*Badge.*\}\s+from\s+["']@\/components\/ui\/badge["']/)
})

test("formatLabel converts snake_case to Title Case", () => {
  assert.match(source, /function\s+formatLabel/)
  // Verifies it splits on underscore and capitalizes
  assert.match(source, /split\(["']_["']\)/)
  assert.match(source, /toUpperCase\(\)/)
})
