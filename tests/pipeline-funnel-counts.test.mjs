import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { createRequire } from "node:module"

import ts from "typescript"

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

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-funnel-counts-"))
  const modulePath = path.join(tempDir, `${path.basename(relativePath)}.cjs`)
  fs.writeFileSync(modulePath, transpiled, "utf8")

  const requireFromTest = createRequire(import.meta.url)

  try {
    return requireFromTest(modulePath)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

const schemaSource = fs.readFileSync("convex/schema.ts", "utf8")
const funnelSource = fs.readFileSync(
  "src/components/dashboard/pipeline-funnel.tsx",
  "utf8",
)

// Extract lead statuses from schema (first status union in leads table)
function extractSchemaStatuses() {
  // Match the leads table definition, then find the status union within it
  const leadsBlock = schemaSource.match(
    /leads: defineTable\(\{([\s\S]*?)\}\)\s*\n\s*\.index/,
  )
  assert.ok(leadsBlock, "Schema should define leads table")
  const statusBlock = leadsBlock[1].match(
    /status: v\.union\(([\s\S]*?)\n\s*\)/,
  )
  assert.ok(statusBlock, "Leads table should define status union")
  return [...statusBlock[1].matchAll(/v\.literal\("([^"]+)"\)/g)]
    .map((m) => m[1])
    .sort()
}

// Extract PIPELINE_ORDER from funnel component
function extractPipelineOrder() {
  const match = funnelSource.match(
    /const PIPELINE_ORDER = \[([\s\S]*?)\] as const/,
  )
  assert.ok(match, "PIPELINE_ORDER should exist in funnel component")
  return match[1].match(/"([^"]+)"/g).map((s) => s.replace(/"/g, ""))
}

test("countByStatus covers every status defined in schema", () => {
  const schemaStatuses = extractSchemaStatuses()
  const { countByStatus } = loadTsModule("convex/lib/pipelineStats.ts")
  const result = countByStatus([])
  const countedStatuses = Object.keys(result).sort()

  assert.deepEqual(
    countedStatuses,
    schemaStatuses,
    "countByStatus must track exactly the statuses defined in the schema",
  )
})

test("pipeline funnel PIPELINE_ORDER is a subset of counted statuses", () => {
  const { countByStatus } = loadTsModule("convex/lib/pipelineStats.ts")
  const countedStatuses = Object.keys(countByStatus([]))
  const pipelineOrder = extractPipelineOrder()

  for (const status of pipelineOrder) {
    assert.ok(
      countedStatuses.includes(status),
      `Funnel status "${status}" must exist in countByStatus`,
    )
  }
})

test("pipeline funnel displays correct counts from countByStatus output", () => {
  const { countByStatus } = loadTsModule("convex/lib/pipelineStats.ts")
  const pipelineOrder = extractPipelineOrder()

  const leads = [
    { status: "new_lead" },
    { status: "new_lead" },
    { status: "new_lead" },
    { status: "enriched" },
    { status: "enriched" },
    { status: "outreach_started" },
    { status: "replied" },
    { status: "onboarded" },
    // Terminal statuses — not shown in funnel but correctly counted
    { status: "bounced" },
    { status: "declined" },
    { status: "no_email" },
  ]

  const counts = countByStatus(leads)

  // Verify the 5 funnel statuses get correct counts
  assert.equal(counts.new_lead, 3)
  assert.equal(counts.enriched, 2)
  assert.equal(counts.outreach_started, 1)
  assert.equal(counts.replied, 1)
  assert.equal(counts.onboarded, 1)

  // Verify funnel only shows the 5 pipeline statuses
  assert.equal(pipelineOrder.length, 5)
  assert.deepEqual(pipelineOrder, [
    "new_lead",
    "enriched",
    "outreach_started",
    "replied",
    "onboarded",
  ])

  // Verify terminal statuses are still counted (for total leads)
  assert.equal(counts.bounced, 1)
  assert.equal(counts.declined, 1)
  assert.equal(counts.no_email, 1)
})

test("pipeline funnel uses nullish coalescing for missing counts", () => {
  // Component uses `pipeline[status] ?? 0` — verify this pattern exists
  assert.match(
    funnelSource,
    /pipeline\[status\] \?\? 0/,
    "Component should use ?? 0 for missing counts",
  )
})

test("dashboard query passes all leads to countByStatus without filtering", () => {
  const dashboardSource = fs.readFileSync("convex/dashboard.ts", "utf8")
  // Verify the query collects ALL leads (not filtered by status)
  assert.match(
    dashboardSource,
    /ctx\.db\.query\("leads"\)\.collect\(\)/,
    "pipelineStats query must collect all leads without status filter",
  )
  // Verify it passes directly to countByStatus
  assert.match(
    dashboardSource,
    /return countByStatus\(leads\)/,
    "Query must pass collected leads to countByStatus",
  )
})

test("pipeline funnel max calculation prevents division by zero", () => {
  // Component uses Math.max(...counts, 1) to ensure max >= 1
  assert.match(
    funnelSource,
    /Math\.max\(\.\.\.PIPELINE_ORDER\.map/,
    "Should spread PIPELINE_ORDER counts into Math.max",
  )
  assert.match(funnelSource, /, 1\)/, "Should have minimum max of 1")
})
