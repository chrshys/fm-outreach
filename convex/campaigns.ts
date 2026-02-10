import { v } from "convex/values"

import { mutation, query } from "./_generated/server"

export const get = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.campaignId)
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    templateIds: v.array(v.id("emailTemplates")),
    targetClusterId: v.optional(v.id("clusters")),
    targetFilter: v.optional(v.any()),
    targetLeadIds: v.optional(v.array(v.id("leads"))),
    leadCount: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return ctx.db.insert("campaigns", {
      name: args.name,
      status: "draft",
      templateIds: args.templateIds,
      targetClusterId: args.targetClusterId,
      targetFilter: args.targetFilter,
      targetLeadIds: args.targetLeadIds,
      leadCount: args.leadCount,
      createdAt: now,
      updatedAt: now,
    })
  },
})

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
