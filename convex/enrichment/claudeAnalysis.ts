import { v } from "convex/values";

import { action } from "../_generated/server";

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";
const MAX_CONTENT_LENGTH = 8000;

export type StructuredProduct = {
  name: string;
  category: string;
};

export type StructuredFarmDescription = {
  summary: string;
  specialties: string[];
  certifications: string[];
};

export type ClaudeAnalysisResult = {
  products: string[];
  salesChannels: string[];
  sellsOnline: boolean;
  businessDescription: string;
  contactName: string | null;
  structuredProducts: StructuredProduct[];
  structuredDescription: StructuredFarmDescription;
};

const EXTRACTION_PROMPT = `You are analyzing scraped website content for a farm or agricultural business. Extract the following fields as JSON:

- "products": array of specific products or product categories the business sells (e.g. ["organic tomatoes", "honey", "jams"]). Empty array if none found.
- "structuredProducts": array of objects with "name" (specific product) and "category" (one of: "produce", "dairy", "meat", "eggs", "honey", "baked goods", "preserves", "beverages", "flowers", "nursery", "value-added", "other"). E.g. [{"name": "organic tomatoes", "category": "produce"}, {"name": "raw honey", "category": "honey"}]. Empty array if none found.
- "salesChannels": array of sales channels (e.g. ["farmers market", "online store", "wholesale", "retail storefront", "CSA"]). Empty array if none found.
- "sellsOnline": boolean — true if the business appears to sell products online (has a shop/store/cart, accepts online orders, etc.)
- "businessDescription": 1-2 sentence description of what this business does
- "structuredDescription": object with "summary" (1-2 sentence description), "specialties" (array of what makes this farm unique, e.g. ["organic", "heritage breeds", "small-batch"]), and "certifications" (array of any certifications mentioned, e.g. ["certified organic", "GAP certified"]). Empty arrays if none found.
- "contactName": the name of an owner or contact person if found, otherwise null

Respond ONLY with valid JSON matching this exact shape. No markdown, no explanation.`;

function truncateContent(content: string): string {
  if (content.length <= MAX_CONTENT_LENGTH) {
    return content;
  }
  return content.slice(0, MAX_CONTENT_LENGTH);
}

function isContentRelevant(content: string): boolean {
  const trimmed = content.trim();
  if (trimmed.length < 50) return false;

  const lowerContent = trimmed.toLowerCase();
  const irrelevantPatterns = [
    "403 forbidden",
    "404 not found",
    "access denied",
    "page not found",
    "under construction",
    "coming soon",
  ];

  for (const pattern of irrelevantPatterns) {
    if (lowerContent.length < 200 && lowerContent.includes(pattern)) {
      return false;
    }
  }

  return true;
}

type AnthropicResponse = {
  content?: Array<{ type: string; text?: string }>;
  error?: { type: string; message: string };
};

function parseStructuredProducts(raw: unknown): StructuredProduct[] {
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
): StructuredFarmDescription {
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

function parseAnalysisResponse(text: string): ClaudeAnalysisResult {
  const parsed = JSON.parse(text) as Record<string, unknown>;

  const businessDescription =
    typeof parsed.businessDescription === "string"
      ? parsed.businessDescription
      : "";

  return {
    products: Array.isArray(parsed.products)
      ? (parsed.products as string[])
      : [],
    salesChannels: Array.isArray(parsed.salesChannels)
      ? (parsed.salesChannels as string[])
      : [],
    sellsOnline: typeof parsed.sellsOnline === "boolean"
      ? parsed.sellsOnline
      : false,
    businessDescription,
    contactName: typeof parsed.contactName === "string"
      ? parsed.contactName
      : null,
    structuredProducts: parseStructuredProducts(parsed.structuredProducts),
    structuredDescription: parseStructuredDescription(
      parsed.structuredDescription,
      businessDescription,
    ),
  };
}

export const analyzeWithClaude = action({
  args: {
    content: v.string(),
  },
  handler: async (_ctx, args): Promise<ClaudeAnalysisResult | null> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return null;
    }

    if (!isContentRelevant(args.content)) {
      return null;
    }

    const truncated = truncateContent(args.content);

    const response = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `${EXTRACTION_PROMPT}\n\nWebsite content:\n${truncated}`,
          },
        ],
      }),
    });

    if (response.status === 429) {
      throw new Error("Anthropic API rate limit exceeded");
    }

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = (await response.json()) as AnthropicResponse;

    if (data.error) {
      throw new Error(
        `Anthropic API error: ${data.error.message}`,
      );
    }

    const textBlock = data.content?.find((b) => b.type === "text");
    if (!textBlock?.text) {
      return null;
    }

    try {
      return parseAnalysisResponse(textBlock.text);
    } catch {
      return null;
    }
  },
});
