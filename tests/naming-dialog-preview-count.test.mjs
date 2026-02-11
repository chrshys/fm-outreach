import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { createRequire } from "node:module"

import ts from "typescript"

/**
 * Validates that the naming dialog preview count correctly counts leads
 * inside a drawn polygon. Tests the exact computation logic used in the
 * map page's previewLeadCount useMemo — including the field mapping from
 * lead.latitude/lead.longitude to the {lat, lng} format expected by
 * pointInPolygon.
 */

function loadClientModule() {
  const source = fs.readFileSync("src/lib/point-in-polygon.ts", "utf8")
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: "point-in-polygon.ts",
  }).outputText

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-preview-"))
  const modulePath = path.join(tempDir, "point-in-polygon.cjs")
  fs.writeFileSync(modulePath, transpiled, "utf8")

  const requireFromTest = createRequire(import.meta.url)
  try {
    return requireFromTest(modulePath)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

// Simulate the exact computation from map page's previewLeadCount useMemo:
//   leads.filter((lead) =>
//     pointInPolygon({ lat: lead.latitude, lng: lead.longitude }, drawnPolygon)
//   ).length
function computePreviewLeadCount(leads, drawnPolygon, pointInPolygon) {
  if (!drawnPolygon || !leads) return 0
  return leads.filter((lead) =>
    pointInPolygon({ lat: lead.latitude, lng: lead.longitude }, drawnPolygon),
  ).length
}

// Polygon around downtown area
const polygon = [
  { lat: 43.20, lng: -79.12 },
  { lat: 43.20, lng: -79.04 },
  { lat: 43.28, lng: -79.04 },
  { lat: 43.28, lng: -79.12 },
]

// Leads in the shape returned by listWithCoords (latitude/longitude fields)
const leadsFromQuery = [
  { _id: "1", name: "Inside Lead A", latitude: 43.25, longitude: -79.07, status: "new", clusterId: undefined },
  { _id: "2", name: "Inside Lead B", latitude: 43.22, longitude: -79.10, status: "contacted", clusterId: undefined },
  { _id: "3", name: "Inside Lead C", latitude: 43.26, longitude: -79.05, status: "new", clusterId: undefined },
  { _id: "4", name: "Outside Lead D", latitude: 43.16, longitude: -79.24, status: "new", clusterId: undefined },
  { _id: "5", name: "Outside Lead E", latitude: 42.99, longitude: -79.24, status: "new", clusterId: undefined },
  { _id: "6", name: "Outside Lead F", latitude: 43.65, longitude: -79.38, status: "contacted", clusterId: undefined },
]

// --- Preview count computation ---

test("preview count returns correct number of leads inside polygon", () => {
  const { pointInPolygon } = loadClientModule()
  const count = computePreviewLeadCount(leadsFromQuery, polygon, pointInPolygon)
  assert.equal(count, 3, `Expected 3 leads inside polygon, got ${count}`)
})

test("preview count returns 0 when no leads are inside polygon", () => {
  const { pointInPolygon } = loadClientModule()
  const outsideOnly = leadsFromQuery.filter((l) => l.latitude < 43.18)
  const count = computePreviewLeadCount(outsideOnly, polygon, pointInPolygon)
  assert.equal(count, 0, `Expected 0 leads inside polygon, got ${count}`)
})

test("preview count returns 0 when drawnPolygon is null", () => {
  const { pointInPolygon } = loadClientModule()
  const count = computePreviewLeadCount(leadsFromQuery, null, pointInPolygon)
  assert.equal(count, 0)
})

test("preview count returns 0 when leads is undefined", () => {
  const { pointInPolygon } = loadClientModule()
  const count = computePreviewLeadCount(undefined, polygon, pointInPolygon)
  assert.equal(count, 0)
})

test("preview count handles all leads inside polygon", () => {
  const { pointInPolygon } = loadClientModule()
  const allInside = leadsFromQuery.filter((l) => l.latitude > 43.20 && l.latitude < 43.28)
  const count = computePreviewLeadCount(allInside, polygon, pointInPolygon)
  assert.equal(count, allInside.length)
})

test("preview count handles single lead inside polygon", () => {
  const { pointInPolygon } = loadClientModule()
  const single = [leadsFromQuery[0]]
  const count = computePreviewLeadCount(single, polygon, pointInPolygon)
  assert.equal(count, 1)
})

test("preview count handles empty leads array", () => {
  const { pointInPolygon } = loadClientModule()
  const count = computePreviewLeadCount([], polygon, pointInPolygon)
  assert.equal(count, 0)
})

// --- Dialog text formatting ---

const mapPageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")

test("dialog description uses previewLeadCount with correct pluralization", () => {
  // Verifies the pattern: {previewLeadCount} lead{previewLeadCount !== 1 ? "s" : ""} found
  assert.match(
    mapPageSource,
    /previewLeadCount\}\s*lead\{previewLeadCount\s*!==\s*1/,
    "Should pluralize 'lead' when count !== 1",
  )
  assert.match(mapPageSource, /found\s*inside the drawn area/)
})

test("previewLeadCount useMemo depends on drawnPolygon and leads", () => {
  // Verify the useMemo has correct dependencies
  assert.match(
    mapPageSource,
    /useMemo\(\(\)\s*=>\s*\{[\s\S]*?previewLeadCount[\s\S]*?\},\s*\[drawnPolygon,\s*leads\]\)/,
    "previewLeadCount useMemo should depend on [drawnPolygon, leads]",
  )
})

test("previewLeadCount maps lead.latitude and lead.longitude to pointInPolygon", () => {
  // The critical field mapping — listWithCoords returns latitude/longitude,
  // but pointInPolygon expects {lat, lng}
  assert.match(
    mapPageSource,
    /pointInPolygon\(\{\s*lat:\s*lead\.latitude,\s*lng:\s*lead\.longitude\s*\}/,
    "Should map lead.latitude/longitude to {lat, lng} for pointInPolygon",
  )
})
