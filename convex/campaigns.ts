import { v } from "convex/values"

import { mutation, query } from "./_generated/server"

export const get = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.campaignId)
  },
})

export const getWithLeads = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId)
    if (!campaign) return null

    const leadIds = campaign.targetLeadIds ?? []

    // Build per-lead email data by joining emails table via smartleadCampaignId
    const emailsByLead = new Map<
      string,
      Array<{
        sequenceStep: number
        sentAt: number
        openedAt: number | undefined
        clickedAt: number | undefined
        repliedAt: number | undefined
        bouncedAt: number | undefined
      }>
    >()

    if (campaign.smartleadCampaignId) {
      const emails = await ctx.db
        .query("emails")
        .withIndex("by_smartleadCampaignId", (q) =>
          q.eq("smartleadCampaignId", campaign.smartleadCampaignId!),
        )
        .collect()

      for (const email of emails) {
        const existing = emailsByLead.get(email.leadId) ?? []
        existing.push({
          sequenceStep: email.sequenceStep,
          sentAt: email.sentAt,
          openedAt: email.openedAt,
          clickedAt: email.clickedAt,
          repliedAt: email.repliedAt,
          bouncedAt: email.bouncedAt,
        })
        emailsByLead.set(email.leadId, existing)
      }
    }

    const leads = []
    for (const leadId of leadIds) {
      const lead = await ctx.db.get(leadId)
      if (!lead) continue

      const leadEmails = emailsByLead.get(leadId) ?? []
      // Sort by sequence step ascending
      leadEmails.sort((a, b) => a.sequenceStep - b.sequenceStep)

      // Derive current status from the latest sequence step email
      const latest = leadEmails[leadEmails.length - 1]
      let status: "pending" | "sent" | "opened" | "clicked" | "replied" | "bounced" = "pending"
      if (latest) {
        status = "sent"
        if (latest.bouncedAt) {
          status = "bounced"
        } else if (latest.repliedAt) {
          status = "replied"
        } else if (latest.clickedAt) {
          status = "clicked"
        } else if (latest.openedAt) {
          status = "opened"
        }
      }

      leads.push({
        _id: lead._id,
        name: lead.name,
        contactEmail: lead.contactEmail,
        status,
        sequenceStep: latest?.sequenceStep ?? 0,
        emails: leadEmails,
      })
    }

    return { ...campaign, leads }
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
        repliedAt: number | undefined
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
          // Preserve repliedAt from any earlier email if this one has none
          const repliedAt = email.repliedAt ?? existing?.repliedAt
          emailsByLead.set(email.leadId, {
            sequenceStep: email.sequenceStep,
            status: repliedAt ? "replied" : status,
            lastActivityAt,
            repliedAt,
          })
        } else if (email.repliedAt && !existing.repliedAt) {
          // An earlier sequence step has a reply — carry it forward
          existing.repliedAt = email.repliedAt
          existing.status = "replied"
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
        repliedAt: emailData?.repliedAt,
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
