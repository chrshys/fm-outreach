import { v } from "convex/values";

import { action } from "../_generated/server";

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";
const MAX_CONTENT_LENGTH = 8000;

export type ClaudeAnalysisResult = {
  products: string[];
  salesChannels: string[];
  sellsOnline: boolean;
  businessDescription: string;
  contactName: string | null;
};

const EXTRACTION_PROMPT = `You are analyzing scraped website content for a business. Extract the following fields as JSON:

- "products": array of specific products or product categories the business sells (e.g. ["organic tomatoes", "honey", "jams"]). Empty array if none found.
- "salesChannels": array of sales channels (e.g. ["farmers market", "online store", "wholesale", "retail storefront", "CSA"]). Empty array if none found.
- "sellsOnline": boolean — true if the business appears to sell products online (has a shop/store/cart, accepts online orders, etc.)
- "businessDescription": 1-2 sentence description of what this business does
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

function parseAnalysisResponse(text: string): ClaudeAnalysisResult {
  const parsed = JSON.parse(text) as Record<string, unknown>;

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
    businessDescription: typeof parsed.businessDescription === "string"
      ? parsed.businessDescription
      : "",
    contactName: typeof parsed.contactName === "string"
      ? parsed.contactName
      : null,
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
