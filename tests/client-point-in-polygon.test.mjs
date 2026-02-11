import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

import ts from "typescript";

function loadModule() {
  const source = fs.readFileSync("src/lib/point-in-polygon.ts", "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: "point-in-polygon.ts",
  }).outputText;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-cpip-"));
  const modulePath = path.join(tempDir, "point-in-polygon.cjs");
  fs.writeFileSync(modulePath, transpiled, "utf8");

  const requireFromTest = createRequire(import.meta.url);

  try {
    return requireFromTest(modulePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

const square = [
  { lat: 0, lng: 0 },
  { lat: 0, lng: 10 },
  { lat: 10, lng: 10 },
  { lat: 10, lng: 0 },
];

test("client pointInPolygon returns true for point inside square", () => {
  const { pointInPolygon } = loadModule();
  assert.equal(pointInPolygon({ lat: 5, lng: 5 }, square), true);
});

test("client pointInPolygon returns false for point outside square", () => {
  const { pointInPolygon } = loadModule();
  assert.equal(pointInPolygon({ lat: 15, lng: 5 }, square), false);
});

test("client pointInPolygon returns false for point far outside", () => {
  const { pointInPolygon } = loadModule();
  assert.equal(pointInPolygon({ lat: -5, lng: -5 }, square), false);
});

test("client pointInPolygon works with triangle", () => {
  const { pointInPolygon } = loadModule();
  const triangle = [
    { lat: 0, lng: 0 },
    { lat: 10, lng: 5 },
    { lat: 0, lng: 10 },
  ];
  assert.equal(pointInPolygon({ lat: 3, lng: 5 }, triangle), true);
  assert.equal(pointInPolygon({ lat: 9, lng: 1 }, triangle), false);
});

test("client pointInPolygon works with concave polygon", () => {
  const { pointInPolygon } = loadModule();
  const lShape = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 5 },
    { lat: 5, lng: 5 },
    { lat: 5, lng: 10 },
    { lat: 10, lng: 10 },
    { lat: 10, lng: 0 },
  ];
  assert.equal(pointInPolygon({ lat: 8, lng: 5 }, lShape), true);
  assert.equal(pointInPolygon({ lat: 2, lng: 7 }, lShape), false);
});

test("client pointInPolygon handles real-world coordinates", () => {
  const { pointInPolygon } = loadModule();
  const guelphArea = [
    { lat: 43.50, lng: -80.30 },
    { lat: 43.50, lng: -80.20 },
    { lat: 43.58, lng: -80.20 },
    { lat: 43.58, lng: -80.30 },
  ];
  assert.equal(pointInPolygon({ lat: 43.55, lng: -80.25 }, guelphArea), true);
  assert.equal(pointInPolygon({ lat: 43.65, lng: -79.38 }, guelphArea), false);
});

test("client pointInPolygon returns false for empty polygon", () => {
  const { pointInPolygon } = loadModule();
  assert.equal(pointInPolygon({ lat: 5, lng: 5 }, []), false);
});

test("client pointInPolygon matches server-side implementation", () => {
  const client = loadModule();

  // Load server-side module
  const serverSource = fs.readFileSync("convex/lib/pointInPolygon.ts", "utf8");
  const serverTranspiled = ts.transpileModule(serverSource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: "pointInPolygon.ts",
  }).outputText;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-spip-"));
  const modulePath = path.join(tempDir, "pointInPolygon.cjs");
  fs.writeFileSync(modulePath, serverTranspiled, "utf8");
  const requireFromTest = createRequire(import.meta.url);
  let server;
  try {
    server = requireFromTest(modulePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  // Test that both implementations agree on a variety of inputs
  const testPoints = [
    { lat: 5, lng: 5 },
    { lat: 0, lng: 0 },
    { lat: 15, lng: 15 },
    { lat: -1, lng: -1 },
    { lat: 10, lng: 5 },
    { lat: 43.55, lng: -80.25 },
  ];

  for (const point of testPoints) {
    assert.equal(
      client.pointInPolygon(point, square),
      server.pointInPolygon(point, square),
      `Mismatch at (${point.lat}, ${point.lng})`,
    );
  }
});
