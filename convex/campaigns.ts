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

export const listLeads = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId)
    if (!campaign) return []

    const leadIds = campaign.targetLeadIds ?? []

    // Fetch emails for this campaign via smartleadCampaignId
    const emailsByLead = new Map<
      string,
      {
        sequenceStep: number
        status: "sent" | "opened" | "replied" | "bounced"
        lastActivityAt: number
      }
    >()

    if (campaign.smartleadCampaignId) {
      const emails = await ctx.db
        .query("emails")
        .withIndex("by_smartleadCampaignId", (q) =>
          q.eq("smartleadCampaignId", campaign.smartleadCampaignId!),
        )
        .collect()

      for (const email of emails) {
        const existing = emailsByLead.get(email.leadId)
        // Keep the highest sequence step per lead
        if (!existing || email.sequenceStep > existing.sequenceStep) {
          let status: "sent" | "opened" | "replied" | "bounced" = "sent"
          let lastActivityAt = email.sentAt
          if (email.bouncedAt) {
            status = "bounced"
            lastActivityAt = Math.max(lastActivityAt, email.bouncedAt)
          } else if (email.repliedAt) {
            status = "replied"
            lastActivityAt = Math.max(lastActivityAt, email.repliedAt)
          } else if (email.openedAt) {
            status = "opened"
            lastActivityAt = Math.max(lastActivityAt, email.openedAt)
          }
          emailsByLead.set(email.leadId, {
            sequenceStep: email.sequenceStep,
            status,
            lastActivityAt,
          })
        }
      }
    }

    const results = []
    for (const leadId of leadIds) {
      const lead = await ctx.db.get(leadId)
      if (!lead) continue
      const emailData = emailsByLead.get(leadId)
      results.push({
        _id: lead._id,
        name: lead.name,
        contactEmail: lead.contactEmail,
        sequenceStep: emailData?.sequenceStep ?? 0,
        status: emailData?.status ?? ("pending" as const),
        lastActivityAt: emailData?.lastActivityAt,
      })
    }

    return results
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
