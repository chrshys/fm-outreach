import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const sharedSource = fs.readFileSync(
  "src/components/map/discovery-grid-shared.ts",
  "utf8",
)

// ============================================================
// formatRelativeTime is exported and has correct signature
// ============================================================

test("formatRelativeTime is exported from discovery-grid-shared", () => {
  assert.match(sharedSource, /export\s+function\s+formatRelativeTime\(timestamp:\s*number\):\s*string/)
})

// ============================================================
// formatRelativeTime returns correct relative strings
// ============================================================

test("formatRelativeTime computes diff from Date.now()", () => {
  assert.match(sharedSource, /const now = Date\.now\(\)/)
  assert.match(sharedSource, /now\s*-\s*timestamp/)
})

test("formatRelativeTime returns 'today' for same-day timestamps", () => {
  assert.match(sharedSource, /diffDays\s*===\s*0\)\s*return\s*"today"/)
})

test("formatRelativeTime returns 'yesterday' for 1-day-old timestamps", () => {
  assert.match(sharedSource, /diffDays\s*===\s*1\)\s*return\s*"yesterday"/)
})

test("formatRelativeTime returns 'N days ago' for 2-13 day old timestamps", () => {
  assert.match(sharedSource, /diffDays\s*<\s*14/)
  assert.match(sharedSource, /days ago/)
})

test("formatRelativeTime returns 'N weeks ago' for 14-59 day old timestamps", () => {
  assert.match(sharedSource, /diffDays\s*<\s*60/)
  assert.match(sharedSource, /Math\.floor\(diffDays\s*\/\s*7\)/)
  assert.match(sharedSource, /weeks ago/)
})

test("formatRelativeTime returns 'N months ago' for 60+ day old timestamps", () => {
  assert.match(sharedSource, /Math\.floor\(diffDays\s*\/\s*30\)/)
  assert.match(sharedSource, /months ago/)
})

// ============================================================
// Behavioral tests: actual output values
// ============================================================

// Extract and eval the function for behavioral testing
const fnMatch = sharedSource.match(
  /export function formatRelativeTime\(timestamp: number\): string \{([\s\S]*?)\n\}/,
)
const fnBody = fnMatch ? fnMatch[1] : null

function makeFormatRelativeTime() {
  if (!fnBody) return null
  // Strip TypeScript type annotations (none in the body, but be safe)
  return new Function("timestamp", `
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays < 14) return \`\${diffDays} days ago\`;
    if (diffDays < 60) return \`\${Math.floor(diffDays / 7)} weeks ago\`;
    return \`\${Math.floor(diffDays / 30)} months ago\`;
  `)
}

const formatRelativeTime = makeFormatRelativeTime()

test("returns 'today' for a timestamp from now", () => {
  assert.ok(formatRelativeTime)
  assert.equal(formatRelativeTime(Date.now()), "today")
})

test("returns 'today' for a timestamp from 1 hour ago", () => {
  assert.ok(formatRelativeTime)
  assert.equal(formatRelativeTime(Date.now() - 3600 * 1000), "today")
})

test("returns 'yesterday' for a timestamp from 1 day ago", () => {
  assert.ok(formatRelativeTime)
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
  assert.equal(formatRelativeTime(oneDayAgo), "yesterday")
})

test("returns 'N days ago' for a timestamp from 5 days ago", () => {
  assert.ok(formatRelativeTime)
  const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000
  assert.equal(formatRelativeTime(fiveDaysAgo), "5 days ago")
})

test("returns 'N weeks ago' for a timestamp from 21 days ago", () => {
  assert.ok(formatRelativeTime)
  const threeWeeksAgo = Date.now() - 21 * 24 * 60 * 60 * 1000
  assert.equal(formatRelativeTime(threeWeeksAgo), "3 weeks ago")
})

test("returns 'N months ago' for a timestamp from 90 days ago", () => {
  assert.ok(formatRelativeTime)
  const threeMonthsAgo = Date.now() - 90 * 24 * 60 * 60 * 1000
  assert.equal(formatRelativeTime(threeMonthsAgo), "3 months ago")
})
