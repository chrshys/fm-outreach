/**
 * Print a formatted terminal report of campaign statuses.
 *
 * Run with: npx tsx scripts/campaign-status.ts
 */
import { ConvexHttpClient } from "convex/browser";

import { api } from "../convex/_generated/api";
import { formatCampaignStatusReport } from "./lib/formatCampaignStatus";

function getConvexUrl(): string {
  const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Missing CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable");
  }
  return convexUrl;
}

async function main(): Promise<void> {
  const convex = new ConvexHttpClient(getConvexUrl());

  console.log("Fetching campaign status...\n");

  // @ts-expect-error — deep type instantiation in generated Convex API types
  const campaigns = await convex.query(api.campaigns.listStatus);

  const report = formatCampaignStatusReport(campaigns);

  console.log(report);
}

main().catch((error: unknown) => {
  console.error("Failed to fetch campaign status:", error);
  process.exitCode = 1;
});
