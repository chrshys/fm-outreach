import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

import ts from "typescript";

function loadParser() {
  const source = fs.readFileSync("convex/lib/csvParser.ts", "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: "csvParser.ts",
  }).outputText;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-csv-parser-"));
  const modulePath = path.join(tempDir, "csvParser.cjs");
  fs.writeFileSync(modulePath, transpiled, "utf8");

  const requireFromTest = createRequire(import.meta.url);

  try {
    return requireFromTest(modulePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

test("parseCsv parses header and simple rows", () => {
  const { parseCsv } = loadParser();

  const csv = "Name,Email\nFruit Farm,hello@example.com\n";

  assert.deepEqual(parseCsv(csv), [
    { Name: "Fruit Farm", Email: "hello@example.com" },
  ]);
});

test("parseCsv handles quoted fields containing commas", () => {
  const { parseCsv } = loadParser();

  const csv = [
    "Name,Address,Town",
    '"Top Market Meats","5887 Splint Rd, Guelph, ON, Ontario",Guelph',
  ].join("\n");

  assert.deepEqual(parseCsv(csv), [
    {
      Name: "Top Market Meats",
      Address: "5887 Splint Rd, Guelph, ON, Ontario",
      Town: "Guelph",
    },
  ]);
});

test("parseCsv handles escaped quotes and embedded newlines", () => {
  const { parseCsv } = loadParser();

  const csv = `Name,Notes
"Orchard ""North""","Open Fridays
and Saturdays"`;

  assert.deepEqual(parseCsv(csv), [
    {
      Name: 'Orchard "North"',
      Notes: "Open Fridays\nand Saturdays",
    },
  ]);
});

test("parseCsv skips blank data rows and supports CRLF", () => {
  const { parseCsv } = loadParser();

  const csv = "Name,City\r\nFarm One,Toronto\r\n\r\nFarm Two,Guelph\r\n";

  assert.deepEqual(parseCsv(csv), [
    { Name: "Farm One", City: "Toronto" },
    { Name: "Farm Two", City: "Guelph" },
  ]);
});
