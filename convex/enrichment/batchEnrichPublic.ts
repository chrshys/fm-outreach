import { v } from "convex/values";

import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import type { BatchEnrichmentResult } from "./batchEnrich";

export const batchEnrich = action({
  args: {
    leadIds: v.array(v.id("leads")),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<BatchEnrichmentResult> => {
    return await ctx.runAction(internal.enrichment.batchEnrich.batchEnrichLeads, {
      leadIds: args.leadIds,
      force: args.force,
    });
  },
});
