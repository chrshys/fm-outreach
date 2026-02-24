import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // CSV Export Column Mapping
  // ────────────────────────
  // When exporting leads to CSV (see src/lib/csv-export.ts), the columns map
  // from schema fields as follows. Fruitland Market's directory-import
  // (CsvUploader.tsx) consumes this format via flexible header normalization.
  //
  //  CSV Column      │ Schema Field(s)              │ FM Import Field
  //  ────────────────┼──────────────────────────────┼────────────────
  //  name            │ name                         │ displayName
  //  type            │ type                         │ profileType (remapped)
  //  description     │ locationDescription          │ bio
  //  address         │ address                      │ address
  //  city            │ city                         │ city
  //  state           │ province ?? region           │ state
  //  postalCode      │ postalCode                   │ postalCode
  //  countryCode     │ countryCode                  │ countryCode
  //  latitude        │ latitude                     │ latitude
  //  longitude       │ longitude                    │ longitude
  //  placeId         │ placeId                      │ placeId
  //  website         │ website                      │ website
  //  instagram       │ socialLinks.instagram         │ instagram
  //  facebook        │ socialLinks.facebook          │ facebook
  //  products        │ products (joined with ", ")   │ products (split back)
  //  imagePrompt     │ imagePrompt                  │ imagePrompt
  //  categories      │ enrichmentData.structuredProducts │ categories
  //  hours           │ hours (JSON)                     │ hours
  //
  // Type mapping (fm-outreach → FM profileType):
  //   farm → farm, farmers_market → farmersMarket,
  //   retail_store → countryStore, roadside_stand → roadsideStand, other → other
  leads: defineTable({
    name: v.string(),
    type: v.union(
      v.literal("farm"),
      v.literal("farmers_market"),
      v.literal("retail_store"),
      v.literal("roadside_stand"),
      v.literal("other"),
    ),
    address: v.string(),
    city: v.string(),
    region: v.string(),
    province: v.string(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    placeId: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    countryCode: v.optional(v.string()),
    hours: v.optional(
      v.array(
        v.object({
          day: v.number(),
          open: v.string(),
          close: v.string(),
          isClosed: v.boolean(),
        }),
      ),
    ),
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
    locationDescription: v.optional(v.string()),
    imagePrompt: v.optional(v.string()),
    notes: v.optional(v.string()),
    source: v.union(
      v.literal("spreadsheet_import"),
      v.literal("google_places"),
      v.literal("farm_directory"),
      v.literal("manual"),
      v.literal("web_scrape"),
    ),
    sourceDetail: v.optional(v.string()),
    consentSource: v.optional(v.string()),
    status: v.union(
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
    ),
    clusterId: v.optional(v.id("clusters")),
    discoveryCellId: v.optional(v.id("discoveryCells")),
    smartleadLeadId: v.optional(v.string()),
    smartleadCampaignId: v.optional(v.string()),
    enrichedAt: v.optional(v.number()),
    lastVerifiedAt: v.optional(v.number()),
    enrichmentVersion: v.optional(v.string()),
    enrichmentSources: v.optional(
      v.array(
        v.object({
          source: v.string(),
          detail: v.optional(v.string()),
          fetchedAt: v.number(),
        }),
      ),
    ),
    enrichmentData: v.optional(v.any()),
    exportedAt: v.optional(v.number()),
    nextFollowUpAt: v.optional(v.number()),
    followUpCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_clusterId", ["clusterId"])
    .index("by_city", ["city"])
    .index("by_name", ["name"])
    .index("by_placeId", ["placeId"])
    .index("by_discoveryCellId", ["discoveryCellId"]),

  clusters: defineTable({
    name: v.string(),
    boundary: v.array(v.object({ lat: v.number(), lng: v.number() })),
    centerLat: v.number(),
    centerLng: v.number(),
    radiusKm: v.number(),
    leadCount: v.number(),
    isAutoGenerated: v.boolean(),
  }),

  emails: defineTable({
    leadId: v.id("leads"),
    smartleadCampaignId: v.string(),
    sequenceStep: v.number(),
    subject: v.string(),
    body: v.string(),
    sentAt: v.number(),
    openedAt: v.optional(v.number()),
    clickedAt: v.optional(v.number()),
    repliedAt: v.optional(v.number()),
    bouncedAt: v.optional(v.number()),
    templateId: v.optional(v.id("emailTemplates")),
  })
    .index("by_leadId", ["leadId"])
    .index("by_smartleadCampaignId", ["smartleadCampaignId"]),

  activities: defineTable({
    leadId: v.id("leads"),
    type: v.union(
      v.literal("email_sent"),
      v.literal("email_opened"),
      v.literal("email_clicked"),
      v.literal("email_replied"),
      v.literal("email_bounced"),
      v.literal("phone_call"),
      v.literal("meeting_booked"),
      v.literal("note_added"),
      v.literal("status_changed"),
      v.literal("enriched"),
      v.literal("enrichment_started"),
      v.literal("enrichment_finished"),
      v.literal("enrichment_skipped"),
      v.literal("enrichment_source_added"),
      v.literal("social_dm_sent"),
      v.literal("social_dm_replied"),
      v.literal("social_followed"),
      v.literal("social_commented"),
    ),
    channel: v.optional(
      v.union(
        v.literal("email"),
        v.literal("phone"),
        v.literal("facebook"),
        v.literal("instagram"),
        v.literal("in_person"),
      ),
    ),
    description: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_leadId", ["leadId"]),

  emailTemplates: defineTable({
    name: v.string(),
    sequenceType: v.union(
      v.literal("initial"),
      v.literal("follow_up_1"),
      v.literal("follow_up_2"),
      v.literal("follow_up_3"),
    ),
    prompt: v.string(),
    subject: v.string(),
    isDefault: v.boolean(),
  }),

  settings: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),

  discoveryGrids: defineTable({
    name: v.string(),
    region: v.string(),
    province: v.string(),
    queries: v.array(v.string()),
    cellSizeKm: v.number(),
    totalLeadsFound: v.number(),
    createdAt: v.number(),
    // Legacy fields — old grids stored bounds directly; new virtual-grid model
    // computes them on the client. Kept optional so existing records validate.
    swLat: v.optional(v.number()),
    swLng: v.optional(v.number()),
    neLat: v.optional(v.number()),
    neLng: v.optional(v.number()),
  }),

  discoveryCells: defineTable({
    swLat: v.number(),
    swLng: v.number(),
    neLat: v.number(),
    neLng: v.number(),
    depth: v.number(),
    parentCellId: v.optional(v.id("discoveryCells")),
    isLeaf: v.boolean(),
    status: v.union(
      v.literal("unsearched"),
      v.literal("searched"),
      v.literal("saturated"),
      v.literal("searching"),
    ),
    resultCount: v.optional(v.number()),
    querySaturation: v.optional(
      v.array(v.object({ query: v.string(), count: v.number() })),
    ),
    lastSearchedAt: v.optional(v.number()),
    gridId: v.id("discoveryGrids"),
    boundsKey: v.optional(v.string()),
    leadsFound: v.optional(v.number()),
  })
    .index("by_gridId", ["gridId"])
    .index("by_gridId_boundsKey", ["gridId", "boundsKey"])
    .index("by_gridId_isLeaf", ["gridId", "isLeaf"])
    .index("by_parentCellId", ["parentCellId"]),

  emailBlockList: defineTable({
    email: v.string(),
    reason: v.string(),
    blockedAt: v.number(),
  }).index("by_email", ["email"]),

  generatedEmails: defineTable({
    campaignId: v.id("campaigns"),
    leadId: v.id("leads"),
    templateId: v.id("emailTemplates"),
    subject: v.string(),
    body: v.string(),
    status: v.optional(
      v.union(
        v.literal("generated"),
        v.literal("edited"),
        v.literal("approved"),
        v.literal("rejected"),
      ),
    ),
    generatedAt: v.number(),
  })
    .index("by_campaignId", ["campaignId"])
    .index("by_leadId", ["leadId"]),

  campaigns: defineTable({
    name: v.string(),
    smartleadCampaignId: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("pushed"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed"),
    ),
    templateIds: v.array(v.id("emailTemplates")),
    targetClusterId: v.optional(v.id("clusters")),
    targetFilter: v.optional(v.any()),
    targetLeadIds: v.optional(v.array(v.id("leads"))),
    leadCount: v.number(),
    stats: v.optional(
      v.object({
        sent: v.number(),
        opened: v.number(),
        clicked: v.number(),
        replied: v.number(),
        bounced: v.number(),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_status", ["status"]),
});
