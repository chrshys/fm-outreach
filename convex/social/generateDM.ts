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
  products?: string[];
  farmDescription?: string;
  enrichmentData?: EnrichmentData;
};

function buildLeadContext(lead: LeadData): string {
  const lines: string[] = [];
  lines.push(`Farm name: ${lead.name}`);
  lines.push(`Contact name: ${lead.contactName ?? "Unknown"}`);
  lines.push(`City: ${lead.city}`);
  lines.push(`Products: ${lead.products?.join(", ") || "Unknown"}`);
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
- Reference specific details about the farm (products, location, practices) to show genuine interest
- Use ONLY verified data — never invent facts
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
