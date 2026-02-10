/**
 * Print a formatted terminal report of outreach pipeline stats.
 *
 * Run with: npx tsx scripts/outreach-stats.ts
 */
import { ConvexHttpClient } from "convex/browser";

import { api } from "../convex/_generated/api";
import { formatOutreachReport } from "./lib/formatOutreachReport";

function getConvexUrl(): string {
  const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Missing CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable");
  }
  return convexUrl;
}

async function main(): Promise<void> {
  const convex = new ConvexHttpClient(getConvexUrl());

  console.log("Fetching outreach stats...\n");

  const pipelineP = convex.query(api.dashboard.pipelineStats);
  const emailP = convex.query(api.dashboard.emailStats);
  const socialP = convex.query(api.dashboard.socialStats);
  const campaignsP = convex.query(api.dashboard.activeCampaigns);
  const followUpsP = convex.query(api.dashboard.followUpsDue);

  const [pipeline, email, social, campaigns, followUps] = await Promise.all([
    pipelineP,
    emailP,
    socialP,
    campaignsP,
    followUpsP,
  ]);

  const report = formatOutreachReport({
    pipeline,
    email,
    social,
    campaigns,
    followUps,
  });

  console.log(report);
}

main().catch((error: unknown) => {
  console.error("Failed to fetch outreach stats:", error);
  process.exitCode = 1;
});
