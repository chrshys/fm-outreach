import { v } from "convex/values";

import { action } from "../_generated/server";

const AI_GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";

export type SonarEnrichResult = {
  contactEmail: string | null;
  contactName: string | null;
  contactPhone: string | null;
  website: string | null;
  socialLinks: {
    facebook: string | null;
    instagram: string | null;
  };
  products: string[];
  structuredProducts: Array<{ name: string; category: string }>;
  salesChannels: string[];
  sellsOnline: boolean;
  businessDescription: string;
  structuredDescription: {
    summary: string;
    specialties: string[];
    certifications: string[];
  };
  locationDescription: string;
  imagePrompt: string;
  citations: string[];
};

const ENRICHMENT_PROMPT = `You are a business research assistant. Given a farm or agricultural business, research and return structured JSON with the following fields:

- "contactEmail": email address if found, otherwise null
- "contactName": owner or contact person name if found, otherwise null
- "contactPhone": phone number if found, otherwise null
- "website": official website URL if found, otherwise null
- "socialLinks": object with "facebook" (URL or null) and "instagram" (URL or null)
- "products": array of specific products the business sells (e.g. ["organic tomatoes", "honey"]). Empty array if none found.
- "structuredProducts": array of objects with "name" and "category" (one of: "produce", "dairy", "meat", "eggs", "honey", "baked goods", "preserves", "beverages", "flowers", "nursery", "value-added", "other"). Empty array if none found.
- "salesChannels": array of sales channels (e.g. ["farmers market", "online store", "wholesale"]). Empty array if none found.
- "sellsOnline": boolean — true if the business sells products online
- "businessDescription": 1-2 sentence description of the business
- "structuredDescription": object with "summary" (1-2 sentences), "specialties" (array of what makes this business unique), and "certifications" (array of certifications). Empty arrays if none found.
- "locationDescription": 1 sentence describing the business location and surrounding area
- "imagePrompt": a short visual description prompt suitable for generating an image of this business

Respond ONLY with valid JSON matching this exact shape. No markdown, no explanation.`;

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  citations?: string[];
};

function parseStructuredProducts(
  raw: unknown,
): Array<{ name: string; category: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      name: typeof item.name === "string" ? item.name : "",
      category: typeof item.category === "string" ? item.category : "other",
    }))
    .filter((item) => item.name.length > 0);
}

function parseStructuredDescription(
  raw: unknown,
  fallbackSummary: string,
): { summary: string; specialties: string[]; certifications: string[] } {
  if (typeof raw !== "object" || raw === null) {
    return { summary: fallbackSummary, specialties: [], certifications: [] };
  }
  const obj = raw as Record<string, unknown>;
  return {
    summary:
      typeof obj.summary === "string" && obj.summary.length > 0
        ? obj.summary
        : fallbackSummary,
    specialties: Array.isArray(obj.specialties)
      ? (obj.specialties.filter((s) => typeof s === "string") as string[])
      : [],
    certifications: Array.isArray(obj.certifications)
      ? (obj.certifications.filter((s) => typeof s === "string") as string[])
      : [],
  };
}

function parseSocialLinks(
  raw: unknown,
): { facebook: string | null; instagram: string | null } {
  if (typeof raw !== "object" || raw === null) {
    return { facebook: null, instagram: null };
  }
  const obj = raw as Record<string, unknown>;
  return {
    facebook: typeof obj.facebook === "string" ? obj.facebook : null,
    instagram: typeof obj.instagram === "string" ? obj.instagram : null,
  };
}

function parseSonarResponse(text: string): SonarEnrichResult {
  const parsed = JSON.parse(text) as Record<string, unknown>;

  const businessDescription =
    typeof parsed.businessDescription === "string"
      ? parsed.businessDescription
      : "";

  return {
    contactEmail:
      typeof parsed.contactEmail === "string" ? parsed.contactEmail : null,
    contactName:
      typeof parsed.contactName === "string" ? parsed.contactName : null,
    contactPhone:
      typeof parsed.contactPhone === "string" ? parsed.contactPhone : null,
    website: typeof parsed.website === "string" ? parsed.website : null,
    socialLinks: parseSocialLinks(parsed.socialLinks),
    products: Array.isArray(parsed.products)
      ? (parsed.products.filter((p) => typeof p === "string") as string[])
      : [],
    structuredProducts: parseStructuredProducts(parsed.structuredProducts),
    salesChannels: Array.isArray(parsed.salesChannels)
      ? (parsed.salesChannels.filter((s) => typeof s === "string") as string[])
      : [],
    sellsOnline:
      typeof parsed.sellsOnline === "boolean" ? parsed.sellsOnline : false,
    businessDescription,
    structuredDescription: parseStructuredDescription(
      parsed.structuredDescription,
      businessDescription,
    ),
    locationDescription:
      typeof parsed.locationDescription === "string"
        ? parsed.locationDescription
        : "",
    imagePrompt:
      typeof parsed.imagePrompt === "string" ? parsed.imagePrompt : "",
    citations: [],
  };
}

export const enrichWithSonar = action({
  args: {
    name: v.string(),
    address: v.string(),
    city: v.string(),
    province: v.string(),
    type: v.string(),
    website: v.optional(v.string()),
    useSonarPro: v.optional(v.boolean()),
  },
  handler: async (_ctx, args): Promise<SonarEnrichResult | null> => {
    const apiKey = process.env.AI_GATEWAY_API_KEY;

    if (!apiKey) {
      return null;
    }

    const model = args.useSonarPro
      ? "perplexity/sonar-pro"
      : "perplexity/sonar";

    const websiteContext = args.website
      ? ` Their website is ${args.website}.`
      : "";

    const userMessage = `${ENRICHMENT_PROMPT}\n\nBusiness: ${args.name}\nType: ${args.type}\nAddress: ${args.address}, ${args.city}, ${args.province}${websiteContext}`;

    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: userMessage }],
        response_format: { type: "json_object" },
      }),
    });

    if (response.status === 429) {
      throw new Error("Sonar API rate limit exceeded");
    }

    if (!response.ok) {
      throw new Error(`Sonar API error: ${response.status}`);
    }

    const data = (await response.json()) as OpenAIChatResponse;

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return null;
    }

    try {
      const result = parseSonarResponse(content);

      if (Array.isArray(data.citations)) {
        result.citations = data.citations.filter(
          (c) => typeof c === "string",
        ) as string[];
      }

      return result;
    } catch {
      return null;
    }
  },
});
