import { v } from "convex/values";

import { Id } from "../_generated/dataModel";
import { internalMutation, MutationCtx } from "../_generated/server";

// --- Smartlead category → lead status mapping ---

const CATEGORY_STATUS_MAP: Record<string, string> = {
  interested: "replied",
  not_interested: "not_interested",
  "not interested": "not_interested",
  wrong_person: "declined",
  "wrong person": "declined",
  auto_reply: "outreach_started",
  "auto reply": "outreach_started",
  out_of_office: "outreach_started",
  "out of office": "outreach_started",
  do_not_contact: "declined",
  "do not contact": "declined",
};

// --- Payload helpers ---

type WebhookPayload = {
  event_type: string;
  campaign_id?: string | number;
  lead_email?: string;
  sl_lead_email?: string;
  sequence_number?: number;
  sequence_step?: number;
  subject?: string;
  email_body?: string;
  preview_text?: string;
  event_timestamp?: string | number;
  time_replied?: string | number;
  category?: string;
  old_category?: string;
};

function getLeadEmail(payload: WebhookPayload): string | undefined {
  return payload.sl_lead_email ?? payload.lead_email;
}

function getCampaignId(payload: WebhookPayload): string {
  return String(payload.campaign_id ?? "");
}

function getSequenceStep(payload: WebhookPayload): number {
  return payload.sequence_number ?? payload.sequence_step ?? 1;
}

function getTimestamp(value: string | number | undefined): number {
  if (value === undefined) return Date.now();
  if (typeof value === "number") return value;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

// --- DB helpers ---

async function findLeadByEmail(ctx: MutationCtx, email: string) {
  const leads = await ctx.db.query("leads").collect();
  return leads.find(
    (l) => l.contactEmail?.toLowerCase() === email.toLowerCase(),
  );
}

async function findEmailRecord(
  ctx: MutationCtx,
  leadId: Id<"leads">,
  campaignId: string,
  sequenceStep: number,
) {
  return ctx.db
    .query("emails")
    .withIndex("by_leadId", (q) => q.eq("leadId", leadId))
    .filter((q) =>
      q.and(
        q.eq(q.field("smartleadCampaignId"), campaignId),
        q.eq(q.field("sequenceStep"), sequenceStep),
      ),
    )
    .first();
}

// --- EMAIL_SENT ---

export const handleEmailSent = internalMutation({
  args: { payload: v.any() },
  handler: async (ctx, args) => {
    const payload = args.payload as WebhookPayload;
    const email = getLeadEmail(payload);
    if (!email) {
      console.warn("[webhook] EMAIL_SENT: no lead email in payload");
      return;
    }

    const lead = await findLeadByEmail(ctx, email);
    if (!lead) {
      console.warn(`[webhook] EMAIL_SENT: lead not found for ${email}`);
      return;
    }

    const campaignId = getCampaignId(payload);
    const sequenceStep = getSequenceStep(payload);

    // Idempotency: check if email record already exists
    const existing = await findEmailRecord(
      ctx,
      lead._id,
      campaignId,
      sequenceStep,
    );
    if (existing) {
      return;
    }

    const now = Date.now();
    const sentAt = getTimestamp(payload.event_timestamp);

    await ctx.db.insert("emails", {
      leadId: lead._id,
      smartleadCampaignId: campaignId,
      sequenceStep,
      subject: payload.subject ?? "",
      body: payload.email_body ?? payload.preview_text ?? "",
      sentAt,
    });

    await ctx.db.insert("activities", {
      leadId: lead._id,
      type: "email_sent",
      channel: "email",
      description: `Email sent: ${payload.subject ?? "(no subject)"}`,
      metadata: { campaignId, sequenceStep },
      createdAt: now,
    });

    // Update lead status to outreach_started if currently enriched
    if (lead.status === "enriched") {
      await ctx.db.patch(lead._id, {
        status: "outreach_started",
        updatedAt: now,
      });

      await ctx.db.insert("activities", {
        leadId: lead._id,
        type: "status_changed",
        description:
          "Lead status changed from enriched to outreach_started",
        metadata: { oldStatus: "enriched", newStatus: "outreach_started" },
        createdAt: now,
      });
    }
  },
});

// --- EMAIL_OPEN ---

export const handleEmailOpen = internalMutation({
  args: { payload: v.any() },
  handler: async (ctx, args) => {
    const payload = args.payload as WebhookPayload;
    const email = getLeadEmail(payload);
    if (!email) {
      console.warn("[webhook] EMAIL_OPEN: no lead email in payload");
      return;
    }

    const lead = await findLeadByEmail(ctx, email);
    if (!lead) {
      console.warn(`[webhook] EMAIL_OPEN: lead not found for ${email}`);
      return;
    }

    const campaignId = getCampaignId(payload);
    const sequenceStep = getSequenceStep(payload);

    const emailRecord = await findEmailRecord(
      ctx,
      lead._id,
      campaignId,
      sequenceStep,
    );
    if (!emailRecord) {
      console.warn(
        `[webhook] EMAIL_OPEN: email record not found for ${email}`,
      );
      return;
    }

    // Idempotency: only record first open
    if (emailRecord.openedAt) {
      return;
    }

    const now = Date.now();
    const openedAt = getTimestamp(payload.event_timestamp);

    await ctx.db.patch(emailRecord._id, { openedAt });

    await ctx.db.insert("activities", {
      leadId: lead._id,
      type: "email_opened",
      channel: "email",
      description: "Email opened",
      metadata: { campaignId, sequenceStep },
      createdAt: now,
    });
  },
});

// --- EMAIL_LINK_CLICK ---

export const handleEmailLinkClick = internalMutation({
  args: { payload: v.any() },
  handler: async (ctx, args) => {
    const payload = args.payload as WebhookPayload;
    const email = getLeadEmail(payload);
    if (!email) {
      console.warn("[webhook] EMAIL_LINK_CLICK: no lead email in payload");
      return;
    }

    const lead = await findLeadByEmail(ctx, email);
    if (!lead) {
      console.warn(
        `[webhook] EMAIL_LINK_CLICK: lead not found for ${email}`,
      );
      return;
    }

    const campaignId = getCampaignId(payload);
    const sequenceStep = getSequenceStep(payload);

    const emailRecord = await findEmailRecord(
      ctx,
      lead._id,
      campaignId,
      sequenceStep,
    );
    if (!emailRecord) {
      console.warn(
        `[webhook] EMAIL_LINK_CLICK: email record not found for ${email}`,
      );
      return;
    }

    // Idempotency: only record first click
    if (emailRecord.clickedAt) {
      return;
    }

    const now = Date.now();
    const clickedAt = getTimestamp(payload.event_timestamp);

    await ctx.db.patch(emailRecord._id, { clickedAt });

    await ctx.db.insert("activities", {
      leadId: lead._id,
      type: "email_clicked",
      channel: "email",
      description: "Email link clicked",
      metadata: { campaignId, sequenceStep },
      createdAt: now,
    });
  },
});

// --- EMAIL_REPLY ---

export const handleEmailReply = internalMutation({
  args: { payload: v.any() },
  handler: async (ctx, args) => {
    const payload = args.payload as WebhookPayload;
    const email = getLeadEmail(payload);
    if (!email) {
      console.warn("[webhook] EMAIL_REPLY: no lead email in payload");
      return;
    }

    const lead = await findLeadByEmail(ctx, email);
    if (!lead) {
      console.warn(`[webhook] EMAIL_REPLY: lead not found for ${email}`);
      return;
    }

    const campaignId = getCampaignId(payload);
    const sequenceStep = getSequenceStep(payload);

    const emailRecord = await findEmailRecord(
      ctx,
      lead._id,
      campaignId,
      sequenceStep,
    );
    if (!emailRecord) {
      console.warn(
        `[webhook] EMAIL_REPLY: email record not found for ${email}`,
      );
      return;
    }

    // Idempotency: only record first reply
    if (emailRecord.repliedAt) {
      return;
    }

    const now = Date.now();
    const repliedAt = getTimestamp(
      payload.time_replied ?? payload.event_timestamp,
    );

    await ctx.db.patch(emailRecord._id, { repliedAt });

    await ctx.db.insert("activities", {
      leadId: lead._id,
      type: "email_replied",
      channel: "email",
      description: "Email reply received",
      metadata: { campaignId, sequenceStep },
      createdAt: now,
    });

    // Update lead status to replied (don't downgrade from higher statuses)
    if (
      lead.status !== "replied" &&
      lead.status !== "meeting_booked" &&
      lead.status !== "onboarded"
    ) {
      await ctx.db.patch(lead._id, {
        status: "replied",
        updatedAt: now,
      });

      await ctx.db.insert("activities", {
        leadId: lead._id,
        type: "status_changed",
        description: `Lead status changed from ${lead.status} to replied`,
        metadata: { oldStatus: lead.status, newStatus: "replied" },
        createdAt: now,
      });
    }
  },
});

// --- LEAD_UNSUBSCRIBED ---

export const handleLeadUnsubscribed = internalMutation({
  args: { payload: v.any() },
  handler: async (ctx, args) => {
    const payload = args.payload as WebhookPayload;
    const email = getLeadEmail(payload);
    if (!email) {
      console.warn("[webhook] LEAD_UNSUBSCRIBED: no lead email in payload");
      return;
    }

    // Add to block list (idempotent — check first)
    const normalizedEmail = email.toLowerCase();
    const existingBlock = await ctx.db
      .query("emailBlockList")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    const now = Date.now();

    if (!existingBlock) {
      await ctx.db.insert("emailBlockList", {
        email: normalizedEmail,
        reason: "unsubscribed",
        blockedAt: now,
      });
    }

    const lead = await findLeadByEmail(ctx, email);
    if (!lead) {
      console.warn(
        `[webhook] LEAD_UNSUBSCRIBED: lead not found for ${email}`,
      );
      return;
    }

    await ctx.db.insert("activities", {
      leadId: lead._id,
      type: "status_changed",
      description: "Lead unsubscribed from emails",
      metadata: { reason: "unsubscribed", campaignId: getCampaignId(payload) },
      createdAt: now,
    });

    if (lead.status !== "declined") {
      await ctx.db.patch(lead._id, {
        status: "declined",
        updatedAt: now,
      });

      await ctx.db.insert("activities", {
        leadId: lead._id,
        type: "status_changed",
        description: `Lead status changed from ${lead.status} to declined`,
        metadata: { oldStatus: lead.status, newStatus: "declined" },
        createdAt: now,
      });
    }
  },
});

// --- LEAD_CATEGORY_UPDATED ---

export const handleLeadCategoryUpdated = internalMutation({
  args: { payload: v.any() },
  handler: async (ctx, args) => {
    const payload = args.payload as WebhookPayload;
    const email = getLeadEmail(payload);
    if (!email) {
      console.warn(
        "[webhook] LEAD_CATEGORY_UPDATED: no lead email in payload",
      );
      return;
    }

    const lead = await findLeadByEmail(ctx, email);
    if (!lead) {
      console.warn(
        `[webhook] LEAD_CATEGORY_UPDATED: lead not found for ${email}`,
      );
      return;
    }

    const category = payload.category?.toLowerCase();
    if (!category) {
      console.warn(
        "[webhook] LEAD_CATEGORY_UPDATED: no category in payload",
      );
      return;
    }

    const now = Date.now();
    const newStatus = CATEGORY_STATUS_MAP[category];

    await ctx.db.insert("activities", {
      leadId: lead._id,
      type: "note_added",
      description: `Smartlead category updated to "${payload.category}"`,
      metadata: {
        category: payload.category,
        oldCategory: payload.old_category,
        campaignId: getCampaignId(payload),
      },
      createdAt: now,
    });

    if (newStatus && newStatus !== lead.status) {
      await ctx.db.patch(lead._id, {
        status: newStatus as typeof lead.status,
        updatedAt: now,
      });

      await ctx.db.insert("activities", {
        leadId: lead._id,
        type: "status_changed",
        description: `Lead status changed from ${lead.status} to ${newStatus}`,
        metadata: {
          oldStatus: lead.status,
          newStatus,
          smartleadCategory: payload.category,
        },
        createdAt: now,
      });
    }
  },
});
