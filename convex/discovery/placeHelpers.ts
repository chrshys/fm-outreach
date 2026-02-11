import { v } from "convex/values";

const PLACES_TEXT_SEARCH_URL =
  "https://maps.googleapis.com/maps/api/place/textsearch/json";

export type PlaceTextResult = {
  place_id: string;
  name: string;
  formatted_address?: string;
  geometry?: {
    location?: { lat: number; lng: number };
  };
  types?: string[];
};

export type DiscoveredLead = {
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

export function normalizeDedupValue(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function normalizeDedupName(value: string): string {
  return normalizeDedupValue(value)
    .replace(/\bfarmers['']/g, "farmers")
    .replace(/\bst\.?\b/g, "street");
}

export function dedupKeyForLead(lead: { name: string; city: string }): string {
  return `${normalizeDedupName(lead.name)}::${normalizeDedupValue(lead.city)}`;
}

export function extractCity(formattedAddress: string): string {
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

export function inferLeadType(
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

export async function searchPlaces(
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

export const discoveredLeadValidator = v.object({
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
