import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { createRequire } from "node:module"

import ts from "typescript"

/**
 * Validates the full draw-to-create polygon cluster flow using
 * Niagara-on-the-Lake area coordinates. Tests that:
 * - A polygon drawn around NOTL correctly identifies enclosed leads
 * - Leads outside the polygon are excluded
 * - Centroid and bounding radius are computed correctly
 * - The map page wires up all necessary state and handlers
 */

function loadServerModule() {
  const source = fs.readFileSync("convex/lib/pointInPolygon.ts", "utf8")
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: "pointInPolygon.ts",
  }).outputText

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-notl-"))
  const modulePath = path.join(tempDir, "pointInPolygon.cjs")
  fs.writeFileSync(modulePath, transpiled, "utf8")

  const requireFromTest = createRequire(import.meta.url)
  try {
    return requireFromTest(modulePath)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

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

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-notl-client-"))
  const modulePath = path.join(tempDir, "point-in-polygon.cjs")
  fs.writeFileSync(modulePath, transpiled, "utf8")

  const requireFromTest = createRequire(import.meta.url)
  try {
    return requireFromTest(modulePath)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

// Polygon around Niagara-on-the-Lake area
const notlPolygon = [
  { lat: 43.20, lng: -79.12 },
  { lat: 43.20, lng: -79.04 },
  { lat: 43.28, lng: -79.04 },
  { lat: 43.28, lng: -79.12 },
]

// Simulated leads — some inside NOTL polygon, some outside
const leads = [
  { name: "NOTL Winery", lat: 43.25, lng: -79.07, inside: true },
  { name: "NOTL Farm Stand", lat: 43.22, lng: -79.10, inside: true },
  { name: "NOTL Orchard", lat: 43.26, lng: -79.05, inside: true },
  { name: "St. Catharines Market", lat: 43.16, lng: -79.24, inside: false },
  { name: "Welland Farm", lat: 42.99, lng: -79.24, inside: false },
  { name: "Hamilton Shop", lat: 43.26, lng: -79.87, inside: false },
  { name: "Toronto Store", lat: 43.65, lng: -79.38, inside: false },
]

// --- Point-in-polygon with NOTL coordinates ---

test("server pointInPolygon identifies leads inside NOTL polygon", () => {
  const { pointInPolygon } = loadServerModule()
  for (const lead of leads) {
    const result = pointInPolygon({ lat: lead.lat, lng: lead.lng }, notlPolygon)
    assert.equal(
      result,
      lead.inside,
      `${lead.name} at (${lead.lat}, ${lead.lng}) should be ${lead.inside ? "inside" : "outside"}`,
    )
  }
})

test("client pointInPolygon identifies leads inside NOTL polygon", () => {
  const { pointInPolygon } = loadClientModule()
  for (const lead of leads) {
    const result = pointInPolygon({ lat: lead.lat, lng: lead.lng }, notlPolygon)
    assert.equal(
      result,
      lead.inside,
      `${lead.name} at (${lead.lat}, ${lead.lng}) should be ${lead.inside ? "inside" : "outside"}`,
    )
  }
})

test("client and server agree on all NOTL lead classifications", () => {
  const server = loadServerModule()
  const client = loadClientModule()
  for (const lead of leads) {
    const point = { lat: lead.lat, lng: lead.lng }
    assert.equal(
      server.pointInPolygon(point, notlPolygon),
      client.pointInPolygon(point, notlPolygon),
      `Client/server mismatch for ${lead.name}`,
    )
  }
})

test("preview lead count matches expected 3 leads inside NOTL polygon", () => {
  const { pointInPolygon } = loadClientModule()
  const count = leads.filter((l) =>
    pointInPolygon({ lat: l.lat, lng: l.lng }, notlPolygon),
  ).length
  assert.equal(count, 3, `Expected 3 leads inside NOTL polygon, got ${count}`)
})

// --- Centroid and bounding radius for NOTL polygon ---

test("NOTL polygon centroid is within the polygon", () => {
  const { polygonCentroid, pointInPolygon } = loadServerModule()
  const centroid = polygonCentroid(notlPolygon)
  // Centroid of the rectangle should be approximately at (43.24, -79.08)
  assert.ok(
    Math.abs(centroid.lat - 43.24) < 0.01,
    `Expected centroid lat ~43.24, got ${centroid.lat}`,
  )
  assert.ok(
    Math.abs(centroid.lng - -79.08) < 0.01,
    `Expected centroid lng ~-79.08, got ${centroid.lng}`,
  )
  assert.ok(
    pointInPolygon(centroid, notlPolygon),
    "Centroid should be inside the polygon",
  )
})

test("NOTL polygon bounding radius is reasonable for the area", () => {
  const { polygonCentroid, boundingRadius } = loadServerModule()
  const centroid = polygonCentroid(notlPolygon)
  const radius = boundingRadius(centroid, notlPolygon)
  // The polygon is roughly 8km x 5km, so bounding radius should be ~5-7km
  assert.ok(radius > 3, `Expected bounding radius > 3km, got ${radius}`)
  assert.ok(radius < 10, `Expected bounding radius < 10km, got ${radius}`)
})

// --- Map page has the full draw-to-create wiring ---

const mapPageSource = fs.readFileSync("src/app/map/page.tsx", "utf8")

test("map page computes previewLeadCount using pointInPolygon against leads", () => {
  assert.match(mapPageSource, /previewLeadCount/)
  assert.match(mapPageSource, /pointInPolygon\(/)
  assert.match(mapPageSource, /drawnPolygon/)
})

test("map page calls createPolygonCluster with name and boundary", () => {
  assert.match(mapPageSource, /createCluster\(\{\s*name:\s*clusterName/)
  assert.match(mapPageSource, /boundary:\s*drawnPolygon/)
})

test("map page dialog displays lead count preview to user", () => {
  assert.match(
    mapPageSource,
    /previewLeadCount.*lead/,
    "Should show lead count in dialog description",
  )
})

// --- Backend mutation structure ---

const clustersMutationSource = fs.readFileSync("convex/clusters.ts", "utf8")

test("createPolygonCluster mutation computes centroid from boundary", () => {
  assert.match(clustersMutationSource, /polygonCentroid\(boundary\)/)
})

test("createPolygonCluster mutation computes bounding radius", () => {
  assert.match(clustersMutationSource, /boundingRadius\(centroid, boundary\)/)
})

test("createPolygonCluster mutation filters leads with pointInPolygon", () => {
  assert.match(clustersMutationSource, /pointInPolygon\(/)
  assert.match(clustersMutationSource, /enclosedLeads/)
})

test("createPolygonCluster mutation assigns clusterId to enclosed leads", () => {
  assert.match(clustersMutationSource, /clusterId/)
  assert.match(clustersMutationSource, /ctx\.db\.patch\(lead\._id/)
})

test("createPolygonCluster mutation logs activity for each assigned lead", () => {
  assert.match(clustersMutationSource, /ctx\.db\.insert\("activities"/)
  assert.match(clustersMutationSource, /Assigned to cluster/)
})

test("createPolygonCluster returns clusterId and leadCount", () => {
  assert.match(clustersMutationSource, /return\s*\{[\s\S]*clusterId[\s\S]*leadCount/)
})
