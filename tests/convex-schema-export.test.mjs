import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

import ts from "typescript";

test("convex schema exports to JSON with all required tables", () => {
  const schemaSource = fs.readFileSync("convex/schema.ts", "utf8");
  const transpiled = ts.transpileModule(schemaSource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: "schema.ts",
  }).outputText;

  const tempDir = fs.mkdtempSync(
    path.join(process.cwd(), ".tmp-convex-schema-"),
  );
  const schemaModulePath = path.join(tempDir, "schema.cjs");
  fs.writeFileSync(schemaModulePath, transpiled, "utf8");

  try {
    const requireFromTest = createRequire(import.meta.url);
    const compiledSchemaModule = requireFromTest(schemaModulePath);
    const schemaDefinition = compiledSchemaModule.default;

    assert.equal(typeof schemaDefinition.export, "function");

    const exportedSchema = JSON.parse(schemaDefinition.export());
    const tableNames = exportedSchema.tables.map((table) => table.tableName);

    assert.deepEqual(tableNames.sort(), [
      "activities",
      "campaigns",
      "clusters",
      "emailTemplates",
      "emails",
      "leads",
    ]);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
