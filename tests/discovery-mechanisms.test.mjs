import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

test("exports DISCOVERY_MECHANISMS constant", () => {
  assert.match(source, /export\s+const\s+DISCOVERY_MECHANISMS/)
})

test("DISCOVERY_MECHANISMS is an array", () => {
  assert.match(source, /DISCOVERY_MECHANISMS\s*=\s*\[/)
})

test("contains google_places mechanism with enabled: true", () => {
  assert.match(source, /id:\s*"google_places"/)
  assert.match(source, /label:\s*"Google Places"/)
  // google_places entry should have enabled: true
  const gpBlock = source.match(/\{\s*id:\s*"google_places"[^}]*\}/s)
  assert.ok(gpBlock, "google_places entry should exist")
  assert.match(gpBlock[0], /enabled:\s*true/)
})

test("contains web_scraper mechanism with enabled: false", () => {
  assert.match(source, /id:\s*"web_scraper"/)
  assert.match(source, /label:\s*"Web Scraping"/)
  // web_scraper entry should have enabled: false
  const wsBlock = source.match(/\{\s*id:\s*"web_scraper"[^}]*\}/s)
  assert.ok(wsBlock, "web_scraper entry should exist")
  assert.match(wsBlock[0], /enabled:\s*false/)
})

test("DISCOVERY_MECHANISMS has exactly 2 entries", () => {
  const entries = source.match(/\{\s*id:\s*"[^"]+",\s*label:\s*"[^"]+",\s*enabled:\s*(true|false)\s*\}/g)
  assert.ok(entries, "should find mechanism entries")
  assert.equal(entries.length, 2, `expected 2 entries, got ${entries.length}`)
})

test("DISCOVERY_MECHANISMS uses as const assertion", () => {
  assert.match(source, /\]\s*as\s+const/)
})
