import { v } from "convex/values"

import { query } from "./_generated/server"

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("clusters").collect()
  },
})

export const getLeads = query({
  args: {
    clusterId: v.id("clusters"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("leads")
      .withIndex("by_clusterId", (q) => q.eq("clusterId", args.clusterId))
      .collect()
  },
})
