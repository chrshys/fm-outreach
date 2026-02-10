import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
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

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-active-statuses-"))
  const modulePath = path.join(tempDir, `${path.basename(relativePath)}.cjs`)
  fs.writeFileSync(modulePath, transpiled, "utf8")

  const requireFromTest = createRequire(import.meta.url)

  try {
    return requireFromTest(modulePath)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

const componentSource = fs.readFileSync(
  "src/components/dashboard/active-campaigns.tsx",
  "utf8",
)

// ── Backend: buildActiveCampaigns status filtering ─────────────────────

test("buildActiveCampaigns only returns active and paused, never draft/pushed/completed", () => {
  const { buildActiveCampaigns } = loadTsModule("convex/lib/activeCampaigns.ts")
  const campaigns = [
    { _id: "1", name: "Draft", status: "draft", leadCount: 5 },
    { _id: "2", name: "Pushed", status: "pushed", leadCount: 10 },
    { _id: "3", name: "Active One", status: "active", leadCount: 20, smartleadCampaignId: "sl-3" },
    { _id: "4", name: "Paused One", status: "paused", leadCount: 15, smartleadCampaignId: "sl-4" },
    { _id: "5", name: "Completed", status: "completed", leadCount: 30 },
  ]

  const result = buildActiveCampaigns(campaigns, [])

  const statuses = result.map((c) => c.status)
  assert.deepEqual(statuses, ["active", "paused"])
  assert.ok(!statuses.includes("draft"), "draft should be excluded")
  assert.ok(!statuses.includes("pushed"), "pushed should be excluded")
  assert.ok(!statuses.includes("completed"), "completed should be excluded")
})

test("buildActiveCampaigns preserves the original status value on each campaign", () => {
  const { buildActiveCampaigns } = loadTsModule("convex/lib/activeCampaigns.ts")
  const campaigns = [
    { _id: "a", name: "Running", status: "active", leadCount: 10, smartleadCampaignId: "sl-a" },
    { _id: "b", name: "On Hold", status: "paused", leadCount: 5, smartleadCampaignId: "sl-b" },
  ]

  const result = buildActiveCampaigns(campaigns, [])

  assert.equal(result[0].status, "active")
  assert.equal(result[1].status, "paused")
})

test("buildActiveCampaigns returns multiple active campaigns with independent stats", () => {
  const { buildActiveCampaigns } = loadTsModule("convex/lib/activeCampaigns.ts")
  const campaigns = [
    { _id: "a", name: "Camp A", status: "active", leadCount: 10, smartleadCampaignId: "sl-a" },
    { _id: "b", name: "Camp B", status: "active", leadCount: 20, smartleadCampaignId: "sl-b" },
    { _id: "c", name: "Camp C", status: "paused", leadCount: 5, smartleadCampaignId: "sl-c" },
  ]
  const emails = [
    { smartleadCampaignId: "sl-a", openedAt: 1 },
    { smartleadCampaignId: "sl-a" },
    { smartleadCampaignId: "sl-b", openedAt: 1, repliedAt: 1 },
  ]

  const result = buildActiveCampaigns(campaigns, emails)

  assert.equal(result.length, 3)
  // Camp A: 2 sent, 1 opened, 0 replied
  assert.equal(result[0].stats.sent, 2)
  assert.equal(result[0].stats.openRate, 0.5)
  assert.equal(result[0].stats.replyRate, 0)
  // Camp B: 1 sent, 1 opened, 1 replied
  assert.equal(result[1].stats.sent, 1)
  assert.equal(result[1].stats.openRate, 1)
  assert.equal(result[1].stats.replyRate, 1)
  // Camp C: 0 sent (no emails for sl-c)
  assert.equal(result[2].stats.sent, 0)
  assert.equal(result[2].stats.openRate, 0)
})

// ── Frontend: status badge styling ─────────────────────────────────────

test("component maps active status to emerald badge", () => {
  assert.match(componentSource, /active:\s*"bg-emerald-100 text-emerald-800"/)
})

test("component maps paused status to amber badge", () => {
  assert.match(componentSource, /paused:\s*"bg-amber-100 text-amber-800"/)
})

test("component renders Badge with STATUS_STYLES[campaign.status]", () => {
  assert.match(componentSource, /STATUS_STYLES\[campaign\.status\]/)
})

test("component renders campaign status via toLabel for proper casing", () => {
  assert.match(componentSource, /\{toLabel\(campaign\.status\)\}/)
})

// ── Frontend: data wiring ──────────────────────────────────────────────

test("dashboard page passes activeCampaigns query result to ActiveCampaigns component", () => {
  const page = fs.readFileSync("src/app/page.tsx", "utf8")
  assert.match(page, /useQuery\(api\.dashboard\.activeCampaigns\)/)
  assert.match(page, /<ActiveCampaigns campaigns=\{campaigns \?\? \[\]\}/)
})

test("ActiveCampaignItem interface restricts status to active or paused", () => {
  assert.match(componentSource, /status: "active" \| "paused"/)
})

// ── Backend query: dashboard.ts wires campaigns + emails ───────────────

test("dashboard activeCampaigns query fetches both campaigns and emails tables", () => {
  const dashboard = fs.readFileSync("convex/dashboard.ts", "utf8")
  assert.match(dashboard, /ctx\.db\.query\("campaigns"\)\.collect\(\)/)
  assert.match(dashboard, /ctx\.db\.query\("emails"\)\.collect\(\)/)
  assert.match(dashboard, /buildActiveCampaigns\(campaigns, emails\)/)
})

// ── Backend result shape matches frontend expectations ──────────────────

test("ActiveCampaignResult type matches ActiveCampaignItem interface fields", () => {
  const libSource = fs.readFileSync("convex/lib/activeCampaigns.ts", "utf8")
  // Backend result type has same shape as frontend expects
  assert.match(libSource, /status: "active" \| "paused"/)
  assert.match(libSource, /sent: number/)
  assert.match(libSource, /openRate: number/)
  assert.match(libSource, /replyRate: number/)
  assert.match(libSource, /leadCount: number/)
  assert.match(libSource, /name: string/)
})
