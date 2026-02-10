import { v } from "convex/values"

import { mutation, query } from "./_generated/server"

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique()
    return setting?.value ?? null
  },
})

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("settings").collect()
  },
})

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("settings").collect()
    return Object.fromEntries(rows.map((row) => [row.key, row.value]))
  },
})

export const set = mutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value })
    } else {
      await ctx.db.insert("settings", { key: args.key, value: args.value })
    }
  },
})

export const setBatch = mutation({
  args: { items: v.array(v.object({ key: v.string(), value: v.string() })) },
  handler: async (ctx, args) => {
    for (const item of args.items) {
      const existing = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", item.key))
        .unique()
      if (existing) {
        await ctx.db.patch(existing._id, { value: item.value })
      } else {
        await ctx.db.insert("settings", { key: item.key, value: item.value })
      }
    }
  },
})

export const remove = mutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique()
    if (existing) {
      await ctx.db.delete(existing._id)
    }
  },
})
