import { v } from "convex/values";

import { action } from "../_generated/server";
import { createCampaign } from "./client";

/**
 * Create a campaign in Smartlead.
 * Returns the Smartlead campaign id and name so it can be verified in the dashboard.
 */
export const createTestCampaign = action({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const campaignName =
      args.name ?? `FM Test Campaign ${new Date().toISOString().slice(0, 16)}`;

    const result = await createCampaign(campaignName);

    console.log(
      `[smartlead] Created test campaign: id=${result.id} name="${result.name}"`,
    );

    return {
      smartleadCampaignId: result.id,
      name: result.name,
    };
  },
});
