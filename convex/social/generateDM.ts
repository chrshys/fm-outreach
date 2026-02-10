import { v } from "convex/values";

import { action } from "../_generated/server";
import { api } from "../_generated/api";

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

const DM_MIN_WORDS = 30;
const DM_MAX_WORDS = 60;

type AnthropicResponse = {
  content?: Array<{ type: string; text?: string }>;
  error?: { type: string; message: string };
};

type StructuredProduct = {
  name: string;
  category: string;
};

type StructuredDescription = {
  summary: string;
  specialties: string[];
  certifications: string[];
};

type EnrichmentData = {
  structuredDescription?: StructuredDescription;
  structuredProducts?: StructuredProduct[];
};

type LeadData = {
  name: string;
  contactName?: string;
  city: string;
  region: string;
  type: string;
  products?: string[];
  salesChannels?: string[];
  farmDescription?: string;
  enrichmentData?: EnrichmentData;
};

function formatLeadType(type: string): string {
  const labels: Record<string, string> = {
    farm: "Farm",
    farmers_market: "Farmers Market",
    retail_store: "Retail Store",
    roadside_stand: "Roadside Stand",
    other: "Food Producer",
  };
  return labels[type] ?? "Food Producer";
}

function buildLeadContext(lead: LeadData): string {
  const lines: string[] = [];
  lines.push(`Farm name: ${lead.name}`);
  lines.push(`Type: ${formatLeadType(lead.type)}`);
  lines.push(`Contact name: ${lead.contactName ?? "Unknown"}`);
  lines.push(`Location: ${lead.city}, ${lead.region}`);
  lines.push(`Products: ${lead.products?.join(", ") || "Unknown"}`);
  if (lead.salesChannels?.length) {
    lines.push(`Sales channels: ${lead.salesChannels.join(", ")}`);
  }
  lines.push(`Farm description: ${lead.farmDescription ?? "No description available"}`);

  const enrichment = lead.enrichmentData;
  if (enrichment?.structuredDescription) {
    const desc = enrichment.structuredDescription;
    if (desc.summary) {
      lines.push(`Enriched summary: ${desc.summary}`);
    }
    if (desc.specialties?.length) {
      lines.push(`Specialties: ${desc.specialties.join(", ")}`);
    }
    if (desc.certifications?.length) {
      lines.push(`Certifications: ${desc.certifications.join(", ")}`);
    }
  }

  if (enrichment?.structuredProducts?.length) {
    const grouped = new Map<string, string[]>();
    for (const product of enrichment.structuredProducts) {
      const existing = grouped.get(product.category) ?? [];
      existing.push(product.name);
      grouped.set(product.category, existing);
    }
    const productLines = Array.from(grouped.entries())
      .map(([category, items]) => `${category}: ${items.join(", ")}`)
      .join("; ");
    lines.push(`Detailed products: ${productLines}`);
  }

  return lines.join("\n");
}

function buildSystemPrompt(channel: "facebook" | "instagram"): string {
  const toneGuidance =
    channel === "facebook"
      ? "Tone: friendly and approachable but slightly more formal. Write in complete sentences. No emojis."
      : "Tone: casual, warm, and conversational. Emoji-friendly — use 1-2 relevant emojis naturally.";

  return `You are writing a short direct message on ${channel === "facebook" ? "Facebook" : "Instagram"} for Fruitland Market, a local online marketplace for farms and food producers in Ontario.

Constraints:
- Message must be 30-60 words
- ${toneGuidance}
- You MUST mention at least one specific product or product category the farm offers (e.g. "your organic tomatoes", "your honey", "your raw milk cheeses")
- You MUST reference the farm's location (city or region) to show local connection
- If specialties or certifications are available, weave them in naturally (e.g. "certified organic", "heritage breeds")
- Use ONLY verified data from the lead context — never invent facts
- If contact name is available, address them by first name
- Keep it natural — this should read like a real person reaching out, not a template
- Do NOT include greetings like "Dear" or sign-offs like "Best regards"
- Mention Fruitland Market by name once

Respond with ONLY the message text. No quotes, no labels, no explanation.`;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

async function callClaude(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const response = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
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
    throw new Error(`Anthropic API error: ${data.error.message}`);
  }

  const textBlock = data.content?.find((b) => b.type === "text");
  if (!textBlock?.text) {
    throw new Error("No text content in Anthropic response");
  }

  return textBlock.text.trim();
}

export const generateDM = action({
  args: {
    leadId: v.id("leads"),
    channel: v.union(v.literal("facebook"), v.literal("instagram")),
  },
  handler: async (ctx, args): Promise<string> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    // @ts-expect-error — deep type instantiation in generated Convex API types
    const lead = await ctx.runQuery(api.leads.get, { leadId: args.leadId });
    if (!lead) {
      throw new Error("Lead not found");
    }

    const leadContext = buildLeadContext(lead);
    const systemPrompt = buildSystemPrompt(args.channel);

    const dmText = await callClaude(
      apiKey,
      systemPrompt,
      `Generate a ${args.channel} DM for this lead:\n${leadContext}`,
    );

    const wordCount = countWords(dmText);
    if (wordCount < DM_MIN_WORDS || wordCount > DM_MAX_WORDS) {
      throw new Error(
        `Generated DM is ${wordCount} words (must be ${DM_MIN_WORDS}-${DM_MAX_WORDS})`,
      );
    }

    return dmText;
  },
});
