import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { listActivitiesPage } from "./lib/activitiesList";

export const listByLead = query({
  args: {
    leadId: v.id("leads"),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_leadId", (q) => q.eq("leadId", args.leadId))
      .collect();

    return listActivitiesPage(activities, {
      cursor: args.cursor,
      pageSize: 20,
    });
  },
});

export const enrichmentProgress = query({
  args: {
    leadIds: v.array(v.id("leads")),
    since: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.leadIds.length === 0) {
      return { started: 0, finished: 0, skipped: 0, total: 0 };
    }

    let started = 0;
    let finished = 0;
    let skipped = 0;

    for (const leadId of args.leadIds) {
      const activities = await ctx.db
        .query("activities")
        .withIndex("by_leadId", (q) => q.eq("leadId", leadId))
        .collect();

      for (const activity of activities) {
        if (activity.createdAt < args.since) continue;

        if (activity.type === "enrichment_started") started++;
        else if (activity.type === "enrichment_finished") finished++;
        else if (activity.type === "enrichment_skipped") skipped++;
      }
    }

    return { started, finished, skipped, total: args.leadIds.length };
  },
});

export const create = mutation({
  args: {
    leadId: v.id("leads"),
    type: v.union(
      v.literal("note_added"),
      v.literal("phone_call"),
      v.literal("social_dm_sent"),
      v.literal("social_dm_replied"),
      v.literal("social_commented"),
      v.literal("social_followed"),
    ),
    description: v.string(),
    channel: v.optional(
      v.union(
        v.literal("phone"),
        v.literal("facebook"),
        v.literal("instagram"),
      ),
    ),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (lead === null) {
      throw new Error("Lead not found");
    }

    const now = Date.now();

    // Auto-advance lead status to "replied" when logging a social DM reply
    const advanceToReplied = new Set([
      "outreach_started",
      "no_response",
      "bounced",
      "no_email",
    ]);
    if (args.type === "social_dm_replied" && advanceToReplied.has(lead.status)) {
      await ctx.db.patch(args.leadId, { status: "replied", updatedAt: now });
      await ctx.db.insert("activities", {
        leadId: args.leadId,
        type: "status_changed",
        description: `Lead status changed from ${lead.status} to replied`,
        metadata: { oldStatus: lead.status, newStatus: "replied" },
        createdAt: now,
      });
    } else {
      await ctx.db.patch(args.leadId, { updatedAt: now });
    }

    const activity: {
      leadId: typeof args.leadId;
      type: typeof args.type;
      description: string;
      createdAt: number;
      channel?: "phone" | "facebook" | "instagram";
      metadata?: unknown;
    } = {
      leadId: args.leadId,
      type: args.type,
      description: args.description,
      createdAt: now,
    };

    if (args.channel !== undefined) {
      activity.channel = args.channel;
    }

    if (args.metadata !== undefined) {
      activity.metadata = args.metadata;
    }

    return ctx.db.insert("activities", activity);
  },
});
