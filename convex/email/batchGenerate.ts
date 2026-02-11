import { v } from "convex/values";

import { api, internal } from "../_generated/api";
import { action, internalMutation } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { GeneratedEmail } from "./generateEmail";

const DELAY_BETWEEN_LEADS_MS = 500;

export type BatchGenerateResult = {
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  results: Array<
    | { leadId: string; status: "success"; subject: string }
    | { leadId: string; status: "skipped"; reason: string }
    | { leadId: string; status: "error"; error: string }
  >;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const saveGeneratedEmail = internalMutation({
  args: {
    campaignId: v.id("campaigns"),
    leadId: v.id("leads"),
    templateId: v.id("emailTemplates"),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("generatedEmails", {
      campaignId: args.campaignId,
      leadId: args.leadId,
      templateId: args.templateId,
      subject: args.subject,
      body: args.body,
      status: "generated",
      generatedAt: Date.now(),
    });
  },
});

export const batchGenerate = action({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args): Promise<BatchGenerateResult> => {
    // Fetch campaign
    const campaign = await ctx.runQuery(api.campaigns.get, {
      campaignId: args.campaignId,
    });
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    if (campaign.templateIds.length === 0) {
      throw new Error("Campaign has no templates configured");
    }

    // Find the initial template from the campaign's template sequence
    const templates = await Promise.all(
      campaign.templateIds.map((id: Id<"emailTemplates">) =>
        ctx.runQuery(api.emailTemplates.get, { id }),
      ),
    );
    const initialTemplate = templates.find(
      (t: Doc<"emailTemplates"> | null) => t !== null && t.sequenceType === "initial",
    );
    if (!initialTemplate) {
      throw new Error("Campaign has no initial template");
    }

    // Resolve target lead IDs
    let leadIds: Id<"leads">[];
    if (campaign.targetLeadIds && campaign.targetLeadIds.length > 0) {
      leadIds = campaign.targetLeadIds;
    } else if (campaign.targetClusterId) {
      const clusterLeads = await ctx.runQuery(api.leads.listByCluster, {
        clusterId: campaign.targetClusterId,
      });
      leadIds = clusterLeads.map((l: { _id: Id<"leads"> }) => l._id);
    } else {
      throw new Error(
        "Campaign has no target leads — set targetLeadIds or targetClusterId",
      );
    }

    const results: BatchGenerateResult["results"] = [];
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < leadIds.length; i++) {
      const leadId = leadIds[i];

      // Fetch lead to check email exists
      const lead = await ctx.runQuery(api.leads.get, { leadId });

      if (!lead) {
        results.push({ leadId, status: "skipped", reason: "Lead not found" });
        skipped++;
      } else if (!lead.contactEmail) {
        results.push({
          leadId,
          status: "skipped",
          reason: "No contact email",
        });
        skipped++;
      } else {
        try {
          const generated: GeneratedEmail = await ctx.runAction(
            api.email.generateEmail.generateEmail,
            {
              leadId: lead._id,
              templateId: initialTemplate._id,
            },
          );

          await ctx.runMutation(
            internal.email.batchGenerate.saveGeneratedEmail,
            {
              campaignId: args.campaignId,
              leadId: lead._id,
              templateId: initialTemplate._id,
              subject: generated.subject,
              body: generated.body,
            },
          );

          results.push({ leadId, status: "success", subject: generated.subject });
          succeeded++;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          results.push({ leadId, status: "error", error: message });
          failed++;
        }
      }

      // Delay between leads (skip after last one)
      if (i < leadIds.length - 1) {
        await sleep(DELAY_BETWEEN_LEADS_MS);
      }
    }

    return {
      total: leadIds.length,
      succeeded,
      failed,
      skipped,
      results,
    };
  },
});
