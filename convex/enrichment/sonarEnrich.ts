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

const SONAR_ENRICHMENT_PROMPT = `You are a business research assistant. Search the web for the given farm or agricultural business and return structured information as JSON.

For each business, find and return:

1. **Verified contact information:**
   - "contactEmail": verified email address, or null if not found
   - "contactPhone": verified phone number, or null if not found
   - "contactName": owner or primary contact person name, or null if not found
   - "website": official website URL, or null if not found

2. **Social media profiles:**
   - "socialLinks": object with "facebook" (profile URL or null) and "instagram" (profile URL or null)

3. **Products sold** — identify specific products and categorize them:
   - "products": array of specific product names (e.g. ["organic tomatoes", "raw honey", "free-range eggs"])
   - "structuredProducts": array of objects with "name" and "category" where category is one of: "produce", "dairy", "meat", "eggs", "honey", "baked goods", "preserves", "beverages", "flowers", "nursery", "value-added", "other"

4. **Sales channels and online presence:**
   - "salesChannels": array of how they sell (e.g. ["farmers market", "farm stand", "online store", "wholesale", "CSA"])
   - "sellsOnline": boolean — true if the business sells products online

5. **Business description:**
   - "businessDescription": 1-2 sentence description of what the business does and what they are known for

6. **Specialties and certifications:**
   - "structuredDescription": object with "summary" (1-2 sentences), "specialties" (array of what makes this business unique), and "certifications" (array of certifications like "USDA Organic", "Certified Naturally Grown", etc.). Use empty arrays if none found.

7. **Location description:**
   - "locationDescription": 2-3 sentences describing the place as if for a marketplace listing. What makes it special? What can visitors expect? Capture the character and setting of the location.

8. **Image prompt:**
   - "imagePrompt": a detailed visual description suitable for AI image generation. Describe the setting, products on display, atmosphere, lighting, and visual style. Be specific and evocative.

Only include information you can verify from web sources. Return null for any field you cannot confirm. Never fabricate email addresses, phone numbers, or URLs.

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

    const userMessage = `${SONAR_ENRICHMENT_PROMPT}\n\nBusiness: ${args.name}\nType: ${args.type}\nAddress: ${args.address}, ${args.city}, ${args.province}${websiteContext}`;

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
