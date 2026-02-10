import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

import ts from "typescript";

function loadTsModule(relativePath) {
  const source = fs.readFileSync(relativePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: path.basename(relativePath),
  }).outputText;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-cluster-breakdown-"));
  const modulePath = path.join(tempDir, `${path.basename(relativePath)}.cjs`);
  fs.writeFileSync(modulePath, transpiled, "utf8");

  const requireFromTest = createRequire(import.meta.url);

  try {
    return requireFromTest(modulePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

test("buildClusterBreakdown returns empty clusters array and zero unclustered when given no data", () => {
  const { buildClusterBreakdown } = loadTsModule("convex/lib/clusterBreakdown.ts");
  const result = buildClusterBreakdown([], []);

  assert.deepEqual(result.clusters, []);
  assert.equal(result.unclustered, 0);
});

test("buildClusterBreakdown counts leads per cluster correctly", () => {
  const { buildClusterBreakdown } = loadTsModule("convex/lib/clusterBreakdown.ts");
  const clusters = [
    { _id: "c1", name: "Kingston" },
    { _id: "c2", name: "Ottawa" },
  ];
  const leads = [
    { clusterId: "c1" },
    { clusterId: "c1" },
    { clusterId: "c1" },
    { clusterId: "c2" },
  ];

  const result = buildClusterBreakdown(clusters, leads);

  assert.equal(result.clusters.length, 2);
  assert.equal(result.clusters[0].name, "Kingston");
  assert.equal(result.clusters[0].count, 3);
  assert.equal(result.clusters[1].name, "Ottawa");
  assert.equal(result.clusters[1].count, 1);
  assert.equal(result.unclustered, 0);
});

test("buildClusterBreakdown counts unclustered leads (no clusterId)", () => {
  const { buildClusterBreakdown } = loadTsModule("convex/lib/clusterBreakdown.ts");
  const clusters = [{ _id: "c1", name: "Toronto" }];
  const leads = [
    { clusterId: "c1" },
    {},
    {},
    { clusterId: undefined },
  ];

  const result = buildClusterBreakdown(clusters, leads);

  assert.equal(result.clusters[0].count, 1);
  assert.equal(result.unclustered, 3);
});

test("buildClusterBreakdown returns zero count for clusters with no leads", () => {
  const { buildClusterBreakdown } = loadTsModule("convex/lib/clusterBreakdown.ts");
  const clusters = [
    { _id: "c1", name: "Hamilton" },
    { _id: "c2", name: "London" },
  ];
  const leads = [{ clusterId: "c1" }];

  const result = buildClusterBreakdown(clusters, leads);

  assert.equal(result.clusters[0].name, "Hamilton");
  assert.equal(result.clusters[0].count, 1);
  assert.equal(result.clusters[1].name, "London");
  assert.equal(result.clusters[1].count, 0);
});

test("buildClusterBreakdown preserves cluster order from input", () => {
  const { buildClusterBreakdown } = loadTsModule("convex/lib/clusterBreakdown.ts");
  const clusters = [
    { _id: "c3", name: "Zebra" },
    { _id: "c1", name: "Alpha" },
    { _id: "c2", name: "Middle" },
  ];

  const result = buildClusterBreakdown(clusters, []);

  assert.deepEqual(
    result.clusters.map((c) => c.name),
    ["Zebra", "Alpha", "Middle"],
  );
});

test("buildClusterBreakdown handles all leads unclustered", () => {
  const { buildClusterBreakdown } = loadTsModule("convex/lib/clusterBreakdown.ts");
  const clusters = [{ _id: "c1", name: "Empty" }];
  const leads = [{}, {}, {}];

  const result = buildClusterBreakdown(clusters, leads);

  assert.equal(result.clusters[0].count, 0);
  assert.equal(result.unclustered, 3);
});

test("convex/dashboard.ts exports clusterBreakdown query", () => {
  const source = fs.readFileSync("convex/dashboard.ts", "utf8");
  assert.match(source, /export\s+const\s+clusterBreakdown\s*=\s*query\(/);
  assert.match(source, /buildClusterBreakdown/);
});
