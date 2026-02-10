import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";
import { getCampaignAnalytics } from "./client";

// --- Internal query: get active campaigns with smartleadCampaignId ---

export const getActiveCampaigns = internalMutation({
  args: {},
  handler: async (ctx) => {
    const campaigns = await ctx.db
      .query("campaigns")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    return campaigns
      .filter((c) => c.smartleadCampaignId)
      .map((c) => ({
        _id: c._id,
        smartleadCampaignId: c.smartleadCampaignId!,
      }));
  },
});

// --- Internal mutation: update campaign stats ---

export const updateCampaignStats = internalMutation({
  args: {
    campaignId: v.id("campaigns"),
    stats: v.object({
      sent: v.number(),
      opened: v.number(),
      clicked: v.number(),
      replied: v.number(),
      bounced: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.campaignId, {
      stats: args.stats,
      updatedAt: Date.now(),
    });
  },
});

// --- Action: sync analytics for all active campaigns ---

export const syncAnalytics = internalAction({
  args: {},
  handler: async (ctx) => {
    const campaigns = await ctx.runMutation(
      internal.smartlead.analyticsCron.getActiveCampaigns,
    );

    if (campaigns.length === 0) {
      console.log("[analyticsCron] No active campaigns to sync");
      return;
    }

    console.log(
      `[analyticsCron] Syncing analytics for ${campaigns.length} campaign(s)`,
    );

    for (const campaign of campaigns) {
      try {
        const analytics = await getCampaignAnalytics(
          Number(campaign.smartleadCampaignId),
        );

        await ctx.runMutation(
          internal.smartlead.analyticsCron.updateCampaignStats,
          {
            campaignId: campaign._id,
            stats: {
              sent: analytics.sent_count ?? 0,
              opened: analytics.open_count ?? 0,
              clicked: analytics.click_count ?? 0,
              replied: analytics.reply_count ?? 0,
              bounced: analytics.bounce_count ?? 0,
            },
          },
        );

        console.log(
          `[analyticsCron] Updated stats for campaign ${campaign.smartleadCampaignId}`,
        );
      } catch (error) {
        console.error(
          `[analyticsCron] Failed to sync campaign ${campaign.smartleadCampaignId}:`,
          error,
        );
      }
    }
  },
});
