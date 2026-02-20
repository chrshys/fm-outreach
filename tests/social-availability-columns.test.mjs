import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { createRequire } from "node:module"

import ts from "typescript"

const pageSource = fs.readFileSync("src/app/leads/page.tsx", "utf8")
const filterSource = fs.readFileSync("src/components/leads/lead-filters.tsx", "utf8")
const querySource = fs.readFileSync("convex/leads.ts", "utf8")

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

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-social-avail-"))
  const modulePath = path.join(tempDir, `${path.basename(relativePath)}.cjs`)
  fs.writeFileSync(modulePath, transpiled, "utf8")

  const requireFromTest = createRequire(import.meta.url)

  try {
    return requireFromTest(modulePath)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

function createLead(index, overrides = {}) {
  return {
    _id: `lead-${index}`,
    name: `Lead ${String(index).padStart(2, "0")}`,
    city: `City ${String(index).padStart(2, "0")}`,
    status: "new_lead",
    type: "farm",
    source: "manual",
    updatedAt: index,
    ...overrides,
  }
}

// --- Table column tests ---

test("leads page has separate FB and IG table header columns", () => {
  assert.match(pageSource, /TableHead[^>]*>FB<\/TableHead>/)
  assert.match(pageSource, /TableHead[^>]*>IG<\/TableHead>/)
})

test("FB and IG columns are narrow with text-center alignment", () => {
  assert.match(pageSource, /TableHead className="w-12 text-center">FB/)
  assert.match(pageSource, /TableHead className="w-12 text-center">IG/)
})

test("leads page renders checkmark badge for present social links", () => {
  // Checkmark character ✓ is rendered as &#10003;
  assert.match(pageSource, /social\.facebook \? <Badge variant="default">&#10003;<\/Badge>/)
  assert.match(pageSource, /social\.instagram \? <Badge variant="default">&#10003;<\/Badge>/)
})

test("leads page colSpan accounts for separate FB and IG columns (10 total)", () => {
  assert.match(pageSource, /colSpan=\{10\}/)
  assert.doesNotMatch(pageSource, /colSpan=\{9\}/)
})

// --- Filter tests ---

test("LeadFiltersValue type includes hasFacebook and hasInstagram fields", () => {
  assert.match(filterSource, /hasFacebook:\s*boolean/)
  assert.match(filterSource, /hasInstagram:\s*boolean/)
})

test("filter bar renders Has Facebook and Has Instagram toggle buttons", () => {
  assert.match(filterSource, /Has Facebook/)
  assert.match(filterSource, /Has Instagram/)
  assert.match(filterSource, /hasFacebook/)
  assert.match(filterSource, /hasInstagram/)
})

test("filter bar shows dismissible pills for Has Facebook and Has Instagram", () => {
  assert.match(filterSource, /key:\s*"hasFacebook"/)
  assert.match(filterSource, /label:\s*"Has Facebook"/)
  assert.match(filterSource, /key:\s*"hasInstagram"/)
  assert.match(filterSource, /label:\s*"Has Instagram"/)
})

// --- Backend filter tests ---

test("convex leads list query accepts hasFacebook and hasInstagram args", () => {
  assert.match(querySource, /hasFacebook:\s*v\.optional\(v\.boolean\(\)\)/)
  assert.match(querySource, /hasInstagram:\s*v\.optional\(v\.boolean\(\)\)/)
})

test("listLeadsPage filters by hasFacebook", () => {
  const { listLeadsPage } = loadTsModule("convex/lib/leadsList.ts")

  const leads = [
    createLead(1, { socialLinks: { facebook: "https://facebook.com/farm1" } }),
    createLead(2, { socialLinks: { instagram: "https://instagram.com/farm2" } }),
    createLead(3, { socialLinks: { facebook: "https://facebook.com/farm3", instagram: "https://instagram.com/farm3" } }),
    createLead(4, { socialLinks: {} }),
    createLead(5),
  ]

  const withFacebook = listLeadsPage(leads, {
    filters: { hasFacebook: true, now: 1_000 },
    pageSize: 50,
  })
  assert.deepEqual(
    withFacebook.leads.map((l) => l._id),
    ["lead-1", "lead-3"],
  )
})

test("listLeadsPage filters by hasInstagram", () => {
  const { listLeadsPage } = loadTsModule("convex/lib/leadsList.ts")

  const leads = [
    createLead(1, { socialLinks: { facebook: "https://facebook.com/farm1" } }),
    createLead(2, { socialLinks: { instagram: "https://instagram.com/farm2" } }),
    createLead(3, { socialLinks: { facebook: "https://facebook.com/farm3", instagram: "https://instagram.com/farm3" } }),
    createLead(4, { socialLinks: {} }),
    createLead(5),
  ]

  const withInstagram = listLeadsPage(leads, {
    filters: { hasInstagram: true, now: 1_000 },
    pageSize: 50,
  })
  assert.deepEqual(
    withInstagram.leads.map((l) => l._id),
    ["lead-2", "lead-3"],
  )
})

test("listLeadsPage hasFacebook and hasInstagram can be combined", () => {
  const { listLeadsPage } = loadTsModule("convex/lib/leadsList.ts")

  const leads = [
    createLead(1, { socialLinks: { facebook: "https://facebook.com/farm1" } }),
    createLead(2, { socialLinks: { instagram: "https://instagram.com/farm2" } }),
    createLead(3, { socialLinks: { facebook: "https://facebook.com/farm3", instagram: "https://instagram.com/farm3" } }),
    createLead(4, { socialLinks: {} }),
  ]

  const withBoth = listLeadsPage(leads, {
    filters: { hasFacebook: true, hasInstagram: true, now: 1_000 },
    pageSize: 50,
  })
  assert.deepEqual(
    withBoth.leads.map((l) => l._id),
    ["lead-3"],
  )
})

test("listLeadsPage hasFacebook ignores whitespace-only values", () => {
  const { listLeadsPage } = loadTsModule("convex/lib/leadsList.ts")

  const leads = [
    createLead(1, { socialLinks: { facebook: "  " } }),
    createLead(2, { socialLinks: { facebook: "https://facebook.com/real" } }),
  ]

  const result = listLeadsPage(leads, {
    filters: { hasFacebook: true, now: 1_000 },
    pageSize: 50,
  })
  assert.deepEqual(
    result.leads.map((l) => l._id),
    ["lead-2"],
  )
})

// --- Default filters include new fields ---

test("leads page defaultFilters includes hasFacebook and hasInstagram as false", () => {
  assert.match(pageSource, /hasFacebook:\s*filters\.hasFacebook\s*\?\s*true\s*:\s*undefined/)
  assert.match(pageSource, /hasInstagram:\s*filters\.hasInstagram\s*\?\s*true\s*:\s*undefined/)
})

test("leads page passes hasFacebook and hasInstagram to query args", () => {
  assert.match(pageSource, /hasFacebook:\s*filters\.hasFacebook/)
  assert.match(pageSource, /hasInstagram:\s*filters\.hasInstagram/)
})
