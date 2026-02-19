import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { listLeadsPage, matchesFilters } from "./lib/leadsList";
import { searchLeads } from "./lib/searchLeads";

const leadStatusValidator = v.union(
  v.literal("new_lead"),
  v.literal("enriched"),
  v.literal("outreach_started"),
  v.literal("replied"),
  v.literal("meeting_booked"),
  v.literal("onboarded"),
  v.literal("declined"),
  v.literal("not_interested"),
  v.literal("bounced"),
  v.literal("no_response"),
  v.literal("no_email"),
);

const leadTypeValidator = v.union(
  v.literal("farm"),
  v.literal("farmers_market"),
  v.literal("retail_store"),
  v.literal("roadside_stand"),
  v.literal("other"),
);

const leadSourceValidator = v.union(
  v.literal("spreadsheet_import"),
  v.literal("google_places"),
  v.literal("farm_directory"),
  v.literal("manual"),
  v.literal("web_scrape"),
);

const leadEnrichmentSourceValidator = v.object({
  source: v.string(),
  detail: v.optional(v.string()),
  fetchedAt: v.number(),
});

export const list = query({
  args: {
    status: v.optional(leadStatusValidator),
    type: v.optional(leadTypeValidator),
    clusterId: v.optional(v.id("clusters")),
    hasEmail: v.optional(v.boolean()),
    hasSocial: v.optional(v.boolean()),
    hasFacebook: v.optional(v.boolean()),
    hasInstagram: v.optional(v.boolean()),
    source: v.optional(leadSourceValidator),
    needsFollowUp: v.optional(v.boolean()),
    sortBy: v.optional(
      v.union(v.literal("name"), v.literal("city"), v.literal("status"), v.literal("updatedAt")),
    ),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const allLeads = await ctx.db.query("leads").collect();

    return listLeadsPage(allLeads, {
      filters: {
        status: args.status,
        type: args.type,
        clusterId: args.clusterId,
        hasEmail: args.hasEmail,
        hasSocial: args.hasSocial,
        hasFacebook: args.hasFacebook,
        hasInstagram: args.hasInstagram,
        source: args.source,
        needsFollowUp: args.needsFollowUp,
        now: Date.now(),
      },
      sortBy: args.sortBy,
      sortOrder: args.sortOrder,
      cursor: args.cursor,
      pageSize: 50,
    });
  },
});

export const listForExport = query({
  args: {
    status: v.optional(leadStatusValidator),
    type: v.optional(leadTypeValidator),
    clusterId: v.optional(v.id("clusters")),
    hasEmail: v.optional(v.boolean()),
    hasSocial: v.optional(v.boolean()),
    hasFacebook: v.optional(v.boolean()),
    hasInstagram: v.optional(v.boolean()),
    source: v.optional(leadSourceValidator),
    needsFollowUp: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const allLeads = await ctx.db.query("leads").collect();

    return allLeads
      .filter((lead) =>
        matchesFilters(lead, {
          status: args.status,
          type: args.type,
          clusterId: args.clusterId,
          hasEmail: args.hasEmail,
          hasSocial: args.hasSocial,
          hasFacebook: args.hasFacebook,
          hasInstagram: args.hasInstagram,
          source: args.source,
          needsFollowUp: args.needsFollowUp,
          now: Date.now(),
        }),
      )
      .map((lead) => ({
        name: lead.name,
        type: lead.type,
        farmDescription: lead.farmDescription,
        contactPhone: lead.contactPhone,
        address: lead.address,
        city: lead.city,
        region: lead.region,
        province: lead.province,
        postalCode: lead.postalCode,
        countryCode: lead.countryCode,
        latitude: lead.latitude,
        longitude: lead.longitude,
        placeId: lead.placeId,
        website: lead.website,
        socialLinks: lead.socialLinks,
        products: lead.products,
      }));
  },
});

export const search = query({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const allLeads = await ctx.db.query("leads").collect();
    return searchLeads(allLeads, args.text, 50);
  },
});

export const get = query({
  args: {
    leadId: v.id("leads"),
  },
  handler: async (ctx, args) => {
    return ctx.db.get(args.leadId);
  },
});

export const update = mutation({
  args: {
    leadId: v.id("leads"),
    name: v.optional(v.string()),
    type: v.optional(leadTypeValidator),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    region: v.optional(v.string()),
    province: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    placeId: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    website: v.optional(v.string()),
    socialLinks: v.optional(
      v.object({
        instagram: v.optional(v.string()),
        facebook: v.optional(v.string()),
      }),
    ),
    products: v.optional(v.array(v.string())),
    salesChannels: v.optional(v.array(v.string())),
    sellsOnline: v.optional(v.boolean()),
    farmDescription: v.optional(v.string()),
    notes: v.optional(v.string()),
    source: v.optional(leadSourceValidator),
    sourceDetail: v.optional(v.string()),
    consentSource: v.optional(v.string()),
    status: v.optional(leadStatusValidator),
    clusterId: v.optional(v.id("clusters")),
    smartleadLeadId: v.optional(v.string()),
    smartleadCampaignId: v.optional(v.string()),
    enrichedAt: v.optional(v.number()),
    lastVerifiedAt: v.optional(v.number()),
    enrichmentVersion: v.optional(v.string()),
    enrichmentSources: v.optional(v.array(leadEnrichmentSourceValidator)),
    enrichmentData: v.optional(v.any()),
    nextFollowUpAt: v.optional(v.number()),
    followUpCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (lead === null) {
      throw new Error("Lead not found");
    }

    const now = Date.now();
    const shouldLogStatusChange = args.status !== undefined && args.status !== lead.status;

    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args)) {
      if (key !== "leadId" && value !== undefined) {
        patch[key] = value;
      }
    }

    if (args.socialLinks !== undefined) {
      patch.socialLinks = {
        ...lead.socialLinks,
        ...args.socialLinks,
      };
    }

    patch.updatedAt = now;
    await ctx.db.patch(args.leadId, patch);

    if (shouldLogStatusChange) {
      await ctx.db.insert("activities", {
        leadId: args.leadId,
        type: "status_changed",
        description: `Lead status changed from ${lead.status} to ${args.status}`,
        metadata: {
          oldStatus: lead.status,
          newStatus: args.status,
        },
        createdAt: now,
      });
    }
  },
});

export const updateStatus = mutation({
  args: {
    leadId: v.id("leads"),
    status: leadStatusValidator,
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (lead === null) {
      throw new Error("Lead not found");
    }

    if (lead.status === args.status) {
      return {
        updated: false,
      };
    }

    const now = Date.now();

    await ctx.db.patch(args.leadId, {
      status: args.status,
      updatedAt: now,
    });

    await ctx.db.insert("activities", {
      leadId: args.leadId,
      type: "status_changed",
      description: `Lead status changed from ${lead.status} to ${args.status}`,
      metadata: {
        oldStatus: lead.status,
        newStatus: args.status,
      },
      createdAt: now,
    });

    return {
      updated: true,
    };
  },
});

export const setFollowUp = mutation({
  args: {
    leadId: v.id("leads"),
    nextFollowUpAt: v.number(),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (lead === null) {
      throw new Error("Lead not found");
    }

    const now = Date.now();

    await ctx.db.patch(args.leadId, {
      nextFollowUpAt: args.nextFollowUpAt,
      updatedAt: now,
    });

    const followUpDate = new Date(args.nextFollowUpAt).toISOString().slice(0, 10);

    await ctx.db.insert("activities", {
      leadId: args.leadId,
      type: "note_added",
      description: `Follow-up reminder set for ${followUpDate}`,
      metadata: {
        nextFollowUpAt: args.nextFollowUpAt,
      },
      createdAt: now,
    });

    return {
      updated: true,
    };
  },
});

export const bulkUpdateStatus = mutation({
  args: {
    leadIds: v.array(v.id("leads")),
    status: leadStatusValidator,
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const uniqueLeadIds = [...new Set(args.leadIds)];

    for (const leadId of uniqueLeadIds) {
      await ctx.db.patch(leadId, {
        status: args.status,
        updatedAt: now,
      });

      await ctx.db.insert("activities", {
        leadId,
        type: "status_changed",
        description: `Lead status changed to ${args.status}`,
        metadata: {
          status: args.status,
        },
        createdAt: now,
      });
    }

    return {
      updatedCount: uniqueLeadIds.length,
    };
  },
});

export const listWithCoords = query({
  args: {},
  handler: async (ctx) => {
    const allLeads = await ctx.db.query("leads").collect();
    return allLeads
      .filter(
        (lead) =>
          lead.latitude !== undefined && lead.longitude !== undefined,
      )
      .map((lead) => ({
        _id: lead._id,
        name: lead.name,
        type: lead.type,
        city: lead.city,
        status: lead.status,
        contactEmail: lead.contactEmail,
        latitude: lead.latitude as number,
        longitude: lead.longitude as number,
        clusterId: lead.clusterId,
      }));
  },
});

export const listByCluster = query({
  args: {
    clusterId: v.id("clusters"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("leads")
      .withIndex("by_clusterId", (q) => q.eq("clusterId", args.clusterId))
      .collect();
  },
});

export const listAllSummary = query({
  args: {},
  handler: async (ctx) => {
    const allLeads = await ctx.db.query("leads").collect();
    return allLeads
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((lead) => ({
        _id: lead._id,
        name: lead.name,
        type: lead.type,
        city: lead.city,
        region: lead.region,
        status: lead.status,
        contactEmail: lead.contactEmail,
        clusterId: lead.clusterId,
      }));
  },
});

const socialActivityTypes = [
  "social_dm_sent",
  "social_dm_replied",
  "social_followed",
  "social_commented",
] as const;

const outreachNoReplyStatuses = new Set([
  "outreach_started",
  "no_response",
  "bounced",
]);

export const listSocialOutreach = query({
  args: {},
  handler: async (ctx) => {
    const allLeads = await ctx.db.query("leads").collect();

    const hasSocialLinks = (lead: typeof allLeads[number]) => {
      const ig = lead.socialLinks?.instagram?.trim();
      const fb = lead.socialLinks?.facebook?.trim();
      return Boolean(ig) || Boolean(fb);
    };

    const socialLeads = allLeads.filter(
      (lead) =>
        hasSocialLinks(lead) &&
        (lead.status === "no_email" || outreachNoReplyStatuses.has(lead.status)),
    );

    const results = await Promise.all(
      socialLeads.map(async (lead) => {
        const activities = await ctx.db
          .query("activities")
          .withIndex("by_leadId", (q) => q.eq("leadId", lead._id))
          .collect();

        const socialActivities = activities.filter((a) =>
          (socialActivityTypes as readonly string[]).includes(a.type),
        );

        const lastSocialTouch =
          socialActivities.length > 0
            ? Math.max(...socialActivities.map((a) => a.createdAt))
            : undefined;

        return {
          _id: lead._id,
          name: lead.name,
          city: lead.city,
          status: lead.status,
          socialLinks: lead.socialLinks,
          nextFollowUpAt: lead.nextFollowUpAt,
          lastSocialTouch,
        };
      }),
    );

    // Sort by follow-up due date — overdue first, then soonest, then no date
    const now = Date.now();
    results.sort((a, b) => {
      const aDate = a.nextFollowUpAt;
      const bDate = b.nextFollowUpAt;

      if (aDate === undefined && bDate === undefined) return 0;
      if (aDate === undefined) return 1;
      if (bDate === undefined) return -1;

      const aOverdue = aDate < now;
      const bOverdue = bDate < now;

      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      return aDate - bDate;
    });

    return results;
  },
});

export const bulkAssignCluster = mutation({
  args: {
    leadIds: v.array(v.id("leads")),
    clusterId: v.id("clusters"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const uniqueLeadIds = [...new Set(args.leadIds)];

    for (const leadId of uniqueLeadIds) {
      await ctx.db.patch(leadId, {
        clusterId: args.clusterId,
        updatedAt: now,
      });

      await ctx.db.insert("activities", {
        leadId,
        type: "note_added",
        description: `Lead assigned to cluster ${args.clusterId}`,
        metadata: {
          clusterId: args.clusterId,
        },
        createdAt: now,
      });
    }

    return {
      updatedCount: uniqueLeadIds.length,
    };
  },
});
