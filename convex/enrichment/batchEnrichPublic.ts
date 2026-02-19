import { v } from "convex/values";

import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import type { BatchEnrichmentResult } from "./batchEnrich";

const ENRICH_CHUNK_SIZE = 25;

export const enrichCellLeads = action({
  args: {
    cellId: v.id("discoveryCells"),
  },
  handler: async (ctx, args) => {
    const leadIds = await ctx.runQuery(
      internal.discovery.gridCells.getCellLeadIdsForEnrichment,
      { cellId: args.cellId },
    );

    if (leadIds.length === 0) {
      return { leadIds: [], total: 0, succeeded: 0, failed: 0, skipped: 0 };
    }

    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < leadIds.length; i += ENRICH_CHUNK_SIZE) {
      const chunk = leadIds.slice(i, i + ENRICH_CHUNK_SIZE);
      const result: BatchEnrichmentResult = await ctx.runAction(
        internal.enrichment.batchEnrich.batchEnrichLeads,
        { leadIds: chunk },
      );
      succeeded += result.succeeded;
      failed += result.failed;
      skipped += result.skipped;
    }

    return {
      leadIds,
      total: leadIds.length,
      succeeded,
      failed,
      skipped,
    };
  },
});

export const batchEnrich = action({
  args: {
    leadIds: v.array(v.id("leads")),
    force: v.optional(v.boolean()),
    overwrite: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<BatchEnrichmentResult> => {
    return await ctx.runAction(internal.enrichment.batchEnrich.batchEnrichLeads, {
      leadIds: args.leadIds,
      force: args.force,
      overwrite: args.overwrite,
    });
  },
});
