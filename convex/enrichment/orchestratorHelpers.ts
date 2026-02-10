import { v } from "convex/values";

import { internalMutation } from "../_generated/server";

export const logActivity = internalMutation({
  args: {
    leadId: v.id("leads"),
    type: v.union(
      v.literal("enrichment_started"),
      v.literal("enrichment_finished"),
      v.literal("enrichment_skipped"),
      v.literal("enrichment_source_added"),
    ),
    description: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (lead === null) {
      throw new Error("Lead not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.leadId, { updatedAt: now });

    const activity: {
      leadId: typeof args.leadId;
      type: typeof args.type;
      description: string;
      createdAt: number;
      metadata?: unknown;
    } = {
      leadId: args.leadId,
      type: args.type,
      description: args.description,
      createdAt: now,
    };

    if (args.metadata !== undefined) {
      activity.metadata = args.metadata;
    }

    return ctx.db.insert("activities", activity);
  },
});
