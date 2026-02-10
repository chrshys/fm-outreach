import { v } from "convex/values"

import { mutation, query } from "./_generated/server"
import { defaultTemplates } from "./seeds/seedTemplates"

const SEQUENCE_ORDER = ["initial", "follow_up_1", "follow_up_2", "follow_up_3"] as const

const sequenceTypeValidator = v.union(
  v.literal("initial"),
  v.literal("follow_up_1"),
  v.literal("follow_up_2"),
  v.literal("follow_up_3"),
)

export const get = query({
  args: { id: v.id("emailTemplates") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id)
  },
})

export const list = query({
  args: {},
  handler: async (ctx) => {
    const templates = await ctx.db.query("emailTemplates").collect()
    return templates.sort(
      (a, b) =>
        SEQUENCE_ORDER.indexOf(a.sequenceType) -
        SEQUENCE_ORDER.indexOf(b.sequenceType),
    )
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    sequenceType: sequenceTypeValidator,
    prompt: v.string(),
    subject: v.string(),
    isDefault: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (args.isDefault) {
      const existing = await ctx.db.query("emailTemplates").collect()
      const currentDefault = existing.find(
        (t) => t.sequenceType === args.sequenceType && t.isDefault,
      )
      if (currentDefault) {
        await ctx.db.patch(currentDefault._id, { isDefault: false })
      }
    }
    return ctx.db.insert("emailTemplates", {
      name: args.name,
      sequenceType: args.sequenceType,
      prompt: args.prompt,
      subject: args.subject,
      isDefault: args.isDefault,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id("emailTemplates"),
    name: v.optional(v.string()),
    sequenceType: v.optional(sequenceTypeValidator),
    prompt: v.optional(v.string()),
    subject: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.id)
    if (template === null) {
      throw new Error("Template not found")
    }
    const { id, ...fields } = args
    const patch: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        patch[key] = value
      }
    }
    if (patch.isDefault === true) {
      const sequenceType = (patch.sequenceType as string) ?? template.sequenceType
      const existing = await ctx.db.query("emailTemplates").collect()
      const currentDefault = existing.find(
        (t) => t.sequenceType === sequenceType && t.isDefault && t._id !== id,
      )
      if (currentDefault) {
        await ctx.db.patch(currentDefault._id, { isDefault: false })
      }
    }
    await ctx.db.patch(id, patch)
  },
})

export const remove = mutation({
  args: { id: v.id("emailTemplates") },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.id)
    if (template === null) {
      throw new Error("Template not found")
    }
    await ctx.db.delete(args.id)
  },
})

export const ensureSeeded = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("emailTemplates").collect()
    if (existing.length > 0) {
      return { inserted: 0, skipped: existing.length }
    }

    let inserted = 0
    for (const template of defaultTemplates) {
      await ctx.db.insert("emailTemplates", {
        name: template.name,
        sequenceType: template.sequenceType,
        prompt: template.prompt,
        subject: template.subject,
        isDefault: template.isDefault,
      })
      inserted += 1
    }
    return { inserted, skipped: 0 }
  },
})
