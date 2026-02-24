import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

import ts from "typescript";

function loadModule() {
  let source = fs.readFileSync("convex/enrichment/googlePlaces.ts", "utf8");
  // Strip Convex-specific imports that can't resolve outside the Convex runtime
  source = source.replace(/^import\s.*from\s+["']convex\/.*["'];?\s*$/gm, "");
  source = source.replace(/^import\s.*from\s+["']\.\.\/.*["'];?\s*$/gm, "");
  // Stub Convex runtime identifiers so module-level action() calls don't throw
  source = "const action = () => () => {};\nconst v = new Proxy({}, { get: () => () => ({}) });\n" + source;
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: "googlePlaces.ts",
  }).outputText;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-parse-hours-"));
  const modulePath = path.join(tempDir, "googlePlaces.cjs");
  fs.writeFileSync(modulePath, transpiled, "utf8");

  const requireFromTest = createRequire(import.meta.url);

  try {
    return requireFromTest(modulePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

test("standard hours: Monday 9 AM – 5 PM", () => {
  const { parseWeekdayText } = loadModule();
  const result = parseWeekdayText(["Monday: 9:00 AM – 5:00 PM"]);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0], { day: 1, open: "09:00", close: "17:00", isClosed: false });
});

test("closed day: Sunday Closed", () => {
  const { parseWeekdayText } = loadModule();
  const result = parseWeekdayText(["Sunday: Closed"]);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0], { day: 0, open: "", close: "", isClosed: true });
});

test("PM conversion: Saturday 10 AM – 8 PM", () => {
  const { parseWeekdayText } = loadModule();
  const result = parseWeekdayText(["Saturday: 10:00 AM – 8:00 PM"]);
  assert.equal(result.length, 1);
  assert.equal(result[0].close, "20:00");
});

test("noon edge case: 12:00 PM produces open 12:00", () => {
  const { parseWeekdayText } = loadModule();
  const result = parseWeekdayText(["Monday: 12:00 PM – 5:00 PM"]);
  assert.equal(result.length, 1);
  assert.equal(result[0].open, "12:00");
});

test("midnight edge case: 12:00 AM produces open 00:00", () => {
  const { parseWeekdayText } = loadModule();
  const result = parseWeekdayText(["Monday: 12:00 AM – 5:00 AM"]);
  assert.equal(result.length, 1);
  assert.equal(result[0].open, "00:00");
});

test("empty array returns empty array", () => {
  const { parseWeekdayText } = loadModule();
  const result = parseWeekdayText([]);
  assert.deepEqual(result, []);
});

test("malformed string is silently skipped", () => {
  const { parseWeekdayText } = loadModule();
  const result = parseWeekdayText(["garbage"]);
  assert.deepEqual(result, []);
});
