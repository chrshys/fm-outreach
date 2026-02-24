import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

import ts from "typescript";

function loadModule() {
  const source = fs.readFileSync("src/lib/csv-export.ts", "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: "csv-export.ts",
  }).outputText;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-csv-export-"));
  const modulePath = path.join(tempDir, "csv-export.cjs");
  fs.writeFileSync(modulePath, transpiled, "utf8");

  const requireFromTest = createRequire(import.meta.url);

  try {
    return requireFromTest(modulePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

test("leadsToCSV produces correct header row", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([]);
  const header = csv.split("\n")[0];
  assert.equal(
    header,
    "name,type,description,address,city,state,postalCode,countryCode,latitude,longitude,placeId,website,instagram,facebook,products,imagePrompt,categories,hours"
  );
});

test("leadsToCSV outputs correct values for a complete lead", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    {
      name: "Green Acres",
      type: "farm",
      locationDescription: "Organic produce",
      imagePrompt: "A farm stand with fresh produce",
      categories: ["produce"],
      address: "123 Farm Rd",
      city: "Guelph",
      province: "ON",
      postalCode: "N1G 2W1",
      countryCode: "CA",
      latitude: 43.55,
      longitude: -80.25,
      placeId: "ChIJ123",
      website: "https://greenacres.com",
      socialLinks: {
        instagram: "greenacres_ig",
        facebook: "greenacres_fb",
      },
      products: ["apples", "pears"],
      hours: [{ day: 1, open: "09:00", close: "17:00", isClosed: false }],
    },
  ]);
  const lines = csv.split("\n");
  assert.equal(lines.length, 2);
  assert.equal(
    lines[1],
    'Green Acres,farm,Organic produce,123 Farm Rd,Guelph,ON,N1G 2W1,CA,43.55,-80.25,ChIJ123,https://greenacres.com,greenacres_ig,greenacres_fb,"apples, pears",A farm stand with fresh produce,produce,"[{""day"":1,""open"":""09:00"",""close"":""17:00"",""isClosed"":false}]"'
  );
});

test("leadsToCSV uses empty strings for undefined (missing) fields", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    {
      name: "Bare Farm",
      type: "farm",
    },
  ]);
  const lines = csv.split("\n");
  assert.equal(lines[1], "Bare Farm,farm,,,,,,,,,,,,,,,,");
});

test("leadsToCSV uses empty strings for explicit null fields", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    {
      name: "Null Farm",
      type: "farm",
      locationDescription: null,
      imagePrompt: null,
      categories: null,
      address: null,
      city: null,
      region: null,
      province: null,
      postalCode: null,
      countryCode: null,
      latitude: null,
      longitude: null,
      placeId: null,
      website: null,
      socialLinks: null,
      products: null,
    },
  ]);
  const lines = csv.split("\n");
  assert.equal(lines[1], "Null Farm,farm,,,,,,,,,,,,,,,,");
});

test("leadsToCSV never outputs literal 'undefined' or 'null' strings", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    { name: "Minimal", type: "farm" },
    {
      name: "Nulls",
      type: "farm",
      locationDescription: null,
      imagePrompt: null,
      categories: null,
      latitude: null,
      socialLinks: null,
      products: null,
    },
    {
      name: "Partial Social",
      type: "farm",
      socialLinks: { instagram: null, facebook: null },
    },
  ]);
  // Skip the header row, check only data rows
  const dataRows = csv.split("\n").slice(1).join("\n");
  assert.ok(!dataRows.includes("undefined"), "CSV should not contain literal 'undefined'");
  assert.ok(!dataRows.includes("null"), "CSV should not contain literal 'null'");
});

test("leadsToCSV escapes fields containing commas", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    {
      name: "Farm, Inc.",
      type: "farm",
      address: "123 Main St, Suite 4",
    },
  ]);
  const lines = csv.split("\n");
  assert.ok(lines[1].startsWith('"Farm, Inc.",farm,'));
  assert.ok(lines[1].includes('"123 Main St, Suite 4"'));
});

test("leadsToCSV escapes fields containing double quotes", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    {
      name: 'The "Best" Farm',
      type: "farm",
    },
  ]);
  const lines = csv.split("\n");
  assert.ok(lines[1].startsWith('"The ""Best"" Farm",farm'));
});

test("leadsToCSV escapes fields containing newlines", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    {
      name: "Normal Farm",
      type: "farm",
      locationDescription: "Line one\nLine two",
    },
  ]);
  const dataRows = csv.split("\n").slice(1).join("\n");
  assert.ok(dataRows.includes('"Line one\nLine two"'));
});

test("leadsToCSV flattens socialLinks to top-level columns", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    {
      name: "Social Farm",
      type: "farm",
      socialLinks: { instagram: "ig_handle", facebook: "fb_page" },
    },
  ]);
  const lines = csv.split("\n");
  // instagram and facebook should be individual columns, not nested
  assert.ok(lines[1].includes("ig_handle"));
  assert.ok(lines[1].includes("fb_page"));
  // socialLinks should not appear as "[object Object]"
  assert.ok(!lines[1].includes("[object Object]"));
});

test("leadsToCSV joins products array with comma-space separator", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    {
      name: "Produce Farm",
      type: "farm",
      products: ["tomatoes", "cucumbers", "lettuce"],
    },
  ]);
  const lines = csv.split("\n");
  assert.ok(lines[1].includes('"tomatoes, cucumbers, lettuce"'));
});

test("leadsToCSV outputs single product unquoted", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    { name: "One Product", type: "farm", products: ["honey"] },
  ]);
  const lines = csv.split("\n");
  const cols = lines[1].split(",");
  // Single product has no comma, so should not be quoted
  assert.equal(cols[14], "honey", "single product should not be quoted");
});

test("leadsToCSV outputs empty string for empty products array", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    { name: "No Products", type: "farm", products: [] },
  ]);
  const lines = csv.split("\n");
  const cols = lines[1].split(",");
  assert.equal(cols[14], "", "empty products array should produce empty string");
});

test("leadsToCSV handles socialLinks with only instagram", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    {
      name: "IG Only",
      type: "farm",
      socialLinks: { instagram: "ig_only" },
    },
  ]);
  const lines = csv.split("\n");
  assert.ok(lines[1].includes("ig_only"), "should include instagram value");
  // facebook column should be empty but row should still have 13 columns
  const cols = lines[1].split(",");
  assert.equal(cols.length, 18, "should still have 18 columns");
  assert.equal(cols[12], "ig_only", "instagram column should have value");
  assert.equal(cols[13], "", "facebook column should be empty");
});

test("leadsToCSV handles socialLinks with only facebook", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    {
      name: "FB Only",
      type: "farm",
      socialLinks: { facebook: "fb_only" },
    },
  ]);
  const lines = csv.split("\n");
  const cols = lines[1].split(",");
  assert.equal(cols[12], "", "instagram column should be empty");
  assert.equal(cols[13], "fb_only", "facebook column should have value");
});

test("leadsToCSV handles product names containing commas", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    {
      name: "Fancy Farm",
      type: "farm",
      products: ["jams, jellies", "honey"],
    },
  ]);
  const lines = csv.split("\n");
  // The joined string is "jams, jellies, honey" which contains commas, so the whole field gets quoted
  const dataRow = lines[1];
  assert.ok(
    dataRow.includes('"jams, jellies, honey"'),
    "products with internal commas should be properly quoted"
  );
});

test("leadsToCSV outputs description in correct column", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    { name: "Desc Farm", type: "farm", locationDescription: "Rural area near river" },
  ]);
  const cols = csv.split("\n")[1].split(",");
  assert.equal(cols[2], "Rural area near river", "description should be column 2");
});

test("leadsToCSV outputs imagePrompt in correct column", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    { name: "Img Farm", type: "farm", imagePrompt: "Aerial view of barn" },
  ]);
  const cols = csv.split("\n")[1].split(",");
  assert.equal(cols[15], "Aerial view of barn", "imagePrompt should be column 15");
});

test("leadsToCSV joins categories array with comma-space separator", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    { name: "Cat Farm", type: "farm", categories: ["organic", "dairy", "eggs"] },
  ]);
  const lines = csv.split("\n");
  assert.ok(lines[1].includes('"organic, dairy, eggs"'), "categories should be joined and quoted");
});

test("leadsToCSV outputs single category unquoted", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    { name: "One Cat", type: "farm", categories: ["produce"] },
  ]);
  const cols = csv.split("\n")[1].split(",");
  assert.equal(cols[16], "produce", "single category should not be quoted");
});

test("leadsToCSV outputs empty string for empty categories array", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    { name: "No Cats", type: "farm", categories: [] },
  ]);
  const cols = csv.split("\n")[1].split(",");
  assert.equal(cols[16], "", "empty categories array should produce empty string");
});

test("downloadCSV function is exported", () => {
  const mod = loadModule();
  assert.equal(typeof mod.downloadCSV, "function");
});

test("csv-export source uses RFC 4180 quoting for commas, quotes, and newlines", () => {
  const source = fs.readFileSync("src/lib/csv-export.ts", "utf8");
  // Checks that escapeField handles all three RFC 4180 special characters
  assert.ok(source.includes('","'), "should check for comma");
  assert.ok(source.includes('"'), "should check for double quote");
  assert.ok(source.includes('"\\n"') || source.includes("\\n"), "should check for newline");
  // Checks that double quotes are escaped by doubling
  assert.ok(source.includes('""'), "should escape quotes by doubling");
});

test("leads page imports csv-export utilities", () => {
  const source = fs.readFileSync("src/app/leads/page.tsx", "utf8");
  assert.ok(
    source.includes('from "@/lib/csv-export"'),
    "should import from csv-export module"
  );
  assert.ok(source.includes("leadsToCSV"), "should import leadsToCSV");
  assert.ok(source.includes("downloadCSV"), "should import downloadCSV");
});

test("leads page has Export CSV button", () => {
  const source = fs.readFileSync("src/app/leads/page.tsx", "utf8");
  assert.ok(source.includes("Export CSV"), "should have Export CSV button text");
  assert.ok(source.includes("isExporting"), "should track exporting state");
  assert.ok(source.includes("handleExportCSV"), "should have export handler");
  assert.ok(
    source.includes("listForExport"),
    "should call listForExport query"
  );
});

test("handleExportCSV is an async function", () => {
  const source = fs.readFileSync("src/app/leads/page.tsx", "utf8");
  assert.ok(
    /async\s+function\s+handleExportCSV/.test(source),
    "handleExportCSV should be declared as async"
  );
});

test("handleExportCSV shows success toast with lead count", () => {
  const source = fs.readFileSync("src/app/leads/page.tsx", "utf8");
  assert.ok(
    source.includes("toast.success(`Exported ${results.length} leads`)"),
    "should show success toast with lead count"
  );
});

test("handleExportCSV shows error toast on failure", () => {
  const source = fs.readFileSync("src/app/leads/page.tsx", "utf8");
  assert.ok(
    source.includes('toast.error("Export failed")'),
    "should show error toast on failure"
  );
});

test("handleExportCSV uses correct filename format", () => {
  const source = fs.readFileSync("src/app/leads/page.tsx", "utf8");
  assert.ok(
    source.includes("fm-leads-export-${new Date().toISOString().slice(0, 10)}.csv"),
    "should use fm-leads-export-YYYY-MM-DD.csv filename"
  );
});

test("handleExportCSV excludes sortBy, sortOrder, and cursor from export query", () => {
  const source = fs.readFileSync("src/app/leads/page.tsx", "utf8");
  // Extract the handleExportCSV function body
  const fnStart = source.indexOf("async function handleExportCSV");
  assert.ok(fnStart !== -1, "should find handleExportCSV function");
  // Find the listForExport call within the function
  const exportCallStart = source.indexOf("listForExport", fnStart);
  assert.ok(exportCallStart !== -1, "should find listForExport call");
  // Get a chunk around the call to check args
  const exportCallChunk = source.slice(exportCallStart, exportCallStart + 300);
  assert.ok(!exportCallChunk.includes("sortBy"), "should not pass sortBy to listForExport");
  assert.ok(!exportCallChunk.includes("sortOrder"), "should not pass sortOrder to listForExport");
  assert.ok(!exportCallChunk.includes("cursor"), "should not pass cursor to listForExport");
});

test("Export CSV button appears between LeadFilters and Table in JSX", () => {
  const source = fs.readFileSync("src/app/leads/page.tsx", "utf8");
  const filtersPos = source.indexOf("<LeadFilters");
  const exportPos = source.indexOf("Export CSV");
  const tablePos = source.indexOf("<Table>");
  assert.ok(filtersPos !== -1, "should have LeadFilters component");
  assert.ok(exportPos !== -1, "should have Export CSV button");
  assert.ok(tablePos !== -1, "should have Table component");
  assert.ok(
    filtersPos < exportPos && exportPos < tablePos,
    "Export CSV button should appear after LeadFilters and before Table"
  );
});

test("CSV header has exactly 18 columns", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([]);
  const header = csv.split("\n")[0];
  const columns = header.split(",");
  assert.equal(columns.length, 18, "should have exactly 18 columns");
});

test("CSV data rows have exactly 18 columns for a complete lead", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    {
      name: "Test Farm",
      type: "farm",
      locationDescription: "Desc",
      imagePrompt: "A farm photo",
      categories: ["dairy"],
      address: "1 Main St",
      city: "Toronto",
      province: "ON",
      postalCode: "M5V 2T6",
      countryCode: "CA",
      latitude: 43.65,
      longitude: -79.38,
      placeId: "ChIJ456",
      website: "https://test.com",
      socialLinks: { instagram: "ig", facebook: "fb" },
      products: ["eggs"],
    },
  ]);
  const lines = csv.split("\n");
  const dataColumns = lines[1].split(",");
  assert.equal(dataColumns.length, 18, "data row should have exactly 18 columns");
});

test("CSV data rows have exactly 18 columns for a minimal lead", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([{ name: "Minimal", type: "farm" }]);
  const lines = csv.split("\n");
  const dataColumns = lines[1].split(",");
  assert.equal(dataColumns.length, 18, "minimal lead should still have 18 columns");
});

test("downloadCSV creates a text/csv blob", () => {
  const source = fs.readFileSync("src/lib/csv-export.ts", "utf8");
  assert.ok(
    source.includes('text/csv'),
    "downloadCSV should create blob with text/csv MIME type"
  );
});

test("leadsToCSV maps province to state column", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    {
      name: "Ontario Farm",
      type: "farm",
      province: "ON",
    },
  ]);
  const lines = csv.split("\n");
  const cols = lines[1].split(",");
  assert.equal(cols[5], "ON", "state column should contain province value");
});

test("leadsToCSV falls back to region when province is missing", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    {
      name: "Region Farm",
      type: "farm",
      region: "Southern Ontario",
    },
  ]);
  const lines = csv.split("\n");
  const cols = lines[1].split(",");
  assert.equal(cols[5], "Southern Ontario", "state column should fall back to region value");
});

test("leadsToCSV prefers province over region for state column", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    {
      name: "Both Farm",
      type: "farm",
      province: "ON",
      region: "Southern Ontario",
    },
  ]);
  const lines = csv.split("\n");
  const cols = lines[1].split(",");
  assert.equal(cols[5], "ON", "state column should prefer province over region");
});

test("leadsToCSV includes postalCode and countryCode columns", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([
    {
      name: "Postal Farm",
      type: "farm",
      postalCode: "N1G 2W1",
      countryCode: "CA",
    },
  ]);
  const lines = csv.split("\n");
  const cols = lines[1].split(",");
  assert.equal(cols[6], "N1G 2W1", "postalCode column should have correct value");
  assert.equal(cols[7], "CA", "countryCode column should have correct value");
});

test("handleExportCSV sets isExporting in try/finally", () => {
  const source = fs.readFileSync("src/app/leads/page.tsx", "utf8");
  const fnStart = source.indexOf("async function handleExportCSV");
  const fnChunk = source.slice(fnStart, fnStart + 1200);
  assert.ok(
    fnChunk.includes("setIsExporting(true)"),
    "should set isExporting true at start"
  );
  assert.ok(
    fnChunk.includes("setIsExporting(false)"),
    "should set isExporting false in finally"
  );
  assert.ok(
    fnChunk.includes("finally"),
    "should use try/finally pattern"
  );
});

test("schema.ts CSV column mapping comment lists all CSV_COLUMNS in order", () => {
  const schema = fs.readFileSync("convex/schema.ts", "utf8");
  const csvSource = fs.readFileSync("src/lib/csv-export.ts", "utf8");

  // Extract CSV_COLUMNS from csv-export.ts
  const columnsMatch = csvSource.match(/CSV_COLUMNS\s*=\s*\[([\s\S]*?)\]\s*as\s*const/);
  assert.ok(columnsMatch, "should find CSV_COLUMNS array in csv-export.ts");
  const actualColumns = columnsMatch[1]
    .match(/"([^"]+)"/g)
    .map((s) => s.replace(/"/g, ""));

  // Extract column names from the comment table in schema.ts
  // Lines like: //  name            │ name                         │ displayName
  const commentColumns = [];
  const tableLineRegex = /\/\/\s+(\w+)\s+│/g;
  let match;
  while ((match = tableLineRegex.exec(schema)) !== null) {
    const col = match[1];
    // Skip the header row
    if (col === "CSV") continue;
    commentColumns.push(col);
  }

  assert.deepEqual(
    commentColumns,
    actualColumns,
    "schema.ts comment columns should match CSV_COLUMNS in csv-export.ts"
  );
});

test("schema.ts CSV column mapping comment documents correct field mappings", () => {
  const schema = fs.readFileSync("convex/schema.ts", "utf8");

  // Key mappings that must be documented in the comment
  const requiredMappings = [
    ["description", "locationDescription"],
    ["state", "province"],
    ["instagram", "socialLinks"],
    ["facebook", "socialLinks"],
    ["products", "joined"],
    ["categories", "structuredProducts"],
    ["hours", "hours"],
    ["imagePrompt", "imagePrompt"],
  ];

  for (const [csvCol, schemaRef] of requiredMappings) {
    // Find the comment line for this CSV column
    const lineRegex = new RegExp(`//\\s+${csvCol}\\s+│([^│]+)│`);
    const match = schema.match(lineRegex);
    assert.ok(match, `comment should document the '${csvCol}' column`);
    assert.ok(
      match[1].includes(schemaRef),
      `'${csvCol}' mapping should reference '${schemaRef}', got: ${match[1].trim()}`
    );
  }
});

test("leadsToCSV serializes hours as JSON string", () => {
  const { leadsToCSV } = loadModule();
  const hours = [
    { day: 1, open: "09:00", close: "17:00", isClosed: false },
  ];
  const csv = leadsToCSV([
    { name: "Hours Farm", type: "farm", hours },
  ]);
  const lines = csv.split("\n");
  const dataRow = lines[1];
  // JSON contains commas and quotes, so CSV escaping doubles quotes and wraps in quotes
  const escaped = JSON.stringify(hours).replace(/"/g, '""');
  assert.ok(dataRow.includes(escaped), "hours should be serialized as escaped JSON");
});

test("leadsToCSV outputs empty string when hours is undefined", () => {
  const { leadsToCSV } = loadModule();
  const csv = leadsToCSV([{ name: "No Hours", type: "farm" }]);
  const cols = csv.split("\n")[1].split(",");
  assert.equal(cols[17], "", "hours column should be empty when undefined");
});
