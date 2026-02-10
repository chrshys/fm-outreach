import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { createRequire } from "node:module"

import ts from "typescript"

function loadEnrichmentLib() {
  const source = fs.readFileSync("src/lib/enrichment.ts", "utf8")
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: "enrichment.ts",
  }).outputText

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-enrichment-"))
  const modulePath = path.join(tempDir, "enrichment.cjs")
  fs.writeFileSync(modulePath, transpiled, "utf8")

  const requireFromTest = createRequire(import.meta.url)

  try {
    return requireFromTest(modulePath)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

const DAY_MS = 1000 * 60 * 60 * 24

// --- getStaleness ---

test("getStaleness returns 'fresh' for enrichment 0 days ago", () => {
  const { getStaleness } = loadEnrichmentLib()
  assert.equal(getStaleness(Date.now()), "fresh")
})

test("getStaleness returns 'fresh' for enrichment 1 day ago", () => {
  const { getStaleness } = loadEnrichmentLib()
  assert.equal(getStaleness(Date.now() - 1 * DAY_MS), "fresh")
})

test("getStaleness returns 'fresh' for enrichment 29 days ago", () => {
  const { getStaleness } = loadEnrichmentLib()
  assert.equal(getStaleness(Date.now() - 29 * DAY_MS), "fresh")
})

test("getStaleness returns 'aging' for enrichment exactly 30 days ago", () => {
  const { getStaleness } = loadEnrichmentLib()
  assert.equal(getStaleness(Date.now() - 30 * DAY_MS), "aging")
})

test("getStaleness returns 'aging' for enrichment 60 days ago", () => {
  const { getStaleness } = loadEnrichmentLib()
  assert.equal(getStaleness(Date.now() - 60 * DAY_MS), "aging")
})

test("getStaleness returns 'aging' for enrichment exactly 90 days ago", () => {
  const { getStaleness } = loadEnrichmentLib()
  assert.equal(getStaleness(Date.now() - 90 * DAY_MS), "aging")
})

test("getStaleness returns 'stale' for enrichment 91 days ago", () => {
  const { getStaleness } = loadEnrichmentLib()
  assert.equal(getStaleness(Date.now() - 91 * DAY_MS), "stale")
})

test("getStaleness returns 'stale' for enrichment 180 days ago", () => {
  const { getStaleness } = loadEnrichmentLib()
  assert.equal(getStaleness(Date.now() - 180 * DAY_MS), "stale")
})

test("getStaleness returns 'stale' for enrichment 365 days ago", () => {
  const { getStaleness } = loadEnrichmentLib()
  assert.equal(getStaleness(Date.now() - 365 * DAY_MS), "stale")
})

// --- STALENESS_CONFIG ---

test("STALENESS_CONFIG has entries for all three levels", () => {
  const { STALENESS_CONFIG } = loadEnrichmentLib()
  assert.ok(STALENESS_CONFIG.fresh)
  assert.ok(STALENESS_CONFIG.aging)
  assert.ok(STALENESS_CONFIG.stale)
})

test("STALENESS_CONFIG fresh uses green badge", () => {
  const { STALENESS_CONFIG } = loadEnrichmentLib()
  assert.equal(STALENESS_CONFIG.fresh.label, "Fresh")
  assert.match(STALENESS_CONFIG.fresh.className, /green/)
})

test("STALENESS_CONFIG aging uses amber badge", () => {
  const { STALENESS_CONFIG } = loadEnrichmentLib()
  assert.equal(STALENESS_CONFIG.aging.label, "Aging")
  assert.match(STALENESS_CONFIG.aging.className, /amber/)
})

test("STALENESS_CONFIG stale uses red badge", () => {
  const { STALENESS_CONFIG } = loadEnrichmentLib()
  assert.equal(STALENESS_CONFIG.stale.label, "Stale")
  assert.match(STALENESS_CONFIG.stale.className, /red/)
})

// --- latestBySource ---

test("latestBySource returns empty array for empty input", () => {
  const { latestBySource } = loadEnrichmentLib()
  assert.deepEqual(latestBySource([]), [])
})

test("latestBySource passes through single entry per source", () => {
  const { latestBySource } = loadEnrichmentLib()
  const sources = [
    { source: "google_places", fetchedAt: 1000 },
    { source: "hunter", fetchedAt: 2000 },
  ]
  const result = latestBySource(sources)
  assert.equal(result.length, 2)
})

test("latestBySource keeps only latest entry when duplicated", () => {
  const { latestBySource } = loadEnrichmentLib()
  const sources = [
    { source: "google_places", fetchedAt: 1000 },
    { source: "google_places", fetchedAt: 3000 },
    { source: "google_places", fetchedAt: 2000 },
  ]
  const result = latestBySource(sources)
  assert.equal(result.length, 1)
  assert.equal(result[0].fetchedAt, 3000)
})

test("latestBySource deduplicates multiple sources independently", () => {
  const { latestBySource } = loadEnrichmentLib()
  const sources = [
    { source: "google_places", fetchedAt: 1000 },
    { source: "hunter", fetchedAt: 1500 },
    { source: "google_places", fetchedAt: 3000 },
    { source: "hunter", fetchedAt: 500 },
  ]
  const result = latestBySource(sources)
  assert.equal(result.length, 2)
  const gp = result.find((e) => e.source === "google_places")
  const h = result.find((e) => e.source === "hunter")
  assert.equal(gp.fetchedAt, 3000)
  assert.equal(h.fetchedAt, 1500)
})

test("latestBySource preserves detail field", () => {
  const { latestBySource } = loadEnrichmentLib()
  const sources = [
    { source: "google_places", detail: "old-place-id", fetchedAt: 1000 },
    { source: "google_places", detail: "new-place-id", fetchedAt: 2000 },
  ]
  const result = latestBySource(sources)
  assert.equal(result.length, 1)
  assert.equal(result[0].detail, "new-place-id")
})

// --- Component imports from shared utility ---

test("DataFreshness component imports from shared enrichment lib", () => {
  const source = fs.readFileSync(
    "src/components/leads/data-freshness.tsx",
    "utf8",
  )
  assert.match(source, /import.*getStaleness.*from.*enrichment/)
  assert.match(source, /import.*STALENESS_CONFIG.*from.*enrichment/)
  assert.match(source, /import.*latestBySource.*from.*enrichment/)
})
