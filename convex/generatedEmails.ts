import { v } from "convex/values"

import { mutation, query } from "./_generated/server"

export const listByCampaign = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const emails = await ctx.db
      .query("generatedEmails")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .collect()

    const leadsMap = new Map<string, { name: string; contactEmail?: string }>()
    for (const email of emails) {
      if (!leadsMap.has(email.leadId)) {
        const lead = await ctx.db.get(email.leadId)
        if (lead) {
          leadsMap.set(email.leadId, {
            name: lead.name,
            contactEmail: lead.contactEmail,
          })
        }
      }
    }

    return emails.map((email) => {
      const lead = leadsMap.get(email.leadId)
      return {
        _id: email._id,
        campaignId: email.campaignId,
        leadId: email.leadId,
        templateId: email.templateId,
        subject: email.subject,
        body: email.body,
        status: email.status ?? "generated",
        generatedAt: email.generatedAt,
        leadName: lead?.name ?? "Unknown",
        leadEmail: lead?.contactEmail,
      }
    })
  },
})

export const updateEmail = mutation({
  args: {
    emailId: v.id("generatedEmails"),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.emailId, {
      subject: args.subject,
      body: args.body,
      status: "edited",
    })
  },
})

export const updateStatus = mutation({
  args: {
    emailId: v.id("generatedEmails"),
    status: v.union(
      v.literal("generated"),
      v.literal("edited"),
      v.literal("approved"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.emailId, {
      status: args.status,
    })
  },
})

export const regenerate = mutation({
  args: {
    emailId: v.id("generatedEmails"),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.emailId, {
      subject: args.subject,
      body: args.body,
      status: "generated",
      generatedAt: Date.now(),
    })
  },
})
