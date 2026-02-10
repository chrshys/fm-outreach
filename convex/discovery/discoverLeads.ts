import { v } from "convex/values";

import { action, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";

const PLACES_TEXT_SEARCH_URL =
  "https://maps.googleapis.com/maps/api/place/textsearch/json";

type PlaceTextResult = {
  place_id: string;
  name: string;
  formatted_address?: string;
  geometry?: {
    location?: { lat: number; lng: number };
  };
  types?: string[];
};

type DiscoveredLead = {
  name: string;
  type: "farm" | "farmers_market" | "retail_store" | "roadside_stand" | "other";
  address: string;
  city: string;
  region: string;
  province: string;
  placeId: string;
  latitude: number | undefined;
  longitude: number | undefined;
  source: "google_places";
  sourceDetail: string;
  status: "new_lead";
  followUpCount: 0;
  createdAt: number;
  updatedAt: number;
};

export type DiscoverLeadsResult = {
  newLeads: number;
  duplicatesSkipped: number;
  totalInDatabase: number;
};

function normalizeDedupValue(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function normalizeDedupName(value: string): string {
  return normalizeDedupValue(value)
    .replace(/\bfarmers['']/g, "farmers")
    .replace(/\bst\.?\b/g, "street");
}

function dedupKeyForLead(lead: { name: string; city: string }): string {
  return `${normalizeDedupName(lead.name)}::${normalizeDedupValue(lead.city)}`;
}

function extractCity(formattedAddress: string): string {
  const parts = formattedAddress.split(",").map((p) => p.trim());
  // Google Places formatted_address for Ontario: "123 St, City, ON PostalCode, Canada"
  // The city is typically the second part
  if (parts.length >= 3) {
    return parts[1];
  }
  if (parts.length >= 2) {
    return parts[0];
  }
  return formattedAddress;
}

function inferLeadType(
  name: string,
  types: string[],
): DiscoveredLead["type"] {
  const lower = name.toLowerCase();
  if (lower.includes("market") || lower.includes("farmers market")) {
    return "farmers_market";
  }
  if (lower.includes("roadside") || lower.includes("stand")) {
    return "roadside_stand";
  }
  if (
    lower.includes("farm") ||
    lower.includes("orchard") ||
    lower.includes("vineyard") ||
    lower.includes("ranch") ||
    lower.includes("acres")
  ) {
    return "farm";
  }
  if (types.includes("store") || types.includes("grocery_or_supermarket")) {
    return "retail_store";
  }
  return "farm";
}

async function searchPlaces(
  query: string,
  apiKey: string,
  pageToken?: string,
): Promise<{ results: PlaceTextResult[]; nextPageToken?: string }> {
  let url = `${PLACES_TEXT_SEARCH_URL}?query=${encodeURIComponent(query)}&key=${apiKey}`;
  if (pageToken) {
    url += `&pagetoken=${pageToken}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Places Text Search failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    status: string;
    results?: PlaceTextResult[];
    next_page_token?: string;
    error_message?: string;
  };

  if (data.status === "ZERO_RESULTS") {
    return { results: [] };
  }

  if (data.status !== "OK") {
    throw new Error(
      `Places Text Search error: ${data.status} - ${data.error_message ?? "unknown"}`,
    );
  }

  return {
    results: data.results ?? [],
    nextPageToken: data.next_page_token,
  };
}

const discoveredLeadValidator = v.object({
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
  placeId: v.string(),
  latitude: v.optional(v.number()),
  longitude: v.optional(v.number()),
  source: v.literal("google_places"),
  sourceDetail: v.string(),
  status: v.literal("new_lead"),
  followUpCount: v.literal(0),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const insertDiscoveredLeads = internalMutation({
  args: {
    leads: v.array(discoveredLeadValidator),
  },
  handler: async (ctx, args) => {
    const existingLeads = await ctx.db.query("leads").collect();
    const seenKeys = new Set(existingLeads.map((l) => dedupKeyForLead(l)));
    const seenPlaceIds = new Set(
      existingLeads
        .filter((l) => l.placeId)
        .map((l) => l.placeId as string),
    );

    let inserted = 0;
    let skipped = 0;

    for (const lead of args.leads) {
      const dedupKey = dedupKeyForLead(lead);
      if (seenKeys.has(dedupKey) || seenPlaceIds.has(lead.placeId)) {
        skipped += 1;
        continue;
      }

      await ctx.db.insert("leads", lead);
      seenKeys.add(dedupKey);
      seenPlaceIds.add(lead.placeId);
      inserted += 1;
    }

    const totalInDatabase = existingLeads.length + inserted;

    return { inserted, skipped, totalInDatabase };
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

    const insertRef = internal.discovery.discoverLeads.insertDiscoveredLeads;
    const result = await ctx.runMutation(insertRef, { leads });

    return {
      newLeads: result.inserted,
      duplicatesSkipped: result.skipped,
      totalInDatabase: result.totalInDatabase,
    };
  },
});

