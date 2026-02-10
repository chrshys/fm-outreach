import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const composerSource = fs.readFileSync("src/components/leads/email-composer.tsx", "utf8");
const generateSource = fs.readFileSync("convex/email/generateEmail.ts", "utf8");

// --- Backend: enrichment data types ---

test("generateEmail defines StructuredProduct type with name and category", () => {
  assert.match(generateSource, /type\s+StructuredProduct\s*=\s*\{/);
  assert.match(generateSource, /name:\s*string/);
  assert.match(generateSource, /category:\s*string/);
});

test("generateEmail defines StructuredDescription type with summary, specialties, certifications", () => {
  assert.match(generateSource, /type\s+StructuredDescription\s*=\s*\{/);
  assert.match(generateSource, /summary:\s*string/);
  assert.match(generateSource, /specialties:\s*string\[\]/);
  assert.match(generateSource, /certifications:\s*string\[\]/);
});

test("generateEmail defines EnrichmentData type", () => {
  assert.match(generateSource, /type\s+EnrichmentData\s*=\s*\{/);
  assert.match(generateSource, /structuredDescription\?:\s*StructuredDescription/);
  assert.match(generateSource, /structuredProducts\?:\s*StructuredProduct\[\]/);
});

test("LeadData type includes optional enrichmentData field", () => {
  assert.match(generateSource, /enrichmentData\?:\s*EnrichmentData/);
});

// --- Backend: buildLeadContext includes enrichment data ---

test("buildLeadContext includes enriched summary when available", () => {
  assert.match(generateSource, /Enriched summary:/);
  assert.match(generateSource, /desc\.summary/);
});

test("buildLeadContext includes specialties when available", () => {
  assert.match(generateSource, /Specialties:/);
  assert.match(generateSource, /desc\.specialties/);
});

test("buildLeadContext includes certifications when available", () => {
  assert.match(generateSource, /Certifications:/);
  assert.match(generateSource, /desc\.certifications/);
});

test("buildLeadContext includes detailed products grouped by category", () => {
  assert.match(generateSource, /Detailed products:/);
  assert.match(generateSource, /enrichment\.structuredProducts/);
});

test("buildLeadContext groups structured products by category", () => {
  assert.match(generateSource, /new Map<string, string\[\]>\(\)/);
  assert.match(generateSource, /product\.category/);
  assert.match(generateSource, /product\.name/);
});

test("buildLeadContext conditionally includes enrichment data", () => {
  assert.match(generateSource, /enrichment\?\.structuredDescription/);
  assert.match(generateSource, /enrichment\?\.structuredProducts\?\.length/);
});

// --- Frontend: FarmDetailsPanel component ---

test("email-composer defines FarmDetailsPanel component", () => {
  assert.match(composerSource, /function\s+FarmDetailsPanel\(/);
});

test("FarmDetailsPanel accepts leadId prop", () => {
  assert.match(composerSource, /FarmDetailsPanel\(\{\s*leadId\s*\}:\s*\{\s*leadId:\s*Id<"leads">/);
});

test("FarmDetailsPanel fetches lead data via useQuery", () => {
  assert.match(composerSource, /useQuery\(api\.leads\.get,\s*\{\s*leadId\s*\}\)/);
});

test("FarmDetailsPanel is collapsible with expand/collapse toggle", () => {
  assert.match(composerSource, /isExpanded/);
  assert.match(composerSource, /setIsExpanded/);
  assert.match(composerSource, /ChevronDown/);
  assert.match(composerSource, /ChevronRight/);
});

test("FarmDetailsPanel shows detail count badge", () => {
  assert.match(composerSource, /detailCount/);
  assert.match(composerSource, /details.*available/);
});

test("FarmDetailsPanel displays location from lead city", () => {
  assert.match(composerSource, /Location:<\/span>\s*\{lead\.city\}/);
});

test("FarmDetailsPanel conditionally shows contact name", () => {
  assert.match(composerSource, /lead\.contactName\s*\?/);
  assert.match(composerSource, /Contact:<\/span>/);
});

test("FarmDetailsPanel conditionally shows products", () => {
  assert.match(composerSource, /hasProducts/);
  assert.match(composerSource, /lead\.products!\.join/);
});

test("FarmDetailsPanel conditionally shows enriched products", () => {
  assert.match(composerSource, /hasEnrichedProducts/);
  assert.match(composerSource, /Enriched Products:<\/span>/);
  assert.match(composerSource, /structuredProducts!\.map/);
});

test("FarmDetailsPanel conditionally shows sales channels", () => {
  assert.match(composerSource, /hasChannels/);
  assert.match(composerSource, /Sales Channels:<\/span>/);
});

test("FarmDetailsPanel conditionally shows sells online status", () => {
  assert.match(composerSource, /Sells Online:<\/span>/);
  assert.match(composerSource, /lead\.sellsOnline \? "Yes" : "No"/);
});

test("FarmDetailsPanel conditionally shows farm description", () => {
  assert.match(composerSource, /hasDescription/);
  assert.match(composerSource, /Description:<\/span>/);
});

test("FarmDetailsPanel conditionally shows specialties from enrichment", () => {
  assert.match(composerSource, /hasSpecialties/);
  assert.match(composerSource, /Specialties:<\/span>/);
  assert.match(composerSource, /structuredDescription!\.specialties\.join/);
});

test("FarmDetailsPanel conditionally shows certifications from enrichment", () => {
  assert.match(composerSource, /hasCertifications/);
  assert.match(composerSource, /Certifications:<\/span>/);
  assert.match(composerSource, /structuredDescription!\.certifications\.join/);
});

test("FarmDetailsPanel conditionally shows social links", () => {
  assert.match(composerSource, /hasSocial/);
  assert.match(composerSource, /Social:<\/span>/);
});

// --- Frontend: FarmDetailsPanel rendered in EmailComposer ---

test("EmailComposer renders FarmDetailsPanel with leadId", () => {
  assert.match(composerSource, /<FarmDetailsPanel\s+leadId=\{leadId\}\s*\/>/);
});

test("FarmDetailsPanel appears before template selector", () => {
  const panelIdx = composerSource.indexOf("<FarmDetailsPanel");
  const templateIdx = composerSource.indexOf('id="email-template"');
  assert.ok(panelIdx > 0, "FarmDetailsPanel should exist");
  assert.ok(templateIdx > 0, "template selector should exist");
  assert.ok(panelIdx < templateIdx, "FarmDetailsPanel should appear before template selector");
});

// --- Frontend: enrichment type definition ---

test("email-composer defines EnrichmentData type with structuredDescription and structuredProducts", () => {
  assert.match(composerSource, /type\s+EnrichmentData\s*=\s*\{/);
  assert.match(composerSource, /structuredDescription\?/);
  assert.match(composerSource, /structuredProducts\?/);
});
