import { v } from "convex/values";

import { action, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  type PlaceTextResult,
  type DiscoveredLead,
  extractCity,
  inferLeadType,
  searchPlaces,
  discoveredLeadValidator,
} from "./placeHelpers";

export type DiscoverLeadsResult = {
  newLeads: number;
  duplicatesSkipped: number;
};

export const insertDiscoveredLeads = internalMutation({
  args: {
    leads: v.array(discoveredLeadValidator),
  },
  handler: async (ctx, args) => {
    const seenPlaceIds = new Set<string>();

    let inserted = 0;
    let skipped = 0;

    for (const lead of args.leads) {
      // Skip if we already inserted a lead with this placeId in this batch
      if (seenPlaceIds.has(lead.placeId)) {
        skipped += 1;
        continue;
      }

      // Use the by_placeId index to check for existing leads
      const existingByPlaceId = await ctx.db
        .query("leads")
        .withIndex("by_placeId", (q) => q.eq("placeId", lead.placeId))
        .first();

      if (existingByPlaceId) {
        skipped += 1;
        seenPlaceIds.add(lead.placeId);
        continue;
      }

      await ctx.db.insert("leads", lead);
      seenPlaceIds.add(lead.placeId);
      inserted += 1;
    }

    return { inserted, skipped };
  },
});

export const discoverLeads = action({
  args: {
    region: v.string(),
    province: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<DiscoverLeadsResult> => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GOOGLE_PLACES_API_KEY environment variable");
    }

    const province = args.province ?? "Ontario";
    const query = `farms in ${args.region}, ${province}`;
    const allResults: PlaceTextResult[] = [];

    // Fetch first page
    const firstPage = await searchPlaces(query, apiKey);
    allResults.push(...firstPage.results);

    // Fetch additional pages if available (up to 2 more pages = 60 results max)
    let nextToken = firstPage.nextPageToken;
    let pagesLeft = 2;
    while (nextToken && pagesLeft > 0) {
      // Google requires a short delay before using a page token
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const nextPage = await searchPlaces(query, apiKey, nextToken);
      allResults.push(...nextPage.results);
      nextToken = nextPage.nextPageToken;
      pagesLeft -= 1;
    }

    const now = Date.now();
    const leads: DiscoveredLead[] = allResults.map((place) => ({
      name: place.name,
      type: inferLeadType(place.name, place.types ?? []),
      address: place.formatted_address ?? "",
      city: extractCity(place.formatted_address ?? ""),
      region: args.region,
      province,
      placeId: place.place_id,
      latitude: place.geometry?.location?.lat,
      longitude: place.geometry?.location?.lng,
      source: "google_places" as const,
      sourceDetail: `Google Places discovery: "${query}"`,
      status: "new_lead" as const,
      followUpCount: 0 as const,
      createdAt: now,
      updatedAt: now,
    }));

    // @ts-expect-error Convex type instantiation too deep with many modules
    const insertRef = internal.discovery.discoverLeads.insertDiscoveredLeads;
    const result = await ctx.runMutation(insertRef, { leads });

    return {
      newLeads: result.inserted,
      duplicatesSkipped: result.skipped,
    };
  },
});
