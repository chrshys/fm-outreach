/**
 * Discover new leads via Google Places for a given region.
 *
 * Run with: npx tsx scripts/discover-leads.ts <region> [province]
 *
 * Examples:
 *   npx tsx scripts/discover-leads.ts Niagara
 *   npx tsx scripts/discover-leads.ts "Prince Edward County" Ontario
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

async function main(): Promise<void> {
  const region = process.argv[2];
  if (!region) {
    console.error("Usage: npx tsx scripts/discover-leads.ts <region> [province]");
    console.error('Example: npx tsx scripts/discover-leads.ts Niagara');
    process.exitCode = 1;
    return;
  }

  const province = process.argv[3] ?? undefined;

  const convex = new ConvexHttpClient(getConvexUrl());

  console.log(`Discovering leads in ${region}${province ? `, ${province}` : ""}...`);

  const discoverRef = api.discovery.discoverLeads.discoverLeads;
  const result = await convex.action(discoverRef, {
    region,
    ...(province ? { province } : {}),
  });

  console.log(`\nResults:`);
  console.log(`  New leads found:     ${result.newLeads}`);
  console.log(`  Duplicates skipped:  ${result.duplicatesSkipped}`);
  console.log(`  Total in database:   ${result.totalInDatabase}`);
}

main().catch((error: unknown) => {
  console.error("Lead discovery failed:", error);
  process.exitCode = 1;
});
