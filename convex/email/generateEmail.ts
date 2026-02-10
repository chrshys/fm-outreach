import { v } from "convex/values";

import { action } from "../_generated/server";
import { api } from "../_generated/api";

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANALYSIS_MODEL = "claude-haiku-4-5-20251001";
const GENERATION_MODEL = "claude-sonnet-4-5-20250929";

export type LeadAnalysis = {
  specialization: string;
  salesChannels: string[];
  sellsOnline: boolean;
  valueProp: string;
  connectionPoint: string;
};

export type GeneratedEmail = {
  subject: string;
  body: string;
};

type AnthropicResponse = {
  content?: Array<{ type: string; text?: string }>;
  error?: { type: string; message: string };
};

type LeadData = {
  name: string;
  contactName?: string;
  contactEmail?: string;
  city: string;
  products?: string[];
  salesChannels?: string[];
  sellsOnline?: boolean;
  farmDescription?: string;
  socialLinks?: { instagram?: string; facebook?: string };
};

const ANALYSIS_PROMPT = `You are analyzing a farm or food producer lead for outreach purposes. Based on the data provided, produce a structured JSON analysis with these fields:

- "specialization": a concise phrase describing what this farm specializes in (e.g. "organic vegetable farm", "small-batch honey producer")
- "salesChannels": array of their current sales channels (e.g. ["farmers market", "online store"])
- "sellsOnline": boolean — whether they sell online
- "valueProp": one sentence explaining what value Fruitland Market could offer THIS specific farm based on their current situation
- "connectionPoint": one specific detail about the farm that could be referenced in outreach to show genuine interest (a product, location, practice, etc.)

Respond ONLY with valid JSON matching this exact shape. No markdown, no explanation.`;

const CASL_FOOTER_TEMPLATE = `

---
{{senderName}}
{{businessName}}
{{senderAddress}}
{{senderContact}}
[Unsubscribe]`;

function buildLeadContext(lead: LeadData): string {
  const lines: string[] = [];
  lines.push(`Farm name: ${lead.name}`);
  lines.push(`Contact name: ${lead.contactName ?? "Unknown"}`);
  lines.push(`City: ${lead.city}`);
  lines.push(`Products: ${lead.products?.join(", ") || "Unknown"}`);
  lines.push(`Sales channels: ${lead.salesChannels?.join(", ") || "Unknown"}`);
  lines.push(`Sells online: ${lead.sellsOnline ?? "Unknown"}`);
  lines.push(`Farm description: ${lead.farmDescription ?? "No description available"}`);

  const socialParts: string[] = [];
  if (lead.socialLinks?.instagram) socialParts.push(`Instagram: ${lead.socialLinks.instagram}`);
  if (lead.socialLinks?.facebook) socialParts.push(`Facebook: ${lead.socialLinks.facebook}`);
  lines.push(`Social links: ${socialParts.length > 0 ? socialParts.join(", ") : "None"}`);

  return lines.join("\n");
}

function parseAnalysis(text: string): LeadAnalysis {
  const parsed = JSON.parse(text) as Record<string, unknown>;
  return {
    specialization: typeof parsed.specialization === "string" ? parsed.specialization : "local farm",
    salesChannels: Array.isArray(parsed.salesChannels) ? (parsed.salesChannels as string[]) : [],
    sellsOnline: typeof parsed.sellsOnline === "boolean" ? parsed.sellsOnline : false,
    valueProp: typeof parsed.valueProp === "string" ? parsed.valueProp : "",
    connectionPoint: typeof parsed.connectionPoint === "string" ? parsed.connectionPoint : "",
  };
}

function parseGeneratedEmail(text: string): GeneratedEmail {
  const parsed = JSON.parse(text) as Record<string, unknown>;
  return {
    subject: typeof parsed.subject === "string" ? parsed.subject : "",
    body: typeof parsed.body === "string" ? parsed.body : "",
  };
}

function buildCaslFooter(opts: {
  senderName: string;
  businessName: string;
  senderAddress: string;
  senderEmail: string;
  senderPhone: string;
}): string {
  const contactParts: string[] = [];
  if (opts.senderEmail) contactParts.push(opts.senderEmail);
  if (opts.senderPhone) contactParts.push(opts.senderPhone);

  return CASL_FOOTER_TEMPLATE
    .replace("{{senderName}}", opts.senderName)
    .replace("{{businessName}}", opts.businessName)
    .replace("{{senderAddress}}", opts.senderAddress)
    .replace("{{senderContact}}", contactParts.join(" | "));
}

async function callClaude(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
): Promise<string> {
  const response = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
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

  return textBlock.text;
}

export const generateEmail = action({
  args: {
    leadId: v.id("leads"),
    templateId: v.id("emailTemplates"),
  },
  handler: async (ctx, args): Promise<GeneratedEmail> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    // Fetch lead
    const lead = await ctx.runQuery(api.leads.get, { leadId: args.leadId });
    if (!lead) {
      throw new Error("Lead not found");
    }

    // Fetch template
    const template = await ctx.runQuery(api.emailTemplates.get, { id: args.templateId });
    if (!template) {
      throw new Error("Template not found");
    }

    // Fetch CASL settings
    const settings = await ctx.runQuery(api.settings.getAll, {});
    const senderName = settings.sender_name ?? "";
    const businessName = settings.business_name ?? "";
    const senderAddress = settings.sender_address ?? "";
    const senderEmail = settings.sender_email ?? "";
    const senderPhone = settings.sender_phone ?? "";

    const leadContext = buildLeadContext(lead);

    // Prompt 1: Analysis (Haiku — fast + cheap)
    const analysisText = await callClaude(
      apiKey,
      ANALYSIS_MODEL,
      ANALYSIS_PROMPT,
      `Lead data:\n${leadContext}`,
      512,
    );

    let analysis: LeadAnalysis;
    try {
      analysis = parseAnalysis(analysisText);
    } catch {
      throw new Error("Failed to parse lead analysis from Claude");
    }

    // Prompt 2: Email generation (Sonnet — higher quality)
    const caslFooter = buildCaslFooter({
      senderName,
      businessName,
      senderAddress,
      senderEmail,
      senderPhone,
    });

    const generationSystemPrompt = `You are writing an outreach email for Fruitland Market, a local online marketplace for farms and food producers in Ontario. Generate a JSON object with "subject" and "body" fields.

Constraints:
- The email body must be 50-125 words (NOT counting the CASL footer)
- Tone: warm, rural/local-focused, neighbor-to-neighbor — NOT salesy
- Reference specific farm details from the analysis below
- Use ONLY verified data — never invent facts
- If contact name is available, address them by first name
- Keep it conversational, like a neighbor reaching out

The CASL compliance footer below MUST be appended to the body exactly as provided — do NOT modify it, do NOT count its words toward the word limit.

CASL footer to append:
${caslFooter}

Lead analysis:
- Specialization: ${analysis.specialization}
- Sales channels: ${analysis.salesChannels.join(", ") || "Unknown"}
- Sells online: ${analysis.sellsOnline}
- Value proposition: ${analysis.valueProp}
- Connection point: ${analysis.connectionPoint}

Respond ONLY with valid JSON: {"subject": "...", "body": "..."}. The body must include the CASL footer at the end.`;

    const templatePrompt = template.prompt
      .replace(/\{\{farmName\}\}/g, lead.name)
      .replace(/\{\{contactName\}\}/g, lead.contactName ?? "there")
      .replace(/\{\{city\}\}/g, lead.city)
      .replace(/\{\{products\}\}/g, lead.products?.join(", ") || "your products")
      .replace(/\{\{salesChannels\}\}/g, lead.salesChannels?.join(", ") || "your current channels")
      .replace(/\{\{sellsOnline\}\}/g, String(lead.sellsOnline ?? false))
      .replace(/\{\{farmDescription\}\}/g, lead.farmDescription ?? "")
      .replace(/\{\{socialLinks\}\}/g, [
        lead.socialLinks?.instagram ? `Instagram: ${lead.socialLinks.instagram}` : "",
        lead.socialLinks?.facebook ? `Facebook: ${lead.socialLinks.facebook}` : "",
      ].filter(Boolean).join(", ") || "None");

    const generationText = await callClaude(
      apiKey,
      GENERATION_MODEL,
      generationSystemPrompt,
      `Template instructions:\n${templatePrompt}`,
      1024,
    );

    let result: GeneratedEmail;
    try {
      result = parseGeneratedEmail(generationText);
    } catch {
      throw new Error("Failed to parse generated email from Claude");
    }

    if (!result.subject || !result.body) {
      throw new Error("Generated email is missing subject or body");
    }

    return result;
  },
});
