import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

import ts from "typescript";

function loadDbscan() {
  const source = fs.readFileSync("convex/lib/dbscan.ts", "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: "dbscan.ts",
  }).outputText;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-dbscan-"));
  const modulePath = path.join(tempDir, "dbscan.cjs");
  fs.writeFileSync(modulePath, transpiled, "utf8");

  const requireFromTest = createRequire(import.meta.url);

  try {
    return requireFromTest(modulePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

test("haversineDistance returns 0 for same point", () => {
  const { haversineDistance } = loadDbscan();
  assert.equal(haversineDistance(43.5, -80.5, 43.5, -80.5), 0);
});

test("haversineDistance computes known distance", () => {
  const { haversineDistance } = loadDbscan();
  // Toronto (43.6532, -79.3832) to Hamilton (43.2557, -79.8711) ~ 59 km
  const dist = haversineDistance(43.6532, -79.3832, 43.2557, -79.8711);
  assert.ok(dist > 55 && dist < 65, `Expected ~59km, got ${dist}`);
});

test("dbscan returns empty array for empty input", () => {
  const { dbscan } = loadDbscan();
  assert.deepEqual(dbscan([], 15, 3), []);
});

test("dbscan returns empty array when no cluster meets minPoints", () => {
  const { dbscan } = loadDbscan();
  // Two points close together, but minPoints=3
  const points = [
    { id: "a", lat: 43.5, lng: -80.5, city: "Guelph" },
    { id: "b", lat: 43.501, lng: -80.501, city: "Guelph" },
  ];
  assert.deepEqual(dbscan(points, 15, 3), []);
});

test("dbscan clusters nearby points", () => {
  const { dbscan } = loadDbscan();
  // Three points within ~1km of each other in Guelph
  const points = [
    { id: "a", lat: 43.5448, lng: -80.2482, city: "Guelph" },
    { id: "b", lat: 43.5460, lng: -80.2500, city: "Guelph" },
    { id: "c", lat: 43.5440, lng: -80.2470, city: "Guelph" },
  ];
  const clusters = dbscan(points, 15, 3);
  assert.equal(clusters.length, 1);
  assert.deepEqual(clusters[0].pointIds.sort(), ["a", "b", "c"]);
  assert.equal(clusters[0].name, "Guelph");
});

test("dbscan separates distant groups", () => {
  const { dbscan } = loadDbscan();
  // Group 1: Guelph area (3 points)
  // Group 2: Toronto area (3 points) — ~60km away
  const points = [
    { id: "g1", lat: 43.5448, lng: -80.2482, city: "Guelph" },
    { id: "g2", lat: 43.5460, lng: -80.2500, city: "Guelph" },
    { id: "g3", lat: 43.5440, lng: -80.2470, city: "Guelph" },
    { id: "t1", lat: 43.6532, lng: -79.3832, city: "Toronto" },
    { id: "t2", lat: 43.6540, lng: -79.3850, city: "Toronto" },
    { id: "t3", lat: 43.6520, lng: -79.3810, city: "Toronto" },
  ];
  const clusters = dbscan(points, 15, 3);
  assert.equal(clusters.length, 2);

  const names = clusters.map((c) => c.name).sort();
  assert.deepEqual(names, ["Guelph", "Toronto"]);

  const guelph = clusters.find((c) => c.name === "Guelph");
  const toronto = clusters.find((c) => c.name === "Toronto");
  assert.deepEqual(guelph.pointIds.sort(), ["g1", "g2", "g3"]);
  assert.deepEqual(toronto.pointIds.sort(), ["t1", "t2", "t3"]);
});

test("dbscan names cluster by most frequent city", () => {
  const { dbscan } = loadDbscan();
  const points = [
    { id: "a", lat: 43.5448, lng: -80.2482, city: "Guelph" },
    { id: "b", lat: 43.5460, lng: -80.2500, city: "Guelph" },
    { id: "c", lat: 43.5440, lng: -80.2470, city: "Kitchener" },
  ];
  const clusters = dbscan(points, 15, 3);
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].name, "Guelph");
});

test("dbscan uses default eps=15 and minPoints=3", () => {
  const { dbscan } = loadDbscan();
  // Three close points should cluster with defaults
  const points = [
    { id: "a", lat: 43.5448, lng: -80.2482, city: "Guelph" },
    { id: "b", lat: 43.5460, lng: -80.2500, city: "Guelph" },
    { id: "c", lat: 43.5440, lng: -80.2470, city: "Guelph" },
  ];
  const clusters = dbscan(points);
  assert.equal(clusters.length, 1);
});

test("dbscan treats points without city as Unknown", () => {
  const { dbscan } = loadDbscan();
  const points = [
    { id: "a", lat: 43.5448, lng: -80.2482 },
    { id: "b", lat: 43.5460, lng: -80.2500 },
    { id: "c", lat: 43.5440, lng: -80.2470 },
  ];
  const clusters = dbscan(points, 15, 3);
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].name, "Unknown");
});

test("dbscan noise points are excluded from clusters", () => {
  const { dbscan } = loadDbscan();
  // 3 close points + 1 far outlier
  const points = [
    { id: "a", lat: 43.5448, lng: -80.2482, city: "Guelph" },
    { id: "b", lat: 43.5460, lng: -80.2500, city: "Guelph" },
    { id: "c", lat: 43.5440, lng: -80.2470, city: "Guelph" },
    { id: "outlier", lat: 45.0, lng: -75.0, city: "Ottawa" },
  ];
  const clusters = dbscan(points, 15, 3);
  assert.equal(clusters.length, 1);
  assert.ok(!clusters[0].pointIds.includes("outlier"));
});

test("dbscan border point joins cluster through core point", () => {
  const { dbscan } = loadDbscan();
  // eps=5km, minPoints=3
  // Core cluster of 3 points at ~0km apart, plus a border point ~4km away
  // The border point is within eps of a core point but doesn't have minPoints neighbors
  const points = [
    { id: "c1", lat: 43.5448, lng: -80.2482, city: "Guelph" },
    { id: "c2", lat: 43.5449, lng: -80.2483, city: "Guelph" },
    { id: "c3", lat: 43.5447, lng: -80.2481, city: "Guelph" },
    { id: "border", lat: 43.5700, lng: -80.2482, city: "Guelph" }, // ~2.8km north
  ];
  const clusters = dbscan(points, 5, 3);
  assert.equal(clusters.length, 1);
  assert.ok(clusters[0].pointIds.includes("border"));
});
