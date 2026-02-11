import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

import ts from "typescript";

function loadModule() {
  const source = fs.readFileSync("convex/lib/pointInPolygon.ts", "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: "pointInPolygon.ts",
  }).outputText;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-pip-"));
  const modulePath = path.join(tempDir, "pointInPolygon.cjs");
  fs.writeFileSync(modulePath, transpiled, "utf8");

  const requireFromTest = createRequire(import.meta.url);

  try {
    return requireFromTest(modulePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// --- pointInPolygon ---

// Simple square polygon: (0,0), (0,10), (10,10), (10,0)
const square = [
  { lat: 0, lng: 0 },
  { lat: 0, lng: 10 },
  { lat: 10, lng: 10 },
  { lat: 10, lng: 0 },
];

test("pointInPolygon returns true for point inside square", () => {
  const { pointInPolygon } = loadModule();
  assert.equal(pointInPolygon({ lat: 5, lng: 5 }, square), true);
});

test("pointInPolygon returns false for point outside square", () => {
  const { pointInPolygon } = loadModule();
  assert.equal(pointInPolygon({ lat: 15, lng: 5 }, square), false);
});

test("pointInPolygon returns false for point far outside", () => {
  const { pointInPolygon } = loadModule();
  assert.equal(pointInPolygon({ lat: -5, lng: -5 }, square), false);
});

test("pointInPolygon works with triangle", () => {
  const { pointInPolygon } = loadModule();
  const triangle = [
    { lat: 0, lng: 0 },
    { lat: 10, lng: 5 },
    { lat: 0, lng: 10 },
  ];
  assert.equal(pointInPolygon({ lat: 3, lng: 5 }, triangle), true);
  assert.equal(pointInPolygon({ lat: 9, lng: 1 }, triangle), false);
});

test("pointInPolygon works with concave polygon", () => {
  const { pointInPolygon } = loadModule();
  // L-shaped polygon
  const lShape = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 5 },
    { lat: 5, lng: 5 },
    { lat: 5, lng: 10 },
    { lat: 10, lng: 10 },
    { lat: 10, lng: 0 },
  ];
  // Inside the L
  assert.equal(pointInPolygon({ lat: 8, lng: 5 }, lShape), true);
  // In the cut-out area of the L
  assert.equal(pointInPolygon({ lat: 2, lng: 7 }, lShape), false);
});

test("pointInPolygon handles real-world coordinates", () => {
  const { pointInPolygon } = loadModule();
  // A rough polygon around Guelph, Ontario
  const guelphArea = [
    { lat: 43.50, lng: -80.30 },
    { lat: 43.50, lng: -80.20 },
    { lat: 43.58, lng: -80.20 },
    { lat: 43.58, lng: -80.30 },
  ];
  // Point in Guelph
  assert.equal(pointInPolygon({ lat: 43.55, lng: -80.25 }, guelphArea), true);
  // Point in Toronto (outside)
  assert.equal(pointInPolygon({ lat: 43.65, lng: -79.38 }, guelphArea), false);
});

test("pointInPolygon returns false for empty polygon", () => {
  const { pointInPolygon } = loadModule();
  assert.equal(pointInPolygon({ lat: 5, lng: 5 }, []), false);
});

// --- polygonCentroid ---

test("polygonCentroid of a square is its center", () => {
  const { polygonCentroid } = loadModule();
  const centroid = polygonCentroid(square);
  assert.ok(Math.abs(centroid.lat - 5) < 0.001, `Expected lat ~5, got ${centroid.lat}`);
  assert.ok(Math.abs(centroid.lng - 5) < 0.001, `Expected lng ~5, got ${centroid.lng}`);
});

test("polygonCentroid of a triangle", () => {
  const { polygonCentroid } = loadModule();
  const triangle = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 6 },
    { lat: 6, lng: 0 },
  ];
  const centroid = polygonCentroid(triangle);
  assert.ok(Math.abs(centroid.lat - 2) < 0.01, `Expected lat ~2, got ${centroid.lat}`);
  assert.ok(Math.abs(centroid.lng - 2) < 0.01, `Expected lng ~2, got ${centroid.lng}`);
});

test("polygonCentroid returns the point for single-vertex polygon", () => {
  const { polygonCentroid } = loadModule();
  const centroid = polygonCentroid([{ lat: 43.5, lng: -80.2 }]);
  assert.equal(centroid.lat, 43.5);
  assert.equal(centroid.lng, -80.2);
});

test("polygonCentroid returns midpoint for two-vertex polygon", () => {
  const { polygonCentroid } = loadModule();
  const centroid = polygonCentroid([
    { lat: 0, lng: 0 },
    { lat: 10, lng: 10 },
  ]);
  assert.equal(centroid.lat, 5);
  assert.equal(centroid.lng, 5);
});

test("polygonCentroid returns {0,0} for empty polygon", () => {
  const { polygonCentroid } = loadModule();
  const centroid = polygonCentroid([]);
  assert.equal(centroid.lat, 0);
  assert.equal(centroid.lng, 0);
});

// --- boundingRadius ---

test("boundingRadius returns 0 when center is the only vertex", () => {
  const { boundingRadius } = loadModule();
  const center = { lat: 43.5, lng: -80.2 };
  assert.equal(boundingRadius(center, [center]), 0);
});

test("boundingRadius returns max distance to farthest vertex", () => {
  const { boundingRadius } = loadModule();
  const center = { lat: 43.5, lng: -80.25 };
  const polygon = [
    { lat: 43.5, lng: -80.2 },   // close
    { lat: 43.5, lng: -80.3 },   // close
    { lat: 44.0, lng: -80.25 },  // ~55km north
  ];
  const radius = boundingRadius(center, polygon);
  // The farthest vertex is ~55km away
  assert.ok(radius > 50, `Expected >50km, got ${radius}`);
  assert.ok(radius < 60, `Expected <60km, got ${radius}`);
});

test("boundingRadius returns 0 for empty polygon", () => {
  const { boundingRadius } = loadModule();
  assert.equal(boundingRadius({ lat: 0, lng: 0 }, []), 0);
});

test("boundingRadius computes correct distance for known points", () => {
  const { boundingRadius } = loadModule();
  // Toronto to Hamilton is ~59km
  const center = { lat: 43.6532, lng: -79.3832 };
  const polygon = [
    { lat: 43.2557, lng: -79.8711 }, // Hamilton
  ];
  const radius = boundingRadius(center, polygon);
  assert.ok(radius > 55 && radius < 65, `Expected ~59km, got ${radius}`);
});
