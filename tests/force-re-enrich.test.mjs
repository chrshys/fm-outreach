import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const scriptSource = fs.readFileSync("scripts/enrich-leads.ts", "utf8");
const orchestratorSource = fs.readFileSync(
  "convex/enrichment/orchestrator.ts",
  "utf8",
);
const sonarSource = fs.readFileSync(
  "convex/enrichment/sonarEnrich.ts",
  "utf8",
);

// =============================================================
// Re-enriching a known lead by name with --force should bypass
// cooldown, overwrite existing fields, and populate email,
// locationDescription, and imagePrompt from Sonar results.
// =============================================================

// --- CLI: name: filter support ---

test("script supports name: prefix filter", () => {
  assert.match(scriptSource, /input\.startsWith\("name:"\)/);
  assert.match(scriptSource, /input\.slice\("name:"\.length\)/);
});

test("script parses name: filter into type 'name'", () => {
  assert.match(scriptSource, /type:\s*"name"/);
});

test("script validates name: filter is not empty", () => {
  assert.match(scriptSource, /name: filter requires a lead name/);
});

test("script filters leads by name case-insensitively", () => {
  const nameBlock = scriptSource.slice(
    scriptSource.indexOf('filter.type === "name"'),
    scriptSource.indexOf('filter.type === "cluster"'),
  );
  assert.match(nameBlock, /l\.name\.toLowerCase\(\)\s*===\s*filter\.name\.toLowerCase\(\)/);
});

test("script usage includes name: example", () => {
  assert.match(scriptSource, /name:.*Farmer/);
});

test("script usage includes name: in usage line", () => {
  assert.match(scriptSource, /name:lead-name/);
});

// --- CLI: force flag passes through to batch enrich ---

test("script passes force flag to batchEnrich action", () => {
  const callBlock = scriptSource.slice(
    scriptSource.indexOf("convex.action(enrichRef"),
    scriptSource.indexOf("convex.action(enrichRef") + 200,
  );
  assert.match(callBlock, /force/);
});

// --- Orchestrator: force bypasses cooldown ---

test("force:true bypasses 30-day cooldown in orchestrator", () => {
  assert.match(
    orchestratorSource,
    /!force\s*&&\s*lead\.enrichedAt\s*&&\s*Date\.now\(\)\s*-\s*lead\.enrichedAt\s*<\s*COOLDOWN_MS/,
  );
});

// --- Orchestrator: force implies overwrite ---

test("force:true implies overwrite:true for field merging", () => {
  assert.match(
    orchestratorSource,
    /const\s+overwrite\s*=\s*args\.overwrite\s*\?\?\s*force/,
  );
});

// --- Orchestrator: email populated from Sonar on force ---

test("orchestrator populates contactEmail from Sonar when overwriting", () => {
  assert.match(orchestratorSource, /!lead\.contactEmail\s*\|\|\s*overwrite.*patch\.contactEmail\s*=\s*bestEmail/s);
});

test("orchestrator tracks email source with consent", () => {
  assert.match(orchestratorSource, /emailSource\s*=\s*`sonar/);
  assert.match(orchestratorSource, /patch\.consentSource\s*=\s*emailSource/);
});

// --- Orchestrator: locationDescription populated from Sonar on force ---

test("orchestrator populates locationDescription from Sonar when overwriting", () => {
  assert.match(
    orchestratorSource,
    /sonarResult\?\.locationDescription\s*&&\s*\(!lead\.locationDescription\s*\|\|\s*overwrite\)/,
  );
  assert.match(
    orchestratorSource,
    /patch\.locationDescription\s*=\s*sonarResult\.locationDescription/,
  );
});

// --- Orchestrator: imagePrompt populated from Sonar on force ---

test("orchestrator populates imagePrompt from Sonar when overwriting", () => {
  assert.match(
    orchestratorSource,
    /sonarResult\?\.imagePrompt\s*&&\s*\(!lead\.imagePrompt\s*\|\|\s*overwrite\)/,
  );
  assert.match(
    orchestratorSource,
    /patch\.imagePrompt\s*=\s*sonarResult\.imagePrompt/,
  );
});

// --- Sonar: prompt requests locationDescription and imagePrompt ---

test("Sonar prompt asks for locationDescription as marketplace listing", () => {
  assert.match(sonarSource, /locationDescription.*marketplace listing/s);
});

test("Sonar prompt asks for imagePrompt for AI image generation", () => {
  assert.match(sonarSource, /imagePrompt.*AI image generation/s);
});

// --- Sonar: result type includes all required fields ---

test("SonarEnrichResult includes contactEmail field", () => {
  assert.match(sonarSource, /contactEmail:\s*string\s*\|\s*null/);
});

test("SonarEnrichResult includes locationDescription field", () => {
  assert.match(sonarSource, /locationDescription:\s*string/);
});

test("SonarEnrichResult includes imagePrompt field", () => {
  assert.match(sonarSource, /imagePrompt:\s*string/);
});

// --- Sonar: parser extracts locationDescription and imagePrompt ---

test("Sonar parser extracts locationDescription from JSON response", () => {
  assert.match(
    sonarSource,
    /typeof\s+parsed\.locationDescription\s*===\s*"string"/,
  );
});

test("Sonar parser extracts imagePrompt from JSON response", () => {
  assert.match(sonarSource, /typeof\s+parsed\.imagePrompt\s*===\s*"string"/);
});

// --- Orchestrator: enrichment version and metadata set after force ---

test("orchestrator sets enrichmentVersion after enrichment", () => {
  assert.match(orchestratorSource, /patch\.enrichmentVersion\s*=\s*ENRICHMENT_VERSION/);
});

test("orchestrator sets enrichedAt timestamp after enrichment", () => {
  assert.match(orchestratorSource, /patch\.enrichedAt\s*=\s*now/);
});

test("orchestrator appends to enrichmentSources array", () => {
  assert.match(orchestratorSource, /patch\.enrichmentSources\s*=\s*\[/);
  assert.match(orchestratorSource, /\.\.\.sources/);
});

// --- Orchestrator: status set to enriched when email found ---

test("orchestrator sets status to 'enriched' when email is found", () => {
  assert.match(orchestratorSource, /emailFound\s*\?\s*"enriched"\s*:\s*"no_email"/);
});

test("orchestrator overrides status when overwrite is true", () => {
  assert.match(orchestratorSource, /progressableStatuses\.has\(lead\.status\)\s*\|\|\s*overwrite/);
});
