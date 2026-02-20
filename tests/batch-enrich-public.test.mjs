import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "convex/enrichment/batchEnrichPublic.ts",
  "utf8",
);

test("batchEnrich is exported as a public action", () => {
  assert.match(source, /export\s+const\s+batchEnrich\s*=\s*action\(/);
});

test("action accepts leadIds array and optional force args", () => {
  assert.match(source, /leadIds:\s*v\.array\(v\.id\("leads"\)\)/);
  assert.match(source, /force:\s*v\.optional\(v\.boolean\(\)\)/);
});

test("delegates to internal batchEnrichLeads action", () => {
  assert.match(source, /ctx\.runAction\(/);
  assert.match(source, /internal\.enrichment\.batchEnrich\.batchEnrichLeads/);
});

test("passes leadIds and force args through", () => {
  assert.match(source, /leadIds:\s*args\.leadIds/);
  assert.match(source, /force:\s*args\.force/);
});

test("imports action from generated server", () => {
  assert.match(source, /import.*action.*from.*_generated\/server/);
});

test("imports internal from generated api", () => {
  assert.match(source, /import.*internal.*from.*_generated\/api/);
});

// --- enrichCellLeads tests ---

test("enrichCellLeads is exported as a public action", () => {
  assert.match(source, /export\s+const\s+enrichCellLeads\s*=\s*action\(/);
});

test("enrichCellLeads accepts cellId arg with discoveryCells validator", () => {
  assert.match(source, /cellId:\s*v\.id\("discoveryCells"\)/);
});

test("enrichCellLeads calls getCellLeadIdsForEnrichment query", () => {
  assert.match(
    source,
    /ctx\.runQuery\(\s*[\s\S]*?internal\.discovery\.gridCells\.getCellLeadIdsForEnrichment/,
  );
});

test("enrichCellLeads returns early with zeros when no leads", () => {
  assert.match(
    source,
    /if\s*\(\s*leadIds\.length\s*===\s*0\s*\)/,
  );
  assert.match(source, /total:\s*0/);
  assert.match(source, /succeeded:\s*0/);
  assert.match(source, /failed:\s*0/);
  assert.match(source, /skipped:\s*0/);
});

test("enrichCellLeads chunks lead IDs into batches of 25", () => {
  assert.match(source, /ENRICH_CHUNK_SIZE\s*=\s*25/);
  assert.match(source, /i\s*\+=\s*ENRICH_CHUNK_SIZE/);
  assert.match(source, /leadIds\.slice\(i,\s*i\s*\+\s*ENRICH_CHUNK_SIZE\)/);
});

test("enrichCellLeads calls batchEnrichLeads for each chunk", () => {
  assert.match(
    source,
    /ctx\.runAction\(\s*internal\.enrichment\.batchEnrich\.batchEnrichLeads,\s*\{\s*leadIds:\s*chunk/s,
  );
});

test("enrichCellLeads aggregates succeeded, failed, skipped across chunks", () => {
  assert.match(source, /succeeded\s*\+=\s*result\.succeeded/);
  assert.match(source, /failed\s*\+=\s*result\.failed/);
  assert.match(source, /skipped\s*\+=\s*result\.skipped/);
});

test("enrichCellLeads returns leadIds, total, succeeded, failed, skipped", () => {
  // Check the final return shape
  assert.match(source, /return\s*\{[^}]*leadIds[^}]*total[^}]*succeeded[^}]*failed[^}]*skipped/s);
});

// --- useSonarPro threading tests ---

test("enrichCellLeads accepts useSonarPro optional boolean arg", () => {
  assert.match(
    source,
    /export\s+const\s+enrichCellLeads\s*=\s*action\(\{[\s\S]*?useSonarPro:\s*v\.optional\(v\.boolean\(\)\)/,
  );
});

test("enrichCellLeads passes useSonarPro to batchEnrichLeads", () => {
  assert.match(source, /useSonarPro:\s*args\.useSonarPro/);
});

test("batchEnrich accepts useSonarPro optional boolean arg", () => {
  assert.match(
    source,
    /export\s+const\s+batchEnrich\s*=\s*action\(\{[\s\S]*?useSonarPro:\s*v\.optional\(v\.boolean\(\)\)/,
  );
});

test("batchEnrich passes useSonarPro to internal batchEnrichLeads", () => {
  // Both enrichCellLeads and batchEnrich thread useSonarPro through
  const matches = source.match(/useSonarPro:\s*args\.useSonarPro/g);
  assert.ok(matches && matches.length >= 2, "useSonarPro should be threaded in both enrichCellLeads and batchEnrich");
});

// --- useApify threading tests ---

test("enrichCellLeads accepts useApify optional boolean arg", () => {
  assert.match(
    source,
    /export\s+const\s+enrichCellLeads\s*=\s*action\(\{[\s\S]*?useApify:\s*v\.optional\(v\.boolean\(\)\)/,
  );
});

test("enrichCellLeads passes useApify to batchEnrichLeads", () => {
  assert.match(source, /useApify:\s*args\.useApify/);
});

test("batchEnrich accepts useApify optional boolean arg", () => {
  assert.match(
    source,
    /export\s+const\s+batchEnrich\s*=\s*action\(\{[\s\S]*?useApify:\s*v\.optional\(v\.boolean\(\)\)/,
  );
});

test("batchEnrich passes useApify to internal batchEnrichLeads", () => {
  const matches = source.match(/useApify:\s*args\.useApify/g);
  assert.ok(matches && matches.length >= 2, "useApify should be threaded in both enrichCellLeads and batchEnrich");
});
