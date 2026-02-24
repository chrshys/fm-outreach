import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const schemaSource = fs.readFileSync("convex/schema.ts", "utf8");
const csvExportSource = fs.readFileSync("src/lib/csv-export.ts", "utf8");

// Extract CSV_COLUMNS from csv-export.ts
const columnsMatch = csvExportSource.match(
  /const CSV_COLUMNS\s*=\s*\[([\s\S]*?)\]\s*as const/,
);
const csvColumns = columnsMatch[1]
  .match(/"([^"]+)"/g)
  .map((s) => s.replace(/"/g, ""));

// Extract documented columns from the schema comment table
const commentBlock = schemaSource.match(
  /\/\/ CSV Export Column Mapping[\s\S]*?(?=\n {2}leads: defineTable)/,
);
const documentedColumns = [
  ...commentBlock[0].matchAll(
    /\/\/\s{2}(\w+)\s+│/g,
  ),
]
  .map((m) => m[1])
  .filter((col) => col !== "CSV");

test("schema comment documents all CSV_COLUMNS from csv-export.ts", () => {
  for (const col of csvColumns) {
    assert.ok(
      documentedColumns.includes(col),
      `CSV column "${col}" is not documented in schema comment`,
    );
  }
});

test("schema comment does not document columns absent from CSV_COLUMNS", () => {
  for (const col of documentedColumns) {
    assert.ok(
      csvColumns.includes(col),
      `Documented column "${col}" is not in CSV_COLUMNS`,
    );
  }
});

test("CSV_COLUMNS and documented columns are in the same order", () => {
  assert.deepStrictEqual(documentedColumns, csvColumns);
});

test("schema comment includes type mapping for FM profileType", () => {
  assert.match(schemaSource, /farm → farm/);
  assert.match(schemaSource, /farmers_market → farmersMarket/);
  assert.match(schemaSource, /retail_store → countryStore/);
  assert.match(schemaSource, /roadside_stand → roadsideStand/);
});

test("csv-export maps province/region to state column", () => {
  // The "state" column in CSV is mapped from province ?? region
  assert.ok(csvColumns.includes("state"), 'CSV_COLUMNS should include "state"');
  assert.match(
    csvExportSource,
    /lead\.province \?\? lead\.region/,
    "csv-export should map province ?? region to the state column",
  );
});

test("schema comment documents categories from enrichmentData.structuredProducts", () => {
  assert.match(
    schemaSource,
    /categories\s+│\s+enrichmentData\.structuredProducts/,
    "categories row should reference enrichmentData.structuredProducts",
  );
});

test("schema comment documents hours from hours (JSON)", () => {
  assert.match(
    schemaSource,
    /hours\s+│\s+hours \(JSON\)/,
    "hours row should reference hours (JSON)",
  );
});

test("schema comment does not reference removed farmDescription or contactPhone", () => {
  const commentBlock = schemaSource.match(
    /\/\/ CSV Export Column Mapping[\s\S]*?(?=\n {2}leads: defineTable)/,
  )[0];
  assert.ok(
    !commentBlock.includes("farmDescription"),
    "comment should not reference farmDescription",
  );
  assert.ok(
    !commentBlock.includes("contactPhone"),
    "comment should not reference contactPhone",
  );
});
