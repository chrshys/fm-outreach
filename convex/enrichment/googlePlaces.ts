import { v } from "convex/values";

import { action } from "../_generated/server";

const PLACES_TEXT_SEARCH_URL =
  "https://maps.googleapis.com/maps/api/place/textsearch/json";
const PLACE_DETAILS_URL =
  "https://maps.googleapis.com/maps/api/place/details/json";

export type StructuredHour = {
  day: number;
  open: string;
  close: string;
  isClosed: boolean;
};

const DAY_NAME_TO_NUMBER: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function convertTo24h(time12h: string): string {
  const match = time12h.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "";
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3].toUpperCase();

  if (period === "AM" && hours === 12) {
    hours = 0;
  } else if (period === "PM" && hours !== 12) {
    hours += 12;
  }

  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

export function parseWeekdayText(weekdayText: string[]): StructuredHour[] {
  const results: StructuredHour[] = [];

  for (const line of weekdayText) {
    const colonIdx = line.indexOf(": ");
    if (colonIdx === -1) continue;

    const dayName = line.slice(0, colonIdx).trim().toLowerCase();
    const day = DAY_NAME_TO_NUMBER[dayName];
    if (day === undefined) continue;

    const timePart = line.slice(colonIdx + 2).trim();

    if (timePart.toLowerCase() === "closed") {
      results.push({ day, open: "", close: "", isClosed: true });
      continue;
    }

    const times = timePart.split(/\s+[–-]\s+/);
    if (times.length !== 2) continue;

    const open = convertTo24h(times[0]);
    const close = convertTo24h(times[1]);
    if (!open || !close) continue;

    results.push({ day, open, close, isClosed: false });
  }

  return results;
}

export type GooglePlacesResult = {
  placeId: string;
  phone: string | null;
  website: string | null;
  hours: string[] | null;
  rating: number | null;
  formattedAddress: string | null;
  postalCode: string | null;
  countryCode: string | null;
};

type TextSearchCandidate = {
  place_id: string;
  name: string;
  formatted_address?: string;
};

function normalizeForComparison(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function nameSimilarity(a: string, b: string): number {
  const normA = normalizeForComparison(a);
  const normB = normalizeForComparison(b);

  if (normA === normB) return 1;

  const wordsA = normA.split(" ");
  const wordsB = normB.split(" ");
  const allWords = new Set([...wordsA, ...wordsB]);
  const sharedWords = wordsA.filter((w) => wordsB.includes(w));

  return allWords.size > 0 ? sharedWords.length / allWords.size : 0;
}

function pickBestMatch(
  candidates: TextSearchCandidate[],
  targetName: string,
): TextSearchCandidate {
  let best = candidates[0];
  let bestScore = nameSimilarity(best.name, targetName);

  for (let i = 1; i < candidates.length; i++) {
    const score = nameSimilarity(candidates[i].name, targetName);
    if (score > bestScore) {
      best = candidates[i];
      bestScore = score;
    }
  }

  return best;
}

async function textSearch(
  query: string,
  apiKey: string,
): Promise<TextSearchCandidate[]> {
  const encodedQuery = encodeURIComponent(query);
  const response = await fetch(
    `${PLACES_TEXT_SEARCH_URL}?query=${encodedQuery}&key=${apiKey}`,
  );

  if (!response.ok) {
    throw new Error(`Places Text Search failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    status: string;
    results?: TextSearchCandidate[];
    error_message?: string;
  };

  if (data.status === "ZERO_RESULTS") {
    return [];
  }

  if (data.status !== "OK") {
    throw new Error(
      `Places Text Search error: ${data.status} - ${data.error_message ?? "unknown"}`,
    );
  }

  return data.results ?? [];
}

async function placeDetails(
  placeId: string,
  apiKey: string,
): Promise<GooglePlacesResult> {
  const fields =
    "place_id,formatted_phone_number,website,opening_hours,rating,formatted_address,address_components";
  const response = await fetch(
    `${PLACE_DETAILS_URL}?place_id=${placeId}&fields=${fields}&key=${apiKey}`,
  );

  if (!response.ok) {
    throw new Error(`Place Details failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    status: string;
    result?: {
      place_id?: string;
      formatted_phone_number?: string;
      website?: string;
      opening_hours?: { weekday_text?: string[] };
      rating?: number;
      formatted_address?: string;
      address_components?: Array<{
        long_name: string;
        short_name: string;
        types: string[];
      }>;
    };
    error_message?: string;
  };

  if (data.status !== "OK" || !data.result) {
    throw new Error(
      `Place Details error: ${data.status} - ${data.error_message ?? "unknown"}`,
    );
  }

  const r = data.result;
  const postalCodeComponent = r.address_components?.find((c) =>
    c.types.includes("postal_code"),
  );
  const countryComponent = r.address_components?.find((c) =>
    c.types.includes("country"),
  );
  return {
    placeId: r.place_id ?? placeId,
    phone: r.formatted_phone_number ?? null,
    website: r.website ?? null,
    hours: r.opening_hours?.weekday_text ?? null,
    rating: r.rating ?? null,
    formattedAddress: r.formatted_address ?? null,
    postalCode: postalCodeComponent?.short_name ?? null,
    countryCode: countryComponent?.short_name ?? null,
  };
}

export const fetchPlaceDetails = action({
  args: {
    placeId: v.string(),
  },
  handler: async (_ctx, args): Promise<GooglePlacesResult> => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      throw new Error("Missing GOOGLE_PLACES_API_KEY environment variable");
    }

    return placeDetails(args.placeId, apiKey);
  },
});

export const enrichFromGooglePlaces = action({
  args: {
    name: v.string(),
    city: v.string(),
    address: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<GooglePlacesResult | null> => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      throw new Error("Missing GOOGLE_PLACES_API_KEY environment variable");
    }

    const query = args.address
      ? `${args.name} ${args.address} ${args.city}`
      : `${args.name} ${args.city}`;

    const candidates = await textSearch(query, apiKey);

    if (candidates.length === 0) {
      return null;
    }

    const best =
      candidates.length === 1
        ? candidates[0]
        : pickBestMatch(candidates, args.name);

    const details = await placeDetails(best.place_id, apiKey);

    return details;
  },
});
