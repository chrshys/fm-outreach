import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(
  "src/components/map/discovery-grid.tsx",
  "utf8",
)

// ============================================================
// Web Scraping mechanism is defined as enabled (button clickable, backend guard shows "Coming soon")
// ============================================================

test("web_scraper mechanism has enabled: true", () => {
  const wsBlock = source.match(/\{\s*id:\s*"web_scraper"[^}]*\}/s)
  assert.ok(wsBlock, "web_scraper entry should exist")
  assert.match(wsBlock[0], /enabled:\s*true/)
})

// ============================================================
// Web Scraping row shows "—" for date (no lastSearchedAt data)
// ============================================================

test("non-google_places mechanisms show dash for last-run date", () => {
  // The ternary falls through to "—" for any mechanism that isn't google_places
  assert.match(source, /mechanism\.id\s*===\s*"google_places"\s*&&\s*cell\.lastSearchedAt/)
  assert.match(source, /:\s*"—"/)
})

// ============================================================
// Disabled mechanism styling (opacity, pointer-events) still exists
// for mechanisms that have enabled: false
// ============================================================

test("mechanism row container applies opacity-50 when mechanism not enabled", () => {
  // The row div gets opacity-50 via conditional className
  assert.match(source, /!mechanism\.enabled\s*\?\s*"\s*opacity-50"\s*:\s*""/)
})

test("disabled mechanism row button has pointer-events-none", () => {
  // Button gets pointer-events-none when disabled (covers both !mechanism.enabled and isSearching)
  assert.match(source, /disabled\s*\?\s*"pointer-events-none"/)
})

test("disabled mechanism row button has HTML disabled attribute", () => {
  assert.match(source, /disabled=\{disabled\}/)
})

// ============================================================
// Enabled mechanisms don't get row-level opacity
// ============================================================

test("enabled mechanisms do not get row-level opacity (conditional check)", () => {
  // The className conditional only applies opacity when !mechanism.enabled
  // so both google_places and web_scraper (enabled: true) won't be dimmed at the row level
  const rowOpacityCheck = source.match(/!mechanism\.enabled\s*\?\s*"\s*opacity-50"\s*:\s*""/)
  assert.ok(rowOpacityCheck, "should only apply opacity-50 when mechanism is not enabled")
})
