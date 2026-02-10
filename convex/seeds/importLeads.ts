import { v } from "convex/values";

import { action, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { parseCsv } from "../lib/csvParser";
import { buildImportedLead } from "./importLeadsMapper";

const importedLeadValidator = v.object({
  name: v.string(),
  type: v.union(v.literal("farm"), v.literal("farmers_market")),
  address: v.string(),
  city: v.string(),
  region: v.string(),
  province: v.literal("ON"),
  source: v.literal("spreadsheet_import"),
  status: v.literal("new_lead"),
  consentSource: v.string(),
  followUpCount: v.literal(0),
  createdAt: v.number(),
  updatedAt: v.number(),
  contactEmail: v.optional(v.string()),
  website: v.optional(v.string()),
  contactPhone: v.optional(v.string()),
  notes: v.optional(v.string()),
  socialLinks: v.optional(
    v.object({
      instagram: v.optional(v.string()),
    }),
  ),
});

function normalizeDedupValue(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function normalizeDedupName(value: string): string {
  return normalizeDedupValue(value)
    .replace(/\bfarmers['’]/g, "farmers")
    .replace(/\bst\.?\b/g, "street");
}

function dedupKeyForLead(lead: { name: string; city: string }): string {
  return `${normalizeDedupName(lead.name)}::${normalizeDedupValue(lead.city)}`;
}

export const insertImportedLeads = internalMutation({
  args: {
    leads: v.array(importedLeadValidator),
  },
  handler: async (ctx, args) => {
    const existingLeads = await ctx.db.query("leads").collect();
    const seenLeadKeys = new Set(existingLeads.map((lead) => dedupKeyForLead(lead)));
    let inserted = 0;
    let skipped = 0;
    let errored = 0;

    for (const lead of args.leads) {
      const dedupKey = dedupKeyForLead(lead);
      if (seenLeadKeys.has(dedupKey)) {
        skipped += 1;
        continue;
      }

      try {
        await ctx.db.insert("leads", lead);
        seenLeadKeys.add(dedupKey);
        inserted += 1;
      } catch {
        errored += 1;
      }
    }

    return { inserted, skipped, errored };
  },
});

export const importLeads = action({
  args: {
    csvContent: v.string(),
    filename: v.string(),
  },
  handler: async (ctx, args): Promise<{ inserted: number; skipped: number; errored: number }> => {
    const now = Date.now();
    const importDate = new Date(now).toISOString().slice(0, 10);

    const rows = parseCsv(args.csvContent);
    const leads = rows.map((row) =>
      buildImportedLead(row, {
        filename: args.filename,
        now,
        importDate,
      }),
    );

    return ctx.runMutation(internal.seeds.importLeads.insertImportedLeads, { leads });
  },
});
