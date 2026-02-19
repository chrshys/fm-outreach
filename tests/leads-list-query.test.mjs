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

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-leads-list-"));
  const modulePath = path.join(tempDir, `${path.basename(relativePath)}.cjs`);
  fs.writeFileSync(modulePath, transpiled, "utf8");

  const requireFromTest = createRequire(import.meta.url);

  try {
    return requireFromTest(modulePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function createLead(index, overrides = {}) {
  return {
    _id: `lead-${index}`,
    name: `Lead ${String(index).padStart(2, "0")}`,
    city: `City ${String(index).padStart(2, "0")}`,
    status: "new_lead",
    type: "farm",
    source: "manual",
    updatedAt: index,
    followUpCount: 0,
    createdAt: index,
    ...overrides,
  };
}

test("listLeadsPage returns 50 results by default sort with cursor pagination", () => {
  const { listLeadsPage } = loadTsModule("convex/lib/leadsList.ts");
  const leads = Array.from({ length: 55 }, (_, i) => createLead(i + 1));

  const firstPage = listLeadsPage(leads, {
    filters: { now: 1_000 },
    pageSize: 50,
  });

  assert.equal(firstPage.leads.length, 50);
  assert.equal(firstPage.leads[0].name, "Lead 01");
  assert.equal(firstPage.cursor, "50");

  const secondPage = listLeadsPage(leads, {
    filters: { now: 1_000 },
    cursor: firstPage.cursor,
    pageSize: 50,
  });

  assert.equal(secondPage.leads.length, 5);
  assert.equal(secondPage.leads[0].name, "Lead 51");
  assert.equal(secondPage.cursor, null);
});

test("listLeadsPage applies status/type/cluster/email/social/source/follow-up filters", () => {
  const { listLeadsPage } = loadTsModule("convex/lib/leadsList.ts");

  const leads = [
    createLead(1, {
      status: "enriched",
      type: "farm",
      clusterId: "cluster-a",
      source: "manual",
      contactEmail: "owner@example.com",
      socialLinks: { instagram: "https://instagram.com/a" },
      nextFollowUpAt: 500,
    }),
    createLead(2, {
      status: "enriched",
      type: "farm",
      clusterId: "cluster-a",
      source: "manual",
      contactEmail: "",
      socialLinks: {},
      nextFollowUpAt: 500,
    }),
    createLead(3, {
      status: "enriched",
      type: "farm",
      clusterId: "cluster-b",
      source: "manual",
      contactEmail: "owner@example.com",
      socialLinks: { facebook: "https://facebook.com/a" },
      nextFollowUpAt: 2_000,
    }),
    createLead(4, {
      status: "new_lead",
      type: "farm",
      clusterId: "cluster-a",
      source: "manual",
      contactEmail: "owner@example.com",
      socialLinks: { instagram: "https://instagram.com/b" },
      nextFollowUpAt: 500,
    }),
  ];

  const page = listLeadsPage(leads, {
    filters: {
      status: "enriched",
      type: "farm",
      clusterIds: ["cluster-a"],
      hasEmail: true,
      hasSocial: true,
      source: "manual",
      needsFollowUp: true,
      now: 1_000,
    },
    pageSize: 50,
  });

  assert.deepEqual(
    page.leads.map((lead) => lead._id),
    ["lead-1"],
  );
});

test("listLeadsPage narrows results with status, type, and hasEmail filters", () => {
  const { listLeadsPage } = loadTsModule("convex/lib/leadsList.ts");

  const leads = [
    createLead(1, { status: "new_lead", type: "farm", contactEmail: "a@example.com" }),
    createLead(2, { status: "enriched", type: "farm", contactEmail: "b@example.com" }),
    createLead(3, { status: "enriched", type: "farmers_market", contactEmail: "" }),
    createLead(4, { status: "replied", type: "farmers_market" }),
  ];

  const statusFiltered = listLeadsPage(leads, {
    filters: { status: "enriched", now: 1_000 },
    pageSize: 50,
  });
  assert.deepEqual(
    statusFiltered.leads.map((lead) => lead._id),
    ["lead-2", "lead-3"],
  );

  const typeFiltered = listLeadsPage(leads, {
    filters: { type: "farmers_market", now: 1_000 },
    pageSize: 50,
  });
  assert.deepEqual(
    typeFiltered.leads.map((lead) => lead._id),
    ["lead-3", "lead-4"],
  );

  const hasEmailFiltered = listLeadsPage(leads, {
    filters: { hasEmail: true, now: 1_000 },
    pageSize: 50,
  });
  assert.deepEqual(
    hasEmailFiltered.leads.map((lead) => lead._id),
    ["lead-1", "lead-2"],
  );
});

test("listLeadsPage supports sorting by updatedAt descending", () => {
  const { listLeadsPage } = loadTsModule("convex/lib/leadsList.ts");

  const page = listLeadsPage(
    [
      createLead(1, { updatedAt: 100 }),
      createLead(2, { updatedAt: 300 }),
      createLead(3, { updatedAt: 200 }),
    ],
    {
      filters: { now: 1_000 },
      sortBy: "updatedAt",
      sortOrder: "desc",
      pageSize: 50,
    },
  );

  assert.deepEqual(
    page.leads.map((lead) => lead.updatedAt),
    [300, 200, 100],
  );
});

test("listLeadsPage supports sorting by name, city, and status in both directions", () => {
  const { listLeadsPage } = loadTsModule("convex/lib/leadsList.ts");

  const leads = [
    createLead(1, { name: "Bravo Farm", city: "York", status: "replied" }),
    createLead(2, { name: "alpha orchards", city: "Albany", status: "declined" }),
    createLead(3, { name: "Cedar Acres", city: "Boston", status: "new_lead" }),
  ];

  const byNameAsc = listLeadsPage(leads, {
    filters: { now: 1_000 },
    sortBy: "name",
    sortOrder: "asc",
    pageSize: 50,
  });
  assert.deepEqual(
    byNameAsc.leads.map((lead) => lead.name),
    ["alpha orchards", "Bravo Farm", "Cedar Acres"],
  );

  const byCityDesc = listLeadsPage(leads, {
    filters: { now: 1_000 },
    sortBy: "city",
    sortOrder: "desc",
    pageSize: 50,
  });
  assert.deepEqual(
    byCityDesc.leads.map((lead) => lead.city),
    ["York", "Boston", "Albany"],
  );

  const byStatusAsc = listLeadsPage(leads, {
    filters: { now: 1_000 },
    sortBy: "status",
    sortOrder: "asc",
    pageSize: 50,
  });
  assert.deepEqual(
    byStatusAsc.leads.map((lead) => lead.status),
    ["declined", "new_lead", "replied"],
  );

  const byStatusDesc = listLeadsPage(leads, {
    filters: { now: 1_000 },
    sortBy: "status",
    sortOrder: "desc",
    pageSize: 50,
  });
  assert.deepEqual(
    byStatusDesc.leads.map((lead) => lead.status),
    ["replied", "new_lead", "declined"],
  );
});

test("convex leads list query is exported with required pagination defaults", () => {
  const source = fs.readFileSync("convex/leads.ts", "utf8");

  assert.match(source, /export\s+const\s+list\s*=\s*query\(/);
  assert.match(source, /pageSize:\s*50/);
  assert.match(source, /cursor:\s*v\.optional\(v\.string\(\)\)/);
  assert.match(source, /sortBy:\s*v\.optional\(/);
  assert.match(source, /needsFollowUp:\s*v\.optional\(v\.boolean\(\)\)/);
});
