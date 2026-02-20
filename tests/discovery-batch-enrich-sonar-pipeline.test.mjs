import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

/**
 * Integration test: verifies that batch enrichment triggered from the discovery
 * panel flows through the new sonar-based pipeline end-to-end.
 *
 * Call chain:
 *   discovery-panel.tsx (enrichCellLeads useAction)
 *     → batchEnrichPublic.enrichCellLeads (public action)
 *       → batchEnrich.batchEnrichLeads (internal action)
 *         → orchestrator.enrichLead (internal action)
 *           → sonarEnrich.enrichWithSonar (action)
 */

const panelSource = fs.readFileSync(
  "src/components/map/discovery-panel.tsx",
  "utf8",
);
const batchPublicSource = fs.readFileSync(
  "convex/enrichment/batchEnrichPublic.ts",
  "utf8",
);
const batchSource = fs.readFileSync(
  "convex/enrichment/batchEnrich.ts",
  "utf8",
);
const orchestratorSource = fs.readFileSync(
  "convex/enrichment/orchestrator.ts",
  "utf8",
);
const sonarSource = fs.readFileSync(
  "convex/enrichment/sonarEnrich.ts",
  "utf8",
);
const progressSource = fs.readFileSync(
  "src/components/leads/enrichment-progress.tsx",
  "utf8",
);
const activitiesSource = fs.readFileSync("convex/activities.ts", "utf8");

// ============================================================
// 1. Discovery panel → enrichCellLeads action wiring
// ============================================================

test("discovery panel imports enrichCellLeads from batchEnrichPublic", () => {
  assert.match(
    panelSource,
    /useAction\(\s*api\.enrichment\.batchEnrichPublic\.enrichCellLeads\s*\)/,
  );
});

test("discovery panel calls enrichCellLeads with cellId", () => {
  assert.match(panelSource, /enrichCellLeads\(\s*\{[\s\S]*?cellId:/);
});

// ============================================================
// 2. enrichCellLeads → batchEnrichLeads call chain
// ============================================================

test("enrichCellLeads delegates to internal batchEnrichLeads", () => {
  assert.match(
    batchPublicSource,
    /internal\.enrichment\.batchEnrich\.batchEnrichLeads/,
  );
});

test("enrichCellLeads threads useSonarPro to batchEnrichLeads", () => {
  // Find the enrichCellLeads handler
  const handlerStart = batchPublicSource.indexOf(
    "export const enrichCellLeads",
  );
  const handlerBlock = batchPublicSource.slice(
    handlerStart,
    batchPublicSource.indexOf("export const batchEnrich"),
  );
  assert.match(handlerBlock, /useSonarPro:\s*args\.useSonarPro/);
});

// ============================================================
// 3. batchEnrichLeads → orchestrator.enrichLead call chain
// ============================================================

test("batchEnrichLeads calls orchestrator.enrichLead for each lead", () => {
  assert.match(
    batchSource,
    /internal\.enrichment\.orchestrator\.enrichLead/,
  );
});

test("batchEnrichLeads passes useSonarPro to enrichLead", () => {
  assert.match(batchSource, /useSonarPro:\s*args\.useSonarPro/);
});

// ============================================================
// 4. Orchestrator uses sonar enrichment (new pipeline)
// ============================================================

test("orchestrator calls sonarEnrich.enrichWithSonar", () => {
  assert.match(
    orchestratorSource,
    /api\.enrichment\.sonarEnrich\.enrichWithSonar/,
  );
});

test("orchestrator imports SonarEnrichResult type", () => {
  assert.match(
    orchestratorSource,
    /import\s+type.*SonarEnrichResult.*from.*sonarEnrich/,
  );
});

test("orchestrator passes useSonarPro to sonar action", () => {
  const sonarBlock = orchestratorSource.slice(
    orchestratorSource.indexOf("// Step 4: Sonar enrichment"),
    orchestratorSource.indexOf("// Merge results"),
  );
  assert.match(sonarBlock, /useSonarPro:\s*args\.useSonarPro/);
});

test("orchestrator passes Google Places website to sonar as fallback", () => {
  const sonarBlock = orchestratorSource.slice(
    orchestratorSource.indexOf("// Step 4: Sonar enrichment"),
    orchestratorSource.indexOf("// Merge results"),
  );
  assert.match(sonarBlock, /website:\s*websiteUrl/);
});

// ============================================================
// 5. Orchestrator does NOT use old pipeline modules
// ============================================================

test("orchestrator does not use hunter.io", () => {
  assert.doesNotMatch(orchestratorSource, /hunter\.searchDomain/);
  assert.doesNotMatch(orchestratorSource, /hunterResult/);
});

test("orchestrator does not use websiteScraper", () => {
  assert.doesNotMatch(orchestratorSource, /scrapeWebsite/);
  assert.doesNotMatch(orchestratorSource, /scraperResult/);
});

test("orchestrator does not use claude analysis", () => {
  assert.doesNotMatch(orchestratorSource, /analyzeWithClaude/);
  assert.doesNotMatch(orchestratorSource, /claudeResult/);
});

test("orchestrator does not use social discovery", () => {
  assert.doesNotMatch(orchestratorSource, /discoverSocialLinks/);
});

// ============================================================
// 6. Sonar enrichment action structure
// ============================================================

test("sonarEnrich exports enrichWithSonar as a public action", () => {
  assert.match(sonarSource, /export\s+const\s+enrichWithSonar\s*=\s*action\(/);
});

test("sonarEnrich accepts business identity fields", () => {
  assert.match(sonarSource, /name:\s*v\.string\(\)/);
  assert.match(sonarSource, /address:\s*v\.string\(\)/);
  assert.match(sonarSource, /city:\s*v\.string\(\)/);
  assert.match(sonarSource, /province:\s*v\.string\(\)/);
  assert.match(sonarSource, /type:\s*v\.string\(\)/);
});

test("sonarEnrich returns null when no API key is configured", () => {
  assert.match(sonarSource, /if\s*\(!apiKey\)/);
  assert.match(sonarSource, /return\s+null/);
});

// ============================================================
// 7. Progress tracking works with sonar-based enrichment
// ============================================================

test("orchestrator logs enrichment_started before sonar step", () => {
  const startLogPos = orchestratorSource.indexOf("enrichment_started");
  const sonarCallPos = orchestratorSource.indexOf("enrichWithSonar");
  assert.ok(startLogPos > 0, "enrichment_started should exist");
  assert.ok(sonarCallPos > 0, "enrichWithSonar call should exist");
  assert.ok(
    startLogPos < sonarCallPos,
    "enrichment_started must be logged before sonar enrichment runs",
  );
});

test("orchestrator logs enrichment_finished after sonar step", () => {
  const sonarCallPos = orchestratorSource.indexOf("enrichWithSonar");
  const finishLogPos = orchestratorSource.lastIndexOf("enrichment_finished");
  assert.ok(sonarCallPos > 0, "enrichWithSonar call should exist");
  assert.ok(finishLogPos > 0, "enrichment_finished should exist");
  assert.ok(
    finishLogPos > sonarCallPos,
    "enrichment_finished must be logged after sonar enrichment runs",
  );
});

test("enrichmentProgress query counts started, finished, and skipped activities", () => {
  assert.match(activitiesSource, /enrichment_started/);
  assert.match(activitiesSource, /enrichment_finished/);
  assert.match(activitiesSource, /enrichment_skipped/);
  assert.match(
    activitiesSource,
    /return\s*\{\s*started,\s*finished,\s*skipped,\s*total/,
  );
});

test("EnrichmentProgress component subscribes to enrichmentProgress query", () => {
  assert.match(
    progressSource,
    /useQuery\(\s*api\.activities\.enrichmentProgress/,
  );
});

test("EnrichmentProgress renders completed count from finished + skipped", () => {
  assert.match(
    progressSource,
    /completed\s*=\s*progress\.finished\s*\+\s*progress\.skipped/,
  );
});

// ============================================================
// 8. Discovery panel shows progress during enrichment
// ============================================================

test("discovery panel renders EnrichmentProgress when enriching", () => {
  assert.match(panelSource, /isEnriching\s*&&\s*enrichingLeadIds\.length\s*>\s*0/);
  assert.match(panelSource, /<EnrichmentProgress/);
});

test("discovery panel passes leadIds and since to EnrichmentProgress", () => {
  assert.match(panelSource, /leadIds=\{enrichingLeadIds\}/);
  assert.match(panelSource, /since=\{enrichmentSinceRef\.current\}/);
});

// ============================================================
// 9. Enrichment version is 2.0 (sonar pipeline)
// ============================================================

test("orchestrator sets enrichmentVersion to 2.0", () => {
  assert.match(orchestratorSource, /ENRICHMENT_VERSION\s*=\s*"2\.0"/);
  assert.match(
    orchestratorSource,
    /patch\.enrichmentVersion\s*=\s*ENRICHMENT_VERSION/,
  );
});

// ============================================================
// 10. Sonar results are merged into lead patch
// ============================================================

test("orchestrator merges sonar email into patch", () => {
  assert.match(orchestratorSource, /sonarResult\?\.contactEmail/);
  assert.match(orchestratorSource, /patch\.contactEmail\s*=\s*bestEmail/);
});

test("orchestrator merges sonar products into patch", () => {
  assert.match(orchestratorSource, /sonarResult\.products\.length\s*>\s*0/);
  assert.match(orchestratorSource, /patch\.products\s*=\s*sonarResult\.products/);
});

test("orchestrator merges sonar salesChannels into patch", () => {
  assert.match(
    orchestratorSource,
    /sonarResult\.salesChannels\.length\s*>\s*0/,
  );
  assert.match(
    orchestratorSource,
    /patch\.salesChannels\s*=\s*sonarResult\.salesChannels/,
  );
});

test("orchestrator merges sonar structuredProducts and structuredDescription", () => {
  assert.match(
    orchestratorSource,
    /structuredProducts:\s*sonarResult\.structuredProducts/,
  );
  assert.match(
    orchestratorSource,
    /structuredDescription:\s*sonarResult\.structuredDescription/,
  );
});

test("orchestrator adds sonar_enrichment to enrichmentSources", () => {
  assert.match(orchestratorSource, /source:\s*"sonar_enrichment"/);
});
