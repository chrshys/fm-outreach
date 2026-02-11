import { v } from "convex/values";

import { api, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { action, internalMutation } from "../_generated/server";
import { updateCampaignStatus } from "../smartlead/client";

// --- Internal mutation ---

export const setCampaignActive = internalMutation({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.campaignId, {
      status: "active",
      updatedAt: Date.now(),
    });
  },
});

// --- Main action ---

export const launchCampaign = action({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args): Promise<void> => {
    // 1. Load campaign and validate
    // @ts-ignore TS2589 nondeterministic deep type instantiation in generated Convex API types
    const campaign = (await ctx.runQuery(api.campaigns.get, {
      campaignId: args.campaignId,
    })) as Doc<"campaigns"> | null;
    if (!campaign) {
      throw new Error("Campaign not found");
    }
    if (campaign.status !== "pushed") {
      throw new Error(
        `Campaign is "${campaign.status}" — only pushed campaigns can be launched`,
      );
    }
    if (!campaign.smartleadCampaignId) {
      throw new Error("Campaign has no Smartlead ID — push it first");
    }

    // 2. Start the campaign in Smartlead
    console.log(
      `[launchCampaign] Starting Smartlead campaign ${campaign.smartleadCampaignId}`,
    );
    await updateCampaignStatus(
      Number(campaign.smartleadCampaignId),
      "START",
    );

    // 3. Update local status to active
    // @ts-ignore TS2589 nondeterministic deep type instantiation in generated Convex API types
    await ctx.runMutation(internal.campaigns.launchCampaign.setCampaignActive, {
      campaignId: args.campaignId,
    });

    console.log(
      `[launchCampaign] Campaign ${campaign.smartleadCampaignId} launched successfully`,
    );
  },
});
