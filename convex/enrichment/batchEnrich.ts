import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import type { EnrichmentSummary } from "./orchestrator";

const MAX_BATCH_SIZE = 25;
const DELAY_BETWEEN_LEADS_MS = 1000;

export type BatchEnrichmentResult = {
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  results: Array<
    | { leadId: string; status: "success"; summary: EnrichmentSummary }
    | { leadId: string; status: "error"; error: string }
  >;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const batchEnrichLeads = internalAction({
  args: {
    leadIds: v.array(v.id("leads")),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<BatchEnrichmentResult> => {
    const leadIds = args.leadIds.slice(0, MAX_BATCH_SIZE);
    const force = args.force ?? false;

    const results: BatchEnrichmentResult["results"] = [];
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < leadIds.length; i++) {
      const leadId = leadIds[i];

      try {
        const summary: EnrichmentSummary = await ctx.runAction(
          internal.enrichment.orchestrator.enrichLead,
          { leadId, force },
        );

        results.push({ leadId, status: "success", summary });

        if (summary.skipped) {
          skipped++;
        } else {
          succeeded++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({ leadId, status: "error", error: message });
        failed++;
      }

      // Delay between leads (skip after last one)
      if (i < leadIds.length - 1) {
        await sleep(DELAY_BETWEEN_LEADS_MS);
      }
    }

    return {
      total: leadIds.length,
      succeeded,
      failed,
      skipped,
      results,
    };
  },
});
