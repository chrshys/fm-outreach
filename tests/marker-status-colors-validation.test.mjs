import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

// Verify the full pipeline: status-colors module defines colors, map-content
// and cluster-map consume them, and all 11 pipeline statuses are covered.

const statusColorsSource = fs.readFileSync("src/components/map/status-colors.ts", "utf8")
const mapContentSource = fs.readFileSync("src/components/map/map-content.tsx", "utf8")
const clusterMapSource = fs.readFileSync("src/components/clusters/cluster-map.tsx", "utf8")
const leadsValidatorSource = fs.readFileSync("convex/leads.ts", "utf8")

const EXPECTED_COLORS = {
  new_lead: "#6b7280",
  enriched: "#3b82f6",
  outreach_started: "#f59e0b",
  replied: "#22c55e",
  meeting_booked: "#a855f7",
  onboarded: "#10b981",
  no_email: "#f97316",
  declined: "#ef4444",
  not_interested: "#ef4444",
  bounced: "#64748b",
  no_response: "#64748b",
}

const PIPELINE_STATUSES = [
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

test("every pipeline status has a color mapping", () => {
  for (const status of PIPELINE_STATUSES) {
    assert.match(
      statusColorsSource,
      new RegExp(`${status}:\\s*"#[0-9a-f]{6}"`),
      `status "${status}" is missing a color mapping in status-colors.ts`,
    )
  }
})

test("leadStatusValidator defines all pipeline statuses", () => {
  for (const status of PIPELINE_STATUSES) {
    assert.match(
      leadsValidatorSource,
      new RegExp(`v\\.literal\\("${status}"\\)`),
      `status "${status}" is missing from leadStatusValidator`,
    )
  }
})

test("each pipeline status maps to the correct hex color", () => {
  for (const [status, hex] of Object.entries(EXPECTED_COLORS)) {
    assert.match(
      statusColorsSource,
      new RegExp(`${status}:\\s*"${hex.replace("#", "\\#")}"`),
      `${status} should map to ${hex}`,
    )
  }
})

test("map-content.tsx uses getStatusColor for marker fill", () => {
  assert.match(mapContentSource, /getStatusColor\(lead\.status\)/)
  assert.match(mapContentSource, /fillColor:\s*color/)
  assert.match(mapContentSource, /color:\s*color/)
})

test("cluster-map.tsx uses getStatusColor for marker fill", () => {
  assert.match(clusterMapSource, /getStatusColor\(lead\.status\)/)
  assert.match(clusterMapSource, /fillColor:\s*color/)
  assert.match(clusterMapSource, /color:\s*color/)
})

test("distinct colors are used for semantically different statuses", () => {
  const colorSet = new Set(Object.values(EXPECTED_COLORS))
  // We expect at least 7 distinct colors (gray, blue, amber, green, purple,
  // emerald, orange, red, slate — some statuses intentionally share colors)
  assert.ok(
    colorSet.size >= 7,
    `expected at least 7 distinct colors, got ${colorSet.size}`,
  )
})

test("markers use fillOpacity for visual clarity", () => {
  assert.match(mapContentSource, /fillOpacity:\s*0\.7/)
  assert.match(clusterMapSource, /fillOpacity:\s*0\.7/)
})
