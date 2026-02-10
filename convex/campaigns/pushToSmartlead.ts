import { v } from "convex/values";

import { api, internal } from "../_generated/api";
import { action, internalMutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import {
  createCampaign,
  updateCampaignSequence,
  addLeadsToCampaign,
  type SmartleadSequence,
  type SmartleadLead,
} from "../smartlead/client";

const MAX_LEADS_PER_BATCH = 100;
const SEQUENCE_DELAYS: Record<string, number> = {
  initial: 0,
  follow_up_1: 4,
  follow_up_2: 8,
  follow_up_3: 14,
};

// --- Internal mutations ---

export const setCampaignSmartleadId = internalMutation({
  args: {
    campaignId: v.id("campaigns"),
    smartleadCampaignId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.campaignId, {
      smartleadCampaignId: args.smartleadCampaignId,
      updatedAt: Date.now(),
    });
  },
});

export const setCampaignPushed = internalMutation({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.campaignId, {
      status: "pushed",
      updatedAt: Date.now(),
    });
  },
});

export const setLeadSmartleadCampaignId = internalMutation({
  args: {
    leadIds: v.array(v.id("leads")),
    smartleadCampaignId: v.string(),
  },
  handler: async (ctx, args) => {
    for (const leadId of args.leadIds) {
      await ctx.db.patch(leadId, {
        smartleadCampaignId: args.smartleadCampaignId,
        updatedAt: Date.now(),
      });
    }
  },
});

// --- Main action ---

export type PushToSmartleadResult = {
  smartleadCampaignId: number;
  sequenceSteps: number;
  leadsAdded: number;
};

export const pushToSmartlead = action({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args): Promise<PushToSmartleadResult> => {
    // 1. Load campaign
    const campaign = await ctx.runQuery(api.campaigns.get, {
      campaignId: args.campaignId,
    });
    if (!campaign) {
      throw new Error("Campaign not found");
    }
    if (campaign.status !== "draft") {
      throw new Error(
        `Campaign is "${campaign.status}" — only draft campaigns can be pushed`,
      );
    }
    if (campaign.smartleadCampaignId) {
      throw new Error(
        `Campaign already pushed to Smartlead (id: ${campaign.smartleadCampaignId})`,
      );
    }

    // 2. Load approved emails
    const approvedEmails = await ctx.runQuery(
      api.generatedEmails.listApprovedByCampaign,
      { campaignId: args.campaignId },
    );
    if (approvedEmails.length === 0) {
      throw new Error("No approved emails — approve at least one before pushing");
    }

    // 3. Load templates for sequence ordering
    const templates = await Promise.all(
      campaign.templateIds.map((id) =>
        ctx.runQuery(api.emailTemplates.get, { id }),
      ),
    );
    const templateMap = new Map(
      templates.filter(Boolean).map((t) => [t!._id, t!]),
    );

    // 4. Load leads for the approved emails
    const leadIds = [...new Set(approvedEmails.map((e) => e.leadId))];
    const leads = await Promise.all(
      leadIds.map((id) => ctx.runQuery(api.leads.get, { leadId: id })),
    );
    const leadMap = new Map(
      leads.filter(Boolean).map((l) => [l!._id, l!]),
    );

    // --- Step 1: Create campaign in Smartlead ---
    console.log(`[pushToSmartlead] Creating Smartlead campaign: ${campaign.name}`);
    const slCampaign = await createCampaign(campaign.name);
    const smartleadCampaignId = slCampaign.id;

    // Save smartleadCampaignId immediately so we can recover if later steps fail
    await ctx.runMutation(
      internal.campaigns.pushToSmartlead.setCampaignSmartleadId,
      {
        campaignId: args.campaignId,
        smartleadCampaignId: String(smartleadCampaignId),
      },
    );
    console.log(
      `[pushToSmartlead] Created Smartlead campaign id=${smartleadCampaignId}`,
    );

    // --- Step 2: Build and push email sequence ---
    // Group approved emails by template to build sequence steps.
    // For the initial email, use the first approved email's subject + body as the
    // sequence content (Smartlead personalisation happens via lead custom fields,
    // but since we generated per-lead emails we push generic sequence content and
    // use per-lead custom fields for personalisation).
    // Actually — Smartlead doesn't support per-lead email bodies in sequences.
    // The correct approach: push the template subject as the sequence subject and
    // use the template prompt-based subject, with the actual per-lead content
    // pushed via lead custom fields that the sequence references via {{variables}}.
    //
    // Simpler approach for this codebase: since each email is fully generated per
    // lead, we use the template subject as the sequence step and include a
    // placeholder body. The real personalised content goes into lead custom fields.

    const sequenceOrder = [
      "initial",
      "follow_up_1",
      "follow_up_2",
      "follow_up_3",
    ] as const;

    const sequences: SmartleadSequence[] = [];
    for (let i = 0; i < campaign.templateIds.length; i++) {
      const template = templateMap.get(campaign.templateIds[i]);
      if (!template) continue;

      const seqNumber = sequenceOrder.indexOf(template.sequenceType) + 1;
      if (seqNumber === 0) continue;

      // For initial step: use actual approved email content as the template
      // For follow-ups: use template subject with placeholder
      const isInitial = template.sequenceType === "initial";
      const firstApproved = approvedEmails.find(
        (e) => e.templateId === template._id,
      );

      sequences.push({
        seq_number: seqNumber,
        seq_delay_details: {
          delay_in_days: SEQUENCE_DELAYS[template.sequenceType] ?? 3,
        },
        subject: isInitial && firstApproved
          ? "{{subject}}"
          : template.subject,
        email_body: isInitial
          ? "{{email_body}}"
          : template.subject
            ? `{{email_body_${template.sequenceType}}}`
            : template.prompt,
      });
    }

    if (sequences.length === 0) {
      throw new Error("No valid sequence steps could be built from templates");
    }

    // Sort by seq_number
    sequences.sort((a, b) => a.seq_number - b.seq_number);

    console.log(
      `[pushToSmartlead] Pushing ${sequences.length} sequence step(s)`,
    );
    await updateCampaignSequence(smartleadCampaignId, sequences);

    // --- Step 3: Add leads in batches of 100 ---
    const smartleadLeads: Array<{ lead: SmartleadLead; leadId: Id<"leads"> }> = [];

    for (const email of approvedEmails) {
      const lead = leadMap.get(email.leadId);
      if (!lead || !lead.contactEmail) continue;

      // Split contact name into first/last
      const nameParts = (lead.contactName ?? lead.name ?? "").split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      smartleadLeads.push({
        leadId: lead._id,
        lead: {
          email: lead.contactEmail,
          first_name: firstName,
          last_name: lastName,
          company_name: lead.name,
          // Custom fields for per-lead email personalization
          subject: email.subject,
          email_body: email.body,
          city: lead.city,
          products: lead.products?.join(", ") ?? "",
          farm_description: lead.farmDescription ?? "",
        },
      });
    }

    if (smartleadLeads.length === 0) {
      throw new Error("No leads with email addresses to add");
    }

    let totalAdded = 0;
    for (let i = 0; i < smartleadLeads.length; i += MAX_LEADS_PER_BATCH) {
      const batch = smartleadLeads.slice(i, i + MAX_LEADS_PER_BATCH);
      const batchLeadData = batch.map((b) => b.lead);

      console.log(
        `[pushToSmartlead] Adding leads batch ${Math.floor(i / MAX_LEADS_PER_BATCH) + 1} (${batchLeadData.length} leads)`,
      );
      const result = await addLeadsToCampaign(smartleadCampaignId, batchLeadData);
      totalAdded += result.upload_count ?? batchLeadData.length;

      // Tag leads with smartleadCampaignId
      const batchLeadIds = batch.map((b) => b.leadId);
      await ctx.runMutation(
        internal.campaigns.pushToSmartlead.setLeadSmartleadCampaignId,
        {
          leadIds: batchLeadIds,
          smartleadCampaignId: String(smartleadCampaignId),
        },
      );
    }

    console.log(`[pushToSmartlead] Added ${totalAdded} leads total`);

    // --- Step 4: Update campaign status to pushed ---
    await ctx.runMutation(
      internal.campaigns.pushToSmartlead.setCampaignPushed,
      { campaignId: args.campaignId },
    );

    console.log(
      `[pushToSmartlead] Campaign pushed successfully. Smartlead ID: ${smartleadCampaignId}`,
    );

    // Do NOT auto-launch — return the ID so user can review in Smartlead
    return {
      smartleadCampaignId,
      sequenceSteps: sequences.length,
      leadsAdded: totalAdded,
    };
  },
});
