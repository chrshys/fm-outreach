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

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-autogen-"));
  const modulePath = path.join(tempDir, "dbscan.cjs");
  fs.writeFileSync(modulePath, transpiled, "utf8");

  const requireFromTest = createRequire(import.meta.url);

  try {
    return requireFromTest(modulePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// Helper that replicates the center/radius logic from autoGenerate
function computeClusterGeometry(points, cluster) {
  const { haversineDistance } = loadDbscan();
  const memberPoints = points.filter((p) => cluster.pointIds.includes(p.id));

  const centerLat =
    memberPoints.reduce((sum, p) => sum + p.lat, 0) / memberPoints.length;
  const centerLng =
    memberPoints.reduce((sum, p) => sum + p.lng, 0) / memberPoints.length;

  let radiusKm = 0;
  for (const p of memberPoints) {
    const dist = haversineDistance(centerLat, centerLng, p.lat, p.lng);
    if (dist > radiusKm) radiusKm = dist;
  }
  radiusKm = Math.max(radiusKm, 1);

  return { centerLat, centerLng, radiusKm, leadCount: memberPoints.length };
}

// --- Center calculation tests ---

test("autoGenerate: center is average of member coordinates", () => {
  const { dbscan } = loadDbscan();
  const points = [
    { id: "a", lat: 43.0, lng: -80.0, city: "Guelph" },
    { id: "b", lat: 44.0, lng: -81.0, city: "Guelph" },
    { id: "c", lat: 43.5, lng: -80.5, city: "Guelph" },
  ];
  const clusters = dbscan(points, 200, 3); // large eps to force single cluster
  assert.equal(clusters.length, 1);

  const geo = computeClusterGeometry(points, clusters[0]);
  assert.ok(
    Math.abs(geo.centerLat - 43.5) < 0.001,
    `Expected centerLat ~43.5, got ${geo.centerLat}`,
  );
  assert.ok(
    Math.abs(geo.centerLng - -80.5) < 0.001,
    `Expected centerLng ~-80.5, got ${geo.centerLng}`,
  );
});

test("autoGenerate: radius is max distance from center to any member", () => {
  const { dbscan, haversineDistance } = loadDbscan();
  const points = [
    { id: "a", lat: 43.5448, lng: -80.2482, city: "Guelph" },
    { id: "b", lat: 43.5460, lng: -80.2500, city: "Guelph" },
    { id: "c", lat: 43.5440, lng: -80.2470, city: "Guelph" },
  ];
  const clusters = dbscan(points, 15, 3);
  assert.equal(clusters.length, 1);

  const geo = computeClusterGeometry(points, clusters[0]);

  // Verify radius is >= distance from center to each member
  for (const p of points) {
    const dist = haversineDistance(geo.centerLat, geo.centerLng, p.lat, p.lng);
    assert.ok(
      geo.radiusKm >= dist,
      `Radius ${geo.radiusKm} should be >= dist ${dist}`,
    );
  }
});

test("autoGenerate: minimum radius is 1km", () => {
  const { dbscan } = loadDbscan();
  // Three nearly identical points
  const points = [
    { id: "a", lat: 43.5448, lng: -80.2482, city: "Guelph" },
    { id: "b", lat: 43.5448, lng: -80.2482, city: "Guelph" },
    { id: "c", lat: 43.5448, lng: -80.2482, city: "Guelph" },
  ];
  const clusters = dbscan(points, 15, 3);
  assert.equal(clusters.length, 1);

  const geo = computeClusterGeometry(points, clusters[0]);
  assert.ok(geo.radiusKm >= 1, `Min radius should be 1km, got ${geo.radiusKm}`);
});

test("autoGenerate: leadCount matches cluster member count", () => {
  const { dbscan } = loadDbscan();
  const points = [
    { id: "a", lat: 43.5448, lng: -80.2482, city: "Guelph" },
    { id: "b", lat: 43.5460, lng: -80.2500, city: "Guelph" },
    { id: "c", lat: 43.5440, lng: -80.2470, city: "Guelph" },
  ];
  const clusters = dbscan(points, 15, 3);

  const geo = computeClusterGeometry(points, clusters[0]);
  assert.equal(geo.leadCount, 3);
});

// --- Multiple cluster tests ---

test("autoGenerate: multiple clusters get separate geometry", () => {
  const { dbscan } = loadDbscan();
  const points = [
    // Guelph cluster
    { id: "g1", lat: 43.5448, lng: -80.2482, city: "Guelph" },
    { id: "g2", lat: 43.5460, lng: -80.2500, city: "Guelph" },
    { id: "g3", lat: 43.5440, lng: -80.2470, city: "Guelph" },
    // Toronto cluster
    { id: "t1", lat: 43.6532, lng: -79.3832, city: "Toronto" },
    { id: "t2", lat: 43.6540, lng: -79.3850, city: "Toronto" },
    { id: "t3", lat: 43.6520, lng: -79.3810, city: "Toronto" },
  ];
  const clusters = dbscan(points, 15, 3);
  assert.equal(clusters.length, 2);

  const guelph = clusters.find((c) => c.name === "Guelph");
  const toronto = clusters.find((c) => c.name === "Toronto");

  const gGeo = computeClusterGeometry(points, guelph);
  const tGeo = computeClusterGeometry(points, toronto);

  // Guelph center should be near Guelph
  assert.ok(gGeo.centerLat > 43.54 && gGeo.centerLat < 43.55);
  assert.ok(gGeo.centerLng > -80.26 && gGeo.centerLng < -80.24);

  // Toronto center should be near Toronto
  assert.ok(tGeo.centerLat > 43.65 && tGeo.centerLat < 43.66);
  assert.ok(tGeo.centerLng > -79.39 && tGeo.centerLng < -79.38);

  // Both should have 3 leads
  assert.equal(gGeo.leadCount, 3);
  assert.equal(tGeo.leadCount, 3);
});

// --- Noise point handling ---

test("autoGenerate: noise points are not assigned to any cluster", () => {
  const { dbscan } = loadDbscan();
  const points = [
    { id: "a", lat: 43.5448, lng: -80.2482, city: "Guelph" },
    { id: "b", lat: 43.5460, lng: -80.2500, city: "Guelph" },
    { id: "c", lat: 43.5440, lng: -80.2470, city: "Guelph" },
    { id: "outlier", lat: 45.0, lng: -75.0, city: "Ottawa" },
  ];
  const clusters = dbscan(points, 15, 3);

  // Outlier should not appear in any cluster's pointIds
  const allAssignedIds = clusters.flatMap((c) => c.pointIds);
  assert.ok(!allAssignedIds.includes("outlier"));
});

// --- Edge cases ---

test("autoGenerate: zero leads with coordinates produces no clusters", () => {
  const { dbscan } = loadDbscan();
  const clusters = dbscan([], 15, 3);
  assert.equal(clusters.length, 0);
});

test("autoGenerate: fewer than minPoints leads produces no clusters", () => {
  const { dbscan } = loadDbscan();
  const points = [
    { id: "a", lat: 43.5448, lng: -80.2482, city: "Guelph" },
    { id: "b", lat: 43.5460, lng: -80.2500, city: "Guelph" },
  ];
  const clusters = dbscan(points, 15, 3);
  assert.equal(clusters.length, 0);
});

test("autoGenerate: isAutoGenerated flag is set to true", () => {
  // This test verifies the action sets isAutoGenerated: true
  // by checking the createCluster args match the expected shape.
  // Since we can't run the actual Convex action in unit tests,
  // we verify the constant used in the action code.
  const source = fs.readFileSync("convex/clusters.ts", "utf8");
  assert.ok(
    source.includes("isAutoGenerated: true"),
    "autoGenerate should set isAutoGenerated: true on created clusters",
  );
});

test("autoGenerate: activity logging uses note_added type", () => {
  const source = fs.readFileSync("convex/clusters.ts", "utf8");
  // Verify the assignLeadsToCluster mutation logs with note_added type
  assert.ok(
    source.includes('type: "note_added"'),
    "Activity logging should use note_added type",
  );
  assert.ok(
    source.includes("Auto-assigned to cluster"),
    "Activity description should mention auto-assignment",
  );
});

// --- Convex hull tests ---

test("convexHull: returns all points when fewer than 3", () => {
  const { convexHull } = loadDbscan();
  const points = [
    { lat: 43.0, lng: -80.0 },
    { lat: 44.0, lng: -81.0 },
  ];
  const hull = convexHull(points);
  assert.equal(hull.length, 2);
});

test("convexHull: returns correct hull for triangle", () => {
  const { convexHull } = loadDbscan();
  const points = [
    { lat: 0, lng: 0 },
    { lat: 1, lng: 0 },
    { lat: 0, lng: 1 },
  ];
  const hull = convexHull(points);
  assert.equal(hull.length, 3, "triangle should have 3 hull vertices");
});

test("convexHull: excludes interior point", () => {
  const { convexHull } = loadDbscan();
  const points = [
    { lat: 0, lng: 0 },
    { lat: 4, lng: 0 },
    { lat: 4, lng: 4 },
    { lat: 0, lng: 4 },
    { lat: 2, lng: 2 }, // interior point
  ];
  const hull = convexHull(points);
  assert.equal(hull.length, 4, "square with interior point should have 4 hull vertices");
});

test("autoGenerate: boundary field is computed from convexHull", () => {
  const source = fs.readFileSync("convex/clusters.ts", "utf8");
  assert.ok(
    source.includes("convexHull"),
    "autoGenerate should use convexHull to compute boundary",
  );
  assert.ok(
    source.includes("boundary"),
    "autoGenerate should pass boundary to createCluster",
  );
});

test("createCluster mutation accepts boundary argument", () => {
  const source = fs.readFileSync("convex/clusters.ts", "utf8");
  assert.match(
    source,
    /boundary:\s*v\.array\(v\.object\(\{\s*lat:\s*v\.number\(\),\s*lng:\s*v\.number\(\)\s*\}\)\)/,
  );
});
