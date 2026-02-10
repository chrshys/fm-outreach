import { v } from "convex/values";

import { internalMutation, query } from "../_generated/server";

export const unsubscribe = internalMutation({
  args: {
    email: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();
    if (!normalizedEmail) {
      throw new Error("Email is required");
    }

    // Idempotent: check if already on block list
    const existing = await ctx.db
      .query("emailBlockList")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (existing) {
      return { alreadyBlocked: true };
    }

    const now = Date.now();

    await ctx.db.insert("emailBlockList", {
      email: normalizedEmail,
      reason: args.reason ?? "unsubscribed",
      blockedAt: now,
    });

    // Update any matching lead to declined status
    const leads = await ctx.db.query("leads").collect();
    const lead = leads.find(
      (l) => l.contactEmail?.toLowerCase() === normalizedEmail,
    );

    if (lead && lead.status !== "declined") {
      await ctx.db.patch(lead._id, {
        status: "declined",
        updatedAt: now,
      });

      await ctx.db.insert("activities", {
        leadId: lead._id,
        type: "status_changed",
        description: `Lead status changed from ${lead.status} to declined (unsubscribed)`,
        metadata: {
          oldStatus: lead.status,
          newStatus: "declined",
          reason: args.reason ?? "unsubscribed",
        },
        createdAt: now,
      });
    }

    return { alreadyBlocked: false };
  },
});

export const isUnsubscribed = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();
    if (!normalizedEmail) {
      return false;
    }

    const entry = await ctx.db
      .query("emailBlockList")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    return entry !== null;
  },
});
