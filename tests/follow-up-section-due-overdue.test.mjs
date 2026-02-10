import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { createRequire } from "node:module"

import ts from "typescript"

/**
 * Verification test: Follow-up section shows leads with due/overdue reminders.
 *
 * Validates the full data flow:
 *   1. Backend helper (getFollowUpsDue) correctly classifies leads
 *   2. Component (NeedsFollowUp) renders due/overdue text
 *   3. Dashboard page wires the query to the component
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadTsModule(relativePath) {
  const source = fs.readFileSync(relativePath, "utf8")
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: path.basename(relativePath),
  }).outputText

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-follow-up-verify-"))
  const modulePath = path.join(tempDir, `${path.basename(relativePath)}.cjs`)
  fs.writeFileSync(modulePath, transpiled, "utf8")

  const requireFromTest = createRequire(import.meta.url)

  try {
    return requireFromTest(modulePath)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

function createLead(id, overrides = {}) {
  return {
    _id: `lead-${id}`,
    name: `Lead ${id}`,
    city: "Toronto",
    type: "farm",
    ...overrides,
  }
}

const MS_PER_DAY = 86_400_000
// Fixed "now" for deterministic tests: 2025-06-15 14:00:00 UTC
const NOW = new Date("2025-06-15T14:00:00Z").getTime()
const START_OF_TODAY = NOW - (NOW % MS_PER_DAY)

const componentSource = fs.readFileSync("src/components/dashboard/needs-follow-up.tsx", "utf8")
const pageSource = fs.readFileSync("src/app/page.tsx", "utf8")

// ---------------------------------------------------------------------------
// 1. Backend: getFollowUpsDue produces correct due/overdue buckets
// ---------------------------------------------------------------------------

test("getFollowUpsDue puts leads due today in dueToday bucket", () => {
  const { getFollowUpsDue } = loadTsModule("convex/lib/followUpsDue.ts")
  const leads = [
    createLead(1, { nextFollowUpAt: START_OF_TODAY + 1000 }),
    createLead(2, { nextFollowUpAt: START_OF_TODAY + MS_PER_DAY - 2000 }),
  ]
  const result = getFollowUpsDue(leads, NOW)
  assert.equal(result.dueToday.length, 2, "both leads should be due today")
  assert.equal(result.overdue.length, 0)
})

test("getFollowUpsDue puts past leads in overdue bucket", () => {
  const { getFollowUpsDue } = loadTsModule("convex/lib/followUpsDue.ts")
  const leads = [
    createLead(1, { nextFollowUpAt: START_OF_TODAY - MS_PER_DAY }),
    createLead(2, { nextFollowUpAt: START_OF_TODAY - 3 * MS_PER_DAY }),
  ]
  const result = getFollowUpsDue(leads, NOW)
  assert.equal(result.dueToday.length, 0)
  assert.equal(result.overdue.length, 2, "both leads should be overdue")
})

test("getFollowUpsDue excludes future leads", () => {
  const { getFollowUpsDue } = loadTsModule("convex/lib/followUpsDue.ts")
  const leads = [
    createLead(1, { nextFollowUpAt: START_OF_TODAY + 2 * MS_PER_DAY }),
  ]
  const result = getFollowUpsDue(leads, NOW)
  assert.equal(result.dueToday.length, 0)
  assert.equal(result.overdue.length, 0)
})

test("getFollowUpsDue handles mix of due, overdue, future, and no-date leads", () => {
  const { getFollowUpsDue } = loadTsModule("convex/lib/followUpsDue.ts")
  const leads = [
    createLead(1, { nextFollowUpAt: START_OF_TODAY + 5000 }),            // due today
    createLead(2, { nextFollowUpAt: START_OF_TODAY - 2 * MS_PER_DAY }), // overdue
    createLead(3, { nextFollowUpAt: START_OF_TODAY + 5 * MS_PER_DAY }), // future
    createLead(4),                                                       // no nextFollowUpAt
  ]
  const result = getFollowUpsDue(leads, NOW)
  assert.equal(result.dueToday.length, 1)
  assert.equal(result.overdue.length, 1)
  assert.equal(result.dueToday[0]._id, "lead-1")
  assert.equal(result.overdue[0]._id, "lead-2")
})

// ---------------------------------------------------------------------------
// 2. Component: NeedsFollowUp renders due/overdue reminder text
// ---------------------------------------------------------------------------

test("component shows 'Due today' text for items due today", () => {
  assert.match(componentSource, /Due today/, "component must render 'Due today' label")
})

test("component shows 'X day(s) overdue' text for overdue items", () => {
  assert.match(componentSource, /day.*overdue/, "component must render overdue day count")
})

test("component calculates days overdue from nextFollowUpAt and now", () => {
  assert.match(componentSource, /daysOverdue/, "component must have daysOverdue helper")
  assert.match(componentSource, /now - nextFollowUpAt/, "calculation should use now - nextFollowUpAt")
})

test("component renders overdue items before dueToday items", () => {
  assert.match(componentSource, /\[\.\.\.overdue, \.\.\.dueToday\]/, "overdue should come first in combined list")
})

test("component styles overdue text in red", () => {
  assert.match(componentSource, /text-red-600/, "overdue text must use red-600")
})

test("component renders lead name as link to lead detail", () => {
  assert.match(componentSource, /href=\{`\/leads\/\$\{lead\._id\}`\}/, "lead name links to /leads/[id]")
})

test("component shows lead city and type for context", () => {
  assert.match(componentSource, /lead\.city/, "component shows city")
  assert.match(componentSource, /toLabel\(lead\.type\)/, "component shows formatted type")
})

test("component handles singular/plural day text", () => {
  // Should show "1 day overdue" (singular) vs "X days overdue" (plural)
  assert.match(componentSource, /day\$\{days === 1 \? "" : "s"\} overdue/, "handles singular and plural days")
})

test("component returns null when no items to show", () => {
  assert.match(componentSource, /if \(items\.length === 0\) return null/, "returns null for empty state")
})

// ---------------------------------------------------------------------------
// 3. Dashboard page: wires followUpsDue query to NeedsFollowUp component
// ---------------------------------------------------------------------------

test("page queries followUpsDue from Convex", () => {
  assert.match(pageSource, /useQuery\(api\.dashboard\.followUpsDue\)/, "page must query followUpsDue")
})

test("page passes dueToday and overdue arrays to NeedsFollowUp", () => {
  assert.match(pageSource, /dueToday: followUps\.dueToday/, "page passes dueToday")
  assert.match(pageSource, /overdue: followUps\.overdue/, "page passes overdue")
})

test("page passes current timestamp as now to NeedsFollowUp", () => {
  assert.match(pageSource, /now,/, "page passes now timestamp to component")
  assert.match(pageSource, /useMemo\(\(\) => Date\.now\(\)/, "now is memoized from Date.now()")
})

test("page conditionally renders NeedsFollowUp only when data is loaded", () => {
  assert.match(pageSource, /followUps &&/, "NeedsFollowUp renders conditionally")
})

test("page computes followUpCount from both buckets for metric card", () => {
  assert.match(pageSource, /followUps\.dueToday\.length \+ followUps\.overdue\.length/, "total count combines both buckets")
})

test("page computes overdueCount for metric card badge", () => {
  assert.match(pageSource, /followUps\?\.overdue\.length/, "overdue count used for metric card")
})
