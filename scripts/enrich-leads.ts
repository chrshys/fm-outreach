/**
 * Enrich leads matching a cluster name or filter.
 *
 * Run with: npx tsx scripts/enrich-leads.ts <filter>
 *
 * Examples:
 *   npx tsx scripts/enrich-leads.ts Niagara
 *   npx tsx scripts/enrich-leads.ts "status:new_lead"
 *   npx tsx scripts/enrich-leads.ts "status:no_email" --force
 */
import { ConvexHttpClient } from "convex/browser";

import { api } from "../convex/_generated/api";

function getConvexUrl(): string {
  const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Missing CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable");
  }
  return convexUrl;
}

type LeadSummary = {
  _id: string;
  name: string;
  type: string;
  city: string;
  region?: string;
  status: string;
  contactEmail?: string;
  clusterId?: string;
};

type EnrichmentSummary = {
  leadId: string;
  skipped: boolean;
  sources: string[];
  emailFound: boolean;
  status: "enriched" | "no_email";
  fieldsUpdated: string[];
};

type BatchResult = {
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  results: Array<
    | { leadId: string; status: "success"; summary: EnrichmentSummary }
    | { leadId: string; status: "error"; error: string }
  >;
};

const VALID_STATUSES = new Set([
  "new_lead",
  "enriched",
  "outreach_started",
  "replied",
  "meeting_booked",
  "onboarded",
  "declined",
  "not_interested",
  "bounced",
  "no_response",
  "no_email",
]);

function parseFilter(input: string): { type: "cluster"; name: string } | { type: "status"; status: string } {
  if (input.startsWith("status:")) {
    const status = input.slice("status:".length);
    if (!VALID_STATUSES.has(status)) {
      throw new Error(
        `Invalid status "${status}". Valid statuses: ${[...VALID_STATUSES].join(", ")}`,
      );
    }
    return { type: "status", status };
  }
  return { type: "cluster", name: input };
}

async function main(): Promise<void> {
  const filterArg = process.argv[2];
  if (!filterArg) {
    console.error("Usage: npx tsx scripts/enrich-leads.ts <cluster-name | status:value> [--force]");
    console.error('Examples:');
    console.error('  npx tsx scripts/enrich-leads.ts Niagara');
    console.error('  npx tsx scripts/enrich-leads.ts "status:new_lead"');
    console.error('  npx tsx scripts/enrich-leads.ts "status:no_email" --force');
    process.exitCode = 1;
    return;
  }

  const force = process.argv.includes("--force");
  const filter = parseFilter(filterArg);
  const convex = new ConvexHttpClient(getConvexUrl());

  // Resolve leads matching the filter
  let leads: LeadSummary[];
  let filterDescription: string;

  if (filter.type === "cluster") {
    // Look up cluster by name
    // @ts-expect-error — deep type instantiation in generated Convex API types
    const clusters: Array<{ _id: string; name: string; leadCount: number }> = await convex.query(api.clusters.list, {});
    const match = clusters.find(
      (c) => c.name.toLowerCase() === filter.name.toLowerCase(),
    );
    if (!match) {
      const available = clusters.map((c) => c.name).join(", ");
      console.error(`Cluster "${filter.name}" not found. Available clusters: ${available || "(none)"}`);
      process.exitCode = 1;
      return;
    }
    filterDescription = `cluster "${match.name}"`;

    // @ts-expect-error — deep type instantiation in generated Convex API types
    leads = await convex.query(api.leads.listAllSummary, {});
    leads = leads.filter((l) => l.clusterId === match._id);
  } else {
    filterDescription = `status:${filter.status}`;

    // @ts-expect-error — deep type instantiation in generated Convex API types
    leads = await convex.query(api.leads.listAllSummary, {});
    leads = leads.filter((l) => l.status === filter.status);
  }

  if (leads.length === 0) {
    console.log(`No leads found matching ${filterDescription}.`);
    return;
  }

  console.log(`Found ${leads.length} leads matching ${filterDescription}.`);
  console.log(`Enriching${force ? " (force mode)" : ""}...\n`);

  // Batch enrich — API caps at 25 per call, so chunk if needed
  const BATCH_SIZE = 25;
  let totalSucceeded = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let totalEmailsFound = 0;
  let totalNoEmail = 0;
  const errors: Array<{ leadId: string; error: string }> = [];

  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    const batch = leads.slice(i, i + BATCH_SIZE);
    const leadIds = batch.map((l) => l._id);

    if (leads.length > BATCH_SIZE) {
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(leads.length / BATCH_SIZE)}...`);
    }

    // @ts-expect-error — deep type instantiation in generated Convex API types
    const enrichRef = api.enrichment.batchEnrichPublic.batchEnrich;
    const result: BatchResult = await convex.action(enrichRef, {
      leadIds,
      force,
    });

    totalSucceeded += result.succeeded;
    totalFailed += result.failed;
    totalSkipped += result.skipped;

    for (const r of result.results) {
      if (r.status === "success") {
        if (r.summary.emailFound) {
          totalEmailsFound++;
        }
        if (r.summary.status === "no_email" && !r.summary.skipped) {
          totalNoEmail++;
        }
      } else {
        errors.push({ leadId: r.leadId, error: r.error });
      }
    }
  }

  console.log(`\nResults:`);
  console.log(`  Leads enriched:   ${totalSucceeded}`);
  console.log(`  Emails found:     ${totalEmailsFound}`);
  console.log(`  No email:         ${totalNoEmail}`);
  console.log(`  Skipped:          ${totalSkipped}`);
  console.log(`  Errors:           ${totalFailed}`);

  if (errors.length > 0) {
    console.log(`\nErrors:`);
    for (const e of errors) {
      console.log(`  ${e.leadId}: ${e.error}`);
    }
  }
}

main().catch((error: unknown) => {
  console.error("Lead enrichment failed:", error);
  process.exitCode = 1;
});
