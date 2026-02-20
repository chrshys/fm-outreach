import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const pageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")
const filtersSource = fs.readFileSync("src/components/map/map-filters.tsx", "utf8")

// --- filterLeads narrows by status ---

test("filterLeads excludes leads whose status is not in selected statuses", () => {
  // The function checks statuses.includes(lead.status) and returns false if not included
  assert.match(filtersSource, /!filters\.statuses\.includes\(lead\.status/)
})

test("filterLeads excludes leads whose type is not in selected types", () => {
  assert.match(filtersSource, /filters\.types\.length\s*>\s*0\s*&&\s*!filters\.types\.includes\(lead\.type/)
})

test("filterLeads excludes leads whose clusterId does not match selected cluster", () => {
  assert.match(filtersSource, /filters\.clusterId\s*!==\s*"all"\s*&&\s*lead\.clusterId\s*!==\s*filters\.clusterId/)
})

test("filterLeads returns all leads when filters are empty (default state)", () => {
  // Default state has all statuses selected, so includes() passes all leads through.
  // Types and cluster still use length > 0 / !== "all" guards.
  assert.match(filtersSource, /filters\.statuses\.includes\(lead\.status/)
  assert.match(filtersSource, /filters\.types\.length\s*>\s*0/)
  assert.match(filtersSource, /filters\.clusterId\s*!==\s*"all"/)
})

// --- Map page passes filtered leads to MapContent ---

test("map page passes filteredLeads (not raw leads) to MapContent", () => {
  assert.match(pageSource, /leads=\{filteredLeads\}/)
  // Ensure it does NOT pass raw leads
  assert.doesNotMatch(pageSource, /leads=\{leads\b/)
})

// --- Map page filters cluster boundaries by selected cluster ---

test("map page computes filteredClusters with useMemo", () => {
  assert.match(pageSource, /const\s+filteredClusters\s*=\s*useMemo\(/)
})

test("filteredClusters filters clusters when a specific clusterId is selected", () => {
  assert.match(pageSource, /filters\.clusterId\s*!==\s*"all"/)
  assert.match(pageSource, /all\.filter\(\(c[^)]*\)\s*=>\s*c\._id\s*===\s*filters\.clusterId\)/)
})

test("filteredClusters shows all clusters when clusterId is 'all'", () => {
  // When clusterId is "all", no filtering is applied — uses the full array
  assert.match(pageSource, /filters\.clusterId\s*!==\s*"all"\s*\?\s*all\.filter/)
})

test("map page passes filteredClusters (not all clusters) to MapContent", () => {
  assert.match(pageSource, /clusters=\{viewMode\s*===\s*"clusters"\s*\?\s*filteredClusters\s*:\s*\[\]\}/)
})

test("filteredClusters memo depends on filters.clusterId", () => {
  assert.match(pageSource, /\[clusters,\s*filters\.clusterId\]/)
})
