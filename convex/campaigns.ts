import { query } from "./_generated/server"

export const list = query({
  args: {},
  handler: async (ctx) => {
    const campaigns = await ctx.db.query("campaigns").collect()
    return campaigns
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((c) => ({
        _id: c._id,
        name: c.name,
        status: c.status,
        leadCount: c.leadCount,
        stats: c.stats,
        smartleadCampaignId: c.smartleadCampaignId,
      }))
  },
})
