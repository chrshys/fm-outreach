import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const claudeSource = fs.readFileSync(
  "convex/enrichment/claudeAnalysis.ts",
  "utf8",
);

const orchestratorSource = fs.readFileSync(
  "convex/enrichment/orchestrator.ts",
  "utf8",
);

const leadDetailSource = fs.readFileSync(
  "src/app/leads/[id]/page.tsx",
  "utf8",
);

// =============================================================
// Claude analysis produces a structured farm description
// and product list
// =============================================================

// --- Structured types are exported ---

test("exports StructuredProduct type with name and category fields", () => {
  assert.match(claudeSource, /export\s+type\s+StructuredProduct\s*=/);
  assert.match(claudeSource, /name:\s*string/);
  assert.match(claudeSource, /category:\s*string/);
});

test("exports StructuredFarmDescription type with summary, specialties, certifications", () => {
  assert.match(claudeSource, /export\s+type\s+StructuredFarmDescription\s*=/);
  assert.match(claudeSource, /summary:\s*string/);
  assert.match(claudeSource, /specialties:\s*string\[\]/);
  assert.match(claudeSource, /certifications:\s*string\[\]/);
});

test("ClaudeAnalysisResult includes structuredProducts field", () => {
  assert.match(claudeSource, /structuredProducts:\s*StructuredProduct\[\]/);
});

test("ClaudeAnalysisResult includes structuredDescription field", () => {
  assert.match(
    claudeSource,
    /structuredDescription:\s*StructuredFarmDescription/,
  );
});

// --- Prompt requests structured output ---

test("extraction prompt requests structuredProducts with name and category", () => {
  assert.ok(claudeSource.includes('"structuredProducts"'));
  assert.ok(claudeSource.includes('"name"'));
  assert.ok(claudeSource.includes('"category"'));
});

test("extraction prompt lists valid product categories", () => {
  assert.ok(claudeSource.includes("produce"));
  assert.ok(claudeSource.includes("dairy"));
  assert.ok(claudeSource.includes("meat"));
  assert.ok(claudeSource.includes("honey"));
  assert.ok(claudeSource.includes("baked goods"));
  assert.ok(claudeSource.includes("preserves"));
  assert.ok(claudeSource.includes("value-added"));
});

test("extraction prompt requests structuredDescription with summary, specialties, certifications", () => {
  assert.ok(claudeSource.includes('"structuredDescription"'));
  assert.ok(claudeSource.includes('"summary"'));
  assert.ok(claudeSource.includes('"specialties"'));
  assert.ok(claudeSource.includes('"certifications"'));
});

// --- Parsing handles structured fields safely ---

test("parseStructuredProducts filters out invalid items", () => {
  assert.match(claudeSource, /function\s+parseStructuredProducts\(/);
  assert.match(claudeSource, /typeof\s+item\.name\s*===\s*"string"/);
  assert.match(claudeSource, /typeof\s+item\.category\s*===\s*"string"/);
  // Filters items with empty names
  assert.match(claudeSource, /item\.name\.length\s*>\s*0/);
});

test("parseStructuredProducts defaults category to 'other' for missing categories", () => {
  assert.match(claudeSource, /category:.*"other"/);
});

test("parseStructuredDescription falls back to businessDescription for summary", () => {
  assert.match(claudeSource, /function\s+parseStructuredDescription\(/);
  assert.match(claudeSource, /fallbackSummary/);
});

test("parseStructuredDescription safely coerces specialties and certifications arrays", () => {
  assert.match(claudeSource, /Array\.isArray\(obj\.specialties\)/);
  assert.match(claudeSource, /Array\.isArray\(obj\.certifications\)/);
});

test("parseStructuredDescription returns empty arrays for non-object input", () => {
  // When raw is not an object, returns fallback with empty arrays
  assert.match(
    claudeSource,
    /typeof\s+raw\s*!==\s*"object"\s*\|\|\s*raw\s*===\s*null/,
  );
  assert.match(claudeSource, /specialties:\s*\[\]/);
  assert.match(claudeSource, /certifications:\s*\[\]/);
});

// --- Backward compatibility: flat fields still populated ---

test("ClaudeAnalysisResult still has flat products array for backward compatibility", () => {
  assert.match(claudeSource, /products:\s*string\[\]/);
});

test("ClaudeAnalysisResult still has flat businessDescription for backward compatibility", () => {
  assert.match(claudeSource, /businessDescription:\s*string/);
});

// --- Orchestrator stores structured data in enrichmentData ---

test("orchestrator stores structuredProducts in enrichmentData", () => {
  assert.ok(orchestratorSource.includes("structuredProducts"));
  assert.match(
    orchestratorSource,
    /fieldsUpdated\.push\("enrichmentData\.structuredProducts"\)/,
  );
});

test("orchestrator stores structuredDescription in enrichmentData", () => {
  assert.ok(orchestratorSource.includes("structuredDescription"));
  assert.match(
    orchestratorSource,
    /fieldsUpdated\.push\("enrichmentData\.structuredDescription"\)/,
  );
});

test("orchestrator checks for non-empty structuredProducts before storing", () => {
  assert.match(
    orchestratorSource,
    /claudeResult\.structuredProducts.*\.length\s*>\s*0/,
  );
});

test("orchestrator checks for non-empty structuredDescription before storing", () => {
  assert.match(
    orchestratorSource,
    /claudeResult\.structuredDescription/,
  );
});

test("orchestrator still stores flat farmDescription field", () => {
  assert.match(
    orchestratorSource,
    /patch\.farmDescription\s*=\s*claudeResult\.businessDescription/,
  );
});

test("orchestrator still stores flat products field", () => {
  assert.match(
    orchestratorSource,
    /patch\.products\s*=\s*claudeResult\.products/,
  );
});

// --- Lead detail page displays structured data ---

test("lead detail page displays farmDescription when available", () => {
  assert.ok(leadDetailSource.includes("lead.farmDescription"));
  assert.ok(leadDetailSource.includes("Description:"));
});

test("lead detail page renders StructuredDescriptionDisplay component", () => {
  assert.match(leadDetailSource, /function\s+StructuredDescriptionDisplay/);
  assert.match(leadDetailSource, /<StructuredDescriptionDisplay/);
});

test("StructuredDescriptionDisplay shows specialties when available", () => {
  assert.ok(leadDetailSource.includes("data.specialties"));
  assert.ok(leadDetailSource.includes("Specialties:"));
});

test("StructuredDescriptionDisplay shows certifications when available", () => {
  assert.ok(leadDetailSource.includes("data.certifications"));
  assert.ok(leadDetailSource.includes("Certifications:"));
});

test("lead detail page renders StructuredProductsDisplay component", () => {
  assert.match(leadDetailSource, /function\s+StructuredProductsDisplay/);
  assert.match(leadDetailSource, /<StructuredProductsDisplay/);
});

test("StructuredProductsDisplay groups products by category", () => {
  assert.ok(leadDetailSource.includes("grouped.get(product.category)"));
  assert.ok(leadDetailSource.includes("grouped.set(product.category"));
});

test("lead detail page reads structuredProducts from enrichmentData", () => {
  assert.ok(leadDetailSource.includes("structuredProducts"));
});

test("lead detail page reads structuredDescription from enrichmentData", () => {
  assert.ok(leadDetailSource.includes("structuredDescription"));
});
