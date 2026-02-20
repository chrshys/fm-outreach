import { v } from "convex/values";

import { api, internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { discoverSocialLinks } from "./socialDiscovery";
import type { GooglePlacesResult } from "./googlePlaces";
import type { WebsiteScraperResult } from "./websiteScraper";
import type { HunterResult } from "./hunter";
import type { ClaudeAnalysisResult } from "./claudeAnalysis";

const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ENRICHMENT_VERSION = "1.0";

export type EnrichmentSummary = {
  leadId: string;
  skipped: boolean;
  sources: string[];
  emailFound: boolean;
  status: "enriched" | "no_email";
  fieldsUpdated: string[];
};

function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

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
    let websiteHtml: string | undefined;
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

    // Step 4: Website scraper — run if website exists
    let scraperResult: WebsiteScraperResult | null = null;
    if (websiteUrl) {
      try {
        scraperResult = await ctx.runAction(
          api.enrichment.websiteScraper.scrapeWebsite,
          { url: websiteUrl },
        );
      } catch {
        // Scraper failed — continue pipeline
      }

      if (scraperResult) {
        sources.push({
          source: "website_scraper",
          detail: websiteUrl,
          fetchedAt: Date.now(),
        });
      }
    }

    // Step 5: Hunter.io — run if website domain found and no email yet
    let hunterResult: HunterResult | null = null;
    const domain = websiteUrl ? extractDomain(websiteUrl) : null;
    const hasEmail = !!(lead.contactEmail || (scraperResult && scraperResult.emails.length > 0));

    if (domain && !hasEmail) {
      let hunterError = false;
      try {
        hunterResult = await ctx.runAction(
          api.enrichment.hunter.searchDomain,
          { domain },
        );
      } catch {
        hunterError = true;
        // Log Hunter error
        await ctx.runMutation(internal.enrichment.orchestratorHelpers.logActivity, {
          leadId: args.leadId,
          type: "enrichment_source_added",
          description: `Hunter.io error for ${domain}`,
          metadata: {
            source: "hunter",
            domain,
            emailsFound: 0,
            hit: false,
            error: true,
          },
        });
      }

      if (hunterResult && hunterResult.emails.length > 0) {
        sources.push({
          source: "hunter",
          detail: domain,
          fetchedAt: Date.now(),
        });
      }

      // Log Hunter attempt (hit or miss) — skip if already logged as error
      if (!hunterError) {
        await ctx.runMutation(internal.enrichment.orchestratorHelpers.logActivity, {
          leadId: args.leadId,
          type: "enrichment_source_added",
          description: hunterResult && hunterResult.emails.length > 0
            ? `Hunter.io found ${hunterResult.emails.length} email(s) for ${domain}`
            : `Hunter.io returned no emails for ${domain}`,
          metadata: {
            source: "hunter",
            domain,
            emailsFound: hunterResult?.emails.length ?? 0,
            hit: !!(hunterResult && hunterResult.emails.length > 0),
          },
        });
      }
    }

    // Step 6: Claude analysis — reuse raw HTML from scraper result
    let claudeResult: ClaudeAnalysisResult | null = null;
    if (scraperResult) {
      websiteHtml = scraperResult.rawHtml;

      if (websiteHtml) {
        try {
          claudeResult = await ctx.runAction(
            api.enrichment.claudeAnalysis.analyzeWithClaude,
            { content: websiteHtml },
          );
        } catch {
          // Claude analysis failed — continue pipeline
        }

        if (claudeResult) {
          sources.push({
            source: "claude_analysis",
            fetchedAt: Date.now(),
          });
        }
      }
    }

    // Step 7: Social discovery
    const socialResult = discoverSocialLinks({
      websiteHtml,
      googlePlacesWebsite: placesResult?.website ?? undefined,
    });
    if (socialResult.facebook || socialResult.instagram) {
      sources.push({
        source: "social_discovery",
        fetchedAt: Date.now(),
      });
    }

    // Step 8: Merge results — only overwrite empty fields unless forced
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

    // From website scraper — pick best email
    let bestEmail: string | null = null;
    let emailSource: string | null = null;

    if (scraperResult && scraperResult.emails.length > 0) {
      bestEmail = scraperResult.emails[0];
      emailSource = `website - ${websiteUrl} - ${new Date().toISOString().slice(0, 10)}`;
    }

    // From Hunter.io — use highest confidence email if no scraper email
    if (!bestEmail && hunterResult && hunterResult.emails.length > 0) {
      const sorted = [...hunterResult.emails].sort(
        (a, b) => b.confidence - a.confidence,
      );
      bestEmail = sorted[0].email;
      emailSource = `hunter - ${domain} - ${new Date().toISOString().slice(0, 10)}`;

      // Also grab contact name from Hunter if available
      if ((!lead.contactName || overwrite) && sorted[0].firstName) {
        const name = [sorted[0].firstName, sorted[0].lastName]
          .filter(Boolean)
          .join(" ");
        if (name) {
          patch.contactName = name;
          fieldsUpdated.push("contactName");
        }
      }
    }

    if (bestEmail && (!lead.contactEmail || overwrite)) {
      patch.contactEmail = bestEmail;
      fieldsUpdated.push("contactEmail");
    }

    // From Claude analysis
    if (claudeResult) {
      if (
        (!lead.products || lead.products.length === 0 || overwrite) &&
        claudeResult.products.length > 0
      ) {
        patch.products = claudeResult.products;
        fieldsUpdated.push("products");
      }
      if (
        (!lead.salesChannels || lead.salesChannels.length === 0 || overwrite) &&
        claudeResult.salesChannels.length > 0
      ) {
        patch.salesChannels = claudeResult.salesChannels;
        fieldsUpdated.push("salesChannels");
      }
      if ((lead.sellsOnline === undefined || overwrite) && claudeResult.sellsOnline !== undefined) {
        patch.sellsOnline = claudeResult.sellsOnline;
        fieldsUpdated.push("sellsOnline");
      }
      if ((!lead.farmDescription || overwrite) && claudeResult.businessDescription) {
        patch.farmDescription = claudeResult.businessDescription;
        fieldsUpdated.push("farmDescription");
      }
      if ((!lead.contactName || overwrite) && claudeResult.contactName) {
        // Only set if not already set by Hunter
        if (!patch.contactName) {
          patch.contactName = claudeResult.contactName;
          fieldsUpdated.push("contactName");
        }
      }
    }

    // From social discovery
    const existingSocial = lead.socialLinks ?? {};
    const newSocial: { instagram?: string; facebook?: string } = {};
    let socialUpdated = false;

    if (socialResult.facebook && (!existingSocial.facebook || overwrite)) {
      newSocial.facebook = socialResult.facebook;
      socialUpdated = true;
    }
    if (socialResult.instagram && (!existingSocial.instagram || overwrite)) {
      newSocial.instagram = socialResult.instagram;
      socialUpdated = true;
    }
    if (socialUpdated) {
      patch.socialLinks = {
        ...existingSocial,
        ...newSocial,
      };
      fieldsUpdated.push("socialLinks");
    }

    // From Claude analysis — structured data
    if (claudeResult) {
      const existingData = (lead.enrichmentData as Record<string, unknown> | undefined) ?? {};
      const hasStructuredProducts =
        claudeResult.structuredProducts && claudeResult.structuredProducts.length > 0;
      const hasStructuredDescription =
        claudeResult.structuredDescription &&
        (claudeResult.structuredDescription.specialties.length > 0 ||
          claudeResult.structuredDescription.certifications.length > 0 ||
          claudeResult.structuredDescription.summary.length > 0);

      if (hasStructuredProducts || hasStructuredDescription) {
        patch.enrichmentData = {
          ...existingData,
          ...(patch.enrichmentData as Record<string, unknown> | undefined),
          ...(hasStructuredProducts
            ? { structuredProducts: claudeResult.structuredProducts }
            : {}),
          ...(hasStructuredDescription
            ? { structuredDescription: claudeResult.structuredDescription }
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

    // From website scraper — platform detection
    if (scraperResult?.platform && (!lead.enrichmentData?.platform || overwrite)) {
      patch.enrichmentData = {
        ...(lead.enrichmentData as Record<string, unknown> | undefined),
        ...(patch.enrichmentData as Record<string, unknown> | undefined),
        platform: scraperResult.platform,
      };
      fieldsUpdated.push("enrichmentData.platform");
    }

    // Step 9: Set enrichment metadata
    const now = Date.now();
    patch.enrichedAt = now;
    patch.enrichmentVersion = ENRICHMENT_VERSION;
    patch.enrichmentSources = [
      ...(lead.enrichmentSources ?? []),
      ...sources,
    ];

    // Step 10: Set status
    const emailFound = !!(patch.contactEmail || lead.contactEmail);
    const newStatus = emailFound ? "enriched" : "no_email";
    // Only update status if it's new_lead or no_email (don't regress further-along statuses)
    const progressableStatuses = new Set(["new_lead", "no_email"]);
    if (progressableStatuses.has(lead.status) || overwrite) {
      patch.status = newStatus;
    }

    // Step 11: Set consentSource
    if (emailSource && (!lead.consentSource || overwrite)) {
      patch.consentSource = emailSource;
      fieldsUpdated.push("consentSource");
    }

    // Apply the patch
    await ctx.runMutation(api.leads.update, {
      leadId: args.leadId,
      ...patch,
    });

    // Step 12: Log enrichment finished
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
