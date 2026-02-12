import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

// ============================================================
// Web Scraping mechanism is defined as enabled
// ============================================================

test("web_scraper mechanism has enabled: true", () => {
  const wsBlock = source.match(/\{\s*id:\s*"web_scraper"[^}]*\}/s)
  assert.ok(wsBlock, "web_scraper entry should exist")
  assert.match(wsBlock[0], /enabled:\s*true/)
})

// ============================================================
// DISCOVERY_MECHANISMS constant still exists
// ============================================================

test("DISCOVERY_MECHANISMS is exported", () => {
  assert.match(source, /export\s+const\s+DISCOVERY_MECHANISMS/)
})

test("DISCOVERY_MECHANISMS includes google_places and web_scraper", () => {
  assert.match(source, /id:\s*"google_places"/)
  assert.match(source, /id:\s*"web_scraper"/)
})
