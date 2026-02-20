import { v } from "convex/values";

import { api, internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import type { GooglePlacesResult } from "./googlePlaces";
import type { SonarEnrichResult } from "./sonarEnrich";

const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ENRICHMENT_VERSION = "2.0";

export type EnrichmentSummary = {
  leadId: string;
  skipped: boolean;
  sources: string[];
  emailFound: boolean;
  status: "enriched" | "no_email";
  fieldsUpdated: string[];
};

export const enrichLead = internalAction({
  args: {
    leadId: v.id("leads"),
    force: v.optional(v.boolean()),
    overwrite: v.optional(v.boolean()),
    useSonarPro: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<EnrichmentSummary> => {
    // @ts-ignore -- Convex generated API types can trigger TS2589 in large modules
    const lead = await ctx.runQuery(api.leads.get, { leadId: args.leadId });
    if (!lead) {
      throw new Error(`Lead not found: ${args.leadId}`);
    }

    const force = args.force ?? false;
    const overwrite = args.overwrite ?? force;

    // Step 0: Check if lead's email is on the block list (unsubscribed)
    if (lead.contactEmail) {
      const isBlocked = await ctx.runQuery(
        api.smartlead.unsubscribe.isUnsubscribed,
        { email: lead.contactEmail },
      );
      if (isBlocked) {
        // @ts-ignore -- Convex generated API types can trigger TS2589 in large modules
        await ctx.runMutation(internal.enrichment.orchestratorHelpers.logActivity, {
          leadId: args.leadId,
          type: "enrichment_skipped",
          description: "Enrichment skipped — lead email is on the block list (unsubscribed)",
          metadata: { email: lead.contactEmail },
        });

        return {
          leadId: args.leadId,
          skipped: true,
          sources: [],
          emailFound: !!lead.contactEmail,
          status: lead.contactEmail ? "enriched" : "no_email",
          fieldsUpdated: [],
        };
      }
    }

    // Step 1: Check cooldown
    if (
      !force &&
      lead.enrichedAt &&
      Date.now() - lead.enrichedAt < COOLDOWN_MS
    ) {
      await ctx.runMutation(internal.enrichment.orchestratorHelpers.logActivity, {
        leadId: args.leadId,
        type: "enrichment_skipped",
        description: "Enrichment skipped — enriched within last 30 days",
        metadata: { enrichedAt: lead.enrichedAt },
      });

      return {
        leadId: args.leadId,
        skipped: true,
        sources: [],
        emailFound: !!lead.contactEmail,
        status: lead.contactEmail ? "enriched" : "no_email",
        fieldsUpdated: [],
      };
    }

    // Step 2: Log enrichment started
    await ctx.runMutation(internal.enrichment.orchestratorHelpers.logActivity, {
      leadId: args.leadId,
      type: "enrichment_started",
      description: "Enrichment pipeline started",
    });

    const sources: Array<{ source: string; detail?: string; fetchedAt: number }> = [];
    const fieldsUpdated: string[] = [];
    let websiteUrl = lead.website;

    // Step 3: Google Places — search if no placeId, or fetch details if placeId exists but phone/website missing
    let placesResult: GooglePlacesResult | null = null;
    if (!lead.placeId) {
      try {
        placesResult = await ctx.runAction(
          api.enrichment.googlePlaces.enrichFromGooglePlaces,
          { name: lead.name, city: lead.city, address: lead.address },
        );
      } catch {
        // Google Places failed — continue pipeline
      }
    } else if (!lead.contactPhone || !lead.website || overwrite) {
      // Lead already has placeId but missing phone or website — fetch details
      try {
        placesResult = await ctx.runAction(
          api.enrichment.googlePlaces.fetchPlaceDetails,
          { placeId: lead.placeId },
        );
      } catch {
        // Google Places details fetch failed — continue pipeline
      }
    }

    if (placesResult) {
      sources.push({
        source: "google_places",
        detail: placesResult.placeId,
        fetchedAt: Date.now(),
      });
      if (!websiteUrl && placesResult.website) {
        websiteUrl = placesResult.website;
      }
    }

    // Step 4: Sonar enrichment — web search for business information
    let sonarResult: SonarEnrichResult | null = null;
    try {
      sonarResult = await ctx.runAction(
        api.enrichment.sonarEnrich.enrichWithSonar,
        {
          name: lead.name,
          address: lead.address,
          city: lead.city,
          province: lead.province,
          type: lead.type,
          website: websiteUrl ?? undefined,
          useSonarPro: args.useSonarPro,
        },
      );
    } catch {
      // Sonar enrichment failed — continue pipeline
    }

    if (sonarResult) {
      const sourceEntry: { source: string; fetchedAt: number; detail?: string } = {
        source: "sonar_enrichment",
        fetchedAt: Date.now(),
      };
      if (sonarResult.citations.length > 0) {
        sourceEntry.detail = sonarResult.citations.join(", ");
      }
      sources.push(sourceEntry);
    }

    // Merge results — only overwrite empty fields unless forced
    const patch: Record<string, unknown> = {};

    // From Google Places
    if (placesResult) {
      if (!lead.placeId) {
        patch.placeId = placesResult.placeId;
        fieldsUpdated.push("placeId");
      }
      if ((!lead.contactPhone || overwrite) && placesResult.phone) {
        patch.contactPhone = placesResult.phone;
        fieldsUpdated.push("contactPhone");
      }
      if ((!lead.website || overwrite) && placesResult.website) {
        patch.website = placesResult.website;
        fieldsUpdated.push("website");
      }
      if ((!lead.postalCode || overwrite) && placesResult.postalCode) {
        patch.postalCode = placesResult.postalCode;
        fieldsUpdated.push("postalCode");
      }
      if ((!lead.countryCode || overwrite) && placesResult.countryCode) {
        patch.countryCode = placesResult.countryCode;
        fieldsUpdated.push("countryCode");
      }
    }

    // From Sonar — email
    let bestEmail: string | null = null;
    let emailSource: string | null = null;

    if (sonarResult?.contactEmail) {
      bestEmail = sonarResult.contactEmail;
      emailSource = `sonar - ${lead.name} - ${new Date().toISOString().slice(0, 10)}`;
    }

    if (bestEmail && (!lead.contactEmail || overwrite)) {
      patch.contactEmail = bestEmail;
      fieldsUpdated.push("contactEmail");
    }

    // From Sonar — contact name
    if (sonarResult?.contactName && (!lead.contactName || overwrite)) {
      patch.contactName = sonarResult.contactName;
      fieldsUpdated.push("contactName");
    }

    // From Sonar — contact phone (fallback if Google Places didn't provide one)
    if (sonarResult?.contactPhone && !patch.contactPhone && (!lead.contactPhone || overwrite)) {
      patch.contactPhone = sonarResult.contactPhone;
      fieldsUpdated.push("contactPhone");
    }

    // From Sonar — website (fallback if Google Places didn't provide one)
    if (sonarResult?.website && !patch.website && (!lead.website || overwrite)) {
      patch.website = sonarResult.website;
      fieldsUpdated.push("website");
    }

    // From Sonar — products, sales channels, description
    if (sonarResult) {
      if (
        (!lead.products || lead.products.length === 0 || overwrite) &&
        sonarResult.products.length > 0
      ) {
        patch.products = sonarResult.products;
        fieldsUpdated.push("products");
      }
      if (
        (!lead.salesChannels || lead.salesChannels.length === 0 || overwrite) &&
        sonarResult.salesChannels.length > 0
      ) {
        patch.salesChannels = sonarResult.salesChannels;
        fieldsUpdated.push("salesChannels");
      }
      if ((lead.sellsOnline === undefined || overwrite) && sonarResult.sellsOnline !== undefined) {
        patch.sellsOnline = sonarResult.sellsOnline;
        fieldsUpdated.push("sellsOnline");
      }
      if ((!lead.farmDescription || overwrite) && sonarResult.businessDescription) {
        patch.farmDescription = sonarResult.businessDescription;
        fieldsUpdated.push("farmDescription");
      }
    }

    // From Sonar — social links
    if (sonarResult) {
      const existingSocial = lead.socialLinks ?? {};
      const newSocial: { instagram?: string; facebook?: string } = {};
      let socialUpdated = false;

      if (sonarResult.socialLinks.facebook && (!existingSocial.facebook || overwrite)) {
        newSocial.facebook = sonarResult.socialLinks.facebook;
        socialUpdated = true;
      }
      if (sonarResult.socialLinks.instagram && (!existingSocial.instagram || overwrite)) {
        newSocial.instagram = sonarResult.socialLinks.instagram;
        socialUpdated = true;
      }
      if (socialUpdated) {
        patch.socialLinks = {
          ...existingSocial,
          ...newSocial,
        };
        fieldsUpdated.push("socialLinks");
      }
    }

    // From Sonar — structured data
    if (sonarResult) {
      const existingData = (lead.enrichmentData as Record<string, unknown> | undefined) ?? {};
      const hasStructuredProducts = sonarResult.structuredProducts.length > 0;
      const hasStructuredDescription =
        sonarResult.structuredDescription.specialties.length > 0 ||
        sonarResult.structuredDescription.certifications.length > 0 ||
        sonarResult.structuredDescription.summary.length > 0;

      if (hasStructuredProducts || hasStructuredDescription) {
        patch.enrichmentData = {
          ...existingData,
          ...(patch.enrichmentData as Record<string, unknown> | undefined),
          ...(hasStructuredProducts
            ? { structuredProducts: sonarResult.structuredProducts }
            : {}),
          ...(hasStructuredDescription
            ? { structuredDescription: sonarResult.structuredDescription }
            : {}),
        };
        if (hasStructuredProducts) {
          fieldsUpdated.push("enrichmentData.structuredProducts");
        }
        if (hasStructuredDescription) {
          fieldsUpdated.push("enrichmentData.structuredDescription");
        }
      }
    }

    // Step 5: Set enrichment metadata
    const now = Date.now();
    patch.enrichedAt = now;
    patch.enrichmentVersion = ENRICHMENT_VERSION;
    patch.enrichmentSources = [
      ...(lead.enrichmentSources ?? []),
      ...sources,
    ];

    // Step 6: Set status
    const emailFound = !!(patch.contactEmail || lead.contactEmail);
    const newStatus = emailFound ? "enriched" : "no_email";
    // Only update status if it's new_lead or no_email (don't regress further-along statuses)
    const progressableStatuses = new Set(["new_lead", "no_email"]);
    if (progressableStatuses.has(lead.status) || overwrite) {
      patch.status = newStatus;
    }

    // Step 7: Set consentSource
    if (emailSource && (!lead.consentSource || overwrite)) {
      patch.consentSource = emailSource;
      fieldsUpdated.push("consentSource");
    }

    // Apply the patch
    await ctx.runMutation(api.leads.update, {
      leadId: args.leadId,
      ...patch,
    });

    // Step 8: Log enrichment finished
    await ctx.runMutation(internal.enrichment.orchestratorHelpers.logActivity, {
      leadId: args.leadId,
      type: "enrichment_finished",
      description: `Enrichment completed: ${sources.length} sources, ${fieldsUpdated.length} fields updated${emailFound ? ", email found" : ""}`,
      metadata: {
        sources: sources.map((s) => s.source),
        fieldsUpdated,
        emailFound,
        status: newStatus,
      },
    });

    return {
      leadId: args.leadId,
      skipped: false,
      sources: sources.map((s) => s.source),
      emailFound,
      status: newStatus,
      fieldsUpdated,
    };
  },
});
