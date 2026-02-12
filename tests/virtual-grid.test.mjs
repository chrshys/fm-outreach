import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

import ts from "typescript";

function loadVirtualGrid() {
  const source = fs.readFileSync("src/lib/virtual-grid.ts", "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: "virtual-grid.ts",
  }).outputText;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-virtual-grid-"));
  const modulePath = path.join(tempDir, "virtual-grid.cjs");
  fs.writeFileSync(modulePath, transpiled, "utf8");

  const requireFromTest = createRequire(import.meta.url);

  try {
    return requireFromTest(modulePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

const mod = loadVirtualGrid();

// --- Type export check (source-level) ---

const source = fs.readFileSync("src/lib/virtual-grid.ts", "utf8");

test("exports VirtualCell type", () => {
  assert.match(source, /export\s+type\s+VirtualCell\s*=/);
});

test("VirtualCell has key, swLat, swLng, neLat, neLng fields", () => {
  assert.match(source, /key:\s*string/);
  assert.match(source, /swLat:\s*number/);
  assert.match(source, /swLng:\s*number/);
  assert.match(source, /neLat:\s*number/);
  assert.match(source, /neLng:\s*number/);
});

// --- cellKey runtime tests ---

test("exports cellKey function", () => {
  assert.equal(typeof mod.cellKey, "function");
});

test("cellKey formats coordinates to 6 decimal places", () => {
  assert.equal(mod.cellKey(43.5, -80.25), "43.500000_-80.250000");
});

test("cellKey preserves negative coordinates", () => {
  const key = mod.cellKey(-33.8688, 151.2093);
  assert.equal(key, "-33.868800_151.209300");
});

test("cellKey pads short decimals with trailing zeros", () => {
  assert.equal(mod.cellKey(0, 0), "0.000000_0.000000");
});

test("cellKey truncates to 6 decimal places", () => {
  const key = mod.cellKey(43.12345678, -80.98765432);
  assert.equal(key, "43.123457_-80.987654");
});

test("cellKey is deterministic — same input produces same output", () => {
  const a = mod.cellKey(43.55, -80.25);
  const b = mod.cellKey(43.55, -80.25);
  assert.equal(a, b);
});

test("cellKey produces different keys for different coordinates", () => {
  const a = mod.cellKey(43.55, -80.25);
  const b = mod.cellKey(43.56, -80.25);
  assert.notEqual(a, b);
});
