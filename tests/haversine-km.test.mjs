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

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-haversine-"));
  const modulePath = path.join(tempDir, "pointInPolygon.cjs");
  fs.writeFileSync(modulePath, transpiled, "utf8");

  const requireFromTest = createRequire(import.meta.url);

  try {
    return requireFromTest(modulePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

test("haversineKm is exported", () => {
  const mod = loadModule();
  assert.equal(typeof mod.haversineKm, "function");
});

test("haversineKm returns 0 for identical points", () => {
  const { haversineKm } = loadModule();
  assert.equal(haversineKm(43.5, -80.5, 43.5, -80.5), 0);
});

test("haversineKm computes known distance (New York to London ~5570 km)", () => {
  const { haversineKm } = loadModule();
  // JFK approx (40.6413, -73.7781), Heathrow approx (51.4700, -0.4543)
  const dist = haversineKm(40.6413, -73.7781, 51.47, -0.4543);
  // Accepted range: 5530–5560 km
  assert.ok(dist > 5530, `Expected > 5530 km, got ${dist}`);
  assert.ok(dist < 5560, `Expected < 5560 km, got ${dist}`);
});

test("haversineKm is symmetric", () => {
  const { haversineKm } = loadModule();
  const d1 = haversineKm(43.5448, -80.2482, 43.6532, -79.3832);
  const d2 = haversineKm(43.6532, -79.3832, 43.5448, -80.2482);
  assert.equal(d1, d2);
});

test("haversineKm returns positive distance", () => {
  const { haversineKm } = loadModule();
  const dist = haversineKm(0, 0, 1, 1);
  assert.ok(dist > 0, `Expected positive distance, got ${dist}`);
});
